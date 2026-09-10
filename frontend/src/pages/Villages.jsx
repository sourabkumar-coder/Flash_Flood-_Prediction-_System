import React, { useEffect, useState } from 'react';
import { villageApi } from '../api/client';
import { Search, Filter, Home, ArrowUpDown } from 'lucide-react';
import './Villages.css';

export default function Villages() {
  const [villages, setVillages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState('risk_score');
  const [sortOrder, setSortOrder] = useState('desc');

  useEffect(() => {
    fetchVillages();
  }, []);

  const fetchVillages = async () => {
    try {
      const response = await villageApi.getVillages();
      setVillages(response.data.villages || []);
    } catch (err) {
      console.error('Failed to fetch villages:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc'); // Default new sort to desc (useful for risk score)
    }
  };

  const filteredAndSortedVillages = villages
    .filter(v => v.name.toLowerCase().includes(search.toLowerCase()) || v.district.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];
      
      // Handle missing values
      if (valA === undefined) valA = 0;
      if (valB === undefined) valB = 0;

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

  if (loading) return <div className="loading-state">Loading villages data...</div>;

  return (
    <div className="villages-container">
      <div className="page-header">
        <h1>Village Risk Profiles</h1>
        <p>Detailed analysis of localized threats, hydrology, and IoT telemetry.</p>
      </div>

      <div className="toolbar panel">
        <div className="search-box">
          <Search size={18} color="var(--text-muted)" />
          <input 
            type="text" 
            placeholder="Search by village or district name..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button className="btn-outline"><Filter size={16} /> Filter by Risk</button>
      </div>

      <div className="table-container panel">
        <table className="data-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('name')}>Village / Ward <ArrowUpDown size={14} /></th>
              <th onClick={() => handleSort('district')}>District <ArrowUpDown size={14} /></th>
              <th onClick={() => handleSort('risk_level')}>Status <ArrowUpDown size={14} /></th>
              <th onClick={() => handleSort('risk_score')}>Risk Score <ArrowUpDown size={14} /></th>
              <th onClick={() => handleSort('rainfall_24h_mm')}>24h Rain <ArrowUpDown size={14} /></th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedVillages.length === 0 ? (
              <tr>
                <td colSpan="6" className="text-center">No villages match the criteria.</td>
              </tr>
            ) : (
              filteredAndSortedVillages.map((v, i) => (
                <tr key={v.id || i}>
                  <td>
                    <div className="flex-align-center">
                      <Home size={16} className="text-muted mr-2" />
                      {v.name}
                    </div>
                  </td>
                  <td>{v.district}</td>
                  <td>
                    <span className={`badge ${v.risk_level?.toLowerCase() || 'low'}`}>
                      {v.risk_level || 'LOW'}
                    </span>
                  </td>
                  <td><strong>{v.risk_score || '0.0'}</strong></td>
                  <td>{v.rainfall_24h_mm || '0.0'} mm</td>
                  <td>
                    <button className="btn-link">View Profile</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
