import { test } from "node:test";
import assert from "node:assert/strict";
import { checkSubmission, diagnosticsLines, markDelivered, readClientMeta } from "./guard";
import { parseDevice, pseudonym } from "./request";

process.env.ANTISPAM_SECRET = "test-secret";
delete process.env.UPSTASH_REDIS_REST_URL;
delete process.env.KV_REST_API_URL;
delete process.env.TURNSTILE_SECRET_KEY;

const UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
let n = 0;
const req = (ip = `10.0.0.${++n}`, ua = UA) => new Request("https://byuro.online/api/lead", { method: "POST", headers: { "x-forwarded-for": ip, "user-agent": ua } });
const human = { meta: { elapsedMs: 25_000, interacted: true, attribution: { utm_source: "yandex", clickIds: ["yclid"] } } };
const run = (r: Request, body: Record<string, unknown>, extra: Partial<{ name: string; text: string; contacts: string[]; content: string }> = {}) =>
  checkSubmission(r, { route: "lead", body, contacts: extra.contacts ?? [`phone:+7999${n}`], content: extra.content ?? `c${Math.random()}`, name: extra.name, text: extra.text });

test("человек проходит, диагностика без контактов", async () => {
  const d = await run(req(), human);
  assert.equal(d.verdict, "accepted");
  const lines = diagnosticsLines(d).join("\n");
  assert.match(lines, /yandex/);
  assert.match(lines, /iOS/);
  assert.doesNotMatch(lines, /10\.0\.0/);
});

test("honeypot → dropped", async () => {
  const d = await run(req(), { ...human, website: "http://spam" });
  assert.equal(d.verdict, "dropped");
  assert.ok(d.reasons.includes("honeypot"));
});

test("бот: без касаний, мгновенно, curl → blocked 403", async () => {
  const d = await run(req(undefined, "curl/8.0"), { meta: { elapsedMs: 300, interacted: false } });
  assert.equal(d.verdict, "blocked");
  assert.equal(d.status, 403);
});

test("старый клиент без meta не отвергается одним только отсутствием метаданных", async () => {
  const d = await run(req(), {});
  assert.equal(d.verdict, "accepted");
});

test("частота по IP: 6-я заявка за 10 минут → 429", async () => {
  const ip = "10.9.9.9";
  for (let i = 0; i < 5; i++) assert.equal((await run(req(ip), human, { contacts: [`phone:+1${i}`] })).verdict, "accepted");
  const d = await run(req(ip), human, { contacts: ["phone:+19"] });
  assert.equal(d.verdict, "blocked");
  assert.equal(d.status, 429);
});

test("частота по контакту: 4-я заявка с того же номера за час → 429", async () => {
  for (let i = 0; i < 3; i++) assert.equal((await run(req(), human, { contacts: ["phone:+79990001122"] })).verdict, "accepted");
  const d = await run(req(), human, { contacts: ["phone:+79990001122"] });
  assert.equal(d.status, 429);
});

test("повтор той же заявки после доставки → duplicate", async () => {
  const first = await run(req(), human, { content: "same-content" });
  assert.equal(first.verdict, "accepted");
  await markDelivered(first, "ref1");
  const again = await run(req(), human, { content: "same-content" });
  assert.equal(again.verdict, "duplicate");
});

test("ссылки в имени добавляют подозрительность", async () => {
  const d = await run(req(), { meta: { elapsedMs: 1000, interacted: true } }, { name: "Buy http://x.top" });
  assert.equal(d.verdict, "blocked");
});

test("meta обрезается и фильтруется", () => {
  const m = readClientMeta({ meta: { elapsedMs: -5, interacted: "yes", attribution: { clickIds: ["yclid", "<script>"], utm_source: "x".repeat(500) } } });
  assert.equal(m.elapsedMs, 0);
  assert.equal(m.interacted, false);
  assert.deepEqual(m.attribution.clickIds, ["yclid"]);
  assert.equal(m.attribution.utm_source?.length, 120);
});

test("устройство и псевдоним IP", async () => {
  assert.equal(parseDevice(UA).type, "mobile");
  assert.equal(parseDevice("Googlebot/2.1").type, "bot");
  assert.equal(parseDevice("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130.0 Safari/537.36").type, "desktop");
  const a = await pseudonym("1.2.3.4");
  assert.equal(a, await pseudonym("1.2.3.4"));
  assert.notEqual(a, await pseudonym("1.2.3.5"));
  assert.doesNotMatch(a, /1\.2\.3/);
});
