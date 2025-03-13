// Initialize the map
let map = L.map('map').setView([12.995, 80.233], 16);

// Add OpenStreetMap tile layer
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

// Custom bus icon
const busIcon = L.icon({
    iconUrl: '/static/bus_icon.png',
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -40]
});

// Marker storage
const markers = {};

// Function to fetch and update bus locations
async function fetchBusData() {
    const response = await fetch('/get_bus_data');
    const data = await response.json();

    for (const bus in data) {
        const { lat, lng } = data[bus];

        if (!markers[bus]) {
            markers[bus] = L.marker([lat, lng], { icon: busIcon })
                .addTo(map)
                .bindPopup(`${bus}`);
        } else {
            markers[bus].setLatLng([lat, lng]);
        }
    }
}

// Refresh bus data every 500ms for smoother movement
setInterval(fetchBusData, 500);

// Initial load
fetchBusData();

// ----------------- ROUTE PLANNING FUNCTIONALITY -----------------

let routeLayer = null; // Store route instance for removal
let startPoint = null; // Stores the starting point
let endPoint = null; // Stores the ending point

const GH_API_KEY = "419974d1-cc56-4e80-8be2-93d1e90870a6"; // GraphHopper API Key

// Function to request and display routes
async function runDirection(start, end) {
    if (routeLayer) {
        alert("🚫 A route is already active. Please cancel the route first.");
        return;
    }

    // GraphHopper API endpoint
    const url = `https://graphhopper.com/api/1/route?point=${start[0]},${start[1]}&point=${end[0]},${end[1]}&vehicle=car&locale=en&key=${GH_API_KEY}&points_encoded=false`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (!data.paths || data.paths.length === 0) {
            alert("❌ No valid route found. Try different points.");
            return;
        }

        // Extract route coordinates
        const routeCoordinates = data.paths[0].points.coordinates.map(coord => [coord[1], coord[0]]);

        // Draw route on map
        routeLayer = L.polyline(routeCoordinates, { color: 'blue', weight: 5 }).addTo(map);

        // Fit the map view to the route
        map.fitBounds(routeLayer.getBounds());

        // Display route details
        const distance = (data.paths[0].distance / 1000).toFixed(2); // Distance in km
        const duration = (data.paths[0].time / 60000).toFixed(2); // Duration in minutes

        document.getElementById('route-details').innerHTML = `
            <b>🚶 Distance:</b> ${distance} km <br>
            <b>⏳ ETA:</b> ${duration} mins
        `;

        // Show "Cancel Route" button
        document.getElementById('cancel-route').style.display = 'block';

    } catch (error) {
        console.error("Error fetching route data:", error);
        alert("❌ Error generating route. Please try again.");
    }
}

// Geocode function to find the **nearest place name**
async function reverseGeocode(lat, lng) {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`;
    const response = await fetch(url);
    const data = await response.json();

    return data.display_name || "Unknown Location";
}

// Function to handle map click events
map.on('click', async function(e) {
    const { lat, lng } = e.latlng;

    if (!startPoint) {
        startPoint = [lat, lng];
        const startPlaceName = await reverseGeocode(lat, lng);
        document.getElementById('start').value = startPlaceName;
    } else if (!endPoint) {
        endPoint = [lat, lng];
        const endPlaceName = await reverseGeocode(lat, lng);
        document.getElementById('end').value = endPlaceName;

        // Now that we have both points, calculate the route
        runDirection(startPoint, endPoint);
    }
});

// Function to cancel the route
function cancelRoute() {
    if (routeLayer) {
        map.removeLayer(routeLayer);
        routeLayer = null;
        startPoint = null;
        endPoint = null;
        document.getElementById('start').value = "";
        document.getElementById('end').value = "";
        document.getElementById('route-details').innerHTML = "";
        document.getElementById('cancel-route').style.display = 'none';
    }
}

// Event listener for cancel button
document.getElementById('cancel-route').addEventListener('click', cancelRoute);