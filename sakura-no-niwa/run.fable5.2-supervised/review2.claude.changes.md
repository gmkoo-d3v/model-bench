## Required changes (the same list every implementer of this task receives)

Function names below are descriptions; use the equivalent place in your own file.

### C1. Koi are almost invisible (the water hides them)

- The water material: `opacity` 0.72 becomes 0.6.
- The koi segment scales become `[0.7, 0.8, 0.65, 0.5, 0.35]`.
- In the per-frame koi update the y of every segment becomes `-0.08` (was `-0.42`), so the back of
  the largest segments sits at the mean water level and shows as the surface bobs.

### C2. A koi loop can leave the water on some seeds

- When the pond is built, also record in the pond data of `layout`: `interior`, a `Set` of the
  `x + ',' + z` keys of the interior cells (cells whose 4 neighbours are all pond cells), and
  `centroid = { x, z }`, the mean x and mean z of all pond cells.
- When the koi are defined, the loop centre becomes the centroid plus a seeded offset of -0.8 to
  0.8 on each axis. After choosing the loop radii `a` and `b`, validate the loop: sample 64 phases
  around it; for every sample the cell `(Math.round(x), Math.round(z))` must be in the interior
  set. If any sample fails, multiply `a` and `b` by 0.88 and test again, at most 14 times, never
  letting `a` go below 1.0 or `b` below 1.2. Keep the number of `rng()` calls per koi fixed (do
  the validation without `rng`).

### C3. Lighting: shaded sides are too dark and grey, dawn and dusk are silhouettes, pinks wash out

- Hemisphere ground colour becomes `0x8c8172` everywhere it is set.
- Add a fill light: a `THREE.DirectionalLight(0xffffff, 0)` with `castShadow = false`; add it and
  its target to the scene. Declare it with the other lights.
- In the function that applies the time of day:
  - day factor `d = smoothstep(-0.22, 0.22, sin(a))`
  - sun intensity `2.4 * d`
  - sun warm-to-white mix `smoothstep(0.05, 0.6, sin(a))`
  - hemisphere intensity `lerp(0.5, 1.1, d)`
  - hemisphere sky colour = the sky colour lerped 0.35 toward white (not the plain sky colour)
  - fill light, every call: position = normalize(`-sunDir.x`, `0.25`, `-sunDir.z`) * 80, target at
    the origin, colour = the sky colour lerped 0.6 toward white, intensity `lerp(0.15, 0.9, d)`
  - the moon stays as it is.

### C4. Two presets frame their subject too tightly

- Pagoda: position `(31, 22, 45)`, target `(0, 16.5, 0)` (the spire tip was cut off).
- Pond: position `(px + 17, 18, pz + 16)`, same target as now.

### C5. A petal passing right in front of the camera fills a quarter of the screen

In the per-frame petal update: if a petal is closer than 7 units to `camera.position` (compare
squared distances, 49), write it with scale 0 for that frame; otherwise scale 1 as now.

### C6. Fireflies are too small from the overview

The fireflies `PointsMaterial` `size` 0.9 becomes 1.5.

### C7. The `speed` slider needs a visible `speed` label

Between the play button and the speed range there must be the text `speed`. Skip this if your
panel already shows it.

### C8. Blossoms read as white instead of pale pink

Canopy colour by normalised distance from the canopy centre, one `rng()` call per voxel:
- core (below 0.45): `0xff9fb8` 55 percent, `0xffb7c9` 25 percent, `0xffd3df` 13 percent,
  `0xfff1f5` 7 percent
- middle (0.45 to 0.8): `0xffb7c9` 40 percent, `0xff9fb8` 25 percent, `0xffd3df` 25 percent,
  `0xfff1f5` 10 percent
- outer (0.8 and above): `0xffd3df` 45 percent, `0xffb7c9` 30 percent, `0xfff1f5` 25 percent

### C9. Add two stone lanterns beside the path

Right after the trees are built: for x = -3 and x = 3 at z = 11, skip the lantern if there is
already a voxel at `(x, 1, z)`; otherwise set y = 1 plinth stone `0x8f8f93`, y = 2 plinth stone
`0x7f7f84`, y = 3 a warm lamp voxel `0xffe7a3`, y = 4 a dark cap `0x4a4a50`. The scattered
stepping stones must not land under a lantern.
