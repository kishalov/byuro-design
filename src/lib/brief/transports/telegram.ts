import "server-only";
import type { BriefRecord, BriefTransport } from "../delivery";

/* Отправка брифа в тот же Telegram-бот и чат, что и заявки из форм сайта (/api/lead):
   те же переменные окружения TELEGRAM_BOT_TOKEN и TELEGRAM_CHAT_ID.
   Сам /api/lead не меняется. */

const LIMIT = 4000; // у Telegram 4096 символов на сообщение, оставляем запас под разметку

const esc = (s: string) => s.replace(/[&<>]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[ch]!);

export const telegramConfig = () => {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chat = process.env.TELEGRAM_CHAT_ID;
  return token && chat ? { token, chat } : null;
};

/** Режем длинный бриф на сообщения по границам строк */
export function splitMessage(text: string, limit = LIMIT): string[] {
  const out: string[] = [];
  let cur = "";
  for (const raw of text.split("\n")) {
    // строка длиннее лимита (огромное описание) — режем её саму
    for (let i = 0; i < Math.max(raw.length, 1); i += limit) {
      const line = raw.slice(i, i + limit);
      if (cur && cur.length + 1 + line.length > limit) {
        out.push(cur);
        cur = line;
      } else cur = cur ? `${cur}\n${line}` : line;
    }
  }
  if (cur.trim()) out.push(cur);
  return out;
}

export function formatTelegram(record: BriefRecord, textRu: string): string[] {
  const [first, ...rest] = textRu.split("\n"); // первая строка — «Бриф для Бюро · BRF-…»
  const body = [`<b>🧮 ${esc(first)}</b>`, ...rest.map((l) => (/^— .+ —$/.test(l) ? `<b>${esc(l)}</b>` : esc(l)))].join("\n");
  return splitMessage(body).map((chunk, i, all) => (all.length > 1 ? `${chunk}\n\n<i>(${i + 1}/${all.length} · ${record.briefId})</i>` : chunk));
}

export const telegramTransport: BriefTransport = {
  name: "telegram",
  async send(record, textRu) {
    const cfg = telegramConfig();
    if (!cfg) throw new Error("telegram not configured");
    for (const text of formatTelegram(record, textRu)) {
      const r = await fetch(`https://api.telegram.org/bot${cfg.token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: cfg.chat, text, parse_mode: "HTML", disable_web_page_preview: true }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!r.ok) throw new Error(`telegram ${r.status}`);
    }
  },
};
