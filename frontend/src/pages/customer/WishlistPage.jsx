import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Heart,
  ShoppingCart,
  Trash2,
  Grid3X3,
  List,
  Share2,
  Loader2,
} from "lucide-react";
import Button from "@/components/ui/Button";
import StarRating from "@/components/ui/StarRating";
import Breadcrumb from "@/components/ui/Breadcrumb";
import { useCartStore } from "@/store/cartStore";
import { formatCurrency, calculateDiscount } from "@/lib/utils";
import { useTranslation } from "@/hooks/useTranslation";
import { useWishlist, useRemoveFromWishlist } from "@/hooks/useApi";

export default function WishlistPage() {
  const { t } = useTranslation();
  const [viewMode, setViewMode] = useState("grid");
  const { addItem } = useCartStore();

  // Fetch wishlist from API
  const { data: wishlistResponse, isLoading } = useWishlist();
  const removeFromWishlistMutation = useRemoveFromWishlist();

  const apiItems = (() => {
    const d = wishlistResponse?.data;
    if (Array.isArray(d)) return d;
    if (Array.isArray(d?.data)) return d.data;
    return [];
  })();

  const items = apiItems.map((w) => {
    const p = w.product || w;
    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      price: parseFloat(p.price),
      originalPrice: p.compare_price
        ? parseFloat(p.compare_price)
        : parseFloat(p.price),
      rating: parseFloat(p.rating || 4),
      reviewCount: p.reviews_count || 0,
      image:
        (() => {
          let imgs = p.images;
          if (typeof imgs === "string")
            try {
              imgs = JSON.parse(imgs);
            } catch {
              imgs = [];
            }
          return Array.isArray(imgs) ? imgs[0] : null;
        })() ||
        p.thumbnail ||
        p.image ||
        `https://placehold.co/300x300/f0f0f0/333?text=${encodeURIComponent(p.name?.slice(0, 8) || "Product")}`,
      merchant: { name: p.vendor?.store_name || "Store" },
      inStock: (p.stock ?? 1) > 0,
      addedAt: w.created_at || new Date().toISOString(),
    };
  });

  const removeFromWishlist = (id) => {
    removeFromWishlistMutation.mutate(id);
  };

  const moveToCart = (product) => {
    addItem({
      id: product.id,
      name: product.name,
      slug: product.slug,
      price: product.price,
      image: product.image,
      quantity: 1,
      merchant: product.merchant.name,
    });
    removeFromWishlist(product.id);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <Breadcrumb
        items={[
          { label: t("common.home"), href: "/" },
          { label: t("wishlist.myWishlist") },
        ]}
      />
      <div className="flex items-center justify-between mt-4 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-text flex items-center gap-2">
            <Heart className="h-6 w-6 text-danger" /> {t("wishlist.myWishlist")}
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            {t("wishlist.itemsSaved", { count: items.length })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" icon={Share2}>
            {t("common.share")}
          </Button>
          <div className="border border-border rounded-lg overflow-hidden flex">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2 ${viewMode === "grid" ? "bg-primary text-white" : "bg-white"}`}
              aria-label="Grid view"
            >
              <Grid3X3 className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-2 ${viewMode === "list" ? "bg-primary text-white" : "bg-white"}`}
              aria-label="List view"
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-16">
          <Heart className="h-20 w-20 text-gray-200 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-text mb-2">
            {t("wishlist.emptyWishlist")}
          </h2>
          <p className="text-text-secondary mb-4">
            {t("wishlist.emptyWishlistDescription")}
          </p>
          <Link to="/products">
            <Button>{t("wishlist.browseProducts")}</Button>
          </Link>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {items.map((item) => {
            const discount = calculateDiscount(item.originalPrice, item.price);
            return (
              <div
                key={item.id}
                className="bg-white rounded-lg border border-border/50 overflow-hidden group"
              >
                <Link
                  to={`/product/${item.slug}`}
                  className="block relative aspect-square bg-gray-50"
                >
                  <img
                    src={item.image}
                    alt={item.name}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                  {discount > 0 && (
                    <span className="absolute top-2 right-2 bg-danger text-white text-xs font-bold px-2 py-0.5 rounded">
                      -{discount}%
                    </span>
                  )}
                  {!item.inStock && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <span className="bg-white text-text font-medium px-3 py-1 rounded text-sm">
                        {t("common.outOfStock")}
                      </span>
                    </div>
                  )}
                </Link>
                <div className="p-3">
                  <Link to={`/product/${item.slug}`}>
                    <h3 className="text-sm font-medium text-text line-clamp-2 hover:text-accent">
                      {item.name}
                    </h3>
                  </Link>
                  <StarRating rating={item.rating} size="sm" />
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-base font-bold text-primary">
                      {formatCurrency(item.price)}
                    </span>
                    {item.originalPrice > item.price && (
                      <span className="text-xs text-text-secondary line-through">
                        {formatCurrency(item.originalPrice)}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Button
                      size="sm"
                      onClick={() => moveToCart(item)}
                      icon={ShoppingCart}
                      className="flex-1"
                      disabled={!item.inStock}
                    >
                      {t("productDetail.addToCart")}
                    </Button>
                    <button
                      onClick={() => removeFromWishlist(item.id)}
                      className="p-2 border border-border rounded-lg text-text-secondary hover:text-danger hover:border-danger transition"
                      aria-label="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-lg border border-border/50 p-4 flex gap-4"
            >
              <Link
                to={`/product/${item.slug}`}
                className="w-24 h-24 rounded-lg overflow-hidden bg-gray-50 flex-shrink-0"
              >
                <img
                  src={item.image}
                  alt={item.name}
                  loading="lazy"
                  className="w-full h-full object-cover"
                />
              </Link>
              <div className="flex-1">
                <Link to={`/product/${item.slug}`}>
                  <h3 className="font-medium text-text hover:text-accent">
                    {item.name}
                  </h3>
                </Link>
                <StarRating rating={item.rating} size="sm" />
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-lg font-bold text-primary">
                    {formatCurrency(item.price)}
                  </span>
                  {item.originalPrice > item.price && (
                    <span className="text-sm text-text-secondary line-through">
                      {formatCurrency(item.originalPrice)}
                    </span>
                  )}
                </div>
                <p className="text-xs text-text-secondary mt-1">
                  {item.merchant.name} •{" "}
                  {item.inStock ? (
                    <span className="text-success">{t("common.inStock")}</span>
                  ) : (
                    <span className="text-danger">
                      {t("common.outOfStock")}
                    </span>
                  )}
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <Button
                  size="sm"
                  onClick={() => moveToCart(item)}
                  icon={ShoppingCart}
                  disabled={!item.inStock}
                >
                  {t("productDetail.addToCart")}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFromWishlist(item.id)}
                  className="text-danger"
                >
                  Remove
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
