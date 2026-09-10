import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import PageContainer from './components/layout/PageContainer';
import Dashboard from './pages/Dashboard';
import LiveRiskMap from './pages/LiveRiskMap';
import Alerts from './pages/Alerts';
import Villages from './pages/Villages';
import Forecast from './pages/Forecast';
import Evacuation from './pages/Evacuation';
import { ThemeProvider } from './context/ThemeContext';
import './App.css';

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <PageContainer>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/map" element={<LiveRiskMap />} />
            <Route path="/alerts" element={<Alerts />} />
            <Route path="/villages" element={<Villages />} />
            <Route path="/forecast" element={<Forecast />} />
            <Route path="/evacuation" element={<Evacuation />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </PageContainer>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
