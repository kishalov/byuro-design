import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cn } from "@/lib/cn";
import { CaseCard } from "@/components/cases/CaseCard";
import { AutoVideo } from "@/components/cases/AutoVideo";
import { CaseCover } from "@/components/cases/CaseCover";
import { Pic } from "@/components/cases/Pic";
import { Sticker } from "@/components/mm/Kit";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { cases, getCase } from "@/content/cases";
import { localeCodes, type Locale } from "@/i18n/config";
import { fmt } from "@/i18n/format";
import { getDict } from "@/i18n/get";
import { markets } from "@/i18n/market";
import { anchors, lp } from "@/i18n/paths";
import { alternates, caseJsonLd, hasDomain, ogImage, social } from "@/lib/seo";

type Props = { params: Promise<{ locale: string; slug: string }> };

export const dynamicParams = false;
export function generateStaticParams() {
  return localeCodes.flatMap((locale) => cases.map((c) => ({ locale, slug: c.slug })));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const c = getCase(slug);
  if (!c) return {};
  const d = await getDict(locale as Locale);
  const t = d.cases.items[c.slug];
  const category = d.cases.categories[c.category];
  return {
    title: t.title,
    description: t.summary,
    keywords: [category, t.client, ...c.tags.map((k) => d.cases.tags[k])],
    ...(hasDomain ? { alternates: alternates(locale as Locale, `/cases/${c.slug}/`) } : {}),
    ...social({
      locale: locale as Locale,
      title: `${t.title} — ${t.client}`,
      description: t.summary,
      path: `/cases/${c.slug}/`,
      image: ogImage.case(c.slug),
      imageAlt: `${category}: ${t.title}`,
      type: "article",
    }),
  };
}

export default async function CasePage({ params }: Props) {
  const { locale: l, slug } = await params;
  const locale = l as Locale;
  const c = getCase(slug);
  if (!c) notFound();
  const d = await getDict(locale);
  const t = d.cases;
  const text = t.items[c.slug];
  const idx = cases.indexOf(c);
  const next = cases[(idx + 1) % cases.length];
  const meta = [
    { k: t.page.client, v: text.client },
    { k: t.page.category, v: t.categories[c.category] },
    ...(c.industry ? [{ k: t.page.industry, v: t.industries[c.industry] }] : []),
    ...(c.format ? [{ k: t.page.format, v: t.formats[c.format] }] : []),
  ];
  const caps: string[] = text.captions ?? [];
  // Поля «презентационных» кейсов (есть не у всех)
  const extra = text as Partial<{ heroAlt: string; resultsAlt: string; outroAlt: string; metrics: Record<string, string>; outcome: string; ctaTitle: string; ctaText: string; imagesNote: string; nda: string; resultTitle: string; resultParas: string[]; resultVerified: string }>;
  const pres = c.presentation;
  const pct = new Intl.NumberFormat(markets[locale].numberLocale, { style: "percent", maximumFractionDigits: 0, signDisplay: "exceptZero" });
  // в русском — как на слайдах кейса: «+38%»; в остальных — по правилам локали
  const metric = (v: number) => {
    const out = pct.format(v).replace("-", "−");
    return locale === "ru" ? out.replace(/[\s\u00a0\u202f]%/, "%") : out;
  };
  // мягкая «продуктовая» рамка для готовых слайдов
  const slide = "overflow-hidden rounded-[22px] bg-[#F4F0EB] shadow-[0_40px_90px_-48px_rgb(18_18_18/0.45)] ring-1 ring-ink/5 sm:rounded-[32px]";

  return (
    <article>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(caseJsonLd(c, locale, text, { home: locale === "ru" ? "Бюро" : "Byuro", cases: d.nav.cases })) }}
      />
      <header className="wrap pt-8 pb-12 sm:pt-12">
        <Link href={lp(locale, anchors.cases)} className="t-small inline-flex min-h-11 items-center gap-2 font-semibold text-ink/80 hover:text-ink">
          <Icon name="arrow-left" size={18} /> {t.page.back}
        </Link>
        <div className="mt-6 flex flex-wrap gap-2">
          <Sticker tone="ink" rotate={-3} className="!text-[12px]">{t.categories[c.category]}</Sticker>
          {c.industry && <Sticker tone="white" rotate={2} className="!text-[12px]">{t.industries[c.industry]}</Sticker>}
        </div>
        <h1 className="t-h1 mt-6 max-w-[60rem]">{text.title}</h1>
        <p className="t-lead mt-6 max-w-[44rem] text-ink/80">{text.summary}</p>
      </header>

      <div className="wrap">
        {pres ? (
          <figure className={slide}>
            <Pic image={pres.hero} alt={extra.heroAlt ?? text.title} sizes="(min-width: 1280px) 1200px, 100vw" priority />
          </figure>
        ) : (
        <CaseCover cover={c.cover} tone={c.category === "ads" ? "coral" : c.category === "motion" ? "ink" : "sand"} label={text.title} priority className="aspect-[4/3] rounded-[var(--radius-card)] sm:aspect-[16/8]" />
        )}
      </div>

      <div className="wrap section grid gap-14 lg:grid-cols-12 lg:gap-8">
        <aside className="lg:col-span-4">
          <dl className="grid grid-cols-2 gap-6 border-t-2 border-ink pt-6 lg:grid-cols-1">
            {meta.map((m) => (
              <div key={m.k}>
                <dt className="t-label text-stone-ink">{m.k}</dt>
                <dd className="mt-2 font-semibold">{m.v}</dd>
              </div>
            ))}
            <div className="col-span-2 lg:col-span-1">
              <dt className="t-label text-stone-ink">{t.page.done}</dt>
              <dd className="mt-3 flex flex-wrap gap-1.5">
                {c.tags.map((k) => (
                  <Badge key={k}>{t.tags[k]}</Badge>
                ))}
              </dd>
            </div>
          </dl>
          {extra.nda && (
            <p className="t-small mt-6 flex items-start gap-3 rounded-2xl border-2 border-dashed border-stone-ink/60 p-4 text-stone-ink">
              <svg aria-hidden="true" viewBox="0 0 20 20" className="mt-0.5 size-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="4" y="9" width="12" height="8" rx="2" />
                <path d="M7 9V6.5a3 3 0 0 1 6 0V9" />
              </svg>
              <span>
                <span className="font-semibold text-ink">NDA. </span>
                {extra.nda}
              </span>
            </p>
          )}
        </aside>
        <div className="space-y-16 lg:col-span-7 lg:col-start-6">
          <section aria-labelledby="task">
            <h2 id="task" className="t-h2">{t.page.task}</h2>
            <p className="t-body-l mt-5 text-ink/85">{text.task}</p>
          </section>
          <section aria-labelledby="solution">
            <h2 id="solution" className="t-h2">{t.page.solution}</h2>
            <ul className="mt-6 space-y-4">
              {text.solution.map((s) => (
                <li key={s} className="t-body-l flex gap-4">
                  <span aria-hidden="true" className="mt-[0.55em] size-2.5 shrink-0 rounded-full bg-coral" />
                  {s}
                </li>
              ))}
            </ul>
          </section>
          {!c.results && (
            <section aria-labelledby="result">
              <h2 id="result" className="t-h2">{extra.resultTitle ?? t.page.result}</h2>
              {extra.resultParas ? (
                // результаты словами (без цифр): абзацы, итог и пометка о проверке аналитикой
                <>
                  <div className="t-body-l mt-5 space-y-4 text-ink/85">
                    {extra.resultParas.map((p) => (
                      <p key={p}>{p}</p>
                    ))}
                  </div>
                  {extra.outcome && (
                    <p className="t-body-l mt-6 flex items-start gap-4 border-t-2 border-ink pt-6 font-semibold">
                      <span aria-hidden="true" className="mt-[0.55em] size-3 shrink-0 rounded-full bg-coral" />
                      {extra.outcome}
                    </p>
                  )}
                  {extra.resultVerified && (
                    <p className="t-small mt-5 inline-flex items-center gap-2 rounded-pill border border-ink/20 px-3.5 py-2 text-stone-ink">
                      <svg aria-hidden="true" viewBox="0 0 16 16" className="size-4 text-coral" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 8.5l3 3 7-7" />
                      </svg>
                      {extra.resultVerified}
                    </p>
                  )}
                </>
              ) : (
                <p className="t-body-l mt-5 rounded-2xl border-2 border-dashed border-stone-ink p-6 text-stone-ink">{t.page.resultEmpty}</p>
              )}
            </section>
          )}
        </div>
      </div>

      {/* Работа целиком */}
      <section aria-labelledby="gallery" className="wrap">
        <h2 id="gallery" className={cn("t-h2", extra.imagesNote ? "mb-3" : "mb-10")}>{t.page.gallery}</h2>
        {extra.imagesNote && <p className="t-small mb-10 text-stone-ink">{extra.imagesNote}</p>}
        <div
          className={
            {
              grid: "grid gap-6 sm:grid-cols-2",
              slides: "grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-3",
              bento: "grid gap-6 sm:grid-cols-2 sm:gap-y-10",
              duo: "grid gap-8 lg:grid-cols-12 lg:items-center",
              reel: "grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 sm:gap-6",
              stack: "mx-auto grid max-w-[1100px] gap-10",
              showcase: "mx-auto grid max-w-[1200px] gap-14 sm:gap-24",
              pairs: "mx-auto grid max-w-[1100px] gap-x-8 gap-y-12 sm:grid-cols-2 sm:gap-y-16",
            }[c.layout]
          }
        >
          {c.gallery.map((m, i) => {
            const alt = caps[i] ? `${text.title} — ${caps[i]}` : fmt(t.page.screen, { title: text.title, n: i + 1 }, locale);
            return (
              <figure
                key={i}
                className={cn(
                  c.layout === "slides" && i === 0 && "col-span-2 lg:col-span-1",
                  c.layout === "bento" && i === c.gallery.length - 1 && c.gallery.length % 2 === 1 && "sm:col-span-2",
                  c.layout === "duo" && (i === 0 ? "lg:col-span-5" : "lg:col-span-7"),
                  c.layout === "reel" && i === 0 && "col-span-2 sm:col-span-3",
                  c.layout === "reel" && i === c.gallery.length - 1 && (c.gallery.length - 1) % 2 === 1 && "col-span-2 mx-auto w-1/2 sm:col-span-1 sm:w-auto",
                )}
              >
                {m.kind === "video" ? (
                  c.layout === "reel" && i === 0 ? (
                    // главный ролик — крупно, на тёмной сцене
                    <div className="on-dark relative overflow-hidden rounded-[var(--radius-card)] bg-ink px-6 py-10 sm:py-14">
                      <div aria-hidden="true" className="dot-grid-dark absolute inset-0 opacity-70" />
                      <span aria-hidden="true" className="absolute top-1/2 left-1/2 size-[60%] max-w-[560px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-coral/70 blur-3xl" />
                      <div className="relative mx-auto aspect-[9/16] w-full max-w-[380px] overflow-hidden rounded-[26px] border-[6px] border-white shadow-[0_40px_80px_-30px_rgb(0_0_0/0.9)]">
                        <AutoVideo src={m.src} poster={`/cases/${m.poster.base}-${m.poster.widths[m.poster.widths.length - 1]}.webp`} label={alt} controls className="size-full object-cover" />
                      </div>
                    </div>
                  ) : (
                    <div className="overflow-hidden rounded-[var(--radius-card)] bg-ink" style={{ aspectRatio: `${m.poster.w} / ${m.poster.h}` }}>
                      <AutoVideo src={m.src} poster={`/cases/${m.poster.base}-${m.poster.widths[m.poster.widths.length - 1]}.webp`} label={alt} controls className="size-full object-cover" />
                    </div>
                  )
                ) : m.frame === "browser" ? (
                  <div className="overflow-hidden rounded-[18px] border-2 border-ink bg-white shadow-[10px_10px_0_var(--color-ink)]">
                    <div aria-hidden="true" className="flex items-center gap-1.5 bg-ink px-4 py-3">
                      <span className="size-3 rounded-full bg-coral" />
                      <span className="size-3 rounded-full bg-paper/40" />
                      <span className="size-3 rounded-full bg-paper/40" />
                    </div>
                    <Pic image={m.image} alt={alt} sizes="(min-width: 1100px) 1100px, 100vw" />
                  </div>
                ) : c.layout === "showcase" || c.layout === "pairs" ? (
                  <div className={slide} data-reveal>
                    <Pic image={m.image} alt={alt} sizes={c.layout === "pairs" ? "(min-width: 1100px) 540px, (min-width: 640px) 50vw, 100vw" : "(min-width: 1280px) 1200px, 100vw"} />
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-[18px] border-[5px] border-white bg-white shadow-[0_24px_50px_-28px_rgb(18_18_18/0.55)]">
                    <Pic
                      image={m.image}
                      alt={alt}
                      sizes={c.layout === "slides" ? "(min-width: 1024px) 33vw, 50vw" : c.layout === "bento" && i === c.gallery.length - 1 ? "100vw" : c.layout === "duo" ? (i === 0 ? "(min-width: 1024px) 40vw, 100vw" : "(min-width: 1024px) 58vw, 100vw") : "(min-width: 640px) 50vw, 100vw"}
                      className={c.layout === "bento" ? (i === c.gallery.length - 1 && c.gallery.length % 2 ? "sm:aspect-[3/2] sm:object-cover" : "sm:aspect-[4/5] sm:object-cover") : undefined}
                    />
                  </div>
                )}
                {caps[i] && <figcaption className={cn("t-small mt-3 font-medium text-stone-ink", (c.layout === "showcase" || c.layout === "pairs") && "mt-5 text-center")}>{caps[i]}</figcaption>}
              </figure>
            );
          })}
        </div>
      </section>

      {/* Результаты: цифры текстом (для чтения и поиска) + готовая визуализация из кейса */}
      {c.results && (
        <section aria-labelledby="result" className="wrap section pb-0">
          <div className="mx-auto max-w-[1200px]">
            <h2 id="result" className="t-h2">{t.page.result}</h2>
            <dl className="mt-8 grid grid-cols-2 border-t border-ink/15 lg:grid-cols-4">
              {c.results.map((r) => (
                <div key={r.key} className="border-b border-ink/15 py-5 pr-4 lg:border-b-0 lg:py-6">
                  <dt className="t-small text-stone-ink">{extra.metrics?.[r.key] ?? r.key}</dt>
                  <dd className="mt-2 font-display text-[clamp(2rem,5vw,3.25rem)] leading-none font-black tracking-tight tabular-nums">{metric(r.value)}</dd>
                </div>
              ))}
            </dl>
            {pres?.results && (
              <figure className={cn(slide, "mt-12 sm:mt-16")} data-reveal>
                <Pic image={pres.results} alt={extra.resultsAlt ?? t.page.result} sizes="(min-width: 1280px) 1200px, 100vw" />
              </figure>
            )}
            {extra.outcome && (
              <p className="t-lead mx-auto mt-12 flex max-w-[50rem] items-start gap-4 sm:mt-16">
                <span aria-hidden="true" className="mt-[0.5em] size-3 shrink-0 rounded-full bg-coral" />
                {extra.outcome}
              </p>
            )}
          </div>
        </section>
      )}

      {pres?.outro && (
        <div className="wrap section pb-0">
          <figure className={cn(slide, "mx-auto max-w-[1200px]")} data-reveal>
            <Pic image={pres.outro} alt={extra.outroAlt ?? text.title} sizes="(min-width: 1280px) 1200px, 100vw" />
          </figure>
        </div>
      )}

      <section className="wrap section">
        <div className="on-dark relative overflow-hidden rounded-[var(--radius-card)] bg-ink p-8 text-paper sm:p-14">
          <h2 className="t-h1 relative z-10 max-w-[40rem]">{extra.ctaTitle ?? t.page.similarTitle}</h2>
          <p className="t-lead relative z-10 mt-5 max-w-[36rem] text-paper/80">{extra.ctaText ?? t.page.similarText}</p>
          <div className="relative z-10 mt-8 flex flex-col gap-3 sm:flex-row">
            <ButtonLink href={lp(locale, anchors.project)}>{d.cta.project}</ButtonLink>
            <ButtonLink href={lp(locale, anchors.partner)} variant="outline-light">
              {d.cta.partner}
            </ButtonLink>
          </div>
          <span aria-hidden="true" className="absolute -right-16 -bottom-16 size-56 rounded-full bg-coral" />
        </div>
      </section>

      {next && next.slug !== c.slug && (
        <section aria-labelledby="next-case" className="wrap pb-[var(--section)]">
          <p id="next-case" className="t-label mb-6 text-stone-ink">{t.page.next}</p>
          <CaseCard c={next} t={t} locale={locale} headingLevel="h2" />
        </section>
      )}
    </article>
  );
}
