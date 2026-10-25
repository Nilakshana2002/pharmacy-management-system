/**
 * Static Store Configurations Controller
 * Directly serves static pharmacy contact and operating hours without requiring a database query.
 */

const STATIC_STORE_CONFIG = {
  store_name: 'My Pharmacist / VDC Store Pharmacy',
  tagline: 'Your Trusted Community Healthcare & Medicine Information Partner',
  phone_primary: '+94 11 234 5678',
  phone_hotline: '+94 77 123 4567',
  email: 'info@vdcstore.lk',
  address_street: '124 Galle Road, Bambalapitiya',
  address_city: 'Colombo 04, Sri Lanka',
  hours_weekday: '8:00 AM – 10:00 PM',
  hours_saturday: '8:30 AM – 9:00 PM',
  hours_sunday: '9:00 AM – 6:00 PM',
  announcement: 'Welcome to My Pharmacist. Licensed dispensary with cold-chain verified pharmaceutical stock.',
  system_version: '2.0.0-ADBMS'
};

/**
 * GET /api/settings/public
 * Returns public store configurations (phone, hours, address, name)
 */
export const getPublicSettings = async (req, res) => {
  res.status(200).json({
    success: true,
    data: STATIC_STORE_CONFIG
  });
};
