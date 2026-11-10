import math, json, sys, os
sys.path.insert(0,'.')
from fig import *
from shapely.geometry import Polygon, Point
from shapely.ops import unary_union
def ease(t): return 4*t*t*t if t<0.5 else 1-pow(-2*t+2,3)/2
def span(t,a,b): return max(0.0,min(1.0,(t-a)/(b-a)))
def lerp(a,b,t): return a+(b-a)*t
TOTAL=60
# Knochen der Endhaltung (zur gezeichneten Form passend)
EL,WLf=(280,488),(338,364); ER,WRf=(500,480),(440,456)
def frame_of(E,Wf):
    L=math.dist(E,Wf); ux,uy=(Wf[0]-E[0])/L,(Wf[1]-E[1])/L; return L,(ux,uy)
LL0,DL0=frame_of(EL,WLf); LR0,DR0=frame_of(ER,WRf)
def to_uv(p,E,L,d): vx,vy=p[0]-E[0],p[1]-E[1]; return ((vx*d[0]+vy*d[1])/L, -vx*d[1]+vy*d[0])
def from_uv(u,v,E,L,d): return (E[0]+u*L*d[0]-v*d[1], E[1]+u*L*d[1]+v*d[0])
def chaikin(pts, it=1):
    for _ in range(it):
        out=[]; n=len(pts)
        for i in range(n):
            p,q=pts[i],pts[(i+1)%n]; out.append((0.75*p[0]+0.25*q[0],0.75*p[1]+0.25*q[1])); out.append((0.25*p[0]+0.75*q[0],0.25*p[1]+0.75*q[1]))
        pts=out
    return pts
def pose_arm(pts, E, L0, d0, phi, Lnew, wrist, k, hand_from=0.86, anchor=0.2, widen=None):
    """gezeichnete Unterarm-/Handkontur entlang des Knochens neu setzen (Drehung, Verkuerzung, Handgelenk)"""
    dn=(math.cos(phi),math.sin(phi)); Wn=(E[0]+Lnew*dn[0],E[1]+Lnew*dn[1]); W0=(E[0]+L0*d0[0],E[1]+L0*d0[1])
    out=[]; us=[]
    for p in pts:
        u,v=to_uv(p,E,L0,d0); us.append(u)
        if widen: v*=widen(u)                                              # Unterarm so breit wie der andere
        pf=from_uv(u,v,E,Lnew,dn)                                         # Unterarm: verkuerzt entlang der Achse
        loc=rot(p,W0,-math.atan2(d0[1],d0[0])); lx,ly=loc[0]-W0[0],loc[1]-W0[1]
        ph=rot((Wn[0]+lx*k,Wn[1]+ly*k),Wn,phi+wrist)                      # Hand: am Handgelenk angehaengt
        w=smoothstep(hand_from,1.0,u)
        q=(pf[0]*(1-w)+ph[0]*w, pf[1]*(1-w)+ph[1]*w)
        s=(1-smoothstep(0.0,anchor,u)) if anchor>0 else 0.0               # Ellbogenende (nur rechts) im Oberarm verankert
        out.append((q[0]*(1-s)+p[0]*s, q[1]*(1-s)+p[1]*s))
    return out, us, Wn
def geo(f):
    ur=ease(span(f,2,32)); ul=ease(span(f,24,59))
    phiRf=math.atan2(DR0[1],DR0[0]); phiRf=phiRf if phiRf>0 else phiRf+2*math.pi
    phiR=lerp(math.radians(90),phiRf,ur); LR=lerp(150,LR0,ur)*(1-0.30*math.sin(math.pi*ur)); kR=1+0.10*math.sin(math.pi*ur)
    phiLf=math.atan2(DL0[1],DL0[0])
    phiL=lerp(math.radians(90),phiLf,ul); LL=lerp(150,LL0,ul)*(1-0.28*math.sin(math.pi*ul)); kL=1+0.08*math.sin(math.pi*ul)
    wristL=0.0                                                    # Unterarm bleibt gerade wie in der Zeichnung
    curl=1-smoothstep(0.45,0.95,ul)
    lp=fold_left(LP,LT,curl)
    # haengend (Start): der Unterarm fuehrt den Oberarm gerade weiter - so breit wie er, bis an den Koerper; beim
    # Anheben wird er schmaler und rueckt an seinen Platz
    hL=1-smoothstep(0.0,0.35,ul); hR=1-smoothstep(0.0,0.35,ur)
    widenL=lambda u: (1.0+0.30*(1-smoothstep(0.72,0.98,u)))*(1+0.15*hL)   # links so breit wie rechts (~53 statt ~40)
    larm,lus,WL=pose_arm(lp,EL,LL0,DL0,phiL,LL,wristL,kL,anchor=0.0,widen=widenL)
    rarm,rus,WR=pose_arm(RP,ER,LR0,DR0,phiR,LR,0.0,kR,widen=lambda u: 1+0.36*hR)
    larm=[(x-8.5*hL,y) for x,y in larm]; rarm=[(x-4.5*hR,y) for x,y in rarm]
    # Handy und Kamera folgen der Telefonhand (wie die Handpunkte)
    def hand_r(p):
        W0=(ER[0]+LR0*DR0[0],ER[1]+LR0*DR0[1]); loc=rot(p,W0,-math.atan2(DR0[1],DR0[0])); lx,ly=loc[0]-W0[0],loc[1]-W0[1]
        return rot((WR[0]+lx*kR,WR[1]+ly*kR),WR,phiR)
    phone=[hand_r(p) for p in PHONE]; cam=hand_r((375,395))
    # Daumen-/Fingerpunkte der rechten Hand gehoeren zur Hand (ab u ~0.86)
    return dict(larm=larm,lus=lus,rarm=rarm,rus=rus,phone=phone,cam=cam,WL=WL,WR=WR,ul=ul,ur=ur,
                glow=smoothstep(31,40,f), face=0 if f<33 else smoothstep(33,40,f)*(1-0.65*smoothstep(44,59,f)),
                nod=math.sin(math.pi*span(f,26,58)))
def runs(pts, mask, minlen=6):
    n=len(pts); start=next((k for k in range(n) if not mask[k]),None)
    if start is None: return [pts]
    out=[]; cur=[]
    for k in range(1,n+1):
        i=(start+k)%n
        if mask[i]: cur.append(pts[i])
        else:
            if len(cur)>minlen: out.append(cur)
            cur=[]
    if len(cur)>minlen: out.append(cur)
    return out
def svg_frame(f):
    g=geo(f)
    cx,cy,R=HEAD; hx,hy=cx+2.2*g['nod'], cy+3.0*g['nod']
    head=Point(hx,hy).buffer(R,quad_segs=48)
    L=Polygon(g['larm']).buffer(0); Rr=Polygon(g['rarm']).buffer(0); PH=Polygon(g['phone'])
    # Ellbogen als Gelenk: konvexe Huelle aus Ellbogenrundung und unterarmnahen Punkten -> keine Kerbe zwischen
    # Oberarm und Unterarm, in jeder Beugung
    from shapely.geometry import MultiPoint
    # Ellbogen: konvexe Huelle aus dem Ende des gezeichneten Oberarms und dem Anfang des Unterarms -> eine glatte
    # Aussenlinie von Ober- zu Unterarm, ohne Hoecker und ohne Kerbe; der Winkel unter dem Ellbogen zum Koerper bleibt frei
    SILP=list(TRUNK.exterior.coords)
    def elbow(E, pts, us, side):
        near=[p for p,u in zip(pts,us) if u<0.46]
        up=[p for p in SILP if math.dist(p,E)<52 and p[1]>E[1]-46 and (p[0]<E[0]+14 if side<0 else p[0]>E[0]-14)]
        return MultiPoint(near+up).convex_hull
    L=L.union(elbow(EL,g['larm'],g['lus'],-1)); Rr=Rr.union(elbow(ER,g['rarm'],g['rus'],1))
    body=unary_union([TRUNK,L,Rr]).intersection(CUT)
    L_draw=L.difference(Point(EL).buffer(64,quad_segs=32))      # obere Ebene nur ab dem Unterarm (der Ellbogen steckt im Koerper)
    trunk_vis=TRUNK.difference(unary_union([L,Rr])).intersection(CUT)
    def path(poly, smooth=1):
        if poly.is_empty: return ''
        gs=poly.geoms if poly.geom_type=='MultiPolygon' else [poly]
        return ' '.join(smooth_d(chaikin(ring_pts(gm),smooth)) for gm in gs if gm.area>4)
    # helle Linien: entlang der gezeichneten Unterarm-/Handkontur, nur u>0.3 und nur vor Schwarzem
    backR=unary_union([TRUNK,PH]).intersection(CUT).buffer(-3)
    backL=unary_union([TRUNK,Rr,PH,head]).intersection(CUT).buffer(-3)
    cutin=CUT.buffer(-2)
    # Linien nur entlang der bereinigten Aussenkontur (keine Zeichen von eingeklappten Fingern)
    def contour_u(poly, E, W):
        pts=ring_pts(poly if poly.geom_type=='Polygon' else max(poly.geoms,key=lambda x:x.area))
        L2=(W[0]-E[0])**2+(W[1]-E[1])**2
        return pts,[((p[0]-E[0])*(W[0]-E[0])+(p[1]-E[1])*(W[1]-E[1]))/L2 for p in pts]
    lpts,lu=contour_u(L,EL,g['WL']); rpts,ru=contour_u(Rr,ER,g['WR'])
    # helle Linien erst, wenn der Unterarm sich vom Koerper loest (haengend: keine Linie)
    mR=[g['ur']>0.1 and u>0.3 and cutin.contains(Point(p)) for p,u in zip(rpts,ru)]
    mL=[g['ul']>0.1 and u>0.3 and cutin.contains(Point(p)) for p,u in zip(lpts,lu)]
    handR=Rr.intersection(Polygon([(0,0),(0,0)]).buffer(0)) if False else None
    ph=g['phone']; pc=((ph[0][0]+ph[2][0])/2,(ph[0][1]+ph[2][1])/2); pang=math.degrees(math.atan2(ph[1][1]-ph[0][1],ph[1][0]-ph[0][0]))
    pw=math.dist(ph[0],ph[1]); phh=math.dist(ph[1],ph[2])
    # Teil der Telefonhand, der vor dem Handy liegt (u>0.86): ueber dem Handy noch einmal schwarz
    rhand=Polygon([p for p,u in zip(g['rarm'],g['rus'])]).buffer(0).intersection(PH.buffer(14)).intersection(CUT)
    return dict(body=path(body), trunk=path(trunk_vis,0), larm=path(L_draw.intersection(CUT)), rhand=path(rhand),
                linesL=[taper(r,3.6,0.12,0.12) for r in runs(lpts,mL,8)], linesR=[taper(r,3.6,0.12,0.12) for r in runs(rpts,mR,8)],
                phone=(pc,pw,phh,pang), cam=g['cam'], head=(hx,hy,R), glow=g['glow'], face=g['face'])
def to_svg(o, w=1172, h=968):
    (pc,pw,phh,pang)=o['phone']; hx,hy,R=o['head']
    Ls=lambda arr: ''.join(f'<path d="{d}" fill="#fff"/>' for d in arr)
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="90 96 586 484" width="{w}" height="{h}">
<defs>
 <radialGradient id="glow" cx="390" cy="430" r="96" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fffaf0" stop-opacity=".96"/><stop offset=".32" stop-color="#efe5cc" stop-opacity=".6"/><stop offset="1" stop-color="#efe5cc" stop-opacity="0"/></radialGradient>
 <radialGradient id="face" cx="392" cy="318" r="92" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#f6edd6" stop-opacity=".55"/><stop offset="1" stop-color="#f6edd6" stop-opacity="0"/></radialGradient>
 <radialGradient id="sheen" cx="292" cy="336" r="150" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#3b4246" stop-opacity=".32"/><stop offset="1" stop-color="#3b4246" stop-opacity="0"/></radialGradient>
 <radialGradient id="shadow" cx="383" cy="562" r="130" gradientTransform="matrix(1 0 0 .09 0 511.4)" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#0b1114" stop-opacity=".2"/><stop offset="1" stop-color="#0b1114" stop-opacity="0"/></radialGradient>
 <clipPath id="tv"><path d="{o['trunk']}"/></clipPath><clipPath id="hd"><circle cx="{hx:.2f}" cy="{hy:.2f}" r="{R}"/></clipPath>
</defs>
<rect x="90" y="96" width="586" height="484" fill="#fff"/>
<ellipse cx="383" cy="562" rx="150" ry="14" fill="url(#shadow)"/>
<path d="{o['body']}" fill="#0b0d0e"/>
<rect x="220" y="280" width="330" height="330" fill="url(#sheen)" clip-path="url(#tv)"/>
<rect x="220" y="280" width="330" height="330" fill="url(#glow)" clip-path="url(#tv)" opacity="{o['glow']:.3f}"/>
<rect x="{pc[0]-pw/2:.2f}" y="{pc[1]-phh/2:.2f}" width="{pw:.2f}" height="{phh:.2f}" rx="8" transform="rotate({pang:.2f} {pc[0]:.2f} {pc[1]:.2f})" fill="#0b0d0e" stroke="#d6cfbb" stroke-width="1.2"/>
<circle cx="{o['cam'][0]:.2f}" cy="{o['cam'][1]:.2f}" r="3.2" fill="#cfc9b8"/><circle cx="{o['cam'][0]:.2f}" cy="{o['cam'][1]:.2f}" r="1.3" fill="#3a3a38"/>
<path d="{o['rhand']}" fill="#0b0d0e"/>{Ls(o['linesR'])}
<circle cx="{hx:.2f}" cy="{hy:.2f}" r="{R}" fill="#0b0d0e"/>
<rect x="290" y="130" width="190" height="180" fill="url(#face)" clip-path="url(#hd)" opacity="{o['face']:.3f}"/>
<path d="{o['larm']}" fill="#0b0d0e"/>{Ls(o['linesL'])}
</svg>'''
if __name__=='__main__':
    os.makedirs('svg',exist_ok=True)
    only=[int(x) for x in sys.argv[1].split(',')] if len(sys.argv)>1 else range(TOTAL)
    for f in only: open(f'svg/f{f:03d}.svg','w').write(to_svg(svg_frame(f)))
    print('ok')
