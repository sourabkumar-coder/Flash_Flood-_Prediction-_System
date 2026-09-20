import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  ShieldAlert, User, Mail, Phone, Lock, MapPin, 
  BellRing, CheckCircle, AlertTriangle, ArrowRight 
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { riskApi } from '../api/client';
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
  const { t } = useTranslation();
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

  // Load States
  useEffect(() => {
    riskApi.getStates()
      .then(res => {
        const data = res.data;
        if (data.states && data.states.length > 0) {
          setStates(data.states);
        }
      })
      .catch(() => {});
  }, []);

  // Load Districts when state changes
  useEffect(() => {
    if (!formData.state) return;
    riskApi.getDistricts(formData.state)
      .then(res => {
        const data = res.data;
        if (data.districts && data.districts.length > 0) {
          setDistricts(data.districts);
          if (!data.districts.includes(formData.district)) {
            setFormData(prev => ({ ...prev, district: data.districts[0] }));
          }
        }
      })
      .catch(() => {});
  }, [formData.state]);

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
          throw new Error(t('auth.fill_all_fields'));
        }
        await register(formData);
        setSuccess(t('auth.reg_success'));
        setTimeout(() => navigate('/'), 1200);
      } else {
        if (!formData.email || !formData.password) {
          throw new Error(t('auth.provide_email_pass'));
        }
        await login(formData.email, formData.password);
        setSuccess(t('auth.login_success'));
        setTimeout(() => navigate('/'), 800);
      }
    } catch (err) {
      setError(err.message || t('auth.error_occurred'));
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
            {isRegister ? t('auth.reg_title') : t('auth.login_title')}
          </h1>
          <p className="auth-subtitle">
            {isRegister 
              ? t('auth.reg_subtitle') 
              : t('auth.login_subtitle')}
          </p>
        </div>

        <div className="auth-tabs">
          <button 
            type="button" 
            className={`auth-tab ${!isRegister ? 'active' : ''}`}
            onClick={() => { setIsRegister(false); setError(''); }}
          >
            {t('auth.tab_signin')}
          </button>
          <button 
            type="button" 
            className={`auth-tab ${isRegister ? 'active' : ''}`}
            onClick={() => { setIsRegister(true); setError(''); }}
          >
            {t('auth.tab_register')}
          </button>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {error && <div className="auth-error">{error}</div>}
          {success && <div className="auth-success">{success}</div>}

          {isRegister && (
            <div className="auth-alert-banner">
              <BellRing size={18} />
              <span>{t('auth.why_reg_1')}</span>
            </div>
          )}

          {isRegister && (
            <div className="auth-field">
              <label><User size={14} /> {t('auth.full_name')}</label>
              <div className="auth-input-wrap">
                <User size={16} className="auth-input-icon" />
                <input 
                  type="text" 
                  name="name" 
                  className="auth-input" 
                  placeholder={t('auth.full_name_placeholder')}
                  value={formData.name}
                  onChange={handleChange}
                  required={isRegister}
                />
              </div>
            </div>
          )}

          <div className="auth-field">
            <label><Mail size={14} /> {t('auth.email_address')}</label>
            <div className="auth-input-wrap">
              <Mail size={16} className="auth-input-icon" />
              <input 
                type="email" 
                name="email" 
                className="auth-input" 
                placeholder={t('auth.email_placeholder')}
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          {isRegister && (
            <div className="auth-field">
              <label><Phone size={14} /> {t('auth.mobile_number')}</label>
              <div className="auth-input-wrap">
                <Phone size={16} className="auth-input-icon" />
                <input 
                  type="tel" 
                  name="phone" 
                  className="auth-input" 
                  placeholder={t('auth.mobile_placeholder')}
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
                <label><MapPin size={14} /> {t('villages_page.state')}</label>
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
                <label><MapPin size={14} /> {t('villages_page.district')}</label>
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
            <label><Lock size={14} /> {t('auth.password')}</label>
            <div className="auth-input-wrap">
              <Lock size={16} className="auth-input-icon" />
              <input 
                type="password" 
                name="password" 
                className="auth-input" 
                placeholder={isRegister ? t('auth.password_placeholder') : t('auth.password_login_placeholder')}
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
            {submitting ? t('auth.submitting') : (
              <>
                {isRegister ? t('auth.btn_register') : t('auth.btn_login')}
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        <div className="auth-footer">
          {isRegister ? (
            <span>{t('auth.switch_to_login_prompt')} <a href="#signin" onClick={(e) => { e.preventDefault(); setIsRegister(false); }}>{t('auth.switch_to_login_link')}</a></span>
          ) : (
            <span>{t('auth.switch_to_reg_prompt')} <a href="#register" onClick={(e) => { e.preventDefault(); setIsRegister(true); }}>{t('auth.switch_to_reg_link')}</a></span>
          )}
        </div>
      </div>
    </div>
  );
}
