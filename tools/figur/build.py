import math, json, re
def bez(p0,p1,p2,p3,t):
    u=1-t; return (u*u*u*p0[0]+3*u*u*t*p1[0]+3*u*t*t*p2[0]+t*t*t*p3[0], u*u*u*p0[1]+3*u*u*t*p1[1]+3*u*t*t*p2[1]+t*t*t*p3[1])
def parse(d):
    nums=[float(v) for v in re.findall(r'-?\d+\.?\d*', d)]
    p=(nums[0],nums[1]); segs=[]; i=2
    while i+6<=len(nums):
        c1=(nums[i],nums[i+1]); c2=(nums[i+2],nums[i+3]); e=(nums[i+4],nums[i+5]); segs.append((p,c1,c2,e)); p=e; i+=6
    return segs
def taper(segs, w=3.6, a=0.15, b=0.15):
    pts=[]
    for s in segs:
        for i in range(28): pts.append(bez(*s,i/28))
    pts.append(segs[-1][3]); n=len(pts)
    L=[0]
    for i in range(1,n): L.append(L[-1]+math.dist(pts[i],pts[i-1]))
    T=L[-1]; left=[]; right=[]
    for i,p in enumerate(pts):
        q0=pts[max(0,i-1)]; q1=pts[min(n-1,i+1)]
        dx,dy=q1[0]-q0[0],q1[1]-q0[1]; d=math.hypot(dx,dy) or 1; nx,ny=-dy/d,dx/d
        t=L[i]/T; f=1.0
        if a and t<a: f=math.sin(t/a*math.pi/2)
        if b and t>1-b: f=min(f,math.sin((1-t)/b*math.pi/2))
        hw=w*f/2; left.append((p[0]+nx*hw,p[1]+ny*hw)); right.append((p[0]-nx*hw,p[1]-ny*hw))
    ring=left+right[::-1]
    return 'M'+' L'.join(f'{x:.1f} {y:.1f}' for x,y in ring)+'Z'
def d_of(segs): return 'M'+f'{segs[0][0][0]:g} {segs[0][0][1]:g}'+''.join(f' C{a[0]:g} {a[1]:g} {b[0]:g} {b[1]:g} {c[0]:g} {c[1]:g}' for _,a,b,c in segs)+'Z'

# Torso, Schultern und Oberarme: eine Form (Pixel des Referenzbildes)
SIL=('M352 300 C330 300 300 308 280 326 C258 346 246 380 241 420 C237 452 239 478 252 492 '
     'C264 504 286 503 301 497 C301 516 303 534 310 548 C330 560 436 560 456 548 '
     'C463 534 466 516 466 505 C482 511 506 514 518 503 C529 492 531 466 529 438 '
     'C526 396 514 356 492 332 C474 314 446 302 418 300 C400 300 370 300 352 300')
# zeigende Hand: Unterarm vom Ellbogen, Daumen nach oben, Zeigefinger waagerecht unter dem Kinn, uebrige Finger eingerollt
HL=parse('M268 486 C262 470 266 448 280 426 C294 402 310 376 320 352 C324 342 325 330 323 318 '
         'C321 306 317 296 320 288 C323 281 332 278 338 281 C344 284 346 291 348 296 C350 300 353 302 358 302 '
         'C372 302 391 298 408 293 C417 290 426 286 433 289 C440 292 439 302 431 305 C423 308 413 309 405 311 '
         'C410 320 410 331 405 341 C400 350 391 356 380 360 C370 364 362 368 355 376 '
         'C342 394 328 421 316 448 C308 466 300 486 292 500 C284 498 274 494 268 486')
# Telefonhand: Unterarm vom Ellbogen nach innen, die Hand umgreift das Handy unten
HR=parse('M524 472 C514 466 506 461 500 457 C488 451 470 443 458 438 C446 433 436 428 428 424 '
         'C419 420 409 420 399 423 C388 427 380 432 378 442 C376 453 379 463 387 470 '
         'C397 478 411 482 425 486 C443 491 462 497 482 504 C497 509 511 510 521 503 C526 494 527 482 524 472')
LA=taper(HL[1:10], 3.6, 0.2, 0.03)     # Aussenkante Unterarm, Daumen, Zeigefinger oben bis zur Spitze
LA2=taper(HL[9:15], 3.6, 0.03, 0.18)   # Spitze, Fingerunterseite, eingerollte Finger, Innenkante Unterarm
LC=taper(HR[1:8], 3.6, 0.16, 0.18)     # Oberkante Unterarm (ab innen), Hand um das Handy, Unterkante (endet innen)
LN=taper(parse('M466 402 C468 414 470 426 471 437'), 3.0, 0.4, 0.35)   # Spalt zwischen Oberarm und Unterarm
json.dump(dict(SIL=SIL+'Z', HEAD=[383,219,84], HAND_L=d_of(HL), HAND_R=d_of(HR), LA=LA, LA2=LA2, LC=LC, LN=LN), open('geo.json','w'))
print(len(HL), len(HR))
