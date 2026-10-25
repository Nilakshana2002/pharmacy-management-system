import React, { useState, useRef, useEffect } from 'react';
import { 
  Pill, Search, Shield, Home, LogOut, Menu, X, 
  Sparkles, ChevronDown, CheckCircle2, User, LogIn, UserPlus,
  UploadCloud, Percent, Flame, Heart, Apple, Leaf, 
  Activity, ArrowRight, Stethoscope, Droplets, ShieldAlert,
  Wind, Zap, Sun, ThermometerSnowflake, Tag, MoreHorizontal
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import PrescriptionUploadModal from './PrescriptionUploadModal';
import CustomerAuthModal from './CustomerAuthModal';
import CustomerProfileModal from './CustomerProfileModal';
import { getCurrentCustomer, logoutCustomer } from '../utils/customerAuthService';
import { WELLNESS_DEPARTMENTS } from '../utils/wellnessCatalog';

export default function Navbar({ 
  activePage, 
  setActivePage, 
  staffUser, 
  onLogout 
}) {
  const { isDark } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [navSearch, setNavSearch] = useState('');
  
  // Mega-menu hover/click state
  const [activeDropdown, setActiveDropdown] = useState(null); // 'medicines' | 'wellness' | null
  const [isPrescriptionModalOpen, setIsPrescriptionModalOpen] = useState(false);
  const [isCustomerAuthOpen, setIsCustomerAuthOpen] = useState(false);
  const [isCustomerProfileOpen, setIsCustomerProfileOpen] = useState(false);
  const [customerAuthInitialMode, setCustomerAuthInitialMode] = useState('login');
  const [customerDropdownOpen, setCustomerDropdownOpen] = useState(false);

  // Patient / Customer Authentication state
  const [currentCustomer, setCurrentCustomer] = useState(() => getCurrentCustomer());

  const dropdownRef = useRef(null);
  const customerDropdownRef = useRef(null);

  // Sync customer on auth change events
  useEffect(() => {
    const handleAuthChange = () => {
      setCurrentCustomer(getCurrentCustomer());
    };
    window.addEventListener('pharmacy_customer_auth_change', handleAuthChange);
    return () => window.removeEventListener('pharmacy_customer_auth_change', handleAuthChange);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setActiveDropdown(null);
      }
      if (customerDropdownRef.current && !customerDropdownRef.current.contains(event.target)) {
        setCustomerDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNavClick = (page, params = {}) => {
    setActivePage(page, params);
    setActiveDropdown(null);
    setMobileMenuOpen(false);
    setCustomerDropdownOpen(false);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (navSearch.trim()) {
      handleNavClick('search', { query: navSearch.trim() });
      setNavSearch('');
    }
  };

  const handleOpenCustomerAuth = (mode = 'login') => {
    setCustomerAuthInitialMode(mode);
    setIsCustomerAuthOpen(true);
    setMobileMenuOpen(false);
  };

  // Medicine categories list for the mega-menu
  const medicineCategories = [
    {
      id: 1,
      name: 'Antibiotics & Antimicrobials',
      icon: ShieldAlert,
      badge: 'Rx',
      description: 'Penicillins, Cephalosporins & Broad-spectrum',
      subcategories: ['Augmentin', 'Amoxil', 'Ciprobay', 'Zithromax']
    },
    {
      id: 2,
      name: 'Analgesics & Pain Relief',
      icon: Activity,
      badge: 'OTC / Rx',
      description: 'Paracetamol, Ibuprofen & NSAIDs',
      subcategories: ['Panadol Extra', 'Brufen', 'Celebrex', 'Infant Drops']
    },
    {
      id: 3,
      name: 'Cardiovascular & Blood Pressure',
      icon: Heart,
      badge: 'Rx',
      description: 'Antihypertensives, Statins & Beta Blockers',
      subcategories: ['Lipitor', 'Norvasc', 'Cozaar', 'Betaloc']
    },
    {
      id: 4,
      name: 'Respiratory & Allergy',
      icon: Wind,
      badge: 'Rx / OTC',
      description: 'Inhalers, Antihistamines & Nasal Sprays',
      subcategories: ['Ventolin Inhaler', 'Singulair', 'Zyrtec', 'Flixonase']
    },
    {
      id: 5,
      name: 'Gastrointestinal & Antacids',
      icon: Droplets,
      badge: 'OTC / Rx',
      description: 'Proton Pump Inhibitors & Digestive Care',
      subcategories: ['Nexium 40mg', 'Controloc', 'Gaviscon', 'Motilium']
    },
    {
      id: 6,
      name: 'Endocrine & Diabetes Care',
      icon: Zap,
      badge: 'Cold-Chain / Rx',
      description: 'Insulin Glargine, Metformin & Glucose Strips',
      subcategories: ['Lantus SoloStar', 'Glucophage', 'Amaryl', 'Test Strips']
    },
    {
      id: 7,
      name: 'First Aid & Medical Devices',
      icon: Stethoscope,
      badge: 'Certified',
      description: 'Stethoscopes, BP Monitors & Nebulizers',
      subcategories: ['3M Littmann', 'Omron BP', 'Nebulizers', 'Face Masks']
    },
    {
      id: 8,
      name: 'Dermatology & Skin Care',
      icon: Sparkles,
      badge: 'Medical',
      description: 'Antibacterial Creams, Ointments & Topicals',
      subcategories: ['Fucidin Cream', 'Hydrocortisone', 'Antiseptic']
    }
  ];

  return (
    <>
      <header className={`sticky top-0 z-40 border-b transition-all duration-200 backdrop-blur-md w-full ${
        isDark 
          ? 'border-slate-800/80 bg-slate-950/95 text-white' 
          : 'border-slate-200/80 bg-white/95 text-slate-900 shadow-xs'
      }`}>

        {/* Main Navigation Bar */}
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 w-full" ref={dropdownRef}>
          <div className="flex items-center justify-between h-16 sm:h-20 gap-2 sm:gap-4 w-full">
            
            {/* Logo & Brand Identity */}
            <button
              onClick={() => handleNavClick('home')}
              className="flex items-center space-x-2.5 sm:space-x-3 group text-left cursor-pointer focus:outline-none shrink-0"
              title="My Pharmacist - Modern Dispensary & Healthcare System"
            >
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl p-1 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-center group-hover:scale-105 transition-all duration-200">
                <img 
                  src="/favicon.svg" 
                  alt="My Pharmacist Logo" 
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="hidden xs:block">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <span className="text-base sm:text-xl font-black tracking-tight">
                    <span className="text-[#164e39] dark:text-emerald-400">My </span>
                    <span className="text-[#268a84] dark:text-teal-400">Pharmacist</span>
                  </span>
                  <span className="hidden lg:inline-block px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wide bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 uppercase">
                    Dispensary
                  </span>
                </div>
                <p className="hidden md:block text-[9px] font-extrabold tracking-wider uppercase text-slate-500 dark:text-slate-400 mt-0.5">
                  Modern Dispensary &amp; Healthcare System
                </p>
              </div>
            </button>

            {/* Quick Search Field in Navbar */}
            <form onSubmit={handleSearchSubmit} className="hidden 2xl:flex items-center flex-1 max-w-xs mx-2">
              <div className={`relative w-full flex items-center rounded-xl border transition-all ${
                isDark 
                  ? 'bg-slate-900/80 border-slate-700/80 focus-within:border-teal-500' 
                  : 'bg-slate-50 border-slate-200 focus-within:border-teal-600 focus-within:bg-white shadow-xs'
              }`}>
                <Search className="w-3.5 h-3.5 text-slate-400 ml-3 shrink-0" />
                <input
                  type="text"
                  value={navSearch}
                  onChange={(e) => setNavSearch(e.target.value)}
                  placeholder="Search medicine or brand..."
                  className={`w-full bg-transparent px-3 py-2 text-xs focus:outline-none ${
                    isDark ? 'text-white placeholder-slate-500' : 'text-slate-800 placeholder-slate-400'
                  }`}
                />
              </div>
            </form>

            {/* Major Desktop Navigation Tabs (Visible on lg and above) */}
            <nav className="hidden lg:flex items-center space-x-1 shrink-0">
              
              {/* 1. Home Tab */}
              <button
                onClick={() => handleNavClick('home')}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activePage === 'home'
                    ? isDark ? 'bg-teal-500/15 text-teal-300 border border-teal-500/30' : 'bg-teal-50 text-teal-800 border border-teal-200 font-extrabold'
                    : isDark ? 'text-slate-300 hover:text-white hover:bg-slate-900/70' : 'text-slate-700 hover:text-teal-700 hover:bg-slate-100/80'
                }`}
              >
                Home
              </button>

              {/* 2. Browse Medicines Tab with Mega-Menu */}
              <div 
                className="relative"
                onMouseEnter={() => setActiveDropdown('medicines')}
              >
                <button
                  onClick={() => {
                    setActiveDropdown(activeDropdown === 'medicines' ? null : 'medicines');
                    handleNavClick('search', { query: '', categoryId: '' });
                  }}
                  className={`px-2 sm:px-2.5 py-1.5 sm:py-2 rounded-xl text-xs font-bold flex items-center gap-1 sm:gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                    activePage === 'search' && activeDropdown !== 'wellness'
                      ? isDark ? 'bg-teal-500/15 text-teal-300 border border-teal-500/30' : 'bg-teal-50 text-teal-800 border border-teal-200 font-extrabold'
                      : isDark ? 'text-slate-300 hover:text-white hover:bg-slate-900/70' : 'text-slate-700 hover:text-teal-700 hover:bg-slate-100/80'
                  }`}
                >
                  <Pill className="w-3.5 h-3.5 text-teal-600" />
                  <span>Browse Medicines</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${activeDropdown === 'medicines' ? 'rotate-180' : ''}`} />
                </button>
              </div>

              {/* 3. Beauty & Wellness Tab */}
              <div 
                className="relative"
                onMouseEnter={() => setActiveDropdown('wellness')}
              >
                <button
                  onClick={() => {
                    setActiveDropdown(activeDropdown === 'wellness' ? null : 'wellness');
                    handleNavClick('search', { categoryId: 'wellness' });
                  }}
                  className={`px-2 sm:px-2.5 py-1.5 sm:py-2 rounded-xl text-xs font-bold flex items-center gap-1 sm:gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                    activeDropdown === 'wellness' || (activePage === 'search' && activeDropdown === null)
                      ? isDark ? 'bg-teal-500/15 text-teal-300 border border-teal-500/30' : 'bg-teal-50 text-teal-800 border border-teal-200 font-extrabold'
                      : isDark ? 'text-slate-300 hover:text-white hover:bg-slate-900/70' : 'text-slate-700 hover:text-teal-700 hover:bg-slate-100/80'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-pink-500" />
                  <span>Beauty & Wellness</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${activeDropdown === 'wellness' ? 'rotate-180' : ''}`} />
                </button>
              </div>

              {/* 4. Special Offers Tab */}
              <button
                onClick={() => handleNavClick('search', { query: 'offer' })}
                className="px-2.5 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1 sm:gap-1.5 transition-all cursor-pointer bg-gradient-to-r from-amber-500/15 to-rose-500/15 hover:from-amber-500/25 hover:to-rose-500/25 text-amber-700 dark:text-amber-400 border border-amber-300/60 dark:border-amber-500/30 shadow-xs whitespace-nowrap"
              >
                <Flame className="w-3.5 h-3.5 text-rose-500" />
                <span>Offers</span>
                <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-rose-600 text-white font-black uppercase">
                  Deals
                </span>
              </button>


              {/* 6. Contact Us */}
              <button
                onClick={() => handleNavClick('contact')}
                className={`px-2 sm:px-2.5 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  activePage === 'contact'
                    ? isDark ? 'bg-teal-500/15 text-teal-300 border border-teal-500/30' : 'bg-teal-50 text-teal-800 border border-teal-200 font-extrabold'
                    : isDark ? 'text-slate-300 hover:text-white hover:bg-slate-900/70' : 'text-slate-700 hover:text-teal-700 hover:bg-slate-100/80'
                }`}
              >
                Contact Us
              </button>

              {/* 7. Prescription Upload Pill */}
              <button
                onClick={() => setIsPrescriptionModalOpen(true)}
                className="px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 sm:gap-1.5 transition-all cursor-pointer bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 border border-teal-300 dark:border-teal-700 hover:bg-teal-100 whitespace-nowrap"
              >
                <UploadCloud className="w-3.5 h-3.5 text-teal-600" />
                <span>Upload Rx</span>
              </button>

            </nav>

            {/* Right Controls: Patient Portal & Staff Dispensary Portal */}
            <div className="flex items-center space-x-1.5 sm:space-x-2.5 shrink-0">
              
              {/* Search trigger on smaller viewports */}
              <button
                onClick={() => handleNavClick('search')}
                className={`p-2 sm:p-2.5 rounded-xl border 2xl:hidden transition-colors cursor-pointer shrink-0 ${
                  isDark 
                    ? 'bg-slate-900 text-slate-300 border-slate-800 hover:text-white' 
                    : 'bg-slate-100 text-slate-700 border-slate-200 hover:text-slate-900'
                }`}
                title="Search Catalog"
              >
                <Search className="w-4 h-4" />
              </button>

              {/* ======================================================== */}
              {/* CUSTOMER / PATIENT AUTH & PROFILE DROPDOWN */}
              {/* ======================================================== */}
              <div className="relative shrink-0" ref={customerDropdownRef}>
                {currentCustomer ? (
                  <div className="relative">
                    <button
                      onClick={() => setCustomerDropdownOpen(!customerDropdownOpen)}
                      className="px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700/60 shadow-2xs hover:bg-emerald-100 shrink-0"
                      title="Patient Account"
                    >
                      <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center font-black text-[10px]">
                        {currentCustomer.full_name?.charAt(0) || 'P'}
                      </div>
                      <span className="hidden sm:inline max-w-[100px] truncate">{currentCustomer.full_name?.split(' ')[0]}</span>
                      <ChevronDown className="w-3.5 h-3.5 text-emerald-600" />
                    </button>

                    {customerDropdownOpen && (
                      <div className={`absolute right-0 top-full mt-2 w-64 rounded-2xl shadow-xl border p-3 z-50 animate-in fade-in slide-in-from-top-2 duration-150 ${
                        isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
                      }`}>
                        <div className="pb-2.5 border-b border-slate-100 dark:border-slate-800">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 uppercase tracking-wide">
                            Registered Patient
                          </span>
                          <p className="text-xs font-black mt-1.5 truncate">{currentCustomer.full_name}</p>
                          <p className="text-[11px] text-slate-500 truncate">{currentCustomer.email}</p>
                          {currentCustomer.contact_no && (
                            <p className="text-[11px] text-slate-400 mt-0.5 truncate">{currentCustomer.contact_no}</p>
                          )}
                        </div>

                        <div className="py-2 space-y-1">
                          <button
                            onClick={() => {
                              setCustomerDropdownOpen(false);
                              setIsCustomerProfileOpen(true);
                            }}
                            className="w-full px-2.5 py-2 rounded-lg text-xs font-bold text-teal-700 dark:text-teal-300 hover:bg-teal-50 dark:hover:bg-teal-950/50 flex items-center gap-2 cursor-pointer text-left transition-colors"
                          >
                            <User className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                            <div className="truncate">
                              <span className="block">My Patient Profile & History</span>
                              <span className="text-[10px] font-normal text-slate-400 block truncate">Prescription Status & Inquiries</span>
                            </div>
                          </button>

                          <button
                            onClick={() => {
                              setCustomerDropdownOpen(false);
                              setIsPrescriptionModalOpen(true);
                            }}
                            className="w-full px-2.5 py-2 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 cursor-pointer text-left"
                          >
                            <UploadCloud className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                            <span>Upload Doctor's Prescription</span>
                          </button>
                        </div>

                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                          <button
                            onClick={() => {
                              logoutCustomer();
                              setCustomerDropdownOpen(false);
                            }}
                            className="w-full px-2.5 py-1.5 rounded-lg text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-2 cursor-pointer text-left transition-colors"
                          >
                            <LogOut className="w-3.5 h-3.5" />
                            <span>Sign Out Patient Account</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : !staffUser ? (
                  <button
                    onClick={() => handleOpenCustomerAuth('login')}
                    className={`px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                      isDark 
                        ? 'bg-slate-900 text-slate-300 border-slate-800 hover:text-white hover:bg-slate-800' 
                        : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                    }`}
                    title="Sign in or register as a patient"
                  >
                    <User className="w-3.5 h-3.5 text-teal-600" />
                    <span className="hidden sm:inline">Patient Sign In</span>
                  </button>
                ) : null}
              </div>

              {/* Staff / Admin Controls */}
              {staffUser ? (
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => handleNavClick('dashboard')}
                    className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all cursor-pointer shadow-xs ${
                      activePage === 'dashboard'
                        ? 'bg-teal-700 text-white border-teal-800 shadow-sm'
                        : isDark
                          ? 'bg-slate-900 text-slate-200 border-slate-800 hover:text-white'
                          : 'bg-teal-50 text-teal-800 border-teal-200 hover:bg-teal-100'
                    }`}
                  >
                    <Shield className="w-3.5 h-3.5 text-teal-500" />
                    <span className="hidden sm:inline">Dispensary</span>
                    <span className="text-[10px] opacity-80">({staffUser.role})</span>
                  </button>
                  <button
                    onClick={onLogout}
                    title="Logout"
                    className={`p-2 rounded-xl border transition-colors cursor-pointer shrink-0 ${
                      isDark 
                        ? 'bg-slate-900 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border-slate-800' 
                        : 'bg-white hover:bg-rose-50 text-slate-500 hover:text-rose-600 border-slate-200'
                    }`}
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => handleNavClick('login')}
                  className="px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border bg-teal-700 hover:bg-teal-800 text-white border-teal-800 shadow-xs shrink-0"
                >
                  <Shield className="w-3.5 h-3.5 text-teal-200" />
                  <span className="whitespace-nowrap">Staff Portal</span>
                </button>
              )}

              {/* Mobile Hamburger Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className={`p-2 rounded-xl border lg:hidden transition-colors shrink-0 ${
                  isDark ? 'bg-slate-900 text-white border-slate-800' : 'bg-white text-slate-800 border-slate-200'
                }`}
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>

            </div>

          </div>
        </div>

        {/* MEGA-MENU 1: BROWSE MEDICINES */}
        {activeDropdown === 'medicines' && (
          <div 
            onMouseLeave={() => setActiveDropdown(null)}
            className={`absolute top-full left-0 w-full border-b shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-200 z-50 ${
              isDark ? 'bg-slate-950/98 border-slate-800 text-white' : 'bg-white/98 border-slate-200 text-slate-900'
            }`}
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800/80 mb-6">
                <div>
                  <h3 className="text-sm font-extrabold uppercase tracking-wider text-teal-600 dark:text-teal-400 flex items-center gap-2">
                    <Pill className="w-4 h-4" />
                    <span>Master Medicine Formulary & Dispensary Categories</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Select a therapeutic clinical classification to view real-time dispensary batches and stock
                  </p>
                </div>

                <button
                  onClick={() => handleNavClick('search')}
                  className="text-xs font-bold text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>View All 24+ Formulations</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* 8 Category Tiles Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {medicineCategories.map((cat) => {
                  const Icon = cat.icon;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => handleNavClick('search', { categoryId: cat.id })}
                      className={`p-3.5 rounded-2xl border text-left transition-all duration-200 group cursor-pointer ${
                        isDark 
                          ? 'border-slate-800/80 bg-slate-900/60 hover:bg-slate-800/80 hover:border-teal-500/50' 
                          : 'border-slate-200/80 bg-slate-50/50 hover:bg-white hover:border-teal-400 hover:shadow-md'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="w-8 h-8 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                          <Icon className="w-4 h-4 stroke-[2.2]" />
                        </div>
                        <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                          cat.badge.includes('Rx')
                            ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-300/40'
                            : 'bg-teal-500/15 text-teal-600 dark:text-teal-400 border border-teal-300/40'
                        }`}>
                          {cat.badge}
                        </span>
                      </div>

                      <h4 className="text-xs font-bold group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors line-clamp-1">
                        {cat.name}
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                        {cat.description}
                      </p>

                      <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-1.5 flex-wrap">
                        {cat.subcategories.slice(0, 3).map((sub, idx) => (
                          <span key={idx} className="text-[10px] text-slate-400 bg-slate-200/40 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                            {sub}
                          </span>
                        ))}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* MEGA-MENU 2: BEAUTY & WELLNESS */}
        {activeDropdown === 'wellness' && (
          <div 
            onMouseLeave={() => setActiveDropdown(null)}
            className={`absolute top-full left-0 w-full border-b shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-200 z-50 ${
              isDark ? 'bg-slate-950/98 border-slate-800 text-white' : 'bg-white/98 border-slate-200 text-slate-900'
            }`}
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800/80 mb-6">
                <div>
                  <h3 className="text-sm font-extrabold uppercase tracking-wider text-pink-600 dark:text-pink-400 flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    <span>Beauty, Skincare, Nutrition & Baby Wellness Department</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Browse everyday personal care, organic supplements, infant formula, and clinical cosmetics
                  </p>
                </div>

                <button
                  onClick={() => handleNavClick('search', { categoryId: 'wellness' })}
                  className="text-xs font-bold text-pink-600 dark:text-pink-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>Explore All Wellness Products</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* 6 Wellness Department Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {WELLNESS_DEPARTMENTS.map((dept) => {
                  const getIcon = (id) => {
                    switch(id) {
                      case 'skincare': return Sparkles;
                      case 'nutrition': return Apple;
                      case 'baby': return Heart;
                      case 'devices': return Stethoscope;
                      case 'herbal': return Leaf;
                      case 'oral': return Droplets;
                      default: return Apple;
                    }
                  };
                  const Icon = getIcon(dept.id);

                  return (
                    <button
                      key={dept.id}
                      onClick={() => handleNavClick('search', { categoryId: dept.id })}
                      className={`p-4 rounded-2xl border text-left transition-all duration-200 group cursor-pointer ${
                        isDark 
                          ? 'border-slate-800/80 bg-slate-900/60 hover:bg-slate-800/80 hover:border-pink-500/50' 
                          : 'border-slate-200/80 bg-slate-50/50 hover:bg-white hover:border-pink-400 hover:shadow-md'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-pink-500/10 text-pink-600 dark:text-pink-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                          <Icon className="w-5 h-5 stroke-[2.2]" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="text-xs font-bold group-hover:text-pink-600 dark:group-hover:text-pink-400 transition-colors truncate">
                            {dept.name}
                          </h4>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                            {dept.description}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-slate-400">Popular Brands</span>
                        <span className="font-bold text-pink-600 dark:text-pink-400">CeraVe, La Roche, Cetaphil →</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* MOBILE SLIDE-DOWN DRAWER */}
        {mobileMenuOpen && (
          <div className={`lg:hidden border-b px-4 py-5 space-y-4 animate-in slide-in-from-top duration-200 ${
            isDark ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            
            {/* Mobile Search */}
            <form onSubmit={handleSearchSubmit}>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={navSearch}
                  onChange={(e) => setNavSearch(e.target.value)}
                  placeholder="Search medicines, vitamins..."
                  className={`w-full pl-9 pr-4 py-2.5 rounded-xl text-xs border ${
                    isDark 
                      ? 'bg-slate-900 border-slate-800 text-white placeholder-slate-500' 
                      : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400'
                  }`}
                />
              </div>
            </form>

            {/* Mobile Nav Links */}
            <div className="space-y-1">
              {[
                { id: 'home', label: 'Home Page' },
                { id: 'search', label: 'Browse Medicines & Stock' },
                { id: 'wellness', label: 'Beauty & Wellness', isWellness: true },
                { id: 'offers', label: 'Special Offers & Deals', isOffer: true },
                { id: 'contact', label: 'Contact Us' }
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    if (item.isWellness) {
                      handleNavClick('search', { categoryId: 'wellness' });
                    } else if (item.isOffer) {
                      handleNavClick('search', { query: 'offer' });
                    } else {
                      handleNavClick(item.id);
                    }
                  }}
                  className={`w-full px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between text-left ${
                    activePage === item.id
                      ? isDark ? 'bg-teal-500/20 text-teal-400 font-bold' : 'bg-teal-50 text-teal-800 font-bold'
                      : isDark ? 'text-slate-300 hover:bg-slate-900' : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span>{item.label}</span>
                </button>
              ))}

              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  setIsPrescriptionModalOpen(true);
                }}
                className="w-full px-4 py-2.5 rounded-xl text-xs font-bold bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 border border-teal-300 dark:border-teal-700 flex items-center justify-center gap-2"
              >
                <UploadCloud className="w-4 h-4 text-teal-600" />
                <span>Upload Doctor's Prescription</span>
              </button>

              {/* Patient Profile / Login on Mobile */}
              {currentCustomer ? (
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-emerald-800 dark:text-emerald-300 block">{currentCustomer.full_name}</span>
                      <span className="text-[10px] text-slate-500">{currentCustomer.email}</span>
                    </div>
                    <button
                      onClick={() => {
                        logoutCustomer();
                        setMobileMenuOpen(false);
                      }}
                      className="text-xs font-bold text-rose-500 hover:underline"
                    >
                      Sign Out
                    </button>
                  </div>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setIsCustomerProfileOpen(true);
                    }}
                    className="w-full py-2 px-3 rounded-lg bg-teal-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <User className="w-3.5 h-3.5" />
                    <span>My Patient Profile & History</span>
                  </button>
                </div>
              ) : !staffUser ? (
                <button
                  onClick={() => handleOpenCustomerAuth('login')}
                  className="w-full px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 flex items-center justify-center gap-2"
                >
                  <User className="w-4 h-4 text-teal-600" />
                  <span>Patient Sign In / Register</span>
                </button>
              ) : null}
            </div>

            <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
              {staffUser ? (
                <div className="space-y-2">
                  <button
                    onClick={() => handleNavClick('dashboard')}
                    className="w-full px-4 py-2.5 rounded-xl text-xs font-bold bg-teal-600 text-white flex items-center justify-center gap-2"
                  >
                    <Shield className="w-4 h-4" />
                    Dispensary Dashboard ({staffUser.role})
                  </button>
                  <button
                    onClick={() => {
                      onLogout();
                      setMobileMenuOpen(false);
                    }}
                    className="w-full px-4 py-2 rounded-xl text-xs font-semibold text-rose-500 flex items-center justify-center gap-2"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => handleNavClick('login')}
                  className="w-full px-4 py-2.5 rounded-xl text-xs font-bold bg-teal-700 hover:bg-teal-800 text-white flex items-center justify-center gap-2"
                >
                  <Shield className="w-4 h-4 text-teal-200" />
                  Staff Dispensary Portal
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Prescription Upload Modal */}
      <PrescriptionUploadModal
        isOpen={isPrescriptionModalOpen}
        onClose={() => setIsPrescriptionModalOpen(false)}
      />

      {/* Patient Auth Modal (Sign In / Register) */}
      <CustomerAuthModal
        isOpen={isCustomerAuthOpen}
        onClose={() => setIsCustomerAuthOpen(false)}
        initialMode={customerAuthInitialMode}
        onSuccess={(customer) => setCurrentCustomer(customer)}
      />

      {/* Patient Profile & Order History Portal Modal */}
      <CustomerProfileModal
        isOpen={isCustomerProfileOpen}
        onClose={() => setIsCustomerProfileOpen(false)}
        currentCustomer={currentCustomer}
        isDark={isDark}
        onOpenUploadPrescription={() => setIsPrescriptionModalOpen(true)}
      />
    </>
  );
}
