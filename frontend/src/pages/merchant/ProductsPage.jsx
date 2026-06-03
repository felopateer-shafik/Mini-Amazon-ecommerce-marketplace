import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Eye,
  Copy,
  MoreVertical,
  Package,
  Filter,
  Download,
  Upload,
  Loader2,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Pagination from "@/components/ui/Pagination";
import Modal from "@/components/ui/Modal";
import Dropdown from "@/components/ui/Dropdown";
import { formatCurrency } from "@/lib/utils";
import { useTranslation } from "@/hooks/useTranslation";
import {
  useMerchantProducts,
  useDeleteProduct,
  useMerchantSubmitReconsideration,
} from "@/hooks/useApi";
import { useDebouncedValue } from "@/hooks/useDebounce";
import toast from "react-hot-toast";

const statusColors = {
  approved: "success",
  pending: "warning",
  rejected: "danger",
};

export default function ProductsPage() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteModal, setDeleteModal] = useState(null);
  const [reconsiderModal, setReconsiderModal] = useState(null);
  const [replyModalProduct, setReplyModalProduct] = useState(null);
  const [reconsiderationMessage, setReconsiderationMessage] = useState("");
  const perPage = 10;

  const debouncedSearch = useDebouncedValue(search, 300);

  const apiParams = {
    page: currentPage,
    per_page: perPage,
    ...(debouncedSearch && { search: debouncedSearch }),
    ...(statusFilter !== "all" && { status: statusFilter }),
  };

  const {
    data: productsData,
    isLoading,
    isError,
  } = useMerchantProducts(apiParams);
  const deleteProductMutation = useDeleteProduct();
  const submitReconsiderationMutation = useMerchantSubmitReconsideration();

  const products = productsData?.data ?? [];
  const meta = productsData?.meta ?? {};
  const totalPages = meta?.last_page ?? productsData?.last_page ?? 1;
  const totalCount = meta?.total ?? productsData?.total ?? products.length;
  const statusLabel = {
    all: t("common.all"),
    approved: t("admin.statusApproved") || "Approved",
    pending: t("admin.statusPending") || "Pending",
    rejected: t("admin.statusRejected") || "Rejected",
  };

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
      if (matchedProduct?.latest_reconsideration?.admin_reply) {
        setReplyModalProduct(matchedProduct);
      } else {
        setReconsiderModal(matchedProduct);
      }

      const next = new URLSearchParams(searchParams);
      next.delete("reconsiderationRequestId");
      setSearchParams(next, { replace: true });
    }
  }, [products, searchParams, setSearchParams]);

  const deleteProduct = async (id) => {
    try {
      await deleteProductMutation.mutateAsync(id);
      setDeleteModal(null);
      toast.success(t("merchant.productDeleted"));
    } catch {
      toast.error(t("merchant.failedDeleteProduct"));
    }
  };

  const handleSubmitReconsideration = async () => {
    if (!reconsiderModal) return;
    if (!reconsiderationMessage.trim()) {
      toast.error(t("merchant.provideReconsiderationDetails"));
      return;
    }

    try {
      await submitReconsiderationMutation.mutateAsync({
        productId: reconsiderModal.id,
        data: { message: reconsiderationMessage.trim() },
      });
      toast.success(t("merchant.reconsiderationSubmitted"));
      setReconsiderModal(null);
      setReconsiderationMessage("");
    } catch (err) {
      toast.error(
        err?.response?.data?.message ||
          t("merchant.failedSubmitReconsideration"),
      );
    }
  };

  const exportProducts = () => {
    const rows = [
      [
        t("merchant.csvId"),
        t("common.name"),
        t("merchant.productSKU"),
        t("merchant.category"),
        t("common.price"),
        t("merchant.stock"),
        t("common.status"),
      ],
      ...products.map((product) => [
        product.id,
        `"${(product.name || "").replace(/"/g, '""')}"`,
        product.sku || "",
        `"${(product.category?.name || "").replace(/"/g, '""')}"`,
        product.price ?? 0,
        product.stock_quantity ?? 0,
        product.status ||
          product.moderation_status ||
          (product.is_active ? "approved" : "pending"),
      ]),
    ];

    const csv = rows.map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `merchant-products-${new Date().toISOString().slice(0, 10)}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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
        <p className="text-danger">{t("merchant.failedLoadProducts")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-text">
            {t("merchant.myProducts")}
          </h1>
          <p className="text-sm text-text-secondary">
            {t("merchant.totalProductsCount", { count: totalCount })}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            icon={Upload}
            disabled
            title={t("common.comingSoon")}
          >
            {t("common.import")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            icon={Download}
            onClick={exportProducts}
          >
            {t("merchant.exportProducts")}
          </Button>
          <Link to="/merchant/products/new">
            <Button icon={Plus}>{t("merchant.addProduct")}</Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-border/50 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("merchant.searchProducts")}
            className="w-full ps-9 pe-4 py-2.5 border border-border rounded-lg text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none"
          />
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          {["all", "approved", "pending", "rejected"].map((s) => (
            <button
              key={s}
              onClick={() => {
                setStatusFilter(s);
                setCurrentPage(1);
              }}
              className={`px-3 py-2 text-sm rounded-lg border capitalize transition ${statusFilter === s ? "bg-primary text-white border-primary" : "border-border text-text-secondary"}`}
            >
              {statusLabel[s]}
            </button>
          ))}
        </div>
      </div>

      {/* Product Table */}
      <div className="bg-white rounded-xl border border-border/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-border/50">
                <th className="text-left text-xs font-medium text-text-secondary px-4 py-3">
                  {t("merchant.productName")}
                </th>
                <th className="text-left text-xs font-medium text-text-secondary px-4 py-3">
                  {t("merchant.productSKU")}
                </th>
                <th className="text-left text-xs font-medium text-text-secondary px-4 py-3">
                  {t("common.price")}
                </th>
                <th className="text-left text-xs font-medium text-text-secondary px-4 py-3">
                  {t("merchant.stock")}
                </th>
                <th className="text-left text-xs font-medium text-text-secondary px-4 py-3">
                  {t("merchant.sold")}
                </th>
                <th className="text-left text-xs font-medium text-text-secondary px-4 py-3">
                  {t("common.status")}
                </th>
                <th className="text-left text-xs font-medium text-text-secondary px-4 py-3">
                  {t("common.actions")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {products.map((product) => {
                const status =
                  product.status ||
                  product.moderation_status ||
                  (product.is_active ? "approved" : "pending");
                const stockQty = product.stock_quantity ?? 0;
                const categoryName = product.category?.name ?? "—";
                const image =
                  product.images?.[0] ??
                  `https://placehold.co/60x60/f0f0f0/333?text=${product.name?.[0] ?? "P"}`;
                return (
                  <tr key={product.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3 width-max-content">
                        <img
                          src={image}
                          alt=""
                          loading="lazy"
                          className="w-10 h-10 rounded-lg object-cover"
                        />
                        <div>
                          <p className="text-sm font-medium text-text">
                            {product.name}
                          </p>
                          <p className="text-xs text-text-secondary">
                            {categoryName}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-text-secondary">
                      {product.sku}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-text">
                      {formatCurrency(product.price)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-sm ${stockQty < 10 ? "text-danger font-medium" : "text-text-secondary"}`}
                      >
                        {stockQty}
                        {stockQty < 10 && " ⚠️"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-text-secondary">
                      {product.total_sold ?? product.sold_count ?? 0}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={statusColors[status]} size="sm">
                        {statusLabel[status]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 width-max-content">
                        <Link
                          to={`/merchant/products/${product.id}/edit`}
                          className="p-1.5 hover:bg-gray-100 rounded"
                        >
                          <Edit2 className="h-4 w-4 text-text-secondary hover:text-accent" />
                        </Link>
                        {status === "rejected" && (
                          <>
                            <button
                              onClick={() => setReconsiderModal(product)}
                              className="p-1.5 hover:bg-gray-100 rounded text-xs text-accent"
                              title="Request reconsideration"
                              aria-label="Request reconsideration"
                            >
                              RQ
                            </button>
                            {product?.latest_reconsideration?.admin_reply && (
                              <button
                                onClick={() => setReplyModalProduct(product)}
                                className="p-1.5 hover:bg-gray-100 rounded text-xs text-primary"
                                title="View admin reply"
                                aria-label="View admin reply"
                              >
                                RP
                              </button>
                            )}
                          </>
                        )}
                        <button
                          onClick={() => setDeleteModal(product)}
                          className="p-1.5 hover:bg-gray-100 rounded"
                          aria-label={t("common.delete")}
                        >
                          <Trash2 className="h-4 w-4 text-text-secondary hover:text-danger" />
                        </button>
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

      <Modal
        isOpen={!!deleteModal}
        onClose={() => setDeleteModal(null)}
        title={t("merchant.deleteProduct")}
        size="sm"
      >
        <p className="text-sm text-text-secondary mb-4">
          {t("merchant.confirmDeleteProduct", {
            name: deleteModal?.name ?? "",
          })}
        </p>
        <div className="flex gap-3">
          <Button
            variant="outline"
            fullWidth
            onClick={() => setDeleteModal(null)}
          >
            {t("common.cancel")}
          </Button>
          <Button
            variant="primary"
            fullWidth
            className="!bg-danger hover:!bg-red-700"
            onClick={() => deleteProduct(deleteModal?.id)}
            loading={deleteProductMutation.isPending}
          >
            {t("common.delete")}
          </Button>
        </div>
      </Modal>

      <Modal
        isOpen={!!replyModalProduct}
        onClose={() => setReplyModalProduct(null)}
        title={t("merchant.adminReply")}
        size="sm"
      >
        <div className="space-y-3">
          <p className="text-sm text-text-secondary">
            <span className="font-medium text-text">
              {t("merchant.yourRequest")}
            </span>{" "}
            {replyModalProduct?.latest_reconsideration?.message || "-"}
          </p>
          <div className="border border-border rounded-lg p-3 bg-gray-50">
            <p className="text-xs font-medium text-primary mb-1">
              {t("merchant.adminResponse")}
            </p>
            <p className="text-sm text-text whitespace-pre-wrap">
              {replyModalProduct?.latest_reconsideration?.admin_reply ||
                t("merchant.noReplyYet")}
            </p>
          </div>
          <Button fullWidth onClick={() => setReplyModalProduct(null)}>
            {t("common.close")}
          </Button>
        </div>
      </Modal>

      <Modal
        isOpen={!!reconsiderModal}
        onClose={() => {
          setReconsiderModal(null);
          setReconsiderationMessage("");
        }}
        title={t("merchant.requestReconsideration")}
        size="sm"
      >
        <p className="text-sm text-text-secondary mb-3">
          {t("merchant.explainReconsideration")}
        </p>
        <textarea
          value={reconsiderationMessage}
          onChange={(e) => setReconsiderationMessage(e.target.value)}
          rows={4}
          className="w-full border border-border rounded-lg p-3 text-sm"
          placeholder={t("merchant.writeRequestDetails")}
        />
        <div className="flex gap-3 mt-4">
          <Button
            variant="outline"
            fullWidth
            onClick={() => {
              setReconsiderModal(null);
              setReconsiderationMessage("");
            }}
          >
            {t("common.cancel")}
          </Button>
          <Button
            fullWidth
            onClick={handleSubmitReconsideration}
            loading={submitReconsiderationMutation.isPending}
          >
            {t("merchant.submitRequest")}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
