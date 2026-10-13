#!/usr/bin/env python3
"""Create release.zip: deployable static site and simple deployment docs, without source archive."""
import argparse
import hashlib
import json
import re
import shutil
import subprocess
import zipfile
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--output', type=Path, default=ROOT.parent / 'release')
args = parser.parse_args()
out = args.output.resolve()
archive = out.parent / 'release.zip'
if out == ROOT or ROOT in out.parents or out in ROOT.parents:
    raise SystemExit('Output must be outside the repository.')
if out.exists() or archive.exists():
    raise SystemExit('Output or release.zip already exists; use a fresh parent directory.')
# Use either a clean Git checkout or a verified source archive (which has no .git).
try:
    git_root = subprocess.run(['git', 'rev-parse', '--show-toplevel'], cwd=ROOT,
                              capture_output=True, text=True)
    is_repo = git_root.returncode == 0 and Path(git_root.stdout.strip()).resolve() == ROOT
except FileNotFoundError:
    is_repo = False
if is_repo:
    if subprocess.check_output(['git', 'status', '--porcelain'], cwd=ROOT, text=True).strip():
        raise SystemExit('Commit or resolve local changes before packaging a release.')
    revision = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip()
    tracked = subprocess.check_output(['git', 'ls-files', '-z'], cwd=ROOT).decode().split('\0')
    tracked = [name for name in tracked if name]
else:
    source_manifest = ROOT / 'SOURCE-MANIFEST.json'
    if not source_manifest.is_file():
        raise SystemExit('Use a clean Git checkout or the supplied verified source archive.')
    exported = json.loads(source_manifest.read_text())
    revision = exported['source_revision']
    tracked = list(exported['files'])
    for name, expected in exported['files'].items():
        file = ROOT / name
        if not file.is_file() or hashlib.sha256(file.read_bytes()).hexdigest() != expected:
            raise SystemExit('Source was changed; initialize Git and commit the updated source before packaging.')
site = out / 'site'
site.mkdir(parents=True)
for directory in ['assets', 'media', 'products']:
    shutil.copytree(ROOT / directory, site / directory,
        ignore=shutil.ignore_patterns('data', 'README.md', 'LICENSE', '__pycache__'))
for name in ['index.html', 'en/index.html', 'wide/index.html', 'wide/en/index.html', '.nojekyll']:
    target = site / name
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(ROOT / name, target)

class Links(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links = []
    def handle_starttag(self, tag, attrs):
        for key, value in attrs:
            if not value:
                continue
            if key in ['src', 'href', 'poster']:
                self.links.append(value)
            elif key == 'srcset':
                self.links.extend(item.strip().split()[0] for item in value.split(',') if item.strip())

broken = []
def check_link(file, value):
    url = urlsplit(value)
    if url.scheme or url.netloc or not url.path:
        return
    target = (site / unquote(url.path).lstrip('/') if url.path.startswith('/')
              else file.parent / unquote(url.path)).resolve()
    if site.resolve() not in target.parents and target != site.resolve():
        broken.append({'file': str(file.relative_to(site)), 'target': value, 'error': 'outside site'})
        return
    if target.is_dir():
        target = target / 'index.html'
    if not target.is_file():
        broken.append({'file': str(file.relative_to(site)), 'target': value})

html_pages = 0
for file in site.rglob('*'):
    if file.suffix == '.html':
        html_pages += 1
        links = Links()
        links.feed(file.read_text())
        for link in links.links:
            check_link(file, link)
    elif file.suffix == '.css':
        for link in re.findall(r'url\(\s*[\'"]?([^\'"\)\s]+)', file.read_text()):
            check_link(file, link)
    elif file.suffix == '.js':
        for link in re.findall(r'import\(\s*[\'"]([^\'"]+)[\'"]\s*\)', file.read_text()):
            check_link(file, link)
counts = {}
for route in ['products/index.html', 'products/en/index.html', 'products/wide/index.html', 'products/wide/en/index.html']:
    counts[route] = len(re.findall(r'<li\b[^>]*\bclass="stone(?:\s|\")', (site / route).read_text()))
if broken or set(counts.values()) != {99}:
    print(json.dumps({'broken': broken[:30], 'counts': counts}, ensure_ascii=False, indent=2))
    raise SystemExit('Release audit failed; do not deploy.')

shutil.copytree(ROOT / 'deploy', out / 'deploy',
    ignore=shutil.ignore_patterns('README.release.fa.md'))
shutil.copy2(ROOT / 'deploy/README.release.fa.md', out / 'README.md')
(out / 'docs').mkdir()
shutil.copy2(ROOT / 'docs/IT-HANDOFF.fa.md', out / 'docs/IT-HANDOFF.fa.md')
shutil.copy2(ROOT / 'LICENSE', out / 'LICENSE')
manifest = {'release_name': 'release', 'includes_source_archive': False, 'created_utc': datetime.now(timezone.utc).isoformat(),
    'source_revision': revision, 'working_tree_modified': False,
    'html_pages': html_pages, 'listing_counts': counts, 'local_link_errors': 0,
    'font_license_notice': 'TT Firs Neue is documented as Trial; commercial web licensing must be resolved before public company deployment.',
    'files': {str(f.relative_to(site)): hashlib.sha256(f.read_bytes()).hexdigest()
              for f in sorted(site.rglob('*')) if f.is_file()}}
(out / 'release-manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')

# Hash every delivered file, including the README and server samples.
checksums = ''.join(hashlib.sha256(f.read_bytes()).hexdigest() + '  ' + str(f.relative_to(out)) + '\n'
                    for f in sorted(out.rglob('*')) if f.is_file())
(out / 'SHA256SUMS.txt').write_text(checksums)
# One clearly named folder when unzipped; no source tree or source ZIP is included.
with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED, allowZip64=True) as z:
    for file in sorted(out.rglob('*')):
        if file.is_file():
            z.write(file, 'release/' + str(file.relative_to(out)))
archive.with_suffix('.zip.sha256').write_text(hashlib.sha256(archive.read_bytes()).hexdigest() + '  release.zip\n')
print(json.dumps({'release_zip': str(archive), 'source_revision': revision,
    'html_pages': html_pages, 'local_link_errors': 0, 'listing_counts': counts,
    'size_mb': round(archive.stat().st_size / 1048576, 1)}, ensure_ascii=False))
