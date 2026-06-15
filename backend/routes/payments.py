from flask import Blueprint, request, jsonify
from models.helpers import query_db
import razorpay
import os
from datetime import datetime

payments = Blueprint('payments', __name__)

RAZORPAY_KEY_ID     = os.environ.get('RAZORPAY_KEY_ID', 'rzp_test_T1mFNjWcoCe7cH')
RAZORPAY_KEY_SECRET = os.environ.get('RAZORPAY_KEY_SECRET', 'HqbMNZOvfCDxd1ToJYucmP3P')
BUSINESS_NAME       = os.environ.get('BUSINESS_NAME', 'ParkEase')

client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))


# ── CREATE PAYMENT ORDER ───────────────────────────────
@payments.route('/api/payments/create-order', methods=['POST'])
def create_order():
    data       = request.get_json()
    booking_id = data.get('booking_id')
    amount     = data.get('amount')

    if not all([booking_id, amount]):
        return jsonify({'error': 'booking_id and amount required'}), 400

    amount_paise = int(amount) * 100

    order = client.order.create({
        'amount':   amount_paise,
        'currency': 'INR',
        'receipt':  f'booking_{booking_id}',
        'notes': {
            'booking_id':    booking_id,
            'business_name': BUSINESS_NAME
        }
    })

    return jsonify({
        'order_id':  order['id'],
        'amount':    amount_paise,
        'currency':  'INR',
        'key_id':    RAZORPAY_KEY_ID,
        'business':  BUSINESS_NAME
    }), 200


# ── VERIFY PAYMENT ─────────────────────────────────────
@payments.route('/api/payments/verify', methods=['POST'])
def verify_payment():
    data = request.get_json()

    razorpay_order_id   = data.get('razorpay_order_id')
    razorpay_payment_id = data.get('razorpay_payment_id')
    razorpay_signature  = data.get('razorpay_signature')
    booking_id          = data.get('booking_id')
    amount              = data.get('amount')

    try:
        client.utility.verify_payment_signature({
            'razorpay_order_id':   razorpay_order_id,
            'razorpay_payment_id': razorpay_payment_id,
            'razorpay_signature':  razorpay_signature
        })

        query_db('''
            INSERT INTO payments
            (booking_id, razorpay_order_id, razorpay_payment_id, amount, status)
            VALUES (%s, %s, %s, %s, %s)
        ''', (booking_id, razorpay_order_id, razorpay_payment_id, amount, 'paid'),
        commit=True)

        check_out = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        query_db(
            "UPDATE bookings SET status='completed', check_out=%s WHERE id=%s",
            (check_out, booking_id), commit=True
        )

        booking = query_db('SELECT slot_id FROM bookings WHERE id=%s', (booking_id,), one=True)
        query_db(
            "UPDATE parking_slots SET status='available' WHERE id=%s",
            (booking['slot_id'],), commit=True
        )

        return jsonify({'message': 'Payment verified', 'status': 'paid'}), 200

    except Exception as e:
        return jsonify({'error': 'Payment verification failed', 'details': str(e)}), 400


# ── GET PAYMENT DETAILS ────────────────────────────────
@payments.route('/api/payments/booking/<int:booking_id>', methods=['GET'])
def get_payment(booking_id):
    payment = query_db(
        'SELECT * FROM payments WHERE booking_id=%s', (booking_id,), one=True
    )
    if not payment:
        return jsonify({'error': 'No payment found'}), 404
    return jsonify(payment), 200


# ── GET KEY ID ─────────────────────────────────────────
@payments.route('/api/payments/key', methods=['GET'])
def get_key():
    return jsonify({'key_id': RAZORPAY_KEY_ID, 'business': BUSINESS_NAME}), 200