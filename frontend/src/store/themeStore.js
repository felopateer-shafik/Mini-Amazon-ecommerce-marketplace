import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Theme store — Admin Tier 2 (Super Admin) can change site colors.
 * Colors are persisted in localStorage and applied via CSS custom properties
 * on <html> so Tailwind's @theme picks them up.
 */

const DEFAULT_THEME = {
  primary: "#C4784A",
  primaryDark: "#A85E35",
  primaryLight: "#E8D5BB",
  secondary: "#2B1D13",
  secondaryDark: "#1C1008",
  secondaryLight: "#3D2B1F",
  accent: "#A79277",
  success: "#7A9E7E",
  warning: "#f5a623",
  danger: "#C0504A",
  info: "#7A6254",
  surface: "#ffffff",
  surfaceAlt: "#FDFAF6",
  border: "#C8B09A",
  text: "#1C1008",
  textSecondary: "#7A6254",
  textLight: "#A79277",
};

const PRESET_THEMES = {
  amazon: {
    primary: "#ff9900",
    primaryDark: "#e68a00",
    primaryLight: "#ffb84d",
    secondary: "#232f3e",
    secondaryDark: "#131921",
    secondaryLight: "#37475a",
    accent: "#146eb4",
    success: "#067d62",
    warning: "#f5a623",
    danger: "#d13212",
    info: "#007185",
    surface: "#ffffff",
    surfaceAlt: "#f5f5f5",
    border: "#dddddd",
    text: "#0f1111",
    textSecondary: "#565959",
    textLight: "#888888",
  },
  midnight: {
    ...DEFAULT_THEME,
    primary: "#6366f1",
    primaryDark: "#4f46e5",
    primaryLight: "#818cf8",
    secondary: "#1e1b4b",
    secondaryDark: "#0f0a2e",
    secondaryLight: "#312e81",
    accent: "#8b5cf6",
  },
  emerald: {
    ...DEFAULT_THEME,
    primary: "#10b981",
    primaryDark: "#059669",
    primaryLight: "#34d399",
    secondary: "#064e3b",
    secondaryDark: "#022c22",
    secondaryLight: "#065f46",
    accent: "#14b8a6",
  },
  rose: {
    ...DEFAULT_THEME,
    primary: "#f43f5e",
    primaryDark: "#e11d48",
    primaryLight: "#fb7185",
    secondary: "#4c0519",
    secondaryDark: "#2d0310",
    secondaryLight: "#881337",
    accent: "#e11d48",
  },
  ocean: {
    ...DEFAULT_THEME,
    primary: "#0ea5e9",
    primaryDark: "#0284c7",
    primaryLight: "#38bdf8",
    secondary: "#0c4a6e",
    secondaryDark: "#082f49",
    secondaryLight: "#075985",
    accent: "#06b6d4",
  },
  sunset: {
    ...DEFAULT_THEME,
    primary: "#f97316",
    primaryDark: "#ea580c",
    primaryLight: "#fb923c",
    secondary: "#431407",
    secondaryDark: "#27080a",
    secondaryLight: "#7c2d12",
    accent: "#ef4444",
  },
  ivory: {
    primary: "#C4784A",
    primaryDark: "#A85E35",
    primaryLight: "#E8D5BB",
    secondary: "#2B1D13",
    secondaryDark: "#1C1008",
    secondaryLight: "#3D2B1F",
    accent: "#A79277",
    success: "#7A9E7E",
    warning: "#f5a623",
    danger: "#C0504A",
    info: "#7A6254",
    surface: "#ffffff",
    surfaceAlt: "#FDFAF6",
    border: "#C8B09A",
    text: "#1C1008",
    textSecondary: "#7A6254",
    textLight: "#A79277",
  },
};

const HEX_COLOR_REGEX = /^#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6})$/;

function normalizeThemeInput(input) {
  const source =
    input && typeof input === "object" && !Array.isArray(input) ? input : {};
  const normalized = { ...DEFAULT_THEME };

  Object.keys(DEFAULT_THEME).forEach((key) => {
    const value = source[key];
    if (typeof value === "string" && HEX_COLOR_REGEX.test(value.trim())) {
      normalized[key] = value.trim();
    }
  });

  return normalized;
}

/**
 * Apply theme colors to <html> element as CSS custom properties.
 * This lets Tailwind's @theme vars cascade correctly.
 */
function applyThemeToDOM(colors) {
  const root = document.documentElement;
  const map = {
    primary: "--color-primary",
    primaryDark: "--color-primary-dark",
    primaryLight: "--color-primary-light",
    secondary: "--color-secondary",
    secondaryDark: "--color-secondary-dark",
    secondaryLight: "--color-secondary-light",
    accent: "--color-accent",
    success: "--color-success",
    warning: "--color-warning",
    danger: "--color-danger",
    info: "--color-info",
    surface: "--color-surface",
    surfaceAlt: "--color-surface-alt",
    border: "--color-border",
    text: "--color-text",
    textSecondary: "--color-text-secondary",
    textLight: "--color-text-light",
  };
  Object.entries(map).forEach(([key, varName]) => {
    if (colors[key]) root.style.setProperty(varName, colors[key]);
  });
}

export const useThemeStore = create(
  persist(
    (set, get) => ({
      colors: { ...DEFAULT_THEME },
      activePreset: "amazon",

      /** Set a single color */
      setColor: (key, value) => {
        if (!Object.prototype.hasOwnProperty.call(DEFAULT_THEME, key)) return;
        const safeValue =
          typeof value === "string" && HEX_COLOR_REGEX.test(value.trim())
            ? value.trim()
            : get().colors[key];
        const next = { ...get().colors, [key]: safeValue };
        applyThemeToDOM(next);
        set({ colors: next, activePreset: "custom" });
      },

      /** Apply a preset theme */
      applyPreset: (presetName) => {
        const preset = PRESET_THEMES[presetName] || DEFAULT_THEME;
        applyThemeToDOM(preset);
        set({ colors: { ...preset }, activePreset: presetName });
      },

      /** Reset to Amazon defaults */
      resetTheme: () => {
        applyThemeToDOM(DEFAULT_THEME);
        set({ colors: { ...DEFAULT_THEME }, activePreset: "amazon" });
      },

      /** Bulk set colors (e.g. from server settings) */
      setTheme: (colorObj) => {
        const merged = normalizeThemeInput(colorObj);
        applyThemeToDOM(merged);
        set({ colors: merged, activePreset: "custom" });
      },

      /** Initialise — called at app boot to apply persisted theme */
      hydrate: () => {
        applyThemeToDOM(get().colors);
      },
    }),
    {
      name: "theme-storage",
      onRehydrate: (state) => {
        // After zustand rehydrates from localStorage, push to DOM
        setTimeout(() => {
          if (state) applyThemeToDOM(state.colors);
        }, 0);
      },
    },
  ),
);

export { DEFAULT_THEME, PRESET_THEMES };
