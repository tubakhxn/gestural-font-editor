// DEV/CREATOR = tubaxn
import './style.css';
import { GlyphEngine, LETTERS } from './glyphEngine.js';
import { GestureEngine, DemoDriver } from './gestureEngine.js';
import { Renderer } from './renderer.js';
import { pull } from './deformation.js';
import { startCamera } from './camera.js';
import { HandTracker } from './handTracker.js';

const $ = (id) => document.getElementById(id);
const video = $('video'), status = $('status'), hint = $('hint'), badge = $('badge'), stage = $('stage');
const HINTS = {
  CHARACTER: '🤌 index+thumb → pick the letter',
  DISTORTION: '🤌 index+middle+thumb → warp its glyphs',
  SMOOTHNESS: '🖐 all five → smooth the lines',
};
const STEP = 360 / 26;

const glyph = new GlyphEngine();
const gest = new GestureEngine();
const demo = new DemoDriver();
const renderer = new Renderer($('cv'), video);
let tracker = null, demoOn = false, showSkeleton = false, rawLast = null;
let lastMode = 'CHARACTER', prevMode = null, letterIdx = LETTERS.indexOf('K');
let letterPos = 10, shown = 10, prevCtrl = null, vel = { x: 0, y: 0 }, prevAngle = null, cameraOK = false;

const setStatus = (t) => { status.textContent = t; };
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));

function setDemo(on) {
  demoOn = on; badge.hidden = !on; if (on) { resetAll(); }
  setStatus(on ? 'DEMO MODE · press D to stop' : cameraOK ? 'CAMERA · HAND LANDMARKER · 21 PTS' : 'CAMERA OFF · press D for demo');
}
function resetAll() { glyph.reset(); letterIdx = 10; letterPos = 10; shown = 10; if (demoOn) demo.reset(); }

addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase();
  if (k === 'd') setDemo(!demoOn);
  else if (k === 'r') resetAll();
  else if (k === 'h') showSkeleton = !showSkeleton;
  else if (k === 'f') (document.fullscreenElement ? document.exitFullscreen() : stage.requestFullscreen?.());
});

(async function boot() {
  setStatus('STARTING CAMERA…');
  try { await startCamera(video); cameraOK = true; }
  catch (err) { console.warn(err); setStatus('NO CAMERA · demo mode'); setDemo(true); return; }
  setStatus('LOADING HAND LANDMARKER…');
  try { tracker = new HandTracker(); await tracker.init(); setStatus('CAMERA · HAND LANDMARKER · 21 PTS'); }
  catch (err) { console.warn(err); tracker = null; setStatus('MODEL FAILED TO LOAD · demo mode'); setDemo(true); }
})();

function apply(st, dt) {
  const mode = st.present ? st.mode : null;
  if (mode !== prevMode) { prevCtrl = null; prevAngle = null; vel = { x: 0, y: 0 }; prevMode = mode; }
  if (mode) lastMode = mode;
  let ctrlG = null, dth = 0;
  if (mode) {
    if (prevAngle !== null) dth = Math.max(-0.35, Math.min(0.35, wrap(st.angle - prevAngle)));
    prevAngle = st.angle;
  }
  const dDeg = (dth * 180) / Math.PI;

  if (mode === 'CHARACTER') {
    letterPos -= dDeg / 5;
    if (Math.abs(letterPos - shown) > 0.6) shown = Math.round(letterPos);
    const i = ((shown % 26) + 26) % 26;
    if (i !== letterIdx) { letterIdx = i; glyph.setLetter(LETTERS[i]); }
  }
  if (mode === 'DISTORTION' && st.tips.length) {
    const c = st.tips.reduce((a, t) => ({ x: a.x + t.x / st.tips.length, y: a.y + t.y / st.tips.length }), { x: 0, y: 0 });
    const gx = (c.x - 0.72) * st.asp * 1.5, gy = (c.y - 0.5) * 1.5;
    if (prevCtrl) {
      const k = 1 - Math.exp(-dt * 14);
      vel.x += (((c.x - prevCtrl.x) * st.asp * 1.5) / dt - vel.x) * k; vel.y += (((c.y - prevCtrl.y) * 1.5) / dt - vel.y) * k;
    }
    prevCtrl = c;
    glyph.knob = Math.max(0, Math.min(100, glyph.knob + dDeg * 0.3));
    const sigma = pull(glyph, gx, gy, vel.x, vel.y, dth, dt, 1.0 + (glyph.knob / 100) * 1.6);
    ctrlG = { x: gx, y: gy, sigma };
  }
  if (mode === 'SMOOTHNESS') {
    glyph.smoothness = Math.max(0, Math.min(100, glyph.smoothness + dDeg * 0.7 + 6 * dt));
  }
  return ctrlG;
}

let last = performance.now();
function frame(now) {
  const dt = Math.max(0.001, Math.min(0.05, (now - last) / 1000)); last = now;
  const asp = video.videoWidth && video.videoHeight ? video.videoWidth / video.videoHeight : 16 / 9;
  let st;
  if (demoOn) {
    st = demo.update(dt);
    if (st.wrapped) resetAll();
    setStatus(`DEMO · ${st.label}`);
  } else {
    const r = tracker ? tracker.detect(video, now) : null;
    if (r !== undefined) rawLast = r;
    st = gest.update(rawLast, dt, asp);
    if (cameraOK && tracker) setStatus(st.present ? `HAND · ${st.mode || 'NONE'} · FINGERS I M R P = ${(st.raw?.f || '0000').split('').join(' ')} · ROTATE YOUR HAND LIKE A KNOB` : 'NO HAND · SHOW YOUR HAND');
  }
  const ctrlG = apply(st, dt);
  glyph.update(dt);
  hint.textContent = HINTS[lastMode];
  renderer.draw(glyph, {
    present: st.present, tips: st.tips, all: st.all, palm: st.palm, lm: st.lm, showSkeleton,
    ctrlG, label: lastMode,
  }, dt);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
