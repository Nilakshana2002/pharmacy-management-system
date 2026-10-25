-- ============================================================
-- VDC STORE / MY PHARMACIST MANAGEMENT SYSTEM
-- Seed Production-like Sample Data (MySQL 8.0+)
-- Module: Advanced Database Management System (ADBMS) Coursework
-- ============================================================

USE pharmacy_db;

-- ------------------------------------------------------------
-- 1. SEED BRANDS (Pharmaceutical & Medical Manufacturers)
-- ------------------------------------------------------------
INSERT INTO brands (brand_id, brand_name, country_of_origin) VALUES
(1, 'Pfizer Inc.', 'United States'),
(2, 'GlaxoSmithKline (GSK)', 'United Kingdom'),
(3, 'Novartis Pharmaceuticals', 'Switzerland'),
(4, 'Sanofi S.A.', 'France'),
(5, 'AstraZeneca plc', 'United Kingdom / Sweden'),
(6, 'Johnson & Johnson', 'United States'),
(7, 'Bayer AG', 'Germany'),
(8, 'Cipla Ltd.', 'India'),
(9, '3M Littmann', 'United States'),
(10, 'Omron Healthcare', 'Japan'),
(11, 'SafeCare Medical', 'Sri Lanka'),
(12, 'Roche Accu-Chek', 'Switzerland'),
(13, 'Optimum Nutrition', 'United States'),
(14, 'CeraVe Skincare', 'United States'),
(15, 'La Roche-Posay', 'France'),
(16, 'Sebamed Germany', 'Germany'),
(17, 'Reckitt Dettol', 'United Kingdom'),
(18, 'Vitabiotics UK', 'United Kingdom'),
(19, 'Siddhalepa Ayurveda', 'Sri Lanka')
ON DUPLICATE KEY UPDATE brand_name = VALUES(brand_name);

-- ------------------------------------------------------------
-- 2. SEED MEDICINE CATEGORIES & DEPARTMENTS (With Hierarchy)
-- ------------------------------------------------------------
INSERT INTO medicine_categories (category_id, parent_category_id, category_name, description, icon_name, image_url) VALUES
(1, NULL, 'Antibiotics & Antimicrobials', 'Medicines that fight bacterial infections in humans and animals.', 'ShieldAlert', 'https://images.unsplash.com/photo-1471864190281-a93a3070b6de?auto=format&fit=crop&w=600&q=80'),
(2, NULL, 'Analgesics & Pain Relief', 'Medications designed specifically to relieve acute and chronic pain.', 'Activity', 'https://images.unsplash.com/photo-1584017911766-d451b3d0e843?auto=format&fit=crop&w=600&q=80'),
(3, NULL, 'Cardiovascular & Blood Pressure', 'Medications for hypertension, cholesterol, angina, and heart health.', 'Heart', 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?auto=format&fit=crop&w=600&q=80'),
(4, NULL, 'Respiratory & Allergy', 'Inhalers, antihistamines, and bronchodilators for asthma and breathing conditions.', 'Wind', 'https://images.unsplash.com/photo-1584362917165-526a968579e8?auto=format&fit=crop&w=600&q=80'),
(5, NULL, 'Gastrointestinal & Antacids', 'Remedies for acid reflux, ulcers, digestion, nausea, and gut flora.', 'Stomach', 'https://images.unsplash.com/photo-1550572017-edd951aa8f72?auto=format&fit=crop&w=600&q=80'),
(6, NULL, 'Endocrine & Antidiabetic', 'Insulin therapies and oral medications for blood glucose regulation.', 'Zap', 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=600&q=80'),
(7, NULL, 'Vitamins & Dietary Supplements', 'Essential micronutrients, immune support supplements, and mineral formulations.', 'Sun', 'https://images.unsplash.com/photo-1577401239170-897942555fb3?auto=format&fit=crop&w=600&q=80'),
(8, NULL, 'Dermatology & Skin Care', 'Topical ointments, corticosteroids, and antibacterial creams.', 'Sparkles', 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=600&q=80'),
(9, NULL, 'Diet & Nutrition', 'Protein powders, dietary food supplements, weight management, and energy formulations.', 'Apple', 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=600&q=80'),
(10, NULL, 'Beauty Care & Cosmetics', 'Dermatological skincare, cleansers, serums, sunscreens, and medical-grade cosmetics.', 'Sparkles', 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=600&q=80'),
(11, NULL, 'Personal Care & Hygiene', 'Everyday hygiene essentials, adult care, antiseptic washes, and personal wellness.', 'Shield', 'https://images.unsplash.com/photo-1583947215259-38e31be8751f?auto=format&fit=crop&w=600&q=80'),
(12, NULL, 'Baby & Mother Care', 'Pediatric care, baby lotion, gentle baby baths, hypoallergenic wipes, and baby nutrition.', 'Heart', 'https://images.unsplash.com/photo-1519689680058-324335c77eba?auto=format&fit=crop&w=600&q=80'),
(13, NULL, 'Medical Devices & Equipment', 'Blood pressure monitors, diagnostic stethoscopes, nebulizers, thermometers, and glucometers.', 'Activity', 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=600&q=80'),
(14, NULL, 'Ayurvedic & Herbal Care', 'Natural herbal remedies, herbal eye drops, gastro teas, and certified herbal wellness.', 'Leaf', 'https://images.unsplash.com/photo-1617791160505-6f00504e3519?auto=format&fit=crop&w=600&q=80')
ON DUPLICATE KEY UPDATE category_name = VALUES(category_name), image_url = VALUES(image_url);

-- ------------------------------------------------------------
-- 3. SEED SUPPLIERS
-- ------------------------------------------------------------
INSERT INTO suppliers (supplier_id, supplier_name, contact_person, phone, email, address, is_active) VALUES
(1, 'Apex Pharma Distributors', 'Dr. Sunil Jayawardena', '+94 11 234 5678', 'orders@apexpharma.lk', '45 Hospital Road, Colombo 07', TRUE),
(2, 'Global Healthcare Logistics', 'Ms. Anusha Fernando', '+94 11 789 0123', 'supply@globalhealth.com', '12 Industrial Zone, Biyagama', TRUE),
(3, 'MedSupply Ceylon Ltd.', 'Mr. K. Perera', '+94 81 223 4455', 'sales@medsupplyceylon.com', '88 Kandy Road, Peradeniya', TRUE),
(4, 'BioTech Prime Wholesalers', 'Mr. David Silva', '+94 91 222 3344', 'contact@biotechprime.lk', '34 Galle Road, Galle', TRUE),
(5, 'VDC Central Depot', 'Logistics Director', '+94 11 555 9900', 'depot@vdcstore.lk', '01 Main Street, Colombo 01', TRUE)
ON DUPLICATE KEY UPDATE supplier_name = VALUES(supplier_name);

-- ------------------------------------------------------------
-- 4. SEED MEDICINES (38 Formulations: Dispensary + Wellness)
-- ------------------------------------------------------------
INSERT INTO medicines (
    medicine_id, name, generic_name, brand_id, category_id, 
    dosage_form, strength, description, side_effects, 
    usage_instructions, unit_price, discount_percent, is_offer, rating, image_url,
    is_public_price, low_stock_threshold, is_active
) VALUES
-- Category 1: Antibiotics
(1, 'Augmentin 625mg', 'Amoxicillin + Clavulanate Potassium', 2, 1, 'Tablet', '625mg', 
 'Broad-spectrum antibiotic used to treat bacterial infections of the respiratory tract, urinary tract, ear, and skin.', 
 'Mild diarrhea, nausea, skin rash. Consult doctor if severe.', 
 'Take with a meal or light snack to reduce stomach discomfort every 12 hours as prescribed.', 185.00, 0.00, FALSE, 5.0, '/medicines/Augmentin 625mg.webp', TRUE, 25, TRUE),

(2, 'Amoxil 500mg', 'Amoxicillin Trihydrate', 2, 1, 'Capsule', '500mg', 
 'Penicillin antibiotic used to treat a wide variety of bacterial infections including chest infections and dental abscesses.', 
 'Nausea, allergic reaction, headache.', 
 'Swallow whole with water every 8 hours. Complete full course.', 95.00, 0.00, FALSE, 5.0, '/medicines/Amoxil 500mg.jpg', TRUE, 30, TRUE),

(3, 'Ciprobay 500mg', 'Ciprofloxacin Hydrochloride', 7, 1, 'Tablet', '500mg', 
 'Fluoroquinolone antibiotic used for severe bacterial infections, complicated UTIs, and abdominal infections.', 
 'Dizziness, tendon discomfort, photosensitivity.', 
 'Drink plenty of water. Do not take with dairy products simultaneously.', 240.00, 0.00, FALSE, 5.0, '/medicines/Ciprobay 500mg.webp', TRUE, 20, TRUE),

(4, 'Zithromax 250mg', 'Azithromycin Dihydrate', 1, 1, 'Capsule', '250mg', 
 'Macrolide antibiotic commonly prescribed for sinus, respiratory, and soft tissue infections.', 
 'Abdominal cramps, loose stools.', 
 'Take once daily either 1 hour before or 2 hours after meals.', 320.00, 0.00, FALSE, 5.0, '/medicines/Zithromax 250mg.webp', TRUE, 20, TRUE),

-- Category 2: Analgesics & Pain Relief
(5, 'Panadol Extra', 'Paracetamol + Caffeine', 2, 2, 'Tablet', '500mg / 65mg', 
 'Enhanced pain reliever for tough headaches, migraines, muscular aches, and fever.', 
 'Insomnia, restlessness if taken late in evening.', 
 '1 to 2 tablets every 4 to 6 hours as required. Do not exceed 8 tablets in 24 hours.', 45.00, 0.00, FALSE, 5.0, '/medicines/Panadol Extra.jpg', TRUE, 50, TRUE),

(6, 'Panadol Children Drops', 'Paracetamol', 2, 2, 'Drops', '100mg/ml', 
 'Gentle and effective relief of fever and pain for infants and toddlers.', 
 'Rare when given within recommended pediatric dosage.', 
 'Administer using calibrated dropper strictly according to child weight.', 350.00, 0.00, FALSE, 5.0, '/medicines/Panadol Children Drops.jpg', TRUE, 15, TRUE),

(7, 'Brufen 400mg', 'Ibuprofen', 8, 2, 'Tablet', '400mg', 
 'Non-steroidal anti-inflammatory drug (NSAID) for inflammatory pain, arthritis, toothache, and menstrual cramps.', 
 'Heartburn, mild stomach upset.', 
 'Always take with food or immediately after a meal.', 65.00, 0.00, FALSE, 5.0, '/medicines/Brufen 400mg.jpg', TRUE, 35, TRUE),

(8, 'Celebrex 200mg', 'Celecoxib', 1, 2, 'Capsule', '200mg', 
 'Selective COX-2 inhibitor for osteoarthritis, rheumatoid arthritis, and acute pain.', 
 'Fluid retention, indigestion.', 
 'Take once or twice daily with food as instructed by physician.', 410.00, 0.00, FALSE, 5.0, '/medicines/Celebrex 200mg.jpg', TRUE, 15, TRUE),

-- Category 3: Cardiovascular
(9, 'Lipitor 20mg', 'Atorvastatin Calcium', 1, 3, 'Tablet', '20mg', 
 'HMG-CoA reductase inhibitor (statin) used to lower LDL cholesterol and triglyceride levels.', 
 'Muscle aches, mild liver enzyme variation.', 
 'Take once daily in the evening with or without food.', 160.00, 0.00, FALSE, 5.0, '/medicines/Lipitor 20mg.jpg', TRUE, 25, TRUE),

(10, 'Norvasc 5mg', 'Amlodipine Besylate', 1, 3, 'Tablet', '5mg', 
 'Calcium channel blocker prescribed for hypertension and chronic stable angina.', 
 'Peripheral edema (ankle swelling), flushing, dizziness.', 
 'Take once daily in the morning with a glass of water.', 110.00, 0.00, FALSE, 5.0, '/medicines/Norvasc 5mg.jpg', TRUE, 30, TRUE),

(11, 'Cozaar 50mg', 'Losartan Potassium', 3, 3, 'Tablet', '50mg', 
 'Angiotensin II receptor antagonist (ARB) for blood pressure control and kidney protection in diabetic patients.', 
 'Dizziness, low blood pressure on standing.', 
 'Take consistently once daily at the same time.', 145.00, 0.00, FALSE, 5.0, '/medicines/Cozaar 50mg.jpg', TRUE, 20, TRUE),

(12, 'Betaloc 25mg', 'Metoprolol Tartrate', 5, 3, 'Tablet', '25mg', 
 'Beta-blocker used to regulate cardiac rhythm, treat high blood pressure, and prevent heart complications.', 
 'Slow heart rate, fatigue, cold extremities.', 
 'Take during or immediately following a meal.', 90.00, 0.00, FALSE, 5.0, '/medicines/Betaloc 25mg.jpg', TRUE, 20, TRUE),

-- Category 4: Respiratory & Allergy
(13, 'Ventolin Evohaler', 'Salbutamol Sulfate', 2, 4, 'Inhaler', '100mcg/dose', 
 'Rapid-acting bronchodilator for prompt relief of bronchospasm in asthma and COPD.', 
 'Fine tremor, transient palpitations, nervousness.', 
 'Inhale 1 to 2 puffs during acute wheezing or 15 mins prior to exercise.', 750.00, 0.00, FALSE, 5.0, '/medicines/Ventolin Evohaler.jpg', TRUE, 20, TRUE),

(14, 'Singulair 10mg', 'Montelukast Sodium', 3, 4, 'Tablet', '10mg', 
 'Leukotriene receptor antagonist for maintenance asthma therapy and seasonal allergic rhinitis.', 
 'Headache, vivid dreams, upper respiratory symptoms.', 
 'Take one tablet orally every evening before sleep.', 280.00, 0.00, FALSE, 5.0, '/medicines/Singulair 10mg.jpg', TRUE, 20, TRUE),

(15, 'Zyrtec 10mg', 'Cetirizine Hydrochloride', 6, 4, 'Tablet', '10mg', 
 'Second-generation antihistamine for relief of hay fever, urticaria (hives), and runny nose.', 
 'Mild drowsiness, dry mouth.', 
 'Take one tablet once daily with water.', 55.00, 0.00, FALSE, 5.0, '/medicines/Zyrtec 10mg.jpg', TRUE, 40, TRUE),

(16, 'Flixonase Aqueous Spray', 'Fluticasone Propionate', 2, 4, 'Nasal Spray', '50mcg/spray', 
 'Topical nasal corticosteroid for preventive relief of allergic rhinitis and nasal congestion.', 
 'Nose irritation, occasional dryness.', 
 'Administer 1 to 2 sprays in each nostril once daily in the morning.', 1250.00, 0.00, FALSE, 5.0, '/medicines/Flixonase Aqueous Spray.jpg', TRUE, 15, TRUE),

-- Category 5: Gastrointestinal & Antacids
(17, 'Nexium 40mg', 'Esomeprazole Magnesium', 5, 5, 'Tablet', '40mg', 
 'Proton pump inhibitor (PPI) for healing erosive esophagitis and treating gastroesophageal reflux disease (GERD).', 
 'Headache, constipation, abdominal pain.', 
 'Take at least 1 hour before breakfast with a glass of water.', 220.00, 0.00, FALSE, 5.0, '/medicines/Nexium 40mg.jpg', TRUE, 30, TRUE),

(18, 'Controloc 40mg', 'Pantoprazole Sodium', 7, 5, 'Tablet', '40mg', 
 'Acid-suppressive medication for gastric and duodenal ulcers, and acid hypersecretion.', 
 'Nausea, flatulence.', 
 'Swallow tablet whole; do not chew or crush before meals.', 175.00, 0.00, FALSE, 5.0, '/medicines/Controloc 40mg.jpg', TRUE, 25, TRUE),

(19, 'Motilium 10mg', 'Domperidone', 6, 5, 'Tablet', '10mg', 
 'Dopamine antagonist antiemetic used to relieve nausea, vomiting, and feelings of fullness.', 
 'Dry mouth, rarely drowsiness.', 
 'Take 15 to 30 minutes before meals.', 50.00, 0.00, FALSE, 5.0, '/medicines/Motilium 10mg.jpg', TRUE, 25, TRUE),

(20, 'Gaviscon Double Action', 'Sodium Alginate + Potassium Bicarbonate', 2, 5, 'Suspension', '10ml sachet', 
 'Fast-acting raft-forming liquid for quick suppression of heartburn and indigestion.', 
 'Occasional bloating if overused.', 
 'Take 10ml to 20ml after meals and at bedtime.', 90.00, 0.00, FALSE, 5.0, '/medicines/Gaviscon Double Action.jpg', TRUE, 40, TRUE),

-- Category 6: Endocrine & Antidiabetic
(21, 'Glucophage 500mg', 'Metformin Hydrochloride', 4, 6, 'Tablet', '500mg', 
 'First-line biguanide oral antihyperglycemic for Type 2 diabetes mellitus management.', 
 'Metallic taste, gastrointestinal disturbances.', 
 'Take with or immediately after meals to reduce stomach upset.', 35.00, 0.00, FALSE, 5.0, '/medicines/Glucophage 500mg.jpg', TRUE, 50, TRUE),

(22, 'Amaryl 2mg', 'Glimepiride', 4, 6, 'Tablet', '2mg', 
 'Sulfonylurea oral hypoglycemic agent stimulating insulin release from beta cells.', 
 'Hypoglycemia (low blood sugar), weight gain.', 
 'Take immediately before or during the first main meal of the day.', 120.00, 0.00, FALSE, 5.0, '/medicines/Amaryl 2mg.jpg', TRUE, 20, TRUE),

(23, 'Lantus SoloStar', 'Insulin Glargine', 4, 6, 'Injection', '100 IU/ml (3ml pen)', 
 'Long-acting basal insulin analog providing steady 24-hour glucose regulation.', 
 'Hypoglycemia, local injection site reaction.', 
 'Subcutaneous injection once daily at the same time every day. Keep refrigerated.', 2850.00, 0.00, FALSE, 5.0, '/medicines/Lantus SoloStar.jpg', TRUE, 10, TRUE),

-- Category 7: Vitamins & Supplements
(24, 'Cevit 500mg Chewable', 'Ascorbic Acid (Vitamin C)', 8, 7, 'Tablet', '500mg', 
 'Essential antioxidant vitamin for immune system resilience, collagen synthesis, and iron absorption.', 
 'Stomach irritation with extremely high doses.', 
 'Chew or dissolve in mouth 1 tablet daily after food.', 25.00, 0.00, FALSE, 5.0, '/medicines/Cevit 500mg Chewable.jpg', TRUE, 60, TRUE),

(25, 'Ostocalcium D3', 'Calcium + Vitamin D3 (Cholecalciferol)', 2, 7, 'Tablet', '500mg / 400 IU', 
 'Bone density support supplement for prevention and treatment of calcium and vitamin D deficiency.', 
 'Mild constipation in sensitive individuals.', 
 'Take 1 tablet twice daily with food.', 40.00, 0.00, FALSE, 5.0, '/medicines/Ostocalcium D3.jpg', TRUE, 45, TRUE),

(26, 'Neurobion Forte', 'Vitamin B1 + B6 + B12', 3, 7, 'Tablet', 'Combination', 
 'Neurotropic B-vitamin complex for peripheral neuropathy, nerve health, and cellular metabolism.', 
 'Bright yellow urine (normal harmless riboflavin excretion).', 
 'Take 1 tablet daily after main meal.', 65.00, 0.00, FALSE, 5.0, '/medicines/Neurobion Forte.jpg', TRUE, 30, TRUE),

-- Category 8: Dermatology
(27, 'Fucidin Cream 2%', 'Sodium Fusidate', 1, 8, 'Cream', '15g Tube', 
 'Potent topical antibacterial agent for localized skin infections including impetigo and infected dermatitis.', 
 'Mild stinging at site of application.', 
 'Apply thinly to affected area 2 to 3 times daily.', 680.00, 0.00, FALSE, 5.0, '/medicines/Fucidin Cream 2.jpg', TRUE, 15, TRUE),

-- Wellness & Diagnostics Items (Items 28 - 38)
(28, '3M Littmann Classic III Stethoscope (Smoke / Black Tube)', 'Dual Frequency Medical Acoustic Stethoscope', 9, 13, 'Medical Device', '27-inch',
 'High acoustic sensitivity for performing general physical assessments. Tunable diaphragms on both adult and pediatric sides.',
 'Non-invasive diagnostic device. No physiological side effects.',
 'Place headset comfortably into ear canals pointing forward. Position diaphragm gently on chest or back.', 70750.00, 10.00, TRUE, 5.0, '/medicines/3M Littmann Classic III Stethoscope Smoke_Black Tube.jpg', TRUE, 5, TRUE),

(29, 'Omron 2-in-1 Max Blood Glucose & BP Monitor', 'Automatic Digital Diagnostic System', 10, 13, 'Diagnostic Device', 'Digital',
 'Clinical accuracy with Intellisense technology for comfortable, controlled inflation and high precision glucose readings.',
 'Temporary cuff tightness during inflation.',
 'Sit comfortably with feet flat. Wrap cuff around upper arm at heart level and press Start.', 4750.00, 15.00, TRUE, 5.0, '/medicines/Omron 2-in-1 Max Blood Glucose & BP Monitor.jpg', TRUE, 10, TRUE),

(30, 'Certified 3-Ply Protective Face Masks (Box of 50)', 'Fluid Resistant Bacterial Filtration Masks', 11, 11, 'Protective Wear', '50 Pieces',
 'High BFE >= 98% particulate filtration with soft elastic ear loops and moldable nose clip for snug respiratory protection.',
 'Hypoallergenic. Single use only.',
 'Fit nose clip over nasal bridge. Secure ear loops and expand pleats to cover chin fully.', 75.00, 20.00, TRUE, 5.0, '/medicines/Certified 3-Ply Protective Face Masks (Box of 50).jpg', TRUE, 20, TRUE),

(31, 'Accu-Chek Active Blood Glucose Test Strips (50 Strips)', 'Electrochemical Biosensor Glucose Strips', 12, 13, 'Diagnostic Strips', '50 Strips Pack',
 'Hassle-free accurate blood sugar measurement in 5 seconds. Easy-to-handle test strips designed for home and hospital monitoring.',
 'None. For in-vitro diagnostic use.',
 'Insert strip into Accu-Chek meter, touch blood droplet to green target area.', 4505.00, 0.00, FALSE, 5.0, '/medicines/Accu-Chek Active Blood Glucose Test Strips (50 Strips).jpg', TRUE, 15, TRUE),

(32, 'Optimum Nutrition Gold Standard 100% Whey (2 lbs)', 'Whey Protein Isolate & Peptides Formula', 13, 9, 'Powder', '907g Chocolate',
 'Provides 24g of all-whey protein per serving with 5.5g of naturally occurring BCAAs to support muscle recovery and nutrition.',
 'Contains milk and soy derivatives. Not recommended for galactosemic individuals.',
 'Mix 1 rounded scoop with 6-8 fl oz of cold water or milk 30-60 minutes post workout.', 18500.00, 15.00, TRUE, 5.0, '/medicines/Optimum Nutrition Gold Standard 100 Whey (2 lbs).jpg', TRUE, 10, TRUE),

(33, 'CeraVe Hydrating Facial Cleanser for Normal to Dry Skin', 'Ceramides 1, 3, 6-II + Hyaluronic Acid Cleanser', 14, 10, 'Lotion Cleanser', '473ml Dispenser',
 'Non-comedogenic, fragrance-free dermatologist-formulated wash that cleanses and hydrates without disrupting the protective skin barrier.',
 'Very mild tingling on hypersensitive skin.',
 'Wet skin with lukewarm water. Massage cleanser into skin in a gentle circular motion, then rinse.', 8900.00, 10.00, TRUE, 5.0, '/medicines/CeraVe Hydrating Facial Cleanser for Normal to Dry Skin.jpg', TRUE, 15, TRUE),

(34, 'La Roche-Posay Anthelios UVMune 400 Invisible Fluid SPF 50+', 'Mexoryl 400 Broad Spectrum UV Protection', 15, 10, 'Sunscreen Fluid', '50ml',
 'Ultimate broad-spectrum defense against ultra-long UVA rays with high water, sweat, and sand resistance for sensitive skin.',
 'Avoid direct eye contact.',
 'Shake vigorously before use. Apply liberally 20 minutes before sun exposure; reapply every 2 hours.', 9500.00, 14.00, TRUE, 5.0, '/medicines/La Roche-Posay Anthelios UVMune 400 Invisible Fluid SPF 50.jpg', TRUE, 12, TRUE),

(35, 'Sebamed Baby Wash Extra Soft 200ml', 'pH 5.5 Tear-Free Pediatric Bath Formula', 16, 12, 'Baby Wash', '200ml',
 'Specially formulated with squalane and allantoin to support natural acid mantle development and protect delicate newborn skin from dryness.',
 'Dermatologically tested. Tear-free.',
 'Put a couple of drops into baby bath water or apply gently on wet body, lather lightly, and rinse.', 3650.00, 0.00, FALSE, 5.0, '/medicines/Sebamed Baby Wash Extra Soft 200ml.jpg', TRUE, 15, TRUE),

(36, 'Dettol Antiseptic Disinfectant Liquid 750ml', 'Chloroxylenol 4.8% Antiseptic Solution', 17, 11, 'Antiseptic Solution', '750ml Hospital Grade',
 'Proven effective against viruses and germs for wound cleansing, antibacterial skin hygiene, and personal protection.',
 'For external use only. Dilute before applying to skin.',
 'Dilute 1 capful in 400ml water for antiseptic skin cleansing and minor wound care.', 1850.00, 12.00, TRUE, 5.0, '/medicines/Dettol Antiseptic Disinfectant Liquid 750ml.jpg', TRUE, 25, TRUE),

(37, 'Wellman 50+ Comprehensive Multivitamin & Minerals (30 Tablets)', 'Bio-Active Nutrients & Siberian Ginseng + Co-Q10', 18, 7, 'Tablet', '30 Tablets Box',
 'Expert nutrition formula including vitamins B6, B12, iron, and zinc to support active vitality, heart function, and immune defense.',
 'Take with main meal to prevent stomach sensitivity.',
 'One tablet per day with your main meal. Swallow with water or a cold drink. Do not chew.', 4200.00, 12.00, TRUE, 5.0, '/medicines/Wellman 50+ Comprehensive Multivitamin & Minerals (30 Tablets).jpg', TRUE, 20, TRUE),

(38, 'Siddhalepa Herbal Balm 50g Original Ayur Formula', 'Eucalyptus, Cinnamon & Herbal Ayurvedic Extract', 19, 14, 'Herbal Balm', '50g Glass Jar',
 'Traditional time-tested Sri Lankan herbal formula providing natural soothing comfort for headaches, joint pains, and cold symptoms.',
 'Warm soothing sensation on skin.',
 'Foment the affected area with warm water and apply balm gently. Repeat two to three times daily.', 450.00, 10.00, TRUE, 5.0, '/medicines/Siddhalepa Herbal Balm 50g Original Ayur Formula.jpg', TRUE, 30, TRUE)
ON DUPLICATE KEY UPDATE 
    name = VALUES(name),
    unit_price = VALUES(unit_price),
    discount_percent = VALUES(discount_percent),
    is_offer = VALUES(is_offer),
    rating = VALUES(rating),
    image_url = VALUES(image_url);

-- ------------------------------------------------------------
-- 5. SEED MEDICINE BATCHES (Granular Inventory with Expiration Dates)
-- ------------------------------------------------------------
INSERT INTO medicine_batches (
    batch_id, medicine_id, supplier_id, batch_number, 
    manufacture_date, expiry_date, quantity_received, 
    stock_quantity, reserved_quantity, unit_cost, status
) VALUES
-- Medicine 1: Augmentin 625mg
(1, 1, 1, 'AUG-2025-01', '2025-01-10', '2027-06-30', 100, 80, 0, 140.00, 'active'),
(2, 1, 2, 'AUG-2025-02', '2025-03-01', '2027-08-31', 60, 40, 0, 142.00, 'active'),
(3, 1, 1, 'AUG-2023-EX', '2023-01-01', '2024-01-01', 50, 20, 0, 120.00, 'active'),

-- Medicine 2: Amoxil 500mg
(4, 2, 1, 'AMX-2025-A1', '2025-02-15', '2027-04-15', 200, 150, 0, 70.00, 'active'),

-- Medicine 3: Ciprobay 500mg (LOW STOCK)
(5, 3, 3, 'CIP-2025-09', '2025-01-05', '2027-01-05', 50, 12, 0, 190.00, 'active'),

-- Medicine 4: Zithromax 250mg (OUT OF STOCK + RECALLED)
(6, 4, 2, 'ZIT-2024-04', '2024-05-10', '2026-11-10', 40, 0, 0, 260.00, 'depleted'),
(7, 4, 2, 'ZIT-2025-RC', '2025-02-01', '2027-05-01', 50, 45, 0, 260.00, 'recalled'),

-- Medicine 5: Panadol Extra
(8, 5, 1, 'PAN-2025-01', '2025-02-01', '2028-02-01', 400, 350, 0, 32.00, 'active'),

-- Medicine 6: Panadol Children Drops (LOW STOCK)
(9, 6, 1, 'PND-2025-DR', '2025-03-01', '2027-09-01', 30, 8, 0, 260.00, 'active'),

-- Medicine 7: Brufen 400mg
(10, 7, 4, 'BRU-2025-88', '2025-01-20', '2027-12-20', 120, 95, 0, 45.00, 'active'),

-- Medicine 8: Celebrex 200mg (LOW STOCK)
(11, 8, 2, 'CEL-2025-C1', '2025-02-10', '2027-03-10', 25, 6, 0, 320.00, 'active'),

-- Medicine 9: Lipitor 20mg
(12, 9, 2, 'LIP-2025-77', '2025-01-15', '2027-06-15', 100, 70, 0, 115.00, 'active'),

-- Medicine 10: Norvasc 5mg
(13, 10, 2, 'NOR-2025-11', '2025-02-20', '2027-08-20', 100, 85, 0, 78.00, 'active'),

-- Medicine 11: Cozaar 50mg (OUT OF STOCK)
(14, 11, 3, 'COZ-2024-55', '2024-03-01', '2026-09-01', 50, 0, 0, 105.00, 'depleted'),

-- Medicine 12: Betaloc 25mg
(15, 12, 4, 'BET-2025-22', '2025-01-10', '2027-05-10', 80, 60, 0, 65.00, 'active'),

-- Medicine 13: Ventolin Evohaler
(16, 13, 1, 'VEN-2025-V1', '2025-03-05', '2027-07-05', 50, 40, 0, 580.00, 'active'),

-- Medicine 14: Singulair 10mg (LOW STOCK)
(17, 14, 3, 'SNG-2025-44', '2025-02-12', '2027-02-12', 30, 9, 0, 210.00, 'active'),

-- Medicine 15: Zyrtec 10mg
(18, 15, 2, 'ZYR-2025-Z1', '2025-01-25', '2028-01-25', 150, 110, 0, 38.00, 'active'),

-- Medicine 16: Flixonase Aqueous Spray (OUT OF STOCK)
(19, 16, 1, 'FLX-2024-99', '2024-06-15', '2026-06-15', 25, 0, 0, 950.00, 'depleted'),

-- Medicine 17: Nexium 40mg
(20, 17, 4, 'NEX-2025-N4', '2025-03-01', '2027-09-01', 80, 65, 0, 165.00, 'active'),

-- Medicine 18: Controloc 40mg
(21, 18, 4, 'CTL-2025-C4', '2025-02-18', '2027-04-18', 60, 50, 0, 130.00, 'active'),

-- Medicine 19: Motilium 10mg (LOW STOCK)
(22, 19, 2, 'MOT-2025-M1', '2025-01-30', '2027-03-30', 40, 10, 0, 36.00, 'active'),

-- Medicine 20: Gaviscon Double Action
(23, 20, 1, 'GAV-2025-G2', '2025-02-10', '2027-08-10', 100, 85, 0, 68.00, 'active'),

-- Medicine 21: Glucophage 500mg
(24, 21, 3, 'GLU-2025-G5', '2025-01-08', '2028-01-08', 250, 220, 0, 24.00, 'active'),

-- Medicine 22: Amaryl 2mg (LOW STOCK)
(25, 22, 3, 'AMA-2025-A2', '2025-02-14', '2027-05-14', 40, 14, 0, 85.00, 'active'),

-- Medicine 23: Lantus SoloStar (LOW STOCK)
(26, 23, 3, 'LAN-2025-LS', '2025-03-01', '2027-12-01', 15, 4, 0, 2200.00, 'active'),

-- Medicine 24: Cevit 500mg
(27, 24, 4, 'CEV-2025-C5', '2025-02-01', '2028-02-01', 350, 300, 0, 16.00, 'active'),

-- Medicine 25: Ostocalcium D3
(28, 25, 1, 'OST-2025-D3', '2025-01-20', '2027-07-20', 150, 120, 0, 28.00, 'active'),

-- Medicine 26: Neurobion Forte
(29, 26, 2, 'NEU-2025-NF', '2025-02-15', '2027-08-15', 100, 80, 0, 48.00, 'active'),

-- Medicine 27: Fucidin Cream 2% (LOW STOCK)
(30, 27, 1, 'FUC-2025-FC', '2025-01-12', '2027-01-12', 20, 5, 0, 490.00, 'active'),

-- Wellness Batches (31 to 41)
(31, 28, 1, 'LOT-3M-2026', '2025-01-10', '2028-12-31', 35, 35, 0, 58000.00, 'active'),
(32, 29, 2, 'LOT-OMR-2026', '2025-02-10', '2028-12-31', 50, 50, 0, 3800.00, 'active'),
(33, 30, 3, 'LOT-SCM-2026', '2025-01-05', '2028-12-31', 120, 120, 0, 50.00, 'active'),
(34, 31, 2, 'LOT-ROCH-2026', '2025-03-01', '2027-09-30', 60, 60, 0, 3600.00, 'active'),
(35, 32, 4, 'LOT-ON-2026', '2025-02-20', '2027-10-31', 45, 45, 0, 14500.00, 'active'),
(36, 33, 4, 'LOT-CRV-2026', '2025-01-15', '2027-12-31', 40, 40, 0, 6900.00, 'active'),
(37, 34, 4, 'LOT-LRP-2026', '2025-03-01', '2027-12-31', 38, 38, 0, 7200.00, 'active'),
(38, 35, 2, 'LOT-SBM-2026', '2025-01-20', '2027-12-31', 55, 55, 0, 2800.00, 'active'),
(39, 36, 1, 'LOT-DTL-2026', '2025-02-01', '2028-02-01', 90, 90, 0, 1350.00, 'active'),
(40, 37, 4, 'LOT-WM-2026', '2025-01-10', '2027-08-31', 70, 70, 0, 3100.00, 'active'),
(41, 38, 5, 'LOT-SDH-2026', '2025-02-15', '2028-02-15', 150, 150, 0, 320.00, 'active')
ON DUPLICATE KEY UPDATE stock_quantity = VALUES(stock_quantity);

-- ------------------------------------------------------------
-- 6. SEED INITIAL STOCK MOVEMENTS
-- ------------------------------------------------------------
INSERT INTO stock_movements (batch_id, movement_type, quantity_changed, reason, performed_by) VALUES
(1, 'RESTOCK', 100, 'Initial wholesale warehouse stock delivery', 'Administrator'),
(1, 'DISPENSED', -20, 'Internal counter physical dispensation', 'Pharmacist'),
(4, 'RESTOCK', 200, 'Routine quarterly stock delivery', 'Administrator'),
(4, 'DISPENSED', -50, 'Prescription fulfillment', 'Pharmacist'),
(5, 'RESTOCK', 50, 'Emergency distributor replenishment', 'Administrator'),
(5, 'DISPENSED', -38, 'Routine walk-in dispensary sales', 'Pharmacist'),
(6, 'RESTOCK', 40, 'Initial batch receipt', 'Administrator'),
(6, 'DISPENSED', -40, 'Final stock depleted through dispensary', 'Pharmacist'),
(7, 'RECALL', -5, 'Manufacturer quality safety check recall', 'Quality Auditor');

-- ------------------------------------------------------------
-- 7. SEED USERS (Staff and Admin)
-- Passwords: admin123 and pharma123 (bcrypt hashed)
-- ------------------------------------------------------------
INSERT INTO users (user_id, username, email, password_hash, role, full_name, is_active) VALUES
(1, 'admin', 'admin@vdcstore.lk', '$2a$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQmG6Fe60E8A23d6aSTOm', 'ADMIN', 'Chief Pharmacy Administrator', TRUE),
(2, 'pharmacist', 'pharmacist@vdcstore.lk', '$2a$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQmG6Fe60E8A23d6aSTOm', 'PHARMACIST', 'Licensed Staff Pharmacist', TRUE)
ON DUPLICATE KEY UPDATE full_name = VALUES(full_name);

-- ------------------------------------------------------------
-- 8. SEED REGISTERED CUSTOMERS (Patients)
-- ------------------------------------------------------------
INSERT INTO customers (customer_id, full_name, email, password_hash, contact_no, patient_age, nic, address, is_active, status) VALUES
(1, 'Kasun Perera', 'kasun.perera@gmail.com', '$2a$10$7R53Yl5bX79d8y0/Hn86kO94kK2tQzV1Uu5w8r3.Yj8T9G1uM8tKy', '+94 77 123 4567', '34', '199012345678', '45 Temple Road, Nugegoda', TRUE, 'active'),
(2, 'Mrs. Champa Wickramasinghe', 'champa.w@gmail.com', '$2a$10$7R53Yl5bX79d8y0/Hn86kO94kK2tQzV1Uu5w8r3.Yj8T9G1uM8tKy', '+94 71 987 6543', '58', '196654321098', '12 Lake Drive, Colombo 05', TRUE, 'active'),
(3, 'Dr. Samantha Perera', 'samantha.perera@health.gov.lk', '$2a$10$7R53Yl5bX79d8y0/Hn86kO94kK2tQzV1Uu5w8r3.Yj8T9G1uM8tKy', '+94 76 555 4321', '46', '197822446688', '78 Kynsey Road, Colombo 08', TRUE, 'active'),
(4, 'Mr. Roshan De Silva', 'roshan.desilva@gmail.com', '$2a$10$7R53Yl5bX79d8y0/Hn86kO94kK2tQzV1Uu5w8r3.Yj8T9G1uM8tKy', '+94 72 333 8899', '42', '198233445566', '23 Baseline Road, Colombo 09', TRUE, 'active'),
(5, 'Amanda Rodrigo', 'amanda.rodrigo@outlook.com', '$2a$10$7R53Yl5bX79d8y0/Hn86kO94kK2tQzV1Uu5w8r3.Yj8T9G1uM8tKy', '+94 70 444 1122', '28', '199611223344', '56 Beach Road, Mount Lavinia', TRUE, 'active')
ON DUPLICATE KEY UPDATE full_name = VALUES(full_name);

-- ------------------------------------------------------------
-- 9. SEED PURCHASES & PURCHASE ITEMS
-- ------------------------------------------------------------
INSERT INTO purchases (purchase_id, supplier_id, invoice_number, purchase_date, total_amount, status, received_by, notes) VALUES
(1, 1, 'PO-2026-001', DATE_SUB(CURDATE(), INTERVAL 14 DAY), 45000.00, 'RECEIVED', 'Chief Administrator', 'Quarterly antibiotic restock'),
(2, 2, 'PO-2026-002', DATE_SUB(CURDATE(), INTERVAL 7 DAY), 62500.00, 'RECEIVED', 'Chief Administrator', 'Analgesics & cardiovascular formulations'),
(3, 3, 'PO-2026-003', DATE_SUB(CURDATE(), INTERVAL 2 DAY), 28400.00, 'RECEIVED', 'Licensed Pharmacist', 'Vitamins & Respiratory replenishment')
ON DUPLICATE KEY UPDATE invoice_number = VALUES(invoice_number);

INSERT INTO purchase_items (purchase_item_id, purchase_id, medicine_id, batch_number, quantity, unit_cost, subtotal, expiry_date) VALUES
(1, 1, 1, 'AUG-2026-01', 100, 140.00, 14000.00, DATE_ADD(CURDATE(), INTERVAL 365 DAY)),
(2, 1, 2, 'AMX-2026-01', 120, 32.00, 3840.00, DATE_ADD(CURDATE(), INTERVAL 400 DAY)),
(3, 2, 5, 'PAN-2026-01', 200, 4.50, 900.00, DATE_ADD(CURDATE(), INTERVAL 500 DAY)),
(4, 2, 9, 'LIP-2026-01', 80, 52.00, 4160.00, DATE_ADD(CURDATE(), INTERVAL 300 DAY)),
(5, 3, 13, 'VNT-2026-01', 30, 920.00, 27600.00, DATE_ADD(CURDATE(), INTERVAL 450 DAY))
ON DUPLICATE KEY UPDATE quantity = VALUES(quantity);

-- ------------------------------------------------------------
-- 11. SEED COUNTER SALES, ITEMS, ALLOCATIONS & PAYMENTS (Relational link to customers)
-- ------------------------------------------------------------
INSERT INTO sales (sale_id, invoice_number, user_id, customer_id, patient_name, prescription_ref, subtotal, discount_amount, tax_amount, total_amount, payment_status, sale_date) VALUES
(1, 'INV-2026-1001', 2, 2, 'Mrs. Champa Wickramasinghe', 'RX-SLMC-4921', 1850.00, 0.00, 0.00, 1850.00, 'PAID', DATE_SUB(NOW(), INTERVAL 3 DAY)),
(2, 'INV-2026-1002', 2, 4, 'Mr. Roshan De Silva', 'OTC-Walk-in', 150.00, 0.00, 0.00, 150.00, 'PAID', DATE_SUB(NOW(), INTERVAL 2 DAY)),
(3, 'INV-2026-1003', 2, 3, 'Dr. Samantha Perera', 'RX-SLMC-8812', 3450.00, 0.00, 0.00, 3450.00, 'PAID', DATE_SUB(NOW(), INTERVAL 1 DAY)),
(4, 'INV-2026-1004', 2, 1, 'Mr. Kasun Perera', 'RX-SLMC-1204', 1280.00, 0.00, 0.00, 1280.00, 'PAID', NOW()),
(5, 'INV-2026-1005', 2, NULL, 'Walk-in Customer', 'OTC-Walk-in', 420.00, 0.00, 0.00, 420.00, 'PAID', NOW())
ON DUPLICATE KEY UPDATE invoice_number = VALUES(invoice_number);

INSERT INTO sale_items (sale_item_id, sale_id, medicine_id, quantity, unit_price, subtotal, packaging_desc) VALUES
(1, 1, 1, 10, 185.00, 1850.00, '1 Card (10 Tablets)'),
(2, 2, 5, 20, 7.50, 150.00, '2 Cards (20 Tablets)'),
(3, 3, 13, 2, 1250.00, 2500.00, '2 Canisters (Inhalers)'),
(4, 3, 5, 10, 7.50, 75.00, '1 Card (10 Tablets)'),
(5, 3, 1, 4, 185.00, 740.00, '4 Loose Tablets'),
(6, 4, 9, 8, 160.00, 1280.00, '8 Tablets'),
(7, 5, 20, 4, 90.00, 360.00, '4 Sachets')
ON DUPLICATE KEY UPDATE quantity = VALUES(quantity);

INSERT INTO sale_item_batches (allocation_id, sale_item_id, batch_id, quantity_allocated) VALUES
(1, 1, 1, 10),
(2, 2, 8, 20),
(3, 3, 16, 2),
(4, 4, 8, 10),
(5, 5, 1, 4),
(6, 6, 12, 8),
(7, 7, 23, 4)
ON DUPLICATE KEY UPDATE quantity_allocated = VALUES(quantity_allocated);

INSERT INTO payments (payment_id, sale_id, payment_method, amount_paid, change_given, reference_note, payment_date) VALUES
(1, 1, 'CASH', 2000.00, 150.00, 'Counter POS Cash Receipt #INV-2026-1001', DATE_SUB(NOW(), INTERVAL 3 DAY)),
(2, 2, 'CASH', 200.00, 50.00, 'Counter POS Cash Receipt #INV-2026-1002', DATE_SUB(NOW(), INTERVAL 2 DAY)),
(3, 3, 'CARD', 3450.00, 0.00, 'POS Visa Auth #984210 #INV-2026-1003', DATE_SUB(NOW(), INTERVAL 1 DAY)),
(4, 4, 'CARD', 1280.00, 0.00, 'POS Master Auth #441920 #INV-2026-1004', NOW()),
(5, 5, 'CASH', 500.00, 80.00, 'Counter POS Cash Receipt #INV-2026-1005', NOW())
ON DUPLICATE KEY UPDATE amount_paid = VALUES(amount_paid);

-- ------------------------------------------------------------
-- 12. SEED CUSTOMER REVIEWS (Replacing Browser localStorage)
-- ------------------------------------------------------------
INSERT INTO customer_reviews (review_id, customer_id, medicine_id, patient_name, role_title, rating, comment, category, is_verified, helpful_count, is_approved, avatar_color) VALUES
(1, 3, 9, 'Dr. Senaka Wickramasinghe', 'Consultant Physician', 5, 
 'Exceptional inventory tracking. Being able to check real-time availability of specialized cardiac medications (Norvasc, Lipitor) before driving to the counter saved immense time for my patients.', 
 'Cardiovascular Care', TRUE, 24, TRUE, 'from-blue-600 to-indigo-600'),

(2, NULL, 6, 'Nadeesha Senanayake', 'Mother of two', 5, 
 'The beauty & baby wellness collection is authentic and carefully handled. The Sebamed baby products and Panadol infant drops were in fresh condition with long expiry dates.', 
 'Baby & Pediatric Care', TRUE, 19, TRUE, 'from-pink-500 to-rose-500'),

(3, 1, 23, 'Mahesh Bandara', 'Chronic Care Patient', 5, 
 'I rely on Lantus SoloStar insulin pens monthly. The dispensary strictly follows the 2°C – 8°C cold-chain protocol with temperature monitored transport packs. Highly dependable!', 
 'Cold-Chain Insulin', TRUE, 31, TRUE, 'from-teal-600 to-emerald-600'),

(4, NULL, 32, 'Dilini Karunaratne', 'Fitness Enthusiast', 5, 
 'Purchased Optimum Nutrition whey and Vitabiotics multivitamins. Excellent price with genuine hologram labels. Much better than shady online sellers!', 
 'Diet & Nutrition', TRUE, 14, TRUE, 'from-amber-500 to-orange-500'),

(5, 2, 11, 'K. V. Perera', 'Senior Citizen', 5, 
 'Very professional dispensary staff. They checked my doctor prescription thoroughly and explained the dosage schedule for Cozaar and Betaloc with clear instructions.', 
 'Hypertension Care', TRUE, 22, TRUE, 'from-purple-600 to-indigo-600'),

(6, 5, 34, 'Amanda Rodrigo', 'Verified Customer', 5, 
 'The CeraVe cleanser and La Roche-Posay SPF 50+ are 100% original imported stock. Great customer support and genuine medical-grade skincare options.', 
 'Beauty & Skincare', TRUE, 18, TRUE, 'from-emerald-600 to-teal-600')
ON DUPLICATE KEY UPDATE patient_name = VALUES(patient_name), comment = VALUES(comment);

-- ------------------------------------------------------------
-- 14. SEED CUSTOMER INQUIRIES (Replacing Random React State)
-- ------------------------------------------------------------
INSERT INTO inquiries (inquiry_id, reference_code, customer_id, name, phone, email, medicine_query, message, status, staff_notes, responded_by, responded_at) VALUES
(1, 'INQ-481920', 1, 'Kasun Perera', '+94 77 123 4567', 'kasun.perera@gmail.com', 'Lantus SoloStar cold storage refill', 'Do you have cold storage insulated gel packs for Lantus insulin pickup this Friday afternoon?', 'RESOLVED', 'Advised patient that free insulated gel packs are provided with all insulin orders.', 'Staff Pharmacist', NOW()),
(2, 'INQ-552194', 4, 'Mr. Roshan De Silva', '+94 72 333 8899', 'roshan.desilva@gmail.com', 'Norvasc 5mg stock inquiry', 'Can I reserve two 30-tablet boxes of Norvasc 5mg for collection tomorrow morning?', 'IN_REVIEW', 'Batch #NOR-2025-11 checked. Stock reserved.', 'Staff Pharmacist', NOW()),
(3, 'INQ-819302', NULL, 'Lakshmi Jayasinghe', '+94 71 222 9988', 'lakshmi.j@gmail.com', 'Pediatric Ventolin syrup alternative', 'Is Salbutamol pediatric syrup available, or is the Evohaler the only active option?', 'NEW', NULL, NULL, NULL)
ON DUPLICATE KEY UPDATE reference_code = VALUES(reference_code);

-- ------------------------------------------------------------
-- 15. SEED PRESCRIPTION ORDERS & NORMALIZED PRESCRIPTION FILES
-- ------------------------------------------------------------
INSERT INTO prescription_orders (
    order_id, account_type, customer_id, your_name, your_email, 
    patient_name, patient_age, contact_no, delivery_option, 
    files_count, message, status, pharmacist_name, reviewed_at, 
    confirmation_message, rejection_reason, ready_time, email_sent, email_sent_at
) VALUES
('RX-2026-8910', 'registered', 1, 'Kasun Perera', 'kasun.perera@gmail.com', 
 'Sunil Perera (Father)', '68', '+94 77 123 4567', 'Dispensary Counter Pickup (Free)',
 1, 'Monthly chronic medication refill for Hypertension and Diabetes.', 'accepted', 
 'Licensed Staff Pharmacist', NOW(), 'Prescription validated by supervising pharmacist. Please bring your original SLMC doctor prescription for counter stamp verification.',
 NULL, 'Today after 4:00 PM', 1, NOW()),

('RX-2026-8911', 'registered', 1, 'Kasun Perera', 'kasun.perera@gmail.com', 
 'Kasun Perera', '38', '+94 77 123 4567', 'Doorstep Courier Delivery (Flat Rs. 350)',
 1, 'Antibiotic prescription refill for Amoxicillin capsules.', 'rejected', 
 'Supervising Clinical Pharmacist', NOW(), NULL,
 'Doctor license seal and date of prescription are illegible or missing. SLMC regulations require an authorized physical seal for scheduled antibiotics.',
 NULL, 1, NOW()),

('RX-2026-8908', 'registered', 2, 'Mrs. Champa Wickramasinghe', 'champa.w@gmail.com', 
 'Mrs. Champa Wickramasinghe', '58', '+94 71 987 6543', 'Doorstep Courier Delivery (Flat Rs. 350)',
 1, 'Lipitor and Cozaar prescription uploaded for delivery.', 'pending', 
 NULL, NULL, NULL, NULL, NULL, 0, NULL)
ON DUPLICATE KEY UPDATE order_id = VALUES(order_id);

INSERT INTO prescription_files (file_id, order_id, file_path, file_name, file_type, file_size) VALUES
(1, 'RX-2026-8910', '/uploads/prescriptions/rx_sample_perera_2026.pdf', 'SLMC_Doctor_Prescription_Cardiology.pdf', 'application/pdf', 245000),
(2, 'RX-2026-8908', '/uploads/prescriptions/rx_sample_champa_2026.jpg', 'Doctor_Prescription_Refill.jpg', 'image/jpeg', 185000)
ON DUPLICATE KEY UPDATE file_id = VALUES(file_id);

-- ------------------------------------------------------------
-- 16. SEED NOTIFICATION LOGS (Replacing JSON Disk Outbox)
-- ------------------------------------------------------------
INSERT INTO notification_logs (notification_id, order_id, customer_id, recipient_email, recipient_name, subject, message_body, notification_type, status, sent_at) VALUES
(1, 'RX-2026-8910', 1, 'kasun.perera@gmail.com', 'Kasun Perera', 
 'Prescription Order Confirmed [RX-2026-8910] — Ready for Pickup', 
 'Dear Kasun Perera, Great news! Your prescription order RX-2026-8910 has been accepted by our pharmacist and will be ready after 4:00 PM.',
 'PRESCRIPTION_ACCEPTED', 'SENT', NOW()),
(2, 'RX-2026-8908', 2, 'champa.w@gmail.com', 'Mrs. Champa Wickramasinghe', 
 'Prescription Order Received [RX-2026-8908] — Under Review', 
 'Dear Mrs. Champa Wickramasinghe, We have successfully received your prescription upload. A pharmacist will review it shortly.',
 'PRESCRIPTION_RECEIVED', 'SENT', NOW())
ON DUPLICATE KEY UPDATE notification_id = VALUES(notification_id);
