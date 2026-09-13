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
import { sensorApi } from '../api/client';
import './Sensors.css';

const ranges = [1, 6, 24];

function formatTime(timestamp) {
  if (!timestamp) return 'Not available';
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function statusMessage(status) {
  if (status === 'ONLINE') return 'Live sensor stream connected';
  if (status === 'STALE') return 'Sensor data is stale';
  return 'Sensor connection unavailable';
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
  const [reading, setReading] = useState(null);
  const [history, setHistory] = useState([]);
  const [range, setRange] = useState(24);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [error, setError] = useState(false);

  const loadLatest = async () => {
    try {
      const response = await sensorApi.getLatest();
      setReading(response.data);
      setError(false);
    } catch {
      setReading({ status: 'OFFLINE', message: 'Unable to retrieve sensor data.' });
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

  return (
    <div className="sensors-page">
      <header className="sensors-page-header">
        <div>
          <span className="eyebrow">FIELD INSTRUMENTATION</span>
          <h1>Sensor Monitoring</h1>
          <p>Real-time soil and environmental conditions</p>
        </div>
        <div className={`sensor-connection ${status.toLowerCase()}`}>
          {status === 'ONLINE' ? <Wifi size={18} /> : <Radio size={18} />}
          <div><strong>{status}</strong><span>{statusMessage(status)}</span></div>
        </div>
      </header>

      {loading && <div className="sensor-state panel">Reading sensor data...</div>}
      {!loading && error && <div className="sensor-state sensor-state-error panel"><AlertTriangle size={18} /> Unable to retrieve sensor data.</div>}
      {!loading && status === 'OFFLINE' && <div className="sensor-state panel">No sensor data received yet.</div>}
      {!loading && status === 'STALE' && <div className="sensor-state sensor-state-warning panel"><AlertTriangle size={18} /> Sensor data is stale. Last reading was {Math.round(reading.ageSeconds || 0)} seconds ago.</div>}

      <section className="sensor-metrics-grid">
        <MetricCard icon={Droplets} label="Soil Moisture" value={hasReading ? reading.moisture : null} unit="%" detail={hasReading && reading.moisture > 40 ? 'Elevated contribution' : 'Low contribution'} className="moisture-card" />
        <MetricCard icon={Thermometer} label="Temperature" value={hasReading ? reading.temperature : null} unit="°C" detail="Ambient reading" className="temperature-card" />
        <MetricCard icon={CloudRain} label="Humidity" value={hasReading ? reading.humidity : null} unit="%" detail="Relative humidity" className="humidity-card" />
        <MetricCard icon={ShieldAlert} label="Sensor Risk" value={hasReading ? reading.sensorRiskScore : null} unit="/100" detail={riskLevel || 'Unavailable'} className={`risk-card ${riskLevel?.toLowerCase() || 'offline'}`} />
      </section>

      {hasReading && riskLevel === 'HIGH' && (
        <section className="sensor-alert high">
          <AlertTriangle size={22} />
          <div><strong>HIGH SENSOR RISK</strong><p>Sensor conditions indicate elevated environmental risk.</p><span>Soil moisture: {reading.moisture}% · Humidity: {reading.humidity}% · Temperature: {reading.temperature}°C{reading.moisture > 40 ? ' · Elevated soil moisture is increasing sensor risk.' : ''}</span></div>
        </section>
      )}

      <section className="sensor-content-grid">
        <article className="sensor-breakdown panel">
          <div className="sensor-section-heading"><div><span className="eyebrow">RULE-BASED SIGNAL</span><h2>Risk Calculation</h2></div><ShieldAlert size={20} className="icon-blue" /></div>
          <div className="breakdown-score"><span>Sensor Risk Score</span><strong>{hasReading ? `${reading.sensorRiskScore} / 100` : '--'}</strong><b className={riskLevel?.toLowerCase() || 'offline'}>{riskLevel || 'UNAVAILABLE'}</b></div>
          <div className="breakdown-bars">
            <div><span>Moisture Score <b>70%</b></span><i><em style={{ width: `${reading?.moistureScore || 0}%` }} /></i><strong>{reading?.moistureScore ?? '--'}</strong></div>
            <div><span>Humidity Score <b>15%</b></span><i><em style={{ width: `${reading?.humidityScore || 0}%` }} /></i><strong>{reading?.humidityScore ?? '--'}</strong></div>
            <div><span>Temperature Score <b>15%</b></span><i><em style={{ width: `${reading?.temperatureScore || 0}%` }} /></i><strong>{reading?.temperatureScore ?? '--'}</strong></div>
          </div>
          <div className="formula-note">Sensor Risk = 70% Moisture + 15% Humidity + 15% Temperature</div>
          <p className="contributor-note"><strong>Key contributing factor:</strong> {hasReading && reading.moisture > 40 ? 'Elevated soil moisture' : 'Current sensor readings'}</p>
          <small className="prototype-note">Prototype thresholds are configurable and require local calibration before operational deployment.</small>
        </article>

        <article className="sensor-history panel">
          <div className="sensor-section-heading"><div><span className="eyebrow">RECENT READINGS</span><h2>Sensor History</h2></div><div className="range-control">{ranges.map((item) => <button key={item} type="button" className={range === item ? 'active' : ''} onClick={() => setRange(item)}>{item}h</button>)}</div></div>
          {historyLoading ? <div className="chart-empty">Reading sensor history...</div> : chartData.length < 2 ? <div className="chart-empty">Not enough sensor history yet.</div> : <>
            <ResponsiveContainer width="100%" height={230}><LineChart data={chartData}><CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" /><XAxis dataKey="time" tick={{ fontSize: 11 }} /><YAxis yAxisId="left" domain={[0, 100]} tick={{ fontSize: 11 }} /><YAxis yAxisId="right" orientation="right" domain={['auto', 'auto']} tick={{ fontSize: 11 }} /><Tooltip /><Legend /><Line yAxisId="left" type="monotone" dataKey="moisture" name="Moisture %" stroke="#0f766e" dot={false} /><Line yAxisId="left" type="monotone" dataKey="humidity" name="Humidity %" stroke="#2563eb" dot={false} /><Line yAxisId="right" type="monotone" dataKey="temperature" name="Temperature °C" stroke="#ea580c" dot={false} /></LineChart></ResponsiveContainer>
            <ResponsiveContainer width="100%" height={180}><LineChart data={chartData}><CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" /><XAxis dataKey="time" tick={{ fontSize: 11 }} /><YAxis domain={[0, 100]} tick={{ fontSize: 11 }} /><Tooltip /><Line type="monotone" dataKey="sensorRiskScore" name="Sensor Risk" stroke="#dc2626" strokeWidth={2} dot={false} /></LineChart></ResponsiveContainer>
          </>}
        </article>
      </section>

      <footer className="sensor-footer"><span>Last updated: {formatTime(reading?.timestamp)}</span><button type="button" onClick={loadLatest} title="Refresh sensor reading"><RefreshCw size={15} /> Refresh</button></footer>
    </div>
  );
}
