import "server-only";
import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { ReactNode } from "react";
import type { Locale } from "@/i18n/config";
import type { CalcDict } from "@/i18n/calculator/ru";
import { fmt } from "@/i18n/format";
import { ITEMS, SERVICES } from "@/lib/calculator/catalog";
import type { Quote, QuoteLine } from "@/lib/calculator/engine";
import { formatDays, moneyFormatter, pct, projectType, qtyFormatter } from "@/lib/calculator/format";
import { fontStack } from "./fonts";

/* Коммерческое предложение в фирменном стиле Бюро — без логотипа и контактов (по ТЗ).
   Палитра и шрифты — из брендбука: Бумага, Чёрный, Песок, Коралл (акцент ≤10–15%). */

const C = { ink: "#121212", paper: "#F1ECE2", sand: "#E4DCCD", coral: "#FF4D2E", stone: "#5F5A52", line: "#D9D1C2", white: "#FFFFFF" };

export type QuoteDocProps = {
  t: CalcDict;
  locale: Locale;
  quote: Quote;
  calcId: string;
  projectName?: string;
  createdAt: Date;
  timeZone?: string;
};

export function QuoteDocument({ t, locale, quote, calcId, projectName, createdAt, timeZone }: QuoteDocProps) {
  const money = moneyFormatter(locale);
  const qty = qtyFormatter(locale);
  const text = fontStack(locale, "text");
  const display = fontStack(locale, "display");
  const cjk = locale === "zh-cn" || locale === "ja";
  const deva = locale === "hi";
  const lh = cjk ? 1.55 : deva ? 1.6 : 1.4;

  const s = StyleSheet.create({
    page: { backgroundColor: C.white, color: C.ink, fontFamily: text as unknown as string, fontSize: 9.5, lineHeight: lh, paddingTop: 36, paddingBottom: 56, paddingHorizontal: 40 },
    display: { fontFamily: display as unknown as string, fontWeight: 700, letterSpacing: cjk || deva ? 0 : -0.3 },
    label: { fontSize: 7.5, fontWeight: 600, letterSpacing: cjk || deva ? 0 : 0.8, textTransform: cjk || deva ? "none" : "uppercase", color: C.stone },
    muted: { color: C.stone },
    section: { marginTop: 22 },
    h2: { fontSize: 13, marginBottom: 10 },
    row: { flexDirection: "row", alignItems: "flex-start" },
    cellItem: { flex: 1, paddingRight: 10 },
    cellQty: { width: 62, textAlign: "right", paddingRight: 8 },
    cellPrice: { width: 72, textAlign: "right", paddingRight: 8 },
    cellAmount: { width: 78, textAlign: "right" },
  });

  const date = (() => {
    try {
      return new Intl.DateTimeFormat(locale === "sr" ? "sr-Latn" : locale, { dateStyle: "long", timeZone }).format(createdAt);
    } catch {
      return createdAt.toISOString().slice(0, 10);
    }
  })();

  const Dot = ({ color = C.coral, size = 7 }: { color?: string; size?: number }) => <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }} />;

  const SectionTitle = ({ children }: { children: ReactNode }) => (
    <View style={[s.row, { alignItems: "center", marginBottom: 10 }]} minPresenceAhead={60}>
      <Dot />
      <Text style={[s.display, { fontSize: 13, marginLeft: 7 }]}>{children}</Text>
    </View>
  );

  const Line = ({ l, last }: { l: QuoteLine; last: boolean }) => (
    <View wrap={false} style={[s.row, { paddingVertical: 5.5, borderBottomWidth: last ? 0 : 0.6, borderBottomColor: C.line }]}>
      <Text style={s.cellItem}>{t.items[l.key]}</Text>
      <Text style={s.cellQty}>
        {qty(l.qty)} {t.units[l.unit]}
      </Text>
      <Text style={s.cellPrice}>{money(l.unitPrice)}</Text>
      <Text style={[s.cellAmount, { fontWeight: 600 }]}>{money(l.amount)}</Text>
    </View>
  );

  const TableHead = () => (
    <View style={[s.row, { paddingBottom: 5, borderBottomWidth: 1.2, borderBottomColor: C.ink }]} fixed={false}>
      <Text style={[s.cellItem, s.label]}>{t.pdf.colItem}</Text>
      <Text style={[s.cellQty, s.label]}>{t.pdf.colQty}</Text>
      <Text style={[s.cellPrice, s.label]}>{t.pdf.colPrice}</Text>
      <Text style={[s.cellAmount, s.label]}>{t.pdf.colAmount}</Text>
    </View>
  );

  const Block = ({ title, description, lines, subtotal, days }: { title: string; description?: string; lines: QuoteLine[]; subtotal: number; days?: string }) => (
    <View style={{ marginBottom: 14, borderRadius: 12, borderWidth: 0.8, borderColor: C.line, overflow: "hidden" }}>
      <View wrap={false} minPresenceAhead={70} style={{ backgroundColor: C.paper, paddingHorizontal: 12, paddingTop: 10, paddingBottom: 9 }}>
        <Text style={[s.display, { fontSize: 11 }]}>{title}</Text>
        {description ? <Text style={[s.muted, { marginTop: 3, fontSize: 8.5 }]}>{description}</Text> : null}
      </View>
      <View style={{ paddingHorizontal: 12, paddingTop: 8 }}>
        <TableHead />
        {lines.map((l, i) => (
          <Line key={l.key} l={l} last={i === lines.length - 1} />
        ))}
      </View>
      <View wrap={false} style={[s.row, { marginTop: 4, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: C.paper, alignItems: "center" }]}>
        <Text style={{ flex: 1, fontWeight: 600 }}>
          {t.pdf.subtotal}
          {days ? <Text style={[s.muted, { fontWeight: 400 }]}>{`  ·  ${t.pdf.serviceTime}: ${days}`}</Text> : null}
        </Text>
        <Text style={{ fontWeight: 600, fontSize: 10.5 }}>{money(subtotal)}</Text>
      </View>
    </View>
  );

  const TotalRow = ({ label, value }: { label: string; value: string }) => (
    <View style={[s.row, { paddingVertical: 5, borderBottomWidth: 0.6, borderBottomColor: C.line }]}>
      <Text style={{ flex: 1 }}>{label}</Text>
      <Text style={{ fontWeight: 600 }}>{value}</Text>
    </View>
  );

  const Bullets = ({ items }: { items: readonly string[] }) => (
    <View>
      {items.map((x) => (
        <View key={x} style={[s.row, { marginTop: 3 }]}>
          <Text style={{ width: 9, color: C.coral }}>•</Text>
          <Text style={{ flex: 1 }}>{x}</Text>
        </View>
      ))}
    </View>
  );

  const title = projectName?.trim() || t.pdf.untitled;

  return (
    <Document title={`${t.pdf.docTitle} — ${title}`} subject={t.pdf.docTitle} language={locale} creator="" producer="">
      <Page size="A4" style={s.page}>
        {/* Колонтитул: только ID и номер страницы, без контактов */}
        <View fixed style={{ position: "absolute", bottom: 40, left: 40, right: 40, height: 0.6, backgroundColor: C.line }} />
        {/* Номера страниц не выводим: render-пропсы react-pdf не работают в серверном окружении Next (react-server) */}
        <Text fixed style={[s.muted, { position: "absolute", bottom: 24, left: 40, right: 40, fontSize: 7.5 }]}>
          {`${t.pdf.docTitle} · ${calcId}`}
        </Text>

        {/* Шапка */}
        <View style={{ backgroundColor: C.paper, borderRadius: 18, padding: 22, paddingBottom: 18 }}>
          <View style={[s.row, { alignItems: "center", justifyContent: "space-between" }]}>
            <View style={[s.row, { alignItems: "center", backgroundColor: C.white, borderRadius: 99, paddingVertical: 4, paddingHorizontal: 10 }]}>
              <Dot />
              <Text style={[s.label, { marginLeft: 6, color: C.ink }]}>{t.pdf.docTitle}</Text>
            </View>
            <View style={s.row}>
              <Dot color={C.ink} size={9} />
              <View style={{ width: 4 }} />
              <Dot color={C.sand} size={9} />
              <View style={{ width: 4 }} />
              <Dot size={9} />
            </View>
          </View>
          <Text style={[s.display, { fontSize: 22, lineHeight: cjk || deva ? 1.35 : 1.15, marginTop: 16 }]}>{title}</Text>
          <View style={[s.row, { marginTop: 16 }]}>
            {[
              [t.pdf.projectType, projectType(t, quote) || "—"],
              [t.pdf.date, date],
              [t.pdf.calcId, calcId],
            ].map(([k, v], i) => (
              <View key={k} style={{ flex: i === 0 ? 1.6 : 1, paddingRight: 12 }}>
                <Text style={s.label}>{k}</Text>
                <Text style={{ marginTop: 3, fontWeight: 600 }}>{v}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Состав работ */}
        <View style={s.section}>
          <SectionTitle>{t.pdf.servicesTitle}</SectionTitle>
          {quote.services.map((q) => (
            <Block key={q.id} title={t.services[q.id].title} description={t.services[q.id].description} lines={q.lines} subtotal={q.subtotal} days={formatDays(q.days, t.days, locale)} />
          ))}
          {quote.extras.lines.length > 0 && <Block title={t.pdf.extrasTitle} lines={quote.extras.lines} subtotal={quote.extras.subtotal} />}
          {quote.onRequest.length > 0 && (
            <View style={{ marginBottom: 14, borderRadius: 12, borderWidth: 0.8, borderColor: C.line, borderStyle: "dashed", paddingHorizontal: 12, paddingVertical: 10 }}>
              <Text style={[s.display, { fontSize: 11, marginBottom: 4 }]}>{t.pdf.onRequestTitle}</Text>
              {quote.onRequest.map((k) => (
                <View key={k} wrap={false} style={[s.row, { paddingVertical: 4 }]}>
                  <View style={s.cellItem}>
                    <Text style={{ fontWeight: 600 }}>{t.onRequest[k].title}</Text>
                    <Text style={[s.muted, { fontSize: 8.5 }]}>{t.onRequest[k].text}</Text>
                  </View>
                  <Text style={[s.cellAmount, s.muted, { width: 110 }]}>{t.pdf.onRequestAmount}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Итог */}
        <View wrap={false} style={{ marginTop: 8 }}>
          <SectionTitle>{t.pdf.totalsTitle}</SectionTitle>
          <TotalRow label={t.summary.base} value={money(quote.base)} />
          {quote.complexity.factor !== 1 && <TotalRow label={`${fmt(t.summary.complexity, { level: t.complexity[quote.complexity.key].title })} · +${pct(quote.complexity.factor)}`} value={money(quote.complexity.delta)} />}
          {quote.urgency.factor !== 1 && <TotalRow label={`${fmt(t.summary.urgency, { level: t.urgency[quote.urgency.key].title })} · +${pct(quote.urgency.factor)}`} value={money(quote.urgency.delta)} />}
          <View style={[s.row, { marginTop: 10, backgroundColor: C.coral, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 13, alignItems: "center" }]}>
            <View style={{ flex: 1 }}>
              <Text style={[s.display, { fontSize: 14 }]}>{t.summary.total}</Text>
              {quote.onRequest.length > 0 && <Text style={{ fontSize: 8, marginTop: 2 }}>{t.summary.totalNote}</Text>}
            </View>
            <Text style={[s.display, { fontSize: 20 }]}>{money(quote.total)}</Text>
          </View>
          <Text style={[s.muted, { marginTop: 6, fontSize: 8 }]}>{t.page.currency}</Text>
        </View>

        {/* Сроки */}
        {quote.timeline && (
          <View wrap={false} style={s.section}>
            <SectionTitle>{t.pdf.timelineTitle}</SectionTitle>
            {quote.services.map((q) => (
              <TotalRow key={q.id} label={t.services[q.id].title} value={formatDays(q.days, t.days, locale)} />
            ))}
            {quote.extras.before.max > 0 && <TotalRow label={quote.extras.lines.filter((l) => l.key === "concept" || l.key === "research").map((l) => t.items[l.key]).join(", ")} value={formatDays(quote.extras.before, t.days, locale)} />}
            {quote.extras.after.max > 0 && <TotalRow label={quote.extras.lines.filter((l) => l.key === "small_edit" || l.key === "big_edit").map((l) => t.items[l.key]).join(", ")} value={formatDays(quote.extras.after, t.days, locale)} />}
            <View style={[s.row, { marginTop: 8, backgroundColor: C.ink, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, alignItems: "center" }]}>
              <Text style={{ flex: 1, color: C.paper, fontWeight: 600 }}>{t.pdf.timelineTotal}</Text>
              <Text style={[s.display, { color: C.paper, fontSize: 12 }]}>{formatDays(quote.timeline, t.days, locale)}</Text>
            </View>
            {quote.services.length > 1 && <Text style={[s.muted, { marginTop: 6, fontSize: 8 }]}>{t.summary.timelineNote}</Text>}
            {quote.onRequest.length > 0 && <Text style={[s.muted, { marginTop: 3, fontSize: 8 }]}>{t.summary.timelineOnRequest}</Text>}
          </View>
        )}

        {/* Что входит / не входит / платные опции */}
        {quote.services.length > 0 && (
          <View style={s.section}>
            <SectionTitle>{t.pdf.scopeTitle}</SectionTitle>
            {quote.services.map((q) => {
              const svc = SERVICES[q.id];
              const chosen = new Set(q.lines.map((l) => l.key));
              const notChosen = svc.options.flatMap((g) => g.items).filter((k) => !chosen.has(k));
              return (
                <View key={q.id} style={{ marginBottom: 14 }}>
                  <View wrap={false}>
                    <Text style={[s.display, { fontSize: 10.5, marginBottom: 6 }]}>{t.services[q.id].title}</Text>
                    <View style={s.row}>
                      <View style={{ flex: 1, paddingRight: 14 }}>
                        <Text style={s.label}>{t.pick.includes}</Text>
                        <Bullets items={t.services[q.id].includes} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.label}>{t.pick.excludes}</Text>
                        <Bullets items={t.services[q.id].excludes} />
                      </View>
                    </View>
                  </View>
                  {notChosen.length > 0 && (
                    <View wrap={false} style={{ marginTop: 8, backgroundColor: C.paper, borderRadius: 10, padding: 10 }}>
                      <Text style={s.label}>{t.pdf.paidOptions}</Text>
                      <Text style={{ marginTop: 3 }}>{notChosen.map((k) => `${t.items[k]} — ${fmt(t.scope.perUnit, { price: money(ITEMS[k].price), unit: t.units[ITEMS[k].unit] })}`).join("  ·  ")}</Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* Примечание */}
        <View wrap={false} style={[s.section, { borderLeftWidth: 3, borderLeftColor: C.coral, paddingLeft: 12, paddingVertical: 4 }]}>
          <Text style={s.label}>{t.pdf.notesTitle}</Text>
          <Text style={{ marginTop: 4, fontWeight: 600 }}>{t.page.disclaimer}</Text>
        </View>
      </Page>
    </Document>
  );
}
