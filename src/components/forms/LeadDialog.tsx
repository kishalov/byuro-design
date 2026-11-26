"use client";
import { useEffect, useId, useRef, useState } from "react";
import type { Locale } from "@/i18n/config";
import type { Dict } from "@/i18n/dictionaries/ru";
import { cn } from "@/lib/cn";
import { clearDialogHash, useDialogRequests } from "@/lib/dialogs";
import type { LeadType } from "@/lib/lead";
import { Button } from "../ui/Button";
import { Icon } from "../ui/Icon";
import { TabList } from "../ui/Tabs";
import { LeadForm, type FormDict } from "./LeadForm";

/* Кнопка «Оставить заявку» + попап с прежней формой заявки (проект / партнёрство).
   Отправка — та же: /api/lead → Telegram (TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID). */
export function LeadDialog({
  locale,
  label,
  close: closeLabel,
  contact,
  form,
  className,
}: {
  locale: Locale;
  label: string;
  close: string;
  contact: Dict["contact"];
  form: FormDict;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<LeadType>("project");
  const id = useId().replace(/:/g, "");
  const c = contact[type];

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      d.showModal();
      document.documentElement.style.overflow = "hidden";
    }
    if (!open && d.open) d.close();
    return () => {
      document.documentElement.style.overflow = "";
    };
  }, [open]);

  // открыть попап можно ссылкой: #lead — проект, #lead-partner — партнёрство (из меню, попапа партнёрки, рекламы)
  useDialogRequests((name) => {
    if (name === "lead" || name === "lead-partner") {
      setType(name === "lead" ? "project" : "partner");
      setOpen(true);
    } else setOpen(false);
  });
  const close = () => {
    setOpen(false);
    clearDialogHash();
  };

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)} aria-haspopup="dialog" className={cn("cta-main", className)}>
        {label}
      </Button>

      <dialog
        ref={ref}
        onClose={close}
        onClick={(e) => e.target === e.currentTarget && close()}
        aria-labelledby={`${id}-title`}
        className="m-0 h-full max-h-none w-full max-w-none bg-paper p-0 text-ink backdrop:bg-ink/60 backdrop:backdrop-blur-[2px] sm:m-auto sm:h-auto sm:max-h-[92vh] sm:w-[min(720px,calc(100vw-32px))] sm:rounded-card"
      >
        {open && (
          <div className="flex h-full flex-col">
            <div className="flex items-start justify-between gap-4 border-b border-ink/10 px-5 pt-5 pb-4 sm:px-8 sm:pt-7">
              <div className="min-w-0">
                <h2 id={`${id}-title`} className="t-h3">
                  {c.title}
                  <span aria-hidden="true" className="ml-[0.06em] inline-block size-[0.22em] rounded-full bg-coral" />
                </h2>
                <p className="mt-1.5 text-[15px] text-ink/75">{c.lead}</p>
              </div>
              <button type="button" onClick={close} aria-label={closeLabel} className="grid size-11 shrink-0 place-items-center rounded-full transition-colors hover:bg-sand">
                <Icon name="close" size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 pt-5 pb-8 sm:px-8 sm:pb-10">
              <TabList
                idBase={id}
                label={contact.tabsLabel}
                value={type}
                onChange={setType}
                items={[
                  { value: "project", label: <><span className="sm:hidden">{contact.projectTabShort}</span><span className="hidden sm:inline">{contact.projectTab}</span></> },
                  { value: "partner", label: <><span className="sm:hidden">{contact.partnerTabShort}</span><span className="hidden sm:inline">{contact.partnerTab}</span></> },
                ]}
                className="w-full sm:w-auto [&>button]:flex-1 [&>button]:justify-center sm:[&>button]:flex-none"
              />
              <div role="tabpanel" id={`${id}-panel-${type}`} aria-labelledby={`${id}-tab-${type}`} className="mt-6">
                <LeadForm key={type} type={type} locale={locale} t={form} />
              </div>
            </div>
          </div>
        )}
      </dialog>
    </>
  );
}
