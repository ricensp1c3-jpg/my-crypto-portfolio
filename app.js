// 1. Supabase Initialization
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
  { symbol: "ADAUSDT", displaySymbol: "ADA/USDT" },
  { symbol: "AVAXUSDT", displaySymbol: "AVAX/USDT" },
  { symbol: "DOGEUSDT", displaySymbol: "DOGE/USDT" }
];

const TIMEFRAMES = ["2h", "4h", "8h", "12h"];
let currentTrades = [];

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Strict currency formatter: Always forces .00
function formatCurrency(amount) {
  return "$" + Number(amount).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

// 2. DOM Loaded Event
document.addEventListener('DOMContentLoaded', async () => {
  const toggleBtn = document.getElementById('auth-toggle');
  const authBtn = document.getElementById('auth-btn');

  if (toggleBtn) toggleBtn.addEventListener('click', toggleAuthMode);
  if (authBtn) authBtn.addEventListener('click', handleAuth);

  // Initialize Desktop and Interactive Mobile Chart Widgets
  initTradingViewCharts();

  const { data: { session } } = await supabaseClient.auth.getSession();
  
  if (session) {
    document.getElementById('auth-modal').classList.add('hidden');
    loadUserProfile(session.user);
  } else {
    document.getElementById('auth-modal').classList.remove('hidden');
  }
});

// 3. TradingView Chart Initialization with Touch Interactivity
function initTradingViewCharts() {
  if (typeof TradingView !== "undefined") {
    // Desktop Chart Panel
    new TradingView.widget({
      "autosize": true,
      "symbol": "BINANCE:BTCUSDT",
      "interval": "15",
      "timezone": "Etc/UTC",
      "theme": "dark",
      "style": "1",
      "locale": "en",
      "toolbar_bg": "#181a20",
      "enable_publishing": false,
      "allow_symbol_change": true,
      "container_id": "tradingview_desktop"
    });

    // Mobile Chart (Interactive gestures enabled)
    new TradingView.widget({
      "autosize": true,
      "symbol": "BINANCE:BTCUSDT",
      "interval": "15",
      "timezone": "Etc/UTC",
      "theme": "dark",
      "style": "1",
      "locale": "en",
      "toolbar_bg": "#181a20",
      "enable_publishing": false,
      "allow_symbol_change": true,
      "container_id": "tradingview_mobile",
      "hide_side_toolbar": true
    });
  }
}

// 4. Toggle Auth Mode
function toggleAuthMode() {
  isSignUpMode = !isSignUpMode;
  
  const title = document.getElementById('auth-title');
  const sub = document.getElementById('auth-sub');
  const btn = document.getElementById('auth-btn');
  const toggle = document.getElementById('auth-toggle');
  const usernameInput = document.getElementById('auth-username');

  if (isSignUpMode) {
    title.innerText = "Register Account";
    sub.innerText = "Create terminal credentials";
    btn.innerText = "Sign Up";
    toggle.innerText = "Back to Sign In";
    usernameInput.classList.remove('hidden');
  } else {
    title.innerText = "Sign In";
    sub.innerText = "Access your trading account";
    btn.innerText = "Log In";
    toggle.innerText = "Create an account";
    usernameInput.classList.add('hidden');
  }
}

// 5. Auth Action Handler
async function handleAuth() {
  const email = document.getElementById('auth-email').value.trim();
  const password = document.getElementById('auth-password').value.trim();
  const username = document.getElementById('auth-username').value.trim();

  if (!email || !password) {
    alert("Please enter email and password.");
    return;
  }

  if (isSignUpMode) {
    const { data, error } = await supabaseClient.auth.signUp({ email, password });
    if (error) return alert("Error: " + error.message);

    if (data.user) {
      await createUserProfileRow(data.user.id, username || email.split('@')[0]);
      alert("Registration successful!");
      toggleAuthMode();
    }
  } else {
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) return alert("Login Error: " + error.message);

    if (data.session) {
      document.getElementById('auth-modal').classList.add('hidden');
      loadUserProfile(data.session.user);
    }
  }
}

async function createUserProfileRow(userId, username) {
  const { error } = await supabaseClient
    .from('user_profiles')
    .upsert([{ id: userId, username: username, invested_amount: 1000, pnl_amount: 0, pnl_percentage: 0 }], { onConflict: 'id' });
  if (error) console.error("Profile creation error:", error.message);
}

// 6. Profile Loader
async function loadUserProfile(user) {
  try {
    let { data } = await supabaseClient.from('user_profiles').select('*').eq('id', user.id).maybeSingle();

    if (!data) {
      const fallbackName = user.email ? user.email.split('@')[0] : "Trader";
      await createUserProfileRow(user.id, fallbackName);
      const res = await supabaseClient.from('user_profiles').select('*').eq('id', user.id).maybeSingle();
      data = res.data;
    }

    const finalUsername = (data && data.username) ? data.username : (user.email ? user.email.split('@')[0] : "Trader");
    
    // Updates Header Title to: "[USERNAME]'s Trading Account"
    document.getElementById('account-title').innerText = `${finalUsername.toUpperCase()}'s Trading Account`;
    
    const invested = Number(data && data.invested_amount > 0 ? data.invested_amount : 1000);
    // Display Invested Amount always ending in .00
    document.getElementById('invested').innerText = formatCurrency(invested);

    startSmoothPnL(invested);
    initRealTrades();

  } catch (err) {
    console.error("Execution error:", err);
  }
}

// 7. Smooth Overall P&L Generator (Always with .00 formatting)
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
    
    // Format dollar amount with forced .00 decimals
    const formattedDollar = pnlSign + Math.abs(calculatedPnlDollar).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });

    pnlElement.className = `stat-value ${isPositive ? 'green' : 'red'}`;
    pnlElement.innerHTML = `${formattedDollar} <span style="font-size: 0.7rem;">(${isPositive ? '+' : ''}${formattedPercent}%)</span>`;
  }

  updateTicker();
  pnlInterval = setInterval(updateTicker, 3000);
}

// 8. Live WebSocket Positions Engine
function generateTradeSetup(tickerObj) {
  const isLong = Math.random() > 0.45;
  const leverage = getRandomInt(9, 105);
  const tf = TIMEFRAMES[Math.floor(Math.random() * TIMEFRAMES.length)];
  const isActive = Math.random() > 0.15;

  return {
    symbol: tickerObj.symbol,
    displaySymbol: tickerObj.displaySymbol,
    direction: isLong ? "LONG" : "SHORT",
    leverage: leverage,
    timeframe: tf,
    status: isActive ? "ACTIVE" : "INACTIVE",
    entryPrice: 0,
    currentPrice: 0,
    pnlPercent: 0
  };
}

function initRealTrades() {
  const shuffled = [...TICKER_POOL].sort(() => 0.5 - Math.random());
  const selectedTickers = shuffled.slice(0, 4);

  currentTrades = selectedTickers.map(t => generateTradeSetup(t));
  connectBinanceWebSocket();
}

function connectBinanceWebSocket() {
  if (binanceSocket) binanceSocket.close();

  const streams = currentTrades.map(t => `${t.symbol.toLowerCase()}@ticker`).join('/');
  const wsUrl = `wss://stream.binance.com:9443/ws/${streams}`;

  binanceSocket = new WebSocket(wsUrl);

  binanceSocket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    const symbol = data.s;
    const livePrice = parseFloat(data.c);

    const trade = currentTrades.find(t => t.symbol === symbol);
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

  container.innerHTML = "";

  currentTrades.forEach(trade => {
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

    const html = `
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

    container.innerHTML += html;
  });
}

// 9. Logout
async function logout() {
  if (pnlInterval) clearInterval(pnlInterval);
  if (binanceSocket) binanceSocket.close();
  await supabaseClient.auth.signOut();
  window.location.reload();
}