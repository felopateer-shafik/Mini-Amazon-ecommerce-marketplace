import { useState } from "react";
import Breadcrumb from "@/components/ui/Breadcrumb";
import { useTranslation } from "@/hooks/useTranslation";
import { useSEO } from "@/hooks/useSEO";
import {
  ChevronDown,
  Search,
  ShoppingBag,
  Truck,
  RotateCcw,
  CreditCard,
  User,
  Shield,
} from "lucide-react";

const categories = [
  { id: "orders", icon: ShoppingBag, labelKey: "faq.catOrders" },
  { id: "shipping", icon: Truck, labelKey: "faq.catShipping" },
  { id: "returns", icon: RotateCcw, labelKey: "faq.catReturns" },
  { id: "payments", icon: CreditCard, labelKey: "faq.catPayments" },
  { id: "account", icon: User, labelKey: "faq.catAccount" },
  { id: "security", icon: Shield, labelKey: "faq.catSecurity" },
];

const faqs = [
  {
    cat: "orders",
    q: "How do I place an order?",
    a: "Browse products, add items to your cart, proceed to checkout, select your shipping address and payment method, then confirm your order. You'll receive a confirmation email instantly.",
  },
  {
    cat: "orders",
    q: "Can I modify or cancel my order after placing it?",
    a: "You can cancel an order within 1 hour of placing it if it hasn't been shipped yet. Go to your Orders page, select the order, and click 'Cancel Order'. Modifications aren't supported — cancel and reorder instead.",
  },
  {
    cat: "orders",
    q: "How do I track my order?",
    a: "Go to your Orders page and click on the order you'd like to track. You'll see real-time status updates including shipping carrier and tracking number once the item has been dispatched.",
  },
  {
    cat: "shipping",
    q: "What shipping methods are available?",
    a: "We offer Standard (5–7 days), Express (2–3 days), and Same-Day delivery (select areas). Shipping options and costs are displayed at checkout based on your location.",
  },
  {
    cat: "shipping",
    q: "Do you ship internationally?",
    a: "Yes! We ship to over 50 countries. International shipping times vary by destination, typically 7–14 business days. Customs duties may apply depending on your country.",
  },
  {
    cat: "shipping",
    q: "My order hasn't arrived yet. What should I do?",
    a: "Check your order tracking for the latest status. If the estimated delivery date has passed, contact our support team with your order number and we'll investigate immediately.",
  },
  {
    cat: "returns",
    q: "What is your return policy?",
    a: "Most items can be returned within 30 days of delivery in their original condition. Some categories like perishables, digital goods, and personalized items are non-returnable. See our Return Policy page for full details.",
  },
  {
    cat: "returns",
    q: "How do I request a refund?",
    a: "Go to your order details and click 'Request Refund'. Select the reason and submit. Our team reviews refund requests within 1–3 business days. Approved refunds are credited to your original payment method or wallet.",
  },
  {
    cat: "returns",
    q: "How long does a refund take?",
    a: "Once approved, wallet refunds are instant. Bank/card refunds typically take 5–10 business days depending on your financial institution.",
  },
  {
    cat: "payments",
    q: "What payment methods are accepted?",
    a: "We accept credit/debit cards (Visa, Mastercard, AMEX), PayPal, wallet balance, and cash on delivery in select regions.",
  },
  {
    cat: "payments",
    q: "How does the Mini Amazon Wallet work?",
    a: "Your wallet is a stored-value balance you can use for faster checkout. Top up via card or bank transfer. Refunds can also be credited to your wallet for instant availability.",
  },
  {
    cat: "payments",
    q: "Is it safe to save my payment information?",
    a: "Yes. All payment data is encrypted and processed through PCI-DSS compliant payment processors. We never store your full card details on our servers.",
  },
  {
    cat: "account",
    q: "How do I update my account information?",
    a: "Go to Account settings from your profile menu. You can update your name, email, phone number, password, and notification preferences.",
  },
  {
    cat: "account",
    q: "I forgot my password. How do I reset it?",
    a: "Click 'Forgot Password' on the login page, enter your email, and we'll send a reset link. The link expires after 1 hour for security.",
  },
  {
    cat: "security",
    q: "How do you protect my personal data?",
    a: "We use industry-standard encryption (TLS 1.3), secure authentication (including 2FA), and strict access controls. See our Privacy Policy for the full details.",
  },
  {
    cat: "security",
    q: "What should I do if I notice unauthorized activity?",
    a: "Immediately change your password, enable two-factor authentication, and contact our support team. We'll secure your account and investigate any suspicious transactions.",
  },
];

function FAQItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-border/50 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left hover:bg-gray-50 transition-colors"
      >
        <span className="text-sm font-medium text-text">{q}</span>
        <ChevronDown
          className={`h-4 w-4 text-text-light shrink-0 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      {open && (
        <div className="px-4 pb-4 text-sm text-text-secondary leading-relaxed border-t border-border/30">
          <p className="pt-3">{a}</p>
        </div>
      )}
    </div>
  );
}

export default function FAQPage() {
  const { t } = useTranslation();
  useSEO({
    title: "Frequently Asked Questions - Mini Amazon",
    description:
      "Find answers to common questions about orders, shipping, returns, payments, accounts, and security on Mini Amazon.",
    canonical: "/faq",
  });
  const [activeCat, setActiveCat] = useState("orders");
  const [search, setSearch] = useState("");

  const filteredFaqs = search.trim()
    ? faqs.filter(
        (f) =>
          f.q.toLowerCase().includes(search.toLowerCase()) ||
          f.a.toLowerCase().includes(search.toLowerCase()),
      )
    : faqs.filter((f) => f.cat === activeCat);

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-8">
      <Breadcrumb
        items={[
          { label: t("common.home"), href: "/" },
          { label: t("footer.faq") },
        ]}
      />

      {/* Header + Search */}
      <div className="text-center space-y-4">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-text">
          {t("faq.title")}
        </h1>
        <p className="text-sm text-text-secondary">{t("faq.subtitle")}</p>
        <div className="relative max-w-md mx-auto">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-light" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("faq.searchPlaceholder")}
            className="w-full ps-9 pe-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
        </div>
      </div>

      {/* Categories */}
      {!search.trim() && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCat(cat.id)}
              className={`flex flex-col items-center gap-1.5 p-3 rounded-xl text-center transition-all ${
                activeCat === cat.id
                  ? "bg-primary/10 border border-primary/30 text-primary"
                  : "bg-white border border-border/50 text-text-secondary hover:border-primary/20 hover:text-primary"
              }`}
            >
              <cat.icon className="h-5 w-5" />
              <span className="text-[11px] font-medium leading-tight">
                {t(cat.labelKey)}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* FAQ list */}
      <div className="space-y-2">
        {filteredFaqs.length > 0 ? (
          filteredFaqs.map((faq, i) => <FAQItem key={i} q={faq.q} a={faq.a} />)
        ) : (
          <div className="text-center py-12 text-sm text-text-secondary">
            {t("faq.noResults")}{" "}
            <a
              href="/contact"
              className="text-primary font-medium hover:underline"
            >
              {t("faq.contactUs")}
            </a>{" "}
            {t("faq.forHelp")}
          </div>
        )}
      </div>

      {/* Bottom CTA */}
      <div className="bg-gray-50 rounded-xl p-6 text-center space-y-2">
        <p className="text-sm font-medium text-text">
          {t("faq.stillHaveQuestions")}
        </p>
        <p className="text-xs text-text-secondary">{t("faq.supportReady")}</p>
        <a
          href="/contact"
          className="inline-block px-5 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg text-sm font-semibold transition-colors"
        >
          {t("faq.contactSupport")}
        </a>
      </div>
    </div>
  );
}
