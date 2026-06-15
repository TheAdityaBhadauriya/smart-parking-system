const API = 'https://smart-parking-system-918m.onrender.com';

// ── CHECK LOGIN ────────────────────────────────────────
const user = JSON.parse(localStorage.getItem('user'));
if (!user) window.location.href = 'index.html';

document.getElementById('user-name').textContent = `👤 ${user.name}`;

// ── LOGOUT ─────────────────────────────────────────────
function logout() {
    localStorage.removeItem('user');
    window.location.href = 'index.html';
}

// ── LOAD ALL SLOTS ─────────────────────────────────────
let selectedSlot = null;

async function loadSlots() {
    try {
        const res   = await fetch(`${API}/api/slots`);
        const slots = await res.json();

        // Update stats
        const available = slots.filter(s => s.status === 'available').length;
        const occupied  = slots.filter(s => s.status === 'occupied').length;
        document.getElementById('total-slots').textContent     = slots.length;
        document.getElementById('available-slots').textContent = available;
        document.getElementById('occupied-slots').textContent  = occupied;

        // Group by floor
        const floors = {};
        slots.forEach(slot => {
            if (!floors[slot.floor]) floors[slot.floor] = [];
            floors[slot.floor].push(slot);
        });

        // Render slots
        const container = document.getElementById('slots-container');
        container.innerHTML = '';

        Object.keys(floors).sort().forEach(floor => {
            const section = document.createElement('div');
            section.className = 'floor-section';
            section.innerHTML = `<div class="floor-title">🏢 Floor ${floor}</div>`;

            const grid = document.createElement('div');
            grid.className = 'slots-grid';

            floors[floor].forEach(slot => {
                const card = document.createElement('div');
                card.className = `slot-card ${slot.status}`;
                card.innerHTML = `
                    <div class="slot-number">${slot.slot_number}</div>
                    <div class="slot-type">${slot.slot_type}</div>
                    <div class="slot-status">${slot.status === 'available' ? '✅ Free' : '🔴 Taken'}</div>
                `;

                if (slot.status === 'available') {
                    card.onclick = () => openModal(slot);
                }

                grid.appendChild(card);
            });

            section.appendChild(grid);
            container.appendChild(section);
        });

    } catch (err) {
        console.error('Error loading slots:', err);
    }
}

// ── MODAL ──────────────────────────────────────────────
function openModal(slot) {
    selectedSlot = slot;
    document.getElementById('modal-slot-number').textContent = slot.slot_number;
    document.getElementById('modal-slot-type').value         = slot.slot_type;
    document.getElementById('modal-slot-floor').value        = `Floor ${slot.floor}`;
    document.getElementById('vehicle-number').value          = '';
    document.getElementById('modal-alert').className         = 'alert';

    // Set minimum date to today
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('booking-date').min   = today;
    document.getElementById('booking-date').value = today;

    // Set default times
    const now  = new Date();
    const h    = String(now.getHours()).padStart(2, '0');
    const m    = String(now.getMinutes()).padStart(2, '0');
    const h2   = String((now.getHours() + 1) % 24).padStart(2, '0');
    document.getElementById('start-time').value = `${h}:${m}`;
    document.getElementById('end-time').value   = `${h2}:${m}`;

    document.getElementById('booking-modal').classList.add('active');
}
function closeModal() {
    document.getElementById('booking-modal').classList.remove('active');
    selectedSlot = null;
}

// ── CONFIRM BOOKING ────────────────────────────────────
async function confirmBooking() {
    const vehicleNumber = document.getElementById('vehicle-number').value.trim();
    const bookingDate   = document.getElementById('booking-date').value;
    const startTime     = document.getElementById('start-time').value;
    const endTime       = document.getElementById('end-time').value;

    if (!vehicleNumber || !bookingDate || !startTime || !endTime) {
        const alertEl = document.getElementById('modal-alert');
        alertEl.textContent = 'Please fill in all fields';
        alertEl.className   = 'alert alert-error show';
        return;
    }

    if (startTime >= endTime) {
        const alertEl = document.getElementById('modal-alert');
        alertEl.textContent = 'End time must be after start time';
        alertEl.className   = 'alert alert-error show';
        return;
    }

    try {
        const res  = await fetch(`${API}/api/bookings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id:        user.id,
                slot_id:        selectedSlot.id,
                vehicle_number: vehicleNumber,
                booking_date:   bookingDate,
                start_time:     startTime,
                end_time:       endTime
            })
        });
        const data = await res.json();

        if (res.ok) {
            closeModal();
            loadSlots();
            alert(`✅ Booking confirmed! Booking ID: ${data.booking_id}`);
        } else {
            const alertEl = document.getElementById('modal-alert');
            alertEl.textContent = data.error || 'Booking failed';
            alertEl.className   = 'alert alert-error show';
        }
    } catch (err) {
        console.error('Booking error:', err);
    }
}

// ── CLOSE MODAL ON OUTSIDE CLICK ──────────────────────
document.getElementById('booking-modal').addEventListener('click', function(e) {
    if (e.target === this) closeModal();
});

// ── INIT ───────────────────────────────────────────────
loadSlots();

// Auto refresh every 30 seconds
setInterval(loadSlots, 30000);