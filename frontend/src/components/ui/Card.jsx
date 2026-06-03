import { cn } from "@/lib/utils";

export default function Card({
  children,
  className,
  padding = true,
  hover,
  onClick,
  ...props
}) {
  return (
    <div
      className={cn(
        "bg-white rounded-xl border border-border/50 shadow-sm",
        padding && "p-3 sm:p-5",
        hover && "hover:shadow-md transition-shadow cursor-pointer",
        className,
      )}
      onClick={onClick}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className }) {
  return <div className={cn("mb-4", className)}>{children}</div>;
}

export function CardTitle({ children, className }) {
  return (
    <h3 className={cn("text-lg font-semibold text-text", className)}>
      {children}
    </h3>
  );
}

export function CardDescription({ children, className }) {
  return (
    <p className={cn("text-sm text-text-secondary mt-1", className)}>
      {children}
    </p>
  );
}
