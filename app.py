from flask import Flask, render_template, jsonify, request
from gevent.pywsgi import WSGIServer
import csv
import random
import os

app = Flask(__name__)

if os.name != 'nt':
    import fcntl

CAMPUS_BOUNDS = {
    "north": 13.006854936862313,
    "south": 12.98194024408501,
    "east": 80.24419665683384,
    "west": 80.22102494207626
}

CSV_FILE = 'bus_coordinates.csv'

bus_data = {}
user_location = {"lat": None, "lng": None}  # Store user's location

def load_bus_data():
    global bus_data
    try:
        with open(CSV_FILE, mode='r') as file:
            reader = csv.DictReader(file)
            for row in reader:
                bus_data[row['Bus']] = {"lat": float(row['lat']), "lng": float(row['lng'])}
    except FileNotFoundError:
        bus_data = {
            "Bus 1": {"lat": 12.995, "lng": 80.233},
            "Bus 2": {"lat": 13.000, "lng": 80.235},
            "Bus 3": {"lat": 12.998, "lng": 80.230}
        }
        save_bus_data(bus_data)
    return bus_data

def save_bus_data(bus_data):
    with open(CSV_FILE, mode='w', newline='') as file:
        writer = csv.writer(file)
        writer.writerow(['Bus', 'lat', 'lng'])
        for bus, coords in bus_data.items():
            writer.writerow([bus, coords['lat'], coords['lng']])

def simulate_movement():
    global bus_data
    if not bus_data:
        bus_data = load_bus_data()

    for bus in bus_data:
        new_lat = bus_data[bus]["lat"] + random.uniform(-0.000005, 0.000005)
        new_lng = bus_data[bus]["lng"] + random.uniform(-0.000005, 0.000005)

        new_lat = max(CAMPUS_BOUNDS["south"], min(new_lat, CAMPUS_BOUNDS["north"]))
        new_lng = max(CAMPUS_BOUNDS["west"], min(new_lng, CAMPUS_BOUNDS["east"]))

        bus_data[bus]["lat"] = new_lat
        bus_data[bus]["lng"] = new_lng

    save_bus_data(bus_data)

@app.route('/')
def home():
    return render_template('map.html')

@app.route('/get_bus_data', methods=['GET'])
def get_bus_data():
    global bus_data
    simulate_movement()
    return jsonify(bus_data)

@app.route('/update-user-location', methods=['POST'])
def update_user_location():
    global user_location
    data = request.get_json()
    user_location["lat"] = data.get("latitude")
    user_location["lng"] = data.get("longitude")
    return jsonify({"status": "success", "user_location": user_location})

if __name__ == '__main__':
    bus_data = load_bus_data()
    print("Server running on http://localhost:5000")
    WSGIServer(('0.0.0.0', 5000), app).serve_forever()
