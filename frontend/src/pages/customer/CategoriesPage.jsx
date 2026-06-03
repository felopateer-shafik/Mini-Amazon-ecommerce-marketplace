import { Link } from "react-router-dom";
import { Grid3X3, Loader2 } from "lucide-react";
import Breadcrumb from "@/components/ui/Breadcrumb";
import { useCategories } from "@/hooks/useApi";
import { useTranslation } from "@/hooks/useTranslation";
import { useSEO } from "@/hooks/useSEO";

export default function CategoriesPage() {
  const { t } = useTranslation();
  useSEO({
    title: "All Categories - Mini Amazon",
    description:
      "Browse all product categories. Find electronics, fashion, home & garden, beauty, sports, and much more.",
    canonical: "/categories",
  });
  const { data: categoriesResponse, isLoading, isError } = useCategories();
  const categories = categoriesResponse?.data ?? categoriesResponse ?? [];

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <p className="text-danger text-sm">{t("categories.loadError")}</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      <Breadcrumb
        items={[
          { label: t("common.home"), href: "/" },
          { label: t("categories.title") },
        ]}
      />

      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-text flex items-center gap-2">
          <Grid3X3 className="h-6 w-6 text-primary" />
          {t("categories.title")}
        </h1>
        <p className="text-sm text-text-secondary mt-1">
          {t("categories.subtitle")}
        </p>
      </div>

      {categories.length === 0 ? (
        <div className="bg-white border border-border/50 rounded-xl p-8 text-center text-text-secondary">
          {t("categories.noCategories")}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {categories.map((category) => (
            <Link
              key={category.id}
              to={`/category/${category.slug}`}
              className="bg-white border border-border/50 rounded-xl p-4 hover:border-primary hover:shadow-sm transition"
            >
              <div className="aspect-[4/3] rounded-lg bg-gray-50 overflow-hidden mb-3">
                <img
                  src={
                    category.image ||
                    `https://placehold.co/400x300/f5f5f5/555?text=${encodeURIComponent(category.name || "Category")}`
                  }
                  alt={category.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
              <h3 className="font-semibold text-text text-sm">
                {category.name}
              </h3>
              <p className="text-xs text-text-secondary mt-1">
                {t("categories.productCount", {
                  count: category.products_count ?? 0,
                })}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
