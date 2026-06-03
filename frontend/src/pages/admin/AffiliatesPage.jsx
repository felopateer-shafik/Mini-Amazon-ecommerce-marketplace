import { useEffect, useState } from "react";
import { useTranslation } from "@/hooks/useTranslation";
import {
  Search,
  Eye,
  CheckCircle,
  Users,
  DollarSign,
  Link,
  Copy,
  TrendingUp,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Pagination from "@/components/ui/Pagination";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import { formatCurrency, formatDate } from "@/lib/utils";
import toast from "react-hot-toast";
import { useDebouncedValue } from "@/hooks/useDebounce";
import {
  useAdminAffiliates,
  useAdminSettings,
  useAdminUpdateAffiliate,
  useAdminUpdateSettings,
} from "@/hooks/useApi";
import { usePermission } from "@/hooks/usePermission";

const statusColors = {
  active: "success",
  pending: "warning",
  suspended: "danger",
};

export default function AffiliatesPage() {
  const { t } = useTranslation();
  const { hasPerm } = usePermission();
  const canManage = hasPerm("manage-affiliates");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [currentPage, setCurrentPage] = useState(1);
  const [viewAffiliate, setViewAffiliate] = useState(null);
  const [settingsModal, setSettingsModal] = useState(false);
  const [editCommission, setEditCommission] = useState("");

  const { data: settingsRes, isLoading: settingsLoading } = useAdminSettings();
  const updateSettings = useAdminUpdateSettings();
  const updateAffiliate = useAdminUpdateAffiliate();

  const [programSettings, setProgramSettings] = useState({
    affiliate_enabled: false,
    default_affiliate_commission: 10,
    affiliate_cookie_days: 30,
    min_payout: 50,
  });

  const affiliatesQuery = useAdminAffiliates({
    search: debouncedSearch || undefined,
    page: currentPage,
    per_page: 10,
  });

  const affiliates = affiliatesQuery.data?.data ?? [];
  const meta = affiliatesQuery.data?.meta ?? {
    current_page: 1,
    last_page: 1,
    total: 0,
  };

  useEffect(() => {
    const settings = settingsRes?.data ?? settingsRes ?? {};
    setProgramSettings({
      affiliate_enabled: !!settings.affiliate_enabled,
      default_affiliate_commission: Number(
        settings.default_affiliate_commission ?? 10,
      ),
      affiliate_cookie_days: Number(settings.affiliate_cookie_days ?? 30),
      min_payout: Number(settings.min_payout ?? 50),
    });
  }, [settingsRes]);

  useEffect(() => {
    if (viewAffiliate) {
      setEditCommission(String(viewAffiliate.commission_rate ?? ""));
    }
  }, [viewAffiliate]);

  const saveAffiliateCommission = async () => {
    const rate = Number(editCommission);
    if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
      toast.error(t("admin.invalidAffiliateSettings"));
      return;
    }
    try {
      await updateAffiliate.mutateAsync({
        id: viewAffiliate.id,
        data: { commissionRate: rate, status: viewAffiliate.status },
      });
      setViewAffiliate((prev) => ({ ...prev, commission_rate: rate }));
      toast.success(t("admin.affiliateSettingsSaved"));
    } catch {
      toast.error(t("admin.failedSaveSettings"));
    }
  };

  const approveAffiliate = async (id) => {
    try {
      await updateAffiliate.mutateAsync({ id, data: { status: "active" } });
      toast.success(t("admin.affiliateApproved"));
    } catch {
      toast.error(t("admin.failedApproveAffiliate"));
    }
  };

  const saveProgramSettings = async () => {
    const commission = Number(programSettings.default_affiliate_commission);
    const minPayout = Number(programSettings.min_payout);
    const cookieDays = Number(programSettings.affiliate_cookie_days);

    const invalidValues =
      !Number.isFinite(commission) ||
      commission < 0 ||
      commission > 100 ||
      !Number.isFinite(minPayout) ||
      minPayout < 0 ||
      !Number.isFinite(cookieDays) ||
      cookieDays < 1 ||
      cookieDays > 3650;

    if (invalidValues) {
      toast.error(t("admin.invalidAffiliateSettings"));
      return;
    }

    try {
      await updateSettings.mutateAsync({
        ...programSettings,
        default_affiliate_commission: commission,
        min_payout: minPayout,
        affiliate_cookie_days: cookieDays,
      });
      setSettingsModal(false);
      toast.success(t("admin.affiliateSettingsSaved"));
    } catch {
      toast.error(t("admin.failedSaveSettings"));
    }
  };

  const totalReferrals = Number(meta.total_referrals ?? 0);
  const totalEarnings = Number(meta.total_earnings ?? 0);
  const avgCommission = Number(
    meta.avg_commission ?? programSettings.default_affiliate_commission ?? 0,
  );
  const statusLabel = {
    active: t("admin.statusActive"),
    pending: t("admin.statusPending"),
    suspended: t("admin.statusSuspended"),
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-text">
            {t("admin.affiliates")}
          </h1>
          <p className="text-sm text-text-secondary">
            {t("admin.affiliatesCount", { count: meta.total || 0 })}
          </p>
        </div>
        {canManage && (
          <Button
            variant="outline"
            onClick={() => setSettingsModal(true)}
            loading={settingsLoading}
          >
            {t("dashboard.settings")}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: t("admin.totalAffiliates"),
            value: meta.total || 0,
            icon: Users,
            color: "text-primary bg-primary/10",
          },
          {
            label: t("admin.totalReferrals"),
            value: totalReferrals,
            icon: Link,
            color: "text-accent bg-blue-100",
          },
          {
            label: t("admin.totalEarnings"),
            value: formatCurrency(totalEarnings),
            icon: DollarSign,
            color: "text-success bg-green-100",
          },
          {
            label: t("admin.avgCommission"),
            value: `${avgCommission.toFixed(2)}%`,
            icon: TrendingUp,
            color: "text-purple-500 bg-purple-100",
          },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-white p-4 rounded-xl border border-border/50 flex items-center gap-3 flex-wrap justify-center text-center"
          >
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center ${s.color}`}
            >
              <s.icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-lg font-bold text-text">{s.value}</p>
              <p className="text-xs text-text-secondary">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white p-4 rounded-xl border border-border/50">
        <div className="relative">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            placeholder={t("admin.searchAffiliates")}
            className="w-full ps-9 pe-4 py-2.5 border border-border rounded-lg text-sm focus:ring-1 focus:ring-primary outline-none"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-border/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-border/50">
                <th className="text-left text-xs font-medium text-text-secondary px-4 py-3">
                  {t("admin.affiliate")}
                </th>
                <th className="text-left text-xs font-medium text-text-secondary px-4 py-3">
                  {t("admin.code")}
                </th>
                <th className="text-left text-xs font-medium text-text-secondary px-4 py-3">
                  {t("admin.referrals")}
                </th>
                <th className="text-left text-xs font-medium text-text-secondary px-4 py-3">
                  {t("admin.totalEarned")}
                </th>
                <th className="text-left text-xs font-medium text-text-secondary px-4 py-3">
                  {t("admin.commission")}
                </th>
                <th className="text-left text-xs font-medium text-text-secondary px-4 py-3">
                  {t("common.status")}
                </th>
                <th className="text-left text-xs font-medium text-text-secondary px-4 py-3 width-max-content">
                  {t("common.actions")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {affiliates.length === 0 && (
                <tr>
                  <td
                    colSpan="7"
                    className="text-center py-12 text-sm text-text-secondary"
                  >
                    {t("admin.noAffiliatesConfiguredYet")}
                  </td>
                </tr>
              )}

              {affiliates.map((a) => (
                <tr key={a.id} className="hover:bg-gray-50 transition">
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-text">{a.name}</p>
                      <p className="text-xs text-text-secondary">{a.email}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <code className="text-sm font-mono text-primary bg-primary/10 px-2 py-0.5 rounded">
                        {a.code}
                      </code>
                      <button
                        onClick={() => {
                          navigator.clipboard?.writeText(a.code || "");
                          toast.success(t("common.copied"));
                        }}
                        aria-label={t("common.copy")}
                      >
                        <Copy className="h-3.5 w-3.5 text-text-secondary" />
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-text">
                    {a.referrals ?? 0}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-text">
                    {formatCurrency(Number(a.earnings || 0))}
                  </td>
                  <td className="px-4 py-3 text-sm text-text-secondary">
                    {Number(a.commission_rate ?? 0)}%
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      variant={statusColors[a.status] || "default"}
                      size="sm"
                      className="capitalize"
                    >
                      {statusLabel[a.status] || statusLabel.pending}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button
                        className="p-2 sm:p-1.5 hover:bg-gray-100 rounded touch-manipulation"
                        onClick={() => setViewAffiliate(a)}
                        aria-label={t("admin.view")}
                      >
                        <Eye className="h-4 w-4 text-text-secondary" />
                      </button>
                      {canManage && a.status === "pending" && (
                        <button
                          className="p-2 sm:p-1.5 hover:bg-gray-100 rounded touch-manipulation"
                          onClick={() => approveAffiliate(a.id)}
                          aria-label={t("admin.approve")}
                        >
                          <CheckCircle className="h-4 w-4 text-success" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {(meta.last_page || 1) > 1 && (
          <div className="p-4 border-t border-border/50">
            <Pagination
              currentPage={meta.current_page || 1}
              totalPages={meta.last_page || 1}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>

      <Modal
        isOpen={!!viewAffiliate}
        onClose={() => setViewAffiliate(null)}
        title={viewAffiliate?.name}
      >
        {viewAffiliate && (
          <div className="space-y-3">
            {[
              [t("admin.email"), viewAffiliate.email],
              [t("admin.code"), viewAffiliate.code],
              [t("admin.referrals"), viewAffiliate.referrals],
              [
                t("admin.earnings"),
                formatCurrency(Number(viewAffiliate.earnings || 0)),
              ],
              [
                t("admin.joined"),
                viewAffiliate.joined_at
                  ? formatDate(viewAffiliate.joined_at)
                  : "-",
              ],
            ].map(([label, value]) => (
              <div key={label} className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-text-secondary">{label}</p>
                <p className="text-sm font-medium">{value}</p>
              </div>
            ))}
            <div className="p-3 bg-gray-50 rounded-lg space-y-2">
              <p className="text-xs text-text-secondary">
                {t("admin.commission")} (%)
              </p>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={editCommission}
                  onChange={(e) => setEditCommission(e.target.value)}
                  className="flex-1 px-3 py-1.5 border border-border rounded-lg text-sm focus:ring-1 focus:ring-primary outline-none"
                />
                {canManage && (
                  <Button
                    size="sm"
                    onClick={saveAffiliateCommission}
                    loading={updateAffiliate.isPending}
                  >
                    {t("common.save")}
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={settingsModal}
        onClose={() => setSettingsModal(false)}
        title={t("admin.affiliateSettings")}
      >
        <div className="space-y-4">
          <Input
            label={t("admin.defaultCommissionRate")}
            type="number"
            value={programSettings.default_affiliate_commission}
            onChange={(e) =>
              setProgramSettings((p) => ({
                ...p,
                default_affiliate_commission: e.target.value,
              }))
            }
          />
          <Input
            label={t("admin.minimumPayout")}
            type="number"
            value={programSettings.min_payout}
            onChange={(e) =>
              setProgramSettings((p) => ({ ...p, min_payout: e.target.value }))
            }
          />
          <Input
            label={t("admin.cookieDurationDays")}
            type="number"
            value={programSettings.affiliate_cookie_days}
            onChange={(e) =>
              setProgramSettings((p) => ({
                ...p,
                affiliate_cookie_days: e.target.value,
              }))
            }
          />

          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <span className="text-sm">{t("admin.enableAffiliateProgram")}</span>
            <button
              type="button"
              className={`w-11 h-6 rounded-full relative transition ${programSettings.affiliate_enabled ? "bg-primary" : "bg-gray-300"}`}
              onClick={() =>
                setProgramSettings((p) => ({
                  ...p,
                  affiliate_enabled: !p.affiliate_enabled,
                }))
              }
              role="switch"
              aria-checked={programSettings.affiliate_enabled}
              aria-label={t("admin.enableAffiliateProgram")}
            >
              <span
                className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition ${programSettings.affiliate_enabled ? "right-0.5" : "left-0.5"}`}
              />
            </button>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              fullWidth
              onClick={() => setSettingsModal(false)}
            >
              {t("common.cancel")}
            </Button>
            {canManage && (
              <Button
                fullWidth
                onClick={saveProgramSettings}
                loading={updateSettings.isPending}
              >
                {t("common.save")}
              </Button>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
