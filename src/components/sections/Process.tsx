import type { Locale } from "@/i18n/config";
import type { Dict } from "@/i18n/dictionaries/ru";
import { fmt } from "@/i18n/format";
import { Sticker } from "../mm/Kit";
import { SectionHead } from "../ui/SectionHead";

/* Процесс — фирменная «точка-линия», линия пунктирная и «бежит». */
export function Process({ locale, t }: { locale: Locale; t: Dict["process"] }) {
  return (
    <section id="process" aria-labelledby="process-title" className="cv section grain relative bg-sand">
      <div className="wrap">
        <SectionHead id="process-title" eyebrow={t.eyebrow} title={t.title} lead={t.lead} />

        <ol className="relative mt-16 grid gap-12 md:mt-20 lg:grid-cols-5 lg:gap-6">
          <li aria-hidden="true" className="absolute top-2 bottom-2 left-[7px] w-0 border-l-2 border-dashed border-ink/35 lg:top-[7px] lg:right-0 lg:bottom-auto lg:left-0 lg:h-0 lg:w-auto lg:border-t-2 lg:border-l-0" />
          {t.steps.map((s, i) => (
            <li key={s.title} className="relative pl-10 lg:pt-12 lg:pl-0" data-reveal style={{ ["--d" as string]: `${i * 80}ms` }}>
              <span aria-hidden="true" className={`absolute top-1 left-0 size-4 rounded-full ring-4 ring-sand lg:top-0 ${i === t.steps.length - 1 ? "bg-coral" : "bg-ink"}`} />
              <p className="t-mono text-stone-ink">{fmt(t.step, { n: i + 1 }, locale)}</p>
              <h3 className="t-h4 mt-2">{s.title}</h3>
              <p className="mt-3 text-ink/80">{s.text}</p>
              <Sticker tone="white" rotate={i % 2 ? 2 : -2} className="mt-4 !text-[12px]">
                {s.output}
              </Sticker>
            </li>
          ))}
        </ol>

        <ul className="mt-20 grid gap-4 md:grid-cols-3">
          {t.principles.map((p, i) => (
            <li key={p.title} className="rounded-[var(--radius-card)] bg-paper p-7 sm:p-8" data-reveal style={{ ["--d" as string]: `${i * 70}ms` }}>
              <h3 className="t-h4 flex items-center gap-3">
                <span aria-hidden="true" className="size-3 shrink-0 rounded-full bg-coral" />
                {p.title}
              </h3>
              <p className="mt-3 text-ink/80">{p.text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
