import { Logo } from "@/components/ui/Logo";
import { defaultLocale, locales } from "@/i18n/config";

/* x-default: страница выбора языка.
   На сервере сюда почти никто не попадает — proxy.ts сразу перенаправляет
   по сохранённому выбору или Accept-Language. В статическом превью то же
   самое делает встроенный скрипт по navigator.languages. Без JS — список языков. */
const detect = `(function(){try{var L=${JSON.stringify(locales.map((l) => l.code))};var s=null;try{s=localStorage.getItem('byuro-locale')}catch(e){}
var m=document.cookie.match(/(?:^|; )NEXT_LOCALE=([^;]+)/);if(!s&&m)s=m[1];
function pick(p){for(var i=0;i<p.length;i++){var t=(p[i]||'').toLowerCase();if(t.indexOf('zh')===0){if(!/^zh-(tw|hk|mo|hant)/.test(t))return 'zh-cn';continue}if(t.indexOf('sr')===0)return 'sr';var b=t.split('-')[0];if(L.indexOf(b)>-1)return b}return '${defaultLocale}'}
var c=(s&&L.indexOf(s)>-1)?s:pick(navigator.languages||[navigator.language]);location.replace('/'+c+'/'+location.hash)}catch(e){}})()`;

export default function LanguageChooser() {
  return (
    <main className="grain grid min-h-dvh place-items-center bg-paper p-6">
      <script dangerouslySetInnerHTML={{ __html: detect }} />
      <div className="w-full max-w-md text-center">
        <Logo className="text-5xl" />
        <ul className="mt-10 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {locales.map((l) => (
            <li key={l.code}>
              <a href={`/${l.code}/`} hrefLang={l.hreflang} lang={l.htmlLang} className="flex min-h-12 items-center justify-center rounded-pill border-2 border-ink/15 px-3 font-semibold hover:border-ink">
                {l.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
