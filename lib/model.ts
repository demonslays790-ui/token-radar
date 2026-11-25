// The token radar's model: the sealed snapshot in, a ranked board out.
//
// A protocol's implied value is what its token would be worth if it launched with the
// record the snapshot shows. The value is built only from the snapshot's own figures:
//
//   multiple   = the median market-cap / TVL ratio of the live-token protocols in the
//                same DefiLlama category (the global median when a category is thin)
//   base       = tvl_usd x multiple
//   growth     = 1 + clamp(change_7d, -60, +120)% x 0.5     (a week is a signal)
//   maturity   = 0.6 rising to 1.0 over 1,095 days tracked with no token
//   breadth    = 1 + 3% per extra chain, capped at +15%
//   implied    = min(base x growth x maturity x breadth,
//                    2 x the largest live peer's market cap in the category)
//
// One function scores every protocol; no name is ever special-cased. The board covers
// the snapshot's whole watchlist and adds the pre-token protocols below the floor with
// the highest implied values: the early launches a radar exists to find.

import { CONFIG, type RadarConfig } from './config.ts';
import { farmSteps } from './farm.ts';

/** One protocol of the sealed snapshot: exactly the ten fields the input carries. */
export interface SnapshotProtocol {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
}

/** The whole snapshot document. */
export interface Snapshot {
  as_of: string;
  source: string;
  floor_usd: number;
  protocols: SnapshotProtocol[];
  watchlist: string[];
}

/** One row of the board written to /output/board.json (extra keys are the model's workings). */
export interface BoardRow {
  slug: string;
  name: string;
  rank: number;
  implied_value_usd: number;
  farm_steps: string[];
  tvl_usd: number;
  category: string | null;
  chains: string[];
  change_7d: number | null;
  age_days: number | null;
  peer_multiple: number;
  watchlist: boolean;
}

/** The payload main.ts writes as data.js for the dashboard. */
export interface RadarData {
  as_of: string;
  floor_usd: number;
  summary: { protocols: number; watchlist: number; board: number; early: number; live: number };
  rows: BoardRow[];
  live: { name: string; symbol: string | null; tvl_usd: number; mcap_usd: number; multiple: number }[];
}

export class SnapshotError extends Error {}

/** Parse and lightly validate the snapshot's JSON text. */
export function parseSnapshot(text: string): Snapshot {
  const o = JSON.parse(text) as Partial<Snapshot>;
  if (typeof o.as_of !== 'string' || !Array.isArray(o.protocols) || !Array.isArray(o.watchlist)) {
    throw new SnapshotError('snapshot.json is missing as_of, protocols or watchlist');
  }
  return o as Snapshot;
}

/** Whether DefiLlama records no token for the protocol. */
export function isPreToken(p: SnapshotProtocol): boolean {
  return p.mcap_usd === null && p.gecko_id === null && p.symbol === null;
}

const VERSIONED = /\s(V\d+(\.\d+)?|v\d+(\.\d+)?|\d+\.\d+)$/;

/** Categories that are never a launch candidate: a bridge or staking wrapper of a token that trades. */
const WRAPPER_CATEGORIES = new Set(['Bridge', 'Canonical Bridge', 'Liquid Staking', 'Liquid Restaking', 'Restaked BTC', 'CEX']);

/** Whole words that mark a wrapped or staked product of another token. */
const WRAPPER_WORD = /\b(wrapped|staked|staking)\b/i;

/** Exchange names a product may not begin with (the house watchlist rule's list). */
const EXCHANGE_PREFIX = /^(Binance|Coinbase|Bybit|Kraken|Bitget|OKX|Bitfinex|Gemini)\b/;

/**
 * Whether a pre-token protocol may be ranked as an early find. The board's early rows are
 * held to the same test the house's watchlist applies: not a wrapped, staked or bridged
 * product of a protocol whose token already trades, not an exchange product, not a
 * versioned pool of another protocol.
 */
export function isRankable(p: SnapshotProtocol): boolean {
  return (
    isPreToken(p) &&
    !WRAPPER_CATEGORIES.has(p.category ?? '') &&
    !VERSIONED.test(p.name) &&
    !WRAPPER_WORD.test(p.name) &&
    !EXCHANGE_PREFIX.test(p.name)
  );
}

const DAY_MS = 86_400_000;

/** Whole days from listed_at to the snapshot's as_of date; null when either is absent. */
export function ageDays(asOf: string, listedAt: string | null): number | null {
  if (listedAt === null) return null;
  const a = Date.parse(`${asOf}T00:00:00Z`);
  const b = Date.parse(`${listedAt}T00:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.max(0, Math.floor((a - b) / DAY_MS));
}

function median(values: number[]): number {
  const sorted = [...values].sort((x, y) => x - y);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

/** The peer evidence the model prices from: per-category and global live-token multiples. */
export interface PeerBook {
  multipleFor: (p: SnapshotProtocol) => number;
  peerMaxMcapFor: (p: SnapshotProtocol) => number;
  globalMultiple: number;
}

export function buildPeerBook(snapshot: Snapshot, cfg: RadarConfig = CONFIG): PeerBook {
  const ratios = new Map<string, number[]>();
  const maxMcap = new Map<string, number>();
  const allRatios: number[] = [];
  let globalMax = 0;
  for (const p of snapshot.protocols) {
    if (isPreToken(p) || p.mcap_usd === null || p.mcap_usd <= 0 || p.tvl_usd <= 0) continue;
    const key = p.category ?? 'Uncategorized';
    const ratio = p.mcap_usd / p.tvl_usd;
    const list = ratios.get(key) ?? [];
    list.push(ratio);
    ratios.set(key, list);
    allRatios.push(ratio);
    maxMcap.set(key, Math.max(maxMcap.get(key) ?? 0, p.mcap_usd));
    globalMax = Math.max(globalMax, p.mcap_usd);
  }
  const globalMultiple = allRatios.length > 0 ? median(allRatios) : 1;
  return {
    globalMultiple,
    multipleFor: (p) => {
      const list = ratios.get(p.category ?? 'Uncategorized');
      return list !== undefined && list.length >= cfg.minCategoryPeers ? median(list) : globalMultiple;
    },
    peerMaxMcapFor: (p) => maxMcap.get(p.category ?? 'Uncategorized') ?? globalMax,
  };
}

/** The implied value of one protocol and the workings behind it. */
export function impliedValue(
  p: SnapshotProtocol,
  snapshot: Snapshot,
  peers: PeerBook,
  cfg: RadarConfig = CONFIG,
): { implied: number; multiple: number; age: number | null } {
  const multiple = peers.multipleFor(p);
  const growthPct = Math.min(cfg.growthCapPct, Math.max(cfg.growthFloorPct, p.change_7d ?? 0));
  const growthMult = 1 + (growthPct / 100) * cfg.growthWeight;
  const age = ageDays(snapshot.as_of, p.listed_at);
  const ageForModel = Math.min(age ?? cfg.unknownAgeDays, cfg.maturityDaysCap);
  const maturityMult = cfg.maturityFloor + (ageForModel / cfg.maturityDaysCap) * (1 - cfg.maturityFloor);
  const breadthMult = 1 + Math.min(cfg.breadthCap, cfg.breadthPerExtraChain * Math.max(0, p.chains.length - 1));
  const raw = p.tvl_usd * multiple * growthMult * maturityMult * breadthMult;
  const cap = cfg.peerMaxCapMultiple * peers.peerMaxMcapFor(p);
  return { implied: Math.max(1, Math.round(Math.min(raw, cap))), multiple, age };
}

/** The board: every watchlist protocol, then the strongest early finds, ranked by implied value. */
export function buildBoard(snapshot: Snapshot, cfg: RadarConfig = CONFIG): BoardRow[] {
  const peers = buildPeerBook(snapshot, cfg);
  const watch = new Set(snapshot.watchlist);
  const chosen = new Map<string, SnapshotProtocol>();
  for (const p of snapshot.protocols) {
    if (watch.has(p.slug) && isPreToken(p)) chosen.set(p.slug, p);
  }
  const early = snapshot.protocols
    .filter((p) => !chosen.has(p.slug) && isRankable(p))
    .map((p) => ({ p, v: impliedValue(p, snapshot, peers, cfg) }))
    .sort((a, b) => b.v.implied - a.v.implied || (a.p.slug < b.p.slug ? -1 : 1))
    .slice(0, Math.max(0, cfg.boardSize - chosen.size));
  for (const { p } of early) chosen.set(p.slug, p);

  const scored = [...chosen.values()].map((p) => ({ p, v: impliedValue(p, snapshot, peers, cfg) }));
  scored.sort((a, b) => b.v.implied - a.v.implied || (a.p.slug < b.p.slug ? -1 : 1));
  return scored.map(({ p, v }, i) => ({
    slug: p.slug,
    name: p.name,
    rank: i + 1,
    implied_value_usd: v.implied,
    farm_steps: farmSteps(p),
    tvl_usd: p.tvl_usd,
    category: p.category,
    chains: p.chains,
    change_7d: p.change_7d,
    age_days: v.age,
    peer_multiple: Math.round(v.multiple * 10_000) / 10_000,
    watchlist: watch.has(p.slug),
  }));
}

/** The board plus the dashboard's payload: summary counts and the live-token comparison set. */
export function buildRadar(snapshot: Snapshot, cfg: RadarConfig = CONFIG): { board: BoardRow[]; radar: RadarData } {
  const board = buildBoard(snapshot, cfg);
  const live = snapshot.protocols
    .filter((p) => !isPreToken(p) && p.mcap_usd !== null && p.tvl_usd > 0)
    .sort((a, b) => (b.mcap_usd ?? 0) - (a.mcap_usd ?? 0) || (a.slug < b.slug ? -1 : 1))
    .slice(0, 25)
    .map((p) => ({
      name: p.name,
      symbol: p.symbol,
      tvl_usd: p.tvl_usd,
      mcap_usd: p.mcap_usd!,
      multiple: Math.round(((p.mcap_usd ?? 0) / p.tvl_usd) * 10_000) / 10_000,
    }));
  const radar: RadarData = {
    as_of: snapshot.as_of,
    floor_usd: snapshot.floor_usd,
    summary: {
      protocols: snapshot.protocols.length,
      watchlist: snapshot.watchlist.length,
      board: board.length,
      early: board.filter((r) => !r.watchlist).length,
      live: snapshot.protocols.filter((p) => !isPreToken(p)).length,
    },
    rows: board,
    live,
  };
  return { board, radar };
}

/** The data.js the dashboard reads, written beside it in /output. */
export function dataScript(radar: RadarData): string {
  return `window.RADAR=${JSON.stringify(radar)};\n`;
}

/** The gate's shape, checked before anything is written: the first problem found, or null. */
export function boardIssue(board: BoardRow[], snapshot: Snapshot): string | null {
  if (board.length < 100 || board.length > 4000) return `board holds ${board.length} rows, outside 100-4000`;
  const slugs = new Set(snapshot.protocols.map((p) => p.slug));
  const seen = new Set<string>();
  for (const [i, row] of board.entries()) {
    if (!slugs.has(row.slug)) return `row ${i + 1}: slug ${row.slug} is not in the snapshot`;
    if (seen.has(row.slug)) return `slug ${row.slug} appears twice`;
    seen.add(row.slug);
    if (row.rank !== i + 1) return `row ${row.slug}: rank ${row.rank}, expected ${i + 1}`;
    if (!Number.isInteger(row.implied_value_usd) || row.implied_value_usd <= 0) return `row ${row.slug}: bad implied value`;
    if (i > 0 && row.implied_value_usd > board[i - 1]!.implied_value_usd) return `row ${row.slug}: implied value rises with rank`;
    if (row.farm_steps.length < 3 || row.farm_steps.length > 12) return `row ${row.slug}: ${row.farm_steps.length} farm steps`;
    for (const step of row.farm_steps) {
      const len = step.trim().length;
      if (len < 20 || len > 600) return `row ${row.slug}: a farm step is ${len} characters, outside 20-600`;
    }
  }
  for (const slug of snapshot.watchlist) {
    if (!seen.has(slug)) return `watchlist protocol ${slug} is missing from the board`;
  }
  if (board.every((r) => r.implied_value_usd === board[0]!.implied_value_usd)) return 'every implied value is the same';
  return null;
}
