import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  CloudRain,
  Droplets,
  Radio,
  RefreshCw,
  ShieldAlert,
  Thermometer,
  Wifi,
} from 'lucide-react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useTranslation } from 'react-i18next';
import { sensorApi } from '../api/client';
import './Sensors.css';

const ranges = [1, 6, 24];

function formatTime(timestamp) {
  if (!timestamp) return '--:--:--';
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function MetricCard({ icon: Icon, label, value, unit, detail, className = '' }) {
  return (
    <article className={`sensor-metric-card ${className}`}>
      <div className="sensor-metric-icon"><Icon size={20} /></div>
      <span className="sensor-metric-label">{label}</span>
      <strong>{value ?? '--'}<small>{value != null ? unit : ''}</small></strong>
      {detail && <span className="sensor-metric-detail">{detail}</span>}
    </article>
  );
}

export default function Sensors() {
  const { t } = useTranslation();
  const [reading, setReading] = useState(null);
  const [history, setHistory] = useState([]);
  const [range, setRange] = useState(24);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [error, setError] = useState(false);

  const getStatusMessage = (st) => {
    if (st === 'ONLINE') return t('sensors_page.status_online');
    if (st === 'STALE') return t('sensors_page.status_stale');
    return t('sensors_page.status_offline');
  };

  const loadLatest = async () => {
    try {
      const response = await sensorApi.getLatest();
      setReading(response.data);
      setError(false);
    } catch {
      setReading({ status: 'OFFLINE', message: t('sensors_page.error_retrieve') });
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async (hours) => {
    setHistoryLoading(true);
    try {
      const response = await sensorApi.getHistory(hours);
      setHistory(response.data.readings || []);
    } catch {
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    loadLatest();
    const interval = window.setInterval(loadLatest, 5000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    loadHistory(range);
  }, [range]);

  const status = reading?.status || 'OFFLINE';
  const riskLevel = reading?.riskLevel;
  const hasReading = reading?.temperature != null && reading?.humidity != null && reading?.moisture != null;
  const chartData = history.map((item) => ({
    ...item,
    time: formatTime(item.timestamp),
  }));

  const riskLevelDisplay = riskLevel ? (t(`status.${riskLevel.toLowerCase()}`) || riskLevel) : t('sensors_page.unavailable');

  return (
    <div className="sensors-page">
      <header className="sensors-page-header">
        <div>
          <span className="eyebrow">{t('sensors_page.eyebrow')}</span>
          <h1>{t('sensors_page.title')}</h1>
          <p>{t('sensors_page.subtitle')}</p>
        </div>
        <div className={`sensor-connection ${status.toLowerCase()}`}>
          {status === 'ONLINE' ? <Wifi size={18} /> : <Radio size={18} />}
          <div><strong>{t(`status.${status.toLowerCase()}`) || status}</strong><span>{getStatusMessage(status)}</span></div>
        </div>
      </header>

      {loading && <div className="sensor-state panel">{t('sensors_page.reading_data')}</div>}
      {!loading && error && <div className="sensor-state sensor-state-error panel"><AlertTriangle size={18} /> {t('sensors_page.error_retrieve')}</div>}
      {!loading && status === 'OFFLINE' && <div className="sensor-state panel">{t('sensors_page.no_data_yet')}</div>}
      {!loading && status === 'STALE' && <div className="sensor-state sensor-state-warning panel"><AlertTriangle size={18} /> {t('sensors_page.stale_data', { seconds: Math.round(reading?.ageSeconds || 0) })}</div>}

      <section className="sensor-metrics-grid">
        <MetricCard icon={Droplets} label={t('sensors_page.soil_moisture')} value={hasReading ? reading.moisture : null} unit="%" detail={hasReading && reading.moisture > 40 ? t('sensors_page.elevated_contrib') : t('sensors_page.low_contrib')} className="moisture-card" />
        <MetricCard icon={Thermometer} label={t('sensors_page.temperature')} value={hasReading ? reading.temperature : null} unit="°C" detail={t('sensors_page.ambient_reading')} className="temperature-card" />
        <MetricCard icon={CloudRain} label={t('sensors_page.humidity')} value={hasReading ? reading.humidity : null} unit="%" detail={t('sensors_page.relative_humidity')} className="humidity-card" />
        <MetricCard icon={ShieldAlert} label={t('sensors_page.sensor_risk')} value={hasReading ? reading.sensorRiskScore : null} unit="/100" detail={riskLevelDisplay} className={`risk-card ${riskLevel?.toLowerCase() || 'offline'}`} />
      </section>

      {hasReading && riskLevel === 'HIGH' && (
        <section className="sensor-alert high">
          <AlertTriangle size={22} />
          <div>
            <strong>{t('sensors_page.high_risk_title')}</strong>
            <p>{t('sensors_page.high_risk_desc')}</p>
            <span>{t('sensors_page.high_risk_detail', { moisture: reading.moisture, humidity: reading.humidity, temperature: reading.temperature })}{reading.moisture > 40 ? t('sensors_page.high_risk_soil_note') : ''}</span>
          </div>
        </section>
      )}

      <section className="sensor-content-grid">
        <article className="sensor-breakdown panel">
          <div className="sensor-section-heading"><div><span className="eyebrow">{t('sensors_page.rule_based_signal')}</span><h2>{t('sensors_page.risk_calculation')}</h2></div><ShieldAlert size={20} className="icon-blue" /></div>
          <div className="breakdown-score"><span>{t('sensors_page.risk_score_label')}</span><strong>{hasReading ? `${reading.sensorRiskScore} / 100` : '--'}</strong><b className={riskLevel?.toLowerCase() || 'offline'}>{riskLevelDisplay}</b></div>
          <div className="breakdown-bars">
            <div><span>{t('sensors_page.moisture_score')} <b>70%</b></span><i><em style={{ width: `${reading?.moistureScore || 0}%` }} /></i><strong>{reading?.moistureScore ?? '--'}</strong></div>
            <div><span>{t('sensors_page.humidity_score')} <b>15%</b></span><i><em style={{ width: `${reading?.humidityScore || 0}%` }} /></i><strong>{reading?.humidityScore ?? '--'}</strong></div>
            <div><span>{t('sensors_page.temperature_score')} <b>15%</b></span><i><em style={{ width: `${reading?.temperatureScore || 0}%` }} /></i><strong>{reading?.temperatureScore ?? '--'}</strong></div>
          </div>
          <div className="formula-note">{t('sensors_page.formula_note')}</div>
          <p className="contributor-note"><strong>{t('sensors_page.key_factor')}</strong> {hasReading && reading.moisture > 40 ? t('sensors_page.elevated_moisture') : t('sensors_page.current_readings')}</p>
          <small className="prototype-note">{t('sensors_page.prototype_note')}</small>
        </article>

        <article className="sensor-history panel">
          <div className="sensor-section-heading"><div><span className="eyebrow">{t('sensors_page.recent_readings')}</span><h2>{t('sensors_page.sensor_history')}</h2></div><div className="range-control">{ranges.map((item) => <button key={item} type="button" className={range === item ? 'active' : ''} onClick={() => setRange(item)}>{item}h</button>)}</div></div>
          {historyLoading ? <div className="chart-empty">{t('sensors_page.reading_history')}</div> : chartData.length < 2 ? <div className="chart-empty">{t('sensors_page.not_enough_history')}</div> : <>
            <ResponsiveContainer width="100%" height={230}><LineChart data={chartData}><CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" /><XAxis dataKey="time" tick={{ fontSize: 11 }} /><YAxis yAxisId="left" domain={[0, 100]} tick={{ fontSize: 11 }} /><YAxis yAxisId="right" orientation="right" domain={['auto', 'auto']} tick={{ fontSize: 11 }} /><Tooltip /><Legend /><Line yAxisId="left" type="monotone" dataKey="moisture" name={t('sensors_page.moisture_legend')} stroke="#0f766e" dot={false} /><Line yAxisId="left" type="monotone" dataKey="humidity" name={t('sensors_page.humidity_legend')} stroke="#2563eb" dot={false} /><Line yAxisId="right" type="monotone" dataKey="temperature" name={t('sensors_page.temp_legend')} stroke="#ea580c" dot={false} /></LineChart></ResponsiveContainer>
            <ResponsiveContainer width="100%" height={180}><LineChart data={chartData}><CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" /><XAxis dataKey="time" tick={{ fontSize: 11 }} /><YAxis domain={[0, 100]} tick={{ fontSize: 11 }} /><Tooltip /><Line type="monotone" dataKey="sensorRiskScore" name={t('sensors_page.sensor_risk')} stroke="#dc2626" strokeWidth={2} dot={false} /></LineChart></ResponsiveContainer>
          </>}
        </article>
      </section>

      <footer className="sensor-footer"><span>{t('news_panel.updated')}: {formatTime(reading?.timestamp)}</span><button type="button" onClick={loadLatest} title={t('dashboard_extra.refresh_title')}><RefreshCw size={15} /> {t('dashboard_extra.refresh_feeds')}</button></footer>
    </div>
  );
}
