import { useEffect, useMemo, useRef, useState } from "react";
import {
  Plus,
  Edit2,
  Trash2,
  Search,
  FileText,
  Layout,
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Pagination from "@/components/ui/Pagination";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import { formatDate } from "@/lib/utils";
import toast from "react-hot-toast";
import { useTranslation } from "@/hooks/useTranslation";
import { useAdminSettings, useAdminUpdateSettings } from "@/hooks/useApi";
import { usePermission } from "@/hooks/usePermission";

const statusColors = {
  published: "success",
  draft: "warning",
  scheduled: "info",
};

const EMPTY_FORM = {
  title: "",
  slug: "",
  category: "General",
  status: "draft",
  content: "",
};

export default function ContentPage({ initialTab = "blog" }) {
  const { t } = useTranslation();
  const { hasPerm } = usePermission();
  const canCreate = hasPerm("create-content");
  const canEdit = hasPerm("edit-content");
  const canDelete = hasPerm("delete-content");
  const { data: settingsRes, isLoading } = useAdminSettings();
  const updateSettings = useAdminUpdateSettings();

  const settings = settingsRes?.data ?? settingsRes ?? {};

  const [activeTab, setActiveTab] = useState(
    initialTab === "pages" ? "pages" : "blog",
  );
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [editModal, setEditModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [posts, setPosts] = useState([]);
  const [pages, setPages] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const editorRef = useRef(null);
  const perPage = 8;

  useEffect(() => {
    setActiveTab(initialTab === "pages" ? "pages" : "blog");
    setCurrentPage(1);
  }, [initialTab]);

  useEffect(() => {
    if (Array.isArray(settings.content_posts)) setPosts(settings.content_posts);
    if (Array.isArray(settings.content_pages)) setPages(settings.content_pages);
  }, [settingsRes]);

  useEffect(() => {
    if (!editModal || !editorRef.current) return;
    const nextHtml = form.content || "";
    if (editorRef.current.innerHTML !== nextHtml) {
      editorRef.current.innerHTML = nextHtml;
    }
  }, [editModal, form.content]);

  const filteredPosts = useMemo(
    () =>
      posts.filter(
        (p) => !search || p.title?.toLowerCase().includes(search.toLowerCase()),
      ),
    [posts, search],
  );
  const paginatedPosts = filteredPosts.slice(
    (currentPage - 1) * perPage,
    currentPage * perPage,
  );
  const totalPages = Math.ceil(filteredPosts.length / perPage);

  const currentCollection = activeTab === "blog" ? posts : pages;

  const openCreate = () => {
    setEditId(null);
    setForm(EMPTY_FORM);
    setEditModal(true);
  };

  const openEdit = (item) => {
    setEditId(item.id);
    setForm({
      title: item.title ?? "",
      slug: item.slug ?? "",
      category: item.category ?? "General",
      status: item.status ?? "draft",
      content: item.content ?? "",
    });
    setEditModal(true);
  };

  const persist = async (nextPosts, nextPages, successMessage) => {
    try {
      await updateSettings.mutateAsync({
        content_posts: nextPosts,
        content_pages: nextPages,
      });
      setPosts(nextPosts);
      setPages(nextPages);
      if (successMessage) toast.success(successMessage);
    } catch {
      toast.error(t("admin.contentSaveFailed"));
    }
  };

  const saveItem = async () => {
    const trimmedTitle = form.title.trim();
    const contentText = (form.content || "").replace(/<[^>]*>/g, " ").trim();

    if (!trimmedTitle) {
      toast.error(t("admin.contentTitleRequired"));
      return;
    }

    if (!contentText) {
      toast.error(t("admin.contentBodyRequired"));
      return;
    }

    const hasDuplicateTitle = currentCollection.some(
      (entry) =>
        entry.id !== editId &&
        (entry.title || "").trim().toLowerCase() === trimmedTitle.toLowerCase(),
    );

    if (hasDuplicateTitle) {
      toast.error(t("admin.contentTitleMustBeUnique"));
      return;
    }

    const now = new Date().toISOString();
    const item = {
      id: editId ?? Date.now(),
      title: trimmedTitle,
      slug: form.slug.trim() || trimmedTitle.toLowerCase().replace(/\s+/g, "-"),
      category: form.category.trim() || "General",
      status: form.status,
      content: form.content,
      views: Number(currentCollection.find((x) => x.id === editId)?.views ?? 0),
      createdAt:
        currentCollection.find((x) => x.id === editId)?.createdAt ?? now,
      updatedAt: now,
    };

    if (activeTab === "blog") {
      const nextPosts = editId
        ? posts.map((post) => (post.id === editId ? item : post))
        : [item, ...posts];
      await persist(nextPosts, pages, t("admin.contentPostSaved"));
    } else {
      const nextPages = editId
        ? pages.map((page) => (page.id === editId ? item : page))
        : [item, ...pages];
      await persist(posts, nextPages, t("admin.contentPageSaved"));
    }

    setEditModal(false);
  };

  const applyFormat = (command) => {
    document.execCommand(command, false);
    if (editorRef.current) {
      setForm((p) => ({ ...p, content: editorRef.current.innerHTML }));
    }
  };

  const handleEditorInput = () => {
    if (editorRef.current) {
      setForm((p) => ({ ...p, content: editorRef.current.innerHTML }));
    }
  };

  const deleteItem = async (id) => {
    if (!window.confirm(t("admin.contentDeleteConfirm"))) return;
    if (activeTab === "blog") {
      await persist(
        posts.filter((p) => p.id !== id),
        pages,
        t("admin.contentPostDeleted"),
      );
    } else {
      await persist(
        posts,
        pages.filter((p) => p.id !== id),
        t("admin.contentPageDeleted"),
      );
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-text">
            {t("admin.content")}
          </h1>
          <p className="text-sm text-text-secondary">
            {t("admin.contentSubtitle")}
          </p>
        </div>
        {canCreate && (
          <Button icon={Plus} onClick={openCreate} loading={isLoading}>
            {activeTab === "blog"
              ? t("admin.contentAddPost")
              : t("admin.contentAddPage")}
          </Button>
        )}
      </div>

      <div className="flex gap-2 border-b border-border/50">
        {[
          { id: "blog", label: t("admin.contentBlogPosts"), icon: FileText },
          { id: "pages", label: t("admin.pages"), icon: Layout },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              setCurrentPage(1);
            }}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition flex items-center gap-2 ${activeTab === tab.id ? "border-primary text-primary" : "border-transparent text-text-secondary"}`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="relative max-w-md">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
        <input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setCurrentPage(1);
          }}
          placeholder={
            activeTab === "blog"
              ? t("admin.contentSearchPosts")
              : t("admin.contentSearchPages")
          }
          className="w-full ps-9 pe-4 py-2.5 border border-border rounded-lg text-sm focus:ring-1 focus:ring-primary outline-none"
        />
      </div>

      <div className="bg-white rounded-xl border border-border/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-border/50">
                <th className="text-left text-xs font-medium text-text-secondary px-4 py-3">
                  {t("admin.contentTitle")}
                </th>
                {activeTab === "blog" && (
                  <th className="text-left text-xs font-medium text-text-secondary px-4 py-3">
                    {t("admin.contentCategory")}
                  </th>
                )}
                <th className="text-left text-xs font-medium text-text-secondary px-4 py-3">
                  {t("admin.contentStatus")}
                </th>
                <th className="text-left text-xs font-medium text-text-secondary px-4 py-3">
                  {t("admin.contentUpdated")}
                </th>
                <th className="text-left text-xs font-medium text-text-secondary px-4 py-3 text-center">
                  {t("common.actions")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {(activeTab === "blog"
                ? paginatedPosts
                : pages.filter(
                    (p) =>
                      !search ||
                      p.title?.toLowerCase().includes(search.toLowerCase()),
                  )
              ).length === 0 && (
                <tr>
                  <td
                    colSpan={activeTab === "blog" ? 5 : 4}
                    className="text-center py-12 text-sm text-text-secondary"
                  >
                    {activeTab === "blog"
                      ? t("admin.contentNoPosts")
                      : t("admin.contentNoPages")}
                  </td>
                </tr>
              )}

              {(activeTab === "blog"
                ? paginatedPosts
                : pages.filter(
                    (p) =>
                      !search ||
                      p.title?.toLowerCase().includes(search.toLowerCase()),
                  )
              ).map((item) => (
                <tr key={item.id} className="hover:bg-gray-50 transition">
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-text">
                      {item.title}
                    </p>
                    <p className="text-xs text-text-secondary">/{item.slug}</p>
                  </td>
                  {activeTab === "blog" && (
                    <td className="px-4 py-3 text-sm text-text-secondary">
                      {item.category}
                    </td>
                  )}
                  <td className="px-4 py-3">
                    <Badge
                      variant={statusColors[item.status] || "info"}
                      size="sm"
                      className="capitalize"
                    >
                      {item.status || "draft"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-sm text-text-secondary width-8rem">
                    {item.updatedAt ? formatDate(item.updatedAt) : "-"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 width-max-content">
                      {canEdit && (
                        <button
                          className="p-2 sm:p-1.5 hover:bg-gray-100 rounded touch-manipulation"
                          onClick={() => openEdit(item)}
                          aria-label={t("common.edit")}
                        >
                          <Edit2 className="h-4 w-4 text-text-secondary" />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          className="p-2 sm:p-1.5 hover:bg-gray-100 rounded touch-manipulation"
                          onClick={() => deleteItem(item.id)}
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
      </div>

      {activeTab === "blog" && totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      )}

      <Modal
        isOpen={editModal}
        onClose={() => setEditModal(false)}
        title={
          editId ? t("admin.contentEditModal") : t("admin.contentCreateModal")
        }
      >
        <div className="space-y-4">
          <Input
            label={t("admin.contentTitle")}
            value={form.title}
            onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
          />
          <Input
            label={t("admin.contentSlug")}
            value={form.slug}
            onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value }))}
          />

          {activeTab === "blog" && (
            <Input
              label={t("admin.contentCategory")}
              value={form.category}
              onChange={(e) =>
                setForm((p) => ({ ...p, category: e.target.value }))
              }
            />
          )}

          <div>
            <label
              htmlFor="content-status"
              className="block text-sm font-medium text-text mb-1.5"
            >
              {t("admin.contentStatus")}
            </label>
            <select
              id="content-status"
              value={form.status}
              onChange={(e) =>
                setForm((p) => ({ ...p, status: e.target.value }))
              }
              className="w-full border border-border rounded-lg px-3 py-2.5 text-sm"
            >
              <option value="draft">{t("admin.contentDraft")}</option>
              <option value="published">{t("admin.contentPublished")}</option>
              <option value="scheduled">{t("admin.contentScheduled")}</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-text mb-1.5">
              {t("admin.contentBody")}
            </label>
            <div className="border border-border rounded-lg overflow-hidden">
              <div className="flex items-center gap-1 p-2 border-b border-border bg-gray-50">
                <button
                  type="button"
                  className="p-1.5 rounded hover:bg-white"
                  onClick={() => applyFormat("bold")}
                  aria-label="Bold"
                >
                  <Bold className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  className="p-1.5 rounded hover:bg-white"
                  onClick={() => applyFormat("italic")}
                  aria-label="Italic"
                >
                  <Italic className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  className="p-1.5 rounded hover:bg-white"
                  onClick={() => applyFormat("underline")}
                  aria-label="Underline"
                >
                  <Underline className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  className="p-1.5 rounded hover:bg-white"
                  onClick={() => applyFormat("insertUnorderedList")}
                  aria-label="Bullet list"
                >
                  <List className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  className="p-1.5 rounded hover:bg-white"
                  onClick={() => applyFormat("insertOrderedList")}
                  aria-label="Numbered list"
                >
                  <ListOrdered className="h-4 w-4" />
                </button>
              </div>

              <div
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                className="w-full px-3 py-2.5 text-sm min-h-[180px] focus:outline-none"
                onInput={handleEditorInput}
                role="textbox"
                aria-multiline="true"
                aria-label={t("admin.contentBody")}
              />
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              fullWidth
              onClick={() => setEditModal(false)}
            >
              {t("common.cancel")}
            </Button>
            <Button
              fullWidth
              onClick={saveItem}
              loading={updateSettings.isPending}
            >
              {t("common.save")}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
