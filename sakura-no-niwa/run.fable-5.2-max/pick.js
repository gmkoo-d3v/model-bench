// Rank seeds by how much of the garden the first (overview) view actually shows.
const fs = require('fs');
const src = fs.readFileSync(process.argv[2], 'utf8');
const a = src.indexOf('//#region world'), b = src.indexOf('//#endregion world');
const api = new Function(src.slice(a, b) + '\nreturn { generateWorld, solveView, mulberry32, T };')();
const T = api.T, rng = api.mulberry32(424242), rows = [];
const clear = (W, p, q, ign) => { const dx=q[0]-p[0],dy=q[1]-p[1],dz=q[2]-p[2],n=Math.ceil(Math.hypot(dx,dy,dz)/0.45); for(let i=1;i<n;i++){const t=W.tagAt(Math.round(p[0]+dx*i/n),Math.round(p[1]+dy*i/n),Math.round(p[2]+dz*i/n)); if(t&&t!==T.WATER&&!ign(t)) return 0;} return 1; };
for (let i = 0; i < +(process.argv[3] || 400); i++) {
  const seed = (rng() * 4294967296) >>> 0, W = api.generateWorld(seed, 16000);
  if (W.side < 0) continue;
  const v = api.solveView(W, 0, 1.6, 0.74, 0.9, 40), cam = v.pos;
  let trees = 0; for (const t of W.trees) trees += clear(W, cam, [t.cx, t.cy, t.cz], g => g === t.tag) * 0.5 + clear(W, cam, [t.x, t.base + 1, t.z], g => g === t.tag) * 0.5;
  const h = W.trees[0], hero = clear(W, cam, [h.cx, h.cy, h.cz], g => g === h.tag) + clear(W, cam, [h.x, h.base + 1, h.z], g => g === h.tag);
  let pond = 0; W.pond.cells.forEach(c => { pond += clear(W, cam, [c.x, 0.8, c.z], g => g === T.BRIDGE); }); pond /= W.pond.cells.length;
  const G = W.torii, torii = (clear(W, cam, [G.x, 9, G.z], g => g === T.TORII) + clear(W, cam, [G.x - 3, 3, G.z], g => g === T.TORII) + clear(W, cam, [G.x + 3, 3, G.z], g => g === T.TORII)) / 3;
  const door = clear(W, cam, [0, 4, 7.6], g => g === T.PAGODA || g === T.GLOW);
  const br = W.bridge ? clear(W, cam, [W.bridge.x, W.bridge.top + 1.5, W.bridge.z], g => g === T.BRIDGE) : 0;
  const heroFront = h.z > 0 || Math.abs(h.x) > 12 ? 1 : 0;
  const dist = Math.hypot(cam[0]-v.target[0], cam[1]-v.target[1], cam[2]-v.target[2]);
  const score = trees * 1.2 + hero * 1.5 + pond * 3 + torii * 2 + door + br + heroFront - Math.max(0, dist - 112) * 0.08;
  rows.push({ seed: seed.toString(16).padStart(8, '0'), score: +score.toFixed(2), trees, hero, pond: +pond.toFixed(2), torii: +torii.toFixed(2), door, br, hx: h.x, hz: h.z, tx: G.x, dist: +dist.toFixed(0), count: W.count });
}
rows.sort((p, q) => q.score - p.score);
console.log(rows.slice(0, 8).map(r => JSON.stringify(r)).join('\n'));
