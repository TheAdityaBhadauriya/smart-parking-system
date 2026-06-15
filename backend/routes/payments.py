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