import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { Mail, Lock, Eye, EyeOff, Phone } from "lucide-react";
import { FcGoogle } from "react-icons/fc";
import { FaFacebook } from "react-icons/fa";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { authService } from "@/api/services";
import { useAuthStore } from "@/store/authStore";
import { useTranslation } from "@/hooks/useTranslation";
import { useSEO } from "@/hooks/useSEO";
import toast from "react-hot-toast";

export default function LoginPage() {
  const { t } = useTranslation();
  useSEO({
    title: "Sign In - Mini Amazon",
    description:
      "Sign in to your Mini Amazon account. Access your orders, wishlist, and personalized recommendations.",
    canonical: "/login",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loginMethod, setLoginMethod] = useState("email");
  const { login, requestOtp, verifyOtp, loading } = useAuthStore();
  const [otpSent, setOtpSent] = useState(false);
  const [phoneValue, setPhoneValue] = useState("");
  const [twoFactorStep, setTwoFactorStep] = useState(false);
  const [twoFactorEmail, setTwoFactorEmail] = useState("");
  const [twoFactorPassword, setTwoFactorPassword] = useState("");
  const [twoFactorOtp, setTwoFactorOtp] = useState("");
  const [twoFactorLoading, setTwoFactorLoading] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isBanned = searchParams.get("banned") === "1";
  const redirectPath = searchParams.get("redirect") || "/";
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  const [bannedMessage, setBannedMessage] = useState(isBanned);

  const onSubmit = async (data) => {
    setBannedMessage(false);

    if (loginMethod === "phone") {
      if (!otpSent) {
        const requestResult = await requestOtp(data.phone);
        if (requestResult.success) {
          setPhoneValue(data.phone);
          setOtpSent(true);
          toast.success(requestResult.message || "OTP sent successfully.");
        } else {
          toast.error(requestResult.message || "Failed to send OTP.");
        }
        return;
      }

      const verifyResult = await verifyOtp({
        phone: phoneValue || data.phone,
        otp: data.otp,
      });
      if (!verifyResult.success) {
        toast.error(verifyResult.message || "Invalid OTP.");
        return;
      }

      toast.success("Logged in successfully.");
      const otpRole = verifyResult.user?.role;
      if (otpRole === "admin" || otpRole === "staff") navigate("/admin");
      else if (otpRole === "merchant") navigate("/merchant");
      else navigate(redirectPath);
      return;
    }

    const result = await login(data);
    if (result.success) {
      toast.success(t("auth.welcomeBack2"));
      const role = result.user?.role;
      if (role === "admin" || role === "staff") navigate("/admin");
      else if (role === "merchant") navigate("/merchant");
      else navigate(redirectPath);
    } else if (result.isBanned) {
      setBannedMessage(true);
    } else if (result.message?.toLowerCase().includes("two-factor") || result.message?.toLowerCase().includes("two_factor") || result.message?.toLowerCase().includes("otp_required")) {
      // 2FA is enabled, need OTP
      setTwoFactorEmail(data.email);
      setTwoFactorPassword(data.password);
      setTwoFactorStep(true);
      // Request OTP automatically via auth service
      try {
        const profile = await authService.requestLoginOtp({ email: data.email });
        toast.success(profile?.data?.message || "Verification code sent to your phone.");
      } catch {
        toast.success("Please enter the verification code sent to your phone.");
      }
    } else {
      toast.error(result.message || t("auth.invalidCredentials"));
    }
  };

  const handleSocialLogin = (provider) => {
    window.location.href = authService.socialRedirectUrl(provider);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-border/50 p-8">
      {bannedMessage && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm text-center">
          Your account has been suspended. Please contact support.
        </div>
      )}
      <div className="text-center mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-text">
          {t("auth.signIn")}
        </h1>
        <p className="text-sm text-text-secondary mt-1">
          {t("auth.welcomeBack")}
        </p>
      </div>

      {twoFactorStep ? (
        /* Two-Factor Authentication OTP Step */
        <div className="space-y-4">
          <div className="text-center mb-4">
            <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
              <Lock className="h-7 w-7 text-primary" />
            </div>
            <h2 className="text-lg font-semibold text-text">{t("auth.twoFactorTitle") || "Two-Factor Authentication"}</h2>
            <p className="text-sm text-text-secondary mt-1">
              {t("auth.twoFactorDescription") || "Enter the 6-digit verification code sent to your phone."}
            </p>
          </div>
          <Input
            label={t("auth.verificationCode") || "Verification Code"}
            type="text"
            placeholder="000000"
            maxLength={6}
            value={twoFactorOtp}
            onChange={(e) => setTwoFactorOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
            className="text-center text-lg tracking-widest"
          />
          <Button
            fullWidth
            loading={twoFactorLoading}
            onClick={async () => {
              if (twoFactorOtp.length !== 6) {
                toast.error("Please enter a 6-digit code.");
                return;
              }
              setTwoFactorLoading(true);
              try {
                const result = await login({
                  email: twoFactorEmail,
                  password: twoFactorPassword,
                  otp: twoFactorOtp,
                });
                if (result.success) {
                  toast.success(t("auth.welcomeBack2"));
                  const role = result.user?.role;
                  if (role === "admin" || role === "staff") navigate("/admin");
                  else if (role === "merchant") navigate("/merchant");
                  else navigate(redirectPath);
                } else {
                  toast.error(result.message || "Invalid verification code.");
                }
              } catch {
                toast.error("Verification failed. Please try again.");
              } finally {
                setTwoFactorLoading(false);
              }
            }}
          >
            {t("auth.verifyAndSignIn") || "Verify & Sign In"}
          </Button>
          <button
            type="button"
            onClick={() => {
              setTwoFactorStep(false);
              setTwoFactorOtp("");
            }}
            className="w-full text-sm text-accent hover:underline text-center"
          >
            {t("auth.backToLogin") || "Back to login"}
          </button>
        </div>
      ) : (
      <>
      {/* Login method tabs */}
      <div className="flex mb-6 border-b border-border">
        <button
          onClick={() => setLoginMethod("email")}
          className={`flex-1 py-2.5 text-sm font-medium border-b-2 transition ${loginMethod === "email" ? "border-primary text-primary" : "border-transparent text-text-secondary"}`}
        >
          {t("auth.emailTab")}
        </button>
        <button
          onClick={() => setLoginMethod("phone")}
          className={`flex-1 py-2.5 text-sm font-medium border-b-2 transition ${loginMethod === "phone" ? "border-primary text-primary" : "border-transparent text-text-secondary"}`}
        >
          {t("auth.phoneOTP")}
        </button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {loginMethod === "email" ? (
          <>
            <Input
              label={t("auth.emailAddress")}
              type="email"
              icon={Mail}
              placeholder={t("auth.emailPlaceholder")}
              {...register("email", {
                required: t("auth.emailRequired"),
                pattern: {
                  value: /^\S+@\S+\.\S+$/,
                  message: t("auth.invalidEmail"),
                },
              })}
              error={errors.email?.message}
            />
            <div className="relative">
              <Input
                label={t("auth.password")}
                type={showPassword ? "text" : "password"}
                icon={Lock}
                placeholder={t("auth.passwordPlaceholder")}
                {...register("password", {
                  required: t("auth.passwordRequired"),
                  minLength: { value: 6, message: t("auth.min6Characters") },
                })}
                error={errors.password?.message}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-[38px] text-text-secondary hover:text-text"
                aria-label="Toggle password visibility"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="rounded border-border text-primary focus:ring-primary"
                  {...register("remember")}
                />
                {t("auth.rememberMe")}
              </label>
              <Link
                to="/forgot-password"
                className="text-sm text-accent hover:underline"
              >
                {t("auth.forgotPassword")}
              </Link>
            </div>
          </>
        ) : (
          <>
            <Input
              label={t("auth.phoneNumber")}
              type="tel"
              icon={Phone}
              placeholder={t("auth.phonePlaceholder")}
              {...register("phone", { required: t("auth.phoneRequired") })}
              error={errors.phone?.message}
              disabled={otpSent}
            />
            {otpSent && (
              <>
                <Input
                  label={t("auth.enterOTP") || "Enter OTP"}
                  type="text"
                  placeholder="6-digit code"
                  {...register("otp", { required: "OTP is required" })}
                  error={errors.otp?.message}
                />
                <button
                  type="button"
                  onClick={() => {
                    setOtpSent(false);
                  }}
                  className="text-xs text-accent hover:underline"
                >
                  Change phone number
                </button>
              </>
            )}
          </>
        )}

        <Button type="submit" fullWidth loading={loading}>
          {loginMethod === "email" ? t("auth.signInButton") : t("auth.sendOTP")}
        </Button>
      </form>

      {/* Divider */}
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-white px-4 text-text-secondary">
            {t("auth.continueWith")}
          </span>
        </div>
      </div>

      {/* Social login */}
      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          fullWidth
          className="!border-gray-300 !text-text"
          onClick={() => handleSocialLogin("google")}
        >
          <FcGoogle className="h-5 w-5" />
          {t("auth.google")}
        </Button>
        <Button
          type="button"
          variant="outline"
          fullWidth
          className="!border-gray-300 !text-text"
          onClick={() => handleSocialLogin("facebook")}
        >
          <FaFacebook className="h-5 w-5 text-blue-600" />
          {t("auth.facebook")}
        </Button>
      </div>

      <p className="text-center text-sm text-text-secondary mt-6">
        {t("auth.newToMiniAmazon")}{" "}
        <Link
          to="/register"
          className="text-accent font-medium hover:underline"
        >
          {t("auth.createAccount")}
        </Link>
      </p>
      </>
      )}
    </div>
  );
}
