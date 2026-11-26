/* Мессенджеры и соцсети для поля «ник/логин».
   Один модуль для браузера и сервера: список сетей, префиксы («@», «vk.com/»),
   разбор вставленных ссылок и проверка ника по правилам каждой сети. */

import type { Locale } from "@/i18n/config";

export type Charset = "lu" | "lu1" | "ldu" | "lh" | "ld" | "luh" | "lduh";

export type Network = {
  id: NetworkId;
  label: string;
  /** что стоит перед ником в поле и в сообщении команде («@», «vk.com/»); "" — без префикса */
  prefix: string;
  /** ссылка на профиль; null — у сети нет публичных ссылок по нику */
  url: ((h: string) => string) | null;
  re: RegExp;
  min: number;
  max: number;
  charset: Charset;
  /** домены, по которым узнаём сеть во вставленной ссылке */
  hosts: string[];
  placeholder: string;
};

export const NETWORK_IDS = ["telegram", "instagram", "vk", "x", "linkedin", "facebook", "threads", "tiktok", "discord", "wechat", "line"] as const;
export type NetworkId = (typeof NETWORK_IDS)[number];
export const isNetworkId = (v: unknown): v is NetworkId => typeof v === "string" && (NETWORK_IDS as readonly string[]).includes(v);

export const NETWORKS: Record<NetworkId, Network> = {
  telegram: { id: "telegram", label: "Telegram", prefix: "@", url: (h) => `https://t.me/${h}`, re: /^[a-z][a-z0-9_]{4,31}$/i, min: 5, max: 32, charset: "lu1", hosts: ["t.me", "telegram.me", "telegram.dog"], placeholder: "username" },
  instagram: { id: "instagram", label: "Instagram", prefix: "@", url: (h) => `https://instagram.com/${h}`, re: /^[a-z0-9._]{1,30}$/i, min: 1, max: 30, charset: "ldu", hosts: ["instagram.com", "instagr.am"], placeholder: "username" },
  vk: { id: "vk", label: "VK", prefix: "vk.com/", url: (h) => `https://vk.com/${h}`, re: /^[a-z0-9_.]{2,32}$/i, min: 2, max: 32, charset: "ldu", hosts: ["vk.com", "vk.ru", "vkontakte.ru"], placeholder: "username" },
  x: { id: "x", label: "X (Twitter)", prefix: "@", url: (h) => `https://x.com/${h}`, re: /^[a-z0-9_]{1,15}$/i, min: 1, max: 15, charset: "lu", hosts: ["x.com", "twitter.com"], placeholder: "username" },
  linkedin: { id: "linkedin", label: "LinkedIn", prefix: "linkedin.com/in/", url: (h) => `https://www.linkedin.com/in/${h}`, re: /^[a-z0-9-]{3,100}$/i, min: 3, max: 100, charset: "lh", hosts: ["linkedin.com"], placeholder: "name-surname" },
  facebook: { id: "facebook", label: "Facebook", prefix: "facebook.com/", url: (h) => `https://facebook.com/${h}`, re: /^[a-z0-9.]{5,50}$/i, min: 5, max: 50, charset: "ld", hosts: ["facebook.com", "fb.com", "fb.me"], placeholder: "username" },
  threads: { id: "threads", label: "Threads", prefix: "@", url: (h) => `https://www.threads.com/@${h}`, re: /^[a-z0-9._]{1,30}$/i, min: 1, max: 30, charset: "ldu", hosts: ["threads.net", "threads.com"], placeholder: "username" },
  tiktok: { id: "tiktok", label: "TikTok", prefix: "@", url: (h) => `https://www.tiktok.com/@${h}`, re: /^[a-z0-9._]{2,24}$/i, min: 2, max: 24, charset: "ldu", hosts: ["tiktok.com"], placeholder: "username" },
  discord: { id: "discord", label: "Discord", prefix: "", url: null, re: /^[a-z0-9_.]{2,32}$/i, min: 2, max: 32, charset: "ldu", hosts: [], placeholder: "username" },
  wechat: { id: "wechat", label: "WeChat", prefix: "", url: null, re: /^[a-z][a-z0-9_-]{5,19}$/i, min: 6, max: 20, charset: "luh", hosts: [], placeholder: "WeChat ID" },
  line: { id: "line", label: "LINE", prefix: "", url: (h) => `https://line.me/ti/p/~${h}`, re: /^[a-z0-9._-]{4,20}$/i, min: 4, max: 20, charset: "lduh", hosts: ["line.me"], placeholder: "LINE ID" },
};

/** Порядок в списке — по популярности для аудитории каждой версии сайта */
const ORDER: Partial<Record<Locale, NetworkId[]>> = {
  ru: ["telegram", "instagram", "vk", "threads", "tiktok", "x", "linkedin", "facebook", "discord", "wechat", "line"],
  "zh-cn": ["wechat", "telegram", "instagram", "linkedin", "x", "facebook", "threads", "tiktok", "discord", "line", "vk"],
  ja: ["line", "telegram", "instagram", "x", "linkedin", "facebook", "threads", "tiktok", "discord", "wechat", "vk"],
};
const DEFAULT_ORDER: NetworkId[] = ["telegram", "instagram", "linkedin", "facebook", "x", "threads", "tiktok", "discord", "wechat", "line", "vk"];
export const networksFor = (locale: Locale): NetworkId[] => ORDER[locale] ?? DEFAULT_ORDER;

/** Мессенджеры, которые можно отметить у телефона («можно написать в …») */
export const PHONE_APPS = ["whatsapp", "telegram", "viber", "max", "signal", "wechat", "line"] as const;
export type PhoneApp = (typeof PHONE_APPS)[number];
export const PHONE_APP_LABEL: Record<PhoneApp, string> = { whatsapp: "WhatsApp", telegram: "Telegram", viber: "Viber", max: "MAX", signal: "Signal", wechat: "WeChat", line: "LINE" };
const APPS_ORDER: Partial<Record<Locale, PhoneApp[]>> = {
  ru: ["whatsapp", "telegram", "max", "viber"],
  "zh-cn": ["wechat", "whatsapp", "telegram"],
  ja: ["line", "whatsapp", "telegram"],
};
export const phoneAppsFor = (locale: Locale): PhoneApp[] => APPS_ORDER[locale] ?? ["whatsapp", "telegram", "viber", "signal"];
export const isPhoneApp = (v: unknown): v is PhoneApp => typeof v === "string" && (PHONE_APPS as readonly string[]).includes(v);

/** Сеть по домену во вставленной ссылке */
function networkByHost(host: string): NetworkId | null {
  const h = host.toLowerCase().replace(/^(www|m|mobile)\./, "");
  for (const id of NETWORK_IDS) if (NETWORKS[id].hosts.some((x) => h === x || h.endsWith(`.${x}`))) return id;
  return null;
}

/** Разбор ввода: «@Name», «https://t.me/name», «instagram.com/name/?igsh=…», «vk.com/id123».
    Если вставлена ссылка на другую сеть — возвращает её id (поле переключится само). */
export function parseHandleInput(raw: string, current: NetworkId): { network: NetworkId; handle: string } {
  let s = raw.trim();
  if (!s) return { network: current, handle: "" };
  const urlLike = s.match(/^(?:https?:\/\/)?([a-z0-9.-]+\.[a-z]{2,})(\/[^\s]*)?$/i);
  if (urlLike) {
    const net = networkByHost(urlLike[1]);
    if (net) {
      let path = (urlLike[2] ?? "").split(/[?#]/)[0].replace(/^\/+|\/+$/g, "");
      if (net === "linkedin") path = path.replace(/^(in|company)\//i, "");
      if (net === "line") path = path.replace(/^ti\/p\/~?/i, "");
      if (net === "facebook" && /^profile\.php/i.test(path)) path = (urlLike[2]?.match(/id=(\d+)/)?.[1] ?? "");
      return { network: net, handle: path.split("/")[0].replace(/^@/, "") };
    }
  }
  s = s.replace(/\s+/g, "");
  const p = NETWORKS[current].prefix;
  if (p && p !== "@" && s.toLowerCase().startsWith(p.toLowerCase())) s = s.slice(p.length);
  return { network: current, handle: s.replace(/^@+/, "") };
}

export type HandleError = "handleInvalid";
export const checkHandle = (network: NetworkId, handle: string): HandleError | null => (NETWORKS[network].re.test(handle) ? null : "handleInvalid");

/** Как показать ник команде: «@name», «vk.com/name», «name» */
export const displayHandle = (network: NetworkId, handle: string) => `${NETWORKS[network].prefix}${handle}`;
export const profileUrl = (network: NetworkId, handle: string) => NETWORKS[network].url?.(handle) ?? null;
