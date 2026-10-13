# Behkooshan Digital Catalogue

**main is the canonical branch.** The repository hosts one integrated bilingual site:

- `/` — printed digital catalogue, Persian
- `/en/` — printed catalogue, English
- `/wide/` and `/wide/en/` — horizontal readings
- `/products/` — searchable products, Persian
- `/products/en/`, `/products/wide/`, `/products/wide/en/` — other product readings

Live site: https://ali-nourizadeh.github.io/Digital_Catalogue/

## Editing and building

Catalogue copy: `data/catalogue.json`. Shared catalogue styles: `assets/css/catalogue.css`.

Product media/layout input: `products/data/products.json`. Current official facts and per-field provenance: `products/data/official-source.json` (see `docs/OFFICIAL-SOURCE-SYNC.fa.md` for coverage limits). Product styles: `products/assets/css/products.css`. Original product research/photos: `research/products/`; display images and downloads: `products/media/` and `products/research/products/`.

```
node tools/build-catalogue.mjs
node tools/build-products.mjs
python3 -m http.server 8000
```

When original product research changes, run `python3 tools/derive-products.py` before the product build. Its output now stays in `products/`, so neither product build overwrites the catalogue landing pages.

Generated HTML is committed. Edit data/templates rather than generated pages. No runtime framework is needed.

## Company handoff: release

From a clean, committed checkout, build and package the current version:

```
node tools/build-catalogue.mjs
node tools/build-products.mjs
python3 tools/package-release.py --output ../release
```

The output is `release.zip`, containing one `release/` folder with `site/`, server examples, a simple Persian `README.md`, version manifest and checksums. No source archive, raw build data or build tools are bundled. Only `release/site/` is the web document root. The source and handoff documents must stay outside it. Use a fresh output parent if a previous `release.zip` exists. See `deploy/README.release.fa.md` for the delivered README and its font-license warning.

## Publication

**Migration status:** site content and both builds are consolidated on main, but changing GitHub workflow files was denied by the current token. Pages currently still deploys from Behkooshan-catalogue, and its published CSS has been updated and verified. Workflows write permission is needed to switch deploy-pages.yml to main and retire the product-copy workflow. Do not delete those historical source branches until this transition succeeds.

## Branches and pull requests

- `main`: active, combined site and builds.
- `source-material`: original client material; preserve it.
- `Behkooshan`, `Behkooshan-catalogue`, `Behkooshan-products`: historical designs/source branches. Keep as compatibility branches while Pages still uses the catalogue branch; mirror release fixes until workflow migration is authorized. Keep until history/material retention is confirmed.
- `fix/catalogue-layout-20261012`, `fix/products-audit-layout-20261012`: completed changes, safe to remove after deployment verification.

PR #3 consolidated the current catalogue into main. PRs #2 and #4 were already merged. PR #1 was closed, not merged, because its earlier scaffold is obsolete.

## Verification and provenance

- `docs/UI-2026-10-12.md`: compact controls and Persian text layout.
- `research/products/AUDIT-2026-10-12.md` and `.csv`: 99 distinct official products, source conflicts and image/download verification limits.
- `docs/BRANCHES.md`: final branch/deployment plan.

Persian prose uses font-measured, bounded two-sided paragraph composition with zero letter tracking and no kashida/glyph stretching. The final line ranges right. Desktop and touch control faces are 32 px; touch hit targets retain 44 px. Current source differences and listing exclusions are documented in docs/SITE-DIFFERENCES.fa.md.


## Completed official product specification reconciliation

All 98 Persian and 97 English product records have current visible-page Type/Origin verification (2026-10-12). Breadcrumb categories fill only genuinely absent API membership; no origin/photo inference. Evidence hashes and source URLs are in `products/data/official-source.json`; field-level changes and scope limits are in `docs/OFFICIAL-SOURCE-SYNC.fa.md` and `docs/PRODUCT-RECONCILIATION-2026-10-12.csv`.

Catalogue display policy: both languages and orientations show the same verified union of 99 stones. Official per-language inventories remain FA98/EN97 in provenance data; no public source-note labels are displayed.
