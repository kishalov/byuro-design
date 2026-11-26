/* Проверка блока «Как с вами связаться» — одна для формы заявки и для заявки из калькулятора,
   в браузере и на сервере. Проверка номера передаётся снаружи: в браузере модуль телефона
   грузится отдельно, на сервере подключается напрямую. */

import { checkHandle, isNetworkId, isPhoneApp, type NetworkId, type PhoneApp } from "./social";

export type ContactInput = {
  phone?: string; // E.164
  phoneCountry?: string;
  phoneApps?: string[];
  social?: { network?: string; handle?: string } | null;
  email?: string;
};
export type ContactErrorCode = "contactRequired" | "phoneTooShort" | "phoneTooLong" | "phoneInvalid" | "handleInvalid" | "emailInvalid";
export type ContactErrors = Partial<Record<"contacts" | "phone" | "social" | "email", ContactErrorCode>>;
export type PhoneChecker = (e164: string, country?: string) => "phoneTooShort" | "phoneTooLong" | "phoneInvalid" | null;

const str = (v: unknown) => (typeof v === "string" ? v.trim() : undefined);

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validateContacts(c: ContactInput, checkPhone: PhoneChecker, opts: { email?: boolean } = {}): ContactErrors {
  const e: ContactErrors = {};
  const phone = str(c.phone);
  const handle = str(c.social?.handle);
  const email = opts.email ? str(c.email) : undefined;
  if (!phone && !handle && !email) e.contacts = "contactRequired";
  if (phone) {
    const err = checkPhone(phone, c.phoneCountry);
    if (err) e.phone = err;
  }
  if (handle) {
    const net = c.social?.network;
    if (!isNetworkId(net) || checkHandle(net, handle)) e.social = "handleInvalid";
  }
  if (email && (email.length > 254 || !EMAIL_RE.test(email))) e.email = "emailInvalid";
  return e;
}

/** Очистка на сервере: только известные значения */
export function cleanContacts(c: ContactInput): { phone: string | null; phoneCountry: string | null; phoneApps: PhoneApp[]; social: { network: NetworkId; handle: string } | null } {
  const phone = str(c.phone) || null;
  const net = c.social?.network;
  const handle = str(c.social?.handle);
  return {
    phone,
    phoneCountry: phone && typeof c.phoneCountry === "string" && /^[A-Z]{2}$/.test(c.phoneCountry) ? c.phoneCountry : null,
    phoneApps: phone && Array.isArray(c.phoneApps) ? [...new Set(c.phoneApps.filter(isPhoneApp))] : [],
    social: handle && isNetworkId(net) ? { network: net, handle } : null,
  };
}
