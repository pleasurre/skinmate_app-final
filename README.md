# Skinmate

Recovered 15-screen Figma implementation; vanilla HTML/CSS/JavaScript, no build step.

## Run

`python -m http.server 5173` from this directory. Open http://localhost:5173.
Target viewport: 430 × 932. The original 402px canvas scales proportionally.

## Data and storage

`data/catalog.js` and `data/relations.js` preserve the existing portfolio fixtures.
`services/recommendations.js` computes treatment-specific review aggregates.
`services/design-state.js` maps the recovered design to stable concern, hospital and offer IDs.
`connected-ui.js` binds Home, search, details, reviews, saved items and comparison.
Clinic names in the Figma screens are display aliases for synthetic fixture hospital IDs.
These fixtures are not live medical data, real prices or patient outcomes.

New state uses `skinmate-design-v3`. Legacy `skinmate-v2` is preserved byte-for-byte
and copied once to `skinmate-recovery-v2-backup`. Unmatched saved labels are retained.
Onboarding drafts do not replace the active recommendation until completion.

## Verification

`node tests/recovery-data.cjs`
`node tests/recovery-browser.cjs` (requires Playwright and an installed Chromium)
Optional test environment: `CHROMIUM_EXECUTABLE_PATH`, `BROWSER_NO_GPU=1`, `BASE_URL`.
Browser tests cover all 15 screens, 430×932/390×844, image/font loading, onboarding,
Home data relationships, exact search targets, bookmarks, comparisons, deletion,
reload persistence and review creation. No runtime browser errors were observed.

## Release state

Work is preserved on the recovery branch. Production remains on the existing deployment.
Do not publish Figma design-assets until their redistribution rights are confirmed.
Do not change the existing Vercel Git link without the requested separate approval.
See docs/recovery.md for the handoff and exact next actions.
