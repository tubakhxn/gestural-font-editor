// DEV/CREATOR = tubaxn
import { cpSync, existsSync, mkdirSync } from 'node:fs';
const src = 'node_modules/@mediapipe/tasks-vision/wasm';
if (existsSync(src)) {
  mkdirSync('public/wasm', { recursive: true });
  cpSync(src, 'public/wasm', { recursive: true });
  console.log('[assets] MediaPipe wasm copied to public/wasm');
}
