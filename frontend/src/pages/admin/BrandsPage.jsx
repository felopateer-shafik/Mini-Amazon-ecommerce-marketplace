import { useMemo, useRef, useState } from "react";
import { Plus, Edit2, Trash2, Search, Globe, Upload, X } from "lucide-react";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Pagination from "@/components/ui/Pagination";
import toast from "react-hot-toast";
import { useTranslation } from "@/hooks/useTranslation";
import {
  useAdminBrands,
  useAdminBrandRequests,
  useAdminApproveBrandRequest,
  useAdminRejectBrandRequest,
  useAdminCreateBrand,
  useAdminUpdateBrand,
  useAdminDeleteBrand,
} from "@/hooks/useApi";
import { usePermission } from "@/hooks/usePermission";

const EMPTY_FORM = {
  name: "",
  slug: "",
  website: "",
  logo: "",
  status: "active",
};

export default function BrandsPage() {
  const { t } = useTranslation();
  const { hasPerm } = usePermission();
  const canCreate = hasPerm("create-brands");
  const canEdit = hasPerm("edit-brands");
  const canDelete = hasPerm("delete-brands");
  const canApprove = hasPerm("approve-brands");
  const [search, setSearch] = useState("");
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const fileInputRef = useRef(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editBrand, setEditBrand] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const perPage = 12;

  const brandsQuery = useAdminBrands({
    search,
    page: currentPage,
    per_page: perPage,
  });
  const brandRequestsQuery = useAdminBrandRequests({
    status: "pending",
    per_page: 10,
  });
  const createBrand = useAdminCreateBrand();
  const updateBrand = useAdminUpdateBrand();
  const deleteBrandMutation = useAdminDeleteBrand();
  const approveBrandRequestMutation = useAdminApproveBrandRequest();
  const rejectBrandRequestMutation = useAdminRejectBrandRequest();

  const brands = brandsQuery.data?.data ?? [];
  const meta = brandsQuery.data?.meta ?? {
    current_page: 1,
    last_page: 1,
    total: 0,
  };
  const totalPages = meta.last_page || 1;

  const paginated = useMemo(() => brands, [brands]);
  const pendingBrandRequests = useMemo(() => {
    const payload =
      brandRequestsQuery.data?.data ?? brandRequestsQuery.data ?? [];
    return Array.isArray(payload) ? payload : [];
  }, [brandRequestsQuery.data]);
  const statusLabel = {
    active: t("admin.statusActive"),
    inactive: t("admin.statusInactive"),
    pending: t("admin.statusPending"),
  };

  const openCreate = () => {
    setEditBrand(null);
    setForm(EMPTY_FORM);
    setLogoFile(null);
    setLogoPreview(null);
    setModalOpen(true);
  };

  const openEdit = (brand) => {
    setEditBrand(brand);
    setForm({
      name: brand.name ?? "",
      slug: brand.slug ?? "",
      website: brand.website ?? "",
      logo: brand.logo ?? "",
      status: brand.status ?? "active",
    });
    setLogoFile(null);
    setLogoPreview(brand.logo || null);
    setModalOpen(true);
  };

  const handleLogoFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error(t("admin.logoMustBeImage") || "Please select an image file");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error(t("admin.logoTooLarge") || "Image must be under 2MB");
      return;
    }
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const removeLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
    setForm((p) => ({ ...p, logo: "" }));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const saveBrand = async () => {
    if (!form.name.trim()) {
      toast.error(t("admin.brandNameRequired"));
      return;
    }

    const isValidUrl = (value) => {
      if (!value) return true;
      try {
        const parsed = new URL(value);
        return ["http:", "https:"].includes(parsed.protocol);
      } catch {
        return false;
      }
    };

    if (!isValidUrl(form.website.trim())) {
      toast.error(t("admin.websiteUrlInvalid"));
      return;
    }

    const fd = new FormData();
    fd.append("name", form.name.trim());
    if (form.slug.trim()) fd.append("slug", form.slug.trim());
    if (form.website.trim()) fd.append("website", form.website.trim());
    fd.append("status", form.status);

    if (logoFile) {
      fd.append("logo", logoFile);
    } else if (editBrand && !logoPreview && editBrand.logo) {
      fd.append("remove_logo", "1");
    }

    try {
      if (editBrand) {
        await updateBrand.mutateAsync({ id: editBrand.id, data: fd });
      } else {
        await createBrand.mutateAsync(fd);
      }
      setModalOpen(false);
      setLogoFile(null);
      setLogoPreview(null);
      toast.success(t("admin.brandSaved"));
    } catch {
      toast.error(t("admin.failedSaveBrand"));
    }
  };

  const deleteBrand = async (id) => {
    if (!window.confirm(t("admin.confirmDeleteBrand"))) return;
    try {
      await deleteBrandMutation.mutateAsync(id);
      toast.success(t("admin.brandDeleted"));
    } catch {
      toast.error(t("admin.failedDeleteBrand"));
    }
  };

  const handleApproveBrandRequest = async (requestItem) => {
    const adminReply =
      window.prompt(t("admin.optionalReplyToMerchant"), "") ?? "";
    try {
      await approveBrandRequestMutation.mutateAsync({
        id: requestItem.id,
        data: { admin_reply: adminReply.trim() || undefined },
      });
      toast.success(t("admin.brandRequestApproved"));
    } catch (err) {
      toast.error(
        err?.response?.data?.message || t("admin.failedApproveRequest"),
      );
    }
  };

  const handleRejectBrandRequest = async (requestItem) => {
    const adminReply =
      window.prompt(t("admin.rejectionReasonForMerchant"), "") ?? "";
    if (!adminReply.trim()) {
      toast.error(t("admin.pleaseProvideRejectionReason"));
      return;
    }

    try {
      await rejectBrandRequestMutation.mutateAsync({
        id: requestItem.id,
        data: { admin_reply: adminReply.trim() },
      });
      toast.success(t("admin.brandRequestRejected"));
    } catch (err) {
      toast.error(
        err?.response?.data?.message || t("admin.failedRejectRequest"),
      );
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-text">
            {t("admin.manageBrands")}
          </h1>
          <p className="text-sm text-text-secondary">
            {t("admin.brandsCount", { count: meta.total ?? 0 })}
          </p>
        </div>
        {canCreate && (
          <Button
            icon={Plus}
            onClick={openCreate}
            loading={brandsQuery.isLoading}
          >
            {t("admin.addBrand")}
          </Button>
        )}
      </div>

      <div className="bg-white p-4 rounded-xl border border-border/50">
        <div className="mb-4 pb-4 border-b border-border/50">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-text">
              {t("admin.pendingBrandRequests")} ({pendingBrandRequests.length})
            </h2>
          </div>

          {brandRequestsQuery.isLoading ? (
            <div className="flex items-center text-sm text-text-secondary">
              <Search className="h-4 w-4 mr-2" />
              {t("admin.loadingRequests")}
            </div>
          ) : pendingBrandRequests.length === 0 ? (
            <p className="text-sm text-text-secondary">
              {t("admin.noPendingBrandRequests")}
            </p>
          ) : (
            <div className="space-y-2">
              {pendingBrandRequests.map((requestItem) => (
                <div
                  key={requestItem.id}
                  className="flex items-center justify-between rounded-lg border border-border/50 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-text truncate">
                      {requestItem.name}
                    </p>
                    <p className="text-xs text-text-secondary truncate">
                      {requestItem.vendor?.store_name ||
                        requestItem.vendor?.business_name ||
                        "Merchant"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {canApprove && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRejectBrandRequest(requestItem)}
                        loading={rejectBrandRequestMutation.isPending}
                      >
                        Reject
                      </Button>
                    )}
                    {canApprove && (
                      <Button
                        size="sm"
                        onClick={() => handleApproveBrandRequest(requestItem)}
                        loading={approveBrandRequestMutation.isPending}
                      >
                        Approve
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="relative">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            placeholder={t("admin.searchBrands")}
            className="w-full ps-9 pe-4 py-2.5 border border-border rounded-lg text-sm focus:ring-1 focus:ring-primary outline-none"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {paginated.length === 0 && (
          <div className="col-span-full text-center py-16">
            <p className="text-lg font-medium text-text-secondary mb-1">
              {t("admin.noBrandsYet")}
            </p>
            <p className="text-sm text-text-secondary">
              {t("admin.addFirstBrand")}
            </p>
          </div>
        )}

        {paginated.map((brand) => {
          return (
            <div
              key={brand.id}
              className="bg-white rounded-xl border border-border/50 p-4 hover:shadow-md transition group"
            >
              <div className="flex items-center gap-3 mb-3 flex-wrap justify-center text-center">
                {brand.logo ? (
                  <img
                    src={brand.logo}
                    alt=""
                    loading="lazy"
                    className="w-10 h-10 rounded-lg object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-gray-100" />
                )}
                <div className="flex-1 min-w-0 width-5rem">
                  <p className="text-sm font-semibold text-text truncate">
                    {brand.name}
                  </p>
                  <p className="text-xs text-text-secondary">
                    {t("admin.productsCount", {
                      count: brand.products_count ?? 0,
                    })}
                  </p>
                </div>
                <Badge
                  variant={brand.status === "active" ? "success" : "warning"}
                  size="sm"
                >
                  {statusLabel[brand.status] || brand.status}
                </Badge>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-border/50">
                <a
                  href={brand.website || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-accent hover:underline flex items-center gap-1"
                >
                  <Globe className="h-3 w-3" />
                  {t("admin.website")}
                </a>
                <div className="flex items-center gap-2">
                  {brand.empty_products_alert && (
                    <span className="text-[10px] font-semibold text-danger bg-danger/10 px-2 py-0.5 rounded-full">
                      0 products
                    </span>
                  )}
                  <div className="flex gap-1">
                    {canEdit && (
                      <button
                        className="p-1 hover:bg-gray-100 rounded"
                        onClick={() => openEdit(brand)}
                        aria-label={t("common.edit")}
                      >
                        <Edit2 className="h-3.5 w-3.5 text-text-secondary" />
                      </button>
                    )}
                    {canDelete && (
                      <button
                        className="p-1 hover:bg-gray-100 rounded"
                        onClick={() => deleteBrand(brand.id)}
                        aria-label={t("common.delete")}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-text-secondary hover:text-danger" />
                      </button>
                    )}
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
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editBrand ? t("admin.editBrand") : t("admin.addBrand")}
      >
        <div className="space-y-4">
          <Input
            label={t("admin.brandName")}
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
          />
          <Input
            label={t("admin.slug")}
            value={form.slug}
            onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value }))}
          />
          <Input
            label={t("admin.website")}
            value={form.website}
            onChange={(e) =>
              setForm((p) => ({ ...p, website: e.target.value }))
            }
          />

          <div>
            <label className="block text-sm font-medium text-text mb-1.5">
              {t("admin.brandLogo") || "Brand Logo"}
            </label>
            {logoPreview ? (
              <div className="flex items-center gap-3 mb-2">
                <img
                  src={logoPreview}
                  alt="Logo preview"
                  className="w-16 h-16 rounded-lg object-cover border border-border"
                />
                <button
                  type="button"
                  onClick={removeLogo}
                  className="p-2 sm:p-1.5 hover:bg-gray-100 rounded text-text-secondary hover:text-danger touch-manipulation"
                  aria-label="Remove logo"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : null}
            <label className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary hover:bg-primary/5 transition">
              <Upload className="h-4 w-4 text-text-secondary" />
              <span className="text-sm text-text-secondary">
                {logoPreview
                  ? t("admin.changeLogo") || "Change logo"
                  : t("admin.uploadLogo") || "Upload logo"}
              </span>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleLogoFileChange}
              />
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-text mb-1.5">
              {t("common.status")}
            </label>
            <select
              value={form.status}
              onChange={(e) =>
                setForm((p) => ({ ...p, status: e.target.value }))
              }
              className="w-full border border-border rounded-lg px-3 py-2.5 text-sm"
            >
              <option value="active">{t("admin.statusActive")}</option>
              <option value="inactive">{t("admin.statusInactive")}</option>
              <option value="pending">{t("admin.statusPending")}</option>
            </select>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              fullWidth
              onClick={() => setModalOpen(false)}
            >
              {t("common.cancel")}
            </Button>
            <Button
              fullWidth
              onClick={saveBrand}
              loading={createBrand.isPending || updateBrand.isPending}
            >
              {t("common.save")}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
