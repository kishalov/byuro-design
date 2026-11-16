import type { Metadata } from "next";
import type { CaseBase as Case } from "@/content/cases";
import { site } from "@/content/site";
import { localeInfo, locales, type Locale } from "@/i18n/config";

/* Адрес сайта.
   1) NEXT_PUBLIC_SITE_URL — свой домен (задать в Vercel → Settings → Environment Variables);
   2) иначе на Vercel берём продакшн-адрес проекта (*.vercel.app или привязанный домен);
   3) иначе — localhost для разработки. */
const vercelProd = process.env.VERCEL_PROJECT_PRODUCTION_URL;
const vercelThis = process.env.VERCEL_URL;
export const siteUrl = (
  site.url ??
  (vercelProd ? `https://${vercelProd}` : vercelThis ? `https://${vercelThis}` : "http://localhost:3000")
).replace(/\/$/, "");

/** Индексируем только продакшн: свой домен или продакшн-деплой Vercel. Превью-деплои закрыты. */
export const hasDomain = Boolean(site.url) || process.env.VERCEL_ENV === "production";

export const brandName = (l: Locale) => (l === "ru" ? "Бюро" : "Byuro");

/** hreflang для всех языков + x-default (страница выбора языка «/») */
export function alternates(locale: Locale, path = "/"): Metadata["alternates"] {
  const languages: Record<string, string> = {};
  for (const l of locales) languages[l.hreflang] = `/${l.code}${path}`;
  languages["x-default"] = "/";
  return { canonical: `/${locale}${path}`, languages };
}

export const ogLocale = (l: Locale) => localeInfo(l).htmlLang.replace("-", "_");
const ogAlternateLocales = (l: Locale) => locales.filter((x) => x.code !== l).map((x) => ogLocale(x.code));

/** Готовые OG-картинки лежат в /public/og (генерируются скриптом scripts/og — см. README). */
export const ogImage = {
  home: (l: Locale) => `/og/home-${l}.png`,
  case: (slug: string) => `/og/case-${slug}.jpg`,
};

/** Полный набор OG/Twitter для страницы. Next не сливает openGraph из layout,
    поэтому каждая страница отдаёт его целиком. */
export function social(opts: {
  locale: Locale;
  title: string;
  description: string;
  path: string;
  image: string;
  imageAlt: string;
  type?: "website" | "article";
}): Pick<Metadata, "openGraph" | "twitter"> {
  const { locale, title, description, path, image, imageAlt, type = "website" } = opts;
  const img = { url: image, width: 1200, height: 630, alt: imageAlt, type: image.endsWith(".jpg") ? "image/jpeg" : "image/png" };
  return {
    openGraph: {
      type,
      url: `/${locale}${path}`,
      siteName: brandName(locale),
      locale: ogLocale(locale),
      alternateLocale: ogAlternateLocales(locale),
      title,
      description,
      images: [img],
    },
    twitter: { card: "summary_large_image", title, description, images: [img] },
  };
}

export function organizationJsonLd(description: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${siteUrl}/#org`,
    name: site.name,
    alternateName: "Byuro",
    ...(site.legalName ? { legalName: site.legalName } : {}),
    url: siteUrl,
    logo: `${siteUrl}/icon-512.png`,
    image: `${siteUrl}${ogImage.home("en")}`,
    description,
    sameAs: [site.contacts.instagram.url, site.contacts.telegram?.url].filter(Boolean),
    knowsAbout: ["Web design", "Web development", "UI/UX design", "Branding", "Motion design", "Chatbots"],
  };
}

export function caseJsonLd(c: Case, locale: Locale, t: { title: string; summary: string; client: string }, crumbs: { home: string; cases: string }) {
  const url = `${siteUrl}/${locale}/cases/${c.slug}/`;
  return [
    {
      "@context": "https://schema.org",
      "@type": "CreativeWork",
      "@id": url,
      url,
      name: t.title,
      description: t.summary,
      inLanguage: localeInfo(locale).htmlLang,
      image: `${siteUrl}${ogImage.case(c.slug)}`,
      creator: { "@id": `${siteUrl}/#org` },
      about: t.client,
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: crumbs.home, item: `${siteUrl}/${locale}/` },
        { "@type": "ListItem", position: 2, name: crumbs.cases, item: `${siteUrl}/${locale}/#cases` },
        { "@type": "ListItem", position: 3, name: t.title, item: url },
      ],
    },
  ];
}
