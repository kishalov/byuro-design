"use client";
import { useRef, useState } from "react";
import type { Locale } from "@/i18n/config";
import type { CalcDict } from "@/i18n/calculator/ru";
import type { Quote, Selection } from "@/lib/calculator/engine";
import { Icon } from "../ui/Icon";

/* ── PDF-предложение ─────────────────────────────────────────────────── */

export type PdfState = { status: "idle" | "loading" | "error"; download: () => void; disabled: boolean };

export function usePdf({ locale, selection, calcId, projectName, quote }: { locale: Locale; selection: Selection; calcId: string; projectName: string; quote: Quote }): PdfState {
  const [status, setStatus] = useState<PdfState["status"]>("idle");
  const busy = useRef(false);
  const download = async () => {
    if (busy.current || quote.isEmpty || !calcId) return;
    busy.current = true;
    setStatus("loading");
    try {
      const res = await fetch("/api/quote-pdf/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale, calcId, selection, projectName, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone }),
        signal: AbortSignal.timeout(30_000),
      });
      if (!res.ok || !res.headers.get("content-type")?.includes("pdf")) throw new Error(String(res.status));
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `quote-${calcId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
      setStatus("idle");
    } catch {
      setStatus("error");
    } finally {
      busy.current = false;
    }
  };
  return { status, download, disabled: quote.isEmpty || !calcId || status === "loading" };
}

const DownloadIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 4v11M7 10l5 5 5-5M5 20h14" />
  </svg>
);

/** Скачать КП в PDF — второстепенное действие (в панели сметы и в брифе) */
export function PdfLink({ t, pdf, className }: { t: CalcDict; pdf: PdfState; className?: string }) {
  return (
    <div className={className} aria-live="polite">
      <button type="button" onClick={pdf.download} disabled={pdf.disabled} className="inline-flex min-h-11 items-center gap-2 rounded-pill px-1 text-[15px] font-semibold underline decoration-ink/30 underline-offset-4 hover:decoration-coral disabled:no-underline disabled:opacity-50">
        {pdf.status === "loading" ? <span aria-hidden="true" className="size-4 animate-spin rounded-full border-2 border-ink/30 border-t-ink" /> : <DownloadIcon />}
        {pdf.status === "loading" ? t.actions.pdfLoading : t.actions.pdf}
      </button>
      {pdf.status === "error" && (
        <p role="alert" className="t-small flex items-start gap-2 font-medium text-error">
          <Icon name="alert" size={16} className="mt-0.5 shrink-0" />
          {t.actions.pdfError}
        </p>
      )}
    </div>
  );
}
