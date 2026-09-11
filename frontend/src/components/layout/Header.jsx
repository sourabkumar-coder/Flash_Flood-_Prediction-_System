import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Globe, Menu, Moon, PhoneCall, ShieldAlert, Sun, X, User, LogOut } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { LANGUAGES } from '../../i18n';
import './Layout.css';


export default function Header({ onMenuClick }) {
  const { theme, toggleTheme } = useTheme();
  const { t, i18n } = useTranslation();
  const [isNdrfModalOpen, setIsNdrfModalOpen] = useState(false);

  const { user, logout } = useAuth();

  const handleLanguageChange = (e) => {
    i18n.changeLanguage(e.target.value);
  };

  return (
    <>
      <header className="top-header">
        <button
          className="menu-toggle"
          onClick={onMenuClick}
          aria-label="Open navigation menu"
          title="Open navigation menu"
        >
          <Menu size={21} />
        </button>
        <div className="header-left">
          {user ? (
            <div className="user-badge-wrap" title={`Registered for alerts in ${user.district}, ${user.state}`}>
              <div className="user-avatar-pill">
                {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="user-info-text">
                <span className="user-name-label">{user.name}</span>
                <span className="user-region-label">{user.district || user.state}</span>
              </div>
              <button
                type="button"
                className="btn-logout-icon"
                onClick={logout}
                title="Sign Out"
                aria-label="Sign Out"
              >
                <LogOut size={14} />
              </button>
            </div>
          ) : (
            <Link to="/login" className="header-auth-btn" title="Register your region for SMS alerts">
              <User size={15} />
              <span>Sign In / Alerts</span>
            </Link>
          )}
        </div>

        <div className="header-right">
          {/* Language Selector */}
          <div className="language-selector-wrapper">
            <Globe size={15} className="lang-icon" />
            <span className="lang-code" aria-hidden="true">{(i18n.language || 'en').substring(0, 2).toUpperCase()}</span>
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

      <button
        type="button"
        className="ndrf-marquee-banner"
        onClick={() => setIsNdrfModalOpen(true)}
        title="Click to view all NDRF emergency numbers"
      >
        <span className="ndrf-marquee-label"><PhoneCall size={15} /> NDRF EMERGENCY CONTACTS</span>
        <span className="ndrf-marquee-viewport" aria-hidden="true">
          <span className="ndrf-marquee-track">
            <span>1078 / 112</span><span>+91-9711077372</span><span>011-23438091</span><span>011-23438136</span><span>1070</span><span>011-24363260</span>
            <span>1078 / 112</span><span>+91-9711077372</span><span>011-23438091</span><span>011-23438136</span><span>1070</span><span>011-24363260</span>
          </span>
        </span>
        <span className="ndrf-marquee-action">View all numbers</span>
      </button>


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

