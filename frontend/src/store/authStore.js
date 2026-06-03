import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { authService } from "@/api/services";

function normalizeAuthPayload(responseData) {
  const payload = responseData?.data || responseData || {};
  const token = payload?.token || null;
  const rawUser = payload?.user || payload;
  const role = rawUser?.roles?.[0]?.name || rawUser?.role || "customer";
  return {
    token,
    user: { ...rawUser, role },
  };
}

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      loading: false,

      setAuth: (user, token) => set({ user, token, isAuthenticated: true }),

      login: async (credentials) => {
        set({ loading: true });
        try {
          const res = await authService.login(credentials);
          const { user: userData, token } = normalizeAuthPayload(res.data);
          set({ user: userData, token, isAuthenticated: true, loading: false });
          return { success: true, user: userData };
        } catch (err) {
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            loading: false,
          });
          const message = err.response?.data?.message || "Login failed";
          const isBanned =
            err.response?.status === 403 &&
            message?.toLowerCase().includes("suspended");
          return { success: false, message, isBanned };
        }
      },

      register: async (data) => {
        set({ loading: true });
        try {
          const res = await authService.register(data);
          const { user: userData, token } = normalizeAuthPayload(res.data);
          set({ user: userData, token, isAuthenticated: true, loading: false });
          return { success: true, user: userData };
        } catch (err) {
          set({ loading: false });
          const message = err.response?.data?.message || "Registration failed";
          const errors = err.response?.data?.errors || {};
          return { success: false, message, errors };
        }
      },

      requestOtp: async (phone) => {
        set({ loading: true });
        try {
          const res = await authService.requestOtp({ phone });
          set({ loading: false });
          return {
            success: true,
            message: res.data?.message,
          };
        } catch (err) {
          set({ loading: false });
          return {
            success: false,
            message: err.response?.data?.message || "Failed to send OTP",
          };
        }
      },

      verifyOtp: async ({ phone, otp }) => {
        set({ loading: true });
        try {
          const res = await authService.verifyOtp({ phone, otp });
          const { user: userData, token } = normalizeAuthPayload(res.data);
          set({ user: userData, token, isAuthenticated: true, loading: false });
          return { success: true, user: userData };
        } catch (err) {
          set({ loading: false });
          return {
            success: false,
            message: err.response?.data?.message || "OTP verification failed",
          };
        }
      },

      socialLogin: async (data) => {
        set({ loading: true });
        try {
          const res = await authService.socialLogin(data);
          const { user: userData, token } = normalizeAuthPayload(res.data);
          set({ user: userData, token, isAuthenticated: true, loading: false });
          return { success: true, user: userData };
        } catch (err) {
          set({ loading: false });
          return {
            success: false,
            message: err.response?.data?.message || "Social login failed",
          };
        }
      },

      logout: async () => {
        try {
          await authService.logout();
        } catch {
          // Ignore – we clear local state regardless
        }
        set({ user: null, token: null, isAuthenticated: false });
      },

      fetchUser: async () => {
        try {
          const res = await authService.me();
          const { user } = normalizeAuthPayload(res.data);
          set({ user, isAuthenticated: true });
          return user;
        } catch (err) {
          const status = err?.response?.status;
          if (status === 401 || status === 403) {
            set({ user: null, token: null, isAuthenticated: false });
          }
          throw new Error("Unable to fetch user");
        }
      },

      updateUser: (userData) =>
        set((state) => ({
          user: { ...state.user, ...userData },
        })),

      isAdmin: () => {
        const { user } = get();
        return user?.role === "admin" || user?.role === "staff";
      },

      isMerchant: () => {
        const { user } = get();
        return user?.role === "merchant";
      },

      isCustomer: () => {
        const { user } = get();
        return user?.role === "customer";
      },

      isWholesale: () => {
        const { user } = get();
        return user?.is_wholesale === true;
      },
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);
