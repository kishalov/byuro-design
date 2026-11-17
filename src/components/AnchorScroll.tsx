"use client";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

/* Точная прокрутка к якорям (#contact-project, #faq …).
   Нижние секции отрисовываются лениво (content-visibility: auto, класс .cv),
   поэтому до прокрутки браузер знает только их примерную высоту и останавливается
   не там. Перед переходом по якорю отключаем ленивую отрисовку (html.cv-off),
   чтобы страница получила настоящую высоту, и только потом прокручиваем.
   Так же обрабатываем повторный клик по той же ссылке и переход с другой страницы. */

function scrollToId(id: string, smooth: boolean) {
  const el = document.getElementById(id);
  if (!el) return;
  document.documentElement.classList.add("cv-off");
  void document.documentElement.offsetHeight; // пересчёт раскладки с настоящими высотами
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  el.scrollIntoView({ behavior: smooth && !reduce ? "smooth" : "auto", block: "start" });
}

// после того как React закроет мобильное меню и вернёт прокрутку страницы
const later = (fn: () => void) => requestAnimationFrame(() => requestAnimationFrame(fn));

export function AnchorScroll() {
  const pathname = usePathname();

  // Пришли на страницу уже с якорем (в т.ч. со страницы кейса на главную)
  useEffect(() => {
    const id = decodeURIComponent(window.location.hash.slice(1));
    if (!id) return;
    const t = window.setTimeout(() => scrollToId(id, false), 60);
    return () => window.clearTimeout(t);
  }, [pathname]);

  // Клики по ссылкам на якоря этой же страницы
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a[href*='#']") as HTMLAnchorElement | null;
      if (!a || (a.target && a.target !== "_self")) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin || url.pathname !== window.location.pathname || !url.hash) return;
      const id = decodeURIComponent(url.hash.slice(1));
      if (!document.getElementById(id)) return;
      e.preventDefault(); // перехватываем раньше next/link (слушатель в фазе захвата)
      if (window.location.hash !== url.hash) history.pushState(history.state, "", url.hash);
      later(() => scrollToId(id, true));
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  return null;
}
