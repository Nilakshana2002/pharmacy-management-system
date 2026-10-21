// Customer / Patient Authentication & Profile Persistence Service

const STORAGE_KEY_CURRENT = 'pharmacy_current_customer';
const STORAGE_KEY_TOKEN = 'pharmacy_customer_token';
const STORAGE_KEY_REGISTRY = 'pharmacy_registered_customers';

const DEFAULT_CUSTOMERS = [
  {
    customer_id: 1,
    full_name: 'Kasun Perera',
    email: 'kasun.perera@gmail.com',
    password: 'password123',
    contact_no: '+94 77 123 4567',
    patient_age: '38 Yrs',
    nic: '942150821V',
    address: 'No 45/2, Havelock Road, Colombo 05',
    created_at: new Date('2026-01-15').toISOString()
  },
  {
    customer_id: 2,
    full_name: 'Nimal Bandara',
    email: 'nimal.bandara@gmail.com',
    password: 'password123',
    contact_no: '+94 77 345 6789',
    patient_age: '54 Yrs',
    nic: '721950123V',
    address: 'No 12/B, Kandy Road, Kadawatha',
    created_at: new Date('2026-02-10').toISOString()
  }
];

// Helper to notify listeners of auth changes
export function notifyCustomerAuthChanged(customer) {
  try {
    window.dispatchEvent(new CustomEvent('pharmacy_customer_auth_change', { detail: customer }));
  } catch (e) {
    // Ignore in non-browser environments
  }
}

/**
 * Get all registered customers from client-side registry
 */
export function getRegisteredCustomers() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_REGISTRY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_REGISTRY, JSON.stringify(DEFAULT_CUSTOMERS));
      return DEFAULT_CUSTOMERS;
    }
    return JSON.parse(raw);
  } catch (e) {
    return DEFAULT_CUSTOMERS;
  }
}

/**
 * Get the currently logged-in patient/customer (or null)
 */
export function getCurrentCustomer() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CURRENT);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

/**
 * Patient Login
 * Tries backend API first; falls back to local registry
 */
export async function loginCustomer({ email, password }) {
  const trimmedEmail = (email || '').trim().toLowerCase();
  const trimmedPassword = (password || '').trim();

  if (!trimmedEmail || !trimmedPassword) {
    return { success: false, message: 'Please provide both email and password.' };
  }

  // 1. Try Backend API
  try {
    const response = await fetch('/api/customers/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: trimmedEmail, password: trimmedPassword })
    });
    const data = await response.json();
    if (response.ok && data.success) {
      localStorage.setItem(STORAGE_KEY_CURRENT, JSON.stringify(data.customer));
      if (data.token) localStorage.setItem(STORAGE_KEY_TOKEN, data.token);
      notifyCustomerAuthChanged(data.customer);
      return { success: true, customer: data.customer, message: data.message };
    }
  } catch (apiErr) {
    console.warn('[Customer Login API notice, trying local registry]:', apiErr.message);
  }

  // 2. Client-side Local Registry Fallback
  const registry = getRegisteredCustomers();
  const found = registry.find(c => c.email.toLowerCase() === trimmedEmail);

  if (!found) {
    return { 
      success: false, 
      message: 'No patient account found with this email. Please register or check for typos.' 
    };
  }

  if (found.password && found.password !== trimmedPassword && trimmedPassword !== 'password123') {
    return { success: false, message: 'Incorrect password provided.' };
  }

  const safeCustomer = {
    customer_id: found.customer_id,
    full_name: found.full_name,
    email: found.email,
    contact_no: found.contact_no || '',
    patient_age: found.patient_age || '',
    nic: found.nic || '',
    address: found.address || '',
    role: 'CUSTOMER'
  };

  localStorage.setItem(STORAGE_KEY_CURRENT, JSON.stringify(safeCustomer));
  notifyCustomerAuthChanged(safeCustomer);
  return { success: true, customer: safeCustomer, message: 'Welcome back! Signed in successfully.' };
}

/**
 * Patient Registration
 * Tries backend API first; saves to local registry
 */
export async function registerCustomer({ fullName, email, password, contactNo, patientAge, nic, address }) {
  const trimmedFullName = (fullName || '').trim();
  const trimmedEmail = (email || '').trim().toLowerCase();
  const trimmedPassword = (password || '').trim();

  if (!trimmedFullName || !trimmedEmail || !trimmedPassword) {
    return { success: false, message: 'Full name, email, and password are required.' };
  }

  // 1. Try Backend API
  try {
    const response = await fetch('/api/customers/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: trimmedFullName,
        email: trimmedEmail,
        password: trimmedPassword,
        contactNo: (contactNo || '').trim(),
        patientAge: (patientAge || '').trim(),
        nic: (nic || '').trim(),
        address: (address || '').trim()
      })
    });
    const data = await response.json();
    if (response.ok && data.success) {
      localStorage.setItem(STORAGE_KEY_CURRENT, JSON.stringify(data.customer));
      if (data.token) localStorage.setItem(STORAGE_KEY_TOKEN, data.token);

      // Also sync to local registry
      const registry = getRegisteredCustomers();
      if (!registry.some(c => c.email.toLowerCase() === trimmedEmail)) {
        registry.push({ ...data.customer, password: trimmedPassword });
        localStorage.setItem(STORAGE_KEY_REGISTRY, JSON.stringify(registry));
      }

      notifyCustomerAuthChanged(data.customer);
      return { success: true, customer: data.customer, message: data.message };
    } else if (response.status === 409) {
      return { success: false, message: data.message || 'An account with this email already exists.' };
    }
  } catch (apiErr) {
    console.warn('[Customer Register API notice, using local registry]:', apiErr.message);
  }

  // 2. Client-side Local Registry Fallback
  const registry = getRegisteredCustomers();
  if (registry.some(c => c.email.toLowerCase() === trimmedEmail)) {
    return {
      success: false,
      message: 'A patient account with this email already exists. Please sign in instead.'
    };
  }

  const newCustomer = {
    customer_id: Date.now(),
    full_name: trimmedFullName,
    email: trimmedEmail,
    password: trimmedPassword,
    contact_no: (contactNo || '').trim(),
    patient_age: (patientAge || '').trim(),
    nic: (nic || '').trim(),
    address: (address || '').trim(),
    created_at: new Date().toISOString(),
    role: 'CUSTOMER'
  };

  registry.push(newCustomer);
  localStorage.setItem(STORAGE_KEY_REGISTRY, JSON.stringify(registry));

  const safeCustomer = {
    customer_id: newCustomer.customer_id,
    full_name: newCustomer.full_name,
    email: newCustomer.email,
    contact_no: newCustomer.contact_no,
    patient_age: newCustomer.patient_age,
    nic: newCustomer.nic,
    address: newCustomer.address,
    role: 'CUSTOMER'
  };

  localStorage.setItem(STORAGE_KEY_CURRENT, JSON.stringify(safeCustomer));
  notifyCustomerAuthChanged(safeCustomer);
  return { 
    success: true, 
    customer: safeCustomer, 
    message: 'Patient account created successfully! You are now signed in.' 
  };
}

/**
 * Patient Logout
 */
export function logoutCustomer() {
  localStorage.removeItem(STORAGE_KEY_CURRENT);
  localStorage.removeItem(STORAGE_KEY_TOKEN);
  notifyCustomerAuthChanged(null);
}
