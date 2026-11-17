import type { Img } from "@/content/types";
import { cn } from "@/lib/cn";

/** Адаптивная картинка кейса (WebP, а при image.avif — ещё и AVIF; несколько ширин, без JS) */
export function Pic({ image, alt, sizes, className, priority }: { image: Img; alt: string; sizes: string; className?: string; priority?: boolean }) {
  const max = image.widths[image.widths.length - 1];
  const img = (
    <img
      src={`/cases/${image.base}-${max}.webp`}
      srcSet={image.widths.map((w) => `/cases/${image.base}-${w}.webp ${w}w`).join(", ")}
      sizes={sizes}
      width={image.w}
      height={image.h}
      alt={alt}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
      decoding="async"
      className={cn("block h-auto w-full", className)}
    />
  );
  if (!image.avif) return img;
  return (
    <picture className="contents">
      <source type="image/avif" srcSet={image.widths.map((w) => `/cases/${image.base}-${w}.avif ${w}w`).join(", ")} sizes={sizes} />
      {img}
    </picture>
  );
}
