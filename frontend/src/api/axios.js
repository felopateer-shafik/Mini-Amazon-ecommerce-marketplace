import axios from "axios";
import { useAuthStore } from "@/store/authStore";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api/v1",
  timeout: 15000,
  headers: {
    Accept: "application/json",
  },
});

api.interceptors.request.use((config) => {
  if (typeof FormData !== "undefined" && config.data instanceof FormData) {
    if (typeof config.headers?.set === "function") {
      config.headers.set("Content-Type", undefined);
    } else if (config.headers) {
      delete config.headers["Content-Type"];
      delete config.headers["content-type"];
    }
  }

  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url || "";
    const message = String(error.response?.data?.message || "").toLowerCase();
    const isBannedResponse = status === 403 && message.includes("suspended");

    // Handle banned user on non-login endpoints (already authenticated)
    if (isBannedResponse && !url.includes("/auth/login")) {
      // Clear local state without calling the API
      useAuthStore.setState({
        user: null,
        token: null,
        isAuthenticated: false,
      });
      window.location.href = "/login?banned=1";
      return Promise.reject(error);
    }

    if (status === 401) {
      if (!url.includes("/auth/login") && !url.includes("/auth/otp/verify")) {
        useAuthStore.setState({
          user: null,
          token: null,
          isAuthenticated: false,
        });
        if (window.location.pathname !== "/login") {
          const redirect = encodeURIComponent(
            window.location.pathname + window.location.search,
          );
          window.location.href = `/login?redirect=${redirect}`;
        }
      }
      return Promise.reject(error);
    }

    return Promise.reject(error);
  },
);

export default api;
