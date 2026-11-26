import { NextResponse } from "next/server";
import { appLink, appsLine, phoneLine, socialLine } from "@/lib/contacts/format";
import { checkPhone } from "@/lib/contacts/phone";
import { cleanContacts } from "@/lib/contacts/validate";
import { validateLead, type LeadPayload } from "@/lib/lead";

/* Приём заявок. Отправляет их в Telegram-чат команды.
   Нужны переменные окружения TELEGRAM_BOT_TOKEN и TELEGRAM_CHAT_ID.
   Пока они не заданы, отвечает 503 и форма честно показывает ошибку
   с прямыми контактами: успех не имитируется. */

export const runtime = "nodejs";

const hits = new Map<string, number[]>(); // простая защита от спама (на инстанс)
const LIMIT = 5;
const WINDOW = 60_000;

const esc = (s: string) => s.replace(/[&<>]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[ch]!);

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW);
  if (recent.length >= LIMIT) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  hits.set(ip, [...recent, now]);

  let body: Partial<LeadPayload>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }

  // Бот заполнил скрытое поле — делаем вид, что всё хорошо, но ничего не шлём
  if (body.website) return NextResponse.json({ ok: true });

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
          `<b>Язык сайта:</b> ${s(body.locale)}`,
          `<b>Имя:</b> ${s(body.name)}`,
          ...contactLines,
          body.services?.length ? `<b>Нужно:</b> ${s(body.services.join(", "))}` : "",
          body.message ? `<b>Задача:</b>\n${s(body.message)}` : "",
        ]
      : [
          "<b>🤝 Заявка на партнёрство</b>",
          `<b>Язык сайта:</b> ${s(body.locale)}`,
          `<b>Имя:</b> ${s(body.name)}`,
          ...contactLines,
          `<b>Кто:</b> ${s(body.role)}`,
          body.model ? `<b>Модель:</b> ${s(body.model)}` : "",
          body.message ? `<b>Комментарий:</b>\n${s(body.message)}` : "",
        ];

  if (dryRun) return NextResponse.json({ ok: true, dryRun: true, text: lines.filter(Boolean).join("\n") });

  try {
    const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chat, text: lines.filter(Boolean).join("\n"), parse_mode: "HTML", link_preview_options: { is_disabled: true } }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!r.ok) throw new Error(`telegram ${r.status}`);
  } catch (e) {
    console.error("[lead] delivery failed", e);
    return NextResponse.json({ error: "delivery_failed" }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
