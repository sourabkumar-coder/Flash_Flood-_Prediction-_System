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

  // Custom DivIcon for Start / Current Location
  const startIcon = L.divIcon({
    className: 'evac-start-icon',
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    popupAnchor: [0, -14],
    html: `
      <div style="
        position: relative;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="
          position: absolute;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: ${getRiskColor(riskLevel)};
          opacity: 0.4;
          animation: pulse-ring 1.5s infinite;
        "></div>
        <div style="
          width: 18px;
          height: 18px;
          background: ${getRiskColor(riskLevel)};
          border: 2.5px solid #ffffff;
          border-radius: 50%;
          box-shadow: 0 0 10px rgba(0,0,0,0.6);
        "></div>
      </div>
    `
  });

  // Custom DivIcon for Safe Shelter Destination (Shield)
  const shelterIcon = L.divIcon({
    className: 'evac-shelter-icon',
    iconSize: [38, 38],
    iconAnchor: [19, 19],
    popupAnchor: [0, -18],
    html: `
      <div style="
        width: 36px;
        height: 36px;
        background: #10b981;
        border: 2.5px solid #ffffff;
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 0 15px rgba(16, 185, 129, 0.7), 0 4px 10px rgba(0,0,0,0.4);
        font-size: 18px;
        cursor: pointer;
      ">
        🛡️
      </div>
    `
  });

  // Custom DivIcon for Hazard / Submerged Road Warning
  const hazardIcon = L.divIcon({
    className: 'evac-hazard-icon',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
    html: `
      <div style="
        width: 26px;
        height: 26px;
        background: #ef4444;
        border: 2px solid #ffffff;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 0 12px rgba(239, 68, 68, 0.8);
        font-size: 13px;
      ">
        ⛔
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
          >
            <Popup>
              <div style={{ padding: '8px 10px', minWidth: '200px', fontSize: '12px' }}>
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
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
};

export default MapComponent;
