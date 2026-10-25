/**
 * Central Pharmacy Store Configuration & Business Profile
 * Single source of truth for physical location, dispensary hours, hotlines, and certifications.
 * Replaces the obsolete static pharmacy_settings database table with zero-latency frontend state.
 */

export const PHARMACY_INFO = {
  // Store Branding & Identity
  name: 'My Pharmacist',
  legalName: 'My Pharmacist / VDC Store Community Dispensary',
  tagline: 'Modern Dispensary & Healthcare System',
  description: 'Your verified healthcare and medicine availability partner. Check real-time stock levels of genuine prescription and OTC medications before visiting our dispensary.',
  
  // Clinical Licensure & Regulatory Accreditations
  registrationNumber: 'Reg #PH-LK/2026/04',
  regulatoryBadge: 'Licensed Healthcare Dispensary',
  certifications: [
    'Reg #PH-LK/2026/04',
    'SLMC Certified Community Dispensary',
    'NMRA Regulated',
    'Cold-Chain Verified'
  ],

  // Physical Store Location
  address: {
    street: '124 Galle Road, Bambalapitiya',
    city: 'Colombo 04',
    country: 'Sri Lanka',
    full: '124 Galle Road, Bambalapitiya, Colombo 04, Sri Lanka',
    googleMapsUrl: 'https://maps.google.com/?q=124+Galle+Road+Bambalapitiya+Colombo+04'
  },

  // Telecommunications & Hotlines
  phones: {
    primary: '+94 11 234 5678',
    primaryRaw: '+94112345678',
    hotline: '+94 77 123 4567',
    hotlineRaw: '+94771234567',
    hotlineLabel: '24/7 Prescription Hotline'
  },

  // Official Email Contacts
  email: {
    general: 'info@vdcstore.lk',
    dispensary: 'pharmacist@vdcstore.lk',
    support: 'support@vdcstore.lk'
  },

  // Operating Dispensary Hours
  hours: {
    weekdays: '8:00 AM – 10:00 PM',
    weekdaysLabel: 'Mon – Fri',
    saturday: '8:30 AM – 9:00 PM',
    saturdayLabel: 'Saturday',
    sundayHolidays: '9:00 AM – 6:00 PM',
    sundayHolidaysLabel: 'Sunday & Holidays',
    emergencyService: '24/7 Emergency Online Prescription Reception'
  },

  // Storefront Announcements
  announcements: {
    active: true,
    banner: 'Welcome to My Pharmacist. Licensed dispensary with cold-chain verified pharmaceutical stock.'
  }
};

export default PHARMACY_INFO;
