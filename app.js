// ==========================================
// TRADEATRAVEL PRO TERMINAL - APP.JS
// ==========================================

// Supabase Configuration
const SUPABASE_URL = "https://obdkqdfalmqnebrmtzwh.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9iZGtxZGZhbG1xbmVicm10endoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYzMjc3NjksImV4cCI6MjEwMTkwMzc2OX0.0-cSxWTrAyNMrQQtaEaXlZPzyP_0nZzad0738-DRbDo"; 

const { createClient } = window.supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let isSignUpMode = false;
let binanceSocket = null;

const TICKER_POOL = [
  { symbol: "BTCUSDT", displaySymbol: "BTC/USDT" },
  { symbol: "ETHUSDT", displaySymbol: "ETH/USDT" },
  { symbol: "SOLUSDT", displaySymbol: "SOL/USDT" },
  { symbol: "BNBUSDT", displaySymbol: "BNB/USDT" },
  { symbol: "XRPUSDT", displaySymbol: "XRP/USDT" },
  { symbol: "ADAUSDT", displaySymbol: "ADA/USDT" }
];

const TIMEFRAMES = ["1m", "3m", "5m"];
let currentTrades = [];

// Leaderboard Top Tier - Exactly Top 8 Gainers
const LEADERBOARD_DATA = [
  { rank: 1, name: "CryptoWhale_X", pnl: 1479.00 },
  { rank: 2, name: "AlphaTrader99", pnl: 1380.45 },
  { rank: 3, name: "SatoshiDream", pnl: 1210.20 },
  { rank: 4, name: "BullishViper", pnl: 1055.80 },
  { rank: 5, name: "ApexScalper", pnl: 920.15 },
  { rank: 6, name: "NovaTrader_88", pnl: 840.90 },
  { rank: 7, name: "ZenithTrades", pnl: 695.40 },
  { rank: 8, name: "ShadowMargin", pnl: 512.60 }
];

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function formatCurrency(amount) {
  return "$" + Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// 8-HOUR ROTATION SEED ENGINE
function get8HourCycleSeed() {
  const EIGHT_HOURS = 8 * 60 * 60 * 1000;
  const currentTimestamp = Date.now();
  const lastCycle = localStorage.getItem('last_8h_cycle_time');

  if (!lastCycle || (currentTimestamp - parseInt(lastCycle)) > EIGHT_HOURS) {
    localStorage.setItem('last_8h_cycle_time', currentTimestamp.toString());
    localStorage.setItem('cycle_seed', Math.random().toString());
  }

  return parseFloat(localStorage.getItem('cycle_seed') || Math.random());
}

document.addEventListener('DOMContentLoaded', async () => {
  const toggleBtn = document.getElementById('auth-toggle');
  const authBtn = document.getElementById('auth-btn');

  if (toggleBtn) toggleBtn.addEventListener('click', toggleAuthMode);
  if (authBtn) authBtn.addEventListener('click', handleAuth);

  renderTradingViewCharts();
  renderLeaderboard();
  update8HourCycleData();

  const { data: { session } } = await supabaseClient.auth.getSession();
  
  if (session) {
    document.getElementById('auth-modal').classList.add('hidden');
    loadUserProfile(session.user);
  } else {
    document.getElementById('auth-modal').classList.remove('hidden');
  }
});

// Update 8-Hour Shift Data & Signals
function update8HourCycleData() {
  const seed = get8HourCycleSeed();
  
  const seasonWinRate = "82.0";
  document.getElementById('dynamic-winrate').innerText = `${seasonWinRate}%`;
  document.getElementById('winrate-badge').innerText = `${seasonWinRate}% WIN RATE`;

  renderDynamicSignals(seed);
  renderRealizedTrades();
}

// Render Exactly 1 Unlocked Signal + 1 Set of 3 Locked Signals with Overlay
function renderDynamicSignals(seed) {
  const isResistance = seed > 0.5;
  
  // UNLOCKED SIGNAL (1:2 Risk-to-Reward Ratio)
  const activeSymbol = isResistance ? "BTC/USDT" : "ETH/USDT";
  const activeDir = isResistance ? "SHORT" : "LONG";
  const activeBadge = isResistance ? "badge-short" : "badge-long";
  const activeReason = isResistance 
    ? "2nd Touch Resistance Hit ($69,850)" 
    : "2nd Touch Support Hit ($2,580)";
  
  const ep = isResistance ? "$69,820.00" : "$2,585.00";
  const tp = isResistance ? "$67,820.00" : "$2,785.00";
  const sl = isResistance ? "$70,320.00" : "$2,535.00";

  let htmlContent = `
    <div class="signal-card" style="border-left: 3px solid ${isResistance ? 'var(--red)' : 'var(--green)'}; margin-bottom: 6px; padding: 6px 8px;">
      <div class="trade-row-top">
        <span class="symbol-name" style="font-size:0.7rem;">${activeSymbol} <span class="badge ${activeBadge}" style="font-size:0.55rem;">${activeDir} 25x</span></span>
        <span class="badge badge-active" style="font-size:0.5rem;">ACTIVE 1:2 RR</span>
      </div>
      <div style="font-size: 0.58rem; color: var(--text-muted); margin: 2px 0;">
        <b>${activeReason}</b>
      </div>
      <div style="display: flex; justify-content: space-between; font-size: 0.62rem; font-family: monospace;">
        <span>EP: <b>${ep}</b></span>
        <span class="green">TP (1:2): <b>${tp}</b></span>
        <span class="red">SL: <b>${sl}</b></span>
      </div>
    </div>
  `;

  // 3 LOCKED SIGNALS CONTAINER WITH SINGLE OVERLAY BANNER
  const lockedPool = [
    { symbol: "SOL/USDT", dir: "LONG 20x", reason: "2nd Touch Major Support Hit", ep: "$2,640.00", tp: "$2,780.00", sl: "$2,590.00" },
    { symbol: "BNB/USDT", dir: "SHORT 15x", reason: "2nd Touch Major Resistance Hit", ep: "$154.50", tp: "$146.00", sl: "$158.20" },
    { symbol: "XRP/USDT", dir: "LONG 30x", reason: "2nd Touch Support Bounce", ep: "$580.00", tp: "$615.00", sl: "$568.00" }
  ];

  let lockedHTML = '';
  lockedPool.forEach(lock => {
    lockedHTML += `
      <div class="signal-card" style="border-left: 3px solid var(--text-muted); margin-bottom: 6px; padding: 6px 8px;">
        <div class="trade-row-top">
          <span class="symbol-name" style="font-size:0.7rem;">${lock.symbol} <span class="badge badge-long" style="font-size:0.55rem;">${lock.dir}</span></span>
          <span class="badge" style="background: #333; color: #aaa; font-size:0.5rem;">LOCKED VIP</span>
        </div>
        <div style="font-size: 0.58rem; color: var(--text-muted); margin: 2px 0;">
          <b>${lock.reason}</b>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 0.62rem; font-family: monospace;">
          <span>EP: <b>${lock.ep}</b></span>
          <span class="green">TP: <b>${lock.tp}</b></span>
          <span class="red">SL: <b>${lock.sl}</b></span>
        </div>
      </div>
    `;
  });

  htmlContent += `
    <div style="position: relative;">
      <div style="filter: blur(4px); pointer-events: none; opacity: 0.35;">
        ${lockedHTML}
      </div>
      <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; width: 100%; z-index: 2;">
        <div style="font-size: 1.1rem; margin-bottom: 2px;">🔒</div>
        <div style="font-size: 0.75rem; font-weight: bold; color: #fff; margin-bottom: 4px;">3 Premium Signals Locked</div>
        <button onclick="alert('Redirecting to Signal VIP Subscription...')" style="background: #f3ba2f; color: #000; border: none; padding: 4px 10px; font-size: 0.65rem; font-weight: bold; border-radius: 4px; cursor: pointer;">Buy Monthly Signal for More</button>
      </div>
    </div>
  `;

  document.getElementById('unlocked-signal-box').innerHTML = htmlContent;
}

// RENDER REALIZED TRADES
function renderRealizedTrades() {
  const container = document.getElementById('tp-hits-container');
  if (!container) return;

  const realizedList = [
    { pair: "BTC/USDT", exit: "$68,910.00", dollarGain: "+$148.50", pct: "+4.2%", isWin: true, time: "28m ago" },
    { pair: "ETH/USDT", exit: "$2,682.00", dollarGain: "+$84.20", pct: "+2.8%", isWin: true, time: "1h 10m ago" },
    { pair: "SOL/USDT", exit: "$148.20", dollarGain: "-$32.00", pct: "-8.00%", isWin: false, time: "2h 05m ago" },
    { pair: "BNB/USDT", exit: "$589.50", dollarGain: "+$112.00", pct: "+3.6%", isWin: true, time: "3h 25m ago" },
    { pair: "XRP/USDT", exit: "$0.5640", dollarGain: "+$45.80", pct: "+1.9%", isWin: true, time: "4h 40m ago" }
  ];

  container.innerHTML = realizedList.map(hit => `
    <div class="tp-hit-item">
      <span><b>${hit.pair}</b> <span style="font-size:0.58rem; color:var(--text-muted);">${hit.time}</span></span>
      <span class="${hit.isWin ? 'green' : 'red'}"><b>${hit.dollarGain}</b> (${hit.pct})</span>
    </div>
  `).join('');
}

function renderTradingViewCharts() {
  const parent1 = document.getElementById('chart-1-parent');
  const parent2 = document.getElementById('chart-2-parent');

  if (parent1) parent1.innerHTML = '<div id="tradingview_desktop_1" style="height:100%;width:100%"></div>';
  if (parent2) parent2.innerHTML = '<div id="tradingview_desktop_2" style="height:100%;width:100%"></div>';

  if (typeof TradingView !== "undefined") {
    new TradingView.widget({
      "autosize": true,
      "symbol": "BINANCE:BTCUSDT",
      "interval": "15",
      "timezone": "Etc/UTC",
      "theme": "dark",
      "style": "1",
      "locale": "en",
      "toolbar_bg": "#181A20",
      "container_id": "tradingview_desktop_1"
    });

    new TradingView.widget({
      "autosize": true,
      "symbol": "BINANCE:ETHUSDT",
      "interval": "15",
      "timezone": "Etc/UTC",
      "theme": "dark",
      "style": "1",
      "locale": "en",
      "toolbar_bg": "#181A20",
      "container_id": "tradingview_desktop_2"
    });
  }
}

function changeLayout(layoutType) {
  if (window.innerWidth <= 900) return;

  const chartBox = document.getElementById('chart-box');
  const chart2 = document.getElementById('chart-2-parent');

  if (layoutType === 'split') {
    chartBox.classList.add('split-view');
    chart2.classList.remove('hidden');
  } else {
    chartBox.classList.remove('split-view');
    chart2.classList.add('hidden');
  }
}

function toggleBox(id) {
  const el = document.getElementById(id);
  el.classList.toggle('hidden');
}

function renderLeaderboard() {
  const tbody = document.getElementById('leaderboard-body');
  if (!tbody) return;

  tbody.innerHTML = LEADERBOARD_DATA.map(t => `
    <tr>
      <td><b>#${t.rank}</b></td>
      <td>${t.name}</td>
      <td class="green">+${formatCurrency(t.pnl)}</td>
    </tr>
  `).join('');
}

function toggleAuthMode() {
  isSignUpMode = !isSignUpMode;
  
  const title = document.getElementById('auth-title');
  const sub = document.getElementById('auth-sub');
  const btn = document.getElementById('auth-btn');
  const toggle = document.getElementById('auth-toggle');
  const usernameInput = document.getElementById('auth-username');

  if (isSignUpMode) {
    title.innerText = "Register";
    sub.innerText = "Create terminal credentials";
    btn.innerText = "Sign Up";
    toggle.innerText = "Back to Sign In";
    usernameInput.classList.remove('hidden');
  } else {
    title.innerText = "Sign In";
    sub.innerText = "Access terminal workspace";
    btn.innerText = "Log In";
    toggle.innerText = "Create an account";
    usernameInput.classList.add('hidden');
  }
}

async function handleAuth() {
  const email = document.getElementById('auth-email').value.trim();
  const password = document.getElementById('auth-password').value.trim();
  const username = document.getElementById('auth-username').value.trim();

  if (!email || !password) return alert("Enter email and password.");

  if (isSignUpMode) {
    const { data, error } = await supabaseClient.auth.signUp({ email, password });
    if (error) {
      if (error.status === 429) {
        alert("Email rate limit exceeded. Please wait a moment before trying to sign up again.");
      } else {
        alert(error.message);
      }
      return;
    }

    if (data.user) {
      await createUserProfileRow(data.user.id, username || email.split('@')[0]);
      alert("Account registered successfully!");
      toggleAuthMode();
    }
  } else {
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) return alert(error.message);

    if (data.session) {
      document.getElementById('auth-modal').classList.add('hidden');
      loadUserProfile(data.session.user);
    }
  }
}

async function createUserProfileRow(userId, username) {
  await supabaseClient
    .from('user_profiles')
    .upsert([{ 
      id: userId, 
      username: username, 
      invested_amount: 1000, 
      pnl_percentage: 0.00 
    }], { onConflict: 'id' });
}

async function loadUserProfile(user) {
  let { data } = await supabaseClient.from('user_profiles').select('*').eq('id', user.id).maybeSingle();

  if (!data) {
    const fallbackName = user.email ? user.email.split('@')[0] : "Trader";
    await createUserProfileRow(user.id, fallbackName);
    const res = await supabaseClient.from('user_profiles').select('*').eq('id', user.id).maybeSingle();
    data = res.data;
  }

  const finalUsername = (data && data.username) ? data.username : (user.email ? user.email.split('@')[0] : "Trader");
  
  document.getElementById('account-title').innerText = `${finalUsername.toUpperCase()}'S TRADING ACCOUNT`;
  
  const uidString = user.id ? user.id.replace(/-/g, '').substring(0, 8).toUpperCase() : "88219042";
  document.getElementById('account-uid').innerText = `UID# ${uidString}`;
  
  const invested = (data && data.invested_amount !== null && data.invested_amount !== undefined) ? Number(data.invested_amount) : 1000;
  document.getElementById('invested').innerText = formatCurrency(invested);

  const pnlPercent = (data && data.pnl_percentage !== null && data.pnl_percentage !== undefined) ? Number(data.pnl_percentage) : 0;
  const calculatedPnlAmount = invested * (pnlPercent / 100);
  
  renderAutoCalculatedPnL(calculatedPnlAmount, pnlPercent);
  setupRealtimeSync(user.id);

  initRealTrades();
}

function renderAutoCalculatedPnL(pnlAmount, pnlPercent) {
  const pnlElement = document.getElementById('pnl-card');
  if (!pnlElement) return;

  const isPositive = pnlAmount >= 0;
  const pnlSign = isPositive ? "+$" : "-$";
  
  const formattedDollar = pnlSign + Math.abs(pnlAmount).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  pnlElement.className = `stat-value ${isPositive ? 'green' : 'red'}`;
  pnlElement.innerHTML = `${formattedDollar} <span style="font-size: 0.65rem;">(${isPositive ? '+' : ''}${pnlPercent.toFixed(2)}%)</span>`;
}

function setupRealtimeSync(userId) {
  supabaseClient
    .channel('public:user_profiles')
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'user_profiles',
        filter: `id=eq.${userId}`
      },
      (payload) => {
        const updatedData = payload.new;
        const invested = updatedData.invested_amount !== null ? Number(updatedData.invested_amount) : 1000;
        const pnlPercent = updatedData.pnl_percentage !== null ? Number(updatedData.pnl_percentage) : 0;
        const calculatedPnlAmount = invested * (pnlPercent / 100);
        
        renderAutoCalculatedPnL(calculatedPnlAmount, pnlPercent);
      }
    )
    .subscribe();
}

// Generate Dynamic 8-Hour Position Sets
function generateTradeSetup(tickerObj) {
  const seed = get8HourCycleSeed();
  const isLong = (Math.random() + seed) % 1 > 0.45;

  return {
    symbol: tickerObj.symbol,
    displaySymbol: tickerObj.displaySymbol,
    direction: isLong ? "LONG" : "SHORT",
    leverage: getRandomInt(10, 30),
    timeframe: TIMEFRAMES[Math.floor(Math.random() * TIMEFRAMES.length)],
    status: "ACTIVE",
    entryPrice: 0,
    currentPrice: 0,
    pnlPercent: (Math.random() * 3.0 - 1.5)
  };
}

function initRealTrades() {
  const seed = get8HourCycleSeed();
  const shuffled = [...TICKER_POOL].sort((a, b) => (a.symbol.charCodeAt(0) * seed) - (b.symbol.charCodeAt(0) * seed));
  currentTrades = shuffled.slice(0, 3).map(t => generateTradeSetup(t));
  connectBinanceWebSocket();
}

function connectBinanceWebSocket() {
  if (binanceSocket) binanceSocket.close();

  const streams = currentTrades.map(t => `${t.symbol.toLowerCase()}@ticker`).join('/');
  binanceSocket = new WebSocket(`wss://stream.binance.com:9443/ws/${streams}`);

  binanceSocket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    const livePrice = parseFloat(data.c);

    const trade = currentTrades.find(t => t.symbol === data.s);
    if (trade) {
      if (trade.entryPrice === 0) {
        trade.entryPrice = livePrice;
        trade.currentPrice = livePrice;
      } else {
        trade.currentPrice = livePrice;
        const priceDiffRatio = (trade.currentPrice - trade.entryPrice) / trade.entryPrice;
        const directionMultiplier = trade.direction === "LONG" ? 1 : -1;
        
        let calculatedPnL = priceDiffRatio * trade.leverage * 100 * directionMultiplier;

        if (calculatedPnL <= -8.0) {
          trade.pnlPercent = -8.00;
          trade.status = "STOPPED (-8% SL)";
        } else {
          trade.pnlPercent = calculatedPnL;
          trade.status = "ACTIVE";
        }
      }

      renderTrades();
    }
  };
}

function renderTrades() {
  const container = document.getElementById('trades-container');
  if (!container) return;

  container.innerHTML = currentTrades.map(trade => {
    const isPos = trade.pnlPercent >= 0;
    const badgeDirection = trade.direction === "LONG" ? "badge-long" : "badge-short";
    
    const isStopped = trade.status.includes("STOPPED");
    const statusBadge = isStopped 
      ? `<span class="badge badge-stopped">CUT LOSS (-8%)</span>`
      : `<span class="badge badge-active">ACTIVE</span>`;

    let formattedPrice = "Syncing";
    if (trade.currentPrice > 0) {
      formattedPrice = trade.currentPrice < 1 
        ? "$" + trade.currentPrice.toFixed(4) 
        : "$" + trade.currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    return `
      <div class="trade-card">
        <div class="trade-row-top">
          <span class="symbol-name">${trade.displaySymbol} <span class="badge ${badgeDirection}">${trade.direction} ${trade.leverage}x</span></span>
          ${statusBadge}
        </div>
        <div class="trade-row-bottom">
          <span class="price-text">${formattedPrice} • ${trade.timeframe}</span>
          <span class="pnl-text ${isPos ? 'green' : 'red'}">${isPos ? '+' : ''}${trade.pnlPercent.toFixed(2)}%</span>
        </div>
      </div>
    `;
  }).join('');
}

async function logout() {
  if (binanceSocket) binanceSocket.close();
  await supabaseClient.auth.signOut();
  window.location.reload();
}