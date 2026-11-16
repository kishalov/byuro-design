import "server-only";
import type { Locale } from "./config";
import type { Dict } from "./dictionaries/ru";

/* Словари грузятся на сервере; в браузер уходят только нужные фрагменты
   (через пропсы клиентских компонентов), а не все 9 языков. */
const loaders: Record<Locale, () => Promise<{ default: Dict }>> = {
  ru: () => import("./dictionaries/ru"),
  en: () => import("./dictionaries/en"),
  de: () => import("./dictionaries/de"),
  fr: () => import("./dictionaries/fr"),
  es: () => import("./dictionaries/es"),
  sr: () => import("./dictionaries/sr"),
  hi: () => import("./dictionaries/hi"),
  "zh-cn": () => import("./dictionaries/zh-cn"),
  ja: () => import("./dictionaries/ja"),
};

export async function getDict(locale: Locale): Promise<Dict> {
  return (await loaders[locale]()).default;
}
