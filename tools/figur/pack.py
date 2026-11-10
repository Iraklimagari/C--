"""Packt jedes Bild (RGBA, durchsichtiger Grund) in zwei Ebenen nebeneinander: links D (wird mit dem Seitengrund per
'difference' gemischt), rechts M (per 'multiply'). Auf der Seite: Ergebnis = |Grund * M - D|.
  Heller Grund (Weiss): genau die Zeichnung (schwarze Figur, weisse Linien, warmes Licht).
  Abgedunkelter Grund (Samsung-Dunkelmodus, ~12 % Grau): graue Figur mit grauem Gesicht, helle Linien, Licht bleibt.
Videos und Canvas faerbt der Browser nicht um - nur den Seitengrund. Die Mischung macht daraus die zwei Ansichten."""
import sys, os, numpy as np
from PIL import Image
B = 0.12                     # Seitengrund im Samsung-Dunkelmodus (gemessen: 31/255)
GRAY = 0.5                   # Grau der Figur im Dunkelmodus
W, H, GAP = 1024, 846, 16
def encode(rgba):
    a = rgba[..., 3:4]; V = rgba[..., :3]
    L = a * V + (1 - a)                                    # auf Weiss
    D = a * (GRAY + (1 - GRAY) * V) + (1 - a) * B          # auf dunklem Grund: Figur grau, Helles bleibt hell
    k = 1 - B; eps = 1e-6
    # Hell immer exakt: |M - X| = L. Feste Reihenfolge (glatte Flaechen bleiben glatt, gut zu komprimieren):
    # B (X = M + L) wenn exakt moeglich, sonst A2/A1 (X = M - L), sonst die bessere Randloesung der Familie A.
    Mb = (D - L) / k; okb = (D >= L - eps) & (Mb <= 1 - L + eps)
    Ma2 = (L + D) / k; oka2 = Ma2 <= 1 + eps
    Ma1 = (L - D) / k; oka1 = (Ma1 >= L - eps) & (Ma1 <= 1 + eps)
    far = np.abs(L - k) >= B * L                                         # Rand: M=1 (X=1-L) oder M=L (X=0)
    Mf = np.where(far, 1.0, L)
    M = np.where(okb, Mb, np.where(oka2, Ma2, np.where(oka1, Ma1, Mf)))
    X = np.where(okb, Mb + L, M - L)
    return np.clip(X, 0, 1), np.clip(M, 0, 1)
def load(p):
    im = Image.open(p).convert('RGBA')
    # vormultipliziert verkleinern (saubere Kanten), dann zurueck
    arr = np.asarray(im).astype(np.float64) / 255; arr[..., :3] *= arr[..., 3:4]
    chans = [Image.fromarray((arr[..., i] * 65535).astype(np.uint16).astype(np.int32), mode='I').resize((W, H), Image.LANCZOS) for i in range(4)]
    out = np.stack([np.asarray(c).astype(np.float64) / 65535 for c in chans], -1).clip(0, 1)
    al = out[..., 3:4]; out[..., :3] = np.where(al > 1e-4, out[..., :3] / np.maximum(al, 1e-4), 0)
    return out.clip(0, 1)
if __name__ == '__main__':
    src, dst = sys.argv[1], sys.argv[2]; os.makedirs(dst, exist_ok=True)
    for f in sorted(os.listdir(src)):
        if not f.endswith('.png'): continue
        X, M = encode(load(os.path.join(src, f)))
        pk = np.zeros((H, 2 * W + GAP, 3)); pk[:, :W] = X; pk[:, W:W + GAP] = 0.5; pk[:, W + GAP:] = M
        Image.fromarray((pk * 255 + 0.5).astype(np.uint8)).save(os.path.join(dst, f))
    print('ok')
