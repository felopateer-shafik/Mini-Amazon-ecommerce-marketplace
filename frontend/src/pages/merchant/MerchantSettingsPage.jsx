import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import {
  Store,
  Camera,
  Save,
  CreditCard,
  Loader2,
  AlertCircle,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import Toggle from "@/components/ui/Toggle";
import Tabs from "@/components/ui/Tabs";
import FileUpload from "@/components/ui/FileUpload";
import { useTranslation } from "@/hooks/useTranslation";
import { useMerchantSettings, useUpdateMerchantSettings } from "@/hooks/useApi";
import toast from "react-hot-toast";

const DEFAULT_SETTINGS = {
  storeName: "",
  description: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  state: "",
  postalCode: "",
  country: "",
  bankName: "",
  accountName: "",
  accountNumber: "",
  iban: "",
};

export default function MerchantSettingsPage() {
  const { t } = useTranslation();
  const { data: settings, isLoading, isError, error } = useMerchantSettings();
  const settingsData = settings?.data ?? settings ?? null;
  const updateSettings = useUpdateMerchantSettings();
  const [initialNotifications, setInitialNotifications] = useState(null);

  const {
    register,
    handleSubmit,
    reset,
    getValues,
    setError,
    clearErrors,
    formState: { errors, isDirty },
  } = useForm({
    defaultValues: DEFAULT_SETTINGS,
  });

  // Populate form when settings arrive from API
  useEffect(() => {
    if (settingsData) {
      reset({
        ...DEFAULT_SETTINGS,
        storeName: settingsData.store_name ?? settingsData.storeName ?? "",
        description: settingsData.description ?? "",
        email: settingsData.email ?? "",
        phone: settingsData.phone ?? "",
        address: settingsData.address ?? "",
        city: settingsData.city ?? "",
        state: settingsData.state ?? "",
        postalCode: settingsData.postal_code ?? settingsData.postalCode ?? "",
        country: settingsData.country ?? "",
        bankName: settingsData.bank_name ?? settingsData.bankName ?? "",
        accountName:
          settingsData.account_name ?? settingsData.accountName ?? "",
        accountNumber:
          settingsData.account_number ?? settingsData.accountNumber ?? "",
        iban: settingsData.iban ?? "",
      });
      setNotifications({
        newOrders:
          settingsData.notification_preferences?.newOrders ??
          settingsData.notifications?.newOrders ??
          true,
        lowStock:
          settingsData.notification_preferences?.lowStock ??
          settingsData.notifications?.lowStock ??
          true,
        reviews:
          settingsData.notification_preferences?.reviews ??
          settingsData.notifications?.reviews ??
          true,
        payouts:
          settingsData.notification_preferences?.payouts ??
          settingsData.notifications?.payouts ??
          true,
        promotions:
          settingsData.notification_preferences?.promotions ??
          settingsData.notifications?.promotions ??
          false,
      });
      setInitialNotifications({
        newOrders:
          settingsData.notification_preferences?.newOrders ??
          settingsData.notifications?.newOrders ??
          true,
        lowStock:
          settingsData.notification_preferences?.lowStock ??
          settingsData.notifications?.lowStock ??
          true,
        reviews:
          settingsData.notification_preferences?.reviews ??
          settingsData.notifications?.reviews ??
          true,
        payouts:
          settingsData.notification_preferences?.payouts ??
          settingsData.notifications?.payouts ??
          true,
        promotions:
          settingsData.notification_preferences?.promotions ??
          settingsData.notifications?.promotions ??
          false,
      });
    }
  }, [settingsData, reset]);

  const [logo, setLogo] = useState([]);
  const [banner, setBanner] = useState([]);
  const logoInputRef = useRef(null);
  const [notifications, setNotifications] = useState({
    newOrders: true,
    lowStock: true,
    reviews: true,
    payouts: true,
    promotions: false,
  });

  const fileToDataUrl = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const hasUnsavedChanges =
    isDirty ||
    logo.length > 0 ||
    banner.length > 0 ||
    JSON.stringify(notifications) !==
      JSON.stringify(initialNotifications || notifications);

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (!hasUnsavedChanges) return;
      e.preventDefault();
      e.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const handleTabChange = () => {
    if (!hasUnsavedChanges) return true;
    return window.confirm(t("merchant.unsavedChangesPrompt"));
  };

  const mapServerFieldToFormField = (serverField) => {
    const mapping = {
      store_name: "storeName",
      description: "description",
      email: "email",
      phone: "phone",
      address: "address",
      city: "city",
      state: "state",
      postal_code: "postalCode",
      country: "country",
      bank_name: "bankName",
      account_name: "accountName",
      account_number: "accountNumber",
      iban: "iban",
    };

    return mapping[serverField] || null;
  };

  const onSave = async (formData) => {
    clearErrors();

    const normalizeCountryValue = (value) => {
      if (typeof value === "string") return value;
      if (value && typeof value === "object") {
        if (typeof value.value === "string") return value.value;
        if (typeof value.label === "string") return value.label;
      }
      return "";
    };

    let logoValue = settingsData?.logo || null;
    let bannerValue = settingsData?.banner || null;

    if (logo?.[0] instanceof File) {
      logoValue = await fileToDataUrl(logo[0]);
    }
    if (banner?.[0] instanceof File) {
      bannerValue = await fileToDataUrl(banner[0]);
    }

    const payload = {
      store_name: formData.storeName,
      description: formData.description,
      email: formData.email,
      phone: formData.phone,
      address: formData.address,
      city: formData.city,
      state: formData.state,
      postal_code: formData.postalCode,
      country: normalizeCountryValue(formData.country ?? settingsData?.country),
      bank_name: formData.bankName,
      account_name: formData.accountName,
      account_number: formData.accountNumber,
      iban: formData.iban,
      logo: logoValue,
      banner: bannerValue,
      notification_preferences: notifications,
    };

    try {
      await updateSettings.mutateAsync(payload);
      reset(getValues());
      setLogo([]);
      setBanner([]);
      setInitialNotifications({ ...notifications });
      toast.success(t("merchant.settingsSaved"));
    } catch (err) {
      const serverErrors = err?.response?.data?.errors;
      if (serverErrors && typeof serverErrors === "object") {
        Object.entries(serverErrors).forEach(([field, messages]) => {
          const formField = mapServerFieldToFormField(field);
          const message = Array.isArray(messages) ? messages[0] : messages;
          if (formField && message) {
            setError(formField, { type: "server", message: String(message) });
          }
        });
      }
      toast.error(
        err?.response?.data?.message || t("merchant.settingsSaveError"),
      );
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3 text-red-600">
        <AlertCircle className="h-10 w-10" />
        <p className="text-sm font-medium">
          {error?.response?.data?.message || t("merchant.failedLoadSettings")}
        </p>
      </div>
    );
  }

  const tabs = [
    {
      id: "profile",
      label: t("merchant.storeProfile"),
      content: (
        <form
          onSubmit={handleSubmit(onSave)}
          className="space-y-4 sm:space-y-6"
        >
          <div className="flex items-center gap-6 mb-4">
            <div className="w-20 h-20 bg-primary/10 rounded-xl flex items-center justify-center relative">
              <Store className="h-8 w-8 text-primary" />
              <button
                type="button"
                className="absolute -bottom-1 -right-1 w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-xs"
                onClick={() => logoInputRef.current?.click()}
                aria-label={t("merchant.changePhoto")}
              >
                <Camera className="h-3 w-3" />
              </button>
            </div>
            <div className="flex-1">
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) setLogo([file]);
                }}
              />
              <FileUpload
                onDrop={setLogo}
                files={logo}
                onRemove={() => setLogo([])}
                maxFiles={1}
                accept={{ "image/*": [] }}
              />
            </div>
          </div>
          <Input
            label={t("merchant.storeName")}
            {...register("storeName", {
              required: t("merchant.storeNameRequired"),
            })}
            error={errors.storeName?.message}
            required
          />
          <Textarea
            label={t("merchant.storeDescription")}
            {...register("description")}
            error={errors.description?.message}
            rows={3}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label={t("common.email")}
              type="email"
              {...register("email", {
                pattern: {
                  value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                  message: t("merchant.invalidEmailFormat"),
                },
              })}
              error={errors.email?.message}
            />
            <Input
              label={t("common.phone")}
              {...register("phone")}
              error={errors.phone?.message}
            />
          </div>
          <Input
            label={t("common.address")}
            {...register("address")}
            error={errors.address?.message}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label={t("common.city")}
              {...register("city")}
              error={errors.city?.message}
            />
            <Input
              label={t("common.state")}
              {...register("state")}
              error={errors.state?.message}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label={t("common.zipCode")}
              {...register("postalCode")}
              error={errors.postalCode?.message}
            />
            <Input
              label={t("common.country")}
              {...register("country")}
              error={errors.country?.message}
            />
          </div>
          <h3 className="font-semibold text-text">
            {t("merchant.storeBanner")}
          </h3>
          <FileUpload
            onDrop={setBanner}
            files={banner}
            onRemove={() => setBanner([])}
            maxFiles={1}
            accept={{ "image/*": [] }}
          />
          <div className="flex justify-end">
            <Button
              type="submit"
              icon={Save}
              disabled={updateSettings.isPending}
            >
              {updateSettings.isPending
                ? t("merchant.saving")
                : t("merchant.saveSettings")}
            </Button>
          </div>
        </form>
      ),
    },
    {
      id: "bank",
      label: t("merchant.bankDetails"),
      content: (
        <form onSubmit={handleSubmit(onSave)} className="space-y-4">
          <p className="text-sm text-text-secondary mb-4">
            {t("merchant.configureBankPayout")}
          </p>
          <Input
            label={t("merchant.bankName")}
            icon={CreditCard}
            {...register("bankName")}
            error={errors.bankName?.message}
          />
          <Input
            label={t("merchant.accountHolderName")}
            {...register("accountName")}
            error={errors.accountName?.message}
          />
          <Input
            label={t("merchant.accountNumber")}
            {...register("accountNumber")}
            error={errors.accountNumber?.message}
          />
          <Input
            label={t("merchant.ibanRoutingNumber")}
            {...register("iban")}
            error={errors.iban?.message}
          />
          <div className="flex justify-end">
            <Button
              type="submit"
              icon={Save}
              disabled={updateSettings.isPending}
            >
              {updateSettings.isPending
                ? t("merchant.saving")
                : t("merchant.saveBankDetails")}
            </Button>
          </div>
        </form>
      ),
    },
    {
      id: "notifications",
      label: t("merchant.merchantNotifications"),
      content: (
        <div className="space-y-4">
          {Object.entries({
            newOrders: t("merchant.newOrderAlerts"),
            lowStock: t("merchant.lowStockWarnings"),
            reviews: t("merchant.newReviews"),
            payouts: t("merchant.payoutUpdates"),
            promotions: t("merchant.promotionalEmails"),
          }).map(([key, label]) => (
            <div
              key={key}
              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
            >
              <span className="text-sm font-medium text-text">{label}</span>
              <Toggle
                checked={notifications[key]}
                onChange={(v) =>
                  setNotifications({ ...notifications, [key]: v })
                }
              />
            </div>
          ))}
          <div className="flex justify-end">
            <Button
              icon={Save}
              disabled={updateSettings.isPending}
              onClick={() => {
                const payload = {
                  notification_preferences: notifications,
                };
                updateSettings.mutate(payload, {
                  onSuccess: () => {
                    setInitialNotifications({ ...notifications });
                    toast.success(t("merchant.notificationPreferencesSaved"));
                  },
                  onError: (err) =>
                    toast.error(
                      err?.response?.data?.message ||
                        t("merchant.failedSaveNotifications"),
                    ),
                });
              }}
            >
              {updateSettings.isPending
                ? t("merchant.saving")
                : t("merchant.saveNotifications")}
            </Button>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-text">
          {t("merchant.storeSettings")}
        </h1>
        <p className="text-sm text-text-secondary">
          {t("merchant.manageStoreConfiguration")}
        </p>
      </div>
      <div className="bg-white rounded-xl border border-border/50 p-6">
        <Tabs tabs={tabs} onChange={handleTabChange} />
      </div>
    </div>
  );
}
