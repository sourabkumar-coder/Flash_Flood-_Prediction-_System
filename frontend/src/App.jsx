import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import PageContainer from './components/layout/PageContainer';
import Dashboard from './pages/Dashboard';
import LiveRiskMap from './pages/LiveRiskMap';
import Alerts from './pages/Alerts';
import Villages from './pages/Villages';
import Forecast from './pages/Forecast';
import Evacuation from './pages/Evacuation';
import Settings from './pages/Settings';
import Login from './pages/Login';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import './App.css';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <PageContainer>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/map" element={<LiveRiskMap />} />
              <Route path="/alerts" element={<Alerts />} />
              <Route path="/villages" element={<Villages />} />
              <Route path="/forecast" element={<Forecast />} />
              <Route path="/evacuation" element={<Evacuation />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Login />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </PageContainer>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;

