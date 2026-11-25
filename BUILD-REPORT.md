# token-radar-01 — Build Report (PLAN steps 3–6)

Build session: 2026-11-25 (dedicated session, inside the competition window).
Scope: build only — no bundle, no submit, no GitHub repo created. The parent agent
does the final bundle + submit.

## What changed, per file

**lib/config.ts** — two new stated constants: `winsorShare: 0.05` (peer ratios are
winsorized before the median) and `capOverflowSlope: 0.05` (share of excess that
counts past the sanity cap). `peerMaxCapMultiple: 2` unchanged.

**lib/model.ts** — model v1 as PLAN specifies:
- Winsorized median for every peer multiple (5% each tail pulled in), so one absurd
  listing (e.g. a live peer at 36× TVL) cannot drag a category's price.
- Fallback chain completed: category median (≥4 live peers) → **chain-blended** median
  of live protocols sharing a chain with the protocol → global median. Every row
  records which source priced it (`multiple_source`): 86 category / 101 chain /
  11 global on this snapshot.
- **Soft sanity cap replaces the hard cap** (the v0 wart): past 2× the largest live
  peer's market cap in the category, only 5% of the excess counts. The three Risk
  Curators that tied at exactly $70,062,330 now rank distinctly — Steakhouse
  $90,740,564 > Sentora $87,804,735 > Gauntlet $81,438,590 — and the whole board has
  **zero tied values (198 distinct)**.
- Every row now carries its full workings for the detail view: `base_value_usd`,
  `growth_factor`, `maturity_factor`, `breadth_factor`, `multiple_source`, `capped`,
  plus `peers` (top-3 live-token protocols in the same category with TVL, market cap
  and their price per TVL dollar).

**lib/farm.ts** — farm plans v1: 5–6 steps per protocol (was a flat 5), each a single
concrete action with capital, time and cadence. Gas money in the setup step follows
the protocol's actual chains ($30–$60 if Ethereum is among them, else $5–$20);
established/large tiers gain a risk-management step; bridge/staking/generic families
carry an honest airdrop-realism note (folded into the final step when the plan is
already at 6 steps); "Curators" categories now use the vault playbook instead of the
generic one. All steps 166–457 chars (gate: 20–600).

**dashboard/index.html** — added a "How the implied value is worked out" section
stating the model in words (the judge reads the dashboard text), a Min-TVL slider and
a live row counter; column headers are now the sort controls.

**dashboard/app.js** — clickable sortable headers (rank, name, implied value, TVL,
7-day growth, peer multiple, age; click again to reverse); early finds get a green
"early" badge and tinted row vs the watchlist's amber badge; the detail view now
shows the full workings table (TVL × multiple = base × growth × maturity × breadth =
implied, with the multiple's source and a soft-cap note), the live-peer comparison
table, and the farm plan. Views are hash-presettable (`#p=<slug>`, `#watch=1`,
`#cat=`, `#chain=`, `#min=`) — the screenshot pipeline uses exactly that. Fixed:
the detail panel no longer auto-scrolls the page on first load.

**dashboard/app.css** — styles for the model section, slider, counters, sorted-header
state, early rows/badges and the workings/peers tables. Same dark radar identity.

**main.ts** — two revisions: the run summary now reports the model's workings
(soft-capped rows, chain-priced and global-priced counts), and the run refuses to
write output when the copied dashboard lacks index.html + a .css + a .js file.

**screenshots/** — all three re-rendered from the *new* built page with headless
Chromium (Playwright, Chrome Headless Shell 159) at 1440×1000: `1-board.png` (the
ranked board), `2-detail.png` (rank #1 BitFi Basis: workings, live peers, farm plan),
`3-filtered.png` (watchlist-only filter, "40 of 198 rows"). The scaffold's 11 KiB
placeholder renders are gone. Re-render any time with
`~/workspace/makefun/token-radar-shots.py <output-dir> <dest-dir>` using the
gagarot-tools venv Python (its Playwright Chromium is installed under
`~/.cache/ms-playwright`).

## Validation numbers (kit snapshot, local gate mirror of all 7 sealed checks)

- Board: **198 rows** (40 watchlist + 158 early finds), coverage **40/40**, ranks
  exactly 1..198, implied values strictly non-increasing, **0 ties**, range
  $127,838,911 → $340,392; board.json 372 KiB (cap 8 MiB).
- Farm steps: 5–6 per row, every step 20–600 chars.
- Dashboard source: **13,682 bytes total** (index.html 3,127 + app.js 7,229 +
  app.css 3,326) — budget <60,000, dossier text cap 65,536.
- Screenshots: 1440×1000; 245 / 210 / 244 KiB (gate: ≤512 KiB each, long side ≤1440,
  short side ≥800).
- Dossier: **948 KiB** (cap 1.5 MiB) and **byte-for-byte identical** to a fresh
  `buildDossier(output, {text_max_bytes: 65536})` rebuild.
- Determinism: two consecutive runs produce byte-identical output trees.
- Runtime: **0.4 s** per run (limit 120 s), Node stdlib only.

## Deviations and notes for the parent

1. **Screenshot sizes are 210–245 KiB, not the 300–350 KiB target.** This design
   (flat dark panels, text) genuinely compresses to ~220 KiB at every PNG zlib
   level; the only larger option is uncompressed (~4 MB, over the gate cap).
   Sizes are well inside every gate limit, and the final-phase tiebreak rewards
   the *smaller* dossier, so I kept the natural renders rather than padding bytes.
2. **101 of 198 rows are priced from chain-mates**, because most DefiLlama
   categories here have fewer than 4 live-token peers. That is the PLAN's specified
   fallback order working as designed, and each row states its source.
3. Git history (all in this repo): scaffold baseline → model v1 → farm plans v1 →
   dashboard v1 → screenshots/auto-scroll fix → this report. `main.ts` was revised
   in two separate edits in this session and carries authored lines from both the
   prep session and this one.
4. Nothing is blocked. Remaining before submit (parent, PLAN step 7): create the
   GitHub repo, template README + About, bundle with `--muse-usage` rows and
   redactions, kit `check`, then the probe submission.
