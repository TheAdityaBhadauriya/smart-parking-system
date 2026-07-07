// ── CHECK LOGIN ────────────────────────────────────────
const user = JSON.parse(localStorage.getItem('user'));
if (!user) window.location.href = 'index.html';
document.getElementById('user-name').textContent = `👤 ${user.name}`;

function logout() {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    window.location.href = 'index.html';
}

// ── STATE ──────────────────────────────────────────────
let allSlots     = [];
let selectedSlot = null;
let currentFloor = 1;
let bookedIds    = [];

// ── SET DEFAULT DATE/TIME ──────────────────────────────
function setDefaultDateTime() {
    const today = new Date().toISOString().split('T')[0];
    const now   = new Date();
    const h     = String(now.getHours()).padStart(2, '0');
    const m     = String(now.getMinutes()).padStart(2, '0');
    const h2    = String((now.getHours() + 1) % 24).padStart(2, '0');

    document.getElementById('filter-date').value  = today;
    document.getElementById('filter-date').min    = today;
    document.getElementById('filter-start').value = `${h}:${m}`;
    document.getElementById('filter-end').value   = `${h2}:${m}`;
}

// ── CHECK AVAILABILITY ─────────────────────────────────
async function checkAvailability() {
    const date  = document.getElementById('filter-date').value;
    const start = document.getElementById('filter-start').value;
    const end   = document.getElementById('filter-end').value;

    if (!date || !start || !end) {
        alert('Please select date and time');
        return;
    }

    if (start >= end) {
        alert('End time must be after start time');
        return;
    }

    try {
        const res  = await fetch(`${API}/api/bookings/available?date=${date}&start_time=${start}&end_time=${end}`);
        const data = await res.json();

        allSlots = data;
bookedIds = data.filter(s => !s.available_for_time).map(s => s.id);

// Update stats
const available = data.filter(s => s.available_for_time).length;
const occupied  = data.filter(s => !s.available_for_time).length;
document.getElementById('total-slots').textContent     = data.length;
document.getElementById('available-slots').textContent = available;
document.getElementById('occupied-slots').textContent  = occupied;

renderMap(currentFloor);
    } catch (err) {
        console.error('Error checking availability:', err);
    }
}

// ── SLOT ICONS ─────────────────────────────────────────
function getIcon(slot) {
    if (slot.slot_type === 'ev')       return '⚡';
    if (slot.slot_type === 'disabled') return '♿';
    if (!slot.available_for_time)      return '🚗';
    return '🅿️';
}

// ── GET CSS CLASS ──────────────────────────────────────
function getSlotClass(slot) {
    if (!slot.available_for_time) return 'occupied';
    if (slot.slot_type === 'ev')       return 'ev-available';
    if (slot.slot_type === 'disabled') return 'disabled-available';
    return 'available';
}

// ── LOAD SLOTS ─────────────────────────────────────────
async function loadSlots() {
    try {
        const res = await fetch(`${API}/api/slots`);
        allSlots  = await res.json();

        // Mark all as available initially
        allSlots.forEach(s => s.available_for_time = true);

        // Update stats
        const available = allSlots.filter(s => s.status === 'available').length;
        const occupied  = allSlots.filter(s => s.status === 'occupied').length;
        document.getElementById('total-slots').textContent     = allSlots.length;
        document.getElementById('available-slots').textContent = available;
        document.getElementById('occupied-slots').textContent  = occupied;

        renderMap(currentFloor);

    } catch (err) {
        console.error('Error loading slots:', err);
    }
}

// ── RENDER MAP ─────────────────────────────────────────
function renderMap(floor) {
    const grid       = document.getElementById('map-grid');
    const floorSlots = allSlots.filter(s => s.floor === floor);
    grid.innerHTML   = '';

    floorSlots.forEach(slot => {
        const slotClass  = getSlotClass(slot);
        const icon       = getIcon(slot);
        const isBookable = slot.available_for_time && slot.status !== 'occupied';
        const statusText = isBookable ? '✅ Free' : '🔴 Taken';
        const tooltipText = isBookable ? 'Click to book' : 'Already booked';

        const card = document.createElement('div');
        card.className = `map-slot ${slotClass}`;
        card.innerHTML = `
            <div class="tooltip">${tooltipText}</div>
            <div class="map-slot-icon">${icon}</div>
            <div class="map-slot-number">${slot.slot_number}</div>
            <div class="map-slot-type">${slot.slot_type}</div>
            <div class="map-slot-status">${statusText}</div>
        `;

        if (isBookable) {
            card.onclick = () => openModal(slot);
        }

        grid.appendChild(card);
    });
}

// ── SWITCH FLOOR ───────────────────────────────────────
function switchFloor(floor) {
    currentFloor = floor;
    document.querySelectorAll('.floor-btn').forEach((btn, i) => {
        btn.classList.toggle('active', i + 1 === floor);
    });
    renderMap(floor);
}

// ── MODAL ──────────────────────────────────────────────
function openModal(slot) {
    selectedSlot = slot;
    document.getElementById('modal-slot-number').textContent = slot.slot_number;
    document.getElementById('modal-slot-type').value         = slot.slot_type;
    document.getElementById('modal-slot-floor').value        = `Floor ${slot.floor}`;
    document.getElementById('vehicle-number').value          = '';
    document.getElementById('modal-alert').className         = 'alert';

    // Use filter values if set
    const filterDate  = document.getElementById('filter-date').value;
    const filterStart = document.getElementById('filter-start').value;
    const filterEnd   = document.getElementById('filter-end').value;

    const today = new Date().toISOString().split('T')[0];
    document.getElementById('booking-date').min   = today;
    document.getElementById('booking-date').value = filterDate || today;
    document.getElementById('start-time').value   = filterStart || '';
    document.getElementById('end-time').value     = filterEnd || '';

    document.getElementById('booking-modal').classList.add('active');
}

function closeModal() {
    document.getElementById('booking-modal').classList.remove('active');
    selectedSlot = null;
}

// ── CONFIRM BOOKING ────────────────────────────────────
async function confirmBooking() {
    // Disable button to prevent double booking
    const btn = document.querySelector('.modal .btn-success');
    btn.disabled = true;
    btn.textContent = '⏳ Processing...';
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
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({
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
            checkAvailability();
            alert(`✅ Booking confirmed!\nSlot: ${selectedSlot.slot_number}\nBooking ID: ${data.booking_id}`);
        }else {
    const alertEl = document.getElementById('modal-alert');
    alertEl.textContent = data.error || 'Booking failed';
    alertEl.className   = 'alert alert-error show';
    btn.disabled = false;
    btn.textContent = 'Confirm Booking';
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
setDefaultDateTime();
loadSlots();