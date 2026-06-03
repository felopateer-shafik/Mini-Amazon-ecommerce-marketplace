import { useState, useMemo, useCallback, useEffect, useRef, memo } from "react";
import { useSearchParams, useParams, Link } from "react-router-dom";
import { useTranslation } from "@/hooks/useTranslation";
import { useSEO } from "@/hooks/useSEO";
import {
  useProducts,
  useCategories,
  useBrands,
  useCategoryProducts,
} from "@/hooks/useApi";
import { getFiltersForCategory } from "@/lib/categoryFilters";
import {
  Grid3X3,
  List,
  LayoutGrid,
  SlidersHorizontal,
  X,
  ChevronDown,
  ChevronUp,
  Search,
  RotateCcw,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import StarRating from "@/components/ui/StarRating";
import Pagination from "@/components/ui/Pagination";
import Breadcrumb from "@/components/ui/Breadcrumb";
import { ProductGridSkeleton } from "@/components/ui/Skeleton";
import {
  formatCurrency,
  calculateDiscount,
  getPublicSettingsSnapshot,
} from "@/lib/utils";

/* ── View mode constants ────────────────────────────────────────────── */
const VIEW_MODES = [
  { key: "grid", icon: Grid3X3, label: "Grid" },
  { key: "large-grid", icon: LayoutGrid, label: "Large Grid" },
  { key: "list", icon: List, label: "List" },
];

/* ── Filter sub-components (memoised) ───────────────────────────────── */
const CheckboxFilter = memo(function CheckboxFilter({
  filter,
  selected,
  onChange,
  language,
}) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const options = filter.options || [];
  const display = showAll ? options : options.slice(0, 6);
  const label =
    language === "ar" && filter.labelAr ? filter.labelAr : filter.label;
  return (
    <div className="pb-4 border-b border-border/30">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full text-sm font-semibold text-text mb-2"
      >
        {label}
        {expanded ? (
          <ChevronUp className="h-3.5 w-3.5" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5" />
        )}
      </button>
      {expanded && (
        <>
          <div className="space-y-1.5">
            {display.map((opt) => {
              const optLabel =
                language === "ar" && opt.labelAr ? opt.labelAr : opt.label;
              return (
                <label
                  key={opt.value}
                  className="flex items-center gap-2 text-sm cursor-pointer hover:text-primary transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(opt.value)}
                    onChange={() => onChange(filter.key, opt.value)}
                    className="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5"
                  />
                  <span className="text-text">{optLabel}</span>
                </label>
              );
            })}
          </div>
          {options.length > 6 && (
            <button
              onClick={() => setShowAll(!showAll)}
              className="text-xs text-accent hover:underline mt-1.5"
            >
              {showAll
                ? t("productList.showLess")
                : t("productList.showAll", { count: options.length })}
            </button>
          )}
        </>
      )}
    </div>
  );
});

const RadioFilter = memo(function RadioFilter({
  filter,
  selected,
  onChange,
  language,
}) {
  const [expanded, setExpanded] = useState(true);
  const settings = getPublicSettingsSnapshot();
  const unitLabel = filter.unit || settings?.currency_symbol || "EGP";
  const options = filter.options || [];
  const label =
    language === "ar" && filter.labelAr ? filter.labelAr : filter.label;
  return (
    <div className="pb-4 border-b border-border/30">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full text-sm font-semibold text-text mb-2"
      >
        {label}
        {expanded ? (
          <ChevronUp className="h-3.5 w-3.5" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5" />
        )}
      </button>
      {expanded && (
        <div className="space-y-1.5">
          {options.map((opt) => {
            const optLabel =
              language === "ar" && opt.labelAr ? opt.labelAr : opt.label;
            return (
              <label
                key={opt.value}
                className="flex items-center gap-2 text-sm cursor-pointer hover:text-primary transition-colors"
              >
                <input
                  type="radio"
                  name={filter.key}
                  checked={selected === opt.value}
                  onChange={() => onChange(filter.key, opt.value)}
                  className="border-border text-primary focus:ring-primary h-3.5 w-3.5"
                />
                <span className="text-text">{optLabel}</span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
});

const RangeFilter = memo(function RangeFilter({
  filter,
  minVal,
  maxVal,
  onChange,
  language,
}) {
  const settings = getPublicSettingsSnapshot();
  const unitLabel = filter.unit || settings?.currency_symbol || "EGP";
  const label =
    language === "ar" && filter.labelAr ? filter.labelAr : filter.label;
  return (
    <div className="pb-4 border-b border-border/30">
      <h3 className="text-sm font-semibold text-text mb-2">{label}</h3>
      <div className="flex items-center gap-2">
        <input
          type="number"
          placeholder="Min"
          value={minVal || ""}
          onChange={(e) =>
            onChange(
              "min_price",
              e.target.value ? Number(e.target.value) : null,
            )
          }
          className="w-full px-2 py-1.5 text-sm border border-border rounded focus:ring-1 focus:ring-primary focus:border-primary outline-none"
        />
        <span className="text-text-secondary text-xs">–</span>
        <input
          type="number"
          placeholder="Max"
          value={maxVal || ""}
          onChange={(e) =>
            onChange(
              "max_price",
              e.target.value ? Number(e.target.value) : null,
            )
          }
          className="w-full px-2 py-1.5 text-sm border border-border rounded focus:ring-1 focus:ring-primary focus:border-primary outline-none"
        />
      </div>
      <p className="text-[10px] text-text-light mt-1">{unitLabel}</p>
    </div>
  );
});

const SizeGridFilter = memo(function SizeGridFilter({
  filter,
  selected,
  onChange,
  language,
}) {
  const [expanded, setExpanded] = useState(false);
  const label =
    language === "ar" && filter.labelAr ? filter.labelAr : filter.label;
  const options = filter.options || [];
  return (
    <div className="pb-4 border-b border-border/30">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full text-sm font-semibold text-text mb-2"
      >
        {label}
        {expanded ? (
          <ChevronUp className="h-3.5 w-3.5" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5" />
        )}
      </button>
      {expanded && (
        <div className="flex flex-wrap gap-1.5">
          {options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onChange(filter.key, opt.value)}
              className={`min-w-[36px] px-2 py-1 text-xs rounded border transition-colors ${selected.includes(opt.value) ? "bg-primary text-white border-primary" : "bg-white text-text border-border hover:border-primary"}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
});

const StarsFilter = memo(function StarsFilter({
  selected,
  onChange,
  language,
  labelAr,
  label: filterLabel,
}) {
  const { t } = useTranslation();
  const label = language === "ar" && labelAr ? labelAr : filterLabel;
  return (
    <div className="pb-4 border-b border-border/30">
      <h3 className="text-sm font-semibold text-text mb-2">{label}</h3>
      <div className="space-y-1.5">
        {[4, 3, 2, 1].map((r) => (
          <label
            key={r}
            className="flex items-center gap-2 text-sm cursor-pointer hover:text-primary transition-colors"
          >
            <input
              type="radio"
              name="rating"
              checked={selected === r}
              onChange={() => onChange("rating", r)}
              className="border-border text-primary focus:ring-primary h-3.5 w-3.5"
            />
            <StarRating rating={r} size="sm" />
            <span className="text-text-secondary text-xs">
              {t("productList.andUp")}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
});

/* ── Product Cards (memoised) ───────────────────────────────────────── */
const ProductGridCard = memo(function ProductGridCard({ product, large }) {
  const { t } = useTranslation();
  const discount = calculateDiscount(product.originalPrice, product.price);
  return (
    <Link
      to={`/product/${product.slug}`}
      className="group bg-white rounded-lg border border-border/50 hover:shadow-lg transition overflow-hidden"
    >
      <div
        className={`relative ${large ? "aspect-[4/3]" : "aspect-square"} bg-gray-50`}
      >
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
          loading="lazy"
        />
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
        <p className="text-xs text-text-secondary">{product.merchant?.name}</p>
        <h3 className="text-sm font-medium text-text line-clamp-2 mt-0.5">
          {product.name}
        </h3>
        <div className="flex items-center gap-1 mt-1">
          <StarRating rating={product.rating} size="sm" />
          <span className="text-xs text-text-secondary">
            ({product.reviewCount})
          </span>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <span className="text-base font-bold text-primary">
            {formatCurrency(product.price)}
          </span>
          {product.originalPrice > product.price && (
            <span className="text-xs text-text-secondary line-through">
              {formatCurrency(product.originalPrice)}
            </span>
          )}
        </div>
        {product.freeShipping && (
          <span className="text-[10px] text-success font-medium mt-1 inline-block">
            {t("productList.freeShipping")}
          </span>
        )}
      </div>
    </Link>
  );
});

const ProductListCard = memo(function ProductListCard({ product }) {
  const { t } = useTranslation();
  const discount = calculateDiscount(product.originalPrice, product.price);
  return (
    <Link
      to={`/product/${product.slug}`}
      className="group flex bg-white rounded-lg border border-border/50 hover:shadow-lg transition overflow-hidden"
    >
      <div className="w-48 h-48 flex-shrink-0 bg-gray-50 relative">
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        {discount > 0 && (
          <span className="absolute top-2 right-2 bg-danger text-white text-xs font-bold px-1.5 py-0.5 rounded">
            -{discount}%
          </span>
        )}
      </div>
      <div className="flex-1 p-4 flex flex-col justify-between">
        <div>
          <p className="text-xs text-text-secondary">
            {product.merchant?.name}
          </p>
          <h3 className="font-medium text-text group-hover:text-accent transition-colors mt-0.5">
            {product.name}
          </h3>
          <div className="flex items-center gap-1 mt-1">
            <StarRating rating={product.rating} size="sm" />
            <span className="text-xs text-text-secondary">
              ({product.reviewCount})
            </span>
          </div>
          {product.brand && (
            <p className="text-xs text-text-secondary mt-1">
              {t("productList.brand")}: {product.brand}
            </p>
          )}
        </div>
        <div>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xl font-bold text-primary">
              {formatCurrency(product.price)}
            </span>
            {product.originalPrice > product.price && (
              <span className="text-sm text-text-secondary line-through">
                {formatCurrency(product.originalPrice)}
              </span>
            )}
            {discount > 0 && (
              <span className="text-sm text-danger font-medium">
                ({t("productList.percentOff", { discount })})
              </span>
            )}
          </div>
          <p
            className={`text-xs mt-1 ${product.inStock ? "text-success" : "text-danger"}`}
          >
            {product.inStock ? t("common.inStock") : t("common.outOfStock")}
          </p>
          {product.freeShipping && (
            <span className="text-xs text-success font-medium">
              {t("productList.freeShipping")}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
});

/* ── Main component ──────────────────────────────────────────────────── */
export default function ProductListPage() {
  const { t, language } = useTranslation();
  const { slug: categorySlug } = useParams();
  useSEO({
    title: categorySlug
      ? `${categorySlug.replace(/-/g, " ")} - Shop Online`
      : "Browse Products - Mini Amazon",
    description: categorySlug
      ? `Shop the best ${categorySlug.replace(/-/g, " ")} products online. Compare prices, read reviews, and find great deals.`
      : "Browse thousands of products across all categories. Filter by price, brand, rating, and more.",
    canonical: categorySlug ? `/category/${categorySlug}` : "/products",
  });
  const [searchParams, setSearchParams] = useSearchParams();
  const [viewMode, setViewMode] = useState("grid");
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = viewMode === "large-grid" ? 8 : 12;
  const [filterSelections, setFilterSelections] = useState({});
  const [priceMin, setPriceMin] = useState(null);
  const [priceMax, setPriceMax] = useState(null);
  const [selectedRating, setSelectedRating] = useState(null);
  const [dynamicOptions, setDynamicOptions] = useState({
    brand: [],
    seller: [],
  });
  const dynamicOptionsCacheRef = useRef(new Map());

  const query = searchParams.get("q") || "";
  const sort = searchParams.get("sort") || "relevance";
  const isDeals = searchParams.get("deals") === "true";

  const activeCategory = categorySlug || searchParams.get("category") || null;
  const categoryFilters = useMemo(
    () => getFiltersForCategory(activeCategory),
    [activeCategory],
  );

  /* ── filter handlers ────────────────────────────────────────────────── */
  const handleCheckboxToggle = useCallback((filterKey, value) => {
    setFilterSelections((prev) => {
      const arr = prev[filterKey] || [];
      const next = arr.includes(value)
        ? arr.filter((v) => v !== value)
        : [...arr, value];
      return { ...prev, [filterKey]: next };
    });
    setCurrentPage(1);
  }, []);

  const handleRadioChange = useCallback((filterKey, value) => {
    setFilterSelections((prev) => ({
      ...prev,
      [filterKey]: prev[filterKey] === value ? null : value,
    }));
    setCurrentPage(1);
  }, []);

  const handleRangeChange = useCallback((key, value) => {
    if (key === "min_price") setPriceMin(value);
    else setPriceMax(value);
    setCurrentPage(1);
  }, []);

  const handleRatingChange = useCallback((_, value) => {
    setSelectedRating((prev) => (prev === value ? null : value));
    setCurrentPage(1);
  }, []);

  const clearAllFilters = useCallback(() => {
    setFilterSelections({});
    setPriceMin(null);
    setPriceMax(null);
    setSelectedRating(null);
    setCurrentPage(1);
  }, []);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    Object.values(filterSelections).forEach((v) => {
      if (Array.isArray(v)) count += v.length;
      else if (v) count += 1;
    });
    if (priceMin || priceMax) count += 1;
    if (selectedRating) count += 1;
    return count;
  }, [filterSelections, priceMin, priceMax, selectedRating]);

  /* ── API params ──────────────────────────────────────────────────── */
  const apiParams = useMemo(() => {
    const params = { page: currentPage, per_page: itemsPerPage };
    if (query) params.search = query;
    if (isDeals) params.is_featured = 1;
    if (sort === "price-asc") {
      params.sort_by = "price";
      params.sort_order = "asc";
    } else if (sort === "price-desc") {
      params.sort_by = "price";
      params.sort_order = "desc";
    } else if (sort === "rating") {
      params.sort_by = "rating";
      params.sort_order = "desc";
    } else if (sort === "newest") {
      params.sort_by = "created_at";
      params.sort_order = "desc";
    } else if (sort === "best-selling") {
      params.sort_by = "sold_count";
      params.sort_order = "desc";
    }
    if (priceMin) params.min_price = priceMin;
    if (priceMax) params.max_price = priceMax;
    if (selectedRating) params.min_rating = selectedRating;
    Object.entries(filterSelections).forEach(([key, val]) => {
      if (key === "category") {
        // Category filter — send as top-level 'category' param (slug-based)
        const arr = Array.isArray(val) ? val : val ? [val] : [];
        if (arr.length > 0) params.category = arr.join(",");
      } else if (key === "brand") {
        // Brand filter — send as top-level 'brand' param (slug/name-based)
        const arr = Array.isArray(val) ? val : val ? [val] : [];
        if (arr.length > 0) params.brand = arr.join(",");
      } else if (key === "seller") {
        // Seller filter — send as top-level 'seller' param (slug/name-based)
        const arr = Array.isArray(val) ? val : val ? [val] : [];
        if (arr.length > 0) params.seller = arr.join(",");
      } else if (key === "availability") {
        // Availability filter — send as top-level 'availability' param
        const arr = Array.isArray(val) ? val : val ? [val] : [];
        if (arr.length > 0) params.availability = arr.join(",");
      } else if (key === "shipping") {
        // Hidden for now per UX requirement
        return;
      } else if (Array.isArray(val) && val.length > 0) {
        params[`filter[${key}]`] = val.join(",");
      } else if (val && !Array.isArray(val)) {
        params[`filter[${key}]`] = val;
      }
    });
    return params;
  }, [
    currentPage,
    itemsPerPage,
    query,
    isDeals,
    sort,
    priceMin,
    priceMax,
    selectedRating,
    filterSelections,
  ]);

  /* ── Data fetching ──────────────────────────────────────────────── */
  const singleCategory = categorySlug || null;
  const categoryProductsQuery = useCategoryProducts(singleCategory, apiParams);
  const allProductsQuery = useProducts(apiParams);
  const activeQuery = singleCategory ? categoryProductsQuery : allProductsQuery;
  const productsResponse = activeQuery.data;
  const isLoadingProducts = activeQuery.isLoading;
  const { data: categoriesResponse } = useCategories();
  const { data: brandsResponse } = useBrands();

  // Helper: extract array from possibly-paginated API response
  const toArray = (d) => {
    if (!d) return [];
    if (Array.isArray(d)) return d;
    if (Array.isArray(d?.data)) return d.data;
    return [];
  };

  const products = useMemo(
    () =>
      toArray(productsResponse?.data).map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        price: parseFloat(p.price),
        originalPrice: p.compare_price
          ? parseFloat(p.compare_price)
          : parseFloat(p.price),
        rating: parseFloat(p.rating || p.average_rating || 0),
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
          p.thumbnail ||
          `https://placehold.co/300x300/f0f0f0/333?text=${encodeURIComponent(p.name?.slice(0, 10) || "Product")}`,
        category: p.category?.slug || "general",
        brand:
          typeof p.brand === "string"
            ? p.brand
            : p.brand?.name || p.brand?.slug || "",
        merchant: {
          name: p.vendor?.store_name || "Store",
          slug: p.vendor?.slug || "store",
        },
        inStock: (p.stock_quantity ?? p.stock ?? 1) > 0,
        freeShipping: p.free_shipping || false,
      })),
    [productsResponse],
  );

  const filtered = useMemo(
    () =>
      !selectedRating
        ? products
        : products.filter((p) => p.rating >= selectedRating),
    [products, selectedRating],
  );
  const totalPages =
    productsResponse?.meta?.last_page ||
    productsResponse?.last_page ||
    Math.ceil(filtered.length / itemsPerPage) ||
    1;
  const totalCount =
    productsResponse?.meta?.total || productsResponse?.total || filtered.length;
  const filterCategories = toArray(categoriesResponse?.data).map((c) => ({
    value: c.slug,
    label: c.name,
    count: c.products_count || 0,
  }));

  const filterBrands = toArray(brandsResponse?.data).map((brand) => ({
    value: brand.slug || brand.name,
    label: brand.name,
    labelAr: brand.name,
    count: brand.products_count || 0,
  }));

  const selectedCategoryKey = Array.isArray(filterSelections.category)
    ? filterSelections.category.slice().sort().join(",")
    : "";
  const filterContextKey = `${singleCategory || selectedCategoryKey || "all"}::${query || ""}`;

  useEffect(() => {
    const cached = dynamicOptionsCacheRef.current.get(filterContextKey);
    if (cached) {
      setDynamicOptions(cached);
      return;
    }
    setDynamicOptions({ brand: [], seller: [] });
  }, [filterContextKey]);

  useEffect(() => {
    const rows = toArray(productsResponse?.data);
    if (rows.length === 0) return;

    const existing = dynamicOptionsCacheRef.current.get(filterContextKey) || {
      brand: [],
      seller: [],
    };

    const brandMap = new Map(existing.brand.map((opt) => [opt.value, opt]));
    const sellerMap = new Map(existing.seller.map((opt) => [opt.value, opt]));

    rows.forEach((p) => {
      const brand = p.brand;
      if (brand && brand.name) {
        const value = brand.slug || brand.name;
        if (!brandMap.has(value)) {
          brandMap.set(value, {
            value,
            label: brand.name,
            labelAr: brand.name,
          });
        }
      }

      const vendorName = p.vendor?.store_name || p.vendor?.business_name;
      const vendorSlug = p.vendor?.slug || vendorName;
      if (vendorName && vendorSlug && !sellerMap.has(vendorSlug)) {
        sellerMap.set(vendorSlug, {
          value: vendorSlug,
          label: vendorName,
          labelAr: vendorName,
        });
      }
    });

    const next = {
      brand: Array.from(brandMap.values()),
      seller: Array.from(sellerMap.values()),
    };

    dynamicOptionsCacheRef.current.set(filterContextKey, next);
    setDynamicOptions(next);
  }, [productsResponse, filterContextKey]);

  // Dynamically populate brand/seller options and hide shipping filter
  const enrichedCategoryFilters = useMemo(() => {
    return categoryFilters
      .filter((f) => f.key !== "shipping")
      .map((f) => {
        if (f.key === "brand" && f.dynamic) {
          return {
            ...f,
            options:
              filterBrands.length > 0 ? filterBrands : dynamicOptions.brand,
          };
        }
        if (f.key === "seller" && f.dynamic) {
          return { ...f, options: dynamicOptions.seller };
        }
        return f;
      });
  }, [categoryFilters, dynamicOptions, filterBrands]);

  /* ── Render ──────────────────────────────────────────────────────── */
  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <Breadcrumb
        items={[
          { label: t("common.home"), href: "/" },
          ...(categorySlug
            ? [
                {
                  label: categorySlug
                    .replace(/-/g, " ")
                    .replace(/\b\w/g, (c) => c.toUpperCase()),
                },
              ]
            : query
              ? [{ label: t("productList.searchFor", { query }) }]
              : [{ label: t("productList.allProducts") }]),
        ]}
      />

      {/* ── Header bar ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mt-4 mb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-text">
            {categorySlug
              ? categorySlug
                  .replace(/-/g, " ")
                  .replace(/\b\w/g, (c) => c.toUpperCase())
              : query
                ? t("productList.searchResults", { query })
                : isDeals
                  ? t("productList.todaysDeals")
                  : t("productList.allProducts")}
          </h1>
          <p className="text-sm text-text-secondary mt-0.5">
            {t("productList.resultCount", { count: totalCount })}
            {activeFilterCount > 0 &&
              ` · ${t("productList.filtersApplied", { count: activeFilterCount })}`}
          </p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="md:hidden flex items-center gap-1.5 px-3 py-2 border border-border rounded-lg text-sm"
          >
            <SlidersHorizontal className="h-4 w-4" /> {t("productList.filters")}
            {activeFilterCount > 0 && (
              <Badge variant="primary" size="sm">
                {activeFilterCount}
              </Badge>
            )}
          </button>
          <select
            value={sort}
            onChange={(e) => {
              searchParams.set("sort", e.target.value);
              setSearchParams(searchParams);
            }}
            className="text-sm border border-border rounded-lg px-3 py-2 bg-white"
          >
            <option value="relevance">{t("productList.sortRelevance")}</option>
            <option value="best-selling">
              {t("productList.sortBestSelling")}
            </option>
            <option value="price-asc">{t("productList.sortPriceLow")}</option>
            <option value="price-desc">{t("productList.sortPriceHigh")}</option>
            <option value="rating">{t("productList.sortRating")}</option>
            <option value="newest">{t("productList.sortNewest")}</option>
          </select>
          <div className="hidden md:flex border border-border rounded-lg overflow-hidden">
            {VIEW_MODES.map(({ key, icon: Icon, label: modeLabel }) => (
              <button
                key={key}
                onClick={() => setViewMode(key)}
                title={modeLabel}
                className={`p-2 transition-colors ${viewMode === key ? "bg-primary text-white" : "bg-white text-text-secondary hover:bg-gray-50"}`}
              >
                <Icon className="h-4 w-4" />
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-4 sm:gap-6">
        {/* ── SIDEBAR FILTERS ─────────────────────────────────────────── */}
        <aside
          className={`${showFilters ? "fixed inset-0 z-50 bg-black/50" : "hidden"} md:relative md:block md:bg-transparent md:z-0`}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowFilters(false);
          }}
        >
          <div
            className={`${showFilters ? "absolute right-0 top-0 h-full w-80 bg-white p-4 overflow-y-auto shadow-xl" : ""} md:w-60 md:static md:p-0 space-y-4`}
          >
            {showFilters && (
              <div className="flex items-center justify-between md:hidden pb-3 border-b border-border/30">
                <h3 className="font-semibold">{t("productList.filters")}</h3>
                <button
                  onClick={() => setShowFilters(false)}
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            )}
            {activeFilterCount > 0 && (
              <button
                onClick={clearAllFilters}
                className="flex items-center gap-1 text-sm text-danger hover:underline"
              >
                <RotateCcw className="h-3.5 w-3.5" />{" "}
                {t("productList.clearFilters")}
              </button>
            )}
            {filterCategories.length > 0 && !categorySlug && (
              <CheckboxFilter
                filter={{
                  key: "category",
                  label: t("productList.category"),
                  labelAr: "الفئة",
                  options: filterCategories.map((c) => ({
                    value: c.value,
                    label: c.label,
                    labelAr: c.label,
                  })),
                }}
                selected={filterSelections.category || []}
                onChange={handleCheckboxToggle}
                language={language}
              />
            )}
            {enrichedCategoryFilters.map((filter) => {
              if (filter.type === "checkbox")
                return (
                  <CheckboxFilter
                    key={filter.key}
                    filter={filter}
                    selected={filterSelections[filter.key] || []}
                    onChange={handleCheckboxToggle}
                    language={language}
                  />
                );
              if (filter.type === "radio")
                return (
                  <RadioFilter
                    key={filter.key}
                    filter={filter}
                    selected={filterSelections[filter.key] || null}
                    onChange={handleRadioChange}
                    language={language}
                  />
                );
              if (filter.type === "range")
                return (
                  <RangeFilter
                    key={filter.key}
                    filter={filter}
                    minVal={priceMin}
                    maxVal={priceMax}
                    onChange={handleRangeChange}
                    language={language}
                  />
                );
              if (filter.type === "sizeGrid")
                return (
                  <SizeGridFilter
                    key={filter.key}
                    filter={filter}
                    selected={filterSelections[filter.key] || []}
                    onChange={handleCheckboxToggle}
                    language={language}
                  />
                );
              if (filter.type === "stars")
                return (
                  <StarsFilter
                    key={filter.key}
                    selected={selectedRating}
                    onChange={handleRatingChange}
                    language={language}
                    labelAr={filter.labelAr}
                    label={filter.label}
                  />
                );
              return null;
            })}
          </div>
        </aside>

        {/* ── PRODUCTS ────────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0">
          {activeFilterCount > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {Object.entries(filterSelections).map(([key, val]) => {
                const vals = Array.isArray(val) ? val : val ? [val] : [];
                return vals.map((v) => (
                  <button
                    key={`${key}-${v}`}
                    onClick={() => {
                      if (Array.isArray(filterSelections[key]))
                        handleCheckboxToggle(key, v);
                      else handleRadioChange(key, v);
                    }}
                    className="flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary text-xs rounded-full hover:bg-primary/20 transition"
                  >
                    {key}: {v} <X className="h-3 w-3" />
                  </button>
                ));
              })}
              {priceMin && (
                <button
                  onClick={() => setPriceMin(null)}
                  className="flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary text-xs rounded-full"
                >
                  Min: {formatCurrency(priceMin)} <X className="h-3 w-3" />
                </button>
              )}
              {priceMax && (
                <button
                  onClick={() => setPriceMax(null)}
                  className="flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary text-xs rounded-full"
                >
                  Max: {formatCurrency(priceMax)} <X className="h-3 w-3" />
                </button>
              )}
              {selectedRating && (
                <button
                  onClick={() => setSelectedRating(null)}
                  className="flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary text-xs rounded-full"
                >
                  {selectedRating}★ & Up <X className="h-3 w-3" />
                </button>
              )}
            </div>
          )}

          {isLoadingProducts ? (
            <ProductGridSkeleton
              count={12}
              columns={
                viewMode === "list" ? 1 : viewMode === "large-grid" ? 3 : 4
              }
            />
          ) : filtered.length === 0 ? (
            <div className="text-center py-20">
              <Search className="h-16 w-16 text-gray-200 mx-auto mb-4" />
              <p className="text-lg font-medium text-text mb-1">
                {t("productList.noProducts")}
              </p>
              <p className="text-text-secondary text-sm mb-4">
                {t("productList.tryAdjusting")}
              </p>
              {activeFilterCount > 0 && (
                <Button variant="outline" onClick={clearAllFilters}>
                  {t("productList.clearFilters")}
                </Button>
              )}
            </div>
          ) : viewMode === "list" ? (
            <div className="space-y-3">
              {filtered.map((product) => (
                <ProductListCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div
              className={
                viewMode === "large-grid"
                  ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
                  : "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4"
              }
            >
              {filtered.map((product) => (
                <ProductGridCard
                  key={product.id}
                  product={product}
                  large={viewMode === "large-grid"}
                />
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="mt-8">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
