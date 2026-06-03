import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Eye,
  Download,
  Loader2,
  Package,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Toggle from "@/components/ui/Toggle";
import Pagination from "@/components/ui/Pagination";
import Modal from "@/components/ui/Modal";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useTranslation } from "@/hooks/useTranslation";
import {
  useAdminProducts,
  useAdminProduct,
  useAdminUpdateProduct,
  useAdminDeleteProduct,
} from "@/hooks/useApi";
import { useDebouncedValue } from "@/hooks/useDebounce";
import toast from "react-hot-toast";

export default function AdminMyProductsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [viewProduct, setViewProduct] = useState(null);
  const perPage = 10;

  const debouncedSearch = useDebouncedValue(search, 300);

  const queryParams = useMemo(
    () => ({
      search: debouncedSearch || undefined,
      system_only: true,
      page: currentPage,
      per_page: perPage,
    }),
    [debouncedSearch, currentPage],
  );

  const { data, isLoading } = useAdminProducts(queryParams);
  const { data: viewProductData, isLoading: isLoadingViewProduct } =
    useAdminProduct(viewProduct?.id || null);
  const updateProductMutation = useAdminUpdateProduct();
  const deleteMutation = useAdminDeleteProduct();

  const productsPayload = data?.data ?? data ?? {};
  const rawProducts = Array.isArray(productsPayload?.data)
    ? productsPayload.data
    : Array.isArray(productsPayload)
      ? productsPayload
      : [];
  const products = rawProducts;
  const meta = data?.meta ?? productsPayload?.meta ?? {};
  const totalPages = Number(meta?.last_page ?? data?.last_page ?? 1);
  const totalProducts = Number(meta?.total ?? data?.total ?? products.length);
  const detailedViewProduct = viewProductData?.data ?? viewProduct;

  const handleToggleActive = async (product, nextValue) => {
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

  const handleDelete = async (id) => {
    if (!window.confirm(t("common.confirmDelete"))) return;
    try {
      await deleteMutation.mutateAsync(id);
      toast.success(t("admin.productRemoved"));
    } catch {
      toast.error(t("admin.failedDeleteProduct"));
    }
  };

  const exportProducts = () => {
    if (!products.length) {
      toast.error(t("admin.noProductsToExport"));
      return;
    }
    const rows = [
      ["ID", "Name", "SKU", "Category", "Price", "Stock", "Status"],
      ...products.map((p) => [
        p.id,
        `"${(p.name || "").replace(/"/g, '""')}"`,
        p.sku || "",
        `"${(p.category?.name || "").replace(/"/g, '""')}"`,
        p.price ?? 0,
        p.stock_quantity ?? 0,
        p.is_active ? "active" : "inactive",
      ]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `my-products-${new Date().toISOString().slice(0, 10)}.csv`,
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
            {t("merchant.myProducts")}
          </h1>
          <p className="text-sm text-text-secondary">
            {t("merchant.totalProductsCount", { count: totalProducts })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" icon={Download} onClick={exportProducts}>
            {t("common.export")}
          </Button>
          <Button onClick={() => navigate("/admin/products/new")}>
            {t("merchant.addProduct")}
          </Button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl border border-border/50 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            placeholder={t("merchant.searchProducts")}
            className="w-full ps-9 pe-4 py-2.5 border border-border rounded-lg text-sm focus:ring-1 focus:ring-primary outline-none"
          />
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
                      {t("merchant.productSKU")}
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
                  {products.map((product) => {
                    const stockQty = product.stock_quantity ?? 0;
                    const categoryName = product.category?.name ?? "—";
                    const image =
                      product.images?.[0] ||
                      product.image ||
                      "https://placehold.co/80x80/e5e7eb/9ca3af?text=No+Image";
                    return (
                      <tr
                        key={product.id}
                        className="hover:bg-gray-50 transition"
                      >
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
                        <td className="px-4 py-3 text-sm text-text-secondary">
                          {categoryName}
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
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Toggle
                              checked={!!product.is_active}
                              disabled={updateProductMutation.isPending}
                              onChange={(val) =>
                                handleToggleActive(product, val)
                              }
                            />
                            <span className="text-xs text-text-secondary">
                              {product.is_active ? "Active" : "Inactive"}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 width-max-content">
                            <button
                              className="p-2 sm:p-1.5 hover:bg-gray-100 rounded touch-manipulation"
                              onClick={() => setViewProduct(product)}
                              aria-label={t("merchant.view")}
                            >
                              <Eye className="h-4 w-4 text-text-secondary" />
                            </button>
                            <button
                              className="p-2 sm:p-1.5 hover:bg-gray-100 rounded touch-manipulation"
                              onClick={() =>
                                navigate(`/admin/products/${product.id}/edit`)
                              }
                              aria-label={t("common.edit")}
                            >
                              <Edit2 className="h-4 w-4 text-text-secondary" />
                            </button>
                            <button
                              className="p-2 sm:p-1.5 hover:bg-gray-100 rounded touch-manipulation"
                              onClick={() => handleDelete(product.id)}
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
          </>
        )}
      </div>

      {/* View Product Modal */}
      <Modal
        isOpen={!!viewProduct}
        onClose={() => setViewProduct(null)}
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
              alt=""
              loading="lazy"
              className="w-full h-48 object-cover rounded-lg bg-gray-50"
            />
            <div className="grid grid-cols-2 gap-3">
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
                  {detailedViewProduct.stock_quantity ?? 0}
                </p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-text-secondary">
                  {t("common.category")}
                </p>
                <p className="text-sm font-medium">
                  {detailedViewProduct.category?.name ?? "—"}
                </p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-text-secondary">
                  {t("common.rating")}
                </p>
                <p className="text-sm font-medium">
                  {detailedViewProduct.rating ??
                    detailedViewProduct.average_rating ??
                    0}
                  ★
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
          </div>
        )}
      </Modal>
    </div>
  );
}
