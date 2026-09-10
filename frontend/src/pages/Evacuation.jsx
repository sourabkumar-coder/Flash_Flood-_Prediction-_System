import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { evacuationApi, riskApi } from '../api/client';
import MapComponent from '../components/MapComponent';
import { 
  ShieldAlert, Users, Navigation, MapPin, AlertTriangle, 
  Car, Footprints, ArrowRight, CheckCircle, RefreshCw, Compass
} from 'lucide-react';
import './Evacuation.css';

export default function Evacuation() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [lat, setLat] = useState(parseFloat(searchParams.get('lat')) || 31.765);
  const [lon, setLon] = useState(parseFloat(searchParams.get('lon')) || 77.342);
  const [locationName, setLocationName] = useState(searchParams.get('name') || 'Sainj Valley (Neuli)');
  const [stateName, setStateName] = useState(searchParams.get('state') || 'Himachal Pradesh');
  const [districtName, setDistrictName] = useState(searchParams.get('district') || 'Kullu');

  const [mode, setMode] = useState('driving');
  const [selectedShelterIdx, setSelectedShelterIdx] = useState(0);
  const [evacuationPlan, setEvacuationPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchEvacuationRoute(mode, selectedShelterIdx);
  }, [lat, lon, mode, selectedShelterIdx]);

  const fetchEvacuationRoute = async (currentMode = mode, shelterIdx = selectedShelterIdx) => {
    try {
      setLoading(true);
      setError(null);
      const payload = {
        latitude: lat,
        longitude: lon,
        state: stateName,
        district: districtName,
        mode: currentMode,
        target_shelter_index: shelterIdx
      };
      const res = await evacuationApi.getRoute(payload);
      if (res.data) {
        setEvacuationPlan(res.data);
      }
    } catch (err) {
      console.error('Failed to calculate evacuation route:', err);
      setError('Could not calculate evacuation route for this location.');
    } finally {
      setLoading(false);
    }
  };

  const handleModeChange = (newMode) => {
    setMode(newMode);
  };

  const handleSelectShelter = (idx) => {
    setSelectedShelterIdx(idx);
  };

  const handleDetectGps = () => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported by browser.');
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const userLat = pos.coords.latitude;
        const userLon = pos.coords.longitude;
        setLat(userLat);
        setLon(userLon);
        setLocationName('Current Location (GPS)');
        setGpsLoading(false);
        setSearchParams({ lat: userLat.toString(), lon: userLon.toString(), name: 'Current Location (GPS)' });
      },
      (err) => {
        setGpsLoading(false);
        setError('Failed to acquire GPS coordinates.');
      }
    );
  };

  return (
    <div className="evacuation-page-container">
      {/* Header & Quick Location Actions */}
      <div className="evac-top-bar panel">
        <div className="etb-left">
          <div className="etb-title-wrap">
            <ShieldAlert size={22} color="#10b981" />
            <div>
              <h2>Safe Evacuation Navigator</h2>
              <p>Topographical high-ground rescue routing avoiding inundated river channels.</p>
            </div>
          </div>
        </div>

        <div className="etb-right">
          <button
            type="button"
            className="gps-btn"
            onClick={handleDetectGps}
            disabled={gpsLoading || loading}
          >
            <MapPin size={15} />
            <span>{gpsLoading ? 'Acquiring GPS...' : 'Route From My GPS'}</span>
          </button>

          {/* Mode Switcher */}
          <div className="mode-switcher">
            <button
              type="button"
              className={`mode-btn ${mode === 'driving' ? 'active' : ''}`}
              onClick={() => handleModeChange('driving')}
            >
              <Car size={15} />
              <span>Driving</span>
            </button>
            <button
              type="button"
              className={`mode-btn ${mode === 'walking' ? 'active' : ''}`}
              onClick={() => handleModeChange('walking')}
            >
              <Footprints size={15} />
              <span>Walking</span>
            </button>
          </div>
        </div>
      </div>

      {error && <div className="error-banner panel"><AlertTriangle size={16} /><span>{error}</span></div>}

      {/* Main Evacuation Grid */}
      <div className="evac-main-grid">
        {/* Left Column: Interactive Escape Corridor Map */}
        <div className="evac-map-panel panel">
          <div className="map-panel-header">
            <div>
              <h3><MapPin size={18} className="icon-blue" /> Live Escape Route & Hazard Map</h3>
              <p className="subtitle-text">
                Origin: <strong>{locationName}</strong> &rarr; Destination: <strong>{evacuationPlan?.shelter?.name || 'Safe High Ground Shelter'}</strong>
              </p>
            </div>

            {evacuationPlan?.safe_route && (
              <div className="safe-stats-pills">
                <span className="pill green">🟢 {evacuationPlan.safe_route.distance_km} km</span>
                <span className="pill blue">⏱ ~{evacuationPlan.safe_route.duration_min} min</span>
                <span className="pill orange">▲ +{evacuationPlan.elevation_gain_m}m Elevation</span>
              </div>
            )}
          </div>

          <div className="evac-map-canvas">
            <MapComponent
              latitude={lat}
              longitude={lon}
              districtName={locationName}
              riskLevel="CRITICAL"
              evacuationPlan={evacuationPlan}
              height="480px"
            />
          </div>

          {/* Disrupted Road Hazard Notice */}
          {evacuationPlan?.disrupted_route && (
            <div className="hazard-warning-box">
              <AlertTriangle size={20} color="#ef4444" />
              <div>
                <strong>Road Hazard Detected on Primary Riverbank Route:</strong>
                <p>{evacuationPlan.disrupted_route.hazard_reason || 'Low-lying road section at risk of high-velocity inundation.'}</p>
                <span className="avoidance-tag">✓ Rerouted via Elevated Hillside Corridor</span>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Shelters & Turn-by-Turn Guidance */}
        <div className="evac-sidebar-column">
          {/* Target Safe Shelter Card */}
          {evacuationPlan?.shelter && (
            <div className="primary-shelter-card panel">
              <div className="psc-header">
                <span className="badge-safe">PRIMARY RELIEF SHELTER</span>
                <span className="shelter-dist">{evacuationPlan.shelter.distance_km} km away</span>
              </div>
              <h3>{evacuationPlan.shelter.name}</h3>
              <p className="psc-type">{evacuationPlan.shelter.type} · High Ground Sanctuary</p>
              <div className="psc-stats">
                <div><span>Elevation Gain</span><strong>+{evacuationPlan.elevation_gain_m}m</strong></div>
                <div><span>Estimated Travel</span><strong>~{evacuationPlan.safe_route?.duration_min} mins</strong></div>
                <div><span>Safety Level</span><strong style={{ color: '#10b981' }}>{evacuationPlan.safe_route?.hazard_level || 'Safe Corridor'}</strong></div>
              </div>
            </div>
          )}

          {/* Alternative Shelters Selection */}
          {evacuationPlan?.alternative_shelters && evacuationPlan.alternative_shelters.length > 0 && (
            <div className="alt-shelters-panel panel">
              <h4>Alternative Relief Shelters</h4>
              <div className="alt-shelters-list">
                {evacuationPlan.alternative_shelters.map((alt, idx) => (
                  <div
                    key={alt.name}
                    className={`alt-shelter-item ${selectedShelterIdx === idx ? 'selected' : ''}`}
                    onClick={() => handleSelectShelter(idx)}
                  >
                    <div className="asi-left">
                      <strong>{alt.name}</strong>
                      <span>{alt.type} · {alt.distance_km} km</span>
                    </div>
                    <button type="button" className="asi-btn">
                      {selectedShelterIdx === idx ? 'Selected' : 'Route Here'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Turn-by-Turn Navigation Steps */}
          {evacuationPlan?.safe_route?.steps && evacuationPlan.safe_route.steps.length > 0 && (
            <div className="steps-panel panel">
              <h4>Turn-by-Turn Safe Navigation</h4>
              <div className="steps-scroll-list">
                {evacuationPlan.safe_route.steps.map((st, i) => (
                  <div key={i} className="step-row">
                    <span className="step-num">{st.step || i + 1}</span>
                    <div className="step-info">
                      <p className="step-instruction">{st.instruction}</p>
                      <span className="step-meta">
                        {st.street_name && `${st.street_name} · `}{st.distance_m}m · {Math.round(st.duration_s / 60)} min
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Emergency Helpline Box */}
          <div className="helpline-panel panel">
            <h4>🚨 Emergency Rescue Helplines</h4>
            <div className="hl-grid">
              <div><span>NDRF National Helpline</span><a href="tel:1078">📞 1078 / 112</a></div>
              <div><span>NDRF 24/7 Mobile</span><a href="tel:9711077372">📞 +91-9711077372</a></div>
              <div><span>State SEOC Hotline</span><a href="tel:1070">📞 1070</a></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

