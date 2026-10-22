// DEV/CREATOR = tubaxn
const L = 27, R = 73, T = 19, B = 81, MX = 50, STROKE = 7.2;

const arc = (cx, cy, rx, ry, a0, a1, n = 32) => {
  const p = [];
  for (let i = 0; i <= n; i++) {
    const a = ((a0 + (a1 - a0) * i / n) * Math.PI) / 180;
    p.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)]);
  }
  return p;
};

export const STROKES = {
  A: [[[L, B], [MX, T], [R, B]], [[34, 64], [66, 64]]],
  B: [[[L, T], [L, B]],
      [[L, T], [52, T], ...arc(52, 35.5, 21, 15.5, -90, 90), [L, 51]],
      [[L, 51], [54, 51], ...arc(54, 66, 19, 15, -90, 90), [L, 81]]],
  C: [arc(50, 50, 23, 31, 45, 315)],
  D: [[[L, T], [L, B]], [[L, T], [46, T], ...arc(46, 50, 27, 31, -90, 90), [L, B]]],
  E: [[[R, T], [L, T], [L, B], [R, B]], [[L, 50], [66, 50]]],
  F: [[[R, T], [L, T], [L, B]], [[L, 50], [66, 50]]],
  G: [[...arc(50, 50, 23, 31, -40, -360), [52, 50]]],
  H: [[[L, T], [L, B]], [[R, T], [R, B]], [[L, 50], [R, 50]]],
  I: [[[38, T], [62, T]], [[MX, T], [MX, B]], [[38, B], [62, B]]],
  J: [[[R, T], [R, 58], ...arc(50, 58, 23, 23, 0, 180)]],
  K: [[[L, T], [L, B]], [[R, T], [L, 56]], [[40, 46], [R, B]]],
  L: [[[L, T], [L, B], [R, B]]],
  M: [[[L, B], [L, T], [MX, 58], [R, T], [R, B]]],
  N: [[[L, B], [L, T], [R, B], [R, T]]],
  O: [arc(50, 50, 23, 31, 0, 360, 48)],
  P: [[[L, B], [L, T], [52, T], ...arc(52, 35.5, 21, 16.5, -90, 90), [L, 52]]],
  Q: [arc(50, 50, 23, 31, 0, 360, 48), [[56, 64], [76, 85]]],
  R: [[[L, B], [L, T], [52, T], ...arc(52, 35.5, 21, 16.5, -90, 90), [L, 52]], [[46, 52], [R, B]]],
  S: [[...arc(50, 34.5, 22, 15.5, -30, -270), ...arc(50, 65.5, 22, 15.5, -90, 150).slice(1)]],
  T: [[[L, T], [R, T]], [[MX, T], [MX, B]]],
  U: [[[L, T], [L, 58], ...arc(50, 58, 23, 23, 180, 0), [R, T]]],
  V: [[[L, T], [MX, B], [R, T]]],
  W: [[[L, T], [38, B], [MX, 40], [62, B], [R, T]]],
  X: [[[L, T], [R, B]], [[R, T], [L, B]]],
  Y: [[[L, T], [MX, 50], [R, T]], [[MX, 50], [MX, B]]],
  Z: [[[L, T], [R, T], [L, B], [R, B]]],
};

export const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

function raster(strokes, S, makeCanvas) {
  const c = makeCanvas(S);
  c.width = c.height = S;
  const g = c.getContext('2d');
  g.fillStyle = '#000'; g.fillRect(0, 0, S, S);
  g.strokeStyle = '#fff'; g.lineWidth = (STROKE * S) / 100;
  g.lineJoin = 'miter'; g.miterLimit = 2; g.lineCap = 'butt';
  const k = S / 100;
  for (const s of strokes) {
    g.beginPath();
    s.forEach(([x, y], i) => (i ? g.lineTo(x * k, y * k) : g.moveTo(x * k, y * k)));
    const f = s[0], l = s[s.length - 1];
    if (Math.hypot(f[0] - l[0], f[1] - l[1]) < 0.01) g.closePath();
    g.stroke();
  }
  const d = g.getImageData(0, 0, S, S).data;
  const m = new Uint8Array(S * S);
  for (let i = 0; i < S * S; i++) m[i] = d[i * 4] > 127 ? 1 : 0;
  return m;
}

function trace(m, S) {
  const W2 = 2 * S + 3, adj = new Map();
  const add = (a, b) => {
    (adj.get(a) || adj.set(a, []).get(a)).push(b);
    (adj.get(b) || adj.set(b, []).get(b)).push(a);
  };
  for (let y = 0; y < S - 1; y++) for (let x = 0; x < S - 1; x++) {
    const tl = m[y * S + x], tr = m[y * S + x + 1], br = m[(y + 1) * S + x + 1], bl = m[(y + 1) * S + x];
    const c = tl * 8 + tr * 4 + br * 2 + bl;
    if (c === 0 || c === 15) continue;
    const Tk = (2 * x + 1) * W2 + 2 * y, Rk = (2 * x + 2) * W2 + 2 * y + 1;
    const Bk = (2 * x + 1) * W2 + 2 * y + 2, Lk = (2 * x) * W2 + 2 * y + 1;
    switch (c) {
      case 1: add(Lk, Bk); break; case 2: add(Bk, Rk); break; case 3: add(Lk, Rk); break;
      case 4: add(Tk, Rk); break; case 5: add(Tk, Lk); add(Bk, Rk); break; case 6: add(Tk, Bk); break;
      case 7: add(Tk, Lk); break; case 8: add(Tk, Lk); break; case 9: add(Tk, Bk); break;
      case 10: add(Tk, Rk); add(Lk, Bk); break; case 11: add(Tk, Rk); break; case 12: add(Lk, Rk); break;
      case 13: add(Bk, Rk); break; case 14: add(Lk, Bk); break;
    }
  }
  const seen = new Set(), out = [];
  for (const k0 of adj.keys()) {
    if (seen.has(k0)) continue;
    const pts = []; let prev = -1, cur = k0;
    for (let guard = 0; guard < 400000; guard++) {
      seen.add(cur);
      pts.push([Math.floor(cur / W2) / 2 + 0.5, (cur % W2) / 2 + 0.5]);
      const nb = adj.get(cur);
      const nx = nb[0] === prev ? nb[1] : nb[0];
      if (nx === k0 || nx === undefined) break;
      prev = cur; cur = nx;
    }
    if (pts.length > 30) out.push(pts);
  }
  return out;
}

const area = (p) => { let a = 0; for (let i = 0; i < p.length; i++) { const q = p[(i + 1) % p.length]; a += p[i][0] * q[1] - q[0] * p[i][1]; } return a / 2; };

function smoothClosed(p, passes) {
  const n = p.length;
  for (let k = 0; k < passes; k++) {
    p = p.map((_, i) => {
      const a = p[(i - 1 + n) % n], b = p[i], c = p[(i + 1) % n];
      return [(a[0] + 2 * b[0] + c[0]) / 4, (a[1] + 2 * b[1] + c[1]) / 4];
    });
  }
  return p;
}

function resample(p, n) {
  const m = p.length, cum = [0];
  for (let i = 0; i < m; i++) { const q = p[(i + 1) % m]; cum.push(cum[i] + Math.hypot(q[0] - p[i][0], q[1] - p[i][1])); }
  const total = cum[m], out = []; let j = 0;
  for (let k = 0; k < n; k++) {
    const t = (total * k) / n;
    while (j < m - 1 && cum[j + 1] < t) j++;
    const f = (t - cum[j]) / (cum[j + 1] - cum[j] || 1);
    const a = p[j], b = p[(j + 1) % m];
    out.push([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]);
  }
  return out;
}

const SLOTS = [0.58, 0.24, 0.18];
const centroid = (p) => p.reduce((a, q) => [a[0] + q[0] / p.length, a[1] + q[1] / p.length], [0, 0]);

function alignStart(c) {

  const [cx, cy] = centroid(c);
  let bi = 0, bv = Infinity;
  c.forEach((q, i) => {
    const a = Math.atan2(q[0] - cx, -(q[1] - cy));
    const v = Math.abs(a) + Math.hypot(q[0] - cx, q[1] - cy) * 1e-4;
    if (v < bv) { bv = v; bi = i; }
  });
  return c.slice(bi).concat(c.slice(0, bi));
}

export function buildGlyphs(N = 300, makeCanvas = () => document.createElement('canvas')) {
  const S = 320, glyphs = {};
  const counts = SLOTS.map((f) => Math.round(N * f)); counts[0] += N - counts.reduce((a, b) => a + b, 0);
  for (const ch of LETTERS) {
    const m = raster(STROKES[ch], S, makeCanvas);
    let cs = trace(m, S).map((c) => {
      if (area(c) < 0) c.reverse();
      c = smoothClosed(c, 4);
      return { c, a: Math.abs(area(c)), cy: centroid(c)[1], cx: centroid(c)[0] };
    }).sort((a, b) => b.a - a.a);
    const outer = cs[0], holes = cs.slice(1).sort((a, b) => a.cy - b.cy || a.cx - b.cx).slice(0, 2);

    const src = [outer.c, holes[0]?.c, holes[1]?.c];
    const x = new Float32Array(N), y = new Float32Array(N), ranges = [], dups = [];
    let o = 0, drawn = 0;
    src.forEach((c, k) => {
      const real = !!c;
      let pts = resample(alignStart(c || outer.c), counts[k]);
      if (!real) { pts = pts.map((_, i) => pts[(i + 1) % pts.length]); dups.push([o, counts[k], counts[0]]); }
      if (real || k === 0) { ranges.push([o, o + counts[k]]); drawn++; }
      for (const q of pts) { x[o] = (q[0] / S - 0.5) * 2 * 1.12; y[o] = (q[1] / S - 0.5) * 2 * 1.12; o++; }
    });
    glyphs[ch] = { x, y, ranges, dups, holes: holes.length };
  }
  return glyphs;
}
