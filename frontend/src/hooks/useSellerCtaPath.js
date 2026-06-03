import { useMemo } from "react";
import { useAuthStore } from "@/store/authStore";

export function useSellerCtaPath() {
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return useMemo(() => {
    if (isAuthenticated && user?.role === "merchant") {
      return "/merchant";
    }
    return "/merchant/register";
  }, [isAuthenticated, user?.role]);
}
