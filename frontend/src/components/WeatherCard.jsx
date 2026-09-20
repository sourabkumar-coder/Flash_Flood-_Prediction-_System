import React from 'react';
import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  Droplets,
  RefreshCw,
  Sun,
  Wind,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

const conditionKeyForCode = (code) => {
  if (code === 0) return 'clear';
  if ([1, 2].includes(code)) return 'partly_cloudy';
  if (code === 3) return 'cloudy';
  if ([45, 48].includes(code)) return 'fog';
  if ([51, 53, 55, 56, 57].includes(code)) return 'drizzle';
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return 'rain';
  if ([71, 73, 75, 77, 85, 86].includes(code)) return 'snow';
  if ([95, 96, 99].includes(code)) return 'thunderstorm';
  return 'cloudy';
};

const WeatherIcon = ({ condition, ...props }) => {
  switch (condition?.toLowerCase()) {
    case 'clear': return <Sun {...props} />;
    case 'partly cloudy': return <CloudSun {...props} />;
    case 'cloudy': return <Cloud {...props} />;
    case 'drizzle': return <CloudDrizzle {...props} />;
    case 'rain': return <CloudRain {...props} />;
    case 'thunderstorm': return <CloudLightning {...props} />;
    case 'fog': return <CloudFog {...props} />;
    case 'snow': return <CloudSnow {...props} />;
    default: return <Cloud {...props} />;
  }
};

export default function WeatherCard({ location, weather, loading, error, onRefresh, onOpenLocationModal }) {
  const { t } = useTranslation();
  const current = weather?.current;
  const hourly = weather?.hourly || [];
  const nextHours = hourly.slice(0, 5);

  const formatVal = (value, suffix = '') => {
    if (value === null || value === undefined) return t('weather_card.unavailable');
    return `${Math.round(value * 10) / 10}${suffix}`;
  };

  const getTranslatedCondition = (conditionText, code) => {
    if (code !== undefined && code !== null) {
      const key = conditionKeyForCode(code);
      return t(`weather_card.conditions.${key}`);
    }
    if (!conditionText) return t('weather_card.condition_unavailable');
    const normalized = conditionText.toLowerCase().replace(/\s+/g, '_');
    const directTranslation = t(`weather_card.conditions.${normalized}`);
    return directTranslation !== `weather_card.conditions.${normalized}` ? directTranslation : conditionText;
  };

  const handleRefreshClick = () => {
    if (!location && onOpenLocationModal) {
      onOpenLocationModal();
    } else if (onRefresh) {
      onRefresh();
    }
  };

  return (
    <section className="weather-panel panel">
      <div className="section-heading weather-heading">
        <div>
          <span className="eyebrow">{t('weather_card.eyebrow')}</span>
          <h2>{t('weather_card.title')}</h2>
        </div>
        <button type="button" className="icon-button" onClick={handleRefreshClick} title={t('weather_card.refresh_title')} disabled={loading}>
          <RefreshCw size={17} className={loading ? 'spinning' : ''} />
        </button>
      </div>

      {loading && <div className="panel-state">{t('weather_card.loading')}</div>}
      {!loading && error && (
        <div className="panel-state error-state" style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-start' }}>
          <span>{t('weather_card.error')}</span>
          {onOpenLocationModal && (
            <button 
              type="button" 
              className="btn-sim"
              style={{ fontSize: '0.8rem', padding: '5px 10px', marginTop: '4px' }}
              onClick={onOpenLocationModal}
            >
              📍 Enable Location / Pick Region
            </button>
          )}
        </div>
      )}
      {!loading && !error && !current && (
        <div className="panel-state" style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-start' }}>
          <span>{t('weather_card.enable_location')}</span>
          {onOpenLocationModal && (
            <button 
              type="button" 
              className="btn-sim"
              style={{ fontSize: '0.8rem', padding: '5px 10px', marginTop: '4px' }}
              onClick={onOpenLocationModal}
            >
              📍 Enable Location
            </button>
          )}
        </div>
      )}

      {!loading && !error && current && (
        <>
          <div className="weather-location">
            <span>{location?.city || location?.district || t('weather_card.current_location')}</span>
            <small>{location?.state || t('weather_card.gps_coordinates')}{location?.country ? `, ${location.country}` : ''}</small>
          </div>
          <div className="weather-current">
            <WeatherIcon condition={current.condition} size={54} strokeWidth={1.5} aria-label={current.condition} />
            <div>
              <strong>{formatVal(current.temperature, '°C')}</strong>
              <span>{getTranslatedCondition(current.condition, current.conditionCode)}</span>
            </div>
          </div>
          <div className="weather-metrics">
            <span>{t('weather_card.feels_like')} <b>{formatVal(current.feelsLike, '°C')}</b></span>
            <span><Droplets size={15} /> {t('weather_card.humidity')} <b>{formatVal(current.humidity, '%')}</b></span>
            <span><Wind size={15} /> {t('weather_card.wind')} <b>{formatVal(current.windSpeed, ' km/h')}</b></span>
          </div>
          <div className="forecast-strip">
            <h3>{t('weather_card.forecast_heading')}</h3>
            <div className="forecast-hours">
              {nextHours.map((hour) => {
                return (
                  <div className="forecast-hour" key={hour.time}>
                    <span>{new Date(hour.time).toLocaleTimeString([], { hour: 'numeric' })}</span>
                    <WeatherIcon condition={getTranslatedCondition('', hour.conditionCode)} size={20} />
                    <b>{formatVal(hour.temperature, '°')}</b>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
