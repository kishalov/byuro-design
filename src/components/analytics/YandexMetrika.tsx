"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { Dict } from "@/i18n/dictionaries/ru";
import { initMetrika, onConsent, onConsentOpen, readConsent, saveConsent, trackHit, type Consent } from "@/lib/analytics";

/* Яндекс Метрика + согласие на аналитику (подключается один раз в layout, работает на всех страницах и языках).
   Порядок: нет выбора → баннер; «Принять» → загрузка счётчика и первый просмотр;
   дальше — просмотр на каждую смену адреса (SPA-переходы Next.js). «Отклонить» → счётчик не грузится.
   Если согласие отозвали через «Настройки cookie», страница перезагружается без Метрики. */
export function YandexMetrika({ t, privacyHref }: { t: Dict["consent"]; privacyHref: string }) {
  const pathname = usePathname();
  const [consent, setConsent] = useState<Consent | null | undefined>(undefined); // undefined — ещё не прочитали
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const c = readConsent();
    setConsent(c);
    setOpen(c === null);
    const offOpen = onConsentOpen(() => setOpen(true));
    const off = onConsent((v) => setConsent(v));
    return () => {
      offOpen();
      off();
    };
  }, []);

  // Загрузка счётчика после согласия + просмотр текущей страницы и каждой следующей
  useEffect(() => {
    if (consent !== "granted") return;
    initMetrika();
    // заголовок страницы Next.js обновляет чуть позже смены адреса
    const id = window.setTimeout(() => trackHit(window.location.href.split("#")[0]), 50);
    return () => window.clearTimeout(id);
  }, [consent, pathname]);

  const choose = (v: Consent) => {
    const wasGranted = readConsent() === "granted" && window.__byuroMetrika?.inited;
    saveConsent(v);
    setOpen(false);
    if (v === "denied" && wasGranted) window.location.reload(); // выгрузить уже работающий счётчик
  };

  if (!open) return null;
  return (
    <div role="dialog" aria-modal="false" aria-labelledby="consent-text" className="fixed inset-x-3 bottom-3 z-[60] sm:right-auto sm:bottom-5 sm:left-5 sm:max-w-[26rem]">
      <div className="rounded-[22px] bg-ink p-4 text-paper shadow-[0_18px_40px_-14px_rgb(18_18_18/0.5)] sm:p-5">
        <p id="consent-text" className="text-[14px] leading-snug text-paper/85">
          {t.text}{" "}
          <Link href={privacyHref} className="underline decoration-paper/40 underline-offset-4 hover:text-paper">
            {t.policy}
          </Link>
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button type="button" onClick={() => choose("denied")} className="min-h-11 rounded-pill border-2 border-paper/30 px-4 text-[14px] font-semibold transition-colors hover:border-paper">
            {t.decline}
          </button>
          <button type="button" onClick={() => choose("granted")} className="min-h-11 rounded-pill border-2 border-paper bg-paper px-4 text-[14px] font-semibold text-ink transition-colors hover:border-coral hover:bg-coral">
            {t.accept}
          </button>
        </div>
      </div>
    </div>
  );
}
