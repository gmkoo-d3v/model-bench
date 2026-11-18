#!/bin/bash
# Supervisor-side static checks for one candidate HTML file.
# usage: static_check.sh <candidate.html> <work-dir>
# 1. the SPEC.md verification command, taken literally from SPEC.md, run against a copy named index.html
# 2. node --check on the module script
# 3. pattern counts for the known failure modes
set -u
cand="$1"; work="$2"
spec=/Users/gm/project/test/sakura-no-niwa/SPEC.md
rm -rf "$work"; mkdir -p "$work"
cp "$cand" "$work/index.html"
cmp -s "$cand" "$work/index.html" && echo "copy for verification: byte-identical to $(basename "$cand")"

echo "=== 1. SPEC.md verification command (literal) ==="
cmd="$(grep -m1 '^node -e' "$spec")"
echo "\$ $cmd"
( cd "$work" && bash -c "$cmd" ) 2>&1 | tail -n 5
echo "[exit=${PIPESTATUS[0]}]"

echo "=== 2. module script syntax (node --check) ==="
python3 - "$cand" "$work" <<'PY'
import re, sys, pathlib
html = pathlib.Path(sys.argv[1]).read_text(encoding="utf-8")
work = pathlib.Path(sys.argv[2])
mods = re.findall(r'<script\b[^>]*type=["\']module["\'][^>]*>(.*?)</script>', html, re.S | re.I)
maps = re.findall(r'<script\b[^>]*type=["\']importmap["\'][^>]*>(.*?)</script>', html, re.S | re.I)
print("module scripts:", len(mods), "| importmaps:", len(maps))
for i, m in enumerate(mods):
    (work / f"module{i}.mjs").write_text(m, encoding="utf-8")
    print(f"module{i}.mjs lines:", m.count("\n") + 1, "chars:", len(m))
for m in maps:
    print("importmap:", " ".join(m.split()))
PY
for f in "$work"/module*.mjs; do
  [ -f "$f" ] || continue
  if node --check "$f" 2>"$f.err"; then echo "$(basename "$f"): SYNTAX OK"; else echo "$(basename "$f"): SYNTAX ERROR"; head -n 12 "$f.err"; fi
done

echo "=== 3. pattern counts ==="
c() { printf '%-34s %s\n' "$1" "$(grep -c -E "$2" "$cand")"; }
echo "total lines: $(wc -l < "$cand")   bytes: $(wc -c < "$cand")"
c "InstancedMesh"                 'InstancedMesh'
c "new THREE.Mesh( (per-voxel?)"  'new THREE\.Mesh\('
c "vertexColors"                  'vertexColors'
c "Math.random"                   'Math\.random'
c "mulberry32"                    'mulberry32'
c "performance.now"               'performance\.now'
c "frustumCulled"                 'frustumCulled'
c "setColorAt"                    'setColorAt'
c "castShadow"                    'castShadow'
c "TODO/FIXME"                    'TODO|FIXME'
c "line ends with three dots"     '\.\.\. *$'
echo "--- vertexColors lines ---"; grep -n 'vertexColors' "$cand" | cut -c1-160
echo "--- Math.random lines ---"; grep -n 'Math\.random' "$cand" | cut -c1-160
echo "--- file tail ---"; tail -n 4 "$cand" | cut -c1-160
