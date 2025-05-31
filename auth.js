// Initialize Supabase with environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
if (!supabaseUrl || !supabaseKey) {
  throw new Error('Supabase URL and Key must be provided in environment variables');
}
const supabase = createClient(supabaseUrl, supabaseKey);

// Enhanced login with error handling and loading state
async function login() {
  try {
    showLoading(true);
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin // For proper OAuth flow
      }
    });
    
    if (error) throw error;
    return data.user;
  } catch (error) {
    console.error("Login error:", error);
    showToast('Login failed. Please try again.', 'error');
    return null;
  } finally {
    showLoading(false);
  }
}
// Add to auth.js or main script
function showLoading(show) {
  const overlay = document.getElementById('loadingOverlay');
  if (overlay) {
    overlay.style.display = show ? 'flex' : 'none';
  }
}

function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.classList.add('fade-out');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}