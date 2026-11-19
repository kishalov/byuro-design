/* Форматирование сумм и сроков калькулятора.
   Валюта всегда исходная (USD): курсов и «международных» цен нет — сумма не пересчитывается,
   меняется только формат записи числа под язык посетителя. */

import type { Locale } from "@/i18n/config";
import { fmt } from "@/i18n/format";
import { markets } from "@/i18n/market";
import type { CalcDict } from "@/i18n/calculator/ru";
import { CURRENCY, ITEMS, type ItemKey } from "./catalog";
import type { DayRange, Quote, QuoteLine } from "./engine";

export function moneyFormatter(locale: Locale) {
  const nl = markets[locale]?.numberLocale ?? "en-US";
  const whole = new Intl.NumberFormat(nl, { style: "currency", currency: CURRENCY, maximumFractionDigits: 0 });
  const cents = new Intl.NumberFormat(nl, { style: "currency", currency: CURRENCY, minimumFractionDigits: 2, maximumFractionDigits: 2 });
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

/** Тип проекта для КП: перечисление выбранных направлений */
export function projectType(t: CalcDict, q: Quote): string {
  const names = q.services.map((s) => t.services[s.id].title);
  if (!names.length && q.extras.lines.length) names.push(t.summary.extras);
  if (!names.length && q.onRequest.length) names.push(...q.onRequest.map((k) => t.onRequest[k].title));
  return names.join(" · ");
}
