import { useMemo, useState } from "react";
import {
  Search,
  Star,
  Eye,
  Trash2,
  Loader2,
  CheckCircle,
  XCircle,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Pagination from "@/components/ui/Pagination";
import { formatDate } from "@/lib/utils";
import toast from "react-hot-toast";
import { useTranslation } from "@/hooks/useTranslation";
import {
  useAdminApproveReview,
  useAdminDeleteReview,
  useAdminRejectReview,
  useAdminReviews,
} from "@/hooks/useApi";
import { useDebouncedValue } from "@/hooks/useDebounce";
import { usePermission } from "@/hooks/usePermission";

export default function ReviewsManagePage() {
  const { t } = useTranslation();
  const { hasPerm } = usePermission();
  const canView = hasPerm("view-reviews");
  const canModerate = hasPerm("moderate-reviews");
  const canDelete = hasPerm("delete-reviews");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [ratingFilter, setRatingFilter] = useState("all");
  const [selectedReview, setSelectedReview] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const debouncedSearch = useDebouncedValue(search, 300);

  const params = useMemo(
    () => ({
      page: currentPage,
      per_page: 12,
      rating: ratingFilter !== "all" ? Number(ratingFilter) : undefined,
      search: debouncedSearch || undefined,
    }),
    [currentPage, ratingFilter, debouncedSearch],
  );

  const reviewsQuery = useAdminReviews(params);
  const deleteReview = useAdminDeleteReview();
  const approveReview = useAdminApproveReview();
  const rejectReview = useAdminRejectReview();

  const raw = reviewsQuery.data ?? {};
  const nested = raw?.data ?? {};
  const reviews = Array.isArray(nested?.data)
    ? nested.data
    : Array.isArray(raw?.data)
      ? raw.data
      : [];
  const meta = raw?.meta ?? nested?.meta ?? {};
  const totalPages = Number(meta?.last_page || 1);

  const filteredReviews = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return reviews;
    return reviews.filter((review) => {
      const productName = review?.product?.name || "";
      const userName = review?.user?.name || "";
      const comment = review?.comment || "";
      const title = review?.title || "";
      return [productName, userName, comment, title].some((value) =>
        String(value).toLowerCase().includes(query),
      );
    });
  }, [reviews, search]);

  const handleDelete = async (reviewId) => {
    if (!window.confirm(t("common.confirmDelete"))) return;
    try {
      await deleteReview.mutateAsync(reviewId);
      toast.success(t("admin.reviewDeleted"));
    } catch {
      toast.error(t("admin.deleteReviewFailed"));
    }
  };

  const handleApprove = async (reviewId) => {
    try {
      await approveReview.mutateAsync(reviewId);
      toast.success(t("admin.reviewApproved") || "Review approved");
    } catch {
      toast.error(t("admin.approveReviewFailed") || "Failed to approve review");
    }
  };

  const handleReject = async (reviewId) => {
    try {
      await rejectReview.mutateAsync(reviewId);
      toast.success(t("admin.reviewRejected") || "Review rejected");
    } catch {
      toast.error(t("admin.rejectReviewFailed") || "Failed to reject review");
    }
  };

  const openReviewModal = (review) => {
    setSelectedReview(review);
    setIsViewModalOpen(true);
  };

  const closeReviewModal = () => {
    setIsViewModalOpen(false);
  };

  const handleReviewModalAfterClose = () => {
    setSelectedReview(null);
  };

  const renderReviewStars = (rating) => {
    const safeRating = Math.max(
      0,
      Math.min(5, Math.round(Number(rating || 0))),
    );

    return Array.from({ length: 5 }, (_, index) => (
      <Star
        key={index}
        className={
          index < safeRating
            ? "h-5 w-5 fill-current text-warning"
            : "h-5 w-5 text-border"
        }
      />
    ));
  };

  if (reviewsQuery.isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (reviewsQuery.isError) {
    return (
      <div className="flex items-center justify-center h-64 text-danger">
        {t("common.failedToLoad")}
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-text">
          {t("admin.manageReviews")}
        </h1>
        <p className="text-sm text-text-secondary">
          {t("admin.reviewsModerationSubtitle")}
        </p>
      </div>

      <div className="bg-white p-4 rounded-xl border border-border/50 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("admin.searchReviews")}
            className="w-full ps-9 pe-4 py-2.5 border border-border rounded-lg text-sm focus:ring-1 focus:ring-primary outline-none"
          />
        </div>
        <select
          value={ratingFilter}
          onChange={(e) => {
            setRatingFilter(e.target.value);
            setCurrentPage(1);
          }}
          className="border border-border rounded-lg px-3 py-2.5 text-sm bg-white"
        >
          <option value="all">{t("admin.allRatings")}</option>
          <option value="5">5 {t("admin.stars")}</option>
          <option value="4">4 {t("admin.stars")}</option>
          <option value="3">3 {t("admin.stars")}</option>
          <option value="2">2 {t("admin.stars")}</option>
          <option value="1">1 {t("admin.stars")}</option>
        </select>
      </div>

      <div className="bg-white rounded-xl border border-border/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-border/50">
                <th className="text-left text-xs font-medium text-text-secondary px-4 py-3">
                  {t("admin.product")}
                </th>
                <th className="text-left text-xs font-medium text-text-secondary px-4 py-3">
                  {t("admin.reviewer")}
                </th>
                <th className="text-left text-xs font-medium text-text-secondary px-4 py-3">
                  {t("common.rating")}
                </th>
                <th className="text-left text-xs font-medium text-text-secondary px-4 py-3">
                  {t("admin.comment")}
                </th>
                <th className="text-left text-xs font-medium text-text-secondary px-4 py-3">
                  {t("common.date")}
                </th>
                <th className="text-left text-xs font-medium text-text-secondary px-4 py-3 text-center">
                  {t("common.actions")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {filteredReviews.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-12 text-center text-sm text-text-secondary"
                  >
                    {t("admin.noReviews")}
                  </td>
                </tr>
              )}
              {filteredReviews.map((review) => (
                <tr key={review.id} className="hover:bg-gray-50 transition">
                  <td className="px-4 py-3 text-sm text-text font-medium">
                    {review?.product?.name || `#${review.product_id}`}
                  </td>
                  <td className="px-4 py-3 text-sm text-text-secondary">
                    {review?.user?.name || `User #${review.user_id}`}
                  </td>
                  <td className="px-4 py-3">
                    <div
                      className="flex items-center gap-1 text-yellow-500"
                      role="img"
                      aria-label={`${t("common.rating")}: ${Number(review.rating || 0).toFixed(1)} / 5`}
                    >
                      <Star className="h-4 w-4 fill-current" />
                      <span className="text-sm font-medium text-text">
                        {Number(review.rating || 0)}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="max-w-[420px]">
                      {review.title ? (
                        <p className="text-sm font-medium text-text">
                          {review.title}
                        </p>
                      ) : null}
                      <p className="text-sm text-text-secondary line-clamp-2">
                        {review.comment || "—"}
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-text-secondary width-8rem">
                    {review.created_at ? formatDate(review.created_at) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 width-max-content flex-wrap justify-center">
                      {canView && (
                        <Button
                          variant="outline"
                          icon={Eye}
                          onClick={() => openReviewModal(review)}
                          className="border-accent/40 text-secondary hover:border-accent hover:bg-primary-light/40 hover:text-secondary"
                        >
                          {t("admin.viewReview")}
                        </Button>
                      )}
                      {canModerate && (
                        <Button
                          variant="outline"
                          icon={CheckCircle}
                          loading={approveReview.isPending}
                          onClick={() => handleApprove(review.id)}
                          className="text-green-600 border-green-200 hover:bg-green-50"
                        >
                          {t("admin.approve")}
                        </Button>
                      )}
                      {canModerate && (
                        <Button
                          variant="outline"
                          icon={XCircle}
                          loading={rejectReview.isPending}
                          onClick={() => handleReject(review.id)}
                          className="text-orange-600 border-orange-200 hover:bg-orange-50"
                        >
                          {t("admin.reject")}
                        </Button>
                      )}
                      {canDelete && (
                        <Button
                          variant="outline"
                          icon={Trash2}
                          loading={deleteReview.isPending}
                          onClick={() => handleDelete(review.id)}
                        >
                          {t("common.delete")}
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      )}

      <Modal
        isOpen={isViewModalOpen}
        onClose={closeReviewModal}
        onAfterClose={handleReviewModalAfterClose}
        title={t("admin.reviewDetails")}
        size="md"
        className="overflow-hidden border border-border/50"
        footer={
          <Button variant="ghost" onClick={closeReviewModal}>
            {t("common.close")}
          </Button>
        }
      >
        {selectedReview && (
          <div className="space-y-5">
            <div className="rounded-2xl border border-primary/15 bg-gradient-to-br from-primary-light/50 via-white to-surface-alt p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-secondary">
                    {t("admin.product")}
                  </p>
                  <h4 className="text-lg font-semibold text-text">
                    {selectedReview?.product?.name ||
                      `#${selectedReview.product_id}`}
                  </h4>
                  <p className="text-sm text-text-secondary">
                    {selectedReview?.user?.name ||
                      `User #${selectedReview.user_id}`}
                  </p>
                </div>

                <div className="rounded-2xl border border-warning/20 bg-white/85 px-4 py-3 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-secondary">
                    {t("common.rating")}
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      {renderReviewStars(selectedReview.rating)}
                    </div>
                    <span className="text-sm font-semibold text-text">
                      {Number(selectedReview.rating || 0).toFixed(1)}/5
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-border/50 bg-surface-alt p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-secondary">
                  {t("admin.reviewer")}
                </p>
                <p className="mt-2 text-sm font-medium text-text">
                  {selectedReview?.user?.name ||
                    `User #${selectedReview.user_id}`}
                </p>
              </div>
              <div className="rounded-xl border border-border/50 bg-surface-alt p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-secondary">
                  {t("common.date")}
                </p>
                <p className="mt-2 text-sm font-medium text-text">
                  {selectedReview.created_at
                    ? formatDate(selectedReview.created_at)
                    : "-"}
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-border/50 bg-white p-5 shadow-sm">
              {selectedReview.title ? (
                <h5 className="text-base font-semibold text-text">
                  {selectedReview.title}
                </h5>
              ) : null}
              <p className="mt-3 text-sm leading-7 text-text-secondary whitespace-pre-line">
                {selectedReview.comment || "-"}
              </p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
