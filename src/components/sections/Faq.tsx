"use client";
import { useState } from "react";
import type { Locale } from "@/i18n/config";
import type { Dict } from "@/i18n/dictionaries/ru";
import { anchors, lp } from "@/i18n/paths";
import { Mascot } from "../mm/Mascot";
import { Sticker } from "../mm/Kit";
import { ButtonLink } from "../ui/Button";
import { Icon } from "../ui/Icon";
import { Eyebrow } from "../ui/SectionHead";
import { TabList } from "../ui/Tabs";

type Aud = "client" | "partner";

export function Faq({ locale, t }: { locale: Locale; t: Dict["faq"] }) {
  const [aud, setAud] = useState<Aud>("client");
  const data = { client: t.clients, partner: t.partners };
  return (
    <section id="faq" aria-labelledby="faq-title" className="cv section relative bg-white">
      <div className="wrap grid gap-12 lg:grid-cols-12 lg:gap-8">
        <div className="lg:col-span-5">
          <div className="lg:sticky lg:top-[calc(var(--header-h)+40px)]" data-reveal>
            <Eyebrow>{t.eyebrow}</Eyebrow>
            <h2 id="faq-title" className="t-h1 mt-5">
              {t.title}
            </h2>
            <p className="t-body-l mt-6 max-w-[28rem] text-ink/80">{t.lead}</p>
            <ButtonLink href={lp(locale, aud === "client" ? anchors.project : anchors.partner)} variant="outline" className="mt-8">
              {t.cta}
            </ButtonLink>
            {/* Задумчивый маскот */}
            <div className="relative mt-10 flex items-end gap-2">
              <div className="mascot-idle w-32 shrink-0 sm:w-40 lg:w-44">
                <Mascot emotion="think" alt={t.mascotAlt} sizes="176px" />
              </div>
              <Sticker tone="paper" rotate={-5} bubble="left" className="mb-28 sm:mb-36" decorative>
                {t.bubble}
              </Sticker>
            </div>
          </div>
        </div>
        <div className="lg:col-span-7">
          <TabList
            idBase="faq"
            label={t.tabsLabel}
            value={aud}
            onChange={setAud}
            items={[
              { value: "client", label: t.clientsTab },
              { value: "partner", label: t.partnersTab },
            ]}
          />
          {(["client", "partner"] as Aud[]).map((a) => (
            <div key={a} role="tabpanel" id={`faq-panel-${a}`} aria-labelledby={`faq-tab-${a}`} hidden={a !== aud} className="mt-8">
              <ul className="border-t-2 border-ink">
                {data[a].map((f, i) => (
                  <li key={f.q} className="border-b border-ink/20">
                    <details className="group" name={`faq-${a}`} open={i === 0}>
                      <summary className="flex items-center justify-between gap-6 py-6">
                        <h3 className="t-h4 min-w-0">{f.q}</h3>
                        <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-full bg-sand transition-all duration-300 group-open:rotate-45 group-open:bg-coral">
                          <Icon name="plus" size={18} />
                        </span>
                      </summary>
                      <p className="t-body-l max-w-[40rem] pr-12 pb-7 text-ink/85">{f.a}</p>
                    </details>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
