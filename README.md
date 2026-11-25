# Token Radar — entry scaffold for make.fun's token-radar-01

A token launch radar: it reads a sealed DefiLlama snapshot, ranks the protocols that
record no token yet by the implied value of the token they would launch, gives each a
concrete farm plan, and presents the board as a static dashboard that renders offline.

This is the **preparation scaffold** (2026-11-21): a working skeleton with a v0 model,
built so the real build can start from a green local run. The plan is in `PLAN.md` and
the competition's full requirements in `REQUIREMENTS.md`, both in this directory
(this folder becomes the entry repo).

## Layout

- `main.ts` — entrypoint (Node 22, standard library only). Snapshot in, artifact out.
- `lib/config.ts` — every model constant, named and stated.
- `lib/model.ts` — peer-multiple valuation, board assembly, gate-shape self-check.
- `lib/farm.ts` — category playbooks producing per-protocol farm steps with cost + time.
- `vendor/makefun-board.ts` — the kit's library, vendored unmodified (required); `main.ts`
  writes `dossier.json` with its `buildDossier`.
- `dashboard/` — `index.html` + `app.css` + `app.js`: sortable/filterable board and a
  per-protocol detail view, rendered from `../data.js` with no network.
- `screenshots/` — **placeholders** (1440×1000, valid PNGs within the gate caps). They
  must be replaced by real renders of the finished dashboard before any submission:
  the judge reads them and checks they agree with the code.
- `.makefun/owner.json` — the claim file naming the entering account's wallet
  (required because the account is wallet-only).
- `LICENSE` — MIT.

## Run it

```sh
node main.ts --help
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts --input ~/workspace/makefun/token-radar-01-kit/input/snapshot.json
```

Writes `out/board.json`, `out/data.js`, `out/dashboard/`, `out/screenshots/` and
`out/dossier.json`. The run is deterministic: two runs over the same snapshot produce
byte-identical output (the grader runs it twice and compares).

## Before any submission (see PLAN.md work order)

- Replace the placeholder screenshots with real renders at 1440×1000, 300–350 KB each.
- Rebuild this README from the competition's `how_to_submit.readme_template`
  (all placeholders filled, the three live make.fun badges kept) and set the repo's
  GitHub About from `how_to_submit.repo_about` — the scaffold README is not the
  submission README.
- Keep the total dashboard source under ~60 KB so the judge's dossier shows it whole.
