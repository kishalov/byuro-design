"use client";
import { useState } from "react";
import type { Dict } from "@/i18n/dictionaries/ru";
import { cn } from "@/lib/cn";
import { Mascot } from "../mm/Mascot";
import { Badge } from "../ui/Badge";
import { Eyebrow } from "../ui/SectionHead";
import { TabList } from "../ui/Tabs";

type Aud = "client" | "partner";

/* Отзывы в виде переписки: огромное слово-заголовок, поверх — «сообщения».
   Тексты — ПРИМЕРЫ (помечены на сайте). Перед публикацией заменить реальными. */

const looks = [
  { bubble: "bg-white text-ink", avatar: "bg-white text-ink", side: "left", r: -2.2 },
  { bubble: "bg-coral text-ink", avatar: "bg-white text-coral", side: "right", r: 1.6 },
  { bubble: "bg-sand text-ink", avatar: "bg-white text-ink", side: "left", r: -1.2 },
] as const;

function Rich({ text, hl }: { text: string; hl: string }) {
  const i = text.indexOf(hl);
  if (i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <strong className="font-bold">{hl}</strong>
      {text.slice(i + hl.length)}
    </>
  );
}

export function Testimonials({ t, mascotAlt }: { t: Dict["reviews"]; mascotAlt?: string }) {
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
            className="relative -mt-[clamp(1rem,4vw,3.5rem)] focus-visible:outline-offset-8"
          >
            <ul className="mx-auto flex max-w-[54rem] flex-col gap-8 sm:gap-6">
              {t.items
                .filter((it) => it.audience === a)
                .map((it, i) => {
                  const l = looks[i % looks.length];
                  const right = l.side === "right";
                  return (
                    <li
                      key={it.id}
                      data-reveal
                      className={cn("w-full sm:w-[88%]", right ? "self-start" : "self-end")}
                    >
                      <figure>
                        <div className={cn("flex items-end gap-3 sm:gap-4", right && "flex-row-reverse")}>
                          <span
                            aria-hidden="true"
                            className={cn("grid size-11 shrink-0 place-items-center rounded-full font-display text-lg font-black shadow-[0_10px_24px_-10px_rgb(0_0_0/0.6)] sm:size-16 sm:text-2xl", l.avatar)}
                          >
                            {it.name[0]}
                          </span>
                          <div
                            className={cn(
                              "relative min-w-0 flex-1 rounded-[26px] px-5 py-4 shadow-[0_24px_50px_-24px_rgb(0_0_0/0.8)] transition-transform duration-500 ease-spring hover:!rotate-0 motion-reduce:transition-none sm:rounded-[36px] sm:px-9 sm:py-7",
                              right ? "rounded-br-md" : "rounded-bl-md",
                              l.bubble,
                            )}
                            style={{ rotate: `${l.r}deg` }}
                          >
                            <blockquote>
                              <p className="t-body-l sm:!text-[1.35rem] sm:leading-snug">
                                <Rich text={it.text} hl={it.highlight} />
                              </p>
                            </blockquote>
                          </div>
                        </div>
                        <figcaption className={cn("mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5", right ? "justify-end pr-14 text-right sm:pr-20" : "pl-14 sm:pl-20")}>
                          <span className="t-small font-semibold text-paper">{it.name}</span>
                          <span className="t-small text-paper/65">{it.role}</span>
                          <Badge tone="demo-dark">{t.demoBadge}</Badge>
                        </figcaption>
                      </figure>
                    </li>
                  );
                })}
            </ul>
          </div>
        ))}

        <p className="t-small mx-auto mt-10 max-w-[54rem] text-paper/60">{t.lead}</p>
      </div>

      <Mascot
        emotion="happy"
        alt={mascotAlt ?? ""}
        sizes="200px"
        className="pointer-events-none absolute right-[3%] bottom-0 hidden w-[160px] translate-y-[18%] xl:block 2xl:w-[200px]"
      />
    </section>
  );
}
