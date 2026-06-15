from flask import Flask, send_from_directory
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from routes.auth import auth
from routes.slots import slots
from routes.bookings import bookings
from routes.payments import payments
from routes.admin import admin
import os

app = Flask(__name__,
    static_folder=os.path.join(os.path.dirname(__file__), '..', 'frontend', 'static'),
    template_folder=os.path.join(os.path.dirname(__file__), '..', 'frontend', 'templates')
)
CORS(app)

# JWT Configuration
app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY', 'smartpark-secret-2026')
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = 86400  # 24 hours
jwt = JWTManager(app)

app.register_blueprint(auth)
app.register_blueprint(slots)
app.register_blueprint(bookings)
app.register_blueprint(payments)
app.register_blueprint(admin)

@app.route('/')
def index():
    return send_from_directory(app.template_folder, 'index.html')

@app.route('/<page>.html')
def serve_page(page):
    return send_from_directory(app.template_folder, f'{page}.html')

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(debug=False, host='0.0.0.0', port=port)