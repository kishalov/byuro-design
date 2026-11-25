import type { Locale } from "@/i18n/config";
import type { Dict } from "@/i18n/dictionaries/ru";
import { fmt } from "@/i18n/format";
import { cn } from "@/lib/cn";
import { Rail } from "./Rail";

/* Как мы работаем — пять шагов лентой. На каждом шаге: что происходит и что вы получаете. */
export function LandingProcess({ locale, t, labels }: { locale: Locale; t: Dict["process"]; labels: { prev: string; next: string } }) {
  const steps = t.steps;
  return (
    <Rail id="process" title={t.title} lead={t.lead} labels={{ ...labels, slider: t.eyebrow }} className="relative overflow-hidden border-t border-ink/10 bg-sand py-16 sm:py-20">
      {steps.map((s, i) => (
        <li key={s.title} aria-roledescription="slide" aria-label={`${i + 1} / ${steps.length}: ${s.title}`} className="w-[78%] shrink-0 snap-start sm:w-[44%] lg:w-[30%] xl:w-[23%]">
          <div className="flex h-full flex-col rounded-[var(--radius-card)] bg-paper p-6 sm:p-7">
            <div className="flex items-center gap-3">
              <span aria-hidden="true" className={cn("grid size-10 shrink-0 place-items-center rounded-full font-display text-[16px] font-black", i === steps.length - 1 ? "bg-coral text-ink" : "bg-ink text-paper")}>
                {i + 1}
              </span>
              <p className="t-mono text-stone-ink">{fmt(t.step, { n: i + 1 }, locale)}</p>
            </div>
            <h3 className="t-h4 mt-5">{s.title}</h3>
            <p className="mt-2 flex-1 text-ink/80">{s.text}</p>
            <p className="mt-5 inline-flex self-start rounded-pill bg-white px-3 py-1.5 text-[13px] font-semibold">→ {s.output}</p>
          </div>
        </li>
      ))}
    </Rail>
  );
}
