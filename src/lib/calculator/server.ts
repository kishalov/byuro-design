import "server-only";
import { isLocale, type Locale } from "@/i18n/config";

/* Общие серверные утилиты для /api/brief и /api/quote-pdf */

const hits = new Map<string, number[]>();

/** Простой лимит запросов на инстанс (как в /api/lead) */
export function rateLimited(req: Request, bucket: string, limit: number, windowMs = 60_000): boolean {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const key = `${bucket}:${ip}`;
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) return true;
  hits.set(key, [...recent, now]);
  if (hits.size > 5000) hits.clear();
  return false;
}

export const toLocale = (v: unknown): Locale | null => (typeof v === "string" && isLocale(v) ? v : null);

/** IANA-зона из браузера; некорректную отбрасываем */
export function toTimeZone(v: unknown): string | null {
  if (typeof v !== "string" || v.length > 64) return null;
  try {
    new Intl.DateTimeFormat("en", { timeZone: v });
    return v;
  } catch {
    return null;
  }
}

export const str = (v: unknown, max: number): string | undefined => (typeof v === "string" ? v.slice(0, max + 1) : undefined);
