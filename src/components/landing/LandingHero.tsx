import type { Locale } from "@/i18n/config";
import type { Dict } from "@/i18n/dictionaries/ru";
import type { FormDict } from "../forms/LeadForm";
import { Mascot } from "../mm/Mascot";
import { LeadDialog } from "../forms/LeadDialog";
import { anchors, lp } from "@/i18n/paths";
import { ButtonLink } from "../ui/Button";
import { TelegramLink } from "../ui/TelegramLink";

/* Первый экран лендинга: кто мы и что делаем — в одном заголовке,
   главное действие — оставить заявку, рядом — расчёт стоимости и Telegram и короткие факты.
   Справа — маскот на фирменной точке. Экран намеренно спокойный: без фоновых
   текстур, стикеров и чипсов — один акцент (маркер в заголовке) и понятные кнопки. */
export function LandingHero({ locale, t, cta, tg, contact, form }: { locale: Locale; t: Dict["landing"]; cta: Dict["cta"]; tg: string; contact: Dict["contact"]; form: FormDict }) {
  const at = t.title.indexOf(t.mark);
  const before = at >= 0 ? t.title.slice(0, at) : t.title;
  const mark = at >= 0 ? t.mark : "";
  const after = at >= 0 ? t.title.slice(at + t.mark.length) : "";
  // последнее слово отделяем, чтобы точка не переносилась на отдельную строку
  const split = (x: string) => {
    const i = x.trimEnd().lastIndexOf(" ");
    return i < 0 ? ["", x] : [x.slice(0, i + 1), x.slice(i + 1)];
  };
  const [markHead, markTail] = split(mark);
  const [afterHead, afterTail] = split(after);
  const dot = <span aria-hidden="true" className="ml-[0.06em] inline-block size-[0.2em] rounded-full bg-coral align-baseline" />;
  return (
    <section id="hero" aria-labelledby="hero-title" className="hero relative overflow-hidden">
      <div className="wrap relative grid min-h-[calc(100svh-var(--header-h))] items-center gap-y-8 py-8 sm:py-12 lg:grid-cols-12 lg:gap-x-10 lg:py-10">
        <div className="relative z-10 lg:col-span-7">
          <p className="t-label flex items-center gap-2 text-stone-ink">
            <span className="size-2 rounded-full bg-coral" aria-hidden="true" />
            {t.eyebrow}
          </p>

          <h1 id="hero-title" className="t-display mt-5 !text-[calc(clamp(2.3rem,9vw,4.6rem)*var(--hs,1))] [text-wrap:balance] sm:mt-7 lg:!text-[calc(clamp(2.8rem,4.6vw,4.6rem)*var(--hs,1))]">
            {before}
            {/* выделение может переноситься по словам (длинные фразы на узких экранах),
                а последнее слово всегда держит при себе фирменную точку */}
            {mark && (
              <span className="marker [box-decoration-break:clone] [-webkit-box-decoration-break:clone]">
                {markHead}
                {!after && <span className="whitespace-nowrap">{markTail}{dot}</span>}
                {after && markTail}
              </span>
            )}
            {after && (
              <>
                {afterHead}
                <span className="whitespace-nowrap">{afterTail}{dot}</span>
              </>
            )}
            {!mark && dot}
          </h1>

          <p className="t-lead mt-5 max-w-[38rem] text-ink/85 sm:mt-6">{t.lead}</p>

          {/* Чипсы с услугами убраны — перечень уже есть в заголовке и подзаголовке:
          <ul className="mt-5 flex flex-wrap gap-2" aria-label={t.eyebrow}>
            {t.chips.map((c) => (
              <li key={c} className="rounded-pill border-2 border-ink/15 bg-white/70 px-3.5 py-1.5 text-[15px] font-medium">
                {c}
              </li>
            ))}
          </ul> */}

          {/* Одна главная кнопка (как в шапке) — заявка; расчёт стоимости — второстепенная, Telegram — ссылкой */}
          <div id="hero-ctas" className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <LeadDialog locale={locale} label={cta.lead} close={cta.close} contact={contact} form={form} />
            <ButtonLink href={lp(locale, anchors.calculator)} variant="outline" icon={null}>
              {cta.calc}
            </ButtonLink>
          </div>
          <TelegramLink variant="inline" label={tg} className="mt-4" />

          {/* Ряд фактов (8+ лет, 1 команда, N кейсов) убран с первого экрана — рябил;
              опыт теперь в подзаголовке «Наших работ». Тексты остались в landing.facts. */}
        </div>

        <div aria-hidden="true" className="relative mx-auto hidden w-full max-w-[30rem] sm:block lg:col-span-5 lg:max-w-[min(100%,calc(100svh-var(--header-h)-5rem))]">
          <div className="relative aspect-square">
            <div className="absolute inset-[8%] rounded-full bg-coral" />
            <div className="absolute inset-x-[14%] bottom-[2%]">
              <Mascot emotion="happy" alt="" sizes="(min-width: 1024px) 34vw, 60vw" priority />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
