import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { Dict } from "@/i18n/dictionaries/ru";
import { anchors, lp } from "@/i18n/paths";
import { Mascot } from "../mm/Mascot";
import { Cursor, DashPath, Orb, RingBadge, SelBox, Sticker, Toggle3D } from "../mm/Kit";
import { Parallax } from "../mm/Parallax";
import { ButtonLink } from "../ui/Button";
import { Icon } from "../ui/Icon";

/* HERO. Идея: «редактор, в котором собирают Бюро».
   Слева — заголовок из УТП, одно слово выделено рамкой как в Figma.
   Справа — фирменная точка, ставшая сценой: на ней маскот, вокруг —
   курсоры «дизайн» и «код», 3D-объекты, стикеры и пунктирная траектория.
   Маскот реагирует на наведение на CTA (CSS :has, без JS). */
export function Hero({ locale, t, cta }: { locale: Locale; t: Dict["hero"]; cta: Dict["cta"] }) {
  const found = Boolean(t.boxed) && t.title.includes(t.boxed);
  const [before, after] = found ? splitOnce(t.title, t.boxed) : [t.title, ""];
  return (
    <section id="hero" aria-labelledby="hero-title" className="hero grain relative overflow-hidden">
      <div aria-hidden="true" className="dot-grid pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_70%_60%_at_80%_35%,#000_10%,transparent_70%)]" />

      <Parallax className="wrap relative grid gap-y-10 pt-8 pb-16 sm:pt-12 lg:grid-cols-12 lg:gap-x-8 lg:pt-14 lg:pb-24 xl:pt-16">
        {/* Пунктирная траектория через весь экран (десктоп) */}
        <DashPath
          viewBox="0 0 1000 400"
          d="M10,330 C200,390 320,250 470,300 S760,420 980,150"
          className="absolute top-[38%] left-[var(--gutter)] hidden h-[42%] w-[86%] opacity-80 lg:block"
        />

        <div className="relative z-10 lg:col-span-7 lg:self-center">
          <Sticker tone="ink" rotate={-3} className="anim-fly" style={{ ["--fx" as string]: "-40px", ["--fy" as string]: "0px" }}>
            <span className="size-2.5 rounded-full bg-coral" aria-hidden="true" />
            {t.eyebrow}
          </Sticker>

          <h1 id="hero-title" className="t-display mt-7 !text-[calc(clamp(2rem,9.6vw,6.4rem)*var(--hs,1))] sm:mt-9 lg:!text-[calc(clamp(3rem,5.9vw,6.4rem)*var(--hs,1))]">
            {/* Последнее слово + фирменная точка склеены, чтобы точка не уезжала на новую строку */}
            {found ? (
              <>
                <span className="anim-rise inline">{before}</span>
                {after.trim() ? (
                  <>
                    <span className="anim-rise inline" style={{ ["--d" as string]: "120ms" }}>
                      <SelBox>{t.boxed}</SelBox>
                    </span>
                    <span className="anim-rise inline">{head(after)}</span>
                    <span className="whitespace-nowrap">
                      {tail(after)}
                      <Dot />
                    </span>
                  </>
                ) : (
                  <span className="anim-rise whitespace-nowrap" style={{ ["--d" as string]: "120ms" }}>
                    <SelBox>{t.boxed}</SelBox>
                    <Dot />
                  </span>
                )}
              </>
            ) : (
              <>
                <span className="anim-rise inline">{head(t.title)}</span>
                <span className="whitespace-nowrap">
                  {tail(t.title)}
                  <Dot />
                </span>
              </>
            )}
          </h1>

          <p className="t-lead anim-fade mt-12 max-w-[36rem] text-ink/85" style={{ ["--d" as string]: "200ms" }}>
            {t.lead}
          </p>

          <div id="hero-ctas" className="anim-fade mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center" style={{ ["--d" as string]: "300ms" }}>
            <ButtonLink href={lp(locale, anchors.project)} className="cta-main">
              {cta.project}
            </ButtonLink>
            <ButtonLink href={lp(locale, anchors.partner)} variant="outline" className="cta-partner bg-paper/60">
              {cta.partner}
            </ButtonLink>
            <Link href={lp(locale, anchors.calculator)} className="inline-flex min-h-12 items-center gap-2 self-start rounded-pill px-2 font-semibold underline decoration-coral decoration-2 underline-offset-[6px] transition-colors hover:text-coral sm:self-center">
              {cta.calc}
              <Icon name="arrow-right" size={18} />
            </Link>
          </div>
          <div className="anim-fade mt-6" style={{ ["--d" as string]: "420ms" }}>
            <Sticker tone="white" rotate={2} className="!text-[13px] sm:!text-[14px]">
              <span aria-hidden="true" className="grid size-6 place-items-center rounded-full bg-coral text-[13px] font-black text-ink">%</span>
              {t.partnerSticker}
            </Sticker>
          </div>

          <dl className="anim-fade mt-10 grid max-w-[36rem] grid-cols-3 gap-4 border-t-2 border-ink pt-5" style={{ ["--d" as string]: "520ms" }}>
            {t.facts.map((f) => (
              <div key={f.label}>
                <dt className="sr-only">{f.label}</dt>
                <dd className="font-display text-[clamp(1.2rem,4.2vw,1.9rem)] leading-none font-black">{f.value}</dd>
                <dd aria-hidden="true" className="t-small mt-2 text-stone-ink">
                  {f.label}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <HeroStage t={t} />
      </Parallax>
    </section>
  );
}

function HeroStage({ t }: { t: Dict["hero"] }) {
  const L = (depth: number) => ({ ["--depth" as string]: depth });
  return (
    <div className="relative mx-auto w-full max-w-[30rem] sm:max-w-[34rem] lg:col-span-5 lg:max-w-none lg:self-center">
      <div className="relative aspect-[1/1.08]">
        {/* Сцена: фирменная точка с растром */}
        <div data-depth style={L(-6)} className="absolute inset-x-[4%] top-[14%] aspect-square">
          <div className="anim-pop size-full overflow-hidden rounded-full bg-coral" style={{ ["--d" as string]: "100ms" }}>
            <div className="halftone size-full" />
          </div>
        </div>

        {/* Тумблер-UI */}
        <div data-depth style={L(10)} className="absolute top-[6%] left-[-2%] text-[9px] sm:text-[11px] lg:text-[12px]">
          <div className="anim-fly" style={{ ["--d" as string]: "500ms", ["--fx" as string]: "-60px" }}>
            <Toggle3D />
          </div>
        </div>

        {/* Круглый бейдж */}
        <div data-depth style={L(14)} className="absolute top-[2%] right-[2%] w-[24%]">
          <div className="anim-pop" style={{ ["--d" as string]: "650ms" }}>
            <RingBadge text={t.ring} />
          </div>
        </div>

        {/* 3D-сферы */}
        <div data-depth style={L(18)} className="absolute top-[34%] right-[-3%] w-[11%]">
          <Orb tone="ink" className="anim-float aspect-square w-full" style={{ ["--fd" as string]: "-2s" }} />
        </div>
        <div data-depth style={L(-12)} className="absolute bottom-[10%] left-[1%] w-[9%]">
          <Orb tone="paper" className="anim-float aspect-square w-full" />
        </div>

        {/* Маскот */}
        <div data-depth style={L(4)} className="absolute inset-x-[16%] bottom-0 z-10">
          <div className="anim-pop" style={{ ["--d" as string]: "250ms" }}>
            <div className="mascot-react">
              <div className="mascot-idle mascot-click">
                <Mascot emotion="happy" alt={t.mascotAlt} priority sizes="(min-width: 1024px) 28vw, 70vw" />
              </div>
            </div>
          </div>
        </div>

        {/* Реплика маскота */}
        <div data-depth style={L(12)} className="absolute top-[22%] left-[2%] z-20">
          <Sticker tone="white" rotate={-6} bubble="right" className="anim-fly !text-[clamp(0.9rem,2.2vw,1.25rem)]" style={{ ["--d" as string]: "800ms" }}>
            {t.hello}
          </Sticker>
        </div>

        {/* Курсоры совместной работы — не на мордочке */}
        <div data-depth style={L(16)} className="absolute bottom-[30%] left-[0%] z-20">
          <Cursor label={t.cursorDesign} tone="coral" style={{ ["--cd" as string]: "-1s" }} />
        </div>
        <div data-depth style={L(20)} className="absolute right-[0%] bottom-[16%] z-20">
          <Cursor label={t.cursorCode} tone="ink" style={{ ["--cd" as string]: "-3.5s" }} />
        </div>
      </div>
    </div>
  );
}

function Dot() {
  return <span aria-hidden="true" className="anim-pop ml-[0.06em] inline-block size-[0.55em] rounded-full bg-coral align-baseline" style={{ ["--d" as string]: "450ms" }} />;
}

/** Делим строку на «всё до последнего слова» и последнее слово (для CJK — последний символ) */
function lastBreak(s: string) {
  const i = s.lastIndexOf(" ");
  return i >= 0 ? i + 1 : Math.max(0, s.length - 1);
}
const head = (s: string) => s.slice(0, lastBreak(s));
const tail = (s: string) => s.slice(lastBreak(s));

function splitOnce(s: string, part: string): [string, string] {
  const i = part ? s.indexOf(part) : -1;
  if (i < 0) return [s, ""];
  return [s.slice(0, i), s.slice(i + part.length)];
}
