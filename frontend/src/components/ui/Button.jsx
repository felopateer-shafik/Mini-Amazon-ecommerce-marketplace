import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

const variants = {
  primary: "bg-primary hover:bg-primary-dark text-white",
  secondary: "bg-secondary hover:bg-secondary-dark text-white",
  accent: "bg-accent hover:bg-blue-700 text-white",
  success: "bg-success hover:bg-green-700 text-white",
  danger: "bg-danger hover:bg-red-700 text-white",
  warning: "bg-warning hover:bg-yellow-600 text-white",
  outline:
    "border-2 border-primary text-primary hover:bg-primary hover:text-white",
  ghost: "text-text hover:bg-gray-100",
  link: "text-accent hover:underline",
};

const sizes = {
  xs: "px-2 py-1 text-[10px] sm:text-xs",
  sm: "px-2.5 py-1.5 sm:px-3 sm:py-1.5 text-xs sm:text-sm",
  md: "px-3 py-1.5 sm:px-4 sm:py-2 text-sm",
  lg: "px-4 py-2 sm:px-6 sm:py-3 text-sm sm:text-base",
  xl: "px-6 py-3 sm:px-8 sm:py-4 text-base sm:text-lg",
};

export default function Button({
  children,
  variant = "primary",
  size = "md",
  className,
  loading,
  disabled,
  icon: Icon,
  iconPosition = "left",
  fullWidth,
  type = "button",
  ...props
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50 disabled:cursor-not-allowed",
        variants[variant],
        sizes[size],
        fullWidth && "w-full",
        className,
      )}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {!loading && Icon && iconPosition === "left" && (
        <Icon className="h-4 w-4" />
      )}
      {children}
      {!loading && Icon && iconPosition === "right" && (
        <Icon className="h-4 w-4" />
      )}
    </button>
  );
}
