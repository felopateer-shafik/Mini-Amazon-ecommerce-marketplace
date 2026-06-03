import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import {
  Store,
  User,
  Mail,
  Phone,
  Building,
  CreditCard,
  Lock,
  Eye,
  EyeOff,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Textarea from "@/components/ui/Textarea";
import FileUpload from "@/components/ui/FileUpload";
import { useTranslation } from "@/hooks/useTranslation";
import { useSEO } from "@/hooks/useSEO";
import { useAuthStore } from "@/store/authStore";
import { authService } from "@/api/services";
import toast from "react-hot-toast";

export default function MerchantRegisterPage() {
  const { t } = useTranslation();
  useSEO({
    title: "Become a Seller - Mini Amazon",
    description:
      "Start selling on Mini Amazon. Reach millions of customers, manage your inventory, and grow your business with our powerful seller tools.",
    canonical: "/merchant/register",
  });
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState([]);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { user: authUser, isAuthenticated, updateUser } = useAuthStore();
  const {
    register,
    handleSubmit,
    formState: { errors },
    trigger,
    setError,
    setValue,
  } = useForm();

  const currentUser = authUser;
  const isUpgradeFlow =
    Boolean(isAuthenticated) && currentUser?.role && currentUser.role !== "merchant";

  useEffect(() => {
    if (!currentUser) return;
    setValue("ownerName", currentUser.name || "");
    setValue("email", currentUser.email || "");
    setValue("phone", currentUser.phone || "");
    setValue(
      "businessName",
      currentUser?.vendor?.store_name ||
        currentUser?.vendor?.business_name ||
        currentUser.name ||
        "",
    );
  }, [currentUser, setValue]);

  const fieldToStep = {
    ownerName: 1,
    email: 1,
    phone: 1,
    password: 1,
    businessName: 2,
    businessType: 2,
  };

  const backendFieldMap = {
    name: "ownerName",
    email: "email",
    phone: "phone",
    password: "password",
    business_name: "businessName",
    store_name: "businessName",
    business_type: "businessType",
  };

  const nextStep = async () => {
    const fields =
      step === 1
        ? isUpgradeFlow
          ? ["ownerName", "email", "phone"]
          : ["ownerName", "email", "phone", "password"]
        : step === 2
          ? ["businessName", "businessType"]
          : [];
    const valid = await trigger(fields);
    if (valid) setStep(step + 1);
  };

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      if (isUpgradeFlow) {
        const res = await authService.becomeMerchant({
          business_name: data.businessName,
          store_name: data.businessName,
          business_type: data.businessType,
          description: data.description,
          bank_name: data.bankName || undefined,
          bank_account: data.bankAccount || undefined,
          iban: data.iban || undefined,
        });
        const upgradedUser = res?.data?.data?.user ?? null;
        if (upgradedUser) {
          updateUser(upgradedUser);
        }
        toast.success(t("auth.applicationSubmitted"));
        navigate("/merchant");
      } else {
        await authService.register({
          name: data.ownerName,
          email: data.email,
          phone: data.phone,
          password: data.password,
          password_confirmation: data.password,
          role: "merchant",
          business_name: data.businessName,
          store_name: data.businessName,
          business_type: data.businessType,
          description: data.description,
          bank_name: data.bankName || undefined,
          bank_account: data.bankAccount || undefined,
          iban: data.iban || undefined,
        });
        toast.success(t("auth.applicationSubmitted"));
        navigate("/login");
      }
    } catch (err) {
      const validationErrors = err?.response?.data?.errors;
      if (validationErrors && typeof validationErrors === "object") {
        const stepsWithErrors = [];
        Object.entries(validationErrors).forEach(([backendField, messages]) => {
          const field = backendFieldMap[backendField] || backendField;
          const message = Array.isArray(messages)
            ? messages[0]
            : String(messages);
          if (!field || !message) return;
          setError(field, { type: "server", message });
          if (fieldToStep[field]) {
            stepsWithErrors.push(fieldToStep[field]);
          }
        });

        if (stepsWithErrors.length > 0) {
          setStep(Math.min(...stepsWithErrors));
        }
        return;
      }

      const message =
        err?.response?.data?.message || t("auth.applicationFailed");
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { number: 1, label: t("auth.personalInfo") },
    { number: 2, label: t("auth.businessInfo") },
    { number: 3, label: t("auth.documentsBank") },
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-border/50 p-8 max-w-lg mx-auto">
      <div className="text-center mb-6">
        <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
          <Store className="h-6 w-6 text-primary" />
        </div>
        <h1 className="text-xl sm:text-2xl font-bold text-text">
          {t("auth.becomeSeller")}
        </h1>
        <p className="text-sm text-text-secondary mt-1">
          {t("auth.startSelling")}
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center justify-center gap-2 mb-8">
        {steps.map((s, i) => (
          <div key={s.number} className="flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${step >= s.number ? "bg-primary text-white" : "bg-gray-200 text-text-secondary"}`}
            >
              {s.number}
            </div>
            {i < steps.length - 1 && (
              <div
                className={`w-12 h-0.5 mx-1 ${step > s.number ? "bg-primary" : "bg-gray-200"}`}
              />
            )}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {step === 1 && (
          <>
            <Input
              label={t("auth.ownerFullName")}
              icon={User}
              {...register("ownerName", { required: "Required" })}
              error={errors.ownerName?.message}
              required
              disabled={isUpgradeFlow}
            />
            <Input
              label={t("auth.emailAddress")}
              type="email"
              icon={Mail}
              {...register("email", {
                required: "Required",
                pattern: { value: /^\S+@\S+\.\S+$/, message: "Invalid email" },
              })}
              error={errors.email?.message}
              required
              disabled={isUpgradeFlow}
            />
            <Input
              label={t("auth.phoneNumber")}
              type="tel"
              icon={Phone}
              {...register("phone", {
                required: "Required",
                minLength: { value: 8, message: "Invalid phone number" },
              })}
              error={errors.phone?.message}
              required
              disabled={isUpgradeFlow}
            />
            {!isUpgradeFlow && (
              <div className="w-full">
                <label className="block text-sm font-medium text-text mb-1.5">
                  {t("auth.password") || "Password"}
                  <span className="text-danger ml-1">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <Lock className="h-4 w-4 text-text-secondary" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    className={`w-full rounded-lg border bg-white py-2 sm:py-2.5 text-base sm:text-sm text-text placeholder:text-text-light transition-colors focus:outline-none focus:ring-2 disabled:bg-gray-50 disabled:cursor-not-allowed ltr:pl-10 ltr:pr-10 rtl:pr-10 rtl:pl-10 ${
                      errors.password
                        ? "border-danger focus:ring-danger/30 focus:border-danger"
                        : "border-border focus:ring-primary/30 focus:border-primary"
                    }`}
                    aria-invalid={!!errors.password}
                    {...register("password", {
                      required: "Required",
                      minLength: { value: 8, message: "Min 8 characters" },
                      pattern: {
                        value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/,
                        message:
                          "Password must include uppercase, lowercase, and a number",
                      },
                    })}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-text-secondary hover:text-text"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1 text-xs text-danger">
                    {errors.password.message}
                  </p>
                )}
              </div>
            )}
          </>
        )}
        {step === 2 && (
          <>
            <Input
              label={t("auth.businessName")}
              icon={Building}
              {...register("businessName", { required: "Required" })}
              error={errors.businessName?.message}
              required
            />
            <Select
              label={t("auth.businessType")}
              options={[
                { value: "individual", label: t("auth.individual") },
                { value: "company", label: t("auth.company") },
                { value: "partnership", label: t("auth.partnership") },
              ]}
              {...register("businessType", { required: "Required" })}
              error={errors.businessType?.message}
              required
              placeholder={t("auth.selectType")}
            />
            <Textarea
              label={t("auth.businessDescription")}
              {...register("description")}
              rows={3}
            />
          </>
        )}
        {step === 3 && (
          <>
            <FileUpload
              label={t("auth.tradeLicense")}
              onDrop={(f) => setFiles(f)}
              files={files}
              onRemove={(i) => setFiles(files.filter((_, idx) => idx !== i))}
              maxFiles={3}
              accept={{ "image/*": [], "application/pdf": [] }}
            />
            <Input
              label={t("auth.bankAccountName")}
              icon={CreditCard}
              {...register("bankName")}
            />
            <Input
              label={t("auth.bankAccountNumber")}
              {...register("bankAccount")}
            />
            <Input label={t("auth.bankIBAN")} {...register("iban")} />
          </>
        )}

        <div className="flex gap-3 pt-2">
          {step > 1 && (
            <Button
              variant="outline"
              onClick={() => setStep(step - 1)}
              type="button"
              className="flex-1"
            >
              {t("common.previous")}
            </Button>
          )}
          {step < 3 ? (
            <Button onClick={nextStep} type="button" className="flex-1">
              {t("common.next")}
            </Button>
          ) : (
            <Button type="submit" loading={loading} className="flex-1">
              {t("auth.submitApplication")}
            </Button>
          )}
        </div>
      </form>

      <p className="text-center text-sm text-text-secondary mt-6">
        {t("auth.alreadySeller")}{" "}
        <Link to="/login" className="text-accent font-medium hover:underline">
          {t("auth.signIn")}
        </Link>
      </p>
    </div>
  );
}
