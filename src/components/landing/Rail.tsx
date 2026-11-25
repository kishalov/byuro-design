"use client";
import { Children, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Icon } from "../ui/Icon";

/* Горизонтальная лента карточек — как слайдер кейсов: нативная прокрутка со snap
   (свайп на телефоне, тачпад и клавиатура на десктопе), стрелки и счётчик.
   children — элементы <li> с aria-roledescription="slide". */
export function Rail({
  id,
  title,
  lead,
  labels,
  itemClass,
  className,
  children,
}: {
  id: string;
  title: ReactNode;
  lead?: string;
  labels: { prev: string; next: string; slider: string };
  /** ширина карточки на разных экранах */
  itemClass?: string;
  className?: string;
  children: ReactNode;
}) {
  const track = useRef<HTMLUListElement>(null);
  const count = Children.count(children);
  const [index, setIndex] = useState(0);
  const [edge, setEdge] = useState({ start: true, end: false });

  const slides = () => Array.from(track.current?.querySelectorAll<HTMLElement>(":scope > li[aria-roledescription]") ?? []);

  const update = useCallback(() => {
    const el = track.current;
    if (!el) return;
    const list = Array.from(el.querySelectorAll<HTMLElement>(":scope > li[aria-roledescription]"));
    if (!list.length) return;
    const left = el.scrollLeft;
    let best = 0;
    list.forEach((s, i) => {
      if (Math.abs(s.offsetLeft - el.offsetLeft - left) < Math.abs(list[best].offsetLeft - el.offsetLeft - left)) best = i;
    });
    const end = left + el.clientWidth >= el.scrollWidth - 4;
    setIndex(end ? list.length - 1 : best);
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

  const go = (dir: 1 | -1) => {
    const el = track.current;
    const list = slides();
    if (!el || !list.length) return;
    const target = list[Math.max(0, Math.min(list.length - 1, index + dir))];
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollTo({ left: target.offsetLeft - el.offsetLeft, behavior: reduce ? "auto" : "smooth" });
  };

  const noScroll = edge.start && edge.end; // всё и так помещается — стрелки не нужны

  return (
    <section id={id} aria-labelledby={`${id}-title`} className={className ?? "relative overflow-hidden border-t border-ink/10 py-16 sm:py-20"}>
      <div className="wrap">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-[40rem]">
            <h2 id={`${id}-title`} className="t-h2">
              {title}
              <span aria-hidden="true" className="ml-[0.06em] inline-block size-[0.2em] rounded-full bg-coral" />
            </h2>
            {lead && <p className="t-body-l mt-3 text-ink/75">{lead}</p>}
          </div>
          {!noScroll && (
            <div className="flex items-center gap-3">
              <p className="t-mono min-w-[4.5rem] text-right text-stone-ink tabular-nums" aria-live="polite">
                {String(index + 1).padStart(2, "0")} / {String(count).padStart(2, "0")}
              </p>
              <button type="button" onClick={() => go(-1)} disabled={edge.start} aria-label={labels.prev} aria-controls={`${id}-track`} className="grid size-12 place-items-center rounded-full border-2 border-ink transition-colors hover:bg-ink hover:text-paper disabled:pointer-events-none disabled:opacity-30">
                <Icon name="arrow-left" size={22} />
              </button>
              <button type="button" onClick={() => go(1)} disabled={edge.end} aria-label={labels.next} aria-controls={`${id}-track`} className="grid size-12 place-items-center rounded-full border-2 border-ink bg-ink text-paper transition-colors hover:border-coral hover:bg-coral hover:text-ink disabled:pointer-events-none disabled:opacity-30">
                <Icon name="arrow-right" size={22} />
              </button>
            </div>
          )}
        </div>
      </div>

      <ul
        id={`${id}-track`}
        ref={track}
        aria-label={labels.slider}
        tabIndex={0}
        className={`mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-[var(--gutter)] pb-6 [scroll-padding-inline:var(--gutter)] [scrollbar-width:none] focus-visible:outline-offset-4 motion-reduce:scroll-auto sm:gap-6 [&::-webkit-scrollbar]:hidden ${itemClass ?? ""}`}
      >
        {children}
        <li aria-hidden="true" className="w-px shrink-0" />
      </ul>
    </section>
  );
}
