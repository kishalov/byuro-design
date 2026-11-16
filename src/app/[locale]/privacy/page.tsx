import type { Metadata } from "next";
import type { Locale } from "@/i18n/config";
import { getDict } from "@/i18n/get";
import { alternates, hasDomain } from "@/lib/seo";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = (await params).locale as Locale;
  const t = (await getDict(locale)).privacy;
  return { title: t.meta, robots: { index: false, follow: true }, ...(hasDomain ? { alternates: alternates(locale, "/privacy/") } : {}) };
}

/* ШАБЛОН. Перед публикацией — проверка юристом и реквизиты оператора ПД. */
export default async function Privacy({ params }: Props) {
  const t = (await getDict((await params).locale as Locale)).privacy;
  return (
    <div className="wrap section max-w-[52rem]">
      <p className="t-small mb-8 rounded-2xl border-2 border-dashed border-stone-ink p-4 text-stone-ink">{t.draft}</p>
      <h1 className="t-h1">{t.title}</h1>
      <div className="t-body-l mt-10 space-y-6 text-ink/85">
        <p>{t.intro}</p>
        {t.sections.map((s) => (
          <section key={s.h}>
            <h2 className="t-h3 pt-4 text-ink">{s.h}</h2>
            <p className="mt-3">{s.p}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
