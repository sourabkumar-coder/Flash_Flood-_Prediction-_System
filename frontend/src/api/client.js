import axios from 'axios';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://flash-flood-gateway.onrender.com';

const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000,
});

export const riskApi = {
  getThreats: () => client.get('/api/overview/threats'),
  getRivers: () => client.get('/api/overview/rivers'),
  simulate: (scenario, payload = {}) => client.post('/api/overview/simulate', { scenario, ...payload }),
  sync: () => client.post('/api/overview/sync'),
  predict: (payload) => client.post('/api/predict', payload),
  getStates: () => client.get('/api/states'),
  getDistricts: (state) => (state ? client.get(`/api/districts/${encodeURIComponent(state)}`) : client.get('/api/districts')),
  getVillages: (district, state) => client.get(`/api/villages/${encodeURIComponent(district)}`, { params: { state } }),
  getFeatures: (state, district) => client.get(`/api/features/${encodeURIComponent(state)}/${encodeURIComponent(district)}`),
  reverseGeocode: (lat, lon) => client.get('/api/location/reverse', { params: { lat, lon } }),
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
  getRoute: (payload) => client.post('/api/evacuation/route', payload),
  getEvacuationStatus: (villageId) => client.get(`/api/evacuation/${villageId}`),
};

export const weatherApi = {
  getCurrentWeather: (lat, lon) => client.get('/api/weather', { params: { lat, lon } }),
};

export const sensorApi = {
  getLatest: () => client.get('/api/sensors/latest'),
  getHistory: (hours = 24) => client.get('/api/sensors/history', { params: { hours } }),
  getStatus: () => client.get('/api/sensors/status'),
};

export const newsApi = {
  getNews: (params) => client.get('/api/news', { params }),
};

export const chatApi = {
  sendMessage: (payload) => client.post('/api/chat', payload),
};

export const authApi = {
  login: (email, password) => client.post('/api/auth/login', { email, password }),
  register: (formData) => client.post('/api/auth/register', formData),
  getUsers: () => client.get('/api/auth/users'),
};

export default client;

