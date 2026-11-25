// Farm plans: one playbook per protocol family, parameterised by the snapshot's own
// facts about the protocol (its category, its chains, its TVL tier). Every step names
// a concrete action, the capital it takes and the time it takes: a plan a reader can
// start today and keep up until the protocol issues its token.

import type { SnapshotProtocol } from './model.ts';

type Family = 'dex' | 'lending' | 'perps' | 'yield' | 'bridge' | 'staking' | 'generic';

/** The playbook family a DefiLlama category belongs to, matched on its words. */
export function familyOf(category: string | null): Family {
  const c = (category ?? '').toLowerCase();
  if (c.includes('dex') || c.includes('aggregator') || c.includes('swap')) return 'dex';
  if (c.includes('lend') || c.includes('borrow') || c.includes('cdp')) return 'lending';
  if (c.includes('perp') || c.includes('derivat') || c.includes('option')) return 'perps';
  if (c.includes('yield') || c.includes('vault') || c.includes('farm') || c.includes('curator')) return 'yield';
  if (c.includes('bridge')) return 'bridge';
  if (c.includes('staking') || c.includes('restak')) return 'staking';
  return 'generic';
}

interface Tier {
  label: string;
  capital: string;
  weekly: string;
}

/** Working capital and weekly effort scaled to the protocol's size. */
function tierOf(tvl: number): Tier {
  if (tvl >= 500_000_000) return { label: 'large', capital: '$2,000-$10,000', weekly: '2-3 hours a week' };
  if (tvl >= 100_000_000) return { label: 'established', capital: '$1,000-$5,000', weekly: '1-2 hours a week' };
  if (tvl >= 20_000_000) return { label: 'mid-size', capital: '$500-$2,000', weekly: 'about an hour a week' };
  return { label: 'early', capital: '$200-$1,000', weekly: '30-45 minutes a week' };
}

const CORE_ACTION: Record<Family, (name: string, tier: Tier) => string> = {
  dex: (n, t) =>
    `Trade on ${n} itself: route your regular swaps through its interface instead of an aggregator, splitting ${t.capital} of volume across the week so the activity is real usage, not wash trading.`,
  lending: (n, t) =>
    `Supply ${t.capital} of a major asset (ETH or a dollar stablecoin) on ${n} and keep the position open; borrow at most 30-40% against it only if you actively manage the health factor.`,
  perps: (n, t) =>
    `Open small, hedged perpetual positions on ${n} with ${t.capital} of margin: trade both directions over the week at low leverage (2-3x) so your volume and open interest are genuine, and never leave a naked position unattended.`,
  yield: (n, t) =>
    `Deposit ${t.capital} into ${n}'s core vault or pool and leave it compounding; prefer the vault holding the asset you already own over chasing the highest advertised APY in a volatile pair.`,
  bridge: (n, t) =>
    `Route real transfers through ${n}: bridge ${t.capital} to a chain you actually use and back over the month, a few crossings each way rather than one large round trip.`,
  staking: (n, t) =>
    `Stake ${t.capital} of the underlying asset through ${n} and hold the receipt position; if it offers restaking, opt in only with funds you can leave locked for months.`,
  generic: (n, t) =>
    `Use ${n}'s core product with ${t.capital} of working capital on a weekly rhythm: whatever its main action is (deposit, trade, provide), do that, on the record, instead of parking funds idle.`,
};

/**
 * How honest to be about the odds, per family. Bridge and staking products often exist
 * to serve a token that already trades elsewhere, and a generic product may never
 * launch at all; the plan says so instead of promising an airdrop.
 */
const REALISM: Partial<Record<Family, string>> = {
  bridge:
    'Be realistic about the odds: bridges often ship without a token of their own or reward volume on a points system that never converts, so farm this only with transfers you would make anyway.',
  staking:
    'Be realistic about the odds: staking and restaking products frequently reward in points or in a parent protocol\'s token rather than a new launch, so size this as a yield position first and a farm second.',
  generic:
    'Be realistic about the odds: nothing in the record guarantees this protocol ever issues a token, so keep the position small enough that the product\'s own use justifies it without an airdrop.',
};

/** The farm plan for one protocol: 4-6 steps, each 20-600 characters by construction. */
export function farmSteps(p: SnapshotProtocol): string[] {
  const tier = tierOf(p.tvl_usd);
  const chain = p.chains[0] ?? 'its main chain';
  const chainList = p.chains.length > 1 ? p.chains.slice(0, 3).join(', ') : chain;
  const family = familyOf(p.category);
  // Gas money follows the chains the protocol actually runs on: mainnet is dearer.
  const gas = p.chains.includes('Ethereum') ? '$30-$60' : '$5-$20';
  const steps = [
    `Set up: use a fresh wallet on ${chainList} and fund it with ${tier.capital} plus about ${gas} extra for gas; setup takes 20-30 minutes, and a separate wallet keeps this farm's history clean and claimable.`,
    CORE_ACTION[family](p.name, tier),
    `Keep a weekly rhythm of ${tier.weekly}: repeat the core action in small, varied amounts, and if ${p.name} runs a points, season or quest program, complete its tasks first, since those are the records a launch snapshot usually rewards.`,
    `Hold the position for at least 8-12 weeks without churning in and out: the capital stays deployed the whole span (no spend beyond the weekly rhythm's gas), because sustained balances and a long first-to-last activity span are what separate a farmer a launch rewards from a one-week visitor.`,
  ];
  // Larger positions earn a risk step; smaller farms fold the same discipline into less.
  if (tier.label === 'large' || tier.label === 'established') {
    steps.push(
      `Cap the downside: keep this single farm under a tenth of the capital you farm with, re-check approvals and position health monthly (15 minutes), and withdraw at once if the protocol is exploited, pauses withdrawals, or its TVL falls by half in a week.`,
    );
  }
  const realism = REALISM[family];
  // Plans stay at 4-6 steps: when the risk step already filled the plan, the realism
  // note rides inside the final step instead of becoming a seventh step.
  const crowded = steps.length >= 5;
  if (realism !== undefined && !crowded) steps.push(realism);
  steps.push(
    `Watch for the launch: spend 10 minutes a month following ${p.name}'s official announcements, and when a token or claim is announced, claim from this same wallet promptly (claims often expire in 30-90 days) and sell in tranches rather than all at once.` +
      (realism !== undefined && crowded ? ` ${realism}` : ''),
  );
  return steps;
}
