import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

api.interceptors.response.use(
  r => r,
  err => Promise.reject(err)
);

export default api;

// Auth
export const authApi = {
  register: d => api.post('/auth/register', d),
  verifyEmail: token => api.get(`/auth/verify-email?token=${token}`),
  login: d => api.post('/auth/login', d),
  logout: () => api.post('/auth/logout'),
  forgotPassword: email => api.post('/auth/forgot-password', { email }),
  resetPassword: d => api.post('/auth/reset-password', d),
  me: () => api.get('/auth/me'),
  resendVerification: () => api.post('/auth/resend-verification'),
  oauthGoogle: access_token => api.post('/auth/oauth/google', { access_token }),
};

// Me / config
export const meApi = {
  getConfigEmail: () => api.get('/me/config-email'),
  saveConfigEmail: d => api.put('/me/config-email', d),
  testConfigEmail: (data) => api.post('/me/config-email/test', data || {}),
  testBrevo: () => api.post('/me/test-brevo'),
};

// Emails
export const emailsApi = {
  list: params => api.get('/emails', { params }),
  get: id => api.get(`/emails/${id}`),
  badges: () => api.get('/emails/badges'),
  setStato: (id, stato_id) => api.patch(`/emails/${id}/stato`, { stato_id }),
  setProgetto: (id, progetto_id) => api.patch(`/emails/${id}/progetto`, { progetto_id }),
  archivia: (id, archiviata) => api.patch(`/emails/${id}/archivia`, { archiviata }),
  setNota: (id, nota) => api.patch(`/emails/${id}/nota`, { nota }),
  send: d => api.post('/emails/send', d),
  sync: () => api.post('/emails/sync'),
};

// Clienti
export const clientiApi = {
  list: params => api.get('/clienti', { params }),
  get: id => api.get(`/clienti/${id}`),
  create: d => api.post('/clienti', d),
  update: (id, d) => api.put(`/clienti/${id}`, d),
  delete: id => api.delete(`/clienti/${id}`),
};

// Progetti
export const progettiApi = {
  list: params => api.get('/progetti', { params }),
  get: id => api.get(`/progetti/${id}`),
  create: d => api.post('/progetti', d),
  update: (id, d) => api.put(`/progetti/${id}`, d),
  delete: id => api.delete(`/progetti/${id}`),
};

// Stati
export const statiApi = {
  list: () => api.get('/stati'),
  create: d => api.post('/stati', d),
  update: (id, d) => api.put(`/stati/${id}`, d),
  delete: id => api.delete(`/stati/${id}`),
};
