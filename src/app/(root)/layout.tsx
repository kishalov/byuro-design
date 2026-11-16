import type { Metadata } from "next";
import type { ReactNode } from "react";
import { locales } from "@/i18n/config";
import { hasDomain, ogImage, siteUrl } from "@/lib/seo";
import "../globals.css";

const languages = Object.fromEntries([...locales.map((l) => [l.hreflang, `/${l.code}/`]), ["x-default", "/"]]);

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Бюро — Byuro design studio",
  description: "Design & development studio Byuro. Choose your language.",
  applicationName: "Byuro",
  ...(hasDomain ? { alternates: { canonical: "/", languages } } : {}),
  openGraph: {
    type: "website",
    url: "/",
    siteName: "Byuro",
    title: "Бюро — Byuro design studio",
    description: "Design & development studio Byuro: branding, websites, apps, chatbots and creatives in one team.",
    images: [{ url: ogImage.home("en"), width: 1200, height: 630, alt: "Byuro — design and development in one team" }],
  },
  twitter: { card: "summary_large_image", images: [ogImage.home("en")] },
  robots: hasDomain ? { index: true, follow: true } : { index: false, follow: false },
};

export default function RootChooserLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
