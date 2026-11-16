"use client";
import { useId, useRef, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "@/lib/cn";

/* Доступные вкладки (WAI-ARIA Tabs): стрелки, Home/End, roving tabindex. */
export function TabList<T extends string>({
  items,
  value,
  onChange,
  label,
  idBase,
  dark,
  size = "md",
  className,
}: {
  items: { value: T; label: ReactNode }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
  idBase: string;
  dark?: boolean;
  size?: "md" | "lg";
  className?: string;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const onKey = (e: KeyboardEvent, i: number) => {
    const last = items.length - 1;
    let n = -1;
    if (e.key === "ArrowRight") n = i === last ? 0 : i + 1;
    if (e.key === "ArrowLeft") n = i === 0 ? last : i - 1;
    if (e.key === "Home") n = 0;
    if (e.key === "End") n = last;
    if (n < 0) return;
    e.preventDefault();
    onChange(items[n].value);
    refs.current[n]?.focus();
  };
  return (
    <div
      role="tablist"
      aria-label={label}
      className={cn(
        "inline-flex max-w-full gap-1 rounded-pill p-1.5",
        dark ? "bg-graphite" : "bg-sand",
        className,
      )}
    >
      {items.map((it, i) => {
        const selected = it.value === value;
        return (
          <button
            key={it.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            role="tab"
            type="button"
            id={`${idBase}-tab-${it.value}`}
            aria-selected={selected}
            aria-controls={`${idBase}-panel-${it.value}`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(it.value)}
            onKeyDown={(e) => onKey(e, i)}
            className={cn(
              "flex min-h-11 items-center justify-center gap-2 rounded-pill px-4 text-center leading-tight font-semibold transition-colors sm:px-5 sm:whitespace-nowrap",
              size === "lg" ? "min-h-12 text-base sm:min-h-14 sm:px-7 sm:text-lg" : "text-[15px]",
              selected
                ? dark
                  ? "bg-paper text-ink"
                  : "bg-ink text-paper"
                : dark
                  ? "text-paper/80 hover:text-paper"
                  : "text-ink/75 hover:text-ink",
            )}
          >
            {selected && <span aria-hidden="true" className="size-2 rounded-full bg-coral" />}
            {it.label}
          </button>
        );
      })}
    </div>
  );
}

export function useTabsId() {
  return useId().replace(/:/g, "");
}
