const fs = require('fs');
const src = fs.readFileSync(process.argv[2], 'utf8');
const a = src.indexOf('//#region world'), b = src.indexOf('//#endregion world');
const api = new Function(src.slice(a, b).replace('//@@NEXT@@', '') + '\nreturn { generateWorld, solveView, mulberry32, T };')();
const names = { 1: 'terrain', 2: 'path', 3: 'pagoda', 4: 'torii', 5: 'bridge', 6: 'prop', 7: 'plant', 8: 'islet', 10: 'glow' };
const tot = {};
const seeds = (process.argv[3] || '20261118,7,99,12345,777777').split(',').map(Number);
for (const seed of seeds) {
  const W = api.generateWorld(seed, 16000);
  const c = {};
  for (let i = 0; i < W.solid.n; i++) {
    const t = W.tagAt(W.solid.pos[i * 3], W.solid.pos[i * 3 + 1], W.solid.pos[i * 3 + 2]);
    const k = t >= 16 ? 'tree' : names[t] || t;
    c[k] = (c[k] || 0) + 1;
  }
  let top = 0, under = 0;
  for (let i = 0; i < W.solid.n; i++) { const x = W.solid.pos[i*3], y = W.solid.pos[i*3+1], z = W.solid.pos[i*3+2]; if (W.tagAt(x,y,z) === 1) { if (y >= -1) top++; else under++; } }
  c.terrainTop = top; c.terrainUnder = under; c.water = W.water.n; c.cloud = W.cloud.n; c.TOTAL = W.count;
  c.trees = W.trees.map(t => t.r.toFixed(1)).join('/');
  console.log(seed, JSON.stringify(c));
}
