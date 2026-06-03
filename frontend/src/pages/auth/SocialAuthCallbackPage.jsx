import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { useAuthStore } from "@/store/authStore";

export default function SocialAuthCallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fetchUser = useAuthStore((state) => state.fetchUser);

  useEffect(() => {
    const completeSocialLogin = async () => {
      const token = searchParams.get("token");
      const isBanned = searchParams.get("banned") === "1";
      const hasError = !!searchParams.get("error");
      const looksLikeSanctumToken = !!token && token.includes("|") && token.length > 20;

      if (isBanned) {
        toast.error("Your account has been suspended. Please contact support.");
        navigate("/login?banned=1", { replace: true });
        return;
      }

      if (hasError || !looksLikeSanctumToken) {
        toast.error("Social login failed.");
        navigate("/login", { replace: true });
        return;
      }

      useAuthStore.setState({ token, user: null, isAuthenticated: true });

      try {
        const user = await fetchUser();
        toast.success("Logged in successfully.");

        if (user?.role === "admin" || user?.role === "staff") {
          navigate("/admin", { replace: true });
        } else if (user?.role === "merchant") {
          navigate("/merchant", { replace: true });
        } else {
          navigate("/", { replace: true });
        }
      } catch {
        useAuthStore.setState({ token: null, user: null, isAuthenticated: false });
        toast.error("Social login failed.");
        navigate("/login", { replace: true });
      }
    };

    completeSocialLogin();
  }, [fetchUser, navigate, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="bg-white rounded-xl shadow-sm border border-border/50 p-8 text-center w-full max-w-md">
        <div className="flex justify-center mb-4">
          <LoadingSpinner size="lg" />
        </div>
        <h1 className="text-xl font-semibold text-text">Completing sign in</h1>
        <p className="text-sm text-text-secondary mt-2">Please wait while we finish your social login.</p>
      </div>
    </div>
  );
}
