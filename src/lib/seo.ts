import type { Metadata } from "next";
import { site } from "@/content/site";
import { localeInfo, locales, type Locale } from "@/i18n/config";

export const siteUrl = site.url ?? "http://localhost:3000";
export const hasDomain = Boolean(site.url);

/** hreflang для всех языков + x-default (страница выбора языка «/») */
export function alternates(locale: Locale, path = "/"): Metadata["alternates"] {
  const languages: Record<string, string> = {};
  for (const l of locales) languages[l.hreflang] = `/${l.code}${path}`;
  languages["x-default"] = "/";
  return { canonical: `/${locale}${path}`, languages };
}

export const ogLocale = (l: Locale) => localeInfo(l).htmlLang.replace("-", "_");

export function organizationJsonLd(description: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: site.name,
    alternateName: "Byuro",
    ...(site.legalName ? { legalName: site.legalName } : {}),
    ...(hasDomain ? { url: siteUrl, logo: `${siteUrl}/icon.png` } : {}),
    description,
    sameAs: [site.contacts.instagram.url, site.contacts.telegram?.url].filter(Boolean),
    knowsAbout: ["Web design", "Web development", "UI/UX design", "Branding", "Motion design", "Chatbots"],
  };
}
