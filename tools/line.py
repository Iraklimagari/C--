"""Generate the NAHLIO looping line (periodic, 1920 units per period).

Prolate trochoid: where the loop strength b exceeds the travel a, the curve
curls back on itself like the cursive loops in the brand line references.
Usage: python3 tools/line.py [periods] > out.txt  (prints an SVG path d)
"""
import math, sys

PERIOD = 1920.0
CYCLES = 6                     # wave cycles per period
STRENGTH = [2.3, 0.55, 1.8, 0.5, 2.7, 0.55]     # value at each crest: >1 loop, <0.5 soft wave (never ~1: no cusps)
LIFT = [0.0, 26, -14, 30, -24, 18]               # baseline offset per cycle (units)
A = PERIOD / (CYCLES * 2 * math.pi)              # travel per radian
SIZE = 40.0
SLANT = 0.32                                     # forward lean of the loops, like handwriting                                      # loop radius scale

def interp(arr, u):
    n = len(arr); i = math.floor(u) % n; j = (i + 1) % n; f = u - math.floor(u)
    f = 0.5 - 0.5 * math.cos(math.pi * f)
    return arr[i] * (1 - f) + arr[j] * f

def point(t):
    # t in radians, one cycle = 2pi
    c = t / (2 * math.pi)
    b = interp(STRENGTH, c) * A
    lift = interp(LIFT, c)
    ly = -(b * math.cos(t)) * (SIZE / A)
    x = A * t - b * math.sin(t) - SLANT * ly
    y = ly + lift + 26 * math.sin(4 * math.pi * x / PERIOD)
    return x, y

def path(periods=2, steps_per_cycle=48, oy=170.0):
    n = int(periods * CYCLES * steps_per_cycle)
    pts = [point(2 * math.pi * k / steps_per_cycle) for k in range(-2, n + 3)]
    pts = [(x, y + oy) for x, y in pts]
    d = ["M%.1f %.1f" % pts[1]]
    for i in range(1, len(pts) - 2):
        p0, p1, p2, p3 = pts[i - 1], pts[i], pts[i + 1], pts[i + 2]
        c1 = (p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6)
        c2 = (p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6)
        d.append("C%.1f %.1f %.1f %.1f %.1f %.1f" % (c1 + c2 + p2))
    return " ".join(d)

if __name__ == "__main__":
    print(path(float(sys.argv[1]) if len(sys.argv) > 1 else 2))
