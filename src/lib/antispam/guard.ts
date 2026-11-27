import "server-only";
/* Антиспам для форм заявок (/api/lead и /api/brief). Порядок проверок:
   1. honeypot — скрытое поле заполнено → «тихий» отказ (бот видит успех, заявка не отправляется);
   2. частота с одного устройства/сети (по псевдониму IP): не больше 5 за 10 минут и 15 за сутки → 429;
   3. Cloudflare Turnstile (если подключён): токен проверяется на сервере; неверный → 403;
      нет токена (виджет не загрузился) → строгий режим 403, обычный — +балл подозрительности;
   4. эвристики (баллы): заполнено быстрее 3 секунд, не было ни одного касания/ввода в форме,
      бот-подобный браузер, ссылки в имени, много ссылок в тексте; 3+ балла → отказ 403
      (видимый: если это всё-таки человек, форма предложит написать в Telegram);
   5. частота по контакту (тот же телефон/ник): не больше 3 заявок в час → 429;
   6. повтор той же заявки за 24 часа → ответ «принято» без повторной отправки и без цели Метрики.
   Каждое решение пишется в журнал (без имён и контактов, IP — только псевдоним), 30 дней. */

import { getKv } from "./kv";
import { pseudonym, requestInfo, type RequestInfo } from "./request";
import { turnstileEnabled, turnstileStrict, verifyTurnstile, type TurnstileResult } from "./turnstile";

export type Route = "lead" | "brief";
export type Attribution = { utm_source?: string; utm_medium?: string; utm_campaign?: string; utm_content?: string; utm_term?: string; clickIds?: string[]; referrer?: string; landing?: string };
export type ClientMeta = { elapsedMs: number | null; interacted: boolean; turnstile: string | null; turnstileError: string | null; attribution: Attribution };

export type Verdict = "accepted" | "duplicate" | "dropped" | "blocked";
export type Decision = {
  verdict: Verdict;
  /** для blocked: HTTP-статус и код ошибки для формы */
  status?: number;
  error?: string;
  reasons: string[];
  score: number;
  turnstile: TurnstileResult;
  info: RequestInfo;
  meta: ClientMeta;
  logId: string;
  dupKey: string;
};

const LOG_KEY = "antispam:log";
const LOG_TTL = 30 * 24 * 3600; // журнал — 30 дней
const LOG_MAX = 2000;

const s = (v: unknown, max = 120) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : undefined);

/** Метаданные формы из запроса — всё необязательное и обрезанное по длине */
export function readClientMeta(body: Record<string, unknown>): ClientMeta {
  const m = (body.meta && typeof body.meta === "object" ? body.meta : {}) as Record<string, unknown>;
  const a = (m.attribution && typeof m.attribution === "object" ? m.attribution : {}) as Record<string, unknown>;
  const elapsed = typeof m.elapsedMs === "number" && Number.isFinite(m.elapsedMs) ? Math.max(0, Math.min(m.elapsedMs, 24 * 3600_000)) : null;
  return {
    elapsedMs: elapsed,
    interacted: m.interacted === true,
    turnstile: s(m.turnstile, 2048) ?? null,
    turnstileError: s(m.turnstileError, 60) ?? null,
    attribution: {
      utm_source: s(a.utm_source),
      utm_medium: s(a.utm_medium),
      utm_campaign: s(a.utm_campaign),
      utm_content: s(a.utm_content),
      utm_term: s(a.utm_term),
      clickIds: Array.isArray(a.clickIds) ? a.clickIds.filter((x): x is string => typeof x === "string" && /^[a-z_]{2,12}$/.test(x)).slice(0, 5) : undefined,
      referrer: s(a.referrer, 100),
      landing: s(a.landing, 200),
    },
  };
}

const urls = (t: string) => (t.match(/https?:\/\/|www\.|\b[a-z0-9-]+\.(?:com|ru|net|org|io|xyz|top|info|biz|site|online)\b/gi) ?? []).length;

export async function checkSubmission(
  req: Request,
  o: { route: Route; body: Record<string, unknown>; name?: string; text?: string; contacts: string[]; content: string },
): Promise<Decision> {
  const kv = getKv();
  const info = await requestInfo(req);
  const meta = readClientMeta(o.body);
  const reasons: string[] = [];
  let score = 0;
  const logId = crypto.randomUUID().slice(0, 8);
  const dupKey = `dup:${o.route}:${await pseudonym(`content:${o.content}`, 24)}`;
  const base = { info, meta, logId, dupKey };
  const decide = (verdict: Verdict, extra: Partial<Decision> = {}): Decision => ({ verdict, reasons, score, turnstile: { status: "off" }, ...base, ...extra });
  const safe = async <T,>(p: Promise<T>, fallback: T) => p.catch((e) => (console.error("[antispam] storage", e), fallback));

  // 1. honeypot
  if (typeof o.body.website === "string" && o.body.website.trim()) {
    reasons.push("honeypot");
    return decide("dropped");
  }

  // 2. частота по сети/устройству (общая для обеих форм)
  const ten = await safe(kv.incr(`rl:ip:10m:${info.ipHash}:${Math.floor(Date.now() / 600_000)}`, 600), 0);
  const day = await safe(kv.incr(`rl:ip:1d:${info.ipHash}:${Math.floor(Date.now() / 86_400_000)}`, 86_400), 0);
  if (ten > 5 || day > 15) {
    reasons.push(ten > 5 ? "rate_ip_10m" : "rate_ip_day");
    return decide("blocked", { status: 429, error: "rate_limited" });
  }

  // 3. Turnstile
  const ts = await verifyTurnstile(meta.turnstile, { ip: info.ip, action: o.route, host: info.host });
  if (ts.status === "failed") {
    reasons.push("turnstile_failed");
    return decide("blocked", { status: 403, error: "captcha_failed", turnstile: ts });
  }
  if (ts.status === "missing") {
    if (turnstileStrict()) {
      reasons.push("turnstile_missing");
      return decide("blocked", { status: 403, error: "captcha_required", turnstile: ts });
    }
    reasons.push(`turnstile_missing${meta.turnstileError ? `:${meta.turnstileError}` : ""}`);
    score += 1;
  }

  // 4. эвристики
  if (info.device.type === "bot") (reasons.push("bot_user_agent"), (score += 2));
  // нет касаний = нет и времени заполнения: это один признак, а не два (старый кэш страницы тоже так выглядит)
  if (!meta.interacted || meta.elapsedMs === null) (reasons.push("no_interaction"), (score += 1));
  else if (meta.elapsedMs < 3000) (reasons.push(`too_fast:${Math.round(meta.elapsedMs)}ms`), (score += 2));
  if (o.name && urls(o.name) > 0) (reasons.push("link_in_name"), (score += 2));
  if (o.text && urls(o.text) >= 3) (reasons.push("many_links"), (score += 1));
  if (score >= 3) return decide("blocked", { status: 403, error: "suspicious", turnstile: ts });

  // 5. частота по контакту
  for (const c of o.contacts) {
    const n = await safe(kv.incr(`rl:contact:${await pseudonym(c)}:${Math.floor(Date.now() / 3_600_000)}`, 3600), 0);
    if (n > 3) {
      reasons.push("rate_contact");
      return decide("blocked", { status: 429, error: "rate_limited", turnstile: ts });
    }
  }

  // 6. повтор той же заявки
  if (await safe(kv.get(dupKey), null)) {
    reasons.push("duplicate_24h");
    return decide("duplicate", { turnstile: ts });
  }

  return decide("accepted", { turnstile: ts });
}

/** Заявка доставлена — запомнить её для защиты от повторов (24 часа) */
export async function markDelivered(d: Decision, ref: string) {
  await getKv()
    .set(d.dupKey, ref, 86_400)
    .catch((e) => console.error("[antispam] storage", e));
}

/** Запись в журнал: без имён и контактов */
export async function logDecision(d: Decision, route: Route, extra: { ref?: string; delivery?: "ok" | "failed" } = {}) {
  const entry = {
    id: d.logId,
    at: new Date().toISOString(),
    route,
    verdict: d.verdict,
    error: d.error,
    reasons: d.reasons,
    score: d.score,
    turnstile: d.turnstile.status + (d.turnstile.codes?.length ? `:${d.turnstile.codes.join(",")}` : ""),
    fillSec: d.meta.elapsedMs === null ? null : Math.round(d.meta.elapsedMs / 1000),
    device: d.info.device,
    country: d.info.country,
    lang: d.info.lang,
    ip: d.info.ipHash,
    utm: d.meta.attribution,
    ...extra,
  };
  console.log(`[antispam] ${JSON.stringify(entry)}`);
  await getKv()
    .push(LOG_KEY, JSON.stringify(entry), LOG_MAX, LOG_TTL)
    .catch((e) => console.error("[antispam] log storage", e));
  // Отклонённые — коротко в отдельный чат, если он задан (TELEGRAM_SPAM_CHAT_ID)
  const spamChat = process.env.TELEGRAM_SPAM_CHAT_ID;
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (spamChat && token && (d.verdict === "dropped" || (d.verdict === "blocked" && d.error !== "rate_limited"))) {
    const text = [`🚫 Отклонена заявка (${route}) · ${entry.id}`, `Причины: ${d.reasons.join(", ")}`, `Turnstile: ${entry.turnstile}`, deviceLine(d), sourceLine(d)].filter(Boolean).join("\n");
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chat_id: spamChat, text }), signal: AbortSignal.timeout(5000) }).catch(() => {});
  }
}

export async function recentLog(n = 200): Promise<{ persistent: boolean; entries: unknown[] }> {
  const kv = getKv();
  const raw = await kv.list(LOG_KEY, n);
  return { persistent: kv.persistent, entries: raw.map((r) => JSON.parse(r)) };
}

const DEVICE_RU = { mobile: "Телефон", tablet: "Планшет", desktop: "Компьютер", bot: "Бот/скрипт", unknown: "Неизвестно" } as const;
export const deviceLine = (d: Decision) => `📱 ${[DEVICE_RU[d.info.device.type], d.info.device.os, d.info.device.browser, d.info.country].filter(Boolean).join(" · ")}`;
export function sourceLine(d: Decision): string {
  const a = d.meta.attribution;
  const utm = [a.utm_source, a.utm_medium, a.utm_campaign].filter(Boolean).join(" / ");
  const parts = [utm && `utm: ${utm}`, a.utm_content && `content: ${a.utm_content}`, a.utm_term && `term: ${a.utm_term}`, a.clickIds?.length && a.clickIds.join(", "), a.referrer && `откуда: ${a.referrer}`, a.landing && `вход: ${a.landing}`].filter(Boolean);
  return parts.length ? `📈 ${parts.join(" · ")}` : "📈 Источник: прямой заход";
}
const TS_RU: Record<string, string> = { ok: "Turnstile ✓", failed: "Turnstile ✗", missing: "без Turnstile", unavailable: "Turnstile недоступен", off: "Turnstile не подключён" };

/** Строки для сообщения команде о принятой заявке */
export function diagnosticsLines(d: Decision): string[] {
  const fill = d.meta.elapsedMs === null ? null : `заполнено за ${Math.round(d.meta.elapsedMs / 1000)} с`;
  const warn = d.reasons.length ? ` · ⚠️ ${d.reasons.join(", ")}` : "";
  return [`🛡 ${[TS_RU[d.turnstile.status], fill].filter(Boolean).join(" · ")}${warn}`, sourceLine(d), deviceLine(d)];
}

export const antispamConfigured = () => ({ turnstile: turnstileEnabled(), storage: getKv().persistent });
