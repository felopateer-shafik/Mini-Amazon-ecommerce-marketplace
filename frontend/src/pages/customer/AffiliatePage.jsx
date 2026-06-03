import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Breadcrumb from "@/components/ui/Breadcrumb";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";
import { useTranslation } from "@/hooks/useTranslation";
import { useAuthStore } from "@/store/authStore";
import { affiliateService } from "@/api/services";
import toast from "react-hot-toast";
import {
  DollarSign,
  Share2,
  BarChart3,
  Zap,
  Gift,
  ArrowRight,
  CheckCircle,
  TrendingUp,
  Clock,
  XCircle,
  Loader2,
} from "lucide-react";

const tiers = [
  {
    name: "Starter",
    commission: "5%",
    desc: "Perfect for bloggers and content creators just getting started.",
    features: ["Basic dashboard", "Standard links", "Monthly payouts"],
    highlight: false,
  },
  {
    name: "Pro",
    commission: "8%",
    desc: "For influencers and publishers with an established audience.",
    features: [
      "Advanced analytics",
      "Custom short links",
      "Bi-weekly payouts",
      "Priority support",
    ],
    highlight: true,
  },
  {
    name: "Enterprise",
    commission: "12%",
    desc: "For agencies and large-scale partners driving high volumes.",
    features: [
      "Dedicated manager",
      "API access",
      "Weekly payouts",
      "Custom campaigns",
    ],
    highlight: false,
  },
];

const howItWorks = [
  {
    icon: Share2,
    title: "Share Products",
    desc: "Get unique affiliate links for any product on Mini Amazon and share them anywhere.",
  },
  {
    icon: DollarSign,
    title: "Earn Commissions",
    desc: "Earn a commission on every qualifying purchase made through your links.",
  },
  {
    icon: BarChart3,
    title: "Track Performance",
    desc: "Monitor clicks, conversions, and earnings in real-time through your affiliate dashboard.",
  },
  {
    icon: Zap,
    title: "Get Paid",
    desc: "Receive payouts directly to your bank account or wallet on a regular schedule.",
  },
];

function AffiliateApplicationForm({ onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [website, setWebsite] = useState("");
  const [socialMedia, setSocialMedia] = useState("");
  const [reason, setReason] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await affiliateService.apply({ website, social_media: socialMedia, reason });
      toast.success("Application submitted successfully! We'll review it shortly.");
      onSuccess?.();
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to submit application";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-border/50 rounded-xl p-6 space-y-4">
      <h2 className="text-lg font-bold text-text">Apply to Become an Affiliate</h2>
      <p className="text-sm text-text-secondary">
        Fill out the form below to apply. Our team will review your application within 24-48 hours.
      </p>
      <Input
        label="Website / Blog URL (optional)"
        type="url"
        placeholder="https://yourblog.com"
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
      />
      <Input
        label="Social Media Profiles (optional)"
        type="text"
        placeholder="Instagram, YouTube, TikTok handles..."
        value={socialMedia}
        onChange={(e) => setSocialMedia(e.target.value)}
      />
      <div>
        <label className="block text-sm font-medium text-text mb-1">
          Why do you want to join? (optional)
        </label>
        <textarea
          className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:ring-primary focus:border-primary"
          rows={3}
          placeholder="Tell us about your audience and how you plan to promote products..."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          maxLength={2000}
        />
      </div>
      <Button type="submit" loading={loading} fullWidth>
        Submit Application
      </Button>
    </form>
  );
}

function AffiliateStatusCard({ affiliate }) {
  const statusConfig = {
    pending: { icon: Clock, color: "warning", label: "Pending Review", desc: "Your application is being reviewed by our team." },
    active: { icon: CheckCircle, color: "success", label: "Approved", desc: "Congratulations! Your affiliate account is active." },
    suspended: { icon: XCircle, color: "danger", label: "Suspended", desc: "Your affiliate account has been suspended." },
  };

  const config = statusConfig[affiliate.status] || statusConfig.pending;
  const Icon = config.icon;

  return (
    <div className="bg-white border border-border/50 rounded-xl p-6 space-y-4">
      <div className="flex items-center gap-3">
        <Icon className={`h-8 w-8 ${affiliate.status === "active" ? "text-green-500" : affiliate.status === "suspended" ? "text-red-500" : "text-yellow-500"}`} />
        <div>
          <h2 className="text-lg font-bold text-text">Affiliate Status</h2>
          <Badge variant={config.color}>{config.label}</Badge>
        </div>
      </div>
      <p className="text-sm text-text-secondary">{config.desc}</p>
      {affiliate.status === "active" && (
        <div className="grid grid-cols-3 gap-4 pt-2">
          <div className="text-center">
            <p className="text-xl font-bold text-text">{affiliate.code}</p>
            <p className="text-xs text-text-secondary">Your Code</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-text">{affiliate.referrals ?? 0}</p>
            <p className="text-xs text-text-secondary">Referrals</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-primary">{affiliate.commission_rate}%</p>
            <p className="text-xs text-text-secondary">Commission</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AffiliatePage() {
  const { t } = useTranslation();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [affiliateStatus, setAffiliateStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    affiliateService
      .status()
      .then((res) => setAffiliateStatus(res.data?.data ?? null))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isAuthenticated]);

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-8">
      <Breadcrumb
        items={[
          { label: t("common.home"), href: "/" },
          { label: t("footer.becomeAffiliate") },
        ]}
      />

      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 p-8 md:p-12 text-white text-center">
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-white/5 rounded-full blur-2xl" />
        <div className="relative z-10 max-w-2xl mx-auto space-y-4">
          <Gift className="h-12 w-12 mx-auto text-white/90" />
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold">
            Earn Money Sharing What You Love
          </h1>
          <p className="text-white/90 text-sm sm:text-base">
            Join our affiliate program and earn commissions by recommending
            products to your audience. No inventory, no risk.
          </p>
        </div>
      </div>

      {/* Application Section */}
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : isAuthenticated ? (
        affiliateStatus ? (
          <AffiliateStatusCard affiliate={affiliateStatus} />
        ) : (
          <AffiliateApplicationForm onSuccess={() => {
            affiliateService.status().then((res) => setAffiliateStatus(res.data?.data ?? null));
          }} />
        )
      ) : (
        <div className="bg-white border border-border/50 rounded-xl p-6 text-center space-y-3">
          <h2 className="text-lg font-bold text-text">Join the Affiliate Program</h2>
          <p className="text-sm text-text-secondary">Sign in or create an account to apply.</p>
          <div className="flex justify-center gap-3">
            <Link
              to="/login?redirect=/affiliate"
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary-dark transition-colors"
            >
              Sign In <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/register"
              className="inline-flex items-center gap-2 px-6 py-2.5 border border-primary text-primary rounded-lg text-sm font-semibold hover:bg-primary/5 transition-colors"
            >
              Create Account
            </Link>
          </div>
        </div>
      )}

      {/* How it works */}
      <div>
        <h2 className="text-lg font-bold text-text text-center mb-6">
          How It Works
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {howItWorks.map((s, i) => (
            <div
              key={i}
              className="bg-white border border-border/50 rounded-xl p-5 text-center space-y-2 hover:shadow-md transition-shadow"
            >
              <div className="w-10 h-10 mx-auto rounded-lg bg-primary/10 flex items-center justify-center">
                <s.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-sm font-semibold text-text">{s.title}</h3>
              <p className="text-xs text-text-secondary">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Commission tiers */}
      <div>
        <h2 className="text-lg font-bold text-text text-center mb-6">
          Commission Tiers
        </h2>
        <div className="grid sm:grid-cols-3 gap-4">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={`rounded-xl p-5 space-y-3 border transition-shadow hover:shadow-md ${
                tier.highlight
                  ? "bg-primary/5 border-primary/40 ring-1 ring-primary/20"
                  : "bg-white border-border/50"
              }`}
            >
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-text">
                  {tier.commission}
                </span>
                <span className="text-xs text-text-secondary">commission</span>
              </div>
              <h3 className="text-sm font-bold text-text">{tier.name}</h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                {tier.desc}
              </p>
              <ul className="space-y-1.5">
                {tier.features.map((f) => (
                  <li
                    key={f}
                    className="flex items-center gap-1.5 text-xs text-text-secondary"
                  >
                    <CheckCircle className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { icon: TrendingUp, value: "EGP 95M+", label: "Paid to Affiliates" },
          { icon: Share2, value: "15,000+", label: "Active Affiliates" },
          { icon: DollarSign, value: "EGP 16,000", label: "Avg Monthly Earnings" },
        ].map((s, i) => (
          <div
            key={i}
            className="bg-white border border-border/50 rounded-xl p-5 text-center space-y-1 hover:shadow-md transition-shadow"
          >
            <s.icon className="h-6 w-6 mx-auto text-primary" />
            <p className="text-lg font-bold text-text">{s.value}</p>
            <p className="text-xs text-text-secondary">{s.label}</p>
          </div>
        ))}
      </div>

      {/* CTA */}
      {!isAuthenticated && (
        <div className="bg-secondary-dark rounded-xl p-6 md:p-8 text-center text-white space-y-3">
          <h2 className="text-lg font-bold">Start Earning Today</h2>
          <p className="text-sm text-gray-300 max-w-md mx-auto">
            Sign up is free and takes less than 2 minutes. Start sharing and
            earning immediately.
          </p>
          <Link
            to="/register"
            className="inline-block mt-2 px-6 py-2.5 bg-primary hover:bg-primary-dark rounded-lg text-sm font-semibold transition-colors"
          >
            Join the Affiliate Program
          </Link>
        </div>
      )}
    </div>
  );
}
