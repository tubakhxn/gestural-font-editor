// DEV/CREATOR = tubaxn
export function pull(g, cx, cy, vx, vy, dTheta, dt, gain) {
  const sigma = 0.26 + 0.22 * (g.knob / 100);
  const inv = 1 / (2 * sigma * sigma);
  const cosA = Math.cos, sinA = Math.sin;
  for (let i = 0; i < g.N; i++) {
    const dx = g.x[i] + g.ox[i] - cx, dy = g.y[i] + g.oy[i] - cy;
    const w = Math.exp(-(dx * dx + dy * dy) * inv);
    if (w < 0.002) continue;
    let nx = g.ox[i] + vx * dt * w * gain;
    let ny = g.oy[i] + vy * dt * w * gain;
    if (dTheta) {
      const a = dTheta * w * 1.2;
      nx += dx * cosA(a) - dy * sinA(a) - dx;
      ny += dx * sinA(a) + dy * cosA(a) - dy;
    }
    const m = Math.hypot(nx, ny);
    if (m > 0.9) { nx *= 0.9 / m; ny *= 0.9 / m; }
    g.ox[i] = nx; g.oy[i] = ny;
  }
  return sigma;
}
