# SPEC — Voxel Pagoda Garden (桜の庭)

Build ONE self-contained file: `index.html` in this directory.
No build step, no npm, no other files. Opening the file in a browser must run it.

## Tech

- Three.js r160 from CDN, loaded as an ES module import map:
  `https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js`
  and `https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/controls/OrbitControls.js`
- All voxels are unit cubes drawn with `THREE.InstancedMesh` (ONE BoxGeometry
  shared, per-instance color via `instanceColor`). Target ~16000 voxel
  instances total. Do NOT create one Mesh per voxel — that is the main
  performance requirement.
- A seeded PRNG (mulberry32). Every random choice goes through it so the same
  seed rebuilds the identical scene.

## The scene

A small floating island hanging in a pale blue sky.

- **Island**: a disc of voxels, radius ~22, with an irregular jagged edge.
  Top layer grass green (2–3 shades), below it dirt brown, and the underside
  tapers to a rough rocky point. Scattered light-grey stone path voxels on top.
- **Pagoda**: 5 tiers, centered, tall and dark (near-black timber with white
  plaster panels and a red trim line). Each tier is narrower than the one
  below, each with an overhanging flared roof. Topped with a small spire.
- **Pond**: an irregular blue water pool set into the island, with 2–3 orange
  koi voxel-fish that swim slowly in loops just under the surface.
- **Torii gate**: a red-and-black torii at the island edge, on the stone path.
- **Cherry trees**: 5 of them — dark brown trunk voxels, blossom canopy of
  pink/white voxels in 2–3 shades. Varied sizes and positions.
- **Bridge**: a short dark plank bridge over the pond.
- **Petals**: falling cherry petals, also InstancedMesh (small flat boxes),
  count adjustable, each tumbling with its own rotation, drifting with wind,
  and respawning above the island when it falls past the bottom.
- **Fireflies**: ~80 glowing points that drift slowly; visible only at night,
  fading in after dusk.

## Day/night cycle

A clock from 00:00 to 24:00 drives:
- sun direction and colour (warm at dawn/dusk, white at noon),
- a moon light at night,
- sky background colour and fog colour lerping between night / dawn / day /
  dusk key colours,
- ambient light level,
- firefly opacity.

## UI

A translucent dark control panel pinned to the TOP-LEFT, title `Controls`, small
sans-serif text, with:

- `Time` slider (0–24) showing the clock as `HH:MM` on the right
- `▶ Play cycle` toggle button and a `speed` slider beside it
- `Petals` slider, 0–3000, value shown on the right
- `Wind` slider, 0–1, value shown on the right
- Checkboxes: `Auto-rotate`, `Shadows`, `Fireflies`, `Water anim`, `Wireframe`
- Camera preset buttons in two rows: `1 Overview` `2 Pagoda` `3 Pond`
  `4 Torii` `5 Blossoms` — each flies the camera smoothly (eased, ~1.2s) to a
  framed view of that subject. Number keys 1–5 do the same.
- `Regenerate seed` and `Reset view` buttons
- A bottom status line: `voxels: N   HH:MM   fps: N` (fps updated once a second)

Top-right overlay, non-interactive: `桜の庭` large, and `VOXEL PAGODA GARDEN`
small and letter-spaced underneath.

## Behaviour

- OrbitControls with damping; `Auto-rotate` slowly spins the camera.
- Shadows: a directional sun light casting shadows, toggleable.
- Water anim: the pond surface voxels bob on a sine wave.
- Wireframe: switches every voxel material to wireframe.
- `Regenerate seed` picks a new seed and rebuilds the whole island, trees and
  pagoda placement from scratch without reloading the page.
- Resize handling. Pixel ratio capped at 2.
- Must hold 60fps on a modern laptop — keep draw calls to a handful.

## Boundary

- Only `index.html` in this directory. Create no other file.
- If something here is ambiguous, pick the reading that looks closest to a
  Minecraft-style voxel Japanese garden and keep going; do not stop to ask.
- Finish the whole file. Do not leave `// TODO` or placeholder functions.

## Verification

Run this and it must print `OK`:

```
node -e "const s=require('fs').readFileSync('index.html','utf8'); if(!/InstancedMesh/.test(s)) throw new Error('no InstancedMesh'); if(!/OrbitControls/.test(s)) throw new Error('no OrbitControls'); if(s.length<20000) throw new Error('too short: '+s.length); if(/TODO|FIXME|\.\.\. *$/m.test(s)) throw new Error('placeholder left'); console.log('OK')"
```
