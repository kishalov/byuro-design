import type { Locale } from "./config";

/* Рыночные настройки версии сайта — отдельно от языка.
   Язык отвечает за тексты, рынок — за валюту и формат чисел в иллюстративных расчётах
   (партнёрская программа). Конвертации курсов НЕТ: суммы условные и показывают механику.

   Чтобы для какой-то версии сменить рынок (например, сербская версия в динарах),
   поменяйте значения здесь — тексты и разметку трогать не нужно. */
export type Market = {
  /** ISO 4217 */
  currency: string;
  /** локаль форматирования чисел (Intl) */
  numberLocale: string;
  /** условная стоимость проекта для клиента — база для обоих примеров */
  baseAmount: number;
};

export const markets: Record<Locale, Market> = {
  ru: { currency: "RUB", numberLocale: "ru-RU", baseAmount: 100_000 },
  en: { currency: "USD", numberLocale: "en-US", baseAmount: 100_000 },
  de: { currency: "EUR", numberLocale: "de-DE", baseAmount: 100_000 },
  fr: { currency: "EUR", numberLocale: "fr-FR", baseAmount: 100_000 },
  es: { currency: "EUR", numberLocale: "es-ES", baseAmount: 100_000 },
  sr: { currency: "EUR", numberLocale: "sr-Latn-RS", baseAmount: 100_000 },
  hi: { currency: "INR", numberLocale: "hi-IN", baseAmount: 100_000 },
  "zh-cn": { currency: "CNY", numberLocale: "zh-CN", baseAmount: 100_000 },
  ja: { currency: "JPY", numberLocale: "ja-JP", baseAmount: 1_000_000 },
};

/** Условия примеров — одинаковые для всех рынков */
export const partnerExample = {
  referralRate: 0.15, // комиссия реферального партнёра
  agencyFeeShare: 0.8, // стоимость Бюро = 80% от цены для клиента → наценка 25% от стоимости Бюро
};

export function partnerCalc(locale: Locale) {
  const m = markets[locale];
  const money = new Intl.NumberFormat(m.numberLocale, { style: "currency", currency: m.currency, maximumFractionDigits: 0 });
  const pct = new Intl.NumberFormat(m.numberLocale, { style: "percent", maximumFractionDigits: 0 });
  const P = m.baseAmount;
  const commission = Math.round(P * partnerExample.referralRate);
  const fee = Math.round(P * partnerExample.agencyFeeShare);
  const profit = P - fee;
  return {
    referral: { project: money.format(P), rate: pct.format(partnerExample.referralRate), earn: money.format(commission) },
    agency: {
      fee: money.format(fee),
      price: money.format(P),
      earn: money.format(profit),
      markup: pct.format(profit / fee),
    },
  };
}
export type PartnerCalc = ReturnType<typeof partnerCalc>;
