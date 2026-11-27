import "server-only";
/* Cloudflare Turnstile — проверка «не бот» без капчи с картинками.
   Включается, когда заданы TURNSTILE_SITE_KEY и TURNSTILE_SECRET_KEY (переменные окружения Vercel).
   Токен из браузера обязательно проверяется здесь, на сервере (siteverify), вместе с действием
   и доменом. Если Cloudflare недоступен у посетителя (виджет не загрузился), по умолчанию заявка
   не отклоняется, а проходит усиленные проверки и помечается; строгий режим — TURNSTILE_STRICT=1. */

export type TurnstileStatus = "ok" | "failed" | "missing" | "unavailable" | "off";
export type TurnstileResult = { status: TurnstileStatus; codes?: string[] };

export const turnstileSiteKey = () => process.env.TURNSTILE_SITE_KEY || process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || null;
export const turnstileEnabled = () => Boolean(turnstileSiteKey() && process.env.TURNSTILE_SECRET_KEY);
export const turnstileStrict = () => process.env.TURNSTILE_STRICT === "1";

const hostOk = (h: string | undefined, reqHost: string | null) => {
  if (!h) return false;
  const allowed = (process.env.TURNSTILE_HOSTNAMES || "byuro.online,www.byuro.online,localhost").split(",").map((s) => s.trim());
  return allowed.includes(h) || h === reqHost?.split(":")[0] || h.endsWith(".vercel.app");
};

export async function verifyTurnstile(token: unknown, opts: { ip: string | null; action: string; host: string | null }): Promise<TurnstileResult> {
  if (!turnstileEnabled()) return { status: "off" };
  if (typeof token !== "string" || !token || token.length > 2048) return { status: "missing" };
  try {
    const body = new URLSearchParams({ secret: process.env.TURNSTILE_SECRET_KEY!, response: token, idempotency_key: crypto.randomUUID() });
    if (opts.ip) body.set("remoteip", opts.ip);
    const r = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body, signal: AbortSignal.timeout(5000), cache: "no-store" });
    const d = (await r.json()) as { success?: boolean; action?: string; hostname?: string; "error-codes"?: string[] };
    if (!d.success) return { status: "failed", codes: d["error-codes"] ?? [] };
    if (d.action && d.action !== opts.action) return { status: "failed", codes: [`action:${d.action}`] };
    if (!hostOk(d.hostname, opts.host)) return { status: "failed", codes: [`hostname:${d.hostname}`] };
    return { status: "ok" };
  } catch (e) {
    // сам Cloudflare не ответил — это не вина посетителя
    console.error("[antispam] turnstile siteverify unavailable", e);
    return { status: "unavailable", codes: ["siteverify_unreachable"] };
  }
}
