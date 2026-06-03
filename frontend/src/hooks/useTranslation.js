import { useLanguageStore } from "@/store/languageStore";
import en from "@/i18n/en";
import ar from "@/i18n/ar";

const translations = { en, ar };

export function useTranslation() {
  const { language, setLanguage } = useLanguageStore();

  const t = (key, params) => {
    if (typeof key !== "string") return String(key ?? "");
    const keys = key.split(".");
    let value = translations[language];
    for (const k of keys) {
      value = value?.[k];
    }
    if (value === undefined) {
      // Fallback to English
      value = translations.en;
      for (const k of keys) {
        value = value?.[k];
      }
    }
    if (value === undefined) return key;
    if (params && typeof value === "string") {
      return value.replace(/\{(\w+)\}/g, (_, k) => params[k] ?? `{${k}}`);
    }
    return value;
  };

  const isRTL = language === "ar";

  return { t, language, setLanguage, isRTL };
}
