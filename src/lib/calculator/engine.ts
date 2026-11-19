/* Расчёт стоимости и сроков. Чистые функции: одинаково работают в браузере
   (мгновенный пересчёт) и на сервере (PDF и бриф пересчитываются заново,
   поэтому подменить сумму в запросе нельзя). */

import {
  COMPLEXITY,
  EXTRA_ITEMS,
  EXTRA_PHASE,
  ITEMS,
  ON_REQUEST_KEYS,
  SERVICE_IDS,
  SERVICES,
  UNIT_RULES,
  URGENCY,
  serviceItems,
  type ComplexityKey,
  type ExtraItem,
  type ItemKey,
  type OnRequestKey,
  type ServiceId,
  type Unit,
  type UrgencyKey,
} from "./catalog";

/** То, что выбрал посетитель. Единственные данные, которые браузер передаёт серверу. */
export type Selection = {
  services: ServiceId[];
  qty: Partial<Record<ItemKey, number>>;
  onRequest: OnRequestKey[];
  complexity: ComplexityKey;
  urgency: UrgencyKey;
};

export const emptySelection = (): Selection => ({ services: [], qty: {}, onRequest: [], complexity: "simple", urgency: "none" });

export type DayRange = { min: number; max: number };

export type QuoteLine = {
  key: ItemKey;
  qty: number;
  unit: Unit;
  unitPrice: number;
  amount: number;
  kind: "base" | "core" | "option" | "extra";
};

export type QuoteService = {
  id: ServiceId;
  lines: QuoteLine[];
  subtotal: number;
  days: DayRange;
};

export type Quote = {
  currency: "USD";
  services: QuoteService[];
  extras: { lines: QuoteLine[]; subtotal: number; before: DayRange; after: DayRange };
  onRequest: OnRequestKey[];
  /** сумма позиций до коэффициентов */
  base: number;
  complexity: { key: ComplexityKey; factor: number; delta: number };
  urgency: { key: UrgencyKey; factor: number; delta: number };
  total: number;
  /** общий срок с учётом параллельной работы; null — нечего оценивать */
  timeline: DayRange | null;
  isEmpty: boolean;
};

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

const roundQty = (q: number, unit: Unit) => {
  const d = UNIT_RULES[unit].decimals;
  const p = 10 ** d;
  return Math.round(q * p) / p;
};

/** Приводит количество к допустимому виду: не число/отрицательное → 0, больше лимита → лимит */
export function clampQty(key: ItemKey, raw: unknown): number {
  const n = typeof raw === "number" ? raw : typeof raw === "string" ? Number(raw.replace(",", ".")) : NaN;
  if (!Number.isFinite(n) || n <= 0) return 0;
  const { unit } = ITEMS[key];
  return Math.min(roundQty(n, unit), UNIT_RULES[unit].max);
}

/* Нормализация выбора. strict=false — «мягкая» для браузера (чинит), strict=true — для сервера:
   любые неизвестные ключи и некорректные значения → ошибка, а не тихая правка. */
export type SelectionResult = { ok: true; selection: Selection } | { ok: false; error: string };

export function parseSelection(input: unknown, strict = true): SelectionResult {
  if (!input || typeof input !== "object") return { ok: false, error: "selection" };
  const src = input as Record<string, unknown>;
  const fail = (e: string): SelectionResult => ({ ok: false, error: e });

  const rawServices = Array.isArray(src.services) ? src.services : [];
  const services: ServiceId[] = [];
  for (const s of rawServices) {
    if ((SERVICE_IDS as readonly unknown[]).includes(s)) {
      if (!services.includes(s as ServiceId)) services.push(s as ServiceId);
    } else if (strict) return fail("services");
  }
  // взаимоисключающие услуги (два вида сайта): оставляем первую выбранную
  const kept: ServiceId[] = [];
  for (const s of services) {
    if (SERVICES[s].exclusiveWith?.some((x) => kept.includes(x))) {
      if (strict) return fail("exclusive");
      continue;
    }
    kept.push(s);
  }

  const qty: Partial<Record<ItemKey, number>> = {};
  const rawQty = src.qty && typeof src.qty === "object" ? (src.qty as Record<string, unknown>) : {};
  for (const [k, v] of Object.entries(rawQty)) {
    if (!(k in ITEMS)) {
      if (strict) return fail("qty");
      continue;
    }
    const key = k as ItemKey;
    const n = typeof v === "number" ? v : Number(v);
    if (strict && (!Number.isFinite(n) || n < 0 || n > UNIT_RULES[ITEMS[key].unit].max)) return fail("qty");
    const q = clampQty(key, v);
    if (q > 0) qty[key] = q;
  }

  const onRequest: OnRequestKey[] = [];
  for (const k of Array.isArray(src.onRequest) ? src.onRequest : []) {
    if ((ON_REQUEST_KEYS as readonly unknown[]).includes(k)) {
      if (!onRequest.includes(k as OnRequestKey)) onRequest.push(k as OnRequestKey);
    } else if (strict) return fail("onRequest");
  }

  const complexity = typeof src.complexity === "string" && src.complexity in COMPLEXITY ? (src.complexity as ComplexityKey) : null;
  const urgency = typeof src.urgency === "string" && src.urgency in URGENCY ? (src.urgency as UrgencyKey) : null;
  if (strict && (!complexity || !urgency)) return fail("params");

  return {
    ok: true,
    selection: { services: kept, qty, onRequest, complexity: complexity ?? "simple", urgency: urgency ?? "none" },
  };
}

function line(key: ItemKey, qty: number, kind: QuoteLine["kind"]): QuoteLine {
  const item = ITEMS[key];
  return { key, qty, unit: item.unit, unitPrice: item.price, amount: round2(item.price * qty), kind };
}

function sumDays(lines: QuoteLine[]): DayRange {
  let min = 0;
  let max = 0;
  for (const l of lines) {
    const [a, b] = ITEMS[l.key].days;
    min += a * l.qty;
    max += b * l.qty;
  }
  return { min, max };
}

/** Дробные дни → целые рабочие дни; любая начатая работа — минимум 1 день */
const wholeDays = (r: DayRange): DayRange => {
  if (r.max <= 0) return { min: 0, max: 0 };
  const min = Math.max(1, Math.ceil(r.min - 1e-9));
  return { min, max: Math.max(min, Math.ceil(r.max - 1e-9)) };
};

const scaleDays = (r: DayRange, f: number): DayRange => (r.max <= 0 ? r : wholeDays({ min: r.min * f, max: r.max * f }));

/** Порядок позиций внутри услуги — как в каталоге */
function serviceLines(id: ServiceId, sel: Selection): QuoteLine[] {
  const s = SERVICES[id];
  const out: QuoteLine[] = [];
  if (s.base) out.push(line(s.base, 1, "base"));
  for (const k of s.core) if (sel.qty[k]) out.push(line(k, sel.qty[k]!, "core"));
  for (const g of s.options) for (const k of g.items) if (sel.qty[k]) out.push(line(k, sel.qty[k]!, "option"));
  return out;
}

export function computeQuote(sel: Selection): Quote {
  const urgency = URGENCY[sel.urgency];
  const complexity = COMPLEXITY[sel.complexity];

  // Позиция начисляется один раз, даже если она есть в нескольких услугах
  const charged = new Set<ItemKey>();
  const services: QuoteService[] = [];
  for (const id of SERVICE_IDS) {
    if (!sel.services.includes(id)) continue;
    const lines = serviceLines(id, sel).filter((l) => (charged.has(l.key) ? false : (charged.add(l.key), true)));
    services.push({
      id,
      lines,
      subtotal: round2(lines.reduce((a, l) => a + l.amount, 0)),
      days: scaleDays(sumDays(lines), urgency.timeFactor),
    });
  }

  const extraLines = EXTRA_ITEMS.filter((k) => sel.qty[k] && !charged.has(k)).map((k) => line(k, sel.qty[k]!, "extra"));
  const phase = (p: "before" | "after") => scaleDays(sumDays(extraLines.filter((l) => EXTRA_PHASE[l.key as ExtraItem] === p)), urgency.timeFactor);
  const extras = {
    lines: extraLines,
    subtotal: round2(extraLines.reduce((a, l) => a + l.amount, 0)),
    before: phase("before"),
    after: phase("after"),
  };

  const base = round2(services.reduce((a, s) => a + s.subtotal, 0) + extras.subtotal);
  const afterComplexity = round2(base * complexity.factor);
  const total = round2(base * complexity.factor * urgency.factor); // как в исходнике: без промежуточного округления

  /* Сроки: разные услуги ведут разные специалисты параллельно (берём самый длинный поток),
     подготовка (концепция, ресёрч) идёт до них, правки — после. */
  const parallel = services.reduce<DayRange>((acc, s) => ({ min: Math.max(acc.min, s.days.min), max: Math.max(acc.max, s.days.max) }), { min: 0, max: 0 });
  const tl = {
    min: extras.before.min + parallel.min + extras.after.min,
    max: extras.before.max + parallel.max + extras.after.max,
  };

  const isEmpty = services.length === 0 && extraLines.length === 0 && sel.onRequest.length === 0;
  return {
    currency: "USD",
    services,
    extras,
    onRequest: ON_REQUEST_KEYS.filter((k) => sel.onRequest.includes(k)),
    base,
    complexity: { key: sel.complexity, factor: complexity.factor, delta: round2(afterComplexity - base) },
    urgency: { key: sel.urgency, factor: urgency.factor, delta: round2(total - afterComplexity) },
    total,
    timeline: tl.max > 0 ? tl : null,
    isEmpty,
  };
}

/** Выбор/снятие услуги: учитывает взаимоисключения и подставляет стартовый объём */
export function toggleService(sel: Selection, id: ServiceId): Selection {
  if (sel.services.includes(id)) return { ...sel, services: sel.services.filter((s) => s !== id) };
  const s = SERVICES[id];
  const services = [...sel.services.filter((x) => !s.exclusiveWith?.includes(x)), id];
  const own = serviceItems(s);
  const hasAny = own.some((k) => (sel.qty[k] ?? 0) > 0 && k !== s.base);
  const qty = { ...sel.qty };
  if (!hasAny) for (const [k, v] of Object.entries(s.defaults)) qty[k as ItemKey] = v;
  return { ...sel, services, qty };
}

/** Стабильная подпись расчёта: меняется только при изменении состава/параметров */
export function selectionSignature(sel: Selection): string {
  const q = computeQuote(sel);
  const lines = [...q.services.flatMap((s) => s.lines), ...q.extras.lines].map((l) => `${l.key}:${l.qty}`).join(",");
  return [q.services.map((s) => s.id).join("+"), lines, q.onRequest.join("+"), sel.complexity, sel.urgency].join("|");
}
