/* Общая схема заявки: одна валидация в браузере и на сервере.
   Ошибки — коды; тексты берутся из словаря текущего языка (form.errors). */

export type LeadType = "project" | "partner";

export type LeadPayload = {
  type: LeadType;
  locale?: string;
  name: string;
  contact: string;
  message?: string;
  services?: string[];
  role?: string;
  model?: string;
  consent: boolean;
  website?: string; // honeypot
};

export type ErrorCode = "nameShort" | "nameLong" | "contactEmpty" | "contactInvalid" | "messageLong" | "role" | "consent";
export type LeadErrors = Partial<Record<"name" | "contact" | "message" | "consent" | "role", ErrorCode>>;

// @ник, email, телефон (в т.ч. +91, +86, +81) или ссылка
const contactRe = /^(@[a-z0-9_]{4,32}|[^\s@]+@[^\s@]+\.[^\s@]{2,}|\+?[\d\s()\-]{7,20}|https?:\/\/\S+)$/i;

export function validateLead(p: Partial<LeadPayload>): LeadErrors {
  const e: LeadErrors = {};
  const name = (p.name ?? "").trim();
  const contact = (p.contact ?? "").trim();
  const len = [...name].length;
  // для китайских/японских имён допустим один иероглиф
  if (len === 0 || (len === 1 && !/[぀-ヿ㐀-鿿]/.test(name))) e.name = "nameShort";
  else if ([...name].length > 80) e.name = "nameLong";
  if (!contact) e.contact = "contactEmpty";
  else if (!contactRe.test(contact)) e.contact = "contactInvalid";
  if ((p.message ?? "").length > 2000) e.message = "messageLong";
  if (p.type === "partner" && !p.role) e.role = "role";
  if (!p.consent) e.consent = "consent";
  return e;
}
