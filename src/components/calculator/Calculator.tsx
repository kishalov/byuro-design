"use client";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Locale } from "@/i18n/config";
import type { CalcDict } from "@/i18n/calculator/ru";
import { fmt } from "@/i18n/format";
import { COMPLEXITY, EXTRA_ITEMS, ITEMS, SERVICE_IDS, unitPrice, type Currency, SERVICES, URGENCY, WEB_VARIANTS, serviceScope, type ComplexityKey, type ItemKey, type ServiceId, type UrgencyKey, type WebVariant } from "@/lib/calculator/catalog";
import { computeQuote, emptySelection, parseSelection, selectionSignature, setVariant, togglePart, toggleService, type Quote, type QuoteService, type Selection } from "@/lib/calculator/engine";
import { calcCurrency, formatDays, moneyFormatter, pct, qtyFormatter, requestPartNames, serviceTitle } from "@/lib/calculator/format";
import { newCalcId } from "@/lib/calculator/ids";
import { cn } from "@/lib/cn";
import { Button } from "../ui/Button";
import { Icon } from "../ui/Icon";
import { BriefDialog } from "./BriefDialog";
import { QtyRow } from "./QtyField";

type Step = "services" | "scope" | "extras" | "summary";
const STEPS: Step[] = ["services", "scope", "extras", "summary"];
const STORAGE_KEY = "byuro:calculator:v1";

type Saved = { selection: Selection; step: Step; projectName: string; calc: { sig: string; id: string } };

export type CalculatorProps = {
  locale: Locale;
  t: CalcDict;
  briefEnabled: boolean;
  privacyHref: string;
  instagram: { url: string; handle: string };
};

/* Калькулятор: выбор услуг → объём → опции и параметры → смета (PDF и бриф).
   Расчёт мгновенный в браузере; PDF и бриф сервер пересчитывает сам.
   Выбор хранится в sessionStorage вкладки: переживает перезагрузку и переходы между шагами. */
export function Calculator({ locale, t, briefEnabled, privacyHref, instagram }: CalculatorProps) {
  const [selection, setSelection] = useState<Selection>(emptySelection);
  const [step, setStep] = useState<Step>("services");
  const [projectName, setProjectName] = useState("");
  const [calc, setCalc] = useState<{ sig: string; id: string }>({ sig: "", id: "" });
  const [ready, setReady] = useState(false);
  const [briefOpen, setBriefOpen] = useState(false);
  // Страница статическая: включена ли отправка, уточняем у сервера по текущим переменным окружения
  const [briefOn, setBriefOn] = useState(briefEnabled);
  useEffect(() => {
    fetch("/api/brief/", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { enabled?: boolean } | null) => typeof d?.enabled === "boolean" && setBriefOn(d.enabled))
      .catch(() => {});
  }, []);
  const topRef = useRef<HTMLDivElement>(null);
  // на главной калькулятор — третий экран: панель итога показываем, только когда он в зоне видимости
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = topRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { rootMargin: "0px 0px -35% 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const money = useMemo(() => moneyFormatter(locale), [locale]);
  const qty = useMemo(() => qtyFormatter(locale), [locale]);
  const currency = calcCurrency(locale);
  const quote = useMemo(() => computeQuote(selection, currency), [selection, currency]);
  const sig = useMemo(() => selectionSignature(selection), [selection]);

  // Восстановление после перезагрузки
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Partial<Saved>;
        const parsed = parseSelection(saved.selection, false);
        if (parsed.ok) setSelection(parsed.selection);
        if (saved.step && STEPS.includes(saved.step)) setStep(saved.step);
        if (typeof saved.projectName === "string") setProjectName(saved.projectName.slice(0, 120));
        if (saved.calc?.id && saved.calc.sig) setCalc(saved.calc);
      }
    } catch {
      /* хранилище недоступно (приватный режим) — просто начинаем заново */
    }
    setReady(true);
  }, []);

  // Новый состав расчёта — новый ID; тот же состав — тот же ID (совпадает в PDF и брифе)
  useEffect(() => {
    if (ready && calc.sig !== sig) setCalc({ sig, id: newCalcId() });
  }, [ready, sig, calc.sig]);

  useEffect(() => {
    if (!ready) return;
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ selection, step, projectName, calc } satisfies Saved));
    } catch {
      /* ignore */
    }
  }, [ready, selection, step, projectName, calc]);

  const go = useCallback((s: Step) => {
    setStep(s);
    requestAnimationFrame(() => {
      const el = topRef.current;
      if (el && el.getBoundingClientRect().top < 0) el.scrollIntoView({ behavior: "smooth", block: "start" });
      el?.querySelector<HTMLElement>("[data-step-title]")?.focus({ preventScroll: true });
    });
  }, []);

  const setQty = (k: ItemKey, v: number) => setSelection((s) => ({ ...s, qty: { ...s.qty, [k]: v } }));
  const reset = () => {
    setSelection(emptySelection());
    setProjectName("");
    go("services");
  };

  const i = STEPS.indexOf(step);
  const stepTitle: Record<Step, string> = { services: t.steps.services, scope: t.steps.scope, extras: t.steps.extras, summary: t.steps.summary };
  const calcId = ready ? calc.id : "";

  const pdf = usePdf({ locale, selection, calcId, projectName, quote });

  return (
    <div id="calc-root" ref={topRef} className="scroll-mt-[calc(var(--header-h)+12px)]">
      {/* Шаги */}
      <nav aria-label={t.steps.label} className="mb-8 overflow-x-auto pb-1 [scrollbar-width:none]">
        <ol className="flex min-w-max gap-2">
          {STEPS.map((s, n) => (
            <li key={s}>
              <button
                type="button"
                onClick={() => go(s)}
                aria-current={s === step ? "step" : undefined}
                className={cn(
                  "flex min-h-11 items-center gap-2 rounded-pill border-2 px-4 text-[15px] font-semibold transition-colors",
                  s === step ? "border-ink bg-ink text-paper" : n < i ? "border-ink/40 bg-white hover:border-ink" : "border-ink/15 bg-transparent text-ink/70 hover:border-ink/50",
                )}
              >
                <span className={cn("grid size-6 place-items-center rounded-full text-[12px]", s === step ? "bg-coral text-ink" : n < i ? "bg-ink text-paper" : "bg-sand")}>{n < i ? <Icon name="check" size={14} /> : n + 1}</span>
                {stepTitle[s]}
              </button>
            </li>
          ))}
        </ol>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(320px,400px)] lg:gap-10 xl:gap-14">
        <div className="min-w-0">
          <p className="t-mono text-stone-ink">{fmt(t.steps.stepOf, { n: i + 1, total: STEPS.length })}</p>
          <h2 data-step-title tabIndex={-1} className="t-h2 mt-2 outline-none focus-visible:outline-none">
            {step === "services" ? t.pick.title : step === "scope" ? t.scope.title : step === "extras" ? t.extras.title : t.summary.title}
          </h2>

          <div className="mt-6">
            {step === "services" && <ServicesStep t={t} selection={selection} currency={currency} money={money} locale={locale} onToggle={(id) => setSelection((s) => toggleService(s, id))} />}
            {step === "scope" && <ScopeStep t={t} selection={selection} quote={quote} money={money} qty={qty} locale={locale} setQty={setQty} onVariant={(v) => setSelection((s) => setVariant(s, v))} onPart={(id, n) => setSelection((s) => togglePart(s, id, n))} onBack={() => go("services")} />}
            {step === "extras" && <ExtrasStep t={t} selection={selection} currency={currency} money={money} qty={qty} setQty={setQty} setComplexity={(c) => setSelection((s) => ({ ...s, complexity: c }))} setUrgency={(u) => setSelection((s) => ({ ...s, urgency: u }))} />}
            {step === "summary" && (
              <SummaryStep
                t={t}
                locale={locale}
                quote={quote}
                money={money}
                qty={qty}
                calcId={calcId}
                projectName={projectName}
                setProjectName={setProjectName}
                pdf={pdf}
                onBrief={() => setBriefOpen(true)}
                onEdit={go}
              />
            )}
          </div>

          <div className="mt-10 flex flex-wrap items-center gap-3 border-t border-ink/15 pt-6">
            {i > 0 && (
              <Button variant="outline" icon={null} onClick={() => go(STEPS[i - 1])}>
                <span className="inline-flex items-center gap-2">
                  <Icon name="arrow-left" size={20} />
                  {t.nav.back}
                </span>
              </Button>
            )}
            {i < STEPS.length - 1 && (
              <Button variant="ink" onClick={() => go(STEPS[i + 1])}>
                {i === STEPS.length - 2 ? t.nav.toSummary : t.nav.next}
              </Button>
            )}
            <button type="button" onClick={reset} className="ml-auto min-h-11 rounded-pill px-3 text-[15px] font-medium text-stone-ink underline decoration-ink/30 underline-offset-4 hover:text-ink">
              {t.nav.reset}
            </button>
          </div>
        </div>

        {/* Смета сбоку (десктоп) */}
        <aside aria-label={t.summary.title} className="hidden lg:block">
          <div className="sticky top-[calc(var(--header-h)+20px)]">
            <SideSummary t={t} locale={locale} quote={quote} money={money} calcId={calcId} onOpen={() => go("summary")} isSummary={step === "summary"} />
          </div>
        </aside>
      </div>

      {/* Итог внизу экрана (телефон и планшет) */}
      {step !== "summary" && inView && (
        <div className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(12px,env(safe-area-inset-bottom))] lg:hidden">
          <div className="flex items-center gap-3 rounded-[22px] bg-ink p-2 pl-4 text-paper shadow-[0_10px_30px_rgb(18_18_18/0.3)]">
            <div className="min-w-0 flex-1" aria-live="polite">
                            <p className="truncate font-display text-[18px] leading-tight font-bold tabular-nums">
                <span className="mr-1.5 font-sans text-[13px] font-medium text-paper/70">{t.summary.total}</span>
                {money(quote.total)}
              </p>
              {quote.timeline && <p className="truncate text-[12px] text-paper/70">{formatDays(quote.timeline, t.days, locale)}</p>}
            </div>
            <button type="button" onClick={() => go("summary")} className="min-h-12 shrink-0 rounded-pill bg-coral px-5 font-semibold text-ink">
              {t.summary.open}
            </button>
          </div>
        </div>
      )}

      <BriefDialog
        open={briefOpen}
        onClose={() => setBriefOpen(false)}
        t={t}
        locale={locale}
        quote={quote}
        selection={selection}
        calcId={calcId}
        projectName={projectName}
        enabled={briefOn}
        privacyHref={privacyHref}
        instagram={instagram}
        money={money}
      />
    </div>
  );
}

/* ── PDF ─────────────────────────────────────────────────── */

type PdfState = { status: "idle" | "loading" | "error"; download: () => void; disabled: boolean };

function usePdf({ locale, selection, calcId, projectName, quote }: { locale: Locale; selection: Selection; calcId: string; projectName: string; quote: Quote }): PdfState {
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

function Actions({ t, pdf, onBrief, quote }: { t: CalcDict; pdf: PdfState; onBrief: () => void; quote: Quote }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Button variant="coral" icon={null} onClick={pdf.download} disabled={pdf.disabled} aria-describedby={quote.isEmpty ? "calc-pdf-empty" : undefined} className="w-full">
        {pdf.status === "loading" ? (
          <span className="inline-flex items-center gap-3">
            <span aria-hidden="true" className="size-5 animate-spin rounded-full border-[3px] border-ink/30 border-t-ink" />
            {t.actions.pdfLoading}
          </span>
        ) : (
          <span className="inline-flex items-center gap-2">
            <DownloadIcon />
            {t.actions.pdf}
          </span>
        )}
      </Button>
      <Button variant="ink" onClick={onBrief} disabled={quote.isEmpty} className="w-full">
        {t.actions.brief}
      </Button>
      <div aria-live="polite" className="sm:col-span-2">
        {pdf.status === "error" && (
          <p role="alert" className="t-small flex items-start gap-2 font-medium text-error">
            <Icon name="alert" size={16} className="mt-0.5 shrink-0" />
            {t.actions.pdfError}
          </p>
        )}
        {quote.isEmpty && (
          <p id="calc-pdf-empty" className="t-small text-stone-ink">
            {t.actions.pdfEmpty}
          </p>
        )}
      </div>
    </div>
  );
}

const DownloadIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 4v11M7 10l5 5 5-5M5 20h14" />
  </svg>
);

/* ── Шаг 1: услуги ───────────────────────────────────────── */

/** Стартовый пакет услуги — ровно то, что попадёт в расчёт при её выборе
    (база + стартовый объём, без коэффициентов); null — только индивидуальная оценка.
    Цена на карточке и сумма после клика всегда совпадают. */
function startPackage(id: ServiceId, variant: WebVariant, currency: Currency) {
  if (SERVICES[id].requestOnly) return null;
  const sel = { ...emptySelection(), services: [id], variant, qty: { ...serviceScope(SERVICES[id], variant).defaults } };
  const q = computeQuote(sel, currency);
  return { quote: q, svc: q.services[0] };
}

function ServicesStep({ t, selection, currency, money, locale, onToggle }: { t: CalcDict; selection: Selection; currency: Currency; money: (v: number) => string; locale: Locale; onToggle: (id: ServiceId) => void }) {
  const qty = qtyFormatter(locale);
  const current = computeQuote(selection, currency);
  return (
    <>
      <p className="t-body-l max-w-[40rem] text-ink/80">{t.pick.hint}</p>
      <ul className="mt-6 grid gap-4 sm:grid-cols-2">
        {SERVICE_IDS.map((id) => {
          const on = selection.services.includes(id);
          const svc = t.services[id];
          const pkg = startPackage(id, selection.variant, currency);
          const options = SERVICES[id].options.flatMap((g) => g.items);
          const typical = pkg?.quote;
          const inQuote = on ? current.services.find((x) => x.id === id) : undefined;
          return (
            <li key={id} className={cn("flex flex-col rounded-card border-2 p-5 transition-colors sm:p-6", on ? "border-ink bg-white shadow-[0_14px_30px_-18px_rgb(18_18_18/0.45)]" : "border-ink/15 bg-white/60 hover:border-ink/40")}>
              <div className="flex items-start justify-between gap-3">
                <h3 className="t-h4">{svc.title}</h3>
                {on && (
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-coral" aria-hidden="true">
                    <Icon name="check" size={18} />
                  </span>
                )}
              </div>
              <p className="mt-2 text-[15px] text-ink/80">{svc.short}</p>
              <ul className="mt-3 flex flex-wrap gap-1.5" aria-label={t.pick.includes}>
                {svc.deliverables.map((d) => (
                  <li key={d} className="rounded-pill bg-sand px-2.5 py-1 text-[13px] font-medium">
                    {d}
                  </li>
                ))}
              </ul>
              {!pkg ? (
                <p className="mt-4 font-display text-[17px] font-bold">{t.pick.requestOnly}</p>
              ) : (
                <div className="mt-4">
                  <p className="flex flex-wrap items-baseline gap-x-2 font-display text-[17px] font-bold">
                    <span className="tabular-nums">{money(inQuote ? inQuote.subtotal : pkg.svc.subtotal)}</span>
                    <span className="font-sans text-[13px] font-semibold text-stone-ink">{inQuote ? t.pick.inQuote : t.pick.startLabel}</span>
                  </p>
                  {!inQuote && (
                    <p className="mt-1 text-[13px] leading-snug text-stone-ink">
                      {pkg.svc.lines.map((l) => (l.kind === "base" ? t.items[l.key] : `${t.items[l.key]} × ${qty(l.qty)} ${t.units[l.unit]}`)).join(" + ")}
                    </p>
                  )}
                </div>
              )}
              <details className="group mt-3">
                <summary className="inline-flex min-h-10 cursor-pointer items-center gap-1.5 text-[15px] font-semibold underline decoration-ink/30 underline-offset-4 hover:decoration-coral">
                  {t.pick.details}
                  <Icon name="plus" size={16} className="transition-transform group-open:rotate-45" />
                </summary>
                <div className="mt-3 space-y-4 text-[15px]">
                  {svc.includes.length > 0 && <ListBlock title={t.pick.includes} items={svc.includes} tone="in" />}
                  <ListBlock title={t.pick.excludes} items={svc.excludes} tone="out" />
                  {SERVICES[id].requestOnly ? (
                    <p className="text-stone-ink">{t.scope.requestOnlyHint}</p>
                  ) : (
                    typical?.timeline && (
                      <p>
                        <span className="font-semibold">{t.pick.timeline}: </span>
                        {formatDays(typical.timeline, t.days, locale)}
                      </p>
                    )
                  )}
                  {options.length > 0 && (
                    <div>
                      <p className="font-semibold">{t.pick.options}</p>
                      <p className="mt-1 text-ink/80">{options.map((k) => `${t.items[k]} (+${money(unitPrice(k, currency))})`).join(" · ")}</p>
                    </div>
                  )}
                </div>
              </details>
              <div className="mt-auto pt-5">
                <button
                  type="button"
                  aria-pressed={on}
                  onClick={() => onToggle(id)}
                  className={cn(
                    "inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-pill border-2 px-5 font-semibold transition-colors",
                    on ? "border-ink bg-ink text-paper hover:bg-graphite" : "border-ink bg-transparent hover:bg-ink hover:text-paper",
                  )}
                >
                  {on ? (
                    <>
                      <Icon name="check" size={18} /> {t.pick.selected}
                    </>
                  ) : (
                    <>
                      <Icon name="plus" size={18} /> {t.pick.select}
                    </>
                  )}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}

function ListBlock({ title, items, tone }: { title: string; items: readonly string[]; tone: "in" | "out" }) {
  return (
    <div>
      <p className="font-semibold">{title}</p>
      <ul className="mt-1.5 space-y-1">
        {items.map((x) => (
          <li key={x} className="flex gap-2 text-ink/85">
            <span aria-hidden="true" className={cn("mt-[0.55em] size-1.5 shrink-0 rounded-full", tone === "in" ? "bg-coral" : "bg-stone")} />
            {x}
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ── Шаг 2: объём ────────────────────────────────────────── */

function PartChips({ t, id, selection, onPart }: { t: CalcDict; id: ServiceId; selection: Selection; onPart: (id: ServiceId, i: number) => void }) {
  const chosen = selection.parts[id] ?? [];
  return (
    <ul className="flex flex-wrap gap-2">
      {SERVICES[id].requestParts.map((i) => {
        const on = chosen.includes(i);
        return (
          <li key={i}>
            <button type="button" aria-pressed={on} onClick={() => onPart(id, i)} className={cn("inline-flex min-h-11 items-center gap-2 rounded-pill border-2 px-4 text-[15px] font-medium transition-colors", on ? "border-ink bg-ink text-paper" : "border-ink/20 bg-white hover:border-ink/50")}>
              {on ? <Icon name="check" size={16} /> : <Icon name="plus" size={16} />}
              {t.services[id].deliverables[i]}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function ScopeStep({
  t,
  selection,
  quote,
  money,
  qty,
  locale,
  setQty,
  onVariant,
  onPart,
  onBack,
}: {
  t: CalcDict;
  selection: Selection;
  quote: Quote;
  money: (v: number) => string;
  qty: (v: number) => string;
  locale: Locale;
  setQty: (k: ItemKey, v: number) => void;
  onVariant: (v: WebVariant) => void;
  onPart: (id: ServiceId, i: number) => void;
  onBack: () => void;
}) {
  if (!selection.services.length) {
    return (
      <div className="rounded-card border-2 border-dashed border-ink/25 p-6">
        <p className="t-body-l">{t.scope.noServices}</p>
        <Button variant="outline" icon="arrow-left" className="mt-5" onClick={onBack}>
          {t.steps.services}
        </Button>
      </div>
    );
  }
  return (
    <>
      <p className="t-body-l max-w-[40rem] text-ink/80">{t.scope.hint}</p>
      <div className="mt-6 space-y-6">
        {SERVICE_IDS.filter((id) => selection.services.includes(id)).map((id) => {
          const s = SERVICES[id];
          const scope = serviceScope(s, selection.variant);
          const q = quote.services.find((x) => x.id === id)!;
          const hasVolume = q.lines.some((l) => l.kind !== "base") || q.parts.length > 0;
          return (
            <section key={id} aria-labelledby={`sc-${id}`} className="rounded-card bg-sand/60 p-3 sm:p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2 px-1 pb-3">
                <h3 id={`sc-${id}`} className="t-h4">
                  {t.services[id].title}
                </h3>
                <p className="text-[15px] text-stone-ink">{s.requestOnly ? t.pick.requestOnly : q.days.max > 0 ? formatDays(q.days, t.days, locale) : null}</p>
              </div>

              {s.requestOnly ? (
                <div className="rounded-2xl bg-white p-4">
                  <p className="text-[15px] text-ink/80">{t.scope.requestOnlyHint}</p>
                  <div className="mt-4">
                    <PartChips t={t} id={id} selection={selection} onPart={onPart} />
                  </div>
                </div>
              ) : (
                <>
                  {s.variants && (
                    <fieldset className="mb-4">
                      <legend className="t-label px-1 pb-2 text-stone-ink">{t.pick.variantsTitle}</legend>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {WEB_VARIANTS.map((v) => (
                          <label key={v} className="relative cursor-pointer">
                            <input type="radio" name="web-variant" value={v} checked={selection.variant === v} onChange={() => onVariant(v)} className="peer absolute inset-0 cursor-pointer opacity-0" />
                            <span className="flex h-full flex-col rounded-2xl border-2 border-ink/15 bg-white/60 p-4 transition-colors peer-checked:border-ink peer-checked:bg-white peer-hover:border-ink/40 peer-focus-visible:outline-[3px] peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ink">
                              <span className="flex items-start justify-between gap-2">
                                <span className="font-semibold">{t.variants[v].title}</span>
                                <span className={cn("shrink-0 rounded-pill px-2 py-0.5 font-mono text-[12px]", selection.variant === v ? "bg-coral text-ink" : "bg-sand")}>{money(startPackage(id, v, quote.currency)!.svc.subtotal)}</span>
                              </span>
                              <span className="mt-1 text-[14px] text-stone-ink">{t.variants[v].text}</span>
                            </span>
                          </label>
                        ))}
                      </div>
                    </fieldset>
                  )}
                  {scope.base && (
                    <div className="mb-3 flex items-center justify-between gap-3 rounded-2xl border-2 border-dashed border-ink/20 px-4 py-3">
                      <div>
                        <p className="t-label text-stone-ink">{t.scope.base}</p>
                        <p className="mt-1 text-[15px] font-semibold">{t.items[scope.base]}</p>
                      </div>
                      <p className="text-[15px] font-semibold tabular-nums">{money(unitPrice(scope.base, quote.currency))}</p>
                    </div>
                  )}
                  {scope.core.length > 0 && (
                    <>
                      <p className="t-label px-1 pb-2 text-stone-ink">{t.scope.core}</p>
                      <div className="space-y-2">
                        {scope.core.map((k) => (
                          <QtyRow key={k} k={k} value={selection.qty[k] ?? 0} onChange={(v) => setQty(k, v)} t={t} money={money} qty={qty} currency={quote.currency} />
                        ))}
                      </div>
                    </>
                  )}
                  {s.options.map((g) => {
                    const count = g.items.filter((k) => (selection.qty[k] ?? 0) > 0).length;
                    return (
                      <details key={g.group} className="group mt-3" open={count > 0 || s.options.length === 1}>
                        <summary className="flex min-h-12 cursor-pointer items-center justify-between gap-3 rounded-2xl px-1 text-[15px] font-semibold">
                          <span>
                            {t.scope.groups[g.group]}
                            {count > 0 && <span className="ml-2 rounded-pill bg-ink px-2 py-0.5 text-[12px] text-paper">{count}</span>}
                          </span>
                          <span aria-hidden="true" className="grid size-9 place-items-center rounded-full border-2 border-ink transition-transform group-open:rotate-45">
                            <Icon name="plus" size={16} />
                          </span>
                        </summary>
                        <div className="space-y-2 pt-1">
                          {g.items.map((k) => (
                            <QtyRow key={k} k={k} value={selection.qty[k] ?? 0} onChange={(v) => setQty(k, v)} t={t} money={money} qty={qty} currency={quote.currency} />
                          ))}
                        </div>
                      </details>
                    );
                  })}
                  {s.requestParts.length > 0 && (
                    <div className="mt-4 rounded-2xl border-2 border-dashed border-ink/20 p-4">
                      <p className="font-semibold">{t.scope.partsTitle}</p>
                      <p className="t-small mt-1 text-stone-ink">{t.scope.partsHint}</p>
                      <div className="mt-3">
                        <PartChips t={t} id={id} selection={selection} onPart={onPart} />
                      </div>
                    </div>
                  )}
                  <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-ink px-4 py-3 text-paper">
                    <span className="font-semibold">{t.scope.subtotal}</span>
                    <span className="font-display text-[18px] font-bold tabular-nums">{money(q.subtotal)}</span>
                  </div>
                  {!hasVolume && !scope.base && <p className="t-small mt-2 px-1 font-medium text-error">{t.scope.zeroHint}</p>}
                </>
              )}
            </section>
          );
        })}
      </div>
    </>
  );
}

/* ── Шаг 3: доп. работы и параметры ──────────────────────── */

function ExtrasStep({
  t,
  selection,
  money,
  qty,
  setQty,
  setComplexity,
  setUrgency,
  currency,
}: {
  t: CalcDict;
  selection: Selection;
  currency: Currency;
  money: (v: number) => string;
  qty: (v: number) => string;
  setQty: (k: ItemKey, v: number) => void;
  setComplexity: (c: ComplexityKey) => void;
  setUrgency: (u: UrgencyKey) => void;
}) {
  return (
    <div className="space-y-10">
      <section aria-labelledby="ex-work">
        <h3 id="ex-work" className="t-h4">
          {t.extras.workTitle}
        </h3>
        <p className="mt-1 text-[15px] text-stone-ink">{t.extras.workHint}</p>
        <div className="mt-4 space-y-2 rounded-card bg-sand/60 p-3 sm:p-4">
          {EXTRA_ITEMS.map((k) => (
            <QtyRow key={k} k={k} value={selection.qty[k] ?? 0} onChange={(v) => setQty(k, v)} t={t} money={money} qty={qty} currency={currency} hint={t.extraHints[k]} />
          ))}
        </div>
      </section>

      <RadioCards legend={t.extras.complexityTitle} name="complexity" value={selection.complexity} onChange={setComplexity} options={(Object.keys(COMPLEXITY) as ComplexityKey[]).map((k) => ({ value: k, title: t.complexity[k].title, text: t.complexity[k].text, badge: COMPLEXITY[k].factor === 1 ? t.extras.noSurcharge : fmt(t.extras.surcharge, { pct: pct(COMPLEXITY[k].factor) }) }))} />
      <RadioCards legend={t.extras.urgencyTitle} name="urgency" value={selection.urgency} onChange={setUrgency} options={(Object.keys(URGENCY) as UrgencyKey[]).map((k) => ({ value: k, title: t.urgency[k].title, text: t.urgency[k].text, badge: URGENCY[k].factor === 1 ? t.extras.noSurcharge : fmt(t.extras.surcharge, { pct: pct(URGENCY[k].factor) }) }))} />
    </div>
  );
}

function RadioCards<T extends string>({ legend, name, value, onChange, options }: { legend: string; name: string; value: T; onChange: (v: T) => void; options: { value: T; title: string; text: string; badge: string }[] }) {
  return (
    <fieldset>
      <legend className="t-h4">{legend}</legend>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {options.map((o) => (
          <label key={o.value} className="relative cursor-pointer">
            <input type="radio" name={name} value={o.value} checked={value === o.value} onChange={() => onChange(o.value)} className="peer absolute inset-0 cursor-pointer opacity-0" />
            <span className="flex h-full flex-col rounded-2xl border-2 border-ink/15 bg-white/60 p-4 transition-colors peer-checked:border-ink peer-checked:bg-white peer-hover:border-ink/40 peer-focus-visible:outline-[3px] peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ink">
              <span className="flex items-start justify-between gap-2">
                <span className="font-semibold">{o.title}</span>
                <span className={cn("shrink-0 rounded-pill px-2 py-0.5 font-mono text-[12px]", value === o.value ? "bg-coral text-ink" : "bg-sand")}>{o.badge}</span>
              </span>
              <span className="mt-1 text-[14px] text-stone-ink">{o.text}</span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/* ── Шаг 4: смета ────────────────────────────────────────── */

function SummaryStep({
  t,
  locale,
  quote,
  money,
  qty,
  calcId,
  projectName,
  setProjectName,
  pdf,
  onBrief,
  onEdit,
}: {
  t: CalcDict;
  locale: Locale;
  quote: Quote;
  money: (v: number) => string;
  qty: (v: number) => string;
  calcId: string;
  projectName: string;
  setProjectName: (v: string) => void;
  pdf: PdfState;
  onBrief: () => void;
  onEdit: (s: Step) => void;
}) {
  if (quote.isEmpty) {
    return (
      <div className="rounded-card border-2 border-dashed border-ink/25 p-6">
        <p className="t-body-l">{t.pick.empty}</p>
        <Button variant="ink" className="mt-5" onClick={() => onEdit("services")}>
          {t.steps.services}
        </Button>
      </div>
    );
  }
  const Lines = ({ lines }: { lines: Quote["services"][number]["lines"] }) => (
    <ul className="divide-y divide-ink/10">
      {lines.map((l) => (
        <li key={l.key} className="grid grid-cols-[1fr_auto] items-baseline gap-x-4 py-2.5 text-[15px]">
          <span className="min-w-0">
            {t.items[l.key]}
            <span className="block text-[13px] text-stone-ink tabular-nums">
              {qty(l.qty)} {t.units[l.unit]} × {money(l.unitPrice)}
            </span>
          </span>
          <span className="text-right font-semibold tabular-nums">{money(l.amount)}</span>
        </li>
      ))}
    </ul>
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
        <div>
          <label htmlFor="calc-project" className="mb-2 block text-[15px] font-semibold">
            {t.summary.projectName} <span className="font-normal text-stone-ink">{t.summary.optional}</span>
          </label>
          <input id="calc-project" value={projectName} maxLength={120} onChange={(e) => setProjectName(e.target.value)} placeholder={t.summary.projectNamePh} className="block min-h-[52px] w-full rounded-2xl border-2 border-ink/20 bg-white px-4 text-base placeholder:text-stone-ink/80 hover:border-ink/50 focus:border-ink focus:outline-none" />
        </div>
        <p className="t-small text-stone-ink">
          {t.summary.calcId}: <span className="font-mono font-semibold text-ink">{calcId || "…"}</span>
        </p>
      </div>

      {quote.services.map((s) => (
        <SummaryService key={s.id} s={s} t={t} locale={locale} money={money} onEdit={() => onEdit("scope")}>
          <Lines lines={s.lines} />
        </SummaryService>
      ))}

      {quote.extras.lines.length > 0 && (
        <section aria-labelledby="sum-extras" className="rounded-card bg-white p-4 sm:p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 id="sum-extras" className="t-h4">
              {t.summary.extras}
            </h3>
            <button type="button" onClick={() => onEdit("extras")} className="text-[14px] font-semibold underline decoration-ink/30 underline-offset-4 hover:decoration-coral">
              {t.nav.edit}
            </button>
          </div>
          <div className="mt-3">
            <Lines lines={quote.extras.lines} />
          </div>
        </section>
      )}

      <section aria-labelledby="sum-total" className="rounded-card bg-ink p-5 text-paper sm:p-7">
        <h3 id="sum-total" className="sr-only">
          {t.summary.total}
        </h3>
        <Totals t={t} quote={quote} money={money} dark />
        <div className="mt-5 rounded-2xl bg-coral p-4 text-ink sm:p-5">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="font-display text-[18px] font-bold">{t.summary.total}</p>
              {quote.hasOnRequest && <p className="text-[13px]">{t.summary.totalNote}</p>}
            </div>
            <p className="font-display text-[clamp(1.75rem,5vw,2.5rem)] leading-none font-black tabular-nums">{money(quote.total)}</p>
          </div>
        </div>
        {quote.timeline && (
          <div className="mt-5 flex flex-wrap items-baseline justify-between gap-2 border-t border-paper/15 pt-4">
            <span className="text-paper/80">{t.summary.timeline}</span>
            <span className="font-display text-[18px] font-bold">{formatDays(quote.timeline, t.days, locale)}</span>
          </div>
        )}
        {quote.services.filter((x) => x.days.max > 0).length > 1 && <p className="t-small mt-2 text-paper/65">{t.summary.timelineNote}</p>}
        {quote.hasOnRequest && <p className="t-small mt-1 text-paper/65">{t.summary.timelineOnRequest}</p>}
      </section>

      <p className="flex gap-2 rounded-2xl bg-sand p-4 text-[15px] font-medium">
        <Icon name="alert" size={20} className="mt-0.5 shrink-0" />
        <span>
          {t.page.disclaimer} <span className="font-normal text-stone-ink">{t.page.currency}</span>
        </span>
      </p>

      <Actions t={t} pdf={pdf} onBrief={onBrief} quote={quote} />
    </div>
  );
}

function SummaryService({ s, t, locale, money, onEdit, children }: { s: QuoteService; t: CalcDict; locale: Locale; money: (v: number) => string; onEdit: () => void; children: ReactNode }) {
  const svc = t.services[s.id];
  const req = requestPartNames(t, s);
  return (
    <section aria-labelledby={`sum-${s.id}`} className={cn("rounded-card p-4 sm:p-6", s.requestOnly ? "border-2 border-dashed border-ink/25" : "bg-white")}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 id={`sum-${s.id}`} className="t-h4">
          {serviceTitle(t, s)}
        </h3>
        <button type="button" onClick={onEdit} className="text-[14px] font-semibold underline decoration-ink/30 underline-offset-4 hover:decoration-coral">
          {t.nav.edit}
        </button>
      </div>
      <p className="mt-1 text-[14px] text-stone-ink">{svc.short}</p>
      {s.requestOnly ? (
        <div className="mt-3 flex flex-wrap items-baseline justify-between gap-2 rounded-2xl bg-paper px-4 py-3">
          <span className="text-[15px]">{req.length ? req.join(" · ") : svc.deliverables.join(" · ")}</span>
          <span className="font-semibold text-stone-ink">{t.summary.onRequest}</span>
        </div>
      ) : (
        <>
          <div className="mt-3">{children}</div>
          {req.length > 0 && (
            <ul className="divide-y divide-ink/10 border-t border-ink/10">
              {req.map((r) => (
                <li key={r} className="flex justify-between gap-4 py-2.5 text-[15px]">
                  <span>{r}</span>
                  <span className="text-stone-ink">{t.summary.onRequest}</span>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-paper px-4 py-3">
            <span className="text-[15px]">
              <span className="font-semibold">{t.scope.subtotal}</span>
              {s.days.max > 0 && <> · {formatDays(s.days, t.days, locale)}</>}
            </span>
            <span className="font-display text-[17px] font-bold tabular-nums">{money(s.subtotal)}</span>
          </div>
        </>
      )}
      <details className="group mt-3">
        <summary className="inline-flex min-h-10 cursor-pointer items-center gap-1.5 text-[14px] font-semibold">
          {t.pick.includes} / {t.pick.excludes}
          <Icon name="plus" size={14} className="transition-transform group-open:rotate-45" />
        </summary>
        <div className="mt-2 grid gap-4 text-[14px] sm:grid-cols-2">
          <ListBlock title={t.pick.includes} items={svc.includes.length ? svc.includes : svc.deliverables} tone="in" />
          <ListBlock title={t.pick.excludes} items={svc.excludes} tone="out" />
        </div>
      </details>
    </section>
  );
}

function Totals({ t, quote, money, dark }: { t: CalcDict; quote: Quote; money: (v: number) => string; dark?: boolean }) {
  const row = "flex items-baseline justify-between gap-3 py-1.5 text-[15px]";
  const muted = dark ? "text-paper/75" : "text-stone-ink";
  return (
    <div>
      <div className={row}>
        <span className={muted}>{t.summary.base}</span>
        <span className="font-semibold tabular-nums">{money(quote.base)}</span>
      </div>
      {quote.complexity.factor !== 1 && (
        <div className={row}>
          <span className={muted}>
            {fmt(t.summary.complexity, { level: t.complexity[quote.complexity.key].title })} · +{pct(quote.complexity.factor)}
          </span>
          <span className="font-semibold tabular-nums">{money(quote.complexity.delta)}</span>
        </div>
      )}
      {quote.urgency.factor !== 1 && (
        <div className={row}>
          <span className={muted}>
            {fmt(t.summary.urgency, { level: t.urgency[quote.urgency.key].title })} · +{pct(quote.urgency.factor)}
          </span>
          <span className="font-semibold tabular-nums">{money(quote.urgency.delta)}</span>
        </div>
      )}
    </div>
  );
}

/* ── Смета сбоку ─────────────────────────────────────────── */

function SideSummary({ t, locale, quote, money, calcId, onOpen, isSummary }: { t: CalcDict; locale: Locale; quote: Quote; money: (v: number) => string; calcId: string; onOpen: () => void; isSummary: boolean }) {
  return (
    <div className="rounded-card bg-white p-6 shadow-[0_20px_40px_-28px_rgb(18_18_18/0.5)]">
      <div className="flex items-center justify-between gap-3">
        <p className="t-label flex items-center gap-2 text-stone-ink">
          <span aria-hidden="true" className="size-2.5 rounded-full bg-coral" />
          {t.summary.title}
        </p>
        {calcId && <span className="font-mono text-[12px] text-stone-ink">{calcId}</span>}
      </div>
      {quote.isEmpty ? (
        <p className="mt-4 text-[15px] text-stone-ink">{t.summary.empty}</p>
      ) : (
        <>
          <ul className="mt-4 divide-y divide-ink/10 text-[15px]">
            {quote.services.map((s) => (
              <li key={s.id} className="flex items-baseline justify-between gap-3 py-2">
                <span className="min-w-0">
                  {t.services[s.id].title}
                  {!s.requestOnly && s.days.max > 0 && <span className="block text-[13px] text-stone-ink">{formatDays(s.days, t.days, locale)}</span>}
                  {!s.requestOnly && s.parts.length > 0 && <span className="block text-[13px] text-stone-ink">+ {requestPartNames(t, s).join(", ")} — {t.summary.onRequest}</span>}
                </span>
                {s.requestOnly ? <span className="shrink-0 text-stone-ink">{t.summary.onRequest}</span> : <span className="font-semibold tabular-nums">{money(s.subtotal)}</span>}
              </li>
            ))}
            {quote.extras.lines.length > 0 && (
              <li className="flex items-baseline justify-between gap-3 py-2">
                <span>{t.summary.extras}</span>
                <span className="font-semibold tabular-nums">{money(quote.extras.subtotal)}</span>
              </li>
            )}
          </ul>
          <div className="mt-2 border-t-2 border-ink pt-3">
            <Totals t={t} quote={quote} money={money} />
          </div>
        </>
      )}
      <div className="mt-4 rounded-2xl bg-paper p-4" aria-live="polite">
        <div className="flex items-end justify-between gap-2">
          <span className="font-semibold">{t.summary.total}</span>
          <span className="font-display text-[28px] leading-none font-black tabular-nums">{money(quote.total)}</span>
        </div>
        {quote.hasOnRequest && <p className="mt-1 text-[13px] text-stone-ink">{t.summary.totalNote}</p>}
        {quote.timeline && (
          <p className="mt-2 text-[14px]">
            <span className="text-stone-ink">{t.summary.timeline}: </span>
            <span className="font-semibold">{formatDays(quote.timeline, t.days, locale)}</span>
          </p>
        )}
      </div>
      <p className="t-small mt-3 text-stone-ink">{t.page.disclaimer}</p>
      {!isSummary && (
        <Button variant="ink" onClick={onOpen} disabled={quote.isEmpty} className="mt-5 w-full">
          {t.summary.open}
        </Button>
      )}
    </div>
  );
}
