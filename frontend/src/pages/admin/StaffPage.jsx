import { useEffect, useState, useRef } from "react";
import {
  Plus,
  Edit2,
  Trash2,
  Shield,
  Users,
  Search,
  Loader2,
  ChevronDown,
  ChevronRight,
  Check,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import toast from "react-hot-toast";
import { useTranslation } from "@/hooks/useTranslation";
import { useAuthStore } from "@/store/authStore";
import {
  useAdminStaff,
  useAdminCreateStaff,
  useAdminUpdateStaff,
  useAdminDeleteStaff,
  useAdminRoles,
  useAdminUpdateRole,
  useAdminCreateRole,
  useAdminDeleteRole,
  useAdminPermissions,
} from "@/hooks/useApi";
import { useDebouncedValue } from "@/hooks/useDebounce";
import { usePermission } from "@/hooks/usePermission";

/* --- Permission label map (slug -> display name) --- */
const permissionLabel = (slug) =>
  slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export default function StaffPage({ initialTab = "staff" }) {
  const { t } = useTranslation();
  const currentUser = useAuthStore((state) => state.user);
  const { hasPerm } = usePermission();
  const canCreateStaff = hasPerm("create-staff");
  const canEditStaff = hasPerm("edit-staff");
  const canDeleteStaff = hasPerm("delete-staff");
  const canEditRoles = hasPerm("edit-roles");
  const [activeTab, setActiveTab] = useState(
    initialTab === "roles" ? "roles" : "staff",
  );

  /* --- Staff state --- */
  const [addModal, setAddModal] = useState(false);
  const [editModal, setEditModal] = useState(null);
  const [deleteModal, setDeleteModal] = useState(null);
  const [addRoleId, setAddRoleId] = useState("");
  const [editRoleId, setEditRoleId] = useState("");
  const [editIsActive, setEditIsActive] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const perPage = 10;

  /* --- Roles state --- */
  const [addRoleModal, setAddRoleModal] = useState(false);
  const [editRoleModal, setEditRoleModal] = useState(null);
  const [deleteRoleModal, setDeleteRoleModal] = useState(null);
  const [roleName, setRoleName] = useState("");
  const [rolePermissions, setRolePermissions] = useState({});
  const [expandedGroups, setExpandedGroups] = useState({});

  /* --- Form refs --- */
  const addNameRef = useRef(null);
  const addEmailRef = useRef(null);
  const addPasswordRef = useRef(null);
  const editNameRef = useRef(null);
  const editEmailRef = useRef(null);

  /* --- API hooks --- */
  const debouncedSearch = useDebouncedValue(search, 300);
  const queryParams = {
    page: currentPage,
    per_page: perPage,
    ...(debouncedSearch && { search: debouncedSearch }),
    ...(statusFilter !== "all" && { status: statusFilter }),
  };

  const { data: staffResponse, isLoading: staffLoading } =
    useAdminStaff(queryParams);
  const { data: rolesResponse, isLoading: rolesLoading } = useAdminRoles();
  const { data: permsResponse } = useAdminPermissions();

  const createStaff = useAdminCreateStaff();
  const updateStaff = useAdminUpdateStaff();
  const deleteStaff = useAdminDeleteStaff();
  const createRole = useAdminCreateRole();
  const updateRole = useAdminUpdateRole();
  const deleteRole = useAdminDeleteRole();

  /* --- Derived data --- */
  const staffPayload = staffResponse?.data ?? staffResponse ?? {};
  const staffList = Array.isArray(staffPayload?.data)
    ? staffPayload.data
    : Array.isArray(staffPayload)
      ? staffPayload
      : [];
  const staffMeta = staffResponse?.meta ?? staffPayload?.meta ?? {};
  const totalPages = Number(
    staffMeta?.last_page ?? staffPayload?.last_page ?? 1,
  );
  const totalStaff = Number(
    staffMeta?.total ?? staffPayload?.total ?? staffList.length,
  );

  const roles = Array.isArray(rolesResponse?.data)
    ? rolesResponse.data
    : Array.isArray(rolesResponse)
      ? rolesResponse
      : [];

  // Permission groups from backend { groupName: [slug, ...] }
  const permissionGroups = permsResponse?.data ?? permsResponse ?? {};

  const statusLabels = {
    all: t("common.all"),
    active: t("admin.statusActive"),
    inactive: t("admin.statusInactive"),
    banned: t("admin.statusBanned"),
  };

  useEffect(() => {
    setActiveTab(initialTab === "roles" ? "roles" : "staff");
  }, [initialTab]);

  useEffect(() => {
    if (!addRoleId && roles.length > 0) {
      setAddRoleId(String(roles[0].id));
    }
  }, [roles, addRoleId]);

  /* --- Helpers --- */
  const resolveRoleIdForStaff = (staffItem) => {
    const directRoleId = staffItem?.role_id ?? staffItem?.roles?.[0]?.id;
    if (directRoleId) return String(directRoleId);
    const staffRoleName = deriveRole(staffItem)
      .split(",")[0]
      ?.trim()
      .toLowerCase();
    const matched = roles.find(
      (r) => String(r?.name ?? "").toLowerCase() === staffRoleName,
    );
    return matched?.id ? String(matched.id) : "";
  };

  const deriveStatus = (s) => {
    if (s?.is_banned) return "banned";
    if (s?.is_active === false) return "inactive";
    return "active";
  };

  const deriveRole = (s) => {
    if (s.roles?.length) return s.roles.map((r) => r.name).join(", ");
    if (s.role?.name) return s.role.name;
    return s.role ?? "---";
  };

  const toggleGroup = (group) =>
    setExpandedGroups((prev) => ({ ...prev, [group]: !prev[group] }));

  const isGroupAllChecked = (perms) => perms.every((p) => !!rolePermissions[p]);
  const isGroupPartialChecked = (perms) =>
    perms.some((p) => !!rolePermissions[p]) && !isGroupAllChecked(perms);

  const toggleGroupAll = (perms) => {
    const allChecked = isGroupAllChecked(perms);
    setRolePermissions((prev) => {
      const next = { ...prev };
      perms.forEach((p) => (next[p] = !allChecked));
      return next;
    });
  };

  const initRoleForm = (role = null) => {
    if (role) {
      setRoleName(role.name || "");
      const permsMap = {};
      const rolePerms = role.permissions || [];
      Object.values(permissionGroups)
        .flat()
        .forEach((p) => {
          permsMap[p] = rolePerms.includes(p);
        });
      setRolePermissions(permsMap);
    } else {
      setRoleName("");
      setRolePermissions({});
    }
    // Expand all groups by default
    const expanded = {};
    Object.keys(permissionGroups).forEach((g) => (expanded[g] = true));
    setExpandedGroups(expanded);
  };

  /* --- Staff handlers --- */
  const handleCreate = async () => {
    const name = addNameRef.current?.value?.trim();
    const email = addEmailRef.current?.value?.trim();
    const password = addPasswordRef.current?.value;
    const role_id = addRoleId;

    if (!name || !email || !password || !role_id) {
      toast.error(t("admin.pleaseFillAllRequiredFields"));
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
      await createStaff.mutateAsync({
        name,
        email,
        password,
        role_id: Number(role_id),
      });
      setAddModal(false);
      toast.success(t("admin.staffMemberAdded"));
    } catch {
      toast.error(t("admin.failedAddStaffMember"));
    }
  };

  const handleUpdate = async () => {
    if (!editModal) return;
    const name = editNameRef.current?.value?.trim();
    const email = editEmailRef.current?.value?.trim();
    const role_id = editRoleId;

    if (!name || !email || !role_id) {
      toast.error(t("admin.nameEmailRequired"));
      return;
    }

    try {
      await updateStaff.mutateAsync({
        id: editModal.id,
        data: {
          name,
          email,
          role_id: Number(role_id),
          is_active: editIsActive,
        },
      });
      setEditModal(null);
      toast.success(t("admin.staffMemberUpdated"));
    } catch {
      toast.error(t("admin.failedUpdateStaffMember"));
    }
  };

  const handleDelete = async () => {
    if (!deleteModal) return;
    try {
      await deleteStaff.mutateAsync(deleteModal.id);
      setDeleteModal(null);
      toast.success(t("admin.staffMemberDeleted"));
    } catch {
      toast.error(t("admin.failedDeleteStaffMember"));
    }
  };

  /* --- Role handlers --- */
  const handleCreateRole = async () => {
    if (!roleName.trim()) {
      toast.error(t("admin.pleaseFillAllRequiredFields"));
      return;
    }
    const permissions = Object.entries(rolePermissions)
      .filter(([, v]) => v)
      .map(([k]) => k);
    try {
      await createRole.mutateAsync({ name: roleName.trim(), permissions });
      setAddRoleModal(false);
      toast.success(t("admin.roleCreatedSuccessfully"));
    } catch {
      toast.error(t("admin.failedCreateRole"));
    }
  };

  const handleUpdateRole = async () => {
    if (!editRoleModal || !roleName.trim()) {
      toast.error(t("admin.pleaseFillAllRequiredFields"));
      return;
    }
    const permissions = Object.entries(rolePermissions)
      .filter(([, v]) => v)
      .map(([k]) => k);
    try {
      await updateRole.mutateAsync({
        id: editRoleModal.id,
        data: { name: roleName.trim(), permissions },
      });
      setEditRoleModal(null);
      toast.success(t("admin.roleUpdatedSuccessfully"));
    } catch {
      toast.error(t("admin.failedUpdateRole"));
    }
  };

  const handleDeleteRole = async () => {
    if (!deleteRoleModal) return;
    try {
      await deleteRole.mutateAsync(deleteRoleModal.id);
      setDeleteRoleModal(null);
      toast.success(t("admin.roleDeletedSuccessfully"));
    } catch {
      toast.error(t("admin.failedDeleteRole"));
    }
  };

  /* --- Permission picker (shared between create & edit role modals) --- */
  const permissionPickerUI = (
    <div className="space-y-1 max-h-[400px] overflow-y-auto border border-border/50 rounded-lg">
      {Object.entries(permissionGroups).map(([group, perms]) => {
        const isExpanded = expandedGroups[group];
        const allChecked = isGroupAllChecked(perms);
        const partial = isGroupPartialChecked(perms);
        return (
          <div
            key={group}
            className="border-b border-border/30 last:border-b-0"
          >
            <div
              className="flex items-center gap-2 px-3 py-2.5 cursor-pointer hover:bg-gray-50 select-none"
              onClick={() => toggleGroup(group)}
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-text-secondary flex-shrink-0" />
              ) : (
                <ChevronRight className="h-4 w-4 text-text-secondary flex-shrink-0" />
              )}
              <label
                className="flex items-center gap-2 flex-1 cursor-pointer"
                onClick={(e) => e.stopPropagation()}
              >
                <input
                  type="checkbox"
                  checked={allChecked}
                  ref={(el) => el && (el.indeterminate = partial)}
                  onChange={() => toggleGroupAll(perms)}
                  className="rounded text-primary h-4 w-4"
                />
                <span className="text-sm font-semibold text-text">{group}</span>
                <span className="text-xs text-text-secondary ml-auto mr-2">
                  {perms.filter((p) => !!rolePermissions[p]).length}/
                  {perms.length}
                </span>
              </label>
            </div>
            {isExpanded && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 px-4 pb-3 pt-1 ml-6">
                {perms.map((p) => (
                  <label
                    key={p}
                    className="flex items-center gap-2 text-sm text-text-secondary py-0.5 cursor-pointer hover:text-text"
                  >
                    <input
                      type="checkbox"
                      checked={!!rolePermissions[p]}
                      onChange={(e) =>
                        setRolePermissions((prev) => ({
                          ...prev,
                          [p]: e.target.checked,
                        }))
                      }
                      className="rounded text-primary h-3.5 w-3.5"
                    />
                    {permissionLabel(p)}
                  </label>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-text">
            {t("admin.staffManagement")}
          </h1>
          <p className="text-sm text-text-secondary">
            {t("admin.staffMembersCount", { count: totalStaff })}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border/50">
        {[
          { id: "staff", label: t("admin.staffMembers"), icon: Users },
          { id: "roles", label: t("admin.rolesPermissions"), icon: Shield },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition flex items-center gap-2 ${
              activeTab === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-text-secondary"
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ============ STAFF TAB ============ */}
      {activeTab === "staff" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between gap-3">
            <div className="bg-white p-3 rounded-xl border border-border/50 flex flex-col sm:flex-row gap-3 flex-1">
              <div className="relative flex-1">
                <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
                <input
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder={t("admin.searchStaff")}
                  className="w-full ps-9 pe-4 py-2.5 border border-border rounded-lg text-sm focus:ring-1 focus:ring-primary outline-none"
                />
              </div>
              <div className="flex gap-2 flex-wrap justify-end">
                {["all", "active", "inactive"].map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      setStatusFilter(s);
                      setCurrentPage(1);
                    }}
                    className={`px-3 py-2 text-sm rounded-lg border capitalize transition ${
                      statusFilter === s
                        ? "bg-primary text-white border-primary"
                        : "border-border text-text-secondary"
                    }`}
                  >
                    {statusLabels[s] || s}
                  </button>
                ))}
              </div>
            </div>
            {canCreateStaff && (
              <Button
                icon={Plus}
                onClick={() => {
                  const staffRole = roles.find(
                    (r) => r.name?.toLowerCase() === "staff",
                  );
                  setAddRoleId(
                    staffRole?.id
                      ? String(staffRole.id)
                      : roles[0]?.id
                        ? String(roles[0].id)
                        : "",
                  );
                  setAddModal(true);
                }}
              >
                {t("admin.addStaff")}
              </Button>
            )}
          </div>

          {staffLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : staffList.length === 0 ? (
            <div className="text-center py-20 text-text-secondary text-sm">
              {t("admin.noStaffMembersFound")}
            </div>
          ) : (
            <>
              <div className="bg-white rounded-xl border border-border/50 overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-border/50">
                      <th className="text-left text-xs font-medium text-text-secondary px-4 py-3">
                        {t("admin.staffName")}
                      </th>
                      <th className="text-left text-xs font-medium text-text-secondary px-4 py-3">
                        {t("admin.staffRole")}
                      </th>
                      <th className="text-left text-xs font-medium text-text-secondary px-4 py-3">
                        {t("common.status")}
                      </th>
                      <th className="text-left text-xs font-medium text-text-secondary px-4 py-3">
                        {t("admin.created")}
                      </th>
                      <th className="text-left text-xs font-medium text-text-secondary px-4 py-3 min-w-[120px]">
                        {t("common.actions")}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {staffList.map((s) => {
                      const status = deriveStatus(s);
                      const role = deriveRole(s);
                      const isSelf = Number(currentUser?.id) === Number(s.id);
                      const isProtectedSystemAdmin = !!s.is_system_admin;
                      const cannotManageSystemAdmin = isProtectedSystemAdmin;
                      return (
                        <tr key={s.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 bg-gray-200 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0">
                                {(s.name ?? "?")[0]}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-text truncate">
                                  {s.name}
                                </p>
                                <p className="text-xs text-text-secondary truncate">
                                  {s.email}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant="info" size="sm">
                              {role}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <Badge
                              variant={
                                status === "active"
                                  ? "success"
                                  : status === "banned"
                                    ? "danger"
                                    : "warning"
                              }
                              size="sm"
                            >
                              {statusLabels[status] || status}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-sm text-text-secondary whitespace-nowrap">
                            {s.created_at
                              ? new Date(s.created_at).toLocaleDateString()
                              : "---"}
                          </td>
                          <td className="px-4 py-3">
                            <div
                              className={`flex items-center gap-1 width-max-content ${isProtectedSystemAdmin ? "opacity-50" : ""}`}
                            >
                              {canEditStaff && (
                                <button
                                  className="p-2 sm:p-1.5 hover:bg-gray-100 rounded touch-manipulation"
                                  disabled={cannotManageSystemAdmin}
                                  onClick={() => {
                                    setEditModal(s);
                                    setEditRoleId(resolveRoleIdForStaff(s));
                                    setEditIsActive(s.is_active !== false);
                                  }}
                                  title={
                                    cannotManageSystemAdmin
                                      ? "System admin account cannot be edited"
                                      : t("common.edit")
                                  }
                                  aria-label={t("common.edit")}
                                >
                                  <Edit2 className="h-5 w-5 sm:h-4 sm:w-4 text-text-secondary" />
                                </button>
                              )}
                              {canDeleteStaff && (
                                <button
                                  className="p-2 sm:p-1.5 hover:bg-gray-100 rounded disabled:opacity-50 touch-manipulation"
                                  onClick={() => setDeleteModal(s)}
                                  disabled={isSelf || cannotManageSystemAdmin}
                                  title={
                                    isSelf
                                      ? t("admin.cannotDeleteOwnAccount")
                                      : cannotManageSystemAdmin
                                        ? "System admin account cannot be deleted"
                                        : t("common.delete")
                                  }
                                  aria-label={t("common.delete")}
                                >
                                  <Trash2 className="h-5 w-5 sm:h-4 sm:w-4 text-text-secondary hover:text-danger" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="flex justify-center gap-2">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                    (page) => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`px-3 py-1.5 text-sm rounded-lg border transition ${
                          currentPage === page
                            ? "bg-primary text-white border-primary"
                            : "border-border text-text-secondary"
                        }`}
                      >
                        {page}
                      </button>
                    ),
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ============ ROLES TAB ============ */}
      {activeTab === "roles" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-text-secondary">
              {t("admin.manageRolesDescription", {
                fallback: "Create and manage roles with specific permissions",
              })}
            </p>
            {canEditRoles && (
              <Button
                icon={Plus}
                onClick={() => {
                  initRoleForm();
                  setAddRoleModal(true);
                }}
              >
                {t("admin.createRole")}
              </Button>
            )}
          </div>

          {rolesLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : roles.length === 0 ? (
            <div className="text-center py-20 text-text-secondary text-sm">
              {t("admin.noRolesFound")}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {roles.map((role) => {
                const permCount = role.permissions?.length ?? 0;
                return (
                  <div
                    key={role.id}
                    className="bg-white p-4 rounded-xl border border-border/50 flex flex-col"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Shield className="h-5 w-5 text-accent flex-shrink-0" />
                        <h3 className="font-medium text-text capitalize">
                          {role.name}
                        </h3>
                      </div>
                      <div className="flex items-center gap-1">
                        {canEditRoles && (
                          <>
                            <button
                              className="p-2 sm:p-1.5 hover:bg-gray-100 rounded touch-manipulation"
                              onClick={() => {
                                initRoleForm(role);
                                setEditRoleModal(role);
                              }}
                              aria-label={t("common.edit")}
                            >
                              <Edit2 className="h-5 w-5 sm:h-4 sm:w-4 text-text-secondary" />
                            </button>
                            <button
                              className="p-2 sm:p-1.5 hover:bg-gray-100 rounded touch-manipulation"
                              onClick={() => setDeleteRoleModal(role)}
                              aria-label={t("common.delete")}
                            >
                              <Trash2 className="h-5 w-5 sm:h-4 sm:w-4 text-text-secondary hover:text-danger" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1 mb-3 flex-1">
                      {permCount === 0 ? (
                        <span className="text-xs text-text-secondary italic">
                          {t("admin.noPermissionsAssigned", {
                            fallback: "No permissions assigned",
                          })}
                        </span>
                      ) : permCount <= 6 ? (
                        role.permissions.map((p) => (
                          <Badge key={p} variant="primary" size="sm">
                            {permissionLabel(p)}
                          </Badge>
                        ))
                      ) : (
                        <>
                          {role.permissions.slice(0, 4).map((p) => (
                            <Badge key={p} variant="primary" size="sm">
                              {permissionLabel(p)}
                            </Badge>
                          ))}
                          <Badge variant="default" size="sm">
                            +{permCount - 4} more
                          </Badge>
                        </>
                      )}
                    </div>
                    <div className="text-xs text-text-secondary border-t border-border/30 pt-2">
                      {t("admin.staffMembersCount", {
                        count: role.users_count ?? 0,
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ============ MODALS ============ */}

      {/* Add Staff Modal */}
      <Modal
        isOpen={addModal}
        onClose={() => setAddModal(false)}
        title={t("admin.addStaff")}
      >
        <div className="space-y-4">
          <Input
            ref={addNameRef}
            label={t("admin.staffName")}
            placeholder={t("admin.enterName")}
          />
          <Input
            ref={addEmailRef}
            label={t("common.email")}
            type="email"
            placeholder="email@example.com"
          />
          <Input
            ref={addPasswordRef}
            label={t("common.password")}
            type="password"
            placeholder={t("admin.setPassword")}
          />
          <div>
            <label className="block text-sm font-medium text-text mb-1.5">
              {t("common.role")}
            </label>
            <select
              value={addRoleId}
              onChange={(e) => setAddRoleId(e.target.value)}
              className="w-full border border-border rounded-lg px-3 py-2.5 text-sm"
              disabled={rolesLoading || roles.length === 0}
            >
              {roles.length === 0 && (
                <option value="">No roles available</option>
              )}
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
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
              disabled={createStaff.isPending}
            >
              {createStaff.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mx-auto" />
              ) : (
                t("admin.addStaff")
              )}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Staff Modal */}
      <Modal
        isOpen={!!editModal}
        onClose={() => setEditModal(null)}
        title={t("admin.editStaffMember")}
      >
        {editModal && (
          <div className="space-y-4">
            <Input
              ref={editNameRef}
              label={t("admin.staffName")}
              defaultValue={editModal.name}
            />
            <Input
              ref={editEmailRef}
              label={t("common.email")}
              type="email"
              defaultValue={editModal.email}
            />
            <div>
              <label className="block text-sm font-medium text-text mb-1.5">
                {t("common.role")}
              </label>
              <select
                value={editRoleId}
                onChange={(e) => setEditRoleId(e.target.value)}
                className="w-full border border-border rounded-lg px-3 py-2.5 text-sm"
                disabled={rolesLoading || roles.length === 0}
              >
                {roles.length === 0 && (
                  <option value="">No roles available</option>
                )}
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
            {/* Staff Account Status */}
            <div>
              <label className="block text-sm font-medium text-text mb-1.5">
                {t("admin.accountStatus", { fallback: "Account Status" })}
              </label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setEditIsActive(true)}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition ${
                    editIsActive
                      ? "bg-green-50 border-green-300 text-green-700"
                      : "border-border text-text-secondary hover:bg-gray-50"
                  }`}
                >
                  {editIsActive && <Check className="h-4 w-4" />}
                  {t("admin.statusActive")}
                </button>
                <button
                  type="button"
                  onClick={() => setEditIsActive(false)}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition ${
                    !editIsActive
                      ? "bg-yellow-50 border-yellow-300 text-yellow-700"
                      : "border-border text-text-secondary hover:bg-gray-50"
                  }`}
                >
                  {!editIsActive && <Check className="h-4 w-4" />}
                  {t("admin.statusInactive")}
                </button>
              </div>
              {!editIsActive && (
                <p className="text-xs text-warning mt-1.5">
                  {t("admin.inactiveStaffWarning", {
                    fallback:
                      "Inactive staff cannot access the admin panel or use their assigned permissions.",
                  })}
                </p>
              )}
            </div>
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
                disabled={updateStaff.isPending}
              >
                {updateStaff.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                ) : (
                  t("common.save")
                )}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Staff Modal */}
      <Modal
        isOpen={!!deleteModal}
        onClose={() => setDeleteModal(null)}
        title={t("admin.deleteStaffMember")}
      >
        {deleteModal && (
          <div className="space-y-4">
            <p className="text-sm text-text-secondary">
              {t("admin.confirmDeleteStaffMember", { name: deleteModal.name })}
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
                variant="danger"
                fullWidth
                onClick={handleDelete}
                disabled={deleteStaff.isPending}
              >
                {deleteStaff.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                ) : (
                  t("common.delete")
                )}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Create Role Modal */}
      <Modal
        isOpen={addRoleModal}
        onClose={() => setAddRoleModal(false)}
        title={t("admin.createRole")}
        size="lg"
        footer={
          <div className="flex gap-3 w-full">
            <Button
              variant="outline"
              fullWidth
              onClick={() => setAddRoleModal(false)}
            >
              {t("common.cancel")}
            </Button>
            <Button
              fullWidth
              onClick={handleCreateRole}
              disabled={createRole.isPending}
            >
              {createRole.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mx-auto" />
              ) : (
                t("admin.createRole")
              )}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input
            label={t("admin.roleName")}
            placeholder={t("admin.enterRoleName", {
              fallback: "e.g. Content Editor",
            })}
            value={roleName}
            onChange={(e) => setRoleName(e.target.value)}
          />
          <div>
            <label className="block text-sm font-medium text-text mb-2">
              {t("admin.selectPermissions", { fallback: "Select Permissions" })}
            </label>
            {permissionPickerUI}
          </div>
        </div>
      </Modal>

      {/* Edit Role Modal */}
      <Modal
        isOpen={!!editRoleModal}
        onClose={() => setEditRoleModal(null)}
        title={t("admin.editRoleTitle", { name: editRoleModal?.name })}
        size="lg"
        footer={
          editRoleModal && (
            <div className="flex gap-3 w-full">
              <Button
                variant="outline"
                fullWidth
                onClick={() => setEditRoleModal(null)}
              >
                {t("common.cancel")}
              </Button>
              <Button
                fullWidth
                onClick={handleUpdateRole}
                disabled={updateRole.isPending}
              >
                {updateRole.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                ) : (
                  t("common.save")
                )}
              </Button>
            </div>
          )
        }
      >
        {editRoleModal && (
          <div className="space-y-4">
            <Input
              label={t("admin.roleName")}
              value={roleName}
              onChange={(e) => setRoleName(e.target.value)}
            />
            <div>
              <label className="block text-sm font-medium text-text mb-2">
                {t("admin.selectPermissions", {
                  fallback: "Select Permissions",
                })}
              </label>
              {permissionPickerUI}
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Role Modal */}
      <Modal
        isOpen={!!deleteRoleModal}
        onClose={() => setDeleteRoleModal(null)}
        title={t("admin.deleteRole", { fallback: "Delete Role" })}
      >
        {deleteRoleModal && (
          <div className="space-y-4">
            <p className="text-sm text-text-secondary">
              {t("admin.confirmDeleteRole", {
                name: deleteRoleModal.name,
                fallback: `Are you sure you want to delete the role "${deleteRoleModal.name}"? Staff members with this role will lose access.`,
              })}
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                fullWidth
                onClick={() => setDeleteRoleModal(null)}
              >
                {t("common.cancel")}
              </Button>
              <Button
                variant="danger"
                fullWidth
                onClick={handleDeleteRole}
                disabled={deleteRole.isPending}
              >
                {deleteRole.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                ) : (
                  t("common.delete")
                )}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
