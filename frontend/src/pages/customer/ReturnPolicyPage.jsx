import Breadcrumb from "@/components/ui/Breadcrumb";
import { useTranslation } from "@/hooks/useTranslation";
import { useSEO } from "@/hooks/useSEO";
import {
  RotateCcw,
  Clock,
  CheckCircle,
  XCircle,
  Package,
  AlertCircle,
  ArrowRight,
} from "lucide-react";

const steps = [
  {
    num: "1",
    title: "Request Return",
    desc: "Go to your order details and click 'Request Refund'. Select the items and reason for return.",
  },
  {
    num: "2",
    title: "Await Approval",
    desc: "Our team reviews your request within 1–3 business days. You'll be notified of the outcome.",
  },
  {
    num: "3",
    title: "Ship Item Back",
    desc: "If approved, you'll receive a return shipping label. Pack the item in its original packaging.",
  },
  {
    num: "4",
    title: "Receive Refund",
    desc: "Once we receive and inspect the item, your refund will be processed within 5–10 business days.",
  },
];

const eligible = [
  "Unused items in original packaging",
  "Defective or damaged products",
  "Items that don't match the listing description",
  "Wrong item received",
];

const notEligible = [
  "Perishable goods (food, flowers, etc.)",
  "Digital products & gift cards",
  "Personalized or custom-made items",
  "Intimate apparel & swimwear",
  "Items returned after 30 days",
  "Products without original packaging",
];

export default function ReturnPolicyPage() {
  const { t } = useTranslation();
  useSEO({
    title: "Return Policy - Mini Amazon",
    description:
      "Mini Amazon return and refund policy. Learn how to return items, request refunds, and understand our hassle-free return process.",
    canonical: "/return-policy",
  });

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-8">
      <Breadcrumb
        items={[
          { label: t("common.home"), href: "/" },
          { label: t("footer.returnPolicy") },
        ]}
      />

      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 p-8 md:p-10 text-white">
        <div className="absolute -top-16 -right-16 w-48 h-48 bg-white/10 rounded-full blur-3xl" />
        <div className="relative z-10 flex items-center gap-4">
          <RotateCcw className="h-10 w-10 text-white/80 shrink-0" />
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold">
              Return & Refund Policy
            </h1>
            <p className="text-white/80 text-sm mt-1">
              30-day hassle-free returns on most items. Your satisfaction is our
              priority.
            </p>
          </div>
        </div>
      </div>

      {/* How it works */}
      <div>
        <h2 className="text-lg font-bold text-text mb-4">How Returns Work</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {steps.map((s) => (
            <div
              key={s.num}
              className="bg-white border border-border/50 rounded-xl p-4 text-center space-y-2 hover:shadow-md transition-shadow"
            >
              <div className="w-8 h-8 mx-auto rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold">
                {s.num}
              </div>
              <h3 className="text-xs font-semibold text-text">{s.title}</h3>
              <p className="text-[11px] text-text-secondary leading-relaxed">
                {s.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Eligibility */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="bg-white border border-border/50 rounded-xl p-5">
          <h3 className="text-sm font-bold text-text flex items-center gap-2 mb-3">
            <CheckCircle className="h-4 w-4 text-emerald-500" />
            Eligible for Return
          </h3>
          <ul className="space-y-2">
            {eligible.map((item) => (
              <li
                key={item}
                className="flex items-start gap-2 text-xs text-text-secondary"
              >
                <ArrowRight className="h-3 w-3 text-emerald-500 shrink-0 mt-0.5" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="bg-white border border-border/50 rounded-xl p-5">
          <h3 className="text-sm font-bold text-text flex items-center gap-2 mb-3">
            <XCircle className="h-4 w-4 text-red-500" />
            Not Eligible for Return
          </h3>
          <ul className="space-y-2">
            {notEligible.map((item) => (
              <li
                key={item}
                className="flex items-start gap-2 text-xs text-text-secondary"
              >
                <ArrowRight className="h-3 w-3 text-red-400 shrink-0 mt-0.5" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Details */}
      <div className="bg-white border border-border/50 rounded-xl p-6 md:p-8 space-y-5">
        <section>
          <h2 className="text-base font-semibold text-text mb-2">
            Refund Timelines
          </h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="font-medium text-text flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-primary" /> Wallet Refund
              </p>
              <p className="text-xs text-text-secondary mt-1">
                Instant once approved
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="font-medium text-text flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-primary" /> Card / Bank
              </p>
              <p className="text-xs text-text-secondary mt-1">
                5–10 business days
              </p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-base font-semibold text-text mb-2">
            Damaged or Defective Items
          </h2>
          <p className="text-sm text-text-secondary leading-relaxed">
            If you receive a damaged or defective item, contact us within 48
            hours of delivery with photos of the damage. We'll arrange a free
            return pickup and issue a full refund or replacement — your choice.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-text mb-2">
            Seller-Specific Policies
          </h2>
          <p className="text-sm text-text-secondary leading-relaxed">
            Some sellers may have their own return policies that differ from our
            standard terms. These are displayed on the product listing page. If
            a seller's policy conflicts with ours, the more favorable terms for
            the buyer will apply.
          </p>
        </section>
      </div>

      {/* Note */}
      <div className="flex gap-3 bg-blue-50 border border-blue-200 rounded-xl p-4">
        <AlertCircle className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
        <p className="text-xs text-blue-800">
          <span className="font-semibold">Need help with a return?</span> Visit
          our{" "}
          <a href="/contact" className="font-medium underline">
            Contact page
          </a>{" "}
          or check the{" "}
          <a href="/faq" className="font-medium underline">
            FAQ
          </a>{" "}
          for quick answers to common return questions.
        </p>
      </div>
    </div>
  );
}
