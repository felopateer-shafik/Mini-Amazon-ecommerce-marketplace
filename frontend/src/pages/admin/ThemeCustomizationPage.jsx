import { useEffect, useState } from "react";
import { Palette, Eye, RotateCcw, Save, Check } from "lucide-react";
import Button from "@/components/ui/Button";
import toast from "react-hot-toast";
import { useTranslation } from "@/hooks/useTranslation";
import {
  useThemeStore,
  PRESET_THEMES,
  DEFAULT_THEME,
} from "@/store/themeStore";
import { useAdminSettings, useAdminUpdateSettings } from "@/hooks/useApi";

const colorGroups = [
  {
    titleKey: "admin.brandColors",
    colors: [
      { key: "primary", labelKey: "admin.primary" },
      { key: "secondary", labelKey: "admin.secondary" },
      { key: "accent", labelKey: "admin.accentLinks" },
    ],
  },
  {
    titleKey: "admin.statusColors",
    colors: [
      { key: "success", labelKey: "admin.success" },
      { key: "warning", labelKey: "common.warning" },
      { key: "danger", labelKey: "admin.danger" },
      { key: "info", labelKey: "admin.info" },
    ],
  },
  {
    titleKey: "admin.textColors",
    colors: [
      { key: "text", labelKey: "admin.primaryText" },
      { key: "textSecondary", labelKey: "admin.secondaryText" },
      { key: "textLight", labelKey: "admin.lightText" },
    ],
  },
  {
    titleKey: "admin.backgroundSurface",
    colors: [
      { key: "surface", labelKey: "admin.cardSurface" },
      { key: "surfaceAlt", labelKey: "admin.pageBackground" },
      { key: "border", labelKey: "admin.border" },
    ],
  },
];

const PRESET_LABELS = {
  amazon: "Amazon",
  midnight: "Midnight",
  emerald: "Emerald",
  rose: "Rose",
  ocean: "Ocean",
  sunset: "Sunset",
  ivory: "Ivory & Taupe",
};

export default function ThemeCustomizationPage() {
  const { t } = useTranslation();
  const { colors, setColor, applyPreset, resetTheme, setTheme } =
    useThemeStore();
  const { data: settingsRes } = useAdminSettings();
  const updateSettings = useAdminUpdateSettings();
  const [activePreset, setActivePreset] = useState(null);
  const [showPreview, setShowPreview] = useState(true);

  const settings = settingsRes?.data ?? settingsRes ?? {};
  const presetEntries = Object.entries(PRESET_THEMES);

  useEffect(() => {
    if (
      settings?.theme_colors &&
      typeof settings.theme_colors === "object" &&
      !Array.isArray(settings.theme_colors) &&
      Object.keys(settings.theme_colors).length > 0
    ) {
      setTheme(settings.theme_colors);
    }
  }, [settingsRes]);

  const handlePreset = (presetKey) => {
    applyPreset(presetKey);
    setActivePreset(presetKey);
    toast.success(
      t("admin.appliedThemePreset", {
        name: PRESET_LABELS[presetKey] || presetKey,
      }),
    );
  };

  const handleColorChange = (key, value) => {
    setColor(key, value);
    setActivePreset(null);
  };

  const handleReset = () => {
    if (!window.confirm(t("admin.themeResetConfirm"))) return;
    resetTheme();
    setActivePreset(null);
    toast.success(t("admin.themeResetToDefault"));
  };

  const handleSave = async () => {
    const invalidColors = Object.entries(colors).filter(
      ([, v]) => v && !/^#[0-9A-Fa-f]{6}$/.test(v),
    );
    if (invalidColors.length > 0) {
      toast.error(
        t("admin.invalidHexColors", {
          keys: invalidColors.map(([k]) => k).join(", "),
        }),
      );
      return;
    }
    try {
      await updateSettings.mutateAsync({ theme_colors: colors });
      toast.success(t("admin.themeSaved"));
    } catch {
      toast.error(t("admin.failedSaveTheme"));
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-text flex items-center gap-2">
            <Palette className="h-6 w-6 text-primary" />
            {t("admin.themeCustomization")}
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            {t("admin.customizeWebsiteColorsAppearance")}
          </p>
        </div>
        <div className="flex gap-2 grow-1 justify-end">
          <Button variant="outline" icon={RotateCcw} onClick={handleReset}>
            {t("admin.reset")}
          </Button>
          <Button
            variant="outline"
            icon={Eye}
            onClick={() => setShowPreview(!showPreview)}
          >
            {showPreview ? t("admin.hidePreview") : t("admin.showPreview")}
          </Button>
          <Button
            icon={Save}
            onClick={handleSave}
            loading={updateSettings.isPending}
          >
            {t("admin.saveTheme")}
          </Button>
        </div>
      </div>

      {/* Preset Themes */}
      <div className="bg-white rounded-xl border border-border/50 p-6">
        <h2 className="text-lg font-semibold text-text mb-4">
          {t("admin.presetThemes")}
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-4">
          {presetEntries.map(([key, preset]) => (
            <button
              key={key}
              onClick={() => handlePreset(key)}
              className={`relative group rounded-xl border-2 transition-all p-4 text-center ${
                activePreset === key
                  ? "border-primary shadow-lg scale-105"
                  : "border-border/50 hover:border-primary/50 hover:shadow-md"
              }`}
            >
              {activePreset === key && (
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                  <Check className="h-3.5 w-3.5 text-white" />
                </div>
              )}
              <div className="flex justify-center gap-1 mb-3">
                {[preset.primary, preset.secondary, preset.accent].map(
                  (c, i) => (
                    <div
                      key={i}
                      className="w-6 h-6 rounded-full border border-white shadow-sm"
                      style={{ backgroundColor: c }}
                    />
                  ),
                )}
              </div>
              <p className="text-sm font-medium text-text">
                {PRESET_LABELS[key] || key}
              </p>
            </button>
          ))}
        </div>
      </div>

      <div
        className={`grid ${showPreview ? "grid-cols-1 lg:grid-cols-3" : "grid-cols-1"} gap-6`}
      >
        {/* Color Editor */}
        <div className={showPreview ? "lg:col-span-2" : ""}>
          <div className="space-y-4 sm:space-y-6">
            {colorGroups.map((group) => (
              <div
                key={group.titleKey}
                className="bg-white rounded-xl border border-border/50 p-6"
              >
                <h3 className="text-base font-semibold text-text mb-4">
                  {t(group.titleKey)}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {group.colors.map((color) => (
                    <div key={color.key} className="space-y-1.5">
                      <label className="block text-sm font-medium text-text">
                        {t(color.labelKey)}
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          value={
                            colors[color.key] ||
                            DEFAULT_THEME[color.key] ||
                            "#000000"
                          }
                          onChange={(e) =>
                            handleColorChange(color.key, e.target.value)
                          }
                          className="w-10 h-10 border border-border rounded cursor-pointer flex-shrink-0"
                        />
                        <input
                          type="text"
                          value={
                            colors[color.key] || DEFAULT_THEME[color.key] || ""
                          }
                          onChange={(e) =>
                            handleColorChange(color.key, e.target.value)
                          }
                          className="flex-1 px-3 py-2 text-sm border border-border rounded-lg focus:ring-1 focus:ring-primary focus:border-primary outline-none font-mono"
                          placeholder="#000000"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Live Preview Panel */}
        {showPreview && (
          <div className="lg:col-span-1">
            <div className="sticky top-4 space-y-4">
              <div className="bg-white rounded-xl border border-border/50 overflow-hidden">
                <div className="px-4 py-3 border-b border-border/30">
                  <h3 className="text-sm font-semibold text-text">
                    {t("admin.livePreview")}
                  </h3>
                </div>
                {/* Mini header preview */}
                <div
                  className="px-3 py-2 flex items-center gap-2"
                  style={{
                    backgroundColor:
                      colors.secondary || DEFAULT_THEME.secondary,
                  }}
                >
                  <div
                    className="w-6 h-4 rounded"
                    style={{
                      backgroundColor: colors.primary || DEFAULT_THEME.primary,
                    }}
                  />
                  <div className="flex-1 h-3 rounded-full bg-white/20" />
                  <div className="flex gap-1">
                    <div className="w-4 h-4 rounded-full bg-white/30" />
                    <div className="w-4 h-4 rounded-full bg-white/30" />
                  </div>
                </div>

                {/* Mini body preview */}
                <div
                  className="p-4 space-y-3"
                  style={{
                    backgroundColor:
                      colors.surfaceAlt || DEFAULT_THEME.surfaceAlt,
                  }}
                >
                  {/* Product card mock */}
                  <div
                    className="rounded-lg border overflow-hidden"
                    style={{
                      borderColor: colors.border || DEFAULT_THEME.border,
                      backgroundColor: colors.surface || DEFAULT_THEME.surface,
                    }}
                  >
                    <div className="h-20 bg-gray-100" />
                    <div className="p-2 space-y-1">
                      <div
                        className="h-2 rounded w-3/4"
                        style={{
                          backgroundColor: colors.text || DEFAULT_THEME.text,
                          opacity: 0.2,
                        }}
                      />
                      <div
                        className="h-2 rounded w-1/2"
                        style={{
                          backgroundColor:
                            colors.textSecondary || DEFAULT_THEME.textSecondary,
                          opacity: 0.2,
                        }}
                      />
                      <div className="flex gap-1 items-center">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <div
                            key={i}
                            className="w-2 h-2 rounded-full"
                            style={{
                              backgroundColor:
                                i <= 4
                                  ? colors.warning || DEFAULT_THEME.warning
                                  : colors.border || DEFAULT_THEME.border,
                            }}
                          />
                        ))}
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        <span
                          className="text-xs font-bold"
                          style={{
                            color: colors.primary || DEFAULT_THEME.primary,
                          }}
                        >
                          EGP 499
                        </span>
                        <span
                          className="text-[9px] line-through"
                          style={{
                            color:
                              colors.textSecondary ||
                              DEFAULT_THEME.textSecondary,
                          }}
                        >
                          EGP 799
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Button previews */}
                  <div className="flex gap-2">
                    <button
                      className="flex-1 px-3 py-1.5 rounded text-xs text-white font-medium"
                      style={{
                        backgroundColor:
                          colors.primary || DEFAULT_THEME.primary,
                      }}
                    >
                      {t("admin.primary")}
                    </button>
                    <button
                      className="flex-1 px-3 py-1.5 rounded text-xs text-white font-medium"
                      style={{
                        backgroundColor:
                          colors.secondary || DEFAULT_THEME.secondary,
                      }}
                    >
                      {t("admin.secondary")}
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <button
                      className="flex-1 px-3 py-1.5 rounded text-xs text-white font-medium"
                      style={{
                        backgroundColor:
                          colors.success || DEFAULT_THEME.success,
                      }}
                    >
                      {t("admin.success")}
                    </button>
                    <button
                      className="flex-1 px-3 py-1.5 rounded text-xs text-white font-medium"
                      style={{
                        backgroundColor: colors.danger || DEFAULT_THEME.danger,
                      }}
                    >
                      {t("admin.danger")}
                    </button>
                    <button
                      className="flex-1 px-3 py-1.5 rounded text-xs text-white font-medium"
                      style={{
                        backgroundColor: colors.accent || DEFAULT_THEME.accent,
                      }}
                    >
                      {t("admin.accent")}
                    </button>
                  </div>

                  {/* Text preview */}
                  <div className="space-y-1">
                    <p
                      className="text-xs font-medium"
                      style={{ color: colors.text || DEFAULT_THEME.text }}
                    >
                      {t("admin.primaryTextSample")}
                    </p>
                    <p
                      className="text-[10px]"
                      style={{
                        color:
                          colors.textSecondary || DEFAULT_THEME.textSecondary,
                      }}
                    >
                      {t("admin.secondaryTextSample")}
                    </p>
                    <p
                      className="text-[10px]"
                      style={{
                        color: colors.textLight || DEFAULT_THEME.textLight,
                      }}
                    >
                      {t("admin.lightTextSample")}
                    </p>
                    <a
                      className="text-[10px] underline"
                      style={{ color: colors.accent || DEFAULT_THEME.accent }}
                    >
                      {t("admin.linkExample")}
                    </a>
                  </div>

                  {/* Status badges */}
                  <div className="flex gap-1 flex-wrap">
                    {[
                      { label: t("admin.success"), key: "success" },
                      { label: t("common.warning"), key: "warning" },
                      { label: t("admin.danger"), key: "danger" },
                      { label: t("admin.info"), key: "info" },
                    ].map((s) => (
                      <span
                        key={s.key}
                        className="px-2 py-0.5 rounded text-[9px] text-white font-medium"
                        style={{
                          backgroundColor:
                            colors[s.key] || DEFAULT_THEME[s.key],
                        }}
                      >
                        {s.label}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Mini footer preview */}
                <div
                  className="px-3 py-2 text-center"
                  style={{
                    backgroundColor:
                      colors.secondaryDark || DEFAULT_THEME.secondaryDark,
                  }}
                >
                  <div className="h-2 rounded w-1/3 mx-auto bg-white/20" />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
