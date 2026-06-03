import { useState, useMemo } from "react";
import {
  Plus,
  Edit2,
  Trash2,
  ChevronRight,
  ChevronDown,
  FolderOpen,
  Loader2,
  Search,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import toast from "react-hot-toast";
import { useTranslation } from "@/hooks/useTranslation";
import { useAuthStore } from "@/store/authStore";
import {
  useAdminCategories,
  useAdminCategoryRequests,
  useAdminApproveCategoryRequest,
  useAdminRejectCategoryRequest,
  useAdminCreateCategory,
  useAdminUpdateCategory,
  useAdminDeleteCategory,
} from "@/hooks/useApi";

/**
 * Build a nested tree from a flat list of categories using parent_id.
 */
function buildTree(flatCategories) {
  if (!Array.isArray(flatCategories)) return [];
  const map = {};
  const roots = [];
  for (const cat of flatCategories) {
    map[cat.id] = { ...cat, children: [] };
  }
  for (const cat of flatCategories) {
    if (cat.parent_id && map[cat.parent_id]) {
      map[cat.parent_id].children.push(map[cat.id]);
    } else {
      roots.push(map[cat.id]);
    }
  }
  return roots;
}

function extractCategoriesArray(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.data)) return payload.data.data;
  return [];
}

/**
 * Flatten a tree back into a list with depth info (for the parent dropdown).
 */
function flattenTree(nodes, depth = 0) {
  const result = [];
  for (const node of nodes) {
    result.push({ ...node, _depth: depth });
    if (node.children?.length) {
      result.push(...flattenTree(node.children, depth + 1));
    }
  }
  return result;
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function CategoryTree({
  categories,
  depth = 0,
  onEdit,
  onDelete,
  canEdit,
  canDelete,
}) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState({});

  return (
    <div>
      {categories.map((cat) => (
        <div key={cat.id}>
          <div
            className={`flex items-center gap-1 py-2.5 px-3 hover:bg-gray-50 rounded-lg transition group`}
            style={{ paddingLeft: `${depth * 24 + 12}px` }}
          >
            {cat.children?.length > 0 ? (
              <button
                onClick={() =>
                  setExpanded((p) => ({ ...p, [cat.id]: !p[cat.id] }))
                }
                className="p-0.5"
              >
                {expanded[cat.id] ? (
                  <ChevronDown className="h-4 w-4 text-text-secondary" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-text-secondary" />
                )}
              </button>
            ) : (
              <span className="w-5" />
            )}
            {cat.image ? (
              <img
                src={cat.image}
                alt=""
                loading="lazy"
                className="h-6 w-6 rounded object-cover"
              />
            ) : (
              <FolderOpen className="h-4 w-4 text-text-secondary" />
            )}
            <span className="text-sm font-medium text-text flex-1 width-5rem">
              {cat.name}
            </span>
            {!cat.is_active && (
              <span className="text-xs text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
                {t("admin.statusInactive")}
              </span>
            )}
            <span className="text-xs text-text-secondary bg-gray-100 px-2 py-0.5 rounded-full text-center width-5rem">
              {t("admin.totalProductsCount", {
                count: cat.products_count ?? 0,
              })}
            </span>
            {cat.empty_products_alert && (
              <span className="text-xs text-danger bg-danger/10 px-2 py-0.5 rounded-full">
                0 products
              </span>
            )}
            <div className="flex items-center gap-1 width-max-content">
              {canEdit && (
                <button
                  className="p-1 hover:bg-gray-200 rounded"
                  onClick={() => onEdit(cat)}
                  aria-label={t("common.edit")}
                >
                  <Edit2 className="h-3.5 w-3.5 text-text-secondary" />
                </button>
              )}
              {canDelete && (
                <button
                  className="p-1 hover:bg-gray-200 rounded"
                  onClick={() => onDelete(cat)}
                  aria-label={t("common.delete")}
                >
                  <Trash2 className="h-3.5 w-3.5 text-text-secondary hover:text-danger" />
                </button>
              )}
            </div>
          </div>
          {expanded[cat.id] && cat.children?.length > 0 && (
            <CategoryTree
              categories={cat.children}
              depth={depth + 1}
              onEdit={onEdit}
              onDelete={onDelete}
              canEdit={canEdit}
              canDelete={canDelete}
            />
          )}
        </div>
      ))}
    </div>
  );
}

export default function CategoriesPage() {
  const { t } = useTranslation();
  const { user } = useAuthStore();

  const isSystemAdmin = user?.is_system_admin === true;
  const userPerms = new Set(
    Array.isArray(user?.permissions)
      ? user.permissions.map((p) => String(p).toLowerCase())
      : [],
  );
  const canEdit =
    isSystemAdmin ||
    userPerms.has("manage-system") ||
    userPerms.has("edit-categories");
  const canDelete =
    isSystemAdmin ||
    userPerms.has("manage-system") ||
    userPerms.has("delete-categories") ||
    userPerms.has("edit-categories");

  // Local search / filter state
  const [search, setSearch] = useState("");

  // API hooks
  const { data: categoriesData, isLoading } = useAdminCategories({ search });
  const { data: categoryRequestsData, isLoading: isLoadingCategoryRequests } =
    useAdminCategoryRequests({ status: "pending", per_page: 10 });
  const createCategory = useAdminCreateCategory();
  const updateCategory = useAdminUpdateCategory();
  const deleteCategory = useAdminDeleteCategory();
  const approveCategoryRequestMutation = useAdminApproveCategoryRequest();
  const rejectCategoryRequestMutation = useAdminRejectCategoryRequest();

  const flatCategories = useMemo(
    () => extractCategoriesArray(categoriesData),
    [categoriesData],
  );
  const pendingCategoryRequests = useMemo(() => {
    const payload = categoryRequestsData?.data ?? categoryRequestsData ?? [];
    return Array.isArray(payload) ? payload : [];
  }, [categoryRequestsData]);
  const categoryTree = useMemo(
    () => buildTree(flatCategories),
    [flatCategories],
  );
  const flatForDropdown = useMemo(
    () => flattenTree(categoryTree),
    [categoryTree],
  );

  // Modal state
  const [addModal, setAddModal] = useState(false);
  const [editModal, setEditModal] = useState(null);
  const [deleteModal, setDeleteModal] = useState(null);

  // Add form state
  const [addForm, setAddForm] = useState({
    name: "",
    slug: "",
    image: "",
    parent_id: "",
    is_active: true,
  });
  // Edit form state
  const [editForm, setEditForm] = useState({
    name: "",
    slug: "",
    image: "",
    parent_id: "",
    is_active: true,
  });

  const openAddModal = () => {
    setAddForm({
      name: "",
      slug: "",
      image: "",
      parent_id: "",
      is_active: true,
    });
    setAddModal(true);
  };

  const openEditModal = (cat) => {
    setEditForm({
      name: cat.name,
      slug: cat.slug,
      image: cat.image ?? "",
      parent_id: cat.parent_id ?? "",
      is_active: cat.is_active ?? true,
    });
    setEditModal(cat);
  };

  const isDuplicateCategoryName = (name, excludeId = null) => {
    const normalized = (name || "").trim().toLowerCase();
    if (!normalized) return false;
    return flatCategories.some(
      (category) =>
        category.id !== excludeId &&
        (category.name || "").trim().toLowerCase() === normalized,
    );
  };

  const handleCreate = async () => {
    const trimmedName = addForm.name.trim();
    if (!trimmedName) return;
    if (isDuplicateCategoryName(trimmedName)) {
      toast.error(t("admin.categoryNameMustBeUnique"));
      return;
    }

    try {
      await createCategory.mutateAsync({
        name: trimmedName,
        slug: addForm.slug || undefined,
        image: addForm.image || undefined,
        parent_id: addForm.parent_id || null,
        is_active: addForm.is_active,
      });
      setAddModal(false);
      toast.success(t("admin.categorySaved"));
    } catch (err) {
      toast.error(
        err?.response?.data?.message || t("admin.failedCreateCategory"),
      );
    }
  };

  const handleImagePick = async (event, target) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error(t("admin.mediaInvalidFileType"));
      return;
    }

    try {
      const dataUrl = await fileToDataUrl(file);
      if (target === "add") {
        setAddForm((f) => ({ ...f, image: dataUrl }));
      } else {
        setEditForm((f) => ({ ...f, image: dataUrl }));
      }
    } catch {
      toast.error(t("admin.failedUploadImage"));
    }
  };

  const handleUpdate = async () => {
    if (!editModal) return;
    const trimmedName = editForm.name.trim();
    if (!trimmedName) return;
    if (isDuplicateCategoryName(trimmedName, editModal.id)) {
      toast.error(t("admin.categoryNameMustBeUnique"));
      return;
    }

    try {
      await updateCategory.mutateAsync({
        id: editModal.id,
        data: {
          name: trimmedName,
          slug: editForm.slug || undefined,
          image: editForm.image || undefined,
          parent_id: editForm.parent_id || null,
          is_active: editForm.is_active,
        },
      });
      setEditModal(null);
      toast.success(t("admin.categoryUpdated"));
    } catch (err) {
      toast.error(
        err?.response?.data?.message || t("admin.failedUpdateCategory"),
      );
    }
  };

  const handleDelete = async () => {
    if (!deleteModal) return;
    try {
      await deleteCategory.mutateAsync({
        id: deleteModal.id,
        options: { force: 1 },
      });
      setDeleteModal(null);
      toast.success(t("admin.categoryDeleted"));
    } catch (err) {
      toast.error(
        err?.response?.data?.message || t("admin.failedDeleteCategory"),
      );
    }
  };

  const handleApproveCategoryRequest = async (requestItem) => {
    const adminReply =
      window.prompt(t("admin.optionalReplyToMerchant"), "") ?? "";
    try {
      await approveCategoryRequestMutation.mutateAsync({
        id: requestItem.id,
        data: { admin_reply: adminReply.trim() || undefined },
      });
      toast.success(t("admin.categoryRequestApproved"));
    } catch (err) {
      toast.error(
        err?.response?.data?.message || t("admin.failedApproveRequest"),
      );
    }
  };

  const handleRejectCategoryRequest = async (requestItem) => {
    const adminReply =
      window.prompt(t("admin.rejectionReasonForMerchant"), "") ?? "";
    if (!adminReply.trim()) {
      toast.error(t("admin.pleaseProvideRejectionReason"));
      return;
    }

    try {
      await rejectCategoryRequestMutation.mutateAsync({
        id: requestItem.id,
        data: { admin_reply: adminReply.trim() },
      });
      toast.success(t("admin.categoryRequestRejected"));
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
            {t("admin.manageCategories")}
          </h1>
          <p className="text-sm text-text-secondary">
            {t("admin.manageProductCategories")}
          </p>
        </div>
        {canEdit && (
          <Button icon={Plus} onClick={openAddModal}>
            {t("admin.addCategory")}
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
        <input
          type="text"
          placeholder={t("admin.searchCategories")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full ps-9 pe-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      <div className="bg-white rounded-xl border border-border/50 p-4">
        <div className="mb-4 pb-4 border-b border-border/50">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-text">
              {t("admin.pendingCategoryRequests")} (
              {pendingCategoryRequests.length})
            </h2>
          </div>

          {isLoadingCategoryRequests ? (
            <div className="flex items-center text-sm text-text-secondary">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              {t("admin.loadingRequests")}
            </div>
          ) : pendingCategoryRequests.length === 0 ? (
            <p className="text-sm text-text-secondary">
              {t("admin.noPendingCategoryRequests")}
            </p>
          ) : (
            <div className="space-y-2">
              {pendingCategoryRequests.map((requestItem) => (
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
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRejectCategoryRequest(requestItem)}
                      loading={rejectCategoryRequestMutation.isPending}
                    >
                      Reject
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleApproveCategoryRequest(requestItem)}
                      loading={approveCategoryRequestMutation.isPending}
                    >
                      Approve
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="ml-2 text-sm text-text-secondary">
              {t("admin.loadingCategories")}
            </span>
          </div>
        ) : categoryTree.length === 0 ? (
          <div className="text-center py-12 text-sm text-text-secondary">
            {t("admin.noCategoriesFound")}
          </div>
        ) : (
          <CategoryTree
            categories={categoryTree}
            onEdit={openEditModal}
            onDelete={setDeleteModal}
            canEdit={canEdit}
            canDelete={canDelete}
          />
        )}
      </div>

      {/* Add Modal */}
      <Modal
        isOpen={addModal}
        onClose={() => setAddModal(false)}
        title={t("admin.addCategory")}
      >
        <div className="space-y-4">
          <Input
            label={t("admin.categoryName")}
            placeholder={t("admin.enterCategoryName")}
            value={addForm.name}
            onChange={(e) =>
              setAddForm((f) => ({ ...f, name: e.target.value }))
            }
          />
          <Input
            label={t("admin.slug")}
            placeholder={t("admin.categorySlugPlaceholder")}
            value={addForm.slug}
            onChange={(e) =>
              setAddForm((f) => ({ ...f, slug: e.target.value }))
            }
          />
          <div>
            <label className="block text-sm font-medium text-text mb-1">
              {t("admin.image")}
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleImagePick(e, "add")}
              className="w-full border border-border rounded-lg px-3 py-2.5 text-sm"
            />
            {addForm.image ? (
              <img
                src={addForm.image}
                alt=""
                className="mt-2 h-20 w-20 rounded object-cover border border-border/60"
              />
            ) : null}
          </div>
          <div>
            <label className="block text-sm font-medium text-text mb-1">
              {t("admin.parentCategory")}
            </label>
            <select
              className="w-full border border-border rounded-lg px-3 py-2.5 text-sm"
              value={addForm.parent_id}
              onChange={(e) =>
                setAddForm((f) => ({ ...f, parent_id: e.target.value }))
              }
            >
              <option value="">{t("admin.noParentCategory")}</option>
              {flatForDropdown.map((c) => (
                <option key={c.id} value={c.id}>
                  {"—".repeat(c._depth)} {c.name}
                </option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={addForm.is_active}
              onChange={(e) =>
                setAddForm((f) => ({ ...f, is_active: e.target.checked }))
              }
            />
            {t("admin.statusActive")}
          </label>
          <div className="flex gap-3">
            <Button
              variant="outline"
              fullWidth
              onClick={() => setAddModal(false)}
            >
              {t("common.cancel")}
            </Button>
            <Button
              fullWidth
              onClick={handleCreate}
              disabled={createCategory.isPending || !addForm.name}
            >
              {createCategory.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mx-auto" />
              ) : (
                t("common.add")
              )}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={!!editModal}
        onClose={() => setEditModal(null)}
        title={t("common.edit")}
      >
        {editModal && (
          <div className="space-y-4">
            <Input
              label={t("admin.categoryName")}
              value={editForm.name}
              onChange={(e) =>
                setEditForm((f) => ({ ...f, name: e.target.value }))
              }
            />
            <Input
              label={t("admin.slug")}
              value={editForm.slug}
              onChange={(e) =>
                setEditForm((f) => ({ ...f, slug: e.target.value }))
              }
            />
            <div>
              <label className="block text-sm font-medium text-text mb-1">
                {t("admin.image")}
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleImagePick(e, "edit")}
                className="w-full border border-border rounded-lg px-3 py-2.5 text-sm"
              />
              {editForm.image ? (
                <img
                  src={editForm.image}
                  alt=""
                  className="mt-2 h-20 w-20 rounded object-cover border border-border/60"
                />
              ) : null}
            </div>
            <div>
              <label className="block text-sm font-medium text-text mb-1">
                {t("admin.parentCategory")}
              </label>
              <select
                className="w-full border border-border rounded-lg px-3 py-2.5 text-sm"
                value={editForm.parent_id}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, parent_id: e.target.value }))
                }
              >
                <option value="">{t("admin.noParentCategory")}</option>
                {flatForDropdown
                  .filter((c) => c.id !== editModal.id)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {"—".repeat(c._depth)} {c.name}
                    </option>
                  ))}
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={editForm.is_active}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, is_active: e.target.checked }))
                }
              />
              {t("admin.statusActive")}
            </label>
            <div className="flex gap-3">
              <Button
                variant="outline"
                fullWidth
                onClick={() => setEditModal(null)}
              >
                {t("common.cancel")}
              </Button>
              <Button
                fullWidth
                onClick={handleUpdate}
                disabled={updateCategory.isPending || !editForm.name}
              >
                {updateCategory.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                ) : (
                  t("common.save")
                )}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Modal */}
      <Modal
        isOpen={!!deleteModal}
        onClose={() => setDeleteModal(null)}
        title={t("common.delete")}
        size="sm"
      >
        <p className="text-sm text-text-secondary mb-4">
          {t("admin.deleteCategoryPrompt", { name: deleteModal?.name || "" })}{" "}
          {deleteModal?.children?.length > 0 &&
            t("admin.deleteSubcategoriesWarning")}
          <br />
          {t("admin.deleteCategoryReassignWarning")}
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
            fullWidth
            className="!bg-danger"
            onClick={handleDelete}
            disabled={deleteCategory.isPending}
          >
            {deleteCategory.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mx-auto" />
            ) : (
              t("common.delete")
            )}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
