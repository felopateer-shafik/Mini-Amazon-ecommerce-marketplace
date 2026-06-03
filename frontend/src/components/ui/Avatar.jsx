import { cn } from "@/lib/utils";
import { getInitials } from "@/lib/utils";

const sizes = {
  xs: "h-6 w-6 text-xs",
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-12 w-12 text-base",
  xl: "h-16 w-16 text-lg",
  "2xl": "h-24 w-24 text-2xl",
};

export default function Avatar({ src, name, size = "md", className }) {
  if (src) {
    return (
      <img
        src={src}
        alt={name || "Avatar"}
        loading="lazy"
        className={cn("rounded-full object-cover", sizes[size], className)}
      />
    );
  }

  return (
    <div
      className={cn(
        "rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold",
        sizes[size],
        className,
      )}
    >
      {getInitials(name || "?")}
    </div>
  );
}
