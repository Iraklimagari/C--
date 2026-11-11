"""Packt jedes Bild (RGBA, durchsichtiger Grund) als zwei Kacheln nebeneinander in ein normales Video: links die Farbe,
rechts die Deckkraft (Grau). story.js setzt beides in einem WebGL-Canvas wieder zusammen -> die Figur mit echtem
durchsichtigem Grund, in jedem Browser (auch Safari, ohne Video-Alphakanal). Video und Canvas faerbt kein Browser um,
auch nicht der erzwungene Dunkelmodus von Samsung Internet: die Figur sieht auf hellem und dunklem Grund gleich aus.
Die Farbe wird in die durchsichtigen Bereiche hinein fortgesetzt, damit die Videokompression an den Kanten keinen
dunklen Saum erzeugt."""
import sys, os, numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter, zoom
from multiprocessing import Pool
W, H, GAP = 1024, 846, 16
def load(p):
    im = Image.open(p).convert('RGBA')
    arr = np.asarray(im).astype(np.float64) / 255; arr[..., :3] *= arr[..., 3:4]
    chans = [Image.fromarray((arr[..., i] * 65535).astype(np.uint16).astype(np.int32), mode='I').resize((W, H), Image.LANCZOS) for i in range(4)]
    out = np.stack([np.asarray(c).astype(np.float64) / 65535 for c in chans], -1).clip(0, 1)
    return out                                                    # vormultipliziert
def blur(a, r):
    return gaussian_filter(a, r, mode='nearest')
INK = np.array([0x01, 0xAB, 0xC3]) / 255
def encode(pm):
    a = pm[..., 3]; c = pm[..., :3] / np.maximum(a, 1e-4)[..., None]
    # Fortsetzung der Farbe in den Grund: auf Viertelgroesse unscharf (glatt, schnell), dann wieder hoch
    q = 4; h, w = a.shape; hs, ws = h // q, w // q
    def down(x): return x[:hs * q, :ws * q].reshape(hs, q, ws, q).mean((1, 3))
    pms = np.stack([down(pm[..., i]) for i in range(3)], -1); As = down(a)
    ext = np.zeros_like(pms); ea = np.zeros_like(As); done = np.zeros_like(As, bool)
    for r in (1.5, 6, 20):
        e = np.stack([blur(pms[..., i], r) for i in range(3)], -1); w_ = blur(As, r)
        ok = (~done) & (w_ > 0.02); ext[ok] = e[ok] / w_[ok][..., None]; done |= ok
    ext[~done] = INK
    ext = np.stack([zoom(ext[..., i], (h / hs, w / ws), order=1)[:h, :w] for i in range(3)], -1)
    col = np.where((a > 0.02)[..., None], c, ext)
    return col.clip(0, 1), a.clip(0, 1)
def one(args):
    src, dst, f = args
    col, a = encode(load(os.path.join(src, f)))
    pk = np.zeros((H, 2 * W + GAP, 3)); pk[:, :W] = col; pk[:, W:W + GAP] = 0.5; pk[:, W + GAP:] = a[..., None]
    Image.fromarray((pk * 255 + 0.5).astype(np.uint8)).save(os.path.join(dst, f))
if __name__ == '__main__':
    src, dst = sys.argv[1], sys.argv[2]; os.makedirs(dst, exist_ok=True)
    fs = [f for f in sorted(os.listdir(src)) if f.endswith('.png')]
    with Pool() as p: p.map(one, [(src, dst, f) for f in fs])
    print('ok')
