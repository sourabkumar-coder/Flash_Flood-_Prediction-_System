import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { alertApi, riskApi } from '../api/client';
import { Bell, CheckCircle, ShieldAlert, Clock, AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import './Alerts.css';

export default function Alerts() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    try {
      const [alertRes, threatRes] = await Promise.all([
        alertApi.getAlerts().catch(() => ({ data: { alerts: [] } })),
        riskApi.getThreats().catch(() => ({ data: {} }))
      ]);

      let list = alertRes.data?.alerts || [];
      const criticalAlert = threatRes.data?.criticalAlert;

      if (criticalAlert && list.length === 0) {
        list.push({
          id: 'alert-crit-1',
          severity: 'CRITICAL',
          title: criticalAlert.title,
          target: criticalAlert.target,
          leadTime: criticalAlert.leadTime,
          issuedAt: new Date().toISOString(),
          status: 'ACTIVE'
        });
      }

      setAlerts(list);
    } catch (err) {
      console.error('Failed to fetch alerts:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAcknowledge = async (id) => {
    try {
      await alertApi.acknowledge(id).catch(() => null);
      setAlerts(alerts.map(a => a.id === id ? { ...a, status: 'ACKNOWLEDGED' } : a));
    } catch (err) {
      console.error('Failed to acknowledge alert:', err);
    }
  };

  const handleOpenEvacuation = (alert) => {
    navigate('/evacuation?lat=31.765&lon=77.342&name=Sainj%20Valley%20(Neuli)&state=Himachal%20Pradesh&district=Kullu');
  };

  if (loading) return <div className="loading-state">{t('villages_page.processing')}</div>;

  return (
    <div className="alerts-container">
      <div className="page-header">
        <h1>{t('alerts_page.title')}</h1>
        <p>{t('alerts_page.subtitle')}</p>
      </div>

      {alerts.length === 0 ? (
        <div className="empty-state panel">
          <CheckCircle size={48} color="var(--risk-low)" />
          <h3>{t('alerts_page.no_alerts_title')}</h3>
          <p>{t('alerts_page.no_alerts_desc')}</p>
        </div>
      ) : (
        <div className="alert-list">
          {alerts.map(alert => (
            <div key={alert.id} className={`alert-card panel ${alert.severity.toLowerCase()}`}>
              <div className="alert-icon">
                <ShieldAlert size={24} />
              </div>
              <div className="alert-content">
                <div className="alert-header">
                  <span className={`badge ${alert.severity.toLowerCase()}`}>{alert.severity}</span>
                  <span className="alert-time"><Clock size={14} /> {new Date(alert.issuedAt).toLocaleTimeString()}</span>
                </div>
                <h3>{alert.title}</h3>
                <p><strong>{t('alerts_page.target_area')}:</strong> {alert.target}</p>
                <p><strong>{t('alerts_page.estimated_lead_time')}:</strong> {alert.leadTime}</p>
                
                <div className="alert-actions">
                  {alert.status === 'ACTIVE' ? (
                    <button className="btn-primary" onClick={() => handleAcknowledge(alert.id)}>
                      {t('alerts_page.ack_button')}
                    </button>
                  ) : (
                    <span className="status-acknowledged"><CheckCircle size={16} /> {t('alerts_page.acknowledged')}</span>
                  )}
                  <button className="btn-outline" onClick={() => handleOpenEvacuation(alert)}>
                    {t('alerts_page.open_evac')} &rarr;
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

