import "server-only";
/* Хранилище для антиспама: счётчики частоты, отметки о повторах и журнал проверок.
   — Если подключён Redis (Upstash, в т. ч. через Vercel Marketplace): переменные
     UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN или KV_REST_API_URL + KV_REST_API_TOKEN —
     данные общие для всех серверов и переживают перезапуск.
   — Без Redis — память процесса: работает, но каждый серверный инстанс считает отдельно,
     а журнал теряется при перезапуске. */

export interface Kv {
  readonly persistent: boolean;
  /** +1 к счётчику; срок жизни ставится при первом увеличении */
  incr(key: string, ttlSec: number): Promise<number>;
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSec: number): Promise<void>;
  /** добавить запись в начало списка, хранить не больше max записей и не дольше ttl */
  push(key: string, value: string, max: number, ttlSec: number): Promise<void>;
  list(key: string, n: number): Promise<string[]>;
}

function upstash(url: string, token: string): Kv {
  const run = async (cmds: (string | number)[][]) => {
    const r = await fetch(`${url.replace(/\/$/, "")}/pipeline`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(cmds),
      signal: AbortSignal.timeout(3000),
      cache: "no-store",
    });
    if (!r.ok) throw new Error(`redis ${r.status}`);
    const out = (await r.json()) as { result?: unknown; error?: string }[];
    const err = out.find((x) => x.error);
    if (err) throw new Error(`redis ${err.error}`);
    return out.map((x) => x.result);
  };
  return {
    persistent: true,
    async incr(key, ttl) {
      const [n] = await run([["INCR", key], ["EXPIRE", key, ttl, "NX"]]);
      return Number(n);
    },
    async get(key) {
      const [v] = await run([["GET", key]]);
      return typeof v === "string" ? v : null;
    },
    async set(key, value, ttl) {
      await run([["SET", key, value, "EX", ttl]]);
    },
    async push(key, value, max, ttl) {
      await run([["LPUSH", key, value], ["LTRIM", key, 0, max - 1], ["EXPIRE", key, ttl]]);
    },
    async list(key, n) {
      const [v] = await run([["LRANGE", key, 0, n - 1]]);
      return Array.isArray(v) ? (v as string[]) : [];
    },
  };
}

function memory(): Kv {
  const vals = new Map<string, { v: string; exp: number }>();
  const lists = new Map<string, { v: string[]; exp: number }>();
  const alive = <T extends { exp: number }>(m: Map<string, T>, k: string) => {
    const e = m.get(k);
    if (e && e.exp < Date.now()) m.delete(k);
    return m.get(k);
  };
  const gc = () => {
    if (vals.size > 20_000) for (const [k, e] of vals) if (e.exp < Date.now()) vals.delete(k);
  };
  return {
    persistent: false,
    async incr(key, ttl) {
      gc();
      const e = alive(vals, key);
      const n = (e ? Number(e.v) : 0) + 1;
      vals.set(key, { v: String(n), exp: e?.exp ?? Date.now() + ttl * 1000 });
      return n;
    },
    async get(key) {
      return alive(vals, key)?.v ?? null;
    },
    async set(key, value, ttl) {
      gc();
      vals.set(key, { v: value, exp: Date.now() + ttl * 1000 });
    },
    async push(key, value, max, ttl) {
      const e = alive(lists, key) ?? { v: [], exp: 0 };
      lists.set(key, { v: [value, ...e.v].slice(0, max), exp: Date.now() + ttl * 1000 });
    },
    async list(key, n) {
      return (alive(lists, key)?.v ?? []).slice(0, n);
    },
  };
}

let kv: Kv | null = null;
export function getKv(): Kv {
  if (kv) return kv;
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  kv = url && token ? upstash(url, token) : memory();
  return kv;
}

/** Для тестов */
export const memoryKv = memory;
