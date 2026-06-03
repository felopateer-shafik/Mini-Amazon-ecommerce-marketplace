import { useState, useEffect } from "react";
import {
  Save,
  Globe,
  Mail,
  CreditCard,
  Share2,
  Shield,
  Wrench,
  Bell,
  Palette,
  Loader2,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import toast from "react-hot-toast";
import { useTranslation } from "@/hooks/useTranslation";
import {
  useAdminMaintenanceAction,
  useAdminSettings,
  useAdminUpdateSettings,
} from "@/hooks/useApi";
import { usePermission } from "@/hooks/usePermission";

const settingsTabs = [
  { id: "general", labelKey: "admin.settingsTabGeneral", icon: Globe },
  { id: "email", labelKey: "admin.settingsTabEmail", icon: Mail },
  { id: "payment", labelKey: "admin.settingsTabPayment", icon: CreditCard },
  { id: "social", labelKey: "admin.settingsTabSocial", icon: Share2 },
  { id: "security", labelKey: "admin.settingsTabSecurity", icon: Shield },
  {
    id: "notifications",
    labelKey: "admin.settingsTabNotifications",
    icon: Bell,
  },
  { id: "appearance", labelKey: "admin.settingsTabAppearance", icon: Palette },
  { id: "maintenance", labelKey: "admin.settingsTabMaintenance", icon: Wrench },
];

function ToggleSwitch({
  label,
  description,
  defaultChecked = false,
  checked,
  onChange,
}) {
  const [localOn, setLocalOn] = useState(defaultChecked);
  const isControlled = checked !== undefined;
  const on = isControlled ? checked : localOn;
  const toggle = () => {
    if (isControlled) {
      onChange?.(!on);
    } else {
      setLocalOn(!on);
      onChange?.(!on);
    }
  };
  return (
    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg gap-2">
      <div>
        <p className="text-sm font-medium text-text">{label}</p>
        {description && (
          <p className="text-xs text-text-secondary mt-0.5">{description}</p>
        )}
      </div>
      <button
        onClick={toggle}
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={label}
        className={`w-11 h-6 rounded-full relative transition min-width-45px  ${on ? "bg-primary" : "bg-gray-300"}`}
      >
        <span
          className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition ${on ? "right-0.5" : "left-0.5"}`}
        />
      </button>
    </div>
  );
}

export default function SettingsPage() {
  const { t } = useTranslation();
  const { hasPerm } = usePermission();
  const canEdit = hasPerm("edit-settings");
  const [activeTab, setActiveTab] = useState("general");

  // Load settings from API
  const { data: settingsResponse, isLoading } = useAdminSettings();
  const updateSettings = useAdminUpdateSettings();
  const maintenanceAction = useAdminMaintenanceAction();

  const serverSettings = settingsResponse?.data ?? settingsResponse ?? {};

  // Local form state (synced from API)
  const [form, setForm] = useState({});
  const [formInitialized, setFormInitialized] = useState(false);

  const toBool = (value, fallback = true) => {
    if (typeof value === "boolean") return value;
    if (typeof value === "number") return value !== 0;
    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase();
      if (["true", "1", "yes", "on"].includes(normalized)) return true;
      if (["false", "0", "no", "off"].includes(normalized)) return false;
    }
    return fallback;
  };

  // Initialize form from server on first load only
  useEffect(() => {
    if (
      !formInitialized &&
      serverSettings &&
      Object.keys(serverSettings).length > 0
    ) {
      setForm(serverSettings);
      setFormInitialized(true);
    }
  }, [serverSettings, formInitialized]);

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const pickFields = (source, fields) =>
    fields.reduce((acc, field) => {
      if (Object.prototype.hasOwnProperty.call(source, field)) {
        acc[field] = source[field];
      }
      return acc;
    }, {});

  const getPayloadForActiveTab = () => {
    const fieldsByTab = {
      general: [
        "site_name",
        "site_name_ar",
        "site_email",
        "site_phone",
        "currency",
        "currency_symbol",
        "tax_rate",
        "shipping_fee",
        "free_shipping_threshold",
        "free_shipping_threshold_enabled",
        "commission_rate",
        "default_language",
        "min_withdrawal",
        "site_description",
        "maintenance_mode",
        "require_vendor_approval",
        "require_product_approval",
        "allow_registration",
      ],
      email: [
        "mail_driver",
        "smtp_host",
        "smtp_port",
        "smtp_username",
        "smtp_password",
        "smtp_encryption",
        "mail_from_address",
        "mail_from_name",
      ],
      payment: [
        "stripe_enabled",
        "stripe_public_key",
        "stripe_secret_key",
        "paypal_enabled",
        "paypal_client_id",
        "paypal_client_secret",
        "cod_enabled",
        "wallet_topup_enabled",
        "commission_rate",
        "min_payout",
      ],
      social: [
        "google_auth_enabled",
        "google_client_id",
        "google_client_secret",
        "facebook_auth_enabled",
        "facebook_client_id",
        "facebook_client_secret",
        "apple_auth_enabled",
        "apple_client_id",
        "apple_client_secret",
        "facebook_pixel_enabled",
        "facebook_pixel_id",
      ],
      security: [
        "two_factor_enabled",
        "recaptcha_enabled",
        "recaptcha_site_key",
        "recaptcha_secret_key",
        "login_throttling",
        "max_login_attempts",
        "force_https",
      ],
      notifications: [
        "notify_new_order",
        "notify_new_merchant",
        "notify_refund_request",
        "notify_low_stock",
        "notify_product_report",
        "require_review_approval",
        "low_stock_threshold",
      ],
      appearance: [
        "primary_color",
        "secondary_color",
        "accent_color",
        "logo_url",
        "favicon_url",
        "dark_mode_enabled",
      ],
      maintenance: ["maintenance_mode", "maintenance_message"],
    };

    return pickFields(form, fieldsByTab[activeTab] || []);
  };

  const sanitizePayloadForActiveTab = (payload) => {
    const sanitized = { ...payload };

    const normalizeEmpty = (value) => {
      if (typeof value === "string" && value.trim() === "") {
        return null;
      }
      return value;
    };

    Object.keys(sanitized).forEach((key) => {
      sanitized[key] = normalizeEmpty(sanitized[key]);
    });

    if (activeTab === "email") {
      if (
        sanitized.mail_driver &&
        !["smtp", "mailgun", "ses", "postmark"].includes(sanitized.mail_driver)
      ) {
        sanitized.mail_driver = "smtp";
      }
      if (
        sanitized.smtp_encryption &&
        !["tls", "ssl", "none"].includes(sanitized.smtp_encryption)
      ) {
        sanitized.smtp_encryption = "tls";
      }
    }

    if (activeTab === "payment") {
      if (
        sanitized.commission_rate !== null &&
        sanitized.commission_rate !== undefined
      ) {
        const commission = Number.parseFloat(sanitized.commission_rate);
        sanitized.commission_rate = Number.isFinite(commission)
          ? commission
          : null;
      }

      if (sanitized.min_payout !== null && sanitized.min_payout !== undefined) {
        const minPayout = Number.parseFloat(sanitized.min_payout);
        sanitized.min_payout = Number.isFinite(minPayout) ? minPayout : null;
      }
    }

    if (activeTab === "social") {
      const pixelId = String(sanitized.facebook_pixel_id ?? "").trim();
      if (pixelId === "") {
        delete sanitized.facebook_pixel_id;
      } else {
        sanitized.facebook_pixel_id = pixelId;
      }
    }

    if (activeTab === "security") {
      if (
        sanitized.max_login_attempts !== null &&
        sanitized.max_login_attempts !== undefined
      ) {
        const attempts = Number.parseInt(
          String(sanitized.max_login_attempts),
          10,
        );
        sanitized.max_login_attempts = Number.isInteger(attempts)
          ? attempts
          : null;
      }
    }

    if (activeTab === "appearance") {
      const colorRegex = /^#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6})$/;
      const primaryColor = String(sanitized.primary_color ?? "").trim();
      if (primaryColor === "" || !colorRegex.test(primaryColor)) {
        delete sanitized.primary_color;
      }

      const secondaryColor = String(sanitized.secondary_color ?? "").trim();
      if (secondaryColor === "" || !colorRegex.test(secondaryColor)) {
        delete sanitized.secondary_color;
      }

      const accentColor = String(sanitized.accent_color ?? "").trim();
      if (accentColor === "" || !colorRegex.test(accentColor)) {
        delete sanitized.accent_color;
      }
    }

    return sanitized;
  };

  const handleSave = async () => {
    if (!canEdit) return;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (form.site_email && !emailRegex.test(form.site_email)) {
      toast.error(t("admin.invalidSiteEmail"));
      return;
    }
    if (form.mail_from_address && !emailRegex.test(form.mail_from_address)) {
      toast.error(t("admin.invalidFromAddressEmail"));
      return;
    }

    const payload = sanitizePayloadForActiveTab(getPayloadForActiveTab());

    if (Object.keys(payload).length === 0) {
      toast.error(t("admin.noChangesToSave"));
      return;
    }

    try {
      await updateSettings.mutateAsync(payload);
      toast.success(t("admin.settingsSaved"));
    } catch (err) {
      const firstValidationError = Object.values(
        err?.response?.data?.errors || {},
      )
        .flat()
        .find(Boolean);
      toast.error(
        firstValidationError ||
          err?.response?.data?.message ||
          t("admin.failedSaveSettings"),
      );
    }
  };

  const runMaintenance = async (action) => {
    if (!canEdit) return;
    try {
      const response = await maintenanceAction.mutateAsync(action);
      toast.success(response?.message || t("admin.maintenanceActionCompleted"));
    } catch {
      toast.error(t("admin.maintenanceActionFailed"));
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-text">
          {t("admin.siteSettings")}
        </h1>
        <p className="text-sm text-text-secondary">
          {t("admin.platformConfiguration")}
        </p>
      </div>

      <div className="flex gap-6 flex-col md:flex-row">
        {/* Sidebar */}
        <div className="w-full md:w-56 shrink-0">
          <div className="bg-white rounded-xl border border-border/50 overflow-hidden">
            {settingsTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition border-l-2 ${activeTab === tab.id ? "bg-primary/5 text-primary border-primary" : "text-text-secondary border-transparent hover:bg-gray-50"}`}
              >
                <tab.icon className="h-4 w-4" />
                {t(tab.labelKey)}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            activeTab === "general" && (
              <div className="bg-white rounded-xl border border-border/50 p-6 space-y-6">
                <h2 className="font-semibold text-text">
                  {t("admin.generalSettings")}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label={t("admin.siteName")}
                    value={form.site_name ?? ""}
                    onChange={(e) => updateField("site_name", e.target.value)}
                  />
                  <Input
                    label={t("admin.siteEmail")}
                    value={form.site_email ?? ""}
                    onChange={(e) => updateField("site_email", e.target.value)}
                  />
                  <Input
                    label="Site Name (Arabic)"
                    value={form.site_name_ar ?? ""}
                    onChange={(e) =>
                      updateField("site_name_ar", e.target.value)
                    }
                  />
                  <Input
                    label={t("admin.sitePhone")}
                    value={form.site_phone ?? ""}
                    onChange={(e) => updateField("site_phone", e.target.value)}
                  />
                  <Input
                    label={t("admin.currency")}
                    value={form.currency ?? ""}
                    onChange={(e) => updateField("currency", e.target.value)}
                  />
                  <Input
                    label="Currency Symbol"
                    value={form.currency_symbol ?? ""}
                    onChange={(e) =>
                      updateField("currency_symbol", e.target.value)
                    }
                  />
                  <Input
                    label={t("admin.taxRate")}
                    type="number"
                    value={form.tax_rate ?? ""}
                    onChange={(e) =>
                      updateField("tax_rate", parseFloat(e.target.value) || 0)
                    }
                  />
                  <Input
                    label={t("admin.shippingFee")}
                    type="number"
                    value={form.shipping_fee ?? ""}
                    onChange={(e) =>
                      updateField(
                        "shipping_fee",
                        parseFloat(e.target.value) || 0,
                      )
                    }
                  />
                  <Input
                    label={t("admin.freeShippingThreshold")}
                    type="number"
                    value={form.free_shipping_threshold ?? ""}
                    onChange={(e) =>
                      updateField(
                        "free_shipping_threshold",
                        parseFloat(e.target.value) || 0,
                      )
                    }
                  />
                  <Input
                    label={t("admin.commissionRate")}
                    type="number"
                    value={form.commission_rate ?? ""}
                    onChange={(e) =>
                      updateField(
                        "commission_rate",
                        parseFloat(e.target.value) || 0,
                      )
                    }
                  />
                  <Input
                    label={t("admin.defaultLanguage")}
                    value={form.default_language ?? "en"}
                    onChange={(e) =>
                      updateField("default_language", e.target.value)
                    }
                  />
                  <Input
                    label={t("admin.minWithdrawal")}
                    type="number"
                    value={form.min_withdrawal ?? ""}
                    onChange={(e) =>
                      updateField(
                        "min_withdrawal",
                        parseFloat(e.target.value) || 0,
                      )
                    }
                  />
                  <div className="col-span-full">
                    <label className="block text-sm font-medium text-text mb-1.5">
                      {t("admin.siteDescription")}
                    </label>
                    <textarea
                      className="w-full border border-border rounded-lg px-3 py-2.5 text-sm min-h-[80px]"
                      value={form.site_description ?? ""}
                      onChange={(e) =>
                        updateField("site_description", e.target.value)
                      }
                    />
                  </div>
                </div>
                <ToggleSwitch
                  label="Enable Free Shipping Threshold"
                  description="Apply free shipping only when cart subtotal reaches threshold."
                  checked={toBool(form.free_shipping_threshold_enabled, true)}
                  onChange={(val) =>
                    updateField("free_shipping_threshold_enabled", val)
                  }
                />
                <ToggleSwitch
                  label={t("admin.maintenanceMode")}
                  description={t("admin.maintenanceModeDesc")}
                  checked={!!form.maintenance_mode}
                  onChange={(val) => updateField("maintenance_mode", val)}
                />
                <ToggleSwitch
                  label={t("admin.requireVendorApproval")}
                  description={t("admin.requireVendorApprovalDesc")}
                  checked={toBool(form.require_vendor_approval, true)}
                  onChange={(val) =>
                    updateField("require_vendor_approval", val)
                  }
                />
                <ToggleSwitch
                  label={t("admin.requireProductApproval")}
                  description={t("admin.requireProductApprovalDesc")}
                  checked={toBool(form.require_product_approval, true)}
                  onChange={(val) =>
                    updateField("require_product_approval", val)
                  }
                />
                <ToggleSwitch
                  label={t("admin.allowRegistration")}
                  description={t("admin.allowRegistrationDesc")}
                  checked={toBool(form.allow_registration, true)}
                  onChange={(val) => updateField("allow_registration", val)}
                />
                <Button
                  icon={Save}
                  onClick={handleSave}
                  loading={updateSettings.isPending}
                >
                  {t("admin.saveSettings")}
                </Button>
              </div>
            )
          )}

          {activeTab === "email" && (
            <div className="bg-white rounded-xl border border-border/50 p-6 space-y-6">
              <h2 className="font-semibold text-text">
                {t("admin.emailConfiguration")}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text mb-1.5">
                    {t("admin.mailDriver")}
                  </label>
                  <select
                    className="w-full border border-border rounded-lg px-3 py-2.5 text-sm"
                    value={form.mail_driver ?? "smtp"}
                    onChange={(e) => updateField("mail_driver", e.target.value)}
                  >
                    <option value="smtp">SMTP</option>
                    <option value="mailgun">Mailgun</option>
                    <option value="ses">SES</option>
                    <option value="postmark">Postmark</option>
                  </select>
                </div>
                <Input
                  label={t("admin.smtpHost")}
                  value={form.smtp_host ?? ""}
                  onChange={(e) => updateField("smtp_host", e.target.value)}
                />
                <Input
                  label={t("admin.smtpPort")}
                  value={form.smtp_port ?? "587"}
                  onChange={(e) => updateField("smtp_port", e.target.value)}
                />
                <Input
                  label={t("admin.smtpUsername")}
                  value={form.smtp_username ?? ""}
                  onChange={(e) => updateField("smtp_username", e.target.value)}
                />
                <Input
                  label={t("admin.smtpPassword")}
                  type="password"
                  value={form.smtp_password ?? ""}
                  onChange={(e) => updateField("smtp_password", e.target.value)}
                />
                <div>
                  <label className="block text-sm font-medium text-text mb-1.5">
                    {t("admin.encryption")}
                  </label>
                  <select
                    className="w-full border border-border rounded-lg px-3 py-2.5 text-sm"
                    value={form.smtp_encryption ?? "tls"}
                    onChange={(e) =>
                      updateField("smtp_encryption", e.target.value)
                    }
                  >
                    <option value="tls">TLS</option>
                    <option value="ssl">SSL</option>
                    <option value="none">{t("admin.none")}</option>
                  </select>
                </div>
                <Input
                  label={t("admin.fromAddress")}
                  value={form.mail_from_address ?? ""}
                  onChange={(e) =>
                    updateField("mail_from_address", e.target.value)
                  }
                />
                <Input
                  label={t("admin.fromName")}
                  value={form.mail_from_name ?? ""}
                  onChange={(e) =>
                    updateField("mail_from_name", e.target.value)
                  }
                />
              </div>
              <Button
                icon={Save}
                onClick={handleSave}
                loading={updateSettings.isPending}
              >
                {t("common.save")}
              </Button>
            </div>
          )}

          {activeTab === "payment" && (
            <div className="bg-white rounded-xl border border-border/50 p-6 space-y-6">
              <h2 className="font-semibold text-text">
                {t("admin.paymentGateways")}
              </h2>
              {[
                {
                  name: t("admin.gatewayStripe"),
                  key: "stripe",
                  fields: [
                    { label: t("admin.publicKey"), key: "stripe_public_key" },
                    { label: t("admin.secretKey"), key: "stripe_secret_key" },
                  ],
                },
                {
                  name: t("admin.gatewayPayPal"),
                  key: "paypal",
                  fields: [
                    { label: t("admin.clientId"), key: "paypal_client_id" },
                    {
                      label: t("admin.clientSecret"),
                      key: "paypal_client_secret",
                    },
                  ],
                },
                { name: t("admin.gatewayCod"), key: "cod", fields: [] },
              ].map((gw) => (
                <div
                  key={gw.name}
                  className="border border-border/50 rounded-lg p-4 space-y-3"
                >
                  <ToggleSwitch
                    label={gw.name}
                    description={t("admin.enablePaymentGateway", {
                      name: gw.name,
                    })}
                    checked={!!form[`${gw.key}_enabled`]}
                    onChange={(val) => updateField(`${gw.key}_enabled`, val)}
                  />
                  {gw.fields.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-4">
                      {gw.fields.map((f) => (
                        <Input
                          key={f.key}
                          label={f.label}
                          type="password"
                          value={form[f.key] ?? ""}
                          onChange={(e) => updateField(f.key, e.target.value)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ))}
              <div className="border border-border/50 rounded-lg p-4 space-y-3">
                <h3 className="font-medium text-text">
                  {t("admin.commissionSettings")}
                </h3>
                <ToggleSwitch
                  label="Enable Wallet Top-up"
                  description="Allow customers to add funds to their wallet."
                  checked={!!form.wallet_topup_enabled}
                  onChange={(val) => updateField("wallet_topup_enabled", val)}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Input
                    label={t("admin.defaultCommissionRate")}
                    value={form.commission_rate ?? ""}
                    onChange={(e) =>
                      updateField(
                        "commission_rate",
                        parseFloat(e.target.value) || 0,
                      )
                    }
                  />
                  <Input
                    label={t("admin.minimumPayoutAmount")}
                    value={form.min_payout ?? ""}
                    onChange={(e) =>
                      updateField("min_payout", parseFloat(e.target.value) || 0)
                    }
                  />
                </div>
              </div>
              <Button
                icon={Save}
                onClick={handleSave}
                loading={updateSettings.isPending}
              >
                {t("common.save")}
              </Button>
            </div>
          )}

          {activeTab === "social" && (
            <div className="bg-white rounded-xl border border-border/50 p-6 space-y-6">
              <h2 className="font-semibold text-text">
                {t("admin.socialAuthentication")}
              </h2>
              {[
                { name: "Google", key: "google" },
                { name: "Facebook", key: "facebook" },
                { name: "Apple", key: "apple" },
              ].map((provider) => (
                <div
                  key={provider.name}
                  className="border border-border/50 rounded-lg p-4 space-y-3"
                >
                  <ToggleSwitch
                    label={t("admin.socialLoginLabel", { name: provider.name })}
                    description={t("admin.socialLoginDesc", {
                      name: provider.name,
                    })}
                    checked={!!form[`${provider.key}_auth_enabled`]}
                    onChange={(val) =>
                      updateField(`${provider.key}_auth_enabled`, val)
                    }
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-4">
                    <Input
                      label="Client ID"
                      value={form[`${provider.key}_client_id`] ?? ""}
                      onChange={(e) =>
                        updateField(`${provider.key}_client_id`, e.target.value)
                      }
                      type="password"
                    />
                    <Input
                      label="Client Secret"
                      value={form[`${provider.key}_client_secret`] ?? ""}
                      onChange={(e) =>
                        updateField(
                          `${provider.key}_client_secret`,
                          e.target.value,
                        )
                      }
                      type="password"
                    />
                  </div>
                </div>
              ))}

              <div className="border border-border/50 rounded-lg p-4 space-y-3">
                <ToggleSwitch
                  label={t("admin.facebookPixel")}
                  description={t("admin.facebookPixelDesc")}
                  checked={!!form.facebook_pixel_enabled}
                  onChange={(val) => updateField("facebook_pixel_enabled", val)}
                />
                <div className="pl-4">
                  <Input
                    label={t("admin.pixelId")}
                    value={form.facebook_pixel_id ?? ""}
                    onChange={(e) =>
                      updateField("facebook_pixel_id", e.target.value.trim())
                    }
                    placeholder={t("admin.pixelIdPlaceholder")}
                  />
                </div>
              </div>

              <Button
                icon={Save}
                onClick={handleSave}
                loading={updateSettings.isPending}
              >
                {t("common.save")}
              </Button>
            </div>
          )}

          {activeTab === "security" && (
            <div className="bg-white rounded-xl border border-border/50 p-6 space-y-4">
              <h2 className="font-semibold text-text">
                {t("admin.securitySettings")}
              </h2>
              <ToggleSwitch
                label={t("admin.twoFactorAuth")}
                description={t("admin.twoFactorAuthDesc")}
                checked={!!form.two_factor_enabled}
                onChange={(val) => updateField("two_factor_enabled", val)}
              />
              <ToggleSwitch
                label="reCAPTCHA"
                description={t("admin.recaptchaDesc")}
                checked={!!form.recaptcha_enabled}
                onChange={(val) => updateField("recaptcha_enabled", val)}
              />
              <Input
                label={t("admin.recaptchaSiteKey")}
                type="password"
                value={form.recaptcha_site_key ?? ""}
                onChange={(e) =>
                  updateField("recaptcha_site_key", e.target.value)
                }
              />
              <Input
                label={t("admin.recaptchaSecretKey")}
                type="password"
                value={form.recaptcha_secret_key ?? ""}
                onChange={(e) =>
                  updateField("recaptcha_secret_key", e.target.value)
                }
              />
              <ToggleSwitch
                label={t("admin.loginThrottling")}
                description={t("admin.loginThrottlingDesc")}
                checked={form.login_throttling !== false}
                onChange={(val) => updateField("login_throttling", val)}
              />
              <Input
                label={t("admin.maxLoginAttempts")}
                value={form.max_login_attempts ?? "5"}
                onChange={(e) =>
                  updateField("max_login_attempts", e.target.value)
                }
              />
              <ToggleSwitch
                label={t("admin.forceHttps")}
                description={t("admin.forceHttpsDesc")}
                checked={!!form.force_https}
                onChange={(val) => updateField("force_https", val)}
              />
              <Button
                icon={Save}
                onClick={handleSave}
                loading={updateSettings.isPending}
              >
                {t("common.save")}
              </Button>
            </div>
          )}

          {activeTab === "notifications" && (
            <div className="bg-white rounded-xl border border-border/50 p-6 space-y-4">
              <h2 className="font-semibold text-text">
                {t("admin.notificationSettings")}
              </h2>
              <h3 className="text-sm font-medium text-text-secondary mt-2">
                {t("admin.adminNotifications")}
              </h3>
              <ToggleSwitch
                label={t("admin.newOrder")}
                description={t("admin.newOrderDesc")}
                checked={form.notify_new_order !== false}
                onChange={(val) => updateField("notify_new_order", val)}
              />
              <ToggleSwitch
                label={t("admin.newMerchantApplication")}
                description={t("admin.newMerchantApplicationDesc")}
                checked={form.notify_new_merchant !== false}
                onChange={(val) => updateField("notify_new_merchant", val)}
              />
              <ToggleSwitch
                label={t("admin.refundRequest")}
                description={t("admin.refundRequestDesc")}
                checked={form.notify_refund_request !== false}
                onChange={(val) => updateField("notify_refund_request", val)}
              />
              <ToggleSwitch
                label={t("admin.lowStockAlert")}
                description={t("admin.lowStockAlertDesc")}
                checked={form.notify_low_stock !== false}
                onChange={(val) => updateField("notify_low_stock", val)}
              />
              <ToggleSwitch
                label={t("admin.productReport")}
                description={t("admin.productReportDesc")}
                checked={form.notify_product_report !== false}
                onChange={(val) => updateField("notify_product_report", val)}
              />
              <ToggleSwitch
                label="Require Review Approval"
                description="New product reviews remain pending until approved by admin."
                checked={form.require_review_approval !== false}
                onChange={(val) => updateField("require_review_approval", val)}
              />
              <Input
                label={t("admin.lowStockThreshold")}
                value={form.low_stock_threshold ?? "10"}
                onChange={(e) =>
                  updateField("low_stock_threshold", e.target.value)
                }
              />
              <Button
                icon={Save}
                onClick={handleSave}
                loading={updateSettings.isPending}
              >
                {t("common.save")}
              </Button>
            </div>
          )}

          {activeTab === "appearance" && (
            <div className="bg-white rounded-xl border border-border/50 p-6 space-y-6">
              <h2 className="font-semibold text-text">
                {t("admin.appearance")}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text mb-1.5">
                    {t("admin.primaryColor")}
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={form.primary_color ?? "#FF9900"}
                      onChange={(e) =>
                        updateField("primary_color", e.target.value)
                      }
                      className="w-10 h-10 border border-border rounded cursor-pointer"
                    />
                    <Input
                      value={form.primary_color ?? "#FF9900"}
                      onChange={(e) =>
                        updateField("primary_color", e.target.value)
                      }
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text mb-1.5">
                    {t("admin.secondaryColor")}
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={form.secondary_color ?? "#232F3E"}
                      onChange={(e) =>
                        updateField("secondary_color", e.target.value)
                      }
                      className="w-10 h-10 border border-border rounded cursor-pointer"
                    />
                    <Input
                      value={form.secondary_color ?? "#232F3E"}
                      onChange={(e) =>
                        updateField("secondary_color", e.target.value)
                      }
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text mb-1.5">
                    Accent Color
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={form.accent_color ?? "#146EB4"}
                      onChange={(e) =>
                        updateField("accent_color", e.target.value)
                      }
                      className="w-10 h-10 border border-border rounded cursor-pointer"
                    />
                    <Input
                      value={form.accent_color ?? "#146EB4"}
                      onChange={(e) =>
                        updateField("accent_color", e.target.value)
                      }
                    />
                  </div>
                </div>
              </div>
              <Input
                label={t("admin.logoUrl")}
                value={form.logo_url ?? ""}
                onChange={(e) => updateField("logo_url", e.target.value)}
              />
              <Input
                label={t("admin.faviconUrl")}
                value={form.favicon_url ?? ""}
                onChange={(e) => updateField("favicon_url", e.target.value)}
              />
              <ToggleSwitch
                label={t("admin.darkMode")}
                description={t("admin.darkModeDesc")}
                checked={!!form.dark_mode_enabled}
                onChange={(val) => updateField("dark_mode_enabled", val)}
              />
              <Button
                icon={Save}
                onClick={handleSave}
                loading={updateSettings.isPending}
              >
                {t("common.save")}
              </Button>
            </div>
          )}

          {activeTab === "maintenance" && (
            <div className="bg-white rounded-xl border border-border/50 p-6 space-y-4">
              <h2 className="font-semibold text-text">
                {t("admin.maintenanceAndSystem")}
              </h2>
              <ToggleSwitch
                label={t("admin.maintenanceMode")}
                description={t("admin.putSiteInMaintenance")}
                checked={!!form.maintenance_mode}
                onChange={(val) => updateField("maintenance_mode", val)}
              />
              <div>
                <label className="block text-sm font-medium text-text mb-1.5">
                  {t("admin.maintenanceMessage")}
                </label>
                <textarea
                  className="w-full border border-border rounded-lg px-3 py-2.5 text-sm min-h-[80px]"
                  value={
                    form.maintenance_message ??
                    t("admin.defaultMaintenanceMessage")
                  }
                  onChange={(e) =>
                    updateField("maintenance_message", e.target.value)
                  }
                />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Button
                  variant="outline"
                  onClick={() => runMaintenance("clear_cache")}
                  loading={maintenanceAction.isPending}
                >
                  {t("admin.clearCache")}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => runMaintenance("clear_logs")}
                  loading={maintenanceAction.isPending}
                >
                  {t("admin.clearLogs")}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => runMaintenance("optimize")}
                  loading={maintenanceAction.isPending}
                >
                  {t("admin.optimize")}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => runMaintenance("backup_settings")}
                  loading={maintenanceAction.isPending}
                >
                  {t("admin.backupDb")}
                </Button>
              </div>
              <Button
                icon={Save}
                onClick={handleSave}
                loading={updateSettings.isPending}
              >
                {t("common.save")}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
