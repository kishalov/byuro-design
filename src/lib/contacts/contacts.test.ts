import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { validateLead } from "../lead";
import { checkPhone, formatNational, interpretInput, toE164 } from "./phone";
import { checkHandle, parseHandleInput } from "./social";
import { cleanContacts, validateContacts } from "./validate";

describe("телефон", () => {
  const run = (raw: string, c: Parameters<typeof interpretInput>[1]) => {
    const r = interpretInput(raw, c);
    return { country: r.country, shown: formatNational(r.country, r.digits), e164: toE164(r.country, r.digits) };
  };
  it("российские записи: 8…, +7…, без кода", () => {
    for (const raw of ["89001234567", "+7 (900) 123-45-67", "9001234567", "8 900 123 45 67"]) assert.equal(run(raw, "RU").e164, "+79001234567");
    assert.equal(run("9001234567", "RU").shown, "900 123 45 67");
  });
  it("«+код» и «00код» переключают страну", () => {
    assert.equal(run("+44 7400 123456", "RU").country, "GB");
    assert.equal(run("004930123456", "RU").country, "DE");
    assert.equal(run("+1 415 555 2671", "RU").country, "US");
    assert.equal(run("+77011234567", "RU").country, "KZ");
  });
  it("национальный префикс убирается, когда номер набран целиком", () => {
    assert.equal(run("030 123456", "DE").e164, "+4930123456");
  });
  it("проверка: коротко, длинно, не тот формат, другая страна", () => {
    assert.equal(checkPhone("+79001234567", "RU"), null);
    assert.equal(checkPhone("+7900123", "RU"), "phoneTooShort");
    assert.equal(checkPhone("+790012345678", "RU"), "phoneTooLong");
    assert.equal(checkPhone("+71234567890", "RU"), "phoneInvalid");
    assert.equal(checkPhone("+447400123456", "RU"), "phoneInvalid");
    assert.equal(checkPhone("89001234567"), "phoneInvalid");
  });
});

describe("ник в мессенджере", () => {
  it("ссылки и @ превращаются в ник, сеть определяется по ссылке", () => {
    assert.deepEqual(parseHandleInput("@Byuro_Design", "telegram"), { network: "telegram", handle: "Byuro_Design" });
    assert.deepEqual(parseHandleInput("https://t.me/byuro_design", "instagram"), { network: "telegram", handle: "byuro_design" });
    assert.deepEqual(parseHandleInput("instagram.com/byuro_design.studio/?igsh=abc", "telegram"), { network: "instagram", handle: "byuro_design.studio" });
    assert.deepEqual(parseHandleInput("https://www.linkedin.com/in/anna-smith-123/", "telegram"), { network: "linkedin", handle: "anna-smith-123" });
    assert.deepEqual(parseHandleInput("vk.com/id12345", "vk"), { network: "vk", handle: "id12345" });
    assert.deepEqual(parseHandleInput("https://x.com/byuro", "telegram"), { network: "x", handle: "byuro" });
    assert.deepEqual(parseHandleInput("https://www.tiktok.com/@byuro", "telegram"), { network: "tiktok", handle: "byuro" });
    assert.deepEqual(parseHandleInput("an na", "discord"), { network: "discord", handle: "anna" });
  });
  it("правила сетей", () => {
    assert.equal(checkHandle("telegram", "byuro_design"), null);
    assert.equal(checkHandle("telegram", "abc"), "handleInvalid");
    assert.equal(checkHandle("telegram", "1abcde"), "handleInvalid");
    assert.equal(checkHandle("instagram", "byuro_design.studio"), null);
    assert.equal(checkHandle("instagram", "имя"), "handleInvalid");
    assert.equal(checkHandle("x", "a".repeat(16)), "handleInvalid");
  });
});

describe("блок контактов", () => {
  it("нужен телефон или ник; ошибки — по своим полям", () => {
    assert.equal(validateContacts({}, checkPhone).contacts, "contactRequired");
    assert.deepEqual(validateContacts({ phone: "+79001234567", phoneCountry: "RU" }, checkPhone), {});
    assert.deepEqual(validateContacts({ social: { network: "telegram", handle: "anna_design" } }, checkPhone), {});
    assert.equal(validateContacts({ phone: "+7900", social: { network: "telegram", handle: "anna_design" } }, checkPhone).phone, "phoneTooShort");
  });
  it("сервер отбрасывает лишнее и мусор", () => {
    const c = cleanContacts({ phone: "+79001234567", phoneCountry: "RU", phoneApps: ["whatsapp", "evil", "whatsapp"], social: { network: "telegram", handle: " anna_design " } });
    assert.deepEqual(c, { phone: "+79001234567", phoneCountry: "RU", phoneApps: ["whatsapp"], social: { network: "telegram", handle: "anna_design" } });
    assert.deepEqual(cleanContacts({ phoneApps: "x" as unknown as string[], social: { network: 1 as unknown as string, handle: {} as unknown as string } }), { phone: null, phoneCountry: null, phoneApps: [], social: null });
  });
  it("заявка: новый формат и старое поле «контакт»", () => {
    const base = { type: "project" as const, name: "Анна", consent: true };
    assert.deepEqual(validateLead({ ...base, phone: "+79001234567", phoneCountry: "RU" }, checkPhone), {});
    assert.deepEqual(validateLead({ ...base, contact: "@anna_design" }, checkPhone), {});
    assert.equal(validateLead(base, checkPhone).contacts, "contactRequired");
  });
});

describe("контакты в сообщении команде", async () => {
  const { appLink, appsLine, phoneLine, socialLine } = await import("./format");
  it("номер со страной, ссылки «написать», профиль", () => {
    assert.equal(phoneLine("+79001234567", "RU"), "+7 900 123 45 67 (Россия)");
    assert.equal(phoneLine("+77011234567", "KZ"), "+7 701 123 4567 (Казахстан)");
    assert.equal(appLink("whatsapp", "+79001234567"), "https://wa.me/79001234567");
    assert.equal(appLink("viber", "+79001234567"), null);
    assert.equal(appsLine(["whatsapp", "max"]), "WhatsApp, MAX");
    assert.deepEqual(socialLine("instagram", "anna.design"), { label: "Instagram", text: "@anna.design", url: "https://instagram.com/anna.design" });
    assert.deepEqual(socialLine("vk", "id123"), { label: "VK", text: "vk.com/id123", url: "https://vk.com/id123" });
    assert.deepEqual(socialLine("discord", "anna"), { label: "Discord", text: "anna", url: null });
  });
});
