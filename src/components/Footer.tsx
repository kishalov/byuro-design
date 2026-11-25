import Link from "next/link";
import { CookieSettingsButton } from "./analytics/CookieSettingsButton";
import { site } from "@/content/site";
import type { Locale } from "@/i18n/config";
import type { Dict } from "@/i18n/dictionaries/ru";
import { fmt } from "@/i18n/format";
import { anchors, lp } from "@/i18n/paths";
import { Icon } from "./ui/Icon";
import { Logo } from "./ui/Logo";

export function Footer({ locale, t, nav, cta }: { locale: Locale; t: Dict["footer"]; nav: Dict["nav"]; cta: Dict["cta"] }) {
  const items = [
    // { href: lp(locale, anchors.services), label: nav.services },
    // { href: lp(locale, anchors.faq), label: nav.faq },
    // порядок — как в шапке
    { href: lp(locale, anchors.cases), label: nav.cases },
    { href: lp(locale, anchors.process), label: nav.process },
    { href: lp(locale, anchors.calculator), label: nav.calc },
    { href: lp(locale, anchors.partners), label: nav.partners }, // открывает попап партнёрской программы
  ];
  return (
    <footer className="on-dark bg-ink pb-28 text-paper md:pb-10">
      <div className="wrap pt-16 sm:pt-20">
        <div className="grid gap-12 md:grid-cols-12">
          <div className="md:col-span-5">
            <p className="t-h3 max-w-[24rem]">{t.tagline}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href={lp(locale, anchors.lead)} className="inline-flex min-h-12 items-center rounded-pill bg-coral px-5 font-semibold text-ink transition-colors hover:bg-paper">
                {cta.lead}
              </Link>
              {/* партнёрская форма отключена: <Link href={lp(locale, anchors.partner)}>{cta.partner}</Link> */}
            </div>
          </div>
          <nav aria-label={nav.footer} className="md:col-span-3 md:col-start-7">
            <p className="t-label text-paper/60">{t.sections}</p>
            <ul className="mt-4 space-y-1">
              {items.map((n) => (
                <li key={n.href}>
                  <Link href={n.href} className="inline-block py-1.5 text-paper/85 transition-colors hover:text-coral">
                    {n.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="md:col-span-3">
            <p className="t-label text-paper/60">{t.contact}</p>
            <ul className="mt-4 space-y-1">
              {site.contacts.telegram && (
                <li>
                  <a href={site.contacts.telegram.url} target="_blank" rel="noopener" className="inline-flex items-center gap-2 py-1.5 font-semibold text-paper hover:text-coral">
                    <span className="grid size-7 place-items-center rounded-full bg-coral text-ink">
                      <Icon name="telegram" size={15} />
                    </span>
                    Telegram {site.contacts.telegram.handle}
                  </a>
                </li>
              )}
              <li>
                <a href={site.contacts.instagram.url} target="_blank" rel="noopener" className="inline-flex items-center gap-1.5 py-1.5 text-paper/85 hover:text-coral">
                  Instagram <Icon name="arrow-up-right" size={16} />
                </a>
              </li>
              {site.contacts.email && (
                <li>
                  <a href={`mailto:${site.contacts.email}`} className="inline-block py-1.5 text-paper/85 hover:text-coral">
                    {site.contacts.email}
                  </a>
                </li>
              )}
            </ul>
          </div>
        </div>
        <div className="mt-16 sm:mt-24">
          <Logo inverse className="text-[clamp(4.5rem,24vw,22rem)] tracking-[-0.04em]" label={locale === "ru" ? "Бюро" : "Byuro"} />
        </div>
        <div className="mt-8 flex flex-col gap-3 border-t border-paper/15 pt-6 text-[14px] text-paper/60 sm:flex-row sm:justify-between">
          <p>{fmt(t.rights, { year: 2026 }, locale)}</p>
          <div className="flex flex-wrap gap-x-6 gap-y-3">
            <Link href={lp(locale, "/privacy/")} className="hover:text-paper">
              {t.privacy}
            </Link>
            <CookieSettingsButton label={t.cookies} />
          </div>
        </div>
      </div>
    </footer>
  );
}
