import "server-only";
/* Технические данные запроса для антиспама и диагностики — без хранения IP-адреса:
   IP превращается в псевдоним (HMAC-SHA256 с секретом сервера, первые 16 символов),
   по которому можно считать частоту и сопоставлять подозрительные отправки,
   но нельзя восстановить сам адрес. Браузер — только тип устройства, ОС и название. */

export type Device = { type: "mobile" | "tablet" | "desktop" | "bot" | "unknown"; os: string | null; browser: string | null };
export type RequestInfo = { ip: string | null; ipHash: string; country: string | null; device: Device; lang: string | null; host: string | null };

const secret = () => process.env.ANTISPAM_SECRET || process.env.TELEGRAM_BOT_TOKEN || "byuro-antispam";

async function hmac(text: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret()), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(text));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0")).join("");
}
/** Псевдоним для любого значения (IP, контакт, отпечаток текста) */
export const pseudonym = async (value: string, len = 16) => (await hmac(value)).slice(0, len);

const BOT_UA = /bot|crawl|spider|slurp|headless|phantom|puppeteer|playwright|selenium|curl|wget|python|httpclient|axios|node-fetch|undici|go-http|java\/|libwww|okhttp|postman|insomnia/i;

export function parseDevice(ua: string | null): Device {
  if (!ua) return { type: "unknown", os: null, browser: null };
  const os = /iPhone|iPad|iPod/.test(ua) ? "iOS" : /Android/.test(ua) ? "Android" : /Windows/.test(ua) ? "Windows" : /Mac OS X|Macintosh/.test(ua) ? "macOS" : /CrOS/.test(ua) ? "ChromeOS" : /Linux/.test(ua) ? "Linux" : null;
  const browser = /YaBrowser/.test(ua) ? "Яндекс Браузер" : /Edg\//.test(ua) ? "Edge" : /OPR\/|Opera/.test(ua) ? "Opera" : /SamsungBrowser/.test(ua) ? "Samsung Internet" : /Firefox|FxiOS/.test(ua) ? "Firefox" : /Chrome|CriOS/.test(ua) ? "Chrome" : /Safari/.test(ua) ? "Safari" : null;
  if (BOT_UA.test(ua)) return { type: "bot", os, browser };
  const type = /iPad|Tablet/.test(ua) || (/Android/.test(ua) && !/Mobile/.test(ua)) ? "tablet" : /Mobi|iPhone|iPod|Android/.test(ua) ? "mobile" : "desktop";
  return { type, os, browser };
}

export async function requestInfo(req: Request): Promise<RequestInfo> {
  const h = req.headers;
  const ip = h.get("x-real-ip") || h.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
  return {
    ip,
    ipHash: await pseudonym(`ip:${ip ?? "unknown"}`),
    country: h.get("x-vercel-ip-country") || null,
    device: parseDevice(h.get("user-agent")),
    lang: h.get("accept-language")?.split(",")[0]?.slice(0, 16) || null,
    host: h.get("host"),
  };
}
