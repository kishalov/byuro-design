import { NextResponse } from "next/server";
import { getCalcDict } from "@/i18n/calculator/get";
import { calcCurrency } from "@/lib/calculator/format";
import { computeQuote, parseSelection, selectionSignature } from "@/lib/calculator/engine";
import { IDEMPOTENCY_RE, isCalcId, newBriefId } from "@/lib/calculator/ids";
import { str, toLocale, toTimeZone } from "@/lib/calculator/server";
import { clientKeys, projectFingerprint } from "@/lib/brief/dedupe";
import { deliverBrief, getBriefStore, isBriefDeliveryConfigured, type BriefRecord } from "@/lib/brief/delivery";
import { LIMITS, extractLinks, normalizeContacts, validateBrief, type BriefRequest } from "@/lib/brief/schema";
import { briefText } from "@/lib/brief/text";
import { checkSubmission, diagnosticsLines, logDecision, markDelivered } from "@/lib/antispam/guard";
import { getKv } from "@/lib/antispam/kv";
import { turnstileSiteKey } from "@/lib/antispam/turnstile";

const getKvRef = (key: string) => getKv().get(key).catch(() => null);
import { getDict } from "@/i18n/get";
import { appsLine, phoneLine, socialLine } from "@/lib/contacts/format";
import { checkPhone } from "@/lib/contacts/phone";
import { cleanContacts } from "@/lib/contacts/validate";

/* Приём брифа из калькулятора.

   Контракт:
   POST /api/brief  (JSON: BriefRequest из src/lib/brief/schema.ts)
   200 { ok: true, briefId, duplicate?: "same_request" | "same_project" }
   400 { error: "validation", fields } | { error: "selection" | "calc_id" | "idempotency" | "empty" | "bad_json" }
   429 { error: "rate_limited" }
   503 { error: "not_configured" } — не заданы TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID (см. src/lib/brief/delivery.ts)
   502 { error: "delivery_failed" }

   Стоимость и сроки всегда пересчитываются здесь по selection — суммы из браузера не принимаются. */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DUPLICATE_WINDOW = 24 * 60 * 60 * 1000;
const inFlight = new Map<string, Promise<Response>>();

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }
  if (!body || typeof body !== "object") return NextResponse.json({ error: "bad_json" }, { status: 400 });

  // Бот заполнил скрытое поле — отвечаем «ок», но ничего не делаем (как /api/lead); решение — в журнал
  if (typeof body.website === "string" && body.website.trim()) {
    const d = await checkSubmission(req, { route: "brief", body, contacts: [], content: "honeypot" });
    await logDecision(d, "brief");
    return NextResponse.json({ ok: true, accepted: false });
  }

  const idem = typeof body.idempotencyKey === "string" && IDEMPOTENCY_RE.test(body.idempotencyKey) ? body.idempotencyKey : null;
  if (!idem) return NextResponse.json({ error: "idempotency" }, { status: 400 });

  // Двойное нажатие, пока первый запрос ещё обрабатывается: отдаём тот же результат
  const running = inFlight.get(idem);
  if (running) return (await running).clone();
  const p = handle(req, body, idem);
  inFlight.set(idem, p);
  try {
    return (await p).clone();
  } finally {
    inFlight.delete(idem);
  }
}

async function handle(req: Request, body: Record<string, unknown>, idem: string): Promise<Response> {
  const input: Partial<BriefRequest> = {
    name: str(body.name, LIMITS.name),
    phone: str(body.phone, LIMITS.phone),
    phoneCountry: str(body.phoneCountry, 2),
    phoneApps: Array.isArray(body.phoneApps) ? body.phoneApps.filter((x): x is string => typeof x === "string").slice(0, 10) : undefined,
    social: body.social && typeof body.social === "object" ? { network: str((body.social as Record<string, unknown>).network, 20) ?? "", handle: str((body.social as Record<string, unknown>).handle, 120) ?? "" } : null,
    telegram: str(body.telegram, LIMITS.telegram),
    email: str(body.email, LIMITS.email),
    company: str(body.company, LIMITS.company),
    description: str(body.description, LIMITS.description),
    deadline: str(body.deadline, LIMITS.deadline),
    links: str(body.links, LIMITS.links),
    comment: str(body.comment, LIMITS.comment),
    projectName: str(body.projectName, LIMITS.projectName),
    consent: body.consent === true,
  };
  const fields = validateBrief(input, checkPhone);
  if (Object.keys(fields).length) return NextResponse.json({ error: "validation", fields }, { status: 400 });

  const locale = toLocale(body.locale);
  if (!locale) return NextResponse.json({ error: "validation" }, { status: 400 });
  if (!isCalcId(body.calcId)) return NextResponse.json({ error: "calc_id" }, { status: 400 });
  const parsed = parseSelection(body.selection, true);
  if (!parsed.ok) return NextResponse.json({ error: "selection" }, { status: 400 });
  const quote = computeQuote(parsed.selection, calcCurrency(locale));
  if (quote.isEmpty) return NextResponse.json({ error: "empty" }, { status: 400 });

  const store = getBriefStore();
  const same = await store.findByIdempotencyKey(idem);
  if (same) return NextResponse.json({ ok: true, accepted: true, briefId: same.briefId, duplicate: "same_request" });

  const normalized = normalizeContacts(input);
  const cc = cleanContacts({ phone: input.phone, phoneCountry: input.phoneCountry, phoneApps: input.phoneApps, social: input.social });
  const keys = await clientKeys(normalized);
  const signature = selectionSignature(parsed.selection);
  const clean = (v?: string) => (v && v.trim() ? v.trim() : null);
  const fingerprint = await projectFingerprint(keys, signature, input);

  // Антиспам: частота, Turnstile, эвристики, повторы
  const guard = await checkSubmission(req, {
    route: "brief",
    body,
    name: input.name,
    text: [input.description, input.comment, input.links].filter(Boolean).join("\n"),
    contacts: [cc.phone && `phone:${cc.phone}`, cc.social && `social:${cc.social.network}:${cc.social.handle.toLowerCase()}`, normalized.email && `email:${normalized.email}`].filter(Boolean) as string[],
    content: fingerprint,
  });
  if (guard.verdict !== "accepted") {
    await logDecision(guard, "brief");
    if (guard.verdict === "blocked") return NextResponse.json({ error: guard.error }, { status: guard.status });
    if (guard.verdict === "dropped") return NextResponse.json({ ok: true, accepted: false });
    // та же заявка уже была — для формы это успех, но цель Метрики второй раз не засчитывается
    return NextResponse.json({ ok: true, accepted: true, briefId: (await getKvRef(guard.dupKey)) ?? "—", duplicate: "same_project" });
  }

  const now = new Date();
  const record: BriefRecord = {
    version: 1,
    briefId: newBriefId(now),
    calcId: body.calcId,
    idempotencyKey: idem,
    createdAt: now.toISOString(),
    timeZone: toTimeZone(body.timeZone),
    locale,
    client: {
      name: input.name!.trim(),
      phone: cc.phone,
      phoneCountry: cc.phoneCountry,
      phoneApps: cc.phoneApps,
      social: cc.social,
      telegram: cc.social?.network === "telegram" ? cc.social.handle : clean(input.telegram),
      email: clean(input.email),
      normalized,
      keys,
    },
    project: {
      projectName: clean(input.projectName),
      company: clean(input.company),
      description: clean(input.description),
      deadline: clean(input.deadline),
      links: extractLinks(input.links),
      comment: clean(input.comment),
    },
    calculation: { selection: parsed.selection, quote, signature },
    fingerprint,
    repeat: { checked: false, isRepeatClient: null, previousBriefIds: [] },
  };

  // Режим разработки: посмотреть подготовленную заявку без отправки (на продакшене недоступен)
  const dryRun = process.env.NODE_ENV !== "production" && body.dryRun === true;

  if (!isBriefDeliveryConfigured() && !dryRun) {
    console.error("[brief] TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID не заданы — бриф некуда отправить");
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  const dup = await store.findByFingerprint(fingerprint, DUPLICATE_WINDOW);
  if (dup && !dryRun) return NextResponse.json({ ok: true, accepted: true, briefId: dup.briefId, duplicate: "same_project" });

  if (store.persistent) {
    const prev = await store.findByClientKeys(keys, 5);
    record.repeat = { checked: true, isRepeatClient: prev.length > 0, previousBriefIds: prev.map((b) => b.briefId) };
  }

  const ru = await getCalcDict("ru");
  const flags = record.repeat.isRepeatClient ? [`🔁 Повторное обращение: ${record.repeat.previousBriefIds.join(", ")}`] : [];
  const textRu = briefText(ru, "ru", {
    briefId: record.briefId,
    calcId: record.calcId,
    createdAt: now,
    timeZone: record.timeZone ?? undefined,
    locale,
    quote,
    projectName: record.project.projectName ?? undefined,
    name: record.client.name,
    phone: cc.phone ? phoneLine(cc.phone, cc.phoneCountry) : null,
    phoneApps: cc.phoneApps.length ? appsLine(cc.phoneApps) : null,
    appsLabel: (await getDict("ru")).contactFields.apps,
    social: cc.social ? socialLine(cc.social.network, cc.social.handle) : null,
    telegram: normalized.telegram ?? record.client.telegram,
    email: record.client.email,
    company: record.project.company ?? undefined,
    description: record.project.description ?? undefined,
    deadline: record.project.deadline ?? undefined,
    links: record.project.links,
    comment: record.project.comment ?? undefined,
    flags: [...flags, ...diagnosticsLines(guard, { locale })], // номер заявки — уже в заголовке
  });

  if (dryRun) return NextResponse.json({ ok: true, accepted: true, dryRun: true, record, textRu });

  const { delivered } = await deliverBrief(record, textRu);
  if (!delivered.length) {
    await logDecision(guard, "brief", { delivery: "failed" });
    return NextResponse.json({ error: "delivery_failed" }, { status: 502 });
  }

  await store.save({ briefId: record.briefId, createdAt: record.createdAt, idempotencyKey: idem, fingerprint, clientKeys: keys });
  await markDelivered(guard, record.briefId);
  await logDecision(guard, "brief", { ref: record.briefId, delivery: "ok" });
  return NextResponse.json({ ok: true, accepted: true, briefId: record.briefId });
}

/** Включена ли отправка — для клиента, если страница закэширована дольше, чем меняется конфигурация */
export function GET() {
  return NextResponse.json({ enabled: isBriefDeliveryConfigured(), turnstileSiteKey: turnstileSiteKey() }, { headers: { "Cache-Control": "no-store" } });
}
