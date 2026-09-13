import React, { useEffect, useState } from 'react';
import { Activity, AlertTriangle, Clock, Droplets, MapPin, RefreshCw, ShieldAlert, Thermometer } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { riskApi, sensorApi, weatherApi, newsApi } from '../api/client';
import LiveRiskMap from './LiveRiskMap';
import WeatherCard from '../components/WeatherCard';
import NewsPanel from '../components/NewsPanel';
import './Dashboard.css';

const EMPTY_SUMMARY = { criticalCount: 0, highCount: 0, totalMonitored: 0, minLeadTimeHours: '--' };
const DASHBOARD_CACHE_MAX_AGE = 5 * 60 * 1000;
const dashboardCache = {
  fetchedAt: 0,
  summary: null,
  location: null,
  locationError: false,
  weather: null,
  news: { articles: [], lastUpdated: null },
};

export default function Dashboard() {
  const { t } = useTranslation();
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [location, setLocation] = useState(null);
  const [locationError, setLocationError] = useState(false);
  const [weather, setWeather] = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState(false);
  const [news, setNews] = useState({ articles: [], lastUpdated: null });
  const [newsLoading, setNewsLoading] = useState(false);
  const [newsError, setNewsError] = useState(false);
  const [sensor, setSensor] = useState(null);

  const fetchSummary = async () => {
    try {
      setSummaryLoading(true);
      const response = await riskApi.getThreats();
      setSummary(response.data.summary);
      dashboardCache.summary = response.data.summary;
      dashboardCache.fetchedAt = Date.now();
    } catch (error) {
      console.error('Failed to fetch summary:', error);
    } finally {
      setSummaryLoading(false);
    }
  };

  const fetchWeather = async (coords) => {
    setWeatherLoading(true);
    setWeatherError(false);
    try {
      const response = await weatherApi.getCurrentWeather(coords.latitude, coords.longitude);
      console.log('[Dashboard] Weather response:', response.data);
      setWeather(response.data);
      dashboardCache.weather = response.data;
      dashboardCache.fetchedAt = Date.now();
    } catch (error) {
      console.error('Failed to fetch GPS weather:', error);
      setWeatherError(true);
    } finally {
      setWeatherLoading(false);
    }
  };

  const fetchNews = async (place = {}) => {
    setNewsLoading(true);
    setNewsError(false);
    try {
      const response = await newsApi.getNews({ city: place.city, district: place.district, state: place.state });
      console.log('[Dashboard] News response:', response.data);
      setNews(response.data);
      dashboardCache.news = response.data;
      dashboardCache.fetchedAt = Date.now();
    } catch (error) {
      console.error('Failed to fetch disaster news:', error);
      setNewsError(true);
    } finally {
      setNewsLoading(false);
    }
  };

  const fetchSensor = async () => {
    try {
      const response = await sensorApi.getLatest();
      setSensor(response.data);
    } catch {
      setSensor({ status: 'OFFLINE' });
    }
  };

  const locateAndLoad = () => {
    if (!navigator.geolocation) {
      setLocationError(true);
      dashboardCache.locationError = true;
      fetchNews();
      return;
    }

    setLocationError(false);
    navigator.geolocation.getCurrentPosition(async ({ coords }) => {
      const gpsLocation = { latitude: coords.latitude, longitude: coords.longitude };
      console.log('[Dashboard] GPS coordinates:', gpsLocation);
      setLocation(gpsLocation);
      dashboardCache.location = gpsLocation;
      fetchWeather(gpsLocation);

      try {
        const response = await riskApi.reverseGeocode(coords.latitude, coords.longitude);
        console.log('[Dashboard] Reverse-geocoded location:', response.data);
        const place = response.data || {};
        const resolvedLocation = { ...gpsLocation, ...place, city: place.village || place.city || place.district };
        setLocation(resolvedLocation);
        dashboardCache.location = resolvedLocation;
        dashboardCache.locationError = false;
        fetchNews(resolvedLocation);
      } catch (error) {
        console.error('Failed to reverse geocode GPS location:', error);
        fetchNews();
      }
    }, () => {
      setLocationError(true);
      setWeatherError(true);
      dashboardCache.locationError = true;
      fetchNews();
    }, { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 });
  };

  useEffect(() => {
    const cacheIsFresh = dashboardCache.fetchedAt && Date.now() - dashboardCache.fetchedAt < DASHBOARD_CACHE_MAX_AGE;
    if (cacheIsFresh) {
      setSummary(dashboardCache.summary);
      setLocation(dashboardCache.location);
      setLocationError(dashboardCache.locationError);
      setWeather(dashboardCache.weather);
      setNews(dashboardCache.news);
    } else {
      fetchSummary();
      locateAndLoad();
    }
    fetchSensor();
    const interval = window.setInterval(fetchSensor, 5000);
    return () => window.clearInterval(interval);
  }, []);

  const currentSummary = summary || EMPTY_SUMMARY;
  const locationLabel = location?.city || location?.district || (locationError ? 'Location unavailable' : 'Detecting current location');

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div>
          <h1>{t('dashboard.title')}</h1>
          <p>{t('dashboard.subtitle')}</p>
        </div>
        <button type="button" className="dashboard-refresh" onClick={() => { fetchSummary(); locateAndLoad(); }} title="Refresh dashboard">
          <RefreshCw size={16} /> Refresh feeds
        </button>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card critical"><div className="kpi-icon"><AlertTriangle size={24} /></div><div className="kpi-content"><span className="kpi-label">{t('dashboard.critical_alerts')}</span><span className="kpi-value">{summaryLoading ? '...' : currentSummary.criticalCount || 0}</span></div></div>
        <div className="kpi-card warning"><div className="kpi-icon"><Activity size={24} /></div><div className="kpi-content"><span className="kpi-label">{t('dashboard.high_risk_zones')}</span><span className="kpi-value">{summaryLoading ? '...' : currentSummary.highCount || 0}</span></div></div>
        <div className="kpi-card info"><div className="kpi-icon"><MapPin size={24} /></div><div className="kpi-content"><span className="kpi-label">{t('dashboard.monitored_valleys')}</span><span className="kpi-value">{summaryLoading ? '...' : currentSummary.totalMonitored || 0}</span></div></div>
        <div className="kpi-card neutral"><div className="kpi-icon"><Clock size={24} /></div><div className="kpi-content"><span className="kpi-label">{t('dashboard.min_lead_time')}</span><span className="kpi-value">{summaryLoading ? '...' : currentSummary.minLeadTimeHours === '--' ? '--' : `${currentSummary.minLeadTimeHours} ${t('dashboard.hrs')}`}</span></div></div>
      </div>

      <section className="dashboard-sensor-summary panel">
        <div className="sensor-summary-heading"><div><span className="eyebrow">IOT SENSOR</span><h2>Physical Conditions</h2></div><span className={`sensor-summary-status ${(sensor?.status || 'OFFLINE').toLowerCase()}`}><span />{sensor?.status || 'OFFLINE'}</span></div>
        <div className="sensor-summary-values">
          <div><Droplets size={17} /><span>Moisture</span><strong>{sensor?.moisture ?? '--'}{sensor?.moisture != null ? '%' : ''}</strong></div>
          <div><Thermometer size={17} /><span>Temperature</span><strong>{sensor?.temperature ?? '--'}{sensor?.temperature != null ? '°C' : ''}</strong></div>
          <div><Activity size={17} /><span>Humidity</span><strong>{sensor?.humidity ?? '--'}{sensor?.humidity != null ? '%' : ''}</strong></div>
          <div className="sensor-summary-risk"><ShieldAlert size={17} /><span>Sensor Risk</span><strong>{sensor?.sensorRiskScore != null ? `${sensor.riskLevel} · ${sensor.sensorRiskScore}` : '--'}</strong></div>
        </div>
        <a className="sensor-details-link" href="/sensors">View sensor details →</a>
      </section>

      <section className="dashboard-map-section">
        <div className="section-heading"><div><span className="eyebrow">PRIMARY OPERATING VIEW</span><h2>Live Risk Map</h2></div><span className="live-pill">LIVE DATA</span></div>
        <LiveRiskMap />
      </section>

      <div className="dashboard-intel-grid">
        <section className="location-panel panel">
          <div className="section-heading"><div><span className="eyebrow">GPS STATUS</span><h2>Current Location</h2></div><MapPin size={20} className="icon-blue" /></div>
          <div className="location-main"><MapPin size={28} /><div><strong>{locationLabel}</strong><span>{location?.state || 'Waiting for browser location access'}</span></div></div>
          {location ? <div className="coordinates">Lat: {Number(location.latitude).toFixed(4)}<br />Lon: {Number(location.longitude).toFixed(4)}</div> : <p className="location-note">{locationError ? 'Enable location access to see weather for your current location.' : 'Requesting your current browser location...'}</p>}
          <small className="privacy-note">Used for weather and local intelligence during this session.</small>
        </section>
        <WeatherCard location={location} weather={weather} loading={weatherLoading} error={weatherError} onRefresh={locateAndLoad} />
      </div>

      <NewsPanel articles={news.articles} lastUpdated={news.lastUpdated} loading={newsLoading} error={newsError} onRefresh={() => fetchNews(location || {})} />
    </div>
  );
}
