let exploreMapInstance = null;
let markersLayerGroup = null;
let radiusCirclesGroup = null;

function initExploreMap(containerId, centerLat = 17.4400, centerLng = 78.3800) {
  if (exploreMapInstance) {
    exploreMapInstance.remove();
    exploreMapInstance = null;
  }

  const mapContainer = document.getElementById(containerId);
  if (!mapContainer) return null;

  exploreMapInstance = L.map(containerId).setView([centerLat, centerLng], 12);

  // Modern OpenStreetMap tiles with Google-like crisp look
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
    attribution: '© OpenStreetMap contributors | RENT & REUSE Protected Discovery'
  }).addTo(exploreMapInstance);

  markersLayerGroup = L.layerGroup().addTo(exploreMapInstance);
  radiusCirclesGroup = L.layerGroup().addTo(exploreMapInstance);

  return exploreMapInstance;
}

function updateMapListings(listings = []) {
  if (!exploreMapInstance || !markersLayerGroup || !radiusCirclesGroup) return;

  markersLayerGroup.clearLayers();
  radiusCirclesGroup.clearLayers();

  if (listings.length === 0) return;

  const bounds = [];

  for (const item of listings) {
    const lat = item.approx_latitude || item.latitude;
    const lng = item.approx_longitude || item.longitude;

    if (!lat || !lng) continue;

    bounds.push([lat, lng]);

    const isFree = item.is_borrow_free || item.rent_price_per_day === 0;

    // 1. Add blurred approximate privacy radius circle (~400m radius)
    // Indicating to users that this represents an approximate neighborhood zone
    L.circle([lat, lng], {
      color: isFree ? '#2563eb' : '#059669',
      fillColor: isFree ? '#3b82f6' : '#10b981',
      fillOpacity: 0.15,
      weight: 1,
      radius: 400
    }).addTo(radiusCirclesGroup);

    // 2. Custom Map Marker Pin
    const customIcon = L.divIcon({
      className: `custom-map-pin ${isFree ? 'borrow' : ''}`,
      html: `<span>${isFree ? 'FREE' : '$' + item.rent_price_per_day}</span>`,
      iconSize: [44, 28],
      iconAnchor: [22, 14]
    });

    const marker = L.marker([lat, lng], { icon: customIcon }).addTo(markersLayerGroup);

    // Popup card
    marker.bindPopup(`
      <div class="p-1 max-w-[200px]">
        <img src="${item.primary_image || 'https://images.unsplash.com/photo-1581291518655-9523c932deb4?w=300'}" class="w-full h-24 object-cover rounded-lg mb-2" />
        <span class="text-[10px] font-bold px-1.5 py-0.5 rounded ${isFree ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'}">
          ${isFree ? 'FREE BORROW' : '$' + item.rent_price_per_day + '/day'}
        </span>
        <h4 class="font-bold text-xs text-slate-900 mt-1 line-clamp-1">${item.title}</h4>
        <p class="text-[11px] text-slate-500 mb-2">${item.location_name} (Approx zone)</p>
        <a href="#listing/${item.id}" class="block text-center text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white py-1 rounded">View Details</a>
      </div>
    `);
  }

  if (bounds.length > 0) {
    exploreMapInstance.fitBounds(bounds, { padding: [40, 40] });
  }
}
