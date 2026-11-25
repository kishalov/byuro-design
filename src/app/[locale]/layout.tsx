import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { MobileCtaBar } from "@/components/MobileCtaBar";
import { AnchorScroll } from "@/components/AnchorScroll";
import { YandexMetrika } from "@/components/analytics/YandexMetrika";
import { RevealObserver } from "@/components/ui/RevealObserver";
import { isLocale, localeCodes, localeInfo } from "@/i18n/config";
import { getDict } from "@/i18n/get";
import { lp } from "@/i18n/paths";
import { alternates, brandName, hasDomain, ogImage, organizationJsonLd, siteUrl, social } from "@/lib/seo";
import "../globals.css";

type Props = { children: ReactNode; params: Promise<{ locale: string }> };

export const dynamicParams = false;
export function generateStaticParams() {
  return localeCodes.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = (await getDict(locale)).meta;
  const brand = brandName(locale);
  return {
    metadataBase: new URL(siteUrl),
    title: { default: t.title, template: `%s — ${brand}` },
    description: t.description,
    applicationName: brand,
    authors: [{ name: brand }],
    creator: brand,
    publisher: brand,
    category: "design",
    ...(hasDomain ? { alternates: alternates(locale) } : {}),
    ...social({ locale, title: t.title, description: t.description, path: "/", image: ogImage.home(locale), imageAlt: t.ogAlt }),
    appleWebApp: { title: brand, capable: true, statusBarStyle: "default" },
    robots: hasDomain
      ? { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 } }
      : { index: false, follow: false },
    formatDetection: { telephone: false, email: false, address: false },
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F1ECE2" },
    { media: "(prefers-color-scheme: dark)", color: "#121212" },
  ],
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = await getDict(locale);
  const info = localeInfo(locale);
  return (
    <html lang={info.htmlLang} dir="ltr" data-script={info.script}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: "var d=document.documentElement;d.classList.add('js');addEventListener('load',function(){setTimeout(function(){d.classList.add('motion-on')},1200)})" }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd(t.meta.description)) }} />
      </head>
      <body>
        <a href="#main" className="fixed top-3 left-3 z-[100] -translate-y-24 rounded-pill bg-ink px-5 py-3 font-semibold text-paper transition-transform focus:translate-y-0">
          {t.nav.skip}
        </a>
        <Header locale={locale} nav={t.nav} cta={t.cta} />
        <main id="main" tabIndex={-1} className="outline-none">
          {children}
        </main>
        <Footer locale={locale} t={t.footer} nav={t.nav} cta={t.cta} />
        <MobileCtaBar locale={locale} project={t.cta.lead} partner="Telegram" />
        <RevealObserver />
        <AnchorScroll />
        <YandexMetrika t={t.consent} privacyHref={lp(locale, "/privacy/")} />
      </body>
    </html>
  );
}
