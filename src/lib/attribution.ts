"use client";
/* Откуда пришёл посетитель — для диагностики заявок: UTM-метки, наличие рекламных click-id
   (yclid, gclid…; только названия, без значений), сайт-источник и страница входа.
   Запоминается при первой загрузке и живёт только в памяти вкладки (без cookie и хранилища
   браузера): уходит на сервер лишь вместе с заявкой. */

export type Attribution = { utm_source?: string; utm_medium?: string; utm_campaign?: string; utm_content?: string; utm_term?: string; clickIds?: string[]; referrer?: string; landing?: string };

let first: Attribution | null = null;
const CLICK_IDS = ["yclid", "gclid", "fbclid", "ttclid", "msclkid", "vkclid"];

export function captureAttribution() {
  if (first || typeof window === "undefined") return;
  const q = new URLSearchParams(window.location.search);
  const a: Attribution = {};
  for (const k of ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const) {
    const v = q.get(k)?.trim();
    if (v) a[k] = v.slice(0, 120);
  }
  const ids = CLICK_IDS.filter((k) => q.has(k));
  if (ids.length) a.clickIds = ids;
  try {
    const ref = document.referrer ? new URL(document.referrer) : null;
    if (ref && ref.host !== window.location.host) a.referrer = ref.host;
  } catch {
    /* ignore */
  }
  a.landing = window.location.pathname;
  first = a;
}

export const getAttribution = (): Attribution => {
  captureAttribution();
  return first ?? {};
};
