"use client";
import { useEffect, useRef } from "react";

/* Попапы главной открываются ссылками с якорем — из меню, из других попапов,
   со страниц кейсов и из рекламы:
     #lead          — форма заявки (проект)
     #lead-partner  — форма заявки (партнёрство)
     #partners      — партнёрская программа
   AnchorScroll перехватывает клики по таким ссылкам и вызывает openDialog(). */
export const dialogHashes = ["lead", "lead-partner", "partners"] as const;
export type DialogHash = (typeof dialogHashes)[number];
const EVENT = "byuro:dialog";

export const isDialogHash = (h: string): h is DialogHash => (dialogHashes as readonly string[]).includes(h);

export function openDialog(name: DialogHash) {
  window.dispatchEvent(new CustomEvent<DialogHash>(EVENT, { detail: name }));
}

/** Убираем якорь попапа из адреса после закрытия — повторный клик снова откроет попап */
export function clearDialogHash() {
  if (isDialogHash(window.location.hash.slice(1))) history.replaceState(history.state, "", window.location.pathname + window.location.search);
}

/** Слушает открытие попапов: событие, смену якоря и якорь при загрузке страницы */
export function useDialogRequests(handler: (name: DialogHash) => void) {
  const ref = useRef(handler);
  useEffect(() => {
    ref.current = handler;
  });
  useEffect(() => {
    const fromHash = () => {
      const h = decodeURIComponent(window.location.hash.slice(1));
      if (isDialogHash(h)) ref.current(h);
    };
    const onEvent = (e: Event) => ref.current((e as CustomEvent<DialogHash>).detail);
    const t = window.setTimeout(fromHash, 0);
    window.addEventListener(EVENT, onEvent);
    window.addEventListener("hashchange", fromHash);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener(EVENT, onEvent);
      window.removeEventListener("hashchange", fromHash);
    };
  }, []);
}
