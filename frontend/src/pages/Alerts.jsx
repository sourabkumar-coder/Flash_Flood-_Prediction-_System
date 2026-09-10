import React, { useEffect, useState } from 'react';
import { alertApi } from '../api/client';
import { Bell, CheckCircle, ShieldAlert, Clock } from 'lucide-react';
import './Alerts.css';

export default function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    try {
      const response = await alertApi.getAlerts();
      setAlerts(response.data.alerts);
    } catch (err) {
      console.error('Failed to fetch alerts:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAcknowledge = async (id) => {
    try {
      await alertApi.acknowledge(id);
      setAlerts(alerts.map(a => a.id === id ? { ...a, status: 'ACKNOWLEDGED' } : a));
    } catch (err) {
      console.error('Failed to acknowledge alert:', err);
    }
  };

  if (loading) return <div className="loading-state">Loading alerts...</div>;

  return (
    <div className="alerts-container">
      <div className="page-header">
        <h1>Active Alerts</h1>
        <p>Regional threat warnings requiring attention.</p>
      </div>

      {alerts.length === 0 ? (
        <div className="empty-state">
          <CheckCircle size={48} color="var(--risk-low)" />
          <h3>No Active Alerts</h3>
          <p>All monitored regions are currently operating within safe parameters.</p>
        </div>
      ) : (
        <div className="alert-list">
          {alerts.map(alert => (
            <div key={alert.id} className={`alert-card ${alert.severity.toLowerCase()}`}>
              <div className="alert-icon">
                <ShieldAlert size={24} />
              </div>
              <div className="alert-content">
                <div className="alert-header">
                  <span className={`badge ${alert.severity.toLowerCase()}`}>{alert.severity}</span>
                  <span className="alert-time"><Clock size={14} /> {new Date(alert.issuedAt).toLocaleString()}</span>
                </div>
                <h3>{alert.title}</h3>
                <p><strong>Target Area:</strong> {alert.target}</p>
                <p><strong>Estimated Lead Time:</strong> {alert.leadTime} hours</p>
                
                <div className="alert-actions">
                  {alert.status === 'ACTIVE' ? (
                    <button className="btn-primary" onClick={() => handleAcknowledge(alert.id)}>
                      Acknowledge Warning
                    </button>
                  ) : (
                    <span className="status-acknowledged"><CheckCircle size={16} /> Acknowledged</span>
                  )}
                  <button className="btn-outline">Open Evacuation Plan</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
