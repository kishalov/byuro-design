// Выгружает тексты для OG-картинок из словарей: npx tsx scripts/og/dump-texts.ts > /tmp/og-texts.json
import { localeCodes } from "../../src/i18n/config";
import { cases } from "../../src/content/cases";

async function main() {
  const out: Record<string, unknown> = { cases: cases.map((c) => c.slug), locales: {} };
  for (const l of localeCodes) {
    const d = (await import(`../../src/i18n/dictionaries/${l}.ts`)).default;
    (out.locales as Record<string, unknown>)[l] = {
      title: d.hero.title,
      boxed: d.hero.boxed,
      eyebrow: d.hero.eyebrow,
      hello: d.hero.hello,
      categories: Object.values(d.cases.categories),
    };
  }
  console.log(JSON.stringify(out));
}
main();
