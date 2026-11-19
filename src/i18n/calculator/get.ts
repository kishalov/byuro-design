import "server-only";
import type { Locale } from "../config";
import type { CalcDict } from "./ru";

const loaders: Record<Locale, () => Promise<{ default: CalcDict }>> = {
  ru: () => import("./ru"),
  en: () => import("./en"),
  de: () => import("./de"),
  fr: () => import("./fr"),
  es: () => import("./es"),
  sr: () => import("./sr"),
  hi: () => import("./hi"),
  "zh-cn": () => import("./zh-cn"),
  ja: () => import("./ja"),
};

export async function getCalcDict(locale: Locale): Promise<CalcDict> {
  return (await loaders[locale]()).default;
}
