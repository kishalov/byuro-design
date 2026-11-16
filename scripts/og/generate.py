"""OG-картинки 1200×630 для соцсетей и мессенджеров.

Что делает:
  • public/og/home-<locale>.png — обложка сайта на каждом языке (заголовок героя, маскот, стикеры);
  • public/og/case-<slug>.jpg   — обложка каждого кейса: та же композиция, что на карточке сайта, + логотип.

Как запустить (после добавления кейса или смены заголовка):
  npm run build && npx next start -p 3100 &
  npx tsx scripts/og/dump-texts.ts > /tmp/og-texts.json
  python3 scripts/og/generate.py http://localhost:3100 /tmp/og-texts.json public/og
Нужны: pip install playwright pillow && python3 -m playwright install chromium
"""
import asyncio, html, json, sys
from pathlib import Path
from PIL import Image
from playwright.async_api import async_playwright

BASE, TEXTS, OUT = sys.argv[1].rstrip("/"), json.load(open(sys.argv[2])), Path(sys.argv[3])
OUT.mkdir(parents=True, exist_ok=True)
W, H = 1200, 630

LOGO = '<span class="og-logo">БЮР<i></i></span>'

CSS = """
html,body{margin:0!important;padding:0!important;background:#F1ECE2!important;overflow:hidden!important}
body>*:not(#og){display:none!important}
#og{position:fixed;inset:0 auto auto 0;width:1200px;height:630px;overflow:hidden;background:#F1ECE2;color:#121212;z-index:2147483647;
  background-image:radial-gradient(circle,rgb(18 18 18 / .13) 1.5px,transparent 1.7px);background-size:26px 26px}
.og-logo{font-family:var(--font-display);font-weight:900;font-size:34px;letter-spacing:-.02em;display:inline-flex;align-items:baseline;line-height:1}
.og-logo i{display:inline-block;width:.62em;height:.62em;border-radius:50%;background:#FF4D2E;margin-left:.08em}
#og .top{position:absolute;left:68px;top:58px;display:flex;align-items:center;gap:22px}
#og .eb{font-family:'JetBrains Mono',monospace;font-size:15px;letter-spacing:.04em;text-transform:uppercase;color:#5F5A52;
  padding:8px 14px;border:2px dashed #8C867B;border-radius:999px;white-space:nowrap;max-width:610px;overflow:hidden;text-overflow:ellipsis}
#og h1{position:absolute;left:68px;top:150px;width:640px;height:300px;margin:0;display:flex;align-items:center}
#og h1 span.t{font-family:var(--font-display);font-weight:800;letter-spacing:-.03em;line-height:1.02;text-wrap:balance}
:lang(hi) #og h1 span.t{letter-spacing:0;line-height:1.3}
:lang(zh) #og h1 span.t,:lang(ja) #og h1 span.t{letter-spacing:.02em;line-height:1.2;font-family:var(--font-display),"Noto Sans CJK SC","Noto Sans CJK JP",sans-serif;font-weight:900}
:lang(ja) #og h1 span.t{word-break:auto-phrase}
#og .sel{position:relative;display:inline-block;white-space:nowrap;line-height:1;padding:0 .06em;outline:3px solid #FF4D2E;outline-offset:.05em}
#og .sel b{position:absolute;width:12px;height:12px;background:#fff;border:3px solid #FF4D2E}
#og .chips{position:absolute;left:62px;bottom:52px;display:flex;flex-wrap:wrap;gap:10px;max-width:660px}
#og .chip{font-family:var(--font-display);font-weight:700;font-size:19px;padding:10px 18px;border-radius:999px;border:3px solid #fff;
  background:#fff;box-shadow:0 10px 22px -8px rgb(18 18 18 / .3);line-height:1.1}
#og .chip.ink{background:#121212;color:#F1ECE2}
#og .chip.coral{background:#FF4D2E;color:#121212}
#og .chip.sand{background:#E4DCCD}
#og .disc{position:absolute;right:-70px;bottom:-150px;width:600px;height:600px;border-radius:50%;background:#FF4D2E}
#og .ring{position:absolute;right:-110px;bottom:-190px;width:680px;height:680px;border-radius:50%;border:3px dashed rgb(18 18 18 / .35)}
#og .masc{position:absolute;right:58px;bottom:-6px;height:470px}
#og .bub{position:absolute;right:360px;top:120px;font-family:var(--font-display);font-weight:800;font-size:26px;background:#fff;border:3px solid #121212;
  padding:12px 22px;border-radius:26px 26px 26px 6px;transform:rotate(-6deg);box-shadow:5px 6px 0 #121212}
#og .star{position:absolute;right:420px;top:400px;width:46px;height:46px;background:#121212;
  clip-path:polygon(50% 0,61% 39%,100% 50%,61% 61%,50% 100%,39% 61%,0 50%,39% 39%)}
/* кейс */
#og.case{background:#F1ECE2}
#og .cover{position:absolute;inset:0}
#og .cover>*{width:100%!important;height:100%!important;aspect-ratio:auto!important;border-radius:0!important;box-shadow:none!important}
#og .badge{position:absolute;left:34px;bottom:30px;z-index:30;background:#121212;color:#F1ECE2;padding:14px 22px;border-radius:999px;
  box-shadow:0 12px 26px -10px rgb(0 0 0 / .55);border:3px solid #fff}
#og .badge .og-logo{font-size:28px}
"""

async def fit(page):
    # подбираем кегль, чтобы заголовок занял блок 640×300 и не вылез за него
    await page.evaluate("""() => {
      const box = document.querySelector('#og h1'), t = box.querySelector('.t');
      let lo = 30, hi = 96;
      while (hi - lo > 1) { const m = (lo + hi) >> 1; t.style.fontSize = m + 'px';
        (t.scrollWidth <= box.clientWidth && t.offsetHeight <= box.clientHeight) ? lo = m : hi = m; }
      t.style.fontSize = lo + 'px';
      for (const s of document.querySelectorAll('#og .sel')) {
        const [a,b,c,d] = s.querySelectorAll('b'), o = '-9px';
        Object.assign(a.style,{left:o,top:o}); Object.assign(b.style,{right:o,top:o});
        Object.assign(c.style,{left:o,bottom:o}); Object.assign(d.style,{right:o,bottom:o});
      }
    }""")

async def home(page, loc, t):
    await page.goto(f"{BASE}/{loc}/", wait_until="networkidle")
    title, boxed = html.escape(t["title"]), html.escape(t["boxed"])
    title = title.replace(boxed, f'<span class="sel">{boxed}<b></b><b></b><b></b><b></b></span>', 1)
    tones = ["ink", "coral", "", "sand"]
    chips = "".join(f'<span class="chip {tones[i % 4]}" style="transform:rotate({[-3, 2, -1.5, 3][i % 4]}deg)">{html.escape(c)}</span>'
                    for i, c in enumerate(t["categories"]))
    markup = f"""<div id="og">
      <div class="top">{LOGO}<span class="eb">{html.escape(t['eyebrow'])}</span></div>
      <h1><span class="t">{title}</span></h1>
      <div class="chips">{chips}</div>
      <div class="ring"></div><div class="disc"></div>
      <span class="star"></span>
      <img class="masc" src="/mascot/happy-640.webp" alt="">
      <span class="bub">{html.escape(t['hello'])}</span>
    </div>"""
    await page.evaluate("([css, m]) => { const s = document.createElement('style'); s.textContent = css; document.head.append(s); document.body.insertAdjacentHTML('beforeend', m); }", [CSS, markup])
    await page.evaluate("document.fonts.ready")
    await page.wait_for_function("[...document.images].filter(i=>i.closest('#og')).every(i=>i.complete && i.naturalWidth)")
    await fit(page)
    await page.wait_for_timeout(150)
    await page.screenshot(path=str(OUT / f"home-{loc}.png"), clip={"x": 0, "y": 0, "width": W, "height": H})

async def case(page, slug):
    await page.goto(f"{BASE}/en/", wait_until="networkidle")
    cover = page.locator(f'article:has(a[href*="/cases/{slug}/"]) > div.relative > *:first-child').first
    await cover.scroll_into_view_if_needed()
    await page.wait_for_timeout(1200)   # видео/картинки успевают загрузиться
    await page.evaluate("""([css, slug, logo]) => {
      const s = document.createElement('style'); s.textContent = css; document.head.append(s);
      const art = document.querySelector(`article:has(a[href*="/cases/${slug}/"]) > div.relative > *:first-child`);
      const og = document.createElement('div'); og.id = 'og'; og.className = 'case';
      const wrap = document.createElement('div'); wrap.className = 'cover'; wrap.append(art);
      og.append(wrap); og.insertAdjacentHTML('beforeend', `<span class="badge">${logo}</span>`);
      document.body.append(og); window.scrollTo(0, 0);
      // вместо живого кадра видео — постер ролика (стабильная, выбранная картинка)
      og.querySelectorAll('video').forEach(v => {
        const img = document.createElement('img'); img.src = v.poster; img.alt = '';
        img.className = v.className; img.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block';
        v.replaceWith(img);
      });
    }""", [CSS, slug, LOGO])
    await page.evaluate("document.fonts.ready")
    await page.wait_for_function("[...document.querySelectorAll('#og img')].every(i => i.complete && i.naturalWidth)")
    await page.wait_for_timeout(600)
    await page.screenshot(path=str(OUT / f"case-{slug}.png"), clip={"x": 0, "y": 0, "width": W, "height": H})

def shrink(p: Path):
    # главная — PNG с палитрой (плоская графика), кейсы — JPEG (фото и рендеры): обе < 300 КБ для мессенджеров
    im = Image.open(p).convert("RGB")
    if p.name.startswith("home-"):
        im.quantize(colors=256, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.FLOYDSTEINBERG).save(p, optimize=True)
    else:
        im.save(p.with_suffix(".jpg"), quality=86, optimize=True, progressive=True)
        p.unlink()

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=["--autoplay-policy=no-user-gesture-required", "--no-sandbox"],
                                    executable_path="/usr/bin/google-chrome" if Path("/usr/bin/google-chrome").exists() else None)
        ctx = await b.new_context(viewport={"width": W, "height": H}, device_scale_factor=1, reduced_motion="no-preference")
        page = await ctx.new_page()
        only = sys.argv[4:]  # можно указать конкретные: home-ru case-nibble
        for loc, t in TEXTS["locales"].items():
            if not only or f"home-{loc}" in only:
                await home(page, loc, t); print("home", loc)
        for slug in TEXTS["cases"]:
            if not only or f"case-{slug}" in only:
                await case(page, slug); print("case", slug)
        await b.close()
    for f in OUT.glob("*.png"):
        if not only or f.stem in only:
            shrink(f)

asyncio.run(main())
