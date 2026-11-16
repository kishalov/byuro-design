"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { Locale } from "@/i18n/config";
import { anchors, lp } from "@/i18n/paths";
import { cn } from "@/lib/cn";

/* Быстрый доступ к заявке на телефоне: появляется, когда CTA первого экрана
   ушли из вида, и прячется у формы. */
export function MobileCtaBar({ locale, project, partner }: { locale: Locale; project: string; partner: string }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const ctas = document.getElementById("hero-ctas");
    const contact = document.getElementById("contact");
    let ctaOut = !ctas;
    let contactIn = false;
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.target === ctas) ctaOut = !e.isIntersecting && e.boundingClientRect.top < 0;
        if (e.target === contact) contactIn = e.isIntersecting;
      }
      setShow(ctaOut && !contactIn);
    });
    if (ctas) io.observe(ctas);
    if (contact) io.observe(contact);
    setShow(ctaOut && !contactIn);
    return () => io.disconnect();
  }, []);

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
        <Link href={lp(locale, anchors.partner)} tabIndex={show ? 0 : -1} className="flex min-h-12 items-center justify-center rounded-pill px-4 text-center leading-tight font-semibold text-paper">
          {partner}
        </Link>
      </div>
    </div>
  );
}
