import { memo, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, Eye } from "lucide-react";
import { useUIStore } from "@/store/uiStore";
import { formatCurrency } from "@/lib/utils";
import StarRating from "@/components/ui/StarRating";
import { productService } from "@/api/services";

const RecentlyViewedBar = memo(function RecentlyViewedBar() {
  const { recentlyViewed, removeRecentlyViewed } = useUIStore();
  const scrollRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    const validateItems = async () => {
      const items = Array.isArray(recentlyViewed) ? recentlyViewed : [];
      for (const item of items) {
        if (!item?.slug || !item?.id) continue;
        try {
          await productService.detail(item.slug);
        } catch {
          if (!cancelled) {
            removeRecentlyViewed(item.id);
          }
        }
      }
    };

    if (recentlyViewed?.length) {
      validateItems();
    }

    return () => {
      cancelled = true;
    };
  }, [recentlyViewed, removeRecentlyViewed]);

  if (!recentlyViewed || recentlyViewed.length === 0) return null;

  const scroll = (dir) => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: dir * 220, behavior: "smooth" });
    }
  };

  return (
    <section className="mx-4 mt-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Eye className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold text-text">Your Browsing History</h2>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => scroll(-1)}
            className="p-1.5 rounded-full border border-border hover:bg-gray-50 transition"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => scroll(1)}
            className="p-1.5 rounded-full border border-border hover:bg-gray-50 transition"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto scrollbar-hide pb-2"
        style={{ scrollbarWidth: "none" }}
      >
        {recentlyViewed.map((product) => (
          <Link
            key={product.id}
            to={`/product/${product.slug}`}
            className="flex-shrink-0 w-[160px] group bg-white rounded-lg border border-border/50 hover:shadow-md transition overflow-hidden"
          >
            <div className="aspect-square bg-gray-50">
              <img
                src={product.image}
                alt={product.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                loading="lazy"
              />
            </div>
            <div className="p-2">
              <h3 className="text-xs font-medium text-text line-clamp-2">
                {product.name}
              </h3>
              <div className="mt-1 flex items-center gap-1">
                <StarRating
                  rating={Number(product.rating || 0)}
                  size="sm"
                  count={Number(product.reviewCount || 0)}
                />
              </div>
              <p className="text-sm font-bold text-primary mt-1">
                {formatCurrency(product.price)}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
});

export default RecentlyViewedBar;
