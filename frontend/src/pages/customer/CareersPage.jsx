import Breadcrumb from "@/components/ui/Breadcrumb";
import { useTranslation } from "@/hooks/useTranslation";
import {
  Briefcase,
  Code,
  Palette,
  Headphones,
  TrendingUp,
  MapPin,
  Coffee,
  Heart,
  Laptop,
  Rocket,
} from "lucide-react";

const perks = [
  { icon: Laptop, label: "Remote-First" },
  { icon: Coffee, label: "Free Lunch & Snacks" },
  { icon: Heart, label: "Health Insurance" },
  { icon: Rocket, label: "Growth Budget" },
];

const openings = [
  {
    title: "Senior Full-Stack Engineer",
    department: "Engineering",
    location: "Remote",
    type: "Full-Time",
    icon: Code,
    color: "from-blue-500 to-indigo-600",
  },
  {
    title: "Product Designer (UI/UX)",
    department: "Design",
    location: "New York, NY",
    type: "Full-Time",
    icon: Palette,
    color: "from-pink-500 to-rose-600",
  },
  {
    title: "Customer Support Lead",
    department: "Support",
    location: "Remote",
    type: "Full-Time",
    icon: Headphones,
    color: "from-emerald-500 to-teal-600",
  },
  {
    title: "Growth Marketing Manager",
    department: "Marketing",
    location: "San Francisco, CA",
    type: "Full-Time",
    icon: TrendingUp,
    color: "from-amber-500 to-orange-600",
  },
  {
    title: "Data Analyst",
    department: "Engineering",
    location: "Remote",
    type: "Full-Time",
    icon: Code,
    color: "from-violet-500 to-purple-600",
  },
  {
    title: "Seller Success Manager",
    department: "Operations",
    location: "London, UK",
    type: "Full-Time",
    icon: Briefcase,
    color: "from-cyan-500 to-blue-600",
  },
];

export default function CareersPage() {
  const { t } = useTranslation();

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-8">
      <Breadcrumb
        items={[
          { label: t("common.home"), href: "/" },
          { label: t("footer.careers") },
        ]}
      />

      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-700 p-8 md:p-12 text-white text-center">
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-56 h-56 bg-white/5 rounded-full blur-2xl" />
        <div className="relative z-10 max-w-2xl mx-auto space-y-3">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold">
            Build the Future of Commerce
          </h1>
          <p className="text-white/85 text-sm sm:text-base">
            Join a passionate team that's making online shopping fairer, faster,
            and more accessible for millions of people worldwide.
          </p>
        </div>
      </div>

      {/* Perks */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {perks.map((p) => (
          <div
            key={p.label}
            className="bg-white border border-border/50 rounded-xl p-4 flex flex-col items-center gap-2 text-center hover:shadow-md transition-shadow"
          >
            <p.icon className="h-6 w-6 text-primary" />
            <span className="text-xs font-medium text-text">{p.label}</span>
          </div>
        ))}
      </div>

      {/* Why work here */}
      <div className="bg-white border border-border/50 rounded-xl p-6 md:p-8 space-y-4">
        <h2 className="text-lg font-bold text-text">Why Mini Amazon?</h2>
        <div className="grid sm:grid-cols-2 gap-4 text-sm text-text-secondary leading-relaxed">
          <p>
            We're not just building an e-commerce platform — we're creating
            economic opportunity for sellers and delivering exceptional value to
            buyers. Every team member directly impacts the lives of millions.
          </p>
          <p>
            We value autonomy, creativity, and results over titles. Whether you
            work from our offices or from your living room, you'll be part of a
            culture that celebrates bold ideas and ships fast.
          </p>
        </div>
      </div>

      {/* Open Positions */}
      <div>
        <h2 className="text-lg font-bold text-text mb-4">Open Positions</h2>
        <div className="space-y-3">
          {openings.map((job, i) => (
            <div
              key={i}
              className="bg-white border border-border/50 rounded-xl p-4 md:p-5 flex items-center gap-4 hover:shadow-md hover:border-primary/30 transition-all group cursor-pointer"
            >
              <div
                className={`shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br ${job.color} flex items-center justify-center`}
              >
                <job.icon className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-text group-hover:text-primary transition-colors">
                  {job.title}
                </h3>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-secondary mt-0.5">
                  <span>{job.department}</span>
                  <span className="flex items-center gap-0.5">
                    <MapPin className="h-3 w-3" />
                    {job.location}
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[11px] font-medium">
                    {job.type}
                  </span>
                </div>
              </div>
              <span className="text-xs text-primary font-medium hidden sm:block group-hover:underline">
                Apply →
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="text-center bg-gray-50 rounded-xl p-6 space-y-2">
        <p className="text-sm text-text-secondary">
          Don't see a role that fits? We're always looking for talented people.
        </p>
        <a
          href="mailto:careers@miniamazon.com"
          className="inline-block px-5 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg text-sm font-semibold transition-colors"
        >
          Send Your Resume
        </a>
      </div>
    </div>
  );
}
