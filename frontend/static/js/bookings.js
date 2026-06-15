const API = 'http://127.0.0.1:5000';

// ── CHECK LOGIN ────────────────────────────────────────
const user = JSON.parse(localStorage.getItem('user'));
if (!user) window.location.href = 'index.html';

document.getElementById('user-name').textContent = `👤 ${user.name}`;

function logout() {
    localStorage.removeItem('user');
    window.location.href = 'index.html';
}

// ── LOAD BOOKINGS ──────────────────────────────────────
async function loadBookings() {
    try {
        const res      = await fetch(`${API}/api/bookings/user/${user.id}`);
        const bookings = await res.json();
        const tbody    = document.getElementById('bookings-table');

        if (bookings.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align:center; color:#888; padding:30px">
                        No bookings yet. <a href="dashboard.html">Book a slot</a>
                    </td>
                </tr>`;
            return;
        }

        tbody.innerHTML = bookings.map(b => `
            <tr>
                <td>${b.id}</td>
                <td><strong>${b.slot_number}</strong></td>
                <td>Floor ${b.floor}</td>
                <td>${b.vehicle_number}</td>
                <td>${formatDate(b.check_in)}</td>
                <td>${b.check_out ? formatDate(b.check_out) : '—'}</td>
                <td><span class="badge badge-${b.status}">${b.status}</span></td>
                <td>
                    ${b.status === 'active'
                        ? `<a href="payment.html?booking_id=${b.id}" class="btn btn-success" 
    style="padding:6px 14px; font-size:12px; text-decoration:none">💳 Pay & Checkout</a>`
                        : '—'
                    }
                </td>
            </tr>
        `).join('');

    } catch (err) {
        console.error('Error loading bookings:', err);
    }
}

// ── CHECKOUT ───────────────────────────────────────────
async function checkout(bookingId) {
    if (!confirm('Are you sure you want to checkout?')) return;

    try {
        const res  = await fetch(`${API}/api/bookings/${bookingId}/checkout`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' }
        });
        const data = await res.json();

        if (res.ok) {
            const alert = document.getElementById('alert');
            alert.textContent = '✅ Checkout successful! Slot is now free.';
            alert.className = 'alert alert-success show';
            loadBookings();
            setTimeout(() => alert.className = 'alert', 3000);
        }
    } catch (err) {
        console.error('Checkout error:', err);
    }
}

// ── FORMAT DATE ────────────────────────────────────────
function formatDate(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleString('en-IN', {
        day:    '2-digit',
        month:  'short',
        year:   'numeric',
        hour:   '2-digit',
        minute: '2-digit'
    });
}

// ── INIT ───────────────────────────────────────────────
loadBookings();