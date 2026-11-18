import json, pathlib, sys
root = pathlib.Path('/Users/gm/project/test/sakura-no-niwa')
here = pathlib.Path(sys.argv[1])
prompt = (root / 'prompt.txt').read_text(encoding='utf-8').strip()
spec = (root / 'SPEC.md').read_text(encoding='utf-8')
brief = (here / 'brief.md').read_text(encoding='utf-8')
system = ("You are an expert Three.js r160 engineer acting as the implementer for a supervising senior "
          "engineer. You write complete, runnable, carefully self-reviewed code. You follow the supervisor's "
          "design decisions exactly and you output exactly what the output contract asks for, nothing more.")
user = ("# TASK (original instruction, verbatim from prompt.txt)\n\n" + prompt + "\n\n"
        "# SPEC.md (verbatim)\n\n<SPEC.md>\n" + spec.rstrip() + "\n</SPEC.md>\n\n" + brief)
req = {"model": "localllm",
       "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}],
       "max_tokens": 160000, "reasoning_effort": "max",
       "stream": True, "stream_options": {"include_usage": True}}
(here / 'r1.request.json').write_text(json.dumps(req, ensure_ascii=False), encoding='utf-8')
print('request bytes:', (here / 'r1.request.json').stat().st_size, '| user chars:', len(user), '| brief lines:', brief.count('\n'))
