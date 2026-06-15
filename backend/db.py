import mysql.connector
import os

DB_CONFIG = {
    'host':         os.environ.get('DB_HOST', 'localhost'),
    'port':         int(os.environ.get('DB_PORT', 3306)),
    'user':         os.environ.get('DB_USER', 'root'),
    'password':     os.environ.get('DB_PASSWORD', ''),
    'database':     os.environ.get('DB_NAME', 'smart_parking'),
    'ssl_disabled': False
}

def get_db():
    connection = mysql.connector.connect(**DB_CONFIG)
    return connection