// DEV/CREATOR = tubaxn
import { LETTERS } from './glyphEngine.js';
import { RING_K } from './glyphEngine.js';

const TAU = Math.PI * 2, STEP = 360 / 26;
const BONES = [[0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],[5,9],[9,10],[10,11],[11,12],[9,13],[13,14],[14,15],[15,16],[13,17],[17,18],[18,19],[19,20],[0,17]];

function ringPoints(r, smooth) {
  const P = (i) => { const k = ((i % RING_K) + RING_K) % RING_K, a = (k / RING_K) * TAU; return [Math.cos(a) * r[k], Math.sin(a) * r[k]]; };
  const blend = Math.min(1, smooth / 40), out = [];
  for (let i = 0; i < RING_K; i++) {
    const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
    for (let s = 0; s < 12; s++) {
      const t = s / 12, t2 = t * t, t3 = t2 * t, q = [0, 0];
      for (let c = 0; c < 2; c++) {
        const cr = 0.5 * (2 * p1[c] + (-p0[c] + p2[c]) * t + (2 * p0[c] - 5 * p1[c] + 4 * p2[c] - p3[c]) * t2 + (-p0[c] + 3 * p1[c] - 3 * p2[c] + p3[c]) * t3);
        const li = p1[c] + (p2[c] - p1[c]) * t;
        q[c] = li + (cr - li) * blend;
      }
      out.push(q);
    }
  }
  return out;
}

export class Renderer {
  constructor(canvas, video) {
    this.c = canvas; this.ctx = canvas.getContext('2d'); this.video = video; this.hud = { x: 0, y: 0 };
    this.resize(); new ResizeObserver(() => this.resize()).observe(canvas.parentElement);
  }
  resize() {
    const r = this.c.parentElement.getBoundingClientRect(), d = Math.min(window.devicePixelRatio || 1, 2);
    this.W = r.width; this.H = r.height; this.d = d;
    this.c.width = Math.round(r.width * d); this.c.height = Math.round(r.height * d);
  }
  map(nx, ny) {
    const vw = this.video.videoWidth || 1600, vh = this.video.videoHeight || 900;
    const s = Math.max(this.W / vw, this.H / vh), dw = vw * s, dh = vh * s;
    return [(this.W - dw) / 2 + nx * dw, (this.H - dh) / 2 + ny * dh];
  }
  geom() { const W = this.W, H = this.H, u = Math.min(W * 0.2, H * 0.22); return { W, H, u, cx: Math.max(u * 1.45, W * 0.06 + u * 1.3), cy: H * 0.5, gs: u * 1.5 }; }

  draw(g, v, dt) {
    const ctx = this.ctx, { W, H, u, cx, cy, gs } = this.geom();
    ctx.setTransform(this.d, 0, 0, this.d, 0, 0); ctx.clearRect(0, 0, W, H);
    ctx.lineJoin = 'round'; ctx.shadowColor = 'rgba(0,0,0,.9)'; ctx.shadowBlur = 5;
    const mono = (px) => `${px}px "SF Mono","Courier New",ui-monospace,monospace`;

    ctx.strokeStyle = 'rgba(255,255,255,.28)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(cx - u * 1.12, cy); ctx.lineTo(cx + u * 1.12, cy); ctx.moveTo(cx, cy - u * 1.12); ctx.lineTo(cx, cy + u * 1.12); ctx.stroke();
    const ring = ringPoints(g.ring, g.smoothness);
    ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.beginPath();
    ring.forEach(([x, y], i) => (i ? ctx.lineTo(cx + x * u, cy + y * u) : ctx.moveTo(cx + x * u, cy + y * u)));
    ctx.closePath(); ctx.stroke();

    if (v.ctrlG) {
      ctx.save(); ctx.setLineDash([2, 4]); ctx.strokeStyle = 'rgba(255,255,255,.35)';
      ctx.beginPath(); ctx.arc(cx + v.ctrlG.x * gs, cy + v.ctrlG.y * gs, v.ctrlG.sigma * gs, 0, TAU); ctx.stroke(); ctx.restore();
    }

    const settle = Math.max(0.1, Math.min(1, 1 - g.travel / 0.1));
    ctx.strokeStyle = `rgba(255,255,255,${(0.88 * settle).toFixed(3)})`; ctx.lineWidth = 1.1;
    for (const [s, e] of g.ranges) {
      ctx.beginPath();
      for (let i = s; i < e; i++) { const x = cx + g.sx[i] * gs, y = cy + g.sy[i] * gs; i === s ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
      ctx.closePath(); ctx.stroke();
    }
    const pr = Math.max(1.2, u * 0.0095);
    ctx.beginPath();
    for (let i = 0; i < g.N; i++) { const x = cx + g.sx[i] * gs, y = cy + g.sy[i] * gs; ctx.moveTo(x + pr, y); ctx.arc(x, y, pr, 0, TAU); }
    ctx.fillStyle = '#000'; ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.lineWidth = 1; ctx.stroke();

    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    LETTERS.forEach((ch, i) => {
      const a = ((-20 - i * STEP) * Math.PI) / 180, sel = ch === g.letter;
      ctx.font = mono(u * (sel ? 0.125 : 0.09));
      ctx.fillStyle = sel ? '#fff' : 'rgba(255,255,255,.5)';
      ctx.fillText(ch, cx + Math.cos(a) * u * 1.25, cy + Math.sin(a) * u * 1.25);
    });

    const idle = v.present && !v.tips.length;
    if (v.present) {
      if (v.showSkeleton && v.lm) {
        ctx.strokeStyle = 'rgba(255,255,255,.45)'; ctx.lineWidth = 1; ctx.beginPath();
        for (const [a, b] of BONES) { const p = this.map(v.lm[a].x, v.lm[a].y), q = this.map(v.lm[b].x, v.lm[b].y); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); }
        ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.lineWidth = 1.6;
      for (const t of v.tips) { const [x, y] = this.map(t.x, t.y); ctx.beginPath(); ctx.arc(x, y, u * 0.085, 0, TAU); ctx.stroke(); }
    }

    let tx = W * 0.62, ty = H * 0.7;
    if (v.present && v.palm) { const [px, py] = this.map(v.palm.x, v.palm.y); tx = Math.min(W - u * 1.7, Math.max(W * 0.45, px + u * 0.7)); ty = Math.min(H * 0.9, Math.max(H * 0.15, py + u * 0.75)); }
    if (!this.hud.x) { this.hud.x = tx; this.hud.y = ty; }
    const k = 1 - Math.exp(-dt * 6); this.hud.x += (tx - this.hud.x) * k; this.hud.y += (ty - this.hud.y) * k;
    ctx.textAlign = 'left'; ctx.font = mono(u * 0.085); ctx.fillStyle = '#fff';
    const rows = [['CHARACTER:', g.letter], ['DISTORTION:', g.distortion.toFixed(2)], ['SMOOTHNESS:', g.smoothness.toFixed(2)]];
    rows.forEach(([a, b], i) => { const y = this.hud.y + i * u * 0.135; ctx.fillText(a, this.hud.x, y); ctx.fillText(b, this.hud.x + u * 0.95, y); });

    ctx.font = mono(u * 0.12); ctx.fillStyle = '#fff';
    if ('letterSpacing' in ctx) ctx.letterSpacing = `${u * 0.01}px`;
    ctx.fillText(`ADJUSTING: ${v.label}`, cx - u * 1.3, cy + u * 1.5);
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
  }
}
