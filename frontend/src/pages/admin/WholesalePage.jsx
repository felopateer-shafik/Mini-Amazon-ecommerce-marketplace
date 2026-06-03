import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "@/hooks/useTranslation";
import {
  Eye,
  CheckCircle,
  XCircle,
  Package,
  Users,
  DollarSign,
  Settings,
  RefreshCw,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Pagination from "@/components/ui/Pagination";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import { formatCurrency } from "@/lib/utils";
import toast from "react-hot-toast";
import {
  useAdminBootstrapWholesaleProducts,
  useAdminSettings,
  useAdminSyncWholesaleProducts,
  useAdminUpdateSettings,
  useAdminUpdateWholesaleCustomerStatus,
  useAdminWholesaleCustomers,
  useAdminWholesaleProducts,
} from "@/hooks/useApi";
import { usePermission } from "@/hooks/usePermission";

const statusColors = {
  approved: "success",
  pending: "warning",
  rejected: "danger",
  active: "success",
};

export default function WholesalePage() {
  const { t } = useTranslation();
  const { hasPerm } = usePermission();
  const canManage = hasPerm("manage-wholesale");
  const { data: settingsRes, isLoading } = useAdminSettings();
  const updateSettings = useAdminUpdateSettings();

  const [activeTab, setActiveTab] = useState("customers");
  const [currentPage, setCurrentPage] = useState(1);
  const [customerSearch, setCustomerSearch] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [productPage, setProductPage] = useState(1);
  const [settingsModal, setSettingsModal] = useState(false);
  const [viewCustomer, setViewCustomer] = useState(null);
  const [moduleSettings, setModuleSettings] = useState({
    wholesale_enabled: false,
    wholesale_min_order_amount: 500,
    wholesale_default_discount: 20,
    wholesale_min_quantity: 10,
  });

  const customersQuery = useAdminWholesaleCustomers({
    page: currentPage,
    per_page: 8,
    ...(customerSearch ? { search: customerSearch } : {}),
  });
  const productsQuery = useAdminWholesaleProducts();
  const updateCustomerStatus = useAdminUpdateWholesaleCustomerStatus();
  const syncProducts = useAdminSyncWholesaleProducts();
  const bootstrapProducts = useAdminBootstrapWholesaleProducts();

  const settings = settingsRes?.data ?? settingsRes ?? {};
  const wholesalers = customersQuery.data?.data ?? [];
  const customerMeta = customersQuery.data?.meta ?? {
    current_page: 1,
    last_page: 1,
  };
  const wholesaleProducts = productsQuery.data?.data ?? [];

  const filteredWholesaleProducts = useMemo(() => {
    if (!productSearch.trim()) return wholesaleProducts;
    const needle = productSearch.toLowerCase();
    return wholesaleProducts.filter((item) =>
      [item.name, item.sku, item.merchant]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle)),
    );
  }, [wholesaleProducts, productSearch]);

  const productsPerPage = 12;
  const wholesaleProductTotalPages = Math.max(
    1,
    Math.ceil(filteredWholesaleProducts.length / productsPerPage),
  );
  const paginatedWholesaleProducts = useMemo(
    () =>
      filteredWholesaleProducts.slice(
        (productPage - 1) * productsPerPage,
        productPage * productsPerPage,
      ),
    [filteredWholesaleProducts, productPage],
  );

  useEffect(() => {
    setModuleSettings({
      wholesale_enabled: !!settings.wholesale_enabled,
      wholesale_min_order_amount: Number(
        settings.wholesale_min_order_amount ?? 500,
      ),
      wholesale_default_discount: Number(
        settings.wholesale_default_discount ?? 20,
      ),
      wholesale_min_quantity: Number(settings.wholesale_min_quantity ?? 10),
    });
  }, [settingsRes]);

  useEffect(() => {
    setCurrentPage(1);
  }, [customerSearch]);

  useEffect(() => {
    setProductPage(1);
  }, [productSearch]);

  const totalPages = customerMeta.last_page || 1;

  const updateStatus = async (id, status) => {
    try {
      await updateCustomerStatus.mutateAsync({ id, data: { status } });
      toast.success(t("admin.statusUpdated"));
    } catch {
      toast.error(t("admin.failedUpdateWholesaler"));
    }
  };

  const saveSettings = async () => {
    try {
      await updateSettings.mutateAsync({
        wholesale_enabled: moduleSettings.wholesale_enabled,
        wholesale_min_order_amount: Number(
          moduleSettings.wholesale_min_order_amount || 0,
        ),
        wholesale_default_discount: Number(
          moduleSettings.wholesale_default_discount || 0,
        ),
        wholesale_min_quantity: Number(
          moduleSettings.wholesale_min_quantity || 1,
        ),
      });
      setSettingsModal(false);
      toast.success(t("admin.settingsSaved"));
    } catch {
      toast.error(t("admin.failedSaveSettings"));
    }
  };

  const applyDefaultPricing = async () => {
    try {
      await bootstrapProducts.mutateAsync();
      toast.success(t("admin.wholesaleCatalogInitialized"));
    } catch {
      toast.error(t("admin.failedInitializeWholesaleCatalog"));
    }
  };

  const syncCurrentProducts = async () => {
    try {
      await syncProducts.mutateAsync(
        wholesaleProducts.map((p) => ({
          product_id: p.product_id,
          wholesalePrice: p.wholesalePrice,
          minQty: p.minQty,
          status: p.status,
        })),
      );
      toast.success(t("admin.wholesaleProductsSynced"));
    } catch {
      toast.error(t("admin.failedSyncWholesaleProducts"));
    }
  };

  const revenue = useMemo(
    () => wholesalers.reduce((a, b) => a + Number(b.total_spent || 0), 0),
    [wholesalers],
  );

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-text">
            {t("admin.wholesale")}
          </h1>
          <p className="text-sm text-text-secondary">
            {t("admin.manageWholesaleCustomersProducts")}
          </p>
        </div>
        {canManage && (
          <Button
            variant="outline"
            icon={Settings}
            onClick={() => setSettingsModal(true)}
            loading={isLoading}
          >
            {t("dashboard.settings")}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          {
            label: t("admin.wholesaleCustomers"),
            value: customerMeta.total || wholesalers.length,
            icon: Users,
            color: "text-primary",
          },
          {
            label: t("admin.wholesaleProducts"),
            value: wholesaleProducts.length,
            icon: Package,
            color: "text-accent",
          },
          {
            label: t("admin.wholesaleRevenue"),
            value: formatCurrency(revenue),
            icon: DollarSign,
            color: "text-success",
          },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-white p-4 rounded-xl border border-border/50 flex items-center gap-3"
          >
            <s.icon className={`h-8 w-8 ${s.color}`} />
            <div>
              <p className="text-xl font-bold text-text">{s.value}</p>
              <p className="text-xs text-text-secondary">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-2 border-b border-border/50">
        {[
          { id: "customers", label: t("admin.wholesaleCustomers") },
          { id: "products", label: t("admin.wholesaleProducts") },
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

      {activeTab === "customers" && (
        <div className="bg-white rounded-xl border border-border/50 overflow-hidden">
          <div className="p-4 border-b border-border/50">
            <Input
              value={customerSearch}
              onChange={(event) => setCustomerSearch(event.target.value)}
              placeholder={t("common.search")}
            />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-border/50">
                  <th className="text-left text-xs font-medium text-text-secondary px-4 py-3">
                    {t("admin.company")}
                  </th>
                  <th className="text-left text-xs font-medium text-text-secondary px-4 py-3">
                    {t("admin.contact")}
                  </th>
                  <th className="text-left text-xs font-medium text-text-secondary px-4 py-3">
                    {t("admin.orders")}
                  </th>
                  <th className="text-left text-xs font-medium text-text-secondary px-4 py-3">
                    {t("admin.totalSpent")}
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
                {wholesalers.length === 0 && (
                  <tr>
                    <td
                      colSpan="6"
                      className="text-center py-12 text-sm text-text-secondary"
                    >
                      {t("admin.noWholesaleCustomersConfigured")}
                    </td>
                  </tr>
                )}
                {wholesalers.map((w) => (
                  <tr key={w.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-text">
                          {w.company}
                        </p>
                        <p className="text-xs text-text-secondary">{w.email}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-text">{w.contact}</td>
                    <td className="px-4 py-3 text-sm text-text-secondary">
                      {w.orders}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-text">
                      {formatCurrency(w.total_spent || 0)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={statusColors[w.status] || "info"}
                        size="sm"
                        className="capitalize"
                      >
                        {w.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button
                          className="p-2 sm:p-1.5 hover:bg-gray-100 rounded touch-manipulation"
                          onClick={() => setViewCustomer(w)}
                          aria-label="View"
                        >
                          <Eye className="h-4 w-4 text-text-secondary" />
                        </button>
                        {canManage && (
                          <>
                            <button
                              className="p-2 sm:p-1.5 hover:bg-gray-100 rounded touch-manipulation"
                              onClick={() => updateStatus(w.id, "approved")}
                              aria-label="Approve"
                            >
                              <CheckCircle className="h-4 w-4 text-success" />
                            </button>
                            <button
                              className="p-2 sm:p-1.5 hover:bg-gray-100 rounded touch-manipulation"
                              onClick={() => updateStatus(w.id, "rejected")}
                              aria-label="Reject"
                            >
                              <XCircle className="h-4 w-4 text-danger" />
                            </button>
                          </>
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
                currentPage={customerMeta.current_page || 1}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </div>
      )}

      {activeTab === "products" && (
        <div className="space-y-3">
          <div className="flex justify-end gap-2">
            {canManage && (
              <>
                <Button
                  variant="outline"
                  icon={RefreshCw}
                  onClick={applyDefaultPricing}
                  loading={bootstrapProducts.isPending}
                >
                  {t("admin.bootstrapFromCatalog")}
                </Button>
                <Button
                  onClick={syncCurrentProducts}
                  loading={syncProducts.isPending}
                >
                  {t("admin.syncProducts")}
                </Button>
              </>
            )}
          </div>
          <div className="bg-white rounded-xl border border-border/50 overflow-hidden">
            <div className="p-4 border-b border-border/50">
              <Input
                value={productSearch}
                onChange={(event) => setProductSearch(event.target.value)}
                placeholder={t("common.search")}
              />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-border/50">
                    <th className="text-left text-xs font-medium text-text-secondary px-4 py-3">
                      {t("admin.product")}
                    </th>
                    <th className="text-left text-xs font-medium text-text-secondary px-4 py-3">
                      {t("admin.merchants")}
                    </th>
                    <th className="text-left text-xs font-medium text-text-secondary px-4 py-3">
                      {t("admin.retailPrice")}
                    </th>
                    <th className="text-left text-xs font-medium text-text-secondary px-4 py-3">
                      {t("admin.wholesalePrice")}
                    </th>
                    <th className="text-left text-xs font-medium text-text-secondary px-4 py-3">
                      Min {t("common.qty")}
                    </th>
                    <th className="text-left text-xs font-medium text-text-secondary px-4 py-3">
                      {t("common.status")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {paginatedWholesaleProducts.length === 0 && (
                    <tr>
                      <td
                        colSpan="6"
                        className="text-center py-12 text-sm text-text-secondary"
                      >
                        {t("admin.noWholesaleProductsConfigured")}
                      </td>
                    </tr>
                  )}
                  {paginatedWholesaleProducts.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-sm font-medium text-text">
                            {p.name}
                          </p>
                          <p className="text-xs text-text-secondary">{p.sku}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-text-secondary">
                        {p.merchant}
                      </td>
                      <td className="px-4 py-3 text-sm text-text-secondary line-through">
                        {formatCurrency(p.retailPrice || 0)}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-success">
                        {formatCurrency(p.wholesalePrice || 0)}
                      </td>
                      <td className="px-4 py-3 text-sm text-text-secondary">
                        {t("admin.minQtyUnits", { count: p.minQty })}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={
                            p.status === "active" ? "success" : "warning"
                          }
                          size="sm"
                        >
                          {p.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {wholesaleProductTotalPages > 1 && (
              <div className="p-4 border-t border-border/50">
                <Pagination
                  currentPage={productPage}
                  totalPages={wholesaleProductTotalPages}
                  onPageChange={setProductPage}
                />
              </div>
            )}
          </div>
        </div>
      )}

      <Modal
        isOpen={settingsModal}
        onClose={() => setSettingsModal(false)}
        title={t("admin.wholesaleSettings")}
      >
        <div className="space-y-4">
          <Input
            label={t("admin.minOrderAmount")}
            type="number"
            value={moduleSettings.wholesale_min_order_amount}
            onChange={(e) =>
              setModuleSettings((p) => ({
                ...p,
                wholesale_min_order_amount: e.target.value,
              }))
            }
          />
          <Input
            label={t("admin.defaultDiscount")}
            type="number"
            value={moduleSettings.wholesale_default_discount}
            onChange={(e) =>
              setModuleSettings((p) => ({
                ...p,
                wholesale_default_discount: e.target.value,
              }))
            }
          />
          <Input
            label={t("admin.minQuantityPerProduct")}
            type="number"
            value={moduleSettings.wholesale_min_quantity}
            onChange={(e) =>
              setModuleSettings((p) => ({
                ...p,
                wholesale_min_quantity: e.target.value,
              }))
            }
          />

          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <span className="text-sm">{t("admin.enableWholesaleModule")}</span>
            <button
              className={`w-11 h-6 rounded-full relative transition ${moduleSettings.wholesale_enabled ? "bg-primary" : "bg-gray-300"}`}
              onClick={() =>
                setModuleSettings((p) => ({
                  ...p,
                  wholesale_enabled: !p.wholesale_enabled,
                }))
              }
            >
              <span
                className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition ${moduleSettings.wholesale_enabled ? "right-0.5" : "left-0.5"}`}
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
                onClick={saveSettings}
                loading={updateSettings.isPending}
              >
                {t("common.save")}
              </Button>
            )}
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={!!viewCustomer}
        onClose={() => setViewCustomer(null)}
        title={viewCustomer?.company || t("admin.wholesaleCustomer")}
      >
        {viewCustomer && (
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-text-secondary">
                {t("admin.company")}
              </p>
              <p className="text-sm font-medium text-text">
                {viewCustomer.company || "—"}
              </p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-text-secondary">
                {t("admin.contact")}
              </p>
              <p className="text-sm font-medium text-text">
                {viewCustomer.contact || "—"}
              </p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-text-secondary">{t("admin.email")}</p>
              <p className="text-sm font-medium text-text">
                {viewCustomer.email || "—"}
              </p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-text-secondary">{t("admin.orders")}</p>
              <p className="text-sm font-medium text-text">
                {viewCustomer.orders || 0}
              </p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-text-secondary">
                {t("admin.totalSpent")}
              </p>
              <p className="text-sm font-medium text-text">
                {formatCurrency(viewCustomer.total_spent || 0)}
              </p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-text-secondary">Status</p>
              <p className="text-sm font-medium text-text capitalize">
                {viewCustomer.status || "pending"}
              </p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
