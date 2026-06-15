from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from models.helpers import query_db

slots = Blueprint('slots', __name__)


@slots.route('/api/slots', methods=['GET'])
def get_slots():
    all_slots = query_db('SELECT * FROM parking_slots ORDER BY floor, slot_number')
    return jsonify(all_slots), 200


@slots.route('/api/slots/available', methods=['GET'])
def get_available_slots():
    available = query_db(
        "SELECT * FROM parking_slots WHERE status='available' ORDER BY floor, slot_number"
    )
    return jsonify(available), 200


@slots.route('/api/slots/<int:slot_id>', methods=['GET'])
def get_slot(slot_id):
    slot = query_db('SELECT * FROM parking_slots WHERE id=%s', (slot_id,), one=True)
    if not slot:
        return jsonify({'error': 'Slot not found'}), 404
    return jsonify(slot), 200


@slots.route('/api/slots/<int:slot_id>', methods=['PUT'])
@jwt_required()
def update_slot(slot_id):
    data   = request.get_json()
    status = data.get('status')

    if status not in ['available', 'occupied']:
        return jsonify({'error': 'Invalid status'}), 400

    query_db(
        'UPDATE parking_slots SET status=%s WHERE id=%s',
        (status, slot_id), commit=True
    )
    return jsonify({'message': 'Slot updated'}), 200