import { useState } from "react";
import Breadcrumb from "@/components/ui/Breadcrumb";
import { useTranslation } from "@/hooks/useTranslation";
import { useSEO } from "@/hooks/useSEO";
import {
  Mail,
  Phone,
  MapPin,
  Clock,
  Send,
  MessageSquare,
  Headphones,
  CheckCircle,
} from "lucide-react";

const channelDefs = [
  {
    icon: Mail,
    titleKey: "contact.emailUs",
    detail: "support@miniamazon.com",
    subKey: "contact.emailSub",
    color: "from-blue-500 to-indigo-600",
  },
  {
    icon: Phone,
    titleKey: "contact.callUs",
    detail: "+1 (800) 123-4567",
    subKey: "contact.callSub",
    color: "from-emerald-500 to-teal-600",
  },
  {
    icon: MessageSquare,
    titleKey: "contact.liveChat",
    detailKey: "contact.chatDetail",
    subKey: "contact.chatSub",
    color: "from-amber-500 to-orange-600",
  },
  {
    icon: Headphones,
    titleKey: "contact.helpCenter",
    detailKey: "contact.helpDetail",
    subKey: "contact.helpSub",
    color: "from-violet-500 to-purple-600",
  },
];

export default function ContactPage() {
  const { t } = useTranslation();
  useSEO({
    title: "Contact Us - Mini Amazon",
    description:
      "Get in touch with Mini Amazon customer support. We're here to help with orders, returns, seller inquiries, and more.",
    canonical: "/contact",
  });
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    setSubmitted(true);
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-8">
      <Breadcrumb
        items={[
          { label: t("common.home"), href: "/" },
          { label: t("footer.contactUs") },
        ]}
      />

      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-text">
          {t("contact.title")}
        </h1>
        <p className="text-sm text-text-secondary max-w-lg mx-auto">
          {t("contact.subtitle")}
        </p>
      </div>

      {/* Contact Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {channelDefs.map((ch) => (
          <div
            key={ch.titleKey}
            className="bg-white border border-border/50 rounded-xl p-4 text-center space-y-2 hover:shadow-md transition-shadow"
          >
            <div
              className={`w-10 h-10 mx-auto rounded-lg bg-gradient-to-br ${ch.color} flex items-center justify-center`}
            >
              <ch.icon className="h-5 w-5 text-white" />
            </div>
            <h3 className="text-sm font-semibold text-text">
              {t(ch.titleKey)}
            </h3>
            <p className="text-xs font-medium text-primary">
              {ch.detailKey ? t(ch.detailKey) : ch.detail}
            </p>
            <p className="text-[11px] text-text-light">{t(ch.subKey)}</p>
          </div>
        ))}
      </div>

      {/* Contact Form + Info */}
      <div className="grid sm:grid-cols-2 md:grid-cols-5 gap-6">
        {/* Form */}
        <div className="md:col-span-3 bg-white border border-border/50 rounded-xl p-6 md:p-8">
          {submitted ? (
            <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
              <CheckCircle className="h-12 w-12 text-emerald-500" />
              <h2 className="text-lg font-bold text-text">
                {t("contact.successTitle")}
              </h2>
              <p className="text-sm text-text-secondary max-w-sm">
                {t("contact.successMessage")}
              </p>
              <button
                onClick={() => setSubmitted(false)}
                className="text-sm text-primary font-medium hover:underline mt-2"
              >
                {t("contact.sendAnother")}
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <h2 className="text-base font-bold text-text mb-1">
                {t("contact.formHeading")}
              </h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">
                    {t("contact.fullName")}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={t("contact.namePlaceholder")}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">
                    {t("contact.emailAddress")}
                  </label>
                  <input
                    type="email"
                    required
                    placeholder={t("contact.emailPlaceholder")}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">
                  {t("contact.subject")}
                </label>
                <select className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white">
                  <option>{t("contact.subjectOrderIssue")}</option>
                  <option>{t("contact.subjectRefundRequest")}</option>
                  <option>{t("contact.subjectAccountHelp")}</option>
                  <option>{t("contact.subjectSellerInquiry")}</option>
                  <option>{t("contact.subjectPartnership")}</option>
                  <option>{t("contact.subjectBugReport")}</option>
                  <option>{t("contact.subjectOther")}</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">
                  {t("contact.message")}
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder={t("contact.messagePlaceholder")}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
                />
              </div>
              <button
                type="submit"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-lg text-sm font-semibold transition-colors"
              >
                <Send className="h-4 w-4" />
                {t("contact.sendMessage")}
              </button>
            </form>
          )}
        </div>

        {/* Side Info */}
        <div className="md:col-span-2 space-y-4">
          <div className="bg-white border border-border/50 rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-text">
              {t("contact.officeLocation")}
            </h3>
            <div className="flex items-start gap-3 text-sm text-text-secondary">
              <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <span>{t("contact.headquartersDetail")}</span>
            </div>
            <div className="flex items-start gap-3 text-sm text-text-secondary">
              <Clock className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <div>
                <p>{t("contact.officeHoursDetail")}</p>
                <p>{t("contact.satSun")}</p>
              </div>
            </div>
          </div>

          <div className="bg-primary/5 border border-primary/20 rounded-xl p-5 space-y-2">
            <h3 className="text-sm font-bold text-text">
              {t("contact.quickTip")}
            </h3>
            <p className="text-xs text-text-secondary leading-relaxed">
              {t("contact.quickTipText")}{" "}
              <a
                href="/orders"
                className="text-primary font-medium hover:underline"
              >
                {t("contact.ordersPage")}
              </a>
              .
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
