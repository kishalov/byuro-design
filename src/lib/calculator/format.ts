/* Форматирование сумм и сроков калькулятора.
   Валюта расчёта зависит от версии сайта: русская — в рублях (цены переводятся
   по фиксированному курсу, см. RUB_PER_USD в catalog.ts), остальные — в долларах.
   Формат записи числа — под язык посетителя. */

import type { Locale } from "@/i18n/config";
import { fmt } from "@/i18n/format";
import { markets } from "@/i18n/market";
import type { CalcDict } from "@/i18n/calculator/ru";
import { ITEMS, type Currency, type ItemKey } from "./catalog";
import type { DayRange, Quote, QuoteLine, QuoteService } from "./engine";

/** Валюта калькулятора для версии сайта */
export const calcCurrency = (locale: Locale): Currency => (locale === "ru" ? "RUB" : "USD");

/** currency — валюта самих сумм (у готового расчёта — quote.currency) */
export function moneyFormatter(locale: Locale, currency: Currency = calcCurrency(locale)) {
  const nl = markets[locale]?.numberLocale ?? "en-US";
  const whole = new Intl.NumberFormat(nl, { style: "currency", currency, maximumFractionDigits: 0 });
  const cents = new Intl.NumberFormat(nl, { style: "currency", currency, minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return (v: number) => (Number.isInteger(Math.round(v * 100) / 100) ? whole : cents).format(v);
}

export function qtyFormatter(locale: Locale) {
  const nf = new Intl.NumberFormat(markets[locale]?.numberLocale ?? "en-US", { maximumFractionDigits: 1 });
  return (v: number) => nf.format(v);
}

export function formatDays(r: DayRange, t: CalcDict["days"], locale: Locale): string {
  return r.min === r.max ? fmt(t.one, { n: r.min }, locale) : fmt(t.range, { min: r.min, max: r.max }, locale);
}

export const pct = (factor: number) => `${Math.round((factor - 1) * 100)}%`;

export const itemLabel = (t: CalcDict, key: ItemKey) => t.items[key];

export function lineText(t: CalcDict, l: QuoteLine, locale: Locale, money: (v: number) => string) {
  const q = qtyFormatter(locale);
  return `${t.items[l.key]} — ${q(l.qty)} ${t.units[ITEMS[l.key].unit]} × ${money(l.unitPrice)} = ${money(l.amount)}`;
}

/** Тип проекта для КП: перечисление выбранных услуг (названия — как в разделе «Услуги» сайта) */
export function projectType(t: CalcDict, q: Quote): string {
  const names = q.services.map((s) => t.services[s.id].title);
  if (!names.length && q.extras.lines.length) names.push(t.summary.extras);
  return names.join(" · ");
}

/** Название услуги в смете; для сайта — с вариантом (конструктор / индивидуальная разработка) */
export const serviceTitle = (t: CalcDict, s: QuoteService) => (s.variant ? `${t.services[s.id].title} · ${t.variants[s.variant].title}` : t.services[s.id].title);

/** Пункты с индивидуальной оценкой — формулировки из «Что входит» услуги на сайте */
export const requestPartNames = (t: CalcDict, s: QuoteService) => s.parts.map((i) => t.services[s.id].deliverables[i]).filter(Boolean);

/** Услуга целиком или частично оценивается индивидуально */
export const isOnRequest = (s: QuoteService) => s.requestOnly || s.parts.length > 0;
