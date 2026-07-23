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

const CONNECTIVITY_ERROR = 'Cannot connect to server. Please check your connection and try again.';

async function request(path, options = {}) {
  const token = getToken();
  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
  } catch {
    // fetch() itself rejected: offline, DNS failure, blocked by CORS, etc. —
    // never even reached a server, so this is never a session problem.
    throw new Error(CONNECTIVITY_ERROR);
  }

  if (res.status === 401) {
    const body = await res.json().catch(() => null);
    // Our own auth middleware always replies 401 with { error: '...' } JSON,
    // and only ever for requests that actually carried a token. A 401 that
    // doesn't match that shape (e.g. an HTML page) — or one that arrived
    // despite no token being sent — didn't come from our backend at all.
    // That's a misrouted/misconfigured API call, not an expired session.
    if (!token || !body || typeof body.error !== 'string') {
      throw new Error(CONNECTIVITY_ERROR);
    }
    setToken(null);
    unauthorizedHandler?.();
    throw new Error('Session expired. Please log in again.');
  }

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    if (!body) throw new Error(CONNECTIVITY_ERROR);
    throw new Error(body.error || `Request failed: ${res.status}`);
  }

  if (res.status === 204) return null;
  try {
    return await res.json();
  } catch {
    throw new Error(CONNECTIVITY_ERROR);
  }
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

  updateOrderStatus: (id, status) => request(`/api/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),

  // ---------- Public guest ordering (no auth) ----------
  createStripeIntent: (items) => request('/api/public/payments/stripe/intent', { method: 'POST', body: JSON.stringify({ items }) }),
  createPaypalOrder: (items) => request('/api/public/payments/paypal/order', { method: 'POST', body: JSON.stringify({ items }) }),
  createGuestOrder: (data) => request('/api/orders/guest', { method: 'POST', body: JSON.stringify(data) }),
  getGuestOrderStatus: (id, token) => request(`/api/public/orders/${id}/status?token=${encodeURIComponent(token)}`),
};
