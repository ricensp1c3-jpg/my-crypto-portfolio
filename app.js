// Supabase Configuration
const SUPABASE_URL = "https://obdkqdfalmqnebrmtzwh.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9iZGtxZGZhbG1xbmVicm10endoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYzMjc3NjksImV4cCI6MjEwMTkwMzc2OX0.0-cSxWTrAyNMrQQtaEaXlZPzyP_0nZzad0738-DRbDo"; 

const { createClient } = window.supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let isSignUpMode = false;
let pnlInterval = null;
let currentPercent = 0.0;
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

// Leaderboard: Top 10
const LEADERBOARD_DATA = [
  { rank: 1, name: "CryptoWhale_X", pnl: 27955.00 },
  { rank: 2, name: "AlphaTrader99", pnl: 25840.45 },
  { rank: 3, name: "SatoshiDream", pnl: 24190.20 },
  { rank: 4, name: "BullishViper", pnl: 22755.80 },
  { rank: 5, name: "ApexScalper", pnl: 21310.15 },
  { rank: 6, name: "NovaTrader_88", pnl: 19840.90 },
  { rank: 7, name: "ZenithTrades", pnl: 18695.40 },
  { rank: 8, name: "ShadowMargin", pnl: 17412.60 },
  { rank: 9, name: "QuantumCap", pnl: 16580.30 },
  { rank: 10, name: "MatrixBull", pnl: 15651.00 }
];

// 5 Successful Take Profit Hits (Last 5 Hours)
const TP_HITS_DATA = [
  { pair: "BTC/USDT", type: "SHORT (2nd Res Touch)", entry: "$69,450.00", tp: "$68,100.00", profit: "+182.5%", time: "42m ago" },
  { pair: "ETH/USDT", type: "LONG (2nd Supp Touch)", entry: "$2,610.00", tp: "$2,715.00", profit: "+148.2%", time: "1h 15m ago" },
  { pair: "SOL/USDT", type: "SHORT (2nd Res Touch)", entry: "$152.80", tp: "$145.20", profit: "+210.4%", time: "2h 30m ago" },
  { pair: "BNB/USDT", type: "LONG (2nd Supp Touch)", entry: "$574.00", tp: "$598.00", profit: "+125.0%", time: "3h 40m ago" },
  { pair: "XRP/USDT", type: "SHORT (2nd Res Touch)", entry: "$0.5820", tp: "$0.5410", profit: "+195.8%", time: "4h 50m ago" }
];

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function formatCurrency(amount) {
  return "$" + Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

document.addEventListener('DOMContentLoaded', async () => {
  const toggleBtn = document.getElementById('auth-toggle');
  const authBtn = document.getElementById('auth-btn');

  if (toggleBtn) toggleBtn.addEventListener('click', toggleAuthMode);
  if (authBtn) authBtn.addEventListener('click', handleAuth);

  renderTradingViewCharts();
  renderLeaderboard();
  renderTpHits();

  const { data: { session } } = await supabaseClient.auth.getSession();
  
  if (session) {
    document.getElementById('auth-modal').classList.add('hidden');
    loadUserProfile(session.user);
  } else {
    document.getElementById('auth-modal').classList.remove('hidden');
  }
});

// Load TradingView Charts
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

function renderTpHits() {
  const container = document.getElementById('tp-hits-container');
  if (!container) return;

  container.innerHTML = TP_HITS_DATA.map(hit => `
    <div class="tp-hit-item">
      <span><b>${hit.pair}</b> <span style="font-size:0.58rem; color:var(--text-muted);">${hit.time}</span></span>
      <span class="green"><b>${hit.tp}</b> (${hit.profit})</span>
    </div>
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
    if (error) return alert(error.message);

    if (data.user) {
      await createUserProfileRow(data.user.id, username || email.split('@')[0]);
      alert("Account registered!");
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
    .upsert([{ id: userId, username: username, invested_amount: 1000, pnl_amount: 0, pnl_percentage: 0 }], { onConflict: 'id' });
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
  
  // Set Account Name
  document.getElementById('account-title').innerText = `${finalUsername.toUpperCase()}'S TRADING ACCOUNT`;
  
  // Format and set UID based on registered user.id
  const uidString = user.id ? user.id.replace(/-/g, '').substring(0, 8).toUpperCase() : "88219042";
  document.getElementById('account-uid').innerText = `UID# ${uidString}`;
  
  const invested = Number(data && data.invested_amount > 0 ? data.invested_amount : 1000);
  document.getElementById('invested').innerText = formatCurrency(invested);

  startSmoothPnL(invested);
  initRealTrades();
}

// REALISTIC SCALPING P&L ENGINE
function startSmoothPnL(investedAmount) {
  if (pnlInterval) clearInterval(pnlInterval);

  currentPercent = (Math.random() * (4.2 - (-2.1)) + (-2.1));
  let scalpTrendBias = (Math.random() - 0.48) * 0.12; 

  function updateTicker() {
    const microStep = (Math.random() * 0.18 - 0.08) + scalpTrendBias;
    currentPercent += microStep;

    if (currentPercent > 12.5) {
      scalpTrendBias = -0.08;
    } else if (currentPercent < -8.5) {
      scalpTrendBias = 0.08;
    }

    const formattedPercent = currentPercent.toFixed(2);
    const calculatedPnlDollar = (investedAmount * (currentPercent / 100));

    const pnlElement = document.getElementById('pnl-card');
    const isPositive = currentPercent >= 0;
    const pnlSign = isPositive ? "+$" : "-$";
    
    const formattedDollar = pnlSign + Math.abs(calculatedPnlDollar).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });

    pnlElement.className = `stat-value ${isPositive ? 'green' : 'red'}`;
    pnlElement.innerHTML = `${formattedDollar} <span style="font-size: 0.65rem;">(${isPositive ? '+' : ''}${formattedPercent}%)</span>`;
  }

  updateTicker();
  pnlInterval = setInterval(updateTicker, 1500);
}

// Generate Realistic Scalping Positions
function generateTradeSetup(tickerObj) {
  const isLong = Math.random() > 0.45;
  return {
    symbol: tickerObj.symbol,
    displaySymbol: tickerObj.displaySymbol,
    direction: isLong ? "LONG" : "SHORT",
    leverage: getRandomInt(10, 50),
    timeframe: TIMEFRAMES[Math.floor(Math.random() * TIMEFRAMES.length)],
    status: "ACTIVE",
    entryPrice: 0,
    currentPrice: 0,
    pnlPercent: (Math.random() * 3.5 - 1.2),
    trendMomentum: (Math.random() - 0.48) * 0.0003
  };
}

function initRealTrades() {
  const shuffled = [...TICKER_POOL].sort(() => 0.5 - Math.random());
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
        
        trade.pnlPercent = priceDiffRatio * trade.leverage * 100 * directionMultiplier;
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
    
    const statusBadge = `<span class="badge badge-active">ACTIVE</span>`;

    let formattedPrice = "Syncing...";
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
  if (pnlInterval) clearInterval(pnlInterval);
  if (binanceSocket) binanceSocket.close();
  await supabaseClient.auth.signOut();
  window.location.reload();
}