/* Общая схема заявки: одна валидация в браузере и на сервере.
   Ошибки — коды; тексты берутся из словаря текущего языка (form.errors, contactFields.errors). */

import { validateContacts, type ContactErrorCode, type PhoneChecker } from "./contacts/validate";

export type LeadType = "project" | "partner";

export type LeadPayload = {
  type: LeadType;
  locale?: string;
  name: string;
  /** телефон в формате E.164 (+79001234567) */
  phone?: string;
  /** страна, выбранная у телефона (RU, KZ…) */
  phoneCountry?: string;
  /** «можно написать в»: whatsapp, telegram, viber… */
  phoneApps?: string[];
  /** мессенджер/соцсеть и ник без «@» */
  social?: { network: string; handle: string } | null;
  /** старое единое поле «контакт» — принимается от закэшированных версий страницы */
  contact?: string;
  message?: string;
  services?: string[];
  role?: string;
  model?: string;
  consent: boolean;
  website?: string; // honeypot
};

export type ErrorCode = "nameShort" | "nameLong" | "contactEmpty" | "contactInvalid" | "messageLong" | "role" | "consent";
export type LeadErrors = Partial<Record<"name" | "contact" | "message" | "consent" | "role", ErrorCode>> & Partial<Record<"contacts" | "phone" | "social", ContactErrorCode>>;

// старый формат: @ник, email, телефон или ссылка
const legacyContactRe = /^(@[a-z0-9_]{4,32}|[^\s@]+@[^\s@]+\.[^\s@]{2,}|\+?[\d\s()\-]{7,20}|https?:\/\/\S+)$/i;

export function validateLead(p: Partial<LeadPayload>, checkPhone: PhoneChecker): LeadErrors {
  const e: LeadErrors = {};
  const name = (p.name ?? "").trim();
  const len = [...name].length;
  // для китайских/японских имён допустим один иероглиф
  if (len === 0 || (len === 1 && !/[぀-ヿ㐀-鿿]/.test(name))) e.name = "nameShort";
  else if (len > 80) e.name = "nameLong";

  const legacy = (p.contact ?? "").trim();
  if (legacy && !p.phone && !p.social?.handle) {
    if (!legacyContactRe.test(legacy)) e.contact = "contactInvalid";
  } else {
    Object.assign(e, validateContacts({ phone: p.phone, phoneCountry: p.phoneCountry, phoneApps: p.phoneApps, social: p.social }, checkPhone));
  }

  if ((p.message ?? "").length > 2000) e.message = "messageLong";
  if (p.type === "partner" && !p.role) e.role = "role";
  if (!p.consent) e.consent = "consent";
  return e;
}
