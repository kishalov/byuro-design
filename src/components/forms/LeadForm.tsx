"use client";
import { useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import { site } from "@/content/site";
import type { Locale } from "@/i18n/config";
import type { Dict } from "@/i18n/dictionaries/ru";
import { lp } from "@/i18n/paths";
import { cn } from "@/lib/cn";
import { validateLead, type LeadErrors, type LeadPayload, type LeadType } from "@/lib/lead";
import { Mascot } from "../mm/Mascot";
import { Button } from "../ui/Button";
import { Icon } from "../ui/Icon";

type Status = "idle" | "loading" | "success" | "error" | "preview";
const isPreview = process.env.NEXT_PUBLIC_PREVIEW === "1";

export function LeadForm({ type, locale, t }: { type: LeadType; locale: Locale; t: Dict["form"] }) {
  const uid = useId().replace(/:/g, "");
  const formRef = useRef<HTMLFormElement>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [errors, setErrors] = useState<LeadErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  const read = (): LeadPayload => {
    const fd = new FormData(formRef.current!);
    return {
      type,
      locale,
      name: String(fd.get("name") ?? ""),
      contact: String(fd.get("contact") ?? ""),
      message: String(fd.get("message") ?? ""),
      services: type === "project" ? fd.getAll("services").map(String) : undefined,
      role: type === "partner" ? String(fd.get("role") ?? "") : undefined,
      model: type === "partner" ? String(fd.get("model") ?? "") : undefined,
      consent: fd.get("consent") === "on",
      website: String(fd.get("website") ?? ""),
    };
  };
  const revalidate = () => touched && setErrors(validateLead(read()));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setTouched(true);
    const payload = read();
    const errs = validateLead(payload);
    setErrors(errs);
    if (Object.keys(errs).length) {
      formRef.current?.querySelector<HTMLElement>(`[name="${Object.keys(errs)[0]}"]`)?.focus();
      return;
    }
    if (isPreview) {
      setStatus("preview");
      return;
    }
    setStatus("loading");
    setServerError(null);
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 15000);
    try {
      const res = await fetch("/api/lead", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload), signal: ctrl.signal });
      const data = (await res.json().catch(() => ({}))) as { fields?: LeadErrors };
      if (res.ok) {
        setStatus("success");
        formRef.current?.reset();
        return;
      }
      if (res.status === 400 && data.fields) setErrors(data.fields);
      setServerError(res.status === 429 ? t.errors.rate : res.status === 400 ? t.errors.check : t.errors.generic);
      setStatus("error");
    } catch {
      setServerError(t.errors.network);
      setStatus("error");
    } finally {
      clearTimeout(timer);
    }
  }

  if (status === "success") {
    return (
      <div role="status" className="flex min-h-[420px] flex-col items-start justify-center sm:flex-row sm:items-center sm:gap-8">
        <div className="anim-pop w-36 shrink-0 sm:w-44">
          <Mascot emotion="happy" alt={t.happyAlt} sizes="176px" />
        </div>
        <div>
          <h3 className="t-h2 mt-6 sm:mt-0">{type === "project" ? t.projectSuccessTitle : t.partnerSuccessTitle}</h3>
          <p className="t-body-l mt-4 max-w-[28rem] text-ink/80">{type === "project" ? t.projectSuccessText : t.partnerSuccessText}</p>
          <Button variant="outline" icon={null} className="mt-8" onClick={() => setStatus("idle")}>
            {t.again}
          </Button>
        </div>
      </div>
    );
  }

  const err = (k: keyof LeadErrors) => (errors[k] ? t.errors[errors[k]!] : undefined);
  const fid = (k: string) => `${uid}-${k}`;

  return (
    <form ref={formRef} noValidate onSubmit={onSubmit} onChange={revalidate} aria-describedby={isPreview ? fid("preview") : undefined}>
      {isPreview && (
        <p id={fid("preview")} className="t-small mb-6 flex gap-2 rounded-2xl border-2 border-dashed border-stone-ink p-4 text-stone-ink">
          <Icon name="alert" size={18} className="mt-0.5 shrink-0" />
          {t.preview}
        </p>
      )}
      <div aria-hidden="true" className="absolute left-[-9999px] size-px overflow-hidden">
        <label>
          {t.honeypot}
          <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field id={fid("name")} label={t.name} error={err("name")}>
          <input id={fid("name")} name="name" autoComplete="name" placeholder={t.namePh} aria-invalid={!!err("name")} aria-describedby={err("name") ? `${fid("name")}-err` : undefined} className={inputCls(!!err("name"))} />
        </Field>
        <Field id={fid("contact")} label={t.contact} hint={t.contactHint} error={err("contact")}>
          <input id={fid("contact")} name="contact" autoComplete="tel" placeholder={t.contactPh} aria-invalid={!!err("contact")} aria-describedby={`${fid("contact")}-hint${err("contact") ? ` ${fid("contact")}-err` : ""}`} className={inputCls(!!err("contact"))} />
        </Field>
      </div>

      {type === "project" ? (
        <fieldset className="mt-6">
          <legend className="mb-3 text-[15px] font-semibold">{t.servicesLegend}</legend>
          <div className="flex flex-wrap gap-2">
            {t.services.map((o) => (
              <Chip key={o} name="services" value={o} type="checkbox">
                {o}
              </Chip>
            ))}
          </div>
        </fieldset>
      ) : (
        <>
          <fieldset className="mt-6" aria-describedby={err("role") ? `${fid("role")}-err` : undefined}>
            <legend className="mb-3 text-[15px] font-semibold">{t.roleLegend}</legend>
            <div className="flex flex-wrap gap-2">
              {t.roles.map((o) => (
                <Chip key={o} name="role" value={o} type="radio">
                  {o}
                </Chip>
              ))}
            </div>
            {err("role") && <ErrorText id={`${fid("role")}-err`}>{err("role")}</ErrorText>}
          </fieldset>
          <fieldset className="mt-6">
            <legend className="mb-3 text-[15px] font-semibold">
              {t.modelLegend} <span className="font-normal text-stone-ink">{t.optional}</span>
            </legend>
            <div className="flex flex-wrap gap-2">
              {t.models.map((o) => (
                <Chip key={o} name="model" value={o} type="radio">
                  {o}
                </Chip>
              ))}
            </div>
          </fieldset>
        </>
      )}

      <div className="mt-6">
        <Field id={fid("message")} label={type === "project" ? t.messageProject : t.messagePartner} optional={t.optional} error={err("message")}>
          <textarea id={fid("message")} name="message" rows={4} maxLength={2000} placeholder={type === "project" ? t.messageProjectPh : t.messagePartnerPh} aria-invalid={!!err("message")} aria-describedby={err("message") ? `${fid("message")}-err` : undefined} className={cn(inputCls(!!err("message")), "min-h-[120px] resize-y py-3.5")} />
        </Field>
      </div>

      <div className="mt-6">
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            name="consent"
            aria-invalid={!!err("consent")}
            aria-describedby={err("consent") ? `${fid("consent")}-err` : undefined}
            className="mt-0.5 size-6 shrink-0 cursor-pointer appearance-none rounded-md border-2 border-ink bg-white bg-center bg-no-repeat checked:bg-ink checked:bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%23F1ECE2%22 stroke-width=%223%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22><path d=%22m5 12.5 4.5 4.5L19 7.5%22/></svg>')]"
          />
          <span className="t-small text-ink/80">
            {t.consent && <>{t.consent} </>}
            <a href={lp(locale, "/privacy/")} className="font-medium underline decoration-ink/40 underline-offset-2 hover:decoration-coral">
              {t.consentLink}
            </a>
            {t.consentAfter}
          </span>
        </label>
        {err("consent") && <ErrorText id={`${fid("consent")}-err`}>{err("consent")}</ErrorText>}
      </div>

      <div aria-live="polite">
        {status === "error" && serverError && (
          <div role="alert" className="mt-6 flex items-center gap-4 rounded-2xl bg-error/10 p-4 text-[15px] text-ink">
            <div className="w-14 shrink-0">
              <Mascot emotion="sad" alt={t.sadAlt} sizes="56px" />
            </div>
            <span>
              {serverError}{" "}
              <a href={site.contacts.instagram.url} target="_blank" rel="noopener" className="font-semibold underline">
                Instagram {site.contacts.instagram.handle}
              </a>
            </span>
          </div>
        )}
        {status === "preview" && (
          <div role="status" className="mt-6 flex gap-3 rounded-2xl bg-sand p-4 text-[15px]">
            <Icon name="check" size={20} className="mt-0.5 shrink-0" />
            <span>{t.previewOk}</span>
          </div>
        )}
      </div>

      <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
        <Button type="submit" disabled={status === "loading"} icon={status === "loading" ? null : "arrow-right"} className="w-full sm:w-auto">
          {status === "loading" ? (
            <span className="inline-flex items-center gap-3">
              <span aria-hidden="true" className="size-5 animate-spin rounded-full border-[3px] border-ink/30 border-t-ink" />
              {t.sending}
            </span>
          ) : (
            t.submit
          )}
        </Button>
        <p className="t-small text-stone-ink">{t.note}</p>
      </div>
    </form>
  );
}

const inputCls = (invalid: boolean) =>
  cn(
    "block min-h-[52px] w-full rounded-2xl border-2 bg-white px-4 text-base text-ink placeholder:text-stone-ink/80 transition-colors focus:border-ink focus:outline-none focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-ink",
    invalid ? "border-error" : "border-ink/20 hover:border-ink/50",
  );

function Field({ id, label, hint, optional, error, children }: { id: string; label: string; hint?: string; optional?: string; error?: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-[15px] font-semibold">
        {label} {optional && <span className="font-normal text-stone-ink">{optional}</span>}
      </label>
      {children}
      {hint && (
        <p id={`${id}-hint`} className="t-small mt-1.5 text-stone-ink">
          {hint}
        </p>
      )}
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

function Chip({ name, value, type, children }: { name: string; value: string; type: "checkbox" | "radio"; children: ReactNode }) {
  return (
    <label className="relative cursor-pointer">
      <input type={type} name={name} value={value} className="peer absolute inset-0 cursor-pointer opacity-0" />
      <span className="flex min-h-11 items-center gap-2 rounded-pill border-2 border-ink/20 bg-white px-4 text-[15px] font-medium transition-[colors,transform] peer-hover:border-ink/50 peer-checked:-rotate-2 peer-checked:border-ink peer-checked:bg-ink peer-checked:text-paper peer-focus-visible:outline-[3px] peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ink">
        {children}
      </span>
    </label>
  );
}
