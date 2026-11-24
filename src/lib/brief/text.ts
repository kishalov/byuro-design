/* Текст брифа: для кнопки «Скопировать бриф» (на языке посетителя) и для будущей
   отправки команде в Telegram (на русском — см. delivery.ts). Обычный текст без разметки;
   транспорт сам экранирует его под свой формат. */

import type { Locale } from "@/i18n/config";
import type { CalcDict } from "@/i18n/calculator/ru";
import { fmt } from "@/i18n/format";
import type { Quote } from "../calculator/engine";
import { formatDays, lineText, moneyFormatter, pct, projectType, requestPartNames, serviceTitle } from "../calculator/format";

export type BriefTextInput = {
  briefId?: string;
  calcId: string;
  createdAt: Date;
  timeZone?: string;
  locale: Locale;
  quote: Quote;
  projectName?: string;
  name?: string;
  phone?: string | null;
  telegram?: string | null;
  email?: string | null;
  company?: string;
  description?: string;
  deadline?: string;
  links?: string[];
  comment?: string;
  /** пометки для команды: повторный клиент, дубль */
  flags?: string[];
};

/** t — словарь языка, на котором пишем текст; numberLocale — язык форматирования чисел */
export function briefText(t: CalcDict, textLocale: Locale, b: BriefTextInput): string {
  const q = b.quote;
  const money = moneyFormatter(textLocale, q.currency);
  const out: string[] = [];
  const add = (label: string, v?: string | null) => v && v.trim() && out.push(`${label}: ${v.trim()}`);

  out.push(`${t.brief.title}${b.briefId ? ` · ${b.briefId}` : ""}`);
  if (b.flags?.length) out.push(...b.flags);
  add(t.summary.calcId, b.calcId);
  let when: string;
  try {
    when = new Intl.DateTimeFormat(textLocale, { dateStyle: "medium", timeStyle: "short", timeZone: b.timeZone }).format(b.createdAt);
  } catch {
    when = b.createdAt.toISOString();
  }
  add(t.brief.sentAt, `${when}${b.timeZone ? ` (${b.timeZone})` : ""}`);
  out.push("");

  out.push(`— ${t.brief.contactsLegend} —`);
  add(t.brief.name, b.name);
  add(t.brief.phone, b.phone);
  add(t.brief.telegram, b.telegram ? `@${b.telegram.replace(/^@/, "")}` : null);
  add(t.brief.email, b.email);
  out.push("");

  out.push(`— ${t.brief.projectLegend} —`);
  add(t.summary.projectName, b.projectName);
  add(t.pdf.projectType, projectType(t, q));
  add(t.brief.company, b.company);
  add(t.brief.description, b.description);
  add(t.brief.deadline, b.deadline);
  if (b.links?.length) out.push(`${t.brief.links}:`, ...b.links.map((l) => `• ${l}`));
  add(t.brief.comment, b.comment);
  out.push("");

  out.push(`— ${t.brief.attached} —`);
  for (const s of q.services) {
    const req = requestPartNames(t, s);
    if (s.requestOnly) {
      out.push(`${serviceTitle(t, s)}: ${t.summary.onRequest}${req.length ? ` (${req.join(", ")})` : ""}`);
      continue;
    }
    out.push(`${serviceTitle(t, s)}: ${money(s.subtotal)}${s.days.max ? ` · ${formatDays(s.days, t.days, textLocale)}` : ""}`);
    for (const l of s.lines) out.push(`  • ${lineText(t, l, textLocale, money)}`);
    if (req.length) out.push(`  • ${req.join(", ")} — ${t.summary.onRequest}`);
  }
  if (q.extras.lines.length) {
    out.push(`${t.summary.extras}: ${money(q.extras.subtotal)}`);
    for (const l of q.extras.lines) out.push(`  • ${lineText(t, l, textLocale, money)}`);
  }
  out.push(`${t.summary.base}: ${money(q.base)}`);
  if (q.complexity.factor !== 1) out.push(`${fmt(t.summary.complexity, { level: t.complexity[q.complexity.key].title })} (+${pct(q.complexity.factor)}): ${money(q.complexity.delta)}`);
  if (q.urgency.factor !== 1) out.push(`${fmt(t.summary.urgency, { level: t.urgency[q.urgency.key].title })} (+${pct(q.urgency.factor)}): ${money(q.urgency.delta)}`);
  out.push(`${t.summary.total}: ${money(q.total)}${q.hasOnRequest ? ` (${t.summary.totalNote})` : ""}`);
  if (q.timeline) out.push(`${t.summary.timeline}: ${formatDays(q.timeline, t.days, textLocale)}`);
  out.push("", t.page.disclaimer);
  return out.join("\n");
}
