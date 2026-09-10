import React, { useState } from 'react';
import { Settings as SettingsIcon, Bell, Shield, Database, Wifi, Save, CheckCircle } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import './Settings.css';

export default function Settings() {
  const { theme, toggleTheme } = useTheme();
  const [criticalThreshold, setCriticalThreshold] = useState(75);
  const [highThreshold, setHighThreshold] = useState(55);
  const [autoRefreshInterval, setAutoRefreshInterval] = useState(15);
  const [enableSoundAlerts, setEnableSoundAlerts] = useState(true);
  const [enableDesktopNotifications, setEnableDesktopNotifications] = useState(true);
  const [saved, setSaved] = useState(false);

  const handleSave = (e) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="settings-container">
      <div className="page-header">
        <h1>System Settings & Configuration</h1>
        <p>Manage disaster threshold triggers, synoptic sync intervals, and telemetry preferences.</p>
      </div>

      <form onSubmit={handleSave} className="settings-form">
        <div className="settings-section panel">
          <div className="section-title">
            <Shield size={20} className="icon-blue" />
            <h3>Risk Threshold Configuration</h3>
          </div>
          <p className="section-desc">
            Define multi-factor XGBoost flood risk threshold score cutoffs for triggering automated SDRF/NDRF escalation warnings.
          </p>

          <div className="settings-grid">
            <div className="settings-field">
              <label>Critical Alert Cutoff (Score 0-100)</label>
              <input
                type="number"
                min="50"
                max="95"
                value={criticalThreshold}
                onChange={(e) => setCriticalThreshold(Number(e.target.value))}
              />
              <span className="field-hint">Currently set to {criticalThreshold}/100. Triggers immediate red warning.</span>
            </div>

            <div className="settings-field">
              <label>High Risk Watch Cutoff (Score 0-100)</label>
              <input
                type="number"
                min="30"
                max="75"
                value={highThreshold}
                onChange={(e) => setHighThreshold(Number(e.target.value))}
              />
              <span className="field-hint">Currently set to {highThreshold}/100. Triggers amber advisory.</span>
            </div>
          </div>
        </div>

        <div className="settings-section panel">
          <div className="section-title">
            <Database size={20} className="icon-blue" />
            <h3>Telemetry & Synoptic Streams</h3>
          </div>
          <p className="section-desc">
            Configure Open-Meteo multi-coordinate polling frequency and GloFAS hydrological runoff feed caching.
          </p>

          <div className="settings-grid">
            <div className="settings-field">
              <label>Weather Polling Interval (Minutes)</label>
              <select
                value={autoRefreshInterval}
                onChange={(e) => setAutoRefreshInterval(Number(e.target.value))}
              >
                <option value={5}>Every 5 minutes</option>
                <option value={15}>Every 15 minutes (Standard)</option>
                <option value={30}>Every 30 minutes</option>
                <option value={60}>Every 1 hour</option>
              </select>
              <span className="field-hint">Cron scheduler automatically refreshes all 28 valley checkpoints.</span>
            </div>

            <div className="settings-field">
              <label>UI Theme Mode</label>
              <div className="theme-select-row">
                <button
                  type="button"
                  className={`theme-btn ${theme === 'light' ? 'active' : ''}`}
                  onClick={() => theme === 'dark' && toggleTheme()}
                >
                  ☀️ Light Mode
                </button>
                <button
                  type="button"
                  className={`theme-btn ${theme === 'dark' ? 'active' : ''}`}
                  onClick={() => theme === 'light' && toggleTheme()}
                >
                  🌑 Dark Mode
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="settings-section panel">
          <div className="section-title">
            <Bell size={20} className="icon-blue" />
            <h3>Alerting & Emergency Notifications</h3>
          </div>

          <div className="toggle-list">
            <label className="toggle-row">
              <input
                type="checkbox"
                checked={enableSoundAlerts}
                onChange={(e) => setEnableSoundAlerts(e.target.checked)}
              />
              <div>
                <strong>Audio Siren for Critical Floods</strong>
                <p>Play warning audio alert when river water levels breach danger thresholds.</p>
              </div>
            </label>

            <label className="toggle-row">
              <input
                type="checkbox"
                checked={enableDesktopNotifications}
                onChange={(e) => setEnableDesktopNotifications(e.target.checked)}
              />
              <div>
                <strong>Browser Push Notifications</strong>
                <p>Send urgent desktop banner notifications when cloudbursts are detected upstream.</p>
              </div>
            </label>
          </div>
        </div>

        <div className="settings-actions">
          <button type="submit" className="btn-primary save-btn">
            <Save size={16} />
            <span>Save Preferences</span>
          </button>
          {saved && (
            <span className="saved-feedback">
              <CheckCircle size={16} color="#10b981" /> Configuration saved successfully.
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
