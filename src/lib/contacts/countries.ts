/* Страны для поля телефона: «часто выбирают» для каждой версии сайта и страна по умолчанию. */
import type { Locale } from "@/i18n/config";

export const POPULAR: Record<Locale, string[]> = {
  ru: ["RU", "KZ", "BY", "UZ", "KG", "AM", "GE", "AZ", "TR", "AE", "RS", "CY"],
  en: ["US", "GB", "AE", "CA", "AU", "DE", "CY", "RS", "TR", "IN"],
  de: ["DE", "AT", "CH", "GB", "US", "AE"],
  fr: ["FR", "BE", "CH", "CA", "LU", "MA"],
  es: ["ES", "MX", "AR", "CO", "CL", "US"],
  sr: ["RS", "ME", "BA", "HR", "MK", "SI"],
  hi: ["IN", "AE", "US", "GB", "SG", "SA"],
  "zh-cn": ["CN", "HK", "TW", "SG", "MO", "MY"],
  ja: ["JP", "US", "KR", "TW", "SG", "GB"],
};

/** Страна по умолчанию: регион из языка браузера (ru-KZ → KZ), иначе — по версии сайта */
export function defaultCountry(locale: Locale, isKnown: (c: string) => boolean): string {
  if (typeof navigator !== "undefined") {
    for (const l of navigator.languages ?? [navigator.language]) {
      const region = l?.split(/[-_]/)[1]?.toUpperCase();
      if (region && region.length === 2 && isKnown(region)) {
        // язык браузера должен совпадать с языком сайта, иначе «en-US» на русской версии даст США
        const lang = l.split(/[-_]/)[0].toLowerCase();
        if (lang === locale.split("-")[0]) return region;
      }
    }
  }
  return POPULAR[locale][0];
}

/** Флаг-эмодзи из кода страны */
export const flagEmoji = (cc: string) => String.fromCodePoint(...[...cc.toUpperCase()].map((ch) => 0x1f1e6 + ch.charCodeAt(0) - 65));
