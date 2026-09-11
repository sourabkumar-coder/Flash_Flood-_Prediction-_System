import React, { useState, useMemo } from 'react';
import './GloFASChart.css';

/**
 * GloFAS v4 Seamless River Discharge Time-Series Chart
 * Displays: Mean, Maximum, Minimum, 25th Percentile (p25), 75th Percentile (p75)
 * Covers: Historical (past 30 days) and Forecast (next 30 days)
 */
export default function GloFASChart({ timeSeries, stationName, modelName }) {
  const [activeSeries, setActiveSeries] = useState({
    max: true,
    p75: true,
    mean: true,
    p25: true,
    min: true,
  });

  const [hoverIndex, setHoverIndex] = useState(null);
  const [rangeMode, setRangeMode] = useState('full'); // '14d', '30d', 'full'

  const seriesMeta = {
    max: { label: 'Max Discharge', color: '#c084fc', stroke: '#c084fc', fill: 'rgba(192, 132, 252, 0.15)', shape: 'circle' },
    p75: { label: '75th Percentile', color: '#f97316', stroke: '#f97316', fill: 'rgba(249, 115, 22, 0.12)', shape: 'square' },
    mean: { label: 'Ensemble Mean', color: '#38bdf8', stroke: '#38bdf8', fill: 'rgba(56, 189, 248, 0.2)', shape: 'circle', bold: true },
    p25: { label: '25th Percentile', color: '#2dd4bf', stroke: '#2dd4bf', fill: 'rgba(45, 212, 191, 0.12)', shape: 'triangle' },
    min: { label: 'Min Discharge', color: '#4ade80', stroke: '#4ade80', fill: 'rgba(74, 222, 128, 0.15)', shape: 'diamond' },
  };

  const toggleSeries = (key) => {
    setActiveSeries((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Process data window based on rangeMode
  const filteredData = useMemo(() => {
    if (!timeSeries || !timeSeries.dates || timeSeries.dates.length === 0) {
      return null;
    }

    const { dates, mean, max, min, p25, p75 } = timeSeries;
    const total = dates.length;

    // Find index of today or mid-point
    const todayStr = new Date().toISOString().slice(0, 10);
    let todayIdx = dates.findIndex((d) => d >= todayStr);
    if (todayIdx === -1) todayIdx = Math.floor(total / 2);

    let startIdx = 0;
    let endIdx = total;

    if (rangeMode === '14d') {
      startIdx = Math.max(0, todayIdx - 7);
      endIdx = Math.min(total, todayIdx + 7);
    } else if (rangeMode === '30d') {
      startIdx = Math.max(0, todayIdx - 15);
      endIdx = Math.min(total, todayIdx + 15);
    }

    const sliceDates = dates.slice(startIdx, endIdx);
    const sliceMean = (mean || []).slice(startIdx, endIdx);
    const sliceMax = (max || []).slice(startIdx, endIdx);
    const sliceMin = (min || []).slice(startIdx, endIdx);
    const sliceP25 = (p25 || []).slice(startIdx, endIdx);
    const sliceP75 = (p75 || []).slice(startIdx, endIdx);

    // Compute Y-axis bounds
    const allVals = [];
    if (activeSeries.max) allVals.push(...sliceMax);
    if (activeSeries.p75) allVals.push(...sliceP75);
    if (activeSeries.mean) allVals.push(...sliceMean);
    if (activeSeries.p25) allVals.push(...sliceP25);
    if (activeSeries.min) allVals.push(...sliceMin);

    const validVals = allVals.filter((v) => typeof v === 'number' && !isNaN(v));
    const maxVal = validVals.length > 0 ? Math.max(...validVals, 5) * 1.15 : 50;
    const minVal = 0;

    return {
      dates: sliceDates,
      mean: sliceMean,
      max: sliceMax,
      min: sliceMin,
      p25: sliceP25,
      p75: sliceP75,
      maxVal,
      minVal,
      todayStr,
      todayIdxInSlice: sliceDates.findIndex((d) => d >= todayStr),
      count: sliceDates.length,
    };
  }, [timeSeries, rangeMode, activeSeries]);

  if (!filteredData || filteredData.count === 0) {
    return (
      <div className="glofas-empty">
        <p>No GloFAS discharge time-series available for this region.</p>
      </div>
    );
  }

  // SVG dimensions
  const svgWidth = 780;
  const svgHeight = 320;
  const padding = { top: 25, right: 35, bottom: 45, left: 55 };
  const innerWidth = svgWidth - padding.left - padding.right;
  const innerHeight = svgHeight - padding.top - padding.bottom;

  const { dates, mean, max, min, p25, p75, maxVal, todayStr, todayIdxInSlice, count } = filteredData;

  const getX = (index) => padding.left + (index / Math.max(1, count - 1)) * innerWidth;
  const getY = (val) => {
    if (val === null || val === undefined || isNaN(val)) return innerHeight + padding.top;
    const norm = Math.min(1, Math.max(0, val / maxVal));
    return padding.top + innerHeight - norm * innerHeight;
  };

  // Generate SVG polyline points string
  const makePoints = (series) => {
    return series
      .map((val, idx) => {
        if (val === null || val === undefined) return null;
        return `${getX(idx).toFixed(1)},${getY(val).toFixed(1)}`;
      })
      .filter(Boolean)
      .join(' ');
  };

  // Generate shaded area path between p25 and p75
  const makeAreaPath = () => {
    if (!activeSeries.p25 || !activeSeries.p75) return '';
    const upperPoints = p75.map((val, idx) => `${getX(idx).toFixed(1)},${getY(val).toFixed(1)}`);
    const lowerPoints = p25
      .map((val, idx) => `${getX(idx).toFixed(1)},${getY(val).toFixed(1)}`)
      .reverse();
    return `M ${upperPoints.join(' L ')} L ${lowerPoints.join(' L ')} Z`;
  };

  // Gridlines for Y axis
  const yTicks = 5;
  const yTickValues = Array.from({ length: yTicks + 1 }, (_, i) => (maxVal / yTicks) * i);

  // X ticks (select 6-8 evenly spaced dates)
  const step = Math.max(1, Math.floor(count / 6));
  const xTickIndices = [];
  for (let i = 0; i < count; i += step) {
    xTickIndices.push(i);
  }
  if (xTickIndices[xTickIndices.length - 1] !== count - 1) {
    xTickIndices.push(count - 1);
  }

  const activeHover = hoverIndex !== null && hoverIndex >= 0 && hoverIndex < count ? hoverIndex : null;

  return (
    <div className="glofas-card">
      <div className="glofas-header">
        <div>
          <div className="glofas-badge-row">
            <span className="glofas-tag">{modelName || 'GloFAS v4 Seamless'}</span>
            <span className="glofas-res">5km Global Grid</span>
          </div>
          <h4>River Discharge Ensemble Forecast & History (m³/s)</h4>
          <p className="glofas-sub">{stationName || 'Multi-decadal hydrological simulation & ensemble prediction'}</p>
        </div>

        <div className="glofas-range-btns">
          <button
            className={`range-btn ${rangeMode === '14d' ? 'active' : ''}`}
            onClick={() => setRangeMode('14d')}
          >
            14 Days
          </button>
          <button
            className={`range-btn ${rangeMode === '30d' ? 'active' : ''}`}
            onClick={() => setRangeMode('30d')}
          >
            30 Days
          </button>
          <button
            className={`range-btn ${rangeMode === 'full' ? 'active' : ''}`}
            onClick={() => setRangeMode('full')}
          >
            Full 60d (Hist + Forecast)
          </button>
        </div>
      </div>

      {/* Interactive Legend / Toggle */}
      <div className="glofas-legend">
        {Object.entries(seriesMeta).map(([key, meta]) => (
          <button
            key={key}
            className={`legend-item ${activeSeries[key] ? 'active' : 'inactive'}`}
            onClick={() => toggleSeries(key)}
            style={{
              borderColor: activeSeries[key] ? meta.color : 'rgba(148, 163, 184, 0.2)',
            }}
          >
            <span className="legend-dot" style={{ backgroundColor: meta.color }} />
            <span>{meta.label}</span>
          </button>
        ))}
      </div>

      {/* SVG Chart Container */}
      <div className="glofas-svg-wrap">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="glofas-svg"
          onMouseLeave={() => setHoverIndex(null)}
        >
          <defs>
            <linearGradient id="p25p75Grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f97316" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#2dd4bf" stopOpacity="0.12" />
            </linearGradient>
          </defs>

          {/* Background Grid Lines */}
          {yTickValues.map((val, idx) => {
            const y = getY(val);
            return (
              <g key={idx} className="grid-row">
                <line
                  x1={padding.left}
                  y1={y}
                  x2={svgWidth - padding.right}
                  y2={y}
                  stroke="rgba(148, 163, 184, 0.12)"
                  strokeDasharray="3 3"
                />
                <text
                  x={padding.left - 10}
                  y={y + 4}
                  textAnchor="end"
                  fill="#94a3b8"
                  fontSize="10"
                >
                  {val.toFixed(val < 10 ? 1 : 0)}
                </text>
              </g>
            );
          })}

          {/* Today / Forecast Boundary Line */}
          {todayIdxInSlice !== -1 && (
            <g className="today-marker">
              <rect
                x={getX(todayIdxInSlice)}
                y={padding.top}
                width={svgWidth - padding.right - getX(todayIdxInSlice)}
                height={innerHeight}
                fill="rgba(56, 189, 248, 0.03)"
              />
              <line
                x1={getX(todayIdxInSlice)}
                y1={padding.top}
                x2={getX(todayIdxInSlice)}
                y2={padding.top + innerHeight}
                stroke="#38bdf8"
                strokeWidth="1.5"
                strokeDasharray="4 4"
              />
              <text
                x={getX(todayIdxInSlice) + 6}
                y={padding.top + 14}
                fill="#38bdf8"
                fontSize="10"
                fontWeight="600"
              >
                Today → Forecast
              </text>
            </g>
          )}

          {/* Shaded 25th-75th Percentile Band */}
          {makeAreaPath() && (
            <path d={makeAreaPath()} fill="url(#p25p75Grad)" />
          )}

          {/* Polylines for each active series */}
          {activeSeries.min && (
            <polyline
              fill="none"
              stroke={seriesMeta.min.stroke}
              strokeWidth="1.8"
              points={makePoints(min)}
            />
          )}

          {activeSeries.p25 && (
            <polyline
              fill="none"
              stroke={seriesMeta.p25.stroke}
              strokeWidth="1.8"
              strokeDasharray="5 3"
              points={makePoints(p25)}
            />
          )}

          {activeSeries.p75 && (
            <polyline
              fill="none"
              stroke={seriesMeta.p75.stroke}
              strokeWidth="1.8"
              strokeDasharray="5 3"
              points={makePoints(p75)}
            />
          )}

          {activeSeries.max && (
            <polyline
              fill="none"
              stroke={seriesMeta.max.stroke}
              strokeWidth="2"
              points={makePoints(max)}
            />
          )}

          {activeSeries.mean && (
            <polyline
              fill="none"
              stroke={seriesMeta.mean.stroke}
              strokeWidth="2.8"
              points={makePoints(mean)}
            />
          )}

          {/* Data Points on Curves (Sampled) */}
          {activeSeries.mean &&
            mean.map((val, idx) => {
              if (val === null || val === undefined) return null;
              if (idx % 2 !== 0 && count > 20) return null;
              return (
                <circle
                  key={`mean-${idx}`}
                  cx={getX(idx)}
                  cy={getY(val)}
                  r={activeHover === idx ? 5 : 2.5}
                  fill="#38bdf8"
                  stroke="#020817"
                  strokeWidth="1.5"
                />
              );
            })}

          {activeSeries.max &&
            max.map((val, idx) => {
              if (val === null || val === undefined) return null;
              if (idx % 3 !== 0 && count > 20) return null;
              return (
                <circle
                  key={`max-${idx}`}
                  cx={getX(idx)}
                  cy={getY(val)}
                  r={activeHover === idx ? 5 : 2.5}
                  fill="#c084fc"
                  stroke="#020817"
                  strokeWidth="1.5"
                />
              );
            })}

          {/* X Axis Dates */}
          {xTickIndices.map((idx) => {
            const x = getX(idx);
            const rawDate = dates[idx];
            let formatted = rawDate;
            try {
              const [y, m, d] = rawDate.split('-');
              const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
              formatted = `${parseInt(d, 10)} ${months[parseInt(m, 10) - 1]}`;
            } catch (e) {}

            return (
              <g key={idx} className="x-tick">
                <line
                  x1={x}
                  y1={padding.top + innerHeight}
                  x2={x}
                  y2={padding.top + innerHeight + 5}
                  stroke="rgba(148, 163, 184, 0.3)"
                />
                <text
                  x={x}
                  y={padding.top + innerHeight + 18}
                  textAnchor="middle"
                  fill="#94a3b8"
                  fontSize="10"
                >
                  {formatted}
                </text>
              </g>
            );
          })}

          {/* Interactive Hover Line and Overlay Slices */}
          {dates.map((_, idx) => {
            const x = getX(idx);
            const sliceWidth = innerWidth / Math.max(1, count);
            return (
              <rect
                key={`hover-col-${idx}`}
                x={x - sliceWidth / 2}
                y={padding.top}
                width={sliceWidth}
                height={innerHeight}
                fill="transparent"
                style={{ cursor: 'crosshair' }}
                onMouseEnter={() => setHoverIndex(idx)}
              />
            );
          })}

          {/* Hover Crosshair */}
          {activeHover !== null && (
            <g className="hover-marker">
              <line
                x1={getX(activeHover)}
                y1={padding.top}
                x2={getX(activeHover)}
                y2={padding.top + innerHeight}
                stroke="#e2e8f0"
                strokeWidth="1"
                strokeDasharray="2 2"
              />
              {/* Highlight active points on hover */}
              {activeSeries.mean && mean[activeHover] !== null && (
                <circle cx={getX(activeHover)} cy={getY(mean[activeHover])} r="5" fill="#38bdf8" />
              )}
              {activeSeries.max && max[activeHover] !== null && (
                <circle cx={getX(activeHover)} cy={getY(max[activeHover])} r="5" fill="#c084fc" />
              )}
            </g>
          )}
        </svg>

        {/* Hover Tooltip Popup */}
        {activeHover !== null && (
          <div
            className="glofas-tooltip"
            style={{
              left: `${Math.min(75, Math.max(15, (getX(activeHover) / svgWidth) * 100))}%`,
            }}
          >
            <div className="tooltip-date">
              📅 {dates[activeHover]}{' '}
              {dates[activeHover] >= todayStr ? '(Forecast)' : '(Historical)'}
            </div>
            <div className="tooltip-grid">
              {activeSeries.max && (
                <div className="tt-row" style={{ color: '#c084fc' }}>
                  <span>Max:</span>
                  <strong>{max[activeHover] ?? 'N/A'} m³/s</strong>
                </div>
              )}
              {activeSeries.p75 && (
                <div className="tt-row" style={{ color: '#f97316' }}>
                  <span>75th %ile:</span>
                  <strong>{p75[activeHover] ?? 'N/A'} m³/s</strong>
                </div>
              )}
              {activeSeries.mean && (
                <div className="tt-row" style={{ color: '#38bdf8', fontWeight: 'bold' }}>
                  <span>Mean:</span>
                  <strong>{mean[activeHover] ?? 'N/A'} m³/s</strong>
                </div>
              )}
              {activeSeries.p25 && (
                <div className="tt-row" style={{ color: '#2dd4bf' }}>
                  <span>25th %ile:</span>
                  <strong>{p25[activeHover] ?? 'N/A'} m³/s</strong>
                </div>
              )}
              {activeSeries.min && (
                <div className="tt-row" style={{ color: '#4ade80' }}>
                  <span>Min:</span>
                  <strong>{min[activeHover] ?? 'N/A'} m³/s</strong>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Quick Summary Stat Badges */}
      <div className="glofas-stat-ribbon">
        <div className="ribbon-item">
          <span className="ribbon-label">Current / Peak 7d</span>
          <strong className="ribbon-val" style={{ color: '#38bdf8' }}>
            {mean[todayIdxInSlice !== -1 ? todayIdxInSlice : 0] ?? 'N/A'} m³/s
          </strong>
        </div>
        <div className="ribbon-item">
          <span className="ribbon-label">Forecast Max (30d)</span>
          <strong className="ribbon-val" style={{ color: '#c084fc' }}>
            {maxVal ? `${maxVal.toFixed(1)} m³/s` : 'N/A'}
          </strong>
        </div>
        <div className="ribbon-item">
          <span className="ribbon-label">75th Percentile Upper</span>
          <strong className="ribbon-val" style={{ color: '#f97316' }}>
            {p75[todayIdxInSlice !== -1 ? todayIdxInSlice : 0] ?? 'N/A'} m³/s
          </strong>
        </div>
        <div className="ribbon-item">
          <span className="ribbon-label">25th Percentile Lower</span>
          <strong className="ribbon-val" style={{ color: '#2dd4bf' }}>
            {p25[todayIdxInSlice !== -1 ? todayIdxInSlice : 0] ?? 'N/A'} m³/s
          </strong>
        </div>
      </div>
    </div>
  );
}
