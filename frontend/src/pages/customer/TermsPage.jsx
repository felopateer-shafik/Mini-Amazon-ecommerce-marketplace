import Breadcrumb from "@/components/ui/Breadcrumb";
import { useTranslation } from "@/hooks/useTranslation";
import { useSEO } from "@/hooks/useSEO";
import {
  FileText,
  ShieldCheck,
  CreditCard,
  RotateCcw,
  Scale,
  AlertTriangle,
  Ban,
} from "lucide-react";

const sections = [
  {
    icon: ShieldCheck,
    titleKey: "terms.accountAccess",
    bodyKey: "terms.accountAccessBody",
    fallbackTitle: "Account & Access",
    fallbackBody:
      "You are responsible for maintaining the security of your account credentials and all activity under your account. Sharing login information is prohibited and may result in suspension.",
  },
  {
    icon: CreditCard,
    titleKey: "terms.ordersPayments",
    bodyKey: "terms.ordersPaymentsBody",
    fallbackTitle: "Orders & Payments",
    fallbackBody:
      "Orders are subject to stock availability, payment confirmation, and platform fraud checks. We reserve the right to cancel orders that violate our policies.",
  },
  {
    icon: RotateCcw,
    titleKey: "terms.returnsRefunds",
    bodyKey: "terms.returnsRefundsBody",
    fallbackTitle: "Returns & Refunds",
    fallbackBody:
      "Refund eligibility and timelines depend on product condition, reason for return, and seller policy. Requests must be submitted within the specified return window.",
  },
  {
    icon: Scale,
    titleKey: "terms.intellectualProperty",
    bodyKey: "terms.intellectualPropertyBody",
    fallbackTitle: "Intellectual Property",
    fallbackBody:
      "All content, logos, and branding on this platform are protected by copyright. You may not reproduce, distribute, or create derivative works without explicit permission.",
  },
  {
    icon: AlertTriangle,
    titleKey: "terms.liability",
    bodyKey: "terms.liabilityBody",
    fallbackTitle: "Limitation of Liability",
    fallbackBody:
      "The platform is not liable for damages arising from use of third-party merchant products. Disputes between buyers and sellers are resolved through our mediation process.",
  },
  {
    icon: Ban,
    titleKey: "terms.termination",
    bodyKey: "terms.terminationBody",
    fallbackTitle: "Termination",
    fallbackBody:
      "We reserve the right to suspend or terminate accounts that violate these terms, engage in fraudulent activity, or breach community guidelines.",
  },
];

export default function TermsPage() {
  const { t } = useTranslation();
  useSEO({
    title: "Terms & Conditions - Mini Amazon",
    description:
      "Read the terms and conditions governing the use of Mini Amazon marketplace. Understand your rights and responsibilities as a buyer or seller.",
    canonical: "/terms",
  });

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      <Breadcrumb
        items={[
          { label: t("common.home"), href: "/" },
          { label: t("footer.termsConditions") || "Terms & Conditions" },
        ]}
      />

      <div className="rounded-2xl border border-border/50 bg-white p-6 md:p-8">
        <div className="flex items-center gap-3">
          <div className="shrink-0 w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <FileText className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-text">
            Terms & Conditions
          </h1>
        </div>
        <p className="mt-4 text-sm text-text-secondary leading-relaxed">
          By using Mini Amazon, you agree to these terms. They govern account
          use, orders, payments, returns, acceptable conduct, and platform
          safety. If you do not agree, please do not use the service.
        </p>
      </div>

      {/* Sections */}
      <div className="grid gap-5 sm:grid-cols-2">
        {sections.map((sec, i) => {
          const Icon = sec.icon;
          return (
            <div
              key={i}
              className="group rounded-xl border border-border/50 bg-white p-5 shadow-sm hover:shadow-md hover:border-primary/30 transition-all duration-200"
            >
              <div className="flex items-start gap-3">
                <div className="shrink-0 w-10 h-10 rounded-lg bg-primary-light/40 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-text">
                    {t(sec.titleKey) || sec.fallbackTitle}
                  </h2>
                  <p className="mt-1.5 text-sm leading-relaxed text-text-secondary">
                    {t(sec.bodyKey) || sec.fallbackBody}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-xl border border-border/50 bg-white p-4 text-xs text-text-secondary">
        Contact: legal@miniamazon.com • Last updated: March 2026
      </div>
    </div>
  );
}
