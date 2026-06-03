import { cn } from "@/lib/utils";
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";

export default function Table({ children, className }) {
  return (
    <div className="w-full overflow-x-auto rounded-xl border border-border/50">
      <table className={cn("w-full text-sm", className)}>{children}</table>
    </div>
  );
}

export function Thead({ children }) {
  return (
    <thead className="bg-gray-50 border-b border-border">{children}</thead>
  );
}

export function Th({ children, className, sortable, sortDir, onSort }) {
  return (
    <th
      className={cn(
        "px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider",
        sortable && "cursor-pointer select-none hover:text-text",
        className,
      )}
      onClick={sortable ? onSort : undefined}
    >
      <div className="flex items-center gap-1">
        {children}
        {sortable && (
          <span className="ml-1">
            {sortDir === "asc" ? (
              <ChevronUp className="h-3 w-3" />
            ) : sortDir === "desc" ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronsUpDown className="h-3 w-3 opacity-40" />
            )}
          </span>
        )}
      </div>
    </th>
  );
}

export function Tbody({ children }) {
  return <tbody className="divide-y divide-border/50">{children}</tbody>;
}

export function Tr({ children, className, onClick }) {
  return (
    <tr
      className={cn(
        "hover:bg-gray-50/50 transition-colors",
        onClick && "cursor-pointer",
        className,
      )}
      onClick={onClick}
    >
      {children}
    </tr>
  );
}

export function Td({ children, className }) {
  return (
    <td className={cn("px-4 py-3 text-text whitespace-nowrap", className)}>
      {children}
    </td>
  );
}
