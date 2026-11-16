import type { Metadata } from "next";
import type { ReactNode } from "react";
import { locales } from "@/i18n/config";
import { hasDomain, siteUrl } from "@/lib/seo";
import "../globals.css";

const languages = Object.fromEntries([...locales.map((l) => [l.hreflang, `/${l.code}/`]), ["x-default", "/"]]);

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Бюро — Byuro design studio",
  description: "Design & development studio Byuro. Choose your language.",
  ...(hasDomain ? { alternates: { canonical: "/", languages } } : {}),
  robots: hasDomain ? { index: true, follow: true } : { index: false, follow: false },
};

export default function RootChooserLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
