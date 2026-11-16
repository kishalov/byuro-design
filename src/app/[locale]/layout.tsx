import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { MobileCtaBar } from "@/components/MobileCtaBar";
import { RevealObserver } from "@/components/ui/RevealObserver";
import { isLocale, localeCodes, localeInfo } from "@/i18n/config";
import { getDict } from "@/i18n/get";
import { alternates, hasDomain, ogLocale, organizationJsonLd, siteUrl } from "@/lib/seo";
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
  const brand = locale === "ru" ? "Бюро" : "Byuro";
  return {
    metadataBase: new URL(siteUrl),
    title: { default: t.title, template: `%s — ${brand}` },
    description: t.description,
    applicationName: brand,
    ...(hasDomain ? { alternates: alternates(locale) } : {}),
    openGraph: {
      type: "website",
      locale: ogLocale(locale),
      siteName: brand,
      title: t.title,
      description: t.description,
      images: [{ url: "/og.png", width: 1200, height: 630, alt: t.ogAlt }],
    },
    twitter: { card: "summary_large_image", title: t.title, description: t.description, images: ["/og.png"] },
    robots: hasDomain ? { index: true, follow: true } : { index: false, follow: false },
    formatDetection: { telephone: false },
  };
}

export const viewport: Viewport = { themeColor: "#F1ECE2", width: "device-width", initialScale: 1, viewportFit: "cover" };

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
        <MobileCtaBar locale={locale} project={t.cta.project} partner={t.cta.partnerShort} />
        <RevealObserver />
      </body>
    </html>
  );
}
