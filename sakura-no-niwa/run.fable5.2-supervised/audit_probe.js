// audit_probe.js: runtime probe for the spec-clause audit of the Sakura entries (2026-11-18).
// The static preview server serves this file. From an entry's page, in the console:
//   (await import('/run.fable5.2-supervised/audit_probe.js')).audit()
// It hooks the page's own three.js module (same CDN URL, so the same module instance), grabs the
// renderer / scene / camera from the next rendered frame, and measures what SPEC.md states.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

// Waiting. On a normal page this is a timer. Under harness.html (window.__pump exists) it pumps the
// page's queued animation frames about every 16 ms while it waits, yielding through a MessageChannel
// so it keeps running at full rate even when the Browser pane is hidden and timers are throttled.
const yieldTask = () => new Promise(r => { const c = new MessageChannel(); c.port1.onmessage = () => r(); c.port2.postMessage(0); });
async function sleep(ms) {
  if (typeof window.__pump !== 'function') return new Promise(r => setTimeout(r, ms));
  const end = performance.now() + ms;
  let next = 0;
  while (performance.now() < end) {
    const now = performance.now();
    if (now >= next) { window.__pump(now); next = now + 15; }
    await yieldTask();
  }
}
const txt = e => ((e && e.textContent) || '').replace(/\s+/g, ' ').trim();
const hex = c => (c && c.isColor ? '#' + c.getHexString() : null);
const r2 = v => Math.round(v * 100) / 100;

async function capture() {
  if (window.__audit && window.__audit.scene) return window.__audit;
  const proto = THREE.Object3D.prototype;
  const orig = proto.onBeforeRender;
  const got = {};
  proto.onBeforeRender = function (renderer, scene, camera) {
    if (!got.scene && scene && scene.isScene) { got.renderer = renderer; got.scene = scene; got.camera = camera; }
  };
  for (let i = 0; i < 80 && !got.scene; i++) await sleep(100);
  proto.onBeforeRender = orig;
  window.__audit = got;
  return got;
}

function collect(scene) {
  const inst = [], pts = [], lights = [], plain = [];
  scene.traverse(o => {
    if (o.isInstancedMesh) inst.push(o);
    else if (o.isPoints) pts.push(o);
    else if (o.isLight) lights.push(o);
    else if (o.isMesh) plain.push(o);
  });
  inst.sort((a, b) => b.count - a.count);
  return { inst, pts, lights, plain };
}

function instStats(m) {
  const a = m.instanceMatrix.array, n = m.count;
  let unit = 0, non = 0, rot = 0, hidden = 0, onGrid = 0, tiny = 0, minY = 1e9, maxY = -1e9, maxR = 0;
  const sizes = new Map();
  const lattice = v => Math.abs(v * 2 - Math.round(v * 2)) < 1e-3;
  for (let i = 0; i < n; i++) {
    const o = i * 16;
    const sx = Math.hypot(a[o], a[o + 1], a[o + 2]);
    const sy = Math.hypot(a[o + 4], a[o + 5], a[o + 6]);
    const sz = Math.hypot(a[o + 8], a[o + 9], a[o + 10]);
    if (sx < 1e-6 && sy < 1e-6 && sz < 1e-6) { hidden++; continue; }
    const isUnit = Math.abs(sx - 1) < 1e-3 && Math.abs(sy - 1) < 1e-3 && Math.abs(sz - 1) < 1e-3;
    const rotated = Math.abs(a[o + 1]) > 1e-3 || Math.abs(a[o + 2]) > 1e-3 || Math.abs(a[o + 4]) > 1e-3 ||
      Math.abs(a[o + 6]) > 1e-3 || Math.abs(a[o + 8]) > 1e-3 || Math.abs(a[o + 9]) > 1e-3;
    if (isUnit && !rotated) unit++; else non++;
    if (rotated) rot++;
    if (Math.max(sx, sy, sz) < 0.7) tiny++;
    const x = a[o + 12], y = a[o + 13], z = a[o + 14];
    if (lattice(x) && lattice(y) && lattice(z)) onGrid++;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
    const R = Math.hypot(x, z);
    if (R > maxR) maxR = R;
    if (!(isUnit && !rotated)) {
      const k = sx.toFixed(2) + 'x' + sy.toFixed(2) + 'x' + sz.toFixed(2);
      sizes.set(k, (sizes.get(k) || 0) + 1);
    }
  }
  const ws = m.getWorldScale(new THREE.Vector3());
  const mat = Array.isArray(m.material) ? m.material[0] : m.material;
  return {
    n, hidden, unit, non, rot, tiny, onGrid, minY: r2(minY), maxY: r2(maxY), maxR: r2(maxR),
    worldScale: [r2(ws.x), r2(ws.y), r2(ws.z)].join(','),
    geo: m.geometry.type + ':' + m.geometry.uuid.slice(0, 4),
    mat: mat.type.replace('Material', ''), vc: !!mat.vertexColors, tr: !!mat.transparent, ic: !!m.instanceColor,
    cast: !!m.castShadow, recv: !!m.receiveShadow,
    top: [...sizes.entries()].sort((p, q) => q[1] - p[1]).slice(0, 3).map(e => e[0] + '×' + e[1]).join(' | ')
  };
}

function checksum(m) {
  let h = 2166136261 >>> 0;
  const a = m.instanceMatrix.array, n = m.count * 16;
  for (let i = 0; i < n; i++) { h ^= Math.round(a[i] * 1000) & 0xffff; h = Math.imul(h, 16777619) >>> 0; }
  if (m.instanceColor) {
    const c = m.instanceColor.array, k = m.count * 3;
    for (let i = 0; i < k; i++) { h ^= Math.round(c[i] * 255) & 0xff; h = Math.imul(h, 16777619) >>> 0; }
  }
  return m.count + ':' + h.toString(16);
}

const snap = m => Float32Array.from(m.instanceMatrix.array.subarray(0, m.count * 16));
function motion(m, before) {
  const a = m.instanceMatrix.array;
  let mv = 0, still = 0, spin = 0;
  const n = Math.min(m.count, before.length / 16);
  for (let i = 0; i < n; i++) {
    const o = i * 16;
    const d = Math.abs(a[o + 12] - before[o + 12]) + Math.abs(a[o + 13] - before[o + 13]) + Math.abs(a[o + 14] - before[o + 14]);
    const s = Math.abs(a[o] - before[o]) + Math.abs(a[o + 1] - before[o + 1]) + Math.abs(a[o + 5] - before[o + 5]) + Math.abs(a[o + 10] - before[o + 10]);
    if (d > 1e-5) mv++; else still++;
    if (s > 1e-5) spin++;
  }
  return { mv, still, spin };
}
async function sampleMotion(inst, ms) {
  const before = inst.map(snap);
  await sleep(ms);
  return inst.map((m, i) => Object.assign({ n: m.count }, motion(m, before[i])));
}

function labelOf(e) {
  const lab = e.closest('label') || (e.id && document.querySelector('label[for="' + CSS.escape(e.id) + '"]'));
  return lab ? txt(lab).slice(0, 40) : '';
}
const checkbox = re => [...document.querySelectorAll('input[type=checkbox]')].find(e => re.test(labelOf(e) + ' ' + e.id)) || null;
const button = re => [...document.querySelectorAll('button')].find(b => re.test(txt(b))) || null;
const timeSlider = () => [...document.querySelectorAll('input[type=range]')].find(e => Number(e.max) === 24) || null;
async function setTime(v) {
  const s = timeSlider();
  if (!s) return false;
  s.value = String(v);
  s.dispatchEvent(new Event('input', { bubbles: true }));
  s.dispatchEvent(new Event('change', { bubbles: true }));
  await sleep(400);
  return true;
}

function ui() {
  const leaf = s => [...document.querySelectorAll('body *')].filter(e => !['SCRIPT', 'STYLE'].includes(e.tagName) && e.children.length === 0 && txt(e).includes(s))[0];
  const rect = e => {
    if (!e) return null;
    const r = e.getBoundingClientRect(), cs = getComputedStyle(e);
    return { l: Math.round(r.left), t: Math.round(r.top), r: Math.round(r.right), fs: Math.round(parseFloat(cs.fontSize)), ls: cs.letterSpacing, pe: cs.pointerEvents };
  };
  const range = document.querySelector('input[type=range]');
  let p = range, panel = null;
  while (p && p !== document.body) {
    const pos = getComputedStyle(p).position;
    if (pos === 'fixed' || pos === 'absolute') panel = p;
    p = p.parentElement;
  }
  const pr = panel ? panel.getBoundingClientRect() : null;
  const flat = document.body.innerText.replace(/\s+/g, ' ');
  const canvas = document.querySelector('canvas');
  return {
    vw: innerWidth, vh: innerHeight,
    panel: pr ? { l: Math.round(pr.left), t: Math.round(pr.top), w: Math.round(pr.width), bg: getComputedStyle(panel).backgroundColor, font: getComputedStyle(panel).fontFamily.slice(0, 40), fs: getComputedStyle(panel).fontSize } : null,
    titleControls: [...document.querySelectorAll('body *')].filter(e => e.children.length <= 1 && /^Controls$/.test(txt(e))).length,
    inputs: [...document.querySelectorAll('input')].map(e => [e.type, e.id, e.min + '..' + e.max, e.type === 'checkbox' ? e.checked : e.value, labelOf(e)].join('|')),
    buttons: [...document.querySelectorAll('button')].map(b => { const r = b.getBoundingClientRect(); return txt(b).slice(0, 24) + '@' + Math.round(r.top); }),
    statusStrict: (flat.match(/voxels:\s*[\d,]+\s+\d{2}:\d{2}\s+fps:\s*\d+/) || [null])[0],
    jp: rect(leaf('桜の庭')), en: rect(leaf('VOXEL PAGODA GARDEN')),
    canvasRatio: canvas ? r2(canvas.width / canvas.clientWidth) : null
  };
}

function lightState(scene, L) {
  const bg = scene.background;
  return {
    bg: bg && bg.isColor ? hex(bg) : (bg ? 'non-color' : null),
    fog: scene.fog ? hex(scene.fog.color) : null,
    lights: L.map(l => [l.type.replace('Light', ''), r2(l.intensity), hex(l.color), l.castShadow ? 'S' : '', l.visible ? '' : 'off'].join(':')).join('  ')
  };
}
function pointsState(P) {
  return P.map(p => {
    const pos = p.geometry.attributes.position;
    const m = p.material, u = {};
    if (m.uniforms) for (const k in m.uniforms) { const v = m.uniforms[k].value; if (typeof v === 'number') u[k] = r2(v); }
    return { n: pos ? pos.count : 0, vis: p.visible, op: typeof m.opacity === 'number' ? r2(m.opacity) : null, u };
  });
}

async function flight(camera, key) {
  const p0 = camera.position.clone(), t0 = performance.now();
  document.body.dispatchEvent(new KeyboardEvent('keydown', { key, code: 'Digit' + key, keyCode: 48 + Number(key), which: 48 + Number(key), bubbles: true }));
  const last = camera.position.clone();
  let lastMove = t0, started = false;
  while (performance.now() - t0 < 6000) {
    await sleep(40);
    if (camera.position.distanceTo(last) > 1e-3) { started = true; lastMove = performance.now(); last.copy(camera.position); }
    else if (started && performance.now() - lastMove > 350) break;
    else if (!started && performance.now() - t0 > 1500) break;
  }
  return { moved: started, ms: started ? Math.round(lastMove - t0) : 0, dist: r2(camera.position.distanceTo(p0)) };
}

async function rafRate(ms) {
  if (typeof window.__pump === 'function') return 'harness';
  let n = 0, run = true;
  const tick = () => { n++; if (run) requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
  await sleep(ms);
  run = false;
  return Math.round(n * 1000 / ms);
}

export async function audit() {
  const out = { file: window.__entry || location.pathname };
  const got = await capture();
  if (!got.scene) { out.error = 'no frame captured: the page uses another three.js module instance, or is not rendering'; return out; }
  const { renderer, scene, camera } = got;
  let C = collect(scene);
  out.raf = await rafRate(1000);
  out.inst = C.inst.map(instStats);
  out.geometries = new Set(C.inst.map(m => m.geometry.uuid)).size;
  out.plain = C.plain.map(m => m.geometry.type + (m.material && m.material.type ? '/' + m.material.type.replace('Material', '') : '')).join(', ');
  out.points = C.pts.map(p => (p.geometry.attributes.position ? p.geometry.attributes.position.count : 0));
  out.sumInst = C.inst.reduce((s, m) => s + m.count, 0);
  out.ui = ui();
  out.renderer = { pr: renderer.getPixelRatio(), shadow: renderer.shadowMap.enabled, calls: renderer.info.render.calls, tris: renderer.info.render.triangles };
  out.fog = scene.fog ? scene.fog.type || (scene.fog.isFogExp2 ? 'FogExp2' : 'Fog') : null;
  out.camera = { fov: camera.fov, near: camera.near, far: camera.far };
  out.checksum0 = checksum(C.inst[0]);

  // what moves by itself (petals, koi, water) over 400 ms
  out.motion = await sampleMotion(C.inst, 400);

  // day/night keys
  const slider = timeSlider();
  const t0 = slider ? slider.value : null;
  out.times = {};
  for (const t of [6.2, 12, 18.2, 21.5]) {
    if (!(await setTime(t))) { out.times.error = 'no 0..24 range input'; break; }
    out.times[t] = Object.assign(lightState(scene, C.lights), { pts: pointsState(C.pts) });
  }
  if (slider && t0 !== null) await setTime(t0);

  // toggles
  const tg = {};
  const wf = checkbox(/wire/i);
  if (wf) { wf.click(); await sleep(250); tg.wireOn = C.inst.map(m => !!(Array.isArray(m.material) ? m.material[0] : m.material).wireframe); wf.click(); await sleep(150); tg.wireOff = C.inst.map(m => !!(Array.isArray(m.material) ? m.material[0] : m.material).wireframe).some(Boolean); }
  const sh = checkbox(/shadow/i);
  if (sh) { const was = sh.checked; if (!was) { sh.click(); await sleep(200); } tg.shadowOn = { map: renderer.shadowMap.enabled, cast: C.lights.filter(l => l.castShadow).length }; sh.click(); await sleep(250); tg.shadowOff = { map: renderer.shadowMap.enabled, cast: C.lights.filter(l => l.castShadow).length }; if (was) { sh.click(); await sleep(150); } }
  const wa = checkbox(/water/i);
  if (wa) { const was = wa.checked; if (!was) { wa.click(); await sleep(200); } tg.waterOn = (await sampleMotion(C.inst, 300)).map(x => x.mv); wa.click(); await sleep(250); tg.waterOff = (await sampleMotion(C.inst, 300)).map(x => x.mv); if (was) { wa.click(); await sleep(150); } }
  const ff = checkbox(/firefl/i);
  if (ff && (await setTime(21.5))) { const was = ff.checked; if (!was) { ff.click(); await sleep(200); } tg.fliesOn = pointsState(C.pts); ff.click(); await sleep(300); tg.fliesOff = pointsState(C.pts); if (was) { ff.click(); await sleep(150); } if (t0 !== null) await setTime(t0); }
  const ar = checkbox(/rotat/i);
  if (ar) { tg.rotDefault = ar.checked; if (ar.checked) { ar.click(); await sleep(300); } const a = camera.position.clone(); await sleep(500); tg.rotOffDrift = r2(camera.position.distanceTo(a)); ar.click(); await sleep(700); tg.rotOnMove = r2(camera.position.distanceTo(a)); ar.click(); await sleep(400); }
  out.toggles = tg;

  // camera flights on number keys
  out.flights = { k2: await flight(camera, '2'), k3: await flight(camera, '3'), k5: await flight(camera, '5'), k1: await flight(camera, '1') };

  // regenerate: the world must change without a reload
  const rg = button(/regenerat/i);
  if (rg) {
    rg.click();
    await sleep(1500);
    C = collect(scene);
    out.regen = { checksum: checksum(C.inst[0]), changed: checksum(C.inst[0]) !== out.checksum0, status: (document.body.innerText.replace(/\s+/g, ' ').match(/voxels:\s*[\d,]+/) || [null])[0] };
  }
  return out;
}

// checksum of the largest instanced mesh only: call right after a reload to test seed determinism
export async function fingerprint() {
  const got = await capture();
  if (!got.scene) return { error: 'no frame captured' };
  const C = collect(got.scene);
  return { file: location.pathname, checksum0: checksum(C.inst[0]), status: (document.body.innerText.replace(/\s+/g, ' ').match(/voxels:\s*[\d,]+/) || [null])[0] };
}
