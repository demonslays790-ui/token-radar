// Token Radar dashboard: renders window.RADAR (written by main.ts as ../data.js).
// No network, no framework: a sortable, filterable board and a detail view per protocol.

const R = window.RADAR;
const $ = (id) => document.getElementById(id);
const money = (n) => '$' + Math.round(n).toLocaleString('en-US');
const pct = (n) => (n === null ? '—' : (n > 0 ? '+' : '') + n.toFixed(1) + '%');

$('meta').textContent =
  `Snapshot ${R.as_of} · ${R.summary.protocols} protocols · ${R.summary.watchlist} on the watchlist · ` +
  `${R.summary.board} ranked (${R.summary.early} early finds below the $${(R.floor_usd / 1e6).toFixed(0)}M floor)`;

const cats = [...new Set(R.rows.map((r) => r.category).filter(Boolean))].sort();
for (const c of cats) $('cat').append(new Option(c, c));
const chains = [...new Set(R.rows.flatMap((r) => r.chains))].sort();
for (const c of chains) $('chain').append(new Option(c, c));

function visible() {
  const q = $('q').value.trim().toLowerCase();
  const cat = $('cat').value;
  const chain = $('chain').value;
  const watchOnly = $('watch').checked;
  let rows = R.rows.filter((r) =>
    (!q || r.name.toLowerCase().includes(q) || r.slug.includes(q)) &&
    (!cat || r.category === cat) &&
    (!chain || r.chains.includes(chain)) &&
    (!watchOnly || r.watchlist));
  const sort = $('sort').value;
  const by = {
    rank: (a, b) => a.rank - b.rank,
    tvl: (a, b) => b.tvl_usd - a.tvl_usd,
    growth: (a, b) => (b.change_7d ?? -Infinity) - (a.change_7d ?? -Infinity),
    age: (a, b) => (b.age_days ?? -1) - (a.age_days ?? -1),
  }[sort];
  return rows.sort(by);
}

function render() {
  const tb = $('rows');
  tb.textContent = '';
  for (const r of visible()) {
    const tr = document.createElement('tr');
    tr.innerHTML =
      `<td>${r.rank}</td>` +
      `<td>${r.name}${r.watchlist ? '<span class="badge">watchlist</span>' : ''}</td>` +
      `<td>${r.category ?? '—'}</td>` +
      `<td class="val">${money(r.implied_value_usd)}</td>` +
      `<td>${money(r.tvl_usd)}</td>` +
      `<td class="${(r.change_7d ?? 0) >= 0 ? 'up' : 'down'}">${pct(r.change_7d)}</td>` +
      `<td>${r.peer_multiple.toFixed(2)}×</td>` +
      `<td>${r.age_days === null ? '—' : r.age_days + 'd'}</td>` +
      `<td>▸</td>`;
    tr.addEventListener('click', () => detail(r));
    tb.append(tr);
  }
}

function detail(r) {
  const d = $('detail');
  d.hidden = false;
  const steps = r.farm_steps.map((s) => `<li>${s}</li>`).join('');
  d.innerHTML =
    `<h2>#${r.rank} ${r.name}</h2>` +
    `<p class="facts">${r.category ?? 'Uncategorized'} · ${r.chains.join(', ')} · ` +
    `TVL ${money(r.tvl_usd)} · 7d ${pct(r.change_7d)} · tracked ${r.age_days ?? '—'} days with no token</p>` +
    `<p><strong>Implied launch value: ${money(r.implied_value_usd)}</strong> — TVL × ${r.peer_multiple.toFixed(2)}×, ` +
    `the median market-cap/TVL of live-token peers in its category, adjusted for growth, maturity and chain breadth.</p>` +
    `<h3>How to farm it</h3><ol>${steps}</ol>`;
  d.scrollIntoView({ block: 'nearest' });
}

for (const id of ['q', 'cat', 'chain', 'sort', 'watch']) $(id).addEventListener('input', render);
render();
if (R.rows.length > 0) detail(R.rows[0]);
