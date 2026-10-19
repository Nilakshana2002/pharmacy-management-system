// Curated professional pharmacy & healthcare photography assets
// High quality, medical-grade images with graceful SVG fallbacks

export const PHARMACY_IMAGES = {
  // Hero section photography
  heroPharmacist: 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?auto=format&fit=crop&w=1200&q=85', // Professional pharmacist in modern pharmacy
  heroConsultation: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=1200&q=85', // Pharmacist assisting customer warmly
  heroDispensary: 'https://images.unsplash.com/photo-1576602976047-174e57a47881?auto=format&fit=crop&w=1200&q=85', // Clean modern pharmacy interior shelves

  // About and services photography
  pharmacyStorefront: 'https://images.unsplash.com/photo-1586015555751-63bb77f4322a?auto=format&fit=crop&w=1000&q=80',
  pharmacistLab: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=1000&q=80',
  coldStorage: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=800&q=80',

  // Therapeutic Categories photography
  categories: {
    1: 'https://images.unsplash.com/photo-1471864190281-a93a3070b6de?auto=format&fit=crop&w=600&q=80', // Antibiotics (capsules/blisters)
    2: 'https://images.unsplash.com/photo-1584017911766-d451b3d0e843?auto=format&fit=crop&w=600&q=80', // Pain relief / Analgesics
    3: 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?auto=format&fit=crop&w=600&q=80', // Heart / Cardiovascular
    4: 'https://images.unsplash.com/photo-1584362917165-526a968579e8?auto=format&fit=crop&w=600&q=80', // Respiratory / Inhaler
    5: 'https://images.unsplash.com/photo-1550572017-edd951aa8f72?auto=format&fit=crop&w=600&q=80', // Gastrointestinal
    6: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=600&q=80', // Endocrine / Diabetes
    7: 'https://images.unsplash.com/photo-1577401239170-897942555fb3?auto=format&fit=crop&w=600&q=80', // Vitamins & Supplements
    8: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=600&q=80', // Dermatology & Skincare
    default: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=600&q=80'
  },

  // Dosage form fallbacks for product cards
  dosageForms: {
    tablet: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=500&q=80',
    capsule: 'https://images.unsplash.com/photo-1471864190281-a93a3070b6de?auto=format&fit=crop&w=500&q=80',
    syrup: 'https://images.unsplash.com/photo-1512069772995-ec65ed45afd6?auto=format&fit=crop&w=500&q=80',
    drops: 'https://images.unsplash.com/photo-1607613009820-a29f7bb81c04?auto=format&fit=crop&w=500&q=80',
    injection: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=500&q=80',
    inhaler: 'https://images.unsplash.com/photo-1584362917165-526a968579e8?auto=format&fit=crop&w=500&q=80',
    cream: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=500&q=80',
    default: 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?auto=format&fit=crop&w=500&q=80'
  }
};

/**
 * Returns an appropriate product image based on medicine dosage form or category
 */
export function getMedicineProductImage(medicine) {
  if (medicine?.image_url) return medicine.image_url;
  
  const form = (medicine?.dosage_form || '').toLowerCase();
  if (form.includes('capsule')) return PHARMACY_IMAGES.dosageForms.capsule;
  if (form.includes('syrup') || form.includes('suspension')) return PHARMACY_IMAGES.dosageForms.syrup;
  if (form.includes('drop')) return PHARMACY_IMAGES.dosageForms.drops;
  if (form.includes('inject') || form.includes('vial')) return PHARMACY_IMAGES.dosageForms.injection;
  if (form.includes('inhal')) return PHARMACY_IMAGES.dosageForms.inhaler;
  if (form.includes('cream') || form.includes('ointment')) return PHARMACY_IMAGES.dosageForms.cream;
  if (form.includes('tablet')) return PHARMACY_IMAGES.dosageForms.tablet;

  // Category fallback
  if (medicine?.category_id && PHARMACY_IMAGES.categories[medicine.category_id]) {
    return PHARMACY_IMAGES.categories[medicine.category_id];
  }

  return PHARMACY_IMAGES.dosageForms.default;
}

/**
 * Returns a high-res category image
 */
export function getCategoryImage(categoryId) {
  return PHARMACY_IMAGES.categories[categoryId] || PHARMACY_IMAGES.categories.default;
}
