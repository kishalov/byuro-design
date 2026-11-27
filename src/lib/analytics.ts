"use client";

/* Яндекс Метрика: счётчик, согласие на аналитику и цели.

   — Счётчик загружается ТОЛЬКО после согласия посетителя (баннер внизу страницы).
     Без согласия на сайте нет ни скрипта Метрики, ни её cookie.
   — Сайт — SPA (переходы Next.js без перезагрузки): первую страницу засчитывает сам init,
     а каждую следующую — метод hit при смене адреса (см. YandexMetrika.tsx). Адрес, уже засчитанный
     последним, повторно не отправляется — так нет двойного учёта.
     (С defer: true tag.js на проде всё равно отправлял просмотр при init, и вместе с ручным hit
     первая страница считалась дважды — поэтому в обычном случае defer не используем.)
   — Рекламные метки: если согласие дали после SPA-переходов, а вход был по ссылке с ?utm/yclid,
     первым просмотром уходит адрес входа (defer + hit), чтобы источник визита не потерялся.
   — Цель «Lead — Form Submitted» (JavaScript-событие, идентификатор byuro_form_submit_success):
     ym(114683065, 'reachGoal', 'byuro_form_submit_success') — только после ответа сервера об успешной
     отправке заявки (форма «Оставить заявку» → /api/lead и заявка из калькулятора → /api/brief, обе уходят
     в Telegram-бот). Каждая заявка засчитывается не больше одного раза (ключ отправки), повторный рендер
     React-компонента цель не вызывает: вызов стоит в обработчике отправки, а не в рендере/эффекте.
   — В Метрику не уходят имена, контакты и тексты заявок: цель без параметров, Вебвизор выключен
     (он мог бы записать ввод в полях форм). */

import { getLandingAd } from "./attribution";

export const METRIKA_ID = 114683065;
export const LEAD_GOAL = "byuro_form_submit_success";

export type Consent = "granted" | "denied";
const CONSENT_KEY = "byuro:analytics-consent:v1";
const CONSENT_EVENT = "byuro:consent";
const OPEN_EVENT = "byuro:consent-open";

type Ym = ((id: number, method: string, ...args: unknown[]) => void) & { a?: unknown[]; l?: number };
declare global {
  interface Window {
    ym?: Ym;
    __byuroMetrika?: { inited: boolean; lastUrl: string; goals?: string[] };
  }
}

export function readConsent(): Consent | null {
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as { value?: string };
    return v.value === "granted" || v.value === "denied" ? v.value : null;
  } catch {
    return null;
  }
}

export function saveConsent(value: Consent) {
  try {
    localStorage.setItem(CONSENT_KEY, JSON.stringify({ value, at: new Date().toISOString() }));
  } catch {
    /* хранилище недоступно — выбор действует до перезагрузки */
  }
  window.dispatchEvent(new CustomEvent<Consent>(CONSENT_EVENT, { detail: value }));
}

export const onConsent = (fn: (v: Consent) => void) => {
  const h = (e: Event) => fn((e as CustomEvent<Consent>).detail);
  window.addEventListener(CONSENT_EVENT, h);
  return () => window.removeEventListener(CONSENT_EVENT, h);
};

/** Открыть баннер согласия заново (ссылка «Настройки cookie» в подвале) */
export const openConsent = () => window.dispatchEvent(new Event(OPEN_EVENT));
export const onConsentOpen = (fn: () => void) => {
  window.addEventListener(OPEN_EVENT, fn);
  return () => window.removeEventListener(OPEN_EVENT, fn);
};

const state = () => (window.__byuroMetrika ??= { inited: false, lastUrl: "" });

/** Официальный код счётчика, один раз за жизнь страницы. Возвращает false, если уже инициализирован. */
export function initMetrika(): boolean {
  if (typeof window === "undefined") return false;
  const s = state();
  if (s.inited) return false;
  s.inited = true;
  // официальный код загрузки tag.js из интерфейса Метрики
  // prettier-ignore
  (function(m: any, e: Document, t: string, r: string, i: string, k?: any, a?: any){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
  m[i].l=1*(new Date() as any);
  for (var j = 0; j < e.scripts.length; j++) {if (e.scripts[j].src === r) { return; }}
  k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})
  (window, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");
  const current = window.location.href.split("#")[0];
  // Согласие дали уже после переходов по сайту, а вход был по рекламной ссылке: адрес с ?utm/yclid
  // из строки браузера уже пропал. Тогда первым просмотром отправляем адрес входа с исходным реферером —
  // иначе Метрика не увидит меток и не свяжет визит с рекламой. Текущая страница уйдёт следом (trackHit).
  const land = getLandingAd();
  const replay = land !== null && land.href !== current;
  window.ym!(METRIKA_ID, "init", {
    clickmap: true,
    trackLinks: true,
    accurateTrackBounce: true,
    webvisor: false, // не записываем сессии: в полях форм — личные данные
    ...(replay ? { defer: true } : {}), // только в этом случае: первый просмотр отправляем сами
  });
  if (replay) {
    window.ym!(METRIKA_ID, "hit", land.href, { referer: land.referrer || undefined });
    s.lastUrl = land.href;
  } else {
    s.lastUrl = current; // эту страницу засчитает init
  }
  return true;
}

/** Просмотр страницы. Один и тот же адрес подряд не считается дважды (например, при повторном рендере). */
export function trackHit(url: string, referer?: string) {
  const s = window.__byuroMetrika;
  if (!s?.inited || !window.ym || s.lastUrl === url) return;
  const prev = s.lastUrl;
  s.lastUrl = url;
  window.ym(METRIKA_ID, "hit", url, { title: document.title, referer: referer ?? (prev || document.referrer) });
}

/** Цель «Успешная отправка заявки». Вызывать только после подтверждения от сервера.
    key — уникальный ключ этой отправки: одна и та же заявка не засчитывается дважды.
    Без согласия (счётчик не загружен) — ничего не делает. Параметры не передаются. */
export function reachLeadGoal(key: string) {
  const s = window.__byuroMetrika;
  if (!s?.inited || !window.ym) return;
  s.goals ??= [];
  if (s.goals.includes(key)) return;
  s.goals.push(key);
  window.ym(METRIKA_ID, "reachGoal", LEAD_GOAL);
}

/** Уникальный ключ отправки формы */
export const submissionKey = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);
