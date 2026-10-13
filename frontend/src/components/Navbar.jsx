import React from 'react';
import { Pill, Search, Shield, Info, Home, LogOut } from 'lucide-react';

export default function Navbar({ activePage, setActivePage, staffUser, onLogout }) {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Logo Branding */}
          <button
            onClick={() => setActivePage('home')}
            className="flex items-center space-x-3.5 group text-left cursor-pointer focus:outline-none"
          >
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-500 via-teal-400 to-cyan-400 flex items-center justify-center text-slate-950 shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform duration-200">
              <Pill className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-extrabold tracking-tight text-white group-hover:text-emerald-400 transition-colors">
                  VDC Store
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase">
                  Pharmacy
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">Medicine Search & Availability Verification</p>
            </div>
          </button>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1">
            <button
              onClick={() => setActivePage('home')}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center gap-2 cursor-pointer ${
                activePage === 'home'
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-900/60'
              }`}
            >
              <Home className="w-4 h-4" />
              Home
            </button>

            <button
              onClick={() => setActivePage('search')}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center gap-2 cursor-pointer ${
                activePage === 'search'
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-900/60'
              }`}
            >
              <Search className="w-4 h-4" />
              Search Medicines
            </button>

            <button
              onClick={() => setActivePage('about')}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center gap-2 cursor-pointer ${
                activePage === 'about'
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-900/60'
              }`}
            >
              <Info className="w-4 h-4" />
              About & Contact
            </button>
          </nav>

          {/* Staff Login / Management Portal Shortcut */}
          <div className="flex items-center space-x-3">
            {staffUser ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActivePage('dashboard')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 border transition-all cursor-pointer ${
                    activePage === 'dashboard'
                      ? 'bg-teal-500/20 text-teal-300 border-teal-500/40'
                      : 'bg-slate-900/80 text-slate-300 border-slate-700/80 hover:text-white hover:border-slate-600'
                  }`}
                >
                  <Shield className="w-3.5 h-3.5 text-teal-400" />
                  <span>Staff Portal ({staffUser.role})</span>
                </button>
                <button
                  onClick={onLogout}
                  title="Logout"
                  className="p-1.5 rounded-xl bg-slate-900 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-800 transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setActivePage('login')}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-900/80 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 transition-all flex items-center gap-2 cursor-pointer"
              >
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                <span>Staff Login</span>
              </button>
            )}
          </div>
        </div>
      </div>
      
      {/* Mobile Navigation bar */}
      <div className="md:hidden border-t border-slate-800/60 px-4 py-2.5 flex items-center justify-around bg-slate-950/95">
        <button
          onClick={() => setActivePage('home')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 ${
            activePage === 'home' ? 'text-emerald-400 bg-emerald-500/10' : 'text-slate-400'
          }`}
        >
          <Home className="w-3.5 h-3.5" />
          Home
        </button>
        <button
          onClick={() => setActivePage('search')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 ${
            activePage === 'search' ? 'text-emerald-400 bg-emerald-500/10' : 'text-slate-400'
          }`}
        >
          <Search className="w-3.5 h-3.5" />
          Search
        </button>
        <button
          onClick={() => setActivePage('about')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 ${
            activePage === 'about' ? 'text-emerald-400 bg-emerald-500/10' : 'text-slate-400'
          }`}
        >
          <Info className="w-3.5 h-3.5" />
          About
        </button>
      </div>
    </header>
  );
}
