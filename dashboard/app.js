// Token Radar dashboard: renders window.RADAR (written by main.ts as ../data.js).
// No network, no framework: a sortable, filterable board and a detail view per protocol.
// The location hash can preset a view (#p=<slug> opens a protocol, #watch=1 filters to
// the watchlist, #min=250 sets the TVL floor in $M) — the screenshots use exactly that.

const R = window.RADAR;
const $ = (id) => document.getElementById(id);
const money = (n) => '$' + Math.round(n).toLocaleString('en-US');
const moneyM = (n) => (n >= 1e9 ? '$' + (n / 1e9).toFixed(2) + 'B' : '$' + (n / 1e6).toFixed(1) + 'M');
const pct = (n) => (n === null ? '—' : (n > 0 ? '+' : '') + n.toFixed(1) + '%');
const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

$('meta').textContent =
  `Snapshot ${R.as_of} · ${R.summary.protocols} protocols · ${R.summary.watchlist} on the watchlist · ` +
  `${R.summary.board} ranked (${R.summary.early} early finds below the $${(R.floor_usd / 1e6).toFixed(0)}M floor) · ` +
  `${R.summary.live} live-token protocols set aside as the peer set`;

const cats = [...new Set(R.rows.map((r) => r.category).filter(Boolean))].sort();
for (const c of cats) $('cat').append(new Option(c, c));
const chains = [...new Set(R.rows.flatMap((r) => r.chains))].sort();
for (const c of chains) $('chain').append(new Option(c, c));

let sortKey = 'rank';
let sortDir = 1; // 1 = the column's natural order, -1 = reversed
const SORTERS = {
  rank: (a, b) => a.rank - b.rank,
  name: (a, b) => (a.name < b.name ? -1 : 1),
  implied: (a, b) => b.implied_value_usd - a.implied_value_usd,
  tvl: (a, b) => b.tvl_usd - a.tvl_usd,
  growth: (a, b) => (b.change_7d ?? -Infinity) - (a.change_7d ?? -Infinity),
  mult: (a, b) => b.peer_multiple - a.peer_multiple,
  age: (a, b) => (b.age_days ?? -1) - (a.age_days ?? -1),
};

function visible() {
  const q = $('q').value.trim().toLowerCase();
  const cat = $('cat').value;
  const chain = $('chain').value;
  const minTvl = Number($('mintvl').value) * 1e6;
  const rows = R.rows.filter((r) =>
    (!q || r.name.toLowerCase().includes(q) || r.slug.includes(q)) &&
    (!cat || r.category === cat) &&
    (!chain || r.chains.includes(chain)) &&
    r.tvl_usd >= minTvl &&
    (!$('watch').checked || r.watchlist));
  return rows.sort((a, b) => SORTERS[sortKey](a, b) * sortDir);
}

function render() {
  const rows = visible();
  $('count').textContent = `${rows.length} of ${R.rows.length} rows`;
  $('mintvlv').textContent = moneyM(Number($('mintvl').value) * 1e6);
  document.querySelectorAll('th[data-k]').forEach((th) => {
    const on = th.dataset.k === sortKey;
    th.classList.toggle('sorted', on);
    th.textContent = th.textContent.replace(/ [▲▼]$/, '') + (on ? (sortDir === 1 ? ' ▼' : ' ▲') : '');
  });
  const tb = $('rows');
  tb.textContent = '';
  for (const r of rows) {
    const tr = document.createElement('tr');
    if (!r.watchlist) tr.className = 'early';
    tr.innerHTML =
      `<td class="num">${r.rank}</td>` +
      `<td>${esc(r.name)}${r.watchlist
        ? '<span class="badge">watchlist</span>'
        : '<span class="badge early-b">early</span>'}</td>` +
      `<td>${esc(r.category ?? '—')}</td>` +
      `<td class="val num">${money(r.implied_value_usd)}</td>` +
      `<td class="num">${money(r.tvl_usd)}</td>` +
      `<td class="num ${(r.change_7d ?? 0) >= 0 ? 'up' : 'down'}">${pct(r.change_7d)}</td>` +
      `<td class="num">${r.peer_multiple.toFixed(2)}×</td>` +
      `<td class="num">${r.age_days === null ? '—' : r.age_days + 'd'}</td>` +
      `<td>▸</td>`;
    tr.addEventListener('click', () => detail(r));
    tb.append(tr);
  }
}

const SRC_LABEL = {
  category: 'the winsorized median of live-token peers in its category',
  chain: 'the winsorized median of live-token protocols sharing its chains (its category has too few live peers)',
  global: 'the global winsorized median (its category and chains have too few live peers)',
};

function detail(r) {
  const d = $('detail');
  d.hidden = false;
  const steps = r.farm_steps.map((s) => `<li>${esc(s)}</li>`).join('');
  const peers = r.peers.length === 0
    ? '<p class="facts">No live-token protocol in this category yet — it is priced from the wider peer set.</p>'
    : `<table class="peers"><thead><tr><th>Live peer</th><th class="num">TVL</th><th class="num">Market cap</th><th class="num">Pays per TVL $</th></tr></thead><tbody>` +
      r.peers.map((p) =>
        `<tr><td>${esc(p.name)}${p.symbol ? ` (${esc(p.symbol)})` : ''}</td>` +
        `<td class="num">${money(p.tvl_usd)}</td><td class="num">${money(p.mcap_usd)}</td>` +
        `<td class="num">${p.multiple.toFixed(2)}×</td></tr>`).join('') +
      '</tbody></table>';
  d.innerHTML =
    `<h2>#${r.rank} ${esc(r.name)} ${r.watchlist ? '<span class="badge">watchlist</span>' : '<span class="badge early-b">early find</span>'}</h2>` +
    `<p class="facts">${esc(r.category ?? 'Uncategorized')} · ${r.chains.map(esc).join(', ')} · ` +
    `TVL ${money(r.tvl_usd)} · 7d ${pct(r.change_7d)} · tracked ${r.age_days ?? '—'} days with no token</p>` +
    `<h3>Why it is worth ${money(r.implied_value_usd)}</h3>` +
    `<table class="workings"><tbody>` +
    `<tr><td>TVL in the snapshot</td><td class="num">${money(r.tvl_usd)}</td></tr>` +
    `<tr><td>× peer multiple — ${SRC_LABEL[r.multiple_source]}</td><td class="num">${r.peer_multiple.toFixed(2)}×</td></tr>` +
    `<tr><td>= base value</td><td class="num">${money(r.base_value_usd)}</td></tr>` +
    `<tr><td>× growth factor (7-day TVL ${pct(r.change_7d)}, half weight, clamped)</td><td class="num">${r.growth_factor.toFixed(2)}×</td></tr>` +
    `<tr><td>× maturity factor (${r.age_days ?? '—'} days tokenless)</td><td class="num">${r.maturity_factor.toFixed(2)}×</td></tr>` +
    `<tr><td>× breadth factor (${r.chains.length} chain${r.chains.length === 1 ? '' : 's'})</td><td class="num">${r.breadth_factor.toFixed(2)}×</td></tr>` +
    `<tr><td><strong>Implied launch value</strong>${r.capped ? ' (soft-capped at 2× the largest live peer in its category)' : ''}</td>` +
    `<td class="num"><strong>${money(r.implied_value_usd)}</strong></td></tr>` +
    `</tbody></table>` +
    `<h3>What the market already pays its live peers</h3>${peers}` +
    `<h3>How to farm it</h3><ol>${steps}</ol>`;
  d.scrollIntoView({ block: 'nearest' });
}

for (const id of ['q', 'cat', 'chain', 'watch', 'mintvl']) $(id).addEventListener('input', render);
document.querySelectorAll('th[data-k]').forEach((th) => {
  th.addEventListener('click', () => {
    if (sortKey === th.dataset.k) sortDir *= -1;
    else { sortKey = th.dataset.k; sortDir = 1; }
    render();
  });
});

// Preset from the hash, then paint. #p=<slug> opens that protocol's detail view.
const hash = new URLSearchParams(location.hash.slice(1));
if (hash.get('watch') === '1') $('watch').checked = true;
if (hash.get('cat')) $('cat').value = hash.get('cat');
if (hash.get('chain')) $('chain').value = hash.get('chain');
if (hash.get('min')) $('mintvl').value = hash.get('min');
render();
const open = R.rows.find((r) => r.slug === hash.get('p')) ?? R.rows[0];
if (open) detail(open);
