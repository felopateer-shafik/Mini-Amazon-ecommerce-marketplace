import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Search,
  ShoppingCart,
  Heart,
  User,
  Menu,
  X,
  ChevronDown,
  Bell,
  MapPin,
  Globe,
  Store,
  Shield,
  Tag,
  Navigation,
  Save,
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useCartStore } from "@/store/cartStore";
import {
  useNotifications,
  useCategories,
  useCreateAddress,
} from "@/hooks/useApi";
import { useWishlist } from "@/hooks/useApi";
import SearchAutocomplete from "@/components/SearchAutocomplete";
import Dropdown, { DropdownItem } from "@/components/ui/Dropdown";
import Modal from "@/components/ui/Modal";
import MapAddressPicker from "@/components/ui/MapAddressPicker";
import { useTranslation } from "@/hooks/useTranslation";
import {
  canAccessAdminPath,
  firstAccessibleAdminPath,
} from "@/lib/adminAccess";

/* Pastel colour palette cycled for categories without an image */
const PASTEL_PALETTES = [
  { bg: "bg-indigo-100", fg: "text-indigo-700" },
  { bg: "bg-pink-100", fg: "text-pink-700" },
  { bg: "bg-emerald-100", fg: "text-emerald-700" },
  { bg: "bg-amber-100", fg: "text-amber-700" },
  { bg: "bg-blue-100", fg: "text-blue-700" },
  { bg: "bg-rose-100", fg: "text-rose-700" },
  { bg: "bg-yellow-100", fg: "text-yellow-700" },
  { bg: "bg-slate-200", fg: "text-slate-700" },
  { bg: "bg-teal-100", fg: "text-teal-700" },
  { bg: "bg-orange-100", fg: "text-orange-700" },
];

/**
 * Auto-scrolling marquee hook for horizontal containers.
 * Renders duplicated content so the strip loops seamlessly.
 * Touch / mouse drag pauses the auto-scroll and lets the user swipe.
 */
function useMarqueeScroll(ref, itemCount) {
  const rafId = useRef(null);
  const speed = useRef(0.5); // px per frame
  const paused = useRef(false);
  const dragStartX = useRef(0);
  const dragScrollLeft = useRef(0);
  const isDragging = useRef(false);

  /* Auto-scroll loop — when we reach the duplicated half we jump back */
  const tick = useCallback(() => {
    const el = ref.current;
    if (el && !paused.current) {
      const half = el.scrollWidth / 2;
      if (half > 0) {
        el.scrollLeft += speed.current;
        if (el.scrollLeft >= half) el.scrollLeft -= half;
        if (el.scrollLeft < 0) el.scrollLeft += half;
      }
    }
    rafId.current = requestAnimationFrame(tick);
  }, [ref]);

  useEffect(() => {
    if (itemCount === 0) return;
    rafId.current = requestAnimationFrame(tick);
    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, [tick, itemCount]);

  const onPointerDown = useCallback(
    (e) => {
      paused.current = true;
      isDragging.current = true;
      const el = ref.current;
      if (!el) return;
      dragStartX.current = e.clientX ?? e.touches?.[0]?.clientX ?? 0;
      dragScrollLeft.current = el.scrollLeft;
    },
    [ref],
  );

  const onPointerMove = useCallback(
    (e) => {
      if (!isDragging.current) return;
      const el = ref.current;
      if (!el) return;
      const x = e.clientX ?? e.touches?.[0]?.clientX ?? 0;
      el.scrollLeft = dragScrollLeft.current - (x - dragStartX.current);
    },
    [ref],
  );

  const onPointerUp = useCallback(() => {
    isDragging.current = false;
    /* resume auto-scroll after a short pause so it doesn't feel jarring */
    setTimeout(() => {
      paused.current = false;
    }, 1500);
  }, []);

  return { onPointerDown, onPointerMove, onPointerUp };
}

export default function CustomerHeader() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [deliveryLocation, setDeliveryLocation] = useState(() => {
    try {
      const stored = localStorage.getItem("delivery_location");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [locatingDelivery, setLocatingDelivery] = useState(false);
  const [deliveryModalOpen, setDeliveryModalOpen] = useState(false);
  const [addrForm, setAddrForm] = useState({
    label: "",
    first_name: "",
    last_name: "",
    phone: "",
    address_line_1: "",
    address_line_2: "",
    city: "",
    state: "",
    postal_code: "",
    country: "EG",
  });
  const createAddress = useCreateAddress();
  const { user, isAuthenticated, logout } = useAuthStore();
  const itemCount = useCartStore((s) => s.getItemCount());
  const cartNotification = useCartStore((s) => s.cartNotification);
  const { data: wishlistRes } = useWishlist(isAuthenticated);
  const { data: notificationsRes } = useNotifications(
    undefined,
    isAuthenticated,
  );
  const { data: categoriesRes } = useCategories();

  const categories = useMemo(() => {
    const raw = categoriesRes?.data ?? categoriesRes ?? [];
    return Array.isArray(raw) ? raw : [];
  }, [categoriesRes]);

  const wishlistCount = useMemo(() => {
    const payload = wishlistRes?.data ?? wishlistRes ?? [];
    if (Array.isArray(payload)) return payload.length;
    if (Array.isArray(payload?.data)) return payload.data.length;
    return 0;
  }, [wishlistRes]);
  const unreadNotifications = notificationsRes?.meta?.unread_count ?? 0;
  const navigate = useNavigate();
  const { t, language, setLanguage, isRTL } = useTranslation();
  const mobileMenuRef = useRef(null);
  const mobileCatRef = useRef(null);
  const adminHomePath = firstAccessibleAdminPath(user);
  const showAdminQuickAccess = adminHomePath !== "/";
  const chatRoute = canAccessAdminPath(user, "/admin/chat")
    ? "/admin/chat"
    : user?.role === "merchant"
      ? "/merchant/messages"
      : "/messages";

  const scrollHandlers = useMarqueeScroll(mobileCatRef, categories.length);

  useEffect(() => {
    if (!mobileMenuOpen) return;

    const container = mobileMenuRef.current;
    if (!container) return;

    const getFocusable = () =>
      container.querySelectorAll(
        'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
      );

    const focusable = getFocusable();
    if (focusable.length > 0) {
      focusable[0].focus();
    }

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setMobileMenuOpen(false);
        return;
      }

      if (event.key !== "Tab") return;

      const items = getFocusable();
      if (items.length === 0) return;

      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [mobileMenuOpen]);

  const handleSearch = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchQuery.trim()) params.set("q", searchQuery.trim());
    if (selectedCategory) params.set("category", selectedCategory);
    const qs = params.toString();
    if (selectedCategory && !searchQuery.trim()) {
      navigate(`/category/${selectedCategory}`);
    } else if (qs) {
      navigate(`/products?${qs}`);
    }
  };

  const handleDetectDeliveryLocation = useCallback(() => {
    if (!navigator.geolocation || locatingDelivery) return;
    setLocatingDelivery(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&addressdetails=1&accept-language=en`,
            { headers: { "User-Agent": "EcommerceMarketplace/1.0" } },
          );
          const data = await res.json();
          const addr = data.address || {};
          const loc = {
            city: addr.city || addr.town || addr.village || addr.county || "",
            area: addr.suburb || addr.neighbourhood || "",
            country: addr.country_code?.toUpperCase() || "",
          };
          setDeliveryLocation(loc);
          localStorage.setItem("delivery_location", JSON.stringify(loc));
        } catch {
          setDeliveryLocation({
            city: "Location detected",
            area: "",
            country: "",
          });
        } finally {
          setLocatingDelivery(false);
        }
      },
      () => {
        setLocatingDelivery(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }, [locatingDelivery]);

  return (
    <>
      <header className="top-0 z-40">
        {/* ═══ MOBILE HEADER (below md) ═══ */}
        <div className="fixed md:hidden top-0 inset-x-0 z-50 bg-secondary-dark text-white w-screen max-w-[100vw] overflow-visible">
          <div className="flex items-center h-12 gap-2 px-3">
            {/* Menu toggle */}
            <button
              className="p-1.5 shrink-0"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Menu"
            >
              {mobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>

            {/* Mobile search */}
            <form
              onSubmit={handleSearch}
              className="flex flex-1 min-w-0 overflow-hidden"
            >
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t("header.searchMobile")}
                className="w-0 flex-1 px-3 py-1.5 text-sm focus:outline-none text-text"
                style={{
                  backgroundColor: "#ffffff",
                  borderRadius: isRTL ? "0 8px 8px 0" : "8px 0 0 8px",
                }}
              />
              <button
                type="submit"
                className="bg-primary px-3 shrink-0"
                style={{ borderRadius: isRTL ? "8px 0 0 8px" : "0 8px 8px 0" }}
              >
                <Search className="h-5 w-5 text-secondary-dark" />
              </button>
            </form>

            {isAuthenticated ? (
              <Dropdown
                align="right"
                trigger={
                  <button
                    className="p-1.5 shrink-0"
                    aria-label={t("header.accountAndLists")}
                  >
                    <User className="h-5 w-5" />
                  </button>
                }
              >
                <div className="p-3 border-b border-border">
                  <p className="font-semibold text-text">{user?.name}</p>
                  <p className="text-xs text-text-secondary">{user?.email}</p>
                </div>
                <DropdownItem onClick={() => navigate("/account")}>
                  {t("header.myAccount")}
                </DropdownItem>
                <DropdownItem onClick={() => navigate("/orders")}>
                  {t("header.myOrders")}
                </DropdownItem>
                <DropdownItem onClick={() => navigate(chatRoute)}>
                  {t("productDetail.chat")}
                </DropdownItem>
                <DropdownItem onClick={() => navigate("/wishlist")}>
                  {t("header.wishlist")}
                </DropdownItem>
                <DropdownItem onClick={() => navigate("/wallet")}>
                  {t("header.wallet")}
                </DropdownItem>
                <DropdownItem onClick={() => navigate("/rewards")}>
                  {t("header.rewards")}
                </DropdownItem>
                {user?.role === "merchant" && (
                  <DropdownItem onClick={() => navigate("/merchant")}>
                    {t("header.sellerDashboard")}
                  </DropdownItem>
                )}
                {showAdminQuickAccess && (
                  <DropdownItem onClick={() => navigate(adminHomePath)}>
                    {t("header.adminPanel")}
                  </DropdownItem>
                )}
                <div className="border-t border-border mt-1 pt-1">
                  <DropdownItem
                    onClick={() => {
                      logout();
                      navigate("/");
                    }}
                    danger
                  >
                    {t("header.signOut")}
                  </DropdownItem>
                </div>
              </Dropdown>
            ) : (
              <Link
                to="/login"
                className="p-1.5 shrink-0"
                aria-label={t("header.accountAndLists")}
                title={t("header.signIn")}
              >
                <User className="h-5 w-5" />
              </Link>
            )}

            {isAuthenticated && user?.role === "merchant" && (
              <Link
                to="/merchant"
                className="p-1.5 shrink-0"
                title={t("header.sellerDashboard")}
              >
                <Store className="h-5 w-5 text-primary" />
              </Link>
            )}

            {showAdminQuickAccess && (
              <Link
                to={adminHomePath}
                className="p-1.5 shrink-0"
                title={t("header.adminPanel")}
              >
                <Shield className="h-5 w-5 text-accent" />
              </Link>
            )}

            {/* Language switch */}
            <button
              onClick={() => setLanguage(language === "ar" ? "en" : "ar")}
              className="p-1.5 shrink-0"
              title={language === "ar" ? "English" : "العربية"}
            >
              <Globe className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* ═══ DESKTOP HEADER (md and up) ═══ */}
        <div className="hidden md:block bg-secondary-dark text-white">
          <div className="container mx-auto px-4">
            <div className="flex items-center h-16 gap-3">
              {/* Logo */}
              <Link to="/" className="flex items-center gap-2 shrink-0">
                <div className="w-8 h-8 bg-primary rounded flex items-center justify-center">
                  <span className="text-white font-bold text-lg">M</span>
                </div>
                <span className="text-lg font-bold">{t("header.logo")}</span>
              </Link>

              {/* Delivery address */}
              <button
                onClick={() => setDeliveryModalOpen(true)}
                className="hidden lg:flex items-center gap-1 text-xs hover:outline hover:outline-1 hover:outline-white rounded p-1 transition-colors"
                title={t("header.deliverTo")}
              >
                <MapPin className="h-4 w-4 text-primary" />
                <div
                  className={
                    isRTL
                      ? "text-right max-width-170"
                      : "text-left  max-width-170"
                  }
                >
                  <span className="text-gray-300 block leading-tight">
                    {t("header.deliverTo")}
                  </span>
                  <span className="font-bold leading-tight">
                    {deliveryLocation
                      ? deliveryLocation.area
                        ? `${deliveryLocation.area}, ${deliveryLocation.city}`
                        : deliveryLocation.city || t("header.yourLocation")
                      : t("header.yourLocation")}
                  </span>
                </div>
              </button>

              {/* Search bar - desktop with autocomplete */}
              <div className="flex-1 min-w-0 max-w-3xl flex">
                <select
                  value={selectedCategory}
                  onChange={(e) => {
                    setSelectedCategory(e.target.value);
                    if (e.target.value && !searchQuery.trim()) {
                      navigate(`/category/${e.target.value}`);
                    }
                  }}
                  className="text-xs px-2 border-gray-300 min-w-[50px]"
                  style={{
                    backgroundColor: "#f3f4f6",
                    color: "#111",
                    borderRadius: isRTL ? "0 8px 8px 0" : "8px 0 0 8px",
                  }}
                >
                  <option value="">{t("header.allCategories")}</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.slug}>
                      {cat.name}
                    </option>
                  ))}
                </select>
                <SearchAutocomplete
                  query={searchQuery}
                  setQuery={setSearchQuery}
                  onSubmit={handleSearch}
                  isRTL={isRTL}
                  placeholder={t("header.searchPlaceholder")}
                />
              </div>

              {/* Right icons */}
              <div
                className={`flex items-center gap-1 shrink-0 ${isRTL ? "mr-auto" : "ml-auto"}`}
              >
                {/* Language Switch */}
                <button
                  onClick={() => setLanguage(language === "ar" ? "en" : "ar")}
                  className="flex items-center gap-1 p-2 hover:outline hover:outline-1 hover:outline-white rounded text-xs"
                  title={language === "ar" ? "English" : "العربية"}
                >
                  <Globe className="h-5 w-5" />
                  <span className="font-bold">
                    {language === "ar" ? "EN" : "ع"}
                  </span>
                </button>

                {/* Account */}
                {isAuthenticated ? (
                  <Dropdown
                    trigger={
                      <button className="flex items-center gap-1 text-xs hover:outline hover:outline-1 hover:outline-white rounded p-2">
                        <User className="h-5 w-5 lg:hidden" />
                        <div
                          className={`hidden lg:block ${isRTL ? "text-right" : "text-left"}`}
                        >
                          <span className="text-gray-300 block leading-tight">
                            {t("header.hello")}, {user?.name?.split(" ")[0]}
                          </span>
                          <span className="font-bold leading-tight flex items-center gap-0.5">
                            {t("header.accountAndLists")}{" "}
                            <ChevronDown className="h-3 w-3" />
                          </span>
                        </div>
                      </button>
                    }
                    align="right"
                  >
                    <div className="p-3 border-b border-border">
                      <p className="font-semibold text-text">{user?.name}</p>
                      <p className="text-xs text-text-secondary">
                        {user?.email}
                      </p>
                    </div>
                    <DropdownItem onClick={() => navigate("/account")}>
                      {t("header.myAccount")}
                    </DropdownItem>
                    <DropdownItem onClick={() => navigate("/orders")}>
                      {t("header.myOrders")}
                    </DropdownItem>
                    <DropdownItem onClick={() => navigate(chatRoute)}>
                      {t("productDetail.chat")}
                    </DropdownItem>
                    <DropdownItem onClick={() => navigate("/wishlist")}>
                      {t("header.wishlist")}
                    </DropdownItem>
                    <DropdownItem onClick={() => navigate("/wallet")}>
                      {t("header.wallet")}
                    </DropdownItem>
                    <DropdownItem onClick={() => navigate("/rewards")}>
                      {t("header.rewards")}
                    </DropdownItem>
                    {user?.role === "merchant" && (
                      <DropdownItem onClick={() => navigate("/merchant")}>
                        {t("header.sellerDashboard")}
                      </DropdownItem>
                    )}
                    {showAdminQuickAccess && (
                      <DropdownItem onClick={() => navigate(adminHomePath)}>
                        {t("header.adminPanel")}
                      </DropdownItem>
                    )}
                    <div className="border-t border-border mt-1 pt-1">
                      <DropdownItem
                        onClick={() => {
                          logout();
                          navigate("/");
                        }}
                        danger
                      >
                        {t("header.signOut")}
                      </DropdownItem>
                    </div>
                  </Dropdown>
                ) : (
                  <Link
                    to="/login"
                    className="flex items-center gap-1 text-xs hover:outline hover:outline-1 hover:outline-white rounded p-2"
                  >
                    <User className="h-5 w-5 lg:hidden" />
                    <div
                      className={`hidden lg:block ${isRTL ? "text-right" : "text-left"}`}
                    >
                      <span className="text-gray-300 block leading-tight">
                        {t("header.hello")}, {t("header.signIn")}
                      </span>
                      <span className="font-bold leading-tight">
                        {t("header.accountAndLists")}
                      </span>
                    </div>
                  </Link>
                )}

                {/* Seller Center - for merchants */}
                {isAuthenticated && user?.role === "merchant" && (
                  <Link
                    to="/merchant"
                    className="flex items-center gap-1 p-2 hover:outline hover:outline-1 hover:outline-white rounded bg-primary/20 border border-primary/40"
                    title="Seller Center"
                  >
                    <Store className="h-5 w-5 text-primary" />
                    {/* <span className="font-bold text-xs text-primary">
                    Seller Center
                  </span> */}
                  </Link>
                )}

                {showAdminQuickAccess && (
                  <Link
                    to={adminHomePath}
                    className="flex items-center gap-1 p-2 hover:outline hover:outline-1 hover:outline-white rounded bg-accent/20 border border-accent/40"
                    title={t("header.adminPanel")}
                  >
                    <Shield className="h-5 w-5 text-accent" />
                  </Link>
                )}

                {/* Notifications */}
                {isAuthenticated && (
                  <Link
                    to="/notifications"
                    className="relative p-2 hover:outline hover:outline-1 hover:outline-white rounded"
                  >
                    <Bell className="h-6 w-6" />
                    {unreadNotifications > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 bg-danger text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center">
                        {unreadNotifications}
                      </span>
                    )}
                  </Link>
                )}

                {/* Wishlist */}
                <Link
                  to="/wishlist"
                  className="flex items-center gap-1 p-2 hover:outline hover:outline-1 hover:outline-white rounded"
                >
                  <div className="relative">
                    <Heart className="h-6 w-6" />
                    {wishlistCount > 0 && (
                      <span className="absolute -top-2 -right-2 bg-primary text-secondary-dark text-[10px] font-bold rounded-full h-5 min-w-[20px] px-1 flex items-center justify-center">
                        {wishlistCount > 99 ? "99+" : wishlistCount}
                      </span>
                    )}
                  </div>
                </Link>

                {/* Cart */}
                <div className="relative">
                  <Link
                    to="/cart"
                    className="flex items-center gap-1 p-2 hover:outline hover:outline-1 hover:outline-white rounded"
                  >
                    <div className="relative">
                      <ShoppingCart className="h-6 w-6" />
                      {itemCount > 0 && (
                        <span className="absolute -top-2 -right-2 bg-primary text-secondary-dark text-[10px] font-bold rounded-full h-5 min-w-[20px] px-1 flex items-center justify-center">
                          {itemCount > 99 ? "99+" : itemCount}
                        </span>
                      )}
                    </div>
                    {/* <span className="font-bold text-xs">{t("header.cart")}</span> */}
                  </Link>

                  {/* Cart popup notification */}
                  {cartNotification && (
                    <div className="absolute top-full mt-2 right-0 w-56 bg-white text-text rounded-xl shadow-xl border border-border p-3 z-50 animate-cart-pop">
                      <div className="flex items-center gap-2">
                        {cartNotification.image && (
                          <img
                            src={cartNotification.image}
                            alt=""
                            className="w-10 h-10 rounded object-cover shrink-0"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-success">
                            {t("productDetail.addedToCart")}
                          </p>
                          <p className="text-xs text-text-secondary truncate">
                            {cartNotification.name}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Category navigation bar */}
        <div className="bg-secondary text-white text-sm mt-12 md:mt-0">
          <div className="container px-3 sm:px-4 full-width">
            {/* Desktop categories - text links */}
            <div className="hidden md:flex items-center gap-6 py-2">
              {/* <Link
              to="/products?deals=true"
              className="whitespace-nowrap hover:text-primary-light font-semibold"
            >
              {t("header.todaysDeals")}
            </Link> */}
              {categories.slice(0, 8).map((cat) => (
                <Link
                  key={cat.id}
                  to={`/category/${cat.slug}`}
                  className="whitespace-nowrap hover:text-primary-light"
                >
                  {cat.name}
                </Link>
              ))}
              {/* <Link
              to={
                isAuthenticated && user?.role === "merchant"
                  ? "/merchant"
                  : "/merchant/register"
              }
              className="whitespace-nowrap hover:text-primary-light font-semibold"
            >
              {isAuthenticated && user?.role === "merchant"
                ? "Seller Center"
                : t("header.sellOnMiniAmazon")}
            </Link> */}
            </div>

            {/* Mobile categories - infinite smooth auto-scrolling marquee */}
            <div
              ref={mobileCatRef}
              className="md:hidden py-2 flex gap-3 overflow-x-auto scrollbar-hidden select-none"
              style={{ WebkitOverflowScrolling: "touch" }}
              onMouseDown={scrollHandlers.onPointerDown}
              onMouseMove={scrollHandlers.onPointerMove}
              onMouseUp={scrollHandlers.onPointerUp}
              onMouseLeave={scrollHandlers.onPointerUp}
              onTouchStart={scrollHandlers.onPointerDown}
              onTouchMove={scrollHandlers.onPointerMove}
              onTouchEnd={scrollHandlers.onPointerUp}
            >
              {/* Render categories twice for seamless infinite loop */}
              {[...categories, ...categories].map((cat, index) => {
                const palette = PASTEL_PALETTES[index % PASTEL_PALETTES.length];

                return (
                  <Link
                    key={`${cat.id}-${index}`}
                    to={`/category/${cat.slug}`}
                    className="flex flex-col items-center gap-1 shrink-0"
                    style={{ minWidth: 64 }}
                    draggable={false}
                  >
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center overflow-hidden ${!cat.image ? palette.bg : ""}`}
                    >
                      {cat.image ? (
                        <img
                          src={cat.image}
                          alt={cat.name}
                          className="w-full h-full object-cover"
                          draggable={false}
                        />
                      ) : (
                        <Tag
                          className={`h-6 w-6 ${palette.fg}`}
                          aria-hidden="true"
                        />
                      )}
                    </div>
                    <span className="text-[10px] leading-tight text-center text-gray-200 line-clamp-2 px-0.5 w-16">
                      {cat.name}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        {/* Mobile menu overlay */}
        <div
          className={`md:hidden fixed inset-0 z-50 transition-all duration-300 ${mobileMenuOpen ? "visible bg-black/50" : "invisible bg-transparent pointer-events-none"}`}
          onClick={() => setMobileMenuOpen(false)}
        >
          <div
            ref={mobileMenuRef}
            className={`w-72 h-full bg-white overflow-y-auto scrollbar-hidden transition-transform duration-300 ease-in-out ${
              isRTL
                ? `float-right ${mobileMenuOpen ? "translate-x-0" : "translate-x-full"}`
                : `${mobileMenuOpen ? "translate-x-0" : "-translate-x-full"}`
            }`}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={t("header.browse")}
          >
            <div className="bg-secondary p-4 flex items-center justify-between">
              <p className="text-white font-bold">{t("header.browse")}</p>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="text-white p-1 hover:bg-white/10 rounded"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="py-2">
              {categories.map((cat) => (
                <Link
                  key={cat.id}
                  to={`/category/${cat.slug}`}
                  className="block px-4 py-3 text-text hover:bg-gray-50 border-b border-border/30"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {cat.name}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </header>

      {/* Delivery Location Modal - Add New Address with Map */}
      <Modal
        isOpen={deliveryModalOpen}
        onClose={() => setDeliveryModalOpen(false)}
        title={t("header.addDeliveryAddress", "Add Delivery Address")}
        size="lg"
      >
        <div className="space-y-4">
          <MapAddressPicker
            height="250px"
            onAddressSelect={(mapData) => {
              setAddrForm((prev) => ({
                ...prev,
                address_line_1: mapData.address || prev.address_line_1,
                city: mapData.city || prev.city,
                state: mapData.state || prev.state,
                postal_code: mapData.postal_code || prev.postal_code,
                country: mapData.country || prev.country,
              }));
              const loc = {
                city: mapData.city || "",
                area: mapData.address || "",
                country: mapData.country || "",
              };
              setDeliveryLocation(loc);
              localStorage.setItem("delivery_location", JSON.stringify(loc));
            }}
          />

          {isAuthenticated && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createAddress.mutate(addrForm, {
                  onSuccess: () => {
                    setDeliveryModalOpen(false);
                    setAddrForm({
                      label: "",
                      first_name: "",
                      last_name: "",
                      phone: "",
                      address_line_1: "",
                      address_line_2: "",
                      city: "",
                      state: "",
                      postal_code: "",
                      country: "EG",
                    });
                  },
                });
              }}
              className="space-y-3"
            >
              <div className="grid grid-cols-2 gap-3">
                <input
                  placeholder={t("address.label", "Label (e.g. Home)")}
                  value={addrForm.label}
                  onChange={(e) =>
                    setAddrForm((p) => ({ ...p, label: e.target.value }))
                  }
                  className="col-span-2 px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <input
                  placeholder={t("address.firstName", "First Name")}
                  value={addrForm.first_name}
                  onChange={(e) =>
                    setAddrForm((p) => ({ ...p, first_name: e.target.value }))
                  }
                  className="px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  required
                />
                <input
                  placeholder={t("address.lastName", "Last Name")}
                  value={addrForm.last_name}
                  onChange={(e) =>
                    setAddrForm((p) => ({ ...p, last_name: e.target.value }))
                  }
                  className="px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  required
                />
                <input
                  type="tel"
                  placeholder={t("address.phone", "Phone")}
                  value={addrForm.phone}
                  onChange={(e) =>
                    setAddrForm((p) => ({ ...p, phone: e.target.value }))
                  }
                  className="col-span-2 px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  required
                />
                <input
                  placeholder={t("address.addressLine1", "Address")}
                  value={addrForm.address_line_1}
                  onChange={(e) =>
                    setAddrForm((p) => ({
                      ...p,
                      address_line_1: e.target.value,
                    }))
                  }
                  className="col-span-2 px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  required
                />
                <input
                  placeholder={t(
                    "address.addressLine2",
                    "Apt, Suite, etc. (optional)",
                  )}
                  value={addrForm.address_line_2}
                  onChange={(e) =>
                    setAddrForm((p) => ({
                      ...p,
                      address_line_2: e.target.value,
                    }))
                  }
                  className="col-span-2 px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <input
                  placeholder={t("address.city", "City")}
                  value={addrForm.city}
                  onChange={(e) =>
                    setAddrForm((p) => ({ ...p, city: e.target.value }))
                  }
                  className="px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  required
                />
                <input
                  placeholder={t("address.state", "State / Governorate")}
                  value={addrForm.state}
                  onChange={(e) =>
                    setAddrForm((p) => ({ ...p, state: e.target.value }))
                  }
                  className="px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <input
                  placeholder={t("address.postalCode", "Postal Code")}
                  value={addrForm.postal_code}
                  onChange={(e) =>
                    setAddrForm((p) => ({ ...p, postal_code: e.target.value }))
                  }
                  className="px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <input
                  placeholder={t("address.country", "Country")}
                  value={addrForm.country}
                  onChange={(e) =>
                    setAddrForm((p) => ({ ...p, country: e.target.value }))
                  }
                  className="px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <button
                type="submit"
                disabled={createAddress.isPending}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary/90 transition disabled:opacity-60"
              >
                <Save className="h-5 w-5" />
                {createAddress.isPending
                  ? t("common.saving", "Saving...")
                  : t("address.saveAddress", "Save Address")}
              </button>
            </form>
          )}

          {!isAuthenticated && (
            <p className="text-sm text-text-secondary text-center">
              {t(
                "header.loginToSaveAddress",
                "Pick a location on the map above. Log in to save it as an address.",
              )}
            </p>
          )}
        </div>
      </Modal>
    </>
  );
}
