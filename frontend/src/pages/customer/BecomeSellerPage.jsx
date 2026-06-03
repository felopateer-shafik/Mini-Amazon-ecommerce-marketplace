import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import Breadcrumb from "@/components/ui/Breadcrumb";
import { useTranslation } from "@/hooks/useTranslation";
import { useSEO } from "@/hooks/useSEO";
import { useAuthStore } from "@/store/authStore";
import {
  Store,
  BarChart3,
  Truck,
  Headphones,
  DollarSign,
  Globe,
  CheckCircle,
  ArrowRight,
} from "lucide-react";

const benefits = [
  {
    icon: Globe,
    title: "Reach Millions of Customers",
    desc: "Instantly showcase your products to our massive, growing customer base across 50+ countries.",
  },
  {
    icon: Store,
    title: "Easy Store Setup",
    desc: "Launch your store in minutes with our intuitive seller dashboard. No coding or design skills needed.",
  },
  {
    icon: BarChart3,
    title: "Powerful Analytics",
    desc: "Track sales, revenue, inventory, and customer behavior in real-time with detailed dashboards.",
  },
  {
    icon: Truck,
    title: "Fulfillment Support",
    desc: "Use our logistics network for hassle-free shipping, returns, and delivery tracking.",
  },
  {
    icon: DollarSign,
    title: "Competitive Fees",
    desc: "Low commission rates that let you keep more of your earnings. No hidden costs or setup fees.",
  },
  {
    icon: Headphones,
    title: "Dedicated Seller Support",
    desc: "Our seller success team is available 24/7 to help you grow and resolve any issues quickly.",
  },
];

const steps = [
  {
    num: "1",
    title: "Create Account",
    desc: "Register as a seller with your business or personal details.",
  },
  {
    num: "2",
    title: "Set Up Store",
    desc: "Customize your storefront, add branding, and configure shipping.",
  },
  {
    num: "3",
    title: "List Products",
    desc: "Upload products with photos, descriptions, and pricing.",
  },
  {
    num: "4",
    title: "Start Selling",
    desc: "Go live and receive orders from millions of customers.",
  },
];

export default function BecomeSellerPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useSEO({
    title: "Sell on Mini Amazon - Become a Seller",
    description:
      "Start your online business on Mini Amazon. Access millions of customers, powerful analytics, and seller tools. Register as a seller today.",
    canonical: "/become-seller",
  });

  // If user is already a merchant, redirect to merchant dashboard
  useEffect(() => {
    if (isAuthenticated && user?.role === "merchant") {
      navigate("/merchant", { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-8">
      <Breadcrumb
        items={[
          { label: t("common.home"), href: "/" },
          { label: t("footer.sellOnMiniAmazon") },
        ]}
      />

      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 p-8 md:p-12 text-white">
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-white/5 rounded-full blur-2xl" />
        <div className="relative z-10 max-w-2xl space-y-4">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold">
            Sell on Mini Amazon
          </h1>
          <p className="text-white/90 text-sm sm:text-base leading-relaxed">
            Turn your products into a business. Join thousands of successful
            sellers reaching millions of buyers on our trusted marketplace.
          </p>
          <Link
            to="/merchant/register"
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-white text-emerald-700 rounded-lg text-sm font-bold hover:bg-white/90 transition-colors"
          >
            Start Selling Today <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* How it works */}
      <div>
        <h2 className="text-lg font-bold text-text text-center mb-6">
          How It Works
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {steps.map((s) => (
            <div
              key={s.num}
              className="bg-white border border-border/50 rounded-xl p-5 text-center space-y-2 hover:shadow-md transition-shadow"
            >
              <div className="w-9 h-9 mx-auto rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold">
                {s.num}
              </div>
              <h3 className="text-sm font-semibold text-text">{s.title}</h3>
              <p className="text-xs text-text-secondary">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Benefits */}
      <div>
        <h2 className="text-lg font-bold text-text text-center mb-6">
          Why Sellers Love Mini Amazon
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {benefits.map((b) => (
            <div
              key={b.title}
              className="bg-white border border-border/50 rounded-xl p-5 space-y-2 hover:shadow-md transition-shadow"
            >
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <b.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-sm font-semibold text-text">{b.title}</h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                {b.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Checklist */}
      <div className="bg-white border border-border/50 rounded-xl p-6 md:p-8">
        <h2 className="text-lg font-bold text-text mb-4">
          What You'll Need to Get Started
        </h2>
        <ul className="space-y-2">
          {[
            "A valid email address or phone number",
            "Government-issued ID or business license",
            "Bank account for payouts",
            "Product photos and descriptions",
          ].map((item) => (
            <li
              key={item}
              className="flex items-start gap-2 text-sm text-text-secondary"
            >
              <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
              {item}
            </li>
          ))}
        </ul>
      </div>

      {/* Bottom CTA */}
      <div className="bg-secondary-dark rounded-xl p-6 md:p-8 text-center text-white space-y-3">
        <h2 className="text-lg font-bold">Ready to Grow Your Business?</h2>
        <p className="text-sm text-gray-300 max-w-md mx-auto">
          No upfront fees. No long-term commitments. Start selling in minutes.
        </p>
        <Link
          to="/merchant/register"
          className="inline-block mt-2 px-6 py-2.5 bg-primary hover:bg-primary-dark rounded-lg text-sm font-semibold transition-colors"
        >
          Register as a Seller
        </Link>
      </div>
    </div>
  );
}
