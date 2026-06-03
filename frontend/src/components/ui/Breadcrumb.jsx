import { Link } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Breadcrumb({ items = [], className }) {
  return (
    <nav className={cn("flex items-center gap-1 text-sm", className)}>
      <Link
        to="/"
        className="text-text-secondary hover:text-primary flex items-center gap-1"
      >
        <Home className="h-3.5 w-3.5" />
      </Link>
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-1">
          <ChevronRight className="h-3.5 w-3.5 text-text-light" />
          {index === items.length - 1 ? (
            <span className="text-text font-medium">{item.label}</span>
          ) : (
            <Link
              to={item.href}
              className="text-text-secondary hover:text-primary"
            >
              {item.label}
            </Link>
          )}
        </div>
      ))}
    </nav>
  );
}
