"use client";
/* Откуда пришёл посетитель — для диагностики заявок и для Метрики.
   Запоминается при первой загрузке страницы (до любых SPA-переходов, которые убирают ?utm из адреса):
   — для заявки: UTM-метки, названия рекламных click-id (yclid, gclid… — без значений), сайт-источник,
     страница входа. Копия этой сводки лежит в sessionStorage вкладки (стирается при её закрытии), чтобы
     не потеряться при смене языка — это обычная перезагрузка страницы;
   — для Метрики: полный адрес входа с рекламными параметрами — только в памяти вкладки
     (см. initMetrika: если согласие дали уже после переходов по сайту, первым засчитывается адрес входа). */

export type Attribution = { utm_source?: string; utm_medium?: string; utm_campaign?: string; utm_content?: string; utm_term?: string; clickIds?: string[]; referrer?: string; landing?: string; internalRef?: boolean };

const UTM = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const;
const CLICK_IDS = ["yclid", "gclid", "fbclid", "ttclid", "msclkid", "vkclid"];
/** Параметры рекламных ссылок, которые нельзя терять при переходах до того, как их увидит Метрика */
export const AD_PARAMS: readonly string[] = [...UTM, "utm_referrer", "utm_nooverride", ...CLICK_IDS, "openstat", "_openstat", "from"];
const STORE = "byuro:attribution:v1";

let first: Attribution | null = null;
let landingAd: { href: string; referrer: string; query: string } | null = null;

const own = (host: string) => host.replace(/^www\./, "") === window.location.host.replace(/^www\./, "");

export function captureAttribution() {
  if (first || typeof window === "undefined") return;
  const q = new URLSearchParams(window.location.search);
  let refHost: string | null = null;
  try {
    refHost = document.referrer ? new URL(document.referrer).host : null;
  } catch {
    /* ignore */
  }

  // рекламные параметры адреса входа — как есть, для Метрики и для переключателя языка
  const ad = new URLSearchParams();
  for (const [k, v] of q) if (AD_PARAMS.includes(k)) ad.append(k, v);
  if ([...ad.keys()].length) landingAd = { href: window.location.href.split("#")[0], referrer: document.referrer, query: ad.toString() };

  const a: Attribution = {};
  for (const k of UTM) {
    const v = q.get(k)?.trim();
    if (v) a[k] = v.slice(0, 120);
  }
  const ids = CLICK_IDS.filter((k) => q.has(k));
  if (ids.length) a.clickIds = ids;
  if (refHost && !own(refHost)) a.referrer = refHost;
  a.landing = window.location.pathname;

  // перешли сюда с нашей же страницы (смена языка — обычная перезагрузка, метки могли быть
  // перенесены в адрес) — продолжаем сводку первого входа этой вкладки
  if (refHost && own(refHost)) {
    try {
      const saved = JSON.parse(sessionStorage.getItem(STORE) ?? "null") as Attribution | null;
      if (saved && typeof saved === "object") {
        first = saved;
        return;
      }
    } catch {
      /* ignore */
    }
  }
  // пришли с нашей же страницы, а сводки первого входа нет (её стёрли или вкладку открыли иначе) —
  // источник неизвестен; это не «прямой заход»
  if (!landingAd && refHost && own(refHost)) a.internalRef = true;
  first = a;
  try {
    sessionStorage.setItem(STORE, JSON.stringify(a));
  } catch {
    /* хранилище недоступно — сводка живёт до перезагрузки */
  }
}

// как можно раньше: при загрузке модуля, до гидратации и первых SPA-переходов
if (typeof window !== "undefined") captureAttribution();

export const getAttribution = (): Attribution => {
  captureAttribution();
  return first ?? {};
};

/** Адрес входа с рекламными параметрами (или null, если их не было) */
export const getLandingAd = () => {
  captureAttribution();
  return landingAd;
};

/** Ссылка на другую языковую версию (обычная перезагрузка страницы): пока Метрика ещё не засчитала визит
    (нет согласия), переносим рекламные параметры, чтобы они не пропали. Если визит уже засчитан —
    не переносим: метки во внутренних переходах заставили бы Метрику начать новый визит. */
export function withLandingAdParams(href: string): string {
  const ad = getLandingAd();
  if (!ad || typeof window === "undefined" || window.__byuroMetrika?.inited) return href;
  const [path, hash] = href.split("#");
  return `${path}${path.includes("?") ? "&" : "?"}${ad.query}${hash !== undefined ? `#${hash}` : ""}`;
}
