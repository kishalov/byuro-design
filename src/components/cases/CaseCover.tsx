import type { CaseCover as Cover } from "@/content/types";
import { cn } from "@/lib/cn";
import { AutoVideo } from "./AutoVideo";
import { Pic } from "./Pic";

/* Обложки кейсов — mixed media:
   • collage — работы веером, как разложенные на столе отпечатки; при наведении раскрываются;
   • browser — лендинг в окне браузера; при наведении страница медленно прокручивается;
   • video — моушн играет сам, только когда виден. */

const fan = [
  { r: -9, x: "-118%", y: "6%" },
  { r: -3, x: "-40%", y: "-4%" },
  { r: 4, x: "40%", y: "3%" },
  { r: 10, x: "118%", y: "-3%" },
];
const fan3 = [
  { r: -8, x: "-78%", y: "4%" },
  { r: 0, x: "0%", y: "-3%" },
  { r: 8, x: "78%", y: "4%" },
];

const fan5 = [
  { r: -10, x: "-172%", y: "7%" },
  { r: -5, x: "-88%", y: "-2%" },
  { r: 0, x: "0%", y: "-5%" },
  { r: 5, x: "88%", y: "-1%" },
  { r: 10, x: "172%", y: "6%" },
];

// пара: вертикальный постер + горизонтальная работа
const fan2 = [
  { r: -6, x: "-62%", y: "3%" },
  { r: 5, x: "40%", y: "-5%" },
];

export function CaseCover({ cover, label, className, priority, tone = "sand" }: { cover: Cover; label: string; className?: string; priority?: boolean; tone?: "sand" | "ink" | "coral" | "paper" }) {
  const bg = { sand: "bg-sand", ink: "bg-ink", coral: "bg-coral", paper: "bg-paper" }[tone];

  if (cover.kind === "image") {
    // Готовая презентация кейса: светлая подложка, мягкая тень, лёгкое приближение при наведении
    return (
      <div className={cn("relative overflow-hidden", className)} style={{ background: cover.surface ?? "linear-gradient(135deg,#F7F4F0 0%,#F1ECE6 55%,#EEE9F3 100%)" }}>
        <Pic
          image={cover.image}
          alt={label}
          sizes="(min-width: 1280px) 1200px, 100vw"
          priority={priority}
          className="!h-full w-full object-cover transition-transform duration-[1200ms] ease-out group-hover/case:scale-[1.025] motion-reduce:transition-none"
        />
        <span aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-[inherit] shadow-[inset_0_0_0_1px_rgb(18_18_18/0.06)]" />
      </div>
    );
  }

  if (cover.kind === "collage") {
    const n = cover.images.length;
    const pos = n === 2 ? fan2 : n === 3 ? fan3 : n === 5 ? fan5 : fan;
    const tall = cover.images[0].h > cover.images[0].w * 1.5;
    return (
      <div role="img" aria-label={label} className={cn("group/cover relative overflow-hidden", !cover.surface && bg, className)} style={cover.surface ? { background: cover.surface } : undefined}>
        <div aria-hidden="true" className={cn("absolute inset-0", cover.surface ? "dot-grid-dark opacity-30" : "dot-grid opacity-60")} />
        <div aria-hidden="true" className="absolute inset-0 grid place-items-center">
          {cover.images.map((im, i) => {
            const p = pos[i % pos.length];
            const portrait = im.h > im.w;
            return (
              <div
                key={im.base}
                className={cn(
                  "fan-card absolute overflow-hidden rounded-[10px] border-[5px] border-white bg-white shadow-[0_24px_40px_-18px_rgb(18_18_18/0.55)] transition-transform duration-700 ease-spring motion-reduce:transition-none",
                  n === 2 ? (portrait ? "w-[36%] sm:w-[30%]" : "w-[52%] sm:w-[44%]") : n === 5 ? "w-[21%] sm:w-[19%] lg:w-[17%]" : tall ? "w-[30%] sm:w-[24%]" : "w-[30%] sm:w-[26%]",
                )}
                style={{
                  transform: `translate(${p.x}, ${p.y}) rotate(${p.r}deg)`,
                  zIndex: i === (cover.front ?? Math.floor(n / 2)) ? 6 : i,
                  ["--spread" as string]: `translate(calc(${p.x} * 1.12), calc(${p.y} - 4%)) rotate(${p.r * 0.4}deg) scale(1.04)`,
                }}
              >
                <Pic image={im} alt="" sizes={n === 5 ? "(min-width: 1024px) 18vw, 25vw" : "(min-width: 1024px) 22vw, 40vw"} priority={priority} className={n === 2 ? "" : n === 5 ? "aspect-[4/5] object-cover" : tall ? "aspect-[9/16] object-cover" : ""} />
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (cover.kind === "browser") {
    return (
      <div role="img" aria-label={label} className={cn("group/cover relative overflow-hidden", bg, className)}>
        <div aria-hidden="true" className="dot-grid absolute inset-0 opacity-60" />
        <div aria-hidden="true" className="absolute inset-x-[7%] top-[9%] bottom-0 flex flex-col overflow-hidden rounded-t-[14px] bg-white shadow-[0_30px_60px_-25px_rgb(18_18_18/0.6)]">
          <div className="flex shrink-0 items-center gap-1.5 bg-ink px-3 py-2.5">
            <span className="size-2.5 rounded-full bg-coral" />
            <span className="size-2.5 rounded-full bg-paper/40" />
            <span className="size-2.5 rounded-full bg-paper/40" />
            <span className="ml-3 h-3 w-1/3 rounded-full bg-paper/15" />
          </div>
          <div className="relative min-h-0 flex-1 overflow-hidden [container-type:size]">
            <div className="absolute inset-x-0 top-0 transition-transform duration-[5s] ease-in-out group-hover/case:translate-y-[calc(-100%_+_100cqh)] group-focus-within/case:translate-y-[calc(-100%_+_100cqh)] motion-reduce:transition-none">
              <Pic image={cover.image} alt="" sizes="(min-width: 1024px) 50vw, 90vw" priority={priority} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (cover.kind === "reel") {
    const [main, ...rest] = cover.videos;
    const side = [
      { v: rest[0], r: -9, x: "-58%", spread: "-72%" },
      { v: rest[1], r: 9, x: "58%", spread: "72%" },
    ].filter((s) => s.v);
    return (
      <div className={cn("relative overflow-hidden bg-ink", className)}>
        <div aria-hidden="true" className="dot-grid-dark absolute inset-0 opacity-70" />
        <span aria-hidden="true" className="absolute top-1/2 left-1/2 size-[46%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-coral/80 blur-3xl" />
        <div className="absolute inset-0 grid place-items-center">
          {side.map(({ v, r, x, spread }) => (
            <div
              key={v!.src}
              aria-hidden="true"
              className="fan-card absolute aspect-[9/16] h-[66%] overflow-hidden rounded-[18px] border-[4px] border-white/90 bg-ink opacity-90 shadow-[0_24px_40px_-18px_rgb(0_0_0/0.7)] transition-transform duration-700 ease-spring motion-reduce:transition-none"
              style={{
                transform: `translate(${x}, 6%) rotate(${r}deg)`,
                ["--spread" as string]: `translate(${spread}, 4%) rotate(${r * 0.6}deg)`,
              }}
            >
              <Pic image={v!.poster} alt="" sizes="20vw" className="size-full object-cover" />
            </div>
          ))}
          <div className="relative z-10 aspect-[9/16] h-[84%] overflow-hidden rounded-[22px] border-[5px] border-white bg-ink shadow-[0_30px_60px_-20px_rgb(0_0_0/0.8)]">
            <AutoVideo
              src={main.src}
              poster={`/cases/${main.poster.base}-${main.poster.widths[main.poster.widths.length - 1]}.webp`}
              label={label}
              className="size-full object-cover"
            />
          </div>
        </div>
      </div>
    );
  }

  // video
  return (
    <div className={cn("relative overflow-hidden bg-ink", className)}>
      <AutoVideo
        src={cover.src}
        poster={`/cases/${cover.poster.base}-${cover.poster.widths[cover.poster.widths.length - 1]}.webp`}
        label={label}
        className="absolute inset-0 size-full object-cover"
      />
    </div>
  );
}
