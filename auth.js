document.getElementById('loginBtn').addEventListener('click', async () => {
  try {
    const user = await login();
    if (user) {
   
      document.getElementById('loginBtn').style.display = 'none';
      document.getElementById('logoutBtn').style.display = 'block';
    }
  } catch (error) {
    console.error("Login failed:", error);
  }
});

document.getElementById('logoutBtn').addEventListener('click', () => {
  logout();
  
  document.getElementById('loginBtn').style.display = 'block';
  document.getElementById('logoutBtn').style.display = 'none';
});