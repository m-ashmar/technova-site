"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { defaultLocale, isLocale, localeMeta, type Locale } from "@/lib/i18n";
import type {
  ContentBundle,
  Project,
  Service,
  SiteContent,
} from "@/lib/content/schema";

export type LocalizedProject = Omit<Project, "locales"> &
  Project["locales"]["en"];
export type LocalizedService = Omit<Service, "locales"> &
  Service["locales"]["en"];

interface AppState {
  locale: Locale;
  dir: "ltr" | "rtl";
  t: SiteContent;
  projects: LocalizedProject[];
  services: LocalizedService[];
  setLocale: (l: Locale) => void;
  toggleLocale: () => void;
}

const AppContext = createContext<AppState | null>(null);

/**
 * Receives the full bilingual content bundle from the server and resolves it
 * by locale on the client, so the EN/AR toggle is instant (no refetch).
 * An inline beforeInteractive script in layout.tsx applies the stored locale
 * to <html> before first paint; this provider keeps React state in sync.
 */
export default function AppProvider({
  bundle,
  children,
}: {
  bundle: ContentBundle;
  children: ReactNode;
}) {
  const [locale, setLocaleState] = useState<Locale>(defaultLocale);
  // Mirrors `locale` for handlers that must read it without waiting on a
  // re-render, so rapid toggles can never act on a stale value.
  const localeRef = useRef<Locale>(defaultLocale);

  // Hydrate from whatever the init script / localStorage already decided.
  // This must be an effect: the server cannot know the visitor's stored
  // locale, so reading it during render would break hydration.
  useEffect(() => {
    const l = document.documentElement.getAttribute("lang");
    if (isLocale(l)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- client-only locale hydration
      setLocaleState(l);
      localeRef.current = l;
      document.title = bundle.site[l].meta.title;
    }
  }, [bundle]);

  const applyLocale = useCallback(
    (l: Locale) => {
      const el = document.documentElement;
      el.setAttribute("lang", l);
      el.setAttribute("dir", localeMeta[l].dir);
      el.classList.toggle("lang-ar", l === "ar");
      document.title = bundle.site[l].meta.title;
      try {
        localStorage.setItem("locale", l);
      } catch {}
    },
    [bundle]
  );

  const setLocale = useCallback(
    (l: Locale) => {
      localeRef.current = l;
      setLocaleState(l);
      applyLocale(l);
    },
    [applyLocale]
  );

  const toggleLocale = useCallback(
    () => setLocale(localeRef.current === "en" ? "ar" : "en"),
    [setLocale]
  );

  const value = useMemo<AppState>(() => {
    const strip = <T extends { locales: { en: object; ar: object } }>(
      row: T
    ) => {
      const { locales, ...rest } = row;
      return { ...rest, ...locales[locale] };
    };
    return {
      locale,
      dir: localeMeta[locale].dir,
      t: bundle.site[locale],
      projects: bundle.projects.map(strip) as LocalizedProject[],
      services: bundle.services.map(strip) as LocalizedService[],
      setLocale,
      toggleLocale,
    };
  }, [bundle, locale, setLocale, toggleLocale]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
