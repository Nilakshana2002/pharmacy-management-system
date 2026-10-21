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

export const updateMedicineOffer = async (id, data) => {
  const response = await api.patch(`/admin/medicines/${id}/offer`, data);
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

export const executeBatchAction = async (id, data) => {
  const response = await api.post(`/admin/batches/${id}/action`, data);
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

export const getAuditLogs = async (params) => {
  const response = await api.get('/admin/audit-logs', { params });
  return response.data;
};

// POS Sales & Transaction History
export const createSale = async (data) => {
  const response = await api.post('/admin/sales', data);
  return response.data;
};

export const getSalesHistory = async (params) => {
  const response = await api.get('/admin/sales', { params });
  return response.data;
};

export const getSaleById = async (saleId) => {
  const response = await api.get(`/admin/sales/${saleId}`);
  return response.data;
};

// Advanced DBMS Reports
export const getDailySalesReport = async (params) => {
  const response = await api.get('/admin/reports/daily-sales', { params });
  return response.data;
};

export const getMonthlySalesReport = async () => {
  const response = await api.get('/admin/reports/monthly-sales');
  return response.data;
};

export const getBestSellingReport = async (params) => {
  const response = await api.get('/admin/reports/best-sellers', { params });
  return response.data;
};

export const getInventoryValuationReport = async () => {
  const response = await api.get('/admin/reports/inventory-valuation');
  return response.data;
};

// Staff Account Management (ADMIN)
export const getUsers = async () => {
  const response = await api.get('/admin/users');
  return response.data;
};

export const createUser = async (data) => {
  const response = await api.post('/admin/users', data);
  return response.data;
};

export const updateUser = async (id, data) => {
  const response = await api.put(`/admin/users/${id}`, data);
  return response.data;
};

export const toggleUserStatus = async (id, is_active) => {
  const response = await api.patch(`/admin/users/${id}/status`, { is_active });
  return response.data;
};

// Registered Website Customer / Patient Management (ADMIN & PHARMACIST)
export const getAdminCustomers = async () => {
  const response = await api.get('/admin/customers');
  return response.data;
};

export const createAdminCustomer = async (data) => {
  const response = await api.post('/admin/customers', data);
  return response.data;
};

export const updateAdminCustomer = async (id, data) => {
  const response = await api.put(`/admin/customers/${id}`, data);
  return response.data;
};

export const toggleAdminCustomerStatus = async (id, is_active) => {
  const response = await api.patch(`/admin/customers/${id}/status`, { is_active });
  return response.data;
};

export const deleteAdminCustomer = async (id) => {
  const response = await api.delete(`/admin/customers/${id}`);
  return response.data;
};

// Admin Catalog Management
export const createCategory = async (data) => {
  const response = await api.post('/admin/categories', data);
  return response.data;
};

export const createBrand = async (data) => {
  const response = await api.post('/admin/brands', data);
  return response.data;
};

export const createSupplier = async (data) => {
  const response = await api.post('/admin/suppliers', data);
  return response.data;
};

export const updatePharmacySettings = async (data) => {
  const response = await api.put('/admin/settings', data);
  return response.data;
};

export default api;

