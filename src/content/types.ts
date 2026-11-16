/* Медиа кейсов. Файлы лежат в /public/cases/<base>-<ширина>.webp */
export type Img = { base: string; w: number; h: number; widths: number[] };

export type CaseCategory = "ads" | "landing" | "branding" | "motion";
export type Industry = "legal" | "gaming" | "food" | "eco" | "cafe" | "florist" | "web3" | "realty" | "health" | "auto" | "digital";
export type CooperationFormat = "direct" | "partner";

export type CaseCover =
  | { kind: "collage"; images: Img[]; /** индекс работы, которая лежит сверху */ front?: number } // веер работ (креативы, слайды)
  | { kind: "browser"; image: Img } // верх лендинга в окне браузера, прокручивается при наведении
  | { kind: "video"; src: string; poster: Img }
  | { kind: "reel"; videos: { src: string; poster: Img }[] }; // вертикальные ролики: первый играет в центре

export type CaseMedia =
  | { kind: "image"; image: Img; frame?: "browser" }
  | { kind: "video"; src: string; poster: Img };
