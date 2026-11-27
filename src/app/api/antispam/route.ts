import { NextResponse } from "next/server";
import { antispamConfigured, recentLog } from "@/lib/antispam/guard";

/* Журнал антиспама — для команды.
   GET /api/antispam?token=<ANTISPAM_ADMIN_TOKEN>                  — последние решения (JSON)
   GET /api/antispam?token=…&only=rejected                         — только отклонённые
   GET /api/antispam?token=…&format=text                           — читаемым текстом
   Без токена (переменная ANTISPAM_ADMIN_TOKEN не задана или не совпала) — 404.
   В журнале нет имён, телефонов и текстов заявок; IP — только псевдоним. Хранится 30 дней. */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const admin = process.env.ANTISPAM_ADMIN_TOKEN;
  const url = new URL(req.url);
  const token = url.searchParams.get("token") ?? req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!admin || admin.length < 16 || token !== admin) return new NextResponse("Not found", { status: 404 });

  const n = Math.min(Number(url.searchParams.get("n")) || 200, 2000);
  const { persistent, entries } = await recentLog(n);
  type E = { verdict: string; at: string; route: string; id: string; reasons: string[]; turnstile: string; fillSec: number | null; device: { type: string; os: string | null; browser: string | null }; country: string | null; ip: string; utm?: Record<string, unknown>; delivery?: string; error?: string };
  let list = entries as E[];
  if (url.searchParams.get("only") === "rejected") list = list.filter((e) => e.verdict === "dropped" || e.verdict === "blocked");
  const cfg = antispamConfigured();

  if (url.searchParams.get("format") === "text") {
    const icon: Record<string, string> = { accepted: "✅", duplicate: "🔁", dropped: "🚫", blocked: "⛔" };
    const text = [
      `Журнал антиспама · записей: ${list.length} · хранилище: ${persistent ? "Redis (общий журнал)" : "память сервера (только этот инстанс, до перезапуска)"} · Turnstile: ${cfg.turnstile ? "включён" : "не подключён"}`,
      "",
      ...list.map((e) =>
        [
          `${icon[e.verdict] ?? "•"} ${e.at.replace("T", " ").slice(0, 19)} UTC · ${e.route} · ${e.verdict}${e.error ? ` (${e.error})` : ""}${e.delivery ? ` · доставка: ${e.delivery}` : ""} · #${e.id}`,
          `   причины: ${e.reasons.length ? e.reasons.join(", ") : "—"} · turnstile: ${e.turnstile} · заполнение: ${e.fillSec ?? "?"} с`,
          `   ${[e.device.type, e.device.os, e.device.browser, e.country].filter(Boolean).join(" · ")} · ip#${e.ip}${e.utm && Object.values(e.utm).some(Boolean) ? ` · utm: ${JSON.stringify(e.utm)}` : ""}`,
        ].join("\n"),
      ),
    ].join("\n");
    return new NextResponse(text, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
  }
  return NextResponse.json({ persistent, turnstile: cfg.turnstile, count: list.length, entries: list }, { headers: { "Cache-Control": "no-store" } });
}
