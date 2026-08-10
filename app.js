// Supabase Configuration
const SUPABASE_URL = "https://obdkqdfalmqnebrmtzwh.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9iZGtxZGZhbG1xbmVicm10endoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYzMjc3NjksImV4cCI6MjEwMTkwMzc2OX0.0-cSxWTrAyNMrQQtaEaXlZPzyP_0nZzad0738-DRbDo"; 

const { createClient } = window.supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let isSignUpMode = false;
let pnlInterval = null;
let currentPercent = 0.0;
let binanceSocket = null;
let currentTheme = "dark";

const TICKER_POOL = [
  { symbol: "BTCUSDT", displaySymbol: "BTC/USDT" },
  { symbol: "ETHUSDT", displaySymbol: "ETH/USDT" },
  { symbol: "SOLUSDT", displaySymbol: "SOL/USDT" },
  { symbol: "BNBUSDT", displaySymbol: "BNB/USDT" },
  { symbol: "XRPUSDT", displaySymbol: "XRP/USDT" },
  { symbol: "ADAUSDT", displaySymbol: "ADA/USDT" }
];

const TIMEFRAMES = ["2h", "4h", "8h", "12h"];
let currentTrades = [];

const LEADERBOARD_DATA = [
  { rank: 1, name: "CryptoWhale_X", pnl: 77000 },
  { rank: 2, name: "AlphaTrader99", pnl: 71400 },
  { rank: 3, name: "SatoshiDream", pnl: 65800 },
  { rank: 4, name: "BullishViper", pnl: 61200 },
  { rank: 5, name: "ApexScalper", pnl: 56900 },
  { rank: 6, name: "NovaTrader_88", pnl: 52100 },
  { rank: 7, name: "ZenithTrades", pnl: 48300 },
  { rank: 8, name: "ShadowMargin", pnl: 44000 },
  { rank: 9, name: "QuantumCap", pnl: 40500 },
  { rank: 10, name: "MatrixBull", pnl: 37200 },
  { rank: 11, name: "Vanguard_K", pnl: 34100 },
  { rank: 12, name: "SolanaKing", pnl: 31000 },
  { rank: 13, name: "CyberTrader7", pnl: 28400 },
  { rank: 14, name: "HyperTrend", pnl: 25900 },
  { rank: 15, name: "DeltaHedge_M", pnl: 23200 },
  { rank: 16, name: "OrbitalTrades", pnl: 21000 },
  { rank: 17, name: "KryptoKnight", pnl: 19100 },
  { rank: 18, name: "MacroRider", pnl: 17300 },
  { rank: 19, name: "VeloxTrade", pnl: 15600 },
  { rank: 20, name: "AeroTrader_J", pnl: 14119 }
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

  renderTradingViewCharts(currentTheme);
  renderLeaderboard();

  const { data: { session } } = await supabaseClient.auth.getSession();
  
  if (session) {
    document.getElementById('auth-modal').classList.add('hidden');
    loadUserProfile(session.user);
  } else {
    document.getElementById('auth-modal').classList.remove('hidden');
  }
});

// Explicit Widget Re-Mount Engine to Fix White Screens
function renderTradingViewCharts(themeName) {
  const tvTheme = (themeName === "light") ? "light" : "dark";
  const bgColor = (themeName === "light") ? "#FFFFFF" : (themeName === "cyberpunk" ? "#0D0E24" : "#181A20");

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
      "theme": tvTheme,
      "style": "1",
      "locale": "en",
      "toolbar_bg": bgColor,
      "container_id": "tradingview_desktop_1"
    });

    new TradingView.widget({
      "autosize": true,
      "symbol": "BINANCE:ETHUSDT",
      "interval": "15",
      "timezone": "Etc/UTC",
      "theme": tvTheme,
      "style": "1",
      "locale": "en",
      "toolbar_bg": bgColor,
      "container_id": "tradingview_desktop_2"
    });
  }
}

function changeTheme(themeName) {
  currentTheme = themeName;
  document.body.setAttribute('data-theme', themeName);
  renderTradingViewCharts(themeName);
}

function changeLayout(layoutType) {
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
      <td class="green">+$${t.pnl.toLocaleString()}</td>
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
  
  document.getElementById('account-title').innerText = `${finalUsername.toUpperCase()}'S TRADING ACCOUNT`;
  
  const invested = Number(data && data.invested_amount > 0 ? data.invested_amount : 1000);
  document.getElementById('invested').innerText = formatCurrency(invested);

  startSmoothPnL(invested);
  initRealTrades();
}

function startSmoothPnL(investedAmount) {
  if (pnlInterval) clearInterval(pnlInterval);

  currentPercent = (Math.random() * (11 - (-14)) + (-14));

  function updateTicker() {
    const minPercent = -14.0;
    const maxPercent = 11.0;

    const delta = (Math.random() * 2.4 - 1.2);
    currentPercent += delta;

    if (currentPercent > maxPercent) currentPercent = maxPercent - Math.random() * 0.5;
    if (currentPercent < minPercent) currentPercent = minPercent + Math.random() * 0.5;

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
  pnlInterval = setInterval(updateTicker, 3000);
}

function generateTradeSetup(tickerObj) {
  return {
    symbol: tickerObj.symbol,
    displaySymbol: tickerObj.displaySymbol,
    direction: Math.random() > 0.45 ? "LONG" : "SHORT",
    leverage: getRandomInt(9, 105),
    timeframe: TIMEFRAMES[Math.floor(Math.random() * TIMEFRAMES.length)],
    status: Math.random() > 0.15 ? "ACTIVE" : "INACTIVE",
    entryPrice: 0,
    currentPrice: 0,
    pnlPercent: 0
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
      if (trade.entryPrice === 0) trade.entryPrice = livePrice;
      trade.currentPrice = livePrice;

      if (trade.entryPrice > 0 && trade.status === "ACTIVE") {
        const priceDiffRatio = (trade.currentPrice - trade.entryPrice) / trade.entryPrice;
        const multiplier = trade.direction === "LONG" ? 1 : -1;
        trade.pnlPercent = priceDiffRatio * trade.leverage * 100 * multiplier;
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
    const statusBadge = trade.status === "ACTIVE" 
      ? `<span class="badge badge-active">ACT</span>` 
      : `<span class="badge badge-inactive">OFF</span>`;

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