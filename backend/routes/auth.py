from flask import Blueprint, request, jsonify
from models.helpers import query_db
from flask_jwt_extended import create_access_token
import hashlib

auth = Blueprint('auth', __name__)

def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()


# ── REGISTER ──────────────────────────────────────────
@auth.route('/api/register', methods=['POST'])
def register():
    data     = request.get_json()
    name     = data.get('name')
    email    = data.get('email')
    password = data.get('password')

    if not all([name, email, password]):
        return jsonify({'error': 'All fields are required'}), 400

    existing = query_db('SELECT id FROM users WHERE email=%s', (email,), one=True)
    if existing:
        return jsonify({'error': 'Email already registered'}), 409

    hashed = hash_password(password)
    query_db(
        'INSERT INTO users (name, email, password) VALUES (%s, %s, %s)',
        (name, email, hashed), commit=True
    )
    return jsonify({'message': 'Registered successfully'}), 201


# ── LOGIN ─────────────────────────────────────────────
@auth.route('/api/login', methods=['POST'])
def login():
    data     = request.get_json()
    email    = data.get('email')
    password = data.get('password')

    if not all([email, password]):
        return jsonify({'error': 'Email and password required'}), 400

    hashed = hash_password(password)
    user = query_db(
        'SELECT id, name, email, role FROM users WHERE email=%s AND password=%s',
        (email, hashed), one=True
    )

    if not user:
        return jsonify({'error': 'Invalid credentials'}), 401

    # Generate JWT token
    token = create_access_token(identity={
        'id':    user['id'],
        'name':  user['name'],
        'email': user['email'],
        'role':  user['role']
    })

    return jsonify({
        'message': 'Login successful',
        'token':   token,
        'user':    user
    }), 200