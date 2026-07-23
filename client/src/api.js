const TOKEN_KEY = 'cafepos_token';

// In local dev this is empty and Vite's dev-server proxy (vite.config.js) forwards
// /api and /uploads to localhost:4000. In production (e.g. Netlify) there is no such
// proxy, so this must be set to the deployed backend's URL at build time.
const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

let unauthorizedHandler = null;
export function setUnauthorizedHandler(fn) {
  unauthorizedHandler = fn;
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

// Prefixes an /uploads/... path (e.g. product.image_path) with the API base
// so images resolve correctly when the frontend and backend are on different origins.
export function assetUrl(path) {
  return path ? `${API_BASE}${path}` : path;
}

async function request(path, options = {}) {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (res.status === 401) {
    setToken(null);
    unauthorizedHandler?.();
    throw new Error('Session expired. Please log in again.');
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  return res.status === 204 ? null : res.json();
}

export const api = {
  login: (username, password) => request('/api/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  me: () => request('/api/auth/me'),

  getUsers: () => request('/api/users'),
  createUser: (data) => request('/api/users', { method: 'POST', body: JSON.stringify(data) }),
  updateUser: (id, data) => request(`/api/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteUser: (id) => request(`/api/users/${id}`, { method: 'DELETE' }),

  getCategories: () => request('/api/categories'),

  getProducts: (opts = {}) => {
    const params = new URLSearchParams();
    if (opts.category) params.set('category', opts.category);
    if (opts.includeInactive) params.set('includeInactive', '1');
    const qs = params.toString();
    return request(`/api/products${qs ? `?${qs}` : ''}`);
  },
  createProduct: (data) => request('/api/products', { method: 'POST', body: JSON.stringify(data) }),
  updateProduct: (id, data) => request(`/api/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteProduct: (id) => request(`/api/products/${id}`, { method: 'DELETE' }),
  restockProduct: (id, qty) => request(`/api/products/${id}/restock`, { method: 'POST', body: JSON.stringify({ qty }) }),
  uploadImage: (dataUrl) => request('/api/uploads', { method: 'POST', body: JSON.stringify({ dataUrl }) }),

  getAddons: (includeInactive) => request(`/api/addons${includeInactive ? '?includeInactive=1' : ''}`),
  createAddon: (data) => request('/api/addons', { method: 'POST', body: JSON.stringify(data) }),
  updateAddon: (id, data) => request(`/api/addons/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteAddon: (id) => request(`/api/addons/${id}`, { method: 'DELETE' }),

  createOrder: (items, payment) => request('/api/orders', { method: 'POST', body: JSON.stringify({ items, ...payment }) }),
  getOrders: (opts = {}) => {
    const params = new URLSearchParams();
    if (opts.from) params.set('from', opts.from);
    if (opts.to) params.set('to', opts.to);
    if (opts.cashier_id) params.set('cashier_id', opts.cashier_id);
    const qs = params.toString();
    return request(`/api/orders${qs ? `?${qs}` : ''}`);
  },
  getOrder: (id) => request(`/api/orders/${id}`),

  getReportSummary: (date) => request(`/api/reports/summary${date ? `?date=${date}` : ''}`),
  getReportDaily: (days) => request(`/api/reports/daily${days ? `?days=${days}` : ''}`),
};
