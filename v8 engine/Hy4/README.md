# V8 // ENGINE DYNAMICS LAB

**File:** `v8-engine.html` — a single self-contained HTML page.

Open it in a modern browser (Chrome / Edge / Safari / Firefox).
An internet connection is required on first load only, to fetch the Three.js
library and its add-ons from the unpkg CDN. No 3D models, textures or assets are
downloaded — **all geometry and all textures are generated procedurally** in the
page itself (canvas textures, extrusions, lathes, tubes, PMREM environment).

## What it is

A 90° cross-plane V8 on an industrial engine test stand, with:

- 8 cylinders in two banks of four; cross-plane crank throws at 0° / 90° / 270° / 180°
- Real slider-crank kinematics: pistons, rods, wrist pins, crank pins and counterweights
- Dual overhead camshafts per bank turning at exactly **½ crankshaft speed**
- Full four-stroke valve sequence (intake / compression / power / exhaust) with
  valve overlap, spring compression and combustion flashes
- Correct even-fire 90° order: **1‑8‑4‑3‑6‑5‑7‑2**
- Detailed heads, intake runners + plenum, 4‑into‑1 exhaust headers, bolts,
  fuel rails, coolant hoses, wiring loom, flywheel, damper and accessory drive
- PBR metals with an image-based lighting environment, procedural roughness maps,
  cast textures, diamond plate and hazard stripes; soft shadows + bloom
- Industrial stand with I-beam skid, isolators, safety railing, dynamometer and
  instrument cabinet

## Controls

| Control | Action |
| --- | --- |
| **START / STOP** | Run or freeze the simulation |
| **RPM CONTROL** | 0 – 4 000 rpm slider |
| **SLOW-MO** | Cycles 1× → ¼× → ¹⁄₂₀× |
| **CUTAWAY** | Cycles **CUTAWAY** (mechanism exposed) → **X-RAY** (glass shells) → **SOLID** |
| **EXPLODED VIEW** | Animates every assembly apart with guide lines |
| **ASSEMBLE** | Animates everything back together |
| **PART INSPECTION** | Opens the parts list; click any component or choose from the list to inspect and focus |
| **RESET CAMERA** | Smoothly returns to the default view |

**Camera:** `WASD` walk · `Q/E` height · `Shift` fast · drag = orbit ·
right-drag / `Shift`+drag = pan · wheel = smooth zoom · `Space` = start/stop ·
`R` = reset camera.

The telemetry panel shows crank angle, cam angle, sim rate and a live 8-cylinder
four-stroke cycle monitor (POWER / EXHAUST / INTAKE / COMPRESS).

## Notes

- The simulation uses a visual time scale (4000 rpm ≈ 3 rev/s) so the mechanism
  remains legible; the readouts still show real rpm.
- A frame-loop fallback keeps the animation alive in background tabs.
- `window.__v8` exposes a small debug API (`setAngle`, `piston`, `lift`, `view`,
  `explode`, `parts`, `cam`) for inspection from the browser console.

Built by **Hy4**.
