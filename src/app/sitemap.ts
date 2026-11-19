import type { MetadataRoute } from "next";
import { cases } from "@/content/cases";
import { locales } from "@/i18n/config";
import { siteUrl } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  const paths = ["/", "/calculator/", ...cases.map((c) => `/cases/${c.slug}/`)];
  return paths.flatMap((p) =>
    locales.map((l) => ({
      url: `${siteUrl}/${l.code}${p}`,
      alternates: { languages: Object.fromEntries(locales.map((x) => [x.hreflang, `${siteUrl}/${x.code}${p}`])) },
    })),
  );
}
