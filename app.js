// 1. Replace with your exact details
const SUPABASE_URL = "https://obdkqdfalmqnebrmtzwh.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9iZGtxZGZhbG1xbmVicm10endoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYzMjc3NjksImV4cCI6MjEwMTkwMzc2OX0.0-cSxWTrAyNMrQQtaEaXlZPzyP_0nZzad0738-DRbDo"; // Paste your anon key inside the quotes

// 2. Initialize Supabase Client (Notice 'supabase.createClient')
const { createClient } = window.supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 3. Fetch and display profile data from Supabase
async function loadUserProfile() {
  try {
    const { data, error } = await supabaseClient
      .from('user_profiles')
      .select('*')
      .limit(1)
      .single();

    if (error) {
      console.error("Supabase error:", error.message);
      alert("Error reading database: " + error.message);
      return;
    }

    if (data) {
      document.getElementById('username').innerText = data.username || "Trader";
      document.getElementById('invested').innerText = "$" + Number(data.invested_amount).toLocaleString();
      document.getElementById('pnl').innerHTML = `$${Number(data.pnl_amount).toLocaleString()} (<span id="pnl-percent">+${data.pnl_percentage}%</span>)`;
      document.getElementById('setup-name').innerText = data.trade_setup_name || "N/A";
      document.getElementById('setup-desc').innerText = data.trade_setup_desc || "No description provided.";
    }
  } catch (err) {
    console.error("Script error:", err);
  }
}

// Run the script
loadUserProfile();