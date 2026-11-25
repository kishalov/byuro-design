import { reviewMeta } from "@/content/reviews";
import type { Dict } from "@/i18n/dictionaries/ru";
import { cn } from "@/lib/cn";
import { Rail } from "./Rail";

type Item = Dict["reviews"]["items"][number];

/** Инициалы: «Марина С.» → «МС» */
const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => Array.from(w)[0])
    .join("")
    .toUpperCase();

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

/* Отзывы на лендинге — лентой, как кейсы: спокойные светлые карточки, без вкладок и декора.
   Тексты — в словарях (reviews.items), компания и фото — в src/content/reviews.ts. */
export function LandingReviews({ t, labels }: { t: Dict["reviews"]; labels: { prev: string; next: string } }) {
  const items = t.items;
  return (
    <Rail id="reviews" title={t.title} labels={{ ...labels, slider: t.eyebrow }}>
      {items.map((it: Item, i) => {
        const meta = reviewMeta[it.id];
        const sub = [it.role, meta?.company].filter(Boolean).join(" · ");
        return (
          <li key={it.id} aria-roledescription="slide" aria-label={`${i + 1} / ${items.length}: ${it.name}`} className="w-[86%] shrink-0 snap-start sm:w-[58%] lg:w-[38%] xl:w-[32%]">
            <figure className="flex h-full flex-col rounded-[var(--radius-card)] border-2 border-ink/10 bg-white p-6 sm:p-7">
              <figcaption className="flex items-center gap-3 border-b border-ink/10 pb-5">
                {meta?.photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={meta.photo} alt="" width={48} height={48} loading="lazy" decoding="async" className="size-12 shrink-0 rounded-full object-cover" />
                ) : (
                  <span aria-hidden="true" className={cn("grid size-12 shrink-0 place-items-center rounded-full font-display text-[15px] font-black", i % 2 ? "bg-coral text-ink" : "bg-ink text-paper")}>
                    {initials(it.name)}
                  </span>
                )}
                <span className="min-w-0">
                  <span className="block font-semibold">{it.name}</span>
                  {sub && <span className="block text-[14px] leading-snug text-stone-ink">{sub}</span>}
                </span>
              </figcaption>
              <blockquote className="mt-5">
                <p className="text-[17px] leading-relaxed text-ink/90">
                  <Rich text={it.text} hl={it.highlight} />
                </p>
              </blockquote>
            </figure>
          </li>
        );
      })}
    </Rail>
  );
}
