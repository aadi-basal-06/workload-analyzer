// =====================================================================
// client.js: Centralized Fetch API Client with JWT Bearer Interceptor
// =====================================================================

const BASE_URL = '/api';

/**
 * Universal request wrapper
 */
async function request(endpoint, options = {}) {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers
  };

  const config = {
    ...options,
    headers
  };

  if (config.body && typeof config.body === 'object' && !(config.body instanceof FormData)) {
    config.body = JSON.stringify(config.body);
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, config);

  let data;
  try {
    data = await response.json();
  } catch (err) {
    data = { success: false, error: 'JSON Parse Error', message: response.statusText };
  }

  if (!response.ok || data.success === false) {
    const error = new Error(data.message || data.error || 'API Request Failed');
    error.status = response.status;
    error.details = data.details || null;
    throw error;
  }

  return data.data !== undefined ? data.data : data;
}

export const api = {
  get: (endpoint, options) => request(endpoint, { ...options, method: 'GET' }),
  post: (endpoint, body, options) => request(endpoint, { ...options, method: 'POST', body }),
  put: (endpoint, body, options) => request(endpoint, { ...options, method: 'PUT', body }),
  patch: (endpoint, body, options) => request(endpoint, { ...options, method: 'PATCH', body }),
  delete: (endpoint, options) => request(endpoint, { ...options, method: 'DELETE' })
};

