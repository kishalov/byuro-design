"use client";
import { openConsent } from "@/lib/analytics";

/** «Настройки cookie» в подвале — снова показывает баннер согласия на аналитику */
export function CookieSettingsButton({ label }: { label: string }) {
  return (
    <button type="button" onClick={openConsent} className="text-left hover:text-paper">
      {label}
    </button>
  );
}
