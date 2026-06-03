import { Link } from "react-router-dom";
import {
  Facebook,
  Twitter,
  Instagram,
  Youtube,
  Mail,
  Phone,
  MapPin,
} from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { usePublicSettings } from "@/hooks/useApi";
import { useAuthStore } from "@/store/authStore";
import { useState } from "react";

export default function CustomerFooter() {
  const { t } = useTranslation();
  const { data: publicSettingsRes } = usePublicSettings();
  const publicSettings = publicSettingsRes?.data ?? publicSettingsRes ?? {};
  const newsletterEnabled = !!publicSettings?.newsletter_enabled;
  const { user } = useAuthStore();
  const isSeller = user?.role === "merchant";
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  return (
    <footer className="bg-secondary-dark text-gray-300">
      {/* Back to top */}
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        className="w-full bg-secondary hover:bg-secondary-light py-3 text-sm text-white transition-colors"
      >
        {t("footer.backToTop")}
      </button>

      {/* Newsletter Signup */}
      {newsletterEnabled && (
        <div className="bg-primary/10 border-b border-primary/20 py-8">
          <div className="container mx-auto px-4 text-center">
            <h3 className="text-lg font-bold text-text mb-1">
              {t("footer.newsletterTitle", "Stay in the Loop")}
            </h3>
            <p className="text-sm text-text-secondary mb-4">
              {t("footer.subscribeText")}
            </p>
            {subscribed ? (
              <p className="text-sm font-medium text-primary">
                {t("footer.subscribed", "You're subscribed! Thank you.")}
              </p>
            ) : (
              <form
                className="flex flex-col sm:flex-row gap-2 justify-center max-w-md mx-auto"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (email) setSubscribed(true);
                }}
              >
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("footer.emailPlaceholder", "Enter your email")}
                  className="flex-1 px-4 py-2 border border-border rounded-lg text-sm outline-none focus:ring-1 focus:ring-primary bg-white"
                  required
                />
                <button
                  type="submit"
                  className="px-5 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition whitespace-nowrap"
                >
                  {t("footer.subscribe")}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Main footer */}
      <div className="container mx-auto px-4 py-10 overflow-hidden">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Get to Know Us */}
          <div>
            <h4 className="text-white font-bold mb-4">
              {t("footer.getToKnowUs")}
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/about" className="hover:text-white hover:underline">
                  {t("footer.aboutUs")}
                </Link>
              </li>
              <li>
                <Link to="/blog" className="hover:text-white hover:underline">
                  {t("footer.blog")}
                </Link>
              </li>
              <li>
                <Link
                  to="/careers"
                  className="hover:text-white hover:underline"
                >
                  {t("footer.careers")}
                </Link>
              </li>
              {!isSeller && (
                <li>
                  <Link
                    to="/become-seller"
                    className="hover:text-white hover:underline"
                  >
                    {t("footer.sellOnMiniAmazon")}
                  </Link>
                </li>
              )}
              <li>
                <Link
                  to="/affiliate"
                  className="hover:text-white hover:underline"
                >
                  {t("footer.becomeAffiliate")}
                </Link>
              </li>
            </ul>
          </div>

          {/* Customer Service */}
          <div>
            <h4 className="text-white font-bold mb-4">
              {t("footer.customerService")}
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  to="/contact"
                  className="hover:text-white hover:underline"
                >
                  {t("footer.contactUs")}
                </Link>
              </li>
              <li>
                <Link to="/faq" className="hover:text-white hover:underline">
                  {t("footer.faq")}
                </Link>
              </li>
              <li>
                <Link
                  to="/shipping-policy"
                  className="hover:text-white hover:underline"
                >
                  {t("footer.shippingPolicy")}
                </Link>
              </li>
              <li>
                <Link
                  to="/return-policy"
                  className="hover:text-white hover:underline"
                >
                  {t("footer.returnPolicy")}
                </Link>
              </li>
              <li>
                <Link to="/orders" className="hover:text-white hover:underline">
                  {t("footer.trackYourOrder")}
                </Link>
              </li>
            </ul>
          </div>

          {/* Policies */}
          <div>
            <h4 className="text-white font-bold mb-4">
              {t("footer.policies")}
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/terms" className="hover:text-white hover:underline">
                  {t("footer.termsConditions")}
                </Link>
              </li>
              <li>
                <Link
                  to="/privacy"
                  className="hover:text-white hover:underline"
                >
                  {t("footer.privacyPolicy")}
                </Link>
              </li>
              <li>
                <Link
                  to="/cookie-policy"
                  className="hover:text-white hover:underline"
                >
                  {t("footer.cookiePolicy")}
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-white font-bold mb-4">{t("footer.contact")}</h4>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-primary" />
                support@miniamazon.com
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-primary" />
                +1 (800) 123-4567
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                123 Commerce Street, Business City, BC 12345
              </li>
            </ul>
          </div>
        </div>

        {/* Social */}
        <div className="flex items-center justify-center gap-4 mt-8 pt-8 border-t border-gray-700">
          <a href="#" className="p-2 hover:text-white transition-colors">
            <Facebook className="h-5 w-5" />
          </a>
          <a href="#" className="p-2 hover:text-white transition-colors">
            <Twitter className="h-5 w-5" />
          </a>
          <a href="#" className="p-2 hover:text-white transition-colors">
            <Instagram className="h-5 w-5" />
          </a>
          <a href="#" className="p-2 hover:text-white transition-colors">
            <Youtube className="h-5 w-5" />
          </a>
        </div>
      </div>

      {/* Bottom */}
      <div className="bg-secondary-dark border-t border-gray-700 py-4">
        <div className="container mx-auto px-4 text-center text-xs text-gray-500">
          {t("footer.copyright", { year: new Date().getFullYear() })}
        </div>
      </div>
    </footer>
  );
}
