import type { Metadata } from "next";
import { Calculator } from "@/components/calculator/Calculator";
import { Eyebrow } from "@/components/ui/SectionHead";
import { site } from "@/content/site";
import type { Locale } from "@/i18n/config";
import { getCalcDict } from "@/i18n/calculator/get";
import { getDict } from "@/i18n/get";
import { lp } from "@/i18n/paths";
import { isBriefDeliveryConfigured } from "@/lib/brief/delivery";
import { alternates, hasDomain, ogImage, social } from "@/lib/seo";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = (await params).locale as Locale;
  const [d, t] = await Promise.all([getDict(locale), getCalcDict(locale)]);
  return {
    title: t.meta.title,
    description: t.meta.description,
    ...(hasDomain ? { alternates: alternates(locale, "/calculator/") } : {}),
    ...social({ locale, title: t.meta.title, description: t.meta.description, path: "/calculator/", image: ogImage.home(locale), imageAlt: d.meta.ogAlt }),
  };
}

/* «Рассчитать стоимость проекта». Тексты калькулятора — отдельный словарь
   (src/i18n/calculator), в браузер уходит только текущий язык. */
export default async function CalculatorPage({ params }: Props) {
  const locale = (await params).locale as Locale;
  const t = await getCalcDict(locale);
  const markAt = t.page.title.indexOf(t.page.mark);
  return (
    <div className="grain pb-36 lg:pb-[var(--section)]">
      <div className="wrap pt-10 sm:pt-14">
        <header className="max-w-[56rem]">
          <Eyebrow>{t.page.eyebrow}</Eyebrow>
          <h1 className="t-h1 mt-5">
            {markAt >= 0 ? (
              <>
                {t.page.title.slice(0, markAt)}
                <span className="marker">{t.page.mark}</span>
                {t.page.title.slice(markAt + t.page.mark.length)}
              </>
            ) : (
              t.page.title
            )}
          </h1>
          <p className="t-lead mt-6 max-w-[44rem] text-ink/80">{t.page.lead}</p>
          <p className="t-small mt-4 flex items-start gap-2 text-stone-ink">
            <span aria-hidden="true" className="mt-1.5 size-2 shrink-0 rounded-full bg-coral" />
            {t.page.disclaimer} {t.page.currency}
          </p>
        </header>
        <div className="mt-10 sm:mt-14">
          <Calculator locale={locale} t={t} briefEnabled={isBriefDeliveryConfigured()} privacyHref={lp(locale, "/privacy/")} instagram={{ url: site.contacts.instagram.url, handle: site.contacts.instagram.handle }} />
        </div>
      </div>
    </div>
  );
}
