
const USERNAME = "admin";
const PASSWORD = "admin123";

// Ambil elemen login
const loginForm = document.getElementById("loginForm");
const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");
const loginMessage = document.getElementById("loginMessage");

// Proses login
if (loginForm) {
  loginForm.addEventListener("submit", function (e) {
    e.preventDefault();

    const username = usernameInput.value.trim();
    const password = passwordInput.value;

    if (username === USERNAME && password === PASSWORD) {
      // Simpan status login
      sessionStorage.setItem("k3l_logged_in", "true");
      sessionStorage.setItem("k3l_username", username);

      // Arahkan ke dashboard
      window.location.href = "Dashboard.html";
    } else {
      loginMessage.textContent =
        "Username atau password salah!";

      loginMessage.style.color = "red";
    }
  });
}

// Fungsi untuk logout
function logout() {
  sessionStorage.removeItem("k3l_logged_in");
  sessionStorage.removeItem("k3l_username");

  window.location.href = "Login.html";
}
