import type { Locale } from "@/i18n/config";
import type { Dict } from "@/i18n/dictionaries/ru";
import { Mascot } from "../mm/Mascot";
import { Sticker } from "../mm/Kit";
import { LeadDialog } from "../forms/LeadDialog";
import { TelegramLink } from "../ui/TelegramLink";

/* Первый экран лендинга: кто мы и что делаем — в одном заголовке,
   два действия (рассчитать стоимость / написать в Telegram) и короткие факты.
   Справа — маскот на фирменной точке. */
export function LandingHero({ locale, t, hero, cta, tg, contact, form }: { locale: Locale; t: Dict["landing"]; hero: Dict["hero"]; cta: Dict["cta"]; tg: string; contact: Dict["contact"]; form: Dict["form"] }) {
  const at = t.title.indexOf(t.mark);
  const before = at >= 0 ? t.title.slice(0, at) : t.title;
  const mark = at >= 0 ? t.mark : "";
  const after = at >= 0 ? t.title.slice(at + t.mark.length) : "";
  return (
    <section id="hero" aria-labelledby="hero-title" className="hero grain relative overflow-hidden">
      <div aria-hidden="true" className="dot-grid pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_60%_60%_at_78%_45%,#000_10%,transparent_70%)]" />
      <div className="wrap relative grid min-h-[calc(100svh-var(--header-h))] items-center gap-y-8 py-8 sm:py-12 lg:grid-cols-12 lg:gap-x-10 lg:py-10">
        <div className="relative z-10 lg:col-span-7">
          <Sticker tone="ink" rotate={-2}>
            <span className="size-2.5 rounded-full bg-coral" aria-hidden="true" />
            {t.eyebrow}
          </Sticker>

          <h1 id="hero-title" className="t-display mt-6 !text-[calc(clamp(2.3rem,9vw,4.6rem)*var(--hs,1))] [text-wrap:balance] sm:mt-7 lg:!text-[calc(clamp(2.8rem,4.6vw,4.6rem)*var(--hs,1))]">
            {before}
            {mark && <span className="marker whitespace-nowrap">{mark}</span>}
            {after}
            <span aria-hidden="true" className="ml-[0.06em] inline-block size-[0.2em] rounded-full bg-coral align-baseline" />
          </h1>

          <p className="t-lead mt-5 max-w-[38rem] text-ink/85 sm:mt-6">{t.lead}</p>

          <ul className="mt-5 flex flex-wrap gap-2" aria-label={t.eyebrow}>
            {t.chips.map((c) => (
              <li key={c} className="rounded-pill border-2 border-ink/15 bg-white/70 px-3.5 py-1.5 text-[15px] font-medium">
                {c}
              </li>
            ))}
          </ul>

          <div id="hero-ctas" className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <LeadDialog locale={locale} label={cta.lead} close={cta.close} contact={contact} form={form} />
            <TelegramLink variant="outline" label={tg} />
          </div>

          <dl className="mt-8 grid max-w-[36rem] grid-cols-3 gap-4 border-t-2 border-ink pt-4">
            {hero.facts.map((f) => (
              <div key={f.label}>
                <dt className="sr-only">{f.label}</dt>
                <dd className="font-display text-[clamp(1.15rem,4vw,1.75rem)] leading-none font-black">{f.value}</dd>
                <dd aria-hidden="true" className="t-small mt-2 text-stone-ink">
                  {f.label}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <div aria-hidden="true" className="relative mx-auto hidden w-full max-w-[30rem] sm:block lg:col-span-5 lg:max-w-[min(100%,calc(100svh-var(--header-h)-5rem))]">
          <div className="relative aspect-square">
            <div className="absolute inset-[8%] overflow-hidden rounded-full bg-coral">
              <div className="halftone size-full" />
            </div>
            <div className="absolute inset-x-[14%] bottom-[2%]">
              <Mascot emotion="happy" alt="" sizes="(min-width: 1024px) 34vw, 60vw" priority />
            </div>
            <Sticker tone="white" rotate={-6} bubble="right" decorative className="absolute top-[10%] left-[2%] !text-[clamp(1rem,2vw,1.3rem)]">
              {hero.hello}
            </Sticker>
          </div>
        </div>
      </div>
    </section>
  );
}
