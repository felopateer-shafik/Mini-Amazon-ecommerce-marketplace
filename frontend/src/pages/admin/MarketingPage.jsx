import { useEffect, useState } from "react";
import {
  Plus,
  Edit2,
  Trash2,
  Tag,
  Zap,
  Mail,
  Megaphone,
  Copy,
  ToggleLeft,
  ToggleRight,
  Loader2,
  Search,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import Pagination from "@/components/ui/Pagination";
import { formatCurrency, formatDate } from "@/lib/utils";
import toast from "react-hot-toast";
import { useTranslation } from "@/hooks/useTranslation";
import {
  useAdminCoupons,
  useAdminCreateCoupon,
  useAdminUpdateCoupon,
  useAdminDeleteCoupon,
  useAdminSettings,
  useAdminUpdateSettings,
} from "@/hooks/useApi";
import { usePermission } from "@/hooks/usePermission";

const statusColors = {
  active: "success",
  expired: "danger",
  scheduled: "info",
  ended: "warning",
  sent: "success",
  draft: "warning",
};

const emptyCouponForm = {
  code: "",
  type: "percentage",
  value: "",
  min_purchase: "",
  max_uses: "",
  starts_at: "",
  expires_at: "",
  is_active: true,
};

function normalizeMarketingTab(tab) {
  const mapped = {
    coupons: "coupons",
    "flash-deals": "flash-deals",
    flash: "flash-deals",
    newsletter: "newsletter",
    subscribers: "newsletter",
    campaigns: "campaigns",
    "bulk-sms": "campaigns",
  };
  return mapped[tab] || "coupons";
}

export default function MarketingPage({ initialTab = "coupons" }) {
  const { t } = useTranslation();
  const { hasPerm } = usePermission();
  const canCreateCoupon = hasPerm("create-coupons");
  const canEditCoupon = hasPerm("edit-coupons");
  const canDeleteCoupon = hasPerm("delete-coupons");
  const canEditMarketing = hasPerm("edit-marketing");
  const [activeTab, setActiveTab] = useState(normalizeMarketingTab(initialTab));
  const [couponModal, setCouponModal] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState(null);
  const [couponForm, setCouponForm] = useState(emptyCouponForm);
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState("");
  const perPage = 8;
  const [marketingForm, setMarketingForm] = useState({
    flash_deals_enabled: false,
    flash_deals_note: "",
    flash_deals_end_time: "",
    newsletter_enabled: false,
    newsletter_subject: "",
    campaigns_enabled: false,
    campaigns_note: "",
  });

  useEffect(() => {
    setActiveTab(normalizeMarketingTab(initialTab));
    setCurrentPage(1);
  }, [initialTab]);

  // ── API hooks ──────────────────────────────────────────────
  const { data: couponsData, isLoading: couponsLoading } = useAdminCoupons({
    page: currentPage,
    per_page: perPage,
    search: search || undefined,
  });
  const createCoupon = useAdminCreateCoupon();
  const updateCoupon = useAdminUpdateCoupon();
  const deleteCoupon = useAdminDeleteCoupon();
  const { data: settingsRes } = useAdminSettings();
  const updateSettings = useAdminUpdateSettings();

  const coupons = couponsData?.data ?? [];
  const totalPages =
    couponsData?.meta?.last_page ?? couponsData?.last_page ?? 1;
  const settings = settingsRes?.data ?? settingsRes ?? {};

  useEffect(() => {
    setMarketingForm((prev) => ({
      ...prev,
      flash_deals_enabled: !!settings.flash_deals_enabled,
      flash_deals_note: settings.flash_deals_note ?? "",
      flash_deals_end_time: settings.flash_deals_end_time ?? "",
      newsletter_enabled: !!settings.newsletter_enabled,
      newsletter_subject: settings.newsletter_subject ?? "",
      campaigns_enabled: !!settings.campaigns_enabled,
      campaigns_note: settings.campaigns_note ?? "",
    }));
  }, [settingsRes]);
  const statusLabel = {
    active: t("admin.statusActive"),
    expired: t("admin.statusExpired"),
    scheduled: t("admin.statusScheduled"),
    ended: t("admin.statusEnded"),
    sent: t("admin.statusSent"),
    draft: t("admin.statusDraft"),
  };

  const tabs = [
    { id: "coupons", label: t("admin.coupons"), icon: Tag },
    { id: "flash-deals", label: t("admin.flashDeals"), icon: Zap },
    { id: "newsletter", label: t("admin.newsletter"), icon: Mail },
    { id: "campaigns", label: t("admin.campaigns"), icon: Megaphone },
  ];

  // ── Handlers ───────────────────────────────────────────────
  const openAddModal = () => {
    setEditingCoupon(null);
    setCouponForm(emptyCouponForm);
    setCouponModal(true);
  };

  const openEditModal = (coupon) => {
    setEditingCoupon(coupon);
    setCouponForm({
      code: coupon.code ?? "",
      type: coupon.type ?? "percentage",
      value: coupon.value ?? "",
      min_purchase: coupon.min_purchase ?? coupon.min_order_amount ?? "",
      max_uses: coupon.max_uses ?? coupon.usage_limit ?? "",
      starts_at: coupon.starts_at?.slice(0, 10) ?? "",
      expires_at: coupon.expires_at?.slice(0, 10) ?? "",
      is_active: coupon.is_active ?? true,
    });
    setCouponModal(true);
  };

  const handleSaveCoupon = async () => {
    try {
      const payload = {
        ...couponForm,
        value: Number(couponForm.value),
        min_purchase: couponForm.min_purchase
          ? Number(couponForm.min_purchase)
          : null,
        max_uses: couponForm.max_uses ? Number(couponForm.max_uses) : null,
      };
      if (editingCoupon) {
        await updateCoupon.mutateAsync({ id: editingCoupon.id, data: payload });
        toast.success(t("admin.couponUpdated"));
      } else {
        await createCoupon.mutateAsync(payload);
        toast.success(t("admin.couponCreated"));
      }
      setCouponModal(false);
    } catch (err) {
      toast.error(err?.response?.data?.message ?? t("admin.failedSaveCoupon"));
    }
  };

  const handleDeleteCoupon = async (id) => {
    try {
      await deleteCoupon.mutateAsync(id);
      toast.success(t("admin.couponDeleted"));
    } catch (err) {
      toast.error(
        err?.response?.data?.message ?? t("admin.failedDeleteCoupon"),
      );
    }
  };

  const handleToggleActive = async (coupon) => {
    try {
      await updateCoupon.mutateAsync({
        id: coupon.id,
        data: { is_active: !coupon.is_active },
      });
      toast.success(
        coupon.is_active
          ? t("admin.couponDeactivated")
          : t("admin.couponActivated"),
      );
    } catch (err) {
      toast.error(
        err?.response?.data?.message ?? t("admin.failedUpdateCoupon"),
      );
    }
  };

  const updateField = (field, value) =>
    setCouponForm((prev) => ({ ...prev, [field]: value }));

  const isSaving = createCoupon.isPending || updateCoupon.isPending;

  const saveMarketingSettings = async (tab) => {
    try {
      if (tab === "flash-deals") {
        await updateSettings.mutateAsync({
          flash_deals_enabled: !!marketingForm.flash_deals_enabled,
          flash_deals_note: marketingForm.flash_deals_note ?? "",
          flash_deals_end_time: marketingForm.flash_deals_end_time || null,
        });
      }

      if (tab === "newsletter") {
        await updateSettings.mutateAsync({
          newsletter_enabled: !!marketingForm.newsletter_enabled,
          newsletter_subject: marketingForm.newsletter_subject ?? "",
        });
      }

      if (tab === "campaigns") {
        await updateSettings.mutateAsync({
          campaigns_enabled: !!marketingForm.campaigns_enabled,
          campaigns_note: marketingForm.campaigns_note ?? "",
        });
      }

      toast.success(t("admin.settingsSaved"));
    } catch {
      toast.error(t("admin.failedSaveSettings"));
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-text">
            {t("admin.marketing")}
          </h1>
          <p className="text-sm text-text-secondary">
            {t("admin.couponsDealsCampaigns")}
          </p>
        </div>
      </div>

      <div className="flex gap-2 border-b border-border/50 flex-wrap justify-between">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              setCurrentPage(1);
            }}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition flex items-center gap-2 ${activeTab === tab.id ? "border-primary text-primary" : "border-transparent text-text-secondary hover:text-text"}`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Coupons Tab */}
      {activeTab === "coupons" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="relative w-72">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
              <input
                type="text"
                placeholder={t("admin.searchCoupons")}
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full ps-9 pe-3 py-2 text-sm border border-border rounded-lg focus:ring-1 focus:ring-primary outline-none"
              />
            </div>
            {canCreateCoupon && (
              <Button icon={Plus} onClick={openAddModal}>
                {t("admin.addCoupon")}
              </Button>
            )}
          </div>

          {couponsLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : coupons.length === 0 ? (
            <div className="text-center py-20 text-text-secondary text-sm">
              {t("admin.noCouponsFound")}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-border/50 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-border/50">
                      <th className="text-left text-xs font-medium text-text-secondary px-4 py-3">
                        {t("admin.code")}
                      </th>
                      <th className="text-left text-xs font-medium text-text-secondary px-4 py-3">
                        {t("admin.discount")}
                      </th>
                      <th className="text-left text-xs font-medium text-text-secondary px-4 py-3">
                        {t("admin.minPurchase")}
                      </th>
                      <th className="text-left text-xs font-medium text-text-secondary px-4 py-3">
                        {t("admin.usage")}
                      </th>
                      <th className="text-left text-xs font-medium text-text-secondary px-4 py-3">
                        {t("admin.expires")}
                      </th>
                      <th className="text-left text-xs font-medium text-text-secondary px-4 py-3">
                        {t("common.status")}
                      </th>
                      <th className="text-left text-xs font-medium text-text-secondary px-4 py-3 text-center">
                        {t("common.actions")}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {coupons.map((c) => {
                      const status = c.is_active
                        ? c.expires_at && new Date(c.expires_at) < new Date()
                          ? "expired"
                          : "active"
                        : "expired";
                      return (
                        <tr key={c.id} className="hover:bg-gray-50 transition">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <code className="text-sm font-mono font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded">
                                {c.code}
                              </code>
                              <button
                                onClick={() => {
                                  navigator.clipboard?.writeText(c.code);
                                  toast.success(t("common.copied"));
                                }}
                                aria-label={t("common.copy")}
                              >
                                <Copy className="h-3.5 w-3.5 text-text-secondary" />
                              </button>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm font-medium text-text">
                            {c.type === "percentage"
                              ? `${c.value}%`
                              : formatCurrency(c.value)}
                          </td>
                          <td className="px-4 py-3 text-sm text-text-secondary">
                            {(c.min_purchase ?? c.min_order_amount)
                              ? formatCurrency(
                                  c.min_purchase ?? c.min_order_amount,
                                )
                              : t("common.notAvailable")}
                          </td>
                          <td className="px-4 py-3 text-sm text-text-secondary">
                            {c.used_count ?? c.usage_count ?? 0}/
                            {c.max_uses ?? c.usage_limit ?? "∞"}
                          </td>
                          <td className="px-4 py-3 text-sm text-text-secondary">
                            {c.expires_at
                              ? formatDate(c.expires_at)
                              : t("common.notAvailable")}
                          </td>
                          <td className="px-4 py-3">
                            <Badge
                              variant={statusColors[status]}
                              size="sm"
                              className="capitalize"
                            >
                              {statusLabel[status] || status}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1 width-max-content">
                              {canEditCoupon && (
                                <button
                                  className="p-2 sm:p-1.5 hover:bg-gray-100 rounded touch-manipulation"
                                  title={
                                    c.is_active
                                      ? t("admin.deactivate")
                                      : t("admin.activate")
                                  }
                                  onClick={() => handleToggleActive(c)}
                                >
                                  {c.is_active ? (
                                    <ToggleRight className="h-4 w-4 text-success" />
                                  ) : (
                                    <ToggleLeft className="h-4 w-4 text-text-secondary" />
                                  )}
                                </button>
                              )}
                              {canEditCoupon && (
                                <button
                                  className="p-2 sm:p-1.5 hover:bg-gray-100 rounded touch-manipulation"
                                  onClick={() => openEditModal(c)}
                                  aria-label={t("common.edit")}
                                >
                                  <Edit2 className="h-4 w-4 text-text-secondary" />
                                </button>
                              )}
                              {canDeleteCoupon && (
                                <button
                                  className="p-2 sm:p-1.5 hover:bg-gray-100 rounded touch-manipulation"
                                  onClick={() => handleDeleteCoupon(c.id)}
                                  aria-label={t("common.delete")}
                                >
                                  <Trash2 className="h-4 w-4 text-text-secondary hover:text-danger" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {totalPages > 1 && (
                <div className="p-4 border-t border-border/50">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Flash Deals Tab */}
      {activeTab === "flash-deals" && (
        <div className="bg-white rounded-xl border border-border/50 p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            <h2 className="font-semibold text-text">{t("admin.flashDeals")}</h2>
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <span className="text-sm text-text">
              {t("admin.enableFlashDeals")}
            </span>
            <button
              type="button"
              className={`w-11 h-6 rounded-full relative transition ${marketingForm.flash_deals_enabled ? "bg-primary" : "bg-gray-300"}`}
              onClick={() =>
                setMarketingForm((prev) => ({
                  ...prev,
                  flash_deals_enabled: !prev.flash_deals_enabled,
                }))
              }
            >
              <span
                className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition ${marketingForm.flash_deals_enabled ? "right-0.5" : "left-0.5"}`}
              />
            </button>
          </div>
          <Input
            label={t("admin.flashDealsNote")}
            value={marketingForm.flash_deals_note}
            onChange={(e) =>
              setMarketingForm((prev) => ({
                ...prev,
                flash_deals_note: e.target.value,
              }))
            }
          />
          <div>
            <label className="block text-sm font-medium text-text mb-1.5">
              {t("admin.flashDealsEndTime", "Flash Deals End Time")}
            </label>
            <input
              type="datetime-local"
              value={
                marketingForm.flash_deals_end_time
                  ? marketingForm.flash_deals_end_time.slice(0, 16)
                  : ""
              }
              onChange={(e) =>
                setMarketingForm((prev) => ({
                  ...prev,
                  flash_deals_end_time: e.target.value
                    ? new Date(e.target.value).toISOString()
                    : "",
                }))
              }
              className="w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:ring-1 focus:ring-primary outline-none"
            />
          </div>
          {canEditMarketing && (
            <Button
              onClick={() => saveMarketingSettings("flash-deals")}
              loading={updateSettings.isPending}
            >
              {t("common.save")}
            </Button>
          )}
        </div>
      )}

      {/* Newsletter Tab */}
      {activeTab === "newsletter" && (
        <div className="bg-white rounded-xl border border-border/50 p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            <h2 className="font-semibold text-text">{t("admin.newsletter")}</h2>
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <span className="text-sm text-text">
              {t("admin.enableNewsletter")}
            </span>
            <button
              type="button"
              className={`w-11 h-6 rounded-full relative transition ${marketingForm.newsletter_enabled ? "bg-primary" : "bg-gray-300"}`}
              onClick={() =>
                setMarketingForm((prev) => ({
                  ...prev,
                  newsletter_enabled: !prev.newsletter_enabled,
                }))
              }
            >
              <span
                className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition ${marketingForm.newsletter_enabled ? "right-0.5" : "left-0.5"}`}
              />
            </button>
          </div>
          <Input
            label={t("admin.newsletterSubject")}
            value={marketingForm.newsletter_subject}
            onChange={(e) =>
              setMarketingForm((prev) => ({
                ...prev,
                newsletter_subject: e.target.value,
              }))
            }
          />
          {canEditMarketing && (
            <Button
              onClick={() => saveMarketingSettings("newsletter")}
              loading={updateSettings.isPending}
            >
              {t("common.save")}
            </Button>
          )}
        </div>
      )}

      {/* Campaigns Tab */}
      {activeTab === "campaigns" && (
        <div className="bg-white rounded-xl border border-border/50 p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-primary" />
            <h2 className="font-semibold text-text">{t("admin.campaigns")}</h2>
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <span className="text-sm text-text">
              {t("admin.enableCampaigns")}
            </span>
            <button
              type="button"
              className={`w-11 h-6 rounded-full relative transition ${marketingForm.campaigns_enabled ? "bg-primary" : "bg-gray-300"}`}
              onClick={() =>
                setMarketingForm((prev) => ({
                  ...prev,
                  campaigns_enabled: !prev.campaigns_enabled,
                }))
              }
            >
              <span
                className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition ${marketingForm.campaigns_enabled ? "right-0.5" : "left-0.5"}`}
              />
            </button>
          </div>
          <Input
            label={t("admin.campaignNote")}
            value={marketingForm.campaigns_note}
            onChange={(e) =>
              setMarketingForm((prev) => ({
                ...prev,
                campaigns_note: e.target.value,
              }))
            }
          />
          {canEditMarketing && (
            <Button
              onClick={() => saveMarketingSettings("campaigns")}
              loading={updateSettings.isPending}
            >
              {t("common.save")}
            </Button>
          )}
        </div>
      )}

      <Modal
        isOpen={couponModal}
        onClose={() => setCouponModal(false)}
        title={editingCoupon ? t("admin.editCoupon") : t("admin.addCoupon")}
      >
        <div className="space-y-4">
          <Input
            label={t("admin.couponCode")}
            placeholder={t("admin.couponCodeExample")}
            value={couponForm.code}
            onChange={(e) => updateField("code", e.target.value)}
          />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-text mb-1.5">
                {t("admin.discountType")}
              </label>
              <select
                className="w-full border border-border rounded-lg px-3 py-2.5 text-sm"
                value={couponForm.type}
                onChange={(e) => updateField("type", e.target.value)}
              >
                <option value="percentage">{t("admin.percentage")}</option>
                <option value="fixed">{t("admin.fixedAmount")}</option>
              </select>
            </div>
            <Input
              label={t("admin.discountValue")}
              placeholder={t("admin.discountValueExample")}
              type="number"
              value={couponForm.value}
              onChange={(e) => updateField("value", e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label={t("admin.minPurchaseAmount")}
              placeholder={t("admin.minPurchaseExample")}
              type="number"
              value={couponForm.min_purchase}
              onChange={(e) => updateField("min_purchase", e.target.value)}
            />
            <Input
              label={t("admin.maxUses")}
              placeholder={t("admin.maxUsesExample")}
              type="number"
              value={couponForm.max_uses}
              onChange={(e) => updateField("max_uses", e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label={t("admin.startsAt")}
              type="date"
              value={couponForm.starts_at}
              onChange={(e) => updateField("starts_at", e.target.value)}
            />
            <Input
              label={t("admin.expiryDate")}
              type="date"
              value={couponForm.expires_at}
              onChange={(e) => updateField("expires_at", e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="coupon-active"
              checked={couponForm.is_active}
              onChange={(e) => updateField("is_active", e.target.checked)}
              className="rounded border-border"
            />
            <label htmlFor="coupon-active" className="text-sm text-text">
              {t("common.active")}
            </label>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              fullWidth
              onClick={() => setCouponModal(false)}
            >
              {t("common.cancel")}
            </Button>
            <Button fullWidth onClick={handleSaveCoupon} disabled={isSaving}>
              {isSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {editingCoupon ? t("common.update") : t("common.save")}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
