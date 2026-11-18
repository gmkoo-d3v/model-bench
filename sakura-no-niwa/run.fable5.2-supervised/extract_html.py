"""Cut the HTML document out of a model answer and save it byte-for-byte.

usage: extract_html.py <content.txt> <target.html>
Takes the span from the first `<!DOCTYPE html` to the last `</html>`. Nothing inside is changed.
Refuses to write when the answer is BLOCKED, has no document, or holds more than one document.
"""
import pathlib
import re
import sys

text = pathlib.Path(sys.argv[1]).read_text(encoding="utf-8")
target = pathlib.Path(sys.argv[2])

starts = [m.start() for m in re.finditer(r"<!DOCTYPE html", text, re.I)]
end = text.rfind("</html>")

if not starts or end < 0:
    head = text.strip()[:300].replace("\n", " ")
    print("NO_DOCUMENT: answer has no complete <!DOCTYPE html> .. </html> span")
    print("answer starts with:", repr(head))
    sys.exit(2)
if len(starts) > 1:
    print("MULTIPLE_DOCUMENTS:", len(starts), "doctype markers at", starts)
    sys.exit(3)

start = starts[0]
html = text[start : end + len("</html>")] + "\n"
before = text[:start]
after = text[end + len("</html>") :]
target.write_text(html, encoding="utf-8")

print("saved:", target)
print("chars:", len(html), "| bytes:", len(html.encode("utf-8")), "| lines:", html.count("\n"))
print("text before document:", repr(before[-120:]))
print("text after document:", repr(after[:120]))
print("fences inside document:", html.count("```"))
