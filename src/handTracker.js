// DEV/CREATOR = tubaxn
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';

const BASE = import.meta.env.BASE_URL;
const CDN_WASM = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm';
const CDN_MODEL = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

async function local(url, notType) {
  try {
    const r = await fetch(url, { method: 'HEAD' });
    return r.ok && !(r.headers.get('content-type') || '').includes(notType);
  } catch { return false; }
}

export class HandTracker {
  async init() {
    const wasm = (await local(`${BASE}wasm/vision_wasm_internal.js`, 'html')) ? `${BASE}wasm` : CDN_WASM;
    const model = (await local(`${BASE}models/hand_landmarker.task`, 'html')) ? `${BASE}models/hand_landmarker.task` : CDN_MODEL;
    const fileset = await FilesetResolver.forVisionTasks(wasm);
    const make = (delegate) => HandLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: model, delegate },
      runningMode: 'VIDEO', numHands: 1,
      minHandDetectionConfidence: 0.5, minHandPresenceConfidence: 0.5, minTrackingConfidence: 0.5,
    });
    try { this.lm = await make('GPU'); } catch { this.lm = await make('CPU'); }
    this.lastT = -1; this.lastTs = 0;
  }

  detect(video, now) {
    if (!this.lm || video.readyState < 2 || video.currentTime === this.lastT) return undefined;
    this.lastT = video.currentTime;
    const ts = Math.max(now, this.lastTs + 1); this.lastTs = ts;
    const res = this.lm.detectForVideo(video, ts);
    return res.landmarks?.[0] || null;
  }
}
