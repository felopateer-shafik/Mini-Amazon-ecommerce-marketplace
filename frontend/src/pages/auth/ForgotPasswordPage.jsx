import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { Mail, ArrowLeft, CheckCircle } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { useTranslation } from "@/hooks/useTranslation";
import { authService } from "@/api/services";
import toast from "react-hot-toast";

export default function ForgotPasswordPage() {
  const { t } = useTranslation();
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      await authService.forgotPassword({ email: data.email });
      setSent(true);
      toast.success(t("auth.resetSent"));
    } catch (err) {
      const message = err?.response?.data?.message || t("auth.resetFailed");
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-border/50 p-8 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="h-8 w-8 text-success" />
        </div>
        <h1 className="text-xl sm:text-2xl font-bold text-text">
          {t("auth.checkYourEmail")}
        </h1>
        <p className="text-sm text-text-secondary mt-2 mb-6">
          {t("auth.resetLinkSent")}
        </p>
        <Link to="/login">
          <Button variant="outline" icon={ArrowLeft}>
            {t("auth.backToSignIn")}
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-border/50 p-8">
      <div className="text-center mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-text">
          {t("auth.forgotPasswordTitle")}
        </h1>
        <p className="text-sm text-text-secondary mt-1">
          {t("auth.forgotPasswordDescription")}
        </p>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
        <Button type="submit" fullWidth loading={loading}>
          {t("auth.sendResetLink")}
        </Button>
      </form>
      <p className="text-center text-sm text-text-secondary mt-6">
        <Link
          to="/login"
          className="text-accent font-medium hover:underline flex items-center justify-center gap-1"
        >
          <ArrowLeft className="h-4 w-4" /> {t("auth.backToSignIn")}
        </Link>
      </p>
    </div>
  );
}
