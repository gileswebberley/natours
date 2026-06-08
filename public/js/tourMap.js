const locations = JSON.parse(document.getElementById('map').dataset.locations);
//Using Leaflet for our map features, it is created by Ukrainian developers and so don't use it if you support the Russian invasion of Ukraine!! It is open source and free to use just like openstreetmap which we use to get the 'tiles'.

const features = [];
//add each point to the features array in the correct format for Leaflet
locations.forEach((loc) => {
  features.push({
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: loc.coordinates,
    },
    properties: { description: `Day ${loc.day}: ${loc.description}` },
  });
});

//console.table(features);

const geojson = {
  type: 'FeatureCollection',
  features,
};

// Initialise the map, I've left it so that scroll wheel will zoom, unlike Jonas, as whenever I see a map I expect to be able to zoom like this
const map = L.map('map', {
  scrollWheelZoom: true,
  zoomControl: true,
});

// Add an open-source tile layer (this styles the map)
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors',
}).addTo(map);

// Define the custom green pin icon to match Jonas's styling
const greenIcon = L.icon({
  iconUrl: '/img/pin.png',
  iconSize: [32, 40],
  iconAnchor: [16, 40],
  popupAnchor: [0, -40],
});
// keep these so we can join the points with a line later and also to fit the map to the bounds of the points
const points = [];

// Add markers, popups, and track the bounds with the points array
geojson.features.forEach((marker) => {
  // Reverse the coordinates array because Leaflet uses [lat, lng]
  const latLng = [
    marker.geometry.coordinates[1],
    marker.geometry.coordinates[0],
  ];
  points.push(latLng);

  // Create Marker with custom pin and bind a popup to it
  L.marker(latLng, { icon: greenIcon })
    .addTo(map)
    .bindPopup(`<p>${marker.properties.description}</p>`, {
      closeButton: false,
      autoClose: true,
      closeOnClick: false,
      className: 'leaflet-popup-content-wrapper', // You can style this class in your CSS
    });
});

// Draw the connecting route line matching the Natours theme colour (#55c57a)
L.polyline(points, {
  color: '#55c57a',
  weight: 3,
  opacity: 0.6,
  lineJoin: 'round',
}).addTo(map);

// Auto-zoom and pan the map to fit all points perfectly with some padding
map.fitBounds(points, {
  paddingTopLeft: [50, 200],
  paddingBottomRight: [50, 150],
});
