from flask import Blueprint, jsonify, request
from models.helpers import query_db
from datetime import datetime

bookings = Blueprint('bookings', __name__)

@bookings.route('/api/bookings', methods=['POST'])
def create_booking():
    data           = request.get_json()
    user_id        = data.get('user_id')
    slot_id        = data.get('slot_id')
    vehicle_number = data.get('vehicle_number')

    if not all([user_id, slot_id, vehicle_number]):
        return jsonify({'error': 'All fields are required'}), 400

    slot = query_db(
        "SELECT * FROM parking_slots WHERE id = %s AND status = 'available'",
        (slot_id,), one=True
    )
    if not slot:
        return jsonify({'error': 'Slot is not available'}), 409

    check_in = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

    booking_id = query_db(
        'INSERT INTO bookings (user_id, slot_id, vehicle_number, check_in) VALUES (%s, %s, %s, %s)',
        (user_id, slot_id, vehicle_number, check_in),
        commit=True
    )

    query_db(
        "UPDATE parking_slots SET status = 'occupied' WHERE id = %s",
        (slot_id,),
        commit=True
    )

    return jsonify({'message': 'Booking created', 'booking_id': booking_id}), 201

@bookings.route('/api/bookings/user/<int:user_id>', methods=['GET'])
def get_user_bookings(user_id):
    user_bookings = query_db('''
        SELECT b.id, b.vehicle_number, b.check_in, b.check_out,
               b.status, p.slot_number, p.floor
        FROM bookings b
        JOIN parking_slots p ON b.slot_id = p.id
        WHERE b.user_id = %s
        ORDER BY b.created_at DESC
    ''', (user_id,))
    return jsonify(user_bookings), 200

@bookings.route('/api/bookings/<int:booking_id>/checkout', methods=['PUT'])
def checkout(booking_id):
    booking = query_db('SELECT * FROM bookings WHERE id = %s', (booking_id,), one=True)

    if not booking:
        return jsonify({'error': 'Booking not found'}), 404
    if booking['status'] != 'active':
        return jsonify({'error': 'Booking is not active'}), 400

    check_out = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

    query_db(
        "UPDATE bookings SET status = 'completed', check_out = %s WHERE id = %s",
        (check_out, booking_id),
        commit=True
    )

    query_db(
        "UPDATE parking_slots SET status = 'available' WHERE id = %s",
        (booking['slot_id'],),
        commit=True
    )

    return jsonify({'message': 'Checkout successful'}), 200

@bookings.route('/api/bookings', methods=['GET'])
def get_all_bookings():
    all_bookings = query_db('''
        SELECT b.id, b.vehicle_number, b.check_in, b.check_out,
               b.status, u.name AS user_name, u.email,
               p.slot_number, p.floor
        FROM bookings b
        JOIN users u ON b.user_id = u.id
        JOIN parking_slots p ON b.slot_id = p.id
        ORDER BY b.created_at DESC
    ''')
    return jsonify(all_bookings), 200