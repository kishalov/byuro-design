"use client";

/* Яндекс Метрика: счётчик, согласие на аналитику и цели.

   — Счётчик загружается ТОЛЬКО после согласия посетителя (баннер внизу страницы).
     Без согласия на сайте нет ни скрипта Метрики, ни её cookie.
   — Сайт — SPA (переходы Next.js без перезагрузки): первую страницу засчитывает сам init,
     а каждую следующую — метод hit при смене адреса (см. YandexMetrika.tsx). Адрес, уже засчитанный
     последним, повторно не отправляется — так нет двойного учёта.
     (С defer: true tag.js на проде всё равно отправлял просмотр при init, и вместе с ручным hit
     первая страница считалась дважды — поэтому defer не используем.)
   — Цель «Успешная отправка заявки»: JavaScript-событие с идентификатором LEAD_GOAL.
     В интерфейсе Метрики: Цели → Добавить цель → «JavaScript-событие» → идентификатор lead_sent.
     В параметрах визита приходит form: "lead" (форма заявки) или "calculator" (заявка из калькулятора). */

export const METRIKA_ID = 114683065;
export const LEAD_GOAL = "lead_sent";

export type Consent = "granted" | "denied";
const CONSENT_KEY = "byuro:analytics-consent:v1";
const CONSENT_EVENT = "byuro:consent";
const OPEN_EVENT = "byuro:consent-open";

type Ym = ((id: number, method: string, ...args: unknown[]) => void) & { a?: unknown[]; l?: number };
declare global {
  interface Window {
    ym?: Ym;
    __byuroMetrika?: { inited: boolean; lastUrl: string };
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
  s.lastUrl = window.location.href.split("#")[0]; // эту страницу засчитает init
  window.ym!(METRIKA_ID, "init", {
    clickmap: true,
    trackLinks: true,
    accurateTrackBounce: true,
    webvisor: true,
  });
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

/** Достижение цели. Без согласия (счётчик не загружен) — ничего не делает. */
export function reachGoal(goal: string, params?: Record<string, unknown>) {
  if (!window.__byuroMetrika?.inited || !window.ym) return;
  window.ym(METRIKA_ID, "reachGoal", goal, params);
}
