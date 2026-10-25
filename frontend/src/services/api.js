import axios from 'axios';
import { PHARMACY_INFO } from '../config/pharmacyInfo';

// Base API client
const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor to attach JWT token to staff/admin or customer requests
api.interceptors.request.use(
  (config) => {
    const staffToken = localStorage.getItem('vdc_staff_token');
    const customerToken = localStorage.getItem('pharmacy_customer_token');
    // If request targets customer profile endpoints, use customerToken; otherwise staffToken
    const token = config.url?.startsWith('/customers') ? (customerToken || staffToken) : (staffToken || customerToken);
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
  return {
    success: true,
    data: {
      store_name: PHARMACY_INFO.name,
      tagline: PHARMACY_INFO.tagline,
      phone_primary: PHARMACY_INFO.phones.primary,
      phone_hotline: PHARMACY_INFO.phones.hotline,
      email: PHARMACY_INFO.email.general,
      address_street: PHARMACY_INFO.address.street,
      address_city: PHARMACY_INFO.address.city,
      hours_weekday: PHARMACY_INFO.hours.weekdays,
      hours_saturday: PHARMACY_INFO.hours.saturday,
      hours_sunday: PHARMACY_INFO.hours.sundayHolidays,
      announcement: PHARMACY_INFO.announcements.banner
    }
  };
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

export const uploadMedicineImage = async (data) => {
  const response = await api.post('/admin/medicines/upload-image', data);
  return response.data;
};

export const getMedicineLibraryImages = async () => {
  const response = await api.get('/admin/medicines/library-images');
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

export const getSupplierPerformance = async () => {
  const response = await api.get('/admin/supplier-performance');
  return response.data;
};

export const getPurchases = async () => {
  const response = await api.get('/admin/purchases');
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

// Promotions & Voucher Codes (Disabled)
export const getPromotions = async () => ({ success: true, count: 0, data: [] });
export const validatePromotion = async () => ({ success: false, message: 'Promotions feature disabled.' });

// Customer Reviews & Feedback (MySQL-backed)
export const getReviews = async () => {
  const response = await api.get('/reviews');
  return response.data;
};

export const submitReview = async (reviewData) => {
  const response = await api.post('/reviews', reviewData);
  return response.data;
};

export const voteReviewHelpful = async (reviewId) => {
  const response = await api.patch(`/reviews/${reviewId}/helpful`);
  return response.data;
};

// Customer Contact Inquiries (MySQL-backed)
export const submitInquiry = async (inquiryData) => {
  const response = await api.post('/inquiries', inquiryData);
  return response.data;
};

export const getInquiryStatus = async (refCode) => {
  const response = await api.get(`/inquiries/${refCode}`);
  return response.data;
};

// Admin Inquiries Management
export const getAdminInquiries = async (status) => {
  const response = await api.get('/admin/inquiries', { params: { status } });
  return response.data;
};

export const updateAdminInquiryStatus = async (id, data) => {
  const response = await api.patch(`/admin/inquiries/${id}/status`, data);
  return response.data;
};

export const respondToAdminInquiry = async (id, data) => {
  const response = await api.post(`/admin/inquiries/${id}/respond`, data);
  return response.data;
};

export const deleteAdminInquiry = async (id) => {
  const response = await api.delete(`/admin/inquiries/${id}`);
  return response.data;
};

// ============================================================
// Customer / Patient Portal API Methods (MySQL & JWT-backed)
// ============================================================
export const getCustomerProfile = async () => {
  const response = await api.get('/customers/profile');
  return response.data;
};

export const updateCustomerProfile = async (profileData) => {
  const response = await api.put('/customers/profile', profileData);
  return response.data;
};

export const getCustomerPrescriptions = async () => {
  const response = await api.get('/customers/prescriptions');
  return response.data;
};

export const getCustomerInquiries = async () => {
  const response = await api.get('/customers/inquiries');
  return response.data;
};

export const getCustomerOrders = async () => {
  const response = await api.get('/customers/orders');
  return response.data;
};

export default api;

