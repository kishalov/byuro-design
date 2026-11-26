import "server-only";
/* Контакты в сообщениях команде (Telegram): международный формат номера, страна,
   ссылки «написать» и ссылка на профиль. */

import { formatInternational } from "./phone";
import { NETWORKS, PHONE_APP_LABEL, displayHandle, profileUrl, type NetworkId, type PhoneApp } from "./social";

const countryRu = (cc: string | null | undefined) => {
  if (!cc) return "";
  try {
    return new Intl.DisplayNames(["ru"], { type: "region" }).of(cc) ?? cc;
  } catch {
    return cc;
  }
};

/** Ссылка «написать» по номеру — только для мессенджеров, у которых она есть */
export function appLink(app: PhoneApp, e164: string): string | null {
  const d = e164.replace(/\D/g, "");
  if (app === "whatsapp") return `https://wa.me/${d}`;
  if (app === "telegram") return `https://t.me/+${d}`;
  return null;
}

/** «+7 900 123-45-67 (Россия)» */
export const phoneLine = (e164: string, country?: string | null) => `${formatInternational(e164)}${country ? ` (${countryRu(country)})` : ""}`;
export const appsLine = (apps: PhoneApp[]) => apps.map((a) => PHONE_APP_LABEL[a]).join(", ");
export const socialLine = (network: NetworkId, handle: string) => {
  const url = profileUrl(network, handle);
  return { label: NETWORKS[network].label, text: displayHandle(network, handle), url };
};
