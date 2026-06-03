import { useEffect, useState } from "react";
import { Save, Plus, Trash2, Eye } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import toast from "react-hot-toast";
import { useTranslation } from "@/hooks/useTranslation";
import { useAdminSettings, useAdminUpdateSettings } from "@/hooks/useApi";
import { usePermission } from "@/hooks/usePermission";

const DEFAULT_BANNERS = [
  {
    title: "Summer Sale",
    subtitle: "Up to 50% off",
    image: "https://placehold.co/1200x400/FF9900/fff?text=Summer+Sale",
    link: "/sale",
    position: 1,
    active: true,
  },
];

const DEFAULT_SECTIONS = [
  { name: "Hero Banner", type: "banner", enabled: true },
  { name: "Featured Categories", type: "categories", enabled: true },
  { name: "Trending Products", type: "products", enabled: true },
  { name: "Newsletter", type: "newsletter", enabled: true },
];

const DEFAULT_ANNOUNCEMENT = {
  enabled: true,
  text: "Free shipping on orders over EGP 500",
  background_color: "#FF9900",
  text_color: "#FFFFFF",
  link: "/shipping-policy",
};

function normalizeBanners(input) {
  if (!Array.isArray(input)) return DEFAULT_BANNERS;

  const normalized = input
    .map((banner, index) => ({
      title: String(banner?.title ?? "").trim(),
      subtitle: String(banner?.subtitle ?? ""),
      image: String(banner?.image ?? "").trim(),
      link: String(banner?.link ?? "").trim(),
      position: Number(banner?.position ?? index + 1),
      active: !!banner?.active,
    }))
    .filter((banner) => banner.title.length > 0);

  return normalized.length > 0 ? normalized : DEFAULT_BANNERS;
}

function normalizeSections(input) {
  if (!Array.isArray(input)) return DEFAULT_SECTIONS;

  const normalized = input
    .map((section, index) => {
      const fallback = DEFAULT_SECTIONS[index] ?? DEFAULT_SECTIONS[0];
      return {
        name: String(section?.name ?? fallback.name).trim(),
        type: String(section?.type ?? fallback.type).trim(),
        enabled: !!section?.enabled,
      };
    })
    .filter((section) => section.name && section.type);

  return normalized.length > 0 ? normalized : DEFAULT_SECTIONS;
}

function normalizeAnnouncement(input) {
  return {
    enabled: !!input?.enabled,
    text: String(input?.text ?? DEFAULT_ANNOUNCEMENT.text),
    background_color:
      String(
        input?.background_color ?? DEFAULT_ANNOUNCEMENT.background_color,
      ) || DEFAULT_ANNOUNCEMENT.background_color,
    text_color:
      String(input?.text_color ?? DEFAULT_ANNOUNCEMENT.text_color) ||
      DEFAULT_ANNOUNCEMENT.text_color,
    link: String(input?.link ?? DEFAULT_ANNOUNCEMENT.link),
  };
}

export default function StoreFrontPage() {
  const { t } = useTranslation();
  const { hasPerm } = usePermission();
  const canEdit = hasPerm("edit-storefront");
  const { data: settingsRes, isLoading } = useAdminSettings();
  const updateSettings = useAdminUpdateSettings();

  const settings = settingsRes?.data ?? settingsRes ?? {};

  const [activeTab, setActiveTab] = useState("banners");
  const [banners, setBanners] = useState(DEFAULT_BANNERS);
  const [sections, setSections] = useState(DEFAULT_SECTIONS);
  const [announcement, setAnnouncement] = useState(DEFAULT_ANNOUNCEMENT);
  const sectionTypeLabel = {
    banner: t("admin.banner"),
    categories: t("admin.categories"),
    products: t("common.products"),
    newsletter: t("admin.newsletter"),
  };
  const defaultSectionLabel = {
    banner: t("admin.heroBanner"),
    categories: t("admin.featuredCategories"),
    products: t("admin.trendingProducts"),
    newsletter: t("admin.newsletter"),
  };

  useEffect(() => {
    if (!settings || Object.keys(settings).length === 0) return;
    setBanners(normalizeBanners(settings.storefront_banners));
    setSections(normalizeSections(settings.homepage_sections));
    setAnnouncement(normalizeAnnouncement(settings.announcement_bar));
  }, [settings]);

  const isValidHttpUrl = (value) => {
    if (!value) return true;
    if (value.startsWith("/")) return true; // allow relative paths like /sale
    try {
      const parsed = new URL(value);
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
      return false;
    }
  };

  const addBanner = () => {
    setBanners((prev) => [
      ...prev,
      {
        title: "",
        subtitle: "",
        image: "",
        link: "",
        position: prev.length + 1,
        active: true,
      },
    ]);
  };

  const updateBanner = (index, key, value) => {
    setBanners((prev) =>
      prev.map((banner, i) =>
        i === index ? { ...banner, [key]: value } : banner,
      ),
    );
  };

  const removeBanner = (index) => {
    setBanners((prev) => prev.filter((_, i) => i !== index));
  };

  const toggleSection = (index) => {
    setSections((prev) =>
      prev.map((section, i) =>
        i === index ? { ...section, enabled: !section.enabled } : section,
      ),
    );
  };

  const handleSave = async () => {
    const invalidBannerImage = banners.find(
      (banner) => !isValidHttpUrl(banner.image),
    );
    if (invalidBannerImage) {
      toast.error(t("admin.mediaInvalidUrl"));
      return;
    }

    const invalidBannerLink = banners.find(
      (banner) => !isValidHttpUrl(banner.link),
    );
    if (invalidBannerLink) {
      toast.error(t("admin.mediaInvalidUrl"));
      return;
    }

    if (!isValidHttpUrl(announcement.link)) {
      toast.error(t("admin.mediaInvalidUrl"));
      return;
    }

    try {
      const normalizedBanners = normalizeBanners(banners);
      const normalizedSections = normalizeSections(sections);
      const normalizedAnnouncement = normalizeAnnouncement(announcement);

      await updateSettings.mutateAsync({
        storefront_banners: normalizedBanners.map((b, index) => ({
          title: b.title.trim(),
          subtitle: b.subtitle ?? "",
          image: b.image ?? "",
          link: b.link ?? "",
          position: index + 1,
          active: !!b.active,
        })),
        homepage_sections: normalizedSections.map((s) => ({
          name: s.name,
          type: s.type,
          enabled: !!s.enabled,
        })),
        announcement_bar: normalizedAnnouncement,
      });
      toast.success(t("admin.storefrontSettingsSaved"));
    } catch (err) {
      toast.error(
        err?.response?.data?.message || t("admin.failedSaveStorefrontSettings"),
      );
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-text">
            {t("admin.storeFront")}
          </h1>
          <p className="text-sm text-text-secondary">
            {t("admin.customizeCustomerFacingStorefront")}
          </p>
        </div>
        <Button
          variant="outline"
          icon={Eye}
          onClick={() => window.open("/", "_blank", "noopener,noreferrer")}
        >
          {t("admin.preview")}
        </Button>
      </div>

      <div className="flex gap-2 border-b border-border/50">
        {[
          { id: "banners", label: t("admin.banners") },
          { id: "homepage", label: t("admin.homepageLayout") },
          { id: "announcements", label: t("admin.announcements") },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition ${activeTab === tab.id ? "border-primary text-primary" : "border-transparent text-text-secondary"}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "banners" && (
        <div className="bg-white rounded-xl border border-border/50 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-text">
              {t("admin.heroBanners")}
            </h2>
            {canEdit && (
              <Button
                size="sm"
                variant="outline"
                icon={Plus}
                onClick={addBanner}
              >
                {t("admin.addBanner")}
              </Button>
            )}
          </div>

          <div className="space-y-3">
            {banners.map((banner, index) => (
              <div
                key={`banner-${index}`}
                className="grid grid-cols-1 md:grid-cols-12 gap-3 border border-border/50 rounded-lg p-3"
              >
                <div className="md:col-span-3">
                  <Input
                    label={t("admin.title")}
                    value={banner.title}
                    onChange={(e) =>
                      updateBanner(index, "title", e.target.value)
                    }
                  />
                </div>
                <div className="md:col-span-3">
                  <Input
                    label={t("admin.subtitle")}
                    value={banner.subtitle ?? ""}
                    onChange={(e) =>
                      updateBanner(index, "subtitle", e.target.value)
                    }
                  />
                </div>
                <div className="md:col-span-3">
                  <Input
                    label={t("admin.imageUrl")}
                    value={banner.image ?? ""}
                    onChange={(e) =>
                      updateBanner(index, "image", e.target.value)
                    }
                  />
                  {banner.image ? (
                    <img
                      src={banner.image}
                      alt={banner.title || t("admin.banner")}
                      loading="lazy"
                      className="mt-2 h-16 w-full object-cover rounded border border-border/60"
                    />
                  ) : null}
                </div>
                <div className="md:col-span-2">
                  <Input
                    label={t("admin.link")}
                    value={banner.link ?? ""}
                    onChange={(e) =>
                      updateBanner(index, "link", e.target.value)
                    }
                  />
                </div>
                <div className="md:col-span-1 flex items-end justify-between pb-1">
                  <button
                    type="button"
                    className={`w-11 h-6 rounded-full relative transition ${banner.active ? "bg-primary" : "bg-gray-300"}`}
                    onClick={() =>
                      updateBanner(index, "active", !banner.active)
                    }
                    aria-label={t("common.enabled")}
                  >
                    <span
                      className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition ${banner.active ? "right-0.5" : "left-0.5"}`}
                    />
                  </button>
                  <button
                    type="button"
                    className="p-2 hover:bg-gray-100 rounded"
                    onClick={() => removeBanner(index)}
                    aria-label={t("common.delete")}
                  >
                    <Trash2 className="h-4 w-4 text-text-secondary hover:text-danger" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "homepage" && (
        <div className="bg-white rounded-xl border border-border/50 p-6 space-y-3">
          <h2 className="font-semibold text-text">
            {t("admin.homepageSections")}
          </h2>
          {sections.map((section, index) => (
            <div
              key={`${section.name}-${index}`}
              className="flex items-center justify-between border border-border/50 rounded-lg p-3"
            >
              <div>
                <p className="text-sm font-medium text-text">
                  {defaultSectionLabel[section.type] || section.name}
                </p>
                <p className="text-xs text-text-secondary">
                  {sectionTypeLabel[section.type] || section.type}
                </p>
              </div>
              <button
                type="button"
                className={`w-11 h-6 rounded-full relative transition ${section.enabled ? "bg-primary" : "bg-gray-300"}`}
                onClick={() => toggleSection(index)}
                aria-label={t("common.enabled")}
              >
                <span
                  className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition ${section.enabled ? "right-0.5" : "left-0.5"}`}
                />
              </button>
            </div>
          ))}
        </div>
      )}

      {activeTab === "announcements" && (
        <div className="bg-white rounded-xl border border-border/50 p-6 space-y-4">
          <h2 className="font-semibold text-text">
            {t("admin.announcementBar")}
          </h2>
          <Input
            label={t("common.text")}
            value={announcement.text ?? ""}
            onChange={(e) =>
              setAnnouncement((prev) => ({ ...prev, text: e.target.value }))
            }
          />
          <Input
            label={t("admin.link")}
            value={announcement.link ?? ""}
            onChange={(e) =>
              setAnnouncement((prev) => ({ ...prev, link: e.target.value }))
            }
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label={t("admin.backgroundColor")}
              value={announcement.background_color ?? "#FF9900"}
              onChange={(e) =>
                setAnnouncement((prev) => ({
                  ...prev,
                  background_color: e.target.value,
                }))
              }
            />
            <Input
              label={t("admin.textColor")}
              value={announcement.text_color ?? "#FFFFFF"}
              onChange={(e) =>
                setAnnouncement((prev) => ({
                  ...prev,
                  text_color: e.target.value,
                }))
              }
            />
          </div>
          <div className="flex items-center justify-between border border-border/50 rounded-lg p-3">
            <p className="text-sm font-medium text-text">
              {t("common.enabled")}
            </p>
            <button
              type="button"
              className={`w-11 h-6 rounded-full relative transition ${announcement.enabled ? "bg-primary" : "bg-gray-300"}`}
              onClick={() =>
                setAnnouncement((prev) => ({ ...prev, enabled: !prev.enabled }))
              }
              aria-label={t("common.enabled")}
            >
              <span
                className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition ${announcement.enabled ? "right-0.5" : "left-0.5"}`}
              />
            </button>
          </div>
        </div>
      )}

      <div className="flex justify-end">
        {canEdit && (
          <Button
            icon={Save}
            onClick={handleSave}
            loading={updateSettings.isPending || isLoading}
          >
            {t("admin.saveStorefrontSettings")}
          </Button>
        )}
      </div>
    </div>
  );
}
