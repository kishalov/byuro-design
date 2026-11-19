import "server-only";
import type { Locale } from "@/i18n/config";
import type { Quote, Selection } from "../calculator/engine";
import type { NormalizedContacts } from "./schema";
import { memoryStore, type BriefStore } from "./dedupe";

/* Доставка брифов команде.

   СЕЙЧАС ПОЛУЧАТЕЛЕЙ НЕТ: список transports пуст, поэтому /api/brief отвечает 503
   (not_configured), а на странице кнопка отправки неактивна с пояснением.
   Успешная отправка не имитируется.

   Как подключить Telegram (или любой другой канал) на следующем этапе:
   1. Создайте transports/telegram.ts, реализующий BriefTransport:
        export const telegramTransport: BriefTransport = {
          name: "telegram",
          async send(record, textRu) {
            // fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, …) с textRu,
            // экранированным под parse_mode; при ошибке — throw
          },
        };
   2. Добавьте его в массив transports ниже (например, только если заданы переменные окружения).
   Больше ничего менять не нужно: страница сама включит кнопку (isBriefDeliveryConfigured),
   а структура заявки — BriefRecord. Существующий /api/lead и его бот не затрагиваются. */

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

const transports: BriefTransport[] = [];

export const isBriefDeliveryConfigured = () => transports.length > 0;

/** Отправляет всем получателям. Успех — если доставил хотя бы один. */
export async function deliverBrief(record: BriefRecord, textRu: string): Promise<{ delivered: string[]; failed: string[] }> {
  const delivered: string[] = [];
  const failed: string[] = [];
  await Promise.all(
    transports.map(async (tr) => {
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
