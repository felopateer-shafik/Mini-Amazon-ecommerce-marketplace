import { memo, useMemo } from "react";
import { Link } from "react-router-dom";
import { X, Trash2, GitCompareArrows } from "lucide-react";
import { useUIStore } from "@/store/uiStore";
import { formatCurrency } from "@/lib/utils";
import StarRating from "@/components/ui/StarRating";
import Button from "@/components/ui/Button";

const ComparisonDrawer = memo(function ComparisonDrawer() {
  const { compareItems, removeFromCompare, clearCompare } = useUIStore();

  if (!compareItems || compareItems.length === 0) return null;

  const specs = useMemo(() => {
    const allKeys = new Set();
    compareItems.forEach((p) => {
      if (p.specs) Object.keys(p.specs).forEach((k) => allKeys.add(k));
    });
    return Array.from(allKeys);
  }, [compareItems]);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t-2 border-primary shadow-2xl transition-transform">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <GitCompareArrows className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-text text-sm">Compare Products ({compareItems.length}/4)</h3>
          </div>
          <div className="flex gap-2">
            <button onClick={clearCompare} className="text-xs text-danger hover:underline flex items-center gap-1">
              <Trash2 className="h-3 w-3" /> Clear All
            </button>
          </div>
        </div>

        <div className="flex gap-3 overflow-x-auto pb-1">
          {compareItems.map((product) => (
            <div key={product.id} className="flex-shrink-0 w-48 bg-gray-50 rounded-lg border border-border/50 p-2 relative group">
              <button
                onClick={() => removeFromCompare(product.id)}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-danger text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
              >
                <X className="h-3 w-3" />
              </button>
              <div className="flex gap-2 items-start">
                <img src={product.image} alt={product.name} loading="lazy" className="w-12 h-12 rounded object-cover flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-medium text-text line-clamp-2">{product.name}</p>
                  <p className="text-xs font-bold text-primary mt-0.5">{formatCurrency(product.price)}</p>
                  {product.rating && <StarRating rating={product.rating} size="xs" />}
                </div>
              </div>
            </div>
          ))}

          {/* Placeholder slots */}
          {Array.from({ length: 4 - compareItems.length }).map((_, i) => (
            <div key={`empty-${i}`} className="flex-shrink-0 w-48 bg-gray-50/50 rounded-lg border-2 border-dashed border-border/30 p-2 flex items-center justify-center min-h-[65px]">
              <p className="text-xs text-text-secondary">+ Add product</p>
            </div>
          ))}
        </div>

        {compareItems.length >= 2 && (
          <div className="flex justify-center mt-2">
            <Link to={`/compare?ids=${compareItems.map((p) => p.id).join(",")}`}>
              <Button size="sm" icon={GitCompareArrows}>Compare Now</Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
});

export default ComparisonDrawer;
