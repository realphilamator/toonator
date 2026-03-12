"use client";
import { createContext, useContext, useState, useEffect, useCallback } from "react";

const I18nContext = createContext(null);

export function I18nProvider({ children, initialLang = "en", page }) {
  const [lang, setLangState] = useState(initialLang);
  const [translations, setTranslations] = useState({});

  useEffect(() => {
    fetch("/translate.json")
      .then((r) => r.json())
      .then(setTranslations)
      .catch(() => {});
  }, []);

  const t = useCallback(
    (key, overridePage) => {
      const p = overridePage || page;
      return (
        translations?.[lang]?.pages?.[p]?.[key] ??
        translations?.["en"]?.pages?.[p]?.[key] ??
        key
      );
    },
    [translations, lang, page]
  );

  const setLang = (newLang) => {
    setLangState(newLang);
    document.documentElement.lang = newLang;
  };

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside <I18nProvider>");
  return ctx;
}

/** Detect lang from hostname (mirrors i18n.js logic) */
export function detectLang() {
  if (typeof window === "undefined") return "en";
  const hostname = window.location.hostname;
  const isLocal = hostname === "localhost" || hostname === "127.0.0.1";
  const langParam = new URLSearchParams(window.location.search).get("lang");
  if (langParam) return langParam;
  if (!isLocal && hostname.includes("multator")) return "ru";
  return "en";
}
