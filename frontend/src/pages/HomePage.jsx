import React, { useState, useEffect } from 'react';
import { 
  Search, Pill, ShieldCheck, Clock, MapPin, Phone, 
  ArrowRight, Activity, CheckCircle2, AlertTriangle, 
  Sparkles, Layers, ShieldAlert, Heart, Wind, Zap, Sun
} from 'lucide-react';
import MedicineCard from '../components/MedicineCard';
import { getMedicines, getCategories, getPublicSettings } from '../services/api';

// Map icon names from category database to Lucide components
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

export default function HomePage({ setActivePage, setSelectedCategory, onViewDetails }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [featuredMedicines, setFeaturedMedicines] = useState([]);
  const [categories, setCategories] = useState([]);
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHomeData();
  }, []);

  const loadHomeData = async () => {
    try {
      setLoading(true);
      const [medsRes, catRes, setRes] = await Promise.all([
        getMedicines({ limit: 6, sortBy: 'name_asc' }),
        getCategories(),
        getPublicSettings()
      ]);

      if (medsRes.success) setFeaturedMedicines(medsRes.data);
      if (catRes.success) setCategories(catRes.data);
      if (setRes.success) setSettings(setRes.data);
    } catch (err) {
      console.error('Failed to load homepage data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleHeroSearch = (e) => {
    e.preventDefault();
    setActivePage('search', { query: searchQuery });
  };

  const handleCategoryClick = (categoryId) => {
    setSelectedCategory(categoryId);
    setActivePage('search', { categoryId });
  };

  return (
    <div className="space-y-20 pb-16">
      
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 md:pt-20 md:pb-28">
        {/* Ambient Gradient Glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-emerald-600/20 via-teal-500/15 to-cyan-500/10 blur-3xl pointer-events-none rounded-full"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/25 mb-6 shadow-inner">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Verified Physical Pharmacy Stock Portal</span>
          </div>

          {/* Heading */}
          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white max-w-4xl mx-auto leading-tight sm:leading-none">
            Search Medicines. <br />
            <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
              Check Real-Time Availability.
            </span>
          </h1>

          {/* Subheading */}
          <p className="text-slate-400 text-base sm:text-lg max-w-2xl mx-auto mt-6 leading-relaxed">
            Verify actual in-stock medications at VDC Store before visiting. Accurate inventory tracking guarantees expired and recalled batches are automatically excluded.
          </p>

          {/* Search Box */}
          <form onSubmit={handleHeroSearch} className="max-w-2xl mx-auto mt-10">
            <div className="relative flex items-center p-2 rounded-2xl bg-slate-900/90 border border-slate-700/80 shadow-2xl shadow-emerald-950/30 backdrop-blur-xl group focus-within:border-emerald-500/60 focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all">
              <Search className="w-6 h-6 text-slate-400 ml-3 shrink-0 group-focus-within:text-emerald-400 transition-colors" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by medicine name, generic molecule (e.g. Amoxicillin, Paracetamol), or brand..."
                className="w-full bg-transparent px-4 py-2.5 text-sm sm:text-base text-white placeholder-slate-500 focus:outline-none"
              />
              <button
                type="submit"
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-bold text-sm shadow-md transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer shrink-0"
              >
                Search Stock
              </button>
            </div>
            
            {/* Quick search suggestions */}
            <div className="flex flex-wrap items-center justify-center gap-2 mt-4 text-xs text-slate-400">
              <span className="text-slate-400">Popular searches:</span>
              {['Augmentin', 'Panadol', 'Lipitor', 'Ventolin', 'Nexium'].map((term) => (
                <button
                  key={term}
                  type="button"
                  onClick={() => {
                    setSearchQuery(term);
                    setActivePage('search', { query: term });
                  }}
                  className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 hover:border-emerald-500/40 hover:text-emerald-300 transition-colors cursor-pointer"
                >
                  {term}
                </button>
              ))}
            </div>
          </form>

          {/* 3 Pillar Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto mt-16 text-left">
            <div className="p-5 rounded-2xl bg-slate-900/50 border border-slate-800/80 backdrop-blur-sm">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-3">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-white mb-1">Live Database Stock</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Aggregated in real-time directly from physical store dispensary batch registers using MySQL triggers and functions.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/50 border border-slate-800/80 backdrop-blur-sm">
              <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center mb-3">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-white mb-1">Expired Batches Excluded</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Medicines nearing or past their expiration dates or marked for recall are automatically omitted from saleable stock calculations.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/50 border border-slate-800/80 backdrop-blur-sm">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center mb-3">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-white mb-1">Physical Collection Only</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                VDC Store preserves patient safety: medicines are dispensed exclusively over our pharmacy counter with genuine pharmacist consultation.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Showcase */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between mb-8">
          <div>
            <span className="text-xs font-mono uppercase tracking-wider text-teal-400 font-semibold">Browse By Group</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">Therapeutic Categories</h2>
          </div>
          <button
            onClick={() => setActivePage('search')}
            className="text-xs sm:text-sm font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors cursor-pointer"
          >
            View all medicines <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {categories.slice(0, 8).map((cat) => {
            const IconComp = iconMap[cat.icon_name] || Pill;
            return (
              <button
                key={cat.category_id}
                onClick={() => handleCategoryClick(cat.category_id)}
                className="group p-5 rounded-2xl bg-slate-900/60 hover:bg-slate-900 border border-slate-800 hover:border-emerald-500/40 text-left transition-all duration-200 hover:-translate-y-1 cursor-pointer flex flex-col justify-between"
              >
                <div className="w-10 h-10 rounded-xl bg-slate-800 group-hover:bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-4 transition-colors">
                  <IconComp className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors line-clamp-1">
                    {cat.category_name}
                  </h4>
                  <span className="text-xs text-slate-400 mt-1 block">
                    {cat.medicine_count || 0} formulations
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Featured Medicines Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between mb-8">
          <div>
            <span className="text-xs font-mono uppercase tracking-wider text-teal-400 font-semibold">Real-Time Verification</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">Frequently Searched Medicines</h2>
          </div>
          <button
            onClick={() => setActivePage('search')}
            className="text-xs sm:text-sm font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors cursor-pointer"
          >
            Browse full catalog <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <div className="text-center py-16 text-slate-400 text-sm">
            <div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full mx-auto mb-3"></div>
            Loading verified inventory records...
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

      {/* Real-time Pharmacy Visit Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-950/60 via-slate-900 to-teal-950/60 border border-emerald-500/30 p-8 sm:p-12 shadow-2xl">
          <div className="max-w-2xl space-y-4">
            <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Need In-Person Dispensation?
            </span>
            <h3 className="text-2xl sm:text-3xl font-black text-white">
              Visit VDC Store Pharmacy Today
            </h3>
            <p className="text-sm text-slate-300 leading-relaxed">
              Found your medicine in stock? Please bring your doctor's valid prescription to our dispensary counter at Bambalapitiya, Colombo. Our licensed staff pharmacists are ready to counsel and dispense safely.
            </p>
            
            <div className="flex flex-wrap items-center gap-4 pt-4">
              <button
                onClick={() => setActivePage('about')}
                className="px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-emerald-500/25 cursor-pointer"
              >
                View Location & Hours
              </button>
              
              <a
                href="tel:+94112345678"
                className="px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-white font-semibold text-xs transition-all flex items-center gap-2"
              >
                <Phone className="w-4 h-4 text-emerald-400" />
                Call Helpline: +94 11 234 5678
              </a>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
