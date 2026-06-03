import { useMemo, useState, useEffect } from "react";
import { useTranslation } from "@/hooks/useTranslation";
import {
  Gift,
  Star,
  Crown,
  Award,
  Save,
  Edit2,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import toast from "react-hot-toast";
import {
  useAdminSettings,
  useAdminUpdateSettings,
  useAdminAnalytics,
} from "@/hooks/useApi";
import { usePermission } from "@/hooks/usePermission";

const DEFAULT_TIER_COLOR = "bg-gray-100 border-gray-300";

const EMPTY_TIER = {
  id: null,
  name: "",
  icon: "🏅",
  minPoints: 0,
  maxPoints: "",
  benefitsText: "",
  color: DEFAULT_TIER_COLOR,
};

const EMPTY_REWARD = {
  id: null,
  name: "",
  points: 100,
  type: "coupon",
  icon: "🎁",
};

function normalizeTier(tier, fallbackId) {
  const benefits = Array.isArray(tier?.benefits) ? tier.benefits : [];
  return {
    id: Number(tier?.id ?? fallbackId),
    name: tier?.name || `Tier ${fallbackId}`,
    icon: tier?.icon || "🏅",
    minPoints: Number(tier?.minPoints ?? 0),
    maxPoints:
      tier?.maxPoints === null ||
      tier?.maxPoints === undefined ||
      tier?.maxPoints === ""
        ? null
        : Number(tier.maxPoints),
    benefits: benefits.filter(Boolean),
    color: tier?.color || DEFAULT_TIER_COLOR,
  };
}

function normalizeReward(item, fallbackId) {
  return {
    id: Number(item?.id ?? fallbackId),
    name: item?.name || `Reward ${fallbackId}`,
    points: Number(item?.points ?? 100),
    type: item?.type || "coupon",
    icon: item?.icon || "🎁",
  };
}

export default function RewardsManagePage() {
  const { t } = useTranslation();
  const { hasPerm } = usePermission();
  const canEdit = hasPerm("edit-rewards");
  const tf = (key, fallback, params) => {
    const translated = t(key, params);
    return translated === key ? fallback : translated;
  };
  const [activeTab, setActiveTab] = useState("tiers");
  const [editTier, setEditTier] = useState(null);
  const [editReward, setEditReward] = useState(null);

  const { data: settingsRes, isLoading: settingsLoading } = useAdminSettings();
  const { data: analyticsRes, isLoading: analyticsLoading } =
    useAdminAnalytics();
  const updateSettings = useAdminUpdateSettings();

  const settings = settingsRes?.data ?? settingsRes ?? {};
  const analytics =
    analyticsRes?.data?.stats ??
    analyticsRes?.stats ??
    analyticsRes?.data ??
    analyticsRes ??
    {};

  const [pointsForm, setPointsForm] = useState({});
  const [tiers, setTiers] = useState([]);
  const [rewardItems, setRewardItems] = useState([]);

  useEffect(() => {
    if (
      settings &&
      Object.keys(settings).length > 0 &&
      Object.keys(pointsForm).length === 0
    ) {
      setPointsForm({
        points_per_dollar: settings.points_per_dollar ?? "10",
        points_for_registration: settings.points_for_registration ?? "100",
        points_for_review: settings.points_for_review ?? "50",
        points_for_referral: settings.points_for_referral ?? "200",
        points_expiry_months: settings.points_expiry_months ?? "12",
        min_points_redemption: settings.min_points_redemption ?? "500",
      });
    }
  }, [settings]);

  useEffect(() => {
    const incomingTiers = Array.isArray(settings.reward_tiers)
      ? settings.reward_tiers
      : [];
    const incomingItems = Array.isArray(settings.reward_items)
      ? settings.reward_items
      : [];

    setTiers(
      incomingTiers.map((tier, index) => normalizeTier(tier, index + 1)),
    );
    setRewardItems(
      incomingItems.map((item, index) => normalizeReward(item, index + 1)),
    );
  }, [settingsRes]);

  const nextTierId = useMemo(() => {
    return (
      tiers.reduce((maxId, tier) => Math.max(maxId, Number(tier.id) || 0), 0) +
      1
    );
  }, [tiers]);

  const nextRewardId = useMemo(() => {
    return (
      rewardItems.reduce(
        (maxId, item) => Math.max(maxId, Number(item.id) || 0),
        0,
      ) + 1
    );
  }, [rewardItems]);

  const persistRewards = async (nextTiers, nextItems, successMessage) => {
    try {
      await updateSettings.mutateAsync({
        reward_tiers: nextTiers,
        reward_items: nextItems,
      });
      setTiers(nextTiers);
      setRewardItems(nextItems);
      if (successMessage) toast.success(successMessage);
    } catch {
      toast.error(t("admin.failedSaveRewardsSettings"));
    }
  };

  const handleSavePoints = async () => {
    const numericKeys = [
      "points_per_dollar",
      "points_for_registration",
      "points_for_review",
      "points_for_referral",
      "points_expiry_months",
      "min_points_redemption",
    ];
    const parsed = {};
    for (const key of numericKeys) {
      const val = Number(pointsForm[key]);
      if (pointsForm[key] !== "" && (isNaN(val) || val < 0)) {
        toast.error(
          t("admin.fieldMustBeNonNegative", { field: key.replace(/_/g, " ") }),
        );
        return;
      }
      parsed[key] = pointsForm[key] !== "" ? val : 0;
    }
    try {
      await updateSettings.mutateAsync(parsed);
      toast.success(t("admin.pointsSettingsSaved"));
    } catch {
      toast.error(t("admin.failedSaveSettings"));
    }
  };

  const openCreateTier = () => {
    setEditTier({ ...EMPTY_TIER, id: nextTierId, _isNew: true });
  };

  const openEditTier = (tier) => {
    setEditTier({
      id: tier.id,
      name: tier.name,
      icon: tier.icon,
      minPoints: tier.minPoints,
      maxPoints: tier.maxPoints ?? "",
      benefitsText: (tier.benefits || []).join("\n"),
      color: tier.color || DEFAULT_TIER_COLOR,
    });
  };

  const saveTier = async () => {
    if (!editTier?.name?.trim()) {
      toast.error(t("admin.tierNameRequired"));
      return;
    }

    const normalizedTier = normalizeTier(
      {
        id: editTier.id,
        name: editTier.name.trim(),
        icon: editTier.icon,
        minPoints: Number(editTier.minPoints || 0),
        maxPoints:
          editTier.maxPoints === "" ? null : Number(editTier.maxPoints),
        benefits: (editTier.benefitsText || "")
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean),
        color: editTier.color || DEFAULT_TIER_COLOR,
      },
      editTier.id || nextTierId,
    );

    const exists = tiers.some((tier) => tier.id === normalizedTier.id);
    const nextTiers = exists
      ? tiers.map((tier) =>
          tier.id === normalizedTier.id ? normalizedTier : tier,
        )
      : [...tiers, normalizedTier];

    nextTiers.sort((a, b) => a.minPoints - b.minPoints);

    await persistRewards(nextTiers, rewardItems, t("admin.tierSaved"));
    setEditTier(null);
  };

  const deleteTier = async (id) => {
    if (!window.confirm(t("admin.confirmDeleteTier"))) return;
    await persistRewards(
      tiers.filter((tier) => tier.id !== id),
      rewardItems,
      t("admin.tierDeleted"),
    );
  };

  const openCreateReward = () => {
    setEditReward({ ...EMPTY_REWARD, id: nextRewardId });
  };

  const openEditReward = (reward) => {
    setEditReward({
      id: reward.id,
      name: reward.name,
      points: reward.points,
      type: reward.type,
      icon: reward.icon,
    });
  };

  const saveReward = async () => {
    if (!editReward?.name?.trim()) {
      toast.error(t("admin.rewardNameRequired"));
      return;
    }

    const normalized = normalizeReward(
      {
        id: editReward.id,
        name: editReward.name.trim(),
        points: Number(editReward.points || 0),
        type: editReward.type,
        icon: editReward.icon,
      },
      editReward.id || nextRewardId,
    );

    const exists = rewardItems.some((item) => item.id === normalized.id);
    const nextItems = exists
      ? rewardItems.map((item) =>
          item.id === normalized.id ? normalized : item,
        )
      : [...rewardItems, normalized];

    await persistRewards(tiers, nextItems, t("admin.rewardItemSaved"));
    setEditReward(null);
  };

  const deleteReward = async (id) => {
    if (!window.confirm(t("admin.confirmDeleteReward"))) return;
    await persistRewards(
      tiers,
      rewardItems.filter((item) => item.id !== id),
      t("admin.rewardItemDeleted"),
    );
  };

  const isLoading = settingsLoading;

  const formatStat = (value) => {
    if (analyticsLoading) return "—";
    if (value === null || value === undefined) return "—";
    return value.toLocaleString();
  };

  const stats = [
    {
      label: tf("admin.totalUsers", "Total Users"),
      value: formatStat(analytics.total_users),
      icon: Star,
    },
    {
      label: tf("admin.totalOrders", "Total Orders"),
      value: formatStat(analytics.total_orders),
      icon: Gift,
    },
    {
      label: tf("admin.totalRevenue", "Total Revenue"),
      value: analyticsLoading
        ? "—"
        : analytics.total_revenue
          ? `EGP ${Number(analytics.total_revenue).toLocaleString()}`
          : "—",
      icon: Award,
    },
    {
      label: tf("admin.activeProducts", "Active Products"),
      value: formatStat(analytics.active_products ?? analytics.total_products),
      icon: Crown,
    },
  ];

  const rewardTypeLabels = {
    coupon: t("admin.rewardTypeCoupon"),
    shipping: t("admin.rewardTypeShipping"),
    gift: t("admin.rewardTypeGift"),
    boost: t("admin.rewardTypeBoost"),
    access: t("admin.rewardTypeAccess"),
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-text">
            {tf("admin.manageRewards", "Manage Rewards")}
          </h1>
          <p className="text-sm text-text-secondary">
            {tf(
              "admin.manageLoyaltyTiersRewards",
              "Manage loyalty tiers and rewards",
            )}
          </p>
        </div>
        {canEdit && activeTab === "tiers" && (
          <Button icon={Plus} onClick={openCreateTier}>
            {tf("admin.addTier", "Add Tier")}
          </Button>
        )}
        {canEdit && activeTab === "items" && (
          <Button icon={Plus} onClick={openCreateReward}>
            {tf("admin.addReward", "Add Reward")}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="bg-white p-4 rounded-xl border border-border/50 flex items-center gap-3"
          >
            <s.icon className="h-8 w-8 text-primary" />
            <div>
              <p className="text-xl font-bold text-text">{s.value}</p>
              <p className="text-xs text-text-secondary">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-2 border-b border-border/50">
        {[
          {
            id: "tiers",
            label: tf("admin.membershipTiers", "Membership Tiers"),
          },
          {
            id: "items",
            label: tf("admin.redeemableRewards", "Redeemable Rewards"),
          },
          {
            id: "settings",
            label: tf("admin.pointsSettings", "Points Settings"),
          },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition ${activeTab === tab.id ? "border-primary text-primary" : "border-transparent text-text-secondary"}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "tiers" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tiers.map((tier) => (
            <div
              key={tier.id}
              className={`rounded-xl border-2 p-5 ${tier.color}`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{tier.icon}</span>
                  <h3 className="text-lg font-bold text-text">{tier.name}</h3>
                </div>
                <div className="flex items-center gap-1">
                  {canEdit && (
                    <>
                      <button
                        className="p-1.5 hover:bg-white/50 rounded"
                        onClick={() => openEditTier(tier)}
                        aria-label={t("common.edit")}
                      >
                        <Edit2 className="h-4 w-4 text-text-secondary" />
                      </button>
                      <button
                        className="p-1.5 hover:bg-white/50 rounded"
                        onClick={() => deleteTier(tier.id)}
                        aria-label={t("common.delete")}
                      >
                        <Trash2 className="h-4 w-4 text-danger" />
                      </button>
                    </>
                  )}
                </div>
              </div>
              <p className="text-sm text-text-secondary mb-3">
                {tier.minPoints.toLocaleString()}{" "}
                {tier.maxPoints ? `- ${tier.maxPoints.toLocaleString()}` : "+"}{" "}
                {t("admin.points")}
              </p>
              <ul className="space-y-1.5 mb-3">
                {(tier.benefits || []).map((benefit) => (
                  <li
                    key={benefit}
                    className="text-sm text-text flex items-center gap-2"
                  >
                    • {benefit}
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {tiers.length === 0 && (
            <div className="col-span-full p-10 text-center text-text-secondary border border-dashed border-border rounded-xl">
              {t("admin.noTiersYetCreateFirst")}
            </div>
          )}
        </div>
      )}

      {activeTab === "items" && (
        <div className="bg-white rounded-xl border border-border/50 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-border/50">
                <th className="text-left text-xs font-medium text-text-secondary px-4 py-3">
                  {t("admin.reward")}
                </th>
                <th className="text-left text-xs font-medium text-text-secondary px-4 py-3">
                  {t("common.type")}
                </th>
                <th className="text-left text-xs font-medium text-text-secondary px-4 py-3">
                  {t("admin.points")}
                </th>
                <th className="text-left text-xs font-medium text-text-secondary px-4 py-3">
                  {t("common.actions")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {rewardItems.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{item.icon}</span>
                      <span className="text-sm font-medium text-text">
                        {item.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-text-secondary">
                    <Badge size="sm" variant="info">
                      {rewardTypeLabels[item.type] || item.type}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-primary">
                    {item.points.toLocaleString()} {t("admin.pts")}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {canEdit && (
                        <>
                          <button
                            className="p-2 sm:p-1.5 hover:bg-gray-100 rounded touch-manipulation"
                            onClick={() => openEditReward(item)}
                            aria-label={t("common.edit")}
                          >
                            <Edit2 className="h-4 w-4 text-text-secondary" />
                          </button>
                          <button
                            className="p-2 sm:p-1.5 hover:bg-gray-100 rounded touch-manipulation"
                            onClick={() => deleteReward(item.id)}
                            aria-label={t("common.delete")}
                          >
                            <Trash2 className="h-4 w-4 text-danger" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}

              {rewardItems.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="text-center py-12 text-sm text-text-secondary"
                  >
                    {t("admin.noRewardItemsYet")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === "settings" && (
        <div className="bg-white rounded-xl border border-border/50 p-6 space-y-4">
          <h3 className="font-semibold text-text">{t("admin.pointsConfig")}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label={t("admin.pointsPerDollar")}
              value={pointsForm.points_per_dollar ?? ""}
              onChange={(e) =>
                setPointsForm((p) => ({
                  ...p,
                  points_per_dollar: e.target.value,
                }))
              }
            />
            <Input
              label={t("admin.pointsForRegistration")}
              value={pointsForm.points_for_registration ?? ""}
              onChange={(e) =>
                setPointsForm((p) => ({
                  ...p,
                  points_for_registration: e.target.value,
                }))
              }
            />
            <Input
              label={t("admin.pointsForReview")}
              value={pointsForm.points_for_review ?? ""}
              onChange={(e) =>
                setPointsForm((p) => ({
                  ...p,
                  points_for_review: e.target.value,
                }))
              }
            />
            <Input
              label={t("admin.pointsForReferral")}
              value={pointsForm.points_for_referral ?? ""}
              onChange={(e) =>
                setPointsForm((p) => ({
                  ...p,
                  points_for_referral: e.target.value,
                }))
              }
            />
            <Input
              label={t("admin.pointsExpiry")}
              value={pointsForm.points_expiry_months ?? ""}
              onChange={(e) =>
                setPointsForm((p) => ({
                  ...p,
                  points_expiry_months: e.target.value,
                }))
              }
            />
            <Input
              label={t("admin.minRedemption")}
              value={pointsForm.min_points_redemption ?? ""}
              onChange={(e) =>
                setPointsForm((p) => ({
                  ...p,
                  min_points_redemption: e.target.value,
                }))
              }
            />
          </div>
          {canEdit && (
            <Button
              icon={Save}
              onClick={handleSavePoints}
              loading={updateSettings.isPending}
            >
              {t("common.save")}
            </Button>
          )}
        </div>
      )}

      <Modal
        isOpen={!!editTier}
        onClose={() => setEditTier(null)}
        title={editTier?._isNew ? t("admin.createTier") : t("admin.editTier")}
      >
        {editTier && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Input
                label={t("admin.tierName")}
                value={editTier.name}
                onChange={(e) =>
                  setEditTier((p) => ({ ...p, name: e.target.value }))
                }
              />
              <Input
                label={t("admin.icon")}
                value={editTier.icon}
                onChange={(e) =>
                  setEditTier((p) => ({ ...p, icon: e.target.value }))
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label={t("admin.minPoints")}
                type="number"
                value={editTier.minPoints}
                onChange={(e) =>
                  setEditTier((p) => ({ ...p, minPoints: e.target.value }))
                }
              />
              <Input
                label={t("admin.maxPoints")}
                type="number"
                value={editTier.maxPoints}
                onChange={(e) =>
                  setEditTier((p) => ({ ...p, maxPoints: e.target.value }))
                }
                placeholder={t("admin.unlimited")}
              />
            </div>
            <Input
              label={t("admin.colorClasses")}
              value={editTier.color}
              onChange={(e) =>
                setEditTier((p) => ({ ...p, color: e.target.value }))
              }
            />
            <div>
              <label className="block text-sm font-medium text-text mb-1.5">
                {t("admin.benefitsOnePerLine")}
              </label>
              <textarea
                className="w-full border border-border rounded-lg px-3 py-2.5 text-sm min-h-[100px]"
                value={editTier.benefitsText}
                onChange={(e) =>
                  setEditTier((p) => ({ ...p, benefitsText: e.target.value }))
                }
              />
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                fullWidth
                onClick={() => setEditTier(null)}
              >
                {t("common.cancel")}
              </Button>
              <Button
                fullWidth
                onClick={saveTier}
                loading={updateSettings.isPending}
              >
                {t("common.save")}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={!!editReward}
        onClose={() => setEditReward(null)}
        title={editReward?.id ? t("admin.editReward") : t("admin.createReward")}
      >
        {editReward && (
          <div className="space-y-4">
            <Input
              label={t("admin.rewardName")}
              value={editReward.name}
              onChange={(e) =>
                setEditReward((p) => ({ ...p, name: e.target.value }))
              }
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label={t("admin.points")}
                type="number"
                value={editReward.points}
                onChange={(e) =>
                  setEditReward((p) => ({ ...p, points: e.target.value }))
                }
              />
              <Input
                label={t("admin.icon")}
                value={editReward.icon}
                onChange={(e) =>
                  setEditReward((p) => ({ ...p, icon: e.target.value }))
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text mb-1.5">
                {t("common.type")}
              </label>
              <select
                value={editReward.type}
                onChange={(e) =>
                  setEditReward((p) => ({ ...p, type: e.target.value }))
                }
                className="w-full border border-border rounded-lg px-3 py-2.5 text-sm"
              >
                <option value="coupon">{t("admin.rewardTypeCoupon")}</option>
                <option value="shipping">
                  {t("admin.rewardTypeShipping")}
                </option>
                <option value="gift">{t("admin.rewardTypeGift")}</option>
                <option value="boost">{t("admin.rewardTypeBoost")}</option>
                <option value="access">{t("admin.rewardTypeAccess")}</option>
              </select>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                fullWidth
                onClick={() => setEditReward(null)}
              >
                {t("common.cancel")}
              </Button>
              <Button
                fullWidth
                onClick={saveReward}
                loading={updateSettings.isPending}
              >
                {t("common.save")}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
