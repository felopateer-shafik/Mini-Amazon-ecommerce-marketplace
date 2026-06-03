import { useState, useEffect, useMemo, memo } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "@/hooks/useTranslation";
import { useSEO } from "@/hooks/useSEO";
import {
  useCategories,
  useFeaturedProducts,
  useProducts,
  usePublicSettings,
} from "@/hooks/useApi";
import {
  ChevronLeft,
  ChevronRight,
  Zap,
  Truck,
  Shield,
  Clock,
  Gift,
  Star,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import StarRating from "@/components/ui/StarRating";
import {
  ProductGridSkeleton,
  CategorySkeleton,
} from "@/components/ui/Skeleton";
import { formatCurrency, calculateDiscount } from "@/lib/utils";

const heroSlides = [
  {
    id: 1,
    titleKey: "home.heroSlide1Title",
    subtitleKey: "home.heroSlide1Subtitle",
    image:
      "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1400&h=500&fit=crop&q=80",
    ctaKey: "common.shopNow",
    link: "/products?sale=summer",
  },
  {
    id: 2,
    titleKey: "home.heroSlide2Title",
    subtitleKey: "home.heroSlide2Subtitle",
    image:
      "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1400&h=500&fit=crop&q=80",
    ctaKey: "common.explore",
    link: "/products?new=true",
  },
  {
    id: 3,
    titleKey: "home.heroSlide3Title",
    subtitleKey: "home.heroSlide3Subtitle",
    image:
      "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1400&h=500&fit=crop&q=80",
    ctaKey: "common.learnMore",
    link: "/shipping",
  },
];

function ProductCard({ product }) {
  const { t } = useTranslation();
  const discount = calculateDiscount(product.originalPrice, product.price);
  return (
    <Link
      to={`/product/${product.slug}`}
      className="group bg-white rounded-lg border border-border/50 hover:shadow-lg transition-all duration-300 overflow-hidden"
    >
      <div className="relative aspect-square bg-gray-50 overflow-hidden">
        <img
          src={product.image}
          alt={product.name}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        {product.badge && (
          <span
            className={`absolute top-2 left-2 px-2 py-0.5 text-xs font-semibold rounded ${product.badge === "Flash Deal" ? "bg-danger text-white" : product.badge === "Best Seller" ? "bg-primary text-white" : "bg-accent text-white"}`}
          >
            {product.badge}
          </span>
        )}
        {discount > 0 && (
          <span className="absolute top-2 right-2 bg-danger text-white text-xs font-bold px-2 py-0.5 rounded">
            -{discount}%
          </span>
        )}
        {!product.inStock && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <span className="bg-white text-text font-medium px-3 py-1 rounded text-sm">
              {t("common.outOfStock")}
            </span>
          </div>
        )}
      </div>
      <div className="p-3">
        <p className="text-xs text-text-secondary mb-1">
          {product.merchant.name}
        </p>
        <h3 className="text-sm font-medium text-text line-clamp-2 group-hover:text-accent transition-colors">
          {product.name}
        </h3>
        <div className="flex items-center gap-1 mt-1">
          <StarRating rating={Number(product.rating || 0)} size="sm" />
          <span className="text-xs text-text-secondary">
            ({product.reviewCount})
          </span>
        </div>
        <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1 min-w-0">
          <span className="text-base sm:text-lg font-bold text-primary whitespace-nowrap">
            {formatCurrency(product.price)}
          </span>
          {product.originalPrice > product.price && (
            <span className="text-sm text-text-secondary line-through whitespace-nowrap">
              {formatCurrency(product.originalPrice)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

function CountdownTimer({ endsAt, onExpire }) {
  const [timeLeft, setTimeLeft] = useState({});
  useEffect(() => {
    const tick = () => {
      const diff = new Date(endsAt) - new Date();
      if (diff <= 0) {
        setTimeLeft(null);
        onExpire?.();
        return;
      }
      setTimeLeft({
        h: Math.floor(diff / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
        s: Math.floor((diff % 60000) / 1000),
      });
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [endsAt, onExpire]);

  if (!timeLeft) return null;
  return (
    <div className="flex gap-1">
      {["h", "m", "s"].map((u) => (
        <span
          key={u}
          className="bg-secondary text-white text-xs font-mono px-1.5 py-0.5 rounded"
        >
          {String(timeLeft[u] || 0).padStart(2, "0")}
        </span>
      ))}
    </div>
  );
}

export default function HomePage() {
  const { t } = useTranslation();
  useSEO({
    title: "Mini Amazon - Shop the Best Deals Online",
    description:
      "Discover thousands of products from trusted sellers. Electronics, fashion, home goods, and more at unbeatable prices. Free shipping on eligible orders.",
    canonical: "/",
  });
  const [currentSlide, setCurrentSlide] = useState(0);
  const [flashDealsExpired, setFlashDealsExpired] = useState(false);

  // Fetch real data from API
  const { data: publicSettingsRes } = usePublicSettings();
  const publicSettings = publicSettingsRes?.data ?? publicSettingsRes ?? {};

  const flashDealsEnabled = !!publicSettings?.flash_deals_enabled;
  const newsletterEnabled = !!publicSettings?.newsletter_enabled;
  const campaignsEnabled = !!publicSettings?.campaigns_enabled;

  // Use admin-configured end time; fall back to a 10-hour window persisted in
  // localStorage so the timer survives page refreshes.
  const flashDealEndTime = useMemo(() => {
    if (publicSettings?.flash_deals_end_time) {
      return new Date(publicSettings.flash_deals_end_time);
    }
    const stored = localStorage.getItem("flash_deal_end_time");
    if (stored) {
      const t = new Date(stored);
      if (t > new Date()) return t;
    }
    const end = new Date(Date.now() + 36000000);
    localStorage.setItem("flash_deal_end_time", end.toISOString());
    return end;
  }, [publicSettings?.flash_deals_end_time]);

  // Fetch real data from API
  const { data: categoriesData, isLoading: categoriesLoading } =
    useCategories();
  const { data: featuredData, isLoading: featuredLoading } =
    useFeaturedProducts();
  const { data: productsData, isLoading: productsLoading } = useProducts({
    per_page: 12,
  });
  const { data: saleData, isLoading: saleLoading } = useProducts({
    on_sale: true,
    per_page: 4,
  });
  const { data: trendingData, isLoading: trendingLoading } = useProducts({
    sort: "-sold_count",
    per_page: 6,
  });

  // Helper: extract array from possibly-paginated API response
  const toArray = (d) => {
    if (!d) return [];
    if (Array.isArray(d)) return d;
    if (Array.isArray(d?.data)) return d.data;
    return [];
  };

  const mapProduct = (p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    price: parseFloat(p.price),
    originalPrice: p.compare_price
      ? parseFloat(p.compare_price)
      : parseFloat(p.price),
    rating: Number(p.rating ?? p.average_rating ?? 0),
    reviewCount: p.review_count || p.reviews_count || 0,
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
      `https://placehold.co/300x300/f0f0f0/333?text=${encodeURIComponent(p.name?.slice(0, 10) || "Product")}`,
    merchant: {
      name: p.vendor?.store_name || "Store",
      slug: p.vendor?.slug || "store",
    },
    badge: p.is_featured ? "Featured" : null,
    inStock: (p.stock ?? 1) > 0,
  });

  const displayCategories = toArray(categoriesData?.data).map((c) => ({
    id: c.id,
    nameKey: c.name,
    nameRaw: true,
    image: c.image || null,
    slug: c.slug,
    count: c.products_count || 0,
  }));

  const displayProducts = (
    toArray(featuredData?.data).length
      ? toArray(featuredData?.data)
      : toArray(productsData?.data)
  ).map(mapProduct);

  const displayFlashDeals = toArray(saleData?.data).map((p) => ({
    ...mapProduct(p),
    endsAt: new Date(Date.now() + 3600000 * (Math.random() * 10 + 2)),
    badge: "Flash Deal",
  }));

  const displayTrending = toArray(trendingData?.data).map(mapProduct);

  useEffect(() => {
    const timer = setInterval(
      () => setCurrentSlide((s) => (s + 1) % heroSlides.length),
      5000,
    );
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8 pb-4 sm:pb-8">
      {/* Hero Banner */}
      <section className="relative rounded-xl overflow-hidden mx-4 mt-4">
        <div className="relative h-[200px] sm:h-[300px] md:h-[400px]">
          {heroSlides.map((slide, i) => (
            <div
              key={slide.id}
              className={`absolute inset-0 transition-opacity duration-700 ${i === currentSlide ? "opacity-100" : "opacity-0 pointer-events-none"}`}
            >
              <img
                src={slide.image}
                alt={slide.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-black/50 to-transparent flex items-center">
                <div className="text-white px-4 sm:px-8 md:px-16">
                  <h2 className="text-xl sm:text-2xl md:text-4xl font-bold">
                    {t(slide.titleKey)}
                  </h2>
                  <p className="text-sm md:text-lg opacity-90 mt-2">
                    {t(slide.subtitleKey)}
                  </p>
                  <Link to={slide.link}>
                    <Button className="mt-4">{t(slide.ctaKey)}</Button>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
        <button
          onClick={() =>
            setCurrentSlide(
              (currentSlide - 1 + heroSlides.length) % heroSlides.length,
            )
          }
          className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 hover:bg-white rounded-full flex items-center justify-center shadow"
          aria-label="Previous"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          onClick={() =>
            setCurrentSlide((currentSlide + 1) % heroSlides.length)
          }
          className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 hover:bg-white rounded-full flex items-center justify-center shadow"
          aria-label="Next"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
          {heroSlides.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentSlide(i)}
              className={`w-2.5 h-2.5 rounded-full transition ${i === currentSlide ? "bg-white w-6" : "bg-white/50"}`}
            />
          ))}
        </div>
      </section>

      {/* Features strip */}
      <section className="mx-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            icon: Truck,
            labelKey: "home.freeShipping",
            descKey: "home.onOrders50",
          },
          {
            icon: Shield,
            labelKey: "home.securePayment",
            descKey: "home.protected100",
          },
          {
            icon: Clock,
            labelKey: "home.support247",
            descKey: "home.dedicatedHelp",
          },
          {
            icon: Gift,
            labelKey: "home.easyReturns",
            descKey: "home.dayPolicy",
          },
        ].map((f) => (
          <div
            key={f.labelKey}
            className="flex items-center gap-3 bg-white p-4 rounded-lg border border-border/50"
          >
            <f.icon className="h-8 w-8 text-primary flex-shrink-0" />
            <div>
              <p className="font-semibold text-sm text-text">{t(f.labelKey)}</p>
              <p className="text-xs text-text-secondary">{t(f.descKey)}</p>
            </div>
          </div>
        ))}
      </section>

      {/* Categories */}
      <section className="mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-text">
            {t("home.shopByCategory")}
          </h2>
          <Link
            to="/categories"
            className="text-sm text-accent hover:underline flex items-center gap-1"
          >
            {t("common.viewAll")} <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        {categoriesLoading ? (
          <CategorySkeleton count={8} />
        ) : displayCategories.length === 0 ? (
          <p className="text-center text-text-secondary py-8">
            {t("home.noCategories", "No categories available")}
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
            {displayCategories.map((cat) => (
              <Link
                key={cat.id}
                to={`/category/${cat.slug}`}
                className="flex flex-col items-center gap-2 p-3 bg-white rounded-lg border border-border/50 hover:shadow-md hover:border-primary transition group"
              >
                {cat.image ? (
                  <img
                    src={cat.image}
                    alt={cat.nameKey}
                    loading="lazy"
                    className="w-14 h-14 rounded-lg object-cover group-hover:scale-110 transition-transform"
                  />
                ) : (
                  <span className="text-3xl group-hover:scale-110 transition-transform">
                    📦
                  </span>
                )}
                <span className="text-xs font-medium text-text text-center">
                  {cat.nameRaw ? cat.nameKey : t(cat.nameKey)}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Flash Deals */}
      {flashDealsEnabled && !flashDealsExpired && (
        <section className="mx-4 bg-gradient-to-r from-danger/10 to-primary/10 p-3 sm:p-6 rounded-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Zap className="h-6 w-6 text-danger" />
              <h2 className="text-xl font-bold text-text">
                {t("home.flashDeals")}
              </h2>
              <CountdownTimer
                endsAt={flashDealEndTime}
                onExpire={() => setFlashDealsExpired(true)}
              />
            </div>
            <Link
              to="/products?deals=true"
              className="text-sm text-accent hover:underline flex items-center gap-1"
            >
              {t("common.viewAll")} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          {saleLoading ? (
            <ProductGridSkeleton count={4} columns={4} />
          ) : displayFlashDeals.length === 0 ? (
            <p className="text-center text-text-secondary py-8">
              {t("home.noDeals", "No deals available right now")}
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {displayFlashDeals.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Trending Products */}
      <section className="mx-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-bold text-text">
              {t("home.trendingNow")}
            </h2>
          </div>
          <Link
            to="/products?sort=trending"
            className="text-sm text-accent hover:underline flex items-center gap-1"
          >
            {t("common.viewAll")} <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        {trendingLoading ? (
          <ProductGridSkeleton count={6} columns={6} />
        ) : displayTrending.length === 0 ? (
          <p className="text-center text-text-secondary py-8">
            {t("home.noProducts", "No products available")}
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {displayTrending.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>

      {/* Featured / Best Sellers */}
      <section className="mx-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Star className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-bold text-text">
              {t("home.bestSellers")}
            </h2>
          </div>
          <Link
            to="/products?sort=best-sellers"
            className="text-sm text-accent hover:underline flex items-center gap-1"
          >
            {t("common.viewAll")} <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        {featuredLoading ? (
          <ProductGridSkeleton count={6} columns={6} />
        ) : displayProducts.length === 0 ? (
          <p className="text-center text-text-secondary py-8">
            {t("home.noProducts", "No products available")}
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {displayProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>

      {/* New Arrivals */}
      <section className="mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-text">
            {t("home.newArrivals")}
          </h2>
          <Link
            to="/products?sort=newest"
            className="text-sm text-accent hover:underline flex items-center gap-1"
          >
            {t("common.viewAll")} <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        {productsLoading ? (
          <ProductGridSkeleton count={6} columns={6} />
        ) : toArray(productsData?.data).length === 0 ? (
          <p className="text-center text-text-secondary py-8">
            {t("home.noProducts", "No products available")}
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {toArray(productsData?.data)
              .slice(0, 6)
              .map(mapProduct)
              .map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
          </div>
        )}
      </section>

      {/* Campaigns Banner */}
      {campaignsEnabled && (
        <section className="mx-4">
          <div className="rounded-xl overflow-hidden bg-gradient-to-r from-primary to-accent text-white p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold mb-1">
                {t("home.specialCampaigns", "Special Campaigns")}
              </h2>
              <p className="text-sm opacity-90">
                {t(
                  "home.campaignsDesc",
                  "Exclusive promotions and limited-time offers just for you.",
                )}
              </p>
            </div>
            <Link to="/products?deals=true">
              <Button
                variant="outline"
                className="border-white text-white hover:bg-white/10 whitespace-nowrap"
              >
                {t("common.shopNow")}
              </Button>
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
