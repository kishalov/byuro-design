"""Подготовка шрифтов для PDF коммерческого предложения (assets/pdf-fonts).

Источник — вариативные TTF из github.com/google/fonts (ofl/unbounded, onest,
notosansdevanagari, notosanssc, notosansjp). Скрипт делает статичные начертания,
оставляет нужные наборы символов (латиница, кириллица, деванагари, GB2312, JIS X 0208)
и добавляет служебные глифы для переносов в react-pdf (см. src/lib/pdf/fonts.ts).

    python3 scripts/pdf-fonts.py <папка с исходными TTF> assets/pdf-fonts/
"""
import sys
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
from fontTools import subset
S=sys.argv[1].rstrip("/")+"/"; O=sys.argv[2].rstrip("/")+"/"
def chars_enc(enc, ranges):
    out=set()
    for a in ranges:
        for b in range(0xA1,0xFF):
            try: out.add(bytes([a,b]).decode(enc))
            except Exception: pass
    return out
base=set(chr(c) for c in range(0x20,0x7F))|set(chr(c) for c in range(0xA0,0x180))|set("–—‘’“”„«»…•·№€₽₹¥$×÷−≈±‰†‐‑ \u200a\u200b\ufeff")
cyr=set(chr(c) for c in range(0x400,0x460))|set(chr(c) for c in range(0x490,0x4B2))
latext=set(chr(c) for c in range(0x180,0x250))|set(chr(c) for c in range(0x1E00,0x1F00))
gb=chars_enc("gb2312", range(0xA1,0xF8))
jis=chars_enc("euc_jp", range(0xA1,0xF5))
cjkp=set(chr(c) for c in range(0x3000,0x3100))|set(chr(c) for c in range(0xFF00,0xFFF0))
deva=set(chr(c) for c in range(0x900,0x980))|set("‌‍◌₹")
jobs=[
 ("Unbounded[wght].ttf",{"wght":700},"Unbounded-Bold.ttf",base|cyr|latext),
 ("Onest[wght].ttf",{"wght":400},"Onest-Regular.ttf",base|cyr|latext),
 ("Onest[wght].ttf",{"wght":600},"Onest-SemiBold.ttf",base|cyr|latext),
 ("NotoSansDevanagari[wdth,wght].ttf",{"wght":400,"wdth":100},"NotoSansDevanagari-Regular.ttf",base|deva),
 ("NotoSansDevanagari[wdth,wght].ttf",{"wght":600,"wdth":100},"NotoSansDevanagari-SemiBold.ttf",base|deva),
 ("NotoSansSC[wght].ttf",{"wght":400},"NotoSansSC-Regular.ttf",base|gb|cjkp|cyr),
 ("NotoSansSC[wght].ttf",{"wght":700},"NotoSansSC-Bold.ttf",base|gb|cjkp|cyr),
 ("NotoSansJP[wght].ttf",{"wght":400},"NotoSansJP-Regular.ttf",base|jis|cjkp|cyr),
 ("NotoSansJP[wght].ttf",{"wght":700},"NotoSansJP-Bold.ttf",base|jis|cjkp|cyr),
]
for src,loc,dst,chars in jobs:
    f=TTFont(S+src)
    inst=instancer.instantiateVariableFont(f,loc)
    opts=subset.Options(); opts.layout_features=["*"]; opts.name_IDs=["*"]; opts.notdef_outline=True; opts.hinting=False
    sub=subset.Subsetter(opts); sub.populate(text="".join(chars)); sub.subset(inst)
    inst.save(O+dst); print(dst)

# Zero-width break opportunity glyph (U+FEFF) — used by the PDF line breaker for CJK.
from fontTools.ttLib.tables._g_l_y_f import Glyph
import glob
for p in glob.glob(O+"*.ttf"):
    f=TTFont(p)
    if 0xFEFF in f.getBestCmap(): continue
    name="uniFEFF"
    order=f.getGlyphOrder()+[name]
    f.setGlyphOrder(order)
    f["glyf"].glyphs[name]=Glyph(); f["glyf"].glyphOrder=order
    f["hmtx"].metrics[name]=(0,0)
    if "vmtx" in f: f["vmtx"].metrics[name]=(0,0)
    for t in f["cmap"].tables:
        if t.isUnicode(): t.cmap[0xFEFF]=name
    f["maxp"].numGlyphs=len(order)
    f.save(p)
print("feff added")
