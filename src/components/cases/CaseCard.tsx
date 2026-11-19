import Link from "next/link";
import type { CaseBase } from "@/content/cases";
import type { Locale } from "@/i18n/config";
import type { Dict } from "@/i18n/dictionaries/ru";
import { lp } from "@/i18n/paths";
import { cn } from "@/lib/cn";
import { Badge } from "../ui/Badge";
import { Icon } from "../ui/Icon";
import { CaseCover } from "./CaseCover";

const tones = { app: "paper", web: "paper", ads: "coral", landing: "sand", branding: "paper", motion: "ink" } as const;

export function CaseCard({
  c,
  t,
  locale,
  size = "md",
  headingLevel = "h3",
  className,
  aspect,
}: {
  c: CaseBase;
  t: Dict["cases"];
  locale: Locale;
  size?: "lg" | "md";
  headingLevel?: "h2" | "h3";
  className?: string;
  aspect?: string;
}) {
  const H = headingLevel;
  const text = t.items[c.slug];
  // у кейсов со своей эстетикой — светлые стикеры, без тяжёлых плашек
  const soft = c.cover.kind === "image" || (c.cover.kind === "collage" && !!c.cover.surface);
  return (
    <article className={cn("group/case group relative", className)} data-reveal>
      <div className="relative">
        <CaseCover
          cover={c.cover}
          tone={tones[c.category]}
          label={text.title}
          className={cn("rounded-[var(--radius-card)]", soft ? "shadow-[0_30px_60px_-34px_rgb(18_18_18/0.35)]" : "shadow-[0_24px_50px_-28px_rgb(18_18_18/0.55)]", aspect ?? (size === "lg" ? "aspect-[4/3] sm:aspect-[16/9]" : "aspect-[4/3]"))}
        />
        <span aria-hidden="true" className="absolute right-4 bottom-4 z-10 grid size-14 place-items-center rounded-full border-[3px] border-white bg-coral text-ink shadow-lg transition-transform duration-500 ease-spring sm:right-6 sm:bottom-6 sm:size-16 md:scale-0 md:group-hover:scale-100 md:group-focus-within:scale-100 motion-reduce:transition-none">
          <Icon name="arrow-up-right" size={26} />
        </span>
        <div className="absolute top-4 left-4 z-10 flex flex-wrap gap-2 sm:top-6 sm:left-6">
          <span className={cn("sticker !px-3 !py-1.5 !text-[12px]", soft ? "sticker-white shadow-[0_8px_20px_-10px_rgb(18_18_18/0.35)]" : "sticker-ink")} style={{ ["--r" as string]: "-3deg" }}>
            {t.categories[c.category]}
          </span>
          {c.industry && (
            <span className={cn("sticker sticker-white !px-3 !py-1.5 !text-[12px]", soft && "shadow-[0_8px_20px_-10px_rgb(18_18_18/0.35)]")} style={{ ["--r" as string]: "2deg" }}>
              {t.industries[c.industry]}
            </span>
          )}
        </div>
      </div>
      <div className={cn("mt-5 grid gap-3", size === "lg" && "lg:grid-cols-12 lg:gap-8")}>
        <div className={cn(size === "lg" && "lg:col-span-7")}>
          <p className="t-mono text-stone-ink">{text.client}</p>
          <H className={cn("mt-2", size === "lg" ? "t-h2" : "t-h3")}>
            <Link href={lp(locale, `/cases/${c.slug}/`)} className="decoration-coral decoration-[3px] underline-offset-4 group-focus-within:underline after:absolute after:inset-0 after:z-20 after:rounded-[var(--radius-card)] focus-visible:outline-none">
              {text.title}
            </Link>
          </H>
        </div>
        <div className={cn(size === "lg" && "lg:col-span-5 lg:pt-7")}>
          <p className="t-body-l text-ink/80">{text.summary}</p>
          <ul className="mt-4 flex flex-wrap gap-1.5" aria-label={t.servicesLabel}>
            {c.tags.map((k) => (
              <li key={k}>
                <Badge>{t.tags[k]}</Badge>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </article>
  );
}
