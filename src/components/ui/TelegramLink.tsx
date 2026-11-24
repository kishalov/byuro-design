import { site } from "@/content/site";
import { cn } from "@/lib/cn";
import { Icon } from "./Icon";

/* Ссылка на Telegram студии (@byuro_design). Адрес — в src/content/site.ts.
   card   — крупная коралловая плашка, главный способ связи рядом с формой;
   inline — строка с иконкой под кнопкой отправки и в сообщениях;
   pill   — кнопка-капсула на тёмном фоне (CTA на страницах кейсов);
   icon   — круглая кнопка-иконка в шапке. */
export function TelegramLink({
  variant = "inline",
  label,
  className,
}: {
  variant?: "card" | "inline" | "pill" | "outline" | "icon";
  label?: string;
  className?: string;
}) {
  const tg = site.contacts.telegram;
  if (!tg) return null;
  const common = { href: tg.url, target: "_blank", rel: "noopener" } as const;

  if (variant === "card")
    return (
      <a
        {...common}
        className={cn(
          "group flex items-center gap-4 rounded-[22px] bg-coral p-4 pr-5 text-ink shadow-[0_18px_36px_-22px_rgb(255_77_46/0.9)] transition-transform duration-300 ease-spring hover:-translate-y-0.5 motion-reduce:transition-none",
          className,
        )}
      >
        <span className="grid size-12 shrink-0 place-items-center rounded-full bg-ink text-coral">
          <Icon name="telegram" size={24} />
        </span>
        <span className="min-w-0 flex-1">
          {label && <span className="block text-[15px] leading-tight font-medium">{label}</span>}
          <span className="block font-display text-xl leading-tight font-bold [overflow-wrap:anywhere]">{tg.handle}</span>
        </span>
        <Icon name="arrow-up-right" size={22} className="shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
      </a>
    );

  if (variant === "pill")
    return (
      <a
        {...common}
        aria-label={`Telegram ${tg.handle}`}
        className={cn(
          "inline-flex min-h-12 items-center justify-center gap-2.5 rounded-pill border-2 border-paper/35 bg-ink px-5 sm:px-6 font-display text-[15px] font-bold whitespace-nowrap text-paper transition-colors hover:border-coral hover:text-coral",
          className,
        )}
      >
        <Icon name="telegram" size={20} />
        {label && <span className="hidden sm:inline">{label} ·</span>}
        <span>{tg.handle}</span>
      </a>
    );

  if (variant === "outline")
    return (
      <a
        {...common}
        className={cn(
          "inline-flex min-h-[52px] items-center justify-center gap-2.5 rounded-pill border-2 border-ink bg-white/60 px-6 font-semibold text-ink transition-colors hover:bg-ink hover:text-paper",
          className,
        )}
      >
        <Icon name="telegram" size={20} />
        {label ?? `Telegram ${tg.handle}`}
      </a>
    );

  if (variant === "icon")
    return (
      <a
        {...common}
        aria-label={`Telegram ${tg.handle}`}
        title={`Telegram ${tg.handle}`}
        className={cn(
          "grid size-11 place-items-center rounded-full border-2 border-ink/15 bg-white text-ink transition-colors hover:border-coral hover:bg-coral",
          className,
        )}
      >
        <Icon name="telegram" size={20} />
      </a>
    );

  return (
    <a {...common} className={cn("group inline-flex items-start gap-3 font-semibold", className)}>
      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-coral text-ink">
        <Icon name="telegram" size={17} />
      </span>
      <span className="pt-1">
        {label && <span className="font-normal">{label} </span>}
        <span className="whitespace-nowrap underline decoration-coral decoration-2 underline-offset-4 group-hover:text-coral">{tg.handle}</span>
      </span>
    </a>
  );
}
