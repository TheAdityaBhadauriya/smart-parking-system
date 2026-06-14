from flask import Flask
from flask_cors import CORS
from routes.auth import auth
from routes.slots import slots
from routes.bookings import bookings

app = Flask(__name__)
CORS(app)

app.register_blueprint(auth)
app.register_blueprint(slots)
app.register_blueprint(bookings)

if __name__ == '__main__':
    app.run(debug=True, port=5000)