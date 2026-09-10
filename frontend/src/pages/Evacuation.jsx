import React, { useEffect, useState } from 'react';
import { evacuationApi } from '../api/client';
import { ShieldAlert, Users, Navigation, MapPin } from 'lucide-react';
import './Evacuation.css';

export default function Evacuation() {
  const [shelters, setShelters] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchShelters();
  }, []);

  const fetchShelters = async () => {
    try {
      const response = await evacuationApi.getShelters();
      setShelters(response.data.shelters || []);
    } catch (err) {
      console.error('Failed to fetch shelters:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="loading-state">Loading evacuation protocols...</div>;

  return (
    <div className="evacuation-container">
      <div className="page-header">
        <h1>Evacuation Management</h1>
        <p>Coordinate safe zones, active shelters, and population movement.</p>
      </div>

      <div className="evac-grid">
        <div className="panel evac-map-placeholder">
          <div className="placeholder-content">
            <MapPin size={48} color="var(--text-muted)" />
            <h3>Evacuation Route Map</h3>
            <p>Geospatial view of danger zones and safe routes.</p>
            <button className="btn-outline">Open Full Map</button>
          </div>
        </div>

        <div className="shelter-list">
          <h2><ShieldAlert size={20} className="icon-blue" /> Designated Shelters</h2>
          
          {shelters.map(shelter => {
            const occupancyRate = Math.round((shelter.occupied / shelter.capacity) * 100);
            return (
              <div key={shelter.id} className="shelter-card panel">
                <div className="shelter-header">
                  <h3>{shelter.name}</h3>
                  <span className={`badge ${occupancyRate > 90 ? 'critical' : occupancyRate > 70 ? 'moderate' : 'low'}`}>
                    {occupancyRate}% Full
                  </span>
                </div>
                
                <div className="progress-bar-bg">
                  <div 
                    className={`progress-bar-fill ${occupancyRate > 90 ? 'critical-bg' : occupancyRate > 70 ? 'moderate-bg' : 'low-bg'}`} 
                    style={{ width: `${occupancyRate}%` }}
                  ></div>
                </div>

                <div className="shelter-stats">
                  <div className="stat">
                    <Users size={16} />
                    <span>{shelter.occupied} / {shelter.capacity}</span>
                  </div>
                  <div className="stat">
                    <Navigation size={16} />
                    <span>{shelter.lat.toFixed(2)}, {shelter.lon.toFixed(2)}</span>
                  </div>
                </div>

                <div className="shelter-facilities">
                  <span className={`facility ${shelter.medical ? 'active' : 'inactive'}`}>Medical</span>
                  <span className={`facility ${shelter.power ? 'active' : 'inactive'}`}>Backup Power</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
