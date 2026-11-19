"use client";
import { useEffect, useId, useState } from "react";
import type { CalcDict } from "@/i18n/calculator/ru";
import { fmt } from "@/i18n/format";
import { ITEMS, UNIT_RULES, type ItemKey } from "@/lib/calculator/catalog";
import { clampQty } from "@/lib/calculator/engine";
import { cn } from "@/lib/cn";

/* Строка позиции: название, цена за единицу и степпер количества.
   Поле принимает «1,5» и «1.5», лишнее обрезает до допустимого. */
export function QtyRow({
  k,
  value,
  onChange,
  t,
  money,
  qty,
  hint,
}: {
  k: ItemKey;
  value: number;
  onChange: (v: number) => void;
  t: CalcDict;
  money: (v: number) => string;
  qty: (v: number) => string;
  hint?: string;
}) {
  const id = useId();
  const item = ITEMS[k];
  const rule = UNIT_RULES[item.unit];
  const unit = t.units[item.unit];
  const label = t.items[k];
  const [draft, setDraft] = useState(value ? String(value) : "0");
  useEffect(() => setDraft(value ? String(value) : "0"), [value]);
  const commit = (raw: string) => {
    const v = clampQty(k, raw);
    onChange(v);
    setDraft(String(v));
  };
  const step = (dir: 1 | -1) => onChange(clampQty(k, Math.max(0, Math.round((value + dir * rule.step) * 10) / 10)));
  const active = value > 0;

  return (
    <div className={cn("grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1 rounded-2xl px-3 py-2.5 transition-colors sm:grid-cols-[1fr_auto_auto] sm:px-4", active ? "bg-white" : "bg-white/50")}>
      <div className="min-w-0">
        <label htmlFor={id} className="block text-[15px] leading-snug font-semibold">
          {label}
        </label>
        <p className="t-small text-stone-ink">
          {fmt(t.scope.perUnit, { price: money(item.price), unit })}
          {hint && <span className="block">{hint}</span>}
        </p>
      </div>
      <div className="flex items-center gap-1">
        <button type="button" onClick={() => step(-1)} disabled={value <= 0} aria-label={fmt(t.scope.decrease, { item: label })} className="grid size-10 place-items-center rounded-full border-2 border-ink/20 text-lg font-semibold transition-colors hover:border-ink disabled:opacity-35">
          −
        </button>
        <input
          id={id}
          inputMode={rule.decimals ? "decimal" : "numeric"}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={(e) => commit(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && commit((e.target as HTMLInputElement).value)}
          onFocus={(e) => e.target.select()}
          aria-label={fmt(t.scope.qty, { item: label, unit })}
          className="h-10 w-16 rounded-xl border-2 border-ink/20 bg-white text-center text-base font-semibold tabular-nums focus:border-ink focus:outline-none"
        />
        <button type="button" onClick={() => step(1)} disabled={value >= rule.max} aria-label={fmt(t.scope.increase, { item: label })} className="grid size-10 place-items-center rounded-full border-2 border-ink bg-ink text-lg font-semibold text-paper transition-colors hover:border-coral hover:bg-coral hover:text-ink disabled:opacity-35">
          +
        </button>
        <span className="w-9 pl-1 text-[13px] text-stone-ink">{unit}</span>
      </div>
      <p className={cn("col-span-2 text-right text-[15px] font-semibold tabular-nums sm:col-span-1 sm:w-24", !active && "text-stone-ink/60")} aria-live="off">
        {active ? money(item.price * value) : "—"}
      </p>
    </div>
  );
}

