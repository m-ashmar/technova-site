import type { Locale } from "@/lib/i18n";

const ARABIC_INDIC = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];

/**
 * Two-digit act numeral ("01"), in Arabic-Indic digits for Arabic copy so a
 * generated number reads like the JSON around it (design-system §2, §6).
 */
export function actNumeral(n: number, locale: Locale): string {
  const latin = String(Math.max(0, Math.trunc(n))).padStart(2, "0");
  return locale === "ar"
    ? latin.replace(/\d/g, (d) => ARABIC_INDIC[Number(d)])
    : latin;
}
