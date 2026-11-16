import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/cn";

/* Mixed-media детали. Все декоративные элементы скрыты от скринридеров. */

type S = CSSProperties & Record<`--${string}`, string | number>;

export function Sticker({
  children,
  tone = "coral",
  rotate = 0,
  bubble,
  className,
  style,
  decorative,
}: {
  children: ReactNode;
  tone?: "coral" | "ink" | "paper" | "white";
  rotate?: number;
  bubble?: "left" | "right";
  className?: string;
  style?: S;
  decorative?: boolean;
}) {
  return (
    <span
      aria-hidden={decorative || undefined}
      className={cn("sticker", `sticker-${tone}`, bubble && "bubble", bubble === "right" && "bubble-right", className)}
      style={{ ["--r" as string]: `${rotate}deg`, ...style }}
    >
      {children}
    </span>
  );
}

export function Orb({ tone = "coral", className, style }: { tone?: "coral" | "ink" | "paper"; className?: string; style?: S }) {
  return <span aria-hidden="true" className={cn("orb", `orb-${tone}`, className)} style={style} />;
}

export function Toggle3D({ className, style }: { className?: string; style?: S }) {
  return (
    <span aria-hidden="true" className={cn("toggle3d anim-toggle", className)} style={style}>
      <b />
      <i />
    </span>
  );
}

/** Круглый бейдж с текстом по кругу и фирменной точкой в центре */
export function RingBadge({ text, className, style }: { text: string; className?: string; style?: S }) {
  const id = `ring-${text.length}-${text.charCodeAt(0)}`;
  // Деванагари нельзя растягивать по символам — ломаются лигатуры
  const complex = /[\u0900-\u097F]/.test(text);
  return (
    <span aria-hidden="true" className={cn("relative block aspect-square rounded-full bg-ink text-paper", className)} style={style}>
      <svg viewBox="0 0 120 120" className="anim-spin absolute inset-0 size-full">
        <defs>
          <path id={id} d="M60,60 m-44,0 a44,44 0 1,1 88,0 a44,44 0 1,1 -88,0" />
        </defs>
        <text fontFamily="var(--font-display)" fontWeight="700" fontSize={complex ? 12.5 : 11.5} letterSpacing={complex ? 0 : 2} fill="currentColor">
          <textPath href={`#${id}`} {...(complex ? {} : { textLength: 272 })}>
            {complex ? text + text : text.toUpperCase()}
          </textPath>
        </text>
      </svg>
      <span className="absolute inset-[34%] rounded-full bg-coral" />
    </span>
  );
}

/** Курсор совместной работы в редакторе, с подписью */
export function Cursor({ label, tone = "coral", className, style }: { label: string; tone?: "coral" | "ink"; className?: string; style?: S }) {
  return (
    <span aria-hidden="true" className={cn("anim-cursor pointer-events-none flex items-start", className)} style={style}>
      <svg width="26" height="26" viewBox="0 0 24 24" className="drop-shadow-[0_4px_6px_rgb(18_18_18/0.3)]">
        <path d="M4 3l15 7.2-6.4 1.8L9.8 19z" fill={tone === "coral" ? "#FF4D2E" : "#121212"} stroke="#fff" strokeWidth="1.6" strokeLinejoin="round" />
      </svg>
      <span
        className={cn(
          "mt-4 -ml-1 rounded-pill border-2 border-white px-2.5 py-1 font-display text-[12px] font-bold whitespace-nowrap shadow-[0_6px_14px_-4px_rgb(18_18_18/0.35)]",
          tone === "coral" ? "bg-coral text-ink" : "bg-ink text-paper",
        )}
      >
        {label}
      </span>
    </span>
  );
}

/** Пунктирная траектория с точками на концах. d — путь в координатах viewBox */
export function DashPath({ d, viewBox, className, end = true }: { d: string; viewBox: string; className?: string; end?: boolean }) {
  const pts = d.match(/-?\d+(\.\d+)?/g)?.map(Number) ?? [];
  const [sx, sy] = [pts[0], pts[1]];
  const [ex, ey] = [pts[pts.length - 2], pts[pts.length - 1]];
  return (
    <svg aria-hidden="true" viewBox={viewBox} fill="none" preserveAspectRatio="none" className={cn("pointer-events-none overflow-visible", className)}>
      <path d={d} stroke="#121212" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="10 12" vectorEffect="non-scaling-stroke" className="anim-march" />
      <circle cx={sx} cy={sy} r="6" fill="#fff" stroke="#121212" strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
      {end && <circle cx={ex} cy={ey} r="6" fill="#FF4D2E" />}
    </svg>
  );
}

export function Chevrons({ className }: { className?: string }) {
  return (
    <span aria-hidden="true" className={cn("anim-chev inline-flex font-display font-black tracking-[-0.15em]", className)}>
      <span>›</span>
      <span>›</span>
      <span>›</span>
      <span>›</span>
    </span>
  );
}

/** Рамка выделения из редактора с маркерами по углам */
export function SelBox({ children, label }: { children: ReactNode; label?: string }) {
  const h = "absolute size-[9px] bg-white border-2 border-coral";
  return (
    <span className="selbox">
      {children}
      <span aria-hidden="true" className={cn(h, "-top-[0.12em] -left-[0.1em] -translate-x-1/2 -translate-y-1/2")} />
      <span aria-hidden="true" className={cn(h, "-top-[0.12em] -right-[0.1em] translate-x-1/2 -translate-y-1/2")} />
      <span aria-hidden="true" className={cn(h, "-bottom-[0.12em] -left-[0.1em] -translate-x-1/2 translate-y-1/2")} />
      <span aria-hidden="true" className={cn(h, "-right-[0.1em] -bottom-[0.12em] translate-x-1/2 translate-y-1/2")} />
      {label && (
        <span aria-hidden="true" className="absolute -bottom-[1.9em] left-0 rounded-[4px] bg-coral px-1.5 py-0.5 font-mono text-[11px] leading-none font-normal tracking-normal whitespace-nowrap text-ink">
          {label}
        </span>
      )}
    </span>
  );
}
