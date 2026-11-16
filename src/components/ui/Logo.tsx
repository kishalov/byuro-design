import { cn } from "@/lib/cn";

/* ВРЕМЕННЫЙ логотип. Брендбук запрещает набирать логотип шрифтом —
   замените содержимое на мастер-SVG из Figma (БЮР + точка вместо «О»),
   сохранив пропсы. Точка = высота прописной, всегда коралловая. */
export function Logo({ className, inverse = false, label = "Бюро" }: { className?: string; inverse?: boolean; label?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-baseline font-display font-black leading-none tracking-[-0.02em]",
        inverse ? "text-paper" : "text-ink",
        className,
      )}
      aria-label={label}
      role="img"
    >
      <span aria-hidden="true">БЮР</span>
      <span
        aria-hidden="true"
        className="ml-[0.06em] inline-block size-[0.72em] translate-y-[0.005em] rounded-full bg-coral"
      />
    </span>
  );
}
