import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, GeoJSON } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icons in React-Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Component to dynamically update map center
function ChangeView({ center, zoom, bounds }) {
  const map = useMap();
  useEffect(() => {
    if (bounds && bounds.isValid()) {
      map.fitBounds(bounds, { padding: [20, 20] });
    } else {
      map.setView(center, zoom);
    }
  }, [center, zoom, bounds, map]);
  return null;
}

const MapComponent = ({ latitude, longitude, riskLevel, districtName, evacuationPlan }) => {
  const position = [latitude, longitude];
  
  const getRiskColor = (level) => {
    switch (level) {
      case 'CRITICAL': return 'red';
      case 'HIGH': return 'orange';
      case 'MODERATE': return 'gold';
      case 'LOW': return 'green';
      default: return 'blue';
    }
  };

  const markerHtmlStyles = `
    background-color: ${getRiskColor(riskLevel)};
    width: 20px;
    height: 20px;
    display: block;
    left: -10px;
    top: -10px;
    position: relative;
    border-radius: 50%;
    border: 2px solid #FFFFFF;
    box-shadow: 0px 0px 5px rgba(0,0,0,0.5);
  `;

  const customIcon = L.divIcon({
    className: "custom-pin",
    iconAnchor: [0, 0],
    labelAnchor: [-6, 0],
    popupAnchor: [0, -10],
    html: `<span style="${markerHtmlStyles}" />`
  });

  const shelterIcon = L.divIcon({
    className: "custom-pin",
    iconAnchor: [0, 0],
    labelAnchor: [-6, 0],
    popupAnchor: [0, -10],
    html: `<span style="background-color: #22c55e; width: 20px; height: 20px; display: block; left: -10px; top: -10px; position: relative; border-radius: 50%; border: 2px solid #FFFFFF; box-shadow: 0px 0px 5px rgba(0,0,0,0.5);" />`
  });

  // Calculate bounds if evacuation plan exists
  let bounds = null;
  if (evacuationPlan) {
    const latLngs = [];
    latLngs.push(L.latLng(latitude, longitude));
    latLngs.push(L.latLng(evacuationPlan.shelter.latitude, evacuationPlan.shelter.longitude));
    if (evacuationPlan.safe_route?.geometry?.coordinates) {
      evacuationPlan.safe_route.geometry.coordinates.forEach(coord => {
        latLngs.push(L.latLng(coord[1], coord[0]));
      });
    }
    bounds = L.latLngBounds(latLngs);
  }

  return (
    <MapContainer center={position} zoom={11} style={{ height: '350px', width: '100%', borderRadius: '8px' }}>
      <ChangeView center={position} zoom={11} bounds={bounds} />
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      
      {evacuationPlan && evacuationPlan.disrupted_route && (
        <GeoJSON 
          key="disrupted-route"
          data={evacuationPlan.disrupted_route.geometry} 
          style={{ color: '#ef4444', weight: 4, dashArray: '5, 10' }} 
        />
      )}

      {evacuationPlan && evacuationPlan.safe_route && (
        <GeoJSON 
          key="safe-route"
          data={evacuationPlan.safe_route.geometry} 
          style={{ color: '#22c55e', weight: 5, opacity: 0.8 }} 
        />
      )}

      <Marker position={position} icon={customIcon}>
        <Popup>
          <strong>{districtName}</strong><br />
          Risk Level: {riskLevel}
        </Popup>
      </Marker>

      {evacuationPlan && (
        <Marker position={[evacuationPlan.shelter.latitude, evacuationPlan.shelter.longitude]} icon={shelterIcon}>
          <Popup>
            <strong>{evacuationPlan.shelter.name}</strong><br />
            Safe Shelter location.
          </Popup>
        </Marker>
      )}
    </MapContainer>
  );
};

export default MapComponent;
