import { Calculator } from "@/components/calculator/Calculator";
import { CaseSlider } from "@/components/landing/CaseSlider";
import { LandingHero } from "@/components/landing/LandingHero";
import { LandingProcess } from "@/components/landing/LandingProcess";
import { LandingReviews } from "@/components/landing/LandingReviews";
import { Partners } from "@/components/sections/Partners";
import { PartnersDialog } from "@/components/sections/PartnersDialog";
import { site } from "@/content/site";
import { cases } from "@/content/cases";
import type { Locale } from "@/i18n/config";
import { getCalcDict } from "@/i18n/calculator/get";
import { getDict } from "@/i18n/get";
import { lp } from "@/i18n/paths";
import { isBriefDeliveryConfigured } from "@/lib/brief/delivery";

/* Прежние секции лендинга отключены (цель — максимум заявок, минимум прокрутки).
   Компоненты и тексты сохранены — чтобы вернуть секцию, раскомментируйте импорт и строку ниже.
import { About } from "@/components/sections/About";
import { Cases } from "@/components/sections/Cases";
import { Contact } from "@/components/sections/Contact";
import { Faq } from "@/components/sections/Faq";
import { Hero } from "@/components/sections/Hero";
import { Marquee } from "@/components/sections/Marquee";
import { Process } from "@/components/sections/Process";
import { Services } from "@/components/sections/Services";
import { Testimonials } from "@/components/sections/Testimonials";
import { Why } from "@/components/sections/Why";
*/

/* Лендинг: кто мы и что делаем → кейсы → отзывы → как работаем (всё лентами) → калькулятор с отправкой брифа. */
export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const locale = (await params).locale as Locale;
  const [t, c] = await Promise.all([getDict(locale), getCalcDict(locale)]);
  const railLabels = { prev: t.landing.prevItem, next: t.landing.nextItem };
  return (
    <>
      <LandingHero locale={locale} t={t.landing} cta={t.cta} tg={t.contact.telegram} contact={t.contact} form={t.form} />
      <CaseSlider cases={cases} t={t.cases} l={t.landing} locale={locale} />
      <LandingReviews t={t.reviews} labels={railLabels} />
      <LandingProcess locale={locale} t={t.process} labels={railLabels} />

      <section id="calculator" aria-labelledby="calc-title" className="grain border-t border-ink/10 pt-16 pb-24 sm:pt-20 lg:pb-28">
        <div className="wrap">
          {/* Шапка секции — как у остальных: заголовок с точкой и одна строка пояснения.
              Оговорка про предварительные цены — в панели расчёта и в заявке. */}
          <header className="max-w-[44rem]">
            <h2 id="calc-title" className="t-h2">
              {c.page.title}
              <span aria-hidden="true" className="ml-[0.06em] inline-block size-[0.2em] rounded-full bg-coral" />
            </h2>
            <p className="t-body-l mt-3 text-ink/75">{c.page.lead}</p>
          </header>
          <div className="mt-8 sm:mt-10">
            <Calculator
              locale={locale}
              t={c}
              briefEnabled={isBriefDeliveryConfigured()}
              privacyHref={lp(locale, "/privacy/")}
              instagram={{ url: site.contacts.instagram.url, handle: site.contacts.instagram.handle }}
            />
          </div>
        </div>
      </section>

      {/* Партнёрская программа — в попапе (пункт меню «Партнёрам») */}
      <PartnersDialog label={t.partners.eyebrow} close={t.cta.close}>
        <Partners locale={locale} t={t.partners} inDialog />
      </PartnersDialog>

      {/*
      <Hero locale={locale} t={t.hero} cta={t.cta} />
      <Marquee t={t.marquee} />
      <Why t={t.why} cursors={{ design: t.hero.cursorDesign, code: t.hero.cursorCode }} />
      <Services locale={locale} t={t.services} calc={t.cta.calc} />
      <Cases locale={locale} t={t.cases} ctaProject={t.cta.project} />
      <Process locale={locale} t={t.process} />
      <About t={t.about} ring={t.hero.ring} />
      <Testimonials t={t.reviews} />
      <Faq locale={locale} t={t.faq} />
      <Contact locale={locale} t={t.contact} form={t.form} />
      */}
    </>
  );
}
