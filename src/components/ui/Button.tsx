import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Icon, type IconName } from "./Icon";

type Variant = "coral" | "ink" | "outline" | "outline-light" | "paper";

const variants: Record<Variant, string> = {
  // Чёрный текст на коралле — 5.7:1 (AA), белый на коралле брендбук допускает только крупно
  coral: "bg-coral text-ink hover:bg-ink hover:text-paper",
  ink: "bg-ink text-paper hover:bg-coral hover:text-ink",
  paper: "bg-paper text-ink hover:bg-coral",
  outline: "border-2 border-ink text-ink hover:bg-ink hover:text-paper",
  "outline-light": "border-2 border-paper/70 text-paper hover:bg-paper hover:text-ink hover:border-paper",
};

const base =
  "group/btn inline-flex min-h-[52px] items-center justify-center gap-3 rounded-pill px-6 py-3 text-base font-semibold leading-tight transition-colors duration-200 select-none disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-14 sm:px-7";

type Common = { variant?: Variant; icon?: IconName | null; children: ReactNode; className?: string };

function Inner({ icon, children }: { icon?: IconName | null; children: ReactNode }) {
  return (
    <>
      <span>{children}</span>
      {icon !== null && (
        <Icon
          name={icon ?? "arrow-right"}
          size={20}
          className="shrink-0 transition-transform duration-300 ease-out-soft group-hover/btn:translate-x-1 motion-reduce:transition-none"
        />
      )}
    </>
  );
}

export function ButtonLink({ variant = "coral", icon, children, className, ...rest }: Common & ComponentProps<typeof Link>) {
  return (
    <Link className={cn(base, variants[variant], className)} {...rest}>
      <Inner icon={icon}>{children}</Inner>
    </Link>
  );
}

export function Button({ variant = "coral", icon, children, className, ...rest }: Common & ComponentProps<"button">) {
  return (
    <button className={cn(base, variants[variant], className)} {...rest}>
      <Inner icon={icon}>{children}</Inner>
    </button>
  );
}
