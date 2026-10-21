import React from 'react';
import { Pill, Phone, MapPin, Clock, Shield, AlertCircle, Heart, Stethoscope, CheckCircle2 } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function Footer({ setActivePage }) {
  const { isDark } = useTheme();

  return (
    <footer className={`border-t transition-colors ${
      isDark ? 'border-slate-800/80 bg-slate-950 text-slate-400' : 'border-slate-200 bg-white text-slate-600'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          
          {/* Brand & Mission Statement */}
          <div className="md:col-span-1 space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1 flex items-center justify-center shadow-sm">
                <img src="/favicon.svg" alt="My Pharmacist" className="w-full h-full object-contain" />
              </div>
              <div>
                <span className="text-lg font-black tracking-tight">
                  <span className="text-[#164e39] dark:text-emerald-400">My </span>
                  <span className="text-[#268a84] dark:text-teal-400">Pharmacist</span>
                </span>
                <p className="text-[8.5px] font-extrabold uppercase tracking-wider text-slate-400">
                  Modern Dispensary &amp; Healthcare System
                </p>
              </div>
            </div>
            <p className="text-xs leading-relaxed">
              Your verified healthcare and medicine availability partner. Check real-time stock levels of genuine prescription and OTC medications before visiting our dispensary.
            </p>
            <div className="pt-2">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border ${
                isDark ? 'bg-teal-950/40 text-teal-300 border-teal-800/60' : 'bg-teal-50 text-teal-800 border-teal-200'
              }`}>
                <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                Licensed Healthcare Dispensary
              </span>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <h4 className={`text-xs font-bold tracking-wider uppercase ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>
              Navigation & Catalog
            </h4>
            <ul className="space-y-2 text-xs font-medium">
              <li>
                <button
                  onClick={() => setActivePage('home')}
                  className="hover:text-teal-600 dark:hover:text-teal-400 transition-colors cursor-pointer"
                >
                  Pharmacy Home
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActivePage('search')}
                  className="hover:text-teal-600 dark:hover:text-teal-400 transition-colors cursor-pointer"
                >
                  Browse Medicines Catalog
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActivePage('search', { categoryId: 'nutrition' })}
                  className="hover:text-teal-600 dark:hover:text-teal-400 transition-colors cursor-pointer"
                >
                  Beauty, Nutrition & Wellness
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActivePage('search', { query: 'offer' })}
                  className="hover:text-teal-600 dark:hover:text-teal-400 transition-colors cursor-pointer text-amber-600 font-semibold flex items-center gap-1"
                >
                  <span>🔥 Special Offers & Promotions</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActivePage('contact')}
                  className="hover:text-teal-600 dark:hover:text-teal-400 transition-colors cursor-pointer"
                >
                  Contact Us & Dispensary Hours
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActivePage('about')}
                  className="hover:text-teal-600 dark:hover:text-teal-400 transition-colors cursor-pointer"
                >
                  About Our Dispensary
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActivePage('login')}
                  className="hover:text-teal-600 dark:hover:text-teal-400 transition-colors flex items-center gap-1.5 cursor-pointer font-bold text-teal-700 dark:text-teal-400 pt-1"
                >
                  <Shield className="w-3.5 h-3.5" />
                  Staff Dispensary Portal
                </button>
              </li>
            </ul>
          </div>

          {/* Dispensary Hours */}
          <div className="space-y-3">
            <h4 className={`text-xs font-bold tracking-wider uppercase flex items-center gap-2 ${
              isDark ? 'text-slate-200' : 'text-slate-900'
            }`}>
              <Clock className="w-4 h-4 text-teal-600" />
              Dispensary Hours
            </h4>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between pb-1 border-b border-slate-100 dark:border-slate-800">
                <span>Mon – Fri:</span>
                <span className={`font-bold ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>8:00 AM – 10:00 PM</span>
              </div>
              <div className="flex justify-between pb-1 border-b border-slate-100 dark:border-slate-800">
                <span>Saturday:</span>
                <span className={`font-bold ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>8:30 AM – 9:00 PM</span>
              </div>
              <div className="flex justify-between">
                <span>Sunday & Holidays:</span>
                <span className={`font-bold ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>9:00 AM – 6:00 PM</span>
              </div>
            </div>
          </div>

          {/* Location & Hotlines */}
          <div className="space-y-3">
            <h4 className={`text-xs font-bold tracking-wider uppercase flex items-center gap-2 ${
              isDark ? 'text-slate-200' : 'text-slate-900'
            }`}>
              <MapPin className="w-4 h-4 text-teal-600" />
              Physical Store
            </h4>
            <div className="space-y-2 text-xs">
              <p className="leading-relaxed">
                124 Galle Road, Bambalapitiya,<br />
                Colombo 04, Sri Lanka
              </p>
              <div className="pt-2 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-teal-700 dark:text-teal-400">
                  <Phone className="w-3.5 h-3.5" />
                  <span>+94 11 234 5678</span>
                </div>
                <div className="text-[11px] text-slate-400">
                  24/7 Prescription Hotline: +94 77 123 4567
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Bottom copyright and legal disclaimer */}
        <div className={`pt-8 mt-10 border-t flex flex-col sm:flex-row items-center justify-between text-xs gap-3 ${
          isDark ? 'border-slate-800/80 text-slate-500' : 'border-slate-200 text-slate-500'
        }`}>
          <div>
            © {new Date().getFullYear()} My Pharmacist Management System. All rights reserved.
          </div>
          <div className="flex items-center gap-3">
            <span>Reg #PH-LK/2026/04</span>
            <span>•</span>
            <span>SLMC Certified Community Dispensary</span>
            <span>•</span>
            <span>NMRA Regulated</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
