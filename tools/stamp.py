#!/usr/bin/env python3
"""배포 스탬프: assets/version.json, index.html __V, css/js ?v= 일괄 갱신 (멱등)."""
import re, sys, time, json, pathlib
root = pathlib.Path(__file__).resolve().parent.parent
V = sys.argv[1] if len(sys.argv) > 1 else str(int(time.time()))
(root / 'assets').mkdir(exist_ok=True)
(root / 'assets/version.json').write_text(json.dumps({'v': int(V)}) + '\n')
h = root / 'index.html'; s = h.read_text()
s = re.sub(r'<script>window\.__V=\d+;</script>\n?', '', s)
s = s.replace('</head>', f'<script>window.__V={V};</script>\n</head>')
s = re.sub(r'(href="css/main\.css|src="js/main\.js)(\?v=\d+)?"', rf'\1?v={V}"', s)
h.write_text(s)
for f in (root / 'js').glob('*.js'):
    t = f.read_text()
    t = re.sub(r"(from '\./[\w.]+\.js)(\?v=\d+)?'", rf"\1?v={V}'", t)
    f.write_text(t)
print('stamped', V)
