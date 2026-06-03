import { useState, useEffect } from "react";
import {
  Gift,
  Star,
  Trophy,
  TrendingUp,
  Zap,
  ChevronRight,
  Clock,
  Loader2,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Breadcrumb from "@/components/ui/Breadcrumb";
import Pagination from "@/components/ui/Pagination";
import { useTranslation } from "@/hooks/useTranslation";
import { useRedeemReward, useRewards } from "@/hooks/useApi";
import { settingsService } from "@/api/services";
import toast from "react-hot-toast";

const defaultTiers = [
  {
    nameKey: "rewardsPage.bronze",
    minPoints: 0,
    color: "bg-amber-700",
    benefitKeys: ["rewardsPage.oneXPoints", "rewardsPage.freeStandardShipping"],
  },
  {
    nameKey: "rewardsPage.silver",
    minPoints: 500,
    color: "bg-gray-400",
    benefitKeys: [
      "rewardsPage.oneHalfXPoints",
      "rewardsPage.freeExpressShipping",
      "rewardsPage.cashback5",
    ],
  },
  {
    nameKey: "rewardsPage.gold",
    minPoints: 2000,
    color: "bg-yellow-500",
    benefitKeys: [
      "rewardsPage.twoXPoints",
      "rewardsPage.freeOvernightShipping",
      "rewardsPage.cashback10",
      "rewardsPage.prioritySupport",
    ],
  },
  {
    nameKey: "rewardsPage.platinum",
    minPoints: 5000,
    color: "bg-purple-500",
    benefitKeys: [
      "rewardsPage.threeXPoints",
      "rewardsPage.allGoldBenefits",
      "rewardsPage.exclusiveDeals",
      "rewardsPage.birthdayBonus",
    ],
  },
];

const defaultRedeemableRewards = [
  {
    id: 1,
    nameKey: "rewardsPage.coupon5",
    points: 100,
    type: "coupon",
    icon: "\uD83C\uDFAB",
  },
  {
    id: 2,
    nameKey: "rewardsPage.coupon10",
    points: 200,
    type: "coupon",
    icon: "\uD83C\uDFAB",
  },
  {
    id: 3,
    nameKey: "rewardsPage.freeShippingVoucher",
    points: 150,
    type: "shipping",
    icon: "\uD83D\uDCE6",
  },
  {
    id: 4,
    nameKey: "rewardsPage.giftCard25",
    points: 500,
    type: "gift",
    icon: "\uD83C\uDF81",
  },
  {
    id: 5,
    nameKey: "rewardsPage.doublePoints24h",
    points: 300,
    type: "boost",
    icon: "\u26A1",
  },
  {
    id: 6,
    nameKey: "rewardsPage.vipEarlyAccess",
    points: 1000,
    type: "access",
    icon: "\uD83D\uDC51",
  },
];

function getTierForPoints(points) {
  for (let i = defaultTiers.length - 1; i >= 0; i--) {
    if (points >= defaultTiers[i].minPoints) return defaultTiers[i];
  }
  return defaultTiers[0];
}

export default function RewardsPage() {
  const { t } = useTranslation();
  const [currentPage, setCurrentPage] = useState(1);
  const [tiers, setTiers] = useState(defaultTiers);
  const [redeemableRewards, setRedeemableRewards] = useState(
    defaultRedeemableRewards,
  );
  const perPage = 10;

  const { data: rewardsResponse, isLoading } = useRewards();
  const redeemReward = useRedeemReward();

  const meta = rewardsResponse?.meta ?? {};
  const totalEarned = meta.total_earned ?? 0;
  const totalRedeemed = meta.total_redeemed ?? 0;
  const currentPoints = meta.balance ?? 0;

  useEffect(() => {
    let cancelled = false;

    settingsService
      .public()
      .then((response) => {
        if (cancelled) return;
        const payload = response?.data?.data ?? response?.data ?? {};

        const incomingTiers = Array.isArray(payload.reward_tiers)
          ? payload.reward_tiers
          : [];
        if (incomingTiers.length > 0) {
          const mapped = incomingTiers
            .map((tier, index) => ({
              id: tier.id ?? index + 1,
              name: tier.name ?? `Tier ${index + 1}`,
              minPoints: Number(tier.minPoints ?? 0),
              benefitLines: Array.isArray(tier.benefits)
                ? tier.benefits.filter(Boolean)
                : [],
              color: tier.color,
            }))
            .sort((a, b) => a.minPoints - b.minPoints);

          setTiers(mapped);
        }

        const incomingRewards = Array.isArray(payload.reward_items)
          ? payload.reward_items
          : [];
        if (incomingRewards.length > 0) {
          const mapped = incomingRewards.map((item, index) => ({
            id: item.id ?? index + 1,
            name: item.name ?? `Reward ${index + 1}`,
            points: Number(item.points ?? 0),
            type: item.type ?? "reward",
            icon: item.icon ?? "🎁",
          }));
          setRedeemableRewards(mapped);
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  const allHistory = (rewardsResponse?.data ?? []).map((item) => ({
    id: item.id,
    type: item.type,
    points: item.points,
    description: item.description ?? "",
    date: item.created_at ?? item.date,
    expires_at: item.expires_at,
    order_id: item.order_id,
  }));

  const paginatedHistory = allHistory.slice(
    (currentPage - 1) * perPage,
    currentPage * perPage,
  );
  const totalPages = Math.ceil(allHistory.length / perPage);

  const handleRedeemReward = async (reward) => {
    try {
      const res = await redeemReward.mutateAsync({ reward_id: reward.id });
      const payload = res?.data ?? res ?? {};
      const couponCode = payload?.coupon_code;
      if (couponCode) {
        toast.success(`Coupon created: ${couponCode}`);
      } else {
        toast.success(t("common.success") || "Redeemed successfully");
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || t("common.error"));
    }
  };

  const currentTier = (() => {
    for (let i = tiers.length - 1; i >= 0; i--) {
      if (currentPoints >= tiers[i].minPoints) return tiers[i];
    }
    return tiers[0];
  })();
  const nextTier =
    tiers.find((ti) => ti.minPoints > currentPoints) || tiers[tiers.length - 1];
  const progressToNext =
    nextTier.minPoints === currentTier.minPoints
      ? 100
      : ((currentPoints - currentTier.minPoints) /
          (nextTier.minPoints - currentTier.minPoints)) *
        100;

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <Breadcrumb
        items={[
          { label: t("common.home"), href: "/" },
          { label: t("rewardsPage.redeemRewards") },
        ]}
      />

      {/* Points Overview */}
      <div className="mt-4 bg-gradient-to-r from-primary to-amber-600 text-white rounded-xl p-8 mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm opacity-80">
              {t("rewardsPage.yourRewardPoints")}
            </p>
            <p className="text-4xl font-bold">
              {currentPoints.toLocaleString()}
            </p>
          </div>
          <div className="text-right">
            <Badge className="!bg-white/20 !text-white">
              {t("rewardsPage.member", {
                tier: currentTier.nameKey
                  ? t(currentTier.nameKey)
                  : currentTier.name,
              })}
            </Badge>
            {nextTier.minPoints > currentPoints && (
              <p className="text-sm mt-2 opacity-80">
                {t("rewardsPage.pointsToNext", {
                  points: nextTier.minPoints - currentPoints,
                  tier: nextTier.nameKey ? t(nextTier.nameKey) : nextTier.name,
                })}
              </p>
            )}
          </div>
        </div>
        <div className="h-3 bg-white/20 rounded-full overflow-hidden">
          <div
            className="h-full bg-white rounded-full transition-all"
            style={{ width: `${Math.min(progressToNext, 100)}%` }}
          />
        </div>
        <div className="flex justify-between text-xs mt-1 opacity-80">
          <span>
            {currentTier.nameKey ? t(currentTier.nameKey) : currentTier.name} (
            {currentTier.minPoints})
          </span>
          <span>
            {nextTier.nameKey ? t(nextTier.nameKey) : nextTier.name} (
            {nextTier.minPoints})
          </span>
        </div>
        <div className="flex gap-6 mt-4 text-sm opacity-90">
          <span>
            {t("rewardsPage.totalEarned") || "Total Earned"}:{" "}
            <strong>{totalEarned.toLocaleString()}</strong>
          </span>
          <span>
            {t("rewardsPage.totalRedeemed") || "Total Redeemed"}:{" "}
            <strong>{totalRedeemed.toLocaleString()}</strong>
          </span>
        </div>
      </div>

      {/* Membership Tiers */}
      <div className="mb-8">
        <h2 className="text-xl font-bold text-text mb-4">
          {t("rewardsPage.membershipTiers")}
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {tiers.map((tier, index) => (
            <div
              key={tier.id ?? index}
              className={`p-4 rounded-xl border-2 ${tier.name === currentTier.name ? "border-primary shadow-lg" : "border-border/50"}`}
            >
              <div
                className={`w-10 h-10 rounded-full ${tier.color || "bg-gray-400"} flex items-center justify-center text-white mb-3`}
              >
                <Trophy className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-text">
                {tier.nameKey ? t(tier.nameKey) : tier.name}
              </h3>
              <p className="text-xs text-text-secondary mb-2">
                {t("rewardsPage.minPoints", { points: tier.minPoints })}
              </p>
              <ul className="space-y-1">
                {(tier.benefitKeys || tier.benefitLines || []).map(
                  (benefit, idx) => (
                    <li
                      key={`${tier.id}-${idx}`}
                      className="text-xs text-text-secondary flex items-center gap-1"
                    >
                      <Star className="h-3 w-3 text-primary flex-shrink-0" />
                      {tier.benefitKeys ? t(benefit) : benefit}
                    </li>
                  ),
                )}
              </ul>
              {(tier.nameKey
                ? tier.nameKey === currentTier.nameKey
                : tier.name === currentTier.name) && (
                <Badge variant="primary" size="sm" className="mt-2">
                  {t("common.current")}
                </Badge>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Redeem Rewards */}
      <div className="mb-8">
        <h2 className="text-xl font-bold text-text mb-4">
          {t("rewardsPage.redeemRewards")}
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {redeemableRewards.map((reward) => (
            <div
              key={reward.id}
              className="bg-white p-4 rounded-xl border border-border/50 hover:shadow-md transition"
            >
              <span className="text-3xl">{reward.icon}</span>
              <h3 className="font-medium text-text mt-2">
                {reward.nameKey ? t(reward.nameKey) : reward.name}
              </h3>
              <p className="text-sm text-primary font-bold mt-1">
                {t("rewardsPage.points", { count: reward.points })}
              </p>
              <Button
                size="sm"
                fullWidth
                className="mt-3"
                disabled={
                  currentPoints < reward.points || redeemReward.isPending
                }
                loading={redeemReward.isPending}
                onClick={() => handleRedeemReward(reward)}
              >
                {currentPoints >= reward.points
                  ? t("common.redeem")
                  : t("common.notEnough")}
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Points History */}
      <div>
        <h2 className="text-xl font-bold text-text mb-4">
          {t("rewardsPage.pointsHistory")}
        </h2>
        <div className="bg-white rounded-xl border border-border/50">
          {allHistory.length === 0 ? (
            <div className="p-12 text-center text-text-secondary">
              <Gift className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">{t("rewardsPage.noPointsHistory")}</p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {paginatedHistory.map((item) => (
                <div
                  key={item.id}
                  className="p-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${item.type === "earned" || item.type === "refunded" ? "bg-green-100" : "bg-red-100"}`}
                    >
                      {item.type === "earned" || item.type === "refunded" ? (
                        <TrendingUp className="h-5 w-5 text-green-600" />
                      ) : (
                        <Gift className="h-5 w-5 text-red-600" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-text">
                        {item.description || item.type}
                      </p>
                      <p className="text-xs text-text-secondary">
                        {item.date
                          ? new Date(item.date).toLocaleDateString()
                          : ""}
                        {item.order_id && ` \u00B7 Order #${item.order_id}`}
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex items-center gap-2">
                    <span
                      className={`font-bold ${item.type === "earned" || item.type === "refunded" ? "text-success" : "text-danger"}`}
                    >
                      {item.type === "earned" || item.type === "refunded"
                        ? "+"
                        : "-"}
                      {Math.abs(item.points)} pts
                    </span>
                    <Badge
                      size="sm"
                      variant={
                        item.type === "earned"
                          ? "success"
                          : item.type === "redeemed"
                            ? "warning"
                            : item.type === "expired"
                              ? "danger"
                              : "info"
                      }
                    >
                      {item.type}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
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
      </div>
    </div>
  );
}
