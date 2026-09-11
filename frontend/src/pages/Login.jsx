import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  ShieldAlert, User, Mail, Phone, Lock, MapPin, 
  BellRing, CheckCircle, AlertTriangle, ArrowRight 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './Login.css';

const DEFAULT_STATES = [
  'Himachal Pradesh',
  'Uttarakhand',
  'Assam',
  'Sikkim',
  'Jammu & Kashmir',
  'Meghalaya',
  'Arunachal Pradesh',
  'Kerala',
  'Maharashtra',
  'West Bengal'
];

export default function Login() {
  const [searchParams] = useSearchParams();
  const initialMode = searchParams.get('mode') === 'register' ? 'register' : 'login';
  const [isRegister, setIsRegister] = useState(initialMode === 'register');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    state: 'Himachal Pradesh',
    district: 'Kullu'
  });

  const [states, setStates] = useState(DEFAULT_STATES);
  const [districts, setDistricts] = useState(['Kullu', 'Mandi', 'Shimla', 'Kangra', 'Chamba', 'Solan']);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { login, register, user } = useAuth();
  const navigate = useNavigate();

  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:8000';

  // Load States
  useEffect(() => {
    fetch(`${BACKEND_URL}/api/states`)
      .then(res => res.json())
      .then(data => {
        if (data.states && data.states.length > 0) {
          setStates(data.states);
        }
      })
      .catch(() => {});
  }, [BACKEND_URL]);

  // Load Districts when state changes
  useEffect(() => {
    if (!formData.state) return;
    fetch(`${BACKEND_URL}/api/districts/${encodeURIComponent(formData.state)}`)
      .then(res => res.json())
      .then(data => {
        if (data.districts && data.districts.length > 0) {
          setDistricts(data.districts);
          if (!data.districts.includes(formData.district)) {
            setFormData(prev => ({ ...prev, district: data.districts[0] }));
          }
        }
      })
      .catch(() => {});
  }, [formData.state, BACKEND_URL]);

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);

    try {
      if (isRegister) {
        if (!formData.name || !formData.email || !formData.phone || !formData.password) {
          throw new Error('Please fill in all required fields.');
        }
        await register(formData);
        setSuccess('Registration successful! You are now subscribed to regional flood alerts.');
        setTimeout(() => navigate('/'), 1200);
      } else {
        if (!formData.email || !formData.password) {
          throw new Error('Please provide email and password.');
        }
        await login(formData.email, formData.password);
        setSuccess('Welcome back! Logged in successfully.');
        setTimeout(() => navigate('/'), 800);
      }
    } catch (err) {
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-icon-wrap">
            <ShieldAlert size={32} />
          </div>
          <h1 className="auth-title">
            {isRegister ? 'Citizen Alert Registration' : 'Citizen / Operator Sign In'}
          </h1>
          <p className="auth-subtitle">
            {isRegister 
              ? 'Register your region & phone to receive instant Fast2SMS flood warnings.' 
              : 'Sign in to manage your regional flood alert preferences.'}
          </p>
        </div>

        <div className="auth-tabs">
          <button 
            type="button" 
            className={`auth-tab ${!isRegister ? 'active' : ''}`}
            onClick={() => { setIsRegister(false); setError(''); }}
          >
            Sign In
          </button>
          <button 
            type="button" 
            className={`auth-tab ${isRegister ? 'active' : ''}`}
            onClick={() => { setIsRegister(true); setError(''); }}
          >
            Register for Alerts
          </button>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {error && <div className="auth-error">{error}</div>}
          {success && <div className="auth-success">{success}</div>}

          {isRegister && (
            <div className="auth-alert-banner">
              <BellRing size={18} />
              <span>Registered citizens automatically receive direct SMS alerts when high flood risk is detected in their district.</span>
            </div>
          )}

          {isRegister && (
            <div className="auth-field">
              <label><User size={14} /> Full Name</label>
              <div className="auth-input-wrap">
                <User size={16} className="auth-input-icon" />
                <input 
                  type="text" 
                  name="name" 
                  className="auth-input" 
                  placeholder="e.g. Animesh Kumar"
                  value={formData.name}
                  onChange={handleChange}
                  required={isRegister}
                />
              </div>
            </div>
          )}

          <div className="auth-field">
            <label><Mail size={14} /> Email Address</label>
            <div className="auth-input-wrap">
              <Mail size={16} className="auth-input-icon" />
              <input 
                type="email" 
                name="email" 
                className="auth-input" 
                placeholder="name@example.com"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          {isRegister && (
            <div className="auth-field">
              <label><Phone size={14} /> Mobile Number (for Fast2SMS Alerts)</label>
              <div className="auth-input-wrap">
                <Phone size={16} className="auth-input-icon" />
                <input 
                  type="tel" 
                  name="phone" 
                  className="auth-input" 
                  placeholder="10-digit mobile number (e.g. 8002808966)"
                  value={formData.phone}
                  onChange={handleChange}
                  required={isRegister}
                />
              </div>
            </div>
          )}

          {isRegister && (
            <div className="auth-row">
              <div className="auth-field">
                <label><MapPin size={14} /> State</label>
                <select 
                  name="state" 
                  className="auth-select"
                  value={formData.state} 
                  onChange={handleChange}
                >
                  {states.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div className="auth-field">
                <label><MapPin size={14} /> District</label>
                <select 
                  name="district" 
                  className="auth-select"
                  value={formData.district} 
                  onChange={handleChange}
                >
                  {districts.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>
          )}

          <div className="auth-field">
            <label><Lock size={14} /> Password</label>
            <div className="auth-input-wrap">
              <Lock size={16} className="auth-input-icon" />
              <input 
                type="password" 
                name="password" 
                className="auth-input" 
                placeholder="Enter password"
                value={formData.password}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <button 
            type="submit" 
            className="auth-btn-submit" 
            disabled={submitting}
          >
            {submitting ? 'Please wait...' : (
              <>
                {isRegister ? 'Register & Enable Alerts' : 'Sign In'}
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        <div className="auth-footer">
          {isRegister ? (
            <span>Already registered? <a href="#signin" onClick={(e) => { e.preventDefault(); setIsRegister(false); }}>Sign In here</a></span>
          ) : (
            <span>New resident? <a href="#register" onClick={(e) => { e.preventDefault(); setIsRegister(true); }}>Register for SMS alerts</a></span>
          )}
        </div>
      </div>
    </div>
  );
}
