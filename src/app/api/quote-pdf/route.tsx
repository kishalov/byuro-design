import { NextResponse } from "next/server";
import { getCalcDict } from "@/i18n/calculator/get";
import { LIMITS } from "@/lib/brief/schema";
import { computeQuote, parseSelection } from "@/lib/calculator/engine";
import { isCalcId } from "@/lib/calculator/ids";
import { rateLimited, str, toLocale, toTimeZone } from "@/lib/calculator/server";

/* Коммерческое предложение в PDF.
   POST /api/quote-pdf  { locale, calcId, selection, projectName?, timeZone? } → application/pdf

   PDF собирается на сервере: в браузер не грузится ни библиотека, ни шрифты (≈0 КБ JS),
   а стоимость пересчитывается по selection — подставить свою сумму нельзя. */

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: Request) {
  if (rateLimited(req, "pdf", 20)) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }
  const locale = toLocale(body?.locale);
  if (!locale) return NextResponse.json({ error: "locale" }, { status: 400 });
  if (!isCalcId(body.calcId)) return NextResponse.json({ error: "calc_id" }, { status: 400 });
  const parsed = parseSelection(body.selection, true);
  if (!parsed.ok) return NextResponse.json({ error: "selection" }, { status: 400 });
  const quote = computeQuote(parsed.selection);
  if (quote.isEmpty) return NextResponse.json({ error: "empty" }, { status: 400 });
  const projectName = (str(body.projectName, LIMITS.projectName) ?? "").slice(0, LIMITS.projectName).trim();

  try {
    // Ленивая загрузка: тяжёлый модуль PDF поднимается только при первом запросе
    const [{ renderToBuffer }, { registerPdfFonts }, { QuoteDocument }, t] = await Promise.all([
      import("@react-pdf/renderer"),
      import("@/lib/pdf/fonts"),
      import("@/lib/pdf/QuoteDocument"),
      getCalcDict(locale),
    ]);
    registerPdfFonts();
    const pdf = await renderToBuffer(
      <QuoteDocument t={t} locale={locale} quote={quote} calcId={body.calcId} projectName={projectName} createdAt={new Date()} timeZone={toTimeZone(body.timeZone) ?? undefined} />,
    );
    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="quote-${body.calcId}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    console.error("[quote-pdf] render failed", e);
    return NextResponse.json({ error: "render_failed" }, { status: 500 });
  }
}
