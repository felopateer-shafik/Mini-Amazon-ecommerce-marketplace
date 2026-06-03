import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, Send, User, Loader2, MessageCircle } from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import { useTranslation } from "@/hooks/useTranslation";
import {
  useConversationMessages,
  useConversations,
  useSendMessage,
} from "@/hooks/useApi";

export default function CustomerMessagesPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const conversationFromQuery =
    Number(searchParams.get("conversation")) || null;
  const MAX_MESSAGE_LENGTH = 2000;

  const {
    data: conversationsRes,
    isLoading: convsLoading,
    isError: convsError,
  } = useConversations(true);
  const conversationsPayload = conversationsRes?.data ?? conversationsRes ?? {};
  const conversations = Array.isArray(conversationsPayload?.data)
    ? conversationsPayload.data
    : Array.isArray(conversationsPayload)
      ? conversationsPayload
      : [];

  const [selectedChatId, setSelectedChatId] = useState(null);
  const [messageText, setMessageText] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const sendMessageMutation = useSendMessage();

  const { data: messagesRes, isLoading: msgsLoading } = useConversationMessages(
    selectedChatId,
    !!selectedChatId,
  );
  const selectedMessages =
    messagesRes?.data?.messages ?? messagesRes?.messages ?? [];
  const selectedConversationMeta = messagesRes?.data ?? {};

  useEffect(() => {
    if (!conversations.length) return;

    if (conversationFromQuery) {
      const existing = conversations.find(
        (c) => Number(c.id) === conversationFromQuery,
      );
      if (existing) {
        setSelectedChatId(existing.id);
        return;
      }
    }

    if (!selectedChatId) {
      setSelectedChatId(conversations[0].id);
    }
  }, [conversations, selectedChatId, conversationFromQuery]);

  const selectedChat = useMemo(
    () => conversations.find((c) => c.id === selectedChatId) ?? null,
    [conversations, selectedChatId],
  );

  const visibleConversations = useMemo(
    () =>
      conversations.filter((c) =>
        String(c.name || "")
          .toLowerCase()
          .includes(searchTerm.toLowerCase()),
      ),
    [conversations, searchTerm],
  );

  const sendMessage = (e) => {
    e.preventDefault();
    const trimmedMessage = messageText.trim();
    if (!selectedChat || !trimmedMessage) return;
    if (trimmedMessage.length > MAX_MESSAGE_LENGTH) return;
    if (selectedChat?.status === "resolved") return;
    if (selectedChat?.is_customer_blocked) return;

    sendMessageMutation.mutate({
      conversation_id: selectedChat.id,
      message: trimmedMessage,
    });
    setMessageText("");
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="mb-4">
        <h1 className="text-xl sm:text-2xl font-bold text-text flex items-center gap-2">
          <MessageCircle className="h-6 w-6 text-primary" />
          {t("productDetail.chat") || "Messages"}
        </h1>
      </div>

      <div className="flex h-[calc(100vh-14rem)] bg-white rounded-xl border border-border/50 overflow-hidden">
        <div className="w-80 border-r border-border/50 flex flex-col">
          <div className="p-4 border-b border-border/50">
            <div className="relative">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={
                  t("messages.searchConversations") || "Search conversations"
                }
                className="w-full ps-9 pe-4 py-2 border border-border rounded-lg text-sm outline-none focus:border-primary"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {convsLoading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            )}
            {convsError && (
              <div className="text-center py-12 text-sm text-danger">
                {t("common.failedToLoad")}
              </div>
            )}
            {!convsLoading && conversations.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-text-secondary p-6">
                <User className="h-8 w-8 mb-2" />
                <p className="text-sm font-medium">
                  {t("messages.noConversations") || "No conversations yet"}
                </p>
                <p className="text-xs">
                  {t("messages.conversationsAppearHere") ||
                    "Your merchant/admin chats will appear here."}
                </p>
              </div>
            )}
            {!convsLoading &&
              !convsError &&
              visibleConversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => {
                    setSelectedChatId(conv.id);
                  }}
                  className={`w-full p-4 flex items-center gap-3 hover:bg-gray-50 transition border-b border-border/30 ${selectedChat?.id === conv.id ? "bg-primary/5 border-l-2 border-l-primary" : ""}`}
                >
                  <div className="relative">
                    <Avatar name={conv.name} size="md" />
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-text">
                        {conv.name}
                      </span>
                      <span className="text-xs text-text-secondary">
                        {conv.time}
                      </span>
                    </div>
                    <p className="text-xs text-text-secondary truncate">
                      {conv.lastMessage}
                    </p>
                  </div>
                  {conv.unread > 0 && (
                    <span className="w-5 h-5 bg-primary text-white text-xs rounded-full flex items-center justify-center">
                      {conv.unread}
                    </span>
                  )}
                </button>
              ))}
          </div>
        </div>

        {selectedChat ? (
          <div className="flex-1 flex flex-col">
            <div className="p-4 border-b border-border/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar name={selectedChat.name} size="md" />
                <div>
                  <p className="font-medium text-text">{selectedChat.name}</p>
                </div>
              </div>
            </div>
            <div
              className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50"
              role="log"
              aria-label="Messages"
            >
              {msgsLoading && (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              )}
              {!msgsLoading &&
                selectedMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.sender === "customer" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[70%] px-4 py-2.5 rounded-2xl ${msg.sender === "customer" ? "bg-primary text-white rounded-br-md" : msg.sender === "admin" ? "bg-secondary text-white rounded-bl-md" : "bg-white border border-border/50 text-text rounded-bl-md"}`}
                    >
                      {msg.sender === "admin" && (
                        <p className="text-[11px] font-semibold text-white/80 mb-0.5">
                          {msg.sender_name ||
                            `${import.meta.env.VITE_APP_NAME || "Website"} Admin`}
                        </p>
                      )}
                      <p className="text-sm">{msg.text}</p>
                      <p
                        className={`text-xs mt-1 ${msg.sender === "customer" || msg.sender === "admin" ? "text-white/70" : "text-text-secondary"}`}
                      >
                        {msg.time}
                      </p>
                    </div>
                  </div>
                ))}
            </div>
            {(selectedChat?.status === "resolved" ||
              selectedChat?.is_customer_blocked ||
              selectedConversationMeta?.status === "resolved" ||
              selectedConversationMeta?.is_customer_blocked) && (
              <div className="px-4 py-2 text-xs text-danger bg-red-50 border-t border-red-100">
                {selectedChat?.is_customer_blocked ||
                selectedConversationMeta?.is_customer_blocked
                  ? "You are blocked from messaging this seller."
                  : "This conversation is resolved. You cannot send new messages to this seller."}
              </div>
            )}
            <form
              onSubmit={sendMessage}
              className="p-4 border-t border-border/50 flex items-center gap-3"
            >
              <input
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder={t("messages.typeMessage") || "Type your message"}
                maxLength={MAX_MESSAGE_LENGTH}
                disabled={
                  selectedChat?.status === "resolved" ||
                  selectedChat?.is_customer_blocked ||
                  selectedConversationMeta?.status === "resolved" ||
                  selectedConversationMeta?.is_customer_blocked
                }
                className="flex-1 px-4 py-2.5 border border-border rounded-full text-sm outline-none focus:border-primary"
              />
              <button
                type="submit"
                disabled={
                  selectedChat?.status === "resolved" ||
                  selectedChat?.is_customer_blocked ||
                  selectedConversationMeta?.status === "resolved" ||
                  selectedConversationMeta?.is_customer_blocked
                }
                className="w-10 h-10 bg-primary text-white rounded-full flex items-center justify-center hover:bg-primary/90 transition"
                aria-label={t("messages.sendMessage") || "Send"}
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-text-secondary">
            {t("messages.selectConversation") || "Select a conversation"}
          </div>
        )}
      </div>
    </div>
  );
}
