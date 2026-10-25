import React, { useState, useEffect } from 'react';
import { 
  Search, Pill, ShieldCheck, Clock, MapPin, Phone, 
  ArrowRight, Activity, CheckCircle2, AlertTriangle, 
  Sparkles, Layers, ShieldAlert, Heart, Wind, Zap, Sun,
  ThermometerSnowflake, FileCheck, Stethoscope, Award,
  ChevronRight, Building2, Package, ShoppingBag, Check, Flame
} from 'lucide-react';
import MedicineCard from '../components/MedicineCard';
import FeedbackSection from '../components/FeedbackSection';
import { getMedicines, getCategories } from '../services/api';
import { useTheme } from '../context/ThemeContext';
import { PHARMACY_IMAGES, getCategoryImage } from '../utils/pharmacyImages';

// Icon mapping for database category icon names
const iconMap = {
  ShieldAlert: ShieldAlert,
  Activity: Activity,
  Heart: Heart,
  Wind: Wind,
  Zap: Zap,
  Sun: Sun,
  Sparkles: Sparkles,
  Pill: Pill
};

export default function HomePage({ 
  setActivePage, 
  setSelectedCategory, 
  onViewDetails
}) {
  const { isDark } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [featuredMedicines, setFeaturedMedicines] = useState([]);
  const [offerMedicines, setOfferMedicines] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHomeData();
  }, []);

  const loadHomeData = async () => {
    try {
      setLoading(true);
      const [medsRes, catRes, offerRes] = await Promise.all([
        getMedicines({ limit: 6, sortBy: 'name_asc' }),
        getCategories(),
        getMedicines({ offersOnly: true, limit: 12 })
      ]);

      if (medsRes.success) setFeaturedMedicines(medsRes.data);
      if (catRes.success) setCategories(catRes.data);
      if (offerRes?.success) setOfferMedicines(offerRes.data || []);
    } catch (err) {
      console.error('Failed to load homepage data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleHeroSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setActivePage('search', { query: searchQuery.trim() });
    } else {
      setActivePage('search');
    }
  };

  const handleCategoryClick = (categoryId) => {
    if (setSelectedCategory) setSelectedCategory(categoryId);
    setActivePage('search', { categoryId });
  };

  return (
    <div className="space-y-24 pb-20">
      
      {/* ======================================================== */}
      {/* 1. HERO SECTION (Inspired by Reference 2: Modern Healthcare) */}
      {/* ======================================================== */}
      <section className="relative overflow-hidden pt-8 pb-16 lg:pt-14 lg:pb-24 border-b border-slate-100 dark:border-slate-800/80 bg-gradient-to-b from-teal-50/40 via-white to-slate-50/60 dark:from-slate-900/50 dark:via-slate-950 dark:to-slate-950">
        
        {/* Soft background ambient gradient shapes */}
        <div className="absolute top-10 left-1/4 w-96 h-96 bg-teal-400/10 dark:bg-teal-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute top-1/2 right-10 w-80 h-80 bg-blue-500/10 dark:bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            
            {/* Left Column: Heading, Value Proposition & Search */}
            <div className="lg:col-span-7 space-y-6 text-left">
              
              {/* Trust Badge */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold border shadow-xs bg-white dark:bg-slate-900 border-teal-200 dark:border-teal-800 text-teal-800 dark:text-teal-300">
                <span className="flex h-2 w-2 rounded-full bg-teal-500 animate-pulse"></span>
                <span>Licensed Healthcare Dispensary • Verified Live Stock</span>
              </div>

              {/* Prominent Headline */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.1] text-slate-900 dark:text-white">
                Your Health, <br />
                <span className="bg-gradient-to-r from-teal-700 via-teal-600 to-cyan-600 dark:from-teal-400 dark:via-teal-300 dark:to-cyan-400 bg-clip-text text-transparent">
                  Our Priority.
                </span>
              </h1>

              {/* Supporting Subtext */}
              <p className="text-base sm:text-lg max-w-xl text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
                Convenient access to authentic pharmacy products, prescription medicines, and healthcare essentials. Verify real-time counter stock before your visit with our computerized dispensary catalog.
              </p>

              {/* Prominent Medicine Search Field */}
              <form onSubmit={handleHeroSearch} className="max-w-xl pt-2">
                <div className="relative flex items-center p-2 rounded-2xl border shadow-lg bg-white dark:bg-slate-900/90 border-slate-200 dark:border-slate-700 focus-within:border-teal-600 focus-within:ring-2 focus-within:ring-teal-500/20 transition-all">
                  <Search className="w-5 h-5 text-teal-600 dark:text-teal-400 ml-3 shrink-0" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by medicine name, generic formula (e.g. Amoxicillin), or brand..."
                    className="w-full bg-transparent px-3 py-2.5 text-xs sm:text-sm focus:outline-none text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500"
                  />
                  <button
                    type="submit"
                    className="px-6 py-3 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-sm shrink-0"
                  >
                    Search Stock
                  </button>
                </div>

                {/* Popular Medicine Suggestions */}
                <div className="flex flex-wrap items-center gap-2 mt-3 text-xs">
                  <span className="text-slate-400 font-medium">Frequent inquiries:</span>
                  {['Augmentin', 'Panadol', 'Lipitor', 'Ventolin', 'Nexium', 'Amoxicillin'].map((term) => (
                    <button
                      key={term}
                      type="button"
                      onClick={() => {
                        setSearchQuery(term);
                        setActivePage('search', { query: term });
                      }}
                      className="px-2.5 py-1 rounded-lg border text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-teal-500 hover:text-teal-700 dark:hover:text-teal-300 transition-colors cursor-pointer"
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </form>

              {/* Primary & Secondary Call to Actions */}
              <div className="flex flex-wrap items-center gap-4 pt-3">
                <button
                  onClick={() => setActivePage('search')}
                  className="px-6 py-3.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-md shadow-teal-900/10 transition-all cursor-pointer"
                >
                  <Pill className="w-4 h-4 stroke-[2.2]" />
                  <span>Browse Medicines</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  onClick={() => {
                    // Navigate to vitamins / supplements category if available
                    handleCategoryClick(7);
                  }}
                  className="px-6 py-3.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800 font-bold text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-teal-600" />
                  <span>Explore Health Essentials</span>
                </button>
              </div>

            </div>

            {/* Right Column: High Quality Professional Healthcare Photography with Floating Stats Cards */}
            <div className="lg:col-span-5 relative">
              <div className="relative mx-auto max-w-md lg:max-w-none">
                
                {/* Main Hero Photo Container */}
                <div className="relative rounded-3xl overflow-hidden shadow-2xl border-4 border-white dark:border-slate-800 aspect-[4/5] bg-slate-100 dark:bg-slate-800">
                  <img
                    src={PHARMACY_IMAGES.heroPharmacist}
                    alt="Professional Pharmacist assisting in modern dispensary"
                    className="w-full h-full object-cover object-center"
                    loading="eager"
                  />
                  {/* Subtle bottom gradient overlay for card readability */}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent"></div>
                  
                  {/* Caption on image */}
                  <div className="absolute bottom-5 left-5 right-5 text-white">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-teal-300 block mb-1">
                      Professional Patient Care
                    </span>
                    <p className="text-xs sm:text-sm font-semibold leading-tight">
                      Registered pharmacists available for dosage review and safe prescription dispensing.
                    </p>
                  </div>
                </div>

                {/* Floating Card 1: Real-Time Verified Stock (Top Left) */}
                <div className="absolute -top-6 -left-6 sm:-left-8 p-4 rounded-2xl shadow-xl backdrop-blur-md border bg-white/95 dark:bg-slate-900/95 border-slate-100 dark:border-slate-800 flex items-center gap-3 animate-in fade-in zoom-in duration-300">
                  <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Inventory Accuracy</span>
                    <span className="text-sm font-black text-slate-900 dark:text-white">100% Genuine & Tracked</span>
                  </div>
                </div>

                {/* Floating Card 2: 2°C - 8°C Cold Storage (Bottom Right) */}
                <div className="absolute -bottom-6 -right-4 sm:-right-8 p-4 rounded-2xl shadow-xl backdrop-blur-md border bg-white/95 dark:bg-slate-900/95 border-slate-100 dark:border-slate-800 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 flex items-center justify-center">
                    <ThermometerSnowflake className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Prescription Cold-Chain</span>
                    <span className="text-sm font-black text-slate-900 dark:text-white">2°C – 8°C Monitored</span>
                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 2. VALUE PILLARS ("Why Choose My Pharmacist?") */}
      {/* ======================================================== */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          
          <div className="p-6 rounded-2xl border transition-all hover:shadow-md bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
            <div className="w-12 h-12 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 flex items-center justify-center mb-4">
              <FileCheck className="w-6 h-6 stroke-[2]" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1.5">
              100% Genuine Medicines
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Every formulation is sourced strictly from NMRA-approved pharmaceutical manufacturers with full batch certificates.
            </p>
          </div>

          <div className="p-6 rounded-2xl border transition-all hover:shadow-md bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
            <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center mb-4">
              <ThermometerSnowflake className="w-6 h-6 stroke-[2]" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1.5">
              Cold-Chain Protection
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Continuous 2°C – 8°C computerized climate control protects the potency of sensitive insulins, eye drops, and biologicals.
            </p>
          </div>

          <div className="p-6 rounded-2xl border transition-all hover:shadow-md bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
            <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center mb-4">
              <Clock className="w-6 h-6 stroke-[2]" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1.5">
              FEFO Expiry Protection
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Automated database quarantine immediately isolates lots nearing expiration to guarantee zero expired medications.
            </p>
          </div>

          <div className="p-6 rounded-2xl border transition-all hover:shadow-md bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center mb-4">
              <Stethoscope className="w-6 h-6 stroke-[2]" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1.5">
              Pharmacist Guided
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Certified pharmacists review doctor prescriptions, dosage instructions, and drug interactions upon counter dispensation.
            </p>
          </div>

        </div>
      </section>

      {/* ======================================================== */}
      {/* 3. PRODUCT CATEGORIES (Visual Cards with Photography) */}
      {/* ======================================================== */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400">
              Therapeutic Classification
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-1">
              Browse by Medical Category
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
              Quickly locate medications and wellness formulations by clinical discipline and bodily system.
            </p>
          </div>
          <button
            onClick={() => setActivePage('search')}
            className="text-xs font-bold text-teal-700 dark:text-teal-400 hover:underline flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
          >
            <span>View All Categories</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
          {categories.map((cat) => {
            const Icon = iconMap[cat.icon_name] || Pill;
            const categoryPhoto = getCategoryImage(cat);

            return (
              <button
                key={cat.category_id}
                onClick={() => handleCategoryClick(cat.category_id)}
                className="group relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:shadow-xl transition-all duration-300 text-left flex flex-col cursor-pointer"
              >
                {/* Category Image Header */}
                <div className="relative w-full h-32 overflow-hidden bg-slate-100 dark:bg-slate-800">
                  <img
                    src={categoryPhoto}
                    alt={cat.category_name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/20 to-transparent"></div>
                  
                  {/* Category Floating Icon */}
                  <div className="absolute bottom-3 left-3 w-8 h-8 rounded-xl bg-white/90 dark:bg-slate-900/90 text-teal-600 flex items-center justify-center shadow-sm backdrop-blur-md">
                    <Icon className="w-4 h-4" />
                  </div>
                </div>

                {/* Category Text Content */}
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white group-hover:text-teal-600 transition-colors line-clamp-1">
                      {cat.category_name}
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                      {cat.description || 'Verified pharmaceutical products available.'}
                    </p>
                  </div>

                  <div className="pt-3 mt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] font-bold text-teal-600 dark:text-teal-400">
                    <span>Explore Products</span>
                    <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* ======================================================== */}
      {/* 4. FEATURED MEDICINES SHELF */}
      {/* ======================================================== */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400">
              Verified Dispensary Stock
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-1">
              Featured Available Medicines
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
              Check real-time counter stock, prices, and therapeutic specifications ready for dispensation.
            </p>
          </div>
          <button
            onClick={() => setActivePage('search')}
            className="text-xs font-bold text-teal-700 dark:text-teal-400 hover:underline flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
          >
            <span>Browse Full Catalog</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div 
                key={i} 
                className="h-80 rounded-2xl animate-pulse bg-slate-200 dark:bg-slate-800 border border-slate-200 dark:border-slate-800"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredMedicines.map((med) => (
              <MedicineCard
                key={med.medicine_id}
                medicine={med}
                onViewDetails={onViewDetails}
              />
            ))}
          </div>
        )}
      </section>

      {/* ======================================================== */}
      {/* 5. SPECIAL OFFERS & DEALS SECTION */}
      {/* ======================================================== */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-amber-200/80 dark:border-amber-900/40 p-8 sm:p-10 bg-gradient-to-br from-amber-500/10 via-rose-500/5 to-transparent dark:bg-slate-900">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-rose-600 text-white uppercase tracking-wider mb-2">
                <Flame className="w-3.5 h-3.5 animate-pulse" />
                <span>Special Offers & Health Deals</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                Dispensary Featured Offers & Deals
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
                Save on discounted medications and clearance stock allocated directly by our pharmacy team.
              </p>
            </div>
            <button
              onClick={() => setActivePage('search', { query: 'offer' })}
              className="px-5 py-3 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-md shadow-rose-600/20 transition-all self-start md:self-auto"
            >
              <span>View All ({offerMedicines.length}) Deals</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Dynamic Allocated Offer Medicines Grid */}
          {offerMedicines.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {offerMedicines.slice(0, 4).map((med) => (
                <MedicineCard
                  key={med.medicine_id}
                  medicine={med}
                  onViewDetails={onViewDetails}
                />
              ))}
            </div>
          ) : (
            <div className="p-8 rounded-2xl bg-white/60 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 text-center mb-8">
              <Flame className="w-8 h-8 text-amber-500 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                No active promotional offers allocated today.
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Our dispensary team regularly rotates seasonal savings. Check back soon or browse our full catalog.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ======================================================== */}
      {/* 6. PATIENT FEEDBACK & TESTIMONIALS SECTION */}
      {/* ======================================================== */}
      <FeedbackSection />

      {/* ======================================================== */}
      {/* 7. PHARMACY SERVICE HIGHLIGHTS & TRUST PROTOCOLS */}
      {/* ======================================================== */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl border p-8 sm:p-12 overflow-hidden relative bg-gradient-to-br from-teal-900 via-teal-950 to-slate-950 text-white shadow-xl">
          
          {/* Decorative shapes */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center relative z-10">
            
            <div className="lg:col-span-8 space-y-5">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30 uppercase tracking-wider">
                Clinical Safety & Dispensary Protocols
              </span>
              
              <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
                Dispensed Exclusively by Licensed Pharmacists
              </h2>
              
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-2xl">
                Every prescription medicine at My Pharmacist is verified against your doctor’s original prescription. We maintain strict batch lot accountability, temperature-logged cold chain refrigeration (2°C – 8°C), and real-time inventory synchronization.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 text-xs font-semibold">
                <div className="flex items-center gap-2">
                  <ThermometerSnowflake className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>2°C – 8°C Biological Storage</span>
                </div>
                <div className="flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-teal-400 shrink-0" />
                  <span>NMRA Registered Drugs</span>
                </div>
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Certified Pharmacists</span>
                </div>
              </div>
            </div>

            {/* Helpline Card */}
            <div className="lg:col-span-4 p-6 rounded-2xl border border-white/10 bg-white/10 backdrop-blur-md space-y-4 text-center">
              <h4 className="text-sm font-bold text-white">
                Have an Urgent Prescription Inquiry?
              </h4>
              <p className="text-xs text-slate-300">
                Contact our dispensary counter directly to verify stock availability before your travel.
              </p>
              <a
                href="tel:+94112345678"
                className="w-full py-3 rounded-xl text-xs font-bold bg-white text-slate-950 hover:bg-teal-50 transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer"
              >
                <Phone className="w-4 h-4 text-teal-700" />
                <span>Call +94 11 234 5678</span>
              </a>
              <span className="text-[11px] text-teal-300 block">
                Dispensary Hotline: 24/7 Available
              </span>
            </div>

          </div>
        </div>
      </section>

    </div>
  );
}
