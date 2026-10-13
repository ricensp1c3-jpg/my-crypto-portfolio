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
  // Signals are now fetched only after subscription access is verified.

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

  renderDynamicSignals(seed);
}

// Render Exactly 1 Unlocked Signal + 1 Set of 3 Locked Signals with Overlay
function renderTradingViewCharts() {
  const parent1 = document.getElementById('chart-1-parent');
  const parent2 = document.getElementById('chart-2-parent');

  if (parent1) parent1.innerHTML = '<div id="tradingview_desktop_1" style="height:100%;width:100%"></div>';
  if (parent2) parent2.innerHTML = '<div id="tradingview_desktop_2" style="height:100%;width:100%"></div>';

  if (typeof TradingView !== "undefined") {
    // Primary Chart Widget (Unlocked for all assets: Stocks, Crypto, Forex, etc.)
    new TradingView.widget({
      "autosize": true,
      "symbol": siteContent.chart1_symbol || "BINANCE:BTCUSDT",
      "interval": siteContent.chart_interval || "15",
      "timezone": "Etc/UTC",
      "theme": "dark",
      "style": "1",
      "locale": "en",
      "toolbar_bg": "#181A20",
      "enable_publishing": false,
      "allow_symbol_change": true,
      "studies": ["STD;RSI", "STD;MACD"], // Built-in TradingView indicators
      "container_id": "tradingview_desktop_1"
    });

    // Secondary Chart Widget (For Split View)
    new TradingView.widget({
      "autosize": true,
      "symbol": siteContent.chart2_symbol || "BINANCE:ETHUSDT",
      "interval": siteContent.chart_interval || "15",
      "timezone": "Etc/UTC",
      "theme": "dark",
      "style": "1",
      "locale": "en",
      "toolbar_bg": "#181A20",
      "enable_publishing": false,
      "allow_symbol_change": true,
      "studies": ["STD;RSI", "STD;MACD"], // Built-in TradingView indicators
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

// ==========================================
// EDITABLE SITE CONTENT + SECURE SUBSCRIBER SIGNALS
// Site text/config is stored in Supabase `site_content`.
// Signal records are fetched only for active subscribers; RLS must be installed.
let activeUser = null;
let siteContent = {
  pax_presale_percent: 100,
  pax_presale_status: "Funding target reached",
  pax_presale_label: "100% FULLY FUNDED",
  notice_text: "Website information and announcements are managed by the site administrator.",
  subscriber_count: "—",
  win_rate: "—",
  subscription_url: "#",
  chart1_symbol: "BINANCE:BTCUSDT",
  chart2_symbol: "BINANCE:ETHUSDT",
  chart_interval: "15"
};

async function fetchSiteContent() {
  const { data, error } = await supabaseClient.from("site_content").select("key,value");
  if (error) {
    console.warn("Site content table not configured yet:", error.message);
    return;
  }
  (data || []).forEach(row => {
    try { siteContent[row.key] = typeof row.value === "string" ? JSON.parse(row.value) : row.value; }
    catch (_) { siteContent[row.key] = row.value; }
  });
  applySiteContent();
}

function applySiteContent() {
  const pct = Math.max(0, Math.min(100, Number(siteContent.pax_presale_percent ?? 100)));
  const fill = document.getElementById("pax-progress-fill");
  const label = document.getElementById("pax-funded-label");
  const progress = document.getElementById("pax-progress-label");
  const status = document.getElementById("pax-presale-status");
  if (fill) fill.style.width = pct + "%";
  if (label) label.textContent = siteContent.pax_presale_label || (pct + "% FUNDED");
  if (progress) progress.textContent = pct + "%";
  if (status) status.textContent = siteContent.pax_presale_status || "";
  const subscribe = document.getElementById("subscribe-link");
  if (subscribe) subscribe.href = siteContent.subscription_url || "#";
  const winRate = document.getElementById("dynamic-winrate");
  if (winRate && siteContent.win_rate !== undefined) winRate.textContent = String(siteContent.win_rate).includes("%") ? siteContent.win_rate : siteContent.win_rate + "%";
  const activeSubLabel = document.querySelectorAll(".stat-card .stat-value");
  if (activeSubLabel.length >= 3 && siteContent.subscriber_count !== undefined) activeSubLabel[2].textContent = siteContent.subscriber_count + " Accounts";
  const notice = document.querySelector(".notice-box");
  if (notice && siteContent.notice_text) {
    notice.innerHTML = `<div class="notice-title"><span>⚠️ Terminal Notice</span><span>UPDATED</span></div><div style="white-space:pre-wrap">${escapeHtml(String(siteContent.notice_text))}</div>`;
  }
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, ch => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[ch]));
}

async function checkSubscriptionAndRenderSignals(user) {
  activeUser = user || null;
  const locked = document.getElementById("signals-access");
  if (!user) {
    if (locked) locked.innerHTML = lockedSignalsMarkup();
    setSignalPanelsVisible(false);
    return;
  }

  const { data: adminRow } = await supabaseClient
    .from("site_admins").select("user_id").eq("user_id", user.id).maybeSingle();
  const isAdmin = !!adminRow;
  const adminTools = document.getElementById("admin-tools");
  if (adminTools) adminTools.classList.toggle("hidden", !isAdmin);

  const { data: subscription } = await supabaseClient
    .from("subscriptions").select("active,expires_at").eq("user_id", user.id).maybeSingle();
  const notExpired = !subscription?.expires_at || new Date(subscription.expires_at).getTime() > Date.now();
  const hasAccess = isAdmin || (!!subscription?.active && notExpired);

  if (!hasAccess) {
    if (locked) locked.innerHTML = lockedSignalsMarkup();
    setSignalPanelsVisible(false);
    return;
  }

  setSignalPanelsVisible(true);
  const { data: signals, error } = await supabaseClient.from("trading_signals")
    .select("id,symbol,direction,leverage,reason,entry_price,take_profit,stop_loss,active,created_at")
    .eq("active", true).order("created_at", { ascending: false }).limit(20);
  if (error) {
    if (locked) locked.innerHTML = `<p style="font-size:.7rem;color:var(--text-muted)">Signal database setup is required. See README-SETUP.txt.</p>`;
    return;
  }
  if (!signals || !signals.length) {
    if (locked) locked.innerHTML = `<p style="font-size:.72rem;color:var(--text-muted)">No active signals published.</p>`;
    return;
  }
  if (locked) locked.innerHTML = `<table class="signal-table"><thead><tr><th>Asset / Direction</th><th>Entry</th><th>TP</th><th>SL</th></tr></thead><tbody>${signals.map(s => `
    <tr><td><b>${escapeHtml(s.symbol || "")}</b><br><span class="${String(s.direction).toUpperCase()==="LONG"?"green":"red"}">${escapeHtml(s.direction || "")}${s.leverage ? " "+Number(s.leverage)+"x" : ""}</span><br><span style="color:var(--text-muted)">${escapeHtml(s.reason || "")}</span></td>
    <td>${escapeHtml(String(s.entry_price ?? "—"))}</td><td class="green">${escapeHtml(String(s.take_profit ?? "—"))}</td><td class="red">${escapeHtml(String(s.stop_loss ?? "—"))}</td></tr>`).join("")}</tbody></table>`;
}

function lockedSignalsMarkup() {
  return `<div class="signals-locked"><div style="font-size:1.4rem">🔒</div><b>Subscriber access required</b><p>Trading signals and active positions are available only to accounts with an active subscription.</p><a id="subscribe-link" href="${escapeHtml(String(siteContent.subscription_url || "#"))}" target="_blank" rel="noopener" class="subscribe-button">View Subscription Options</a></div>`;
}

function setSignalPanelsVisible(visible) {
  ["active-positions-title", "trades-container", "confluence-panel"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.toggle("hidden", !visible);
  });
  // The active position generator contains demo calculations; stop displaying those until real admin-managed records are used.
  const trades = document.getElementById("trades-container");
  if (trades && !visible) trades.innerHTML = "";
}

async function editSiteContent() {
  if (!activeUser) return alert("Please sign in first.");
  const { data: adminRow } = await supabaseClient.from("site_admins").select("user_id").eq("user_id", activeUser.id).maybeSingle();
  if (!adminRow) return alert("Admin access required.");
  const fields = [
    ["pax_presale_percent", "PAX presale funded percentage (0–100)"],
    ["pax_presale_label", "PAX banner label"],
    ["pax_presale_status", "PAX status text"],
    ["notice_text", "Terminal notice text"],
    ["subscriber_count", "Subscriber count display"],
    ["win_rate", "Win rate display"],
    ["subscription_url", "Subscription URL"],
    ["chart1_symbol", "Desktop chart 1 symbol (TradingView, e.g. BINANCE:BTCUSDT)"],
    ["chart2_symbol", "Desktop chart 2 symbol (TradingView, e.g. BINANCE:ETHUSDT)"],
    ["chart_interval", "Chart interval (e.g. 1, 5, 15, 60, 240, D)"]
  ];
  for (const [key, promptText] of fields) {
    const current = siteContent[key] ?? "";
    const next = window.prompt(promptText, String(current));
    if (next === null) return;
    const value = key === "pax_presale_percent" ? Math.max(0, Math.min(100, Number(next) || 0)) : next;
    const { error } = await supabaseClient.from("site_content").upsert({ key, value }, { onConflict: "key" });
    if (error) return alert("Could not save " + key + ": " + error.message);
    siteContent[key] = value;
  }
  applySiteContent();
  alert("Site information saved. Chart symbol changes apply after refreshing the page.");
}

const originalLoadUserProfile = loadUserProfile;
loadUserProfile = async function(user) {
  await originalLoadUserProfile(user);
  await checkSubscriptionAndRenderSignals(user);
};

document.addEventListener("DOMContentLoaded", async () => {
  await fetchSiteContent();
  // Desktop opens with two side-by-side charts. CSS forces one chart on phones.
  if (window.innerWidth > 900) {
    const selector = document.getElementById("layout-select");
    if (selector) selector.value = "split";
    changeLayout("split");
  } else {
    changeLayout("single");
  }
});
