/* Публичный прайс калькулятора «Бюро».

   Цены, единицы и коэффициенты перенесены 1:1 из рабочего калькулятора
   (репозиторий kishalov/kishalov-price, src/components/price-calculator.tsx).
   Сюда НЕ попадают внутренние параметры того калькулятора: распределение
   оплаты исполнителям и «минимальный чек». Меняете цену там — поменяйте и здесь
   (и наоборот): тесты в engine.test.ts сверяют значения с исходным прайсом.

   Модуль чистый (без React и Node API): его используют и браузер, и сервер.
   Сервер всегда пересчитывает стоимость сам — присланные из браузера суммы
   не принимаются. */

export const CURRENCY = "USD" as const;

export type Unit = "pcs" | "sec" | "min";

export const ITEM_KEYS = [
  "static", "adaptation", "resize",
  "neuro_video", "motion", "motion_light", "editing", "subtitles", "voiceover",
  "slide", "complex_slide", "slide_animation",
  "builder_base", "builder_section_simple", "builder_section_complex", "builder_page",
  "custom_base", "custom_section", "custom_page", "ui_component",
  "form", "slider", "gallery", "cards", "faq", "table", "quiz",
  "section_animation", "element_animation", "parallax",
  "telegram_email", "crm", "payments", "analytics",
  "bot_base", "bot_commands", "bot_db", "bot_admin", "bot_api", "bot_payments", "bot_miniapp",
  "concept", "research", "deploy",
  "small_edit", "big_edit",
] as const;
export type ItemKey = (typeof ITEM_KEYS)[number];

export type Item = {
  key: ItemKey;
  /** цена за единицу, USD — из исходного прайса */
  price: number;
  unit: Unit;
  /** ориентировочные рабочие дни на единицу [мин, макс] — черновые нормы, см. TIMELINE_NOTE */
  days: readonly [number, number];
};

const it = (key: ItemKey, price: number, unit: Unit, days: readonly [number, number]): Item => ({ key, price, unit, days });

/* Нормы сроков — ориентир для клиента, а не обязательство. В исходном калькуляторе
   сроков не было; значения заданы как стартовые и легко правятся здесь. */
export const ITEMS: Record<ItemKey, Item> = {
  static: it("static", 20, "pcs", [0.25, 0.5]),
  adaptation: it("adaptation", 10, "pcs", [0.1, 0.2]),
  resize: it("resize", 10, "pcs", [0.05, 0.1]),

  neuro_video: it("neuro_video", 20, "pcs", [0.5, 1]),
  motion: it("motion", 3, "sec", [0.1, 0.2]),
  motion_light: it("motion_light", 1.5, "sec", [0.05, 0.1]),
  editing: it("editing", 5, "sec", [0.05, 0.1]),
  subtitles: it("subtitles", 2, "sec", [0.01, 0.02]),
  voiceover: it("voiceover", 5, "min", [0.25, 0.5]),

  slide: it("slide", 15, "pcs", [0.15, 0.25]),
  complex_slide: it("complex_slide", 25, "pcs", [0.3, 0.5]),
  slide_animation: it("slide_animation", 5, "pcs", [0.1, 0.2]),

  builder_base: it("builder_base", 300, "pcs", [3, 5]),
  builder_section_simple: it("builder_section_simple", 30, "pcs", [0.25, 0.5]),
  builder_section_complex: it("builder_section_complex", 50, "pcs", [0.5, 1]),
  builder_page: it("builder_page", 200, "pcs", [1, 2]),

  custom_base: it("custom_base", 600, "pcs", [5, 8]),
  custom_section: it("custom_section", 50, "pcs", [0.5, 1]),
  custom_page: it("custom_page", 300, "pcs", [1.5, 3]),
  ui_component: it("ui_component", 50, "pcs", [0.5, 1]),

  form: it("form", 50, "pcs", [0.5, 1]),
  slider: it("slider", 50, "pcs", [0.5, 1]),
  gallery: it("gallery", 40, "pcs", [0.5, 1]),
  cards: it("cards", 40, "pcs", [0.25, 0.5]),
  faq: it("faq", 30, "pcs", [0.25, 0.5]),
  table: it("table", 30, "pcs", [0.25, 0.5]),
  quiz: it("quiz", 100, "pcs", [1, 3]),

  section_animation: it("section_animation", 40, "pcs", [0.25, 0.5]),
  element_animation: it("element_animation", 30, "pcs", [0.25, 0.5]),
  parallax: it("parallax", 60, "pcs", [0.5, 1]),

  telegram_email: it("telegram_email", 50, "pcs", [0.5, 1]),
  crm: it("crm", 150, "pcs", [1, 3]),
  payments: it("payments", 200, "pcs", [2, 4]),
  analytics: it("analytics", 50, "pcs", [0.5, 1]),

  bot_base: it("bot_base", 200, "pcs", [3, 5]),
  bot_commands: it("bot_commands", 50, "pcs", [0.5, 1]),
  bot_db: it("bot_db", 150, "pcs", [1, 3]),
  bot_admin: it("bot_admin", 150, "pcs", [2, 4]),
  bot_api: it("bot_api", 200, "pcs", [2, 4]),
  bot_payments: it("bot_payments", 200, "pcs", [2, 4]),
  bot_miniapp: it("bot_miniapp", 300, "pcs", [5, 10]),

  concept: it("concept", 100, "pcs", [1, 3]),
  research: it("research", 50, "pcs", [1, 2]),
  deploy: it("deploy", 50, "pcs", [0.5, 1]),

  small_edit: it("small_edit", 20, "pcs", [0.1, 0.25]),
  big_edit: it("big_edit", 50, "pcs", [0.5, 1]),
};

/** Шаг и пределы количества по единицам: защита от опечаток и подмены на сервере */
export const UNIT_RULES: Record<Unit, { step: number; max: number; decimals: number }> = {
  pcs: { step: 1, max: 500, decimals: 0 },
  sec: { step: 1, max: 1800, decimals: 0 },
  min: { step: 0.1, max: 120, decimals: 1 },
};

/* ── Услуги ─────────────────────────────────────────────────
   Ровно те 8 услуг, что в разделе «Услуги» на сайте (id совпадают с services.items
   в словарях; названия и описания берутся оттуда же, чтобы не расходились).
   Внутри — позиции исходного прайса: base (входит всегда, 1 шт), core (основной объём),
   options (доп. платные опции). Для сайта два варианта (конструктор / индивидуальная
   разработка) с общими опциями — выбирается один, поэтому опция не начисляется дважды.

   requestParts — индексы пунктов из «Что входит» этой услуги на сайте (deliverables),
   для которых в прайсе нет цены: они оцениваются индивидуально и в сумму не входят.
   requestOnly — у услуги вообще нет цен в прайсе, только индивидуальная оценка. */

export const SERVICE_IDS = ["web", "apps", "bots", "brand", "graphic", "motion", "ads", "special"] as const;
export type ServiceId = (typeof SERVICE_IDS)[number];

export type OptionGroupId = "components" | "animations" | "integrations" | "launch" | "extra";
export const WEB_VARIANTS = ["builder", "custom"] as const;
export type WebVariant = (typeof WEB_VARIANTS)[number];

type Scope = { base?: ItemKey; core: readonly ItemKey[]; defaults: Partial<Record<ItemKey, number>> };

export type Service = Scope & {
  id: ServiceId;
  /** параллельный поток работ: потоки идут одновременно, позиции внутри — последовательно */
  track: "web" | "apps" | "bot" | "brand" | "graphic" | "video" | "ads" | "special";
  /** варианты с разной базой и основным объёмом (только у сайтов) */
  variants?: Record<WebVariant, Scope>;
  options: readonly { group: OptionGroupId; items: readonly ItemKey[] }[];
  requestParts: readonly number[];
  requestOnly?: boolean;
};

const SITE_OPTIONS = [
  { group: "components", items: ["form", "slider", "gallery", "cards", "faq", "table", "quiz"] },
  { group: "animations", items: ["section_animation", "element_animation", "parallax"] },
  { group: "integrations", items: ["telegram_email", "crm", "payments", "analytics"] },
  { group: "launch", items: ["deploy"] },
] as const;

export const SERVICES: Record<ServiceId, Service> = {
  web: {
    id: "web",
    track: "web",
    core: [],
    defaults: {},
    variants: {
      builder: { base: "builder_base", core: ["builder_section_simple", "builder_section_complex", "builder_page"], defaults: { builder_section_simple: 5 } },
      custom: { base: "custom_base", core: ["custom_section", "custom_page", "ui_component"], defaults: { custom_section: 5 } },
    },
    options: SITE_OPTIONS,
    requestParts: [],
  },
  apps: { id: "apps", track: "apps", core: [], defaults: {}, options: [], requestParts: [0, 1, 2, 3], requestOnly: true },
  bots: {
    id: "bots",
    track: "bot",
    base: "bot_base",
    core: ["bot_commands", "bot_db", "bot_admin"],
    options: [{ group: "integrations", items: ["bot_api", "bot_payments", "bot_miniapp"] }],
    defaults: { bot_commands: 1 },
    requestParts: [],
  },
  brand: { id: "brand", track: "brand", core: [], defaults: {}, options: [], requestParts: [0, 1, 2, 3], requestOnly: true },
  graphic: {
    id: "graphic",
    track: "graphic",
    core: ["slide", "complex_slide"],
    options: [{ group: "extra", items: ["slide_animation"] }],
    defaults: { slide: 10 },
    requestParts: [1, 2, 3], // полиграфия, упаковка, мерч — цен в прайсе нет
  },
  motion: {
    id: "motion",
    track: "video",
    core: ["motion", "motion_light", "neuro_video", "editing"],
    options: [{ group: "extra", items: ["subtitles", "voiceover"] }],
    defaults: { motion: 15 },
    requestParts: [],
  },
  ads: {
    id: "ads",
    track: "ads",
    core: ["static"],
    options: [{ group: "extra", items: ["adaptation", "resize"] }],
    defaults: { static: 5 },
    requestParts: [],
  },
  special: { id: "special", track: "special", core: [], defaults: {}, options: [], requestParts: [0, 1, 2], requestOnly: true },
};

/** Объём услуги с учётом выбранного варианта сайта */
export function serviceScope(s: Service, variant: WebVariant): Scope {
  return s.variants ? s.variants[variant] : s;
}

/* Дополнительные работы ко всему проекту (не привязаны к услуге).
   before — идут до основной работы, after — после. */
export const EXTRA_ITEMS = ["concept", "research", "small_edit", "big_edit"] as const satisfies readonly ItemKey[];
export type ExtraItem = (typeof EXTRA_ITEMS)[number];
export const EXTRA_PHASE: Record<ExtraItem, "before" | "after"> = {
  concept: "before",
  research: "before",
  small_edit: "after",
  big_edit: "after",
};

/* Коэффициенты — из исходного калькулятора. timeFactor — ускорение сроков за срочность
   (в исходнике сроков не было; черновая норма). */
export const COMPLEXITY = {
  simple: { factor: 1 },
  medium: { factor: 1.25 },
  hard: { factor: 1.5 },
} as const;
export type ComplexityKey = keyof typeof COMPLEXITY;

export const URGENCY = {
  none: { factor: 1, timeFactor: 1 },
  urgent: { factor: 1.5, timeFactor: 0.75 },
  very_urgent: { factor: 2, timeFactor: 0.6 },
} as const;
export type UrgencyKey = keyof typeof URGENCY;

/** Все позиции, которые может содержать услуга (во всех вариантах) */
export function serviceItems(s: Service): ItemKey[] {
  const scopes = s.variants ? Object.values(s.variants) : [s];
  return [...new Set([...scopes.flatMap((x) => [...(x.base ? [x.base] : []), ...x.core]), ...s.options.flatMap((g) => g.items)])];
}
