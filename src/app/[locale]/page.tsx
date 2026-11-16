import { About } from "@/components/sections/About";
import { Cases } from "@/components/sections/Cases";
import { Contact } from "@/components/sections/Contact";
import { Faq } from "@/components/sections/Faq";
import { Hero } from "@/components/sections/Hero";
import { Marquee } from "@/components/sections/Marquee";
import { Partners } from "@/components/sections/Partners";
import { Process } from "@/components/sections/Process";
import { Services } from "@/components/sections/Services";
import { Testimonials } from "@/components/sections/Testimonials";
import { Why } from "@/components/sections/Why";
import type { Locale } from "@/i18n/config";
import { getDict } from "@/i18n/get";

/* Путь посетителя: ценность (УТП) → почему проще → что делаем → доказательства →
   второй сценарий (партнёры) → снятие возражений → действие. */
export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const locale = (await params).locale as Locale;
  const t = await getDict(locale);
  return (
    <>
      <Hero locale={locale} t={t.hero} cta={t.cta} />
      <Marquee t={t.marquee} />
      <Why t={t.why} cursors={{ design: t.hero.cursorDesign, code: t.hero.cursorCode }} />
      <Services locale={locale} t={t.services} />
      <Cases locale={locale} t={t.cases} ctaProject={t.cta.project} />
      <Partners locale={locale} t={t.partners} />
      <Process locale={locale} t={t.process} />
      <About t={t.about} ring={t.hero.ring} />
      <Testimonials t={t.reviews} />
      <Faq locale={locale} t={t.faq} />
      <Contact locale={locale} t={t.contact} form={t.form} />
    </>
  );
}
