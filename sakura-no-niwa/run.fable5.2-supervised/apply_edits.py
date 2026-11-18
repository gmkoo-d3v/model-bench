"""Apply the model's FIND/REPLACE edits to a file, mechanically.

usage: apply_edits.py <original.html> <model-answer.txt> <output.html>
Every FIND must occur exactly once in the original and FIND spans must not overlap.
If any edit fails nothing is written and the failures are listed (exit 2).
"""
import pathlib
import re
import sys

orig = pathlib.Path(sys.argv[1]).read_text(encoding="utf-8")
answer = pathlib.Path(sys.argv[2]).read_text(encoding="utf-8")
out = pathlib.Path(sys.argv[3])

pat = re.compile(
    r"(?:^###\s*EDIT[^\n]*\n)?^<<<<<<< FIND\n(.*?)\n=======\n(.*?)^>>>>>>> REPLACE",
    re.S | re.M,
)
titles = re.findall(r"^###\s*EDIT[^\n]*", answer, re.M)
blocks = pat.findall(answer)
print("edit titles:", len(titles), "| edit blocks parsed:", len(blocks))

spans = []
fails = []
for i, (find, repl) in enumerate(blocks, 1):
    if repl.endswith("\n"):
        repl = repl[:-1]
    n = orig.count(find)
    title = titles[i - 1] if i - 1 < len(titles) else "(no title)"
    if n != 1:
        fails.append((i, title, "FIND occurs %d times" % n, find[:160]))
        continue
    a = orig.index(find)
    spans.append((a, a + len(find), repl, i, title))

spans.sort()
for (a1, b1, _, i1, _), (a2, b2, _, i2, _) in zip(spans, spans[1:]):
    if a2 < b1:
        fails.append((i2, "", "overlaps edit %d" % i1, ""))

for i, title, why, head in fails:
    print("FAIL edit %d %s: %s" % (i, title, why))
    if head:
        print("   FIND starts:", repr(head))

if fails or not blocks:
    print("NOTHING WRITTEN")
    sys.exit(2)

res = orig
for a, b, repl, i, title in sorted(spans, reverse=True):
    res = res[:a] + repl + res[b:]
out.write_text(res, encoding="utf-8")

for a, b, repl, i, title in spans:
    line = orig.count("\n", 0, a) + 1
    print("ok  edit %2d at line %4d  (-%d +%d lines)  %s" % (i, line, orig[a:b].count("\n") + 1, repl.count("\n") + 1, title))
print("written:", out, "| lines:", res.count("\n"), "| chars:", len(res), "| was:", len(orig))
