"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { site } from "@/content/site";
import type { Locale } from "@/i18n/config";
import { anchors, lp } from "@/i18n/paths";
import { cn } from "@/lib/cn";
import { Icon } from "./ui/Icon";

/* Быстрый доступ на телефоне: «Рассчитать стоимость» + Telegram.
   Появляется, когда кнопки первого экрана ушли из вида, и прячется у калькулятора (там своя панель итога). */
export function MobileCtaBar({ locale, project, partner }: { locale: Locale; project: string; partner: string }) {
  const [show, setShow] = useState(false);
  const pathname = usePathname();
  useEffect(() => {
    const ctas = document.getElementById("hero-ctas");
    // тот же порог, что у панели итога калькулятора: одна панель сменяет другую
    const calc = document.getElementById("calc-root");
    let ctaOut = !ctas;
    let calcIn = false;
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.target === ctas) ctaOut = !e.isIntersecting && e.boundingClientRect.top < 0;
      setShow(ctaOut && !calcIn);
    });
    const ioCalc = new IntersectionObserver(
      ([e]) => {
        calcIn = e.isIntersecting;
        setShow(ctaOut && !calcIn);
      },
      { rootMargin: "0px 0px -35% 0px" },
    );
    if (ctas) io.observe(ctas);
    if (calc) ioCalc.observe(calc); // начальное состояние приходит первым вызовом наблюдателей
    return () => {
      io.disconnect();
      ioCalc.disconnect();
    };
  }, [pathname]);

  return (
    <div
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(12px,env(safe-area-inset-bottom))] transition-transform duration-300 ease-out-soft md:hidden",
        show ? "translate-y-0" : "pointer-events-none translate-y-[130%]",
      )}
      aria-hidden={!show}
    >
      <div className="flex gap-2 rounded-pill bg-ink p-1.5 shadow-[0_10px_30px_rgb(18_18_18/0.25)]">
        <Link href={lp(locale, anchors.project)} tabIndex={show ? 0 : -1} className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-pill bg-coral px-4 text-center leading-tight font-semibold text-ink">
          {project}
        </Link>
        {site.contacts.telegram && (
          <a href={site.contacts.telegram.url} target="_blank" rel="noopener" tabIndex={show ? 0 : -1} aria-label={`Telegram ${site.contacts.telegram.handle}`} className="flex min-h-12 items-center justify-center gap-2 rounded-pill px-4 font-semibold text-paper">
            <Icon name="telegram" size={20} />
            {partner}
          </a>
        )}
      </div>
    </div>
  );
}
