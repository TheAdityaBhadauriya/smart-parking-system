from flask import Blueprint, jsonify, request
from models.helpers import query_db
from datetime import datetime

bookings = Blueprint('bookings', __name__)


# ── CREATE BOOKING ─────────────────────────────────────
@bookings.route('/api/bookings', methods=['POST'])
def create_booking():
    data           = request.get_json()
    user_id        = data.get('user_id')
    slot_id        = data.get('slot_id')
    vehicle_number = data.get('vehicle_number')
    booking_date   = data.get('booking_date')
    start_time     = data.get('start_time')
    end_time       = data.get('end_time')

    if not all([user_id, slot_id, vehicle_number, booking_date, start_time, end_time]):
        return jsonify({'error': 'All fields are required'}), 400

    # Check start time is before end time
    if start_time >= end_time:
        return jsonify({'error': 'End time must be after start time'}), 400

    # Check slot exists
    slot = query_db('SELECT * FROM parking_slots WHERE id=%s', (slot_id,), one=True)
    if not slot:
        return jsonify({'error': 'Slot not found'}), 404

    # Check for time conflicts
    existing = query_db('''
        SELECT id, start_time, end_time FROM bookings
        WHERE slot_id = %s
        AND booking_date = %s
        AND status != 'cancelled'
    ''', (slot_id, booking_date))

    conflict = None
    for b in existing:
        b_start = str(b['start_time'])
        b_end   = str(b['end_time'])
        if not (end_time <= b_start or start_time >= b_end):
            conflict = b
            break

    if conflict:
        return jsonify({'error': 'Slot already booked for this time'}), 409

    check_in = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

    booking_id = query_db('''
        INSERT INTO bookings 
        (user_id, slot_id, vehicle_number, check_in, booking_date, start_time, end_time)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
    ''', (user_id, slot_id, vehicle_number, check_in, booking_date, start_time, end_time),
    commit=True)

    # Only mark occupied if booking is for today
    today = datetime.now().strftime('%Y-%m-%d')
    if booking_date == today:
        query_db(
            "UPDATE parking_slots SET status='occupied' WHERE id=%s",
            (slot_id,), commit=True
        )

    return jsonify({
        'message': 'Booking created successfully',
        'booking_id': booking_id
    }), 201


# ── GET AVAILABLE SLOTS FOR DATE/TIME ──────────────────
@bookings.route('/api/bookings/available', methods=['GET'])
def get_available_slots():
    booking_date = request.args.get('date')
    start_time   = request.args.get('start_time')
    end_time     = request.args.get('end_time')

    if not all([booking_date, start_time, end_time]):
        return jsonify({'error': 'date, start_time and end_time required'}), 400

    # Get booked slot IDs for this time
    booked = query_db('''
        SELECT slot_id FROM bookings
        WHERE booking_date = %s
        AND status != 'cancelled'
        AND (
            (start_time < %s AND end_time > %s) OR
            (start_time < %s AND end_time > %s) OR
            (start_time >= %s AND end_time <= %s)
        )
    ''', (booking_date,
          end_time, start_time,
          end_time, end_time,
          start_time, end_time))

    booked_ids = [b['slot_id'] for b in booked]

    # Get all slots
    all_slots = query_db('SELECT * FROM parking_slots ORDER BY floor, slot_number')

    # Mark availability
    for slot in all_slots:
        slot['available_for_time'] = slot['id'] not in booked_ids

    return jsonify(all_slots), 200


# ── GET USER'S BOOKINGS ────────────────────────────────
@bookings.route('/api/bookings/user/<int:user_id>', methods=['GET'])
def get_user_bookings(user_id):
    user_bookings = query_db('''
        SELECT b.id, b.vehicle_number, b.check_in, b.check_out,
               b.status, b.booking_date, b.start_time, b.end_time,
               p.slot_number, p.floor
        FROM bookings b
        JOIN parking_slots p ON b.slot_id = p.id
        WHERE b.user_id = %s
        ORDER BY b.booking_date DESC, b.start_time DESC
    ''', (user_id,))
    return jsonify(user_bookings), 200


# ── CHECKOUT ───────────────────────────────────────────
@bookings.route('/api/bookings/<int:booking_id>/checkout', methods=['PUT'])
def checkout(booking_id):
    booking = query_db('SELECT * FROM bookings WHERE id=%s', (booking_id,), one=True)

    if not booking:
        return jsonify({'error': 'Booking not found'}), 404
    if booking['status'] != 'active':
        return jsonify({'error': 'Booking is not active'}), 400

    check_out = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

    query_db(
        "UPDATE bookings SET status='completed', check_out=%s WHERE id=%s",
        (check_out, booking_id), commit=True
    )

    query_db(
        "UPDATE parking_slots SET status='available' WHERE id=%s",
        (booking['slot_id'],), commit=True
    )

    return jsonify({'message': 'Checkout successful'}), 200


# ── GET ALL BOOKINGS (Admin) ───────────────────────────
@bookings.route('/api/bookings', methods=['GET'])
def get_all_bookings():
    all_bookings = query_db('''
        SELECT b.id, b.vehicle_number, b.check_in, b.check_out,
               b.status, b.booking_date, b.start_time, b.end_time,
               u.name AS user_name, u.email,
               p.slot_number, p.floor
        FROM bookings b
        JOIN users u ON b.user_id = u.id
        JOIN parking_slots p ON b.slot_id = p.id
        ORDER BY b.booking_date DESC, b.start_time DESC
    ''')
    return jsonify(all_bookings), 200