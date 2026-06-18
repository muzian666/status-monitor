import axios from 'axios';
import { clearApiKey, getApiKey } from '../auth';

const api = axios.create({
  baseURL: '/api/v1',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach the API key to every request when one is stored.
api.interceptors.request.use((config) => {
  const key = getApiKey();
  if (key) {
    config.headers = config.headers ?? {};
    config.headers['X-API-Key'] = key;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    // 401 => key is missing/wrong/expired; drop it so the app re-prompts.
    if (err.response?.status === 401) {
      clearApiKey();
      if (!window.location.pathname.endsWith('/')) {
        window.location.reload();
      }
    }
    console.error('API Error:', err.response?.data || err.message);
    return Promise.reject(err);
  }
);

export default api;
