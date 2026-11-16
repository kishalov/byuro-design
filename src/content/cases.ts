import type { Dict } from "@/i18n/dictionaries/ru";
import type { CaseCategory, CaseCover, CaseMedia, CooperationFormat, Img, Industry } from "./types";

/* Реальные работы студии. Тексты — в словарях (dict.cases.items[slug]).
   Формат сотрудничества и результаты не указаны: данных пока нет,
   поэтому на сайте они не выводятся (не придумываем). */

export type TagKey = keyof Dict["cases"]["tags"];
export type CaseSlug = keyof Dict["cases"]["items"];

export type CaseBase = {
  slug: CaseSlug;
  category: CaseCategory;
  industry?: Industry;
  format?: CooperationFormat;
  tags: TagKey[];
  /** Только подтверждённые результаты; null — честная заглушка */
  results: { value: string; labelKey: string }[] | null;
  cover: CaseCover;
  gallery: CaseMedia[];
  layout: "grid" | "stack" | "slides" | "bento" | "duo" | "reel";
};

const img = (base: string, w: number, h: number, widths: number[]): Img => ({ base, w, h, widths });
const ads = [1, 2, 3, 4].map((i) => img(`ads-${i}`, i < 3 ? 1280 : 1080, i < 3 ? 1280 : 1080, [480, 800, 1080]));
const bio = [1, 2, 3, 4, 5].map((i) => img(`biomavital-${i}`, 1080, 1920, [540, 1080]));
const nibble = (
  [[1, 1483], [2, 1379], [3, 1500], [4, 1374], [5, 1137]] as const
).map(([i, h]) => img(`nibble-${i}`, 1200, h, [600, 1200]));
const petal = [img("petal-1", 960, 1280, [600, 960]), img("petal-2", 1280, 853, [800, 1280])];
// Японский баннер — первым (по просьбе студии)
const realty = [1, 2, 3, 4].map((i) => img(`realty-${i}`, 1080, 1350, [540, 1080]));
// Ролики: pepperpromo — первым и самым заметным
const reel = [1, 2, 3, 4].map((i) => ({ src: `/cases/reel-${i}.mp4`, poster: img(`reel-${i}-poster`, 720, 1280, [360, 720]) }));
const full = (n: string, w: number, h: number) => img(`${n}-full`, w, h, [760, 1200]);
const cover = (n: string, w: number, h: number) => img(`${n}-cover`, w, h, [640, 1200]);

export const cases: CaseBase[] = [
  {
    slug: "realty-ads",
    category: "ads",
    industry: "realty",
    tags: ["ads", "graphic"],
    results: null,
    // в веере японский баннер лежит сверху
    cover: { kind: "collage", images: [realty[1], realty[0], realty[2], realty[3]], front: 1 },
    gallery: realty.map((image) => ({ kind: "image", image })),
    layout: "grid",
  },
  {
    slug: "ads-legal",
    category: "ads",
    industry: "legal",
    tags: ["ads", "graphic"],
    results: null,
    cover: { kind: "collage", images: ads },
    gallery: ads.map((image) => ({ kind: "image", image })),
    layout: "grid",
  },
  {
    slug: "inout",
    category: "landing",
    industry: "gaming",
    tags: ["landing", "webDesign"],
    results: null,
    cover: { kind: "browser", image: cover("inout", 1920, 2400) },
    gallery: [{ kind: "image", image: full("inout", 1920, 6094), frame: "browser" }],
    layout: "stack",
  },
  {
    slug: "cape-caviar",
    category: "landing",
    industry: "food",
    tags: ["landing", "webDesign", "ecommerce"],
    results: null,
    cover: { kind: "browser", image: cover("caviar", 1921, 2402) },
    gallery: [{ kind: "image", image: full("caviar", 1921, 6481), frame: "browser" }],
    layout: "stack",
  },
  {
    slug: "angelaw",
    category: "landing",
    industry: "legal",
    tags: ["landing", "webDesign"],
    results: null,
    cover: { kind: "browser", image: cover("angelaw", 1662, 2078) },
    gallery: [{ kind: "image", image: full("angelaw", 1662, 8000), frame: "browser" }],
    layout: "stack",
  },
  {
    slug: "biomavital",
    category: "branding",
    industry: "eco",
    tags: ["logo", "identity", "print"],
    results: null,
    cover: { kind: "collage", images: [bio[2], bio[3], bio[4]] },
    gallery: bio.map((image) => ({ kind: "image", image })),
    layout: "slides",
  },
  {
    slug: "nibble",
    category: "branding",
    industry: "cafe",
    tags: ["logo", "identity", "mascot", "packaging"],
    results: null,
    // в веере: стикеры, стакан, логотип по центру, пакет, вывеска
    cover: { kind: "collage", images: [nibble[1], nibble[2], nibble[0], nibble[3], nibble[4]] },
    gallery: nibble.map((image) => ({ kind: "image", image })),
    layout: "bento",
  },
  {
    slug: "petal-punk",
    category: "branding",
    industry: "florist",
    tags: ["logo", "identity", "print"],
    results: null,
    cover: { kind: "collage", images: petal },
    gallery: petal.map((image) => ({ kind: "image", image })),
    layout: "duo",
  },
  {
    slug: "safin-workshop",
    category: "motion",
    tags: ["motion", "logoAnimation"],
    results: null,
    cover: { kind: "video", src: "/cases/safin-logo.mp4", poster: img("safin-poster", 1280, 720, [1280]) },
    gallery: [{ kind: "video", src: "/cases/safin-logo.mp4", poster: img("safin-poster", 1280, 720, [1280]) }],
    layout: "stack",
  },
  {
    slug: "motion-reel",
    category: "motion",
    tags: ["motion", "ads"],
    results: null,
    cover: { kind: "reel", videos: reel },
    gallery: reel.map((v) => ({ kind: "video", ...v })),
    layout: "reel",
  },
];

export const getCase = (slug: string) => cases.find((c) => c.slug === slug);
