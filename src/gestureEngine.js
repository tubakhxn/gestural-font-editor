// DEV/CREATOR = tubaxn
export const MODES = { CHARACTER: ['4', '8'], DISTORTION: ['4', '8', '12'], SMOOTHNESS: ['4', '8', '12', '16', '20'] };
const TIPS = { CHARACTER: [4, 8], DISTORTION: [4, 8, 12], SMOOTHNESS: [4, 8, 12, 16, 20] };
const CONFIRM = 0.2, RELEASE = 0.4;

export class GestureEngine {
  constructor() { this.lm = null; this.mode = null; this.cand = undefined; this.candT = 0; this.lost = 0; this.asp = 16 / 9; this.fing = [false, false, false, false]; this.raw = null; }
  update(raw, dt, asp) {
    this.asp = asp;
    if (!raw) {
      this.lost += dt;
      if (this.lost > 0.4) { this.lm = null; this.mode = null; this.cand = undefined; }
      return this.state();
    }
    this.lost = 0;
    const m = raw.map((p) => ({ x: 1 - p.x, y: p.y, z: p.z || 0 }));
    if (!this.lm) this.lm = m;
    else { const a = 1 - Math.exp(-dt * 14); for (let i = 0; i < 21; i++) { this.lm[i].x += (m[i].x - this.lm[i].x) * a; this.lm[i].y += (m[i].y - this.lm[i].y) * a; this.lm[i].z += (m[i].z - this.lm[i].z) * a; } }
    const g = this.classify();
    if (g === this.mode) { this.cand = undefined; this.candT = 0; }
    else {
      if (g === this.cand) this.candT += dt; else { this.cand = g; this.candT = 0; }
      if (this.candT >= (g === null ? RELEASE : CONFIRM)) { this.mode = g; this.cand = undefined; this.candT = 0; }
    }
    return this.state();
  }

  classify() {
    const l = this.lm, a = this.asp;
    const P = (i) => [l[i].x * a, l[i].y, l[i].z * a];
    const sub = (p, q) => [p[0] - q[0], p[1] - q[1], p[2] - q[2]];
    const len = (v) => Math.hypot(v[0], v[1], v[2]) || 1e-6;
    const ang = (i, j, k) => {
      const u = sub(P(i), P(j)), v = sub(P(k), P(j));
      const c = (u[0] * v[0] + u[1] * v[1] + u[2] * v[2]) / (len(u) * len(v));
      return (Math.acos(Math.max(-1, Math.min(1, c))) * 180) / Math.PI;
    };
    const dw = (i) => len(sub(P(i), P(0)));
    const defs = [[5, 6, 8], [9, 10, 12], [13, 14, 16], [17, 18, 20]];
    defs.forEach(([m, p, t], i) => {
      const A = ang(m, p, t), far = dw(t) > dw(p) * 1.05;
      this.fing[i] = this.fing[i] ? A > 128 && far : A > 150 && far;
    });
    const [i, m, r, p] = this.fing;
    this.raw = { f: this.fing.map((v) => (v ? 1 : 0)).join('') };
    if (i && m && r && p) return 'SMOOTHNESS';
    if (i && m && !r && !p) return 'DISTORTION';
    if (i && !m && !r && !p) return 'CHARACTER';
    return null;
  }
  state() {
    const l = this.lm;
    if (!l) return { present: false, mode: null, asp: this.asp, tips: [], all: [], lm: null };
    const palmIdx = [0, 5, 9, 13, 17];
    const palm = { x: palmIdx.reduce((s, i) => s + l[i].x, 0) / 5, y: palmIdx.reduce((s, i) => s + l[i].y, 0) / 5 };
    const tips = this.mode ? TIPS[this.mode].map((i) => ({ x: l[i].x, y: l[i].y })) : [];
    const all = [4, 8, 12, 16, 20].map((i) => ({ x: l[i].x, y: l[i].y }));
    const pinch = { x: (l[4].x + l[8].x) / 2, y: (l[4].y + l[8].y) / 2 };
    const angle = Math.atan2(l[9].y - l[0].y, (l[9].x - l[0].x) * this.asp);
    return { present: true, mode: this.mode, asp: this.asp, palm, pinch, tips, all, angle, lm: l, raw: this.raw };
  }
}

const STEP = 360 / 26;
const fan = (p, asp, offs) => offs.map(([dx, dy]) => ({ x: p.x + dx / asp, y: p.y + dy }));
export class DemoDriver {
  constructor() { this.t = 0; this.label = ''; }
  reset() { this.t = 0; }
  update(dt) {
    const asp = 16 / 9; const prev = this.t; this.t += dt;
    const wrapped = this.t >= 24; if (wrapped) this.t = 0;
    const t = this.t, ease = (x) => x * x * (3 - 2 * x), cl = (x) => Math.max(0, Math.min(1, x));
    let mode = null, pinch = { x: 0.72, y: 0.52 }, palm = { x: 0.74, y: 0.64 }, angle = -1.2, tips = [];
    const ang = (i) => ((-20 - i * STEP) * Math.PI) / 180;
    if (t < 1) this.label = '1 / 6  CHARACTER';
    if (t >= 1 && t < 8) {
      mode = 'CHARACTER'; this.label = '2 / 6  INDEX + THUMB selects a letter';
      const a0 = { x: 0.72, y: 0.52 }, r = 0.11;
      const toD = ease(cl((t - 2) / 0.9)), toK = ease(cl((t - 4.6) / 1.4));
      angle = -1.2 + 0.61 * toD - 0.61 * toK;
      pinch = { x: a0.x, y: a0.y };
      palm = { x: pinch.x + 0.03 / asp, y: pinch.y + 0.13 };
      tips = fan(pinch, asp, [[-0.012, 0.035], [0.012, -0.035]]);
    } else if (t >= 8 && t < 9) { this.label = '3 / 6  DISTORTION'; }
    else if (t >= 9 && t < 16) {
      mode = 'DISTORTION'; this.label = '4 / 6  INDEX + MIDDLE + THUMB warps the glyph';
      const u = t - 9;
      palm = { x: 0.7 + (0.1 * Math.sin(u * 1.5)) / asp * 1.6, y: 0.5 + 0.09 * Math.sin(u * 2.1 + 1) };
      angle = -1.2 + 0.7 * Math.sin(u * 1.1);
      tips = fan({ x: palm.x, y: palm.y - 0.06 }, asp, [[-0.06, 0.03], [0.0, -0.05], [0.05, -0.04]]);
    } else if (t >= 16 && t < 17) { this.label = '5 / 6  SMOOTHNESS'; }
    else if (t >= 17) {
      mode = 'SMOOTHNESS'; this.label = '6 / 6  ALL FIVE smooths the lines';
      palm = { x: 0.74, y: 0.58 + 0.01 * Math.sin(t) };
      angle = -1.2;
      tips = fan({ x: palm.x, y: palm.y - 0.07 }, asp, [[-0.075, 0.06], [-0.03, -0.075], [0.01, -0.09], [0.045, -0.065], [0.07, -0.03]]);
    }
    return { present: true, demo: true, mode, asp, palm, pinch, tips, all: tips, angle, lm: null, wrapped, label: this.label };
  }
}
