"""Assemble a streamed chat-completion (SSE) into content / reasoning / meta files.

usage: parse_sse.py <stream.sse> <out-prefix>
Mechanical only: concatenates deltas in order, never edits them.
"""
import json
import pathlib
import sys

src = pathlib.Path(sys.argv[1])
prefix = sys.argv[2]

content, reasoning = [], []
finish = None
usage = None
model = None
extra = {}
events = bad = 0
done = False

for line in src.read_text(encoding="utf-8", errors="replace").splitlines():
    if not line.startswith("data:"):
        continue
    payload = line[5:].strip()
    if payload == "[DONE]":
        done = True
        continue
    try:
        d = json.loads(payload)
    except Exception:
        bad += 1
        continue
    events += 1
    model = d.get("model", model)
    if d.get("usage"):
        usage = d["usage"]
    for k in ("tensorfold", "speculative", "error"):
        if k in d:
            extra[k] = d[k]
    for ch in d.get("choices", []):
        delta = ch.get("delta", {}) or {}
        if delta.get("content"):
            content.append(delta["content"])
        if delta.get("reasoning_content"):
            reasoning.append(delta["reasoning_content"])
        if ch.get("finish_reason"):
            finish = ch["finish_reason"]

c = "".join(content)
r = "".join(reasoning)
pathlib.Path(prefix + ".content.txt").write_text(c, encoding="utf-8")
pathlib.Path(prefix + ".reasoning.txt").write_text(r, encoding="utf-8")
meta = {
    "model": model,
    "finish_reason": finish,
    "done_marker": done,
    "events": events,
    "bad_events": bad,
    "content_chars": len(c),
    "content_lines": c.count("\n") + (1 if c else 0),
    "reasoning_chars": len(r),
    "usage": usage,
    "extra": extra,
}
pathlib.Path(prefix + ".meta.json").write_text(json.dumps(meta, indent=2, ensure_ascii=False), encoding="utf-8")
print(json.dumps(meta, indent=2, ensure_ascii=False))
