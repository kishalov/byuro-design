import type { Dict } from "@/i18n/dictionaries/ru";
import { RingBadge } from "../mm/Kit";
import { Eyebrow } from "../ui/SectionHead";

export function About({ t, ring }: { t: Dict["about"]; ring: string }) {
  return (
    <section id="about" aria-labelledby="about-title" className="cv section relative">
      <div className="wrap grid gap-14 lg:grid-cols-12 lg:gap-8">
        <div className="relative lg:col-span-6" data-reveal>
          <Eyebrow>{t.eyebrow}</Eyebrow>
          <h2 id="about-title" className="t-h1 mt-5 max-w-[40rem]">
            {t.title}
          </h2>
          <div className="t-body-l mt-8 max-w-[36rem] space-y-5 text-ink/85">
            {t.text.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </div>
        </div>

        <div className="relative self-end lg:col-span-6 lg:col-start-7">
          <RingBadge text={ring} className="absolute -top-20 right-2 z-10 w-24 sm:w-28 lg:-top-28" />
          <dl className="grid grid-cols-2 border-t-2 border-ink">
            {t.stats.map((s, i) => (
              <div key={s.label} className={`border-b border-ink/20 py-7 ${i % 2 === 0 ? "pr-4 sm:pr-8" : "border-l border-ink/20 pl-4 sm:pl-8"}`} data-reveal style={{ ["--d" as string]: `${i * 60}ms` }}>
                <dt className="sr-only">{s.label}</dt>
                <dd className="font-display text-[clamp(2.75rem,9vw,5.5rem)] leading-none font-black tracking-[-0.03em]">{s.value}</dd>
                <dd className="t-small mt-3 max-w-[14rem] text-stone-ink" aria-hidden="true">
                  {s.label}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <ul className="grid gap-8 sm:grid-cols-2 lg:col-span-12 lg:mt-8 lg:grid-cols-4">
          {t.values.map((v, i) => (
            <li key={v.title} data-reveal style={{ ["--d" as string]: `${i * 60}ms` }}>
              <h3 className="t-h4 flex items-center gap-3">
                <span aria-hidden="true" className="size-3 rounded-full bg-ink" />
                {v.title}
              </h3>
              <p className="mt-2 text-ink/80">{v.text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
