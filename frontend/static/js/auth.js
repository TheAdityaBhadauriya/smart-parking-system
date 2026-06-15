
//v2
// ── SWITCH TABS ────────────────────────────────────────
function showTab(tab) {
    document.getElementById('login-form').style.display    = tab === 'login'    ? 'block' : 'none';
    document.getElementById('register-form').style.display = tab === 'register' ? 'block' : 'none';

    document.querySelectorAll('.auth-tab').forEach((btn, i) => {
        btn.classList.toggle('active', (tab === 'login' && i === 0) || (tab === 'register' && i === 1));
    });

    hideAlert();
}

// ── SHOW ALERT ─────────────────────────────────────────
function showAlert(message, type = 'error') {
    const alert = document.getElementById('alert');
    alert.textContent = message;
    alert.className = `alert alert-${type} show`;
}

function hideAlert() {
    document.getElementById('alert').className = 'alert';
}

// ── LOGIN ──────────────────────────────────────────────
async function login() {
    const email    = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value.trim();

    if (!email || !password) {
        showAlert('Please fill in all fields');
        return;
    }

    try {
        const res  = await fetch(`${API}/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();

        if (res.ok) {
        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.setItem('token', data.token);
        showAlert('Login successful! Redirecting...', 'success');
        setTimeout(() => window.location.href = 'dashboard.html', 1000);
        }
        else {
            showAlert(data.error || 'Login failed');
        }
    } catch (err) {
        showAlert('Cannot connect to server. Is Flask running?');
    }
}

// ── REGISTER ───────────────────────────────────────────
async function register() {
    const name     = document.getElementById('reg-name').value.trim();
    const email    = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value.trim();

    if (!name || !email || !password) {
        showAlert('Please fill in all fields');
        return;
    }

    try {
        const res  = await fetch(`${API}/api/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password })
        });
        const data = await res.json();

        if (res.ok) {
            showAlert('Account created! Please login.', 'success');
            setTimeout(() => showTab('login'), 1500);
        } else {
            showAlert(data.error || 'Registration failed');
        }
    } catch (err) {
        showAlert('Cannot connect to server. Is Flask running?');
    }
}

// ── CHECK IF ALREADY LOGGED IN ─────────────────────────
if (localStorage.getItem('user')) {
    window.location.href = 'dashboard.html';
}