"use client";
import { useState } from "react";
import { reviewMeta } from "@/content/reviews";
import type { Dict } from "@/i18n/dictionaries/ru";
import { cn } from "@/lib/cn";
import { Mascot } from "../mm/Mascot";
import { Eyebrow } from "../ui/SectionHead";
import { TabList } from "../ui/Tabs";

type Aud = "client" | "partner";
type Item = Dict["reviews"]["items"][number];

/* Отзывы — карточки «как в соцсетях»: аватар и подпись сверху, текст ниже.
   Огромное слово-заголовок и вкладки «Клиенты / Партнёры» остались прежними.
   Фото, компания и пометка примера — в src/content/reviews.ts. */

const looks = [
  { card: "bg-paper text-ink", avatar: "bg-ink text-paper", quote: "text-coral", r: -1.2 },
  { card: "bg-coral text-ink", avatar: "bg-ink text-coral", quote: "text-ink/25", r: 0.9 },
  { card: "bg-white text-ink", avatar: "bg-coral text-ink", quote: "text-coral", r: -0.6 },
] as const;

/** Инициалы: «Марина С.» → «МС», «玛丽娜 S.» → «玛S» */
function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => Array.from(w)[0])
    .join("")
    .toUpperCase();
}

function Rich({ text, hl }: { text: string; hl: string }) {
  const i = hl ? text.indexOf(hl) : -1;
  if (i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <strong className="font-bold">{hl}</strong>
      {text.slice(i + hl.length)}
    </>
  );
}

function Avatar({ it, tone }: { it: Item; tone: string }) {
  const photo = reviewMeta[it.id]?.photo;
  return (
    <span aria-hidden="true" className="relative shrink-0">
      {/* фирменное пунктирное кольцо */}
      <span className="absolute -inset-[5px] rounded-full border-2 border-dashed border-current opacity-30" />
      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photo} alt="" width={64} height={64} loading="lazy" decoding="async" className="relative size-14 rounded-full object-cover sm:size-16" />
      ) : (
        <span className={cn("relative grid size-14 place-items-center rounded-full font-display text-lg font-black tracking-tight sm:size-16 sm:text-xl", tone)}>
          {initials(it.name)}
        </span>
      )}
      <span className="absolute -right-0.5 -bottom-0.5 size-4 rounded-full border-[3px] border-current bg-coral" />
    </span>
  );
}

export function Testimonials({ t }: { t: Dict["reviews"] }) {
  const [aud, setAud] = useState<Aud>("client");
  const word = t.eyebrow;
  return (
    <section id="reviews" aria-labelledby="reviews-title" className="cv section on-dark relative overflow-hidden bg-ink text-paper">
      <div aria-hidden="true" className="dot-grid-dark absolute inset-0 opacity-60" />
      <span aria-hidden="true" className="absolute -top-24 -left-24 size-72 rounded-full bg-coral/25 blur-3xl" />

      <div className="wrap relative">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end" data-reveal>
          <div className="max-w-[40rem]">
            <Eyebrow dark>{t.eyebrow}</Eyebrow>
            <h2 id="reviews-title" className="t-h2 mt-4 text-paper">
              {t.title}
            </h2>
          </div>
          <TabList
            idBase="reviews"
            label={t.tabsLabel}
            value={aud}
            onChange={setAud}
            dark
            items={[
              { value: "client", label: t.clients },
              { value: "partner", label: t.partners },
            ]}
            className="self-start lg:self-auto"
          />
        </div>

        {/* Слово-плакат: подбирает размер под длину, на любом языке в одну строку */}
        <div aria-hidden="true" className="mt-10 [container-type:inline-size] md:mt-14">
          <p
            className="font-display leading-[0.85] font-black tracking-[-0.02em] whitespace-nowrap text-paper uppercase select-none"
            style={{ fontSize: `min(15rem, calc(100cqw / ${Math.max(word.length, 4)} * 0.96))` }}
          >
            {word}
          </p>
        </div>

        {(["client", "partner"] as Aud[]).map((a) => (
          <div
            key={a}
            role="tabpanel"
            id={`reviews-panel-${a}`}
            aria-labelledby={`reviews-tab-${a}`}
            hidden={a !== aud}
            tabIndex={0}
            className="relative -mt-[clamp(0.5rem,2.6vw,2.25rem)] focus-visible:outline-offset-8"
          >
            <ul className="grid items-start gap-5 md:grid-cols-2 lg:grid-cols-3 lg:gap-6">
              {t.items
                .filter((it) => it.audience === a)
                .map((it, i) => {
                  const l = looks[i % looks.length];
                  const meta = reviewMeta[it.id];
                  const sub = [it.role, meta?.company].filter(Boolean).join(" · ");
                  return (
                    <li key={it.id} data-reveal className={cn(i === 1 && "lg:mt-12", i === 2 && "md:col-span-2 md:mx-auto md:w-1/2 lg:col-span-1 lg:mt-4 lg:w-auto")}>
                      <figure
                        className={cn(
                          "relative flex h-full flex-col overflow-hidden rounded-[var(--radius-card)] p-6 shadow-[0_28px_60px_-30px_rgb(0_0_0/0.85)] transition-transform duration-500 ease-spring motion-reduce:transition-none sm:p-8 md:rotate-[var(--r)] md:hover:rotate-0",
                          l.card,
                        )}
                        style={{ ["--r" as string]: `${l.r}deg` }}
                      >
                        {/* Декоративная кавычка */}
                        <span aria-hidden="true" className={cn("pointer-events-none absolute -top-3 right-5 font-display text-[7rem] leading-none font-black select-none", l.quote)}>
                          “
                        </span>

                        <figcaption className="relative flex items-center gap-4 pr-12">
                          <Avatar it={it} tone={l.avatar} />
                          <span className="min-w-0">
                            <span className="block font-display text-[1.05rem] leading-tight font-bold [overflow-wrap:anywhere] sm:text-[1.15rem]">{it.name}</span>
                            {sub && <span className="mt-1 block text-[0.9rem] leading-snug opacity-75 [overflow-wrap:anywhere]">{sub}</span>}
                          </span>
                        </figcaption>

                        <blockquote className="relative mt-6 flex-1">
                          <p className="t-body-l">
                            <Rich text={it.text} hl={it.highlight} />
                          </p>
                        </blockquote>

                        <div className="relative mt-6 flex items-center justify-between gap-3 border-t border-current/15 pt-4">
                          <span aria-hidden="true" className="flex gap-1.5">
                            <span className="size-2 rounded-full bg-current opacity-80" />
                            <span className="size-2 rounded-full bg-current opacity-40" />
                            <span className="size-2 rounded-full bg-current opacity-20" />
                          </span>
                          {meta?.example && (
                            <span className="rounded-pill border border-dashed border-current/50 px-2.5 py-1 font-mono text-[11px] leading-none">
                              {t.demoBadge}
                            </span>
                          )}
                        </div>
                      </figure>
                    </li>
                  );
                })}
            </ul>
          </div>
        ))}
      </div>

      <Mascot
        emotion="happy"
        alt=""
        sizes="200px"
        className="pointer-events-none absolute right-[3%] bottom-0 hidden w-[150px] translate-y-[22%] xl:block 2xl:w-[190px]"
      />
    </section>
  );
}
