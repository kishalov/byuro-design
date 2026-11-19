import type { Locale } from "./config";

/** Ссылка внутри сайта с префиксом языка: lp("en", "/#cases") → "/en/#cases" */
export const lp = (locale: Locale, path = "/") => `/${locale}${path === "/" ? "/" : path}`;

export const anchors = {
  services: "/#services",
  cases: "/#cases",
  partners: "/#partners",
  process: "/#process",
  faq: "/#faq",
  project: "/#contact-project",
  partner: "/#contact-partner",
  calculator: "/calculator/",
} as const;
