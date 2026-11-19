import "server-only";
import path from "node:path";
import { Font } from "@react-pdf/renderer";
import type { Locale } from "@/i18n/config";

/* Шрифты PDF: фирменные Unbounded (заголовки) и Onest (текст) + Noto для хинди,
   китайского и японского. Статичные TTF, подготовленные скриптом scripts/pdf-fonts.py
   (вырезаны нужные начертания и наборы символов, чтобы функция оставалась лёгкой).
   Все шрифты — SIL Open Font License 1.1. */

const dir = path.join(process.cwd(), "assets", "pdf-fonts");
const f = (name: string) => path.join(dir, name);

/* Флаг на globalThis: при горячей перезагрузке модуля (dev) шрифты не регистрируются повторно —
   повторная регистрация в общем реестре react-pdf портила подмножества глифов. */
const g = globalThis as { __byuroPdfFonts?: boolean };
export function registerPdfFonts() {
  if (g.__byuroPdfFonts) return;
  g.__byuroPdfFonts = true;
  Font.register({ family: "Unbounded", fonts: [{ src: f("Unbounded-Bold.ttf"), fontWeight: 700 }] });
  Font.register({
    family: "Onest",
    fonts: [
      { src: f("Onest-Regular.ttf"), fontWeight: 400 },
      { src: f("Onest-SemiBold.ttf"), fontWeight: 600 },
    ],
  });
  Font.register({
    family: "NotoDeva",
    fonts: [
      { src: f("NotoSansDevanagari-Regular.ttf"), fontWeight: 400 },
      { src: f("NotoSansDevanagari-SemiBold.ttf"), fontWeight: 600 },
    ],
  });
  Font.register({
    family: "NotoSC",
    fonts: [
      { src: f("NotoSansSC-Regular.ttf"), fontWeight: 400 },
      { src: f("NotoSansSC-Bold.ttf"), fontWeight: 700 },
    ],
  });
  Font.register({
    family: "NotoJP",
    fonts: [
      { src: f("NotoSansJP-Regular.ttf"), fontWeight: 400 },
      { src: f("NotoSansJP-Bold.ttf"), fontWeight: 700 },
    ],
  });

  /* Переносы. react-pdf переносит только по пробелам, поэтому:
     — в китайском и японском разрешаем перенос между иероглифами (с правилами кинсоку:
       не начинать строку с закрывающих знаков и малых кана). Дефис, который react-pdf
       вставляет при таком переносе, в CJK-шрифтах сопоставлен с пустым глифом и не виден;
     — очень длинные слова без пробелов (ссылки, артикулы) режем на части. */
  const CJK = /[぀-ヿ㐀-鿿豈-﫿＀-￯　-〿]/;
  const NO_START = "、。，．！？）」』】〕〉》ー々ぁぃぅぇぉっゃゅょァィゥェォッャュョ・：；,.!?)%";
  Font.registerHyphenationCallback((word) => {
    if (CJK.test(word)) {
      const out: string[] = [];
      let cur = "";
      for (const ch of word) {
        if (cur && CJK.test(ch) && !NO_START.includes(ch)) {
          out.push(cur);
          cur = "";
        }
        cur += ch;
      }
      if (cur) out.push(cur);
      return out;
    }
    if (word.length > 18) {
      const out: string[] = [];
      for (let i = 0; i < word.length; i += 10) out.push(word.slice(i, i + 10));
      return out;
    }
    return [word];
  });
}

/** Порядок запасных шрифтов: для японского — японские начертания иероглифов, иначе китайские */
export function fontStack(locale: Locale, kind: "display" | "text"): string[] {
  const cjk = locale === "ja" ? ["NotoJP", "NotoSC"] : ["NotoSC", "NotoJP"];
  return [kind === "display" ? "Unbounded" : "Onest", "NotoDeva", ...cjk];
}
