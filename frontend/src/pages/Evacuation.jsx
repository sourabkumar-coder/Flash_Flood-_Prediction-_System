import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { evacuationApi, riskApi } from '../api/client';
import MapComponent from '../components/MapComponent';
import { 
  ShieldAlert, Users, Navigation, MapPin, AlertTriangle, 
  Car, Footprints, ArrowRight, CheckCircle, RefreshCw, Compass
} from 'lucide-react';
import './Evacuation.css';

export default function Evacuation() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();

  const initialLat = searchParams.get('lat');
  const initialLon = searchParams.get('lon');
  const [lat, setLat] = useState(initialLat ? parseFloat(initialLat) : null);
  const [lon, setLon] = useState(initialLon ? parseFloat(initialLon) : null);
  const [locationName, setLocationName] = useState(searchParams.get('name') || 'No location selected');
  const [stateName, setStateName] = useState(searchParams.get('state') || '');
  const [districtName, setDistrictName] = useState(searchParams.get('district') || '');
  const [riskLevel, setRiskLevel] = useState(searchParams.get('risk') || '');

  const [mode, setMode] = useState('driving');
  const [selectedShelterIdx, setSelectedShelterIdx] = useState(0);
  const [evacuationPlan, setEvacuationPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [error, setError] = useState(null);

  const evacuationRequired = riskLevel === 'HIGH' || riskLevel === 'CRITICAL';

  useEffect(() => {
    if (lat != null && lon != null) {
      fetchEvacuationRoute(mode, selectedShelterIdx);
    } else {
      setLoading(false);
      setEvacuationPlan(null);
    }
  }, [lat, lon, mode, selectedShelterIdx]);

  const fetchEvacuationRoute = async (currentMode = mode, shelterIdx = selectedShelterIdx) => {
    try {
      setLoading(true);
      setError(null);

      let currentRisk = riskLevel;
      if (!currentRisk) {
        try {
          const riskRes = await riskApi.predict({ latitude: lat, longitude: lon });
          currentRisk = riskRes.data?.prediction?.risk_level || 'LOW';
          setRiskLevel(currentRisk);
        } catch (err) {
          console.error('Failed to fetch risk level:', err);
          setRiskLevel('UNKNOWN');
          setEvacuationPlan(null);
          setError('Risk level could not be verified for this location. Evacuation route is unavailable.');
          setLoading(false);
          return;
        }
      }

      if (currentRisk !== 'HIGH' && currentRisk !== 'CRITICAL') {
        setEvacuationPlan(null);
        setLoading(false);
        return;
      }

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
        setRiskLevel(''); // Reset risk to fetch it for the new location
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
              <h2>{t('evacuation_page.title')}</h2>
              <p>{t('evacuation_page.subtitle')}</p>
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
            <span>{gpsLoading ? t('villages_page.detecting_gps') : t('villages_page.use_gps')}</span>
          </button>

          {/* Mode Switcher */}
          <div className="mode-switcher">
            <button
              type="button"
              className={`mode-btn ${mode === 'driving' ? 'active' : ''}`}
              onClick={() => handleModeChange('driving')}
            >
              <Car size={15} />
              <span>{t('evacuation_page.driving_mode')}</span>
            </button>
            <button
              type="button"
              className={`mode-btn ${mode === 'walking' ? 'active' : ''}`}
              onClick={() => handleModeChange('walking')}
            >
              <Footprints size={15} />
              <span>{t('evacuation_page.walking_mode')}</span>
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
              <h3><MapPin size={18} className="icon-blue" /> {evacuationRequired ? t('evacuation_page.safe_route') : 'Evacuation Status'}</h3>
              <p className="subtitle-text">
                {locationName} {evacuationPlan?.shelter ? `→ ${evacuationPlan.shelter.name}` : ''}
              </p>
            </div>

            {evacuationPlan?.safe_route && (
              <div className="safe-stats-pills">
                <span className="pill green">{evacuationPlan.safe_route.distance_km} km</span>
                <span className="pill blue">~{evacuationPlan.safe_route.duration_min} min</span>
                <span className="pill orange">+{evacuationPlan.elevation_gain_m}m {t('metrics.elevation')}</span>
              </div>
            )}
          </div>
          {!evacuationRequired && riskLevel && (
            <div className="hazard-warning-box" style={{ backgroundColor: '#f0fdf4', borderLeftColor: '#10b981', color: '#065f46' }}>
              <ShieldAlert size={20} color="#10b981" />
              <div>
                <strong style={{ color: '#10b981' }}>Evacuation Not Required</strong>
                <p>{riskLevel ? <>The current risk level for {locationName} is <strong>{riskLevel}</strong>. No evacuation route is necessary at this time.</> : 'Select a high-risk location to view an evacuation route.'}</p>
              </div>
            </div>
          )}

          {evacuationRequired && lat != null && lon != null ? (
            <div className="evac-map-canvas">
              <MapComponent
                latitude={lat}
                longitude={lon}
                districtName={locationName}
                riskLevel={riskLevel || 'UNKNOWN'}
                evacuationPlan={evacuationPlan}
                height="480px"
              />
            </div>
          ) : !evacuationRequired && lat == null && lon == null ? (
            <div className="hazard-warning-box" style={{ backgroundColor: '#eff6ff', borderLeftColor: '#0284c7', color: '#0c4a6e' }}>
              <Compass size={20} color="#0284c7" />
              <div>
                <strong style={{ color: '#0284c7' }}>No evacuation route selected</strong>
                <p>Open this page from a high-risk location or use GPS to verify a specific area.</p>
              </div>
            </div>
          ) : null}

          {/* Disrupted Road Hazard Notice */}
          {evacuationRequired && evacuationPlan?.disrupted_route && (
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
                <span className="badge-safe">{t('evacuation_page.target_shelter')}</span>
                <span className="shelter-dist">{evacuationPlan.shelter.distance_km} km</span>
              </div>
              <h3>{evacuationPlan.shelter.name}</h3>
              <p className="psc-type">{evacuationPlan.shelter.type} · High Ground Sanctuary</p>
              <div className="psc-stats">
                <div><span>{t('metrics.elevation')}</span><strong>+{evacuationPlan.elevation_gain_m}m</strong></div>
                <div><span>{t('evacuation_page.duration')}</span><strong>~{evacuationPlan.safe_route?.duration_min} mins</strong></div>
                <div><span>Status</span><strong style={{ color: '#10b981' }}>{evacuationPlan.safe_route?.hazard_level || 'Safe Corridor'}</strong></div>
              </div>
            </div>
          )}

          {/* Alternative Shelters Selection */}
          {evacuationPlan?.alternative_shelters && evacuationPlan.alternative_shelters.length > 0 && (
            <div className="alt-shelters-panel panel">
              <h4>{t('evacuation_page.alt_shelters')}</h4>
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
              <h4>{t('evacuation_page.turn_by_turn')}</h4>
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
            <h4>{t('ndrf.title')}</h4>
            <div className="hl-grid">
              <div><span>{t('ndrf.tollfree')}</span><a href="tel:1078">1078 / 112</a></div>
              <div><span>{t('ndrf.helpline')}</span><a href="tel:9711077372">+91-9711077372</a></div>
              <div><span>{t('ndrf.seoc')}</span><a href="tel:1070">1070</a></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

