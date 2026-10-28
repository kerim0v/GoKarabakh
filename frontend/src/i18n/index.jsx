import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import en from "./en.js";

// Each language is a nested object with the same keys as en.js. A value can be a
// string with {placeholders} or a function of the variables (for plurals).
export const LANGUAGES = { en: { label: "EN", name: "English", locale: "en-GB", strings: en } };
const STORAGE_KEY = "gk.lang";

function lookup(strings, key) {
  return key.split(".").reduce((node, part) => (node == null ? undefined : node[part]), strings);
}

function initialLanguage() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && LANGUAGES[saved]) return saved;
  } catch {
    // storage blocked
  }
  const browser = (navigator.language || "en").slice(0, 2);
  return LANGUAGES[browser] ? browser : "en";
}

const I18nContext = createContext(null);

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(initialLanguage);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((next) => {
    setLangState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // storage blocked
    }
  }, []);

  const value = useMemo(() => {
    const { strings, locale } = LANGUAGES[lang];
    const t = (key, vars = {}) => {
      let value = lookup(strings, key);
      if (value === undefined) value = lookup(en, key);
      if (value === undefined) return key;
      if (typeof value === "function") return value(vars);
      if (typeof value !== "string") return value;
      return value.replace(/\{(\w+)\}/g, (match, name) => (vars[name] ?? match));
    };
    // Prefer a translated message for API errors that come with a code
    const errorText = (err) => {
      const translated = err?.code && lookup(strings, `errors.${err.code}`);
      return translated || err?.message || t("errors.generic");
    };
    const formatDate = (value) => {
      if (!value) return "";
      // "2026-05-31" is a calendar date, not UTC midnight
      const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00`) : new Date(value);
      return new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric" }).format(date);
    };
    const formatNumber = (value, options) => new Intl.NumberFormat(locale, options).format(value);
    return { lang, setLang, t, errorText, formatDate, formatNumber, locale };
  }, [lang, setLang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export const useI18n = () => useContext(I18nContext);
