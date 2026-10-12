# Repository consolidation — 2026-10-12

## Canonical structure

main owns the complete site, data and build scripts. Catalogue landing pages remain at the root. All current product listing/detail variants live under products/. Both product build scripts target products/, never the root catalogue pages.

Deployment is main-only through deploy-pages.yml. The legacy publish.yml workflow no longer copies between branches. Source branches kept for archive must not be used to publish.

## Completed PRs

- #2 and #4: product content and verified product layout/audit, already merged by the owner.
- #3: current catalogue consolidated with main; original landing pages restored after resolving add/add conflicts without discarding either file tree.
- #1: obsolete scaffold closed without merging, to avoid overriding the printed-catalogue design.

## Branch retention

Keep main and source-material. The original Behkooshan design branch and the old catalogue/product source branches retain historical context and should be archived/removed only after deployment and material retention checks. The two fix branches can be removed once the deployed version is verified. GitHub branch deletion is not exposed by the current connected toolset; do not claim deletion until it is performed.
