import React from 'react';
import { Activity, Moon, ShieldAlert, Sun } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import './Layout.css';

export default function Header() {
  const status = 'ONLINE';
  const demoMode = false;
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="top-header">
      <div className="header-left">
        <h2 className="page-title">JALDRISHTI</h2>
        <span className="subtitle-text">Hyperlocal Flash-Flood & Landslide Early Warning System</span>
      </div>
      
      <div className="header-right">
        {demoMode && (
          <div className="demo-badge">
            <ShieldAlert size={16} />
            <span>DEMO MODE</span>
          </div>
        )}
        <div className="system-status">
          <Activity size={16} className={status === 'ONLINE' ? 'status-icon online' : 'status-icon offline'} />
          <span>SYSTEM ONLINE</span>
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
  );
}
