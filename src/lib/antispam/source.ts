/* Источник заявки — по рекламным меткам и сайту-источнику, сохранённым в браузере при входе
   (src/lib/attribution.ts, sessionStorage вкладки). Только то, что определяется достоверно:
   рекламный click-id или явная UTM-метка, домен источника (реферер). Нет данных — Direct или Unknown.
   Страна по телефонному коду не определяется: номер не говорит, где человек находится. */

import type { Attribution } from "./guard";

export type SourceKind = "Yandex Ads" | "Google Ads" | "Social Ads" | "Ads" | "Yandex" | "Google" | "Search" | "Social" | "Email" | "UTM" | "Referral" | "Direct" | "Unknown";
export type Source = { kind: SourceKind; detail: string[] };

const PAID = /^(cpc|ppc|cpm|cpa|cpv|paid|paid[_-]?\w*|ads?|display|banner|retargeting|remarketing|context|kontekst)$/i;
const YANDEX = /^(yandex|ya|direct|yandex[_-]?direct|ya[_-]?direct|yadirect|rsya|yandex[_-]?\w+)$/i;
const GOOGLE = /^(google|adwords|google[_-]?ads|gads)$/i;
const SOCIAL_SRC = /^(vk|vkontakte|vk[_-]?ads|telegram|tg|t\.me|instagram|ig|facebook|fb|meta|ok|odnoklassniki|youtube|yt|tiktok|twitter|x|linkedin|pinterest|dzen|threads|reddit|whatsapp)$/i;
const SOCIAL_HOST = /(^|\.)(vk\.com|vk\.ru|t\.me|telegram\.org|web\.telegram\.org|instagram\.com|facebook\.com|fb\.com|ok\.ru|youtube\.com|youtu\.be|tiktok\.com|twitter\.com|x\.com|linkedin\.com|lnkd\.in|pinterest\.\w+|dzen\.ru|threads\.net|reddit\.com|whatsapp\.com)$/i;
const SEARCH_HOST = /(^|\.)(bing\.com|duckduckgo\.com|search\.yahoo\.com|yahoo\.com|ecosia\.org|baidu\.com|naver\.com|mail\.ru|rambler\.ru|yandex\.com\.tr)$/i;

export function classifySource(a: Attribution & { internalRef?: boolean }): Source {
  const src = a.utm_source?.toLowerCase() ?? "";
  const med = a.utm_medium?.toLowerCase() ?? "";
  const ids = a.clickIds ?? [];
  const utm = [a.utm_source, a.utm_medium].filter(Boolean).join(" / ");
  const d = (...x: (string | false | undefined)[]) => x.filter(Boolean) as string[];
  const ref = a.referrer?.toLowerCase();

  // 1. рекламный click-id — его ставит сама рекламная система
  if (ids.includes("yclid")) return { kind: "Yandex Ads", detail: d("yclid", utm && `utm: ${utm}`) };
  if (ids.includes("gclid")) return { kind: "Google Ads", detail: d("gclid", utm && `utm: ${utm}`) };
  const socialId = ids.find((x) => ["fbclid", "vkclid", "ttclid"].includes(x));
  if (socialId) return { kind: "Social Ads", detail: d(socialId, utm && `utm: ${utm}`) };
  if (ids.includes("msclkid")) return { kind: "Ads", detail: d("msclkid (Microsoft Ads)", utm && `utm: ${utm}`) };

  // 2. явные UTM-метки
  if (src) {
    if (YANDEX.test(src) && PAID.test(med)) return { kind: "Yandex Ads", detail: d(`utm: ${utm}`) };
    if (GOOGLE.test(src) && PAID.test(med)) return { kind: "Google Ads", detail: d(`utm: ${utm}`) };
    if (SOCIAL_SRC.test(src) && PAID.test(med)) return { kind: "Social Ads", detail: d(`utm: ${utm}`) };
    if (SOCIAL_SRC.test(src) || /^(social|smm|soc)$/i.test(med)) return { kind: "Social", detail: d(`utm: ${utm}`) };
    if (/^(email|e-mail|newsletter|mail|rassylka)$/i.test(med)) return { kind: "Email", detail: d(`utm: ${utm}`) };
    return { kind: "UTM", detail: d(`utm: ${utm}`) }; // метка есть, но система неизвестна — показываем как есть
  }

  // 3. сайт-источник (реферер)
  if (ref) {
    if (/(^|\.)(yandex\.(ru|com|by|kz|uz|com\.tr)|ya\.ru)$/.test(ref)) return { kind: "Yandex", detail: d("поиск/сервисы Яндекса", ref) };
    if (/(^|\.)google\.[a-z.]+$/.test(ref)) return { kind: "Google", detail: d("поиск Google", ref) };
    if (SEARCH_HOST.test(ref)) return { kind: "Search", detail: d(ref) };
    if (SOCIAL_HOST.test(ref)) return { kind: "Social", detail: d(ref) };
    return { kind: "Referral", detail: d(ref) };
  }

  // 4. ни меток, ни реферера
  if (a.internalRef) return { kind: "Unknown", detail: d("данных о первом входе нет") };
  return { kind: "Direct", detail: d("без меток и сайта-источника") };
}
