import "server-only";
import type { Locale } from "@/i18n/config";
import type { Quote, Selection } from "../calculator/engine";
import type { NormalizedContacts } from "./schema";
import { memoryStore, type BriefStore } from "./dedupe";
import { telegramConfig, telegramTransport } from "./transports/telegram";

/* Доставка брифов команде.

   Сейчас подключён Telegram: тот же бот и чат, что и у форм сайта
   (TELEGRAM_BOT_TOKEN и TELEGRAM_CHAT_ID, см. transports/telegram.ts).
   Если переменные не заданы, получателей нет: /api/brief отвечает 503 (not_configured),
   а на странице кнопка отправки неактивна с пояснением. Успех не имитируется.

   Другой канал (email, CRM) — ещё один BriefTransport в getTransports(). */

export type BriefRecord = {
  version: 1;
  briefId: string;
  calcId: string;
  idempotencyKey: string;
  createdAt: string; // ISO, UTC
  timeZone: string | null;
  locale: Locale;
  client: {
    name: string;
    phone: string | null; // как ввёл клиент
    telegram: string | null;
    email: string | null;
    normalized: NormalizedContacts;
    /** хэши нормализованных контактов — для поиска повторных обращений */
    keys: string[];
  };
  project: {
    projectName: string | null;
    company: string | null;
    description: string | null;
    deadline: string | null;
    links: string[];
    comment: string | null;
  };
  calculation: {
    selection: Selection;
    /** пересчитано на сервере — суммы из браузера не принимаются */
    quote: Quote;
    signature: string;
  };
  fingerprint: string;
  repeat: {
    /** false — постоянного хранилища нет, история клиента не проверялась */
    checked: boolean;
    isRepeatClient: boolean | null;
    previousBriefIds: string[];
  };
};

export interface BriefTransport {
  name: string;
  /** textRu — готовый текст брифа на русском для команды; при неудаче — throw */
  send(record: BriefRecord, textRu: string): Promise<void>;
}

/** Получатели определяются по переменным окружения в момент запроса */
function getTransports(): BriefTransport[] {
  return [...(telegramConfig() ? [telegramTransport] : [])];
}

export const isBriefDeliveryConfigured = () => getTransports().length > 0;

/** Отправляет всем получателям. Успех — если доставил хотя бы один. */
export async function deliverBrief(record: BriefRecord, textRu: string): Promise<{ delivered: string[]; failed: string[] }> {
  const delivered: string[] = [];
  const failed: string[] = [];
  await Promise.all(
    getTransports().map(async (tr) => {
      try {
        await tr.send(record, textRu);
        delivered.push(tr.name);
      } catch (e) {
        console.error(`[brief] ${tr.name} failed`, e);
        failed.push(tr.name);
      }
    }),
  );
  return { delivered, failed };
}

/* Хранилище заявок. Постоянного на сайте пока нет — используется память процесса,
   которой хватает только для защиты от повторной отправки одного запроса.
   Подключите постоянную реализацию BriefStore (например, Vercel KV/Postgres) здесь. */
let store: BriefStore | null = null;
export function getBriefStore(): BriefStore {
  store ??= memoryStore();
  return store;
}
