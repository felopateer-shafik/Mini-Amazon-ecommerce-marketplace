import { useState, useMemo, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Search,
  Eye,
  Pencil,
  CheckCircle,
  XCircle,
  Trash2,
  Download,
  Filter,
  Package,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Toggle from "@/components/ui/Toggle";
import Pagination from "@/components/ui/Pagination";
import Modal from "@/components/ui/Modal";
import { formatCurrency, formatDate } from "@/lib/utils";
import toast from "react-hot-toast";
import { useTranslation } from "@/hooks/useTranslation";
import {
  useAdminProducts,
  useAdminProduct,
  useAdminUpdateProduct,
  useAdminDeleteProduct,
  useAdminApproveProduct,
  useAdminRejectProduct,
  useAdminReplyProductReconsideration,
} from "@/hooks/useApi";
import { useDebouncedValue } from "@/hooks/useDebounce";
import { useAuthStore } from "@/store/authStore";
import { usePermission } from "@/hooks/usePermission";

const statusColors = {
  approved: "success",
  pending: "warning",
  rejected: "danger",
};

export default function ProductsManagePage() {
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const isSystemAdmin = !!user?.is_system_admin;
  const { hasPerm } = usePermission();
  const canCreate = hasPerm("create-products");
  const canEdit = hasPerm("edit-products");
  const canDelete = hasPerm("delete-products");
  const canApprove = hasPerm("approve-products");
  const canExport = hasPerm("export-products");
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const statusLabels = {
    all: t("common.all"),
    approved: t("admin.statusApproved"),
    pending: t("admin.statusPending"),
    rejected: t("admin.statusRejected"),
  };
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [viewProduct, setViewProduct] = useState(null);
  const [reconsiderationReply, setReconsiderationReply] = useState("");
  const perPage = 10;

  const debouncedSearch = useDebouncedValue(search, 300);

  const queryParams = useMemo(
    () => ({
      search: debouncedSearch || undefined,
      status: statusFilter !== "all" ? statusFilter : undefined,
      page: currentPage,
      per_page: perPage,
    }),
    [debouncedSearch, statusFilter, currentPage],
  );

  const { data, isLoading } = useAdminProducts(queryParams);
  const { data: viewProductData, isLoading: isLoadingViewProduct } =
    useAdminProduct(viewProduct?.id || null);
  const updateProductMutation = useAdminUpdateProduct();
  const deleteMutation = useAdminDeleteProduct();
  const approveMutation = useAdminApproveProduct();
  const rejectMutation = useAdminRejectProduct();
  const replyReconsiderationMutation = useAdminReplyProductReconsideration();

  const productsPayload = data?.data ?? data ?? {};
  const rawProducts = Array.isArray(productsPayload?.data)
    ? productsPayload.data
    : Array.isArray(productsPayload)
      ? productsPayload
      : [];
  const products = rawProducts.map((product) => ({
    ...product,
    merchant:
      product?.vendor?.store_name ||
      product?.vendor?.business_name ||
      (product?.vendor_id ? null : "Website") ||
      product?.merchant ||
      "—",
    category: product?.category?.name || product?.category || "—",
    stock: product?.stock_quantity ?? product?.stock ?? 0,
    sold: product?.sold_count ?? product?.sold ?? 0,
    rating: product?.rating ?? product?.average_rating ?? 0,
    status:
      product?.status ||
      product?.moderation_status ||
      (product?.is_active ? "approved" : "pending"),
  }));
  const meta = data?.meta ?? productsPayload?.meta ?? {};
  const totalPages = Number(meta?.last_page ?? data?.last_page ?? 1);
  const totalProducts = Number(meta?.total ?? data?.total ?? products.length);
  const detailedViewProduct = viewProductData?.data ?? viewProduct;

  useEffect(() => {
    const reconsiderationRequestId = searchParams.get(
      "reconsiderationRequestId",
    );
    if (!reconsiderationRequestId || products.length === 0) return;

    const requestId = Number(reconsiderationRequestId);
    if (Number.isNaN(requestId)) return;

    const matchedProduct = products.find(
      (product) => Number(product?.latest_reconsideration?.id) === requestId,
    );

    if (matchedProduct) {
      setViewProduct(matchedProduct);
      const next = new URLSearchParams(searchParams);
      next.delete("reconsiderationRequestId");
      setSearchParams(next, { replace: true });
    }
  }, [products, searchParams, setSearchParams]);

  const handleApprove = async (id) => {
    try {
      await approveMutation.mutateAsync(id);
      toast.success(t("admin.productApproved"));
    } catch {
      toast.error(t("admin.failedApproveProduct"));
    }
  };

  const handleReject = async (id) => {
    const reason = window.prompt(t("admin.enterRejectionReason"));
    if (reason === null) return; // cancelled
    try {
      await rejectMutation.mutateAsync({
        id,
        data: { moderation_note: reason.trim() || undefined },
      });
      toast.success(t("admin.productRejected"));
    } catch {
      toast.error(t("admin.failedRejectProduct"));
    }
  };

  const handleReplyReconsideration = async (requestId) => {
    const adminReply = reconsiderationReply.trim();
    if (!adminReply) {
      toast.error(t("admin.pleaseEnterReplyFirst"));
      return;
    }

    try {
      await replyReconsiderationMutation.mutateAsync({
        id: requestId,
        data: { admin_reply: adminReply },
      });
      toast.success(t("admin.reconsiderationReplySent"));
      setReconsiderationReply("");
    } catch (err) {
      toast.error(err?.response?.data?.message || t("admin.failedSendReply"));
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t("common.confirmDelete"))) return;
    try {
      await deleteMutation.mutateAsync(id);
      toast.success(t("admin.productRemoved"));
    } catch {
      toast.error(t("admin.failedDeleteProduct"));
    }
  };

  const isSystemAdminProduct = (product) => product?.vendor_id == null;
  const canManageProduct = (product) =>
    !isSystemAdminProduct(product) || isSystemAdmin;
  const systemExclusiveMessage = "This item is system manager execlusive";

  const resolveMerchantName = (product) =>
    product?.merchant ||
    product?.vendor?.store_name ||
    product?.vendor?.business_name ||
    (product?.vendor_id == null ? "Website" : "—");

  const resolveCategoryName = (product) =>
    typeof product?.category === "object"
      ? (product?.category?.name ?? "—")
      : (product?.category ?? "—");

  const resolveStock = (product) =>
    product?.stock ?? product?.stock_quantity ?? 0;

  const resolveSold = (product) => product?.sold ?? product?.sold_count ?? 0;

  const resolveRating = (product) =>
    product?.rating ?? product?.average_rating ?? 0;

  const handleToggleSystemProductActive = async (product, nextValue) => {
    if (!isSystemAdmin) {
      toast.error(systemExclusiveMessage);
      return;
    }

    try {
      await updateProductMutation.mutateAsync({
        id: product.id,
        data: { is_active: !!nextValue },
      });
      toast.success(nextValue ? "Product activated" : "Product deactivated");
    } catch (err) {
      toast.error(
        err?.response?.data?.message || t("admin.failedUpdateProduct"),
      );
    }
  };

  const formatValue = (value) => {
    if (value === null || value === undefined) return "";
    if (Array.isArray(value)) return value.filter(Boolean).join(", ");
    if (typeof value === "object") return JSON.stringify(value);
    return String(value).trim();
  };

  const getPendingChanges = (product) => {
    if (!product?.has_pending_update || !product?.pending_update_payload)
      return [];
    if (product?.vendor_id == null) return [];

    const payload = product.pending_update_payload;
    const labels = {
      name: t("admin.productName"),
      description: t("merchant.productDescription"),
      short_description: t("merchant.shortDescription"),
      sku: t("merchant.productSKU"),
      price: t("admin.price"),
      compare_price: t("merchant.discountPrice"),
      cost_price: t("merchant.costPrice"),
      stock_quantity: t("admin.stock"),
      category_id: t("common.category"),
      brand_id: t("admin.brandName"),
      product_type: t("merchant.productType"),
      weight: t("merchant.weightKg"),
      dimensions: t("merchant.shippingSection"),
      images: t("merchant.productImages"),
      tags: t("merchant.productTags"),
      meta_title: t("merchant.metaTitle"),
      meta_description: t("merchant.metaDescription"),
      min_order_quantity: t("merchant.minOrderQuantity"),
      max_order_quantity: t("merchant.maxOrderQuantity"),
      variants: t("merchant.variants"),
      wholesale: t("merchant.wholesaleSection"),
    };

    return Object.entries(payload)
      .map(([key, value]) => {
        const nextValue = formatValue(value);
        if (!nextValue) return null;

        const currentRaw =
          key === "wholesale"
            ? {
                wholesale_price: product.wholesale_price,
                wholesale_min_qty: product.wholesale_min_qty,
              }
            : product[key];
        const currentValue = formatValue(currentRaw);
        if (currentValue === nextValue) return null;

        return {
          key,
          label: labels[key] || key,
          previous: currentValue,
          next: nextValue,
        };
      })
      .filter(Boolean);
  };

  const exportProducts = () => {
    if (!products.length) {
      toast.error(t("admin.noProductsToExport"));
      return;
    }
    const rows = [
      ["ID", "Name", "Vendor", "Category", "Price", "Stock", "Status"],
      ...products.map((p) => [
        p.id,
        `"${(p.name || "").replace(/"/g, '""')}"`,
        `"${(p.vendor?.name || "").replace(/"/g, '""')}"`,
        `"${(p.category?.name || "").replace(/"/g, '""')}"`,
        p.price ?? 0,
        p.stock_quantity ?? 0,
        p.status ?? (p.is_active ? "active" : "inactive"),
      ]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `admin-products-${new Date().toISOString().slice(0, 10)}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-text">
            {t("admin.manageProducts")}
          </h1>
          <p className="text-sm text-text-secondary">
            {t("admin.totalProductsCount", { count: totalProducts })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canCreate && (
            <Button onClick={() => navigate("/admin/products/new")}>
              Add Product
            </Button>
          )}
          {canExport && (
            <Button variant="outline" icon={Download} onClick={exportProducts}>
              {t("common.export")}
            </Button>
          )}
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl border border-border/50 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("admin.searchProducts")}
            className="w-full ps-9 pe-4 py-2.5 border border-border rounded-lg text-sm focus:ring-1 focus:ring-primary outline-none"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {["all", "approved", "pending", "rejected"].map((s) => (
            <button
              key={s}
              onClick={() => {
                setStatusFilter(s);
                setCurrentPage(1);
              }}
              className={`px-3 py-2 text-sm rounded-lg border capitalize transition ${statusFilter === s ? "bg-primary text-white border-primary" : "border-border text-text-secondary"}`}
            >
              {statusLabels[s]}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-border/50 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-16 text-text-secondary">
            {t("admin.noProductsFound")}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-border/50">
                    <th className="text-left text-xs font-medium text-text-secondary px-4 py-3">
                      {t("admin.productName")}
                    </th>
                    <th className="text-left text-xs font-medium text-text-secondary px-4 py-3">
                      {t("admin.merchant")}
                    </th>
                    <th className="text-left text-xs font-medium text-text-secondary px-4 py-3">
                      {t("common.category")}
                    </th>
                    <th className="text-left text-xs font-medium text-text-secondary px-4 py-3">
                      {t("admin.price")}
                    </th>
                    <th className="text-left text-xs font-medium text-text-secondary px-4 py-3">
                      {t("admin.stock")}
                    </th>
                    <th className="text-left text-xs font-medium text-text-secondary px-4 py-3">
                      {t("admin.status")}
                    </th>
                    <th className="text-left text-xs font-medium text-text-secondary px-4 py-3 text-center">
                      {t("common.actions")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {products.map((product) => (
                    <tr
                      key={product.id}
                      className="hover:bg-gray-50 transition"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3 width-max-content">
                          <img
                            src={
                              product.images?.[0] ||
                              product.image ||
                              "https://placehold.co/80x80/e5e7eb/9ca3af?text=No+Image"
                            }
                            alt={t("admin.productImage")}
                            loading="lazy"
                            className="w-10 h-10 rounded-lg object-cover"
                          />
                          <div>
                            <p className="text-sm font-medium text-text flex items-center gap-1">
                              {product.name}{" "}
                              {product.reported && (
                                <AlertTriangle className="h-3.5 w-3.5 text-danger" />
                              )}
                            </p>
                            <p className="text-xs text-text-secondary">
                              {product.sku}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-text-secondary">
                        {product.merchant}
                      </td>
                      <td className="px-4 py-3 text-sm text-text-secondary">
                        {product.category}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-text">
                        {formatCurrency(product.price)}
                      </td>
                      <td className="px-4 py-3 text-sm text-text-secondary">
                        {product.stock}
                      </td>
                      <td className="px-4 py-3">
                        {isSystemAdminProduct(product) ? (
                          <div className="flex items-center gap-2">
                            <Toggle
                              checked={!!product.is_active}
                              disabled={
                                !isSystemAdmin ||
                                updateProductMutation.isPending
                              }
                              onChange={(nextValue) =>
                                handleToggleSystemProductActive(
                                  product,
                                  nextValue,
                                )
                              }
                            />
                            <span className="text-xs text-text-secondary">
                              {product.is_active ? "Active" : "Inactive"}
                            </span>
                          </div>
                        ) : (
                          <Badge
                            variant={statusColors[product.status] || "warning"}
                            size="sm"
                            className="capitalize"
                          >
                            {statusLabels[product.status] ?? product.status}
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 width-max-content">
                          <button
                            className={`p-1.5 rounded ${canManageProduct(product) ? "hover:bg-gray-100" : "opacity-40 bg-gray-100"}`}
                            onClick={() =>
                              canManageProduct(product)
                                ? setViewProduct(product)
                                : toast.error(systemExclusiveMessage)
                            }
                            aria-label={t("merchant.view")}
                          >
                            <Eye className="h-4 w-4 text-text-secondary" />
                          </button>
                          {canEdit && (
                            <button
                              className={`p-1.5 rounded ${canManageProduct(product) ? "hover:bg-gray-100" : "opacity-40 bg-gray-100"}`}
                              onClick={() =>
                                canManageProduct(product)
                                  ? navigate(
                                      `/admin/products/${product.id}/edit`,
                                    )
                                  : toast.error(systemExclusiveMessage)
                              }
                              aria-label={t("common.edit")}
                            >
                              <Pencil className="h-4 w-4 text-text-secondary" />
                            </button>
                          )}
                          {canApprove &&
                            !isSystemAdminProduct(product) &&
                            product.status === "pending" &&
                            canManageProduct(product) && (
                              <>
                                <button
                                  className="p-2 sm:p-1.5 hover:bg-gray-100 rounded touch-manipulation"
                                  onClick={() => handleApprove(product.id)}
                                  aria-label={t("admin.approve")}
                                >
                                  <CheckCircle className="h-4 w-4 text-success" />
                                </button>
                                <button
                                  className="p-2 sm:p-1.5 hover:bg-gray-100 rounded touch-manipulation"
                                  onClick={() => handleReject(product.id)}
                                  aria-label={t("admin.reject")}
                                >
                                  <XCircle className="h-4 w-4 text-danger" />
                                </button>
                              </>
                            )}
                          {canDelete && (
                            <button
                              className={`p-1.5 rounded ${canManageProduct(product) ? "hover:bg-gray-100" : "opacity-40 bg-gray-100"}`}
                              onClick={() =>
                                canManageProduct(product)
                                  ? handleDelete(product.id)
                                  : toast.error(systemExclusiveMessage)
                              }
                              aria-label={t("common.delete")}
                            >
                              <Trash2 className="h-4 w-4 text-text-secondary hover:text-danger" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
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
          </>
        )}
      </div>

      <Modal
        isOpen={!!viewProduct}
        onClose={() => {
          setViewProduct(null);
          setReconsiderationReply("");
        }}
        title={detailedViewProduct?.name}
      >
        {detailedViewProduct && (
          <div className="space-y-4">
            {isLoadingViewProduct && (
              <div className="text-sm text-text-secondary">
                {t("common.loading")}
              </div>
            )}
            <img
              src={
                detailedViewProduct.images?.[0] ||
                detailedViewProduct.image ||
                "https://placehold.co/800x400/e5e7eb/9ca3af?text=No+Image"
              }
              alt={t("admin.productImage")}
              loading="lazy"
              className="w-full h-48 object-cover rounded-lg bg-gray-50"
            />
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-text-secondary">
                  {t("admin.merchant")}
                </p>
                <p className="text-sm font-medium">
                  {resolveMerchantName(detailedViewProduct)}
                </p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-text-secondary">
                  {t("common.category")}
                </p>
                <p className="text-sm font-medium">
                  {resolveCategoryName(detailedViewProduct)}
                </p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-text-secondary">
                  {t("admin.price")}
                </p>
                <p className="text-sm font-medium">
                  {formatCurrency(detailedViewProduct.price)}
                </p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-text-secondary">
                  {t("admin.stock")}
                </p>
                <p className="text-sm font-medium">
                  {resolveStock(detailedViewProduct)}
                </p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-text-secondary">{t("admin.sold")}</p>
                <p className="text-sm font-medium">
                  {resolveSold(detailedViewProduct)}
                </p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-text-secondary">
                  {t("common.rating")}
                </p>
                <p className="text-sm font-medium">
                  {resolveRating(detailedViewProduct)}★
                </p>
              </div>
            </div>

            {detailedViewProduct.description && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-text-secondary mb-1">
                  {t("merchant.productDescription")}
                </p>
                <p className="text-sm whitespace-pre-wrap">
                  {detailedViewProduct.description}
                </p>
              </div>
            )}

            {(() => {
              const pendingChanges = getPendingChanges(detailedViewProduct);
              if (pendingChanges.length === 0) return null;

              return (
                <div className="space-y-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
                  <p className="text-sm font-semibold text-text">
                    {t("admin.pendingUpdateChanges") ||
                      "Pending Update Changes"}
                  </p>
                  <div className="space-y-2">
                    {pendingChanges.map((change) => (
                      <div
                        key={change.key}
                        className="p-2 rounded bg-white border border-border/50"
                      >
                        <p className="text-xs font-medium text-text mb-1">
                          {change.label}
                        </p>
                        {change.previous ? (
                          <p className="text-xs text-text-secondary">
                            <span className="font-medium">Current:</span>{" "}
                            {change.previous}
                          </p>
                        ) : null}
                        <p className="text-xs text-text-secondary">
                          <span className="font-medium">Requested:</span>{" "}
                          {change.next}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {detailedViewProduct.latest_reconsideration && (
              <div className="space-y-3 p-3 bg-gray-50 rounded-lg border border-border/50">
                <p className="text-sm font-semibold text-text">
                  {t("admin.reconsiderationRequest")}
                </p>
                <p className="text-sm text-text-secondary whitespace-pre-wrap">
                  {detailedViewProduct.latest_reconsideration.message}
                </p>
                {detailedViewProduct.latest_reconsideration.admin_reply && (
                  <div className="p-2 bg-white border-l-2 border-primary rounded">
                    <p className="text-xs font-medium text-primary mb-1">
                      {t("admin.adminReply")}
                    </p>
                    <p className="text-sm text-text-secondary whitespace-pre-wrap">
                      {detailedViewProduct.latest_reconsideration.admin_reply}
                    </p>
                  </div>
                )}

                {!detailedViewProduct.latest_reconsideration.admin_reply && (
                  <>
                    <textarea
                      value={reconsiderationReply}
                      onChange={(e) => setReconsiderationReply(e.target.value)}
                      rows={3}
                      placeholder={t("admin.writeAdminReply")}
                      className="w-full border border-border rounded-lg p-2 text-sm"
                    />
                    <Button
                      onClick={() =>
                        handleReplyReconsideration(
                          detailedViewProduct.latest_reconsideration.id,
                        )
                      }
                      loading={replyReconsiderationMutation.isPending}
                    >
                      {t("admin.replyToRequest")}
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
