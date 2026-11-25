"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Locale } from "@/i18n/config";
import type { CalcDict } from "@/i18n/calculator/ru";
import { EXTRA_ITEMS, SERVICE_IDS, SERVICES, WEB_VARIANTS, serviceScope, unitPrice, type Currency, type ItemKey, type ServiceId, type WebVariant } from "@/lib/calculator/catalog";
import { computeQuote, emptySelection, parseSelection, selectionSignature, setVariant, togglePart, toggleService, type Quote, type Selection } from "@/lib/calculator/engine";
import { calcCurrency, formatDays, moneyFormatter, qtyFormatter, requestPartNames } from "@/lib/calculator/format";
import { newCalcId } from "@/lib/calculator/ids";
import { cn } from "@/lib/cn";
import { Button } from "../ui/Button";
import { Icon } from "../ui/Icon";
import { BriefDialog } from "./BriefDialog";
import { PdfLink, usePdf, type PdfState } from "./Pdf";
import { QtyRow } from "./QtyField";

const STORAGE_KEY = "byuro:calculator:v1";

type Saved = { selection: Selection; projectName: string; calc: { sig: string; id: string } };

export type CalculatorProps = {
  locale: Locale;
  t: CalcDict;
  briefEnabled: boolean;
  privacyHref: string;
  instagram: { url: string; handle: string };
};

/* Калькулятор — один экран, без шагов:
   выбрал услугу → сразу видишь сумму (панель сбоку на десктопе, плашка внизу на телефоне)
   → «Оставить заявку» открывает бриф с приложенной сметой (там же PDF).
   Состав работ настраивается по желанию прямо в карточке выбранной услуги.
   Сложность и срочность клиент не выбирает (всегда «стандартная» / «без срочности»):
   их обсуждаем после брифа, чтобы цена на сайте не росла от наценок.
   Расчёт мгновенный в браузере; PDF и бриф сервер пересчитывает сам.
   Выбор хранится в sessionStorage вкладки и переживает перезагрузку. */
export function Calculator({ locale, t, briefEnabled, privacyHref, instagram }: CalculatorProps) {
  const [selection, setSelection] = useState<Selection>(emptySelection);
  const [projectName, setProjectName] = useState("");
  const [calc, setCalc] = useState<{ sig: string; id: string }>({ sig: "", id: "" });
  const [ready, setReady] = useState(false);
  const [briefOpen, setBriefOpen] = useState(false);
  const [editing, setEditing] = useState<ServiceId[]>([]);
  // Страница статическая: включена ли отправка, уточняем у сервера по текущим переменным окружения
  const [briefOn, setBriefOn] = useState(briefEnabled);
  useEffect(() => {
    fetch("/api/brief/", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { enabled?: boolean } | null) => typeof d?.enabled === "boolean" && setBriefOn(d.enabled))
      .catch(() => {});
  }, []);
  const topRef = useRef<HTMLDivElement>(null);
  // на главной калькулятор — третий экран: плашку итога показываем, только когда он в зоне видимости
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

  // Восстановление после перезагрузки (наценки за сложность и срочность больше не выбираются — сбрасываем)
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Partial<Saved>;
        const parsed = parseSelection(saved.selection, false);
        if (parsed.ok) setSelection({ ...parsed.selection, complexity: "simple", urgency: "none" });
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
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ selection, projectName, calc } satisfies Saved));
    } catch {
      /* ignore */
    }
  }, [ready, selection, projectName, calc]);

  const setQty = (k: ItemKey, v: number) => setSelection((s) => ({ ...s, qty: { ...s.qty, [k]: v } }));
  const toggle = (id: ServiceId) => {
    if (selection.services.includes(id)) setEditing((e) => e.filter((x) => x !== id));
    setSelection((s) => toggleService(s, id));
  };
  const toggleEdit = (id: ServiceId) => setEditing((e) => (e.includes(id) ? e.filter((x) => x !== id) : [...e, id]));
  const reset = () => {
    setSelection(emptySelection());
    setProjectName("");
    setEditing([]);
  };
  const openBrief = () => !quote.isEmpty && setBriefOpen(true);

  const calcId = ready ? calc.id : "";
  const pdf = usePdf({ locale, selection, calcId, projectName, quote });
  const extrasCount = EXTRA_ITEMS.filter((k) => (selection.qty[k] ?? 0) > 0).length;

  return (
    <div id="calc-root" ref={topRef} className="scroll-mt-[calc(var(--header-h)+12px)]">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(320px,400px)] lg:gap-10 xl:gap-14">
        <div className="min-w-0">
          <h3 className="t-h3">{t.pick.title}</h3>
          <p className="t-body-l mt-3 max-w-[40rem] text-ink/80">{t.pick.hint}</p>

          <ul className="mt-6 grid gap-3 sm:grid-cols-2 sm:gap-4">
            {SERVICE_IDS.map((id) => (
              <ServiceCard
                key={id}
                id={id}
                t={t}
                locale={locale}
                selection={selection}
                quote={quote}
                currency={currency}
                money={money}
                qty={qty}
                editing={editing.includes(id)}
                onToggle={() => toggle(id)}
                onEdit={() => toggleEdit(id)}
                setQty={setQty}
                onVariant={(v) => setSelection((s) => setVariant(s, v))}
                onPart={(sid, n) => setSelection((s) => togglePart(s, sid, n))}
              />
            ))}
          </ul>

          {/* Доп. работы ко всему проекту — по желанию */}
          <details className="group mt-6 rounded-card border-2 border-ink/15 bg-white/60 open:border-ink/40" open={extrasCount > 0 || undefined}>
            <summary className="flex min-h-14 cursor-pointer items-center justify-between gap-3 px-5 py-3 sm:px-6">
              <span>
                <span className="t-h4">{t.extras.workTitle}</span>
                {extrasCount > 0 && <span className="ml-2 rounded-pill bg-ink px-2 py-0.5 text-[12px] font-semibold text-paper">{extrasCount}</span>}
                <span className="mt-0.5 block text-[14px] text-stone-ink">{t.extras.workHint}</span>
              </span>
              <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-full border-2 border-ink transition-transform group-open:rotate-45">
                <Icon name="plus" size={16} />
              </span>
            </summary>
            <div className="space-y-2 px-3 pb-4 sm:px-4">
              {EXTRA_ITEMS.map((k) => (
                <QtyRow key={k} k={k} value={selection.qty[k] ?? 0} onChange={(v) => setQty(k, v)} t={t} money={money} qty={qty} currency={currency} hint={t.extraHints[k]} />
              ))}
            </div>
          </details>

          {!quote.isEmpty && (
            <div className="mt-6 flex justify-end">
              <button type="button" onClick={reset} className="min-h-11 rounded-pill px-3 text-[15px] font-medium text-stone-ink underline decoration-ink/30 underline-offset-4 hover:text-ink">
                {t.nav.reset}
              </button>
            </div>
          )}
        </div>

        {/* Смета сбоку (десктоп) */}
        <aside aria-label={t.summary.title} className="hidden lg:block">
          <div className="sticky top-[calc(var(--header-h)+20px)]">
            <SideSummary t={t} locale={locale} quote={quote} money={money} pdf={pdf} onBrief={openBrief} />
          </div>
        </aside>
      </div>

      {/* Итог внизу экрана (телефон и планшет): появляется, как только что-то выбрано */}
      {inView && !quote.isEmpty && (
        <div className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(12px,env(safe-area-inset-bottom))] lg:hidden">
          <div className="flex items-center gap-3 rounded-[22px] bg-ink p-2 pl-4 text-paper shadow-[0_10px_30px_rgb(18_18_18/0.3)]">
            <div className="min-w-0 flex-1" aria-live="polite">
              <p className="truncate font-display text-[18px] leading-tight font-bold tabular-nums">
                <span className="mr-1.5 font-sans text-[13px] font-medium text-paper/70">{t.summary.total}</span>
                {money(quote.total)}
              </p>
              <p className="truncate text-[12px] text-paper/70">{quote.timeline ? formatDays(quote.timeline, t.days, locale) : quote.hasOnRequest ? t.summary.totalNote : null}</p>
            </div>
            <button type="button" onClick={openBrief} className="min-h-12 shrink-0 rounded-pill bg-coral px-5 font-semibold text-ink">
              {t.actions.lead}
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
        pdf={pdf}
        enabled={briefOn}
        privacyHref={privacyHref}
        instagram={instagram}
        money={money}
      />
    </div>
  );
}

/* ── Стартовый пакет ─────────────────────────────────────── */

/** Стартовый пакет услуги — ровно то, что попадёт в расчёт при её выборе
    (база + стартовый объём, без коэффициентов); null — только индивидуальная оценка.
    Цена на карточке и сумма после клика всегда совпадают. */
function startPackage(id: ServiceId, variant: WebVariant, currency: Currency) {
  if (SERVICES[id].requestOnly) return null;
  const sel = { ...emptySelection(), services: [id], variant, qty: { ...serviceScope(SERVICES[id], variant).defaults } };
  const q = computeQuote(sel, currency);
  return { quote: q, svc: q.services[0] };
}

/* ── Карточка услуги ─────────────────────────────────────── */

function ServiceCard({
  id,
  t,
  locale,
  selection,
  quote,
  currency,
  money,
  qty,
  editing,
  onToggle,
  onEdit,
  setQty,
  onVariant,
  onPart,
}: {
  id: ServiceId;
  t: CalcDict;
  locale: Locale;
  selection: Selection;
  quote: Quote;
  currency: Currency;
  money: (v: number) => string;
  qty: (v: number) => string;
  editing: boolean;
  onToggle: () => void;
  onEdit: () => void;
  setQty: (k: ItemKey, v: number) => void;
  onVariant: (v: WebVariant) => void;
  onPart: (id: ServiceId, i: number) => void;
}) {
  const on = selection.services.includes(id);
  const svc = t.services[id];
  const s = SERVICES[id];
  const pkg = startPackage(id, selection.variant, currency);
  const options = s.options.flatMap((g) => g.items);
  const inQuote = on ? quote.services.find((x) => x.id === id) : undefined;
  const canEdit = on && (!s.requestOnly || s.requestParts.length > 0);
  const editId = `calc-edit-${id}`;
  return (
    <li className={cn("flex flex-col rounded-card border-2 p-4 transition-colors sm:p-6", on ? "border-ink bg-white shadow-[0_14px_30px_-18px_rgb(18_18_18/0.45)]" : "border-ink/15 bg-white/60 hover:border-ink/40", editing && "sm:col-span-2")}>
      <div className="flex items-start justify-between gap-3">
        <h3 className="t-h4 pt-1.5 sm:pt-0">{svc.title}</h3>
        {/* телефон: компактная карточка — выбор круглой кнопкой справа от названия */}
        <button
          type="button"
          aria-pressed={on}
          aria-label={`${on ? t.pick.selected : t.pick.select}: ${svc.title}`}
          onClick={onToggle}
          className={cn("grid size-11 shrink-0 place-items-center rounded-full border-2 transition-colors sm:hidden", on ? "border-coral bg-coral text-ink" : "border-ink text-ink")}
        >
          <Icon name={on ? "check" : "plus"} size={20} />
        </button>
        {on && (
          <span className="hidden size-8 shrink-0 place-items-center rounded-full bg-coral sm:grid" aria-hidden="true">
            <Icon name="check" size={18} />
          </span>
        )}
      </div>
      <p className="mt-2 hidden text-[15px] text-ink/80 sm:block">{svc.short}</p>
      <ul className="mt-3 hidden flex-wrap gap-1.5 sm:flex" aria-label={t.pick.includes}>
        {svc.deliverables.map((d) => (
          <li key={d} className="rounded-pill bg-sand px-2.5 py-1 text-[13px] font-medium">
            {d}
          </li>
        ))}
      </ul>
      {!pkg ? (
        <p className="mt-2 font-display text-[17px] font-bold sm:mt-4">{t.pick.requestOnly}</p>
      ) : (
        <div className="mt-2 sm:mt-4">
          <p className="flex flex-wrap items-baseline gap-x-2 font-display text-[17px] font-bold">
            <span className="tabular-nums">{money(inQuote ? inQuote.subtotal : pkg.svc.subtotal)}</span>
            <span className="font-sans text-[13px] font-semibold text-stone-ink">{inQuote ? t.pick.inQuote : t.pick.startLabel}</span>
          </p>
          <p className="mt-1 text-[13px] leading-snug text-stone-ink">
            {(inQuote ?? pkg.svc).lines.map((l) => (l.kind === "base" ? t.items[l.key] : `${t.items[l.key]} × ${qty(l.qty)} ${t.units[l.unit]}`)).join(" + ")}
            {inQuote && inQuote.parts.length > 0 && ` + ${requestPartNames(t, inQuote).join(", ")} — ${t.summary.onRequest}`}
          </p>
        </div>
      )}

      {!on && (
        <details className="group mt-2 sm:mt-3">
          <summary className="inline-flex min-h-10 cursor-pointer items-center gap-1.5 text-[15px] font-semibold underline decoration-ink/30 underline-offset-4 hover:decoration-coral">
            {t.pick.details}
            <Icon name="plus" size={16} className="transition-transform group-open:rotate-45" />
          </summary>
          <div className="mt-3 space-y-4 text-[15px]">
            <p className="text-ink/80 sm:hidden">{svc.short}</p>
            {svc.includes.length > 0 && <ListBlock title={t.pick.includes} items={svc.includes} tone="in" />}
            <ListBlock title={t.pick.excludes} items={svc.excludes} tone="out" />
            {s.requestOnly ? (
              <p className="text-stone-ink">{t.scope.requestOnlyHint}</p>
            ) : (
              pkg?.quote.timeline && (
                <p>
                  <span className="font-semibold">{t.pick.timeline}: </span>
                  {formatDays(pkg.quote.timeline, t.days, locale)}
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
      )}

      {editing && on && (
        <div id={editId} className="mt-5 rounded-card bg-sand/60 p-3 sm:p-5">
          <ScopeEditor id={id} t={t} selection={selection} quote={quote} money={money} qty={qty} setQty={setQty} onVariant={onVariant} onPart={onPart} />
        </div>
      )}

      <div className={cn("mt-auto flex-col gap-2 pt-3 sm:flex sm:flex-row sm:pt-5", canEdit ? "flex" : "hidden")}>
        <button
          type="button"
          aria-pressed={on}
          onClick={onToggle}
          className={cn(
            "hidden min-h-12 flex-1 items-center justify-center gap-2 rounded-pill border-2 px-5 font-semibold transition-colors sm:inline-flex",
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
        {canEdit && (
          <button type="button" aria-expanded={editing} aria-controls={editing ? editId : undefined} onClick={onEdit} className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-pill border-2 border-ink/20 px-5 font-semibold transition-colors hover:border-ink sm:min-h-12">
            {editing ? t.pick.customizeDone : s.requestOnly ? t.pick.clarify : t.pick.customize}
          </button>
        )}
      </div>
    </li>
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

/* ── Состав работ внутри карточки ────────────────────────── */

function ScopeEditor({
  id,
  t,
  selection,
  quote,
  money,
  qty,
  setQty,
  onVariant,
  onPart,
}: {
  id: ServiceId;
  t: CalcDict;
  selection: Selection;
  quote: Quote;
  money: (v: number) => string;
  qty: (v: number) => string;
  setQty: (k: ItemKey, v: number) => void;
  onVariant: (v: WebVariant) => void;
  onPart: (id: ServiceId, i: number) => void;
}) {
  const s = SERVICES[id];
  const scope = serviceScope(s, selection.variant);
  const q = quote.services.find((x) => x.id === id);
  if (!q) return null;
  const hasVolume = q.lines.some((l) => l.kind !== "base") || q.parts.length > 0;
  if (s.requestOnly) {
    return (
      <div>
        <p className="text-[15px] text-ink/80">{t.scope.requestOnlyHint}</p>
        <div className="mt-4">
          <PartChips t={t} id={id} selection={selection} onPart={onPart} />
        </div>
      </div>
    );
  }
  return (
    <>
      <p className="px-1 pb-3 text-[15px] text-ink/80">{t.scope.hint}</p>
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
  );
}

/* ── Смета сбоку (десктоп) ───────────────────────────────── */

function SideSummary({ t, locale, quote, money, pdf, onBrief }: { t: CalcDict; locale: Locale; quote: Quote; money: (v: number) => string; pdf: PdfState; onBrief: () => void }) {
  return (
    <div className="rounded-card bg-white p-6 shadow-[0_20px_40px_-28px_rgb(18_18_18/0.5)]">
      <div className="flex items-center justify-between gap-3">
        <p className="t-label flex items-center gap-2 text-stone-ink">
          <span aria-hidden="true" className="size-2.5 rounded-full bg-coral" />
          {t.summary.title}
        </p>
      </div>
      {quote.isEmpty ? (
        <p className="mt-4 text-[15px] text-stone-ink">{t.summary.empty}</p>
      ) : (
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
      <p className="t-small mt-3 text-stone-ink">
        {t.page.disclaimer} {t.page.currency}
      </p>
      <Button variant="coral" onClick={onBrief} disabled={quote.isEmpty} className="mt-5 w-full">
        {t.actions.lead}
      </Button>
      <PdfLink t={t} pdf={pdf} className="mt-3" />
      {quote.isEmpty && <p className="t-small mt-2 text-stone-ink">{t.actions.pdfEmpty}</p>}
    </div>
  );
}
