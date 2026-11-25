"use client";
import { LEAD_GOAL, reachGoal } from "@/lib/analytics";
import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import { site } from "@/content/site";
import type { Locale } from "@/i18n/config";
import type { CalcDict } from "@/i18n/calculator/ru";
import { fmt } from "@/i18n/format";
import { type Quote, type Selection } from "@/lib/calculator/engine";
import { formatDays, requestPartNames } from "@/lib/calculator/format";
import { LIMITS, extractLinks, normalizeTelegram, validateBrief, type BriefErrors, type BriefRequest } from "@/lib/brief/schema";
import { briefText } from "@/lib/brief/text";
import { cn } from "@/lib/cn";
import { Button } from "../ui/Button";
import { Icon } from "../ui/Icon";
import { PdfLink, type PdfState } from "./Pdf";

type Fields = Pick<BriefRequest, "name" | "phone" | "telegram" | "email" | "company" | "description" | "deadline" | "links" | "comment"> & { consent: boolean };
const empty: Fields = { name: "", phone: "", telegram: "", email: "", company: "", description: "", deadline: "", links: "", comment: "", consent: false };
type Status = { kind: "idle" } | { kind: "loading" } | { kind: "success"; briefId: string; duplicate: boolean } | { kind: "error"; message: string };

/* Форма брифа. Расчёт (ID, услуги, суммы, сроки) прикладывается автоматически:
   браузер отправляет только выбор, сервер пересчитывает стоимость сам.
   Пока получатель брифов не подключён (enabled=false), отправка выключена
   с понятным пояснением — успех не имитируется. */
export function BriefDialog({
  open,
  onClose,
  t,
  locale,
  quote,
  selection,
  calcId,
  projectName,
  pdf,
  enabled,
  privacyHref,
  instagram,
  money,
}: {
  open: boolean;
  onClose: () => void;
  t: CalcDict;
  locale: Locale;
  quote: Quote;
  selection: Selection;
  calcId: string;
  projectName: string;
  pdf: PdfState;
  enabled: boolean;
  privacyHref: string;
  instagram: { url: string; handle: string };
  money: (v: number) => string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const uid = useId().replace(/:/g, "");
  const [f, setF] = useState<Fields>(empty);
  const [errors, setErrors] = useState<BriefErrors>({});
  const [touched, setTouched] = useState(false);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [copied, setCopied] = useState(false);
  // Один ключ на одну и ту же попытку: повтор сети или двойной клик не создаст вторую заявку
  const idemKey = useRef<string | null>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      d.showModal();
      document.documentElement.style.overflow = "hidden";
    }
    if (!open && d.open) d.close();
    return () => {
      document.documentElement.style.overflow = "";
    };
  }, [open]);

  // Любое изменение данных — новая попытка
  useEffect(() => {
    idemKey.current = null;
  }, [f, calcId]);

  const set = <K extends keyof Fields>(k: K, v: Fields[K]) => {
    const next = { ...f, [k]: v };
    setF(next);
    if (touched) setErrors(validateBrief({ ...next, projectName }));
    if (status.kind === "error") setStatus({ kind: "idle" });
  };

  const textForCopy = () =>
    briefText(t, locale, {
      calcId,
      createdAt: new Date(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      locale,
      quote,
      projectName,
      name: f.name,
      phone: f.phone,
      telegram: normalizeTelegram(f.telegram) ?? f.telegram,
      email: f.email,
      company: f.company,
      description: f.description,
      deadline: f.deadline,
      links: extractLinks(f.links),
      comment: f.comment,
    });

  async function copy() {
    try {
      await navigator.clipboard.writeText(textForCopy());
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setTouched(true);
    const errs = validateBrief({ ...f, projectName });
    setErrors(errs);
    if (Object.keys(errs).length) {
      const first = Object.keys(errs)[0];
      formRef.current?.querySelector<HTMLElement>(`[name="${first === "contacts" ? "phone" : first}"]`)?.focus();
      return;
    }
    if (!enabled || status.kind === "loading" || quote.isEmpty) return;
    idemKey.current ??= crypto.randomUUID();
    setStatus({ kind: "loading" });
    try {
      const body: BriefRequest = {
        ...f,
        idempotencyKey: idemKey.current,
        calcId,
        locale,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        selection,
        projectName,
        website: String(new FormData(formRef.current!).get("website") ?? ""),
      };
      const res = await fetch("/api/brief/", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(20_000) });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; briefId?: string; duplicate?: string; fields?: BriefErrors; error?: string };
      if (res.ok && data.ok && data.briefId) {
        setStatus({ kind: "success", briefId: data.briefId, duplicate: Boolean(data.duplicate) });
        // цель Метрики «Успешная отправка заявки»; повторная отправка того же расчёта не считается
        if (!data.duplicate) reachGoal(LEAD_GOAL, { form: "calculator", services: quote.services.map((s) => s.id).join(",") });
        return;
      }
      if (data.fields) setErrors(data.fields);
      const m = t.brief.errors;
      setStatus({ kind: "error", message: res.status === 429 ? m.rate : res.status === 503 ? m.notConfigured : res.status === 400 ? (data.error === "empty" ? m.emptyCalc : m.check) : m.generic });
    } catch {
      setStatus({ kind: "error", message: t.brief.errors.network });
    }
  }

  const err = (k: keyof BriefErrors) => (errors[k] ? t.brief.errors[errors[k]!] : undefined);
  const fid = (k: string) => `${uid}-${k}`;
  const disabledNoteId = fid("disabled");

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onCancel={onClose}
      aria-labelledby={fid("title")}
      className="m-0 h-full max-h-none w-full max-w-none bg-paper p-0 text-ink backdrop:bg-ink/60 sm:m-auto sm:h-auto sm:max-h-[92vh] sm:w-[min(760px,calc(100vw-32px))] sm:rounded-card"
    >
      <div className="flex h-full flex-col">
        <div className="flex items-start justify-between gap-4 border-b border-ink/10 px-5 pt-5 pb-4 sm:px-8 sm:pt-7">
          <div>
            <h2 id={fid("title")} className="t-h3">
              {t.brief.title}
            </h2>
            <p className="mt-1 text-[15px] text-ink/75">{t.brief.lead}</p>
          </div>
          <button type="button" onClick={onClose} aria-label={t.brief.close} className="grid size-11 shrink-0 place-items-center rounded-full transition-colors hover:bg-sand">
            <Icon name="close" size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pt-6 sm:px-8">
          {status.kind === "success" ? (
            <div role="status" className="pt-2 pb-10">
              <span className="grid size-14 place-items-center rounded-full bg-coral">
                <Icon name="check" size={28} />
              </span>
              <h3 className="t-h3 mt-5">{t.brief.successTitle}</h3>
              <p className="t-body-l mt-3 text-ink/80">{fmt(status.duplicate ? t.brief.duplicateText : t.brief.successText, { id: status.briefId })}</p>
              <Button variant="outline" icon={null} className="mt-8" onClick={onClose}>
                {t.brief.close}
              </Button>
            </div>
          ) : (
            <form ref={formRef} noValidate onSubmit={onSubmit}>
              {!enabled && (
                <div id={disabledNoteId} className="mb-6 rounded-2xl border-2 border-dashed border-stone-ink p-4">
                  <p className="flex items-start gap-2 font-semibold">
                    <Icon name="alert" size={20} className="mt-0.5 shrink-0" />
                    {t.brief.unavailableTitle}
                  </p>
                  <p className="mt-1 text-[15px] text-ink/80">{fmt(t.brief.unavailableText, { id: calcId })}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button type="button" onClick={copy} className="inline-flex min-h-11 items-center gap-2 rounded-pill bg-ink px-4 text-[15px] font-semibold text-paper transition-colors hover:bg-coral hover:text-ink">
                      <Icon name={copied ? "check" : "link"} size={18} />
                      {copied ? t.brief.copied : t.brief.copy}
                    </button>
                    {site.contacts.telegram && (
                      <a href={site.contacts.telegram.url} target="_blank" rel="noopener" className="inline-flex min-h-11 items-center gap-2 rounded-pill bg-coral px-4 text-[15px] font-semibold text-ink transition-colors hover:bg-ink hover:text-paper">
                        <Icon name="telegram" size={18} />
                        Telegram {site.contacts.telegram.handle}
                      </a>
                    )}
                    <a href={instagram.url} target="_blank" rel="noopener" className="inline-flex min-h-11 items-center gap-2 rounded-pill border-2 border-ink px-4 text-[15px] font-semibold transition-colors hover:bg-ink hover:text-paper">
                      {t.brief.instagram} {instagram.handle}
                      <Icon name="arrow-up-right" size={16} />
                    </a>
                  </div>
                  <span className="sr-only" aria-live="polite">
                    {copied ? t.brief.copied : ""}
                  </span>
                </div>
              )}

              <div aria-hidden="true" className="absolute left-[-9999px] size-px overflow-hidden">
                <label>
                  Website
                  <input type="text" name="website" tabIndex={-1} autoComplete="off" />
                </label>
              </div>

              {/* Приложенный расчёт */}
              <section aria-labelledby={fid("calc")} className="rounded-2xl bg-white p-4">
                <h3 id={fid("calc")} className="t-label text-stone-ink">
                  {t.brief.attached} · <span className="font-mono normal-case">{calcId}</span>
                </h3>
                {projectName && <p className="mt-2 font-semibold">{projectName}</p>}
                <ul className="mt-2 space-y-1 text-[14px]">
                  {quote.services.map((s) => (
                    <li key={s.id} className="flex justify-between gap-3">
                      <span>
                        {t.services[s.id].title}
                        {s.parts.length > 0 && !s.requestOnly && <span className="block text-stone-ink">+ {requestPartNames(t, s).join(", ")} — {t.summary.onRequest}</span>}
                      </span>
                      {s.requestOnly ? <span className="shrink-0 text-stone-ink">{t.summary.onRequest}</span> : <span className="tabular-nums">{money(s.subtotal)}</span>}
                    </li>
                  ))}
                  {quote.extras.lines.length > 0 && (
                    <li className="flex justify-between gap-3">
                      <span>{t.summary.extras}</span>
                      <span className="tabular-nums">{money(quote.extras.subtotal)}</span>
                    </li>
                  )}
                </ul>
                <p className="mt-3 flex flex-wrap justify-between gap-2 border-t border-ink/10 pt-3 font-semibold">
                  <span>
                    {t.summary.total}
                    {quote.timeline && <span className="font-normal text-stone-ink"> · {formatDays(quote.timeline, t.days, locale)}</span>}
                  </span>
                  <span className="tabular-nums">{money(quote.total)}</span>
                </p>
                <p className="t-small mt-2 text-stone-ink">
                  {t.page.disclaimer} {t.page.currency}
                </p>
                <PdfLink t={t} pdf={pdf} className="mt-1" />
              </section>

              <fieldset className="mt-6" aria-describedby={`${fid("contacts")}-hint${err("contacts") ? ` ${fid("contacts")}-err` : ""}`}>
                <legend className="t-h4">{t.brief.contactsLegend}</legend>
                <p id={`${fid("contacts")}-hint`} className="t-small mt-1 text-stone-ink">
                  {t.brief.contactsHint}
                </p>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <Field id={fid("name")} label={t.brief.name} error={err("name")} className="sm:col-span-2">
                    <input id={fid("name")} name="name" autoComplete="name" value={f.name} onChange={(e) => set("name", e.target.value)} maxLength={LIMITS.name + 1} placeholder={t.brief.namePh} aria-invalid={!!err("name")} aria-describedby={err("name") ? `${fid("name")}-err` : undefined} className={inputCls(!!err("name"))} />
                  </Field>
                  <Field id={fid("phone")} label={t.brief.phone} error={err("phone")}>
                    <input id={fid("phone")} name="phone" type="tel" autoComplete="tel" inputMode="tel" value={f.phone} onChange={(e) => set("phone", e.target.value)} placeholder={t.brief.phonePh} aria-invalid={!!err("phone") || !!err("contacts")} aria-describedby={err("phone") ? `${fid("phone")}-err` : undefined} className={inputCls(!!err("phone") || !!err("contacts"))} />
                  </Field>
                  <Field id={fid("telegram")} label={t.brief.telegram} error={err("telegram")}>
                    <input id={fid("telegram")} name="telegram" autoComplete="off" autoCapitalize="none" spellCheck={false} value={f.telegram} onChange={(e) => set("telegram", e.target.value)} placeholder={t.brief.telegramPh} aria-invalid={!!err("telegram") || !!err("contacts")} aria-describedby={err("telegram") ? `${fid("telegram")}-err` : undefined} className={inputCls(!!err("telegram") || !!err("contacts"))} />
                  </Field>
                  <Field id={fid("email")} label={t.brief.email} error={err("email")} className="sm:col-span-2">
                    <input id={fid("email")} name="email" type="email" autoComplete="email" value={f.email} onChange={(e) => set("email", e.target.value)} placeholder={t.brief.emailPh} aria-invalid={!!err("email") || !!err("contacts")} aria-describedby={err("email") ? `${fid("email")}-err` : undefined} className={inputCls(!!err("email") || !!err("contacts"))} />
                  </Field>
                </div>
                {err("contacts") && <ErrorText id={`${fid("contacts")}-err`}>{err("contacts")}</ErrorText>}
              </fieldset>

              <fieldset className="mt-8">
                <legend className="t-h4">{t.brief.projectLegend}</legend>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <Field id={fid("company")} label={t.brief.company} optional={t.brief.optional} error={err("company")}>
                    <input id={fid("company")} name="company" autoComplete="organization" value={f.company} onChange={(e) => set("company", e.target.value)} placeholder={t.brief.companyPh} className={inputCls(!!err("company"))} />
                  </Field>
                  <Field id={fid("deadline")} label={t.brief.deadline} optional={t.brief.optional} error={err("deadline")}>
                    <input id={fid("deadline")} name="deadline" value={f.deadline} onChange={(e) => set("deadline", e.target.value)} placeholder={t.brief.deadlinePh} className={inputCls(!!err("deadline"))} />
                  </Field>
                  <Field id={fid("description")} label={t.brief.description} optional={t.brief.optional} error={err("description")} className="sm:col-span-2">
                    <textarea id={fid("description")} name="description" rows={3} value={f.description} onChange={(e) => set("description", e.target.value)} placeholder={t.brief.descriptionPh} className={cn(inputCls(!!err("description")), "min-h-[96px] resize-y py-3")} />
                  </Field>
                  <Field id={fid("links")} label={t.brief.links} optional={t.brief.optional} error={err("links")} className="sm:col-span-2">
                    <textarea id={fid("links")} name="links" rows={2} value={f.links} onChange={(e) => set("links", e.target.value)} placeholder={t.brief.linksPh} spellCheck={false} className={cn(inputCls(!!err("links")), "min-h-[72px] resize-y py-3")} />
                  </Field>
                  <Field id={fid("comment")} label={t.brief.comment} optional={t.brief.optional} error={err("comment")} className="sm:col-span-2">
                    <textarea id={fid("comment")} name="comment" rows={2} value={f.comment} onChange={(e) => set("comment", e.target.value)} placeholder={t.brief.commentPh} className={cn(inputCls(!!err("comment")), "min-h-[72px] resize-y py-3")} />
                  </Field>
                </div>
              </fieldset>

              <div className="mt-6">
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    name="consent"
                    checked={f.consent}
                    onChange={(e) => set("consent", e.target.checked)}
                    aria-invalid={!!err("consent")}
                    aria-describedby={err("consent") ? `${fid("consent")}-err` : undefined}
                    className="mt-0.5 size-6 shrink-0 cursor-pointer appearance-none rounded-md border-2 border-ink bg-white bg-center bg-no-repeat checked:bg-ink checked:bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%23F1ECE2%22 stroke-width=%223%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22><path d=%22m5 12.5 4.5 4.5L19 7.5%22/></svg>')]"
                  />
                  <span className="t-small text-ink/80">
                    {t.brief.consent && <>{t.brief.consent} </>}
                    <a href={privacyHref} target="_blank" className="font-medium underline decoration-ink/40 underline-offset-2 hover:decoration-coral">
                      {t.brief.consentLink}
                    </a>
                    {t.brief.consentAfter}
                  </span>
                </label>
                {err("consent") && <ErrorText id={`${fid("consent")}-err`}>{err("consent")}</ErrorText>}
              </div>

              <div aria-live="polite">
                {status.kind === "error" && (
                  <p role="alert" className="mt-6 flex items-start gap-2 rounded-2xl bg-error/10 p-4 text-[15px] font-medium">
                    <Icon name="alert" size={20} className="mt-0.5 shrink-0 text-error" />
                    {status.message}
                  </p>
                )}
              </div>

              <div className="sticky bottom-0 -mx-5 mt-8 flex flex-col gap-3 border-t border-ink/10 bg-paper px-5 pt-4 pb-[max(16px,env(safe-area-inset-bottom))] sm:-mx-8 sm:flex-row sm:items-center sm:px-8 sm:pb-6">
                <Button type="submit" variant="coral" disabled={!enabled || status.kind === "loading"} aria-describedby={!enabled ? disabledNoteId : undefined} icon={status.kind === "loading" ? null : "arrow-right"} className="w-full sm:w-auto">
                  {status.kind === "loading" ? (
                    <span className="inline-flex items-center gap-3">
                      <span aria-hidden="true" className="size-5 animate-spin rounded-full border-[3px] border-ink/30 border-t-ink" />
                      {t.brief.sending}
                    </span>
                  ) : (
                    t.brief.submit
                  )}
                </Button>
                {!enabled && <p className="t-small text-stone-ink">{t.brief.unavailableTitle}</p>}
              </div>
            </form>
          )}
        </div>
      </div>
    </dialog>
  );
}

const inputCls = (invalid: boolean) =>
  cn(
    "block min-h-[52px] w-full rounded-2xl border-2 bg-white px-4 text-base text-ink placeholder:text-stone-ink/80 transition-colors focus:border-ink focus:outline-none",
    invalid ? "border-error" : "border-ink/20 hover:border-ink/50",
  );

function Field({ id, label, optional, error, className, children }: { id: string; label: string; optional?: string; error?: string; className?: string; children: ReactNode }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-2 block text-[15px] font-semibold">
        {label} {optional && <span className="font-normal text-stone-ink">{optional}</span>}
      </label>
      {children}
      {error && <ErrorText id={`${id}-err`}>{error}</ErrorText>}
    </div>
  );
}

function ErrorText({ id, children }: { id: string; children: ReactNode }) {
  return (
    <p id={id} className="t-small mt-1.5 flex items-start gap-1.5 font-medium text-error">
      <Icon name="alert" size={16} className="mt-0.5 shrink-0" />
      {children}
    </p>
  );
}
