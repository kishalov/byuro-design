import type { Dict } from "@/i18n/dictionaries/ru";

/* Две перекрещенные «ленты-скотча» с индустриями (mixed media).
   Копии рядов скрыты от скринридеров; при reduced-motion стоят на месте. */
export function Marquee({ t }: { t: Dict["marquee"] }) {
  const row = (hidden: boolean, dot: string) => (
    <ul className="flex shrink-0 items-center" aria-hidden={hidden || undefined}>
      {t.items.map((it) => (
        <li key={it} className="flex items-center font-display text-[clamp(1.05rem,2.3vw,1.7rem)] font-bold whitespace-nowrap">
          <span className="px-5 sm:px-8">{it}</span>
          <span aria-hidden="true" className={`size-3 rounded-full sm:size-4 ${dot}`} />
        </li>
      ))}
    </ul>
  );
  return (
    <div role="region" aria-label={t.label} className="relative overflow-hidden py-8 sm:py-12">
      <div aria-hidden="true" className="marquee absolute inset-x-[-5%] top-1/2 -translate-y-1/2 rotate-[2.5deg] bg-coral py-3 text-ink sm:py-4">
        <div className="marquee-track rev flex w-max opacity-90">
          {row(true, "bg-ink")}
          {row(true, "bg-ink")}
        </div>
      </div>
      <div className="marquee relative -mx-[5%] -rotate-[2deg] bg-ink py-4 text-paper shadow-[0_14px_30px_-12px_rgb(18_18_18/0.5)] sm:py-6">
        <div className="marquee-track flex w-max">
          {row(false, "bg-coral")}
          {row(true, "bg-coral")}
        </div>
      </div>
    </div>
  );
}
