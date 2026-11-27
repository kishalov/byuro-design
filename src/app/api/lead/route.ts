import { NextResponse } from "next/server";
import { newLeadId } from "@/lib/calculator/ids";
import { checkSubmission, diagnosticsLines, logDecision, markDelivered } from "@/lib/antispam/guard";
import { turnstileSiteKey } from "@/lib/antispam/turnstile";
import { appLink, appsLine, phoneLine, socialLine } from "@/lib/contacts/format";
import { checkPhone } from "@/lib/contacts/phone";
import { cleanContacts } from "@/lib/contacts/validate";
import { validateLead, type LeadPayload } from "@/lib/lead";

/* Приём заявок. Отправляет их в Telegram-чат команды.
   Нужны переменные окружения TELEGRAM_BOT_TOKEN и TELEGRAM_CHAT_ID.
   Пока они не заданы, отвечает 503 и форма честно показывает ошибку
   с прямыми контактами: успех не имитируется. */

export const runtime = "nodejs";

/* Антиспам — src/lib/antispam/guard.ts (honeypot, частота, Turnstile, эвристики, повторы).
   Ответ формы: { ok: true, accepted: true } — заявка принята и отправлена (только тогда форма
   засчитывает цель Метрики); { ok: true, accepted: false } — «тихо» отклонена как спам;
   { ok: true, accepted: true, duplicate: true } — такая же заявка уже была, повторно не шлём. */

const esc = (s: string) => s.replace(/[&<>]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[ch]!);

export async function POST(req: Request) {
  let body: Partial<LeadPayload>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }

  if (!body || typeof body !== "object") return NextResponse.json({ error: "bad_json" }, { status: 400 });
  const raw = body as Record<string, unknown>;

  // Бот заполнил скрытое поле — делаем вид, что всё хорошо, но ничего не шлём (решение пишется в журнал)
  if (typeof raw.website === "string" && raw.website.trim()) {
    const d = await checkSubmission(req, { route: "lead", body: raw, contacts: [], content: "honeypot" });
    await logDecision(d, "lead");
    return NextResponse.json({ ok: true, accepted: false });
  }

  if (body.type !== "project" && body.type !== "partner") return NextResponse.json({ error: "validation" }, { status: 400 });
  const fields = validateLead(body, checkPhone);
  if (Object.keys(fields).length) return NextResponse.json({ error: "validation", fields }, { status: 400 });

  // Режим разработки: вернуть готовый текст без отправки (на продакшене недоступен)
  const dryRun = process.env.NODE_ENV !== "production" && (body as { dryRun?: boolean }).dryRun === true;

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chat = process.env.TELEGRAM_CHAT_ID;
  if ((!token || !chat) && !dryRun) {
    console.error("[lead] TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID не заданы");
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  const s = (v?: string) => esc(String(v ?? "").trim().slice(0, 2000));
  const a = (href: string, text: string) => `<a href="${esc(href).replace(/"/g, "&quot;")}">${esc(text)}</a>`;

  // Контакты: номер в международном формате со страной и ссылками «написать», ник со ссылкой на профиль
  const c = cleanContacts({ phone: body.phone, phoneCountry: body.phoneCountry, phoneApps: body.phoneApps, social: body.social });

  // Антиспам: частота, Turnstile, эвристики, повторы
  const contactIds = [c.phone && `phone:${c.phone}`, c.social && `social:${c.social.network}:${c.social.handle.toLowerCase()}`, !c.phone && !c.social && body.contact && `legacy:${String(body.contact).toLowerCase().trim()}`].filter(Boolean) as string[];
  const guard = await checkSubmission(req, {
    route: "lead",
    body: raw,
    name: body.name,
    text: body.message,
    contacts: contactIds,
    content: JSON.stringify([body.type, contactIds, (body.message ?? "").trim().toLowerCase(), body.services ?? [], body.role ?? ""]),
  });
  if (guard.verdict !== "accepted") {
    await logDecision(guard, "lead");
    if (guard.verdict === "blocked") return NextResponse.json({ error: guard.error }, { status: guard.status });
    return NextResponse.json({ ok: true, accepted: guard.verdict === "duplicate", duplicate: guard.verdict === "duplicate" || undefined });
  }
  const contactLines: string[] = [];
  if (c.phone) {
    const links = c.phoneApps.map((app) => {
      const href = appLink(app, c.phone!);
      return href ? a(href, appsLine([app])) : esc(appsLine([app]));
    });
    contactLines.push(`<b>Телефон:</b> ${esc(phoneLine(c.phone, c.phoneCountry))}${links.length ? `\n<b>Можно написать в:</b> ${links.join(", ")}` : ""}`);
  }
  if (c.social) {
    const sl = socialLine(c.social.network, c.social.handle);
    contactLines.push(`<b>${esc(sl.label)}:</b> ${sl.url ? a(sl.url, sl.text) : esc(sl.text)}`);
  }
  if (!contactLines.length && body.contact) contactLines.push(`<b>Контакт:</b> ${s(body.contact)}`);

  const lines =
    body.type === "project"
      ? [
          "<b>🟠 Новая заявка на проект</b>",
          `<b>Имя:</b> ${s(body.name)}`,
          ...contactLines,
          body.services?.length ? `<b>Нужно:</b> ${s(body.services.join(", "))}` : "",
          body.message ? `<b>Задача:</b>\n${s(body.message)}` : "",
        ]
      : [
          "<b>🤝 Заявка на партнёрство</b>",
          `<b>Имя:</b> ${s(body.name)}`,
          ...contactLines,
          `<b>Кто:</b> ${s(body.role)}`,
          body.model ? `<b>Модель:</b> ${s(body.model)}` : "",
          body.message ? `<b>Комментарий:</b>\n${s(body.message)}` : "",
        ];
  // заявка, пустая строка, блок: источник, кампания, объявление, язык страницы, номер, антиспам, устройство
  const leadId = newLeadId();
  const text = `${lines.filter(Boolean).join("\n")}\n\n${diagnosticsLines(guard, { id: leadId, locale: typeof body.locale === "string" ? body.locale : undefined }).map(esc).join("\n")}`;

  if (dryRun) return NextResponse.json({ ok: true, dryRun: true, accepted: true, text });

  try {
    const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chat, text, parse_mode: "HTML", link_preview_options: { is_disabled: true } }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!r.ok) throw new Error(`telegram ${r.status}`);
  } catch (e) {
    console.error("[lead] delivery failed", e);
    await logDecision(guard, "lead", { delivery: "failed" });
    return NextResponse.json({ error: "delivery_failed" }, { status: 502 });
  }

  await markDelivered(guard, leadId);
  await logDecision(guard, "lead", { ref: leadId, delivery: "ok" });
  return NextResponse.json({ ok: true, accepted: true, leadId });
}

/** Настройки для формы: ключ Turnstile (без пересборки сайта при его смене) */
export function GET() {
  return NextResponse.json({ turnstileSiteKey: turnstileSiteKey() }, { headers: { "Cache-Control": "no-store" } });
}
