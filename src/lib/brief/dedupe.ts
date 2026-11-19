/* Распознавание повторных обращений и дублей.

   Три разных случая:
   1. Повтор одного и того же запроса (двойное нажатие, ретрай сети) —
      одинаковый idempotencyKey → возвращаем прежний результат, второй раз не отправляем.
   2. Тот же проект от того же клиента (отправил бриф ещё раз) — одинаковый
      fingerprint = контакты + состав расчёта + описание → помечаем как дубль.
   3. Тот же клиент с НОВЫМ проектом — совпадает хотя бы один clientKey,
      но fingerprint другой → это не дубль, а повторное обращение (repeat client).

   Ключи — SHA-256 от нормализованных контактов: в хранилище не нужно держать
   сами телефоны и почты, чтобы находить совпадения. */

import type { NormalizedContacts } from "./schema";

async function sha256(text: string): Promise<string> {
  const buf = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Ключи клиента: по одному на каждый указанный контакт */
export async function clientKeys(c: NormalizedContacts): Promise<string[]> {
  const raw = [c.phone && `phone:${c.phone}`, c.telegram && `tg:${c.telegram}`, c.email && `email:${c.email}`].filter(Boolean) as string[];
  return Promise.all(raw.map(async (r) => `${r.split(":")[0]}:${(await sha256(r)).slice(0, 32)}`));
}

const squash = (s: string | undefined) => (s ?? "").toLowerCase().replace(/\s+/g, " ").trim();

/** Отпечаток проекта: клиент + состав расчёта + суть задачи. Разные проекты одного клиента дают разные отпечатки. */
export async function projectFingerprint(keys: string[], calcSignature: string, project: { company?: string; description?: string; projectName?: string }): Promise<string> {
  const src = [[...keys].sort().join(","), calcSignature, squash(project.projectName), squash(project.company), squash(project.description)].join("\n");
  return (await sha256(src)).slice(0, 40);
}

export type StoredBrief = { briefId: string; createdAt: string; idempotencyKey: string; fingerprint: string; clientKeys: string[] };

/** Контракт хранилища заявок. Подключите реализацию (БД, KV) в store.ts — остальной код не меняется. */
export interface BriefStore {
  /** true — данные переживают перезапуск и общие для всех серверов (тогда повторные клиенты определяются надёжно) */
  readonly persistent: boolean;
  findByIdempotencyKey(key: string): Promise<StoredBrief | null>;
  findByFingerprint(fingerprint: string, sinceMs: number): Promise<StoredBrief | null>;
  findByClientKeys(keys: string[], limit?: number): Promise<StoredBrief[]>;
  save(b: StoredBrief): Promise<void>;
}

/* Память процесса. НЕ постоянное хранилище: живёт, пока жив серверный инстанс.
   Годится только для защиты от двойной отправки в пределах минут;
   для распознавания повторных клиентов нужна постоянная реализация. */
export function memoryStore(ttlMs = 24 * 60 * 60 * 1000, max = 2000): BriefStore {
  const items: StoredBrief[] = [];
  const fresh = () => {
    const edge = Date.now() - ttlMs;
    while (items.length && (Date.parse(items[0].createdAt) < edge || items.length > max)) items.shift();
    return items;
  };
  return {
    persistent: false,
    async findByIdempotencyKey(key) {
      return fresh().find((b) => b.idempotencyKey === key) ?? null;
    },
    async findByFingerprint(fp, sinceMs) {
      const edge = Date.now() - sinceMs;
      return fresh().find((b) => b.fingerprint === fp && Date.parse(b.createdAt) >= edge) ?? null;
    },
    async findByClientKeys(keys, limit = 10) {
      return fresh().filter((b) => b.clientKeys.some((k) => keys.includes(k))).slice(-limit).reverse();
    },
    async save(b) {
      fresh().push(b);
    },
  };
}
