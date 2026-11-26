import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { clientKeys, memoryStore, projectFingerprint } from "./dedupe";
import { checkPhone } from "../contacts/phone";
import { extractLinks, normalizeEmail, normalizePhone, normalizeTelegram, validateBrief } from "./schema";

describe("нормализация контактов", () => {
  it("телефон: разные записи одного номера совпадают", () => {
    const v = ["+7 (900) 123-45-67", "89001234567", "+79001234567", "8 900 123 45 67", "007 900 1234567"].map(normalizePhone);
    assert.deepEqual(new Set(v), new Set(["+79001234567"]));
    assert.equal(normalizePhone("+381 64 123 4567"), "+381641234567");
    assert.equal(normalizePhone("+91 98765 43210"), "+919876543210");
    assert.equal(normalizePhone("12345"), null);
    assert.equal(normalizePhone("call me"), null);
  });
  it("email: регистр и пробелы", () => {
    assert.equal(normalizeEmail("  Name@Mail.COM "), "name@mail.com");
    assert.equal(normalizeEmail("nope@"), null);
  });
  it("telegram: @, ссылки, регистр", () => {
    for (const v of ["@Byuro_Design", "byuro_design", "t.me/byuro_design", "https://t.me/Byuro_Design/"]) assert.equal(normalizeTelegram(v), "byuro_design");
    assert.equal(normalizeTelegram("@abc"), null);
    assert.equal(normalizeTelegram("+79001234567"), null);
  });
  it("ссылки: только http(s), без дублей и хвостовой пунктуации", () => {
    assert.deepEqual(extractLinks("ТЗ: https://docs.google.com/x, и https://figma.com/f). https://figma.com/f javascript:alert(1)"), ["https://docs.google.com/x", "https://figma.com/f"]);
  });
});

describe("валидация брифа", () => {
  const ok = { name: "Анна", consent: true };
  const v = (p: Parameters<typeof validateBrief>[0]) => validateBrief(p, checkPhone);
  it("нужен хотя бы один контакт", () => {
    assert.equal(v(ok).contacts, "contactRequired");
    assert.deepEqual(v({ ...ok, social: { network: "telegram", handle: "anna_design" } }), {});
    assert.deepEqual(v({ ...ok, email: "a@b.co" }), {});
    assert.deepEqual(v({ ...ok, phone: "+79001234567", phoneCountry: "RU" }), {});
    // старое поле telegram от закэшированной страницы
    assert.deepEqual(v({ ...ok, telegram: "@anna_design" }), {});
  });
  it("некорректный контакт — ошибка именно этого поля", () => {
    const e = v({ ...ok, phone: "+7900123", phoneCountry: "RU", email: "a@b.co" });
    assert.equal(e.phone, "phoneTooShort");
    assert.equal(e.contacts, undefined);
    assert.equal(v({ ...ok, social: { network: "telegram", handle: "ab" } }).social, "handleInvalid");
    assert.equal(v({ ...ok, social: { network: "nope", handle: "abcdef" } }).social, "handleInvalid");
    assert.equal(v({ ...ok, email: "a@b" }).email, "emailInvalid");
  });
  it("согласие и имя обязательны, длинные тексты отклоняются", () => {
    const e = v({ name: "", email: "a@b.co", consent: false, description: "x".repeat(3001) });
    assert.equal(e.name, "nameShort");
    assert.equal(e.consent, "consent");
    assert.equal(e.description, "tooLong");
    assert.deepEqual(v({ name: "李", email: "a@b.co", consent: true }), {});
  });
});

describe("повторные обращения", () => {
  it("один клиент с разной записью контактов даёт те же ключи", async () => {
    const a = await clientKeys({ phone: normalizePhone("8 900 123-45-67"), telegram: null, email: null });
    const b = await clientKeys({ phone: normalizePhone("+7 900 1234567"), telegram: normalizeTelegram("@x_anna"), email: null });
    assert.ok(a.every((k) => b.includes(k)));
    assert.ok(!a[0].includes("9001234567"), "в ключе нет самого телефона");
  });
  it("разные проекты одного клиента — разные отпечатки; тот же проект — тот же", async () => {
    const keys = await clientKeys({ phone: "+79001234567", telegram: null, email: null });
    const p1 = await projectFingerprint(keys, "site_builder|…", { description: "Сайт для клиники" });
    const p1again = await projectFingerprint([...keys].reverse(), "site_builder|…", { description: "  сайт  для КЛИНИКИ " });
    const p2 = await projectFingerprint(keys, "bot|…", { description: "Бот для записи" });
    assert.equal(p1, p1again);
    assert.notEqual(p1, p2);
  });
  it("хранилище находит дубль запроса, дубль проекта и повторного клиента", async () => {
    const s = memoryStore();
    const now = new Date().toISOString();
    await s.save({ briefId: "BRF-1", createdAt: now, idempotencyKey: "k1", fingerprint: "f1", clientKeys: ["phone:aa"] });
    assert.equal((await s.findByIdempotencyKey("k1"))?.briefId, "BRF-1");
    assert.equal((await s.findByFingerprint("f1", 60_000))?.briefId, "BRF-1");
    assert.equal(await s.findByFingerprint("f2", 60_000), null);
    assert.equal((await s.findByClientKeys(["email:zz", "phone:aa"])).length, 1);
    assert.equal(s.persistent, false);
  });
});

describe("Telegram: формат брифа", async () => {
  const { formatTelegram, splitMessage } = await import("./transports/telegram");
  it("экранирует HTML и выделяет заголовки", () => {
    const rec = { briefId: "BRF-261120-ABCDEF" } as Parameters<typeof formatTelegram>[0];
    const [msg] = formatTelegram(rec, "Бриф для Бюро · BRF-261120-ABCDEF\n— Как с вами связаться —\nИмя: <script>&");
    assert.match(msg, /^<b>🧮 Бриф для Бюро · BRF-261120-ABCDEF<\/b>/);
    assert.match(msg, /<b>— Как с вами связаться —<\/b>/);
    assert.match(msg, /Имя: &lt;script&gt;&amp;/);
  });
  it("длинный бриф делится на сообщения не длиннее лимита", () => {
    const text = Array.from({ length: 300 }, (_, i) => `строка ${i} ${"x".repeat(40)}`).join("\n") + "\n" + "y".repeat(9000);
    const parts = splitMessage(text, 4000);
    assert.ok(parts.length > 3);
    assert.ok(parts.every((p) => p.length <= 4000));
    assert.equal(parts.join("\n").replace(/\n/g, "").length, text.replace(/\n/g, "").length);
  });
});
