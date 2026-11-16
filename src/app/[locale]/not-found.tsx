"use client";
import { usePathname } from "next/navigation";
import { Mascot } from "@/components/mm/Mascot";
import { ButtonLink } from "@/components/ui/Button";
import { defaultLocale, isLocale } from "@/i18n/config";

/* not-found не получает params, поэтому язык берём из адреса,
   а тексты — из маленького встроенного набора (без загрузки всех словарей). */
const T: Record<string, { label: string; title: string; text: string; home: string; alt: string }> = {
  ru: { label: "Ошибка 404", title: "Здесь точку поставили раньше времени", text: "Такой страницы нет. Зато на главной есть всё остальное.", home: "На главную", alt: "Маскот Бюро грустит" },
  en: { label: "Error 404", title: "Someone put the full stop here too early", text: "This page doesn't exist. Everything else is on the home page.", home: "Go home", alt: "The Byuro mascot looks sad" },
  de: { label: "Fehler 404", title: "Hier wurde der Punkt zu früh gesetzt", text: "Diese Seite gibt es nicht. Alles andere finden Sie auf der Startseite.", home: "Zur Startseite", alt: "Das Byuro-Maskottchen ist traurig" },
  fr: { label: "Erreur 404", title: "Le point final est arrivé trop tôt", text: "Cette page n'existe pas. Tout le reste est sur la page d'accueil.", home: "Accueil", alt: "La mascotte de Byuro est triste" },
  es: { label: "Error 404", title: "Aquí alguien puso el punto final demasiado pronto", text: "Esta página no existe. Todo lo demás está en la página de inicio.", home: "Ir al inicio", alt: "La mascota de Byuro está triste" },
  sr: { label: "Greška 404", title: "Ovde je tačka stavljena prerano", text: "Ova stranica ne postoji. Sve ostalo je na početnoj.", home: "Na početnu", alt: "Maskota studija Byuro je tužna" },
  hi: { label: "त्रुटि 404", title: "यहाँ पूर्णविराम कुछ जल्दी लग गया", text: "यह पेज मौजूद नहीं है। बाकी सब होम पेज पर है।", home: "होम पेज पर जाएँ", alt: "ब्यूरो का शुभंकर उदास है" },
  "zh-cn": { label: "错误 404", title: "这里的句号画得太早了", text: "该页面不存在。其他内容都在首页。", home: "返回首页", alt: "Byuro 吉祥物很难过" },
  ja: { label: "エラー 404", title: "ここでは句点が早すぎました", text: "このページは存在しません。ほかの内容はトップページにあります。", home: "トップへ", alt: "Byuro のマスコットが悲しんでいます" },
};

export default function NotFound() {
  const seg = usePathname()?.split("/")[1] ?? "";
  const locale = isLocale(seg) ? seg : defaultLocale;
  const t = T[locale];
  return (
    <div className="wrap section grid min-h-[60vh] items-center gap-10 md:grid-cols-[1fr_auto]">
      <div>
        <p className="t-mono text-stone-ink">{t.label}</p>
        <h1 className="t-h1 mt-4 max-w-[40rem]">
          {t.title}
          <span aria-hidden="true" className="ml-[0.08em] inline-block size-[0.5em] rounded-full bg-coral" />
        </h1>
        <p className="t-lead mt-6 max-w-[32rem] text-ink/80">{t.text}</p>
        <ButtonLink href={`/${locale}/`} className="mt-10">
          {t.home}
        </ButtonLink>
      </div>
      <div className="mascot-idle mx-auto w-44 sm:w-56">
        <Mascot emotion="sad" alt={t.alt} sizes="224px" />
      </div>
    </div>
  );
}
