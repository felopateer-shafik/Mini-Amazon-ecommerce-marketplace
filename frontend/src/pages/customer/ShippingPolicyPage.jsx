import Breadcrumb from "@/components/ui/Breadcrumb";
import { useTranslation } from "@/hooks/useTranslation";
import { useSEO } from "@/hooks/useSEO";
import {
  Truck,
  Clock,
  Globe,
  MapPin,
  Package,
  AlertCircle,
} from "lucide-react";

const methods = [
  {
    icon: Truck,
    name: "Standard Shipping",
    time: "5–7 business days",
    cost: "Free on orders over EGP 1,500",
    desc: "Our default shipping method. Reliable and cost-effective for non-urgent deliveries.",
  },
  {
    icon: Clock,
    name: "Express Shipping",
    time: "2–3 business days",
    cost: "From EGP 150",
    desc: "Faster delivery for when you need items sooner. Available in most regions.",
  },
  {
    icon: MapPin,
    name: "Same-Day Delivery",
    time: "Within 12 hours",
    cost: "From EGP 250",
    desc: "Available in select metro areas. Order before 12 PM local time for same-day arrival.",
  },
  {
    icon: Globe,
    name: "International Shipping",
    time: "7–14 business days",
    cost: "Varies by region",
    desc: "We ship to 50+ countries. Customs duties and taxes may apply based on your country's regulations.",
  },
];

export default function ShippingPolicyPage() {
  const { t } = useTranslation();
  useSEO({
    title: "Shipping Policy - Mini Amazon",
    description:
      "Shipping information for Mini Amazon orders. Learn about delivery times, shipping methods, costs, and tracking.",
    canonical: "/shipping-policy",
  });

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-8">
      <Breadcrumb
        items={[
          { label: t("common.home"), href: "/" },
          { label: t("footer.shippingPolicy") },
        ]}
      />

      <div className="text-center space-y-2">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-text">
          Shipping Policy
        </h1>
        <p className="text-sm text-text-secondary max-w-lg mx-auto">
          Everything you need to know about how we get your orders to your door.
        </p>
      </div>

      {/* Shipping Methods */}
      <div className="space-y-3">
        {methods.map((m) => (
          <div
            key={m.name}
            className="bg-white border border-border/50 rounded-xl p-5 flex gap-4 hover:shadow-md transition-shadow"
          >
            <div className="shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <m.icon className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex flex-wrap items-baseline gap-2">
                <h3 className="text-sm font-semibold text-text">{m.name}</h3>
                <span className="text-xs text-primary font-medium">
                  {m.time}
                </span>
              </div>
              <p className="text-xs text-text-secondary">{m.desc}</p>
              <p className="text-xs font-medium text-emerald-600">{m.cost}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Details */}
      <div className="bg-white border border-border/50 rounded-xl p-6 md:p-8 space-y-5">
        <section>
          <h2 className="text-base font-semibold text-text mb-2">
            Order Processing
          </h2>
          <p className="text-sm text-text-secondary leading-relaxed">
            Orders are processed within 1–2 business days after payment
            confirmation. During peak sale periods, processing may take up to 3
            business days. You'll receive a shipping confirmation email with
            tracking information once your order has been dispatched.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-text mb-2">
            Tracking Your Order
          </h2>
          <p className="text-sm text-text-secondary leading-relaxed">
            Once shipped, you can track your package from your{" "}
            <a
              href="/orders"
              className="text-primary font-medium hover:underline"
            >
              Orders page
            </a>
            . Tracking information is typically available within 24 hours of
            dispatch. You'll also receive email and in-app notifications at each
            delivery milestone.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-text mb-2">
            Delivery Issues
          </h2>
          <p className="text-sm text-text-secondary leading-relaxed">
            If your package hasn't arrived within the estimated timeframe, or if
            it was damaged during transit, please contact our{" "}
            <a
              href="/contact"
              className="text-primary font-medium hover:underline"
            >
              support team
            </a>{" "}
            with your order number. We'll work with the carrier to resolve the
            issue promptly.
          </p>
        </section>
      </div>

      {/* Note */}
      <div className="flex gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
        <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-800 space-y-1">
          <p className="font-semibold">Important Note</p>
          <p>
            Shipping times are estimates and may vary due to weather, holidays,
            or carrier delays. Certain items (hazardous materials, oversized
            goods) may have shipping restrictions. Sellers may also have their
            own shipping policies that apply in addition to ours.
          </p>
        </div>
      </div>
    </div>
  );
}
