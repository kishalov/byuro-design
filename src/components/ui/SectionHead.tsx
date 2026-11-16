import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Eyebrow({ children, className, dark }: { children: ReactNode; className?: string; dark?: boolean }) {
  return (
    <p className={cn("t-label flex items-center gap-2.5", dark ? "text-paper/80" : "text-stone-ink", className)}>
      <span aria-hidden="true" className="size-2.5 shrink-0 rounded-full bg-coral" />
      {children}
    </p>
  );
}

export function SectionHead({ eyebrow, title, lead, id, dark, className }: { eyebrow: string; title: ReactNode; lead?: ReactNode; id?: string; dark?: boolean; className?: string }) {
  return (
    <div className={cn("max-w-[56rem]", className)} data-reveal>
      <Eyebrow dark={dark}>{eyebrow}</Eyebrow>
      <h2 id={id} className={cn("t-h1 mt-5", dark ? "text-paper" : "text-ink")}>
        {title}
      </h2>
      {lead && <p className={cn("t-lead mt-6 max-w-[40rem]", dark ? "text-paper/80" : "text-ink/80")}>{lead}</p>}
    </div>
  );
}
