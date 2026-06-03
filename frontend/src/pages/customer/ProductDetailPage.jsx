import { useState, useEffect, useMemo } from "react";
import {
  useParams,
  Link,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import { useTranslation } from "@/hooks/useTranslation";
import { useSEO } from "@/hooks/useSEO";
import {
  useProduct,
  useProductReviews,
  useSubmitReview,
  useUpdateReview,
  useDeleteReview,
  useAddToWishlist,
  useRemoveFromWishlist,
  useWishlist,
  useProducts,
  useSendMessage,
  usePublicSettings,
} from "@/hooks/useApi";
import {
  Heart,
  ShoppingCart,
  Share2,
  Minus,
  Plus,
  Truck,
  Shield,
  RotateCcw,
  Star,
  ChevronRight,
  Store,
  Loader2,
  MessageCircle,
  CheckCircle,
  Edit2,
  Trash2,
  AlertTriangle,
  Clock,
  Zap,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Tabs from "@/components/ui/Tabs";
import StarRating from "@/components/ui/StarRating";
import Breadcrumb from "@/components/ui/Breadcrumb";
import ImageZoom from "@/components/ImageZoom";
import { ProductDetailSkeleton } from "@/components/ui/Skeleton";
import { useCartStore } from "@/store/cartStore";
import { useUIStore } from "@/store/uiStore";
import { useAuthStore } from "@/store/authStore";
import { formatCurrency, calculateDiscount } from "@/lib/utils";
import { trackFacebookEvent } from "@/lib/facebookPixel";
import toast from "react-hot-toast";

export default function ProductDetailPage() {
  const { slug } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const currentUser = useAuthStore((state) => state.user);
  const sendMessage = useSendMessage();
  const { data: publicSettingsData } = usePublicSettings();
  const publicSettings = publicSettingsData?.data ?? publicSettingsData ?? {};
  const activeCurrency = String(
    publicSettings?.currency || "EGP",
  ).toUpperCase();

  useSEO({
    title: slug
      ? `${slug.replace(/-/g, " ")} - Mini Amazon`
      : "Product Details",
    description: `Buy ${slug?.replace(/-/g, " ") || "products"} at the best price on Mini Amazon. Fast delivery, secure payments, and easy returns.`,
    canonical: `/products/${slug}`,
    ogType: "product",
  });

  // Fetch real product data from API
  const { data: productResponse, isLoading, isError } = useProduct(slug);
  const apiProduct = productResponse?.data;

  // Map API response to component shape
  const product = apiProduct
    ? {
        id: apiProduct.id,
        name: apiProduct.name,
        slug: apiProduct.slug,
        price: parseFloat(apiProduct.price),
        originalPrice: apiProduct.compare_price
          ? parseFloat(apiProduct.compare_price)
          : parseFloat(apiProduct.price),
        sku: apiProduct.sku,
        description: apiProduct.description || "",
        shortDescription: apiProduct.short_description || "",
        images: (() => {
          let imgs = apiProduct.images;
          if (typeof imgs === "string")
            try {
              imgs = JSON.parse(imgs);
            } catch {
              imgs = [];
            }
          return Array.isArray(imgs) && imgs.length
            ? imgs
            : [
                `https://placehold.co/600x600/f0f0f0/333?text=${encodeURIComponent(apiProduct.name?.slice(0, 12) || "Product")}`,
              ];
        })(),
        category: apiProduct.category || { name: "General", slug: "general" },
        brand: apiProduct.brand || null,
        merchant: {
          name:
            apiProduct.vendor?.store_name ||
            apiProduct.vendor?.business_name ||
            (apiProduct.vendor_id ? "Store" : "Website"),
          slug: apiProduct.vendor?.slug || null,
          rating: apiProduct.vendor_id
            ? parseFloat(apiProduct.vendor?.rating) || 0
            : parseFloat(
                apiProduct.system_average_rating ||
                  apiProduct.rating ||
                  apiProduct.average_rating ||
                  0,
              ) || 0,
          products: apiProduct.vendor_id
            ? (apiProduct.vendor?.products_count ?? 0)
            : (apiProduct.system_products_count ?? 0),
          reviewCount: apiProduct.vendor_id
            ? (apiProduct.vendor?.review_count ?? 0)
            : (apiProduct.system_review_count ?? 0),
        },
        rating: parseFloat(apiProduct.rating || apiProduct.average_rating || 0),
        reviewCount: apiProduct.review_count || apiProduct.reviews_count || 0,
        sold: apiProduct.sold_count ?? apiProduct.sold ?? 0,
        stock: apiProduct.stock ?? 0,
        rawVariants: (apiProduct.variants || []).map((v) => ({
          id: v.id,
          name: v.name,
          price: v.price != null ? parseFloat(v.price) : null,
          compare_price:
            v.compare_price != null ? parseFloat(v.compare_price) : null,
          stock_quantity: v.stock_quantity ?? 0,
          attributes:
            typeof v.attributes === "string"
              ? JSON.parse(v.attributes)
              : v.attributes || {},
        })),
        variantGroups: (() => {
          const groups = {};
          (apiProduct.variants || []).forEach((v) => {
            const attrs =
              typeof v.attributes === "string"
                ? JSON.parse(v.attributes)
                : v.attributes || {};
            const variantName = v.name || "";
            const valuesArr = Array.isArray(attrs.values) ? attrs.values : [];
            if (variantName && valuesArr.length > 0) {
              if (!groups[variantName]) groups[variantName] = new Set();
              valuesArr.forEach((val) => groups[variantName].add(String(val)));
            } else {
              Object.entries(attrs).forEach(([key, val]) => {
                if (key === "values" || key === "values_text") return;
                if (!groups[key]) groups[key] = new Set();
                groups[key].add(String(val));
              });
            }
          });
          return Object.entries(groups).map(([key, vals]) => ({
            type: key,
            options: [...vals],
          }));
        })(),
        specifications: apiProduct.specifications || [],
        features: apiProduct.features || [],
        inStock: (apiProduct.stock ?? 0) > 0,
      }
    : null;

  // Fetch reviews from API (use API data, fallback to empty)
  const { data: reviewsResponse } = useProductReviews(product?.id);
  const reviews = reviewsResponse?.data || reviewsResponse || [];
  const reviewsList = (() => {
    const d = Array.isArray(reviews) ? reviews : reviews?.data;
    return Array.isArray(d) ? d : [];
  })();
  const reviewStats = reviewsResponse?.meta?.stats ?? {};

  // Related products from API
  const { data: relatedData } = useProducts({
    category: product?.category?.slug,
    limit: 6,
    exclude: product?.id,
  });
  const relatedProducts = (() => {
    const d = relatedData?.data;
    const arr = Array.isArray(d)
      ? d
      : Array.isArray(d?.data)
        ? d.data
        : Array.isArray(relatedData)
          ? relatedData
          : [];
    return arr.filter((p) => p.id !== product?.id).slice(0, 6);
  })();

  // Wishlist API
  const { data: wishlistData } = useWishlist();
  const wishlistItems = (() => {
    const d = wishlistData?.data;
    return Array.isArray(d) ? d : Array.isArray(d?.data) ? d.data : [];
  })();
  const isInWishlist =
    product && Array.isArray(wishlistItems)
      ? wishlistItems.some((w) => (w.product_id || w.id) === product.id)
      : false;
  const addToWishlist = useAddToWishlist();
  const removeFromWishlist = useRemoveFromWishlist();

  // Review mutations
  const submitReview = useSubmitReview();
  const updateReview = useUpdateReview();
  const deleteReview = useDeleteReview();

  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selectedVariants, setSelectedVariants] = useState({});
  const matchedVariant = useMemo(() => {
    if (!product?.rawVariants?.length) return null;
    const keys = Object.keys(selectedVariants);
    if (keys.length === 0) return null;
    return (
      product.rawVariants.find((v) =>
        keys.every((k) => v.attributes[k] === selectedVariants[k]),
      ) || null
    );
  }, [product?.rawVariants, selectedVariants]);
  const displayPrice = matchedVariant?.price ?? product?.price;
  const displayOriginalPrice =
    matchedVariant?.compare_price ?? product?.originalPrice;
  const displayStock = matchedVariant
    ? matchedVariant.stock_quantity
    : product?.stock;
  const availableStock = Number(displayStock ?? 0);
  const isOutOfStock = availableStock <= 0;
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [editingReview, setEditingReview] = useState(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [defaultTab, setDefaultTab] = useState(
    searchParams.get("tab") === "reviews" ? "reviews" : "description",
  );
  const { addItem } = useCartStore();
  const { addRecentlyViewed, removeRecentlyViewed } = useUIStore();
  const discount = product
    ? calculateDiscount(displayOriginalPrice, displayPrice)
    : 0;

  // Track recently viewed
  useEffect(() => {
    if (product) {
      addRecentlyViewed({
        id: product.id,
        name: product.name,
        slug: product.slug,
        price: product.price,
        image: product.images?.[0],
        rating: product.rating,
        reviewCount: product.reviewCount ?? 0,
      });
    }
  }, [product?.id]);

  useEffect(() => {
    if (!isError || !slug) return;

    const staleItem = (useUIStore.getState().recentlyViewed || []).find(
      (item) => item?.slug === slug,
    );

    if (staleItem?.id) {
      removeRecentlyViewed(staleItem.id);
    }
  }, [isError, slug, removeRecentlyViewed]);

  useEffect(() => {
    const requestedTab = searchParams.get("tab");
    const wantsWriteReview = searchParams.get("writeReview") === "1";

    if (requestedTab === "reviews") {
      setDefaultTab("reviews");
    }

    if (wantsWriteReview) {
      setDefaultTab("reviews");
      setShowReviewForm(true);
    }
  }, [searchParams.toString()]);

  useEffect(() => {
    if (availableStock <= 0) {
      setQuantity(1);
      return;
    }

    setQuantity((current) => Math.min(current, availableStock));
  }, [availableStock]);

  // Compute estimated delivery date (2-5 business days from now)
  const deliveryDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toLocaleDateString("en-EG", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  }, []);
  const deliveryDateMax = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 5);
    return d.toLocaleDateString("en-EG", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  }, []);

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6">
        <ProductDetailSkeleton />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <h2 className="text-xl sm:text-2xl font-bold text-text">
          {t("productDetail.notFound")}
        </h2>
        <p className="text-text-secondary">{t("productDetail.notFoundDesc")}</p>
        <Link to="/" className="text-accent hover:underline">
          {t("productDetail.returnHome")}
        </Link>
      </div>
    );
  }

  const handleAddToCart = () => {
    if (isOutOfStock) {
      toast.error(t("common.outOfStock"));
      return;
    }

    addItem({
      id: product.id,
      variant_id: matchedVariant?.id || null,
      name: matchedVariant
        ? `${product.name} - ${matchedVariant.name}`
        : product.name,
      slug: product.slug,
      price: displayPrice,
      image: product.images[0],
      quantity,
      merchant: product.merchant.name,
      variants: selectedVariants,
    });
    trackFacebookEvent("AddToCart", {
      content_ids: [String(product.id)],
      content_type: "product",
      value: Number(displayPrice) * Number(quantity),
      currency: activeCurrency,
    });
  };

  const handleBuyNow = () => {
    if (isOutOfStock) {
      toast.error(t("common.outOfStock"));
      return;
    }

    const buyNowItem = {
      id: product.id,
      variant_id: matchedVariant?.id || null,
      name: matchedVariant
        ? `${product.name} - ${matchedVariant.name}`
        : product.name,
      slug: product.slug,
      price: displayPrice,
      image: product.images[0],
      quantity,
      merchant: product.merchant.name,
      variants: selectedVariants,
    };

    addItem(buyNowItem);
    trackFacebookEvent("InitiateCheckout", {
      content_ids: [String(product.id)],
      content_type: "product",
      value: Number(displayPrice) * Number(quantity),
      currency: activeCurrency,
      num_items: Number(quantity),
    });
    navigate("/checkout", { state: { buyNowItems: [buyNowItem] } });
  };

  const handleMerchantChat = () => {
    if (!product) return;
    if (!currentUser) {
      navigate("/login");
      return;
    }

    if (!apiProduct?.vendor_id) {
      return;
    }

    const vendorId = apiProduct?.vendor?.id ?? apiProduct?.vendor_id;
    if (!vendorId) {
      toast.error(t("productDetail.merchantUnavailable"));
      return;
    }

    sendMessage.mutate(
      {
        vendor_id: vendorId,
        message: `Product inquiry: ${product.name} (${window.location.origin}/product/${product.slug})`,
      },
      {
        onSuccess: (response) => {
          const conversationId =
            response?.data?.conversation_id ?? response?.conversation_id;
          if (conversationId) {
            navigate(`/messages?conversation=${conversationId}`);
          }
        },
        onError: (err) => {
          toast.error(
            err?.response?.data?.message || t("productDetail.messageFailed"),
          );
        },
      },
    );
  };

  const handleWishlistToggle = async () => {
    try {
      if (isInWishlist) {
        await removeFromWishlist.mutateAsync(product.id);
        toast.success(t("productDetail.removedFromWishlist"));
      } else {
        await addToWishlist.mutateAsync(product.id);
        toast.success(t("productDetail.addedToWishlist"));
      }
    } catch {
      toast.error(t("productDetail.wishlistFailed"));
    }
  };

  const handleSubmitReview = async () => {
    if (!reviewComment.trim()) return;
    try {
      if (editingReview) {
        await updateReview.mutateAsync({
          productId: product.id,
          reviewId: editingReview.id,
          data: { rating: reviewRating, comment: reviewComment },
        });
        toast.success(t("productDetail.reviewUpdated"));
      } else {
        await submitReview.mutateAsync({
          productId: product.id,
          data: { rating: reviewRating, comment: reviewComment },
        });
        toast.success(t("productDetail.reviewSubmitted"));
      }
      setShowReviewForm(false);
      setEditingReview(null);
      setReviewComment("");
      setReviewRating(5);
    } catch (err) {
      toast.error(
        err?.response?.data?.message || t("productDetail.reviewFailed"),
      );
    }
  };

  const handleDeleteReview = async (reviewId) => {
    if (!confirm(t("productDetail.confirmDeleteReview"))) return;
    try {
      await deleteReview.mutateAsync({ productId: product.id, reviewId });
      toast.success(t("productDetail.reviewDeleted"));
    } catch {
      toast.error(t("productDetail.reviewDeleteFailed"));
    }
  };

  // Approved/public review stats
  const totalReviews = Number(
    reviewStats?.total_reviews ?? reviewsList.length ?? 0,
  );
  const averageRating = Number(
    reviewStats?.average_rating ??
      (totalReviews > 0
        ? reviewsList.reduce(
            (sum, review) => sum + Number(review.rating || 0),
            0,
          ) / totalReviews
        : 0),
  );
  const ratingBreakdown = [5, 4, 3, 2, 1].map((stars) => ({
    stars,
    count: Number(
      reviewStats?.rating_distribution?.[stars] ??
        reviewsList.filter((review) => Number(review.rating) === stars).length,
    ),
  }));

  const tabs = [
    {
      id: "description",
      label: t("productDetail.descriptionTab"),
      content: (
        <div className="prose max-w-none">
          <p className="text-text-secondary leading-relaxed">
            {product.description}
          </p>
          <h3 className="text-lg font-semibold text-text mt-4 mb-2">
            {t("productDetail.keyFeatures")}
          </h3>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {product.features.map((f) => (
              <li
                key={f}
                className="flex items-center gap-2 text-sm text-text-secondary"
              >
                <span className="w-1.5 h-1.5 bg-primary rounded-full flex-shrink-0" />
                {t(f)}
              </li>
            ))}
          </ul>
        </div>
      ),
    },
    {
      id: "specifications",
      label: t("productDetail.specificationsTab"),
      content: (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
          {product.specifications.map((spec, i) => (
            <div
              key={i}
              className={`flex justify-between py-3 border-b border-border/50 ${i % 2 === 0 ? "bg-white" : ""}`}
            >
              <span className="text-sm text-text-secondary">
                {t(spec.label)}
              </span>
              <span className="text-sm font-medium text-text">
                {spec.value}
              </span>
            </div>
          ))}
        </div>
      ),
    },
    {
      id: "reviews",
      label: t("productDetail.reviewsTab", { count: totalReviews }),
      content: (
        <div>
          <div className="flex flex-col md:flex-row gap-8 mb-8">
            <div className="text-center">
              <div className="text-5xl font-bold text-text">
                {totalReviews > 0 ? averageRating.toFixed(1) : "0"}
              </div>
              <StarRating rating={averageRating} size="lg" />
              <p className="text-sm text-text-secondary mt-1">
                {t("productDetail.reviews", { count: totalReviews })}
              </p>
            </div>
            <div className="flex-1 space-y-2">
              {ratingBreakdown.map((r) => (
                <div key={r.stars} className="flex items-center gap-2">
                  <span className="text-sm w-8">{r.stars}★</span>
                  <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full"
                      style={{
                        width:
                          totalReviews > 0
                            ? `${(r.count / totalReviews) * 100}%`
                            : "0%",
                      }}
                    />
                  </div>
                  <span className="text-xs text-text-secondary w-8">
                    {r.count}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Write / Edit Review Form */}
          <div className="mb-6">
            {!showReviewForm ? (
              <Button variant="outline" onClick={() => setShowReviewForm(true)}>
                {t("productDetail.writeReview") || "Write Review"}
              </Button>
            ) : (
              <div className="p-4 border border-border rounded-lg space-y-3">
                <h4 className="font-medium text-text">
                  {editingReview
                    ? t("productDetail.editReview")
                    : t("productDetail.writeReview")}
                </h4>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-text-secondary">
                    {t("productDetail.rating")}:
                  </span>
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      key={s}
                      onClick={() => setReviewRating(s)}
                      className="focus:outline-none"
                    >
                      <Star
                        className={`h-5 w-5 ${s <= reviewRating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`}
                      />
                    </button>
                  ))}
                </div>
                <textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder={t("productDetail.reviewPlaceholder")}
                  rows={3}
                  className="w-full border border-border rounded-lg p-3 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                />
                <div className="flex gap-2">
                  <Button
                    onClick={handleSubmitReview}
                    loading={submitReview.isPending || updateReview.isPending}
                  >
                    {editingReview ? t("common.update") : t("common.submit")}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowReviewForm(false);
                      setEditingReview(null);
                      setReviewComment("");
                      setReviewRating(5);
                    }}
                  >
                    {t("common.cancel")}
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4">
            {reviewsList.length === 0 && (
              <p className="text-text-secondary text-sm py-4">
                {t("productDetail.noReviews")}
              </p>
            )}
            {reviewsList.map((review) => (
              <div key={review.id} className="border-b border-border/50 pb-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-sm font-medium">
                    {(review.user?.name || review.user || "U")[0]}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-text">
                        {review.user?.name || review.user}
                      </p>
                      {review.verified_purchase && (
                        <Badge
                          variant="success"
                          size="sm"
                          className="flex items-center gap-1"
                        >
                          <CheckCircle className="h-3 w-3" />{" "}
                          {t("productDetail.verifiedBuyer")}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <StarRating rating={review.rating} size="sm" />
                      <span className="text-xs text-text-secondary">
                        {review.created_at
                          ? new Date(review.created_at).toLocaleDateString()
                          : review.date}
                      </span>
                    </div>
                  </div>
                  {review.is_own && (
                    <div className="flex gap-1">
                      <button
                        onClick={() => {
                          setEditingReview(review);
                          setReviewRating(review.rating);
                          setReviewComment(review.comment || review.body || "");
                          setShowReviewForm(true);
                        }}
                        className="p-1 text-text-secondary hover:text-accent"
                        title="Edit"
                        aria-label="Edit"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteReview(review.id)}
                        className="p-1 text-text-secondary hover:text-danger"
                        title="Delete"
                        aria-label="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
                <p className="text-sm text-text-secondary">
                  {review.comment || review.body}
                </p>
                {(review.vendor_reply ||
                  review.admin_reply ||
                  review.reply) && (
                  <div className="mt-2 ml-8 p-3 bg-gray-50 rounded-lg border-l-2 border-primary">
                    <p className="text-xs font-medium text-primary mb-1">
                      {review.admin_reply
                        ? t("productDetail.adminResponse")
                        : t("productDetail.sellerResponse")}
                    </p>
                    <p className="text-sm text-text-secondary">
                      {review.vendor_reply ||
                        review.admin_reply ||
                        review.reply}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <Breadcrumb
        items={[
          { label: t("common.home"), href: "/" },
          {
            label: product.category.name,
            href: `/category/${product.category.slug}`,
          },
          { label: product.name },
        ]}
      />

      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Images */}
        <div>
          <div className="rounded-xl overflow-hidden bg-gray-50 border border-border/50 mb-3">
            <ImageZoom src={product.images[selectedImage]} alt={product.name} />
          </div>
          <div className="flex gap-2">
            {product.images.map((img, i) => (
              <button
                key={i}
                onClick={() => setSelectedImage(i)}
                className={`w-16 h-16 rounded-lg overflow-hidden border-2 transition bg-white ${i === selectedImage ? "border-primary" : "border-border/50"}`}
              >
                <img
                  src={img}
                  alt=""
                  loading="lazy"
                  className="w-full h-full object-contain"
                />
              </button>
            ))}
          </div>
        </div>

        {/* Details */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            {apiProduct?.vendor_id && product.merchant.slug ? (
              <Link
                to={`/store/${product.merchant.slug}`}
                className="text-sm text-accent hover:underline"
              >
                {product.merchant.name}
              </Link>
            ) : (
              <span className="text-sm text-text-secondary">
                {product.merchant.name}
              </span>
            )}
            <Badge variant="info" size="sm">
              <Star className="h-3 w-3" /> {product.merchant.rating.toFixed(2)}
            </Badge>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-text">
            {product.name}
          </h1>

          <div className="flex items-center gap-4 mt-2">
            <div className="flex items-center gap-1">
              <StarRating rating={averageRating} />
              <span className="text-sm text-text-secondary">
                ({t("productDetail.reviewCount", { count: totalReviews })})
              </span>
            </div>
            <span className="text-sm text-text-secondary">
              {t("productDetail.sold", { count: product.sold })}
            </span>
            <span className="text-sm text-text-secondary">
              {t("productDetail.sku", { sku: product.sku })}
            </span>
          </div>

          <div className="flex items-baseline gap-3 mt-4">
            <span className="text-3xl font-bold text-primary">
              {formatCurrency(displayPrice)}
            </span>
            {discount > 0 && (
              <>
                <span className="text-lg text-text-secondary line-through">
                  {formatCurrency(displayOriginalPrice)}
                </span>
                <Badge variant="danger">-{discount}%</Badge>
              </>
            )}
          </div>

          {/* Stock urgency */}
          {product.inStock && availableStock <= 5 && availableStock > 0 && (
            <div className="flex items-center gap-2 mt-3 text-amber-600">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm font-semibold">
                {t("productDetail.lowStock", { count: availableStock })}
              </span>
            </div>
          )}
          {!product.inStock && (
            <div className="mt-3">
              <Badge variant="danger" size="lg">
                {t("common.outOfStock")}
              </Badge>
            </div>
          )}

          <p className="text-sm text-text-secondary mt-3">
            {product.shortDescription}
          </p>

          {/* Variants */}
          {product.variantGroups.map((group) => (
            <div key={group.type} className="mt-4">
              <label className="text-sm font-medium text-text capitalize">
                {group.type}:{" "}
                <span className="text-accent">
                  {selectedVariants[group.type]
                    ? selectedVariants[group.type]
                    : t("productDetail.select")}
                </span>
              </label>
              <div className="flex flex-wrap gap-2 mt-1.5">
                {group.options.map((opt) => (
                  <button
                    key={opt}
                    onClick={() =>
                      setSelectedVariants((prev) => ({
                        ...prev,
                        [group.type]:
                          prev[group.type] === opt ? undefined : opt,
                      }))
                    }
                    className={`px-3 py-1.5 text-sm rounded-lg border transition ${selectedVariants[group.type] === opt ? "border-primary bg-primary/10 text-primary font-medium" : "border-border text-text hover:border-primary"}`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          ))}
          {matchedVariant && (
            <div className="mt-2 text-xs text-text-secondary">
              {matchedVariant.stock_quantity > 0 ? (
                <span className="text-green-600">
                  {matchedVariant.stock_quantity <= 5
                    ? t("productDetail.inStockCount", {
                        count: matchedVariant.stock_quantity,
                      })
                    : t("common.inStock")}
                </span>
              ) : (
                <span className="text-red-500">{t("common.outOfStock")}</span>
              )}
            </div>
          )}

          {/* Quantity + Add to Cart */}
          <div className="flex items-center gap-4 mt-6">
            <div className="flex items-center border border-border rounded-lg">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="p-2 hover:bg-gray-50"
                aria-label="Decrease"
                disabled={isOutOfStock}
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-12 text-center font-medium">{quantity}</span>
              <button
                onClick={() =>
                  setQuantity(Math.min(availableStock, quantity + 1))
                }
                className="p-2 hover:bg-gray-50"
                aria-label="Add"
                disabled={isOutOfStock}
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <span className="text-sm text-text-secondary">
              {availableStock > 5
                ? t("common.inStock")
                : t("productDetail.available", { count: availableStock })}
            </span>
          </div>

          <div className="flex flex-wrap gap-3 mt-4">
            <Button
              onClick={handleAddToCart}
              icon={ShoppingCart}
              className="flex-1 min-w-[140px]"
              disabled={isOutOfStock}
            >
              {t("productDetail.addToCart")}
            </Button>
            <Button
              variant="primary"
              className="flex-1 min-w-[140px]"
              onClick={handleBuyNow}
              disabled={isOutOfStock}
            >
              {t("productDetail.buyNow")}
            </Button>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={handleWishlistToggle}
                loading={
                  addToWishlist.isPending || removeFromWishlist.isPending
                }
              >
                <Heart
                  className={`h-5 w-5 ${isInWishlist ? "fill-danger text-danger" : ""}`}
                />
              </Button>
              <Button variant="outline">
                <Share2 className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Shipping info */}
          <div className="mt-6 space-y-3 p-4 bg-gray-50 rounded-lg">
            {/* <div className="flex items-center gap-3 text-sm">
              <Truck className="h-5 w-5 text-green-600 flex-shrink-0" />
              <div>
                <p className="font-medium text-text">
                  <span className="text-green-600">
                    {t("productDetail.freeDelivery")}
                  </span>{" "}
                  {deliveryDate} - {deliveryDateMax}
                </p>
                <p className="text-text-secondary text-xs">
                  {t("productDetail.orderWithin")}
                </p>
              </div>
            </div> */}
            {/* <div className="flex items-center gap-3 text-sm">
              <Zap className="h-5 w-5 text-amber-500 flex-shrink-0" />
              <div>
                <p className="font-medium text-text">
                  {t("productDetail.expressDelivery")}
                </p>
                <p className="text-text-secondary text-xs">
                  {t("productDetail.expressDeliveryDesc")}
                </p>
              </div>
            </div> */}
            <div className="flex items-center gap-3 text-sm">
              <Shield className="h-5 w-5 text-primary flex-shrink-0" />
              <div>
                <p className="font-medium text-text">
                  {t("productDetail.buyerProtection")}
                </p>
                <p className="text-text-secondary text-xs">
                  {t("productDetail.fullRefund")}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <RotateCcw className="h-5 w-5 text-primary flex-shrink-0" />
              <div>
                <p className="font-medium text-text">
                  {t("productDetail.easyReturns")}
                </p>
                <p className="text-text-secondary text-xs">
                  {t("productDetail.returnPolicy")}
                </p>
              </div>
            </div>
          </div>

          {/* Merchant Card */}
          <div className="mt-4 p-4 border border-border/50 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                <Store className="h-5 w-5 text-primary" />
              </div>
              <div>
                {apiProduct?.vendor_id ? (
                  <Link
                    to={`/store/${product.merchant.slug}`}
                    className="font-medium text-text hover:text-accent"
                  >
                    {product.merchant.name}
                  </Link>
                ) : (
                  <p className="font-medium text-text">Website</p>
                )}
                <p className="text-xs text-text-secondary">
                  {t("productDetail.productsCount", {
                    count: product.merchant.products,
                  })}{" "}
                  • {product.merchant.rating.toFixed(2)}★
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              {apiProduct?.vendor_id && (
                <>
                  <Link to={`/store/${product.merchant.slug}`}>
                    <Button variant="outline" size="sm">
                      {t("productDetail.visitStore")}
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    size="sm"
                    icon={MessageCircle}
                    onClick={handleMerchantChat}
                  >
                    {t("productDetail.chat")}
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-10">
        <Tabs tabs={tabs} defaultTab={defaultTab} />
      </div>

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <section className="mt-10">
          <h2 className="text-xl font-bold text-text mb-4">
            {t("productDetail.relatedProducts")}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {relatedProducts.map((p) => (
              <Link
                key={p.id}
                to={`/product/${p.slug}`}
                className="group bg-white rounded-lg border border-border/50 hover:shadow-lg transition overflow-hidden"
              >
                <div className="aspect-square bg-gray-50">
                  <img
                    src={
                      p.image ||
                      (p.images && p.images[0]) ||
                      `https://placehold.co/300x300/f0f0f0/333?text=${encodeURIComponent(p.name?.slice(0, 8) || "Product")}`
                    }
                    alt={p.name}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                </div>
                <div className="p-3">
                  <h3 className="text-sm font-medium text-text line-clamp-2">
                    {p.name}
                  </h3>
                  <StarRating
                    rating={parseFloat(p.rating || p.average_rating || 0)}
                    size="sm"
                  />
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-base font-bold text-primary">
                      {formatCurrency(p.price)}
                    </span>
                    {p.compare_price &&
                      parseFloat(p.compare_price) > parseFloat(p.price) && (
                        <span className="text-xs text-text-secondary line-through">
                          {formatCurrency(p.compare_price)}
                        </span>
                      )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
