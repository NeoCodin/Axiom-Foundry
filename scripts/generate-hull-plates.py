# Generates the B "hull plate" 9-slice frames as CSS custom properties.
# Run from any folder: writes tokens.css there; paste its :root block into
# app/style-b.css. The mask previews it prints are a quick visual check.
from urllib.parse import quote

def shape(size, margin, tl, tr, br, bl):
    """tl/br: per-row insets from the corner (chamfer); tr/bl: notch insets."""
    n = size - 2 * margin
    m = [[0] * size for _ in range(size)]
    for y in range(n):
        left = (tl[y] if y < len(tl) else 0)
        right = (tr[y] if y < len(tr) else 0)
        yb = n - 1 - y
        left = max(left, bl[yb] if yb < len(bl) else 0)
        right = max(right, br[yb] if yb < len(br) else 0)
        for x in range(left, n - right):
            m[y + margin][x + margin] = 1
    return m

def erode(m):
    s = len(m); out = [[0] * s for _ in range(s)]
    for y in range(s):
        for x in range(s):
            if m[y][x] and all(0 <= y + dy < s and 0 <= x + dx < s and m[y + dy][x + dx] for dy, dx in ((1,0),(-1,0),(0,1),(0,-1))):
                out[y][x] = 1
    return out

def dilate(m):
    s = len(m); out = [[0] * s for _ in range(s)]
    for y in range(s):
        for x in range(s):
            if m[y][x] or any(0 <= y + dy < s and 0 <= x + dx < s and m[y + dy][x + dx] for dy, dx in ((1,0),(-1,0),(0,1),(0,-1))):
                out[y][x] = 1
    return out

def svg(size, outer, colors, halo=False, rivets=()):
    inner = erode(outer)
    grid = [[None] * size for _ in range(size)]
    if halo:
        d = dilate(outer)
        for y in range(size):
            for x in range(size):
                if d[y][x] and not outer[y][x]: grid[y][x] = colors['halo']
    for y in range(size):
        for x in range(size):
            if outer[y][x] and not inner[y][x]: grid[y][x] = colors['line']
            elif inner[y][x]:
                c = colors['fill']
                if y > 0 and not inner[y-1][x]: c = colors['hi']
                elif y < size - 1 and not inner[y+1][x]: c = colors['lo']
                grid[y][x] = c
    for (x, y) in rivets:
        if inner[y][x]: grid[y][x] = colors['rivet']
    rects = []
    for y in range(size):
        x = 0
        while x < size:
            c = grid[y][x]
            if c is None: x += 1; continue
            e = x
            while e < size and grid[y][e] == c: e += 1
            rects.append(f"<rect x='{x}' y='{y}' width='{e-x}' height='1' fill='{c}'/>")
            x = e
    body = ''.join(rects)
    raw = f"<svg xmlns='http://www.w3.org/2000/svg' width='{size}' height='{size}' viewBox='0 0 {size} {size}' shape-rendering='crispEdges'>{body}</svg>"
    return 'url("data:image/svg+xml,' + quote(raw, safe="=:/' ") + '")'

HALO = '#0b0c1d'
# Plate: 16x16, slice 7. A long stepped chamfer top-left and bottom-right,
# a small notch top-right and bottom-left, rivets beside the two chamfers.
plate = shape(16, 1, [5, 4, 3, 2, 1], [2, 1], [5, 4, 3, 2, 1], [2, 1])
plate_rivets = ((5, 4), (10, 11))
# Key (buttons): 10x10, slice 4, the same cut at button scale, no halo.
key = shape(10, 0, [3, 2, 1], [1], [3, 2, 1], [1])

PALETTES = {
    'base':   dict(line='#4b4566', fill='#15131f', hi='#262238', lo='#0c0b14', rivet='#6a6290', halo=HALO),
    'bright': dict(line='#efe6d2', fill='#15131f', hi='#2a2540', lo='#0c0b14', rivet='#8f84a0', halo=HALO),
    'warm':   dict(line='#ffd27a', fill='#211c2e', hi='#3a3045', lo='#120f1a', rivet='#ffd27a', halo=HALO),
    'alert':  dict(line='#ff6b4a', fill='#211a24', hi='#3a2730', lo='#120d12', rivet='#ff6b4a', halo=HALO),
    'dim':    dict(line='#2f2b42', fill='#100e18', hi='#18152a', lo='#0a0910', rivet='#2f2b42', halo=HALO),
    'lit':    dict(line='#1b1726', fill='#ffd27a', hi='#fff1c2', lo='#c99a3e', rivet='#c99a3e', halo=HALO),
}
lines = [':root {']
for name, pal in PALETTES.items():
    lines.append(f"  --b-plate-{name}: {svg(16, plate, pal, halo=True, rivets=plate_rivets)};")
for name, pal in PALETTES.items():
    lines.append(f"  --b-key-{name}: {svg(10, key, pal)};")
lines.append('}')
open('tokens.css', 'w', newline='\n').write('\n'.join(lines) + '\n')
# Preview: render the plate mask as text for a sanity check.
for row in plate: print(''.join('#' if v else '.' for v in row))
print()
for row in key: print(''.join('#' if v else '.' for v in row))
