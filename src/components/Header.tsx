"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { site } from "@/content/site";
import { TelegramLink } from "./ui/TelegramLink";
import type { Locale } from "@/i18n/config";
import type { Dict } from "@/i18n/dictionaries/ru";
import { anchors, lp } from "@/i18n/paths";
import { cn } from "@/lib/cn";
import { LangGrid, LangSwitcher } from "./LangSwitcher";
import { ButtonLink } from "./ui/Button";
import { Icon } from "./ui/Icon";
import { Logo } from "./ui/Logo";

export function Header({ locale, nav, cta }: { locale: Locale; nav: Dict["nav"]; cta: Dict["cta"] }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const items = [
    // Лендинг из трёх экранов: в меню только кейсы и калькулятор.
    // Прежние разделы (услуги, партнёрам, как работаем, вопросы) отключены вместе с секциями:
    // { href: lp(locale, anchors.services), label: nav.services },
    // { href: lp(locale, anchors.partners), label: nav.partners },
    // { href: lp(locale, anchors.process), label: nav.process },
    // { href: lp(locale, anchors.faq), label: nav.faq },
    { href: lp(locale, anchors.cases), label: nav.cases },
    { href: lp(locale, anchors.calculator), label: nav.calc },
  ];

  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setScrolled(window.scrollY > 8));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  const close = useCallback((restoreFocus = true) => {
    setOpen(false);
    if (restoreFocus) btnRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    const root = document.documentElement;
    root.style.overflow = "hidden";
    const main = document.getElementById("main");
    const footer = document.querySelector("footer");
    main?.setAttribute("inert", "");
    footer?.setAttribute("inert", "");
    panelRef.current?.querySelector<HTMLElement>("a,button")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key !== "Tab" || !panelRef.current) return;
      const f = Array.from(panelRef.current.querySelectorAll<HTMLElement>("a,button"));
      const all = [btnRef.current!, ...f];
      const i = all.indexOf(document.activeElement as HTMLElement);
      if (e.shiftKey && i <= 0) {
        e.preventDefault();
        all[all.length - 1].focus();
      } else if (!e.shiftKey && i === all.length - 1) {
        e.preventDefault();
        all[0].focus();
      }
    };
    const onResize = () => window.innerWidth >= 1024 && setOpen(false);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    return () => {
      root.style.overflow = "";
      main?.removeAttribute("inert");
      footer?.removeAttribute("inert");
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
    };
  }, [open, close]);

  return (
    <header className="sticky top-0 z-50">
      {/* Фон отдельным слоем: backdrop-filter на самом header обрезал бы fixed-меню */}
      <div
        aria-hidden="true"
        className={cn(
          "absolute inset-0 transition-[background-color,box-shadow] duration-300",
          scrolled || open ? "bg-paper/92 shadow-[0_1px_0_rgb(18_18_18/0.1)] backdrop-blur-md" : "bg-paper/0",
        )}
      />
      <div className="wrap relative flex h-[var(--header-h)] items-center justify-between gap-4">
        <Link href={lp(locale)} className="-m-2 shrink-0 rounded-lg p-2" title={nav.home} onClick={() => open && close(false)}>
          <Logo className="text-[22px] sm:text-[24px]" label={locale === "ru" ? "Бюро" : "Byuro"} />
        </Link>

        <nav aria-label={nav.main} className="hidden xl:block">
          <ul className="flex items-center gap-1">
            {items.map((n) => (
              <li key={n.href}>
                <Link href={n.href} className="rounded-pill px-3.5 py-2.5 text-[15px] font-medium whitespace-nowrap text-ink/80 transition-colors hover:bg-sand hover:text-ink">
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          <div className="hidden sm:block">
            <LangSwitcher locale={locale} label={nav.language} />
          </div>
          <TelegramLink variant="icon" className="hidden md:grid" />
          <span className="hidden md:block">
            <ButtonLink href={lp(locale, anchors.calculator)} className="cta-main !min-h-11 !px-5 text-[15px] whitespace-nowrap">
              {cta.calc}
            </ButtonLink>
          </span>
          <button
            ref={btnRef}
            type="button"
            className="relative grid size-12 place-items-center rounded-full transition-colors hover:bg-sand xl:hidden"
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? nav.closeMenu : nav.openMenu}
            onClick={() => setOpen((v) => !v)}
          >
            <Icon name={open ? "close" : "menu"} size={26} />
          </button>
        </div>
      </div>

      <div id="mobile-menu" ref={panelRef} hidden={!open} className="grain fixed inset-x-0 top-[var(--header-h)] bottom-0 overflow-y-auto bg-paper xl:hidden">
        <div className="wrap flex min-h-full flex-col pt-6 pb-[max(24px,env(safe-area-inset-bottom))]">
          <nav aria-label={nav.mobile}>
            <ul className="border-t border-ink/15">
              {items.map((n, i) => (
                <li key={n.href} className="border-b border-ink/15">
                  <Link href={n.href} onClick={() => close(false)} className="flex items-center justify-between gap-4 py-4 font-display text-[clamp(1.4rem,6.5vw,2.25rem)] font-bold">
                    {n.label}
                    <span className="t-mono text-stone-ink">0{i + 1}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="mt-8 grid gap-3">
            <ButtonLink href={lp(locale, anchors.calculator)} onClick={() => close(false)} className="w-full justify-between">
              {cta.calc}
            </ButtonLink>
            {/* <ButtonLink href={lp(locale, anchors.partner)} variant="outline" …>{cta.partner}</ButtonLink> — партнёрская форма отключена */}
          </div>
          <div className="mt-10">
            <LangGrid locale={locale} label={nav.language} />
          </div>
          <div className="mt-auto flex flex-col items-start gap-4 pt-10">
            <TelegramLink variant="card" className="w-full" />
            <a href={site.contacts.instagram.url} className="t-small inline-flex items-center gap-2 font-medium" rel="noopener" target="_blank">
              Instagram {site.contacts.instagram.handle}
              <Icon name="arrow-up-right" size={18} />
            </a>
          </div>
        </div>
      </div>
    </header>
  );
}
