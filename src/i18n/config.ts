/* Языки сайта. Новый язык = запись здесь + словарь в ./dictionaries.
   Для других языков Индии (bn, ta, te, mr…) добавьте запись с нужным
   шрифтовым классом script и словарь — маршруты и SEO подхватятся сами. */

export const locales = [
  { code: "ru", htmlLang: "ru", hreflang: "ru", label: "Русский", short: "RU", script: "cyrl" },
  { code: "en", htmlLang: "en", hreflang: "en", label: "English", short: "EN", script: "latn" },
  { code: "de", htmlLang: "de", hreflang: "de", label: "Deutsch", short: "DE", script: "latn" },
  { code: "fr", htmlLang: "fr", hreflang: "fr", label: "Français", short: "FR", script: "latn" },
  { code: "es", htmlLang: "es", hreflang: "es", label: "Español", short: "ES", script: "latn" },
  { code: "sr", htmlLang: "sr-Latn", hreflang: "sr-Latn", label: "Srpski", short: "SR", script: "latn" },
  { code: "hi", htmlLang: "hi", hreflang: "hi", label: "हिन्दी", short: "HI", script: "deva" },
  { code: "zh-cn", htmlLang: "zh-CN", hreflang: "zh-CN", label: "简体中文", short: "中文", script: "hans" },
  { code: "ja", htmlLang: "ja", hreflang: "ja", label: "日本語", short: "日本", script: "jpan" },
] as const;

export type Locale = (typeof locales)[number]["code"];
export const localeCodes = locales.map((l) => l.code) as Locale[];
export const defaultLocale: Locale = "en"; // если язык браузера не поддерживается
export const LOCALE_COOKIE = "NEXT_LOCALE";

export const isLocale = (v: string): v is Locale => (localeCodes as string[]).includes(v);
export const localeInfo = (l: Locale) => locales.find((x) => x.code === l)!;

/** Подбор языка по списку предпочтений браузера (Accept-Language / navigator.languages) */
export function matchLocale(prefs: readonly string[]): Locale {
  for (const raw of prefs) {
    const p = raw.toLowerCase().trim();
    if (!p) continue;
    if (p.startsWith("zh")) {
      // упрощённый китайский: zh, zh-cn, zh-sg, zh-hans*
      if (!/^zh-(tw|hk|mo|hant)/.test(p)) return "zh-cn";
      continue;
    }
    if (p.startsWith("sr")) return "sr"; // sr, sr-latn, sr-cyrl-rs → латиница
    const base = p.split("-")[0];
    if (isLocale(base)) return base;
  }
  return defaultLocale;
}

export function parseAcceptLanguage(header: string | null): string[] {
  if (!header) return [];
  return header
    .split(",")
    .map((part) => {
      const [tag, q] = part.trim().split(";q=");
      return { tag, q: q ? Number(q) : 1 };
    })
    .filter((x) => x.tag && x.q > 0)
    .sort((a, b) => b.q - a.q)
    .map((x) => x.tag);
}
