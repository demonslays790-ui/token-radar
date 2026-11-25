// Token Radar model constants.
//
// Every number the value model uses lives here, named, so the dashboard can state the
// model exactly as it runs and a reader can re-derive any row's implied value by hand.
// The model reads only the sealed snapshot's own figures: TVL, the seven-day TVL change,
// the days a protocol has been tracked with no token, its chains, and what the market
// pays per TVL dollar for live-token protocols of the same category.

export const CONFIG = {
  /** Board rows: the whole watchlist plus the strongest early finds below the floor. */
  boardSize: 240,

  /** A category's own peer multiple is trusted once it has at least this many live peers. */
  minCategoryPeers: 4,

  /**
   * Peer ratios are winsorized before the median: the most extreme this share at each
   * tail is pulled in to the nearest kept value, so one absurd listing cannot drag the
   * multiple a whole category is priced from.
   */
  winsorShare: 0.05,

  /**
   * The sanity cap is soft. Past capMultiple x the largest live peer's market cap an
   * implied value keeps only this share of its excess: the biggest protocols stay in
   * size order instead of piling up at one identical capped figure.
   */
  capOverflowSlope: 0.05,

  /** change_7d is a per cent. Clamp it before it moves a value: one week is a signal. */
  growthFloorPct: -60,
  growthCapPct: 120,

  /** Share of the clamped seven-day move that passes into the implied value. */
  growthWeight: 0.5,

  /** Maturity: the multiplier runs from maturityFloor (brand new) to 1.0 at maturityDaysCap. */
  maturityFloor: 0.6,
  maturityDaysCap: 1095,

  /** Age assumed when DefiLlama records no listed_at for a protocol. */
  unknownAgeDays: 365,

  /** Multi-chain breadth: each chain past the first adds this, up to breadthCap. */
  breadthPerExtraChain: 0.03,
  breadthCap: 0.15,

  /** No implied value may exceed this multiple of the largest live peer's market cap. */
  peerMaxCapMultiple: 2,
} as const;

export type RadarConfig = typeof CONFIG;
