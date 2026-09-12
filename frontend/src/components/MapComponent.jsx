import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, GeoJSON, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icons in React-Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Component to dynamically update map center and fit route bounds
function ChangeView({ center, zoom, bounds }) {
  const map = useMap();
  useEffect(() => {
    if (bounds && bounds.isValid()) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    } else if (center && center[0] && center[1]) {
      map.setView(center, zoom || 10);
    }
  }, [center, zoom, bounds, map]);
  return null;
}

const MapComponent = ({
  latitude = 31.76,
  longitude = 77.21,
  riskLevel = 'MODERATE',
  districtName = 'Current Location',
  evacuationPlan = null,
  height = '380px'
}) => {
  const position = [Number(latitude) || 31.76, Number(longitude) || 77.21];

  const getRiskColor = (level) => {
    switch (level?.toUpperCase()) {
      case 'CRITICAL': return '#ef4444';
      case 'HIGH': return '#f97316';
      case 'MODERATE': return '#eab308';
      case 'LOW': return '#10b981';
      default: return '#3b82f6';
    }
  };

  // Custom DivIcon for Start / Current Location (Radar Pulse Ring + SVG Location Pin)
  const startIcon = L.divIcon({
    className: 'evac-start-icon-container',
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    popupAnchor: [0, -22],
    html: `
      <div class="evac-start-marker">
        <div class="evac-radar-ring" style="background: ${getRiskColor(riskLevel)};"></div>
        <div class="evac-radar-ring-2" style="background: ${getRiskColor(riskLevel)};"></div>
        <div class="evac-start-pin-core" style="background: ${getRiskColor(riskLevel)};">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-10a8 8 0 0 1 16 0Z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
        </div>
      </div>
    `
  });

  // Custom DivIcon for Safe Shelter Destination (Emerald Glassmorphism Shield Badge with Elevation)
  const elevationText = evacuationPlan?.elevation_gain_m ? `+${evacuationPlan.elevation_gain_m}m` : 'Safe Zone';
  const shelterIcon = L.divIcon({
    className: 'evac-shelter-icon-container',
    iconSize: [140, 52],
    iconAnchor: [70, 50],
    popupAnchor: [0, -48],
    html: `
      <div class="evac-shelter-marker-wrap">
        <div class="evac-shelter-badge">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="#ffffff" opacity="0.95">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            <path d="M9 12l2 2 4-4" stroke="#059669" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
          </svg>
          <span style="font-size: 0.76rem; letter-spacing: 0.2px;">SHELTER</span>
          <span class="evac-shelter-elev">${elevationText}</span>
        </div>
        <div class="evac-shelter-pointer"></div>
      </div>
    `
  });

  // Custom DivIcon for Hazard / Submerged Road Warning (Danger Alert Badge with Pulse)
  const hazardIcon = L.divIcon({
    className: 'evac-hazard-icon-container',
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18],
    html: `
      <div class="evac-hazard-marker">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
          <line x1="12" y1="9" x2="12" y2="13"/>
          <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
      </div>
    `
  });

  // Calculate bounding box if evacuation plan is active
  let bounds = null;
  if (evacuationPlan && evacuationPlan.shelter) {
    const latLngs = [];
    latLngs.push(L.latLng(position[0], position[1]));
    latLngs.push(L.latLng(evacuationPlan.shelter.latitude, evacuationPlan.shelter.longitude));

    if (evacuationPlan.safe_route?.geometry?.coordinates) {
      evacuationPlan.safe_route.geometry.coordinates.forEach((coord) => {
        latLngs.push(L.latLng(coord[1], coord[0]));
      });
    }
    bounds = L.latLngBounds(latLngs);
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: height, borderRadius: '12px', overflow: 'hidden' }}>
      <MapContainer
        center={position}
        zoom={10}
        style={{ height: '100%', width: '100%', background: '#090d16' }}
        scrollWheelZoom={true}
      >
        <ChangeView center={position} zoom={10} bounds={bounds} />

        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          maxZoom={19}
        />


        {/* Disrupted / Submerged Road Section (Red Dashed) */}
        {evacuationPlan && evacuationPlan.disrupted_route?.geometry && (
          <GeoJSON
            key={`disrupted-${evacuationPlan.shelter?.name}-${evacuationPlan.mode || 'mode'}`}
            data={evacuationPlan.disrupted_route.geometry}
            style={{
              color: '#ef4444',
              weight: 4.5,
              dashArray: '6, 8',
              opacity: 0.85
            }}
          />
        )}

        {/* Safe High-Ground Corridor Route (Green Glowing Line) */}
        {evacuationPlan && evacuationPlan.safe_route?.geometry && (
          <GeoJSON
            key={`safe-${evacuationPlan.shelter?.name}-${evacuationPlan.mode || 'mode'}`}
            data={evacuationPlan.safe_route.geometry}
            style={{
              color: '#10b981',
              weight: 5.5,
              opacity: 0.95
            }}
          >
            <Tooltip sticky>
              <div style={{ padding: '4px 6px', fontSize: '12px', lineHeight: '1.4' }}>
                <strong style={{ color: '#10b981' }}>🟢 Safe Evacuation Corridor</strong>
                <div>Distance: {evacuationPlan.safe_route.distance_km} km</div>
                <div>ETA: ~{evacuationPlan.safe_route.duration_min} mins</div>
                <div>Elevation Gain: +{evacuationPlan.elevation_gain_m}m</div>
              </div>
            </Tooltip>
          </GeoJSON>
        )}

        {/* Hazard Block Point Marker */}
        {evacuationPlan?.disrupted_route?.block_point && (
          <Marker
            position={[
              evacuationPlan.disrupted_route.block_point.latitude,
              evacuationPlan.disrupted_route.block_point.longitude
            ]}
            icon={hazardIcon}
          >
            <Popup>
              <div style={{ padding: '6px 8px', maxWidth: '200px', fontSize: '12px' }}>
                <strong style={{ color: '#ef4444' }}>⛔ Submerged / Flooded Road</strong>
                <p style={{ margin: '4px 0 0 0', color: '#475569' }}>
                  {evacuationPlan.disrupted_route.hazard_reason || 'Inundation risk along river channel.'}
                </p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Origin / User Location Pin */}
        <Marker position={position} icon={startIcon}>
          <Popup>
            <div style={{ padding: '6px 8px', fontSize: '12px' }}>
              <strong>📍 {districtName}</strong><br />
              <span style={{ color: getRiskColor(riskLevel), fontWeight: 'bold' }}>Current Risk: {riskLevel}</span>
            </div>
          </Popup>
        </Marker>

        {/* Safe Relief Shelter Pin */}
        {evacuationPlan && evacuationPlan.shelter && (
          <Marker
            position={[evacuationPlan.shelter.latitude, evacuationPlan.shelter.longitude]}
            icon={shelterIcon}
            eventHandlers={{
              click: () => {
                const origin = `${position[0]},${position[1]}`;
                const dest = `${evacuationPlan.shelter.latitude},${evacuationPlan.shelter.longitude}`;
                const travelMode = (evacuationPlan.mode || 'driving') === 'walking' ? 'walking' : 'driving';
                const gmapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${dest}&travelmode=${travelMode}`;
                window.open(gmapsUrl, '_blank', 'noopener,noreferrer');
              }
            }}
          >
            <Popup>
              <div style={{ padding: '8px 10px', minWidth: '210px', fontSize: '12px' }}>
                <span style={{ background: '#10b981', color: '#fff', fontSize: '10px', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
                  SAFE RELIEF SHELTER
                </span>
                <h4 style={{ margin: '6px 0 3px 0', fontSize: '13px', color: '#0f172a' }}>
                  {evacuationPlan.shelter.name}
                </h4>
                <p style={{ margin: 0, fontSize: '11px', color: '#64748b' }}>
                  {evacuationPlan.shelter.type} · +{evacuationPlan.elevation_gain_m}m Elevation
                </p>
                <div style={{ marginTop: '6px', fontSize: '11px', color: '#059669', fontWeight: 'bold' }}>
                  Distance: {evacuationPlan.safe_route?.distance_km} km (⏱ ~{evacuationPlan.safe_route?.duration_min} mins)
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const origin = `${position[0]},${position[1]}`;
                    const dest = `${evacuationPlan.shelter.latitude},${evacuationPlan.shelter.longitude}`;
                    const travelMode = (evacuationPlan.mode || 'driving') === 'walking' ? 'walking' : 'driving';
                    const gmapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${dest}&travelmode=${travelMode}`;
                    window.open(gmapsUrl, '_blank', 'noopener,noreferrer');
                  }}
                  style={{
                    marginTop: '10px',
                    width: '100%',
                    padding: '7px 10px',
                    background: 'linear-gradient(135deg, #10b981, #059669)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    fontWeight: '700',
                    fontSize: '11px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '5px',
                    boxShadow: '0 2px 8px rgba(16, 185, 129, 0.4)'
                  }}
                >
                  🗺️ Open in Google Maps
                </button>
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
};

export default MapComponent;
