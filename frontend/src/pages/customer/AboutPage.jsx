import { Link } from "react-router-dom";
import Breadcrumb from "@/components/ui/Breadcrumb";
import { useTranslation } from "@/hooks/useTranslation";
import { useSEO } from "@/hooks/useSEO";
import {
  ShoppingBag,
  Users,
  Globe,
  Shield,
  Heart,
  Zap,
  TrendingUp,
  Award,
} from "lucide-react";

const stats = [
  { labelKey: "about.statActiveSellers", value: "10,000+", icon: Users },
  { labelKey: "about.statProductsListed", value: "1M+", icon: ShoppingBag },
  { labelKey: "about.statCountriesServed", value: "50+", icon: Globe },
  { labelKey: "about.statHappyCustomers", value: "5M+", icon: Heart },
];

const values = [
  {
    icon: Shield,
    titleKey: "about.valueTrustTitle",
    descKey: "about.valueTrustDesc",
  },
  {
    icon: Zap,
    titleKey: "about.valueInnovationTitle",
    descKey: "about.valueInnovationDesc",
  },
  {
    icon: TrendingUp,
    titleKey: "about.valueEmpowerTitle",
    descKey: "about.valueEmpowerDesc",
  },
  {
    icon: Award,
    titleKey: "about.valueQualityTitle",
    descKey: "about.valueQualityDesc",
  },
];

export default function AboutPage() {
  const { t } = useTranslation();
  useSEO({
    title: "About Us - Mini Amazon",
    description:
      "Learn about Mini Amazon, the multi-vendor marketplace connecting sellers and buyers worldwide. Our mission, values, and story.",
    canonical: "/about",
  });

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-8">
      <Breadcrumb
        items={[
          { label: t("common.home"), href: "/" },
          { label: t("footer.aboutUs") },
        ]}
      />

      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/90 to-primary-dark p-4 sm:p-8 md:p-12 text-white">
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-white/5 rounded-full blur-2xl" />
        <div className="relative z-10 max-w-2xl">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold mb-4">
            {t("about.title")}
          </h1>
          <p className="text-white/90 text-sm sm:text-base leading-relaxed">
            {t("about.subtitle")}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div
            key={s.labelKey}
            className="bg-white border border-border/50 rounded-xl p-5 text-center space-y-2 hover:shadow-md transition-shadow"
          >
            <s.icon className="h-7 w-7 mx-auto text-primary" />
            <p className="text-xl sm:text-2xl font-bold text-text">{s.value}</p>
            <p className="text-xs text-text-secondary">{t(s.labelKey)}</p>
          </div>
        ))}
      </div>

      {/* Our Story */}
      <div className="bg-white border border-border/50 rounded-xl p-6 md:p-8 space-y-4">
        <h2 className="text-lg font-bold text-text">{t("about.ourStory")}</h2>
        <p className="text-sm text-text-secondary leading-relaxed">
          {t("about.storyP1")}
        </p>
        <p className="text-sm text-text-secondary leading-relaxed">
          {t("about.storyP2")}
        </p>
      </div>

      {/* Values */}
      <div>
        <h2 className="text-lg font-bold text-text mb-4">
          {t("about.whatWeStandFor")}
        </h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {values.map((v) => (
            <div
              key={v.titleKey}
              className="bg-white border border-border/50 rounded-xl p-5 flex gap-4 hover:shadow-md transition-shadow"
            >
              <div className="shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <v.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-text mb-1">
                  {t(v.titleKey)}
                </h3>
                <p className="text-xs text-text-secondary leading-relaxed">
                  {t(v.descKey)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="bg-secondary-dark rounded-xl p-6 md:p-8 text-center text-white space-y-3">
        <h2 className="text-lg font-bold">{t("about.ctaTitle")}</h2>
        <p className="text-sm text-gray-300 max-w-lg mx-auto">
          {t("about.ctaSubtitle")}
        </p>
        <Link
          to="/merchant/register"
          className="inline-block mt-2 px-6 py-2.5 bg-primary hover:bg-primary-dark rounded-lg text-sm font-semibold transition-colors"
        >
          {t("about.ctaButton")}
        </Link>
      </div>
    </div>
  );
}
