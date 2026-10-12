# Repository consolidation — 2026-10-12

## Canonical structure

main owns the complete site, data and build scripts. Catalogue landing pages remain at the root. All current product listing/detail variants live under products/. Both product build scripts target products/, never the root catalogue pages.

Deployment transition is pending Workflows write permission. Content/builds are consolidated on main; the live site currently still publishes from Behkooshan-catalogue with the updated CSS. The planned main-only deploy-pages.yml and retired publish.yml are prepared but were not committed because workflow edits returned 403. Do not delete the previous publishing branches until this transition is verified.

## Completed PRs

- #2 and #4: product content and verified product layout/audit, already merged by the owner.
- #3: current catalogue consolidated with main; original landing pages restored after resolving add/add conflicts without discarding either file tree.
- #1: obsolete scaffold closed without merging, to avoid overriding the printed-catalogue design.

## Branch retention

Keep main and source-material. The original Behkooshan design branch and the old catalogue/product source branches retain historical context and should be archived/removed only after deployment and material retention checks. The two fix branches can be removed once the deployed version is verified. GitHub branch deletion is not exposed by the current connected toolset; do not claim deletion until it is performed.
