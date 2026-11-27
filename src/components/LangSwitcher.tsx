"use client";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { LOCALE_COOKIE, locales, type Locale } from "@/i18n/config";
import { withLandingAdParams } from "@/lib/attribution";
import { cn } from "@/lib/cn";

/* Переключатель языка. Сохраняет выбор (cookie для сервера + localStorage
   для статического превью) — дальше автоопределение его не перебивает. */
export function remember(code: Locale) {
  document.cookie = `${LOCALE_COOKIE}=${code}; path=/; max-age=31536000; samesite=lax`;
  try {
    localStorage.setItem("byuro-locale", code);
  } catch {}
}

export function switchHref(pathname: string | null, code: Locale) {
  const rest = (pathname ?? "/").replace(/^\/[^/]+/, "") || "/";
  return `/${code}${rest}`;
}

export function LangSwitcher({ locale, label }: { locale: Locale; label: string }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const ref = useRef<HTMLDivElement>(null);
  const id = useId();
  const current = locales.find((l) => l.code === locale)!;

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        ref.current?.querySelector("button")?.focus();
      }
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        aria-label={`${label}: ${current.label}`}
        onClick={() => setOpen((v) => !v)}
        className="flex min-h-11 items-center gap-1.5 rounded-pill border-2 border-ink/15 px-3.5 font-display text-[13px] font-bold transition-colors hover:border-ink"
      >
        <span aria-hidden="true" className="size-2 rounded-full bg-coral" />
        {current.short}
        <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className={cn("transition-transform", open && "rotate-180")}>
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      <ul
        id={id}
        hidden={!open}
        className="absolute top-[calc(100%+8px)] right-0 z-10 w-56 rounded-2xl border-2 border-ink bg-white p-1.5 shadow-[6px_6px_0_var(--color-ink)]"
      >
        {locales.map((l) => (
          <li key={l.code}>
            <a
              href={switchHref(pathname, l.code)}
              hrefLang={l.hreflang}
              lang={l.htmlLang}
              aria-current={l.code === locale ? "true" : undefined}
              onClick={(e) => {
                remember(l.code);
                e.currentTarget.href = withLandingAdParams(switchHref(pathname, l.code)); // рекламные метки не теряются
              }}
              className={cn(
                "flex min-h-11 items-center justify-between rounded-xl px-3 text-[15px] font-medium hover:bg-sand",
                l.code === locale && "bg-ink text-paper hover:bg-ink",
              )}
            >
              {l.label}
              <span className="t-mono opacity-70">{l.short}</span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function LangGrid({ locale, label }: { locale: Locale; label: string }) {
  const pathname = usePathname();
  return (
    <nav aria-label={label}>
      <p className="t-label mb-3 text-stone-ink">{label}</p>
      <ul className="grid grid-cols-3 gap-2">
        {locales.map((l) => (
          <li key={l.code}>
            <a
              href={switchHref(pathname, l.code)}
              hrefLang={l.hreflang}
              lang={l.htmlLang}
              aria-current={l.code === locale ? "true" : undefined}
              onClick={(e) => {
                remember(l.code);
                e.currentTarget.href = withLandingAdParams(switchHref(pathname, l.code)); // рекламные метки не теряются
              }}
              className={cn(
                "flex min-h-11 items-center justify-center rounded-pill border-2 px-2 text-[14px] font-semibold",
                l.code === locale ? "border-ink bg-ink text-paper" : "border-ink/15",
              )}
            >
              {l.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
