"""Figur je Bild neu gezeichnet: Torso (ohne Arme) + je Arm eine durchgehende Gliedmasse (Schulter-Ellbogen-Handgelenk,
runder Ellbogen) + Hand, alles zu einer Silhouette vereinigt. Helle Linien nur, wo Unterarm/Hand vor Schwarzem liegen."""
import math, re, json
from shapely.geometry import Polygon, Point
from shapely.ops import unary_union
from shapely import affinity
def bez(p0,p1,p2,p3,t):
    u=1-t; return (u*u*u*p0[0]+3*u*u*t*p1[0]+3*u*t*t*p2[0]+t*t*t*p3[0], u*u*u*p0[1]+3*u*u*t*p1[1]+3*u*t*t*p2[1]+t*t*t*p3[1])
def parse(d):
    nums=[float(v) for v in re.findall(r'-?\d+\.?\d*', d)]
    p=(nums[0],nums[1]); segs=[]; i=2
    while i+6<=len(nums):
        segs.append((p,(nums[i],nums[i+1]),(nums[i+2],nums[i+3]),(nums[i+4],nums[i+5]))); p=(nums[i+4],nums[i+5]); i+=6
    return segs
def sample(segs, n=16):
    pts=[]; tag=[]
    for k,s in enumerate(segs):
        for i in range(n): pts.append(bez(*s,i/n)); tag.append(k)
    return pts, tag
def smoothstep(a,b,x):
    t=max(0.0,min(1.0,(x-a)/(b-a))) if a!=b else (0.0 if x<a else 1.0); return t*t*(3-2*t)
def rot(p,c,ang):
    s,co=math.sin(ang),math.cos(ang); x,y=p[0]-c[0],p[1]-c[1]; return (c[0]+x*co-y*s, c[1]+x*s+y*co)
def capsule(a,ra,b,rb): return Point(a).buffer(ra,quad_segs=24).union(Point(b).buffer(rb,quad_segs=24)).convex_hull
def ring_pts(poly):
    if poly.geom_type=='MultiPolygon': poly=max(poly.geoms,key=lambda g:g.area)
    c=list(poly.exterior.coords)[:-1]
    # gleichmaessig neu abtasten (ca. 2 Einheiten)
    out=[]; n=len(c)
    for i in range(n):
        p,q=c[i],c[(i+1)%n]; d=math.dist(p,q); k=max(1,int(d/2.0))
        for j in range(k): out.append((p[0]+(q[0]-p[0])*j/k, p[1]+(q[1]-p[1])*j/k))
    return out
def smooth_d(pts):
    n=len(pts); P=lambda i: pts[i % n]
    d=f'M{pts[0][0]:.2f} {pts[0][1]:.2f}'
    for i in range(n):
        p0,p1,p2,p3=P(i-1),P(i),P(i+1),P(i+2)
        c1=(p1[0]+(p2[0]-p0[0])/6, p1[1]+(p2[1]-p0[1])/6); c2=(p2[0]-(p3[0]-p1[0])/6, p2[1]-(p3[1]-p1[1])/6)
        d+=f' C{c1[0]:.2f} {c1[1]:.2f} {c2[0]:.2f} {c2[1]:.2f} {p2[0]:.2f} {p2[1]:.2f}'
    return d+'Z'
def taper(pts, w=3.6, a=0.18, b=0.18):
    n=len(pts); L=[0]
    for i in range(1,n): L.append(L[-1]+math.dist(pts[i],pts[i-1]))
    T=L[-1] or 1; left=[]; right=[]
    for i,p in enumerate(pts):
        q0=pts[max(0,i-1)]; q1=pts[min(n-1,i+1)]
        dx,dy=q1[0]-q0[0],q1[1]-q0[1]; dd=math.hypot(dx,dy) or 1; nx,ny=-dy/dd,dx/dd
        t=L[i]/T; f=1.0
        if t<a: f=math.sin(t/a*math.pi/2)
        if t>1-b: f=min(f,math.sin((1-t)/b*math.pi/2))
        hw=w*f/2; left.append((p[0]+nx*hw,p[1]+ny*hw)); right.append((p[0]-nx*hw,p[1]-ny*hw))
    ring=left+right[::-1]
    return 'M'+' L'.join(f'{x:.1f} {y:.1f}' for x,y in ring)+'Z'

G=json.load(open('../illu/geo.json'))
HL=parse(G['HAND_L']); HR=parse(G['HAND_R'])
LP,LT=sample(HL); RP,RT=sample(HR)
# --- Endhaltung (Bild des Inhabers) ---
S_L,E_L,W_L=(284,352),(270,474),(338,364)
S_R,E_R,W_R=(482,352),(506,474),(438,456)
R_S,R_E=32,27; RW_L,RW_R=19,27
PHI_L=math.atan2(W_L[1]-E_L[1],W_L[0]-E_L[0]); PHI_R=math.atan2(W_R[1]-E_R[1],W_R[0]-E_R[0])
# Haende der Endhaltung (aus der Zeichnung), am Handgelenk etwas in den Unterarm hinein geschlossen
HAND_L=[p for p,t in zip(LP,LT) if 2<=t<=13]+[(350,382),(322,362)]
HAND_L_TAG=[t for p,t in zip(LP,LT) if 2<=t<=13]+[13,2]
HAND_R=[p for p,t in zip(RP,RT) if 2<=t<=6]+[(446,478),(448,436)]
PHONE=[(365,384),(415,384),(415,470),(365,470)]
THUMB_BASE=(331,310); INDEX_BASE=(398,304)
def fold_left(pts,tags,curl):
    out=[]
    for p,tg in zip(pts,tags):
        if tg in (3,4,5) or (tg==2 and p[1]<316):
            k=smoothstep(318,306,p[1]); p=rot(p,THUMB_BASE,math.radians(72)*curl*k)
        elif tg in (7,8,9,10):
            k=smoothstep(394,406,p[0]); q=rot(p,INDEX_BASE,math.radians(112)*curl*k); sh=1-0.68*curl*k
            p=(INDEX_BASE[0]+(q[0]-INDEX_BASE[0])*sh, INDEX_BASE[1]+(q[1]-INDEX_BASE[1])*sh)
        out.append(p)
    return out
def place(pts, Wf, phif, W, phi, k):
    """Punkte der Endhaltung (am Handgelenk Wf, Richtung phif) an ein neues Handgelenk W mit Richtung phi setzen"""
    out=[]
    for p in pts:
        v=rot(p,Wf,-phif); lx,ly=v[0]-Wf[0],v[1]-Wf[1]
        x,y=W[0]+lx*k,W[1]+ly*k; out.append(rot((x,y),W,phi))
    return out
# Koerper = die Silhouette der Zeichnung (Torso, Schultern, Oberarme bis zum Ellbogen), unten verlaengert (Brustbild)
SIL_D=G['SIL'].replace('C301 516 303 534 310 548 C330 560 436 560 456 548 C463 534 466 516 466 505','C301 520 302 552 302 600 C380 600 400 600 465 600 C465 552 466 520 466 505')
TRUNK=Polygon(sample(parse(SIL_D),24)[0]).buffer(0)
CUT=Polygon([(110,60),(660,60),(660,553)]+[(660-550*i/40, 553+10*math.sin(math.pi*i/40)) for i in range(41)]+[(110,553)])
HEAD=(383,219,84)
