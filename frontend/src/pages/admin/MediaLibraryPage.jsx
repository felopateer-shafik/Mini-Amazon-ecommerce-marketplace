import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "@/hooks/useTranslation";
import {
  Upload,
  Search,
  Grid,
  List,
  Trash2,
  Eye,
  Image,
  Film,
  FileText as FileIcon,
  Copy,
  Check,
  Plus,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Pagination from "@/components/ui/Pagination";
import toast from "react-hot-toast";
import {
  useAdminMedia,
  useAdminCreateMedia,
  useAdminDeleteMedia,
  useAdminBulkDeleteMedia,
} from "@/hooks/useApi";
import { useDebouncedValue } from "@/hooks/useDebounce";
import { usePermission } from "@/hooks/usePermission";

const typeIcons = { image: Image, video: Film, document: FileIcon };
const typeColors = {
  image: "text-blue-500",
  video: "text-purple-500",
  document: "text-yellow-600",
};

const EMPTY_UPLOAD = {
  name: "",
  type: "image",
  url: "",
};

const typeExtensions = {
  image: [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".bmp", ".avif"],
  video: [".mp4", ".webm", ".mov", ".avi", ".mkv", ".m4v"],
  document: [
    ".pdf",
    ".doc",
    ".docx",
    ".xls",
    ".xlsx",
    ".ppt",
    ".pptx",
    ".txt",
    ".csv",
  ],
};

export default function MediaLibraryPage() {
  const { t } = useTranslation();
  const { hasPerm } = usePermission();
  const canUpload = hasPerm("upload-media");
  const canDelete = hasPerm("delete-media");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [viewMode, setViewMode] = useState("grid");
  const [selected, setSelected] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [dragActive, setDragActive] = useState(false);
  const [viewMedia, setViewMedia] = useState(null);
  const [uploadModal, setUploadModal] = useState(false);
  const [uploadForm, setUploadForm] = useState(EMPTY_UPLOAD);
  const [uploadFile, setUploadFile] = useState(null);
  const uploadInputRef = useRef(null);
  const perPage = 24;

  const debouncedSearch = useDebouncedValue(search, 300);

  const mediaQuery = useAdminMedia({
    page: currentPage,
    per_page: perPage,
    search: debouncedSearch || undefined,
    type: typeFilter !== "all" ? typeFilter : undefined,
  });
  const createMedia = useAdminCreateMedia();
  const deleteMedia = useAdminDeleteMedia();
  const bulkDeleteMedia = useAdminBulkDeleteMedia();

  const media = mediaQuery.data?.data ?? [];
  const mediaMeta = mediaQuery.data?.meta ?? {
    current_page: 1,
    last_page: 1,
    total: media.length,
  };

  const filtered = useMemo(() => media, [media]);

  const totalPages = Math.max(1, Number(mediaMeta.last_page || 1));
  const paginated = useMemo(() => filtered, [filtered]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, typeFilter]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const toggleSelect = (id) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  const deleteSelected = async () => {
    if (
      !window.confirm(
        t("admin.mediaDeleteSelectedConfirm", { count: selected.length }),
      )
    )
      return;
    try {
      await bulkDeleteMedia.mutateAsync(selected);
      setSelected([]);
      toast.success(t("admin.mediaDeleted"));
    } catch {
      toast.error(t("admin.mediaDeleteSelectedFailed"));
    }
  };

  const addMedia = async () => {
    if (!uploadForm.name.trim()) {
      toast.error(t("admin.mediaNameRequired"));
      return;
    }

    if (!uploadFile && !uploadForm.url.trim()) {
      toast.error(t("admin.mediaSelectFileOrUrl"));
      return;
    }

    if (!uploadFile) {
      let parsed;
      try {
        parsed = new URL(uploadForm.url.trim());
        if (!["http:", "https:"].includes(parsed.protocol)) {
          toast.error(t("admin.mediaUrlProtocolError"));
          return;
        }
      } catch {
        toast.error(t("admin.mediaInvalidUrl"));
        return;
      }

      const pathname = (parsed?.pathname || "").toLowerCase();
      const allowedExtensions = typeExtensions[uploadForm.type] || [];
      const hasValidExtension = allowedExtensions.some((ext) =>
        pathname.endsWith(ext),
      );
      if (!hasValidExtension) {
        toast.error(t("admin.mediaTypeMismatch", { type: uploadForm.type }));
        return;
      }
    }

    try {
      if (uploadFile) {
        const formData = new FormData();
        formData.append("name", uploadForm.name.trim());
        formData.append("type", uploadForm.type);
        formData.append("file", uploadFile);
        await createMedia.mutateAsync(formData);
      } else {
        await createMedia.mutateAsync({
          name: uploadForm.name.trim(),
          type: uploadForm.type,
          url: uploadForm.url.trim(),
        });
      }
      setUploadModal(false);
      setUploadForm(EMPTY_UPLOAD);
      setUploadFile(null);
      toast.success(t("admin.mediaFileAdded"));
    } catch (err) {
      toast.error(err?.response?.data?.message || t("admin.mediaAddFailed"));
    }
  };

  const deleteOne = async (id) => {
    if (!window.confirm(t("admin.mediaDeleteConfirm"))) return;
    try {
      await deleteMedia.mutateAsync(id);
      setSelected((prev) => prev.filter((itemId) => itemId !== id));
      toast.success(t("admin.mediaDeleted"));
    } catch {
      toast.error(t("admin.mediaDeleteFailed"));
    }
  };

  const inferTypeFromFile = (file) => {
    const mime = String(file?.type || "").toLowerCase();
    if (mime.startsWith("image/")) return "image";
    if (mime.startsWith("video/")) return "video";
    return "document";
  };

  const uploadFiles = async (files) => {
    if (!files?.length) return;

    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append("name", file.name);
        formData.append("type", inferTypeFromFile(file));
        formData.append("file", file);
        await createMedia.mutateAsync(formData);
      }
      toast.success(t("admin.mediaFilesUploaded", { count: files.length }));
    } catch (err) {
      toast.error(
        err?.response?.data?.message || t("admin.mediaBulkUploadFailed"),
      );
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-text">
            {t("admin.mediaLibrary")}
          </h1>
          <p className="text-sm text-text-secondary">
            {t("admin.mediaFilesCount", {
              count: mediaMeta.total || media.length,
            })}
          </p>
        </div>
        <div className="flex gap-2">
          {canDelete && selected.length > 0 && (
            <Button
              variant="outline"
              className="!text-danger !border-danger"
              icon={Trash2}
              onClick={deleteSelected}
            >
              {t("common.delete")} ({selected.length})
            </Button>
          )}
          {canUpload && (
            <Button
              icon={Upload}
              onClick={() => setUploadModal(true)}
              loading={mediaQuery.isLoading}
            >
              {t("common.upload")}
            </Button>
          )}
        </div>
      </div>

      <div
        className={`bg-white p-4 rounded-xl border border-border/50 flex flex-col sm:flex-row gap-3 items-center ${dragActive ? "ring-2 ring-primary/40" : ""}`}
        onDragOver={(event) => {
          event.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragActive(false);
          const files = Array.from(event.dataTransfer?.files || []);
          uploadFiles(files);
        }}
      >
        <input
          ref={uploadInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(event) => {
            const files = Array.from(event.target.files || []);
            uploadFiles(files);
            event.target.value = "";
          }}
        />
        <div className="relative flex-1 width-8rem">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("admin.mediaSearchPlaceholder")}
            className="w-full ps-9 pe-4 py-2.5 border border-border rounded-lg text-sm focus:ring-1 focus:ring-primary outline-none"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {["all", "image", "video", "document"].map((tp) => (
            <button
              key={tp}
              onClick={() => setTypeFilter(tp)}
              className={`px-3 py-2 text-sm rounded-lg border capitalize transition ${typeFilter === tp ? "bg-primary text-white border-primary" : "border-border text-text-secondary"}`}
            >
              {tp}
            </button>
          ))}
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
          <button
            onClick={() => setViewMode("grid")}
            className={`p-2 rounded-md ${viewMode === "grid" ? "bg-white shadow-sm" : ""}`}
            aria-label="Grid view"
          >
            <Grid className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`p-2 rounded-md ${viewMode === "list" ? "bg-white shadow-sm" : ""}`}
            aria-label="List view"
          >
            <List className="h-4 w-4" />
          </button>
        </div>
        <Button
          variant="outline"
          icon={Upload}
          onClick={() => uploadInputRef.current?.click()}
          loading={createMedia.isPending}
        >
          {t("admin.mediaDropOrBrowse")}
        </Button>
      </div>

      {viewMode === "grid" ? (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {filtered.length === 0 && (
            <div className="col-span-full text-center py-16">
              <Image className="h-10 w-10 text-text-secondary mx-auto mb-3" />
              <p className="text-lg font-medium text-text-secondary mb-1">
                {t("admin.mediaNoFilesTitle")}
              </p>
              <p className="text-sm text-text-secondary">
                {t("admin.mediaNoFilesSubtitle")}
              </p>
            </div>
          )}
          {paginated.map((m) => {
            const Icon = typeIcons[m.type] || FileIcon;
            return (
              <div
                key={m.id}
                className={`bg-white rounded-xl border ${selected.includes(m.id) ? "border-primary ring-2 ring-primary/20" : "border-border/50"} overflow-hidden group relative cursor-pointer`}
                onClick={() => toggleSelect(m.id)}
              >
                <div className="aspect-square bg-gray-50 flex items-center justify-center relative overflow-hidden">
                  {m.type === "image" ? (
                    <img
                      src={m.url}
                      alt=""
                      loading="lazy"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Icon
                      className={`h-10 w-10 ${typeColors[m.type] || "text-text-secondary"}`}
                    />
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <button
                      className="p-2 bg-white rounded-full shadow"
                      onClick={(e) => {
                        e.stopPropagation();
                        setViewMedia(m);
                      }}
                      aria-label="View"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  </div>
                  {selected.includes(m.id) && (
                    <div className="absolute top-2 left-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                      <Check className="h-4 w-4 text-white" />
                    </div>
                  )}
                </div>
                <div className="p-2">
                  <p className="text-xs font-medium text-text truncate">
                    {m.name}
                  </p>
                  <p className="text-xs text-text-secondary">{m.size}</p>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-border/50 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-border/50">
                <th className="text-left text-xs font-medium text-text-secondary px-4 py-3 w-8"></th>
                <th className="text-left text-xs font-medium text-text-secondary px-4 py-3">
                  {t("admin.mediaColName")}
                </th>
                <th className="text-left text-xs font-medium text-text-secondary px-4 py-3">
                  {t("admin.mediaColType")}
                </th>
                <th className="text-left text-xs font-medium text-text-secondary px-4 py-3">
                  {t("admin.mediaColSize")}
                </th>
                <th className="text-left text-xs font-medium text-text-secondary px-4 py-3">
                  {t("common.actions")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {paginated.map((m) => {
                const Icon = typeIcons[m.type] || FileIcon;
                return (
                  <tr key={m.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        className="rounded"
                        checked={selected.includes(m.id)}
                        onChange={() => toggleSelect(m.id)}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Icon
                          className={`h-5 w-5 ${typeColors[m.type] || "text-text-secondary"}`}
                        />
                        <span className="text-sm text-text">{m.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-text-secondary capitalize">
                      {m.type}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-secondary">
                      {m.size}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button
                          className="p-2 sm:p-1.5 hover:bg-gray-100 rounded touch-manipulation"
                          onClick={() => setViewMedia(m)}
                          aria-label="View"
                        >
                          <Eye className="h-4 w-4 text-text-secondary" />
                        </button>
                        <button
                          className="p-2 sm:p-1.5 hover:bg-gray-100 rounded touch-manipulation"
                          onClick={() => {
                            navigator.clipboard?.writeText(m.url);
                            toast.success(t("admin.mediaCopiedUrl"));
                          }}
                          aria-label="Copy"
                        >
                          <Copy className="h-4 w-4 text-text-secondary" />
                        </button>
                        {canDelete && (
                          <button
                            className="p-2 sm:p-1.5 hover:bg-gray-100 rounded touch-manipulation"
                            onClick={() => deleteOne(m.id)}
                            aria-label="Delete"
                          >
                            <Trash2 className="h-4 w-4 text-text-secondary hover:text-danger" />
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
      )}

      {filtered.length > 0 && totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      )}

      <Modal
        isOpen={!!viewMedia}
        onClose={() => setViewMedia(null)}
        title={viewMedia?.name}
      >
        {viewMedia && (
          <div className="space-y-4">
            {viewMedia.type === "image" && (
              <img
                src={viewMedia.url}
                alt=""
                loading="lazy"
                className="w-full rounded-lg"
              />
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-text-secondary">
                  {t("admin.mediaTypeLabel")}
                </p>
                <p className="text-sm font-medium capitalize">
                  {viewMedia.type}
                </p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-text-secondary">
                  {t("admin.mediaSizeLabel")}
                </p>
                <p className="text-sm font-medium">{viewMedia.size}</p>
              </div>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-text-secondary mb-1">
                {t("admin.mediaUrlLabel")}
              </p>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={viewMedia.url}
                  className="flex-1 text-xs bg-white border border-border rounded px-2 py-1"
                />
                <button
                  className="px-2 py-1 text-xs bg-primary text-white rounded"
                  onClick={() => {
                    navigator.clipboard?.writeText(viewMedia.url);
                    toast.success(t("admin.mediaCopied"));
                  }}
                >
                  {t("admin.mediaCopyBtn")}
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={uploadModal}
        onClose={() => setUploadModal(false)}
        title={t("admin.mediaAddItem")}
      >
        <div className="space-y-4">
          <Input
            label={t("common.name")}
            value={uploadForm.name}
            onChange={(e) =>
              setUploadForm((p) => ({ ...p, name: e.target.value }))
            }
          />

          <div>
            <label className="block text-sm font-medium text-text mb-1.5">
              {t("admin.mediaFileUploadLabel")}
            </label>
            <input
              type="file"
              className="w-full border border-border rounded-lg px-3 py-2.5 text-sm"
              onChange={(e) => {
                const file = e.target.files?.[0] || null;
                setUploadFile(file);

                if (file && !uploadForm.name.trim()) {
                  setUploadForm((p) => ({ ...p, name: file.name }));
                }

                if (file) {
                  const mime = (file.type || "").toLowerCase();
                  const inferredType = mime.startsWith("image/")
                    ? "image"
                    : mime.startsWith("video/")
                      ? "video"
                      : "document";
                  setUploadForm((p) => ({ ...p, type: inferredType, url: "" }));
                }
              }}
            />
            <p className="text-xs text-text-secondary mt-1">
              {t("admin.mediaUploadHint")}
            </p>
          </div>

          <Input
            label={t("admin.mediaUrlOptional")}
            value={uploadForm.url}
            onChange={(e) => {
              setUploadForm((p) => ({ ...p, url: e.target.value }));
              if (e.target.value.trim()) setUploadFile(null);
            }}
            disabled={!!uploadFile}
          />

          <div>
            <label className="block text-sm font-medium text-text mb-1.5">
              {t("common.type")}
            </label>
            <select
              value={uploadForm.type}
              onChange={(e) =>
                setUploadForm((p) => ({ ...p, type: e.target.value }))
              }
              className="w-full border border-border rounded-lg px-3 py-2.5 text-sm"
            >
              <option value="image">{t("admin.mediaTypeImage")}</option>
              <option value="video">{t("admin.mediaTypeVideo")}</option>
              <option value="document">{t("admin.mediaTypeDocument")}</option>
            </select>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              fullWidth
              onClick={() => {
                setUploadModal(false);
                setUploadFile(null);
              }}
            >
              {t("common.cancel")}
            </Button>
            <Button
              icon={Plus}
              fullWidth
              onClick={addMedia}
              loading={createMedia.isPending}
            >
              {t("common.add")}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
