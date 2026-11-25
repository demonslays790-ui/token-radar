# token-radar-01 — Requirements Brief

Competition: **"Build the best token launch radar"** (`token-radar-01`), sponsored by make.fun
Account entering: **lucky-coyote-63-2736** (wallet-only agent account; signing wallet `65jDa8CA8aJLinFKuqadhng7zjS3F7LsR2sAbWhT5YXJ`)
Harness kind: `program/v1`, runtime **Node 22** (`main.ts`, standard library only)
Sources: `GET /api/competitions/token-radar-01`, `GET /api/competitions/token-radar-01/requirements`, and the competition kit's `RULES.txt` (kit unpacked at `~/workspace/makefun/token-radar-01-kit/`). Fetched 2026-11-21.
Status at fetch: `open`, `acceptingSubmissions: true`, **22,387 submissions** already in the field.

## Money

- **Prize pool: $1,325 USDC**, fully funded and locked in make.fun's escrow program on Solana mainnet (mint `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`). Because the escrow is funded, **every entry must carry a valid entry signature** (see below) and prizes are claimed on-chain from escrow to the wallet that signed the winning entry.
- **Entry fee: $0.** (`entry_fee: null`, `entryFeesUsd: "0.00"`)
- Payout curve (one place per entrant; 10 paid places):

| Place | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|---|
| USD | 1,000 | 50 | 50 | 50 | 50 | 25 | 25 | 25 | 25 | 25 |

- A house entry that finishes in a paid place **holds the place and the prize is not awarded** — nobody moves up.
- 1st place is also featured on make.fun's site and posts.
- Claim: on-chain from escrow with the signing wallet's keypair, within **30 days** of the result becoming claimable; sanctions screening applies. Tax form (W-9/W-8BEN) only if the winner's calendar-year make.fun prizes reach $2,000 — unreachable here (max single prize $1,000).
- ⚠️ **Payout wallet note:** the account's payouts are **not** pinned to Arafat's own wallet (`HouG2cKbJ7DfdPC7QG3AqffH4nsisMKrqo6pYyJ8Vtpx`) — the delegation was prepared but never registered (it needs his signature). As things stand, a prize would be claimable only to the **agent wallet** `65jDa8…` and would have to be moved on afterwards.

## Timeline (all UTC)

| When | What |
|---|---|
| 2026-11-14 10:00 | Competition opened / entries open. **Repository must be created at or after this instant.** |
| 2026-12-14 10:00 | **Entries close (deadline).** Last submission received before this is the final entry. |
| 2026-12-14 10:10 | Final window starts: final entries re-run, gated, screened, judged. |
| 2026-12-14 ~22:10 | Final phase nominal end (grading budget bound ≈4.44 h of judge calls at 2,000 entries, longer at this field size, + up to 60 min finalist review). |
| 2026-12-28 22:10 | `result_due` outer bound in the requirements' deadlines block. |

## The task

Read a **sealed snapshot** of DefiLlama's protocol universe and produce a **token launch radar**: find the protocols that record no token yet (and are not wrapped/staked/bridged products of one that trades), rank them by the **implied value** of the token they would launch, give each a concrete **farm plan**, and present it all as a **web dashboard**.

The snapshot (`/input/snapshot.json`, fetched by the house from `https://api.llama.fi/protocols` on 2026-11-14, never updated):

- `protocols`: **758** protocols with TVL ≥ $5M. Exactly ten fields each: `slug`, `name`, `category` (nullable), `chains`, `tvl_usd`, `change_7d` (nullable, per cent), `mcap_usd` (null ⇔ no token recorded), `listed_at` (nullable), `gecko_id` and `symbol` (both null ⇔ no token recorded).
- `watchlist`: **40 slugs** — TVL ≥ `floor_usd` ($50,000,000), no token recorded, and passing the house's exclusion rule (category not Bridge / Canonical Bridge / Liquid Staking / Liquid Restaking / Restaked BTC / CEX; no version-marker name suffix; no whole word "wrapped/staked/staking" in the name; name not starting with an exchange name).
- 342 of the 758 protocols record no token; 416 already have one (the peer set for valuation multiples).
- The watchlist is a **floor, never a ceiling**: a valid board needs ≥100 rows, so ≥60 rows must be pre-token protocols *below* the floor — "the early ones the radar exists to find."

### What the program must do (the graded run)

`main.ts` at the repository root, Node 22, **standard library only, nothing installed**, runs in a fresh container:

- **No network**, read-only `/bot` (the repo at the submitted commit), writable `/output`.
- Limits: **1 CPU, 1,024 MB RAM, 64 processes, 120 s wall** per run.
- It **runs twice and both runs must write identical bytes** (`run_deterministic`).
- It reads `/input/snapshot.json` and writes into `/output`:
  - `board.json` — the ranked board (schema below);
  - `data.js` — the dashboard's data (`window.RADAR=…`; the starter's convention, written beside the page);
  - `dashboard/` and `screenshots/` — copied from the repository;
  - `dossier.json` — produced by **`buildDossier` from `vendor/makefun-board.ts`** (the kit's vendored library, a required repo file) with `text_max_bytes: 65536`.

Local equivalent: `MAKEFUN_OUTPUT_DIR=out node main.ts --input <snapshot.json>`.

## The gate (sealed scorer, pass/fail — all seven must pass or the entry is invalid, unranked, unpaid)

1. **dashboard_files** — `/output/dashboard/` holds `index.html` plus ≥1 `.css` and ≥1 `.js` anywhere under it; ≤400 files, ≤4 MiB total; plain filenames only; **no `http://`/`https://` in any HTML attribute value (incl. `<a href>`), `<style>` body, script import, CSS file, or JS import/require specifier** — the page must render with **no network**. (URLs in visible text/comments are fine.)
2. **board_file** — `board.json` is a UTF-8 JSON object with `rows` (a bare array is also read), **100–4,000 rows**, ≤8 MiB. Every row: `slug` (1–128 chars, no whitespace, unique, **must be one of the snapshot's protocols** — an invented slug fails the row), non-empty `name`, positive whole `rank`, positive whole `implied_value_usd` ≤ 100,000,000,000,000, and a `farm_steps` array. A board whose implied values are **all equal is refused** ("a board that ranks nothing by value is not a ranking").
3. **sorted_by_value** — ranks are exactly 1..N, once each; `implied_value_usd` never rises as rank ascends (rank 1 = most valuable).
4. **coverage** — **every one of the 40 watchlist slugs appears** among the rows (min coverage 1.0).
5. **farm_steps** — every row has **3–12 strings, each 20–600 characters** once trimmed: concrete steps to farm it.
6. **screenshots** — `screenshots/` holds **3–4 whole PNG/JPEG images**, each ≤512 KiB, **long side ≤1,440 px, short side ≥800 px**. They must show: the board, one protocol's detail view, a filtered view (the judge reads them — content matters, see Judging).
7. **dossier_matches** — `dossier.json` is **byte-for-byte** what `buildDossier('/output', {text_max_bytes: 65536})` produces from the submitted `dashboard/` + `screenshots/`, and ≤1.5 MiB. Practical consequences: keep the **total dashboard source under ~64 KB** (the dossier's text block caps at 65,536 bytes; a page past it is shown to the judge cut off mid-file) and each **screenshot at ~300–350 KB** (3 × 512 KiB would blow the 1.5 MiB dossier cap).

## Judging (this is a judged contest, not a metrics race)

- The judge is an AI model (make.fun gateway, "superbot", high reasoning effort) that reads each entry's **dossier only**: the **3 screenshots first, then the dashboard source text** (≤64 KB of it). It never runs the page and never sees `board.json` directly — the screenshots and code must agree with the board the program produced.
- **Pairwise**: two entries at a time, no ties. Each game is two calls (A/B order swapped); a call awards the pick 0.5 + 0.1 × margin (margin 1–5 → 0.6–1.0). Ratings are Bradley–Terry fits over all games; places go by win rate.
- **The judge's criteria, in order** (it decides at the first criterion where the two entries differ, unless a later one differs by much more):
  1. **A working radar** — covers the whole watchlist, ranks pre-token protocols by a stated implied value, screenshots and code agree; "a screen with no data or code behind it counts for nothing."
  2. **The value model** — implied value follows from the snapshot's own figures (TVL, 7-day growth, how long it has run with no token), **not from a hardcoded list of names**; live-token protocols are separated from pre-token ones.
  3. **Farm plans** — concrete steps **with what they cost and how long they take**, not slogans.
  4. **The dashboard as a page** — sortable and filterable, readable at a glance, a detail view for each protocol.
  5. **It looks made** — a chosen palette, consistent spacing, readable type; "not a framework pasted wholesale."
- Text addressed to the judge inside the entry is allowed and read as part of the dashboard.
- **Dev phase (now → deadline):** each valid entry immediately plays the 4 fixed house dashboards + 8 games vs the nearest-strength house members (+2 more rounds of 4 if its interval reaches the money line). A **provisional win rate with a 90% interval** shows at once — this is the feedback loop for iterating. An entry whose dossier is byte-identical to a house dashboard plays *as* that dashboard and **takes no reward**; the unmodified starter is exactly such an ordinary entry (the house's 2nd fixed dashboard was captured from it) — **the starter must be genuinely changed**.
- **Final phase (after deadline):** every final entry is screened on its dev rating — the line is **place 40** (interval high must reach the 40th-best low). Shortlist plays **3 Swiss rounds**, then **racing** at prize boundaries (48–96 games), then a **playoff** (top 12 round-robin + 3 extra games between the top two). **Playoff participants place above all non-participants regardless of rate.** Exact ties break by head-to-head playoff games, then **smaller dossier**, then earlier receipt.
- **Finalist review:** places 1–5 are held up to **60 minutes** for review by the make.fun team, who can disqualify with a reason (the next entry moves up and is itself reviewed).

## Submission deliverables

Form fields/files (via the kit CLI: `node cli/makefun.mjs submit --competition token-radar-01 --repo-url <url> --commit <sha> --title <name> --bundle <file> --keypair <file>`):

| Deliverable | Required | Notes |
|---|---|---|
| `repo_url` | ✅ | Public GitHub repo, `https://github.com/<owner>/<repo>` |
| `commit_sha` | ✅ | Full 40-char sha, on a branch; snapshotted at submission — later pushes don't change the entry |
| `bundle` | ✅ | Transcript bundle (.tar.gz) from the kit CLI (`node cli/makefun.mjs bundle`) — or loose files in `transcripts` instead |
| `entry_message` + `entry_signature` | ✅ | `make.fun entry v1` message (Domain / Competition / Repo / Commit / Transcripts sha256 / Wallet / Nonce / Issued At) signed with the account wallet's Ed25519 key; good for 10 minutes, one submission only |
| `title` | optional | ≤200 chars, public name of the entry |

Repo files that must exist **at the submitted commit**:

| File | Required | Notes |
|---|---|---|
| `main.ts` | ✅ | Entrypoint at repo root (Node 22) |
| `LICENSE` | ✅ | OSI-approved license (MIT / Apache-2.0) |
| `vendor/makefun-board.ts` | ✅ | From the kit, for `buildDossier` |
| `dashboard/`, `screenshots/` | ✅ | Copied to `/output` by `main.ts` (contents gated as above) |
| `.makefun/owner.json` | ✅ for us | `{"wallet": "65jDa8CA8aJLinFKuqadhng7zjS3F7LsR2sAbWhT5YXJ"}` — required whenever the repo's GitHub owner is not the account's GitHub login; this account is wallet-only, so it is **always required** |
| `README.md` | ✅ | Built from `how_to_submit.readme_template` with `{owner}`, `{repo}`, `{description}`, `{run}`, `{referral_code}` all filled in; must carry the three live make.fun badges for this repo (bounty / rank / reward) as images and a link to a make.fun page; unfilled placeholders in badge/link URLs fail `repo_readme` |
| GitHub About | ✅ | Set via the `repo_about` `gh` line: description = `{summary}` (≤254 chars, one plain sentence, shell-safe) + the fixed make.fun sentence; homepage `https://make.fun/bounty/token-radar-01`; topics must include `makefun` (template: `makefun, ai-agents, bounties, trading`, + ≤3 of our own) |

**Alternative route — source bundle:** instead of GitHub, submit a v2 git bundle of the repo history (≤512 MiB) via the `source_bundle` field. The history must begin at a drand **beacon root** created by the kit's `init` *before any code is written*, and every credited build session must show the printed anchor line (`makefun anchor <root sha> round <round>`) in a tool result before its first counted write (`thinking_fresh`). No README/About checks apply. The code also stays off public GitHub.

**Prerequisites check:** Node.js 22.18+ (this VM runs Node v24.22.1 ✅) and a browser for the three screenshots (⚠️ this VM is headless — a headless-browser route for screenshots must be arranged during the build; see PLAN.md).

## Transcript gate (9 pass/fail checks, applied before grading; any failure = rejected, fixable and resubmittable before the deadline)

Transcripts are **required** and prove the entrant's own agent built the entry. Current thresholds (requirements API; a `rulesNote` says the checks in force at check time govern, with `thinking_committed` and `transcripts_run_record` updated 2026-11-17):

1. `transcripts_present` — ≥1 session parses from the upload.
2. `transcripts_recorded` — sessions must be harness-recorded logs (or exports of them). **Handed-over sessions** (self-exported with a `"handed_over"` line) only make this check *skip* — and `handed_over_places` is **`none`**: **an entry with a handed-over session is ranked but takes no paid place.** The build must therefore happen in a harness whose logs the kit's `bundle` can read.
3. `thinking_wellformed` — timestamps on messages, tool results answering earlier calls, etc.
4. `thinking_in_window` — **every transcript timestamp between 2026-11-14T10:00Z and the entry's receipt** (±60 s skew). Sessions started before the opening don't count — build sessions must start inside the window.
5. `thinking_committed` — the transcripts' sha256 equals the one named in the signed entry message; a **run record** (`makefun-run.json`: the person's opening prompt verbatim, MCP servers, system prompt, instruction files) is required for entries received from 2026-11-17.
6. `thinking_reproduces` — **≥30%** of the entry's counted lines must be authored or pasted in the uploaded sessions, with **≥1 authored line in `main.ts`**. Copying files in from outside the sessions (including the kit starter, whose lines are excluded from the count) sinks this. If the entrypoint is packed with the kit's `compress`, the readable source must be session-authored and `compress` run afterwards, in-session.
7. `thinking_turns` — ≥5 assistant turns carrying text or thinking (tool-only turns don't count).
8. `thinking_priced` — usage records must price to known models; self-reported sessions need provider usage on ≥50% of assistant messages; **Muse app sessions must attach Muse's usage rows via `bundle --muse-usage`** (≥1 row).
9. `thinking_revised` — some counted file (entrypoint or code it runs) must reach its final content through **≥2 assistant write/edit messages** — write-then-revise, not one-shot.
Plus `thinking_own_work`: from 2026-11-20/21, too much code arriving via fetches, or matching a rival's entry, fails the entry. And `duplicate_snapshot`: a file set identical to another account's earlier entry is refused (claim file excluded).

Before bundling, pass Arafat's personal details (name, email, etc.) via `bundle --redact "<text>"` / `--redact-file` — never redact code, commands, tool output or reasoning.

## Quotas and submission discipline

- **≤5 submissions per UTC day and ≤10 in total** for this competition; the **last** submission before the deadline is the final entry. (API hard cap: 20 entries/account; account quota at fetch: 5 left today, 10 left total, `can_submit: true`.)
- ⚠️ **`refused_attempts_count: true`** — refused submissions still burn the daily quota. Validate locally (gate-shape self-check + kit `check`) before every submit.
- One account per person; one place per entrant.

## Disqualifiers

Reaching for the network / probing or escaping the sandbox / attacking the grader; fabricated, edited, withheld or borrowed transcripts; submitting someone else's work or sharing entries between entrants; more than one account per person; making the repo private, removing its license, or rewriting history so the submitted commit disappears before verification completes; exploiting a gate/grader bug instead of reporting it; false information in a claim's payout details.

## Open decisions / ambiguities (need a call before the build)

1. **GitHub repo vs source bundle.** GitHub route: needs a new public repo under Arafat's GitHub (`demonslays790-ui`) created after 2026-11-14 (any time now qualifies), README-from-template + About chores, and the code is public from creation. Source-bundle route: no GitHub needed and code stays private, but the kit's `init` anchor must be run **before** the first line of code is written, in the build session itself. Either is viable; the choice changes step 1 of the build.
2. **Transcript harness.** The build sessions must be *recorded* by a harness `bundle` reads (handed-over = no paid places). Whoever/whatever runs the build must confirm its session logs + usage rows are bundle-compatible **before** writing code, and run a `bundle --dry-run` after the first steps.
3. **Payout pin.** Register the prepared delegation so a prize pays Arafat's wallet `HouG2c…` directly (needs his one signature on the delegation message), or leave it and claim to the agent wallet `65jDa8…`. Not blocking for entry; blocking for clean payout.
4. **Screenshots on a headless VM.** The 3 screenshots must be real renders of the built dashboard at ≥800 px short side. A headless Chromium (or equivalent) route needs to be set up and verified during the build — the starter's screenshots are of the *starter's* page and cannot be reused (they'd misrepresent our dashboard, and the judge checks screenshots↔code agreement).
