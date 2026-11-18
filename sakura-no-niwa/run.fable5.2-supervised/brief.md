# SUPERVISOR BRIEF (binding)

I am your supervisor. The design decisions below are already made; your job is the implementation.
Follow this brief exactly. Where it is silent, follow SPEC.md. Where both are silent, pick the reading
closest to a Minecraft-style voxel Japanese garden and keep going.

## 0. How this call works (read first)

1. This is one chat-completion call. You have no tools: you cannot read files, write files or run
   commands. SPEC.md is pasted in full above; that is the file the task statement refers to.
2. "Build index.html" therefore means: answer with the complete file, from `<!DOCTYPE html>` to
   `</html>`, inside ONE fenced block opened with ```html. I save that block byte-for-byte, run the
   verification command myself, then open the page in a real browser and test every control.
3. Write nothing before or after the block. No explanation and no VERIFICATION block (you cannot
   run the command; I will).
4. Only if the spec is unusably ambiguous: answer the single word BLOCKED plus one sentence, no code.
5. The verification regex runs over the whole file in multiline mode. Nowhere in the file (comments
   and strings included) may you write the word TODO, the word FIXME, or end a line with three dots.
   The file must be longer than 20000 characters and contain `InstancedMesh` and `OrbitControls`.
6. Completeness is the first requirement. Every function is written out in full: no "same as above",
   no "rest omitted", no stubs. Expect 1000 to 1400 lines. Do not minify and do not pad.

## 1. Skeleton

```html
<script type="importmap">
{ "imports": {
  "three": "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js",
  "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/"
} }
</script>
<script type="module">
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
```

- The module script goes at the end of `<body>`, after the panel and overlay markup.
- Put ALL module-level `const` / `let` declarations (state, DOM refs, scene objects, materials, colour
  tables) at the top of the module, before anything is called. Call `init()` as the very last
  statement. A `let`/`const` read before its declaration line has run crashes the page.
- Never call `Math.random`. World generation uses `mulberry32(seed)`; runtime effects (petals,
  fireflies) use their own mulberry32 stream derived from the seed.

## 2. Rendering rules (these decide whether the page works at all)

- One shared `new THREE.BoxGeometry(1, 1, 1)` for all voxels. Draw calls, and nothing else:
  1. `staticMesh`: ONE InstancedMesh holding every solid world voxel (island, pagoda, torii, trees,
     bridge, path, pond bed). `castShadow = true`, `receiveShadow = true`.
  2. `waterMesh`: InstancedMesh, the pond surface voxels only (transparent, animated).
  3. `koiMesh`: InstancedMesh, all koi body segments (animated).
  4. `petalMesh`: InstancedMesh with its own flat box geometry, capacity 3000, `mesh.count` = slider.
  5. `fireflies`: one `THREE.Points`.
- Voxel materials: `new THREE.MeshLambertMaterial({ color: 0xffffff })`. Per-instance colour ONLY via
  `mesh.setColorAt(i, color)` then `mesh.instanceColor.needsUpdate = true`.
- NEVER put `vertexColors: true` on a material used by an InstancedMesh. BoxGeometry has no `color`
  attribute, so the shader multiplies by zero and every voxel renders black. `vertexColors: true` is
  allowed only on the fireflies `PointsMaterial`, and only because you create a `color`
  BufferAttribute on that geometry.
- Set `frustumCulled = false` on every InstancedMesh and on the Points (instances move and get
  rebuilt; a stale bounding sphere makes them vanish).
- Animated meshes: `instanceMatrix.setUsage(THREE.DynamicDrawUsage)`; after writing matrices set
  `instanceMatrix.needsUpdate = true`.
- three r160 uses physical light units. Intensity 1 is far too dark. Use: sun `DirectionalLight` peak
  3.0, `HemisphereLight` 1.5 by day and 0.45 at night, moon `DirectionalLight` 0.8 at night.
  Leave `renderer.toneMapping` at its default (no tone mapping) so the palette stays true.
- Renderer: `antialias: true`, `setPixelRatio(Math.min(window.devicePixelRatio, 2))`,
  `shadowMap.enabled = true` (leave it on forever), `shadowMap.type = THREE.PCFSoftShadowMap`.
  Sun shadow: `mapSize` 2048, orthographic shadow camera left/right/top/bottom = -46/46/46/-46,
  near 1, far 240, `bias = -0.0005`, `normalBias = 0.05`. The `Shadows` checkbox toggles
  `sun.castShadow` only.
- Camera: `PerspectiveCamera(45, aspect, 0.5, 900)`. Fog: `new THREE.Fog(skyColor, 130, 420)`.
- On `Regenerate seed`: remove the old static / water / koi meshes from the scene, call
  `mesh.dispose()` on them (never dispose the shared geometry or the materials), build new ones.

## 3. Coordinates and world store

- 1 unit = 1 voxel, integer cell coordinates, y is up. Island centre is x = 0, z = 0.
- The grass surface is the layer y = 0. Everything that stands on the island starts at y = 1.
- Azimuth convention used below: `az = atan2(x, z)`. az 0 = +Z = the FRONT (the default camera looks
  from there), az 90 degrees = +X = the right side.
- World store: a `Map` keyed by `x + ',' + y + ',' + z` whose value is `[x, y, z, colorHex]`, with
  `setVoxel`, `removeVoxel`, `hasVoxel`. A later write to the same cell overwrites, so no cell ever
  holds two instances.
- When filling `staticMesh`, multiply each colour by a seeded brightness jitter of 0.94 to 1.06 for
  a hand-placed look.
- Keep a `layout` object (pond centre and radii, pond cell set, torii position, tree list with
  position / trunk height / canopy radius, bridge row). Camera presets are computed from it.

## 4. World generation (build in this order)

Voxel budget: the grand total shown in the status line must land between 15600 and 16400.
Rough shares: island about 12000, pagoda about 2300, trees about 1350, the rest about 350.

### 4.1 Island outline

`edgeRadius(theta) = 22 + 1.4*sin(3*theta + a) + 0.9*sin(5*theta + b) + 0.5*sin(8*theta + c)` with
seeded phases a, b, c. A cell (x, z) is land when `hypot(x, z) <= edgeRadius(atan2(z, x)) + jitter`,
jitter = seeded -0.6 to +0.6 per cell (that gives the jagged edge). Cells with `|x| <= 4` and
`8 <= z <= 20` are ALWAYS land (the torii stands there).

- y = 0: grass, three shades 0x6aa84f / 0x7bbf5a / 0x5c9644, chosen per cell.
- y = -1 and y = -2: dirt 0x7a5a3c / 0x6b4d33.
- Underside, layers k = 1 to D at y = -2 - k: a cell is rock when
  `hypot(x, z) <= edgeRadius(theta) * pow(1 - k / (D + 1), 1.3) + jitter` (jitter -0.8 to +0.8).
  Rock greys 0x77777c / 0x66666b / 0x8a8a8f, the first underside layer mixed with dirt. Add a few
  1 to 3 voxel stalactites hanging under random underside cells. The body is SOLID (filled), which
  is what brings the count to the target.
- Auto-fit: keep the underside in its own array, generated by `genUnderside(seed, D)` (it re-seeds
  its own PRNG, so the same D always gives the same result). After everything else is built start
  with D = 19 and loop at most 14 times: `total = solid voxels + water voxels + koi segments`; if
  total < 15600 then D++, else if total > 16400 then D--, else stop. Then add the underside to the
  world store. `total` must be exactly the number the status line shows.

### 4.2 Pagoda (centre 0, 0, always centred; five tiers)

Colours: timber 0x1d1b1c / 0x2a2526, plaster 0xf1ece0, red 0xb5322a, roof 0x262a31, roof edge
0x3a3f48, gold 0xd9a441, plinth stone 0x8f8f93 / 0x9c9ca0 / 0x7f7f84.

- Plinth: solid, y = 1 to 2, `|x| <= 7` and `|z| <= 7`. Steps: y = 1, z = 8, x from -2 to 2.
- Tier i = 0 to 4: half-width `hw = [5, 4, 3, 2, 1]`, wall height `wh = [4, 3, 3, 3, 3]`, first
  base `y0 = 3`.
  - Walls are a hollow shell: only cells with `|x| == hw` or `|z| == hw`. Lowest row all timber, top
    row all red (the red trim line under the eave). Rows between: corner cells and every second
    cell along the wall are timber posts, the others plaster.
  - Tier 0 doorway: front wall (z = +hw), x from -1 to 1, the lowest 3 rows are left empty, with a
    near-black 0x0c0c0e voxel one cell behind them (z = hw - 1).
  - Roof on top of the walls at `yr = y0 + wh`:
    - layer yr: full square `|x|, |z| <= hw + 3` (the overhanging eave) in roof colour, its
      outermost ring in the roof edge colour;
    - flare: on that outermost ring, cells within 1 of a corner are lifted from yr to yr + 1, and
      the 4 exact corner cells sit at yr + 2 (upturned corners);
    - layer yr + 1: full square `|x|, |z| <= hw + 1`.
  - Next tier base `y0 = yr + 2`. Expected tier bases: y = 3, 9, 14, 19, 24.
- Top: a 3 x 3 cap one layer above the last roof, then the spire: a 1 x 1 mast 7 voxels tall
  alternating timber and gold, a plus-shaped gold ring (4 voxels around the mast) at two heights,
  and a gold ball voxel on top. Spire top is at about y = 37.

### 4.3 Stone path and torii (front, az 0)

- Path: cells x from -1 to 1, z from 9 to 20, at y = 0, recoloured to light-grey stone
  0xbdbdc0 / 0xcfcfd2 / 0xa9a9ad with about 15 percent left as grass. Also recolour about 40
  random lawn cells elsewhere as scattered stepping stones (not pond, not under a structure).
- Torii at z = 18, one voxel thick: pillars x = -3 and x = 3, y = 1 to 6 (lowest voxel black
  0x16161a, the rest red 0xc23b2c); lower lintel y = 5, x from -4 to 4, red; upper lintel y = 7,
  x from -4 to 4, red; cap y = 8, x from -5 to 5, black, plus one extra black voxel at y = 9 on
  x = -5 and x = 5 (upturned ends); a gold tablet voxel at x = 0, y = 6.

### 4.4 Pond (right side, az about 90 degrees)

- Centre `(px, pz)`: px seeded 13 to 14, pz seeded -1 to 2. Ellipse radii `rx` 4.8 to 5.4 (along x)
  and `rz` 9 to 10 (along z), with a seeded wobble of the boundary so it is irregular.
- A cell is a pond cell only if ALL hold: inside the wobbly ellipse; `x >= 9` (two cells clear of the
  plinth); `hypot(x, z) <= edgeRadius(theta) - 3` (never touches the rim). If fewer than 120 cells
  result, scale both radii by 1.08 and retry (at most 6 times).
- For each pond cell: remove the grass voxel at y = 0 and add one water instance there (drawn by
  `waterMesh`, scale y 0.8, centre y = -0.1, so the surface sits 0.2 below the lawn). Interior cells
  (all 4 neighbours are pond cells): remove the voxel at y = -1 and recolour y = -2 as pond bed
  0x2b4a5c / 0x355a6e. Rim cells: recolour y = -1 as pond bed.
- Water colours: 0x3f8fd0 / 0x4aa3df / 0x3478b8 per instance. Material: MeshLambertMaterial,
  `transparent: true`, `opacity: 0.72`, `depthWrite: false`. `receiveShadow = true`, no castShadow.
- `Water anim`: each frame every water instance gets `y = -0.1 + 0.09 * sin(t * 1.6 + x * 0.7 + z * 0.5)`.
  Only water instances move. When the box is unchecked write the rest position once and stop.

### 4.5 Bridge

Runs along x at the row `z = round(pz)`, from one cell west of the pond's westmost cell in that row
to one cell east of its eastmost cell. Deck 3 wide (z - 1 to z + 1), dark planks alternating
0x3b2a20 / 0x4a3628. Arch: `deckY = 1 + round(1.2 * sin(PI * t))`, t = 0 to 1 along the span (ends
at y = 1, middle at y = 2). Posts: one voxel above the deck at the four ends and at mid-span on both
sides, dark red 0x8a2a20. No continuous rails (unit-cube rails look like logs).

### 4.6 Cherry trees (exactly 5)

- Canopy radii `[5, 4, 4, 3, 3]` in seeded order; trunk height = canopy radius + (2 to 4).
- Position by seeded rejection sampling (up to 600 tries per tree, then relax the spacing rule):
  radius from centre 11 to 17.5; azimuth `atan2(x, z)` between 130 and 340 degrees only (behind and
  left of the pagoda; this keeps the front-right view corridor free); at least 3.5 from every pond
  cell; at least 2.5 from every path cell; at least 7.5 from every other trunk.
- Trunk: 0x4a3324 / 0x3b281c, 1 x 1, from y = 1 up; one or two short branch voxels near the top.
- Canopy centred on the trunk top: a main ellipsoid (radius r, squashed to 0.8 r vertically) plus
  2 or 3 offset lobes of radius 0.6 r. Cells whose normalised distance is over 0.8 are skipped with
  35 percent probability (airy edge). Colours 0xffb7c9 / 0xff9fb8 / 0xffd3df / 0xfff1f5 at random,
  the darker pinks more often near the core.

### 4.7 Koi (2 or 3 by seed)

Each koi is 5 small cubes (scales 0.55, 0.6, 0.5, 0.4, 0.3) following an elliptical loop inside the
pond: loop centre within 1 of the pond centre, loop radii `a` 1.8 to `rx - 2.2` and `b` 2.5 to
`rz - 3`, angular speed 0.25 to 0.4 rad/s, seeded direction. Segment j trails the head by a phase
delay; each segment is yawed along the path tangent. y = -0.42 (just under the surface). Colours
0xff7a1a / 0xe2580f with one white 0xfff3e0 segment. Material: plain MeshLambertMaterial.

## 5. Petals and fireflies

- Petals: geometry `BoxGeometry(0.32, 0.05, 0.22)`, capacity 3000, default 900. Per-petal state in
  typed arrays (position, fall speed 1.2 to 2.6, three rotation angles with their own spin speeds,
  sway phase). Each frame: fall, sway, drift by `windDir * wind * 5.5` with a slow gust factor,
  advance the rotations, write the matrix. Respawn when y < -26 or the horizontal distance exceeds
  46: new position on a disc of radius 30 at y 34 to 44, the disc shifted upwind by `wind * 18` so
  petals cross the island. At start spread y uniformly from -26 to 44. Colours: three pinks.
- Fireflies: 80 points, base positions within radius 19, y from 1.5 to 11. Each drifts slowly around
  its base (sums of sines, frequencies 0.15 to 0.5) and twinkles through its entry in the `color`
  attribute. `PointsMaterial`: size 0.9, `sizeAttenuation: true`, `map` = a small radial-gradient
  `CanvasTexture`, `transparent: true`, `depthWrite: false`, `blending: THREE.AdditiveBlending`,
  `vertexColors: true`, `fog: false`, warm yellow-green. `opacity` = night factor;
  `visible` = Fireflies checkbox AND night factor > 0.01.

## 6. Day / night: one function `applyTime(hours)`

- Sun angle `a = (hours - 6) / 24 * 2 * PI`; direction = normalize(`0.8 * cos(a)`, `sin(a)`, `0.45`);
  `sun.position` = direction * 90, target at the origin. Day factor
  `d = smoothstep(-0.1, 0.25, sin(a))`.
- Sun intensity `3.0 * d`; sun colour from warm 0xffb070 near the horizon to 0xfff6e8 high up.
- Moon: fixed direction (-0.4, 0.8, 0.45), colour 0x9fb8ff, intensity `0.8 * (1 - d)`.
- Hemisphere light: intensity `lerp(0.45, 1.5, d)`, sky colour follows the sky, ground 0x6b5a45.
- Sky key colours by hour, linearly interpolated, applied to `scene.background` and `scene.fog.color`:
  0 -> 0x0a0f24, 4.5 -> 0x101a3a, 6 -> 0xf2a88a, 7.5 -> 0xbfdcf2, 12 -> 0xa8d8f8, 16.5 -> 0xb5d9f5,
  18.2 -> 0xf29a6b, 19.5 -> 0x2a2a52, 21 -> 0x0c1230, 24 -> 0x0a0f24.
- Night factor for the fireflies: `smoothstep(18.5, 20, hours)` after noon,
  `1 - smoothstep(4.5, 6, hours)` before noon.
- `Play cycle`: `hours += dt * speed` (speed slider 0.1 to 3 hours per second, default 0.6), wrap
  at 24, and keep the Time slider and the `HH:MM` text in sync.

## 7. Camera, presets, flights

- OrbitControls: `enableDamping = true`, `dampingFactor = 0.08`, `minDistance = 10`,
  `maxDistance = 240`, `autoRotateSpeed = 0.6`. Call `controls.update()` every frame.
- Every preset camera position must be outside the island rim (horizontal distance from the centre
  at least 30), so it can never sit inside a structure. Recompute presets from `layout` after every
  rebuild:
  1. Overview: position (52, 40, 62), target (0, 7, 0). Also the initial view and `Reset view`.
  2. Pagoda: position (29, 21, 42), target (0, 16, 0).
  3. Pond: position (px + 15, 16, pz + 14), target (px, 0.5, pz).
  4. Torii: position (8, 7, 41), target (0, 6, 18).
  5. Blossoms: take the tree farthest from the centre, `dir` = its unit direction from the centre;
     position = (tree.x + dir.x * 22, canopyY + 6, tree.z + dir.z * 22), target = canopy centre.
- Flight: store start position / start target / `startMs = performance.now()`. Every frame
  `k = clamp((performance.now() - startMs) / 1200, 0, 1)`, ease with easeInOutCubic, lerp BOTH
  `camera.position` and `controls.target`. Progress must come from the wall clock, never from
  accumulated `dt`. Do not disable the controls during a flight; cancel the flight when the user
  starts dragging (OrbitControls `start` event).
- Number keys 1 to 5 trigger the same presets as the buttons.

## 8. UI (exact labels from SPEC.md)

- `#panel`: fixed, top 12px, left 12px, width about 250px, `background: rgba(12, 14, 20, 0.72)`,
  light text, `font: 12px/1.4 system-ui, sans-serif`, rounded, title `Controls`.
- Rows in this order: `Time` range 0 to 24 step 0.01 with `HH:MM` on the right; one row holding the
  `▶ Play cycle` button (label switches to `⏸ Pause cycle` while playing) and the `speed` range;
  `Petals` range 0 to 3000 step 50 with the value on the right; `Wind` range 0 to 1 step 0.01 with
  the value on the right (2 decimals); checkboxes `Auto-rotate`, `Shadows`, `Fireflies`,
  `Water anim`, `Wireframe`; preset buttons in two rows (`1 Overview` `2 Pagoda` `3 Pond` then
  `4 Torii` `5 Blossoms`); `Regenerate seed` and `Reset view`; and as the LAST row inside the panel
  the status line `voxels: N   HH:MM   fps: N` (use `white-space: pre`; fps refreshed once a second).
- Defaults: time 10.5, not playing, petals 900, wind 0.35, Auto-rotate off, Shadows on, Fireflies
  on, Water anim on, Wireframe off, seed 20260405.
- `voxels: N` counts static + water + koi instances. Petals and fireflies are NOT counted.
- `Wireframe` sets `.wireframe` on the static, water, koi and petal materials.
- `Regenerate seed`: `seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0`, then rebuild world,
  koi, petals, fireflies and presets, and refresh the voxel count. The camera stays where it is.
- Top-right overlay with `pointer-events: none`: `桜の庭` large (about 44px, a serif Japanese font
  stack, white with a soft shadow) and under it `VOXEL PAGODA GARDEN` small (about 11px,
  `letter-spacing: 0.35em`).
- Resize: update camera aspect, projection matrix and renderer size.

## 9. Frame loop order

`dt` (clamped to 0.1) -> advance time if playing -> `applyTime` -> water -> koi -> petals ->
fireflies -> camera flight -> `controls.update()` -> `renderer.render` -> fps counter.

## 10. Defects found in earlier attempts at this exact task (do not repeat them)

1. `vertexColors: true` on the InstancedMesh material: the whole scene rendered black.
2. Camera presets placed inside tree canopies, the torii or the pagoda eaves.
3. The first view cut off the island (camera too close for a 45 degree lens).
4. Camera flights driven by accumulated `dt` instead of `performance.now()`.
5. The status line placed outside the panel.
6. A pond of only about 50 cells; koi invisible.
7. Petals counted in `voxels: N`.
8. A `let` / `const` used before its declaration: the page crashed at load.
9. The pond bed bobbing together with the water.
10. Light intensities of about 1: the scene came out dark.

## 11. Before you answer

Re-read your code once the way the browser executes it, top to bottom: every identifier is declared
before its first runtime use, every DOM id used in script exists in the markup, every function you
call is defined, every brace and bracket closes, and the file ends with `</script></body></html>`.
Then output the single ```html block and nothing else.
