"use client";
import { useEffect, useState } from "react";
import { site } from "@/content/site";
import type { Locale } from "@/i18n/config";
import type { Dict } from "@/i18n/dictionaries/ru";
import type { LeadType } from "@/lib/lead";
import { LeadForm } from "../forms/LeadForm";
import { Mascot } from "../mm/Mascot";
import { Orb, Sticker } from "../mm/Kit";
import { Icon } from "../ui/Icon";
import { Eyebrow } from "../ui/SectionHead";
import { TabList } from "../ui/Tabs";

const hashToType: Record<string, LeadType> = { "#contact-project": "project", "#contact-partner": "partner" };

/* Два независимых сценария заявки. Ссылки /<lang>/#contact-project и
   #contact-partner сразу открывают нужную форму. Маскот выглядывает
   из-за карточки и оживает, когда пользователь заполняет форму. */
export function Contact({ locale, t, form }: { locale: Locale; t: Dict["contact"]; form: Dict["form"] }) {
  const [type, setType] = useState<LeadType>("project");

  useEffect(() => {
    const sync = () => {
      const v = hashToType[window.location.hash];
      if (v) setType(v);
    };
    sync();
    window.addEventListener("hashchange", sync);
    const onClick = (e: MouseEvent) => {
      const href = (e.target as HTMLElement).closest("a")?.getAttribute("href") ?? "";
      const h = href.slice(href.indexOf("#"));
      if (href.includes("#") && hashToType[h]) setType(hashToType[h]);
    };
    document.addEventListener("click", onClick);
    return () => {
      window.removeEventListener("hashchange", sync);
      document.removeEventListener("click", onClick);
    };
  }, []);

  const text = type === "project" ? t.project : t.partner;

  return (
    <section id="contact" aria-labelledby="contact-title" className="section grain relative overflow-hidden">
      <span id="contact-project" className="absolute top-0" aria-hidden="true" />
      <span id="contact-partner" className="absolute top-0" aria-hidden="true" />
      <div aria-hidden="true" className="absolute -bottom-[26vw] -left-[14vw] size-[40vw] min-h-[260px] min-w-[260px] overflow-hidden rounded-full bg-coral max-lg:hidden">
        <div className="halftone size-full" />
      </div>

      <div className="wrap relative">
        <div className="max-w-[64rem]" data-reveal>
          <Eyebrow>{t.eyebrow}</Eyebrow>
          <h2 id="contact-title" className="t-display mt-6 !text-[calc(clamp(2rem,8vw,6.25rem)*var(--hs,1))]">
            {t.title}
            <span aria-hidden="true" className="ml-[0.08em] inline-block size-[0.55em] rounded-full bg-coral align-baseline" />
          </h2>
        </div>

        <div className="mt-10 sm:mt-14">
          <TabList
            idBase="contact"
            label={t.tabsLabel}
            size="lg"
            value={type}
            onChange={setType}
            items={[
              { value: "project", label: <><span className="sm:hidden">{t.projectTabShort}</span><span className="hidden sm:inline">{t.projectTab}</span></> },
              { value: "partner", label: <><span className="sm:hidden">{t.partnerTabShort}</span><span className="hidden sm:inline">{t.partnerTab}</span></> },
            ]}
            className="w-full sm:w-auto [&>button]:flex-1 [&>button]:justify-center sm:[&>button]:flex-none"
          />
        </div>

        <div className="mt-8 grid gap-10 lg:grid-cols-12 lg:gap-8">
          <aside className="lg:col-span-4 lg:pt-4">
            <h3 className="t-h3">{text.title}</h3>
            <p className="t-body-l mt-4 text-ink/80">{text.lead}</p>
            <ol className="mt-8 space-y-4">
              {text.steps.map((s, i) => (
                <li key={s} className="flex items-start gap-4">
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-ink font-display text-sm font-bold text-paper">{i + 1}</span>
                  <span className="pt-1 font-medium">{s}</span>
                </li>
              ))}
            </ol>
            <div className="mt-10 border-t border-ink/20 pt-6">
              <p className="t-label text-stone-ink">{t.direct}</p>
              <ul className="mt-4 space-y-3">
                <li>
                  <a href={site.contacts.instagram.url} target="_blank" rel="noopener" className="group inline-flex items-center gap-2 text-lg font-semibold">
                    Instagram {site.contacts.instagram.handle}
                    <Icon name="arrow-up-right" size={20} className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  </a>
                </li>
                {site.contacts.telegram && (
                  <li>
                    <a href={site.contacts.telegram.url} target="_blank" rel="noopener" className="inline-flex items-center gap-2 text-lg font-semibold">
                      Telegram {site.contacts.telegram.handle}
                      <Icon name="arrow-up-right" size={20} />
                    </a>
                  </li>
                )}
                {site.contacts.email && (
                  <li>
                    <a href={`mailto:${site.contacts.email}`} className="text-lg font-semibold">
                      {site.contacts.email}
                    </a>
                  </li>
                )}
              </ul>
            </div>
          </aside>

          <div className="contact-card relative lg:col-span-8">
            {/* Маскот выглядывает из-за карточки */}
            <div aria-hidden="true" className="pointer-events-none absolute -top-[92px] right-6 z-0 w-[130px] sm:-top-[118px] sm:right-12 sm:w-[160px]">
              <div className="mascot-peek transition-transform duration-500 ease-spring">
                <Mascot emotion="neutral" alt="" sizes="160px" />
              </div>
            </div>
            <Sticker tone="coral" rotate={6} bubble="right" className="absolute -top-14 right-[150px] z-20 hidden sm:inline-flex sm:right-[200px]" decorative>
              {t.bubble}
            </Sticker>
            <Orb tone="ink" className="anim-float absolute -bottom-5 -left-5 z-20 size-12 sm:size-16" />
            {(["project", "partner"] as LeadType[]).map((v) => (
              <div key={v} role="tabpanel" id={`contact-panel-${v}`} aria-labelledby={`contact-tab-${v}`} hidden={v !== type} className="relative z-10 rounded-[var(--radius-card)] border-[3px] border-white bg-white p-6 shadow-[0_24px_60px_-30px_rgb(18_18_18/0.45)] sm:p-10">
                {v === type && <LeadForm type={v} locale={locale} t={form} />}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
