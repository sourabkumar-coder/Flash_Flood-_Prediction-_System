import React, { useState } from 'react';

export default function EvacuationModal({
  isOpen,
  onClose,
  evacuationData,
  loading,
  mode,
  onModeChange,
  onSelectShelter,
  originLabel
}) {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState('directions'); // 'directions' | 'shelters' | 'helplines'

  const safeRoute = evacuationData?.safe_route;
  const shelter = evacuationData?.shelter;
  const disrupted = evacuationData?.disrupted_route;
  const alternativeShelters = evacuationData?.alternative_shelters || [];
  const helpline = evacuationData?.emergency_helpline || {};

  return (
    <div className="evac-drawer-overlay">
      <div className="evac-drawer">
        {/* Drawer Header */}
        <div className="evac-header">
          <div className="evac-title-group">
            <div className="evac-badge">
              <span className="siren-dot">●</span> SAFEST EVACUATION CORRIDOR
            </div>
            <h2>Emergency Escape Route</h2>
            <p className="evac-sub">
              From <strong>{originLabel || 'Current Location'}</strong> to High-Ground Relief Shelter
            </p>
          </div>
          <button className="evac-close-btn" onClick={onClose} title="Close Evacuation Drawer">
            ✕
          </button>
        </div>

        {/* Transport Mode Switcher */}
        <div className="evac-mode-bar">
          <button
            className={`mode-btn ${mode === 'driving' ? 'active' : ''}`}
            onClick={() => onModeChange('driving')}
            disabled={loading}
          >
            🚗 Driving (Roads)
          </button>
          <button
            className={`mode-btn ${mode === 'walking' ? 'active' : ''}`}
            onClick={() => onModeChange('walking')}
            disabled={loading}
          >
            🚶 Walking / High-Ground Trek
          </button>
        </div>

        {loading ? (
          <div className="evac-loading">
            <div className="spinner mini-spinner" />
            <span>Computing safest OSRM route avoiding river inundation paths...</span>
          </div>
        ) : !evacuationData ? (
          <div className="evac-error">
            <p>Unable to generate evacuation route. Please verify GPS coordinates or backend connection.</p>
          </div>
        ) : (
          <div className="evac-content">
            {/* Primary Shelter Highlight Card */}
            <div className="shelter-hero-card">
              <div className="shelter-hero-top">
                <span className="shelter-type-pill">🛡️ {shelter?.type || 'Emergency Relief Center'}</span>
                <span className="shelter-dist-pill">📍 {safeRoute?.distance_km} km away</span>
              </div>
              <h3>{shelter?.name}</h3>

              <div className="shelter-metrics-grid">
                <div className="s-metric">
                  <span className="s-label">Est. Evac Time</span>
                  <strong className="s-val text-green">⏱ {safeRoute?.duration_min} mins</strong>
                </div>
                <div className="s-metric">
                  <span className="s-label">Elevation Gain</span>
                  <strong className="s-val text-blue">▲ +{safeRoute?.elevation_gain_m || 120} m</strong>
                </div>
                <div className="s-metric">
                  <span className="s-label">Safety Status</span>
                  <strong className="s-val text-green">✓ High Ground</strong>
                </div>
                <div className="s-metric">
                  <span className="s-label">Shelter Capacity</span>
                  <strong className="s-val text-white">{shelter?.capacity || '500+ Persons'}</strong>
                </div>
              </div>
            </div>

            {/* Flood Hazard Alert */}
            {disrupted && (
              <div className="hazard-warning-card">
                <div className="hazard-head">
                  <span className="hazard-icon">⚠️</span>
                  <strong>Riverbank Road Section Compromised</strong>
                </div>
                <p className="hazard-desc">
                  {disrupted.hazard_reason || 'The direct low-elevation valley road is prone to flash flood inundation. Follow the green high-ground corridor instead.'}
                </p>
                <div className="hazard-tag">
                  ⛔ {disrupted.block_point?.label || 'Submerged River Corridor Avoided'}
                </div>
              </div>
            )}

            {/* Sub-tabs */}
            <div className="evac-tabs">
              <button
                className={`e-tab ${activeTab === 'directions' ? 'active' : ''}`}
                onClick={() => setActiveTab('directions')}
              >
                🧭 Turn-by-Turn ({safeRoute?.steps?.length || 0})
              </button>
              <button
                className={`e-tab ${activeTab === 'shelters' ? 'active' : ''}`}
                onClick={() => setActiveTab('shelters')}
              >
                🏥 Alternate Shelters ({alternativeShelters.length})
              </button>
              <button
                className={`e-tab ${activeTab === 'helplines' ? 'active' : ''}`}
                onClick={() => setActiveTab('helplines')}
              >
                📞 Emergency SOS
              </button>
            </div>

            {/* Tab 1: Turn-by-Turn Navigation */}
            {activeTab === 'directions' && (
              <div className="steps-container">
                {safeRoute?.steps?.map((step, idx) => (
                  <div key={idx} className="step-item">
                    <div className="step-num">{idx + 1}</div>
                    <div className="step-details">
                      <p className="step-instruction">{step.instruction}</p>
                      <div className="step-meta">
                        <span>{step.distance_m} meters</span>
                        <span>·</span>
                        <span>~{Math.max(1, Math.round(step.duration_s / 60))} min</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Tab 2: Alternate Shelters */}
            {activeTab === 'shelters' && (
              <div className="alt-shelters-list">
                {alternativeShelters.length === 0 ? (
                  <p className="no-data">No other registered relief centers within 10km radius.</p>
                ) : (
                  alternativeShelters.map((alt, idx) => (
                    <div key={idx} className="alt-shelter-card">
                      <div className="alt-card-info">
                        <h4>{alt.name}</h4>
                        <p>{alt.type} · {alt.distance_km} km away · +{alt.elevation_gain_m}m elevation</p>
                      </div>
                      <button
                        className="btn-select-shelter"
                        onClick={() => onSelectShelter(idx + 1)}
                      >
                        Route Here &rarr;
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Tab 3: Emergency SOS Helplines */}
            {activeTab === 'helplines' && (
              <div className="helpline-grid">
                <div className="helpline-card">
                  <span className="hl-label">National Disaster Emergency (NDMA)</span>
                  <a href="tel:1078" className="hl-number">📞 1078</a>
                </div>
                <div className="helpline-card">
                  <span className="hl-label">State Disaster Response Force (SDRF)</span>
                  <a href="tel:1070" className="hl-number">📞 1070</a>
                </div>
                <div className="helpline-card">
                  <span className="hl-label">Ambulance / Medical Emergency</span>
                  <a href="tel:108" className="hl-number">🚑 108</a>
                </div>
                <div className="helpline-card">
                  <span className="hl-label">Police Emergency Response</span>
                  <a href="tel:112" className="hl-number">👮 112</a>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
