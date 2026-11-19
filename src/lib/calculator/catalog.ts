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
   Услуга = понятное клиенту направление. Внутри — позиции исходного прайса:
   base (входит всегда, 1 шт), core (основной объём), options (доп. платные опции).
   Каждая позиция принадлежит одной группе, кроме опций сайта: они общие для двух
   видов сайта, а сайт можно выбрать только один (exclusive), поэтому позиция
   никогда не начисляется дважды. */

export const SERVICE_IDS = ["site_builder", "site_custom", "bot", "graphics", "video", "presentation"] as const;
export type ServiceId = (typeof SERVICE_IDS)[number];

export type OptionGroupId = "components" | "animations" | "integrations" | "launch" | "extra";

export type Service = {
  id: ServiceId;
  /** параллельный поток работ: потоки идут одновременно, позиции внутри — последовательно */
  track: "web" | "bot" | "graphics" | "video" | "slides";
  base?: ItemKey;
  core: readonly ItemKey[];
  options: readonly { group: OptionGroupId; items: readonly ItemKey[] }[];
  /** стартовый объём при выборе услуги, чтобы смета не была пустой */
  defaults: Partial<Record<ItemKey, number>>;
  exclusiveWith?: readonly ServiceId[];
};

const SITE_OPTIONS = [
  { group: "components", items: ["form", "slider", "gallery", "cards", "faq", "table", "quiz"] },
  { group: "animations", items: ["section_animation", "element_animation", "parallax"] },
  { group: "integrations", items: ["telegram_email", "crm", "payments", "analytics"] },
  { group: "launch", items: ["deploy"] },
] as const;

export const SERVICES: Record<ServiceId, Service> = {
  site_builder: {
    id: "site_builder",
    track: "web",
    base: "builder_base",
    core: ["builder_section_simple", "builder_section_complex", "builder_page"],
    options: SITE_OPTIONS,
    defaults: { builder_section_simple: 5 },
    exclusiveWith: ["site_custom"],
  },
  site_custom: {
    id: "site_custom",
    track: "web",
    base: "custom_base",
    core: ["custom_section", "custom_page", "ui_component"],
    options: SITE_OPTIONS,
    defaults: { custom_section: 5 },
    exclusiveWith: ["site_builder"],
  },
  bot: {
    id: "bot",
    track: "bot",
    base: "bot_base",
    core: ["bot_commands", "bot_db", "bot_admin"],
    options: [{ group: "integrations", items: ["bot_api", "bot_payments", "bot_miniapp"] }],
    defaults: { bot_commands: 1 },
  },
  graphics: {
    id: "graphics",
    track: "graphics",
    core: ["static"],
    options: [{ group: "extra", items: ["adaptation", "resize"] }],
    defaults: { static: 5 },
  },
  video: {
    id: "video",
    track: "video",
    core: ["motion", "motion_light", "neuro_video", "editing"],
    options: [{ group: "extra", items: ["subtitles", "voiceover"] }],
    defaults: { motion: 15 },
  },
  presentation: {
    id: "presentation",
    track: "slides",
    core: ["slide", "complex_slide"],
    options: [{ group: "extra", items: ["slide_animation"] }],
    defaults: { slide: 10 },
  },
};

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

/* Опции без утверждённой цены в прайсе — только индивидуальная оценка.
   Цену не придумываем: в сумму не входят, в смете помечены «по запросу». */
export const ON_REQUEST_KEYS = ["logo", "identity", "copywriting", "support"] as const;
export type OnRequestKey = (typeof ON_REQUEST_KEYS)[number];

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

/** Все позиции, которые может содержать услуга (для подсказок «что можно добавить») */
export function serviceItems(s: Service): ItemKey[] {
  return [...(s.base ? [s.base] : []), ...s.core, ...s.options.flatMap((g) => g.items)];
}
