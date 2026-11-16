"use client";
import { useEffect, useRef } from "react";

/* Короткое беззвучное видео: играет по кругу, только когда видно на экране,
   и не стартует сам при prefers-reduced-motion (тогда есть кнопки управления). */
export function AutoVideo({ src, poster, label, className, controls }: { src: string; poster: string; label: string; className?: string; controls?: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      v.controls = true;
      return;
    }
    const io = new IntersectionObserver(([e]) => (e.isIntersecting ? v.play().catch(() => {}) : v.pause()), { threshold: 0.3 });
    io.observe(v);
    return () => io.disconnect();
  }, []);
  return (
    <video
      ref={ref}
      className={className}
      src={src}
      poster={poster}
      muted
      loop
      playsInline
      preload="none"
      controls={controls}
      aria-label={label}
    />
  );
}
