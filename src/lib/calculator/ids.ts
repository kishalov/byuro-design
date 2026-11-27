/* Идентификаторы расчёта и заявки. Алфавит Crockford Base32 без похожих символов
   (нет I, L, O, U), чтобы ID было удобно продиктовать или переписать. */

const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

function randomChunk(len: number): string {
  const bytes = new Uint8Array(len);
  globalThis.crypto.getRandomValues(bytes);
  let out = "";
  for (const b of bytes) out += ALPHABET[b & 31];
  return out;
}

/** ID расчёта: CALC-XXXX-XXXX (32^8 ≈ 10^12 вариантов). Создаётся в браузере для каждого нового состава расчёта. */
export const newCalcId = () => `CALC-${randomChunk(4)}-${randomChunk(4)}`;
export const CALC_ID_RE = /^CALC-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}$/;
export const isCalcId = (v: unknown): v is string => typeof v === "string" && CALC_ID_RE.test(v);

/** ID заявки: BRF-ГГММДД-XXXXXX. Создаётся только на сервере. */
export function newBriefId(now = new Date()): string {
  const d = now.toISOString().slice(2, 10).replace(/-/g, "");
  return `BRF-${d}-${randomChunk(6)}`;
}
/** ID заявки из формы «Оставить заявку»: LD-ГГММДД-XXXXXX. Создаётся только на сервере. */
export function newLeadId(now = new Date()): string {
  const d = now.toISOString().slice(2, 10).replace(/-/g, "");
  return `LD-${d}-${randomChunk(6)}`;
}
export const BRIEF_ID_RE = /^BRF-\d{6}-[0-9A-HJKMNP-TV-Z]{6}$/;

/** Ключ идемпотентности одной попытки отправки (UUID v4 из браузера) */
export const IDEMPOTENCY_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
