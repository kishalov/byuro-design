"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Locale } from "@/i18n/config";
import { getAttribution } from "@/lib/attribution";

/* Защита формы со стороны браузера:
   — время заполнения: от первого касания/ввода в форме до отправки (люди не заполняют за 1–2 секунды);
   — Cloudflare Turnstile в режиме «только при необходимости»: обычно невидим и ничего не просит,
     окно проверки появляется лишь для подозрительных посетителей. Скрипт Cloudflare грузится
     после первого касания формы; если он не загрузился (сеть, блокировка), форма всё равно
     отправляется — сервер учтёт это в проверке;
   — UTM и источник визита для диагностики.
   Токен Turnstile проверяется только на сервере. */

type TurnstileApi = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  reset: (id: string) => void;
  remove: (id: string) => void;
  getResponse: (id: string) => string | undefined;
};
declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let keyPromise: Promise<string | null> | null = null;
const siteKey = () =>
  (keyPromise ??= fetch("/api/lead/", { cache: "no-store" })
    .then((r) => (r.ok ? r.json() : null))
    .then((d: { turnstileSiteKey?: string | null } | null) => d?.turnstileSiteKey ?? null)
    .catch(() => null));

let scriptPromise: Promise<boolean> | null = null;
const loadScript = () =>
  (scriptPromise ??= new Promise<boolean>((resolve) => {
    if (window.turnstile) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    s.async = true;
    s.defer = true;
    s.onload = () => resolve(Boolean(window.turnstile));
    s.onerror = () => {
      scriptPromise = null; // при следующем касании попробуем ещё раз
      resolve(false);
    };
    document.head.appendChild(s);
    setTimeout(() => resolve(Boolean(window.turnstile)), 8000);
  }));

export type FormMeta = { elapsedMs: number | null; interacted: boolean; turnstile: string | null; turnstileError: string | null; attribution: ReturnType<typeof getAttribution> };

export function useFormGuard(action: "lead" | "brief", locale: Locale) {
  const box = useRef<HTMLDivElement>(null);
  const started = useRef<number | null>(null);
  const widget = useRef<string | null>(null);
  const token = useRef<string | null>(null);
  const error = useRef<string | null>(null);
  const [visible, setVisible] = useState(false); // Cloudflare попросил посетителя подтвердить (галочка)

  const start = useCallback(async () => {
    if (started.current === null) started.current = performance.now();
    if (widget.current || !box.current) return;
    const key = await siteKey();
    if (!key) return;
    const ok = await loadScript();
    if (!ok || !window.turnstile || !box.current || widget.current) {
      if (!ok) error.current = "script_load_failed";
      return;
    }
    try {
      widget.current = window.turnstile.render(box.current, {
        sitekey: key,
        action,
        appearance: "interaction-only",
        theme: "light",
        size: "flexible",
        language: locale === "zh-cn" ? "zh-cn" : locale,
        "refresh-expired": "auto",
        "response-field": false,
        callback: (t: string) => {
          token.current = t;
          error.current = null;
        },
        "expired-callback": () => (token.current = null),
        "before-interactive-callback": () => setVisible(true),
        "after-interactive-callback": () => setVisible(false),
        "error-callback": (code: string) => {
          error.current = `widget_${code}`;
          return true; // повтор Turnstile делает сам
        },
      });
    } catch {
      error.current = "render_failed";
    }
  }, [action, locale]);

  useEffect(
    () => () => {
      if (widget.current) window.turnstile?.remove(widget.current);
    },
    [],
  );

  /** Метаданные для отправки. Если Turnstile запущен, но токена ещё нет — ждём до 5 секунд. */
  const meta = useCallback(async (): Promise<FormMeta> => {
    await start();
    if (widget.current && !token.current) {
      const until = performance.now() + 5000;
      while (!token.current && performance.now() < until) await new Promise((r) => setTimeout(r, 150));
      if (!token.current && !error.current) error.current = "timeout";
    }
    return {
      elapsedMs: started.current === null ? null : Math.round(performance.now() - started.current),
      interacted: started.current !== null,
      turnstile: token.current,
      turnstileError: token.current ? null : error.current,
      attribution: getAttribution(),
    };
  }, [start]);

  /** После отправки токен одноразовый — запросить новый для следующей заявки */
  const reset = useCallback(() => {
    token.current = null;
    started.current = null;
    if (widget.current) window.turnstile?.reset(widget.current);
  }, []);

  return {
    /** повесить на <form>: onFocusCapture / onInputCapture / onPointerDownCapture */
    formProps: { onFocusCapture: () => void start(), onPointerDownCapture: () => void start() },
    /** контейнер виджета: нулевой высоты, пока Cloudflare не попросит подтвердить */
    box,
    /** класс контейнера: отступ появляется, только когда виджет действительно виден */
    boxClass: visible ? "mt-6" : "h-0 overflow-hidden",
    meta,
    reset,
  };
}
