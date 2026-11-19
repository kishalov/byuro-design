/* Расчёт стоимости и сроков. Чистые функции: одинаково работают в браузере
   (мгновенный пересчёт) и на сервере (PDF и бриф пересчитываются заново,
   поэтому подменить сумму в запросе нельзя). */

import {
  COMPLEXITY,
  EXTRA_ITEMS,
  EXTRA_PHASE,
  ITEMS,
  SERVICE_IDS,
  SERVICES,
  UNIT_RULES,
  URGENCY,
  WEB_VARIANTS,
  serviceItems,
  serviceScope,
  type ComplexityKey,
  type ExtraItem,
  type ItemKey,
  type ServiceId,
  type Unit,
  type UrgencyKey,
  type WebVariant,
} from "./catalog";

/** То, что выбрал посетитель. Единственные данные, которые браузер передаёт серверу. */
export type Selection = {
  services: ServiceId[];
  /** вариант сайта: конструктор или индивидуальная разработка */
  variant: WebVariant;
  qty: Partial<Record<ItemKey, number>>;
  /** отмеченные пункты с индивидуальной оценкой: индексы из «Что входит» услуги на сайте */
  parts: Partial<Record<ServiceId, number[]>>;
  complexity: ComplexityKey;
  urgency: UrgencyKey;
};

export const emptySelection = (): Selection => ({ services: [], variant: "builder", qty: {}, parts: {}, complexity: "simple", urgency: "none" });

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
  variant?: WebVariant;
  lines: QuoteLine[];
  subtotal: number;
  days: DayRange;
  /** пункты с индивидуальной оценкой (индексы deliverables услуги) */
  parts: number[];
  /** у услуги нет цены в прайсе — вся услуга оценивается индивидуально */
  requestOnly: boolean;
};

export type Quote = {
  currency: "USD";
  services: QuoteService[];
  extras: { lines: QuoteLine[]; subtotal: number; before: DayRange; after: DayRange };
  /** есть позиции с индивидуальной оценкой (в сумму не входят) */
  hasOnRequest: boolean;
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
  const p = 10 ** UNIT_RULES[unit].decimals;
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

  const services: ServiceId[] = [];
  for (const s of Array.isArray(src.services) ? src.services : []) {
    if ((SERVICE_IDS as readonly unknown[]).includes(s)) {
      if (!services.includes(s as ServiceId)) services.push(s as ServiceId);
    } else if (strict) return fail("services");
  }

  const variant = (WEB_VARIANTS as readonly unknown[]).includes(src.variant) ? (src.variant as WebVariant) : null;
  if (strict && !variant) return fail("variant");

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

  const parts: Partial<Record<ServiceId, number[]>> = {};
  const rawParts = src.parts && typeof src.parts === "object" ? (src.parts as Record<string, unknown>) : {};
  for (const [k, v] of Object.entries(rawParts)) {
    if (!(SERVICE_IDS as readonly string[]).includes(k) || !Array.isArray(v)) {
      if (strict) return fail("parts");
      continue;
    }
    const allowed = SERVICES[k as ServiceId].requestParts;
    const list: number[] = [];
    for (const i of v) {
      if (allowed.includes(i as number)) {
        if (!list.includes(i as number)) list.push(i as number);
      } else if (strict) return fail("parts");
    }
    if (list.length) parts[k as ServiceId] = list.sort((a, b) => a - b);
  }

  const complexity = typeof src.complexity === "string" && src.complexity in COMPLEXITY ? (src.complexity as ComplexityKey) : null;
  const urgency = typeof src.urgency === "string" && src.urgency in URGENCY ? (src.urgency as UrgencyKey) : null;
  if (strict && (!complexity || !urgency)) return fail("params");

  return {
    ok: true,
    selection: { services, variant: variant ?? "builder", qty, parts, complexity: complexity ?? "simple", urgency: urgency ?? "none" },
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
  const scope = serviceScope(s, sel.variant);
  const out: QuoteLine[] = [];
  if (scope.base) out.push(line(scope.base, 1, "base"));
  for (const k of scope.core) if (sel.qty[k]) out.push(line(k, sel.qty[k]!, "core"));
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
    const s = SERVICES[id];
    const lines = serviceLines(id, sel).filter((l) => (charged.has(l.key) ? false : (charged.add(l.key), true)));
    services.push({
      id,
      ...(s.variants ? { variant: sel.variant } : {}),
      lines,
      subtotal: round2(lines.reduce((a, l) => a + l.amount, 0)),
      days: scaleDays(sumDays(lines), urgency.timeFactor),
      parts: (sel.parts[id] ?? []).filter((i) => s.requestParts.includes(i)),
      requestOnly: Boolean(s.requestOnly),
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
     подготовка (концепция, ресёрч) идёт до них, правки — после.
     Услуги с индивидуальной оценкой в срок не входят — его назовём после брифа. */
  const parallel = services.reduce<DayRange>((acc, s) => ({ min: Math.max(acc.min, s.days.min), max: Math.max(acc.max, s.days.max) }), { min: 0, max: 0 });
  const tl = {
    min: extras.before.min + parallel.min + extras.after.min,
    max: extras.before.max + parallel.max + extras.after.max,
  };

  return {
    currency: "USD",
    services,
    extras,
    hasOnRequest: services.some((s) => s.requestOnly || s.parts.length > 0),
    base,
    complexity: { key: sel.complexity, factor: complexity.factor, delta: round2(afterComplexity - base) },
    urgency: { key: sel.urgency, factor: urgency.factor, delta: round2(total - afterComplexity) },
    total,
    timeline: tl.max > 0 ? tl : null,
    isEmpty: services.length === 0 && extraLines.length === 0,
  };
}

/** Выбор/снятие услуги; при первом выборе подставляет стартовый объём */
export function toggleService(sel: Selection, id: ServiceId): Selection {
  if (sel.services.includes(id)) return { ...sel, services: sel.services.filter((s) => s !== id) };
  const s = SERVICES[id];
  const scope = serviceScope(s, sel.variant);
  const hasAny = serviceItems(s).some((k) => (sel.qty[k] ?? 0) > 0 && k !== scope.base);
  const qty = { ...sel.qty };
  if (!hasAny) for (const [k, v] of Object.entries(scope.defaults)) qty[k as ItemKey] = v;
  return { ...sel, services: [...sel.services, id], qty };
}

/** Смена варианта сайта: общие опции сохраняются, для пустого варианта — стартовый объём */
export function setVariant(sel: Selection, variant: WebVariant): Selection {
  if (sel.variant === variant) return sel;
  const scope = SERVICES.web.variants![variant];
  const qty = { ...sel.qty };
  if (!scope.core.some((k) => (qty[k] ?? 0) > 0)) for (const [k, v] of Object.entries(scope.defaults)) qty[k as ItemKey] = v;
  return { ...sel, variant, qty };
}

export function togglePart(sel: Selection, id: ServiceId, i: number): Selection {
  const cur = sel.parts[id] ?? [];
  const next = cur.includes(i) ? cur.filter((x) => x !== i) : [...cur, i].sort((a, b) => a - b);
  return { ...sel, parts: { ...sel.parts, [id]: next } };
}

/** Стабильная подпись расчёта: меняется только при изменении состава/параметров */
export function selectionSignature(sel: Selection): string {
  const q = computeQuote(sel);
  const lines = [...q.services.flatMap((s) => s.lines), ...q.extras.lines].map((l) => `${l.key}:${l.qty}`).join(",");
  const svc = q.services.map((s) => `${s.id}${s.variant ? `/${s.variant}` : ""}${s.parts.length ? `[${s.parts.join(".")}]` : ""}`).join("+");
  return [svc, lines, sel.complexity, sel.urgency].join("|");
}
