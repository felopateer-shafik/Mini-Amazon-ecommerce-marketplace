import Breadcrumb from "@/components/ui/Breadcrumb";
import { useTranslation } from "@/hooks/useTranslation";
import { useSEO } from "@/hooks/useSEO";
import {
  Lock,
  Database,
  Settings,
  Share2,
  Cookie,
  ShieldCheck,
} from "lucide-react";

const sections = [
  {
    icon: Database,
    titleKey: "privacy.dataCollect",
    bodyKey: "privacy.dataCollectBody",
    fallbackTitle: "Data We Collect",
    fallbackBody:
      "Account details, delivery addresses, order activity, payment metadata, and support interactions necessary to provide our services.",
  },
  {
    icon: Settings,
    titleKey: "privacy.howWeUse",
    bodyKey: "privacy.howWeUseBody",
    fallbackTitle: "How We Use Data",
    fallbackBody:
      "To fulfill purchases, provide customer support, send service notifications, personalize your experience, and prevent fraud.",
  },
  {
    icon: Share2,
    titleKey: "privacy.dataSharing",
    bodyKey: "privacy.dataSharingBody",
    fallbackTitle: "Data Sharing",
    fallbackBody:
      "Data is shared only with sellers and trusted service providers required for order fulfillment, payment processing, and legal compliance.",
  },
  {
    icon: Cookie,
    titleKey: "privacy.cookies",
    bodyKey: "privacy.cookiesBody",
    fallbackTitle: "Cookies & Tracking",
    fallbackBody:
      "We use essential cookies for authentication and preferences, plus optional analytics cookies with your consent to improve our services.",
  },
  {
    icon: ShieldCheck,
    titleKey: "privacy.yourRights",
    bodyKey: "privacy.yourRightsBody",
    fallbackTitle: "Your Rights",
    fallbackBody:
      "You may access, correct, or delete your personal data at any time through your account settings. You can also request a complete data export.",
  },
  {
    icon: Lock,
    titleKey: "privacy.security",
    bodyKey: "privacy.securityBody",
    fallbackTitle: "Security Measures",
    fallbackBody:
      "We employ encryption, access controls, and regular audits to protect your information. Sensitive data is encrypted at rest and in transit.",
  },
];

export default function PrivacyPage() {
  const { t } = useTranslation();
  useSEO({
    title: "Privacy Policy - Mini Amazon",
    description:
      "Learn how Mini Amazon collects, uses, and protects your personal information. Your privacy and data security are our priority.",
    canonical: "/privacy",
  });

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      <Breadcrumb
        items={[
          { label: t("common.home"), href: "/" },
          { label: t("footer.privacyPolicy") || "Privacy Policy" },
        ]}
      />

      <div className="rounded-2xl border border-border/50 bg-white p-6 md:p-8">
        <div className="flex items-center gap-3">
          <div className="shrink-0 w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Lock className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-text">
            Privacy Policy
          </h1>
        </div>
        <p className="mt-4 text-sm text-text-secondary leading-relaxed">
          This policy explains what personal information we collect, why we use
          it, and the choices you have. We only process data needed to run the
          marketplace, complete orders, provide support, and protect platform
          security.
        </p>
      </div>

      {/* Sections */}
      <div className="space-y-4">
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
        Contact: privacy@miniamazon.com • Last updated: March 2026
      </div>
    </div>
  );
}
