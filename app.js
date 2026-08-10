// 1. Supabase Initialization
const SUPABASE_URL = "https://obdkqdfalmqnebrmtzwh.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9iZGtxZGZhbG1xbmVicm10endoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYzMjc3NjksImV4cCI6MjEwMTkwMzc2OX0.0-cSxWTrAyNMrQQtaEaXlZPzyP_0nZzad0738-DRbDo"; 

const { createClient } = window.supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let isSignUpMode = false;
let pnlInterval = null;
let currentPercent = 0.0;
let binanceSocket = null;

// Pool of perpetual symbols to pick from
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

// Helper: Random Integer
function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// 2. DOM Loaded Event
document.addEventListener('DOMContentLoaded', async () => {
  const toggleBtn = document.getElementById('auth-toggle');
  const authBtn = document.getElementById('auth-btn');

  if (toggleBtn) toggleBtn.addEventListener('click', toggleAuthMode);
  if (authBtn) authBtn.addEventListener('click', handleAuth);

  const { data: { session } } = await supabaseClient.auth.getSession();
  
  if (session) {
    document.getElementById('auth-modal').classList.add('hidden');
    loadUserProfile(session.user);
  } else {
    document.getElementById('auth-modal').classList.remove('hidden');
  }
});

// 3. Toggle Auth
function toggleAuthMode() {
  isSignUpMode = !isSignUpMode;
  
  const title = document.getElementById('auth-title');
  const sub = document.getElementById('auth-sub');
  const btn = document.getElementById('auth-btn');
  const toggle = document.getElementById('auth-toggle');
  const usernameInput = document.getElementById('auth-username');

  if (isSignUpMode) {
    title.innerText = "Create Account";
    sub.innerText = "Register to start managing your portfolio";
    btn.innerText = "Sign Up";
    toggle.innerText = "Already have an account? Log In";
    usernameInput.classList.remove('hidden');
  } else {
    title.innerText = "Welcome Back";
    sub.innerText = "Log in to view your trading portfolio";
    btn.innerText = "Log In";
    toggle.innerText = "Don't have an account? Register";
    usernameInput.classList.add('hidden');
  }
}

// 4. Auth Handler
async function handleAuth() {
  const email = document.getElementById('auth-email').value.trim();
  const password = document.getElementById('auth-password').value.trim();
  const username = document.getElementById('auth-username').value.trim();

  if (!email || !password) {
    alert("Please enter both email and password.");
    return;
  }

  if (isSignUpMode) {
    const { data, error } = await supabaseClient.auth.signUp({ email, password });
    if (error) return alert("Registration Error: " + error.message);

    if (data.user) {
      await createUserProfileRow(data.user.id, username || email.split('@')[0]);
      alert("Registration successful! You can now log in.");
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

// Helper: Create Profile Row
async function createUserProfileRow(userId, username) {
  const { error } = await supabaseClient
    .from('user_profiles')
    .upsert([{ id: userId, username: username, invested_amount: 1000, pnl_amount: 0, pnl_percentage: 0 }], { onConflict: 'id' });
  if (error) console.error("Error creating profile:", error.message);
}

// 5. Load User Profile & Initialize Real-Time Data
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
    document.getElementById('username').innerText = finalUsername;
    
    const invested = Number(data && data.invested_amount > 0 ? data.invested_amount : 1000);
    document.getElementById('invested').innerText = "$" + invested.toLocaleString();

    startSmoothPnL(invested);
    initRealTrades();

  } catch (err) {
    console.error("Script execution error:", err);
    document.getElementById('username').innerText = user.email ? user.email.split('@')[0] : "Trader";
  }
}

// 6. Smooth Moving P&L Generator (-14% to +11%)
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
    const calculatedPnlDollar = (investedAmount * (currentPercent / 100)).toFixed(2);

    const pnlElement = document.getElementById('pnl-card');
    const isPositive = currentPercent >= 0;
    const pnlSign = isPositive ? "+$" : "-$";
    const formattedDollar = pnlSign + Math.abs(calculatedPnlDollar).toLocaleString();

    pnlElement.className = isPositive ? "green" : "red";
    pnlElement.innerHTML = `${formattedDollar} (<span id="pnl-percent">${isPositive ? '+' : ''}${formattedPercent}%</span>)`;
  }

  updateTicker();
  pnlInterval = setInterval(updateTicker, 3000);
}

// 7. REAL-TIME BINANCE WEBSOCKET TRADES ENGINE
function generateTradeSetup(tickerObj) {
  const isLong = Math.random() > 0.45;
  const leverage = getRandomInt(9, 105);
  const tf = TIMEFRAMES[Math.floor(Math.random() * TIMEFRAMES.length)];
  const isActive = Math.random() > 0.2; // 80% Active

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
  // Select 4 unique random tickers from the pool
  const shuffled = [...TICKER_POOL].sort(() => 0.5 - Math.random());
  const selectedTickers = shuffled.slice(0, 4);

  currentTrades = selectedTickers.map(t => generateTradeSetup(t));

  connectBinanceWebSocket();
}

function connectBinanceWebSocket() {
  if (binanceSocket) binanceSocket.close();

  // Construct Binance multi-stream URL for selected symbols
  const streams = currentTrades.map(t => `${t.symbol.toLowerCase()}@ticker`).join('/');
  const wsUrl = `wss://stream.binance.com:9443/ws/${streams}`;

  binanceSocket = new WebSocket(wsUrl);

  binanceSocket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    const symbol = data.s; // Symbol name e.g., "BTCUSDT"
    const livePrice = parseFloat(data.c); // Real-time close price

    const trade = currentTrades.find(t => t.symbol === symbol);
    if (trade) {
      // Set initial entry price if not set yet
      if (trade.entryPrice === 0) {
        trade.entryPrice = livePrice;
      }
      
      trade.currentPrice = livePrice;

      // Calculate Real P&L Percentage based on Live Price vs Entry Price & Leverage
      if (trade.entryPrice > 0 && trade.status === "ACTIVE") {
        const priceDiffRatio = (trade.currentPrice - trade.entryPrice) / trade.entryPrice;
        const multiplier = trade.direction === "LONG" ? 1 : -1;
        trade.pnlPercent = priceDiffRatio * trade.leverage * 100 * multiplier;
      }

      renderTrades();
    }
  };

  binanceSocket.onerror = (err) => {
    console.error("Binance WebSocket Error:", err);
  };
}

function renderTrades() {
  const container = document.getElementById('trades-container');
  if (!container) return;

  container.innerHTML = "";

  currentTrades.forEach(trade => {
    const isPos = trade.pnlPercent >= 0;
    const dirClass = trade.direction === "LONG" ? "green" : "red";
    const statusBadge = trade.status === "ACTIVE" 
      ? `<span class="badge-active">ACTIVE</span>` 
      : `<span class="badge-inactive">INACTIVE</span>`;

    // Format price display
    let formattedPrice = "Loading...";
    if (trade.currentPrice > 0) {
      formattedPrice = trade.currentPrice < 1 
        ? "$" + trade.currentPrice.toFixed(4) 
        : "$" + trade.currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    const html = `
      <div class="trade-item">
        <div class="trade-header">
          <span>${trade.displaySymbol} <span class="${dirClass}">- ${trade.direction}</span> - x${trade.leverage}</span>
          ${statusBadge}
        </div>
        <div class="trade-details">
          <span>${formattedPrice} (${trade.timeframe})</span>
          <span class="${isPos ? 'green' : 'red'}">${isPos ? '+' : ''}${trade.pnlPercent.toFixed(2)}%</span>
        </div>
      </div>
    `;

    container.innerHTML += html;
  });
}

// 8. Logout
async function logout() {
  if (pnlInterval) clearInterval(pnlInterval);
  if (binanceSocket) binanceSocket.close();
  await supabaseClient.auth.signOut();
  window.location.reload();
}