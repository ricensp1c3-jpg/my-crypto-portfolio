// 1. Supabase Initialization
const SUPABASE_URL = "https://obdkqdfalmqnebrmtzwh.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9iZGtxZGZhbG1xbmVicm10endoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYzMjc3NjksImV4cCI6MjEwMTkwMzc2OX0.0-cSxWTrAyNMrQQtaEaXlZPzyP_0nZzad0738-DRbDo"; 

const { createClient } = window.supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let isSignUpMode = false;
let pnlInterval = null; // Holds the 3-second live ticker timer
let currentPercent = 0.0; // Keeps track of current percentage for realistic stepping

// 2. DOM Loaded Event & Auth Listener Setup
document.addEventListener('DOMContentLoaded', async () => {
  const toggleBtn = document.getElementById('auth-toggle');
  const authBtn = document.getElementById('auth-btn');

  if (toggleBtn) toggleBtn.addEventListener('click', toggleAuthMode);
  if (authBtn) authBtn.addEventListener('click', handleAuth);

  // Check if user is already logged in
  const { data: { session } } = await supabaseClient.auth.getSession();
  
  if (session) {
    document.getElementById('auth-modal').classList.add('hidden');
    loadUserProfile(session.user);
  } else {
    document.getElementById('auth-modal').classList.remove('hidden');
  }
});

// 3. Toggle between Login & Register mode
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

// 4. Handle Login or Signup Action
async function handleAuth() {
  const email = document.getElementById('auth-email').value.trim();
  const password = document.getElementById('auth-password').value.trim();
  const username = document.getElementById('auth-username').value.trim();

  if (!email || !password) {
    alert("Please enter both email and password.");
    return;
  }

  if (isSignUpMode) {
    // REGISTER USER
    const { data, error } = await supabaseClient.auth.signUp({
      email: email,
      password: password
    });

    if (error) {
      alert("Registration Error: " + error.message);
      return;
    }

    if (data.user) {
      await createUserProfileRow(data.user.id, username || email.split('@')[0]);
      alert("Registration successful! You can now log in.");
      toggleAuthMode();
    }
  } else {
    // LOGIN USER
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email: email,
      password: password
    });

    if (error) {
      alert("Login Error: " + error.message);
      return;
    }

    if (data.session) {
      document.getElementById('auth-modal').classList.add('hidden');
      loadUserProfile(data.session.user);
    }
  }
}

// Helper Function: Create user profile row
async function createUserProfileRow(userId, username) {
  const { error } = await supabaseClient
    .from('user_profiles')
    .upsert([
      { 
        id: userId, 
        username: username, 
        invested_amount: 1000, 
        pnl_amount: 0, 
        pnl_percentage: 0, 
        trade_setup_name: "Live Scalping", 
        trade_setup_desc: "Real-time automated strategy tracker." 
      }
    ], { onConflict: 'id' });

  if (error) {
    console.error("Error creating user profile:", error.message);
  }
}

// 5. Fetch Profile & Start Realistic Moving P&L
async function loadUserProfile(user) {
  try {
    let { data, error } = await supabaseClient
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (error) {
      console.error("Supabase fetch error:", error.message);
    }

    // Create profile row if missing
    if (!data) {
      const fallbackName = user.email ? user.email.split('@')[0] : "Trader";
      await createUserProfileRow(user.id, fallbackName);
      
      const res = await supabaseClient
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();
      data = res.data;
    }

    // UPDATE SIDEBAR UI
    const finalUsername = (data && data.username) ? data.username : (user.email ? user.email.split('@')[0] : "Trader");
    document.getElementById('username').innerText = finalUsername;
    
    const invested = Number(data && data.invested_amount > 0 ? data.invested_amount : 1000);
    document.getElementById('invested').innerText = "$" + invested.toLocaleString();

    document.getElementById('setup-name').innerText = (data && data.trade_setup_name) ? data.trade_setup_name : "Live Scalping";
    document.getElementById('setup-desc').innerText = (data && data.trade_setup_desc) ? data.trade_setup_desc : "Real-time automated strategy tracker.";

    // START SMOOTH ASCENDING / DESCENDING TICKER
    startSmoothPnL(invested);

  } catch (err) {
    console.error("Script execution error:", err);
    document.getElementById('username').innerText = user.email ? user.email.split('@')[0] : "Trader";
  }
}

// 6. Smooth Incremental P&L Movement Generator (-14.0% to +11.0%)
function startSmoothPnL(investedAmount) {
  if (pnlInterval) clearInterval(pnlInterval);

  // Set initial starting percent inside range
  currentPercent = (Math.random() * (11 - (-14)) + (-14));

  function updateTicker() {
    const minPercent = -14.0;
    const maxPercent = 11.0;

    // Random small delta shift between -1.2% and +1.2% per update
    const delta = (Math.random() * 2.4 - 1.2);
    currentPercent += delta;

    // Bounce off boundaries if limits reached
    if (currentPercent > maxPercent) currentPercent = maxPercent - Math.random() * 0.5;
    if (currentPercent < minPercent) currentPercent = minPercent + Math.random() * 0.5;

    const formattedPercent = currentPercent.toFixed(2);
    
    // Calculate exact dollar amount based on current percentage and invested capital
    const calculatedPnlDollar = (investedAmount * (currentPercent / 100)).toFixed(2);

    const pnlElement = document.getElementById('pnl-card');
    const isPositive = currentPercent >= 0;
    const pnlSign = isPositive ? "+$" : "-$";
    const formattedDollar = pnlSign + Math.abs(calculatedPnlDollar).toLocaleString();

    // Toggle Red / Green visual style
    pnlElement.className = isPositive ? "green" : "red";
    pnlElement.innerHTML = `${formattedDollar} (<span id="pnl-percent">${isPositive ? '+' : ''}${formattedPercent}%</span>)`;
  }

  // Run immediately, then repeat every 3 seconds
  updateTicker();
  pnlInterval = setInterval(updateTicker, 3000);
}

// 7. Handle Logout
async function logout() {
  if (pnlInterval) clearInterval(pnlInterval);
  await supabaseClient.auth.signOut();
  window.location.reload();
}