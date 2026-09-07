import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
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
function ChangeView({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

const MapComponent = ({ latitude, longitude, riskLevel, districtName }) => {
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

  return (
    <MapContainer center={position} zoom={8} style={{ height: '300px', width: '100%', borderRadius: '8px' }}>
      <ChangeView center={position} zoom={8} />
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      <Marker position={position} icon={customIcon}>
        <Popup>
          <strong>{districtName}</strong><br />
          Risk Level: {riskLevel}
        </Popup>
      </Marker>
    </MapContainer>
  );
};

export default MapComponent;
