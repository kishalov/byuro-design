import type { Dict } from "@/i18n/dictionaries/ru";
import { Cursor, Orb, Toggle3D } from "../mm/Kit";
import { Eyebrow } from "../ui/SectionHead";

/* УТП для клиентов — бенто из четырёх карточек, у каждой свой
   mixed-media объект, который объясняет мысль без слов. */
export function Why({ t, cursors }: { t: Dict["why"]; cursors: { design: string; code: string } }) {
  const [a, b, c, d] = t.items;
  return (
    <section aria-labelledby="why-title" className="cv section pt-8">
      <div className="wrap">
        <div data-reveal>
          <Eyebrow>{t.eyebrow}</Eyebrow>
          <h2 id="why-title" className="t-h1 mt-5 max-w-[52rem]">
            {t.title}
            <span aria-hidden="true" className="ml-[0.08em] inline-block size-[0.5em] rounded-full bg-coral" />
          </h2>
        </div>

        <ul className="mt-12 grid gap-4 md:grid-cols-6 lg:grid-cols-12">
          {/* 1. Дизайн + разработка */}
          <li data-reveal className="relative overflow-hidden rounded-[var(--radius-card)] bg-ink p-7 text-paper sm:p-9 md:col-span-6 lg:col-span-7">
            <div className="relative z-10 max-w-[30rem]">
              <h3 className="t-h2">{a.title}</h3>
              <p className="t-body-l mt-4 text-paper/80">{a.text}</p>
            </div>
            <div aria-hidden="true" className="relative mt-10 h-56 sm:h-64">
              {/* Окно макета и окно кода — один элемент, два курсора */}
              <div className="absolute top-0 left-0 w-[62%] -rotate-3 rounded-2xl bg-paper p-4 text-ink shadow-[0_20px_40px_-15px_rgb(0_0_0/0.6)]">
                <div className="flex gap-1.5">{[0, 1, 2].map((i) => <span key={i} className="size-2 rounded-full bg-ink/25" />)}</div>
                <div className="mt-4 rounded-xl bg-sand p-3">
                  <span className="block font-display text-lg font-black">Aa</span>
                  <span className="mt-2 block h-2 w-3/4 rounded-full bg-ink/20" />
                  <span className="mt-1.5 block h-2 w-1/2 rounded-full bg-ink/20" />
                  <span className="mt-3 inline-block rounded-full bg-coral px-3 py-1 text-[11px] font-semibold">Button</span>
                </div>
              </div>
              <div className="absolute right-0 bottom-0 w-[58%] rotate-2 rounded-2xl bg-graphite p-4 font-mono text-[11px] leading-relaxed shadow-[0_20px_40px_-15px_rgb(0_0_0/0.6)] sm:text-[12px]">
                <span className="text-coral">&lt;Button</span> <span className="text-paper/60">variant</span>=<span className="text-paper">&quot;coral&quot;</span>
                <span className="text-coral">&gt;</span>
                <br />
                <span className="pl-3 text-paper/80">…</span>
                <br />
                <span className="text-coral">&lt;/Button&gt;</span>
              </div>
              <Cursor label={cursors.design} tone="coral" className="absolute top-[38%] left-[34%]" />
              <Cursor label={cursors.code} tone="ink" className="absolute top-[-6%] right-[6%] sm:top-auto sm:right-[22%] sm:bottom-[42%] [&>span]:!bg-paper [&>span]:!text-ink" style={{ ["--cd" as string]: "-2s" }} />
            </div>
          </li>

          {/* 2. Гибкий формат */}
          <li data-reveal className="relative overflow-hidden rounded-[var(--radius-card)] bg-white p-7 sm:p-9 md:col-span-6 lg:col-span-5 lg:flex lg:flex-col lg:justify-between">
            <div>
            <h3 className="t-h3 max-w-[18rem]">{b.title}</h3>
            <p className="mt-3 max-w-[24rem] text-ink/80">{b.text}</p>
            </div>
            <div aria-hidden="true" className="mt-10 flex items-end justify-between gap-4">
              {/* «След»: точки растут — от одной задачи до проекта целиком */}
              <div className="flex items-end gap-2 sm:gap-3">
                {[10, 16, 24, 34, 48, 66].map((s, i) => (
                  <span key={s} className={`block rounded-full ${i === 5 ? "bg-coral" : "bg-ink"}`} style={{ width: s, height: s, opacity: i === 5 ? 1 : 0.25 + i * 0.13 }} />
                ))}
              </div>
              <span className="text-[9px] sm:text-[11px]">
                <Toggle3D />
              </span>
            </div>
          </li>

          {/* 3. Сайты, которым верят */}
          <li data-reveal className="relative overflow-hidden rounded-[var(--radius-card)] bg-white p-7 sm:p-9 md:col-span-3 lg:col-span-5">
            <h3 className="t-h3">{c.title}</h3>
            <p className="mt-3 text-ink/80">{c.text}</p>
            <div aria-hidden="true" className="relative mt-8 h-28">
              {/* Мини-сайт с «подтверждениями» экспертизы */}
              <div className="absolute inset-y-0 left-0 w-[78%] -rotate-2 rounded-2xl border-2 border-ink/10 bg-paper p-3">
                <div className="flex gap-1">{[0, 1, 2].map((i) => <span key={i} className="size-1.5 rounded-full bg-ink/25" />)}</div>
                <span className="mt-3 block h-2.5 w-2/3 rounded-full bg-ink/70" />
                <span className="mt-2 block h-2 w-1/2 rounded-full bg-ink/20" />
                <div className="mt-3 flex gap-1.5">{[0, 1, 2].map((i) => <span key={i} className="h-6 flex-1 rounded-md bg-sand" />)}</div>
              </div>
              <span className="absolute top-1 right-[6%] grid size-12 rotate-6 place-items-center rounded-full border-[3px] border-white bg-coral shadow-lg">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#121212" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>
              </span>
            </div>
          </li>

          {/* 4. Не стыдно показать */}
          <li data-reveal className="relative overflow-hidden rounded-[var(--radius-card)] bg-sand p-7 sm:p-9 md:col-span-3 lg:col-span-7">
            <h3 className="t-h3 relative z-10 max-w-[24rem]">{d.title}</h3>
            <p className="relative z-10 mt-3 max-w-[28rem] pr-16 text-ink/85">{d.text}</p>
            <Orb tone="coral" className="anim-float absolute -right-8 -bottom-10 size-36 sm:size-44" />
          </li>
        </ul>
      </div>
    </section>
  );
}
