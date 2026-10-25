/**
 * Comprehensive Formulary Dosage and Packaging Forms
 * Organized into clinical and dispensing packaging categories:
 * - Oral Solids (Tablets, Capsules, Lozenges)
 * - Boxes & Packets (Box of 10/20/30/50/100, Packets, Sachets, Blister Strips)
 * - Liquids & Volume Forms (Syrups, Suspensions, Bottles in 60ml-500ml, Liters: 1L, 2L, 5L)
 * - Topical & External (Creams, Ointments, Gels, Tubes)
 * - Inhalation (Inhalers, Sprays, Respules)
 * - Injectables (Vials, Ampoules, Infusions)
 * - Ophthalmic & Otic (Eye & Ear Drops)
 * - Devices & Diagnostics
 */

export const DOSAGE_AND_PACKAGING_GROUPS = [
  {
    category: 'Oral Solids (Tablets & Capsules)',
    items: [
      'Tablet',
      'Capsule',
      'Caplet',
      'Chewable Tablet',
      'Effervescent Tablet',
      'Dispersible Tablet',
      'Sublingual Tablet',
      'Lozenge / Troche',
      'Granules / Powder'
    ]
  },
  {
    category: 'Boxes, Packets & Multi-Packs',
    items: [
      'Box',
      'Box of 10',
      'Box of 20',
      'Box of 30',
      'Box of 50',
      'Box of 100',
      'Box of 500',
      'Packet',
      'Packet / Sachet',
      'Blister Strip',
      'Card (10 Tablets)',
      'Carton / Multi-Pack'
    ]
  },
  {
    category: 'Liquids, Solutions & Liters',
    items: [
      'Syrup',
      'Suspension',
      'Oral Solution',
      'Drops (Oral / Pediatric)',
      'Bottle (60ml)',
      'Bottle (100ml)',
      'Bottle (120ml)',
      'Bottle (200ml)',
      'Bottle (500ml)',
      'Bottle (1 Liter)',
      'Bottle (2 Liters)',
      'Bottle (5 Liters)',
      'Liquid / Solution (Liters)'
    ]
  },
  {
    category: 'Topical, Creams & Ointments',
    items: [
      'Cream',
      'Ointment',
      'Gel',
      'Lotion',
      'Balm / Liniment',
      'Herbal Balm',
      'Tube (15g)',
      'Tube (30g)',
      'Tube (50g)',
      'Jar / Tub'
    ]
  },
  {
    category: 'Inhalation & Sprays',
    items: [
      'Inhaler / MDI',
      'Nasal Spray',
      'Nebulizer Solution / Respule',
      'Dry Powder Inhaler (DPI)'
    ]
  },
  {
    category: 'Injectables & Infusions',
    items: [
      'Injection (Vial)',
      'Injection (Ampoule)',
      'Prefilled Syringe / Pen',
      'IV Infusion Bottle (500ml)',
      'IV Infusion Bottle (1 Liter)'
    ]
  },
  {
    category: 'Ophthalmic & Otic (Eyes & Ears)',
    items: [
      'Eye Drops',
      'Ear Drops',
      'Eye Ointment'
    ]
  },
  {
    category: 'Medical Devices & Diagnostics',
    items: [
      'Medical Device',
      'Diagnostic Strips (Box)',
      'Protective Mask (Box of 50)',
      'Container / Unit'
    ]
  }
];

export const ALL_DOSAGE_FORMS = DOSAGE_AND_PACKAGING_GROUPS.flatMap(g => g.items);
