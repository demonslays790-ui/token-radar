# token-radar-01 — Submission Route Decision

Decided: 2026-11-21. Account: **lucky-coyote-63-2736**. Kit: `~/workspace/makefun/token-radar-01-kit/` (CLI `node cli/makefun.mjs`). Companion docs: `REQUIREMENTS.md`, `PLAN.md` in this directory.

## Decision: GitHub repo route

Submit via a public GitHub repo under **demonslays790-ui** (`--repo-url` + `--commit`), with the transcript bundle produced by the kit's `bundle` from this machine's Muse app session logs + `--muse-usage` rows from muse.db. The source-bundle route is rejected (see "Why not source-bundle" — it would void all work done so far).

## Transcript-harness verdict: ELIGIBLE for paid places (proven by dry-run)

The fear was that Muse app sessions would count as "handed-over" (self-exported → ranked but **no paid places**). They do not. Evidence, from `bundle --dry-run --repo ~/workspace/makefun/token-radar` run inside the kit (2026-11-21):

- Bundle **natively discovers Muse app session logs** at `~/agents/<agent>/sessions/<id>.jsonl` (harness name in the bundle: `muse-app`). RULES.txt confirms this is a harness-recorded log, not an export: "a Muse agent's is the app's own ~/agents/<agent>/sessions/<id>.jsonl, which bundle finds and keeps from the build on."
- The dry-run found **7 muse-app session files**, including the prep session that authored the scaffold (`737e68ed…`, 37 turns, 136 lines kept, cut to this repository's work) and this route-check session (`d419f24a…`). Sessions are cut to the turns that name/work on this repository; earlier records are left out with warnings, not rejections.
- **Usage rows work.** Muse app session files carry no token usage, so `thinking_priced` requires rows attached via `--muse-usage`. The kit documents the exact muse.db query (`agent.agent_message_token_usage` ⨝ `agent.agents`). Run against this machine's muse.db it returned real rows (model `ipnext/avocado-5.16-v1` — the kit states this id and `muse-spark-1.3` are the same model for checking). Second dry-run with `--muse-usage <file>`: **"200 usage rows read, 13 attached to the Muse app sessions"** — 1 row attached to the prep session, 12 to the main session. The gate needs ≥1 row across the entry's sessions: satisfied.
- **Run record completes.** With `--provider meta --effort default --mcp none` added, the dry-run's run record showed **no missing items** (prompt, system prompt, instruction files collected, MCP servers recorded). Without `--muse-usage` the only other blocker was the "0 usage rows attached … this entry will be rejected" warning — cured by the flag.
- Dry-run ends "dry run: nothing written" with warnings only. No handed-over session is involved anywhere → `transcripts_recorded` passes as recorded logs → **paid places are reachable**.

### Conditions the real build must satisfy (all verified achievable here)

1. **Build in sessions that start inside the window** (2026-11-14T10:00Z → receipt). The prep session (began 2026-11-21T02:27Z) and any new session qualify. The long-lived main chat session (`88c7ebe7…`) began **2026-10-01** — it must never be a credited build session; bundle cuts it to repo-naming turns, but do not rely on that.
2. **Do the build in a dedicated session (plus its subagents), not the main chat**, and pin the run record with `--prompt-file` (Arafat's actual words) + `--prompt-origin`: left to itself, bundle guessed the run-record prompt from the main session and picked an unrelated one (the free-APIs roundup). A subagent's brief counts as handed-off origin; the parent chain is found on this machine.
3. **Bundle only after every build subagent has finished** — a subagent's usage row is written when its run completes (kit warning, verbatim). The top-level agent then runs the muse.db SELECT with **its own agent_id and each subagent's**, and bundles.
4. **Query usage per agent, not in one batch.** The muse.db tool caps a query at 200 rows; one combined query returned 199 rows of the main agent and only 1 of the prep agent. Per-agent queries (paging with the `created_at` cursor if a build runs long, as `bundle --help` describes) avoid the crowd-out.
5. **Declare the run honestly at bundle time:** `--provider meta`, `--model muse-spark-1.3` (or the recorded `ipnext/avocado-…` id), `--effort default`, and `--mcp` naming the build session's actual MCP servers (or `--mcp none` only if it truly had none). Harness + version are already recorded in the session files.
6. **Authorship discipline still applies** (unchanged from REQUIREMENTS.md): ≥30% of counted lines authored in the uploaded sessions with ≥1 authored line in `main.ts`; a counted file revised in ≥2 write/edit messages; ≥5 text-bearing assistant turns. The prep scaffold's lines **do count** — they were authored in session `737e68ed…`, which bundle reads.
7. **Redact before bundling:** pass Arafat's personal details via `--redact` / `--redact-file` (the dry-run already auto-removed 26 emails, 121 usernames, 7 credentials, home paths — add his name/details explicitly at real bundle time).
8. Validate with the kit's `check` + a local gate mirror before every submit — refused attempts burn the daily quota (5/day, 10 total).

## Why not source-bundle

The source-bundle history must begin at a drand beacon root created by `init` **before any code is written**, and every credited build session must show the printed anchor line (`makefun anchor <root sha> round <round>`) **in a tool result before its first counted write** (`thinking_fresh`). The scaffold already exists — authored by the prep session on 2026-11-21 with no anchor anywhere in it. That session's writes can never be retro-anchored, so on this route:

- **All entry code would have to be re-authored from scratch** in post-anchor sessions (main.ts, lib/, dashboard/ — the scaffold could be read as a design reference only; copying its files in would sink `thinking_reproduces`, and its lines would not count toward the 30%).
- A fresh directory + `init` would be required (the current directory now holds a plain test `git init`, no commits — see below).
- The only gains would be: no public repo, no template-README/About chores. Not worth discarding a working, gate-valid, session-authored scaffold and re-spending the build.

## GitHub access check (executed — no blocker)

- `gh auth status`: **logged in to github.com as demonslays790-ui**, token scopes `gist, read:org, repo`; git protocol https with the gh credential helper configured globally. Git 2.43.0 present.
- Push access therefore exists on this VM. **The repo was not created in this step** — creation is a build-phase action (it must be created ≥ 2026-11-14T10:00Z, which any creation from now on satisfies) and should be done together with its template README, About (description/homepage/topics incl. `makefun`) and `.makefun/owner.json` (already present in the scaffold: wallet `65jDa8…`).

## What was executed in this step

- `git init` in `~/workspace/makefun/token-radar/` (no commits) — required before `bundle` would run at all ("not inside a git repository"); harmless to either route and needed by the chosen one.
- Two `bundle --dry-run` passes (plain, then with `--muse-usage` + run-record flags) — outputs quoted above; nothing was written by either.
- The kit's documented muse.db usage SELECT for the three relevant agents — rows exist and attach (proof above).
- `gh auth status` — above.
- No submission, no payment, no repo creation, no external account action. API key and keypair contents were never printed (neither was needed in this step).

## Remaining blockers / open items (none block the route)

1. **Payout pin still unregistered** (unchanged): a prize claims to the agent wallet `65jDa8…` unless Arafat signs the prepared delegation pinning payouts to his wallet `HouG2c…`. Entry is unaffected; do before any win.
2. **Build-phase chores for the GitHub route:** create the repo, template README with live badges + referral code, About via `gh`, keep the submitted commit reachable (never make the repo private or rewrite it away).
3. **Headless screenshots** (from PLAN.md): the 3 dashboard screenshots still need a working headless-browser render route on this VM, verified during the build.
4. **Final-entry target:** submit the polished entry by **Dec 12** (deadline Dec 14 10:00 UTC), holding ≥1 submission in reserve.
