import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "@/hooks/useTranslation";
import {
  Search,
  Plus,
  Minus,
  ShoppingCart,
  Trash2,
  CreditCard,
  Banknote,
  Smartphone,
  User,
  X,
  Save,
  Loader2,
  Image,
  ScanLine,
  Printer,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import { formatCurrency } from "@/lib/utils";
import toast from "react-hot-toast";
import {
  useAdminProducts,
  useAdminUsers,
  useAdminSettings,
  useAdminUpdateSettings,
  useCreateOrder,
  useAdminWallets,
} from "@/hooks/useApi";
import { useDebouncedValue } from "@/hooks/useDebounce";

function isEnabled(value, fallback = true) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "on"].includes(normalized)) return true;
    if (["false", "0", "no", "off"].includes(normalized)) return false;
  }
  return fallback;
}

export default function POSPage() {
  const { t } = useTranslation();
  const { data: settingsRes, isLoading } = useAdminSettings();
  const settings = settingsRes?.data ?? settingsRes ?? {};
  const productsPerPage = Math.min(
    100,
    Math.max(20, Number(settings.pos_products_per_page) || 50),
  );
  const {
    data: productsRes,
    isLoading: productsLoading,
    isError: productsError,
  } = useAdminProducts({ per_page: productsPerPage });
  const updateSettings = useAdminUpdateSettings();
  const createOrder = useCreateOrder();

  const [search, setSearch] = useState("");
  const [barcodeQuery, setBarcodeQuery] = useState("");
  const [catalog, setCatalog] = useState([]);
  const [cart, setCart] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [checkoutModal, setCheckoutModal] = useState(false);
  const [mobileCartOpen, setMobileCartOpen] = useState(false);
  const [receiptModal, setReceiptModal] = useState(false);
  const [lastSale, setLastSale] = useState(null);
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [taxRate, setTaxRate] = useState(8);
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const productViewportRef = useRef(null);
  const [productViewportHeight, setProductViewportHeight] = useState(560);
  const [productViewportWidth, setProductViewportWidth] = useState(1024);
  const [scrollTop, setScrollTop] = useState(0);

  const paymentOptions = useMemo(() => {
    const options = [];
    if (settings.cod_enabled !== false) {
      options.push({
        value: "Cash",
        label: t("admin.posPaymentCash"),
        icon: Banknote,
      });
    }
    if (
      settings.stripe_enabled !== false ||
      settings.paypal_enabled !== false
    ) {
      options.push({
        value: "Card",
        label: t("admin.posPaymentCard"),
        icon: CreditCard,
      });
    }
    if (settings.wallet_enabled !== false) {
      options.push({
        value: "Wallet",
        label: t("admin.posPaymentWallet"),
        icon: Smartphone,
      });
    }
    return options.length > 0
      ? options
      : [{ value: "Cash", label: t("admin.posPaymentCash"), icon: Banknote }];
  }, [settings, t]);
  const debouncedCustomerSearch = useDebouncedValue(customerSearch, 300);

  const { data: customerRes, isFetching: customerLoading } = useAdminUsers({
    per_page: 8,
    role: "customer",
    ...(debouncedCustomerSearch ? { search: debouncedCustomerSearch } : {}),
  });

  const customerResults = customerRes?.data ?? [];

  // Fetch wallet balance for selected customer
  const { data: walletRes } = useAdminWallets(
    selectedCustomer?.id
      ? { search: selectedCustomer.name, per_page: 50 }
      : null,
    { enabled: !!selectedCustomer?.id },
  );
  const customerWalletBalance = useMemo(() => {
    if (!selectedCustomer?.id || !walletRes?.data) return 0;
    const wallets = walletRes.data;
    const match = Array.isArray(wallets)
      ? wallets.find((w) => w.user_id === selectedCustomer.id && w.is_active)
      : null;
    return match ? Number(match.balance) || 0 : 0;
  }, [walletRes, selectedCustomer?.id]);
  const [useWalletPartial, setUseWalletPartial] = useState(false);

  // Reset wallet partial when customer or payment method changes
  useEffect(() => {
    setUseWalletPartial(false);
  }, [selectedCustomer?.id, paymentMethod]);

  useEffect(() => {
    const apiProducts = productsRes?.data?.data ?? productsRes?.data ?? [];

    if (Array.isArray(apiProducts)) {
      setCatalog(
        apiProducts.map((product) => ({
          id: product.id,
          name: product.name,
          price: Number(product.price) || 0,
          sku: product.sku || `SKU-${product.id}`,
          stock: Number(product.stock_quantity) || 0,
          image: product.images?.[0] || product.image || null,
          category: product.category?.name || "General",
        })),
      );
    }

    setTaxRate(Number(settings.pos_tax_rate ?? 8));
  }, [productsRes, settingsRes]);

  const categories = useMemo(() => {
    const values = new Set(
      catalog.map((item) => item.category).filter(Boolean),
    );
    return ["all", ...Array.from(values)];
  }, [catalog]);

  const filtered = useMemo(
    () =>
      catalog.filter((p) => {
        if (
          search &&
          !p.name.toLowerCase().includes(search.toLowerCase()) &&
          !p.sku.toLowerCase().includes(search.toLowerCase())
        )
          return false;
        if (categoryFilter !== "all" && p.category !== categoryFilter)
          return false;
        return true;
      }),
    [catalog, search, categoryFilter],
  );

  useEffect(() => {
    const node = productViewportRef.current;
    if (!node) return;

    const updateDimensions = () => {
      setProductViewportHeight(node.clientHeight || 560);
      setProductViewportWidth(node.clientWidth || 1024);
    };

    updateDimensions();

    const observer = new ResizeObserver(updateDimensions);
    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, []);

  const virtualColumns =
    productViewportWidth < 640 ? 2 : productViewportWidth < 1024 ? 3 : 4;
  const cardHeight = 260;
  const totalRows = Math.ceil(filtered.length / virtualColumns);
  const startRow = Math.max(0, Math.floor(scrollTop / cardHeight) - 2);
  const visibleRows = Math.ceil(productViewportHeight / cardHeight) + 4;
  const endRow = Math.min(totalRows, startRow + visibleRows);
  const startIndex = startRow * virtualColumns;
  const endIndex = endRow * virtualColumns;
  const visibleProducts = filtered.slice(startIndex, endIndex);
  const topSpacerHeight = startRow * cardHeight;
  const bottomSpacerHeight = Math.max(0, (totalRows - endRow) * cardHeight);

  const addToCart = (product) => {
    if ((product.stock ?? 0) <= 0) {
      toast.error(t("admin.posOutOfStock"));
      return;
    }

    setCart((prev) => {
      const exist = prev.find((i) => i.id === product.id);
      if (exist) {
        if (exist.qty >= (product.stock ?? 0)) {
          toast.error(t("admin.posReachedStock"));
          return prev;
        }
        return prev.map((i) =>
          i.id === product.id ? { ...i, qty: i.qty + 1 } : i,
        );
      }
      return [...prev, { ...product, qty: 1 }];
    });
  };

  const addByBarcode = () => {
    const needle = barcodeQuery.trim().toLowerCase();
    if (!needle) return;

    const match = catalog.find((product) => {
      const sku = String(product.sku || "").toLowerCase();
      const id = String(product.id || "").toLowerCase();
      return sku === needle || id === needle;
    });

    if (!match) {
      toast.error(t("admin.posBarcodeNotFound"));
      return;
    }

    addToCart(match);
    setBarcodeQuery("");
  };

  const updateQty = (id, delta) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const nextQty = Math.max(1, item.qty + delta);
        const maxQty = Number(item.stock ?? 0);
        if (delta > 0 && maxQty > 0 && nextQty > maxQty) {
          toast.error(t("admin.posReachedStock"));
          return item;
        }
        return { ...item, qty: nextQty };
      }),
    );
  };

  const removeFromCart = (id) =>
    setCart((prev) => prev.filter((i) => i.id !== id));

  const subtotal = cart.reduce((a, i) => a + i.price * i.qty, 0);
  const tax = subtotal * (taxRate / 100);
  const shippingFee = useMemo(() => {
    // Prefer the first enabled shipping method cost from admin shipping config
    let fee = Number(settings.shipping_fee ?? 0);
    try {
      const methods = Array.isArray(settings.shipping_methods)
        ? settings.shipping_methods
        : typeof settings.shipping_methods === "string"
          ? JSON.parse(settings.shipping_methods)
          : [];
      const enabledMethod = methods.find((m) => m.enabled !== false);
      if (enabledMethod && Number(enabledMethod.cost) > 0) {
        fee = Number(enabledMethod.cost);
      }
    } catch {
      // fall back to settings.shipping_fee
    }

    const thresholdEnabled = isEnabled(
      settings.free_shipping_threshold_enabled,
      true,
    );
    const threshold = Number(settings.free_shipping_threshold ?? 0);

    if (fee <= 0) return 0;
    if (thresholdEnabled && threshold > 0 && subtotal >= threshold) {
      return 0;
    }

    return fee;
  }, [settings, subtotal]);
  const total = subtotal + tax + shippingFee;
  const walletDeduction =
    paymentMethod === "Wallet"
      ? Math.min(customerWalletBalance, total)
      : useWalletPartial && customerWalletBalance > 0
        ? Math.min(customerWalletBalance, total)
        : 0;
  const remainingAfterWallet = Math.max(0, total - walletDeduction);
  const customerRequired = !selectedCustomer;

  const completeSale = async () => {
    if (!selectedCustomer?.id) {
      toast.error(t("admin.posCustomerRequired"));
      return;
    }

    const methodMap = {
      Cash: "cod",
      Card: "credit_card",
      Wallet: "wallet",
    };

    let payment_method = methodMap[paymentMethod] || "cod";
    let wallet_amount;

    if (paymentMethod === "Wallet") {
      payment_method = walletDeduction >= total ? "wallet" : "wallet+cod";
      wallet_amount = walletDeduction;
    } else if (useWalletPartial && walletDeduction > 0) {
      payment_method = "wallet+cod";
      wallet_amount = walletDeduction;
    }

    const orderData = {
      customer_id: selectedCustomer.id,
      shipping_address: {
        label: "POS",
        first_name: selectedCustomer?.name || "POS Customer",
        last_name: "",
        phone: selectedCustomer?.phone || "N/A",
        address_line_1: "POS Counter",
        address_line_2: "",
        city: "N/A",
        state: "N/A",
        postal_code: "N/A",
        country: "N/A",
      },
      payment_method,
      ...(wallet_amount ? { wallet_amount } : {}),
      shipping_method: "POS",
      items: cart.map((item) => ({
        product_id: item.id,
        quantity: item.qty,
        unit_price: Number(item.price) || 0,
      })),
      notes: `POS customer: ${selectedCustomer.name}`,
    };

    try {
      const response = await createOrder.mutateAsync(orderData);
      const saleSnapshot = {
        orderNumber:
          response?.data?.order_number ||
          response?.order_number ||
          `POS-${Date.now()}`,
        items: cart,
        subtotal,
        tax,
        shippingFee,
        total,
        taxRate,
        paymentMethod,
        walletDeduction,
        remainingAfterWallet,
        customerName: selectedCustomer?.name || "POS Customer",
        createdAt: new Date().toISOString(),
      };
      await updateSettings.mutateAsync({ pos_tax_rate: taxRate });
      setCheckoutModal(false);
      setCart([]);
      setCustomerSearch("");
      setSelectedCustomer(null);
      setLastSale(saleSnapshot);
      setReceiptModal(true);
      toast.success(t("admin.posSaleSuccess"));
    } catch (error) {
      toast.error(error?.response?.data?.message || t("admin.posSaleFailed"));
    }
  };

  const printReceipt = () => {
    if (!lastSale) return;

    const escapeHtml = (value) =>
      String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");

    const lines = lastSale.items
      .map(
        (item) =>
          `<tr><td style="padding:4px 0;">${escapeHtml(item.name)}</td><td style="text-align:center;">${escapeHtml(item.qty)}</td><td style="text-align:right;">${escapeHtml(formatCurrency(item.price * item.qty))}</td></tr>`,
      )
      .join("");

    const receiptWindow = window.open("", "_blank", "width=420,height=700");
    if (!receiptWindow) {
      toast.error(t("admin.posReceiptPopupBlocked"));
      return;
    }

    receiptWindow.document.write(`
      <html>
        <head><title>${t("admin.posReceipt")}</title></head>
        <body style="font-family:Arial,sans-serif;padding:16px;">
          <h2 style="margin:0 0 8px;">${t("admin.posReceipt")}</h2>
          <p style="margin:0 0 4px;">${escapeHtml(lastSale.orderNumber)}</p>
          <p style="margin:0 0 16px;">${escapeHtml(new Date(lastSale.createdAt).toLocaleString())}</p>
          <p style="margin:0 0 4px;">${escapeHtml(t("admin.customer"))}: ${escapeHtml(lastSale.customerName)}</p>
          <p style="margin:0 0 12px;">${escapeHtml(t("admin.posPaymentMethod"))}: ${escapeHtml(lastSale.paymentMethod)}</p>
          <table style="width:100%;border-collapse:collapse;">
            <thead>
              <tr>
                <th style="text-align:left;border-bottom:1px solid #ccc;padding-bottom:6px;">${t("common.name")}</th>
                <th style="text-align:center;border-bottom:1px solid #ccc;padding-bottom:6px;">${t("common.qty")}</th>
                <th style="text-align:right;border-bottom:1px solid #ccc;padding-bottom:6px;">${t("common.amount")}</th>
              </tr>
            </thead>
            <tbody>${lines}</tbody>
          </table>
          <hr style="margin:12px 0;" />
          <p style="margin:4px 0;">${t("common.subtotal")}: ${formatCurrency(lastSale.subtotal)}</p>
          <p style="margin:4px 0;">${t("common.shipping")}: ${lastSale.shippingFee === 0 ? t("common.free") : formatCurrency(lastSale.shippingFee)}</p>
          <p style="margin:4px 0;">${t("admin.posTaxLine", { rate: lastSale.taxRate })}: ${formatCurrency(lastSale.tax)}</p>
          <p style="margin:8px 0;font-weight:bold;">${t("common.total")}: ${formatCurrency(lastSale.total)}</p>
        </body>
      </html>
    `);
    receiptWindow.document.close();
    receiptWindow.focus();
    receiptWindow.print();
  };

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-80px)] gap-4">
      <div className="flex-1 flex flex-col min-w-0">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl sm:text-2xl font-bold text-text">
            {t("admin.posPageTitle")}
          </h1>
          <div className="flex items-end gap-2">
            <Input
              label={t("admin.posTaxLabel")}
              type="number"
              min={0}
              max={100}
              value={taxRate}
              onChange={(e) =>
                setTaxRate(
                  Math.min(100, Math.max(0, Number(e.target.value || 0))),
                )
              }
              className="w-24"
            />
            <Button
              className="width-max-content text-base "
              icon={Save}
              variant="outline"
              loading={updateSettings.isPending || isLoading}
              onClick={() => {
                if (taxRate < 0 || taxRate > 100) {
                  toast.error(t("admin.posTaxRangeError"));
                  return;
                }
                updateSettings.mutate(
                  { pos_tax_rate: taxRate },
                  {
                    onSuccess: () => toast.success(t("admin.posSettingsSaved")),
                    onError: () =>
                      toast.error(t("admin.posSettingsSaveFailed")),
                  },
                );
              }}
            >
              {t("common.save")}
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 mb-4">
          <div className="relative flex-1 min-w-[160px]">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("admin.posSearchPlaceholder")}
              className="w-full ps-9 pe-4 py-2.5 border border-border rounded-lg text-sm focus:ring-1 focus:ring-primary outline-none"
            />
          </div>
          <div className="relative w-full sm:w-56">
            <ScanLine className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
            <input
              value={barcodeQuery}
              onChange={(event) => setBarcodeQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  addByBarcode();
                }
              }}
              placeholder={t("admin.posScanSku")}
              className="w-full pl-9 pr-3 py-2.5 border border-border rounded-lg text-sm focus:ring-1 focus:ring-primary outline-none"
            />
          </div>
          <Button variant="outline" onClick={addByBarcode}>
            {t("admin.posAddScanned")}
          </Button>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="border border-border rounded-lg px-3 py-2.5 text-sm bg-white"
          >
            {categories.map((category) => (
              <option key={category} value={category}>
                {category === "all" ? t("admin.posAllCategories") : category}
              </option>
            ))}
          </select>
        </div>

        <div
          ref={productViewportRef}
          className="flex-1 overflow-y-auto"
          onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
        >
          <div style={{ height: topSpacerHeight }} />
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {productsLoading && (
              <div className="col-span-full flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}
            {productsError && (
              <div className="col-span-full text-center py-12 text-danger text-sm">
                {t("admin.posProductsLoadFailed")}
              </div>
            )}
            {!productsLoading && !productsError && filtered.length === 0 && (
              <div className="col-span-full text-center py-12 text-text-secondary text-sm">
                {t("admin.posNoProductsFound")}
              </div>
            )}
            {visibleProducts.map((product) => (
              <button
                key={product.id}
                onClick={() => addToCart(product)}
                disabled={(product.stock ?? 0) <= 0}
                className="bg-white p-3 rounded-xl border border-border/50 hover:border-primary hover:shadow-md transition text-left disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {product.image ? (
                  <img
                    src={product.image}
                    alt=""
                    loading="lazy"
                    className="w-full aspect-square object-cover rounded-lg mb-2 bg-gray-50"
                  />
                ) : (
                  <div className="w-full aspect-square rounded-lg mb-2 bg-gray-100 text-text-secondary flex items-center justify-center">
                    <Image className="h-6 w-6" aria-hidden="true" />
                  </div>
                )}
                <p className="text-sm font-medium text-text truncate">
                  {product.name}
                </p>
                <p className="text-xs text-text-secondary">{product.sku}</p>
                <p className="text-sm font-bold text-primary mt-1">
                  {formatCurrency(product.price)}
                </p>
                <p className="text-xs text-text-secondary">
                  {t("admin.posStock", { count: product.stock })}
                </p>
              </button>
            ))}
          </div>
          <div style={{ height: bottomSpacerHeight }} />
        </div>
      </div>

      <div className="hidden md:flex w-80 bg-white rounded-xl border border-border/50 flex-col shrink-0">
        <div className="p-4 border-b border-border/50">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-text flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              {t("admin.posCurrentOrder")}
            </h2>
            {cart.length > 0 && (
              <button
                className="text-xs text-danger hover:underline"
                onClick={() => setCart([])}
              >
                {t("admin.posClear")}
              </button>
            )}
          </div>

          {selectedCustomer ? (
            <div className="flex items-center justify-between bg-gray-50 rounded-lg p-2">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-text-secondary" />
                <span className="text-sm">{selectedCustomer.name}</span>
              </div>
              <button
                onClick={() => setSelectedCustomer(null)}
                aria-label="Close"
              >
                <X className="h-4 w-4 text-text-secondary" />
              </button>
            </div>
          ) : (
            <div className="relative">
              <input
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                placeholder={t("admin.posSearchCustomer")}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm"
              />

              {customerSearch.trim().length >= 2 && (
                <div className="absolute z-10 mt-1 w-full bg-white border border-border rounded-lg shadow-sm max-h-56 overflow-y-auto">
                  {customerLoading && (
                    <div className="px-3 py-2 text-xs text-text-secondary">
                      {t("admin.posSearching")}
                    </div>
                  )}

                  {!customerLoading && customerResults.length === 0 && (
                    <div className="px-3 py-2 text-xs text-text-secondary">
                      {t("admin.posNoCustomersFound")}
                    </div>
                  )}

                  {!customerLoading &&
                    customerResults.map((customer) => (
                      <button
                        key={customer.id}
                        type="button"
                        className="w-full text-left px-3 py-2 hover:bg-gray-50"
                        onClick={() => {
                          setSelectedCustomer({
                            id: customer.id,
                            name: customer.name,
                            email: customer.email,
                            phone: customer.phone,
                          });
                          setCustomerSearch("");
                        }}
                      >
                        <p className="text-sm text-text font-medium">
                          {customer.name}
                        </p>
                        <p className="text-xs text-text-secondary">
                          {customer.email}
                        </p>
                      </button>
                    ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.length === 0 ? (
            <div className="text-center text-text-secondary py-8">
              <ShoppingCart className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">{t("admin.posCartEmpty")}</p>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.id} className="flex items-center gap-3">
                {item.image ? (
                  <img
                    src={item.image}
                    alt=""
                    loading="lazy"
                    className="w-12 h-12 rounded-lg object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-gray-100 text-text-secondary flex items-center justify-center">
                    <Image className="h-4 w-4" aria-hidden="true" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text truncate">
                    {item.name}
                  </p>
                  <p className="text-xs text-primary">
                    {formatCurrency(item.price)}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    className="w-6 h-6 rounded bg-gray-100 flex items-center justify-center"
                    onClick={() => updateQty(item.id, -1)}
                    aria-label="Decrease"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="text-sm font-medium w-6 text-center">
                    {item.qty}
                  </span>
                  <button
                    className="w-6 h-6 rounded bg-gray-100 flex items-center justify-center"
                    onClick={() => updateQty(item.id, 1)}
                    aria-label="Add"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
                <button
                  onClick={() => removeFromCart(item.id)}
                  aria-label="Delete"
                >
                  <Trash2 className="h-4 w-4 text-text-secondary hover:text-danger" />
                </button>
              </div>
            ))
          )}
        </div>

        {cart.length > 0 && (
          <div className="p-4 border-t border-border/50 space-y-2">
            {customerRequired && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1">
                {t("admin.posCustomerRequired")}
              </p>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-text-secondary">
                {t("common.subtotal")}
              </span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-text-secondary">
                {t("common.shipping")}
              </span>
              <span>
                {shippingFee === 0
                  ? t("common.free")
                  : formatCurrency(shippingFee)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-text-secondary">
                {t("admin.posTaxLine", { rate: taxRate })}
              </span>
              <span>{formatCurrency(tax)}</span>
            </div>
            <div className="flex justify-between font-bold text-lg border-t pt-2">
              <span>{t("common.total")}</span>
              <span className="text-primary">{formatCurrency(total)}</span>
            </div>
            <Button
              fullWidth
              onClick={() => {
                if (!selectedCustomer?.id) {
                  toast.error(t("admin.posCustomerRequired"));
                  return;
                }
                setCheckoutModal(true);
              }}
              disabled={customerRequired}
            >
              {t("admin.checkout")}
            </Button>
          </div>
        )}
      </div>

      {/* Mobile floating cart button */}
      <button
        className="md:hidden fixed bottom-6 right-6 z-40 bg-primary text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg"
        onClick={() => setMobileCartOpen(true)}
      >
        <ShoppingCart className="h-6 w-6" />
        {cart.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-danger text-white text-xs font-bold rounded-full h-5 min-w-[20px] flex items-center justify-center px-1">
            {cart.reduce((s, i) => s + i.qty, 0)}
          </span>
        )}
      </button>

      {/* Mobile cart drawer */}
      {mobileCartOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileCartOpen(false)}
          />
          <div className="relative ms-auto w-full max-w-sm bg-white h-full flex flex-col shadow-xl animate-in slide-in-from-right">
            <div className="p-4 border-b border-border/50 flex items-center justify-between">
              <h2 className="font-semibold text-text flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                {t("admin.posCurrentOrder")}
              </h2>
              <button onClick={() => setMobileCartOpen(false)}>
                <X className="h-5 w-5 text-text-secondary" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {selectedCustomer ? (
                <div className="flex items-center justify-between bg-gray-50 rounded-lg p-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <User className="h-4 w-4 text-text-secondary shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm truncate">
                        {selectedCustomer.name}
                      </p>
                      {selectedCustomer.email && (
                        <p className="text-xs text-text-secondary truncate">
                          {selectedCustomer.email}
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedCustomer(null)}
                    aria-label="Close"
                  >
                    <X className="h-4 w-4 text-text-secondary" />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <input
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    placeholder={t("admin.posSearchCustomer")}
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm"
                  />

                  {customerSearch.trim().length >= 2 && (
                    <div className="absolute z-10 mt-1 w-full bg-white border border-border rounded-lg shadow-sm max-h-56 overflow-y-auto">
                      {customerLoading && (
                        <div className="px-3 py-2 text-xs text-text-secondary">
                          {t("admin.posSearching")}
                        </div>
                      )}

                      {!customerLoading && customerResults.length === 0 && (
                        <div className="px-3 py-2 text-xs text-text-secondary">
                          {t("admin.posNoCustomersFound")}
                        </div>
                      )}

                      {!customerLoading &&
                        customerResults.map((customer) => (
                          <button
                            key={customer.id}
                            type="button"
                            className="w-full text-left px-3 py-2 hover:bg-gray-50"
                            onClick={() => {
                              setSelectedCustomer({
                                id: customer.id,
                                name: customer.name,
                                email: customer.email,
                                phone: customer.phone,
                              });
                              setCustomerSearch("");
                            }}
                          >
                            <p className="text-sm text-text font-medium">
                              {customer.name}
                            </p>
                            <p className="text-xs text-text-secondary">
                              {customer.email}
                            </p>
                          </button>
                        ))}
                    </div>
                  )}
                </div>
              )}

              {cart.length === 0 ? (
                <div className="text-center text-text-secondary py-8">
                  <ShoppingCart className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">{t("admin.posCartEmpty")}</p>
                </div>
              ) : (
                cart.map((item) => (
                  <div key={item.id} className="flex items-center gap-3">
                    {item.image ? (
                      <img
                        src={item.image}
                        alt=""
                        loading="lazy"
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-gray-100 text-text-secondary flex items-center justify-center">
                        <Image className="h-4 w-4" aria-hidden="true" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text truncate">
                        {item.name}
                      </p>
                      <p className="text-xs text-primary">
                        {formatCurrency(item.price)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        className="w-6 h-6 rounded bg-gray-100 flex items-center justify-center"
                        onClick={() => updateQty(item.id, -1)}
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="text-sm font-medium w-6 text-center">
                        {item.qty}
                      </span>
                      <button
                        className="w-6 h-6 rounded bg-gray-100 flex items-center justify-center"
                        onClick={() => updateQty(item.id, 1)}
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                    <button onClick={() => removeFromCart(item.id)}>
                      <Trash2 className="h-4 w-4 text-text-secondary hover:text-danger" />
                    </button>
                  </div>
                ))
              )}
            </div>
            {cart.length > 0 && (
              <div className="p-4 border-t border-border/50 space-y-2">
                {customerRequired && (
                  <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1">
                    {t("admin.posCustomerRequired")}
                  </p>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-text-secondary">
                    {t("common.subtotal")}
                  </span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-secondary">
                    {t("common.shipping")}
                  </span>
                  <span>
                    {shippingFee === 0
                      ? t("common.free")
                      : formatCurrency(shippingFee)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-secondary">
                    {t("admin.posTaxLine", { rate: taxRate })}
                  </span>
                  <span>{formatCurrency(tax)}</span>
                </div>
                <div className="flex justify-between font-semibold text-base pt-1 border-t">
                  <span>{t("common.total")}</span>
                  <span>{formatCurrency(total)}</span>
                </div>
                <Button
                  fullWidth
                  onClick={() => {
                    if (!selectedCustomer?.id) {
                      toast.error(t("admin.posCustomerRequired"));
                      return;
                    }
                    setMobileCartOpen(false);
                    setCheckoutModal(true);
                  }}
                  disabled={customerRequired}
                >
                  {t("admin.checkout")}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      <Modal
        isOpen={checkoutModal}
        onClose={() => setCheckoutModal(false)}
        title={t("admin.posCompletePayment")}
      >
        <div className="space-y-4">
          {customerRequired && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1">
              {t("admin.posCustomerRequired")}
            </p>
          )}
          <div className="p-4 bg-gray-50 rounded-lg text-center">
            <p className="text-sm text-text-secondary">
              {t("admin.posTotalAmount")}
            </p>
            <p className="text-3xl font-bold text-primary">
              {formatCurrency(total)}
            </p>
          </div>
          <p className="text-sm font-medium text-text">
            {t("admin.posSelectPayment")}
          </p>
          <div className="grid grid-cols-3 gap-3">
            {paymentOptions.map((method) => (
              <button
                key={method.value}
                className={`p-4 border rounded-xl transition flex flex-col items-center gap-2 ${
                  paymentMethod === method.value
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary"
                } ${
                  method.value === "Wallet" &&
                  (customerRequired || customerWalletBalance <= 0)
                    ? "opacity-50 cursor-not-allowed"
                    : ""
                }`}
                onClick={() => {
                  if (
                    method.value === "Wallet" &&
                    (customerRequired || customerWalletBalance <= 0)
                  )
                    return;
                  setPaymentMethod(method.value);
                }}
                disabled={
                  method.value === "Wallet" &&
                  (customerRequired || customerWalletBalance <= 0)
                }
              >
                <method.icon className="h-6 w-6 text-text-secondary" />
                <span className="text-sm font-medium">{method.label}</span>
              </button>
            ))}
          </div>

          {/* Customer wallet balance display */}
          {selectedCustomer && customerWalletBalance > 0 && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-emerald-800">
                  👛 {t("admin.posCustomerWallet", "Customer wallet balance")}
                </span>
                <span className="font-bold text-emerald-700">
                  {formatCurrency(customerWalletBalance)}
                </span>
              </div>
              {/* Partial wallet payment option when not paying fully by wallet */}
              {paymentMethod !== "Wallet" && (
                <label className="flex items-start gap-2 mt-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useWalletPartial}
                    onChange={(e) => setUseWalletPartial(e.target.checked)}
                    className="mt-0.5 text-primary focus:ring-primary rounded"
                  />
                  <div>
                    <span className="text-sm font-medium text-text">
                      {t(
                        "admin.posUseWalletPartial",
                        "Use wallet balance for partial payment",
                      )}
                    </span>
                    {useWalletPartial && (
                      <p className="text-xs text-text-secondary mt-0.5">
                        {t("admin.posWalletPartialDesc", {
                          wallet: formatCurrency(walletDeduction),
                          remaining: formatCurrency(remainingAfterWallet),
                        }) ||
                          `Deduct ${formatCurrency(walletDeduction)} from wallet, remaining ${formatCurrency(remainingAfterWallet)} via ${paymentMethod}`}
                      </p>
                    )}
                  </div>
                </label>
              )}
              {paymentMethod === "Wallet" && customerWalletBalance < total && (
                <p className="text-xs text-amber-600 mt-1.5">
                  {t(
                    "admin.posWalletInsufficient",
                    "Insufficient wallet balance. Remaining will be charged as COD.",
                  )}
                </p>
              )}
            </div>
          )}

          {/* Show adjusted total if wallet is used */}
          {walletDeduction > 0 && (
            <div className="p-3 bg-gray-50 rounded-lg space-y-1">
              <div className="flex justify-between text-sm text-success">
                <span>
                  👛 {t("admin.posWalletDeduction", "Wallet deduction")}
                </span>
                <span>-{formatCurrency(walletDeduction)}</span>
              </div>
              {remainingAfterWallet > 0 && (
                <div className="flex justify-between text-sm font-semibold">
                  <span>
                    {t("admin.posRemainingPayment", "Remaining payment")}
                  </span>
                  <span>{formatCurrency(remainingAfterWallet)}</span>
                </div>
              )}
            </div>
          )}

          <Button
            fullWidth
            onClick={completeSale}
            loading={createOrder.isPending || updateSettings.isPending}
            disabled={customerRequired}
          >
            {t("admin.completeSale")}{" "}
            {walletDeduction > 0 && remainingAfterWallet > 0
              ? `— ${formatCurrency(remainingAfterWallet)}`
              : ""}
          </Button>
        </div>
      </Modal>

      <Modal
        isOpen={receiptModal}
        onClose={() => setReceiptModal(false)}
        title={t("admin.posReceipt")}
      >
        {lastSale && (
          <div className="space-y-4">
            <div className="p-3 bg-gray-50 rounded-lg text-sm">
              <p className="text-text-secondary">{lastSale.orderNumber}</p>
              <p>{new Date(lastSale.createdAt).toLocaleString()}</p>
              <p>
                {t("admin.customer")}: {lastSale.customerName}
              </p>
              <p>
                {t("admin.posPaymentMethod")}: {lastSale.paymentMethod}
              </p>
            </div>

            <div className="max-h-56 overflow-y-auto border border-border rounded-lg divide-y divide-border/60">
              {lastSale.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between px-3 py-2 text-sm"
                >
                  <span className="truncate pr-3">
                    {item.name} × {item.qty}
                  </span>
                  <span className="font-medium">
                    {formatCurrency(item.price * item.qty)}
                  </span>
                </div>
              ))}
            </div>

            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>{t("common.subtotal")}</span>
                <span>{formatCurrency(lastSale.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>{t("common.shipping")}</span>
                <span>
                  {lastSale.shippingFee === 0
                    ? t("common.free")
                    : formatCurrency(lastSale.shippingFee)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>{t("admin.posTaxLine", { rate: lastSale.taxRate })}</span>
                <span>{formatCurrency(lastSale.tax)}</span>
              </div>
              <div className="flex justify-between font-semibold text-base pt-1 border-t">
                <span>{t("common.total")}</span>
                <span>{formatCurrency(lastSale.total)}</span>
              </div>
              {lastSale.walletDeduction > 0 && (
                <>
                  <div className="flex justify-between text-sm text-success">
                    <span>
                      👛 {t("admin.posWalletDeduction", "Wallet deduction")}
                    </span>
                    <span>-{formatCurrency(lastSale.walletDeduction)}</span>
                  </div>
                  {lastSale.remainingAfterWallet > 0 && (
                    <div className="flex justify-between text-sm font-semibold">
                      <span>
                        {t("admin.posRemainingPayment", "Remaining payment")}
                      </span>
                      <span>
                        {formatCurrency(lastSale.remainingAfterWallet)}
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>

            <Button icon={Printer} fullWidth onClick={printReceipt}>
              {t("admin.posPrintReceipt")}
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
}
