import type { Locale } from "./config";

/** Ссылка внутри сайта с префиксом языка: lp("en", "/#cases") → "/en/#cases" */
export const lp = (locale: Locale, path = "/") => `/${locale}${path === "/" ? "/" : path}`;

export const anchors = {
  services: "/#services",
  cases: "/#cases",
  partners: "/#partners",
  process: "/#process",
  faq: "/#faq",
  // Лендинг теперь из трёх экранов: первый экран → кейсы → калькулятор.
  // Форм заявки на главной нет — все «связаться» ведут к калькулятору (там отправка брифа).
  project: "/#calculator",
  partner: "/#lead-partner", // попап с формой заявки на вкладке «Партнёрство»
  lead: "/#lead", // попап с формой заявки (проект)
  calculator: "/#calculator",
} as const;
