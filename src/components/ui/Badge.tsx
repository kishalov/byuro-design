import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Badge({ children, tone = "line", className }: { children: ReactNode; tone?: "line" | "sand" | "ink" | "demo" | "demo-dark"; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-pill px-3 py-1.5 font-mono text-[12px] leading-none whitespace-nowrap",
        tone === "line" && "border border-ink/25 text-ink",
        tone === "sand" && "bg-sand text-ink",
        tone === "ink" && "bg-ink text-paper",
        tone === "demo" && "border border-dashed border-stone-ink text-stone-ink",
        tone === "demo-dark" && "border border-dashed border-paper/50 text-paper/75",
        className,
      )}
    >
      {children}
    </span>
  );
}
