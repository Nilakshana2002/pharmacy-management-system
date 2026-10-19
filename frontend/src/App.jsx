import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import MedicineDetailModal from './components/MedicineDetailModal';
import InquiryCartModal from './components/InquiryCartModal';
import HomePage from './pages/HomePage';
import MedicineSearchPage from './pages/MedicineSearchPage';
import AboutContactPage from './pages/AboutContactPage';
import StaffLoginPage from './pages/StaffLoginPage';
import StaffDashboardPage from './pages/StaffDashboardPage';
import { useTheme } from './context/ThemeContext';

export default function App() {
  const { isDark } = useTheme();
  const [activePage, setActivePage] = useState('home'); // 'home', 'search', 'about', 'login', 'dashboard'
  const [searchParams, setSearchParams] = useState({ query: '', categoryId: '' });
  const [selectedMedicine, setSelectedMedicine] = useState(null);
  const [staffUser, setStaffUser] = useState(null);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // In-Store Inquiry Cart state (persisted to localStorage)
  const [cartItems, setCartItems] = useState(() => {
    try {
      const saved = localStorage.getItem('my_pharmacist_cart');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('my_pharmacist_cart', JSON.stringify(cartItems));
    } catch (e) {
      console.warn('Could not persist cart to storage', e);
    }
  }, [cartItems]);

  // Restore staff session if token exists
  useEffect(() => {
    const token = localStorage.getItem('vdc_staff_token');
    const userStr = localStorage.getItem('vdc_staff_user');
    if (token && userStr) {
      try {
        setStaffUser(JSON.parse(userStr));
      } catch (e) {
        localStorage.removeItem('vdc_staff_token');
        localStorage.removeItem('vdc_staff_user');
      }
    }
  }, []);

  const navigateTo = (page, params = {}) => {
    if (params.query !== undefined || params.categoryId !== undefined) {
      setSearchParams({
        query: params.query || '',
        categoryId: params.categoryId || ''
      });
    }
    setActivePage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLogout = () => {
    localStorage.removeItem('vdc_staff_token');
    localStorage.removeItem('vdc_staff_user');
    setStaffUser(null);
    setActivePage('home');
  };

  const handleAddToCart = (medicine) => {
    setCartItems(prev => {
      const exists = prev.find(item => item.medicine_id === medicine.medicine_id);
      if (exists) {
        return prev.filter(item => item.medicine_id !== medicine.medicine_id);
      }
      return [...prev, { ...medicine, quantity: 1 }];
    });
  };

  const handleRemoveCartItem = (id) => {
    setCartItems(prev => prev.filter(item => item.medicine_id !== id));
  };

  const handleClearCart = () => {
    setCartItems([]);
  };

  const isItemSavedInCart = (id) => cartItems.some(item => item.medicine_id === id);

  return (
    <div className={`min-h-screen flex flex-col justify-between selection:bg-teal-500 selection:text-white font-sans transition-colors duration-200 ${
      isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
    }`}>
      
      {/* Ambient background glows for customer-facing pages */}
      {activePage !== 'dashboard' && (
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
          <div className={`absolute -top-40 -left-40 w-96 h-96 rounded-full blur-3xl transition-opacity duration-300 ${
            isDark ? 'bg-teal-700/10' : 'bg-teal-300/20'
          }`}></div>
          <div className={`absolute top-1/3 -right-40 w-96 h-96 rounded-full blur-3xl transition-opacity duration-300 ${
            isDark ? 'bg-cyan-700/10' : 'bg-cyan-200/25'
          }`}></div>
          <div className={`absolute -bottom-40 left-1/3 w-96 h-96 rounded-full blur-3xl transition-opacity duration-300 ${
            isDark ? 'bg-teal-800/10' : 'bg-emerald-200/20'
          }`}></div>
        </div>
      )}

      {/* Top Banner when Pharmacist is browsing public website */}
      {activePage !== 'dashboard' && staffUser && (
        <div className="bg-teal-800 text-white text-xs px-4 py-2 flex items-center justify-between z-50 sticky top-0 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Browsing Storefront as: <strong>{staffUser.fullName}</strong> ({staffUser.role})</span>
          </div>
          <button
            onClick={() => navigateTo('dashboard')}
            className="px-3 py-1 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <span>Return to Dispensary Dashboard</span>
            <span>→</span>
          </button>
        </div>
      )}

      {/* Main Navbar - Only shown on customer-facing pages */}
      {activePage !== 'dashboard' && (
        <Navbar
          activePage={activePage}
          setActivePage={navigateTo}
          staffUser={staffUser}
          onLogout={handleLogout}
          cartCount={cartItems.length}
          onOpenCart={() => setIsCartOpen(true)}
        />
      )}

      {/* Page Content */}
      <main className="relative z-10 flex-1 w-full">
        {activePage === 'home' && (
          <HomePage
            setActivePage={navigateTo}
            setSelectedCategory={(catId) => setSearchParams((prev) => ({ ...prev, categoryId: catId }))}
            onViewDetails={(med) => setSelectedMedicine(med)}
            onAddToCart={handleAddToCart}
            cartItems={cartItems}
          />
        )}

        {activePage === 'search' && (
          <MedicineSearchPage
            initialQuery={searchParams.query}
            initialCategoryId={searchParams.categoryId}
            onViewDetails={(med) => setSelectedMedicine(med)}
            onAddToCart={handleAddToCart}
            cartItems={cartItems}
          />
        )}

        {(activePage === 'about' || activePage === 'contact') && (
          <AboutContactPage initialFocus={activePage === 'contact' ? 'contact' : 'about'} />
        )}

        {activePage === 'login' && (
          <StaffLoginPage
            onLoginSuccess={(user) => {
              setStaffUser(user);
              setActivePage('dashboard');
            }}
            setActivePage={navigateTo}
          />
        )}

        {activePage === 'dashboard' && (
          staffUser ? (
            <StaffDashboardPage
              staffUser={staffUser}
              onLogout={handleLogout}
              onBrowseWebsite={() => navigateTo('home')}
            />
          ) : (
            <StaffLoginPage
              onLoginSuccess={(user) => {
                setStaffUser(user);
                setActivePage('dashboard');
              }}
              setActivePage={navigateTo}
            />
          )
        )}
      </main>

      {/* Detail Modal */}
      {selectedMedicine && (
        <MedicineDetailModal
          medicine={selectedMedicine}
          onClose={() => setSelectedMedicine(null)}
          onAddToCart={handleAddToCart}
          isSaved={isItemSavedInCart(selectedMedicine.medicine_id)}
        />
      )}

      {/* In-Store Inquiry Cart Modal */}
      <InquiryCartModal
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cartItems={cartItems}
        onRemoveItem={handleRemoveCartItem}
        onClearCart={handleClearCart}
        onSelectMedicine={(med) => setSelectedMedicine(med)}
      />

      {/* Public Footer (Hidden when on internal staff dashboard for seamless full-bleed admin layout) */}
      {activePage !== 'dashboard' && (
        <Footer setActivePage={navigateTo} />
      )}
    </div>
  );
}
