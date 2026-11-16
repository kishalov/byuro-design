import { NextResponse, type NextRequest } from "next/server";
import { isLocale, LOCALE_COOKIE, matchLocale, parseAcceptLanguage } from "@/i18n/config";

/* Серверный выбор языка (Next 16: proxy, бывш. middleware).
   1) явный выбор пользователя (cookie) → 2) Accept-Language → 3) английский.
   IP/страна не используются: человек в Германии может предпочитать русский. */
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const first = pathname.split("/")[1] ?? "";
  if (isLocale(first)) return NextResponse.next();

  const saved = req.cookies.get(LOCALE_COOKIE)?.value;
  const locale = saved && isLocale(saved) ? saved : matchLocale(parseAcceptLanguage(req.headers.get("accept-language")));

  const url = req.nextUrl.clone();
  url.pathname = `/${locale}${pathname === "/" ? "/" : pathname}`;
  const res = NextResponse.redirect(url, 307);
  res.headers.set("Vary", "Accept-Language, Cookie");
  return res;
}

export const config = {
  // всё, кроме API, служебных файлов Next и статики (файлы с точкой)
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
