import React, { useEffect, useState } from 'react';
import GloFASChart from '../components/GloFASChart';
import { riskApi } from '../api/client';
import { CloudRain, Droplets, ArrowRight } from 'lucide-react';
import './Forecast.css';

export default function Forecast() {
  const [villageData, setVillageData] = useState(null);
  const [loading, setLoading] = useState(true);

  // We will simulate fetching forecast for the first monitored valley in the demo
  useEffect(() => {
    fetchDemoForecast();
  }, []);

  const fetchDemoForecast = async () => {
    try {
      // In reality, this would be a user selecting a village.
      // For demo, we just predict for a known location (Manali) to get the time series.
      const response = await riskApi.predict({
        state: 'Himachal Pradesh',
        district: 'Kullu',
        village: 'Manali',
        latitude: 32.2396,
        longitude: 77.1887
      });
      setVillageData(response.data);
    } catch (err) {
      console.error('Failed to fetch forecast:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="loading-state">Generating forecast models...</div>;

  const timeSeries = villageData?.hydrology?.time_series;

  return (
    <div className="forecast-container">
      <div className="page-header">
        <h1>Hydrological & Risk Forecast</h1>
        <p>Short-term and medium-range ensemble predictions for {villageData?.location?.village || 'the selected region'}.</p>
      </div>

      <div className="forecast-grid">
        <div className="forecast-main-panel panel">
          <h2><Droplets size={20} className="icon-blue" /> River Discharge Forecast (GloFAS)</h2>
          <p className="subtitle-text">Ensemble mean, maximum, and percentiles for the next 30 days.</p>
          
          <div className="chart-wrapper">
            {timeSeries && timeSeries.dates?.length > 0 ? (
              <GloFASChart 
                timeSeries={timeSeries} 
                stationName={villageData?.hydrology?.station || 'Regional Hydrology Node'} 
                modelName={villageData?.hydrology?.model_name || 'GloFAS v4'} 
              />
            ) : (
              <div className="empty-chart">Time series data unavailable for this location.</div>
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
            </div>
            <div className="forecast-insight">
              <p><strong>Insight:</strong> {villageData?.prediction?.reason || 'Conditions remain stable.'}</p>
            </div>
          </div>

          <div className="panel weather-summary">
            <h3><CloudRain size={18} className="icon-blue" /> 24h Weather Outlook</h3>
            <ul className="weather-list">
              <li>
                <span>Rainfall (Next 24h)</span>
                <strong>{villageData?.weather?.rainfall_24h_mm || 0} mm</strong>
              </li>
              <li>
                <span>Temperature</span>
                <strong>{villageData?.weather?.temperature_c || 0} °C</strong>
              </li>
              <li>
                <span>Humidity</span>
                <strong>{villageData?.weather?.humidity_percent || 0} %</strong>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
