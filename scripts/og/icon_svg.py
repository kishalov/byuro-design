# SVG-иконка «Б●» из настоящего глифа Unbounded Black (кривые, без зависимости от шрифта).
import sys
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.boundsPen import BoundsPen
f = TTFont(str(__import__('pathlib').Path(__file__).resolve().parents[2] / 'public/fonts') + '/unbounded-cyrillic-wght-normal.woff2')
f = instantiateVariableFont(f, {"wght": 900})
gs = f.getGlyphSet(); cmap = f.getBestCmap(); upm = f['head'].unitsPerEm
g = cmap[0x0411]
bp = BoundsPen(gs); gs[g].draw(bp); xmin, ymin, xmax, ymax = bp.bounds
pen = SVGPathPen(gs); gs[g].draw(pen); d = pen.getCommands()
gw, gh = xmax - xmin, ymax - ymin
def svg(size=512, rx=112, scale_k=1.0):
    S = size
    H = S * 0.50 * scale_k                # высота буквы
    k = H / gh
    dot = H * 0.36                        # диаметр точки
    gap = H * 0.07
    total = gw * k + gap + dot
    x0 = (S - total) / 2 - xmin * k
    base = S / 2 + H / 2                   # нижняя линия буквы
    cx = (S - total) / 2 + gw * k + gap + dot / 2
    cy = base - dot / 2
    tr = f'translate({x0:.2f} {base + ymin * k:.2f}) scale({k:.5f} {-k:.5f})'
    r = f' rx="{rx}"' if rx else ''
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {S} {S}">'
            f'<rect width="{S}" height="{S}"{r} fill="#121212"/>'
            f'<path transform="{tr}" fill="#F1ECE2" d="{d}"/>'
            f'<circle cx="{cx:.2f}" cy="{cy:.2f}" r="{dot/2:.2f}" fill="#FF4D2E"/></svg>')
out = sys.argv[1] if len(sys.argv) > 1 else '.'
open(f'{out}/icon-rounded.svg', 'w').write(svg(rx=112))
open(f'{out}/icon-square.svg', 'w').write(svg(rx=0))
open(f'{out}/icon-maskable.svg', 'w').write(svg(rx=0, scale_k=0.82))
print('ok', len(d))
