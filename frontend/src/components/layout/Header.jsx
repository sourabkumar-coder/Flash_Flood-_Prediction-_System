import React, { useState } from 'react';
import { Activity, Globe, Menu, Moon, PhoneCall, ShieldAlert, Sun, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { LANGUAGES } from '../../i18n';
import './Layout.css';

export default function Header({ onMenuClick }) {
  const status = 'ONLINE';
  const { theme, toggleTheme } = useTheme();
  const { t, i18n } = useTranslation();
  const [isNdrfModalOpen, setIsNdrfModalOpen] = useState(false);

  const handleLanguageChange = (e) => {
    i18n.changeLanguage(e.target.value);
  };

  return (
    <>
      <header className="top-header">
        <button
          type="button"
          className="menu-toggle"
          onClick={onMenuClick}
          aria-label="Open navigation menu"
          title="Open navigation menu"
        >
          <Menu size={21} />
        </button>
        <div className="header-left">
          <h2 className="page-title">{t('app_title')}</h2>
          <span className="subtitle-text">{t('app_subtitle')}</span>
        </div>
        
        <div className="header-right">
          {/* Language Selector */}
          <div className="language-selector-wrapper">
            <Globe size={15} className="lang-icon" />
            <select 
              className="lang-select" 
              value={i18n.language ? i18n.language.substring(0, 2) : 'en'} 
              onChange={handleLanguageChange}
              aria-label="Select Language"
            >
              {LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.nativeName}
                </option>
              ))}
            </select>
          </div>

          {/* NDRF Emergency Hotline Pill */}
          <button
            type="button"
            className="ndrf-header-btn"
            onClick={() => setIsNdrfModalOpen(true)}
            title="Click to view NDRF Control Room & Emergency Rescue Numbers"
          >
            <PhoneCall size={14} className="pulse-icon" />
            <span>{t('ndrf.pill')}</span>
          </button>

          <div className="system-status">
            <Activity size={16} className={status === 'ONLINE' ? 'status-icon online' : 'status-icon offline'} />
            <span>{t('status.online')}</span>
          </div>

          <button
            type="button"
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          >
            {theme === 'light' ? <Moon size={17} /> : <Sun size={17} />}
          </button>
        </div>
      </header>

      {/* NDRF Emergency Details Modal */}
      {isNdrfModalOpen && (
        <div className="ndrf-modal-overlay" onClick={() => setIsNdrfModalOpen(false)}>
          <div className="ndrf-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="ndrf-modal-header">
              <div className="ndrf-title-group">
                <ShieldAlert size={24} color="#ef4444" />
                <h3>{t('ndrf.title')}</h3>
              </div>
              <button className="ndrf-close-btn" onClick={() => setIsNdrfModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <p className="ndrf-modal-desc">
              {t('ndrf.desc')}
            </p>
            <div className="ndrf-numbers-grid">
              <div className="ndrf-card highlight">
                <span className="ndrf-card-label">{t('ndrf.tollfree')}</span>
                <a href="tel:1078" className="ndrf-card-value">1078 / 112</a>
              </div>
              <div className="ndrf-card highlight">
                <span className="ndrf-card-label">{t('ndrf.helpline')}</span>
                <a href="tel:9711077372" className="ndrf-card-value">+91-9711077372</a>
              </div>
              <div className="ndrf-card">
                <span className="ndrf-card-label">{t('ndrf.hq')}</span>
                <a href="tel:01123438091" className="ndrf-card-value">011-23438091</a>
              </div>
              <div className="ndrf-card">
                <span className="ndrf-card-label">{t('ndrf.hq')} (Alt)</span>
                <a href="tel:01123438136" className="ndrf-card-value">011-23438136</a>
              </div>
              <div className="ndrf-card">
                <span className="ndrf-card-label">{t('ndrf.seoc')}</span>
                <a href="tel:1070" className="ndrf-card-value">1070</a>
              </div>
              <div className="ndrf-card">
                <span className="ndrf-card-label">{t('ndrf.ministry')}</span>
                <a href="tel:01124363260" className="ndrf-card-value">011-24363260</a>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

