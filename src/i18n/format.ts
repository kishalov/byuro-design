/* Мини-реализация ICU MessageFormat: {var}, {n, plural, one {...} few {...} other {...}}
   и # внутри plural. Правила множественного числа — из Intl.PluralRules,
   поэтому корректны для всех языков (ru: one/few/many, ja/zh: other и т. д.). */

type Vars = Record<string, string | number>;

export function fmt(message: string, vars: Vars = {}, locale = "en"): string {
  let out = "";
  let i = 0;
  while (i < message.length) {
    const ch = message[i];
    if (ch !== "{") {
      out += ch;
      i++;
      continue;
    }
    // найти парную скобку
    let depth = 0;
    let j = i;
    for (; j < message.length; j++) {
      if (message[j] === "{") depth++;
      else if (message[j] === "}" && --depth === 0) break;
    }
    const body = message.slice(i + 1, j);
    i = j + 1;
    const [name, type, ...rest] = body.split(",");
    const key = name.trim();
    if (!type) {
      out += String(vars[key] ?? `{${key}}`);
      continue;
    }
    if (type.trim() === "plural") {
      const n = Number(vars[key] ?? 0);
      const options = parseOptions(rest.join(","));
      const exact = options[`=${n}`];
      const cat = new Intl.PluralRules(locale).select(n);
      const chosen = exact ?? options[cat] ?? options.other ?? "";
      out += fmt(chosen.replace(/#/g, new Intl.NumberFormat(locale).format(n)), vars, locale);
    }
  }
  return out;
}

function parseOptions(src: string): Record<string, string> {
  const res: Record<string, string> = {};
  let i = 0;
  while (i < src.length) {
    while (src[i] === " ") i++;
    let k = "";
    while (i < src.length && src[i] !== "{" && src[i] !== " ") k += src[i++];
    while (src[i] === " ") i++;
    if (src[i] !== "{") break;
    let depth = 0;
    let j = i;
    for (; j < src.length; j++) {
      if (src[j] === "{") depth++;
      else if (src[j] === "}" && --depth === 0) break;
    }
    res[k] = src.slice(i + 1, j);
    i = j + 1;
  }
  return res;
}
