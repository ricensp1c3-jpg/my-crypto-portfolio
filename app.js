// 1. Supabase Initialization
const SUPABASE_URL = "https://obdkqdfalmqnebrmtzwh.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9iZGtxZGZhbG1xbmVicm10endoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYzMjc3NjksImV4cCI6MjEwMTkwMzc2OX0.0-cSxWTrAyNMrQQtaEaXlZPzyP_0nZzad0738-DRbDo"; 

const { createClient } = window.supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let isSignUpMode = false;

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
      // Create profile row in user_profiles
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
        invested_amount: 0, 
        pnl_amount: 0, 
        pnl_percentage: 0, 
        trade_setup_name: "No Setup Yet", 
        trade_setup_desc: "Add your trade setups here." 
      }
    ], { onConflict: 'id' });

  if (error) {
    console.error("Error creating user profile:", error.message);
  }
}

// 5. Fetch Profile for Logged-In User
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

    // IF NO PROFILE ROW EXISTS, CREATE ONE NOW!
    if (!data) {
      const fallbackName = user.email ? user.email.split('@')[0] : "Trader";
      await createUserProfileRow(user.id, fallbackName);
      
      // Fetch again after creating
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
    
    document.getElementById('invested').innerText = "$" + Number(data ? data.invested_amount : 0).toLocaleString();
    document.getElementById('pnl').innerHTML = `$${Number(data ? data.pnl_amount : 0).toLocaleString()} (<span id="pnl-percent">${data ? data.pnl_percentage : 0}%</span>)`;
    document.getElementById('setup-name').innerText = (data && data.trade_setup_name) ? data.trade_setup_name : "No Setup Yet";
    document.getElementById('setup-desc').innerText = (data && data.trade_setup_desc) ? data.trade_setup_desc : "Add your trade setups here.";

  } catch (err) {
    console.error("Script execution error:", err);
    document.getElementById('username').innerText = user.email ? user.email.split('@')[0] : "Trader";
  }
}

// 6. Handle Logout
async function logout() {
  await supabaseClient.auth.signOut();
  window.location.reload();
}