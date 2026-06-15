const API = 'http://127.0.0.1:5000';

// ── CHECK LOGIN ────────────────────────────────────────
const user = JSON.parse(localStorage.getItem('user'));
if (!user) window.location.href = 'index.html';
document.getElementById('user-name').textContent = `👤 ${user.name}`;

function logout() {
    localStorage.removeItem('user');
    window.location.href = 'index.html';
}

// ── GET BOOKING ID FROM URL ────────────────────────────
const urlParams  = new URLSearchParams(window.location.search);
const bookingId  = urlParams.get('booking_id');
if (!bookingId) window.location.href = 'bookings.html';

// ── PRICING ────────────────────────────────────────────
const BASE_RATE     = 20;   // ₹20 base charge
const RATE_PER_HOUR = 30;   // ₹30 per hour

let totalAmount = 0;
let bookingData = null;

// ── LOAD BOOKING DETAILS ───────────────────────────────
async function loadBookingDetails() {
    try {
        const res      = await fetch(`${API}/api/bookings/user/${user.id}`);
        const bookings = await res.json();
        const booking  = bookings.find(b => b.id == bookingId);

        if (!booking) {
            alert('Booking not found!');
            window.location.href = 'bookings.html';
            return;
        }

        bookingData = booking;

        // Calculate duration
        const checkIn   = new Date(booking.check_in);
        const now       = new Date();
        const diffMs    = now - checkIn;
        const diffHours = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60)));

        // Calculate amount
        totalAmount = BASE_RATE + (diffHours * RATE_PER_HOUR);

        // Fill bill
        document.getElementById('bill-booking-id').textContent = `#${booking.id}`;
        document.getElementById('bill-slot').textContent       = booking.slot_number;
        document.getElementById('bill-floor').textContent      = `Floor ${booking.floor}`;
        document.getElementById('bill-vehicle').textContent    = booking.vehicle_number;
        document.getElementById('bill-checkin').textContent    = formatDate(booking.check_in);
        document.getElementById('bill-duration').textContent   = `${diffHours} hr${diffHours > 1 ? 's' : ''}`;
        document.getElementById('bill-base-rate').textContent  = `₹${BASE_RATE}`;
        document.getElementById('bill-duration-charge').textContent = `₹${diffHours * RATE_PER_HOUR}`;
        document.getElementById('bill-total').textContent      = `₹${totalAmount}`;

    } catch (err) {
        console.error('Error loading booking:', err);
    }
}

// ── INITIATE RAZORPAY PAYMENT ──────────────────────────
async function initiatePayment() {
    try {
        document.getElementById('pay-btn').textContent  = '⏳ Processing...';
        document.getElementById('pay-btn').disabled     = true;

        // Create order on backend
        const res  = await fetch(`${API}/api/payments/create-order`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({
                booking_id: bookingId,
                amount:     totalAmount
            })
        });
        const order = await res.json();

        // Open Razorpay checkout
        const options = {
            key:         order.key_id,
            amount:      order.amount,
            currency:    order.currency,
            name:        'ParkEase',
            description: `Parking Slot ${bookingData.slot_number}`,
            order_id:    order.order_id,
            prefill: {
                name:  user.name,
                email: user.email
            },
            theme: {
                color: '#667eea'
            },
            handler: async function(response) {
                // Payment successful — verify on backend
                await verifyPayment(response);
            },
            modal: {
                ondismiss: function() {
                    document.getElementById('pay-btn').textContent = '💳 Pay Now';
                    document.getElementById('pay-btn').disabled    = false;
                }
            }
        };

        const rzp = new Razorpay(options);
        rzp.open();

    } catch (err) {
        console.error('Payment error:', err);
        document.getElementById('pay-btn').textContent = '💳 Pay Now';
        document.getElementById('pay-btn').disabled    = false;
    }
}

// ── VERIFY PAYMENT ─────────────────────────────────────
async function verifyPayment(response) {
    try {
        const res  = await fetch(`${API}/api/payments/verify`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({
                razorpay_order_id:   response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature:  response.razorpay_signature,
                booking_id:          bookingId,
                amount:              totalAmount
            })
        });
        const data = await res.json();

        if (res.ok) {
            // Show success card
            document.getElementById('bill-card').style.display    = 'none';
            document.getElementById('success-card').style.display = 'block';
            document.getElementById('success-payment-id').textContent = response.razorpay_payment_id;
            document.getElementById('success-amount').textContent     = `₹${totalAmount}`;
        } else {
            const alertEl = document.getElementById('payment-alert');
            alertEl.textContent = data.error || 'Verification failed';
            alertEl.className   = 'alert alert-error show';
        }

    } catch (err) {
        console.error('Verification error:', err);
    }
}

// ── FORMAT DATE ────────────────────────────────────────
function formatDate(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
}

// ── INIT ───────────────────────────────────────────────
loadBookingDetails();