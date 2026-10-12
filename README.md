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

Product generated input: `products/data/products.json`. Product styles: `products/assets/css/products.css`. Original product research/photos: `research/products/`; display images and downloads: `products/media/` and `products/research/products/`.

```
node tools/build-catalogue.mjs
node tools/build-products.mjs
python3 -m http.server 8000
```

When original product research changes, run `python3 tools/derive-products.py` before the product build. Its output now stays in `products/`, so neither product build overwrites the catalogue landing pages.

Generated HTML is committed. Edit data/templates rather than generated pages. No runtime framework is needed.

## Publication

`.github/workflows/deploy-pages.yml` deploys **main only**. The old product-copy workflow is retired; do not publish from the former competing branches. There is no longer a cross-branch product sync to race with Pages.

## Branches and pull requests

- `main`: active, combined site and builds.
- `source-material`: original client material; preserve it.
- `Behkooshan`, `Behkooshan-catalogue`, `Behkooshan-products`: historical designs/source branches. Do not edit or deploy from them. Keep until history/material retention is confirmed.
- `fix/catalogue-layout-20261012`, `fix/products-audit-layout-20261012`: completed changes, safe to remove after deployment verification.

PR #3 consolidated the current catalogue into main. PRs #2 and #4 were already merged. PR #1 was closed, not merged, because its earlier scaffold is obsolete.

## Verification and provenance

- `docs/UI-2026-10-12.md`: compact controls and Persian text layout.
- `research/products/AUDIT-2026-10-12.md` and `.csv`: 99 distinct official products, source conflicts and image/download verification limits.
- `docs/BRANCHES.md`: final branch/deployment plan.

Persian prose uses natural RTL/start alignment to avoid stretched letters or inter-word gaps. Desktop controls are 32 px; coarse-pointer touch controls retain 44 px.
