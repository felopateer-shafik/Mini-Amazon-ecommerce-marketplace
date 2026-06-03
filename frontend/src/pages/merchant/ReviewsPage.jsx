import { useState } from "react";
import {
  Star,
  MessageCircle,
  ThumbsUp,
  Filter,
  Loader2,
  Image,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import StarRating from "@/components/ui/StarRating";
import Pagination from "@/components/ui/Pagination";
import Modal from "@/components/ui/Modal";
import Textarea from "@/components/ui/Textarea";
import { formatDate } from "@/lib/utils";
import { useTranslation } from "@/hooks/useTranslation";
import {
  useMerchantReviews,
  useMerchantReplyReview,
  useMerchantMarkReviewHelpful,
} from "@/hooks/useApi";
import toast from "react-hot-toast";

export default function ReviewsPage() {
  const { t } = useTranslation();
  const MAX_REPLY_LENGTH = 1000;
  const [ratingFilter, setRatingFilter] = useState("all");
  const [replyModal, setReplyModal] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const perPage = 8;

  const apiParams = {
    page: currentPage,
    per_page: perPage,
    ...(ratingFilter !== "all" && { rating: parseInt(ratingFilter) }),
  };

  const {
    data: reviewsData,
    isLoading,
    isError,
  } = useMerchantReviews(apiParams);
  const replyMutation = useMerchantReplyReview();
  const helpfulMutation = useMerchantMarkReviewHelpful();

  const raw = reviewsData ?? {};
  const meta = raw?.meta ?? {};
  const stats = meta?.stats ?? {};
  const reviews = raw?.data ?? [];
  const totalPages = meta?.last_page ?? raw?.last_page ?? 1;
  const totalCount =
    stats?.total_reviews ?? meta?.total ?? raw?.total ?? reviews.length;

  const avgRating = String(stats?.average_rating ?? "0.0");
  const ratingDistribution = stats?.rating_distribution ?? {
    5: reviews.filter((r) => r.rating === 5).length,
    4: reviews.filter((r) => r.rating === 4).length,
    3: reviews.filter((r) => r.rating === 3).length,
    2: reviews.filter((r) => r.rating === 2).length,
    1: reviews.filter((r) => r.rating === 1).length,
  };

  const submitReply = async () => {
    const trimmedReply = replyText.trim();
    if (!trimmedReply || trimmedReply.length > MAX_REPLY_LENGTH) return;
    try {
      await replyMutation.mutateAsync({
        reviewId: replyModal.id,
        data: { reply: trimmedReply },
      });
      toast.success(t("merchant.replySubmitted"));
      setReplyModal(null);
      setReplyText("");
    } catch {
      toast.error(t("merchant.failedSubmitReply"));
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-danger">{t("merchant.failedLoadReviews")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-text">
            {t("merchant.reviews")}
          </h1>
          <p className="text-sm text-text-secondary">
            {t("merchant.reviewsAverageSummary", {
              count: totalCount,
              avg: avgRating,
            })}
          </p>
        </div>
      </div>

      {/* Rating Summary */}
      <div className="bg-white p-6 rounded-xl border border-border/50 flex items-center gap-8">
        <div className="text-center">
          <p className="text-4xl font-bold text-text">{avgRating}</p>
          <StarRating
            rating={parseFloat(avgRating)}
            ariaLabel={t("merchant.reviewsAverageSummary", {
              count: totalCount,
              avg: avgRating,
            })}
          />
          <p className="text-xs text-text-secondary mt-1">
            {t("merchant.reviewsCount", { count: totalCount })}
          </p>
        </div>
        <div className="flex-1 space-y-1.5">
          {[5, 4, 3, 2, 1].map((star) => {
            const count = Number(ratingDistribution?.[star] ?? 0);
            const pct = totalCount > 0 ? (count / totalCount) * 100 : 0;
            return (
              <div key={star} className="flex items-center gap-2">
                <span className="text-sm w-6">{star}★</span>
                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-xs text-text-secondary w-8 text-right">
                  {count}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {["all", "5", "4", "3", "2", "1"].map((r) => (
          <button
            key={r}
            onClick={() => {
              setRatingFilter(r);
              setCurrentPage(1);
            }}
            aria-pressed={ratingFilter === r}
            aria-label={
              r === "all" ? t("common.all") : `${r} ${t("common.rating")}`
            }
            className={`px-3 py-2 text-sm rounded-lg border transition ${ratingFilter === r ? "bg-primary text-white border-primary" : "border-border text-text-secondary"}`}
          >
            {r === "all" ? t("common.all") : `${r}★`}
          </button>
        ))}
      </div>

      {/* Reviews List */}
      <div className="space-y-4">
        {reviews.map((review) => {
          const customerName = review.user?.name ?? t("merchant.anonymous");
          const productName = review.product?.name ?? "—";
          const productImage =
            review.product?.images?.[0] ?? review.product?.image ?? null;
          const replyContent = review.reply || review.vendor_reply || "";
          const hasReply = !!replyContent;
          return (
            <div
              key={review.id}
              className="bg-white p-4 rounded-xl border border-border/50"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-sm font-medium text-text-secondary">
                  {customerName[0]}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-text">
                        {customerName}
                      </p>
                      <div className="flex items-center gap-2">
                        <StarRating
                          rating={review.rating}
                          size="sm"
                          ariaLabel={`${t("common.rating")}: ${Number(review.rating || 0).toFixed(1)} / 5`}
                        />
                        <span className="text-xs text-text-secondary">
                          {formatDate(review.created_at)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {productImage ? (
                        <img
                          src={productImage}
                          alt={t("merchant.productImage")}
                          loading="lazy"
                          className="w-8 h-8 rounded"
                        />
                      ) : (
                        <div
                          className="w-8 h-8 rounded bg-gray-100 text-text-secondary flex items-center justify-center"
                          aria-hidden="true"
                        >
                          <Image className="h-4 w-4" />
                        </div>
                      )}
                      <span className="text-xs text-text-secondary">
                        {productName}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-text-secondary mt-2">
                    {review.comment}
                  </p>
                  {hasReply && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg border-l-2 border-primary">
                      <p className="text-xs font-medium text-text">
                        {t("merchant.yourReply")}
                      </p>
                      <p className="text-sm text-text-secondary">
                        {replyContent}
                      </p>
                    </div>
                  )}
                  <div className="flex items-center gap-3 mt-3">
                    {!hasReply && (
                      <Button
                        variant="outline"
                        size="sm"
                        icon={MessageCircle}
                        onClick={() => setReplyModal(review)}
                      >
                        {t("merchant.reply")}
                      </Button>
                    )}
                    <button
                      className="text-xs text-text-secondary hover:text-accent flex items-center gap-1"
                      onClick={async () => {
                        try {
                          await helpfulMutation.mutateAsync(review.id);
                        } catch {
                          toast.error(
                            t("merchant.failedMarkHelpful") ||
                              "Failed to record helpful vote",
                          );
                        }
                      }}
                      disabled={helpfulMutation.isPending}
                    >
                      <ThumbsUp className="h-3 w-3" />{" "}
                      {t("merchant.helpfulCount", {
                        count: review.helpful_count ?? 0,
                      })}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      )}

      <Modal
        isOpen={!!replyModal}
        onClose={() => setReplyModal(null)}
        title={t("merchant.replyToCustomer", {
          name: replyModal?.user?.name ?? t("merchant.customer"),
        })}
        size="sm"
      >
        <Textarea
          value={replyText}
          onChange={(e) => setReplyText(e.target.value)}
          placeholder={t("merchant.reviewReply")}
          maxLength={MAX_REPLY_LENGTH}
          aria-label={t("merchant.reviewReply")}
          rows={4}
        />
        <div className="flex gap-3 mt-4">
          <Button
            variant="outline"
            fullWidth
            onClick={() => setReplyModal(null)}
          >
            {t("common.cancel")}
          </Button>
          <Button
            fullWidth
            onClick={submitReply}
            loading={replyMutation.isPending}
          >
            {t("merchant.reply")}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
