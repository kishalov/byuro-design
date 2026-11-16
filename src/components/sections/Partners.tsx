import type { Locale } from "@/i18n/config";
import type { Dict } from "@/i18n/dictionaries/ru";
import { anchors, lp } from "@/i18n/paths";
import { Mascot } from "../mm/Mascot";
import { DashPath, Orb, Sticker } from "../mm/Kit";
import { ButtonLink } from "../ui/Button";
import { Eyebrow } from "../ui/SectionHead";

/* Партнёрская программа — тёмный «разворот».
   Сценарий: боли партнёров (сердитый маскот в окружении реплик) →
   наш ответ → как это работает → модели → CTA. */
export function Partners({ locale, t }: { locale: Locale; t: Dict["partners"] }) {
  const rot = [-2.5, 1.5, -1, 2.5, -2, 1];
  return (
    <section id="partners" aria-labelledby="partners-title" className="cv on-dark relative overflow-hidden bg-ink text-paper">
      <div aria-hidden="true" className="absolute -top-[18vw] right-[-12vw] size-[40vw] min-h-[260px] min-w-[260px] rounded-full bg-coral max-md:-top-[150px] max-md:right-[-170px]">
        <div className="halftone size-full rounded-full" />
      </div>
      <div aria-hidden="true" className="dot-grid-dark absolute inset-0 [mask-image:linear-gradient(to_bottom,#000,transparent_55%)]" />

      <div className="wrap section relative">
        <div className="max-w-[64rem]" data-reveal>
          <Eyebrow dark>{t.eyebrow}</Eyebrow>
          <h2 id="partners-title" className="t-display mt-6 !text-[calc(clamp(2rem,8vw,6.25rem)*var(--hs,1))]">
            {t.title}
            <span aria-hidden="true" className="ml-[0.08em] inline-block size-[0.55em] rounded-full bg-coral align-baseline" />
          </h2>
          <p className="t-lead mt-8 max-w-[44rem] text-paper/85">{t.lead}</p>
          <Sticker tone="coral" rotate={-2} className="mt-8 !text-[clamp(0.95rem,1.6vw,1.2rem)]">
            {t.notCompete}
          </Sticker>
          <ul className="mt-8 flex flex-wrap gap-2" aria-label={t.audienceLabel}>
            {t.audience.map((a) => (
              <li key={a} className="rounded-pill border border-paper/30 px-4 py-2 text-[14px] font-medium text-paper/90">
                {a}
              </li>
            ))}
          </ul>
        </div>

        {/* Боли: «Знакомо?» */}
        <div className="mt-24 grid items-center gap-10 lg:grid-cols-12" data-reveal>
          <div className="relative mx-auto w-[min(78%,22rem)] lg:col-span-4 lg:w-full lg:max-w-[24rem]">
            <div aria-hidden="true" className="absolute inset-x-[2%] top-[18%] aspect-square rounded-full bg-graphite" />
            <Orb tone="coral" className="anim-float absolute top-[10%] right-[4%] size-[16%]" />
            <div className="mascot-idle relative">
              <Mascot emotion="angry" alt={t.painsMascotAlt} sizes="(min-width: 1024px) 24rem, 70vw" />
            </div>
          </div>
          <div className="lg:col-span-8">
            <h3 className="t-h1">{t.painsTitle}</h3>
            <ul className="mt-8 flex flex-wrap gap-x-3 gap-y-5 sm:gap-x-4 sm:gap-y-6">
              {t.pains.map((p, i) => (
                <li key={p}>
                  <span
                    className={`sticker bubble ${i % 3 === 1 ? "sticker-coral" : "sticker-paper"} !text-[clamp(0.85rem,1.3vw,1.05rem)] !font-semibold ${i % 2 ? "bubble-right" : ""}`}
                    style={{ ["--r" as string]: `${rot[i % rot.length]}deg` }}
                  >
                    {t.quotes[0]}{p}{t.quotes[1]}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Наш ответ */}
        <div className="mt-24" data-reveal>
          <p className="t-label flex items-center gap-2.5 text-coral">
            <span aria-hidden="true" className="size-2.5 rounded-full bg-coral" />
            {t.answerTitle}
          </p>
          <p className="t-h1 mt-5 max-w-[56rem]">{t.bigStatement}</p>
        </div>
        <ul className="mt-14 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {t.benefits.map((b, i) => (
            <li key={b.title} className="border-t border-paper/20 pt-6" data-reveal style={{ ["--d" as string]: `${(i % 3) * 70}ms` }}>
              <h4 className="t-h4 flex items-center gap-3">
                <span aria-hidden="true" className="size-3 shrink-0 rounded-full bg-coral" />
                {b.title}
              </h4>
              <p className="mt-3 text-paper/75">{b.text}</p>
            </li>
          ))}
        </ul>

        {/* Сценарий: пунктирная траектория между шагами */}
        <div className="mt-24" data-reveal>
          <h3 className="t-h2">{t.stepsTitle}</h3>
          <div className="relative mt-10">
            <div aria-hidden="true" className="absolute top-[22px] right-[10%] left-[22px] hidden md:block [&_path]:stroke-paper [&_circle:first-of-type]:fill-ink [&_circle:first-of-type]:stroke-paper">
              <DashPath viewBox="0 0 1000 10" d="M0,5 L1000,5" className="h-3 w-full" />
            </div>
            <ol className="relative grid gap-10 before:absolute before:top-[22px] before:left-[21px] before:h-[calc(100%-44px)] before:w-0.5 before:bg-paper/25 md:grid-cols-4 md:gap-6 md:before:hidden">
              {t.steps.map((s, i) => (
                <li key={s.title} className="relative grid grid-cols-[44px_1fr] gap-5 md:block">
                  <span className={`relative z-10 grid size-11 place-items-center rounded-full font-display text-base font-bold ${i === t.steps.length - 1 ? "bg-coral text-ink" : "border-2 border-paper/40 bg-ink text-paper"}`}>
                    {i + 1}
                  </span>
                  <div className="md:mt-6 md:pr-4">
                    <h4 className="t-h4">{s.title}</h4>
                    <p className="mt-2 text-paper/75">{s.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>

        <div className="mt-24 grid gap-4 md:grid-cols-2" data-reveal>
          {t.models.map((m, i) => (
            <div key={m.title} className="relative overflow-hidden rounded-[var(--radius-card)] bg-graphite p-7 sm:p-10">
              <p className="t-label text-paper/70">{t.modelLabel}</p>
              <h3 className="t-h2 mt-3">{m.title}</h3>
              <p className="t-body-l mt-4 text-paper/85">{m.text}</p>
              <p className="t-small mt-6 flex items-center gap-2 text-paper/70">
                <span aria-hidden="true" className="size-2 rounded-full bg-coral" />
                {m.fits}
              </p>
              <Orb tone={i ? "paper" : "coral"} className="absolute -top-6 -right-6 size-20 opacity-90" />
            </div>
          ))}
        </div>

        <div className="mt-16 flex flex-col gap-6 md:flex-row md:items-center md:justify-between" data-reveal>
          <p className="t-h4 max-w-[36rem] text-paper/90">{t.terms}</p>
          <ButtonLink href={lp(locale, anchors.partner)} className="self-start md:self-auto">
            {t.cta}
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
