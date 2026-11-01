# One-off migration used for art direction B (Nov 2026): recolours the old
# palette's low-saturation teal-greys in app/*.css to the same lightness in
# B's neutral lavender-grey. Accents and meaning colours are untouched.
# Dry run: python scripts/recolor-teal-neutrals.py ; apply: ... apply
import re, sys, glob, collections
APPLY = len(sys.argv) > 1 and sys.argv[1] == 'apply'
files = [f for f in glob.glob('app/*.css') if not f.endswith('style-b.css')]
def tealish(r, g, b):
    mx, mn = max(r, g, b), min(r, g, b)
    return g - r >= 6 and b - r >= 6 and (mx - mn) <= 80 and mx <= 215
def remap(r, g, b):
    y = 0.2126 * r + 0.7152 * g + 0.0722 * b
    out = (y * 0.98, y * 0.94, y * 1.2)
    return tuple(max(0, min(255, round(v))) for v in out)
hexre = re.compile(r'#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b')
rgbre = re.compile(r'rgba?\(\s*(\d{1,3})[\s,]+(\d{1,3})[\s,]+(\d{1,3})(\s*(?:[,/]\s*[\d.]+%?)?)\s*\)')
stats = collections.Counter(); samples = {}
for f in files:
    s = open(f, encoding='utf-8').read()
    def hx(m):
        h = m.group(1)
        if len(h) == 3: h = ''.join(c * 2 for c in h)
        r, g, b = int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)
        if not tealish(r, g, b): return m.group(0)
        nr, ng, nb = remap(r, g, b)
        new = f'#{nr:02x}{ng:02x}{nb:02x}'
        stats[f] += 1; samples.setdefault(m.group(0).lower(), new)
        return new
    def rg(m):
        r, g, b = int(m.group(1)), int(m.group(2)), int(m.group(3))
        if not tealish(r, g, b): return m.group(0)
        nr, ng, nb = remap(r, g, b)
        alpha = m.group(4) or ''
        alpha = alpha.strip()
        if alpha.startswith(','): alpha = ' /' + alpha[1:]
        elif alpha: alpha = ' ' + alpha
        new = f'rgb({nr} {ng} {nb}{alpha})'
        stats[f] += 1; samples.setdefault(m.group(0), new)
        return new
    # skip "var(--world-accent-rgb, 85 214 232)" style fallbacks: not matched (no rgb( prefix)
    t = rgbre.sub(rg, hexre.sub(hx, s))
    if APPLY and t != s: open(f, 'w', encoding='utf-8', newline='\n').write(t)
print(dict(stats)); print(sum(stats.values()))
for k, v in list(samples.items())[:24]: print(k, '->', v)
