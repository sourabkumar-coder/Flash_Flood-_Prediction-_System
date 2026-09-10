import React, { useEffect, useState } from 'react';
import { riskApi } from '../api/client';
import { AlertTriangle, Activity, MapPin, Users, Clock, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import './Dashboard.css';

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSummary();
  }, []);

  const fetchSummary = async () => {
    try {
      const response = await riskApi.getThreats();
      setSummary(response.data.summary);
    } catch (err) {
      console.error('Failed to fetch summary:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !summary) {
    return <div className="loading-state">Loading dashboard data...</div>;
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Command Overview</h1>
        <p>Current snapshot of monitored basins and regional threats.</p>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card critical">
          <div className="kpi-icon"><AlertTriangle size={24} /></div>
          <div className="kpi-content">
            <span className="kpi-label">Critical Alerts</span>
            <span className="kpi-value">{summary.criticalCount || 0}</span>
          </div>
        </div>
        
        <div className="kpi-card warning">
          <div className="kpi-icon"><Activity size={24} /></div>
          <div className="kpi-content">
            <span className="kpi-label">High Risk Zones</span>
            <span className="kpi-value">{summary.highCount || 0}</span>
          </div>
        </div>

        <div className="kpi-card info">
          <div className="kpi-icon"><MapPin size={24} /></div>
          <div className="kpi-content">
            <span className="kpi-label">Monitored Valleys</span>
            <span className="kpi-value">{summary.totalMonitored || 0}</span>
          </div>
        </div>

        <div className="kpi-card neutral">
          <div className="kpi-icon"><Clock size={24} /></div>
          <div className="kpi-content">
            <span className="kpi-label">Min Lead Time</span>
            <span className="kpi-value">{summary.minLeadTimeHours} hrs</span>
          </div>
        </div>
      </div>

      <div className="dashboard-actions">
        <h2>Quick Actions</h2>
        <div className="action-grid">
          <Link to="/map" className="action-card">
            <h3>Live Risk Map</h3>
            <p>View real-time geospatial risk data and telemetry.</p>
            <ArrowRight size={20} />
          </Link>
          <Link to="/alerts" className="action-card">
            <h3>Manage Alerts</h3>
            <p>Acknowledge or escalate active regional warnings.</p>
            <ArrowRight size={20} />
          </Link>
          <Link to="/villages" className="action-card">
            <h3>Village Profiles</h3>
            <p>View specific ML predictions and hydrology data per village.</p>
            <ArrowRight size={20} />
          </Link>
        </div>
      </div>
    </div>
  );
}
