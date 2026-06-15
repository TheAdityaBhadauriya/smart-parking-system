from flask import Flask, send_from_directory
from flask_cors import CORS
from routes.auth import auth
from routes.slots import slots
from routes.bookings import bookings
import os

# Tell Flask where the static and template folders are
app = Flask(__name__,
    static_folder=os.path.join('..', 'frontend', 'static'),
    template_folder=os.path.join('..', 'frontend', 'templates')
)
CORS(app)

app.register_blueprint(auth)
app.register_blueprint(slots)
app.register_blueprint(bookings)

# ── SERVE FRONTEND PAGES ───────────────────────────────
@app.route('/')
def index():
    return send_from_directory('../frontend/templates', 'index.html')

@app.route('/<page>.html')
def serve_page(page):
    return send_from_directory('../frontend/templates', f'{page}.html')

if __name__ == '__main__':
    app.run(debug=True, port=5000)