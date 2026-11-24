"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { clearDialogHash, useDialogRequests } from "@/lib/dialogs";
import { Icon } from "../ui/Icon";

/* Попап «Партнёрам»: внутри — прежний раздел партнёрской программы целиком (children, рендерится на сервере).
   Открывается пунктом меню «Партнёрам» (ссылка #partners). Кнопки «Стать партнёром» внутри
   ведут на #lead-partner — этот попап закрывается и открывается форма заявки на вкладке «Партнёрство». */
export function PartnersDialog({ label, close: closeLabel, children }: { label: string; close: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);

  useDialogRequests((name) => setOpen(name === "partners"));

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      d.showModal();
      d.scrollTop = 0;
      document.documentElement.style.overflow = "hidden";
      // анимации появления внутри попапа не ждём
      d.querySelectorAll<HTMLElement>("[data-reveal]").forEach((el) => el.classList.add("is-in"));
    }
    if (!open && d.open) d.close();
    return () => {
      document.documentElement.style.overflow = "";
    };
  }, [open]);

  const close = () => {
    setOpen(false);
    clearDialogHash();
  };

  return (
    <dialog
      ref={ref}
      onClose={close}
      onClick={(e) => e.target === e.currentTarget && close()}
      aria-label={label}
      className="m-0 h-full max-h-none w-full max-w-none overflow-y-auto overscroll-contain bg-ink p-0 text-paper backdrop:bg-ink/70 backdrop:backdrop-blur-[2px] sm:m-auto sm:h-[min(94vh,100%)] sm:w-[min(1280px,calc(100vw-32px))] sm:rounded-card"
    >
      {/* кнопка «закрыть» прилипает к верху попапа и не сдвигает содержимое */}
      <div className="sticky top-0 z-30 flex h-0 justify-end">
        <button
          type="button"
          onClick={close}
          aria-label={closeLabel}
          className="mt-3 mr-3 grid size-12 shrink-0 place-items-center rounded-full bg-paper text-ink shadow-[0_10px_30px_-10px_rgb(0_0_0/0.6)] transition-colors hover:bg-coral sm:mt-5 sm:mr-5"
        >
          <Icon name="close" size={24} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
