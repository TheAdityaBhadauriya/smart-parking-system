const API = 'https://smart-parking-system-918m.onrender.com';

// ── AUTHENTICATED FETCH ────────────────────────────────
async function apiFetch(url, options = {}) {
    const token = localStorage.getItem('token');

    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
        ...options,
        headers
    });

    // If token expired, redirect to login
    if (response.status === 401) {
        localStorage.clear();
        window.location.href = 'index.html';
        return;
    }

    return response;
}