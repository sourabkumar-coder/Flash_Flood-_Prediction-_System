import React, { createContext, useContext, useState, useEffect } from 'react';

import { authApi } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('flood_app_user');
      if (stored) {
        setUser(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to parse stored user:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    try {
      const res = await authApi.login(email, password);
      const data = res.data;
      setUser(data.user);
      localStorage.setItem('flood_app_user', JSON.stringify(data.user));
      return data.user;
    } catch (err) {
      const detail = err.response?.data?.detail || err.message || 'Login failed';
      throw new Error(detail);
    }
  };

  const register = async (formData) => {
    try {
      const res = await authApi.register(formData);
      const data = res.data;
      setUser(data.user);
      localStorage.setItem('flood_app_user', JSON.stringify(data.user));
      return data.user;
    } catch (err) {
      const detail = err.response?.data?.detail || err.message || 'Registration failed';
      throw new Error(detail);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('flood_app_user');
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
