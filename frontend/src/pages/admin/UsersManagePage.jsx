import { useEffect, useState, useRef } from "react";
import {
  Search,
  Edit2,
  Trash2,
  UserPlus,
  Download,
  Ban,
  CheckCircle,
  Loader2,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Toggle from "@/components/ui/Toggle";
import Pagination from "@/components/ui/Pagination";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import { formatDate } from "@/lib/utils";
import toast from "react-hot-toast";
import { useTranslation } from "@/hooks/useTranslation";
import { useAuthStore } from "@/store/authStore";
import { usePermission } from "@/hooks/usePermission";
import {
  useAdminUsers,
  useAdminCreateUser,
  useAdminUpdateUser,
  useAdminDeleteUser,
  useAdminBanUser,
  useAdminUnbanUser,
  useAdminRoles,
} from "@/hooks/useApi";
import { useDebouncedValue } from "@/hooks/useDebounce";

const roleColors = { customer: "info", merchant: "primary", admin: "danger" };
const statusColors = {
  active: "success",
  inactive: "warning",
  banned: "danger",
};

function deriveStatus(user) {
  if (typeof user?.status === "string" && user.status.trim() !== "") {
    return user.status;
  }
  if (user.is_banned) return "banned";
  if (user.email_verified_at) return "active";
  return "inactive";
}

export default function UsersManagePage({ initialRoleFilter = "all" }) {
  const { t } = useTranslation();
  const roleLabels = {
    customer: t("admin.roleCustomer"),
    merchant: t("admin.roleMerchant"),
    admin: t("admin.roleAdmin"),
  };
  const statusLabels = {
    all: t("admin.allStatuses"),
    active: t("admin.statusActive"),
    inactive: t("admin.statusInactive"),
    banned: t("admin.statusBanned"),
  };
  const currentUser = useAuthStore((state) => state.user);
  const { hasPerm } = usePermission();
  const canCreate = hasPerm("create-users");
  const canEdit = hasPerm("edit-users");
  const canDelete = hasPerm("delete-users");
  const canBan = hasPerm("ban-users");
  const canExport = hasPerm("export-users");

  /* ---- local filter / pagination state ---- */
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState(initialRoleFilter);
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [editModal, setEditModal] = useState(null);
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    phone: "",
    role: "customer",
  });
  const [deleteModal, setDeleteModal] = useState(null);
  const [addModal, setAddModal] = useState(false);
  const perPage = 10;

  useEffect(() => {
    setRoleFilter(initialRoleFilter);
    setCurrentPage(1);
  }, [initialRoleFilter]);

  /* ---- refs for add form ---- */
  const addNameRef = useRef(null);
  const addEmailRef = useRef(null);
  const addPasswordRef = useRef(null);
  const addRoleRef = useRef(null);

  /* ---- API hooks ---- */
  const debouncedSearch = useDebouncedValue(search, 300);

  const queryParams = {
    page: currentPage,
    per_page: perPage,
    ...(debouncedSearch && { search: debouncedSearch }),
    ...(roleFilter !== "all" && { role: roleFilter }),
    ...(statusFilter !== "all" && { status: statusFilter }),
  };

  const {
    data: usersResponse,
    isLoading,
    isError,
  } = useAdminUsers(queryParams);

  const updateUser = useAdminUpdateUser();
  const createUser = useAdminCreateUser();
  const deleteUser = useAdminDeleteUser();
  const banUser = useAdminBanUser();
  const unbanUser = useAdminUnbanUser();

  /* ---- Dynamic roles from API ---- */
  const { data: rolesResponse } = useAdminRoles();
  const allRoles = Array.isArray(rolesResponse?.data) ? rolesResponse.data : [];
  const isSystemAdmin = currentUser?.is_system_admin === true;
  // Roles available for assignment (exclude 'merchant' — merchants must apply via form)
  // Non-system-admin staff cannot assign the 'admin' role
  const assignableRoles = (() => {
    const names = allRoles
      .map((r) => (typeof r === "string" ? r : r?.name))
      .filter((name) => !!name && name !== "merchant");
    const filtered = isSystemAdmin
      ? names
      : names.filter((name) => name !== "admin");
    // Fallback if roles API failed or returned empty
    if (filtered.length === 0) return ["customer", "staff"];
    return filtered;
  })();

  const users = usersResponse?.data ?? [];
  const meta = usersResponse?.meta ?? {};
  const totalPages = meta.last_page ?? 1;
  const totalUsers = meta.total ?? users.length;

  /* ---- handlers ---- */
  const handleToggleBan = async (user) => {
    const isBanned = deriveStatus(user) === "banned";
    try {
      if (isBanned) {
        await unbanUser.mutateAsync(user.id);
        toast.success(t("admin.userUnbanned"));
      } else {
        await banUser.mutateAsync(user.id);
        toast.success(t("admin.userBanned"));
      }
    } catch {
      toast.error(t("admin.failedUpdateUserStatus"));
    }
  };

  const handleToggleStatus = async (user, nextActive) => {
    try {
      await updateUser.mutateAsync({
        id: user.id,
        data: { status: nextActive ? "active" : "inactive" },
      });
      toast.success(nextActive ? "User activated" : "User deactivated");
    } catch {
      toast.error(t("admin.failedUpdateUserStatus"));
    }
  };

  const handleDelete = async () => {
    if (!deleteModal) return;
    try {
      await deleteUser.mutateAsync(deleteModal.id);
      setDeleteModal(null);
      toast.success(t("admin.userDeleted"));
    } catch {
      toast.error(t("admin.failedDeleteUser"));
    }
  };

  const handleEditSave = async () => {
    if (!editModal) return;
    const nextName = editForm.name.trim();
    const nextEmail = editForm.email.trim();

    if (!nextName || !nextEmail) {
      toast.error(t("admin.fillRequiredFields"));
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextEmail)) {
      toast.error(t("admin.invalidEmailFormat"));
      return;
    }

    try {
      await updateUser.mutateAsync({
        id: editModal.id,
        data: {
          name: nextName,
          email: nextEmail,
          phone: editForm.phone.trim(),
          role: editForm.role,
        },
      });
      setEditModal(null);
      toast.success(t("admin.userUpdated"));
    } catch {
      toast.error(t("admin.failedUpdateUser"));
    }
  };

  const exportUsers = () => {
    if (!users.length) {
      toast.error(t("admin.noUsersToExport"));
      return;
    }
    const rows = [
      ["ID", "Name", "Email", "Role", "Status", "Joined"],
      ...users.map((u) => [
        u.id,
        `"${(u.name || "").replace(/"/g, '""')}"`,
        u.email,
        u.role,
        deriveStatus(u),
        u.created_at,
      ]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `users-${new Date().toISOString().slice(0, 10)}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleAddUser = async () => {
    const name = addNameRef.current?.value?.trim();
    const email = addEmailRef.current?.value?.trim();
    const password = addPasswordRef.current?.value;
    const role = addRoleRef.current?.value || "customer";
    if (!name || !email || !password) {
      toast.error(t("admin.fillRequiredFields"));
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error(t("admin.invalidEmailFormat"));
      return;
    }
    if (password.length < 8) {
      toast.error(t("admin.passwordMinLength"));
      return;
    }
    try {
      await createUser.mutateAsync({ name, email, password, role });
      setAddModal(false);
      toast.success(t("admin.userCreated"));
    } catch {
      toast.error(t("admin.failedCreateUser"));
    }
  };

  /* ---- loading / error states ---- */
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
        <p className="text-danger">{t("admin.failedLoadUsers")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-text">
            {t("admin.manageUsers")}
          </h1>
          <p className="text-sm text-text-secondary">
            {t("admin.totalUsersCount", { count: totalUsers })}
          </p>
        </div>
        <div className="flex gap-2">
          {canExport && (
            <Button variant="outline" icon={Download} onClick={exportUsers}>
              {t("common.export")}
            </Button>
          )}
          {canCreate && (
            <Button icon={UserPlus} onClick={() => setAddModal(true)}>
              {t("admin.addUser")}
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-border/50 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            placeholder={t("admin.searchUsers")}
            className="w-full ps-9 pe-4 py-2.5 border border-border rounded-lg text-sm focus:ring-1 focus:ring-primary outline-none"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => {
            setRoleFilter(e.target.value);
            setCurrentPage(1);
          }}
          className="border border-border rounded-lg px-3 py-2.5 text-sm bg-white"
        >
          <option value="all">{t("admin.allRoles")}</option>
          {allRoles
            .map((r) => (typeof r === "string" ? r : r?.name))
            .filter(Boolean)
            .map((name) => (
              <option key={name} value={name}>
                {name.charAt(0).toUpperCase() + name.slice(1)}
              </option>
            ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setCurrentPage(1);
          }}
          className="border border-border rounded-lg px-3 py-2.5 text-sm bg-white"
        >
          <option value="all">{t("admin.allStatuses")}</option>
          <option value="active">{t("admin.statusActive")}</option>
          <option value="inactive">{t("admin.statusInactive")}</option>
          <option value="banned">{t("admin.statusBanned")}</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-border/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-border/50">
                <th className="text-left text-xs font-medium text-text-secondary px-4 py-3">
                  {t("admin.userName")}
                </th>
                <th className="text-left text-xs font-medium text-text-secondary px-4 py-3">
                  {t("admin.role")}
                </th>
                <th className="text-left text-xs font-medium text-text-secondary px-4 py-3">
                  {t("admin.status")}
                </th>
                <th className="text-left text-xs font-medium text-text-secondary px-4 py-3">
                  {t("admin.joinDate")}
                </th>
                <th className="text-left text-xs font-medium text-text-secondary px-4 py-3">
                  {t("common.orders")}
                </th>
                <th className="text-left text-xs font-medium text-text-secondary px-4 py-3 text-center">
                  {t("common.actions")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {users.map((user) => {
                const status = deriveStatus(user);
                const isSelf = Number(currentUser?.id) === Number(user.id);
                const isProtectedSystemAdmin = !!user.is_system_admin;
                const cannotManageSystemAdmin = isProtectedSystemAdmin;
                return (
                  <tr key={user.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-gray-200 rounded-full flex items-center justify-center text-sm font-medium text-text-secondary">
                          {user.name?.charAt(0) ?? "?"}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-text">
                            {user.name}
                          </p>
                          <p className="text-xs text-text-secondary">
                            {user.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={roleColors[user.role] ?? "info"}
                        size="sm"
                        className="capitalize"
                      >
                        {roleLabels[user.role] ?? roleLabels.customer}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      {status === "banned" ? (
                        <Badge
                          variant="danger"
                          size="sm"
                          className="capitalize"
                        >
                          {statusLabels.banned}
                        </Badge>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Toggle
                            checked={status === "active"}
                            disabled={
                              updateUser.isPending ||
                              isSelf ||
                              cannotManageSystemAdmin
                            }
                            onChange={(val) => handleToggleStatus(user, val)}
                          />
                          <span className="text-xs text-text-secondary">
                            {status === "active"
                              ? statusLabels.active
                              : statusLabels.inactive}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-secondary width-8rem">
                      {formatDate(user.created_at)}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-secondary">
                      {user.orders_count ?? 0}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 width-max-content">
                        {canEdit && (
                          <button
                            className="p-2 sm:p-1.5 hover:bg-gray-100 rounded touch-manipulation"
                            disabled={cannotManageSystemAdmin}
                            onClick={() => {
                              setEditModal(user);
                              setEditForm({
                                name: user.name ?? "",
                                email: user.email ?? "",
                                phone: user.phone ?? "",
                                role: user.role ?? "customer",
                              });
                            }}
                            title={
                              cannotManageSystemAdmin
                                ? "System admin account cannot be edited"
                                : t("common.edit")
                            }
                            aria-label={t("common.edit")}
                          >
                            <Edit2 className="h-4 w-4 text-text-secondary" />
                          </button>
                        )}
                        {canBan && (
                          <button
                            className="p-2 sm:p-1.5 hover:bg-gray-100 rounded disabled:opacity-50 touch-manipulation"
                            disabled={
                              banUser.isPending ||
                              unbanUser.isPending ||
                              isSelf ||
                              cannotManageSystemAdmin
                            }
                            onClick={() => handleToggleBan(user)}
                            title={
                              isSelf
                                ? "You cannot ban your own account"
                                : cannotManageSystemAdmin
                                  ? "System admin account cannot be banned"
                                  : status === "banned"
                                    ? t("admin.unbanUser")
                                    : t("admin.banUser")
                            }
                            aria-label={
                              status === "banned"
                                ? t("admin.unbanUser")
                                : t("admin.banUser")
                            }
                          >
                            {status === "banned" ? (
                              <CheckCircle className="h-4 w-4 text-success" />
                            ) : (
                              <Ban className="h-4 w-4 text-text-secondary hover:text-danger" />
                            )}
                          </button>
                        )}
                        {canDelete && (
                          <button
                            className="p-2 sm:p-1.5 hover:bg-gray-100 rounded disabled:opacity-50 touch-manipulation"
                            onClick={() => setDeleteModal(user)}
                            disabled={isSelf || cannotManageSystemAdmin}
                            title={
                              isSelf
                                ? t("admin.cannotDeleteOwnAccount")
                                : cannotManageSystemAdmin
                                  ? "System admin account cannot be deleted"
                                  : t("admin.deleteUser")
                            }
                            aria-label={t("common.delete")}
                          >
                            <Trash2 className="h-4 w-4 text-text-secondary hover:text-danger" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {users.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-sm text-text-secondary"
                  >
                    {t("admin.noUsersFound")}
                  </td>
                </tr>
              )}
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

      {/* Add User Modal */}
      <Modal
        isOpen={addModal}
        onClose={() => setAddModal(false)}
        title={t("admin.addUser")}
      >
        <div className="space-y-4">
          <Input
            ref={addNameRef}
            label={t("common.name")}
            placeholder={t("admin.fullName")}
            required
          />
          <Input
            ref={addEmailRef}
            label={t("common.email")}
            type="email"
            placeholder="email@example.com"
            required
          />
          <Input
            ref={addPasswordRef}
            label={t("admin.password")}
            type="password"
            placeholder={t("admin.setPassword")}
            required
          />
          <Select
            ref={addRoleRef}
            label={t("admin.role")}
            options={assignableRoles.map((name) => ({
              value: name,
              label: name.charAt(0).toUpperCase() + name.slice(1),
            }))}
          />
          <div className="flex gap-3">
            <Button
              variant="outline"
              fullWidth
              onClick={() => setAddModal(false)}
            >
              {t("common.cancel")}
            </Button>
            <Button fullWidth onClick={handleAddUser}>
              {t("admin.createUser")}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={!!editModal}
        onClose={() => setEditModal(null)}
        title={t("admin.editUser")}
      >
        {editModal && (
          <div className="space-y-4">
            <Input
              label={t("common.name")}
              value={editForm.name}
              onChange={(e) =>
                setEditForm((prev) => ({ ...prev, name: e.target.value }))
              }
            />
            <Input
              label={t("common.email")}
              value={editForm.email}
              onChange={(e) =>
                setEditForm((prev) => ({ ...prev, email: e.target.value }))
              }
            />
            <Input
              label={t("common.phone")}
              value={editForm.phone}
              onChange={(e) =>
                setEditForm((prev) => ({ ...prev, phone: e.target.value }))
              }
            />
            <Select
              label={t("admin.role")}
              value={editForm.role}
              onChange={(e) =>
                setEditForm((prev) => ({ ...prev, role: e.target.value }))
              }
              options={assignableRoles.map((name) => ({
                value: name,
                label: name.charAt(0).toUpperCase() + name.slice(1),
              }))}
            />
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
                disabled={updateUser.isPending}
                onClick={handleEditSave}
              >
                {updateUser.isPending ? (
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
        title={t("admin.deleteUser")}
        size="sm"
      >
        <p className="text-sm text-text-secondary mb-4">
          {t("admin.confirmDeleteUser", { name: deleteModal?.name || "" })}
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
            disabled={deleteUser.isPending}
            onClick={handleDelete}
          >
            {deleteUser.isPending ? (
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
