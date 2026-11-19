/* Медиа кейсов. Файлы лежат в /public/cases/<base>-<ширина>.webp (и .avif, если avif: true) */
export type Img = { base: string; w: number; h: number; widths: number[]; avif?: boolean };

export type CaseCategory = "app" | "web" | "ads" | "landing" | "branding" | "motion";
export type Industry = "legal" | "gaming" | "food" | "eco" | "cafe" | "florist" | "delivery" | "web3" | "realty" | "health" | "auto" | "digital";
export type CooperationFormat = "direct" | "partner";

export type CaseCover =
  | { kind: "collage"; images: Img[]; /** индекс работы, которая лежит сверху */ front?: number; /** свой фон кейса вместо фирменного */ surface?: string } // веер работ (креативы, слайды)
  | { kind: "browser"; image: Img } // верх лендинга в окне браузера, прокручивается при наведении
  | { kind: "video"; src: string; poster: Img }
  | { kind: "reel"; videos: { src: string; poster: Img }[] } // вертикальные ролики: первый играет в центре
  | { kind: "image"; image: Img; surface?: string }; // готовая презентационная картинка кейса на мягкой подложке

export type CaseMedia =
  | { kind: "image"; image: Img; frame?: "browser" }
  | { kind: "video"; src: string; poster: Img };
