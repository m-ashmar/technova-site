export type Locale = "en" | "ar";

export const defaultLocale: Locale = "en";

export const localeMeta: Record<Locale, { dir: "ltr" | "rtl"; label: string }> = {
  en: { dir: "ltr", label: "EN" },
  ar: { dir: "rtl", label: "عربي" },
};

export function isLocale(v: unknown): v is Locale {
  return v === "en" || v === "ar";
}
