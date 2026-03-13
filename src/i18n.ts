import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import en from "./i18n/en.json";
import ta from "./i18n/ta.json";
import hi from "./i18n/hi.json";

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: { en: { translation: en }, ta: { translation: ta }, hi: { translation: hi } },
    fallbackLng: "en",
    interpolation: { escapeValue: false },
    detection: {
      order: ["localStorage", "navigator"],
      lookupLocalStorage: "fms_language",
      caches: ["localStorage"],
    },
  });

export default i18n;
