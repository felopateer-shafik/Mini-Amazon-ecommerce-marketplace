import Breadcrumb from "@/components/ui/Breadcrumb";
import { useTranslation } from "@/hooks/useTranslation";
import { useSEO } from "@/hooks/useSEO";
import {
  Cookie,
  Shield,
  Settings,
  BarChart3,
  ToggleLeft,
  AlertCircle,
} from "lucide-react";

const cookieTypes = [
  {
    icon: Shield,
    name: "Essential Cookies",
    required: true,
    desc: "These cookies are strictly necessary for the website to function. They enable core features like secure login, shopping cart, and checkout. Disabling them would break site functionality.",
    examples: "Session ID, CSRF token, authentication state",
  },
  {
    icon: BarChart3,
    name: "Analytics Cookies",
    required: false,
    desc: "Help us understand how visitors interact with our website by collecting anonymized usage information. This data helps us improve site performance and user experience.",
    examples: "Page views, click patterns, load times, scroll depth",
  },
  {
    icon: Settings,
    name: "Functional Cookies",
    required: false,
    desc: "Remember your preferences and choices to provide a more personalized experience. These enhance convenience but aren't strictly necessary.",
    examples: "Language preference, currency, recently viewed products, theme",
  },
  {
    icon: ToggleLeft,
    name: "Marketing Cookies",
    required: false,
    desc: "Used to display relevant advertisements and measure campaign effectiveness. These may be set by third-party advertising partners.",
    examples: "Ad targeting, retargeting pixels, social media trackers",
  },
];

export default function CookiePolicyPage() {
  const { t } = useTranslation();
  useSEO({
    title: "Cookie Policy - Mini Amazon",
    description:
      "Learn about how Mini Amazon uses cookies and similar technologies. Manage your cookie preferences and understand our tracking practices.",
    canonical: "/cookie-policy",
  });

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-8">
      <Breadcrumb
        items={[
          { label: t("common.home"), href: "/" },
          { label: t("footer.cookiePolicy") },
        ]}
      />

      {/* Header */}
      <div className="flex items-center gap-4 bg-white border border-border/50 rounded-xl p-6">
        <div className="shrink-0 w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
          <Cookie className="h-6 w-6 text-amber-600" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-text">
            Cookie Policy
          </h1>
          <p className="text-sm text-text-secondary mt-0.5">
            Last updated: March 1, 2026
          </p>
        </div>
      </div>

      {/* Intro */}
      <div className="bg-white border border-border/50 rounded-xl p-6 md:p-8 space-y-4">
        <h2 className="text-base font-semibold text-text">What Are Cookies?</h2>
        <p className="text-sm text-text-secondary leading-relaxed">
          Cookies are small text files stored on your device when you visit a
          website. They help the site remember your preferences, keep you logged
          in, and understand how you use the platform so we can improve your
          experience.
        </p>
        <p className="text-sm text-text-secondary leading-relaxed">
          Mini Amazon uses cookies and similar technologies (local storage,
          session storage) to operate the marketplace, analyze traffic, and
          personalize content. This policy explains what cookies we use and how
          you can control them.
        </p>
      </div>

      {/* Cookie Types */}
      <div>
        <h2 className="text-lg font-bold text-text mb-4">
          Types of Cookies We Use
        </h2>
        <div className="space-y-3">
          {cookieTypes.map((c) => (
            <div
              key={c.name}
              className="bg-white border border-border/50 rounded-xl p-5 space-y-2 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                    <c.icon className="h-4.5 w-4.5 text-primary" />
                  </div>
                  <h3 className="text-sm font-semibold text-text">{c.name}</h3>
                </div>
                <span
                  className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                    c.required
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-gray-100 text-text-secondary"
                  }`}
                >
                  {c.required ? "Always Active" : "Optional"}
                </span>
              </div>
              <p className="text-xs text-text-secondary leading-relaxed">
                {c.desc}
              </p>
              <p className="text-[11px] text-text-light">
                <span className="font-medium">Examples:</span> {c.examples}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Managing cookies */}
      <div className="bg-white border border-border/50 rounded-xl p-6 md:p-8 space-y-5">
        <section>
          <h2 className="text-base font-semibold text-text mb-2">
            Managing Your Cookie Preferences
          </h2>
          <p className="text-sm text-text-secondary leading-relaxed">
            You can control and delete cookies through your browser settings.
            Most browsers allow you to block or delete cookies, set preferences
            for different websites, and browse in "private" or "incognito" mode.
            Note that blocking essential cookies may impair site functionality.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-text mb-2">
            Third-Party Cookies
          </h2>
          <p className="text-sm text-text-secondary leading-relaxed">
            Some cookies are placed by third-party services that appear on our
            pages, such as analytics providers and payment processors. We do not
            control these cookies. Please refer to the respective third-party
            privacy policies for more information.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-text mb-2">
            Updates to This Policy
          </h2>
          <p className="text-sm text-text-secondary leading-relaxed">
            We may update this Cookie Policy from time to time to reflect
            changes in technology, regulation, or our business practices. Any
            changes will be posted on this page with an updated revision date.
          </p>
        </section>
      </div>

      {/* Note */}
      <div className="flex gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
        <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-800">
          <span className="font-semibold">Questions about cookies?</span>{" "}
          Contact us at{" "}
          <a
            href="mailto:privacy@miniamazon.com"
            className="font-medium underline"
          >
            privacy@miniamazon.com
          </a>{" "}
          or visit our{" "}
          <a href="/privacy" className="font-medium underline">
            Privacy Policy
          </a>{" "}
          for more details on how we handle your data.
        </p>
      </div>
    </div>
  );
}
