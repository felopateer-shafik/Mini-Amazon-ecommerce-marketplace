import { useState } from "react";
import Breadcrumb from "@/components/ui/Breadcrumb";
import { useTranslation } from "@/hooks/useTranslation";
import { useSEO } from "@/hooks/useSEO";
import { Calendar, User, ArrowRight, Tag, Clock } from "lucide-react";

const categories = [
  "All",
  "News",
  "Tips & Guides",
  "Seller Stories",
  "Updates",
];

const articles = [
  {
    id: 1,
    title: "10 Tips to Boost Your Online Store Sales in 2026",
    excerpt:
      "Whether you're new or experienced, these proven strategies will help you maximize revenue and grow your customer base on our marketplace.",
    category: "Tips & Guides",
    author: "Mini Amazon Team",
    date: "Feb 28, 2026",
    readTime: "5 min read",
    image: "from-blue-500 to-indigo-600",
    content:
      "Start by optimizing product titles for search intent, then improve first-image quality and speed up checkout friction points. Sellers who combine fast response time, clear shipping windows, and strong review follow-up consistently lift conversion rates within 30 days.",
  },
  {
    id: 2,
    title: "Introducing Smart Inventory Alerts",
    excerpt:
      "Never run out of stock again. Our new smart alerts notify you when inventory drops below your threshold, keeping your store running smoothly.",
    category: "Updates",
    author: "Product Team",
    date: "Feb 20, 2026",
    readTime: "3 min read",
    image: "from-emerald-500 to-teal-600",
    content:
      "Smart Inventory Alerts monitor sell-through velocity and account for open carts plus pending orders. You can set separate thresholds for fast-moving SKUs and seasonal products, reducing stockouts and avoiding oversupply.",
  },
  {
    id: 3,
    title: "How Sarah Built a Six-Figure Business from Her Kitchen",
    excerpt:
      "Read how one seller transformed her homemade candle hobby into a thriving online business using Mini Amazon's seller tools.",
    category: "Seller Stories",
    author: "Community",
    date: "Feb 15, 2026",
    readTime: "7 min read",
    image: "from-amber-500 to-orange-600",
    content:
      "Sarah validated demand using three candle bundles before expanding her catalog. By improving listing photography and using bundle discounts, she increased repeat purchase rate and scaled from hobby volume to full-time revenue.",
  },
  {
    id: 4,
    title: "Spring Sale 2026: What Buyers Are Looking For",
    excerpt:
      "Our data team analyzed millions of searches to reveal the top trending categories and products this spring season.",
    category: "News",
    author: "Analytics Team",
    date: "Feb 10, 2026",
    readTime: "4 min read",
    image: "from-pink-500 to-rose-600",
    content:
      "Spring demand is concentrated in lightweight apparel, home refresh products, and outdoor categories. Listings that include sizing clarity, delivery ETA, and rich review snippets are outperforming category averages.",
  },
  {
    id: 5,
    title: "A Beginner's Guide to Product Photography",
    excerpt:
      "Great photos sell products. Learn smartphone photography techniques that make your listings stand out without expensive equipment.",
    category: "Tips & Guides",
    author: "Mini Amazon Team",
    date: "Feb 5, 2026",
    readTime: "6 min read",
    image: "from-violet-500 to-purple-600",
    content:
      "Use window light, a neutral background, and consistent framing across variants. Shoot one hero angle, one scale-reference angle, and one detail close-up per product to increase trust and reduce return rates.",
  },
  {
    id: 6,
    title: "New Affiliate Program: Earn by Sharing",
    excerpt:
      "Our revamped affiliate program offers higher commissions, real-time tracking, and instant payouts. Start earning today.",
    category: "Updates",
    author: "Partnerships Team",
    date: "Jan 28, 2026",
    readTime: "3 min read",
    image: "from-cyan-500 to-blue-600",
    content:
      "The new affiliate dashboard adds conversion attribution windows, deep-link product tracking, and clearer payout breakdowns. New partners can launch links in minutes and track clicks-to-orders in near real time.",
  },
];

export default function BlogPage() {
  const { t } = useTranslation();
  useSEO({
    title: "Blog - Mini Amazon",
    description:
      "Read the latest news, seller stories, shopping tips, and marketplace updates from Mini Amazon.",
    canonical: "/blog",
  });
  const [active, setActive] = useState("All");
  const [expandedArticleId, setExpandedArticleId] = useState(null);

  const filtered =
    active === "All" ? articles : articles.filter((a) => a.category === active);

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-8">
      <Breadcrumb
        items={[
          { label: t("common.home"), href: "/" },
          { label: t("footer.blog") },
        ]}
      />

      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-text">
          The Mini Amazon Blog
        </h1>
        <p className="text-sm text-text-secondary max-w-lg mx-auto">
          Tips, stories, product updates, and marketplace insights to help you
          shop smarter and sell better.
        </p>
      </div>

      {/* Category filter */}
      <div className="flex flex-wrap justify-center gap-2">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActive(cat)}
            className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${
              active === cat
                ? "bg-primary text-white"
                : "bg-white border border-border/50 text-text-secondary hover:border-primary/40 hover:text-primary"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Featured (first article) */}
      {filtered.length > 0 && (
        <div className="bg-white border border-border/50 rounded-xl overflow-hidden md:flex hover:shadow-lg transition-shadow">
          <div
            className={`md:w-2/5 h-48 md:h-auto bg-gradient-to-br ${filtered[0].image} flex items-center justify-center`}
          >
            <span className="text-white/60 text-6xl font-black select-none">
              MA
            </span>
          </div>
          <div className="p-6 md:p-8 flex-1 flex flex-col justify-center space-y-3">
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full w-fit">
              <Tag className="h-3 w-3" />
              {filtered[0].category}
            </span>
            <h2 className="text-lg sm:text-xl font-bold text-text">
              {filtered[0].title}
            </h2>
            <p className="text-sm text-text-secondary leading-relaxed">
              {filtered[0].excerpt}
            </p>
            <div className="flex items-center gap-4 text-xs text-text-light pt-1">
              <span className="flex items-center gap-1">
                <User className="h-3.5 w-3.5" />
                {filtered[0].author}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {filtered[0].date}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {filtered[0].readTime}
              </span>
            </div>
            <button
              type="button"
              onClick={() =>
                setExpandedArticleId(
                  expandedArticleId === filtered[0].id ? null : filtered[0].id,
                )
              }
              className="text-xs font-medium text-primary hover:underline w-fit"
            >
              {expandedArticleId === filtered[0].id ? "Show less" : "Read more"}
            </button>
            {expandedArticleId === filtered[0].id && (
              <p className="text-sm text-text-secondary leading-relaxed">
                {filtered[0].content}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.slice(1).map((article) => (
          <div
            key={article.id}
            className="bg-white border border-border/50 rounded-xl overflow-hidden hover:shadow-md transition-shadow group"
          >
            <div
              className={`h-36 bg-gradient-to-br ${article.image} flex items-center justify-center`}
            >
              <span className="text-white/40 text-4xl font-black select-none">
                MA
              </span>
            </div>
            <div className="p-4 space-y-2">
              <span className="text-[11px] font-medium text-primary">
                {article.category}
              </span>
              <h3 className="text-sm font-semibold text-text leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                {article.title}
              </h3>
              <p className="text-xs text-text-secondary line-clamp-2">
                {article.excerpt}
              </p>
              <div className="flex items-center justify-between pt-2 text-[11px] text-text-light">
                <span>{article.date}</span>
                <button
                  type="button"
                  onClick={() =>
                    setExpandedArticleId(
                      expandedArticleId === article.id ? null : article.id,
                    )
                  }
                  className="flex items-center gap-0.5 text-primary font-medium group-hover:gap-1.5 transition-all"
                >
                  {expandedArticleId === article.id ? "Show less" : "Read more"} <ArrowRight className="h-3 w-3" />
                </button>
              </div>
              {expandedArticleId === article.id && (
                <p className="text-xs text-text-secondary leading-relaxed border-t border-border/40 pt-2">
                  {article.content}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-sm text-text-secondary">
          No articles in this category yet. Check back soon!
        </div>
      )}
    </div>
  );
}
