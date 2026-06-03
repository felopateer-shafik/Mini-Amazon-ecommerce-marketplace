import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";

export default function StatsCard({
  title,
  value,
  icon: Icon,
  change,
  changeType,
  subtitle,
  className,
}) {
  return (
    <div
      className={cn(
        "bg-white rounded-xl border border-border/50 p-3 sm:p-5 shadow-sm",
        className,
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-text-secondary">{title}</p>
          <p className="text-lg sm:text-2xl font-bold text-text mt-1">
            {value}
          </p>
          {change && (
            <div
              className={cn(
                "flex items-center gap-1 mt-2 text-xs font-medium",
                changeType === "positive" ? "text-success" : "text-danger",
              )}
            >
              {changeType === "positive" ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              {change}
            </div>
          )}
          {subtitle && (
            <p className="text-xs text-text-light mt-1">{subtitle}</p>
          )}
        </div>
        {Icon && (
          <div className="p-3 bg-primary/10 rounded-xl">
            <Icon className="h-6 w-6 text-primary" />
          </div>
        )}
      </div>
    </div>
  );
}
