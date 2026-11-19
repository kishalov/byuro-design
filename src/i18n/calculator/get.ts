import "server-only";
import { SERVICE_IDS } from "@/lib/calculator/catalog";
import type { Locale } from "../config";
import { getDict } from "../get";
import type { CalcDict, CalcSource } from "./ru";

const loaders: Record<Locale, () => Promise<{ default: CalcSource }>> = {
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

/* Услуги калькулятора — ровно те, что в разделе «Услуги» сайта: название, описание
   и пункты «Что входит» берутся из основного словаря (services.items), а не дублируются. */
export async function getCalcDict(locale: Locale): Promise<CalcDict> {
  const [src, site] = await Promise.all([loaders[locale]().then((m) => m.default), getDict(locale)]);
  const byId = new Map(site.services.items.map((s) => [s.id, s]));
  const services = Object.fromEntries(
    SERVICE_IDS.map((id) => {
      const s = byId.get(id);
      if (!s) throw new Error(`[calc] услуги «${id}» нет в разделе «Услуги» (${locale})`);
      return [id, { ...src.services[id], title: s.title, short: s.problem, deliverables: [...s.deliverables] }];
    }),
  ) as CalcDict["services"];
  return { ...src, services };
}
