
const USERNAME = "admin";
const PASSWORD = "admin123";

// ==============================
// PROSES LOGIN
// ==============================

const loginForm = document.getElementById("loginForm");
const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");
const loginMessage = document.getElementById("loginMessage");

if (loginForm) {
  loginForm.addEventListener("submit", function (e) {
    e.preventDefault();

    const username = usernameInput.value.trim();
    const password = passwordInput.value;

    if (
      username === USERNAME &&
      password === PASSWORD
    ) {
      // Simpan status login
      sessionStorage.setItem("k3l_logged_in", "true");
      sessionStorage.setItem("k3l_username", username);

      // Masuk ke Dashboard
      window.location.href = "Dashboard.html";
    } else {
      // Tampilkan pesan jika salah
      if (loginMessage) {
        loginMessage.textContent =
          "Username atau password salah!";
        loginMessage.style.color = "red";
      }
    }
  });
}

// ==============================
// PROTEKSI HALAMAN DASHBOARD
// ==============================

const isDashboard =
  window.location.pathname.toLowerCase().endsWith("dashboard.html");

if (isDashboard) {
  const isLoggedIn =
    sessionStorage.getItem("k3l_logged_in") === "true";

  if (!isLoggedIn) {
    window.location.replace("Login.html");
  }
}

// ==============================
// PROSES LOGOUT
// ==============================

function logout() {
  sessionStorage.removeItem("k3l_logged_in");
  sessionStorage.removeItem("k3l_username");

  window.location.href = "Login.html";
}

// Agar bisa dipanggil dari tombol onclick
window.logout = logout;
