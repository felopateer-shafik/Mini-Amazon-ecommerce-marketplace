import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import App from "./App";
import ErrorBoundary from "./components/ErrorBoundary";
import "./index.css";
import { useThemeStore } from "./store/themeStore";

import { useLanguageStore } from "./store/languageStore";

// Hydrate persisted theme on startup
useThemeStore.getState().hydrate();

const toasterPosition = () =>
  useLanguageStore.getState().language === "ar" ? "top-left" : "top-right";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        const status = error?.response?.status;
        if (
          status === 401 ||
          status === 403 ||
          status === 404 ||
          status === 429
        ) {
          return false;
        }

        return failureCount < 1;
      },
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 min
      gcTime: 30 * 60 * 1000, // 30 min (formerly cacheTime)
      refetchOnMount: false,
    },
    mutations: {
      retry: 0,
    },
  },
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
          <Toaster
            position={toasterPosition()}
            toastOptions={{
              duration: 4000,
              ariaProps: { role: "status", "aria-live": "polite" },
              style: {
                borderRadius: "12px",
                padding: "12px 16px",
                fontSize: "14px",
                boxShadow: "0 8px 30px rgba(0,0,0,0.12)",
              },
              success: {
                iconTheme: { primary: "#067d62", secondary: "#fff" },
              },
              error: {
                iconTheme: { primary: "#d13212", secondary: "#fff" },
              },
            }}
          />
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
