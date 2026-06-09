const API_BASE = '';
const REFRESH_INTERVAL = 10000;

function getTradeStatusLabel(trade) {
  const ltp = parseFloat(trade.ltp);
  const target = parseFloat(trade.targetPrice);
  const stop = parseFloat(trade.stopLoss);

  if (trade.signal_type === 'BUY') {
    if (ltp >= target) return 'Target reached';
    if (ltp <= stop) return 'Stop loss reached';
    return 'Watching';
  }

  if (ltp <= target) return 'Target reached';
  if (ltp >= stop) return 'Stop loss reached';
  return 'Watching';
}

function renderTradeRow(trade) {
  const status = getTradeStatusLabel(trade);
  return `
    <tr>
      <td>${trade.symbol}</td>
      <td>${trade.signal_type}</td>
      <td>${trade.quantity}</td>
      <td>${trade.entryPrice}</td>
      <td>${trade.targetPrice}</td>
      <td>${trade.stopLoss}</td>
      <td>${trade.ltp}</td>
      <td>${trade.pnl}</td>
      <td><span class="badge ${status === 'Target reached' ? 'target' : status === 'Stop loss reached' ? 'stoploss' : 'watching'}">${status}</span></td>
    </tr>
  `;
}

function renderTrades(trades, containerId) {
  const container = document.getElementById(containerId);
  if (!trades || trades.length === 0) {
    container.innerHTML = '<div class="empty-state">No active trades available.</div>';
    return;
  }

  const rows = trades.map(renderTradeRow).join('');
  container.innerHTML = `
    <div class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Symbol</th>
            <th>Side</th>
            <th>Qty</th>
            <th>Entry</th>
            <th>Target</th>
            <th>Stoploss</th>
            <th>Current LTP</th>
            <th>P&L</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </div>
  `;
}

async function fetchJson(path) {
  const response = await fetch(`${API_BASE}${path}`);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return response.json();
}

async function loadDashboard() {
  const statusEl = document.getElementById('dashboard-status');
  statusEl.textContent = 'Loading latest data...';

  try {
    await fetchKotakTotpCode();

    const [statsRes, tradesRes] = await Promise.all([
      fetchJson('/api/trades/stats/summary'),
      fetchJson('/api/trades/active/list'),
    ]);

    if (statsRes.success) {
      document.getElementById('summary-total').textContent = statsRes.data.totalTrades;
      document.getElementById('summary-open').textContent = statsRes.data.openTrades;
      document.getElementById('summary-closed').textContent = statsRes.data.closedTrades;
      document.getElementById('summary-winrate').textContent = statsRes.data.winRate;
    }

    if (tradesRes.success) {
      renderTrades(tradesRes.data, 'dashboard-trades');
      renderTrades(tradesRes.data, 'trades-list');
      statusEl.textContent = `Updated ${new Date().toLocaleTimeString()}`;
    } else {
      statusEl.textContent = 'Unable to load trades.';
      document.getElementById('dashboard-trades').innerHTML = '<div class="empty-state">Failed to load trade data.</div>';
      document.getElementById('trades-list').innerHTML = '<div class="empty-state">Failed to load trade data.</div>';
    }
  } catch (error) {
    statusEl.textContent = `Error loading data: ${error.message}`;
    document.getElementById('dashboard-trades').innerHTML = '<div class="empty-state">Unable to fetch trades.</div>';
    document.getElementById('trades-list').innerHTML = '<div class="empty-state">Unable to fetch trades.</div>';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const links = document.querySelectorAll('nav a');
  const panels = document.querySelectorAll('.panel');
  const refreshBtn = document.getElementById('refreshBtn');
  const saveCodeBtn = document.getElementById('saveKotakTotpCodeBtn');

  links.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const id = link.getAttribute('href').slice(1);
      panels.forEach(p => p.classList.toggle('active', p.id === id));
    });
  });

  if (saveCodeBtn) {
    saveCodeBtn.addEventListener('click', () => saveKotakTotpCode());
  }

  refreshBtn.addEventListener('click', () => loadDashboard());
  loadDashboard();
  setInterval(loadDashboard, REFRESH_INTERVAL);
});

async function fetchKotakTotpCode() {
  try {
    const result = await fetchJson('/api/kotak/access-code');
    const savedCode = document.getElementById('savedTotpCode');
    if (savedCode) {
      savedCode.textContent = result.data?.access_code || '—';
    }
  } catch (error) {
    const status = document.getElementById('kotakTotpCodeStatus');
    if (status) {
      status.textContent = `Unable to load saved Kotak TOTP login attempt: ${error.message}`;
    }
  }
}

async function saveKotakTotpCode() {
  const input = document.getElementById('kotakTotpCodeInput');
  const status = document.getElementById('kotakTotpCodeStatus');
  if (!input || !status) return;

  const totpCode = input.value.trim();
  if (!totpCode) {
    status.textContent = 'Please enter a Kotak TOTP code before submitting.';
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/api/kotak/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ totpCode }),
    });

    const result = await response.json();
    if (!response.ok || !result.success) {
      status.textContent = `Login failed: ${result.error || response.statusText}`;
      return;
    }

    document.getElementById('savedTotpCode').textContent = result.totpCode.access_code;
    status.textContent = 'Kotak TOTP login submitted successfully.';
    input.value = '';
  } catch (error) {
    status.textContent = `Network error submitting TOTP code: ${error.message}`;
  }
}
