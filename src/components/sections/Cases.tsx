import { cases } from "@/content/cases";
import type { Locale } from "@/i18n/config";
import type { Dict } from "@/i18n/dictionaries/ru";
import { fmt } from "@/i18n/format";
import { anchors, lp } from "@/i18n/paths";
import { CaseCard } from "../cases/CaseCard";
import { Chevrons, Sticker } from "../mm/Kit";
import { ButtonLink } from "../ui/Button";
import { SectionHead } from "../ui/SectionHead";

/* Раскладка: Telegram Mini App — первым, широкой витриной; затем баннеры для застройщиков (японский сверху),
   дальше ломаный ритм 7/5, Nibble — широкой витриной брендинга, в конце моушн. */
export function Cases({ locale, t, ctaProject }: { locale: Locale; t: Dict["cases"]; ctaProject: string }) {
  const by = (s: string) => cases.find((c) => c.slug === s)!;
  const order = cases.map((c) => c.category);
  const counts = (["app", "web", "ads", "landing", "branding", "motion"] as const).map((k) => ({ k, n: order.filter((x) => x === k).length })).filter((x) => x.n);
  return (
    <section id="cases" aria-labelledby="cases-title" className="cv section relative bg-white">
      <div className="wrap">
        <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
          <div className="relative">
            <SectionHead id="cases-title" eyebrow={t.eyebrow} title={t.title} lead={t.lead} />
            <Sticker tone="coral" rotate={6} className="absolute -top-2 right-0 hidden sm:inline-flex lg:-right-16" decorative>
              {fmt(t.count, { n: cases.length }, locale)}
            </Sticker>
          </div>
          <ul className="flex flex-wrap gap-2 lg:max-w-[22rem] lg:justify-end" aria-label={t.servicesLabel} data-reveal>
            {counts.map(({ k, n }, i) => (
              <li key={k}>
                <span className="sticker sticker-paper !text-[13px]" style={{ ["--r" as string]: `${i % 2 ? 2 : -2}deg` }}>
                  {t.categories[k]} <span className="t-mono rounded-full bg-ink px-1.5 py-0.5 text-paper">{n}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-14 grid gap-x-6 gap-y-16 md:mt-20 md:grid-cols-12 md:gap-y-24">
          <CaseCard c={by("telegram-food-delivery")} t={t} locale={locale} size="lg" className="md:col-span-12" aspect="aspect-[4/3] sm:aspect-[16/8]" />
          <CaseCard c={by("realty-ads")} t={t} locale={locale} size="lg" className="md:col-span-12" aspect="aspect-[4/3] sm:aspect-[16/8]" />
          <CaseCard c={by("ads-legal")} t={t} locale={locale} className="md:col-span-7" />
          <CaseCard c={by("inout")} t={t} locale={locale} className="md:col-span-5 md:mt-32" />
          <CaseCard c={by("cape-caviar")} t={t} locale={locale} className="md:col-span-5" />
          <CaseCard c={by("angelaw")} t={t} locale={locale} className="md:col-span-7 md:mt-32" />
          <CaseCard c={by("dental-clinic")} t={t} locale={locale} size="lg" className="md:col-span-12" aspect="aspect-[4/3] sm:aspect-[16/8]" />
          <CaseCard c={by("biomavital")} t={t} locale={locale} className="md:col-span-7" />
          <CaseCard c={by("petal-punk")} t={t} locale={locale} className="md:col-span-5 md:mt-32" />
          <CaseCard c={by("nibble")} t={t} locale={locale} size="lg" className="md:col-span-12" aspect="aspect-[4/3] sm:aspect-[16/8]" />
          <CaseCard c={by("safin-workshop")} t={t} locale={locale} className="md:col-span-5" />
          <CaseCard c={by("motion-reel")} t={t} locale={locale} className="md:col-span-7 md:mt-32" />
        </div>

        <div className="mt-20 flex flex-col items-start gap-6 border-t-2 border-ink pt-10 md:flex-row md:items-center md:justify-between" data-reveal>
          <p className="t-h3 max-w-[36rem]">{t.ctaQuestion}</p>
          <div className="flex items-center gap-5">
            <Chevrons className="hidden text-4xl text-stone md:inline-flex" />
            <ButtonLink href={lp(locale, anchors.project)}>{ctaProject}</ButtonLink>
          </div>
        </div>
      </div>
    </section>
  );
}
