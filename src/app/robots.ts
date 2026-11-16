import type { MetadataRoute } from "next";
import { hasDomain, siteUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  // Пока домен не задан (NEXT_PUBLIC_SITE_URL) — закрываем сайт от индексации
  if (!hasDomain) return { rules: { userAgent: "*", disallow: "/" } };
  return { rules: { userAgent: "*", allow: "/", disallow: "/api/" }, sitemap: `${siteUrl}/sitemap.xml` };
}
