import { useDropzone } from "react-dropzone";
import { Upload, X, Image as ImageIcon, FileText, Film } from "lucide-react";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

const IMAGE_MAX_SIZE = 10 * 1024 * 1024; // 10 MB
const VIDEO_MAX_SIZE = 200 * 1024 * 1024; // 200 MB

export default function FileUpload({
  onDrop,
  files = [],
  onRemove,
  onReorder,
  accept,
  maxFiles = 5,
  label,
  error,
  className,
}) {
  const moveFile = (fromIndex, toIndex) => {
    if (!onReorder || fromIndex === toIndex || fromIndex < 0 || toIndex < 0)
      return;
    onReorder(fromIndex, toIndex);
  };

  const handleDrop = (accepted, rejected) => {
    if (rejected?.length > 0) {
      rejected.forEach(({ file, errors }) => {
        errors.forEach((err) => {
          if (err.code === "file-too-large") {
            const isVideo = file.type?.startsWith("video/");
            const limit = isVideo ? "200 MB" : "10 MB";
            toast.error(`"${file.name}" exceeds the ${limit} size limit.`);
          } else if (err.code === "file-invalid-type") {
            toast.error(`"${file.name}" is not an accepted file type.`);
          } else {
            toast.error(`"${file.name}": ${err.message}`);
          }
        });
      });
    }
    if (accepted?.length > 0) {
      onDrop?.(accepted);
    }
  };

  const validator = (file) => {
    const isVideo = file.type?.startsWith("video/");
    const maxSize = isVideo ? VIDEO_MAX_SIZE : IMAGE_MAX_SIZE;
    if (file.size > maxSize) {
      return {
        code: "file-too-large",
        message: `File exceeds the ${isVideo ? "200 MB" : "10 MB"} size limit.`,
      };
    }
    return null;
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleDrop,
    accept,
    maxFiles,
    validator,
  });

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-text mb-1.5">
          {label}
        </label>
      )}
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors",
          isDragActive
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50",
          error && "border-danger",
        )}
      >
        <input {...getInputProps()} />
        <Upload className="h-8 w-8 text-text-light mx-auto mb-2" />
        <p className="text-sm text-text-secondary">
          {isDragActive
            ? "Drop files here..."
            : "Drag & drop files here, or click to browse"}
        </p>
        <p className="text-xs text-text-light mt-1">
          Max {maxFiles} files &bull; Images up to 10 MB &bull; Videos up to 200
          MB
        </p>
      </div>
      {files.length > 0 && (
        <div className="mt-3 space-y-2">
          {files.map((file, index) => (
            <div
              key={index}
              className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg"
              draggable={!!onReorder}
              onDragStart={(event) => {
                event.dataTransfer.setData("text/plain", String(index));
              }}
              onDragOver={(event) => {
                if (!onReorder) return;
                event.preventDefault();
              }}
              onDrop={(event) => {
                if (!onReorder) return;
                event.preventDefault();
                const fromIndex = Number(
                  event.dataTransfer.getData("text/plain"),
                );
                moveFile(fromIndex, index);
              }}
            >
              {file.type?.startsWith("video/") ? (
                <Film className="h-4 w-4 text-text-secondary" />
              ) : file.type?.startsWith("image/") ? (
                <ImageIcon className="h-4 w-4 text-text-secondary" />
              ) : (
                <FileText className="h-4 w-4 text-text-secondary" />
              )}
              <span className="text-sm text-text flex-1 truncate">
                {file.name}
              </span>
              <button
                onClick={() => onRemove?.(index)}
                className="p-1 hover:bg-gray-200 rounded"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  );
}
