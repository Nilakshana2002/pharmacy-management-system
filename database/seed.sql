-- ============================================================
-- VDC STORE PHARMACY MANAGEMENT SYSTEM
-- Seed Sample Data (MySQL 8.0+)
-- Module: Advanced Database Management System (ADBMS) Coursework
-- ============================================================

USE pharmacy_db;

-- ------------------------------------------------------------
-- 1. SEED BRANDS
-- ------------------------------------------------------------
INSERT INTO brands (brand_id, brand_name, country_of_origin) VALUES
(1, 'Pfizer Inc.', 'United States'),
(2, 'GlaxoSmithKline (GSK)', 'United Kingdom'),
(3, 'Novartis Pharmaceuticals', 'Switzerland'),
(4, 'Sanofi S.A.', 'France'),
(5, 'AstraZeneca plc', 'United Kingdom / Sweden'),
(6, 'Johnson & Johnson', 'United States'),
(7, 'Bayer AG', 'Germany'),
(8, 'Cipla Ltd.', 'India');

-- ------------------------------------------------------------
-- 2. SEED MEDICINE CATEGORIES
-- ------------------------------------------------------------
INSERT INTO medicine_categories (category_id, category_name, description, icon_name) VALUES
(1, 'Antibiotics & Antimicrobials', 'Medicines that fight bacterial infections in humans and animals.', 'ShieldAlert'),
(2, 'Analgesics & Pain Relief', 'Medications designed specifically to relieve various forms of acute and chronic pain.', 'Activity'),
(3, 'Cardiovascular & Blood Pressure', 'Medications for hypertension, cholesterol, angina, and heart health.', 'Heart'),
(4, 'Respiratory & Allergy', 'Inhalers, antihistamines, and bronchodilators for asthma and breathing conditions.', 'Wind'),
(5, 'Gastrointestinal & Antacids', 'Remedies for acid reflux, ulcers, digestion, nausea, and gut flora.', 'Stomach'),
(6, 'Endocrine & Antidiabetic', 'Insulin therapies and oral medications for blood glucose regulation.', 'Zap'),
(7, 'Vitamins & Dietary Supplements', 'Essential micronutrients, immune support supplements, and mineral formulations.', 'Sun'),
(8, 'Dermatology & Skin Care', 'Topical ointments, corticosteroids, and antibacterial creams.', 'Sparkles');

-- ------------------------------------------------------------
-- 3. SEED SUPPLIERS
-- ------------------------------------------------------------
INSERT INTO suppliers (supplier_id, supplier_name, contact_person, phone, email, address, is_active) VALUES
(1, 'Apex Pharma Distributors', 'Dr. Sunil Jayawardena', '+94 11 234 5678', 'orders@apexpharma.lk', '45 Hospital Road, Colombo 07', TRUE),
(2, 'Global Healthcare Logistics', 'Ms. Anusha Fernando', '+94 11 789 0123', 'supply@globalhealth.com', '12 Industrial Zone, Biyagama', TRUE),
(3, 'MedSupply Ceylon Ltd.', 'Mr. K. Perera', '+94 81 223 4455', 'sales@medsupplyceylon.com', '88 Kandy Road, Peradeniya', TRUE),
(4, 'BioTech Prime Wholesalers', 'Mr. David Silva', '+94 91 222 3344', 'contact@biotechprime.lk', '34 Galle Road, Galle', TRUE),
(5, 'VDC Central Depot', 'Logistics Director', '+94 11 555 9900', 'depot@vdcstore.lk', '01 Main Street, Colombo 01', TRUE);

-- ------------------------------------------------------------
-- 4. SEED MEDICINES (25+ Realistic Formulations)
-- ------------------------------------------------------------
INSERT INTO medicines (
    medicine_id, name, generic_name, brand_id, category_id, 
    dosage_form, strength, description, side_effects, 
    usage_instructions, unit_price, is_public_price, low_stock_threshold, is_active
) VALUES
-- Category 1: Antibiotics
(1, 'Augmentin 625mg', 'Amoxicillin + Clavulanate Potassium', 2, 1, 'Tablet', '625mg', 
 'Broad-spectrum antibiotic used to treat bacterial infections of the respiratory tract, urinary tract, ear, and skin.', 
 'Mild diarrhea, nausea, skin rash. Consult doctor if severe.', 
 'Take with a meal or light snack to reduce stomach discomfort every 12 hours as prescribed.', 185.00, TRUE, 25, TRUE),

(2, 'Amoxil 500mg', 'Amoxicillin Trihydrate', 2, 1, 'Capsule', '500mg', 
 'Penicillin antibiotic used to treat a wide variety of bacterial infections including chest infections and dental abscesses.', 
 'Nausea, allergic reaction, headache.', 
 'Swallow whole with water every 8 hours. Complete full course.', 95.00, TRUE, 30, TRUE),

(3, 'Ciprobay 500mg', 'Ciprofloxacin Hydrochloride', 7, 1, 'Tablet', '500mg', 
 'Fluoroquinolone antibiotic used for severe bacterial infections, complicated UTIs, and abdominal infections.', 
 'Dizziness, tendon discomfort, photosensitivity.', 
 'Drink plenty of water. Do not take with dairy products simultaneously.', 240.00, TRUE, 20, TRUE),

(4, 'Zithromax 250mg', 'Azithromycin Dihydrate', 1, 1, 'Capsule', '250mg', 
 'Macrolide antibiotic commonly prescribed for sinus, respiratory, and soft tissue infections.', 
 'Abdominal cramps, loose stools.', 
 'Take once daily either 1 hour before or 2 hours after meals.', 320.00, TRUE, 20, TRUE),

-- Category 2: Analgesics & Pain Relief
(5, 'Panadol Extra', 'Paracetamol + Caffeine', 2, 2, 'Tablet', '500mg / 65mg', 
 'Enhanced pain reliever for tough headaches, migraines, muscular aches, and fever.', 
 'Insomnia, restlessness if taken late in evening.', 
 '1 to 2 tablets every 4 to 6 hours as required. Do not exceed 8 tablets in 24 hours.', 45.00, TRUE, 50, TRUE),

(6, 'Panadol Children Drops', 'Paracetamol', 2, 2, 'Drops', '100mg/ml', 
 'Gentle and effective relief of fever and pain for infants and toddlers.', 
 'Rare when given within recommended pediatric dosage.', 
 'Administer using calibrated dropper strictly according to child weight.', 350.00, TRUE, 15, TRUE),

(7, 'Brufen 400mg', 'Ibuprofen', 8, 2, 'Tablet', '400mg', 
 'Non-steroidal anti-inflammatory drug (NSAID) for inflammatory pain, arthritis, toothache, and menstrual cramps.', 
 'Heartburn, mild stomach upset.', 
 'Always take with food or immediately after a meal.', 65.00, TRUE, 35, TRUE),

(8, 'Celebrex 200mg', 'Celecoxib', 1, 2, 'Capsule', '200mg', 
 'Selective COX-2 inhibitor for osteoarthritis, rheumatoid arthritis, and acute pain.', 
 'Fluid retention, indigestion.', 
 'Take once or twice daily with food as instructed by physician.', 410.00, TRUE, 15, TRUE),

-- Category 3: Cardiovascular
(9, 'Lipitor 20mg', 'Atorvastatin Calcium', 1, 3, 'Tablet', '20mg', 
 'HMG-CoA reductase inhibitor (statin) used to lower LDL cholesterol and triglyceride levels.', 
 'Muscle aches, mild liver enzyme variation.', 
 'Take once daily in the evening with or without food.', 160.00, TRUE, 25, TRUE),

(10, 'Norvasc 5mg', 'Amlodipine Besylate', 1, 3, 'Tablet', '5mg', 
 'Calcium channel blocker prescribed for hypertension and chronic stable angina.', 
 'Peripheral edema (ankle swelling), flushing, dizziness.', 
 'Take once daily in the morning with a glass of water.', 110.00, TRUE, 30, TRUE),

(11, 'Cozaar 50mg', 'Losartan Potassium', 3, 3, 'Tablet', '50mg', 
 'Angiotensin II receptor antagonist (ARB) for blood pressure control and kidney protection in diabetic patients.', 
 'Dizziness, low blood pressure on standing.', 
 'Take consistently once daily at the same time.', 145.00, TRUE, 20, TRUE),

(12, 'Betaloc 25mg', 'Metoprolol Tartrate', 5, 3, 'Tablet', '25mg', 
 'Beta-blocker used to regulate cardiac rhythm, treat high blood pressure, and prevent heart complications.', 
 'Slow heart rate, fatigue, cold extremities.', 
 'Take during or immediately following a meal.', 90.00, TRUE, 20, TRUE),

-- Category 4: Respiratory & Allergy
(13, 'Ventolin Evohaler', 'Salbutamol Sulfate', 2, 4, 'Inhaler', '100mcg/dose', 
 'Rapid-acting bronchodilator for prompt relief of bronchospasm in asthma and COPD.', 
 'Fine tremor, transient palpitations, nervousness.', 
 'Inhale 1 to 2 puffs during acute wheezing or 15 mins prior to exercise.', 750.00, TRUE, 20, TRUE),

(14, 'Singulair 10mg', 'Montelukast Sodium', 3, 4, 'Tablet', '10mg', 
 'Leukotriene receptor antagonist for maintenance asthma therapy and seasonal allergic rhinitis.', 
 'Headache, vivid dreams, upper respiratory symptoms.', 
 'Take one tablet orally every evening before sleep.', 280.00, TRUE, 20, TRUE),

(15, 'Zyrtec 10mg', 'Cetirizine Hydrochloride', 6, 4, 'Tablet', '10mg', 
 'Second-generation antihistamine for relief of hay fever, urticaria (hives), and runny nose.', 
 'Mild drowsiness, dry mouth.', 
 'Take one tablet once daily with water.', 55.00, TRUE, 40, TRUE),

(16, 'Flixonase Aqueous Spray', 'Fluticasone Propionate', 2, 4, 'Nasal Spray', '50mcg/spray', 
 'Topical nasal corticosteroid for preventive relief of allergic rhinitis and nasal congestion.', 
 'Nose irritation, occasional dryness.', 
 'Administer 1 to 2 sprays in each nostril once daily in the morning.', 1250.00, TRUE, 15, TRUE),

-- Category 5: Gastrointestinal & Antacids
(17, 'Nexium 40mg', 'Esomeprazole Magnesium', 5, 5, 'Tablet', '40mg', 
 'Proton pump inhibitor (PPI) for healing erosive esophagitis and treating gastroesophageal reflux disease (GERD).', 
 'Headache, constipation, abdominal pain.', 
 'Take at least 1 hour before breakfast with a glass of water.', 220.00, TRUE, 30, TRUE),

(18, 'Controloc 40mg', 'Pantoprazole Sodium', 7, 5, 'Tablet', '40mg', 
 'Acid-suppressive medication for gastric and duodenal ulcers, and acid hypersecretion.', 
 'Nausea, flatulence.', 
 'Swallow tablet whole; do not chew or crush before meals.', 175.00, TRUE, 25, TRUE),

(19, 'Motilium 10mg', 'Domperidone', 6, 5, 'Tablet', '10mg', 
 'Dopamine antagonist antiemetic used to relieve nausea, vomiting, and feelings of fullness.', 
 'Dry mouth, rarely drowsiness.', 
 'Take 15 to 30 minutes before meals.', 50.00, TRUE, 25, TRUE),

(20, 'Gaviscon Double Action', 'Sodium Alginate + Potassium Bicarbonate', 2, 5, 'Suspension', '10ml sachet', 
 'Fast-acting raft-forming liquid for quick suppression of heartburn and indigestion.', 
 'Occasional bloating if overused.', 
 'Take 10ml to 20ml after meals and at bedtime.', 90.00, TRUE, 40, TRUE),

-- Category 6: Endocrine & Antidiabetic
(21, 'Glucophage 500mg', 'Metformin Hydrochloride', 4, 6, 'Tablet', '500mg', 
 'First-line biguanide oral antihyperglycemic for Type 2 diabetes mellitus management.', 
 'Metallic taste, gastrointestinal disturbances.', 
 'Take with or immediately after meals to reduce stomach upset.', 35.00, TRUE, 50, TRUE),

(22, 'Amaryl 2mg', 'Glimepiride', 4, 6, 'Tablet', '2mg', 
 'Sulfonylurea oral hypoglycemic agent stimulating insulin release from beta cells.', 
 'Hypoglycemia (low blood sugar), weight gain.', 
 'Take immediately before or during the first main meal of the day.', 120.00, TRUE, 20, TRUE),

(23, 'Lantus SoloStar', 'Insulin Glargine', 4, 6, 'Injection', '100 IU/ml (3ml pen)', 
 'Long-acting basal insulin analog providing steady 24-hour glucose regulation.', 
 'Hypoglycemia, local injection site reaction.', 
 'Subcutaneous injection once daily at the same time every day. Keep refrigerated.', 2850.00, TRUE, 10, TRUE),

-- Category 7: Vitamins & Supplements
(24, 'Cevit 500mg Chewable', 'Ascorbic Acid (Vitamin C)', 8, 7, 'Tablet', '500mg', 
 'Essential antioxidant vitamin for immune system resilience, collagen synthesis, and iron absorption.', 
 'Stomach irritation with extremely high doses.', 
 'Chew or dissolve in mouth 1 tablet daily after food.', 25.00, TRUE, 60, TRUE),

(25, 'Ostocalcium D3', 'Calcium + Vitamin D3 (Cholecalciferol)', 2, 7, 'Tablet', '500mg / 400 IU', 
 'Bone density support supplement for prevention and treatment of calcium and vitamin D deficiency.', 
 'Mild constipation in sensitive individuals.', 
 'Take 1 tablet twice daily with food.', 40.00, TRUE, 45, TRUE),

(26, 'Neurobion Forte', 'Vitamin B1 + B6 + B12', 3, 7, 'Tablet', 'Combination', 
 'Neurotropic B-vitamin complex for peripheral neuropathy, nerve health, and cellular metabolism.', 
 'Bright yellow urine (normal harmless riboflavin excretion).', 
 'Take 1 tablet daily after main meal.', 65.00, TRUE, 30, TRUE),

-- Category 8: Dermatology
(27, 'Fucidin Cream 2%', 'Sodium Fusidate', 1, 8, 'Cream', '15g Tube', 
 'Potent topical antibacterial agent for localized skin infections including impetigo and infected dermatitis.', 
 'Mild stinging at site of application.', 
 'Apply thinly to affected area 2 to 3 times daily.', 680.00, TRUE, 15, TRUE);

-- ------------------------------------------------------------
-- 5. SEED MEDICINE BATCHES
-- Demonstrating In Stock, Low Stock, Out of Stock,
-- Expired batches (EXCLUDED from availability),
-- and Recalled batches (EXCLUDED from availability)
-- ------------------------------------------------------------
INSERT INTO medicine_batches (
    batch_id, medicine_id, supplier_id, batch_number, 
    manufacture_date, expiry_date, quantity_received, 
    stock_quantity, reserved_quantity, unit_cost, status
) VALUES
-- Medicine 1: Augmentin 625mg -> IN STOCK (Multiple active batches, total stock 120 > 25)
(1, 1, 1, 'AUG-2025-01', '2025-01-10', '2027-06-30', 100, 80, 0, 140.00, 'active'),
(2, 1, 2, 'AUG-2025-02', '2025-03-01', '2027-08-31', 60, 40, 0, 142.00, 'active'),
-- Expired batch for Medicine 1 (Should be ignored by availability calculation)
(3, 1, 1, 'AUG-2023-EX', '2023-01-01', '2024-01-01', 50, 20, 0, 120.00, 'active'),

-- Medicine 2: Amoxil 500mg -> IN STOCK (Total active stock 150 > 30)
(4, 2, 1, 'AMX-2025-A1', '2025-02-15', '2027-04-15', 200, 150, 0, 70.00, 'active'),

-- Medicine 3: Ciprobay 500mg -> LOW STOCK (Active stock 12 <= threshold 20)
(5, 3, 3, 'CIP-2025-09', '2025-01-05', '2027-01-05', 50, 12, 0, 190.00, 'active'),

-- Medicine 4: Zithromax 250mg -> OUT OF STOCK (All active stock depleted)
(6, 4, 2, 'ZIT-2024-04', '2024-05-10', '2026-11-10', 40, 0, 0, 260.00, 'depleted'),
-- Recalled batch for Medicine 4 (Should NOT make it in stock because status is 'recalled')
(7, 4, 2, 'ZIT-2025-RC', '2025-02-01', '2027-05-01', 50, 45, 0, 260.00, 'recalled'),

-- Medicine 5: Panadol Extra -> IN STOCK (Active stock 350 > 50)
(8, 5, 1, 'PAN-2025-01', '2025-02-01', '2028-02-01', 400, 350, 0, 32.00, 'active'),

-- Medicine 6: Panadol Children Drops -> LOW STOCK (Active stock 8 <= threshold 15)
(9, 6, 1, 'PND-2025-DR', '2025-03-01', '2027-09-01', 30, 8, 0, 260.00, 'active'),

-- Medicine 7: Brufen 400mg -> IN STOCK (Active stock 95 > 35)
(10, 7, 4, 'BRU-2025-88', '2025-01-20', '2027-12-20', 120, 95, 0, 45.00, 'active'),

-- Medicine 8: Celebrex 200mg -> LOW STOCK (Active stock 6 <= threshold 15)
(11, 8, 2, 'CEL-2025-C1', '2025-02-10', '2027-03-10', 25, 6, 0, 320.00, 'active'),

-- Medicine 9: Lipitor 20mg -> IN STOCK (Active stock 70 > 25)
(12, 9, 2, 'LIP-2025-77', '2025-01-15', '2027-06-15', 100, 70, 0, 115.00, 'active'),

-- Medicine 10: Norvasc 5mg -> IN STOCK (Active stock 85 > 30)
(13, 10, 2, 'NOR-2025-11', '2025-02-20', '2027-08-20', 100, 85, 0, 78.00, 'active'),

-- Medicine 11: Cozaar 50mg -> OUT OF STOCK (Active stock 0)
(14, 11, 3, 'COZ-2024-55', '2024-03-01', '2026-09-01', 50, 0, 0, 105.00, 'depleted'),

-- Medicine 12: Betaloc 25mg -> IN STOCK (Active stock 60 > 20)
(15, 12, 4, 'BET-2025-22', '2025-01-10', '2027-05-10', 80, 60, 0, 65.00, 'active'),

-- Medicine 13: Ventolin Evohaler -> IN STOCK (Active stock 40 > 20)
(16, 13, 1, 'VEN-2025-V1', '2025-03-05', '2027-07-05', 50, 40, 0, 580.00, 'active'),

-- Medicine 14: Singulair 10mg -> LOW STOCK (Active stock 9 <= threshold 20)
(17, 14, 3, 'SNG-2025-44', '2025-02-12', '2027-02-12', 30, 9, 0, 210.00, 'active'),

-- Medicine 15: Zyrtec 10mg -> IN STOCK (Active stock 110 > 40)
(18, 15, 2, 'ZYR-2025-Z1', '2025-01-25', '2028-01-25', 150, 110, 0, 38.00, 'active'),

-- Medicine 16: Flixonase Aqueous Spray -> OUT OF STOCK (Active stock 0)
(19, 16, 1, 'FLX-2024-99', '2024-06-15', '2026-06-15', 25, 0, 0, 950.00, 'depleted'),

-- Medicine 17: Nexium 40mg -> IN STOCK (Active stock 65 > 30)
(20, 17, 4, 'NEX-2025-N4', '2025-03-01', '2027-09-01', 80, 65, 0, 165.00, 'active'),

-- Medicine 18: Controloc 40mg -> IN STOCK (Active stock 50 > 25)
(21, 18, 4, 'CTL-2025-C4', '2025-02-18', '2027-04-18', 60, 50, 0, 130.00, 'active'),

-- Medicine 19: Motilium 10mg -> LOW STOCK (Active stock 10 <= threshold 25)
(22, 19, 2, 'MOT-2025-M1', '2025-01-30', '2027-03-30', 40, 10, 0, 36.00, 'active'),

-- Medicine 20: Gaviscon Double Action -> IN STOCK (Active stock 85 > 40)
(23, 20, 1, 'GAV-2025-G2', '2025-02-10', '2027-08-10', 100, 85, 0, 68.00, 'active'),

-- Medicine 21: Glucophage 500mg -> IN STOCK (Active stock 220 > 50)
(24, 21, 3, 'GLU-2025-G5', '2025-01-08', '2028-01-08', 250, 220, 0, 24.00, 'active'),

-- Medicine 22: Amaryl 2mg -> LOW STOCK (Active stock 14 <= threshold 20)
(25, 22, 3, 'AMA-2025-A2', '2025-02-14', '2027-05-14', 40, 14, 0, 85.00, 'active'),

-- Medicine 23: Lantus SoloStar -> LOW STOCK (Active stock 4 <= threshold 10)
(26, 23, 3, 'LAN-2025-LS', '2025-03-01', '2026-12-01', 15, 4, 0, 2200.00, 'active'),

-- Medicine 24: Cevit 500mg -> IN STOCK (Active stock 300 > 60)
(27, 24, 4, 'CEV-2025-C5', '2025-02-01', '2028-02-01', 350, 300, 0, 16.00, 'active'),

-- Medicine 25: Ostocalcium D3 -> IN STOCK (Active stock 120 > 45)
(28, 25, 1, 'OST-2025-D3', '2025-01-20', '2027-07-20', 150, 120, 0, 28.00, 'active'),

-- Medicine 26: Neurobion Forte -> IN STOCK (Active stock 80 > 30)
(29, 26, 2, 'NEU-2025-NF', '2025-02-15', '2027-08-15', 100, 80, 0, 48.00, 'active'),

-- Medicine 27: Fucidin Cream 2% -> LOW STOCK (Active stock 5 <= threshold 15)
(30, 27, 1, 'FUC-2025-FC', '2025-01-12', '2027-01-12', 20, 5, 0, 490.00, 'active');

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
-- Passwords:
-- admin@vdcstore.com: admin123 ($2a$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQmG6Fe60E8A23d6aSTOm)
-- pharmacist@vdcstore.com: pharma123 ($2a$10$V0JqJ2bLzT16W24g3zR6eOMjLzK0jL8q4uE1b0y1P0P3r7Y5g5g0m)
-- ------------------------------------------------------------
INSERT INTO users (user_id, username, email, password_hash, role, full_name, is_active) VALUES
(1, 'admin', 'admin@vdcstore.com', '$2a$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQmG6Fe60E8A23d6aSTOm', 'ADMIN', 'Chief Pharmacy Administrator', TRUE),
(2, 'pharmacist', 'pharmacist@vdcstore.com', '$2a$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQmG6Fe60E8A23d6aSTOm', 'PHARMACIST', 'Licensed Staff Pharmacist', TRUE);

-- ------------------------------------------------------------
-- 8. SEED PHARMACY SETTINGS (Public & Internal)
-- ------------------------------------------------------------
INSERT INTO pharmacy_settings (setting_key, setting_value, description, is_public) VALUES
('store_name', 'VDC Store Pharmacy', 'Official legal pharmacy name', TRUE),
('tagline', 'Your Trusted Health & Medicine Information Partner', 'Pharmacy branding slogan', TRUE),
('phone_primary', '+94 11 234 5678', 'Main dispensary telephone helpline', TRUE),
('phone_hotline', '+94 77 123 4567', '24/7 Pharmacist emergency inquiry hotline', TRUE),
('email', 'info@vdcstore.com', 'General inquiries email address', TRUE),
('address_street', '124 Galle Road, Bambalapitiya', 'Physical premises address', TRUE),
('address_city', 'Colombo 04, Sri Lanka', 'City and district', TRUE),
('hours_weekday', '8:00 AM – 10:00 PM', 'Monday to Friday opening schedule', TRUE),
('hours_saturday', '8:30 AM – 9:00 PM', 'Saturday opening schedule', TRUE),
('hours_sunday', '9:00 AM – 6:00 PM', 'Sunday and Poya day opening schedule', TRUE),
('announcement', 'VDC Store provides real-time medicine availability verification. Please visit our physical pharmacy counter for dispensing.', 'Public alert banner', TRUE),
('default_low_stock_threshold', '20', 'Internal stock alarm trigger level', FALSE),
('system_version', '2.0.0-ADBMS', 'Software release identification', FALSE);
