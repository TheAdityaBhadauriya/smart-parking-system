from flask import Blueprint, request, jsonify
from models.helpers import query_db

admin = Blueprint('admin', __name__)

# ── MIDDLEWARE: CHECK ADMIN ────────────────────────────
def is_admin(user_id):
    if not user_id:
        return False
    user = query_db('SELECT role FROM users WHERE id=%s', (int(user_id),), one=True)
    if not user:
        return False
    return user['role'] == 'admin'

# ── DASHBOARD STATS ────────────────────────────────────
@admin.route('/api/admin/stats', methods=['GET'])
def get_stats():
    user_id = request.args.get('user_id')
    if not is_admin(user_id):
        return jsonify({'error': 'Unauthorized'}), 403

    total_users    = query_db('SELECT COUNT(*) as count FROM users', one=True)['count']
    total_slots    = query_db('SELECT COUNT(*) as count FROM parking_slots', one=True)['count']
    available      = query_db("SELECT COUNT(*) as count FROM parking_slots WHERE status='available'", one=True)['count']
    occupied       = query_db("SELECT COUNT(*) as count FROM parking_slots WHERE status='occupied'", one=True)['count']
    total_bookings = query_db('SELECT COUNT(*) as count FROM bookings', one=True)['count']
    active_bookings= query_db("SELECT COUNT(*) as count FROM bookings WHERE status='active'", one=True)['count']

    # Total revenue
    revenue = query_db("SELECT SUM(amount) as total FROM payments WHERE status='paid'", one=True)
    total_revenue = revenue['total'] if revenue['total'] else 0

    return jsonify({
        'total_users':     total_users,
        'total_slots':     total_slots,
        'available_slots': available,
        'occupied_slots':  occupied,
        'total_bookings':  total_bookings,
        'active_bookings': active_bookings,
        'total_revenue':   total_revenue
    }), 200


# ── GET ALL USERS ──────────────────────────────────────
@admin.route('/api/admin/users', methods=['GET'])
def get_users():
    user_id = request.args.get('user_id')
    if not is_admin(user_id):
        return jsonify({'error': 'Unauthorized'}), 403

    users = query_db('''
        SELECT u.id, u.name, u.email, u.role, u.created_at,
               COUNT(b.id) as total_bookings
        FROM users u
        LEFT JOIN bookings b ON u.id = b.user_id
        GROUP BY u.id
        ORDER BY u.created_at DESC
    ''')
    return jsonify(users), 200


# ── GET ALL BOOKINGS ───────────────────────────────────
@admin.route('/api/admin/bookings', methods=['GET'])
def get_all_bookings():
    user_id = request.args.get('user_id')
    if not is_admin(user_id):
        return jsonify({'error': 'Unauthorized'}), 403

    status = request.args.get('status', '')
    if status:
        bookings = query_db('''
            SELECT b.id, b.vehicle_number, b.check_in, b.check_out,
                   b.status, u.name as user_name, u.email,
                   p.slot_number, p.floor, p.slot_type
            FROM bookings b
            JOIN users u ON b.user_id = u.id
            JOIN parking_slots p ON b.slot_id = p.id
            WHERE b.status = %s
            ORDER BY b.created_at DESC
        ''', (status,))
    else:
        bookings = query_db('''
            SELECT b.id, b.vehicle_number, b.check_in, b.check_out,
                   b.status, u.name as user_name, u.email,
                   p.slot_number, p.floor, p.slot_type
            FROM bookings b
            JOIN users u ON b.user_id = u.id
            JOIN parking_slots p ON b.slot_id = p.id
            ORDER BY b.created_at DESC
        ''')
    return jsonify(bookings), 200


# ── GET REVENUE REPORT ─────────────────────────────────
@admin.route('/api/admin/revenue', methods=['GET'])
def get_revenue():
    user_id = request.args.get('user_id')
    if not is_admin(user_id):
        return jsonify({'error': 'Unauthorized'}), 403

    payments = query_db('''
        SELECT p.id, p.amount, p.status, p.created_at,
               b.vehicle_number, ps.slot_number,
               u.name as user_name
        FROM payments p
        JOIN bookings b ON p.booking_id = b.id
        JOIN parking_slots ps ON b.slot_id = ps.id
        JOIN users u ON b.user_id = u.id
        ORDER BY p.created_at DESC
    ''')
    return jsonify(payments), 200


# ── ADD NEW SLOT ───────────────────────────────────────
@admin.route('/api/admin/slots', methods=['POST'])
def add_slot():
    user_id = request.args.get('user_id')
    if not is_admin(user_id):
        return jsonify({'error': 'Unauthorized'}), 403

    data        = request.get_json()
    slot_number = data.get('slot_number')
    slot_type   = data.get('slot_type', 'regular')
    floor       = data.get('floor', 1)

    if not slot_number:
        return jsonify({'error': 'Slot number required'}), 400

    existing = query_db('SELECT id FROM parking_slots WHERE slot_number=%s', (slot_number,), one=True)
    if existing:
        return jsonify({'error': 'Slot number already exists'}), 409

    query_db(
        'INSERT INTO parking_slots (slot_number, slot_type, floor) VALUES (%s, %s, %s)',
        (slot_number, slot_type, floor), commit=True
    )
    return jsonify({'message': f'Slot {slot_number} added successfully'}), 201


# ── DELETE SLOT ────────────────────────────────────────
@admin.route('/api/admin/slots/<int:slot_id>', methods=['DELETE'])
def delete_slot(slot_id):
    user_id = request.args.get('user_id')
    if not is_admin(user_id):
        return jsonify({'error': 'Unauthorized'}), 403

    slot = query_db('SELECT * FROM parking_slots WHERE id=%s', (slot_id,), one=True)
    if not slot:
        return jsonify({'error': 'Slot not found'}), 404
    if slot['status'] == 'occupied':
        return jsonify({'error': 'Cannot delete an occupied slot'}), 400

    query_db('DELETE FROM parking_slots WHERE id=%s', (slot_id,), commit=True)
    return jsonify({'message': 'Slot deleted'}), 200