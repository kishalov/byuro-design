/* Телефон: разбор, формат «как набирают в этой стране», проверка по правилам страны.
   Обёртка над libphonenumber-js (полные метаданные — точная проверка длины и кодов операторов).
   В браузере модуль грузится отдельно (dynamic import), только когда на странице есть форма;
   на сервере тот же код проверяет номер ещё раз. */

import { AsYouType, getCountries, getCountryCallingCode, getExampleNumber, parsePhoneNumberFromString, validatePhoneNumberLength, type CountryCode } from "libphonenumber-js/max";
import examples from "libphonenumber-js/mobile/examples";

export type { CountryCode };
export type PhoneError = "phoneTooShort" | "phoneTooLong" | "phoneInvalid";

const ALL = new Set<string>(getCountries());
export const isCountry = (v: unknown): v is CountryCode => typeof v === "string" && ALL.has(v);
export const countries = (): CountryCode[] => getCountries();
export const callingCode = (c: CountryCode) => getCountryCallingCode(c);

const onlyDigits = (s: string) => s.replace(/\D/g, "");
const MAX_DIGITS = 17;

/** Номер в международном виде без кода страны: «900 123-45-67» для +7, «7911 123456» для +44 */
export function formatNational(country: CountryCode, digits: string): string {
  if (!digits) return "";
  const cc = callingCode(country);
  const intl = new AsYouType().input(`+${cc}${digits}`);
  return intl.startsWith(`+${cc}`) ? intl.slice(cc.length + 1).trim() : digits;
}

/** Пример номера для подсказки: «912 345-67-89» */
export function exampleNumber(country: CountryCode): string {
  const ex = getExampleNumber(country, examples);
  return ex ? formatNational(country, ex.nationalNumber) : "";
}

/** E.164: «+79001234567» */
export function toE164(country: CountryCode, digits: string): string {
  return parsePhoneNumberFromString(digits, country)?.number ?? `+${callingCode(country)}${digits}`;
}

/** Код страны, «главной» для кода (+1 → US, +7 → RU, +44 → GB) */
function mainCountry(code: string, fallback: CountryCode): CountryCode {
  const main: Record<string, CountryCode> = { "1": "US", "7": "RU", "44": "GB", "39": "IT", "47": "NO", "61": "AU", "358": "FI", "590": "GP", "262": "RE", "212": "MA", "599": "CW" };
  if (main[code]) return main[code];
  return getCountries().find((c) => getCountryCallingCode(c) === code) ?? fallback;
}

/** Разбор очередного ввода в поле номера.
    — «+44 7911…» или «0044…» — переключает страну по коду (если код другой);
    — «8 900 123-45-67» в России, «0 30 …» в Германии — убирает национальный префикс, когда номер набран целиком;
    — возвращает только цифры номера без кода страны. */
export function interpretInput(raw: string, country: CountryCode): { country: CountryCode; digits: string } {
  const s = raw.trim();
  if (s.startsWith("+")) {
    const ayt = new AsYouType();
    ayt.input(`+${onlyDigits(s)}`.slice(0, MAX_DIGITS + 1));
    const code = ayt.getCallingCode();
    if (!code) return { country, digits: "" };
    const num = ayt.getNumber();
    // номер набран целиком и однозначно относится к стране — выбираем её (в т. ч. +7 701… → Казахстан)
    const next = num?.isValid() && num.country ? num.country : code === callingCode(country) ? country : mainCountry(code, country);
    return { country: next, digits: onlyDigits(s).slice(code.length, code.length + MAX_DIGITS) };
  }
  let digits = onlyDigits(s).slice(0, MAX_DIGITS);
  if (!digits) return { country, digits };
  const p = parsePhoneNumberFromString(digits, country);
  if (p && p.isValid()) {
    const next = p.country ?? (p.countryCallingCode === callingCode(country) ? country : mainCountry(p.countryCallingCode, country));
    if (next !== country || p.nationalNumber !== digits) return { country: next, digits: p.nationalNumber };
  }
  // «00» / «810» — международный выход: 0044… → +44…
  const idd = digits.match(/^(00|810|011)(\d{6,})$/);
  if (idd) return interpretInput(`+${idd[2]}`, country);
  digits = digits.slice(0, MAX_DIGITS);
  return { country, digits };
}

/** Код страны из начала международного номера («+381…» → «381»), null — ещё не набран целиком */
export function callingCodeOf(raw: string): string | null {
  const ayt = new AsYouType();
  ayt.input(`+${onlyDigits(raw)}`);
  return ayt.getCallingCode() ?? null;
}

/** Проверка номера в формате E.164 (страна — та, что выбрана в поле) */
export function checkPhone(e164: string, country?: string): PhoneError | null {
  if (!/^\+\d{4,17}$/.test(e164)) return "phoneInvalid";
  const len = validatePhoneNumberLength(e164);
  if (len === "TOO_SHORT" || len === "NOT_A_NUMBER") return "phoneTooShort";
  if (len === "TOO_LONG") return "phoneTooLong";
  const p = parsePhoneNumberFromString(e164);
  if (!p || !p.isValid()) {
    if (len === "INVALID_LENGTH" && p?.country) {
      // длина «между» допустимыми — подскажем по примеру номера, чего не хватает или что лишнее
      const ex = getExampleNumber(p.country, examples)?.nationalNumber.length ?? 0;
      return p.nationalNumber.length > ex ? "phoneTooLong" : "phoneTooShort";
    }
    return "phoneInvalid";
  }
  if (country && isCountry(country) && p.countryCallingCode !== callingCode(country)) return "phoneInvalid";
  return null;
}

/** Для сообщений команде: «+7 900 123-45-67» */
export function formatInternational(e164: string): string {
  return parsePhoneNumberFromString(e164)?.formatInternational() ?? e164;
}
