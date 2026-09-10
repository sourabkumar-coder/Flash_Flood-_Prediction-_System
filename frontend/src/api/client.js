import axios from 'axios';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
});

export const riskApi = {
  getThreats: () => client.get('/api/overview/threats'),
  getRivers: () => client.get('/api/overview/rivers'),
  simulate: (scenario) => client.post('/api/overview/simulate', { scenario }),
  sync: () => client.post('/api/overview/sync'),
  predict: (payload) => client.post('/api/predict', payload),
  getStates: () => client.get('/api/states'),
  getDistricts: (state) => client.get(`/api/districts/${encodeURIComponent(state)}`),
};

export const alertApi = {
  getAlerts: () => client.get('/api/alerts'),
  acknowledge: (id) => client.post(`/api/alerts/${id}/acknowledge`),
};

export const villageApi = {
  getVillages: () => client.get('/api/villages'),
};

export const evacuationApi = {
  getShelters: () => client.get('/api/shelters'),
  getEvacuationStatus: (villageId) => client.get(`/api/evacuation/${villageId}`),
};

export default client;
