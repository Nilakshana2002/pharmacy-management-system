import pool from '../config/db.js';
import fs from 'fs';
import path from 'path';

export async function initializeDatabaseCatalog() {
  try {
    console.log('[DB Migration] Checking database schema for discounts, offers, and ratings...');

    // 0. Ensure safe filename for La Roche-Posay image (avoid '+' decoding issues in Vite/Express)
    try {
      const publicMedsDir = path.resolve('../frontend/public/medicines');
      const safeDest = path.join(publicMedsDir, 'La Roche-Posay Anthelios UVMune 400 Invisible Fluid SPF 50.jpg');
      const plusSrc = path.join(publicMedsDir, 'La Roche-Posay Anthelios UVMune 400 Invisible Fluid SPF 50+.jpg');
      const userUploaded = 'C:/Users/tharu/.gemini/antigravity-ide/brain/99b7bd6a-0406-413c-b99e-52d689e3db94/.user_uploaded/media_1792599895438.jpg';

      if (fs.existsSync(userUploaded)) {
        fs.copyFileSync(userUploaded, safeDest);
        console.log('[Image Sync] Copied uploaded La Roche-Posay photo to safe filename:', safeDest);
      } else if (fs.existsSync(plusSrc) && !fs.existsSync(safeDest)) {
        fs.copyFileSync(plusSrc, safeDest);
        console.log('[Image Sync] Copied plus-sign La Roche-Posay photo to safe filename:', safeDest);
      }
    } catch (fsErr) {
      console.warn('[Image Sync Warning]:', fsErr.message);
    }

    // 1. Add discount_percent, is_offer, rating, image_url to medicines if not present
    const [cols] = await pool.query('SHOW COLUMNS FROM medicines');
    const colNames = cols.map(c => c.Field);

    if (!colNames.includes('discount_percent')) {
      console.log('[DB Migration] Adding discount_percent column to medicines...');
      await pool.query('ALTER TABLE medicines ADD COLUMN discount_percent DECIMAL(5, 2) NOT NULL DEFAULT 0.00');
    }

    if (!colNames.includes('is_offer')) {
      console.log('[DB Migration] Adding is_offer column to medicines...');
      await pool.query('ALTER TABLE medicines ADD COLUMN is_offer BOOLEAN NOT NULL DEFAULT FALSE');
    }

    if (!colNames.includes('rating')) {
      console.log('[DB Migration] Adding rating column to medicines...');
      await pool.query('ALTER TABLE medicines ADD COLUMN rating DECIMAL(2, 1) NOT NULL DEFAULT 5.0');
    }

    if (!colNames.includes('image_url')) {
      console.log('[DB Migration] Adding image_url column to medicines...');
      await pool.query('ALTER TABLE medicines ADD COLUMN image_url VARCHAR(255) NULL');
    }

    // 2. Ensure Categories exist
    const categoriesToAdd = [
      { name: 'Antibiotics & Antimicrobials', desc: 'Medicines that fight bacterial infections.', icon: 'ShieldAlert' },
      { name: 'Analgesics & Pain Relief', desc: 'Medications designed to relieve acute and chronic pain.', icon: 'Activity' },
      { name: 'Cardiovascular & Blood Pressure', desc: 'Medications for hypertension, cholesterol, angina, and heart health.', icon: 'Heart' },
      { name: 'Respiratory & Allergy', desc: 'Inhalers, antihistamines, and bronchodilators for asthma and breathing conditions.', icon: 'Wind' },
      { name: 'Gastrointestinal & Antacids', desc: 'Remedies for acid reflux, ulcers, digestion, nausea, and gut flora.', icon: 'Stomach' },
      { name: 'Endocrine & Antidiabetic', desc: 'Insulin therapies and oral medications for blood glucose regulation.', icon: 'Zap' },
      { name: 'Vitamins & Dietary Supplements', desc: 'Essential micronutrients, immune support supplements, and mineral formulations.', icon: 'Sun' },
      { name: 'Dermatology & Skin Care', desc: 'Topical ointments, corticosteroids, and antibacterial creams.', icon: 'Sparkles' },
      { name: 'Diet & Nutrition', desc: 'Protein powders, dietary food supplements, weight management, and energy formulations.', icon: 'Apple' },
      { name: 'Beauty Care & Cosmetics', desc: 'Dermatological skincare, cleansers, serums, sunscreens, and medical cosmetics.', icon: 'Sparkles' },
      { name: 'Personal Care & Hygiene', desc: 'Everyday hygiene essentials, adult care, antiseptic washes, and personal wellness.', icon: 'Shield' },
      { name: 'Baby & Mother Care', desc: 'Pediatric care, baby lotion, gentle baby baths, hypoallergenic wipes, and baby nutrition.', icon: 'Heart' },
      { name: 'Medical Devices & Equipment', desc: 'Blood pressure monitors, diagnostic stethoscopes, nebulizers, thermometers, and glucometers.', icon: 'Activity' },
      { name: 'Ayurvedic & Herbal Care', desc: 'Natural herbal remedies, herbal eye drops, gastro teas, and certified herbal wellness.', icon: 'Leaf' }
    ];

    for (const cat of categoriesToAdd) {
      const [existing] = await pool.query('SELECT category_id FROM medicine_categories WHERE category_name = ?', [cat.name]);
      if (existing.length === 0) {
        await pool.query(
          'INSERT INTO medicine_categories (category_name, description, icon_name) VALUES (?, ?, ?)',
          [cat.name, cat.desc, cat.icon]
        );
        console.log(`[DB Migration] Created Category: ${cat.name}`);
      }
    }

    // 3. Ensure Brands exist
    const brandsToAdd = [
      { name: 'Pfizer Inc.', country: 'United States' },
      { name: 'GlaxoSmithKline (GSK)', country: 'United Kingdom' },
      { name: 'Novartis Pharmaceuticals', country: 'Switzerland' },
      { name: 'Sanofi S.A.', country: 'France' },
      { name: 'AstraZeneca plc', country: 'United Kingdom / Sweden' },
      { name: 'Johnson & Johnson', country: 'United States' },
      { name: 'Bayer AG', country: 'Germany' },
      { name: 'Cipla Ltd.', country: 'India' },
      { name: '3M Littmann', country: 'United States' },
      { name: 'Omron Healthcare', country: 'Japan' },
      { name: 'SafeCare Medical', country: 'Sri Lanka' },
      { name: 'Roche Accu-Chek', country: 'Switzerland' },
      { name: 'Optimum Nutrition', country: 'United States' },
      { name: 'CeraVe Skincare', country: 'United States' },
      { name: 'La Roche-Posay', country: 'France' },
      { name: 'Sebamed Germany', country: 'Germany' },
      { name: 'Reckitt Dettol', country: 'United Kingdom' },
      { name: 'Vitabiotics UK', country: 'United Kingdom' },
      { name: 'Siddhalepa Ayurveda', country: 'Sri Lanka' }
    ];

    for (const b of brandsToAdd) {
      const [existing] = await pool.query('SELECT brand_id FROM brands WHERE brand_name = ?', [b.name]);
      if (existing.length === 0) {
        await pool.query(
          'INSERT INTO brands (brand_name, country_of_origin) VALUES (?, ?)',
          [b.name, b.country]
        );
        console.log(`[DB Migration] Created Brand: ${b.name}`);
      }
    }

    // Load category and brand ID lookup maps
    const [allCats] = await pool.query('SELECT category_id, category_name FROM medicine_categories');
    const catMap = {};
    allCats.forEach(c => { catMap[c.category_name] = c.category_id; });

    const [allBrands] = await pool.query('SELECT brand_id, brand_name FROM brands');
    const brandMap = {};
    allBrands.forEach(b => { brandMap[b.brand_name] = b.brand_id; });

    // 4. Products to insert into medicines table
    const productsToMigrate = [
      {
        name: '3M Littmann Classic III Stethoscope (Smoke / Black Tube)',
        generic_name: 'Dual Frequency Medical Acoustic Stethoscope',
        brand_name: '3M Littmann',
        category_name: 'Medical Devices & Equipment',
        dosage_form: 'Medical Device',
        strength: '27-inch',
        description: 'High acoustic sensitivity for performing general physical assessments. Tunable diaphragms on both adult and pediatric sides.',
        side_effects: 'Non-invasive diagnostic device. No physiological side effects.',
        usage_instructions: 'Place headset comfortably into ear canals pointing forward. Position diaphragm gently on chest or back.',
        unit_price: 70750.00,
        discount_percent: 10.00,
        is_offer: true,
        rating: 5.0,
        low_stock_threshold: 5,
        batch_number: 'LOT-3M-2026',
        stock_qty: 35,
        unit_cost: 58000.00
      },
      {
        name: 'Omron 2-in-1 Max Blood Glucose & BP Monitor',
        generic_name: 'Automatic Digital Diagnostic System',
        brand_name: 'Omron Healthcare',
        category_name: 'Medical Devices & Equipment',
        dosage_form: 'Diagnostic Device',
        strength: 'Digital',
        description: 'Clinical accuracy with Intellisense technology for comfortable, controlled inflation and high precision glucose readings.',
        side_effects: 'Temporary cuff tightness during inflation.',
        usage_instructions: 'Sit comfortably with feet flat. Wrap cuff around upper arm at heart level and press Start.',
        unit_price: 4750.00,
        discount_percent: 15.00,
        is_offer: true,
        rating: 5.0,
        low_stock_threshold: 10,
        batch_number: 'LOT-OMR-2026',
        stock_qty: 50,
        unit_cost: 3800.00
      },
      {
        name: 'Certified 3-Ply Protective Face Masks (Box of 50)',
        generic_name: 'Fluid Resistant Bacterial Filtration Masks',
        brand_name: 'SafeCare Medical',
        category_name: 'Personal Care & Hygiene',
        dosage_form: 'Protective Wear',
        strength: '50 Pieces',
        description: 'High BFE >= 98% particulate filtration with soft elastic ear loops and moldable nose clip for snug respiratory protection.',
        side_effects: 'Hypoallergenic. Single use only.',
        usage_instructions: 'Fit nose clip over nasal bridge. Secure ear loops and expand pleats to cover chin fully.',
        unit_price: 75.00,
        discount_percent: 20.00,
        is_offer: true,
        rating: 5.0,
        low_stock_threshold: 20,
        batch_number: 'LOT-SCM-2026',
        stock_qty: 120,
        unit_cost: 50.00
      },
      {
        name: 'Accu-Chek Active Blood Glucose Test Strips (50 Strips)',
        generic_name: 'Electrochemical Biosensor Glucose Strips',
        brand_name: 'Roche Accu-Chek',
        category_name: 'Medical Devices & Equipment',
        dosage_form: 'Diagnostic Strips',
        strength: '50 Strips Pack',
        description: 'Hassle-free accurate blood sugar measurement in 5 seconds. Easy-to-handle test strips designed for home and hospital monitoring.',
        side_effects: 'None. For in-vitro diagnostic use.',
        usage_instructions: 'Insert strip into Accu-Chek meter, touch blood droplet to green target area.',
        unit_price: 4505.00,
        discount_percent: 0.00,
        is_offer: false,
        rating: 5.0,
        low_stock_threshold: 15,
        batch_number: 'LOT-ROCH-2026',
        stock_qty: 60,
        unit_cost: 3600.00
      },
      {
        name: 'Optimum Nutrition Gold Standard 100% Whey (2 lbs)',
        generic_name: 'Whey Protein Isolate & Peptides Formula',
        brand_name: 'Optimum Nutrition',
        category_name: 'Diet & Nutrition',
        dosage_form: 'Powder',
        strength: '907g Double Rich Chocolate',
        description: 'Provides 24g of all-whey protein per serving with 5.5g of naturally occurring BCAAs to support muscle recovery and nutrition.',
        side_effects: 'Contains milk and soy derivatives. Not recommended for galactosemic individuals.',
        usage_instructions: 'Mix 1 rounded scoop with 6-8 fl oz of cold water or milk 30-60 minutes post workout.',
        unit_price: 18500.00,
        discount_percent: 15.00,
        is_offer: true,
        rating: 5.0,
        low_stock_threshold: 10,
        batch_number: 'LOT-ON-2026',
        stock_qty: 45,
        unit_cost: 14500.00
      },
      {
        name: 'CeraVe Hydrating Facial Cleanser for Normal to Dry Skin',
        generic_name: 'Ceramides 1, 3, 6-II + Hyaluronic Acid Cleanser',
        brand_name: 'CeraVe Skincare',
        category_name: 'Beauty Care & Cosmetics',
        dosage_form: 'Lotion Cleanser',
        strength: '473ml Dispenser',
        description: 'Non-comedogenic, fragrance-free dermatologist-formulated wash that cleanses and hydrates without disrupting the protective skin barrier.',
        side_effects: 'Very mild tingling on hypersensitive skin.',
        usage_instructions: 'Wet skin with lukewarm water. Massage cleanser into skin in a gentle circular motion, then rinse.',
        unit_price: 8900.00,
        discount_percent: 10.00,
        is_offer: true,
        rating: 5.0,
        low_stock_threshold: 15,
        batch_number: 'LOT-CRV-2026',
        stock_qty: 40,
        unit_cost: 6900.00
      },
      {
        name: 'La Roche-Posay Anthelios UVMune 400 Invisible Fluid SPF 50+',
        generic_name: 'Mexoryl 400 Broad Spectrum UV Protection',
        brand_name: 'La Roche-Posay',
        category_name: 'Beauty Care & Cosmetics',
        dosage_form: 'Sunscreen Fluid',
        strength: '50ml',
        description: 'Ultimate broad-spectrum defense against ultra-long UVA rays with high water, sweat, and sand resistance for sensitive skin.',
        side_effects: 'Avoid direct eye contact.',
        usage_instructions: 'Shake vigorously before use. Apply liberally 20 minutes before sun exposure; reapply every 2 hours.',
        unit_price: 9500.00,
        discount_percent: 14.00,
        is_offer: true,
        rating: 5.0,
        low_stock_threshold: 12,
        batch_number: 'LOT-LRP-2026',
        stock_qty: 38,
        unit_cost: 7200.00
      },
      {
        name: 'Sebamed Baby Wash Extra Soft 200ml',
        generic_name: 'pH 5.5 Tear-Free Pediatric Bath Formula',
        brand_name: 'Sebamed Germany',
        category_name: 'Baby & Mother Care',
        dosage_form: 'Baby Wash',
        strength: '200ml',
        description: 'Specially formulated with squalane and allantoin to support natural acid mantle development and protect delicate newborn skin from dryness.',
        side_effects: 'Dermatologically tested. Tear-free.',
        usage_instructions: 'Put a couple of drops into baby bath water or apply gently on wet body, lather lightly, and rinse.',
        unit_price: 3650.00,
        discount_percent: 0.00,
        is_offer: false,
        rating: 5.0,
        low_stock_threshold: 15,
        batch_number: 'LOT-SBM-2026',
        stock_qty: 55,
        unit_cost: 2800.00
      },
      {
        name: 'Dettol Antiseptic Disinfectant Liquid 750ml',
        generic_name: 'Chloroxylenol 4.8% Antiseptic Solution',
        brand_name: 'Reckitt Dettol',
        category_name: 'Personal Care & Hygiene',
        dosage_form: 'Antiseptic Solution',
        strength: '750ml Hospital Grade',
        description: 'Proven effective against viruses and germs for wound cleansing, antibacterial skin hygiene, and personal protection.',
        side_effects: 'For external use only. Dilute before applying to skin.',
        usage_instructions: 'Dilute 1 capful in 400ml water for antiseptic skin cleansing and minor wound care.',
        unit_price: 1850.00,
        discount_percent: 12.00,
        is_offer: true,
        rating: 5.0,
        low_stock_threshold: 25,
        batch_number: 'LOT-DTL-2026',
        stock_qty: 90,
        unit_cost: 1350.00
      },
      {
        name: 'Wellman 50+ Comprehensive Multivitamin & Minerals (30 Tablets)',
        generic_name: 'Bio-Active Nutrients & Siberian Ginseng + Co-Q10',
        brand_name: 'Vitabiotics UK',
        category_name: 'Vitamins & Dietary Supplements',
        dosage_form: 'Tablet',
        strength: '30 Tablets Box',
        description: 'Expert nutrition formula including vitamins B6, B12, iron, and zinc to support active vitality, heart function, and immune defense.',
        side_effects: 'Take with main meal to prevent stomach sensitivity.',
        usage_instructions: 'One tablet per day with your main meal. Swallow with water or a cold drink. Do not chew.',
        unit_price: 4200.00,
        discount_percent: 12.00,
        is_offer: true,
        rating: 5.0,
        low_stock_threshold: 20,
        batch_number: 'LOT-WM-2026',
        stock_qty: 70,
        unit_cost: 3100.00
      },
      {
        name: 'Omron Ultrasonic Mesh Nebulizer MicroAir NE-U100',
        generic_name: 'Portable Pocket Mesh Inhalation Nebulizer',
        brand_name: 'Omron Healthcare',
        category_name: 'Medical Devices & Equipment',
        dosage_form: 'Medical Device',
        strength: 'Battery Operated',
        description: 'Whisper-quiet medication delivery in any position, even lying down. Ideal for both pediatric asthma management and adults on the move.',
        side_effects: 'Clean medication cup and mesh cap thoroughly after each session.',
        usage_instructions: 'Fill medication cup up to 10ml, close cap, position mouthpiece or mask, and turn on power button.',
        unit_price: 34500.00,
        discount_percent: 10.00,
        is_offer: true,
        rating: 5.0,
        low_stock_threshold: 5,
        batch_number: 'LOT-OMN-2026',
        stock_qty: 25,
        unit_cost: 27000.00
      },
      {
        name: 'Siddhalepa Herbal Balm 50g Original Ayur Formula',
        generic_name: 'Eucalyptus, Cinnamon & Herbal Ayurvedic Extract',
        brand_name: 'Siddhalepa Ayurveda',
        category_name: 'Ayurvedic & Herbal Care',
        dosage_form: 'Herbal Balm',
        strength: '50g Glass Jar',
        description: 'Traditional time-tested Sri Lankan herbal formula providing natural soothing comfort for headaches, joint pains, and cold symptoms.',
        side_effects: 'Warm soothing sensation on skin.',
        usage_instructions: 'Foment the affected area with warm water and apply balm gently. Repeat two to three times daily.',
        unit_price: 450.00,
        discount_percent: 10.00,
        is_offer: true,
        rating: 5.0,
        low_stock_threshold: 30,
        batch_number: 'LOT-SDH-2026',
        stock_qty: 150,
        unit_cost: 320.00
      }
    ];

    // Ensure Supplier 1 exists
    const [suppliers] = await pool.query('SELECT supplier_id FROM suppliers LIMIT 1');
    const supplierId = suppliers[0]?.supplier_id || 1;

    for (const p of productsToMigrate) {
      const brandId = brandMap[p.brand_name] || 1;
      const categoryId = catMap[p.category_name] || 7;

      // Check if medicine already exists by name
      const [existingMeds] = await pool.query('SELECT medicine_id FROM medicines WHERE name = ?', [p.name]);
      let medicineId;

      if (existingMeds.length === 0) {
        const [insertResult] = await pool.query(`
          INSERT INTO medicines (
            name, generic_name, brand_id, category_id, dosage_form, 
            strength, description, side_effects, usage_instructions, 
            unit_price, is_public_price, low_stock_threshold, is_active,
            discount_percent, is_offer, rating
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE, ?, TRUE, ?, ?, ?)
        `, [
          p.name, p.generic_name, brandId, categoryId, p.dosage_form,
          p.strength, p.description, p.side_effects, p.usage_instructions,
          p.unit_price, p.low_stock_threshold, p.discount_percent, p.is_offer ? 1 : 0, p.rating
        ]);
        medicineId = insertResult.insertId;
        console.log(`[DB Migration] Inserted Medicine #${medicineId}: ${p.name}`);
      } else {
        medicineId = existingMeds[0].medicine_id;
        // Update discount and offer info if already exists
        await pool.query(`
          UPDATE medicines 
          SET discount_percent = ?, is_offer = ?, rating = ?
          WHERE medicine_id = ?
        `, [p.discount_percent, p.is_offer ? 1 : 0, p.rating, medicineId]);
      }

      // Check if active batch exists
      const [existingBatches] = await pool.query(
        'SELECT batch_id FROM medicine_batches WHERE medicine_id = ? AND status = "active"',
        [medicineId]
      );

      if (existingBatches.length === 0) {
        await pool.query(`
          INSERT INTO medicine_batches (
            medicine_id, supplier_id, batch_number, manufacture_date,
            expiry_date, quantity_received, stock_quantity, reserved_quantity,
            unit_cost, status
          ) VALUES (?, ?, ?, '2025-01-10', '2027-12-31', ?, ?, 0, ?, 'active')
        `, [medicineId, supplierId, p.batch_number, p.stock_qty, p.stock_qty, p.unit_cost]);
        console.log(`[DB Migration] Added Active Batch for Medicine #${medicineId} (${p.stock_qty} units)`);
      }

      // Update image_url if provided or if La Roche-Posay
      if (p.name.includes('Roche') || p.name.includes('Anthelios')) {
        await pool.query(
          'UPDATE medicines SET image_url = ? WHERE medicine_id = ?',
          ['/medicines/La Roche-Posay Anthelios UVMune 400 Invisible Fluid SPF 50.jpg', medicineId]
        );
      }
    }

    // Direct guarantee update for La Roche-Posay product photo URL in database
    await pool.query(`
      UPDATE medicines 
      SET image_url = '/medicines/La Roche-Posay Anthelios UVMune 400 Invisible Fluid SPF 50.jpg'
      WHERE name LIKE '%Roche%' OR name LIKE '%Anthelios%'
    `);

    console.log('[DB Migration] All wellness products successfully persisted to MySQL Database.');
    return { success: true };
  } catch (err) {
    console.error('[DB Migration Error]:', err);
    return { success: false, error: err.message };
  }
}
