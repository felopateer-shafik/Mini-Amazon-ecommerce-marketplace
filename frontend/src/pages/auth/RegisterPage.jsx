import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { Mail, Lock, Eye, EyeOff, Phone, User } from "lucide-react";
import { FcGoogle } from "react-icons/fc";
import { FaFacebook } from "react-icons/fa";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { authService } from "@/api/services";
import { useAuthStore } from "@/store/authStore";
import { useTranslation } from "@/hooks/useTranslation";
import { useSEO } from "@/hooks/useSEO";
import { usePublicSettings } from "@/hooks/useApi";
import toast from "react-hot-toast";

export default function RegisterPage() {
  const { t } = useTranslation();
  useSEO({
    title: "Create Account - Mini Amazon",
    description:
      "Create your free Mini Amazon account. Shop millions of products, track orders, and enjoy fast delivery.",
    canonical: "/register",
  });
  const [showPassword, setShowPassword] = useState(false);
  const { register: registerUser, loading } = useAuthStore();
  const { data: publicSettingsRes } = usePublicSettings();
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    watch,
    setError,
    formState: { errors },
  } = useForm();

  const publicSettings = publicSettingsRes?.data ?? publicSettingsRes ?? {};
  const allowRegistration = publicSettings?.allow_registration !== false;
  const googleEnabled = !!publicSettings?.google_auth_enabled;
  const facebookEnabled = !!publicSettings?.facebook_auth_enabled;

  const onSubmit = async (data) => {
    if (!allowRegistration) {
      toast.error(t("auth.registrationFailed"));
      return;
    }

    const result = await registerUser({
      name: data.name,
      email: data.email,
      phone: data.phone,
      password: data.password,
      password_confirmation: data.confirmPassword,
    });
    if (result.success) {
      toast.success(t("auth.accountCreated"));
      navigate("/");
    } else {
      // Set server-side validation errors on form fields
      if (result.errors) {
        Object.entries(result.errors).forEach(([field, msgs]) => {
          setError(field, { message: Array.isArray(msgs) ? msgs[0] : msgs });
        });
      }
      toast.error(result.message || t("auth.registrationFailed"));
    }
  };

  const handleSocialRegister = (provider) => {
    window.location.href = authService.socialRedirectUrl(provider);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-border/50 p-8">
      <div className="text-center mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-text">
          {t("auth.createAccountTitle")}
        </h1>
        <p className="text-sm text-text-secondary mt-1">
          {t("auth.joinMiniAmazon")}
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label={t("auth.fullName")}
          icon={User}
          placeholder={t("auth.namePlaceholder")}
          {...register("name", { required: t("auth.fullNameRequired") })}
          error={errors.name?.message}
          required
        />
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
          required
        />
        <Input
          label={t("auth.phoneNumber")}
          type="tel"
          icon={Phone}
          placeholder={t("auth.phonePlaceholder")}
          {...register("phone", { required: t("auth.phoneRequired") })}
          error={errors.phone?.message}
          required
        />
        <div className="relative">
          <Input
            label={t("auth.password")}
            type={showPassword ? "text" : "password"}
            icon={Lock}
            placeholder={t("auth.min8Password")}
            {...register("password", {
              required: t("auth.passwordRequired"),
              minLength: { value: 8, message: t("auth.min8Characters") },
            })}
            error={errors.password?.message}
            required
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
        <Input
          label={t("auth.confirmPassword")}
          type="password"
          icon={Lock}
          placeholder={t("auth.confirmPasswordPlaceholder")}
          {...register("confirmPassword", {
            required: t("auth.pleaseConfirmPassword"),
            validate: (val) =>
              val === watch("password") || t("auth.passwordsNoMatch"),
          })}
          error={errors.confirmPassword?.message}
          required
        />
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            className="rounded border-border text-primary focus:ring-primary mt-0.5"
            {...register("terms", { required: t("auth.mustAcceptTerms") })}
          />
          <span>
            {t("auth.agreeToTerms")}{" "}
            <Link to="/terms" className="text-accent hover:underline">
              {t("auth.termsConditions")}
            </Link>{" "}
            {t("common.and")}{" "}
            <Link to="/privacy" className="text-accent hover:underline">
              {t("auth.privacyPolicy")}
            </Link>
          </span>
        </label>
        {errors.terms && (
          <p className="text-xs text-danger">{errors.terms.message}</p>
        )}

        <Button
          type="submit"
          fullWidth
          loading={loading}
          disabled={!allowRegistration}
        >
          {t("auth.createAccountTitle")}
        </Button>
      </form>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-white px-4 text-text-secondary">
            {t("auth.signUpWith")}
          </span>
        </div>
      </div>

      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          fullWidth
          className="!border-gray-300 !text-text"
          onClick={() => handleSocialRegister("google")}
          disabled={!allowRegistration || !googleEnabled}
        >
          <FcGoogle className="h-5 w-5" />
          {t("auth.google")}
        </Button>
        <Button
          type="button"
          variant="outline"
          fullWidth
          className="!border-gray-300 !text-text"
          onClick={() => handleSocialRegister("facebook")}
          disabled={!allowRegistration || !facebookEnabled}
        >
          <FaFacebook className="h-5 w-5 text-blue-600" />
          {t("auth.facebook")}
        </Button>
      </div>

      <div className="mt-8 pt-6 border-t border-border/50">
        <p className="text-center text-sm text-text-secondary mb-3">
          {t("auth.wantToSell") || "Want to sell on our marketplace?"}
        </p>
        <Link to="/merchant/register" className="block w-full">
          <Button variant="outline" fullWidth>
            {t("auth.becomeSeller") || "Become a Seller"}
          </Button>
        </Link>
      </div>

      <p className="text-center text-sm text-text-secondary mt-6">
        {t("auth.alreadyHaveAccount")}{" "}
        <Link to="/login" className="text-accent font-medium hover:underline">
          {t("auth.signIn")}
        </Link>
      </p>
    </div>
  );
}
