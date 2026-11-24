"use client";
import { useId, useState, type KeyboardEvent, type ReactNode } from "react";
import type { Dict } from "@/i18n/dictionaries/ru";
import { fmt } from "@/i18n/format";
import type { PartnerCalc } from "@/i18n/market";
import { cn } from "@/lib/cn";
import { Orb } from "../mm/Kit";
import { ButtonLink } from "../ui/Button";

/* Модели партнёрства: карточки раскрываются прямо в секции.
   Суммы приходят уже отформатированными с сервера (валюта и формат — из рынка версии сайта, src/i18n/market.ts). */

type T = Dict["partners"];

function Chip({ children, accent }: { children: ReactNode; accent?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-pill px-3.5 py-2 font-display text-[clamp(0.95rem,2.6vw,1.2rem)] leading-none font-bold whitespace-nowrap tabular-nums",
        accent ? "bg-coral text-ink" : "border-2 border-paper/35 text-paper",
      )}
    >
      {children}
    </span>
  );
}

function Op({ children }: { children: ReactNode }) {
  return (
    <span aria-hidden="true" className="font-display text-xl font-bold text-paper/60">
      {children}
    </span>
  );
}

/** Оператор не отрывается от следующего числа при переносе */
function Step({ op, children }: { op: string; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap">
      <Op>{op}</Op>
      {children}
    </span>
  );
}

function Rows({ rows }: { rows: [string, string][] }) {
  return (
    <dl className="grid gap-2.5">
      {rows.map(([k, v]) => (
        <div key={k} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 border-b border-dashed border-paper/20 pb-2.5">
          <dt className="text-paper/75">{k}</dt>
          <dd className="font-display font-bold whitespace-nowrap tabular-nums">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

function Result({ label, value }: { label: string; value: string }) {
  return (
    <div className="relative mt-5 overflow-hidden rounded-[22px] bg-coral px-5 py-4 text-ink sm:px-6 sm:py-5">
      <span aria-hidden="true" className="halftone absolute inset-y-0 right-0 w-1/3 opacity-40" />
      <p className="relative t-label">{label}</p>
      <p className="relative mt-1 font-display text-[clamp(2rem,6vw,3rem)] leading-none font-black tracking-tight tabular-nums">{value}</p>
    </div>
  );
}

export function PartnerModels({ t, calc, partnerHref }: { t: T; calc: PartnerCalc; partnerHref: string }) {
  const [open, setOpen] = useState<boolean[]>(() => t.models.map(() => false));
  const uid = useId();
  const c = t.calc;
  const toggle = (i: number) => setOpen((o) => o.map((v, j) => (j === i ? !v : v)));
  const close = (i: number) => setOpen((o) => o.map((v, j) => (j === i ? false : v)));
  const onEsc = (i: number) => (e: KeyboardEvent) => {
    if (e.key === "Escape" && open[i]) {
      e.stopPropagation();
      close(i);
      document.getElementById(`${uid}-btn-${i}`)?.focus();
    }
  };

  const details = [
    // Реферальная
    <>
      <p className="t-body-l text-paper/90">{c.referral.lead}</p>
      <div className="mt-6">
        <Rows
          rows={[
            [c.referral.project, calc.referral.project],
            [c.referral.rate, calc.referral.rate],
          ]}
        />
        <p className="sr-only">
          {c.equation}: {calc.referral.project} × {calc.referral.rate} = {calc.referral.earn}
        </p>
        <div aria-hidden="true" className="mt-5 flex flex-wrap items-center gap-2">
          <Chip>{calc.referral.project}</Chip>
          <Step op="×">
            <Chip>{calc.referral.rate}</Chip>
          </Step>
          <Step op="=">
            <Chip accent>{calc.referral.earn}</Chip>
          </Step>
        </div>
        <Result label={c.referral.earn} value={calc.referral.earn} />
      </div>
      <p className="t-small mt-4 text-paper/65">{c.note}</p>
      <ButtonLink href={partnerHref} className="mt-6 [text-wrap:balance] [word-break:auto-phrase]">
        {c.referral.cta}
      </ButtonLink>
    </>,
    // Агентская
    <>
      <p className="t-body-l text-paper/90">{c.agency.lead}</p>
      <div className="mt-6">
        <Rows
          rows={[
            [c.agency.fee, calc.agency.fee],
            [c.agency.price, calc.agency.price],
          ]}
        />
        <p className="sr-only">
          {c.equation}: {calc.agency.price} − {calc.agency.fee} = {calc.agency.earn}
        </p>
        <div aria-hidden="true" className="mt-5 flex flex-wrap items-center gap-2">
          <Chip>{calc.agency.price}</Chip>
          <Step op="−">
            <Chip>{calc.agency.fee}</Chip>
          </Step>
          <Step op="=">
            <Chip accent>{calc.agency.earn}</Chip>
          </Step>
        </div>
        <Result label={c.agency.earn} value={calc.agency.earn} />
        <p className="mt-4 flex items-start gap-2 text-paper/85">
          <span aria-hidden="true" className="mt-2 size-2 shrink-0 rounded-full bg-coral" />
          {fmt(c.agency.markup, { amount: calc.agency.earn, percent: calc.agency.markup })}
        </p>
      </div>
      <p className="t-small mt-4 text-paper/65">{c.note}</p>
      <ButtonLink href={partnerHref} className="mt-6 [text-wrap:balance] [word-break:auto-phrase]">
        {c.agency.cta}
      </ButtonLink>
    </>,
  ];

  return (
    <div className="mt-24 grid items-start gap-4 md:grid-cols-2" data-reveal>
      {t.models.map((m, i) => {
        const isOpen = open[i];
        const btnId = `${uid}-btn-${i}`;
        const panelId = `${uid}-panel-${i}`;
        return (
          <div
            key={m.title}
            onKeyDown={onEsc(i)}
            className={cn(
              "relative overflow-hidden rounded-[var(--radius-card)] bg-graphite transition-shadow duration-500",
              isOpen && "shadow-[0_0_0_2px_var(--color-coral)]",
            )}
          >
            <div className="p-7 sm:p-10">
              <p className="t-label text-paper/70">{t.modelLabel}</p>
              <h3 id={`${uid}-title-${i}`} className="t-h2 mt-3 pr-14 !text-[calc(clamp(1.55rem,3vw,2.5rem)*var(--hs,1))] [hyphens:auto]">
                {m.title}
              </h3>
              <p className="t-body-l mt-4 text-paper/85">{m.text}</p>
              <p className="t-small mt-6 flex items-center gap-2 text-paper/70">
                <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-coral" />
                {m.fits}
              </p>

              <button
                type="button"
                id={btnId}
                aria-expanded={isOpen}
                aria-controls={panelId}
                aria-describedby={`${uid}-title-${i}`}
                onClick={() => toggle(i)}
                className="group/more mt-7 inline-flex min-h-11 items-center gap-3 rounded-pill border-2 border-paper/35 py-2 pr-2 pl-5 font-display text-[15px] font-bold text-paper transition-colors hover:border-coral hover:text-coral focus-visible:border-coral"
              >
                {isOpen ? c.less : c.more}
                <span
                  aria-hidden="true"
                  className={cn(
                    "grid size-8 place-items-center rounded-full bg-coral text-ink transition-transform duration-500 ease-spring motion-reduce:transition-none",
                    isOpen && "rotate-45",
                  )}
                >
                  <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                    <path d="M8 2v12M2 8h12" />
                  </svg>
                </span>
              </button>
            </div>

            {/* Плавное раскрытие: grid-rows 0fr → 1fr, без измерения высоты в JS */}
            <div
              id={panelId}
              role="region"
              aria-labelledby={`${uid}-title-${i}`}
              inert={!isOpen}
              className={cn(
                "grid transition-[grid-template-rows,opacity] duration-500 ease-out motion-reduce:transition-none",
                isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
              )}
            >
              <div className="min-h-0 overflow-hidden">
                <div className="mx-7 border-t border-paper/15 pt-7 pb-8 sm:mx-10 sm:pb-10">{details[i]}</div>
              </div>
            </div>

            <Orb tone={i ? "paper" : "coral"} className="pointer-events-none absolute -top-6 -right-6 size-20 opacity-90" />
          </div>
        );
      })}
    </div>
  );
}
