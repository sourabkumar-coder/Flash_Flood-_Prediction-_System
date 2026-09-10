import React, { useEffect, useState } from 'react';
import { riskApi } from '../api/client';
import { AlertTriangle, Activity, MapPin, Users, Clock, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import './Dashboard.css';

export default function Dashboard() {
  const { t } = useTranslation();
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
    return <div className="loading-state">{t('villages_page.processing')}</div>;
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>{t('dashboard.title')}</h1>
        <p>{t('dashboard.subtitle')}</p>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card critical">
          <div className="kpi-icon"><AlertTriangle size={24} /></div>
          <div className="kpi-content">
            <span className="kpi-label">{t('dashboard.critical_alerts')}</span>
            <span className="kpi-value">{summary.criticalCount || 0}</span>
          </div>
        </div>
        
        <div className="kpi-card warning">
          <div className="kpi-icon"><Activity size={24} /></div>
          <div className="kpi-content">
            <span className="kpi-label">{t('dashboard.high_risk_zones')}</span>
            <span className="kpi-value">{summary.highCount || 0}</span>
          </div>
        </div>

        <div className="kpi-card info">
          <div className="kpi-icon"><MapPin size={24} /></div>
          <div className="kpi-content">
            <span className="kpi-label">{t('dashboard.monitored_valleys')}</span>
            <span className="kpi-value">{summary.totalMonitored || 0}</span>
          </div>
        </div>

        <div className="kpi-card neutral">
          <div className="kpi-icon"><Clock size={24} /></div>
          <div className="kpi-content">
            <span className="kpi-label">{t('dashboard.min_lead_time')}</span>
            <span className="kpi-value">{summary.minLeadTimeHours} {t('dashboard.hrs')}</span>
          </div>
        </div>
      </div>

      <div className="dashboard-actions">
        <h2>{t('dashboard.quick_actions')}</h2>
        <div className="action-grid">
          <Link to="/map" className="action-card">
            <h3>{t('dashboard.live_risk_map')}</h3>
            <p>{t('dashboard.live_map_desc')}</p>
            <ArrowRight size={20} />
          </Link>
          <Link to="/alerts" className="action-card">
            <h3>{t('dashboard.manage_alerts')}</h3>
            <p>{t('dashboard.alerts_desc')}</p>
            <ArrowRight size={20} />
          </Link>
          <Link to="/villages" className="action-card">
            <h3>{t('dashboard.village_profiles')}</h3>
            <p>{t('dashboard.villages_desc')}</p>
            <ArrowRight size={20} />
          </Link>
        </div>
      </div>
    </div>
  );
}
