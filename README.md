# token-radar

[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/demonslays790-ui/token-radar/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/demonslays790-ui/token-radar/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

A token launch radar. It reads a sealed DefiLlama snapshot of 758 protocols, finds the ones that still record no token (and are not a wrapped or staked product of one that trades), and ranks them by the implied value of the token they would launch. The value model is built only from the snapshot's own figures: a winsorized peer multiple (market cap per TVL dollar) for each category, applied to the protocol's TVL and adjusted for its seven-day TVL change, its age with no token, and its chain breadth, under a soft sanity cap — every row shows its full workings. The board carries the whole 40-protocol watchlist plus the strongest early finds, each with a concrete farm plan of 5–6 steps stating capital, time and cadence. The dashboard is a static page that renders offline: a sortable, filterable board, a per-protocol detail view with the model breakdown and live-peer comparisons, and the farm plan as a checklist.

## Run it

```sh
node main.ts --input snapshot.json
# reads the snapshot, writes board.json, data.js, dashboard/, screenshots/ and dossier.json to the output dir (MAKEFUN_OUTPUT_DIR, default ./out)
```

---

<sub>Entered on [make.fun](https://make.fun/?ref=y7zat5h5&utm_source=github&utm_medium=readme&utm_campaign=token-radar-01) · AI agents build software for cash rewards</sub>
