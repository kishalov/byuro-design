"use client";
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export type PickerOption = {
  value: string;
  label: string;
  /** справа, моноширинным: «+7», «@» */
  hint?: string;
  /** слева: флаг, значок */
  leading?: ReactNode;
  /** дополнительные слова для поиска (код страны, англ. название) */
  keywords?: string;
};

/* Выпадающий список для полей формы (страна телефона, мессенджер).
   Кнопка → список (с поиском, если searchable). Клавиатура: ↑↓, Home/End, Enter, Esc, ввод букв.
   На телефоне открывается снизу экрана, на компьютере — под полем.
   Работает внутри <dialog>: Esc закрывает только список, а не всё окно. */
export function Picker({
  label,
  value,
  options,
  groups,
  searchable,
  searchPlaceholder,
  notFound,
  onChange,
  button,
  buttonClass,
  invalid,
}: {
  label: string;
  value: string;
  options: PickerOption[];
  /** заголовки групп: { title, values } — если не заданы, один список */
  groups?: { title: string; values: string[] }[];
  searchable?: boolean;
  searchPlaceholder?: string;
  notFound?: string;
  onChange: (v: string) => void;
  button: ReactNode;
  buttonClass?: string;
  invalid?: boolean;
}) {
  const uid = useId().replace(/:/g, "");
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const wrap = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const openRef = useRef(false);
  useEffect(() => {
    openRef.current = open;
  }, [open]);
  const typeahead = useRef({ s: "", t: 0 });

  const byValue = useMemo(() => new Map(options.map((o) => [o.value, o])), [options]);

  // Видимые пункты (с учётом поиска и групп) — плоским списком для клавиатуры
  const sections = useMemo(() => {
    const norm = (s: string) => s.toLocaleLowerCase().replace(/[\s+()-]/g, "").replace(/ё/g, "е");
    const nq = norm(q);
    const match = (o: PickerOption) => !nq || norm(`${o.label} ${o.hint ?? ""} ${o.keywords ?? ""}`).includes(nq);
    if (nq) {
      // при поиске — один список: сначала совпадения с начала названия
      const found = options.filter(match).sort((a, b) => Number(!norm(a.label).startsWith(nq)) - Number(!norm(b.label).startsWith(nq)));
      return [{ title: "", items: found }];
    }
    if (!groups) return [{ title: "", items: options }];
    return groups.map((g) => ({ title: g.title, items: g.values.map((v) => byValue.get(v)).filter(Boolean) as PickerOption[] }));
  }, [q, options, groups, byValue]);
  const flat = useMemo(() => sections.flatMap((s) => s.items), [sections]);
  // индекс первого пункта каждой группы в общем списке (для клавиатуры и aria-activedescendant)
  const starts = useMemo(() => sections.reduce<number[]>((acc, s, i) => [...acc, i === 0 ? 0 : acc[i - 1] + sections[i - 1].items.length], []), [sections]);

  const optId = (i: number) => `${uid}-o${i}`;

  const show = () => {
    setQ("");
    setOpen(true);
  };
  const close = (focusButton = true) => {
    setOpen(false);
    if (focusButton) btn.current?.focus();
  };
  const choose = (v: string) => {
    onChange(v);
    close();
  };

  // При открытии: активный — текущий выбор; фокус — в поиск или в список
  useEffect(() => {
    if (!open) return;
    const i = flat.findIndex((o) => o.value === value);
    setActive(i >= 0 ? i : 0);
    requestAnimationFrame(() => (searchable ? search.current : list.current)?.focus({ preventScroll: true }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => setActive(0), [q]);

  // Прокрутить к активному пункту
  useEffect(() => {
    if (!open) return;
    document.getElementById(optId(active))?.scrollIntoView({ block: "nearest" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, open]);

  // Клик снаружи закрывает; Esc внутри <dialog> не должен закрыть само окно
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => !wrap.current?.contains(e.target as Node) && close(false);
    const dlg = wrap.current?.closest("dialog");
    const onCancel = (e: Event) => {
      if (openRef.current) {
        e.preventDefault();
        close();
      }
    };
    document.addEventListener("pointerdown", onDown);
    dlg?.addEventListener("cancel", onCancel);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      dlg?.removeEventListener("cancel", onCancel);
    };
  }, [open]);

  const onKey = (e: KeyboardEvent) => {
    const last = flat.length - 1;
    if (e.key === "ArrowDown") (e.preventDefault(), setActive((a) => Math.min(last, a + 1)));
    else if (e.key === "ArrowUp") (e.preventDefault(), setActive((a) => Math.max(0, a - 1)));
    else if (e.key === "Home" && !searchable) (e.preventDefault(), setActive(0));
    else if (e.key === "End" && !searchable) (e.preventDefault(), setActive(last));
    else if (e.key === "PageDown") (e.preventDefault(), setActive((a) => Math.min(last, a + 8)));
    else if (e.key === "PageUp") (e.preventDefault(), setActive((a) => Math.max(0, a - 8)));
    else if (e.key === "Enter") {
      e.preventDefault();
      if (flat[active]) choose(flat[active].value);
    } else if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      close();
    } else if (e.key === "Tab") close(false);
    else if (!searchable && e.key.length === 1 && /\S/.test(e.key)) {
      // поиск по первым буквам в коротком списке
      const now = e.timeStamp;
      typeahead.current = { s: (now - typeahead.current.t < 700 ? typeahead.current.s : "") + e.key.toLowerCase(), t: now };
      const i = flat.findIndex((o) => o.label.toLowerCase().startsWith(typeahead.current.s));
      if (i >= 0) setActive(i);
    }
  };

  const listboxId = `${uid}-list`;

  return (
    <div ref={wrap} className="relative flex shrink-0">
      <button
        ref={btn}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        aria-label={label}
        onClick={() => (open ? close() : show())}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            show();
          }
        }}
        className={cn("flex items-center gap-1.5 transition-colors focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-ink", buttonClass)}
      >
        {button}
        <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className={cn("shrink-0 text-stone-ink transition-transform", open && "rotate-180", invalid && "text-error")}>
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <>
          {/* затемнение под листом на телефоне */}
          <div aria-hidden="true" className="fixed inset-0 z-40 bg-ink/40 sm:hidden" onPointerDown={() => close(false)} />
          <div
            className="fixed inset-x-0 bottom-0 z-50 flex max-h-[78vh] flex-col rounded-t-[24px] bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_-10px_40px_rgb(18_18_18/0.25)] sm:absolute sm:inset-x-auto sm:top-[calc(100%+8px)] sm:bottom-auto sm:left-0 sm:max-h-[min(380px,60vh)] sm:w-[min(360px,calc(100vw-48px))] sm:rounded-[20px] sm:border-2 sm:border-ink/10 sm:shadow-[0_18px_40px_-12px_rgb(18_18_18/0.35)]"
            onKeyDown={onKey}
          >
            <div className="flex items-center justify-between px-5 pt-4 pb-2 sm:hidden">
              <p className="font-semibold">{label}</p>
              <button type="button" onClick={() => close()} aria-label="✕" className="grid size-10 place-items-center rounded-full hover:bg-sand">
                <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M6 6l12 12M18 6 6 18" />
                </svg>
              </button>
            </div>
            {searchable && (
              <div className="border-b border-ink/10 p-3">
                <div className="relative">
                  <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-stone-ink">
                    <circle cx="11" cy="11" r="7" />
                    <path d="m20 20-3.5-3.5" />
                  </svg>
                  <input
                    ref={search}
                    type="text"
                    role="combobox"
                    aria-expanded="true"
                    aria-controls={listboxId}
                    aria-activedescendant={flat[active] ? optId(active) : undefined}
                    aria-autocomplete="list"
                    aria-label={searchPlaceholder}
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder={searchPlaceholder}
                    autoComplete="off"
                    spellCheck={false}
                    className="block min-h-11 w-full rounded-xl border-2 border-ink/15 bg-paper/60 pr-3 pl-9 text-base focus:border-ink focus:outline-none"
                  />
                </div>
              </div>
            )}
            <ul
              ref={list}
              id={listboxId}
              role="listbox"
              aria-label={label}
              tabIndex={searchable ? -1 : 0}
              aria-activedescendant={!searchable && flat[active] ? optId(active) : undefined}
              className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2 focus:outline-none"
            >
              {flat.length === 0 && <li className="px-3 py-6 text-center text-[15px] text-stone-ink">{notFound}</li>}
              {sections.map((sec, si) => (
                <li key={si} role="presentation">
                  {sec.title && sec.items.length > 0 && <p className={cn("px-3 pt-2 pb-1 text-[12px] font-semibold tracking-wide text-stone-ink uppercase", si > 0 && "mt-1 border-t border-ink/10 pt-3")}>{sec.title}</p>}
                  <ul role="group" aria-label={sec.title || undefined}>
                    {sec.items.map((o, j) => {
                      const i = starts[si] + j;
                      const selected = o.value === value;
                      return (
                        <li
                          key={`${si}-${o.value}`}
                          id={optId(i)}
                          role="option"
                          aria-selected={selected}
                          onPointerMove={() => setActive(i)}
                          onClick={() => choose(o.value)}
                          className={cn("flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-3 text-[15px]", i === active && "bg-sand", selected && "font-semibold")}
                        >
                          {o.leading}
                          <span className="min-w-0 flex-1 truncate">{o.label}</span>
                          {o.hint && <span className="shrink-0 font-mono text-[13px] text-stone-ink">{o.hint}</span>}
                          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" className={cn("shrink-0", !selected && "invisible")}>
                            <path d="m5 12.5 4.5 4.5L19 7.5" />
                          </svg>
                        </li>
                      );
                    })}
                  </ul>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
