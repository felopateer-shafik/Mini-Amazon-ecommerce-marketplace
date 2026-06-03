import { create } from "zustand";
import { persist } from "zustand/middleware";

const DEFAULT_LANGUAGE = "ar";
const SUPPORTED_LANGUAGES = ["ar", "en"];
const STORAGE_KEY = "language-store";

const applyDocumentLanguage = (lang) => {
  const language = SUPPORTED_LANGUAGES.includes(lang) ? lang : DEFAULT_LANGUAGE;
  document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
  document.documentElement.lang = language;
};

const getPersistedLanguage = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_LANGUAGE;

    const parsed = JSON.parse(raw);
    const persistedLanguage = parsed?.state?.language;

    return SUPPORTED_LANGUAGES.includes(persistedLanguage)
      ? persistedLanguage
      : DEFAULT_LANGUAGE;
  } catch {
    return DEFAULT_LANGUAGE;
  }
};

applyDocumentLanguage(getPersistedLanguage());

export const useLanguageStore = create(
  persist(
    (set) => ({
      language: getPersistedLanguage(),
      setLanguage: (lang) => {
        const language = SUPPORTED_LANGUAGES.includes(lang)
          ? lang
          : DEFAULT_LANGUAGE;
        applyDocumentLanguage(language);
        set({ language });
      },
    }),
    {
      name: STORAGE_KEY,
      onRehydrateStorage: () => {
        return (state) => {
          if (state) {
            applyDocumentLanguage(state.language);
          }
        };
      },
    },
  ),
);
