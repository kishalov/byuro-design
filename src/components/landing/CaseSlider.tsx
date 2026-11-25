"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { CaseBase } from "@/content/cases";
import type { Locale } from "@/i18n/config";
import type { Dict } from "@/i18n/dictionaries/ru";
import { lp } from "@/i18n/paths";
import { cn } from "@/lib/cn";
import { CaseCover } from "../cases/CaseCover";
import { Icon } from "../ui/Icon";
import { ShowreelSlide } from "./ShowreelSlide";

const tones = { app: "paper", web: "paper", ads: "coral", landing: "sand", branding: "paper", motion: "ink" } as const;

/* Галерея кейсов одним слайдером (первым слайдом — шоурил): нативная прокрутка со snap (свайп на телефоне,
   колесо/тачпад и клавиатура на десктопе) + стрелки и счётчик. Без сторонних библиотек. */
export function CaseSlider({ cases, t, l, locale }: { cases: CaseBase[]; t: Dict["cases"]; l: Dict["landing"]; locale: Locale }) {
  const track = useRef<HTMLUListElement>(null);
  const [index, setIndex] = useState(0);
  const [edge, setEdge] = useState({ start: true, end: false });

  const update = useCallback(() => {
    const el = track.current;
    if (!el) return;
    const slides = Array.from(el.querySelectorAll<HTMLElement>(":scope > li[aria-roledescription]"));
    const left = el.scrollLeft;
    let best = 0;
    slides.forEach((s, i) => {
      if (Math.abs(s.offsetLeft - el.offsetLeft - left) < Math.abs(slides[best].offsetLeft - el.offsetLeft - left)) best = i;
    });
    const end = left + el.clientWidth >= el.scrollWidth - 4;
    setIndex(end ? slides.length - 1 : best); // у конца последние карточки видны целиком — счётчик показывает последнюю
    setEdge({ start: left <= 4, end });
  }, []);

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    update();
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [update]);

  const total = cases.length + 1; // + шоурил
  const go = (dir: 1 | -1) => {
    const el = track.current;
    if (!el) return;
    const slides = Array.from(el.querySelectorAll<HTMLElement>(":scope > li[aria-roledescription]"));
    const target = slides[Math.max(0, Math.min(slides.length - 1, index + dir))];
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollTo({ left: target.offsetLeft - el.offsetLeft, behavior: reduce ? "auto" : "smooth" });
  };

  return (
    <section id="cases" aria-labelledby="cases-title" className="relative overflow-hidden border-t border-ink/10 py-16 sm:py-20">
      <div className="wrap">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-[40rem]">
            <h2 id="cases-title" className="t-h2">
              {l.casesTitle}
              <span aria-hidden="true" className="ml-[0.06em] inline-block size-[0.2em] rounded-full bg-coral" />
            </h2>
            <p className="t-body-l mt-3 text-ink/75">{l.casesLead}</p>
          </div>
          <div className="flex items-center gap-3">
            <p className="t-mono min-w-[4.5rem] text-right text-stone-ink tabular-nums" aria-live="polite">
              {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
            </p>
            <button type="button" onClick={() => go(-1)} disabled={edge.start} aria-label={l.prev} aria-controls="case-track" className="grid size-12 place-items-center rounded-full border-2 border-ink transition-colors hover:bg-ink hover:text-paper disabled:pointer-events-none disabled:opacity-30">
              <Icon name="arrow-left" size={22} />
            </button>
            <button type="button" onClick={() => go(1)} disabled={edge.end} aria-label={l.next} aria-controls="case-track" className="grid size-12 place-items-center rounded-full border-2 border-ink bg-ink text-paper transition-colors hover:border-coral hover:bg-coral hover:text-ink disabled:pointer-events-none disabled:opacity-30">
              <Icon name="arrow-right" size={22} />
            </button>
          </div>
        </div>
      </div>

      <ul
        id="case-track"
        ref={track}
        aria-label={l.slider}
        tabIndex={0}
        className="mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-[var(--gutter)] pb-6 [scroll-padding-inline:var(--gutter)] [scrollbar-width:none] focus-visible:outline-offset-4 motion-reduce:scroll-auto sm:gap-6 [&::-webkit-scrollbar]:hidden"
      >
        <ShowreelSlide t={l.reel} total={total} onNext={() => go(1)} />
        {cases.map((c, i) => {
          const text = t.items[c.slug];
          return (
            <li
              key={c.slug}
              aria-roledescription="slide"
              aria-label={`${i + 2} / ${total}: ${text.title}`}
              className="group/case relative w-[86%] shrink-0 snap-start sm:w-[58%] lg:w-[40%] xl:w-[36%]"
            >
              <CaseCover
                cover={c.cover}
                tone={tones[c.category]}
                label={text.title}
                className="aspect-[4/3] rounded-[var(--radius-card)] shadow-[0_24px_50px_-30px_rgb(18_18_18/0.5)]"
              />
              <div className="mt-4 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="t-mono text-stone-ink">
                    {t.categories[c.category]}
                    {c.industry ? ` · ${t.industries[c.industry]}` : ""}
                  </p>
                  <h3 className="t-h4 mt-1.5">
                    <Link
                      href={lp(locale, `/cases/${c.slug}/`)}
                      className="decoration-coral decoration-[3px] underline-offset-4 group-hover/case:underline after:absolute after:inset-0 after:z-20 focus-visible:outline-none focus-visible:after:rounded-[var(--radius-card)] focus-visible:after:outline focus-visible:after:outline-[3px] focus-visible:after:outline-offset-4 focus-visible:after:outline-ink"
                    >
                      {text.title}
                    </Link>
                  </h3>
                </div>
                <span aria-hidden="true" className="mt-1 grid size-11 shrink-0 place-items-center rounded-full bg-coral text-ink transition-transform duration-300 group-hover/case:-translate-y-0.5 group-hover/case:translate-x-0.5">
                  <Icon name="arrow-up-right" size={20} />
                </span>
              </div>
            </li>
          );
        })}
        <li aria-hidden="true" className="w-px shrink-0" />
      </ul>

      {/* прогресс */}
      <div className="wrap">
        <div aria-hidden="true" className="h-1 overflow-hidden rounded-full bg-ink/10">
          <div className="h-full rounded-full bg-coral transition-[width] duration-300" style={{ width: `${((index + 1) / total) * 100}%` }} />
        </div>
      </div>
    </section>
  );
}
