// Headless sweep of the pure "world" region of fable-5.2-max.html.
// usage: node sweep.js <html> [nSeeds] [firstSeed]
const fs = require('fs');
const src = fs.readFileSync(process.argv[2], 'utf8');
const a = src.indexOf('//#region world'), b = src.indexOf('//#endregion world');
if (a < 0 || b < 0) throw new Error('world region markers not found');
const code = src.slice(a, b).replace('//@@NEXT@@', '');
const api = new Function(code + '\nreturn { generateWorld, solveView, mulberry32, T };')();
const N = +(process.argv[3] || 200), first = +(process.argv[4] || 1);
const rng = api.mulberry32(first);
const stat = {};
const add = (k, v) => { (stat[k] = stat[k] || []).push(v); };
const bad = [];
let t0 = Date.now();
for (let i = 0; i < N; i++) {
  const seed = i === 0 ? first : (rng() * 4294967296) >>> 0;
  let W;
  try { W = api.generateWorld(seed, 16000); } catch (e) { bad.push(`seed ${seed}: THROW ${e.stack.split('\n').slice(0, 3).join(' | ')}`); continue; }
  add('count', W.count); add('solid', W.solid.n); add('glow', W.glow.n); add('water', W.water.n); add('cloud', W.cloud.n);
  add('main', W.count - W.cloud.n);
  add('trees', W.trees.length); add('koi', W.koi.length); add('falls', W.falls.length); add('pondCells', W.pond.cells.length);
  add('minY', W.minY); add('lanterns', W.lanterns.length); add('islets', W.islets.length); add('pads', W.pads.length);
  add('bridgeLen', W.bridge ? W.bridge.b - W.bridge.a + 1 : 0);
  if (W.trees.length !== 5) bad.push(`seed ${seed}: trees=${W.trees.length}`);
  if (W.koi.length < 2 || W.koi.length > 3) bad.push(`seed ${seed}: koi=${W.koi.length}`);
  if (!W.bridge) bad.push(`seed ${seed}: no bridge`);
  if (W.falls.length < 1) bad.push(`seed ${seed}: no waterfall`);
  if (Math.abs(W.count - 16000) > 400) bad.push(`seed ${seed}: count=${W.count} (main ${W.count - W.cloud.n})`);
  for (const k of W.koi) { let mn = 1e9; for (let j = 0; j < k.pts.length; j += 2) mn = Math.min(mn, 0); add('koiPts', k.pts.length / 2); }
  for (const asp of [1.6, 1.0]) for (let v = 0; v < 5; v++) {
    let r;
    try { r = api.solveView(W, v, asp, asp > 1 ? 0.74 : 0.86, 0.86, 40); } catch (e) { bad.push(`seed ${seed}: view ${v} THROW ${e.message}`); continue; }
    const dist = Math.hypot(r.pos[0] - r.target[0], r.pos[1] - r.target[1], r.pos[2] - r.target[2]);
    add(`v${v}@${asp}.vis`, r.vis); add(`v${v}@${asp}.dist`, dist);
    if (r.score < 0) bad.push(`seed ${seed}: view ${v}@${asp} fell back (no roomy candidate)`);
    else if (v > 0 && r.vis < 0.6) bad.push(`seed ${seed}: view ${v}@${asp} vis=${r.vis.toFixed(2)}`);
    // camera must sit in free space
    for (let dx = -2; dx <= 2; dx++) for (let dy = -2; dy <= 2; dy++) for (let dz = -2; dz <= 2; dz++) {
      const t = W.tagAt(Math.round(r.pos[0]) + dx, Math.round(r.pos[1]) + dy, Math.round(r.pos[2]) + dz);
      if (t !== 0 && t !== api.T.WATER) { bad.push(`seed ${seed}: view ${v}@${asp} camera touches voxels`); dx = dy = dz = 9; }
    }
  }
}
const ms = (Date.now() - t0) / N;
const fmt = v => (Number.isInteger(v) ? v : v.toFixed(2));
for (const k of Object.keys(stat)) {
  const s = stat[k].slice().sort((x, y) => x - y), mean = s.reduce((p, q) => p + q, 0) / s.length;
  console.log(k.padEnd(14), 'min', String(fmt(s[0])).padStart(8), ' p10', String(fmt(s[Math.floor(s.length * 0.1)])).padStart(8), ' mean', String(fmt(mean)).padStart(9), ' max', String(fmt(s[s.length - 1])).padStart(8));
}
console.log(`\n${N} seeds, ${ms.toFixed(1)} ms/seed (generate + 10 view solves)`);
console.log(bad.length ? `PROBLEMS (${bad.length}):\n` + bad.slice(0, 40).join('\n') : 'NO PROBLEMS');
