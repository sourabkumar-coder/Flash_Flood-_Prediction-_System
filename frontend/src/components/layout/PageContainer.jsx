import React, { useEffect, useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import './Layout.css';

export default function PageContainer({ children }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    document.body.classList.toggle('sidebar-open', isSidebarOpen);
    return () => document.body.classList.remove('sidebar-open');
  }, [isSidebarOpen]);

  return (
    <div className="app-layout">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      {isSidebarOpen && (
        <button
          type="button"
          className="sidebar-backdrop"
          aria-label="Close navigation menu"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      <div className="main-content">
        <Header onMenuClick={() => setIsSidebarOpen(true)} />
        <main className="page-content">
          {children}
        </main>
      </div>
    </div>
  );
}
