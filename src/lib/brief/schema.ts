/* Бриф из калькулятора: схема, нормализация контактов и валидация.
   Один код для браузера и сервера. Ошибки — коды, тексты берутся из словаря
   калькулятора (brief.errors) на языке посетителя. */

import type { Selection } from "../calculator/engine";
import { validateContacts, type ContactErrorCode, type PhoneChecker } from "../contacts/validate";

/** Что браузер присылает на /api/brief. Сумм здесь нет: сервер считает их сам по selection. */
export type BriefRequest = {
  /** новая для каждой попытки отправки (UUID v4) — защита от двойного нажатия и повторов */
  idempotencyKey: string;
  calcId: string;
  locale: string;
  timeZone?: string;
  selection: Selection;
  projectName?: string;
  name: string;
  /** E.164 (+79001234567) */
  phone?: string;
  phoneCountry?: string;
  phoneApps?: string[];
  /** мессенджер/соцсеть и ник без «@» */
  social?: { network: string; handle: string } | null;
  /** старое поле — принимается от закэшированных версий страницы */
  telegram?: string;
  email?: string;
  company?: string;
  description?: string;
  deadline?: string;
  links?: string;
  comment?: string;
  consent: boolean;
  /** honeypot: люди это поле не видят */
  website?: string;
};

export const LIMITS = {
  name: 80,
  projectName: 120,
  phone: 32,
  telegram: 64,
  email: 254,
  company: 160,
  description: 3000,
  deadline: 160,
  links: 3000,
  comment: 3000,
} as const;

export type BriefField = "name" | "contacts" | "phone" | "social" | "telegram" | "email" | "company" | "description" | "deadline" | "links" | "comment" | "projectName" | "consent";
export type BriefErrorCode = "nameShort" | "nameLong" | ContactErrorCode | "telegramInvalid" | "tooLong" | "consent";
export type BriefErrors = Partial<Record<BriefField, BriefErrorCode>>;

/* ── Нормализация ─────────────────────────────────────────
   Нужна, чтобы «+7 (900) 000-00-00», «89000000000» и «+79000000000» считались
   одним и тем же контактом при поиске повторных обращений. */

/** Телефон → E.164-подобная строка «+цифры». null — не похоже на телефон. */
export function normalizePhone(raw: string | undefined): string | null {
  const s = (raw ?? "").trim();
  if (!s) return null;
  if (/[^\d\s()+\-.]/.test(s)) return null;
  let digits = s.replace(/\D/g, "");
  const plus = s.startsWith("+");
  if (!plus && digits.startsWith("00")) digits = digits.slice(2); // 00 — международный префикс
  else if (!plus && digits.length === 11 && digits.startsWith("8")) digits = `7${digits.slice(1)}`; // 8XXX… — российский формат
  if (digits.length < 7 || digits.length > 15) return null;
  return `+${digits}`;
}

/** Email → нижний регистр без пробелов. null — некорректный. */
export function normalizeEmail(raw: string | undefined): string | null {
  const s = (raw ?? "").trim().toLowerCase();
  if (!s) return null;
  if (s.length > LIMITS.email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s)) return null;
  return s;
}

/** Telegram: «@Name», «name», «t.me/name», «https://t.me/name» → «name». null — некорректный. */
export function normalizeTelegram(raw: string | undefined): string | null {
  let s = (raw ?? "").trim();
  if (!s) return null;
  s = s.replace(/^https?:\/\//i, "").replace(/^(www\.)?(t|telegram)\.me\//i, "").replace(/^@/, "").replace(/\/+$/, "");
  if (!/^[a-z][a-z0-9_]{4,31}$/i.test(s)) return null;
  return s.toLowerCase();
}

/** Ссылки из текстового поля: только http(s), без дублей, не больше 20 */
export function extractLinks(raw: string | undefined): string[] {
  const found = (raw ?? "").match(/https?:\/\/[^\s<>"']+/gi) ?? [];
  return [...new Set(found.map((u) => u.replace(/[),.;]+$/, "")))].slice(0, 20);
}

export type NormalizedContacts = { phone: string | null; telegram: string | null; email: string | null };

export function normalizeContacts(p: Pick<BriefRequest, "phone" | "telegram" | "email" | "social">): NormalizedContacts {
  const tg = p.social?.network === "telegram" ? p.social.handle : p.telegram;
  return { phone: normalizePhone(p.phone), telegram: normalizeTelegram(tg), email: normalizeEmail(p.email) };
}

const len = (v: string | undefined) => [...(v ?? "")].length;

/** checkPhone — проверка номера по правилам страны (libphonenumber); в браузере грузится отдельно */
export function validateBrief(p: Partial<BriefRequest>, checkPhone: PhoneChecker): BriefErrors {
  const e: BriefErrors = {};
  const name = (p.name ?? "").trim();
  const n = len(name);
  if (n === 0 || (n === 1 && !/[぀-ヿ㐀-鿿]/.test(name))) e.name = "nameShort";
  else if (n > LIMITS.name) e.name = "nameLong";

  const legacyTg = !!p.telegram?.trim() && !p.social?.handle;
  Object.assign(e, validateContacts({ phone: p.phone, phoneCountry: p.phoneCountry, phoneApps: p.phoneApps, social: p.social, email: p.email }, checkPhone, { email: true }));
  if (legacyTg) {
    delete e.contacts;
    if (len(p.telegram) > LIMITS.telegram || !normalizeTelegram(p.telegram)) e.telegram = "telegramInvalid";
  }
  if (p.phone && len(p.phone) > LIMITS.phone) e.phone = "phoneInvalid";

  for (const k of ["company", "description", "deadline", "links", "comment", "projectName"] as const) {
    if (len(p[k]) > LIMITS[k]) e[k] = "tooLong";
  }
  if (p.consent !== true) e.consent = "consent";
  return e;
}
