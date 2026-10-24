// Service for patient prescription orders, backend persistence, and email notifications
import axios from 'axios';

const API_BASE = '/api/prescription-orders';
const STORAGE_KEY = 'pharmacy_prescription_orders';
const PATIENT_PROFILE_KEY = 'pharmacy_registered_patient_profile';

// Mock IDs to purge from previous test versions
const PURGE_MOCK_IDS = ['RX-2026-8910', 'RX-2026-8908', 'RX-2026-8905'];

/**
 * Clean legacy hardcoded mock orders from localStorage
 */
const getCleanedLocalOrders = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    if (!Array.isArray(list)) return [];
    
    // Filter out hardcoded test orders and sanitize invalid out-of-range customer_id
    let hasChanges = false;
    const cleaned = list
      .filter(o => !PURGE_MOCK_IDS.includes(o.order_id))
      .map(o => {
        if (o.customer_id && Number(o.customer_id) > 2147483647) {
          hasChanges = true;
          return { ...o, customer_id: null };
        }
        return o;
      });

    if (hasChanges || cleaned.length !== list.length) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
    }
    return cleaned;
  } catch (e) {
    return [];
  }
};

/**
 * Fetch all prescription orders (Backend first with resilient smart merge)
 * Local orders are NEVER wiped out by an empty backend response.
 */
export async function fetchPrescriptionOrdersFromApi() {
  const localOrders = getCleanedLocalOrders();

  try {
    const res = await axios.get(API_BASE, { timeout: 6000 });
    if (res.data && res.data.success && Array.isArray(res.data.orders)) {
      const backendOrders = res.data.orders;
      const backendMap = new Map();
      backendOrders.forEach(o => backendMap.set(o.order_id, o));

      // Check if there are local orders pending synchronization
      const unsyncedLocals = localOrders.filter(o => !backendMap.has(o.order_id));
      if (unsyncedLocals.length > 0) {
        // Sync unsynced local orders to backend
        unsyncedLocals.forEach(async (unsynced) => {
          try {
            await axios.post(API_BASE, unsynced, { timeout: 5000 });
          } catch (e) {
            // ignore background sync error
          }
        });
      }

      // Merge backend orders with unsynced local orders
      const merged = [...backendOrders, ...unsyncedLocals];
      merged.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      return merged;
    }
  } catch (err) {
    console.warn('[Prescription Orders Service] Backend fetch fallback to local:', err.message);
  }

  return localOrders;
}

/**
 * Synchronous getter for instant renders (reads from localStorage, clean of mock orders)
 */
export function getPrescriptionOrders() {
  return getCleanedLocalOrders();
}

/**
 * Submit a new prescription order (Instantly persists locally & synchronizes with backend)
 */
export async function savePrescriptionOrder(orderData) {
  const orderId = orderData.order_id || `RX-2026-${Math.floor(1000 + Math.random() * 9000)}`;

  const orderPayload = {
    order_id: orderId,
    created_at: new Date().toISOString(),
    status: 'pending',
    pharmacist_review: null,
    ...orderData
  };

  // 1. Instantly save in local storage so the UI updates immediately with zero latency
  const existing = getCleanedLocalOrders();
  const updated = [orderPayload, ...existing.filter(o => o.order_id !== orderId)];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

  // Dispatch global event for instant reactivity across all dashboard tabs
  window.dispatchEvent(new CustomEvent('pharmacy_prescription_orders_change', { detail: orderPayload }));

  // 2. Synchronize with backend MySQL database
  try {
    const res = await axios.post(API_BASE, orderPayload, { timeout: 10000 });
    if (res.data && res.data.success && res.data.order) {
      const backendOrder = res.data.order;
      const freshExisting = getCleanedLocalOrders();
      const freshUpdated = [backendOrder, ...freshExisting.filter(o => o.order_id !== orderId)];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(freshUpdated));
      window.dispatchEvent(new CustomEvent('pharmacy_prescription_orders_change', { detail: backendOrder }));
      return backendOrder;
    }
  } catch (err) {
    console.warn('[Prescription Orders Service] Backend save queued locally:', err.message);
  }

  return orderPayload;
}

/**
 * Pharmacist updates order status (Accepts, Rejects, or Dispenses)
 * Also triggers confirmation email dispatch
 */
export async function updatePrescriptionOrderStatus(orderId, { status, pharmacistName, confirmationMessage, rejectionReason, readyTime }) {
  let emailResult = null;
  let updatedOrder = null;

  try {
    let endpoint = `${API_BASE}/${orderId}/accept`;
    let payload = { pharmacistName, confirmationMessage, readyTime };

    if (status === 'rejected') {
      endpoint = `${API_BASE}/${orderId}/reject`;
      payload = { pharmacistName, rejectionReason };
    } else if (status === 'dispensed') {
      endpoint = `${API_BASE}/${orderId}/dispense`;
      payload = { pharmacistName };
    }

    const res = await axios.put(endpoint, payload, { timeout: 20000 });
    if (res.data && res.data.success) {
      updatedOrder = res.data.order;
      emailResult = res.data.emailResult;
    }
  } catch (err) {
    console.warn('[Prescription Orders Service] Backend update status fallback:', err.message);
  }

  // Update local storage
  const existing = getCleanedLocalOrders();
  const updated = existing.map(order => {
    if (order.order_id === orderId) {
      return updatedOrder || {
        ...order,
        status,
        pharmacist_review: {
          pharmacist_name: pharmacistName || 'Supervising Pharmacist',
          reviewed_at: new Date().toISOString(),
          confirmation_message: confirmationMessage || null,
          rejection_reason: rejectionReason || null,
          ready_time: readyTime || null,
          email_sent: status === 'accepted' || status === 'rejected',
          email_sent_at: new Date().toISOString()
        }
      };
    }
    return order;
  });

  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  window.dispatchEvent(new CustomEvent('pharmacy_prescription_orders_change', { detail: { orderId, status } }));

  return {
    order: updated.find(o => o.order_id === orderId),
    emailResult
  };
}

export function getSavedPatientProfile() {
  try {
    const data = localStorage.getItem(PATIENT_PROFILE_KEY);
    if (data) return JSON.parse(data);
    return null;
  } catch (e) {
    return null;
  }
}

export function savePatientProfile(profile) {
  try {
    localStorage.setItem(PATIENT_PROFILE_KEY, JSON.stringify(profile));
  } catch (e) {
    console.warn('Could not save patient profile', e);
  }
}

/**
 * Checks live backend SMTP server connection status
 */
export async function checkSmtpStatus() {
  try {
    const res = await axios.get(`${API_BASE}/test-smtp`, { timeout: 15000 });
    return res.data;
  } catch (err) {
    return {
      ok: false,
      error: err.response?.data?.error || err.message || 'SMTP connection failed'
    };
  }
}

/**
 * Dispatches a test email through backend SMTP
 */
export async function dispatchTestEmail(toEmail) {
  const res = await axios.post(`${API_BASE}/test-email`, { toEmail }, { timeout: 25000 });
  return res.data;
}

/**
 * Fetches the backend mail outbox logs
 */
export async function fetchMailOutbox() {
  try {
    const res = await axios.get(`${API_BASE}/outbox`, { timeout: 6000 });
    return res.data?.emails || [];
  } catch (err) {
    return [];
  }
}


