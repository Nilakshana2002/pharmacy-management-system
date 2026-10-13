import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import MedicineDetailModal from './components/MedicineDetailModal';
import HomePage from './pages/HomePage';
import MedicineSearchPage from './pages/MedicineSearchPage';
import AboutContactPage from './pages/AboutContactPage';
import StaffLoginPage from './pages/StaffLoginPage';
import StaffDashboardPage from './pages/StaffDashboardPage';

export default function App() {
  const [activePage, setActivePage] = useState('home'); // 'home', 'search', 'about', 'login', 'dashboard'
  const [searchParams, setSearchParams] = useState({ query: '', categoryId: '' });
  const [selectedMedicine, setSelectedMedicine] = useState(null);
  const [staffUser, setStaffUser] = useState(null);

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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-emerald-500 selection:text-slate-950 font-sans">
      
      {/* Ambient background glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/3 -right-40 w-96 h-96 bg-teal-600/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl"></div>
      </div>

      {/* Main Navbar */}
      <Navbar
        activePage={activePage}
        setActivePage={navigateTo}
        staffUser={staffUser}
        onLogout={handleLogout}
      />

      {/* Page Content */}
      <main className="relative z-10 flex-1 w-full">
        {activePage === 'home' && (
          <HomePage
            setActivePage={navigateTo}
            setSelectedCategory={(catId) => setSearchParams((prev) => ({ ...prev, categoryId: catId }))}
            onViewDetails={(med) => setSelectedMedicine(med)}
          />
        )}

        {activePage === 'search' && (
          <MedicineSearchPage
            initialQuery={searchParams.query}
            initialCategoryId={searchParams.categoryId}
            onViewDetails={(med) => setSelectedMedicine(med)}
          />
        )}

        {activePage === 'about' && (
          <AboutContactPage />
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
        />
      )}

      {/* Footer */}
      <Footer setActivePage={navigateTo} />
    </div>
  );
}
