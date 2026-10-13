import axios from 'axios';

// Base API client
const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor to attach JWT token to staff/admin requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('vdc_staff_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Customer-Facing API Methods
export const getMedicines = async (params = {}) => {
  const response = await api.get('/medicines', { params });
  return response.data;
};

export const getMedicineById = async (id) => {
  const response = await api.get(`/medicines/${id}`);
  return response.data;
};

export const getMedicineAvailability = async (id) => {
  const response = await api.get(`/medicines/${id}/availability`);
  return response.data;
};

export const getCategories = async () => {
  const response = await api.get('/categories');
  return response.data;
};

export const getBrands = async () => {
  const response = await api.get('/brands');
  return response.data;
};

export const getPublicSettings = async () => {
  const response = await api.get('/settings/public');
  return response.data;
};

// Staff & Admin Authentication API Methods
export const loginStaff = async (credentials) => {
  const response = await api.post('/auth/login', credentials);
  return response.data;
};

export const getStaffProfile = async () => {
  const response = await api.get('/auth/profile');
  return response.data;
};

// Protected Staff/Admin Management API Methods
export const getAdminDashboard = async () => {
  const response = await api.get('/admin/dashboard');
  return response.data;
};

export const getAdminMedicines = async () => {
  const response = await api.get('/admin/medicines');
  return response.data;
};

export const createMedicine = async (data) => {
  const response = await api.post('/admin/medicines', data);
  return response.data;
};

export const updateMedicine = async (id, data) => {
  const response = await api.put(`/admin/medicines/${id}`, data);
  return response.data;
};

export const getAdminBatches = async () => {
  const response = await api.get('/admin/batches');
  return response.data;
};

export const createBatch = async (data) => {
  const response = await api.post('/admin/batches', data);
  return response.data;
};

export const adjustBatchStock = async (id, data) => {
  const response = await api.patch(`/admin/batches/${id}/stock`, data);
  return response.data;
};

export const getSuppliers = async () => {
  const response = await api.get('/admin/suppliers');
  return response.data;
};

export const getLowStockReport = async () => {
  const response = await api.get('/admin/reports/low-stock');
  return response.data;
};

export const getExpiringBatchesReport = async () => {
  const response = await api.get('/admin/reports/expiring');
  return response.data;
};

export const getStockMovements = async () => {
  const response = await api.get('/admin/stock-movements');
  return response.data;
};

export const getAuditLogs = async () => {
  const response = await api.get('/admin/audit-logs');
  return response.data;
};

export default api;
