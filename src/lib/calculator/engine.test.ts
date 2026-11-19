import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { COMPLEXITY, ITEM_KEYS, ITEMS, SERVICES, URGENCY, serviceItems } from "./catalog";
import { computeQuote, emptySelection, parseSelection, selectionSignature, toggleService, type Selection } from "./engine";
import { CALC_ID_RE, newBriefId, newCalcId, BRIEF_ID_RE } from "./ids";

/* Цены исходного калькулятора (kishalov-price/src/components/price-calculator.tsx).
   Если тест упал — цены разошлись: синхронизируйте оба проекта. */
const ORIGINAL: Record<string, number> = {
  static: 20, adaptation: 10, resize: 10,
  neuro_video: 20, motion: 3, motion_light: 1.5, editing: 5, subtitles: 2, voiceover: 5,
  slide: 15, complex_slide: 25, slide_animation: 5,
  builder_base: 300, builder_section_simple: 30, builder_section_complex: 50, builder_page: 200,
  custom_base: 600, custom_section: 50, custom_page: 300, ui_component: 50,
  form: 50, slider: 50, gallery: 40, cards: 40, faq: 30, table: 30, quiz: 100,
  section_animation: 40, element_animation: 30, parallax: 60,
  telegram_email: 50, crm: 150, payments: 200, analytics: 50,
  bot_base: 200, bot_commands: 50, bot_db: 150, bot_admin: 150, bot_api: 200, bot_payments: 200, bot_miniapp: 300,
  concept: 100, research: 50, deploy: 50,
  small_edit: 20, big_edit: 50,
};

const sel = (patch: Partial<Selection>): Selection => ({ ...emptySelection(), ...patch });

describe("catalog", () => {
  it("содержит все услуги исходного прайса с теми же ценами", () => {
    assert.deepEqual([...ITEM_KEYS].sort(), Object.keys(ORIGINAL).sort());
    for (const k of ITEM_KEYS) assert.equal(ITEMS[k].price, ORIGINAL[k], k);
  });
  it("коэффициенты совпадают с исходными", () => {
    assert.deepEqual([COMPLEXITY.simple.factor, COMPLEXITY.medium.factor, COMPLEXITY.hard.factor], [1, 1.25, 1.5]);
    assert.deepEqual([URGENCY.none.factor, URGENCY.urgent.factor, URGENCY.very_urgent.factor], [1, 1.5, 2]);
  });
  it("каждая позиция прайса доступна клиенту хотя бы в одной услуге или в доп. работах", () => {
    const reachable = new Set([...Object.values(SERVICES).flatMap(serviceItems), "concept", "research", "small_edit", "big_edit"]);
    for (const k of ITEM_KEYS) assert.ok(reachable.has(k), k);
  });
});

describe("computeQuote", () => {
  it("пустой выбор — ноль и без сроков", () => {
    const q = computeQuote(emptySelection());
    assert.equal(q.total, 0);
    assert.equal(q.timeline, null);
    assert.equal(q.isEmpty, true);
  });

  it("считает как исходный калькулятор: Σ(цена×кол-во) × сложность × срочность", () => {
    const s = sel({ services: ["graphics", "video"], qty: { static: 10, adaptation: 4, motion: 30, voiceover: 1.5 }, complexity: "medium", urgency: "urgent" });
    const q = computeQuote(s);
    const base = 20 * 10 + 10 * 4 + 3 * 30 + 5 * 1.5; // 337.5
    assert.equal(q.base, base);
    assert.equal(q.total, Math.round(base * 1.25 * 1.5 * 100) / 100);
    assert.equal(q.base + q.complexity.delta + q.urgency.delta, q.total);
  });

  it("база сайта начисляется всегда и один раз", () => {
    const q = computeQuote(sel({ services: ["site_builder"], qty: { builder_base: 7 } }));
    assert.deepEqual(q.services[0].lines.map((l) => [l.key, l.qty]), [["builder_base", 1]]);
    assert.equal(q.total, 300);
  });

  it("позиции невыбранной услуги не попадают в сумму", () => {
    const q = computeQuote(sel({ services: ["graphics"], qty: { static: 2, slide: 10 } }));
    assert.equal(q.total, 40);
  });

  it("общие опции сайта не начисляются дважды, даже если в запросе оба вида сайта", () => {
    const q = computeQuote(sel({ services: ["site_builder", "site_custom"], qty: { form: 2, deploy: 1 } }));
    const formLines = q.services.flatMap((s) => s.lines).filter((l) => l.key === "form" || l.key === "deploy");
    assert.equal(formLines.length, 2);
  });

  it("позиции с индивидуальной оценкой не влияют на сумму", () => {
    const a = computeQuote(sel({ services: ["graphics"], qty: { static: 1 } }));
    const b = computeQuote(sel({ services: ["graphics"], qty: { static: 1 }, onRequest: ["logo", "support"] }));
    assert.equal(a.total, b.total);
    assert.deepEqual(b.onRequest, ["logo", "support"]);
  });

  it("сроки параллельных услуг не складываются: берётся самый длинный поток", () => {
    const web = computeQuote(sel({ services: ["site_builder"], qty: { builder_section_simple: 4 } })).timeline!;
    const both = computeQuote(sel({ services: ["site_builder", "graphics"], qty: { builder_section_simple: 4, static: 2 } })).timeline!;
    assert.deepEqual(both, web); // 2 креатива (≤1 дня) идут параллельно с сайтом
    assert.deepEqual(web, { min: 4, max: 7 }); // база 3–5 + 4 секции по 0.25–0.5
  });

  it("подготовка идёт до основной работы, правки — после", () => {
    const q = computeQuote(sel({ services: ["graphics"], qty: { static: 4, concept: 1, big_edit: 1 } }));
    assert.deepEqual(q.timeline, { min: 1 + 1 + 1, max: 3 + 2 + 1 });
  });

  it("срочность сокращает сроки и не даёт меньше 1 дня", () => {
    const n = computeQuote(sel({ services: ["site_custom"], qty: { custom_section: 6 } })).timeline!;
    const u = computeQuote(sel({ services: ["site_custom"], qty: { custom_section: 6 }, urgency: "very_urgent" })).timeline!;
    assert.ok(u.max < n.max && u.min <= n.min && u.min >= 1);
  });

  it("копейки округляются до центов без накопления ошибки", () => {
    const q = computeQuote(sel({ services: ["video"], qty: { motion_light: 7 }, complexity: "medium", urgency: "urgent" }));
    assert.equal(q.base, 10.5);
    assert.equal(q.total, 19.69); // 10.5 × 1.25 × 1.5 = 19.6875
    assert.equal(Math.round((q.base + q.complexity.delta + q.urgency.delta) * 100) / 100, q.total);
  });
});

describe("parseSelection (сервер)", () => {
  it("принимает корректный выбор", () => {
    const r = parseSelection({ services: ["bot"], qty: { bot_db: 1 }, onRequest: ["logo"], complexity: "hard", urgency: "none" });
    assert.ok(r.ok);
  });
  it("отклоняет неизвестные услуги, позиции и подмену цены", () => {
    assert.equal(parseSelection({ services: ["hack"], qty: {}, onRequest: [], complexity: "simple", urgency: "none" }).ok, false);
    assert.equal(parseSelection({ services: [], qty: { price: 1 }, onRequest: [], complexity: "simple", urgency: "none" }).ok, false);
    assert.equal(parseSelection({ services: [], qty: { static: -3 }, onRequest: [], complexity: "simple", urgency: "none" }).ok, false);
    assert.equal(parseSelection({ services: [], qty: { static: 1e9 }, onRequest: [], complexity: "simple", urgency: "none" }).ok, false);
    assert.equal(parseSelection({ services: [], qty: {}, onRequest: [], complexity: "x0", urgency: "none" }).ok, false);
    assert.equal(parseSelection({ services: ["site_builder", "site_custom"], qty: {}, onRequest: [], complexity: "simple", urgency: "none" }).ok, false);
  });
  it("лишние поля (например, total) игнорируются — сумма считается заново", () => {
    const r = parseSelection({ services: ["graphics"], qty: { static: 1 }, onRequest: [], complexity: "simple", urgency: "none", total: 1 });
    assert.ok(r.ok && computeQuote(r.selection).total === 20);
  });
  it("мягкий режим (браузер) чинит данные из sessionStorage", () => {
    const r = parseSelection({ services: ["graphics", "nope"], qty: { static: "3", bad: 1 }, complexity: "zzz" }, false);
    assert.ok(r.ok);
    if (r.ok) assert.deepEqual(r.selection, { ...emptySelection(), services: ["graphics"], qty: { static: 3 } });
  });
});

describe("toggleService", () => {
  it("виды сайта взаимоисключающие, опции сохраняются", () => {
    let s = toggleService(emptySelection(), "site_builder");
    s = { ...s, qty: { ...s.qty, form: 1 } };
    s = toggleService(s, "site_custom");
    assert.deepEqual(s.services, ["site_custom"]);
    assert.equal(s.qty.form, 1);
  });
  it("подставляет стартовый объём только для пустой услуги", () => {
    const s = toggleService(sel({ qty: { static: 12 } }), "graphics");
    assert.equal(s.qty.static, 12);
    assert.equal(toggleService(emptySelection(), "graphics").qty.static, SERVICES.graphics.defaults.static);
  });
});

describe("ids", () => {
  it("формат ID", () => {
    assert.match(newCalcId(), CALC_ID_RE);
    assert.match(newBriefId(new Date("2026-11-19T10:00:00Z")), BRIEF_ID_RE);
    assert.ok(newBriefId(new Date("2026-11-19T10:00:00Z")).startsWith("BRF-261119-"));
  });
  it("подпись расчёта меняется только при изменении состава", () => {
    const a = sel({ services: ["graphics"], qty: { static: 2, slide: 4 } });
    const b = sel({ services: ["graphics"], qty: { static: 2 } });
    assert.equal(selectionSignature(a), selectionSignature(b));
    assert.notEqual(selectionSignature(a), selectionSignature({ ...b, urgency: "urgent" }));
  });
});
