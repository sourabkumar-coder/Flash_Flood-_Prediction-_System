import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Map, Bell, Home, CloudRain, ShieldAlert, Settings } from 'lucide-react';
import './Layout.css';

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/map', label: 'Live Risk Map', icon: Map },
  { path: '/alerts', label: 'Alerts', icon: Bell },
  { path: '/villages', label: 'Villages', icon: Home },
  { path: '/forecast', label: 'Forecast', icon: CloudRain },
  { path: '/evacuation', label: 'Evacuation', icon: ShieldAlert },
];

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-logo">
          <ShieldAlert size={24} color="var(--primary)" />
        </div>
        <div className="brand-text">
          <h1>JALDRISHTI</h1>
          <span className="eyebrow">Early Warning System</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <NavLink 
            key={item.path} 
            to={item.path} 
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <item.icon size={20} className="nav-icon" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <NavLink to="/settings" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Settings size={20} className="nav-icon" />
          <span>Settings</span>
        </NavLink>
      </div>
    </aside>
  );
}
