import axios from 'axios';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
});

export const riskApi = {
  getThreats: () => client.get('/api/overview/threats').catch(() => axios.get('http://localhost:8000/api/overview/threats')),
  getRivers: () => client.get('/api/overview/rivers').catch(() => axios.get('http://localhost:8000/api/overview/rivers')),
  simulate: (scenario, payload = {}) => client.post('/api/overview/simulate', { scenario, ...payload }).catch(() => axios.post('http://localhost:8000/api/overview/simulate', { scenario, ...payload })),

  sync: () => client.post('/api/overview/sync').catch(() => axios.post('http://localhost:8000/api/overview/sync')),
  predict: (payload) => client.post('/api/predict', payload).catch(() => axios.post('http://localhost:8000/api/predict', payload)),
  getStates: () => client.get('/api/states').catch(() => axios.get('http://localhost:8000/api/states')),
  getDistricts: (state) => client.get(`/api/districts/${encodeURIComponent(state)}`).catch(() => axios.get(`http://localhost:8000/api/districts/${encodeURIComponent(state)}`)),
  getVillages: (district) => client.get(`/api/villages/${encodeURIComponent(district)}`).catch(() => axios.get(`http://localhost:8000/api/villages/${encodeURIComponent(district)}`)),
  getFeatures: (state, district) => client.get(`/api/features/${encodeURIComponent(state)}/${encodeURIComponent(district)}`).catch(() => axios.get(`http://localhost:8000/api/features/${encodeURIComponent(state)}/${encodeURIComponent(district)}`)),
  reverseGeocode: (lat, lon) => client.get('/api/location/reverse', { params: { lat, lon } }).catch(() => axios.get('http://localhost:8000/api/location/reverse', { params: { lat, lon } })),
};

export const alertApi = {
  getAlerts: () => client.get('/api/alerts').catch(() => axios.get('http://localhost:8000/api/alerts')),
  acknowledge: (id) => client.post(`/api/alerts/${id}/acknowledge`).catch(() => axios.post(`http://localhost:8000/api/alerts/${id}/acknowledge`)),
};

export const villageApi = {
  getVillages: () => client.get('/api/villages').catch(() => axios.get('http://localhost:8000/api/villages')),
};

export const evacuationApi = {
  getShelters: () => client.get('/api/shelters').catch(() => axios.get('http://localhost:8000/api/shelters')),
  getRoute: (payload) => client.post('/api/evacuation/route', payload).catch(() => axios.post('http://localhost:8000/api/evacuation/route', payload)),
  getEvacuationStatus: (villageId) => client.get(`/api/evacuation/${villageId}`).catch(() => axios.get(`http://localhost:8000/api/evacuation/${villageId}`)),
};

export const weatherApi = {
  getCurrentWeather: (lat, lon) => client.get('/api/weather', { params: { lat, lon } }).catch(() => axios.get('http://localhost:8000/api/weather', { params: { lat, lon } })),
};

export const newsApi = {
  getNews: (params) => client.get('/api/news', { params }).catch(() => axios.get('http://localhost:8000/api/news', { params })),
};

export const chatApi = {
  sendMessage: (payload) => client.post('/api/chat', payload).catch(() => axios.post('http://localhost:8000/api/chat', payload)),
};

export default client;

