import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import GloFASChart from '../components/GloFASChart';
import { riskApi } from '../api/client';
import { CloudRain, Droplets, ArrowRight, MapPin, Compass, RefreshCw } from 'lucide-react';
import './Forecast.css';

const PRESET_LOCATIONS = [
  { name: 'Manali, Kullu', state: 'Himachal Pradesh', district: 'Kullu', village: 'Manali', lat: 32.2396, lon: 77.1887 },
  { name: 'Sainj Valley (Neuli)', state: 'Himachal Pradesh', district: 'Kullu', village: 'Sainj', lat: 31.765, lon: 77.342 },
  { name: 'Joshimath, Chamoli', state: 'Uttarakhand', district: 'Chamoli', village: 'Joshimath', lat: 30.556, lon: 79.566 },
  { name: 'Mangan, North Sikkim', state: 'Sikkim', district: 'North Sikkim', village: 'Mangan', lat: 27.502, lon: 88.529 },
  { name: 'Mandi (Beas Basin)', state: 'Himachal Pradesh', district: 'Mandi', village: 'Mandi', lat: 31.708, lon: 76.932 }
];

export default function Forecast() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [states, setStates] = useState([]);
  const [selectedState, setSelectedState] = useState(searchParams.get('state') || 'Himachal Pradesh');
  const [districts, setDistricts] = useState([]);
  const [selectedDistrict, setSelectedDistrict] = useState(searchParams.get('district') || 'Kullu');
  const [villageData, setVillageData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchStates();
  }, []);

  useEffect(() => {
    if (selectedState) {
      fetchDistricts(selectedState);
    }
  }, [selectedState]);

  useEffect(() => {
    const s = searchParams.get('state') || selectedState;
    const d = searchParams.get('district') || selectedDistrict;
    const v = searchParams.get('village') || undefined;
    const lat = searchParams.get('lat') ? parseFloat(searchParams.get('lat')) : undefined;
    const lon = searchParams.get('lon') ? parseFloat(searchParams.get('lon')) : undefined;

    fetchForecast({ state: s, district: d, village: v, latitude: lat, longitude: lon });
  }, [searchParams]);

  const fetchStates = async () => {
    try {
      const res = await riskApi.getStates();
      setStates(res.data.states || []);
    } catch (err) {
      console.error('Failed to fetch states:', err);
    }
  };

  const fetchDistricts = async (st) => {
    try {
      const res = await riskApi.getDistricts(st);
      setDistricts(res.data.districts || []);
    } catch (err) {
      console.error('Failed to fetch districts:', err);
    }
  };

  const fetchForecast = async (payload) => {
    try {
      setLoading(true);
      setError(null);
      const response = await riskApi.predict(payload);
      setVillageData(response.data);
    } catch (err) {
      console.error('Failed to fetch forecast:', err);
      setError('Failed to generate forecast models for this location.');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyLocation = () => {
    if (!selectedState || !selectedDistrict) return;
    setSearchParams({ state: selectedState, district: selectedDistrict });
  };

  const handleSelectPreset = (p) => {
    setSelectedState(p.state);
    setSelectedDistrict(p.district);
    setSearchParams({ state: p.state, district: p.district, village: p.village, lat: p.lat.toString(), lon: p.lon.toString() });
  };

  const timeSeries = villageData?.hydrology?.time_series;

  return (
    <div className="forecast-container">
      <div className="page-header">
        <h1>Hydrological & River Forecast</h1>
        <p>Short-term and 30-day ensemble predictions powered by ECMWF GloFAS v4 and Open-Meteo.</p>
      </div>

      {/* Preset Quick Location Chips */}
      <div className="presets-bar">
        <span className="presets-label">Popular Basins:</span>
        <div className="chips-list">
          {PRESET_LOCATIONS.map((p) => (
            <button
              key={p.name}
              type="button"
              className="chip-btn"
              onClick={() => handleSelectPreset(p)}
            >
              📍 {p.name}
            </button>
          ))}
        </div>
      </div>

      {/* Custom Selector Bar */}
      <div className="forecast-selector-bar panel">
        <div className="fsb-group">
          <label>State</label>
          <select value={selectedState} onChange={(e) => setSelectedState(e.target.value)}>
            <option value="">Select State</option>
            {states.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div className="fsb-group">
          <label>District</label>
          <select value={selectedDistrict} onChange={(e) => setSelectedDistrict(e.target.value)} disabled={!selectedState}>
            <option value="">Select District</option>
            {districts.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>

        <button
          type="button"
          className="btn-primary fsb-apply-btn"
          onClick={handleApplyLocation}
          disabled={loading || !selectedState || !selectedDistrict}
        >
          {loading ? <RefreshCw size={14} className="spinning" /> : <Compass size={14} />}
          <span>Query Hydrology</span>
        </button>
      </div>

      {loading ? (
        <div className="loading-state panel">
          <RefreshCw size={24} className="spinning icon-blue" />
          <p>Generating 30-day ensemble forecast and runoff routing models...</p>
        </div>
      ) : error ? (
        <div className="error-banner panel">{error}</div>
      ) : (
        <div className="forecast-grid">
          <div className="forecast-main-panel panel">
            <div className="forecast-chart-header">
              <div>
                <h2><Droplets size={20} className="icon-blue" /> River Discharge Forecast (GloFAS v4)</h2>
                <p className="subtitle-text">
                  Ensemble mean, maximum, and 25th/75th percentiles for {villageData?.location?.village || villageData?.location?.district || 'Selected Region'}.
                </p>
              </div>
              <span className="forecast-station-pill">
                Station: {villageData?.hydrology?.station || 'Beas / Regional Hydrology'}
              </span>
            </div>
            
            <div className="chart-wrapper">
              {timeSeries && timeSeries.dates?.length > 0 ? (
                <GloFASChart 
                  timeSeries={timeSeries} 
                  stationName={villageData?.hydrology?.station || 'Regional Hydrology Node'} 
                  modelName={villageData?.hydrology?.model_name || 'GloFAS v4 Seamless'} 
                />
              ) : (
                <div className="empty-chart">Time series data unavailable for this location coordinates.</div>
              )}
            </div>
          </div>

          <div className="forecast-side-panel">
            <div className="panel risk-summary">
              <h3>Predicted Risk Evolution</h3>
              <div className="current-risk">
                <span className="label">Current ML Risk Score</span>
                <span className={`value ${villageData?.prediction?.risk_level?.toLowerCase()}`}>
                  {villageData?.prediction?.risk_score} / 100
                </span>
                <span className="risk-level-badge">{villageData?.prediction?.risk_level} RISK</span>
              </div>
              <div className="forecast-insight">
                <p><strong>Hydrological Analysis:</strong> {villageData?.hydrology?.reason || villageData?.prediction?.reason || 'Conditions remain within seasonal flow ranges.'}</p>
              </div>
            </div>

            <div className="panel weather-summary">
              <h3><CloudRain size={18} className="icon-blue" /> 24h Synoptic Outlook</h3>
              <ul className="weather-list">
                <li>
                  <span>Precipitation (24h)</span>
                  <strong>{villageData?.weather?.rainfall_24h_mm || 0} mm</strong>
                </li>
                <li>
                  <span>Hourly Rain Rate</span>
                  <strong>{villageData?.weather?.rainfall_1h_mm || 0} mm/h</strong>
                </li>
                <li>
                  <span>Temperature</span>
                  <strong>{villageData?.weather?.temperature_c || 0} °C</strong>
                </li>
                <li>
                  <span>Relative Humidity</span>
                  <strong>{villageData?.weather?.humidity_percent || 0} %</strong>
                </li>
                <li>
                  <span>SRTM Mean Elevation</span>
                  <strong>{villageData?.terrain?.elevation_m || 0} m</strong>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

