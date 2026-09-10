import React from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import './Layout.css';

export default function PageContainer({ children }) {
  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Header />
        <main className="page-content">
          {children}
        </main>
      </div>
    </div>
  );
}
