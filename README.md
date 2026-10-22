# Gestural Font Editor

**DEV/CREATOR = tubakhxn**

Edit a letter with your bare hand. Your webcam tracks 21 points on your hand, and the way you pose and rotate it reshapes a dotted, procedural A-Z glyph on screen in real time. Everything runs in the browser. No video ever leaves your machine.

## What it does

A letter is drawn as a ring of dots tracing its outline, surrounded by a dial of the alphabet. You control it with three hand poses, and in every pose, rotating your hand like a knob is the main control.

| Pose | Mode | What happens |
|---|---|---|
| Index + thumb out, other fingers curled | CHARACTER | Rotate your hand to pick a letter. 5 degrees of rotation = 1 letter, and the glyph morphs into it. |
| Index + middle + thumb out, ring and pinky curled | DISTORTION | Your hand position sets the warp area, moving drags the dots, rotating sets the strength. |
| All five fingers open | SMOOTHNESS | The outline eases from sharp to rounded while you hold it. Rotate to add or remove smoothing. |

A pose is confirmed after being held for 200 ms and released after 400 ms, so it will not flicker between modes.

## Tech

- Vite and Canvas 2D for the app and rendering
- MediaPipe Hand Landmarker (21 landmarks) for hand tracking, with the WASM runtime served locally
- No other runtime dependencies

## Run it

```
npm install
npm run dev
```

Open http://localhost:5173. The camera needs `localhost` or `https`.

```
npm run build
npm run preview
```

## Keys

| Key | Action |
|---|---|
| `D` | Demo mode (scripted hand, no camera needed) |
| `R` | Reset |
| `H` | Show or hide the hand skeleton overlay |
| `F` | Fullscreen |

If the camera or the model fails to load, the app falls back to demo mode automatically.

## Offline use

The hand model is fetched from Google's CDN by default. To run fully offline, download it and place it at `public/models/hand_landmarker.task`:

https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task

## How it works

- **Glyphs** (`src/glyphs.js`): each letter A-Z is defined as skeleton strokes (lines and arcs). They are rasterised, then the true outer and inner outlines are traced with marching squares and resampled into a fixed number of points. Every letter uses the same three-slot layout (outer outline plus up to two holes), so letters line up point to point.
- **Morphing** (`src/glyphEngine.js`): when the letter changes, every dot is matched to its nearest destination in the new letter using an optimal assignment (Hungarian algorithm). Dots take short, non-crossing paths, and the outline fades back in as the letter settles.
- **Gestures** (`src/gestureEngine.js`): fingers are classified as extended or curled from 3D joint-bend angles with hysteresis, then mapped to a mode. A scripted demo driver is included.
- **Distortion** (`src/deformation.js`): a Gaussian influence around your hand drags and twists nearby dots.
- **Smoothing** (`src/glyphEngine.js`): a repeated binomial filter per contour, rescaled so letters keep their size.
- **Rendering** (`src/renderer.js`): the construction ring, alphabet dial, dotted glyph, fingertip rings and readouts, all drawn on one canvas over the mirrored video.

## Project layout

```
index.html
src/
  main.js            app loop and gesture-to-control mapping
  camera.js          webcam setup
  handTracker.js     MediaPipe Hand Landmarker wrapper
  gestureEngine.js   pose classification and demo driver
  glyphs.js          procedural A-Z glyph builder
  glyphEngine.js     morphing, smoothing, point matching
  deformation.js     warp physics
  renderer.js        canvas drawing
  style.css
scripts/copy-assets.mjs   copies the MediaPipe wasm runtime into public/wasm
```

## Credits

Built by **tubaxn**.
