import type { Locale } from "@/i18n/config";
import type { Dict } from "@/i18n/dictionaries/ru";
import { anchors, lp } from "@/i18n/paths";
import { ButtonLink } from "../ui/Button";
import { Icon } from "../ui/Icon";
import { Eyebrow } from "../ui/SectionHead";

/* Услуги — редакционный аккордеон на нативных <details>: работает без JS,
   с клавиатуры и на тач-экранах. */
export function Services({ locale, t }: { locale: Locale; t: Dict["services"] }) {
  const markAt = t.title.indexOf(t.mark);
  return (
    <section id="services" aria-labelledby="services-title" className="cv section relative">
      <div className="wrap grid gap-12 lg:grid-cols-12 lg:gap-8">
        <div className="lg:col-span-5">
          <div className="lg:sticky lg:top-[calc(var(--header-h)+40px)]" data-reveal>
            <Eyebrow>{t.eyebrow}</Eyebrow>
            <h2 id="services-title" className="t-h1 mt-5 lg:!text-[calc(clamp(2.4rem,4vw,4.25rem)*var(--hs,1))]">
              {markAt >= 0 ? (
                <>
                  {t.title.slice(0, markAt)}
                  <span className="marker">{t.mark}</span>
                  {t.title.slice(markAt + t.mark.length)}
                </>
              ) : (
                t.title
              )}
            </h2>
            <p className="t-lead mt-6 max-w-[30rem] text-ink/80">{t.lead}</p>
            <ButtonLink href={lp(locale, anchors.project)} variant="ink" className="mt-8">
              {t.cta}
            </ButtonLink>
          </div>
        </div>

        <ul className="border-t-2 border-ink lg:col-span-7">
          {t.items.map((s, i) => (
            <li key={s.id} className="border-b border-ink/20" data-reveal style={{ ["--d" as string]: `${i * 40}ms` }}>
              <details className="group" name="services" open={i === 0}>
                <summary className="flex items-start gap-4 py-6 sm:items-center sm:gap-6 sm:py-7 [&:hover_.svc-title]:translate-x-1">
                  <span className="t-mono w-7 shrink-0 pt-1.5 text-stone-ink sm:pt-0">{String(i + 1).padStart(2, "0")}</span>
                  <h3 className="svc-title t-h3 min-w-0 flex-1 transition-transform duration-300 ease-out-soft">{s.title}</h3>
                  <span aria-hidden="true" className="grid size-11 shrink-0 place-items-center rounded-full border-2 border-ink transition-all duration-300 group-open:rotate-45 group-open:border-coral group-open:bg-coral">
                    <Icon name="plus" size={20} />
                  </span>
                </summary>
                <div className="pb-8 pl-11 sm:pl-[3.25rem] sm:pr-16">
                  <p className="t-body-l max-w-[38rem] text-ink/85">{s.problem}</p>
                  <ul className="mt-5 flex flex-wrap gap-2" aria-label={t.deliverables}>
                    {s.deliverables.map((d, j) => (
                      <li key={d} className="rounded-pill border-2 border-white bg-sand px-3.5 py-1.5 text-[14px] font-medium shadow-[0_4px_10px_-6px_rgb(18_18_18/0.4)] transition-transform hover:-rotate-2" style={{ rotate: `${(j % 3) - 1}deg` }}>
                        {d}
                      </li>
                    ))}
                  </ul>
                </div>
              </details>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
