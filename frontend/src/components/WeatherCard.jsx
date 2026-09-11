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
  Umbrella,
  Wind,
} from 'lucide-react';

const conditionForCode = (code) => {
  if (code === 0) return 'Clear';
  if ([1, 2].includes(code)) return 'Partly cloudy';
  if (code === 3) return 'Cloudy';
  if ([45, 48].includes(code)) return 'Fog';
  if ([51, 53, 55, 56, 57].includes(code)) return 'Drizzle';
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return 'Rain';
  if ([71, 73, 75, 77, 85, 86].includes(code)) return 'Snow';
  if ([95, 96, 99].includes(code)) return 'Thunderstorm';
  return 'Cloudy';
};
const valueOrUnavailable = (value, suffix = '') => value === null || value === undefined ? 'Unavailable' : `${Math.round(value * 10) / 10}${suffix}`;
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

export default function WeatherCard({ location, weather, loading, error, onRefresh }) {
  const current = weather?.current;
  const hourly = weather?.hourly || [];
  const nextHours = hourly.slice(0, 5);
  const rainProbability = nextHours.length
    ? Math.max(...nextHours.map(hour => Number(hour.precipitationProbability) || 0))
    : null;

  return (
    <section className="weather-panel panel">
      <div className="section-heading weather-heading">
        <div>
          <span className="eyebrow">GPS-CONNECTED WEATHER</span>
          <h2>Current Weather</h2>
        </div>
        <button type="button" className="icon-button" onClick={onRefresh} title="Refresh weather" disabled={loading}>
          <RefreshCw size={17} className={loading ? 'spinning' : ''} />
        </button>
      </div>

      {loading && <div className="panel-state">Loading local weather...</div>}
      {!loading && error && <div className="panel-state error-state">Weather data temporarily unavailable.</div>}
      {!loading && !error && !current && <div className="panel-state">Enable location access to see weather for your current location.</div>}

      {!loading && !error && current && (
        <>
          <div className="weather-location">
            <span>{location?.city || location?.district || 'Current location'}</span>
            <small>{location?.state || 'GPS coordinates'}{location?.country ? `, ${location.country}` : ''}</small>
          </div>
          <div className="weather-current">
            <WeatherIcon condition={current.condition} size={54} strokeWidth={1.5} aria-label={current.condition} />
            <div>
              <strong>{valueOrUnavailable(current.temperature, '°C')}</strong>
              <span>{current.condition || 'Condition unavailable'}</span>
            </div>
          </div>
          <div className="weather-metrics">
            <span>Feels like <b>{valueOrUnavailable(current.feelsLike, '°C')}</b></span>
            <span><Droplets size={15} /> Humidity <b>{valueOrUnavailable(current.humidity, '%')}</b></span>
            <span><Wind size={15} /> Wind <b>{valueOrUnavailable(current.windSpeed, ' km/h')}</b></span>
          </div>
          <div className="rainfall-callout">
            <div><Umbrella size={18} /><span>Rain probability</span><strong>{rainProbability === null ? 'Unavailable' : `${rainProbability}%`}</strong></div>
            <small>Expected precipitation today: {valueOrUnavailable(weather?.daily?.[0]?.precipitationSum, ' mm')}</small>
          </div>
          <div className="forecast-strip">
            <h3>Next forecast periods</h3>
            <div className="forecast-hours">
              {nextHours.map((hour) => {
                return (
                  <div className="forecast-hour" key={hour.time}>
                    <span>{new Date(hour.time).toLocaleTimeString([], { hour: 'numeric' })}</span>
                    <WeatherIcon condition={conditionForCode(hour.conditionCode)} size={20} />
                    <b>{valueOrUnavailable(hour.temperature, '°')}</b>
                    <small>{hour.precipitationProbability ?? '--'}%</small>
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
