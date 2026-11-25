"use client";
import { useEffect, useRef, useState } from "react";
import type { Dict } from "@/i18n/dictionaries/ru";
import { Icon } from "../ui/Icon";

const SRC = "/cases/showreel.mp4";
const POSTER = "/cases/showreel-poster-720.webp";

/* Первый слайд в ленте кейсов: вертикальный шоурил (9:16) на тёмной карточке того же
   размера, что и обложки кейсов, + короткий текст «это обзор, подробнее — листайте дальше».
   Видео без звука играет по кругу, только пока слайд на экране; звук — по кнопке.
   При prefers-reduced-motion само не стартует (появляются стандартные кнопки). */
export function ShowreelSlide({ t, total, onNext }: { t: Dict["landing"]["reel"]; total: number; onNext: () => void }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      v.controls = true;
      return;
    }
    const io = new IntersectionObserver(([e]) => (e.isIntersecting ? v.play().catch(() => {}) : v.pause()), { threshold: 0.4 });
    io.observe(v);
    return () => io.disconnect();
  }, []);
  const toggleSound = () => {
    const v = ref.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
    if (!v.muted) v.play().catch(() => {});
  };

  return (
    <li aria-roledescription="slide" aria-label={`1 / ${total}: ${t.title}`} className="relative w-[86%] shrink-0 snap-start sm:w-[58%] lg:w-[40%] xl:w-[36%]">
      {/* @container: ширина колонки видео считается от ширины карточки (высота = 3/4 ширины, видео 9:16) */}
      <div className="@container relative aspect-[4/3] overflow-hidden rounded-[var(--radius-card)] bg-ink text-paper shadow-[0_24px_50px_-30px_rgb(18_18_18/0.5)]">
        <div className="flex h-full min-w-0 flex-col justify-between py-4 pr-[calc((75cqw-24px)*0.5625+28px)] pl-4 @[420px]:py-6 @[420px]:pl-6">
          <p className="t-label flex items-center gap-2 text-paper/70">
            <span aria-hidden="true" className="size-2 rounded-full bg-coral" />
            {t.label}
          </p>
          <div>
            <p className="font-display text-[clamp(1rem,7cqw,1.7rem)] leading-[1.08] font-black">{t.title}</p>
            <p className="mt-2 hidden text-[14px] leading-snug text-paper/75 @[400px]:block @[480px]:text-[15px]">{t.text}</p>
          </div>
          <button type="button" onClick={onNext} className="inline-flex min-h-10 items-center gap-2 self-start rounded-pill bg-coral px-3.5 text-[14px] font-semibold whitespace-nowrap text-ink transition-colors hover:bg-paper @[420px]:min-h-11 @[420px]:px-4 @[420px]:text-[15px]">
            {t.next}
            <Icon name="arrow-right" size={18} className="hidden @[400px]:block" />
          </button>
        </div>
        <div className="absolute inset-y-3 right-3 aspect-[9/16] overflow-hidden rounded-[18px] bg-graphite">
          <video ref={ref} src={SRC} poster={POSTER} muted loop playsInline preload="metadata" aria-label={t.title} className="size-full object-cover" />
          <button
            type="button"
            onClick={toggleSound}
            aria-pressed={!muted}
            aria-label={muted ? t.soundOn : t.soundOff}
            className="absolute right-2 bottom-2 grid size-10 place-items-center rounded-full bg-ink/70 text-paper backdrop-blur transition-colors hover:bg-coral hover:text-ink"
          >
            <SoundIcon on={!muted} />
          </button>
        </div>
      </div>
      <div className="mt-4">
        <p className="t-mono text-stone-ink">{t.meta}</p>
        <h3 className="t-h4 mt-1.5">{t.caption}</h3>
      </div>
    </li>
  );
}

function SoundIcon({ on }: { on: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M11 5 6 9H2v6h4l5 4V5z" fill="currentColor" />
      {on ? (
        <>
          <path d="M15.5 8.5a5 5 0 0 1 0 7" />
          <path d="M19 5a10 10 0 0 1 0 14" />
        </>
      ) : (
        <path d="m22 9-6 6M16 9l6 6" />
      )}
    </svg>
  );
}
