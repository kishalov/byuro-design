import { cn } from "@/lib/cn";

/* Маскот Бюро. Исходники — 3D-рендеры персонажа из ролика (5 эмоций).
   Фирменная доработка: звезда на животе перекрашена в коралл бренда.
   Форматы: AVIF → WebP, три размера, без JS. */
export type Emotion = "neutral" | "happy" | "angry" | "think" | "sad";
const dims: Record<Emotion, [number, number]> = {
  neutral: [809, 1094],
  happy: [889, 1126],
  angry: [775, 1108],
  think: [740, 1155],
  sad: [679, 1082],
};

export function Mascot({
  emotion,
  alt,
  sizes = "(min-width: 1024px) 30vw, 60vw",
  priority,
  className,
  imgClassName,
}: {
  emotion: Emotion;
  alt: string;
  sizes?: string;
  priority?: boolean;
  className?: string;
  imgClassName?: string;
}) {
  const [w, h] = dims[emotion];
  const set = (ext: string) => `/mascot/${emotion}-360.${ext} 360w, /mascot/${emotion}-640.${ext} 640w, /mascot/${emotion}-${w}.${ext} ${w}w`;
  return (
    <picture className={cn("block", className)}>
      <source type="image/avif" srcSet={set("avif")} sizes={sizes} />
      <source type="image/webp" srcSet={set("webp")} sizes={sizes} />
      <img
        src={`/mascot/${emotion}-640.webp`}
        width={w}
        height={h}
        alt={alt}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
        decoding="async"
        draggable={false}
        className={cn("block h-auto w-full select-none", imgClassName)}
      />
    </picture>
  );
}
