import React, { useState, useEffect } from 'react';
import { 
  X, MapPin, Navigation, Settings, AlertCircle, 
  ChevronDown, RefreshCw, CheckCircle, Globe 
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { riskApi } from '../api/client';
import './LocationModal.css';

const DEFAULT_STATE_LIST = [
  'Himachal Pradesh',
  'Uttarakhand',
  'Assam',
  'Arunachal Pradesh',
  'Sikkim',
  'Jammu & Kashmir',
  'Meghalaya',
  'Kerala',
  'West Bengal',
  'Maharashtra'
];

const FALLBACK_DISTRICT_COORDS = {
  'Kullu': { lat: 31.9579, lon: 77.1095, state: 'Himachal Pradesh' },
  'Mandi': { lat: 31.7087, lon: 76.9320, state: 'Himachal Pradesh' },
  'Shimla': { lat: 31.1048, lon: 77.1734, state: 'Himachal Pradesh' },
  'Kangra': { lat: 32.0998, lon: 76.2691, state: 'Himachal Pradesh' },
  'Chamba': { lat: 32.5534, lon: 76.1258, state: 'Himachal Pradesh' },
  'Dehradun': { lat: 30.3165, lon: 78.0322, state: 'Uttarakhand' },
  'Chamoli': { lat: 30.4136, lon: 79.3243, state: 'Uttarakhand' },
  'Rudraprayag': { lat: 30.2844, lon: 78.9811, state: 'Uttarakhand' },
  'Uttarkashi': { lat: 30.7268, lon: 78.4354, state: 'Uttarakhand' },
  'Dibang Valley': { lat: 28.8000, lon: 95.8000, state: 'Arunachal Pradesh' },
  'Tawang': { lat: 27.5861, lon: 91.8654, state: 'Arunachal Pradesh' },
  'Kamrup Metropolitan': { lat: 26.1445, lon: 91.7362, state: 'Assam' },
  'Dima Hasao': { lat: 25.1833, lon: 93.0167, state: 'Assam' },
  'Wayanad': { lat: 11.6854, lon: 76.1320, state: 'Kerala' },
  'Kolkata': { lat: 22.5726, lon: 88.3639, state: 'West Bengal' },
};

export default function LocationModal({ isOpen, onClose, onRetry, onSelectManualLocation }) {
  const { t } = useTranslation();
  const [retrying, setRetrying] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [states, setStates] = useState(DEFAULT_STATE_LIST);
  const [selectedState, setSelectedState] = useState('Himachal Pradesh');
  const [districts, setDistricts] = useState(['Kullu', 'Mandi', 'Shimla', 'Kangra', 'Chamba']);
  const [selectedDistrict, setSelectedDistrict] = useState('Kullu');
  const [loadingDistricts, setLoadingDistricts] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    // Fetch live states
    riskApi.getStates()
      .then(res => {
        if (res.data?.states?.length > 0) {
          setStates(res.data.states);
        }
      })
      .catch(() => {});
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !selectedState) return;

    setLoadingDistricts(true);
    riskApi.getDistricts(selectedState)
      .then(res => {
        if (res.data?.districts?.length > 0) {
          setDistricts(res.data.districts);
          if (!res.data.districts.includes(selectedDistrict)) {
            setSelectedDistrict(res.data.districts[0]);
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoadingDistricts(false));
  }, [selectedState, isOpen]);

  if (!isOpen) return null;

  const handleGrantGps = async () => {
    setRetrying(true);
    try {
      if (onRetry) {
        await onRetry();
      }
    } finally {
      setRetrying(false);
    }
  };

  const handleApplyManual = () => {
    const fallback = FALLBACK_DISTRICT_COORDS[selectedDistrict] || {
      lat: 31.9579,
      lon: 77.1095,
      state: selectedState
    };

    if (onSelectManualLocation) {
      onSelectManualLocation({
        latitude: fallback.lat,
        longitude: fallback.lon,
        city: selectedDistrict,
        district: selectedDistrict,
        state: selectedState,
        country: 'India'
      });
    }
    onClose();
  };

  return (
    <div className="location-modal-overlay" onClick={onClose}>
      <div className="location-modal-card" onClick={(e) => e.stopPropagation()}>
        <button 
          type="button" 
          className="loc-modal-close-btn" 
          onClick={onClose}
          aria-label="Close"
        >
          <X size={18} />
        </button>

        <div className="loc-modal-icon-wrap">
          <div className="loc-modal-pulse" />
          <Navigation size={28} />
        </div>

        <div className="loc-modal-header">
          <h2>{t('location_modal.title') || 'Enable Location Services'}</h2>
          <p>
            {t('location_modal.subtitle') || 
             'Location access is required for real-time flood monitoring, GPS weather forecasts, and emergency evacuation corridors.'}
          </p>
        </div>

        <div className="loc-modal-actions">
          <button 
            type="button" 
            className="loc-btn-primary" 
            onClick={handleGrantGps}
            disabled={retrying}
          >
            {retrying ? (
              <>
                <RefreshCw size={17} className="loc-spinning" />
                <span>Requesting GPS Access...</span>
              </>
            ) : (
              <>
                <MapPin size={17} />
                <span>{t('location_modal.allow_btn') || 'Allow GPS Location Access'}</span>
              </>
            )}
          </button>

          <button 
            type="button" 
            className="loc-btn-secondary"
            onClick={() => setShowManual(!showManual)}
          >
            <Globe size={16} />
            <span>{t('location_modal.manual_btn') || 'Or Select Region Manually'}</span>
            <ChevronDown size={15} style={{ transform: showManual ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
          </button>

          {showManual && (
            <div className="loc-manual-picker">
              <div className="loc-manual-row">
                <select 
                  className="loc-select"
                  value={selectedState}
                  onChange={(e) => setSelectedState(e.target.value)}
                >
                  {states.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>

                <select 
                  className="loc-select"
                  value={selectedDistrict}
                  onChange={(e) => setSelectedDistrict(e.target.value)}
                  disabled={loadingDistricts}
                >
                  {districts.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <button 
                type="button" 
                className="loc-btn-apply"
                onClick={handleApplyManual}
              >
                Set {selectedDistrict} as Location
              </button>
            </div>
          )}
        </div>

        <div className="loc-tips-card">
          <strong><Settings size={14} /> {t('location_modal.how_to_enable') || 'How to Enable:'}</strong>
          <ul>
            <li><strong>Android Phone / APK:</strong> Turn ON <em>Location / GPS</em> in quick settings and tap <em>Allow</em> when prompted.</li>
            <li><strong>Chrome / Browser:</strong> Tap the lock icon in the address bar → <em>Site settings</em> → <em>Location: Allow</em>.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
