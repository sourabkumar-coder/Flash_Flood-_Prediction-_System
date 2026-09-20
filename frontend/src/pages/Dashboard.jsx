import React, { useEffect, useState } from 'react';
import { Activity, AlertTriangle, Clock, Droplets, MapPin, RefreshCw, ShieldAlert, Thermometer } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { riskApi, sensorApi, weatherApi, newsApi } from '../api/client';
import LiveRiskMap from './LiveRiskMap';
import WeatherCard from '../components/WeatherCard';
import NewsPanel from '../components/NewsPanel';
import LocationModal from '../components/LocationModal';
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
  const [showLocationModal, setShowLocationModal] = useState(false);

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

  const fetchWeather = async (gpsLocation) => {
    if (!gpsLocation) return;
    try {
      setWeatherLoading(true);
      setWeatherError(false);
      const response = await weatherApi.getCurrentWeather(gpsLocation.latitude, gpsLocation.longitude);
      setWeather(response.data);
      dashboardCache.weather = response.data;
    } catch (error) {
      console.error('Failed to fetch weather:', error);
      setWeatherError(true);
    } finally {
      setWeatherLoading(false);
    }
  };

  const fetchNews = async (locationContext = {}) => {
    try {
      setNewsLoading(true);
      setNewsError(false);
      const params = {
        city: locationContext.city || locationContext.village || undefined,
        district: locationContext.district || undefined,
        state: locationContext.state || undefined,
      };
      const response = await newsApi.getNews(params);
      setNews(response.data);
      dashboardCache.news = response.data;
    } catch (error) {
      console.error('Failed to fetch news:', error);
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

  const locateAndLoad = (userInitiated = false) => {
    if (!navigator.geolocation) {
      setLocationError(true);
      dashboardCache.locationError = true;
      fetchNews();
      if (userInitiated) {
        setShowLocationModal(true);
      }
      return;
    }

    setLocationError(false);
    navigator.geolocation.getCurrentPosition(async ({ coords }) => {
      const gpsLocation = { latitude: coords.latitude, longitude: coords.longitude };
      console.log('[Dashboard] GPS coordinates:', gpsLocation);
      setLocation(gpsLocation);
      dashboardCache.location = gpsLocation;
      dashboardCache.locationError = false;
      setLocationError(false);
      setShowLocationModal(false);
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
    }, (err) => {
      console.warn('[Dashboard] Geolocation denied or unavailable:', err?.message);
      setLocationError(true);
      setWeatherError(true);
      dashboardCache.locationError = true;
      fetchNews();
      if (userInitiated) {
        setShowLocationModal(true);
      }
    }, { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 });
  };

  const handleSelectManualLocation = (manualLoc) => {
    setLocation(manualLoc);
    dashboardCache.location = manualLoc;
    dashboardCache.locationError = false;
    setLocationError(false);
    setWeatherError(false);
    fetchWeather(manualLoc);
    fetchNews(manualLoc);
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
  const locationLabel = location?.city || location?.district || (locationError ? t('dashboard_extra.loc_unavailable') : t('dashboard_extra.detecting_loc'));

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div>
          <h1>{t('dashboard.title')}</h1>
          <p>{t('dashboard.subtitle')}</p>
        </div>
        <button type="button" className="dashboard-refresh" onClick={() => { fetchSummary(); locateAndLoad(); }} title={t('dashboard_extra.refresh_title')}>
          <RefreshCw size={16} /> {t('dashboard_extra.refresh_feeds')}
        </button>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card critical"><div className="kpi-icon"><AlertTriangle size={24} /></div><div className="kpi-content"><span className="kpi-label">{t('dashboard.critical_alerts')}</span><span className="kpi-value">{summaryLoading ? '...' : currentSummary.criticalCount || 0}</span></div></div>
        <div className="kpi-card warning"><div className="kpi-icon"><Activity size={24} /></div><div className="kpi-content"><span className="kpi-label">{t('dashboard.high_risk_zones')}</span><span className="kpi-value">{summaryLoading ? '...' : currentSummary.highCount || 0}</span></div></div>
        <div className="kpi-card info"><div className="kpi-icon"><MapPin size={24} /></div><div className="kpi-content"><span className="kpi-label">{t('dashboard.monitored_valleys')}</span><span className="kpi-value">{summaryLoading ? '...' : currentSummary.totalMonitored || 0}</span></div></div>
        <div className="kpi-card neutral"><div className="kpi-icon"><Clock size={24} /></div><div className="kpi-content"><span className="kpi-label">{t('dashboard.min_lead_time')}</span><span className="kpi-value">{summaryLoading ? '...' : currentSummary.minLeadTimeHours === '--' ? '--' : `${currentSummary.minLeadTimeHours} ${t('dashboard.hrs')}`}</span></div></div>
      </div>

      <section className="dashboard-sensor-summary panel">
        <div className="sensor-summary-heading"><div><span className="eyebrow">{t('dashboard_extra.iot_eyebrow')}</span><h2>{t('dashboard_extra.physical_conditions')}</h2></div><span className={`sensor-summary-status ${(sensor?.status || 'OFFLINE').toLowerCase()}`}><span />{t(`status.${(sensor?.status || 'offline').toLowerCase()}`) || sensor?.status || 'OFFLINE'}</span></div>
        <div className="sensor-summary-values">
          <div><Droplets size={17} /><span>{t('dashboard_extra.moisture')}</span><strong>{sensor?.moisture ?? '--'}{sensor?.moisture != null ? '%' : ''}</strong></div>
          <div><Thermometer size={17} /><span>{t('dashboard_extra.temperature')}</span><strong>{sensor?.temperature ?? '--'}{sensor?.temperature != null ? '°C' : ''}</strong></div>
          <div><Activity size={17} /><span>{t('dashboard_extra.humidity')}</span><strong>{sensor?.humidity ?? '--'}{sensor?.humidity != null ? '%' : ''}</strong></div>
          <div className="sensor-summary-risk"><ShieldAlert size={17} /><span>{t('dashboard_extra.sensor_risk')}</span><strong>{sensor?.sensorRiskScore != null ? `${t(`status.${sensor.riskLevel.toLowerCase()}`) || sensor.riskLevel} · ${sensor.sensorRiskScore}` : '--'}</strong></div>
        </div>
        <a className="sensor-details-link" href="/sensors">{t('dashboard_extra.view_sensor_details')}</a>
      </section>

      <section className="dashboard-map-section">
        <div className="section-heading"><div><span className="eyebrow">{t('dashboard_extra.primary_operating_view')}</span><h2>{t('dashboard.live_risk_map')}</h2></div><span className="live-pill">{t('dashboard_extra.live_data_pill')}</span></div>
        <LiveRiskMap />
      </section>

      <div className="dashboard-intel-grid">
        <section 
          className="location-panel panel"
          style={!location || locationError ? { cursor: 'pointer' } : {}}
          onClick={() => {
            if (!location || locationError) {
              setShowLocationModal(true);
            }
          }}
        >
          <div className="section-heading">
            <div>
              <span className="eyebrow">{t('dashboard_extra.gps_eyebrow')}</span>
              <h2>{t('dashboard_extra.current_location')}</h2>
            </div>
            <button
              type="button"
              className="icon-button"
              onClick={(e) => {
                e.stopPropagation();
                locateAndLoad(true);
              }}
              title="Detect Location"
            >
              <MapPin size={18} className="icon-blue" />
            </button>
          </div>

          <div className="location-main">
            <MapPin size={28} />
            <div>
              <strong>{locationLabel}</strong>
              <span>{location?.state || t('dashboard_extra.waiting_loc')}</span>
            </div>
          </div>

          {location ? (
            <div className="coordinates">
              {t('dashboard_extra.lat')}: {Number(location.latitude).toFixed(4)}<br />
              {t('dashboard_extra.lon')}: {Number(location.longitude).toFixed(4)}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
              <p className="location-note">
                {locationError ? t('dashboard_extra.enable_loc_note') : t('dashboard_extra.requesting_loc')}
              </p>
              <button
                type="button"
                className="btn-sim"
                style={{ fontSize: '0.82rem', padding: '6px 12px', alignSelf: 'flex-start' }}
                onClick={(e) => {
                  e.stopPropagation();
                  setShowLocationModal(true);
                }}
              >
                📍 Enable Location / Pick Region
              </button>
            </div>
          )}
          <small className="privacy-note">{t('dashboard_extra.privacy_note')}</small>
        </section>

        <WeatherCard 
          location={location} 
          weather={weather} 
          loading={weatherLoading} 
          error={weatherError} 
          onRefresh={() => locateAndLoad(true)}
          onOpenLocationModal={() => setShowLocationModal(true)}
        />
      </div>

      <NewsPanel articles={news.articles} lastUpdated={news.lastUpdated} loading={newsLoading} error={newsError} onRefresh={() => fetchNews(location || {})} />

      <LocationModal 
        isOpen={showLocationModal}
        onClose={() => setShowLocationModal(false)}
        onRetry={() => locateAndLoad(false)}
        onSelectManualLocation={handleSelectManualLocation}
      />
    </div>
  );
}
