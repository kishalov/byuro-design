import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { COMPLEXITY, ITEM_KEYS, ITEMS, SERVICE_IDS, SERVICES, URGENCY, serviceItems } from "./catalog";
import { computeQuote, emptySelection, parseSelection, selectionSignature, setVariant, togglePart, toggleService, type Selection } from "./engine";
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
  it("услуги калькулятора — ровно те, что в разделе «Услуги» сайта, на всех языках", async () => {
    for (const l of ["ru", "en", "de", "fr", "es", "sr", "hi", "zh-cn", "ja"]) {
      const d = (await import(`../../i18n/dictionaries/${l}.ts`)).default as { services: { items: { id: string; deliverables: string[] }[] } };
      assert.deepEqual(d.services.items.map((x) => x.id), [...SERVICE_IDS], l);
      for (const x of d.services.items) for (const i of SERVICES[x.id as keyof typeof SERVICES].requestParts) assert.ok(d.services.items.find((y) => y.id === x.id)!.deliverables[i], `${l}:${x.id}:${i}`);
    }
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
    const s = sel({ services: ["ads", "motion"], qty: { static: 10, adaptation: 4, motion: 30, voiceover: 1.5 }, complexity: "medium", urgency: "urgent" });
    const q = computeQuote(s);
    const base = 20 * 10 + 10 * 4 + 3 * 30 + 5 * 1.5; // 337.5
    assert.equal(q.base, base);
    assert.equal(q.total, Math.round(base * 1.25 * 1.5 * 100) / 100);
    assert.equal(q.base + q.complexity.delta + q.urgency.delta, q.total);
  });

  it("база сайта начисляется всегда и один раз, по выбранному варианту", () => {
    const q = computeQuote(sel({ services: ["web"], qty: { builder_base: 7 } }));
    assert.deepEqual(q.services[0].lines.map((l) => [l.key, l.qty]), [["builder_base", 1]]);
    assert.equal(q.total, 300);
    assert.equal(computeQuote(sel({ services: ["web"], variant: "custom" })).total, 600);
  });

  it("позиции невыбранной услуги и другого варианта сайта не попадают в сумму", () => {
    assert.equal(computeQuote(sel({ services: ["ads"], qty: { static: 2, slide: 10 } })).total, 40);
    assert.equal(computeQuote(sel({ services: ["web"], variant: "builder", qty: { custom_section: 5 } })).total, 300);
  });

  it("общие опции сайта начисляются один раз при смене варианта", () => {
    let s = toggleService(emptySelection(), "web");
    s = { ...s, qty: { ...s.qty, form: 2, deploy: 1 } };
    s = setVariant(s, "custom");
    const lines = computeQuote(s).services[0].lines;
    assert.equal(lines.filter((l) => l.key === "form" || l.key === "deploy").length, 2);
    assert.ok(!lines.some((l) => l.key.startsWith("builder")));
    assert.equal(s.qty.form, 2);
  });

  it("услуги без цены в прайсе — индивидуальная оценка, сумму и срок не меняют", () => {
    const a = computeQuote(sel({ services: ["ads"], qty: { static: 1 } }));
    const b = computeQuote(sel({ services: ["ads", "brand", "apps", "special"], qty: { static: 1 }, parts: { brand: [1, 2] } }));
    assert.equal(a.total, b.total);
    assert.deepEqual(a.timeline, b.timeline);
    assert.ok(b.hasOnRequest && !a.hasOnRequest);
    assert.deepEqual(b.services.find((s) => s.id === "brand")?.parts, [1, 2]);
    assert.ok(b.services.find((s) => s.id === "apps")?.requestOnly);
  });

  it("в графическом дизайне презентации считаются по прайсу, полиграфия/упаковка/мерч — по запросу", () => {
    const q = computeQuote(sel({ services: ["graphic"], qty: { slide: 10 }, parts: { graphic: [2] } }));
    assert.equal(q.total, 150);
    assert.deepEqual(q.services[0].parts, [2]);
    assert.ok(q.hasOnRequest);
  });

  it("сроки параллельных услуг не складываются: берётся самый длинный поток", () => {
    const web = computeQuote(sel({ services: ["web"], qty: { builder_section_simple: 4 } })).timeline!;
    const both = computeQuote(sel({ services: ["web", "ads"], qty: { builder_section_simple: 4, static: 2 } })).timeline!;
    assert.deepEqual(both, web); // 2 креатива (≤1 дня) идут параллельно с сайтом
    assert.deepEqual(web, { min: 4, max: 7 }); // база 3–5 + 4 секции по 0.25–0.5
  });

  it("подготовка идёт до основной работы, правки — после", () => {
    const q = computeQuote(sel({ services: ["ads"], qty: { static: 4, concept: 1, big_edit: 1 } }));
    assert.deepEqual(q.timeline, { min: 1 + 1 + 1, max: 3 + 2 + 1 });
  });

  it("срочность сокращает сроки и не даёт меньше 1 дня", () => {
    const n = computeQuote(sel({ services: ["web"], variant: "custom", qty: { custom_section: 6 } })).timeline!;
    const u = computeQuote(sel({ services: ["web"], variant: "custom", qty: { custom_section: 6 }, urgency: "very_urgent" })).timeline!;
    assert.ok(u.max < n.max && u.min <= n.min && u.min >= 1);
  });

  it("копейки округляются до центов без накопления ошибки", () => {
    const q = computeQuote(sel({ services: ["motion"], qty: { motion_light: 7 }, complexity: "medium", urgency: "urgent" }));
    assert.equal(q.base, 10.5);
    assert.equal(q.total, 19.69); // 10.5 × 1.25 × 1.5 = 19.6875
    assert.equal(Math.round((q.base + q.complexity.delta + q.urgency.delta) * 100) / 100, q.total);
  });
});

const ok = { services: [], variant: "builder", qty: {}, parts: {}, complexity: "simple", urgency: "none" };

describe("parseSelection (сервер)", () => {
  it("принимает корректный выбор", () => {
    assert.ok(parseSelection({ ...ok, services: ["bots", "brand"], qty: { bot_db: 1 }, parts: { brand: [0, 3] }, complexity: "hard" }).ok);
  });
  it("отклоняет неизвестные услуги, позиции, варианты, пункты и подмену цены", () => {
    assert.equal(parseSelection({ ...ok, services: ["hack"] }).ok, false);
    assert.equal(parseSelection({ ...ok, services: ["site_builder"] }).ok, false);
    assert.equal(parseSelection({ ...ok, qty: { price: 1 } }).ok, false);
    assert.equal(parseSelection({ ...ok, qty: { static: -3 } }).ok, false);
    assert.equal(parseSelection({ ...ok, qty: { static: 1e9 } }).ok, false);
    assert.equal(parseSelection({ ...ok, complexity: "x0" }).ok, false);
    assert.equal(parseSelection({ ...ok, variant: "wix" }).ok, false);
    assert.equal(parseSelection({ ...ok, parts: { graphic: [0] } }).ok, false); // презентации считаются по прайсу
    assert.equal(parseSelection({ ...ok, parts: { brand: [9] } }).ok, false);
  });
  it("лишние поля (например, total) игнорируются — сумма считается заново", () => {
    const r = parseSelection({ ...ok, services: ["ads"], qty: { static: 1 }, total: 1 });
    assert.ok(r.ok && computeQuote(r.selection).total === 20);
  });
  it("мягкий режим (браузер) чинит данные из sessionStorage", () => {
    const r = parseSelection({ services: ["ads", "nope"], qty: { static: "3", bad: 1 }, complexity: "zzz" }, false);
    assert.ok(r.ok);
    if (r.ok) assert.deepEqual(r.selection, { ...emptySelection(), services: ["ads"], qty: { static: 3 } });
  });
});

describe("toggleService / togglePart", () => {
  it("подставляет стартовый объём только для пустой услуги", () => {
    assert.equal(toggleService(sel({ qty: { static: 12 } }), "ads").qty.static, 12);
    assert.equal(toggleService(emptySelection(), "ads").qty.static, SERVICES.ads.defaults.static);
    assert.equal(toggleService(emptySelection(), "web").qty.builder_section_simple, 5);
  });
  it("пункты с индивидуальной оценкой включаются и выключаются", () => {
    let s = togglePart(emptySelection(), "brand", 2);
    s = togglePart(s, "brand", 0);
    assert.deepEqual(s.parts.brand, [0, 2]);
    assert.deepEqual(togglePart(s, "brand", 0).parts.brand, [2]);
  });
});

describe("ids", () => {
  it("формат ID", () => {
    assert.match(newCalcId(), CALC_ID_RE);
    assert.match(newBriefId(new Date("2026-11-19T10:00:00Z")), BRIEF_ID_RE);
    assert.ok(newBriefId(new Date("2026-11-19T10:00:00Z")).startsWith("BRF-261119-"));
  });
  it("подпись расчёта меняется только при изменении состава", () => {
    const a = sel({ services: ["ads"], qty: { static: 2, slide: 4 } });
    const b = sel({ services: ["ads"], qty: { static: 2 } });
    assert.equal(selectionSignature(a), selectionSignature(b));
    assert.notEqual(selectionSignature(a), selectionSignature({ ...b, urgency: "urgent" }));
    assert.notEqual(selectionSignature(sel({ services: ["brand"] })), selectionSignature(sel({ services: ["brand"], parts: { brand: [1] } })));
  });
});
