import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/authStore";

function streamUrl() {
  const base = (import.meta.env.VITE_API_URL || "/api/v1").replace(/\/$/, "");
  return `${base}/stream/updates`;
}

function isLocalDevRuntime() {
  if (typeof window === "undefined") return false;
  return window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
}

export function useLiveUpdates() {
  const token = useAuthStore((state) => state.token);
  const queryClient = useQueryClient();
  const reconnectRef = useRef(null);
  const lastCountsRef = useRef({ notifications: null, messages: null });

  useEffect(() => {
    if (!token) {
      return undefined;
    }

    if (isLocalDevRuntime()) {
      const interval = setInterval(() => {
        queryClient.invalidateQueries({ queryKey: ["notifications"] });
        queryClient.invalidateQueries({ queryKey: ["messages", "conversations"] });
        queryClient.invalidateQueries({ queryKey: ["messages", "conversation"] });
      }, 30000);

      return () => clearInterval(interval);
    }

    let stopped = false;
    let abortController = null;

    const scheduleReconnect = () => {
      if (stopped) return;
      reconnectRef.current = setTimeout(connect, 3000);
    };

    const handlePayload = (payload) => {
      const notifications = Number(payload?.unread_notifications ?? 0);
      const messages = Number(payload?.unread_messages ?? 0);
      const prev = lastCountsRef.current;

      if (prev.notifications !== notifications) {
        queryClient.invalidateQueries({ queryKey: ["notifications"] });
      }

      if (prev.messages !== messages) {
        queryClient.invalidateQueries({ queryKey: ["messages", "conversations"] });
        queryClient.invalidateQueries({ queryKey: ["messages", "conversation"] });
      }

      lastCountsRef.current = { notifications, messages };
    };

    const consumeStream = async (reader) => {
      const decoder = new TextDecoder();
      let buffer = "";

      while (!stopped) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split("\n\n");
        buffer = chunks.pop() || "";

        for (const chunk of chunks) {
          const lines = chunk.split("\n");
          const event = lines.find((line) => line.startsWith("event:"))?.replace("event:", "").trim();
          const dataLine = lines.find((line) => line.startsWith("data:"));
          if (event !== "update" || !dataLine) continue;

          try {
            const payload = JSON.parse(dataLine.replace("data:", "").trim());
            handlePayload(payload);
          } catch {
            // ignore malformed event payload
          }
        }
      }
    };

    const connect = async () => {
      if (stopped) return;

      abortController = new AbortController();

      try {
        const response = await fetch(streamUrl(), {
          method: "GET",
          headers: {
            Accept: "text/event-stream",
            Authorization: `Bearer ${token}`,
          },
          signal: abortController.signal,
        });

        if (!response.ok || !response.body) {
          throw new Error(`Stream failed with status ${response.status}`);
        }

        const reader = response.body.getReader();
        await consumeStream(reader);
      } catch {
        // reconnect below
      }

      scheduleReconnect();
    };

    connect();

    return () => {
      stopped = true;
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
      if (abortController) abortController.abort();
    };
  }, [queryClient, token]);
}
