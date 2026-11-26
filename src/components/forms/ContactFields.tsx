"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Locale } from "@/i18n/config";
import type { Dict } from "@/i18n/dictionaries/ru";
import { fmt } from "@/i18n/format";
import { cn } from "@/lib/cn";
import { POPULAR, defaultCountry, flagEmoji } from "@/lib/contacts/countries";
import { NETWORKS, PHONE_APP_LABEL, networksFor, parseHandleInput, phoneAppsFor, type NetworkId, type PhoneApp } from "@/lib/contacts/social";
import type { ContactErrors } from "@/lib/contacts/validate";
import { Icon } from "../ui/Icon";
import { Picker, type PickerOption } from "./Picker";

/* Блок «Как с вами связаться» — общий для формы заявки и заявки из калькулятора.
   Телефон: страна (поиск по названию и коду, флаг), номер форматируется по правилам страны,
   «+44…», «8 900…», «0044…» распознаются сами. Под номером — «можно написать в WhatsApp/Telegram…».
   Мессенджер: список сетей и поле ника; «@» или «vk.com/» стоят сами, вставленная ссылка
   (https://t.me/name, instagram.com/name) превращается в ник и переключает сеть. */

export type PhoneLib = typeof import("@/lib/contacts/phone");
let libPromise: Promise<PhoneLib> | null = null;
/** Модуль телефона (~40 КБ) грузится отдельно — только на страницах с формой */
export const loadPhoneLib = () => (libPromise ??= import("@/lib/contacts/phone"));

export type ContactValue = {
  country: string;
  digits: string;
  apps: PhoneApp[];
  network: NetworkId;
  handle: string;
  email: string;
  /** страну выбрал сам посетитель — не подменять определённой по браузеру */
  countryTouched?: boolean;
};

export const emptyContact = (locale: Locale): ContactValue => ({ country: POPULAR[locale][0], digits: "", apps: [], network: networksFor(locale)[0], handle: "", email: "" });

/** Что уходит на сервер */
export function contactPayload(v: ContactValue, lib: PhoneLib | null) {
  const country = lib?.isCountry(v.country) ? v.country : undefined;
  const phone = v.digits && country && lib ? lib.toE164(country, v.digits) : undefined;
  return {
    phone,
    phoneCountry: phone ? v.country : undefined,
    phoneApps: phone ? v.apps : [],
    social: v.handle.trim() ? { network: v.network, handle: v.handle.trim() } : null,
    email: v.email.trim() || undefined,
  };
}

/** Текст ошибки с подстановкой примера номера / правил ника */
export function contactErrorText(t: Dict["contactFields"], code: string | undefined, v: ContactValue, lib: PhoneLib | null): string | undefined {
  if (!code) return undefined;
  const msg = t.errors[code as keyof Dict["contactFields"]["errors"]];
  if (!msg) return undefined;
  if (code === "handleInvalid") {
    const n = NETWORKS[v.network];
    return fmt(msg, { network: n.label, rule: fmt(t.rules[n.charset], { min: n.min, max: n.max }) });
  }
  if (code.startsWith("phone")) {
    const ex = lib && lib.isCountry(v.country) ? lib.exampleNumber(v.country) : "";
    const cc = lib && lib.isCountry(v.country) ? `+${lib.callingCode(v.country)} ` : "";
    return fmt(msg, { example: ex ? `${cc}${ex}` : "" }).replace(/[:—–-]\s*$/, "");
  }
  return msg;
}

/* ── Флаги: эмодзи, а где система их не рисует (Windows) — код страны ── */
let flagSupport: boolean | null = null;
function supportsFlags(): boolean {
  if (flagSupport !== null) return flagSupport;
  try {
    const c = document.createElement("canvas");
    c.width = c.height = 20;
    const ctx = c.getContext("2d", { willReadFrequently: true })!;
    ctx.font = "16px sans-serif";
    ctx.textBaseline = "top";
    ctx.fillText("\u{1F1FA}\u{1F1F8}", 0, 0);
    const d = ctx.getImageData(0, 0, 20, 20).data;
    flagSupport = false;
    for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 0 && (Math.abs(d[i] - d[i + 1]) > 20 || Math.abs(d[i + 1] - d[i + 2]) > 20)) flagSupport = true;
  } catch {
    flagSupport = false;
  }
  return flagSupport;
}
function Flag({ cc, emoji }: { cc: string; emoji: boolean }) {
  return emoji ? (
    <span aria-hidden="true" className="w-6 shrink-0 text-center text-[20px] leading-none">
      {flagEmoji(cc)}
    </span>
  ) : (
    <span aria-hidden="true" className="w-7 shrink-0 rounded-md bg-sand py-0.5 text-center font-mono text-[11px] font-semibold">
      {cc}
    </span>
  );
}

const boxCls = (invalid: boolean) =>
  cn(
    "field-box flex min-h-[52px] w-full items-stretch rounded-2xl border-2 bg-white transition-colors focus-within:border-ink",
    invalid ? "border-error" : "border-ink/20 hover:border-ink/50",
  );
const innerInput = "min-w-0 flex-1 bg-transparent px-3 text-base text-ink placeholder:text-stone-ink/70 focus:outline-none focus-visible:outline-none";

export function ContactFields({
  locale,
  t,
  value,
  onChange,
  errors,
  idPrefix,
  withEmail,
  emailLabel,
  emailPh,
}: {
  locale: Locale;
  t: Dict["contactFields"];
  value: ContactValue;
  onChange: (v: ContactValue) => void;
  errors: ContactErrors;
  idPrefix: string;
  withEmail?: boolean;
  emailLabel?: string;
  emailPh?: string;
}) {
  const [lib, setLib] = useState<PhoneLib | null>(null);
  const [emoji, setEmoji] = useState(true);
  const phoneInput = useRef<HTMLInputElement>(null);
  const handleInput = useRef<HTMLInputElement>(null);
  const caret = useRef<number | null>(null);
  // набор международного номера: пока код страны не набран целиком («+», «+38»), показываем как есть
  const [intl, setIntl] = useState<string | null>(null);
  const v = value;
  const set = (patch: Partial<ContactValue>) => onChange({ ...v, ...patch });

  useEffect(() => {
    let alive = true;
    loadPhoneLib().then((m) => alive && setLib(m));
    setEmoji(supportsFlags());
    return () => {
      alive = false;
    };
  }, []);

  // Страна по языку браузера (ru-KZ → Казахстан), если посетитель ещё не выбирал сам
  useEffect(() => {
    if (!lib || v.countryTouched || v.digits) return;
    const c = defaultCountry(locale, lib.isCountry);
    if (c !== v.country) set({ country: c });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lib]);

  const countryOptions = useMemo<PickerOption[]>(() => {
    if (!lib) return [];
    let names: Intl.DisplayNames | null = null;
    let en: Intl.DisplayNames | null = null;
    try {
      names = new Intl.DisplayNames([locale], { type: "region" });
      en = new Intl.DisplayNames(["en"], { type: "region" });
    } catch {
      /* старый браузер — покажем коды */
    }
    const coll = new Intl.Collator(locale);
    return lib
      .countries()
      .map((cc) => {
        const name = names?.of(cc) ?? cc;
        const code = lib.callingCode(cc);
        return { value: cc, label: name, hint: `+${code}`, leading: <Flag cc={cc} emoji={emoji} />, keywords: `${cc} ${en?.of(cc) ?? ""} ${code}` };
      })
      .sort((a, b) => coll.compare(a.label, b.label));
  }, [lib, locale, emoji]);
  const countryGroups = useMemo(() => {
    const known = new Set(countryOptions.map((o) => o.value));
    return [
      { title: t.popular, values: POPULAR[locale].filter((c) => known.has(c)) },
      { title: t.allCountries, values: countryOptions.map((o) => o.value) },
    ];
  }, [countryOptions, locale, t]);

  const nets = networksFor(locale);
  const netOptions = useMemo<PickerOption[]>(() => nets.map((id) => ({ value: id, label: NETWORKS[id].label, hint: NETWORKS[id].prefix || undefined })), [nets]);
  const net = NETWORKS[v.network];

  const country = lib?.isCountry(v.country) ? v.country : null;
  const display = intl ?? (country && lib ? lib.formatNational(country, v.digits) : v.digits);
  const example = country && lib ? lib.exampleNumber(country) : "";
  const code = country && lib ? `+${lib.callingCode(country)}` : "";
  const countryName = countryOptions.find((o) => o.value === v.country)?.label ?? v.country;

  // Курсор после форматирования: ставим после того же числа цифр
  useEffect(() => {
    const el = phoneInput.current;
    if (caret.current === null || !el || document.activeElement !== el) return;
    let n = caret.current;
    let pos = 0;
    while (pos < display.length && n > 0) {
      if (/\d/.test(display[pos])) n -= 1;
      pos += 1;
    }
    el.setSelectionRange(pos, pos);
    caret.current = null;
  }, [display]);

  const onPhone = (raw: string, el: HTMLInputElement) => {
    if (!lib || !country) {
      set({ digits: raw.replace(/\D/g, "").slice(0, 17) });
      return;
    }
    if (raw.trim().startsWith("+") && !lib.callingCodeOf(raw)) {
      setIntl(raw.replace(/[^\d+\s]/g, "").slice(0, 6));
      set({ digits: "" });
      return;
    }
    setIntl(null);
    const pos = el.selectionStart ?? raw.length;
    const atEnd = pos >= raw.length;
    let digitsBefore = raw.slice(0, pos).replace(/\D/g, "").length;
    let r = lib.interpretInput(raw, country);
    // стёрли пробел/дефис — значит, хотели стереть цифру перед ним
    if (r.country === country && r.digits === v.digits && raw.length < display.length && digitsBefore > 0 && !raw.startsWith("+")) {
      const d = v.digits;
      r = { country, digits: d.slice(0, digitsBefore - 1) + d.slice(digitsBefore) };
      digitsBefore -= 1;
    }
    caret.current = atEnd || r.country !== country || raw.trim().startsWith("+") ? Number.MAX_SAFE_INTEGER : digitsBefore;
    set({ digits: r.digits, country: r.country, countryTouched: v.countryTouched || r.country !== country });
  };

  const onHandle = (raw: string) => {
    const r = parseHandleInput(raw, v.network);
    set({ network: r.network, handle: r.handle });
  };

  const fid = (k: string) => `${idPrefix}-${k}`;
  const err = (k: keyof ContactErrors) => contactErrorText(t, k === "contacts" && withEmail && errors[k] === "contactRequired" ? "contactRequiredEmail" : errors[k], v, lib);
  const contactsErr = err("contacts");
  const apps = phoneAppsFor(locale);

  return (
    <fieldset aria-describedby={`${fid("contacts")}-hint${contactsErr ? ` ${fid("contacts")}-err` : ""}`}>
      <legend className="text-[15px] font-semibold">{t.legend}</legend>
      <p id={`${fid("contacts")}-hint`} className="t-small mt-1 text-stone-ink">
        {withEmail ? t.hintWithEmail : t.hint}
      </p>

      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        {/* Телефон */}
        <div>
          <label htmlFor={fid("phone")} className="mb-2 block text-[14px] font-medium text-ink/80">
            {t.phone}
          </label>
          <div className={boxCls(!!err("phone") || !!contactsErr)}>
            <Picker
              label={t.country}
              value={v.country}
              options={countryOptions}
              groups={countryGroups}
              searchable
              searchPlaceholder={t.countrySearch}
              notFound={t.notFound}
              onChange={(c) => {
                set({ country: c, countryTouched: true });
                requestAnimationFrame(() => phoneInput.current?.focus());
              }}
              buttonClass="h-full rounded-l-[14px] border-r-2 border-ink/10 pr-2 pl-3 hover:bg-sand/60"
              button={
                <>
                  <Flag cc={v.country} emoji={emoji} />
                  <span className="font-mono text-[14px] font-semibold tabular-nums">{code || "+"}</span>
                  <span className="sr-only">{countryName}</span>
                </>
              }
            />
            <input
              ref={phoneInput}
              id={fid("phone")}
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={display}
              onChange={(e) => onPhone(e.target.value, e.target)}
              placeholder={example || t.phonePh}
              aria-invalid={!!err("phone") || !!contactsErr}
              aria-describedby={err("phone") ? `${fid("phone")}-err` : undefined}
              className={cn(innerInput, "tabular-nums")}
            />
          </div>
          {err("phone") && <ErrorText id={`${fid("phone")}-err`}>{err("phone")}</ErrorText>}
          {v.digits.length > 0 && (
            <fieldset className="mt-2.5">
              <legend className="t-small mb-1.5 text-stone-ink">{t.apps}</legend>
              <div className="flex flex-wrap gap-1.5">
                {apps.map((a) => {
                  const on = v.apps.includes(a);
                  return (
                    <button
                      key={a}
                      type="button"
                      aria-pressed={on}
                      onClick={() => set({ apps: on ? v.apps.filter((x) => x !== a) : [...v.apps, a] })}
                      className={cn("inline-flex min-h-9 items-center gap-1.5 rounded-pill border-2 px-3 text-[14px] font-medium transition-colors", on ? "border-ink bg-ink text-paper" : "border-ink/15 bg-white hover:border-ink/40")}
                    >
                      {on && <Icon name="check" size={14} />}
                      {PHONE_APP_LABEL[a]}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          )}
        </div>

        {/* Мессенджер / соцсеть */}
        <div>
          <label htmlFor={fid("handle")} className="mb-2 block text-[14px] font-medium text-ink/80">
            {t.social}
          </label>
          <div className={boxCls(!!err("social") || !!contactsErr)}>
            <Picker
              label={t.network}
              value={v.network}
              options={netOptions}
              onChange={(n) => {
                set({ network: n as NetworkId });
                requestAnimationFrame(() => handleInput.current?.focus());
              }}
              buttonClass="h-full whitespace-nowrap rounded-l-[14px] border-r-2 border-ink/10 pr-2 pl-3.5 text-[15px] font-semibold hover:bg-sand/60"
              button={<span>{net.label}</span>}
            />
            {net.prefix && (
              <span aria-hidden="true" onClick={() => handleInput.current?.focus()} className={cn("flex shrink-0 cursor-text items-center pl-3 text-base text-stone-ink select-none", net.prefix.length > 2 && "max-w-[42%] truncate text-[14px]")}>
                {net.prefix}
              </span>
            )}
            <input
              ref={handleInput}
              id={fid("handle")}
              name="handle"
              autoComplete="off"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="next"
              value={v.handle}
              onChange={(e) => onHandle(e.target.value)}
              placeholder={net.placeholder}
              aria-label={fmt(t.handle, { network: net.label })}
              aria-invalid={!!err("social") || !!contactsErr}
              aria-describedby={err("social") ? `${fid("handle")}-err` : undefined}
              className={cn(innerInput, net.prefix && "pl-0.5")}
            />
          </div>
          {err("social") && <ErrorText id={`${fid("handle")}-err`}>{err("social")}</ErrorText>}
        </div>

        {withEmail && (
          <div className="sm:col-span-2">
            <label htmlFor={fid("email")} className="mb-2 block text-[14px] font-medium text-ink/80">
              {emailLabel}
            </label>
            <input
              id={fid("email")}
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              value={v.email}
              onChange={(e) => set({ email: e.target.value.replace(/\s/g, "") })}
              placeholder={emailPh}
              aria-invalid={!!err("email") || !!contactsErr}
              aria-describedby={err("email") ? `${fid("email")}-err` : undefined}
              className={cn(boxCls(!!err("email") || !!contactsErr).replace("field-box ", ""), "px-4 text-base placeholder:text-stone-ink/70 focus:outline-none")}
            />
            {err("email") && <ErrorText id={`${fid("email")}-err`}>{err("email")}</ErrorText>}
          </div>
        )}
      </div>
      {contactsErr && <ErrorText id={`${fid("contacts")}-err`}>{contactsErr}</ErrorText>}
    </fieldset>
  );
}

function ErrorText({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <p id={id} className="t-small mt-1.5 flex items-start gap-1.5 font-medium text-error">
      <Icon name="alert" size={16} className="mt-0.5 shrink-0" />
      {children}
    </p>
  );
}
