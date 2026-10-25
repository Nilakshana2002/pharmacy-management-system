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
    1: 'https://images.unsplash.com/photo-1471864190281-a93a3070b6de?auto=format&fit=crop&w=600&q=80', // Antibiotics & Antimicrobials (capsules/blisters)
    2: 'https://images.unsplash.com/photo-1584017911766-d451b3d0e843?auto=format&fit=crop&w=600&q=80', // Analgesics & Pain Relief (pain relief tablets)
    3: 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?auto=format&fit=crop&w=600&q=80', // Cardiovascular & Blood Pressure (stethoscope & heart)
    4: 'https://images.unsplash.com/photo-1584362917165-526a968579e8?auto=format&fit=crop&w=600&q=80', // Respiratory & Allergy (inhaler & pulmonary)
    5: 'https://images.unsplash.com/photo-1550572017-edd951aa8f72?auto=format&fit=crop&w=600&q=80', // Gastrointestinal & Antacids (digestive soothing tablets)
    6: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=600&q=80', // Endocrine & Antidiabetic (glucometer & insulin therapy)
    7: 'https://images.unsplash.com/photo-1577401239170-897942555fb3?auto=format&fit=crop&w=600&q=80', // Vitamins & Dietary Supplements (vitamin C & multivitamin capsules)
    8: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=600&q=80', // Dermatology & Skin Care (medical skin creams & tubes)
    // Non-medicine Wellness & Diagnostics Categories (Numeric IDs in Database)
    9: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=600&q=80', // Diet & Nutrition (protein powders & fitness nutrition)
    10: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=600&q=80', // Beauty Care & Cosmetics (skincare serums & cosmetics)
    11: 'https://images.unsplash.com/photo-1583947215259-38e31be8751f?auto=format&fit=crop&w=600&q=80', // Personal Care & Hygiene (hygiene wash, sanitizer & antiseptic)
    12: 'https://images.unsplash.com/photo-1519689680058-324335c77eba?auto=format&fit=crop&w=600&q=80', // Baby & Mother Care (pediatric gentle care & baby lotion)
    13: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=600&q=80', // Medical Devices & Equipment (digital diagnostic tools & stethoscopes)
    14: 'https://images.unsplash.com/photo-1617791160505-6f00504e3519?auto=format&fit=crop&w=600&q=80', // Ayurvedic & Herbal Care (authentic herbal leaves, pestle & mortar)
    // Named String Aliases
    'nutrition': 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=600&q=80',
    'beauty': 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=600&q=80',
    'personal': 'https://images.unsplash.com/photo-1583947215259-38e31be8751f?auto=format&fit=crop&w=600&q=80',
    'baby': 'https://images.unsplash.com/photo-1519689680058-324335c77eba?auto=format&fit=crop&w=600&q=80',
    'devices': 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=600&q=80',
    'ayurveda': 'https://images.unsplash.com/photo-1617791160505-6f00504e3519?auto=format&fit=crop&w=600&q=80',
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
    device: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=500&q=80',
    supplement: 'https://images.unsplash.com/photo-1577401239170-897942555fb3?auto=format&fit=crop&w=500&q=80',
    default: 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?auto=format&fit=crop&w=500&q=80'
  }
};

/**
 * 100% Reliable Offline-Ready Specific Medicine Product Photography
 * Direct local asset mapping for all 27 dispensary formulations in /public/medicines/
 */
export const SPECIFIC_MEDICINE_PHOTOS = {
  // Matched by Database Primary Key (medicine_id)
  1: encodeURI('/medicines/Augmentin 625mg.webp'),
  2: encodeURI('/medicines/Amoxil 500mg.jpg'),
  3: encodeURI('/medicines/Ciprobay 500mg.webp'),
  4: encodeURI('/medicines/Zithromax 250mg.webp'),
  5: encodeURI('/medicines/Panadol Extra.jpg'),
  6: encodeURI('/medicines/Panadol Children Drops.jpg'),
  7: encodeURI('/medicines/Brufen 400mg.jpg'),
  8: encodeURI('/medicines/Celebrex 200mg.jpg'),
  9: encodeURI('/medicines/Lipitor 20mg.jpg'),
  10: encodeURI('/medicines/Norvasc 5mg.jpg'),
  11: encodeURI('/medicines/Cozaar 50mg.jpg'),
  12: encodeURI('/medicines/Betaloc 25mg.jpg'),
  13: encodeURI('/medicines/Ventolin Evohaler.jpg'),
  14: encodeURI('/medicines/Singulair 10mg.jpg'),
  15: encodeURI('/medicines/Zyrtec 10mg.jpg'),
  16: encodeURI('/medicines/Flixonase Aqueous Spray.jpg'),
  17: encodeURI('/medicines/Nexium 40mg.jpg'),
  18: encodeURI('/medicines/Controloc 40mg.jpg'),
  19: encodeURI('/medicines/Motilium 10mg.jpg'),
  20: encodeURI('/medicines/Gaviscon Double Action.jpg'),
  21: encodeURI('/medicines/Glucophage 500mg.jpg'),
  22: encodeURI('/medicines/Amaryl 2mg.jpg'),
  23: encodeURI('/medicines/Lantus SoloStar.jpg'),
  24: encodeURI('/medicines/Cevit 500mg Chewable.jpg'),
  25: encodeURI('/medicines/Ostocalcium D3.jpg'),
  26: encodeURI('/medicines/Neurobion Forte.jpg'),
  27: '/medicines/Fucidin Cream 2.jpg',
  28: '/medicines/3M Littmann Classic III Stethoscope Smoke_Black Tube.jpg',
  29: '/medicines/Omron 2-in-1 Max Blood Glucose & BP Monitor.jpg',
  30: '/medicines/Certified 3-Ply Protective Face Masks (Box of 50).jpg',
  31: '/medicines/Accu-Chek Active Blood Glucose Test Strips (50 Strips).jpg',
  32: '/medicines/Optimum Nutrition Gold Standard 100 Whey (2 lbs).jpg',
  33: '/medicines/CeraVe Hydrating Facial Cleanser for Normal to Dry Skin.jpg',
  34: '/medicines/La Roche-Posay Anthelios UVMune 400 Invisible Fluid SPF 50.jpg',
  35: '/medicines/Sebamed Baby Wash Extra Soft 200ml.jpg',
  36: '/medicines/Dettol Antiseptic Disinfectant Liquid 750ml.jpg',
  37: '/medicines/Wellman 50+ Comprehensive Multivitamin & Minerals (30 Tablets).jpg',
  38: '/medicines/Siddhalepa Herbal Balm 50g Original Ayur Formula.jpg',
  39: '/medicines/Omron Ultrasonic Mesh Nebulizer MicroAir NE-U100.jpg',
  40: '/medicines/Omron Ultrasonic Mesh Nebulizer MicroAir NE-U100.jpg',

  // Matched by Normalized Trade Name (Lowercased)
  'augmentin 625mg': encodeURI('/medicines/Augmentin 625mg.webp'),
  'augmentin': encodeURI('/medicines/Augmentin 625mg.webp'),
  'amoxil 500mg': encodeURI('/medicines/Amoxil 500mg.jpg'),
  'amoxil': encodeURI('/medicines/Amoxil 500mg.jpg'),
  'ciprobay 500mg': encodeURI('/medicines/Ciprobay 500mg.webp'),
  'ciprobay': encodeURI('/medicines/Ciprobay 500mg.webp'),
  'zithromax 250mg': encodeURI('/medicines/Zithromax 250mg.webp'),
  'zithromax': encodeURI('/medicines/Zithromax 250mg.webp'),
  'panadol extra': encodeURI('/medicines/Panadol Extra.jpg'),
  'panadol children drops': encodeURI('/medicines/Panadol Children Drops.jpg'),
  'panadol': encodeURI('/medicines/Panadol Extra.jpg'),
  'brufen 400mg': encodeURI('/medicines/Brufen 400mg.jpg'),
  'brufen': encodeURI('/medicines/Brufen 400mg.jpg'),
  'celebrex 200mg': encodeURI('/medicines/Celebrex 200mg.jpg'),
  'celebrex': encodeURI('/medicines/Celebrex 200mg.jpg'),
  'lipitor 20mg': encodeURI('/medicines/Lipitor 20mg.jpg'),
  'lipitor': encodeURI('/medicines/Lipitor 20mg.jpg'),
  'norvasc 5mg': encodeURI('/medicines/Norvasc 5mg.jpg'),
  'norvasc': encodeURI('/medicines/Norvasc 5mg.jpg'),
  'cozaar 50mg': encodeURI('/medicines/Cozaar 50mg.jpg'),
  'cozaar': encodeURI('/medicines/Cozaar 50mg.jpg'),
  'betaloc 25mg': encodeURI('/medicines/Betaloc 25mg.jpg'),
  'betaloc': encodeURI('/medicines/Betaloc 25mg.jpg'),
  'ventolin evohaler': encodeURI('/medicines/Ventolin Evohaler.jpg'),
  'ventolin': encodeURI('/medicines/Ventolin Evohaler.jpg'),
  'singulair 10mg': encodeURI('/medicines/Singulair 10mg.jpg'),
  'singulair': encodeURI('/medicines/Singulair 10mg.jpg'),
  'zyrtec 10mg': encodeURI('/medicines/Zyrtec 10mg.jpg'),
  'zyrtec': encodeURI('/medicines/Zyrtec 10mg.jpg'),
  'flixonase aqueous spray': encodeURI('/medicines/Flixonase Aqueous Spray.jpg'),
  'flixonase': encodeURI('/medicines/Flixonase Aqueous Spray.jpg'),
  'nexium 40mg': encodeURI('/medicines/Nexium 40mg.jpg'),
  'nexium': encodeURI('/medicines/Nexium 40mg.jpg'),
  'controloc 40mg': encodeURI('/medicines/Controloc 40mg.jpg'),
  'controloc': encodeURI('/medicines/Controloc 40mg.jpg'),
  'motilium 10mg': encodeURI('/medicines/Motilium 10mg.jpg'),
  'motilium': encodeURI('/medicines/Motilium 10mg.jpg'),
  'gaviscon double action': encodeURI('/medicines/Gaviscon Double Action.jpg'),
  'gaviscon': encodeURI('/medicines/Gaviscon Double Action.jpg'),
  'glucophage 500mg': encodeURI('/medicines/Glucophage 500mg.jpg'),
  'glucophage': encodeURI('/medicines/Glucophage 500mg.jpg'),
  'amaryl 2mg': encodeURI('/medicines/Amaryl 2mg.jpg'),
  'amaryl': encodeURI('/medicines/Amaryl 2mg.jpg'),
  'lantus solostar': encodeURI('/medicines/Lantus SoloStar.jpg'),
  'lantus': encodeURI('/medicines/Lantus SoloStar.jpg'),
  'cevit 500mg chewable': encodeURI('/medicines/Cevit 500mg Chewable.jpg'),
  'cevit 500mg': encodeURI('/medicines/Cevit 500mg Chewable.jpg'),
  'cevit': encodeURI('/medicines/Cevit 500mg Chewable.jpg'),
  'ostocalcium d3': encodeURI('/medicines/Ostocalcium D3.jpg'),
  'ostocalcium': encodeURI('/medicines/Ostocalcium D3.jpg'),
  'neurobion forte': encodeURI('/medicines/Neurobion Forte.jpg'),
  'neurobion': encodeURI('/medicines/Neurobion Forte.jpg'),
  'fucidin cream 2%': '/medicines/Fucidin Cream 2.jpg',
  'fucidin cream': '/medicines/Fucidin Cream 2.jpg',
  'fucidin': '/medicines/Fucidin Cream 2.jpg',

  // Wellness, Diagnostic Devices, Nutrition & Personal Care (Exact Safe Filenames)
  'optimum nutrition gold standard 100% whey (2 lbs)': '/medicines/Optimum Nutrition Gold Standard 100 Whey (2 lbs).jpg',
  'optimum nutrition gold standard 100% whey': '/medicines/Optimum Nutrition Gold Standard 100 Whey (2 lbs).jpg',
  'optimum nutrition gold': '/medicines/Optimum Nutrition Gold Standard 100 Whey (2 lbs).jpg',
  'optimum nutrition': '/medicines/Optimum Nutrition Gold Standard 100 Whey (2 lbs).jpg',
  'whey protein': '/medicines/Optimum Nutrition Gold Standard 100 Whey (2 lbs).jpg',

  'wellman 50+ comprehensive multivitamin & minerals (30 tablets)': encodeURI('/medicines/Wellman 50+ Comprehensive Multivitamin & Minerals (30 Tablets).jpg'),
  'wellman 50+ comprehensive multivitamin & minerals': encodeURI('/medicines/Wellman 50+ Comprehensive Multivitamin & Minerals (30 Tablets).jpg'),
  'wellman 50+': encodeURI('/medicines/Wellman 50+ Comprehensive Multivitamin & Minerals (30 Tablets).jpg'),
  'wellman': encodeURI('/medicines/Wellman 50+ Comprehensive Multivitamin & Minerals (30 Tablets).jpg'),

  '3m littmann classic iii stethoscope (smoke / black tube)': encodeURI('/medicines/3M Littmann Classic III Stethoscope Smoke_Black Tube.jpg'),
  '3m littmann classic iii stethoscope': encodeURI('/medicines/3M Littmann Classic III Stethoscope Smoke_Black Tube.jpg'),
  '3m littmann': encodeURI('/medicines/3M Littmann Classic III Stethoscope Smoke_Black Tube.jpg'),
  'littmann': encodeURI('/medicines/3M Littmann Classic III Stethoscope Smoke_Black Tube.jpg'),
  'stethoscope': encodeURI('/medicines/3M Littmann Classic III Stethoscope Smoke_Black Tube.jpg'),

  'omron 2-in-1 max blood glucose & bp monitor': encodeURI('/medicines/Omron 2-in-1 Max Blood Glucose & BP Monitor.jpg'),
  'omron blood glucose': encodeURI('/medicines/Omron 2-in-1 Max Blood Glucose & BP Monitor.jpg'),

  'certified 3-ply protective face masks (box of 50)': encodeURI('/medicines/Certified 3-Ply Protective Face Masks (Box of 50).jpg'),
  'certified 3-ply protective face masks': encodeURI('/medicines/Certified 3-Ply Protective Face Masks (Box of 50).jpg'),
  'face masks': encodeURI('/medicines/Certified 3-Ply Protective Face Masks (Box of 50).jpg'),

  'accu-chek active blood glucose test strips (50 strips)': encodeURI('/medicines/Accu-Chek Active Blood Glucose Test Strips (50 Strips).jpg'),
  'accu-chek active blood glucose test strips': encodeURI('/medicines/Accu-Chek Active Blood Glucose Test Strips (50 Strips).jpg'),
  'accu-chek': encodeURI('/medicines/Accu-Chek Active Blood Glucose Test Strips (50 Strips).jpg'),

  'cerave hydrating facial cleanser for normal to dry skin': encodeURI('/medicines/CeraVe Hydrating Facial Cleanser for Normal to Dry Skin.jpg'),
  'cerave hydrating facial cleanser': encodeURI('/medicines/CeraVe Hydrating Facial Cleanser for Normal to Dry Skin.jpg'),
  'cerave': encodeURI('/medicines/CeraVe Hydrating Facial Cleanser for Normal to Dry Skin.jpg'),

  'la roche-posay anthelios uvmune 400 invisible fluid spf 50+': encodeURI('/medicines/La Roche-Posay Anthelios UVMune 400 Invisible Fluid SPF 50.jpg'),
  'la roche-posay anthelios uvmune 400 invisible fluid spf 50': encodeURI('/medicines/La Roche-Posay Anthelios UVMune 400 Invisible Fluid SPF 50.jpg'),
  'la roche-posay anthelios': encodeURI('/medicines/La Roche-Posay Anthelios UVMune 400 Invisible Fluid SPF 50.jpg'),
  'la roche-posay': encodeURI('/medicines/La Roche-Posay Anthelios UVMune 400 Invisible Fluid SPF 50.jpg'),
  'anthelios': encodeURI('/medicines/La Roche-Posay Anthelios UVMune 400 Invisible Fluid SPF 50.jpg'),
  'uvmune 400': encodeURI('/medicines/La Roche-Posay Anthelios UVMune 400 Invisible Fluid SPF 50.jpg'),
  'anthelios uvmune': encodeURI('/medicines/La Roche-Posay Anthelios UVMune 400 Invisible Fluid SPF 50.jpg'),

  'sebamed baby wash extra soft 200ml': encodeURI('/medicines/Sebamed Baby Wash Extra Soft 200ml.jpg'),
  'sebamed baby wash': encodeURI('/medicines/Sebamed Baby Wash Extra Soft 200ml.jpg'),
  'sebamed': encodeURI('/medicines/Sebamed Baby Wash Extra Soft 200ml.jpg'),

  'dettol antiseptic disinfectant liquid 750ml': encodeURI('/medicines/Dettol Antiseptic Disinfectant Liquid 750ml.jpg'),
  'dettol antiseptic': encodeURI('/medicines/Dettol Antiseptic Disinfectant Liquid 750ml.jpg'),
  'dettol': encodeURI('/medicines/Dettol Antiseptic Disinfectant Liquid 750ml.jpg'),

  'omron ultrasonic mesh nebulizer microair ne-u100': encodeURI('/medicines/Omron Ultrasonic Mesh Nebulizer MicroAir NE-U100.jpg'),
  'omron ultrasonic mesh nebulizer': encodeURI('/medicines/Omron Ultrasonic Mesh Nebulizer MicroAir NE-U100.jpg'),
  'omron nebulizer': encodeURI('/medicines/Omron Ultrasonic Mesh Nebulizer MicroAir NE-U100.jpg'),
  'nebulizer': encodeURI('/medicines/Omron Ultrasonic Mesh Nebulizer MicroAir NE-U100.jpg'),

  'siddhalepa herbal balm 50g original ayur formula': encodeURI('/medicines/Siddhalepa Herbal Balm 50g Original Ayur Formula.jpg'),
  'siddhalepa herbal balm': encodeURI('/medicines/Siddhalepa Herbal Balm 50g Original Ayur Formula.jpg'),
  'siddhalepa': encodeURI('/medicines/Siddhalepa Herbal Balm 50g Original Ayur Formula.jpg')
};

/**
 * Sanitizes image URLs to prevent Vite URI malformed errors caused by unescaped '%' or '+' in filenames
 */
export function sanitizeMedicineImageUrl(url) {
  if (!url || typeof url !== 'string') return '';
  const clean = url.trim();

  if (clean.includes('Fucidin') && (clean.includes('2%') || clean.includes('25') || clean.includes('Cream'))) {
    return '/medicines/Fucidin Cream 2.jpg';
  }
  if (clean.includes('Optimum') || clean.includes('Whey') || clean.includes('100%')) {
    return '/medicines/Optimum Nutrition Gold Standard 100 Whey (2 lbs).jpg';
  }
  if (clean.includes('Anthelios') || clean.includes('Roche')) {
    return '/medicines/La Roche-Posay Anthelios UVMune 400 Invisible Fluid SPF 50.jpg';
  }
  if (clean.includes('Face Masks') || clean.includes('3-Ply')) {
    return '/medicines/Certified 3-Ply Protective Face Masks (Box of 50).jpg';
  }
  if (clean.includes('Accu-Chek') || clean.includes('Active Blood Glucose')) {
    return '/medicines/Accu-Chek Active Blood Glucose Test Strips (50 Strips).jpg';
  }
  if (clean.includes('Wellman')) {
    return '/medicines/Wellman 50+ Comprehensive Multivitamin & Minerals (30 Tablets).jpg';
  }
  if (clean.includes('Nebulizer') || clean.includes('NE-U100') || clean.includes('MicroAir')) {
    return '/medicines/Omron Ultrasonic Mesh Nebulizer MicroAir NE-U100.jpg';
  }
  if (clean.includes('Siddhalepa')) {
    return '/medicines/Siddhalepa Herbal Balm 50g Original Ayur Formula.jpg';
  }

  // Remove any stray unescaped % or + that might break Vite's decodeURI
  if (clean.startsWith('/medicines/') && clean.includes('%')) {
    return clean.replace(/%/g, '');
  }

  return clean;
}

/**
 * Returns an appropriate product image based on real photos, dosage form, or category
 */
export function getMedicineProductImage(medicine) {
  if (!medicine) return PHARMACY_IMAGES.dosageForms.default;

  // 1. PRIMARY SOURCE OF TRUTH: MySQL Database Attribute (medicines.image_url)
  // Ensures relational data independence: Admins adding/editing medicine images via Dashboard take immediate effect
  if (medicine.image_url && typeof medicine.image_url === 'string' && medicine.image_url.trim().length > 0) {
    const sanitized = sanitizeMedicineImageUrl(medicine.image_url);
    if (sanitized) return sanitized;
  }

  // 2. Direct photo lookup by Database Primary Key (number or string)
  const medId = Number(medicine.medicine_id);
  if (medId && SPECIFIC_MEDICINE_PHOTOS[medId]) {
    return SPECIFIC_MEDICINE_PHOTOS[medId];
  }

  // 2. Direct photo lookup by normalized Medicine Name
  const cleanName = (medicine.name || '').trim().toLowerCase();
  if (SPECIFIC_MEDICINE_PHOTOS[cleanName]) {
    return SPECIFIC_MEDICINE_PHOTOS[cleanName];
  }

  // 3. Partial keyword matching against known medicines
  for (const [key, photoPath] of Object.entries(SPECIFIC_MEDICINE_PHOTOS)) {
    if (typeof key === 'string' && isNaN(Number(key)) && key.length > 3 && cleanName.includes(key)) {
      return photoPath;
    }
  }

  // 4. Match against generic formula keywords
  const genericClean = (medicine.generic_name || '').trim().toLowerCase();
  if (genericClean) {
    if (genericClean.includes('clavulanate') || (genericClean.includes('amoxicillin') && genericClean.includes('potassium'))) {
      return SPECIFIC_MEDICINE_PHOTOS[1]; // Augmentin
    }
    if (genericClean.includes('amoxicillin')) return SPECIFIC_MEDICINE_PHOTOS[2]; // Amoxil
    if (genericClean.includes('ciprofloxacin')) return SPECIFIC_MEDICINE_PHOTOS[3]; // Ciprobay
    if (genericClean.includes('azithromycin')) return SPECIFIC_MEDICINE_PHOTOS[4]; // Zithromax
    if (genericClean.includes('caffeine')) return SPECIFIC_MEDICINE_PHOTOS[5]; // Panadol Extra
    if (genericClean.includes('paracetamol')) return SPECIFIC_MEDICINE_PHOTOS[5]; // Panadol
    if (genericClean.includes('ibuprofen')) return SPECIFIC_MEDICINE_PHOTOS[7]; // Brufen
    if (genericClean.includes('celecoxib')) return SPECIFIC_MEDICINE_PHOTOS[8]; // Celebrex
    if (genericClean.includes('atorvastatin')) return SPECIFIC_MEDICINE_PHOTOS[9]; // Lipitor
    if (genericClean.includes('amlodipine')) return SPECIFIC_MEDICINE_PHOTOS[10]; // Norvasc
    if (genericClean.includes('losartan')) return SPECIFIC_MEDICINE_PHOTOS[11]; // Cozaar
    if (genericClean.includes('metoprolol')) return SPECIFIC_MEDICINE_PHOTOS[12]; // Betaloc
    if (genericClean.includes('salbutamol')) return SPECIFIC_MEDICINE_PHOTOS[13]; // Ventolin
    if (genericClean.includes('montelukast')) return SPECIFIC_MEDICINE_PHOTOS[14]; // Singulair
    if (genericClean.includes('cetirizine')) return SPECIFIC_MEDICINE_PHOTOS[15]; // Zyrtec
    if (genericClean.includes('fluticasone')) return SPECIFIC_MEDICINE_PHOTOS[16]; // Flixonase
    if (genericClean.includes('esomeprazole')) return SPECIFIC_MEDICINE_PHOTOS[17]; // Nexium
    if (genericClean.includes('pantoprazole')) return SPECIFIC_MEDICINE_PHOTOS[18]; // Controloc
    if (genericClean.includes('domperidone')) return SPECIFIC_MEDICINE_PHOTOS[19]; // Motilium
    if (genericClean.includes('alginate')) return SPECIFIC_MEDICINE_PHOTOS[20]; // Gaviscon
    if (genericClean.includes('metformin')) return SPECIFIC_MEDICINE_PHOTOS[21]; // Glucophage
    if (genericClean.includes('glimepiride')) return SPECIFIC_MEDICINE_PHOTOS[22]; // Amaryl
    if (genericClean.includes('insulin')) return SPECIFIC_MEDICINE_PHOTOS[23]; // Lantus
    if (genericClean.includes('ascorbic') || genericClean.includes('vitamin c')) return SPECIFIC_MEDICINE_PHOTOS[24]; // Cevit
    if (genericClean.includes('calcium') || genericClean.includes('cholecalciferol')) return SPECIFIC_MEDICINE_PHOTOS[25]; // Ostocalcium
    if (genericClean.includes('neurotropic') || genericClean.includes('b12') || genericClean.includes('b-vitamin')) return SPECIFIC_MEDICINE_PHOTOS[26]; // Neurobion
    if (genericClean.includes('fusidate') || genericClean.includes('fusidic')) return SPECIFIC_MEDICINE_PHOTOS[27]; // Fucidin

    // Wellness & Diagnostic Formulas
    if (genericClean.includes('whey') || genericClean.includes('protein')) return SPECIFIC_MEDICINE_PHOTOS['optimum nutrition'];
    if (genericClean.includes('siberian ginseng') || genericClean.includes('co-q10') || genericClean.includes('bio-active nutrients')) return SPECIFIC_MEDICINE_PHOTOS['wellman 50+'];
    if (genericClean.includes('acoustic stethoscope') || genericClean.includes('stethoscope')) return SPECIFIC_MEDICINE_PHOTOS['stethoscope'];
    if (genericClean.includes('digital diagnostic') || (genericClean.includes('blood glucose') && genericClean.includes('bp'))) return SPECIFIC_MEDICINE_PHOTOS['omron blood glucose'];
    if (genericClean.includes('filtration masks') || genericClean.includes('face masks')) return SPECIFIC_MEDICINE_PHOTOS['face masks'];
    if (genericClean.includes('biosensor glucose') || genericClean.includes('test strips')) return SPECIFIC_MEDICINE_PHOTOS['accu-chek'];
    if (genericClean.includes('ceramides') || (genericClean.includes('hyaluronic') && genericClean.includes('cleanser'))) return SPECIFIC_MEDICINE_PHOTOS['cerave'];
    if (genericClean.includes('mexoryl') || genericClean.includes('uvmune')) return SPECIFIC_MEDICINE_PHOTOS['la roche-posay'];
    if (genericClean.includes('pediatric bath') || genericClean.includes('baby wash')) return SPECIFIC_MEDICINE_PHOTOS['sebamed'];
    if (genericClean.includes('chloroxylenol') || genericClean.includes('antiseptic solution')) return SPECIFIC_MEDICINE_PHOTOS['dettol'];
    if (genericClean.includes('mesh inhalation') || genericClean.includes('mesh nebulizer')) return SPECIFIC_MEDICINE_PHOTOS['nebulizer'];
    if (genericClean.includes('ayurvedic extract') || (genericClean.includes('eucalyptus') && genericClean.includes('cinnamon'))) return SPECIFIC_MEDICINE_PHOTOS['siddhalepa'];
  }

  // 5. Custom database URL if explicitly saved on the record
  if (medicine.image_url) {
    const sanitized = sanitizeMedicineImageUrl(medicine.image_url);
    if (sanitized) return sanitized;
  }
  
  // 5. Automatic fallbacks based on dosage form
  const form = (medicine?.dosage_form || '').toLowerCase();
  if (form.includes('capsule')) return PHARMACY_IMAGES.dosageForms.capsule;
  if (form.includes('syrup') || form.includes('suspension') || form.includes('liquid') || form.includes('liter') || form.includes('bottle') || form.includes('solution')) return PHARMACY_IMAGES.dosageForms.syrup;
  if (form.includes('drop')) return PHARMACY_IMAGES.dosageForms.drops;
  if (form.includes('inject') || form.includes('vial') || form.includes('pen') || form.includes('ampoule') || form.includes('infusion')) return PHARMACY_IMAGES.dosageForms.injection;
  if (form.includes('inhal') || form.includes('spray') || form.includes('respule')) return PHARMACY_IMAGES.dosageForms.inhaler;
  if (form.includes('cream') || form.includes('ointment') || form.includes('lotion') || form.includes('gel') || form.includes('balm') || form.includes('tube')) return PHARMACY_IMAGES.dosageForms.cream;
  if (form.includes('tablet') || form.includes('caplet') || form.includes('lozenge') || form.includes('troche') || form.includes('box') || form.includes('pack') || form.includes('strip') || form.includes('card')) return PHARMACY_IMAGES.dosageForms.tablet;
  if (form.includes('device') || form.includes('equipment') || form.includes('monitor') || form.includes('strips') || form.includes('mask')) return PHARMACY_IMAGES.dosageForms.device;
  if (form.includes('powder') || form.includes('supplement') || form.includes('granule') || form.includes('sachet')) return PHARMACY_IMAGES.dosageForms.supplement;

  // 6. Category fallback
  if (medicine?.category_id && PHARMACY_IMAGES.categories[medicine.category_id]) {
    return PHARMACY_IMAGES.categories[medicine.category_id];
  }

  return PHARMACY_IMAGES.dosageForms.default;
}

/**
 * Returns a high-res specific category image matching by ID, object, or category name
 */
export function getCategoryImage(categoryInput, categoryName = '') {
  if (!categoryInput && !categoryName) return PHARMACY_IMAGES.categories.default;

  // 1. Direct object passed: { category_id, category_name, image_url }
  if (typeof categoryInput === 'object' && categoryInput !== null) {
    if (categoryInput.image_url) return categoryInput.image_url;
    categoryName = categoryName || categoryInput.category_name || '';
    categoryInput = categoryInput.category_id || categoryInput.id;
  }

  // 2. Direct ID lookup in dictionary (numbers 1-14 or string keys)
  if (categoryInput && PHARMACY_IMAGES.categories[categoryInput]) {
    return PHARMACY_IMAGES.categories[categoryInput];
  }

  // 3. Fallback name-based semantic matching
  const name = String(categoryName || categoryInput || '').toLowerCase().trim();

  if (name.includes('ayurv') || name.includes('herbal')) {
    return PHARMACY_IMAGES.categories[14] || PHARMACY_IMAGES.categories.ayurveda;
  }
  if (name.includes('baby') || name.includes('mother') || name.includes('pediatric')) {
    return PHARMACY_IMAGES.categories[12] || PHARMACY_IMAGES.categories.baby;
  }
  if (name.includes('device') || name.includes('equipment') || name.includes('diagnost') || name.includes('doctor')) {
    return PHARMACY_IMAGES.categories[13] || PHARMACY_IMAGES.categories.devices;
  }
  if (name.includes('personal') || name.includes('hygiene') || name.includes('antiseptic')) {
    return PHARMACY_IMAGES.categories[11] || PHARMACY_IMAGES.categories.personal;
  }
  if (name.includes('beauty') || name.includes('cosmetic') || name.includes('face') || name.includes('skincare')) {
    return PHARMACY_IMAGES.categories[10] || PHARMACY_IMAGES.categories.beauty;
  }
  if (name.includes('diet') || name.includes('nutrition') || name.includes('protein') || name.includes('fitness')) {
    return PHARMACY_IMAGES.categories[9] || PHARMACY_IMAGES.categories.nutrition;
  }
  if (name.includes('derma') || name.includes('skin')) {
    return PHARMACY_IMAGES.categories[8];
  }
  if (name.includes('vitamin') || name.includes('supplement') || name.includes('mineral')) {
    return PHARMACY_IMAGES.categories[7];
  }
  if (name.includes('endocrine') || name.includes('diabet') || name.includes('insulin')) {
    return PHARMACY_IMAGES.categories[6];
  }
  if (name.includes('gastro') || name.includes('antacid') || name.includes('stomach') || name.includes('digest')) {
    return PHARMACY_IMAGES.categories[5];
  }
  if (name.includes('respir') || name.includes('asthma') || name.includes('allergy') || name.includes('inhal')) {
    return PHARMACY_IMAGES.categories[4];
  }
  if (name.includes('cardio') || name.includes('heart') || name.includes('blood pressure') || name.includes('hypertens')) {
    return PHARMACY_IMAGES.categories[3];
  }
  if (name.includes('analgesic') || name.includes('pain') || name.includes('fever')) {
    return PHARMACY_IMAGES.categories[2];
  }
  if (name.includes('antibiotic') || name.includes('antimicrobial') || name.includes('infect')) {
    return PHARMACY_IMAGES.categories[1];
  }

  return PHARMACY_IMAGES.categories.default;
}
