# SUPERVISOR REVIEW, ROUND 2

I saved your file byte-for-byte and tested it in a real browser. Result: the verification command
prints OK, the module parses, there are no console errors, colours render, the first view frames
the whole island, the status line shows 15885 to 15975 voxels across 7 seeds at 60 fps, all five
presets end outside every structure, and night, fireflies, Play cycle, Regenerate seed, Wireframe,
Petals and Wind all work. Good work. The file stays exactly as it is except for the changes below.
Several of them correct values I gave you in the first brief; you implemented those faithfully.

## Required changes

### C1. Koi are almost invisible (the water hides them)

- `waterMaterial`: `opacity` 0.72 becomes 0.6.
- `buildKoiData`: the segment scales become `[0.7, 0.8, 0.65, 0.5, 0.35]`.
- `writeKoiMatrices`: the y of every segment becomes `-0.08` (was `-0.42`), so the back of the
  largest segments sits at the mean water level and shows as the surface bobs.

### C2. A koi loop can leave the water on some seeds

- `applyPond`: also fill `layout.pond.interior`, a `Set` of the `x + ',' + z` keys of the interior
  cells, and `layout.pond.centroid = { x, z }`, the mean x and mean z of all pond cells. Add both
  fields to every place that builds a `pond` object (the `let layout` literal, `resetLayout`,
  `computePond`), with `interior: new Set()` and `centroid: { x: 0, z: 0 }` as initial values.
- `buildKoiData`: the loop centre becomes the centroid plus a seeded offset of -0.8 to 0.8 on each
  axis. After choosing `a` and `b`, validate the loop: sample 64 phases around it; for every sample
  the cell `(Math.round(x), Math.round(z))` must be in `layout.pond.interior`. If any sample fails,
  multiply `a` and `b` by 0.88 and test again, at most 14 times, never letting `a` go below 1.0 or
  `b` below 1.2. Keep the number of `rng()` calls per koi fixed (do the validation without `rng`).

### C3. Lighting: shaded sides are too dark and grey, dawn and dusk are silhouettes, pinks wash out

Top-level declarations:
- add `let fill = null;` next to `let moon = null;`
- add `const whiteColor = new THREE.Color(0xffffff);` next to `groundColor`
- `groundColor` becomes `0x8c8172`

`init`:
- the `HemisphereLight` is created with `(0xa8d8f8, 0x8c8172, 1.1)`
- after the moon, create the fill light: `fill = new THREE.DirectionalLight(0xffffff, 0);`
  `fill.castShadow = false;` add `fill` and `fill.target` to the scene.

`applyTime`:
- `const dayFactor = smoothstep(-0.22, 0.22, sinAngle);`
- `sun.intensity = 2.4 * dayFactor;`
- `const warmMix = smoothstep(0.05, 0.6, sinAngle);`
- `hemi.intensity = lerp(0.5, 1.1, dayFactor);`
- `hemi.color.copy(sky).lerp(whiteColor, 0.35);` (instead of copying the sky colour unchanged)
- fill light, every call:
  `fill.position.set(-sunDir.x, 0.25, -sunDir.z).normalize().multiplyScalar(80);`
  `fill.target.position.set(0, 0, 0);`
  `fill.color.copy(sky).lerp(whiteColor, 0.6);`
  `fill.intensity = lerp(0.15, 0.9, dayFactor);`
- the moon lines stay as they are.

### C4. Two presets frame their subject too tightly

In `updatePresets`:
- Pagoda: position `(31, 22, 45)`, target `(0, 16.5, 0)` (the spire tip was cut off).
- Pond: position `(layout.pond.px + 17, 18, layout.pond.pz + 16)`, same target as now.

### C5. A petal passing right in front of the camera fills a quarter of the screen

In the `updatePetals` loop, before `dummy.updateMatrix()`: if the petal is closer than 7 units to
`camera.position` (compare squared distances, 49), use `dummy.scale.set(0, 0, 0)`; otherwise
`dummy.scale.set(1, 1, 1)` as now.

### C6. Fireflies are too small from the overview

`firefliesMaterial`: `size` 0.9 becomes 1.5.

### C7. The `speed` slider has no label

In the play row markup put `<span class="speed-label">speed</span>` between the play button and
the speed range. CSS: `.speed-label { flex: 0 0 auto; font-size: 11px; color: #cfd8e6; }` and
`.play-row .val { min-width: 22px; }`, and reduce `.play-btn` `min-width` from 92px to 88px.

### C8. Blossoms read as white instead of pale pink

In `buildTrees`, the colour choice by `minDistance`:
- the middle shell (the `else if (minDistance < 0.8)` branch): `BLOSSOM_COLORS[0]` 40 percent,
  `[1]` 25 percent, `[2]` 25 percent, `[3]` 10 percent.
- the outer shell (the final `else` branch): `BLOSSOM_COLORS[2]` 45 percent, `[0]` 30 percent,
  `[3]` 25 percent.
Keep exactly one `rng()` call per voxel for the pick, as now.

### C9. Add two stone lanterns beside the path

New function `buildLanterns(rng)`, called in `rebuildWorld` right after `buildTrees(rng)`.
For x = -3 and x = 3 at z = 11: skip the lantern if `hasVoxel(x, 1, z)`; otherwise set
y = 1 plinth stone (`PLINTH_COLORS[0]`), y = 2 plinth stone (`PLINTH_COLORS[2]`), y = 3 a warm
lamp voxel `0xffe7a3`, y = 4 a dark cap `0x4a4a50`. `scatterSteppingStones` already skips cells
that have a voxel at y = 1, so no other change is needed. The parameter `rng` may stay unused.

## Output format: search and replace edits, NOT the whole file

You have no tools. Do not print the whole file again. Answer with a list of edits in exactly this
form, one block per edit, and nothing else before, between or after the blocks except the
`### EDIT` title lines:

    ### EDIT 1: short title
    <<<<<<< FIND
    exact lines copied from the current file
    =======
    the lines that replace them
    >>>>>>> REPLACE

(The four-space indent above is only for showing the form here. In your answer the markers start
at column 0, and the lines between them keep the file's own indentation exactly.)

Rules. I apply the edits with a script, so they are strict:
1. The FIND text must match the current file byte-for-byte (same indentation, same spaces) and
   must occur exactly once in the file. Include enough neighbouring lines to make it unique.
2. Every FIND refers to the file as you wrote it (your previous answer), not to the result of an
   earlier edit. FIND texts must not overlap each other.
3. Whole lines only. Never abbreviate with dots inside FIND or REPLACE.
4. To insert new code, FIND an existing line or two next to the insertion point and repeat them in
   REPLACE together with the new lines.
5. The verification rule still holds for the result: no TODO, no FIXME, no line ending in three
   dots. New `let` / `const` declarations go to the top of the module with the others.
6. Keep the review proportionate: check each edit once against the file (does the FIND text exist
   exactly once, does the result still run top to bottom), then answer. Do not re-audit code that
   is not being changed.
