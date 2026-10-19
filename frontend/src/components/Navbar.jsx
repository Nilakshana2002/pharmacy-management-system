import React, { useState } from 'react';
import { 
  Pill, Search, Shield, Info, Home, LogOut, 
  Menu, X, ShoppingBag, Sparkles, Phone, ChevronDown, CheckCircle2 
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function Navbar({ 
  activePage, 
  setActivePage, 
  staffUser, 
  onLogout, 
  cartCount = 0, 
  onOpenCart 
}) {
  const { isDark } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [navSearch, setNavSearch] = useState('');

  const handleNavClick = (page, params = {}) => {
    setActivePage(page, params);
    setMobileMenuOpen(false);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (navSearch.trim()) {
      handleNavClick('search', { query: navSearch.trim() });
      setNavSearch('');
    }
  };

  return (
    <header className={`sticky top-0 z-40 border-b transition-all duration-200 backdrop-blur-md ${
      isDark 
        ? 'border-slate-800/80 bg-slate-950/90 text-white' 
        : 'border-slate-200/80 bg-white/95 text-slate-900 shadow-xs'
    }`}>

      {/* Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20 gap-4">
          
          {/* Logo & Brand Identity */}
          <button
            onClick={() => handleNavClick('home')}
            className="flex items-center space-x-3 group text-left cursor-pointer focus:outline-none shrink-0"
          >
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-teal-700 via-teal-600 to-cyan-500 flex items-center justify-center text-white shadow-md shadow-teal-700/20 group-hover:scale-105 transition-all duration-200">
              <Pill className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-xl font-extrabold tracking-tight transition-colors ${
                  isDark ? 'text-white group-hover:text-teal-400' : 'text-slate-900 group-hover:text-teal-700'
                }`}>
                  My Pharmacist
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 uppercase">
                  Healthcare
                </span>
              </div>
              <p className={`text-[11px] font-medium leading-none mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Authentic Medicines & Real-Time Stock
              </p>
            </div>
          </button>

          {/* Quick Search Field in Navbar for Desktop */}
          <form onSubmit={handleSearchSubmit} className="hidden xl:flex items-center flex-1 max-w-xs mx-4">
            <div className={`relative w-full flex items-center rounded-xl border transition-all ${
              isDark 
                ? 'bg-slate-900/80 border-slate-700/80 focus-within:border-teal-500' 
                : 'bg-slate-50 border-slate-200 focus-within:border-teal-600 focus-within:bg-white shadow-xs'
            }`}>
              <Search className="w-4 h-4 text-slate-400 ml-3 shrink-0" />
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

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center space-x-1">
            {[
              { id: 'home', label: 'Home' },
              { id: 'search', label: 'Browse Medicines' },
              { id: 'wellness', label: 'Health & Wellness', isWellnessTrigger: true },
              { id: 'about', label: 'About Us' },
              { id: 'contact', label: 'Contact Us' }
            ].map((item) => {
              const isActive = (activePage === item.id) || 
                (item.isWellnessTrigger && activePage === 'search');

              const handleClick = () => {
                if (item.isWellnessTrigger) {
                  // Direct to vitamins / supplements category if available (category 7)
                  handleNavClick('search', { categoryId: '7' });
                } else {
                  handleNavClick(item.id);
                }
              };

              return (
                <button
                  key={item.id}
                  onClick={handleClick}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer ${
                    isActive
                      ? isDark
                        ? 'bg-teal-500/15 text-teal-300 border border-teal-500/30'
                        : 'bg-teal-50 text-teal-800 border border-teal-200 font-bold'
                      : isDark
                        ? 'text-slate-300 hover:text-white hover:bg-slate-900/70'
                        : 'text-slate-700 hover:text-teal-700 hover:bg-slate-100/80'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Right Controls: Cart, Theme Toggle & Staff Portal */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            
            {/* Search Icon Trigger on tablet/mobile */}
            <button
              onClick={() => handleNavClick('search')}
              className={`p-2.5 rounded-xl border xl:hidden transition-colors cursor-pointer ${
                isDark 
                  ? 'bg-slate-900 text-slate-300 border-slate-800 hover:text-white' 
                  : 'bg-slate-100 text-slate-700 border-slate-200 hover:text-slate-900'
              }`}
              title="Search Medicines"
            >
              <Search className="w-4 h-4" />
            </button>

            {/* Shopping Cart / Inquiry List Icon with Live Counter */}
            <button
              onClick={onOpenCart}
              title="View In-Store Inquiry List"
              className={`relative p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-center ${
                cartCount > 0 
                  ? 'bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 border-teal-300 dark:border-teal-700 shadow-xs' 
                  : isDark 
                    ? 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800' 
                    : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              {cartCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-teal-600 text-white font-black text-[10px] flex items-center justify-center shadow-sm animate-pulse-subtle">
                  {cartCount}
                </span>
              )}
            </button>

            {/* Staff / Admin Controls */}
            {staffUser ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleNavClick('dashboard')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border transition-all cursor-pointer shadow-xs ${
                    activePage === 'dashboard'
                      ? 'bg-teal-700 text-white border-teal-800 shadow-sm'
                      : isDark
                        ? 'bg-slate-900 text-slate-200 border-slate-800 hover:text-white'
                        : 'bg-teal-50 text-teal-800 border-teal-200 hover:bg-teal-100'
                  }`}
                >
                  <Shield className="w-3.5 h-3.5 text-teal-500" />
                  <span className="hidden sm:inline">Dispensary Portal</span>
                  <span className="text-[10px] opacity-80">({staffUser.role})</span>
                </button>
                <button
                  onClick={onLogout}
                  title="Logout from staff session"
                  className={`p-2 rounded-xl border transition-colors cursor-pointer ${
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
                className="px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border bg-teal-700 hover:bg-teal-800 text-white border-teal-800 shadow-xs"
              >
                <Shield className="w-3.5 h-3.5 text-teal-200" />
                <span>Staff Login</span>
              </button>
            )}

            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className={`p-2.5 rounded-xl border lg:hidden transition-colors ${
                isDark ? 'bg-slate-900 text-white border-slate-800' : 'bg-white text-slate-800 border-slate-200'
              }`}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

          </div>

        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className={`lg:hidden border-b px-4 py-4 space-y-2 animate-in slide-in-from-top-2 duration-150 ${
          isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
        }`}>
          {/* Mobile Search */}
          <form onSubmit={handleSearchSubmit} className="mb-3">
            <div className={`relative flex items-center rounded-xl border ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <Search className="w-4 h-4 text-slate-400 ml-3" />
              <input
                type="text"
                value={navSearch}
                onChange={(e) => setNavSearch(e.target.value)}
                placeholder="Search medicine catalog..."
                className="w-full bg-transparent px-3 py-2 text-xs focus:outline-none"
              />
            </div>
          </form>

          {[
            { id: 'home', label: 'Home' },
            { id: 'search', label: 'Browse Medicines' },
            { id: 'about', label: 'About Us' },
            { id: 'contact', label: 'Contact Us' }
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={`w-full px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between text-left ${
                activePage === item.id
                  ? isDark ? 'bg-teal-500/20 text-teal-400' : 'bg-teal-50 text-teal-800 font-bold'
                  : isDark ? 'text-slate-300 hover:bg-slate-900' : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <span>{item.label}</span>
            </button>
          ))}

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
  );
}
