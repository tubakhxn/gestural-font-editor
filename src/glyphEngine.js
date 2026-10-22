// DEV/CREATOR = tubaxn
import { buildGlyphs, LETTERS } from './glyphs.js';

const hash = (i) => { const s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return (s - Math.floor(s)) * 2 - 1; };
export const RING_K = 14;

function assign(cost, n) {
  const INF = 1e18, u = new Float64Array(n + 1), v = new Float64Array(n + 1), p = new Int32Array(n + 1), way = new Int32Array(n + 1);
  for (let i = 1; i <= n; i++) {
    p[0] = i; let j0 = 0;
    const minv = new Float64Array(n + 1).fill(INF), used = new Uint8Array(n + 1);
    do {
      used[j0] = 1; const i0 = p[j0]; let delta = INF, j1 = 0;
      for (let j = 1; j <= n; j++) if (!used[j]) {
        const cur = cost[(i0 - 1) * n + (j - 1)] - u[i0] - v[j];
        if (cur < minv[j]) { minv[j] = cur; way[j] = j0; }
        if (minv[j] < delta) { delta = minv[j]; j1 = j; }
      }
      for (let j = 0; j <= n; j++) { if (used[j]) { u[p[j]] += delta; v[j] -= delta; } else minv[j] -= delta; }
      j0 = j1;
    } while (p[j0] !== 0);
    do { const j1 = way[j0]; p[j0] = p[j1]; j0 = j1; } while (j0);
  }
  const rowToCol = new Int32Array(n);
  for (let j = 1; j <= n; j++) rowToCol[p[j] - 1] = j - 1;
  return rowToCol;
}

export class GlyphEngine {
  constructor() {
    this.glyphs = buildGlyphs(230);
    this.N = this.glyphs.A.x.length;
    this.ringNoise = Array.from({ length: RING_K }, (_, i) => hash(i + 1));
    this.reset();
  }
  reset() {
    this.letter = 'K';
    const t = this.glyphs.K;
    this.x = Float32Array.from(t.x); this.y = Float32Array.from(t.y);
    this.ox = new Float32Array(this.N); this.oy = new Float32Array(this.N);
    this.sx = new Float32Array(this.N); this.sy = new Float32Array(this.N);
    this.target = t; this.ranges = t.ranges; this.travel = 0;
    this.knob = 45.75; this.smoothness = 0; this.energy = 0;
    this.ring = new Float32Array(RING_K).fill(1);
    this.update(0.016, true);
  }
  get distortion() { return Math.max(0, Math.min(100, this.knob + this.energy * 25)); }
  setLetter(ch) {
    if (ch === this.letter) return;
    this.letter = ch; this.target = this.glyphs[ch]; this.ranges = this.target.ranges;

    const n = this.N, T = this.target, cost = new Float64Array(n * n);
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { const dx = this.x[i] + this.ox[i] - T.x[j], dy = this.y[i] + this.oy[i] - T.y[j]; cost[i * n + j] = dx * dx + dy * dy; }
    const map = assign(cost, n), nx = new Float32Array(n), ny = new Float32Array(n), nox = new Float32Array(n), noy = new Float32Array(n);
    for (let i = 0; i < n; i++) { const j = map[i]; nx[j] = this.x[i]; ny[j] = this.y[i]; nox[j] = this.ox[i]; noy[j] = this.oy[i]; }
    this.x = nx; this.y = ny; this.ox = nox; this.oy = noy;
  }
  update(dt, snap = false) {
    const decay = Math.exp(-dt * 0.05);
    let e = 0, tr = 0;
    for (let i = 0; i < this.N; i++) {
      tr += Math.hypot(this.target.x[i] - this.x[i], this.target.y[i] - this.y[i]);
      const k = snap ? 1 : 1 - Math.exp(-dt * (8 + 1.2 * hash(i * 3 + 7)));
      this.x[i] += (this.target.x[i] - this.x[i]) * k;
      this.y[i] += (this.target.y[i] - this.y[i]) * k;
      this.ox[i] *= decay; this.oy[i] *= decay;
      e += Math.hypot(this.ox[i], this.oy[i]);
    }
    this.energy = e / this.N; this.travel = tr / this.N;

    const amp = 0.27 * (this.knob / 50) + this.energy * 0.35;
    const rk = snap ? 1 : 1 - Math.exp(-dt * 6);
    for (let i = 0; i < RING_K; i++) this.ring[i] += (0.98 + amp * this.ringNoise[i] - this.ring[i]) * rk;
    this.smooth();
  }

  smooth() {
    const raw = (this.smoothness / 100) * 170, full = Math.floor(raw), frac = raw - full;
    for (const [s, e] of this.ranges) {
      const n = e - s;
      let ax = new Float32Array(n), ay = new Float32Array(n);
      for (let i = 0; i < n; i++) { ax[i] = this.x[s + i] + this.ox[s + i]; ay[i] = this.y[s + i] + this.oy[s + i]; }
      let bx = new Float32Array(n), by = new Float32Array(n);
      const step = () => {
        for (let i = 0; i < n; i++) {
          const p = (i - 1 + n) % n, q = (i + 1) % n;
          bx[i] = (ax[p] + 2 * ax[i] + ax[q]) / 4; by[i] = (ay[p] + 2 * ay[i] + ay[q]) / 4;
        }
        [ax, bx] = [bx, ax]; [ay, by] = [by, ay];
      };
      for (let p = 0; p < full; p++) step();
      if (frac > 0.001) {
        const px = Float32Array.from(ax), py = Float32Array.from(ay);
        step();
        for (let i = 0; i < n; i++) { ax[i] = px[i] + (ax[i] - px[i]) * frac; ay[i] = py[i] + (ay[i] - py[i]) * frac; }
      }
      for (let i = 0; i < n; i++) { this.sx[s + i] = ax[i]; this.sy[s + i] = ay[i]; }
    }

    for (const [st, cnt, oc] of this.target.dups) {
      for (let k = 0; k < cnt; k++) {
        const f = (((k + 1) % cnt) / cnt) * oc, i0 = Math.floor(f) % oc, i1 = (i0 + 1) % oc, t = f - Math.floor(f);
        this.sx[st + k] = this.sx[i0] * (1 - t) + this.sx[i1] * t; this.sy[st + k] = this.sy[i0] * (1 - t) + this.sy[i1] * t;
      }
    }
    if (raw > 0.5) this.restoreSize();
  }

  restoreSize() {
    const N = this.N; let rx = 0, ry = 0, sx = 0, sy = 0;
    for (let i = 0; i < N; i++) { rx += this.x[i] + this.ox[i]; ry += this.y[i] + this.oy[i]; sx += this.sx[i]; sy += this.sy[i]; }
    rx /= N; ry /= N; sx /= N; sy /= N;
    let a = 0, b = 0;
    for (let i = 0; i < N; i++) {
      a += (this.x[i] + this.ox[i] - rx) ** 2 + (this.y[i] + this.oy[i] - ry) ** 2;
      b += (this.sx[i] - sx) ** 2 + (this.sy[i] - sy) ** 2;
    }
    const f = Math.min(1.8, Math.sqrt(a / (b || 1)));
    for (let i = 0; i < N; i++) { this.sx[i] = rx + (this.sx[i] - sx) * f; this.sy[i] = ry + (this.sy[i] - sy) * f; }
  }
}
export { LETTERS };
