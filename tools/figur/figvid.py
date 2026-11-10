"""Auftakt (120 Bilder, 60 fps) und Ruheschleife (8 s, 30 fps) der Figur mit durchsichtigem Grund und hellem
Schein um die Figur: auf Weiss unsichtbar, im erzwungenen Dunkelmodus (Samsung Internet) bleibt die Figur sichtbar.
Videos faerbt der Browser nicht um - anders als Inline-SVG."""
import math, os, sys
sys.path.insert(0, '.')
from frames3 import svg_frame, TOTAL
HALO = 0.0           # kein Schein mehr (Dunkelmodus per Mischung, siehe pack.py)
def to_svg2(o, halo=HALO, breath=0.0, tilt=0.0, glow_mul=1.0, w=1172, h=968):
    (pc, pw, phh, pang) = o['phone']; hx, hy, R = o['head']
    Ls = lambda arr: '<g clip-path="url(#si)">' + ''.join(f'<path d="{d}" fill="#fff"/>' for d in arr) + '</g>'   # Linien nie am Grund (pack.py)
    bt = f'translate(383 560) scale({1+0.006*breath:.5f} {1+0.010*breath:.5f}) translate(-383 -560)'
    ht = f'rotate({tilt:.4f} 383 300)'
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="90 96 586 484" width="{w}" height="{h}">
<defs>
 <radialGradient id="glow" cx="390" cy="430" r="96" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fffaf0" stop-opacity=".96"/><stop offset=".32" stop-color="#efe5cc" stop-opacity=".6"/><stop offset="1" stop-color="#efe5cc" stop-opacity="0"/></radialGradient>
 <radialGradient id="face" cx="392" cy="318" r="92" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#f6edd6" stop-opacity=".55"/><stop offset="1" stop-color="#f6edd6" stop-opacity="0"/></radialGradient>
 <radialGradient id="sheen" cx="292" cy="336" r="150" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#3b4246" stop-opacity=".32"/><stop offset="1" stop-color="#3b4246" stop-opacity="0"/></radialGradient>
 <radialGradient id="shadow" cx="383" cy="562" r="130" gradientTransform="matrix(1 0 0 .09 0 511.4)" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#0b1114" stop-opacity=".2"/><stop offset="1" stop-color="#0b1114" stop-opacity="0"/></radialGradient>
 <linearGradient id="hfade" x1="0" y1="96" x2="0" y2="580" gradientUnits="userSpaceOnUse"><stop offset="0.86" stop-color="#fff"/><stop offset="0.95" stop-color="#fff" stop-opacity="0"/></linearGradient>
 <mask id="hmask" maskUnits="userSpaceOnUse" x="90" y="96" width="586" height="484"><rect x="90" y="96" width="586" height="484" fill="url(#hfade)"/></mask>
 <filter id="halo" x="-20%" y="-20%" width="140%" height="140%"><feMorphology operator="dilate" radius="2"/><feGaussianBlur stdDeviation="7"/></filter>
 <clipPath id="si"><path d="{o['silin']}"/></clipPath>
 <clipPath id="tv"><path d="{o['trunk']}"/></clipPath><clipPath id="hd"><circle cx="{hx:.2f}" cy="{hy:.2f}" r="{R}"/></clipPath>
</defs>
<ellipse cx="383" cy="562" rx="150" ry="14" fill="url(#shadow)"/>
<g transform="{bt}">
<g mask="url(#hmask)"><g opacity="{halo:.3f}" filter="url(#halo)" fill="#fff"><path d="{o['body']}"/><g transform="{ht}"><circle cx="{hx:.2f}" cy="{hy:.2f}" r="{R}"/></g></g></g>
<path d="{o['body']}" fill="#0b0d0e"/>
<rect x="220" y="280" width="330" height="330" fill="url(#sheen)" clip-path="url(#tv)"/>
<rect x="220" y="280" width="330" height="330" fill="url(#glow)" clip-path="url(#tv)" opacity="{o['glow']*glow_mul:.3f}"/>
<rect x="{pc[0]-pw/2:.2f}" y="{pc[1]-phh/2:.2f}" width="{pw:.2f}" height="{phh:.2f}" rx="8" transform="rotate({pang:.2f} {pc[0]:.2f} {pc[1]:.2f})" fill="#0b0d0e" stroke="#d6cfbb" stroke-width="1.2"/>
<circle cx="{o['cam'][0]:.2f}" cy="{o['cam'][1]:.2f}" r="3.2" fill="#cfc9b8"/><circle cx="{o['cam'][0]:.2f}" cy="{o['cam'][1]:.2f}" r="1.3" fill="#3a3a38"/>
<path d="{o['rhand']}" fill="#0b0d0e"/>{Ls(o['linesR'])}
<g transform="{ht}"><circle cx="{hx:.2f}" cy="{hy:.2f}" r="{R}" fill="#0b0d0e"/>
<rect x="290" y="130" width="190" height="180" fill="url(#face)" clip-path="url(#hd)" opacity="{o['face']:.3f}"/></g>
<path d="{o['larm']}" fill="#0b0d0e"/>{Ls(o['linesL'])}
</g>
</svg>'''
LOOP_S, LOOP_FPS = 8.0, 30
def loop_params(i):
    t = i / LOOP_FPS
    b = 0.5 - 0.5 * math.cos(2 * math.pi * t / LOOP_S)              # ein Atemzug je Schleife
    th = 1.3 * math.sin(2 * math.pi * t / LOOP_S)                   # Kopf neigt sich leicht hin und her
    g = 0.5 - 0.5 * math.cos(2 * math.pi * t / (LOOP_S / 2))        # Licht des Handys atmet zweimal
    return b, th, 1 - 0.2 * g
if __name__ == '__main__':
    which = sys.argv[1]
    if which == 'intro':
        os.makedirs('svgA', exist_ok=True)
        for f in range(TOTAL): open(f'svgA/f{f:03d}.svg', 'w').write(to_svg2(svg_frame(f)))
    elif which == 'loop':
        os.makedirs('svgL', exist_ok=True); o = svg_frame(TOTAL - 1)
        for i in range(int(LOOP_S * LOOP_FPS)):
            b, th, gm = loop_params(i); open(f'svgL/f{i:03d}.svg', 'w').write(to_svg2(o, breath=b, tilt=th, glow_mul=gm))
    print('ok')
