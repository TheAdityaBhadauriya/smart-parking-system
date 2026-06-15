const API = 'https://smart-parking-system-918m.onrender.com';

// ── CHECK LOGIN & ADMIN ────────────────────────────────
const user = JSON.parse(localStorage.getItem('user'));
if (!user) window.location.href = 'index.html';
if (user.role !== 'admin') window.location.href = 'dashboard.html';

document.getElementById('user-name').textContent = `👑 ${user.name}`;

function logout() {
    localStorage.removeItem('user');
    window.location.href = 'index.html';
}

// ── TAB SWITCHING ──────────────────────────────────────
function showTab(tab) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.sidebar-item').forEach(s => s.classList.remove('active'));

    document.getElementById(`tab-${tab}`).classList.add('active');
    event.currentTarget.classList.add('active');

    // Load data for the tab
    if (tab === 'overview')  loadStats();
    if (tab === 'bookings')  loadBookings('');
    if (tab === 'slots')     loadSlots();
    if (tab === 'users')     loadUsers();
    if (tab === 'revenue')   loadRevenue();
}

// ── FORMAT DATE ────────────────────────────────────────
function formatDate(dateStr) {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
}

// ── LOAD STATS ─────────────────────────────────────────
async function loadStats() {
    const res  = await fetch(`${API}/api/admin/stats?user_id=${user.id}`);
    const data = await res.json();

    document.getElementById('stat-users').textContent    = data.total_users;
    document.getElementById('stat-available').textContent= data.available_slots;
    document.getElementById('stat-occupied').textContent = data.occupied_slots;
    document.getElementById('stat-bookings').textContent = data.total_bookings;
    document.getElementById('stat-active').textContent   = data.active_bookings;
    document.getElementById('stat-revenue').textContent  = `₹${data.total_revenue}`;
}

// ── LOAD BOOKINGS ──────────────────────────────────────
async function loadBookings(status) {
    const url  = `${API}/api/admin/bookings?user_id=${user.id}${status ? `&status=${status}` : ''}`;
    const res  = await fetch(url);
    const data = await res.json();
    const tbody = document.getElementById('bookings-tbody');

    if (!data.length) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:#888;padding:20px">No bookings found</td></tr>`;
        return;
    }

    tbody.innerHTML = data.map(b => `
        <tr>
            <td>${b.id}</td>
            <td>
                <strong>${b.user_name}</strong><br>
                <small style="color:#888">${b.email}</small>
            </td>
            <td><strong>${b.slot_number}</strong> · Floor ${b.floor}</td>
            <td>${b.vehicle_number}</td>
            <td>${formatDate(b.check_in)}</td>
            <td>${formatDate(b.check_out)}</td>
            <td><span class="badge badge-${b.status}">${b.status}</span></td>
        </tr>
    `).join('');
}

function filterBookings(status) {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    event.currentTarget.classList.add('active');
    loadBookings(status);
}

// ── LOAD SLOTS ─────────────────────────────────────────
async function loadSlots() {
    const res   = await fetch(`${API}/api/slots`);
    const slots = await res.json();
    const tbody = document.getElementById('slots-tbody');

    tbody.innerHTML = slots.map(s => `
        <tr>
            <td>${s.id}</td>
            <td><strong>${s.slot_number}</strong></td>
            <td>${s.slot_type}</td>
            <td>Floor ${s.floor}</td>
            <td><span class="badge badge-${s.status === 'available' ? 'active' : 'cancelled'}">${s.status}</span></td>
            <td>
                ${s.status === 'available'
                    ? `<button class="btn btn-danger" style="padding:5px 12px;font-size:12px"
                        onclick="deleteSlot(${s.id}, '${s.slot_number}')">Delete</button>`
                    : '<span style="color:#888;font-size:12px">In use</span>'
                }
            </td>
        </tr>
    `).join('');
}

// ── ADD SLOT ───────────────────────────────────────────
async function addSlot() {
    const slot_number = document.getElementById('new-slot-number').value.trim().toUpperCase();
    const slot_type   = document.getElementById('new-slot-type').value;
    const floor       = document.getElementById('new-slot-floor').value;
    const alertEl     = document.getElementById('slot-alert');

    if (!slot_number) {
        alertEl.textContent = 'Please enter a slot number';
        alertEl.className   = 'alert alert-error show';
        return;
    }

    const res  = await fetch(`${API}/api/admin/slots?user_id=${user.id}`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ slot_number, slot_type, floor: parseInt(floor) })
    });
    const data = await res.json();

    if (res.ok) {
        alertEl.textContent = `✅ ${data.message}`;
        alertEl.className   = 'alert alert-success show';
        document.getElementById('new-slot-number').value = '';
        loadSlots();
        setTimeout(() => alertEl.className = 'alert', 3000);
    } else {
        alertEl.textContent = data.error;
        alertEl.className   = 'alert alert-error show';
    }
}

// ── DELETE SLOT ────────────────────────────────────────
async function deleteSlot(slotId, slotNumber) {
    if (!confirm(`Delete slot ${slotNumber}? This cannot be undone.`)) return;

    const res  = await fetch(`${API}/api/admin/slots/${slotId}?user_id=${user.id}`, {
        method: 'DELETE'
    });
    const data = await res.json();

    if (res.ok) {
        loadSlots();
    } else {
        alert(data.error);
    }
}

// ── LOAD USERS ─────────────────────────────────────────
async function loadUsers() {
    const res   = await fetch(`${API}/api/admin/users?user_id=${user.id}`);
    const users = await res.json();
    const tbody = document.getElementById('users-tbody');

    tbody.innerHTML = users.map(u => `
        <tr>
            <td>${u.id}</td>
            <td><strong>${u.name}</strong></td>
            <td>${u.email}</td>
            <td><span class="badge badge-${u.role}">${u.role}</span></td>
            <td>${u.total_bookings}</td>
            <td>${formatDate(u.created_at)}</td>
        </tr>
    `).join('');
}

// ── LOAD REVENUE ───────────────────────────────────────
async function loadRevenue() {
    const res      = await fetch(`${API}/api/admin/revenue?user_id=${user.id}`);
    const payments = await res.json();
    const tbody    = document.getElementById('revenue-tbody');

    if (!payments.length) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:#888;padding:20px">No payments yet</td></tr>`;
        return;
    }

    tbody.innerHTML = payments.map(p => `
        <tr>
            <td>${p.id}</td>
            <td>${p.user_name}</td>
            <td>${p.slot_number}</td>
            <td>${p.vehicle_number}</td>
            <td><strong style="color:#667eea">₹${p.amount}</strong></td>
            <td><span class="badge badge-${p.status === 'paid' ? 'active' : 'cancelled'}">${p.status}</span></td>
            <td>${formatDate(p.created_at)}</td>
        </tr>
    `).join('');
}

// ── ADD ADMIN LINK TO NAVBAR ───────────────────────────
// ── INIT ───────────────────────────────────────────────
loadStats();