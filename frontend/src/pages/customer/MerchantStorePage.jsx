import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  Store,
  Star,
  MapPin,
  Calendar,
  MessageCircle,
  Share2,
  Grid3X3,
  Package,
  Users,
  ThumbsUp,
  Loader2,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import StarRating from "@/components/ui/StarRating";
import Tabs from "@/components/ui/Tabs";
import Breadcrumb from "@/components/ui/Breadcrumb";
import Pagination from "@/components/ui/Pagination";
import { useTranslation } from "@/hooks/useTranslation";
import { formatCurrency, calculateDiscount } from "@/lib/utils";
import { useVendor, useVendorProducts, useSendMessage } from "@/hooks/useApi";
import { useAuthStore } from "@/store/authStore";
import toast from "react-hot-toast";

export default function MerchantStorePage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const currentUser = useAuthStore((state) => state.user);
  const sendMessage = useSendMessage();
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const perPage = 12;

  const {
    data: merchant,
    isLoading: merchantLoading,
    error: merchantError,
  } = useVendor(slug);
  const { data: productsData, isLoading: productsLoading } = useVendorProducts(
    slug,
    {
      page: currentPage,
      per_page: perPage,
      category: selectedCategory !== "all" ? selectedCategory : undefined,
    },
  );

  if (merchantLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const merchantPayload = merchant?.data ?? merchant;
  const merchantInfo = merchantPayload?.data ?? merchantPayload;

  if (merchantError || !merchantInfo) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-text-secondary">
        <Store className="h-12 w-12 mb-4" />
        <p className="text-lg font-medium">Store not found</p>
      </div>
    );
  }

  const productsPayload = productsData?.data ?? productsData;
  const products = Array.isArray(productsPayload)
    ? productsPayload
    : Array.isArray(productsPayload?.data)
      ? productsPayload.data
      : [];
  const productsMeta = productsData?.meta ?? productsPayload?.meta ?? {};
  const totalPages =
    productsMeta?.last_page ??
    productsData?.last_page ??
    Math.max(1, Math.ceil((productsMeta?.total ?? products.length) / perPage));
  const categories = ["all", ...(merchantInfo.categories ?? [])];

  const handleMerchantChat = () => {
    if (!merchantInfo?.id) {
      toast.error("Merchant is unavailable for chat.");
      return;
    }

    if (!currentUser) {
      navigate("/login");
      return;
    }

    sendMessage.mutate(
      {
        vendor_id: merchantInfo.id,
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
            err?.response?.data?.message || "Failed to send message.",
          );
        },
      },
    );
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Banner */}
      <div className="relative h-48 md:h-64">
        <img
          src={merchantInfo.banner}
          alt=""
          loading="lazy"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
      </div>

      {/* Store Info */}
      <div className="relative px-4 -mt-16">
        <div className="bg-white rounded-xl border border-border/50 p-6">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
            <img
              src={merchantInfo.logo}
              alt={
                merchantInfo.name ||
                merchantInfo.store_name ||
                merchantInfo.business_name
              }
              loading="lazy"
              className="w-20 h-20 rounded-xl border-4 border-white shadow-lg"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-text">
                  {merchantInfo.name ||
                    merchantInfo.store_name ||
                    merchantInfo.business_name}
                </h1>
                <Badge variant="success">Verified</Badge>
              </div>
              <div className="flex flex-wrap items-center gap-4 mt-1 text-sm text-text-secondary">
                <span className="flex items-center gap-1">
                  <Star className="h-4 w-4 text-primary" />
                  {merchantInfo.rating ?? "—"} (
                  {t("merchantStore.reviewsCount", {
                    count:
                      merchantInfo.review_count ??
                      merchantInfo.reviewCount ??
                      0,
                  })}
                  )
                </span>
                <span className="flex items-center gap-1">
                  <Package className="h-4 w-4" />
                  {t("merchantStore.productsCount", {
                    count:
                      merchantInfo.products_count ??
                      merchantInfo.product_count ??
                      merchantInfo.productCount ??
                      products.length,
                  })}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  {t("merchantStore.followersCount", {
                    count: (merchantInfo.followers ?? 0).toLocaleString(),
                  })}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {merchantInfo.location ||
                    [merchantInfo.city, merchantInfo.country]
                      .filter(Boolean)
                      .join(", ") ||
                    "—"}
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button icon={MessageCircle} onClick={handleMerchantChat}>
                {t("productDetail.chat")}
              </Button>
              <Button variant="outline" icon={Share2}>
                Share
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mt-6 p-4 bg-gray-50 rounded-lg">
            <div className="text-center">
              <p className="text-xl sm:text-2xl font-bold text-success">
                {merchantInfo.positive_rating ??
                  merchantInfo.positiveRating ??
                  "—"}
                %
              </p>
              <p className="text-xs text-text-secondary">
                {t("merchantStore.positiveRating")}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xl sm:text-2xl font-bold text-primary">
                {merchantInfo.ship_on_time ?? merchantInfo.shipOnTime ?? "—"}%
              </p>
              <p className="text-xs text-text-secondary">
                {t("merchantStore.shipsOnTime")}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xl sm:text-2xl font-bold text-accent">
                {merchantInfo.response_rate ?? merchantInfo.responseRate ?? "—"}
                %
              </p>
              <p className="text-xs text-text-secondary">
                {t("merchantStore.responseRate")}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Store Content */}
      <div className="px-4 py-6">
        <div className="flex flex-wrap items-center gap-2 mb-6">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => {
                setSelectedCategory(cat);
                setCurrentPage(1);
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition capitalize ${selectedCategory === cat ? "bg-primary text-white border-primary" : "border-border text-text-secondary hover:border-primary"}`}
            >
              {cat === "all" ? t("merchantStore.allProducts") : cat}
            </button>
          ))}
        </div>

        {productsLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {products.map((product) => {
            const discount = calculateDiscount(
              product.originalPrice ?? product.original_price,
              product.price,
            );
            return (
              <Link
                key={product.id}
                to={`/product/${product.slug}`}
                className="group bg-white rounded-lg border border-border/50 hover:shadow-lg transition overflow-hidden"
              >
                <div className="relative aspect-square bg-gray-50">
                  <img
                    src={
                      product.image ?? product.thumbnail ?? product.images?.[0]
                    }
                    alt={product.name}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                  {discount > 0 && (
                    <span className="absolute top-2 right-2 bg-danger text-white text-xs font-bold px-2 py-0.5 rounded">
                      -{discount}%
                    </span>
                  )}
                </div>
                <div className="p-3">
                  <h3 className="text-sm font-medium text-text line-clamp-2">
                    {product.name}
                  </h3>
                  <div className="flex items-center gap-1 mt-1">
                    <StarRating rating={product.rating} size="sm" />
                    <span className="text-xs text-text-secondary">
                      ({product.reviewCount})
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-base font-bold text-primary">
                      {formatCurrency(product.price)}
                    </span>
                    {(product.originalPrice ?? product.original_price) && (
                      <span className="text-xs text-text-secondary line-through">
                        {formatCurrency(
                          product.originalPrice ?? product.original_price,
                        )}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
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
  );
}
