import { cn } from "@/lib/utils";

const variants = {
  default: "bg-gray-100 text-gray-800",
  primary: "bg-primary/10 text-primary-dark",
  success: "bg-green-100 text-green-800",
  warning: "bg-yellow-100 text-yellow-800",
  danger: "bg-red-100 text-red-800",
  info: "bg-blue-100 text-blue-800",
};

export default function Badge({
  children,
  variant = "default",
  className,
  dot,
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium",
        variants[variant],
        className,
      )}
    >
      {dot && (
        <span
          className={cn(
            "w-1.5 h-1.5 rounded-full",
            variant === "success"
              ? "bg-green-500"
              : variant === "danger"
                ? "bg-red-500"
                : variant === "warning"
                  ? "bg-yellow-500"
                  : "bg-gray-500",
          )}
        />
      )}
      {children}
    </span>
  );
}
