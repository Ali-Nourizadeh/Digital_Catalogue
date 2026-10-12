#!/usr/bin/env python3
"""Build and audit a static IT handoff; Python 3 only, no external libraries."""
import argparse, hashlib, json, re, shutil, subprocess, zipfile
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit
ROOT = Path(__file__).resolve().parents[1]
p = argparse.ArgumentParser()
p.add_argument('--output', type=Path, default=ROOT.parent / 'catalogue-handoff')
a = p.parse_args()
out = a.output.resolve()
if out == ROOT or ROOT in out.parents or out in ROOT.parents:
    raise SystemExit('Output must be outside the repository.')
if out.exists():
    raise SystemExit('Output already exists; choose a fresh directory.')
site = out / 'site'
site.mkdir(parents=True)
# Only the active routes and assets; exclude obsolete root-level product copies.
for directory in ['assets', 'media', 'products']:
    shutil.copytree(ROOT / directory, site / directory,
        ignore=shutil.ignore_patterns('data', 'README.md', 'LICENSE', '__pycache__'))
for name in ['index.html', 'en/index.html', 'wide/index.html', 'wide/en/index.html', '.nojekyll']:
    dest = site / name
    dest.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(ROOT / name, dest)
class Links(HTMLParser):
    def __init__(self):
        super().__init__(); self.links = []
    def handle_starttag(self, tag, attrs):
        for key, val in attrs:
            if not val: continue
            if key in ['src', 'href', 'poster']: self.links.append(val)
            elif key == 'srcset': self.links.extend(part.strip().split()[0] for part in val.split(',') if part.strip())
def check_link(file, value):
    url = urlsplit(value)
    if url.scheme or url.netloc or not url.path: return
    target = site / unquote(url.path).lstrip('/') if url.path.startswith('/') else file.parent / unquote(url.path)
    target = target.resolve()
    if target.is_dir(): target = target / 'index.html'
    if not target.is_file(): broken.append({'file': str(file.relative_to(site)), 'target': value})
broken = []
html_count = 0
for file in site.rglob('*'):
    if file.suffix == '.html':
        html_count += 1
        parser = Links(); parser.feed(file.read_text())
        for link in parser.links: check_link(file, link)
    elif file.suffix == '.css':
        for link in re.findall(r'url\(\s*[\'"]?([^\'"\)\s]+)', file.read_text()): check_link(file, link)
# Current listing routes must all contain exactly 99 stone tiles.
counts = {}
for route in ['products/index.html', 'products/en/index.html', 'products/wide/index.html', 'products/wide/en/index.html']:
    counts[route] = len(re.findall(r'<li\b[^>]*\bclass="stone(?:\s|\")', (site / route).read_text()))
if broken or set(counts.values()) != {99}:
    print(json.dumps({'broken': broken[:30], 'counts': counts}, ensure_ascii=False, indent=2))
    raise SystemExit('Release audit failed; do not deploy.')
revision = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip()
dirty = bool(subprocess.check_output(['git', 'status', '--porcelain'], cwd=ROOT, text=True).strip())
manifest = {'created_utc': datetime.now(timezone.utc).isoformat(), 'source_revision': revision,
    'working_tree_modified': dirty, 'html_pages': html_count, 'listing_counts': counts,
    'local_link_errors': 0, 'files': {str(f.relative_to(site)): hashlib.sha256(f.read_bytes()).hexdigest() for f in sorted(site.rglob('*')) if f.is_file()}}
(out / 'release-manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
shutil.copytree(ROOT / 'deploy', out / 'deploy')
shutil.copy2(ROOT / 'docs/IT-HANDOFF.fa.md', out / 'IT-HANDOFF.fa.md')
shutil.copy2(ROOT / 'LICENSE', out / 'LICENSE')
# Separate source archive: IT publishes site/, never this archive or raw research.
tracked = subprocess.check_output(['git', 'ls-files', '-z'], cwd=ROOT).decode().split('\0')
# Include newly added handoff/build/test files before first commit as well.
tracked += [str(f.relative_to(ROOT)) for base in ['deploy', 'tests'] for f in (ROOT / base).rglob('*') if f.is_file()]
tracked += ['tools/package-release.py', 'docs/IT-HANDOFF.fa.md']
source_zip = out / 'source.zip'
with zipfile.ZipFile(source_zip, 'w', zipfile.ZIP_DEFLATED) as z:
    for name in sorted(set(tracked)):
        if name and (ROOT / name).is_file(): z.write(ROOT / name, 'Digital_Catalogue/' + name)
with zipfile.ZipFile(out.with_suffix('.zip'), 'w', zipfile.ZIP_DEFLATED) as z:
    for file in sorted(out.rglob('*')):
        if file.is_file() and file != source_zip: z.write(file, str(file.relative_to(out)))
for file in [out.with_suffix('.zip'), source_zip]:
    file.with_suffix(file.suffix + '.sha256').write_text(hashlib.sha256(file.read_bytes()).hexdigest() + '  ' + file.name + '\n')
print(json.dumps({'runtime_zip': str(out.with_suffix('.zip')), 'source_zip': str(source_zip), 'html_pages': html_count,
    'local_link_errors': 0, 'counts': counts, 'runtime_mb': round(out.with_suffix('.zip').stat().st_size / 1048576, 1)}, ensure_ascii=False))
