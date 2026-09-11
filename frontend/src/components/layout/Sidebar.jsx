import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Map, Bell, Home, CloudRain, ShieldAlert, Settings } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import './Layout.css';

export default function Sidebar({ isOpen, onClose }) {
  const { t } = useTranslation();

  const navItems = [
    { path: '/', label: t('nav.dashboard'), icon: LayoutDashboard },
    { path: '/map', label: t('nav.map'), icon: Map },
    { path: '/alerts', label: t('nav.alerts'), icon: Bell },
    { path: '/villages', label: t('nav.villages'), icon: Home },
    { path: '/forecast', label: t('nav.forecast'), icon: CloudRain },
    { path: '/evacuation', label: t('nav.evacuation'), icon: ShieldAlert },
  ];

  return (
    <aside className={`sidebar ${isOpen ? 'is-open' : ''}`}>
      <div className="sidebar-brand">
        <div className="brand-logo">
          <ShieldAlert size={24} color="var(--primary)" />
        </div>
        <div className="brand-text">
          <h1>{t('app_title')}</h1>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <NavLink 
            key={item.path} 
            to={item.path} 
            onClick={onClose}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <item.icon size={20} className="nav-icon" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <NavLink to="/settings" onClick={onClose} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Settings size={20} className="nav-icon" />
          <span>{t('nav.settings')}</span>
        </NavLink>
      </div>
    </aside>
  );
}
