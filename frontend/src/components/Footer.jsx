import React from 'react';
import { Pill, Phone, MapPin, Clock, Shield, AlertCircle } from 'lucide-react';

export default function Footer({ setActivePage }) {
  return (
    <footer className="border-t border-slate-800/80 bg-slate-950 text-slate-400 mt-20">
      {/* Informational Disclaimer Banner */}
      <div className="bg-emerald-950/30 border-b border-emerald-900/30 py-3.5 px-4 text-center">
        <div className="max-w-7xl mx-auto flex items-center justify-center gap-2 text-xs text-emerald-300 font-medium">
          <AlertCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            <strong>Informational Service Notice:</strong> VDC Store provides medicine catalog search and physical pharmacy stock verification. No online purchasing, ordering, or delivery is processed through this website.
          </span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          
          {/* Brand & Purpose */}
          <div className="md:col-span-1 space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 shadow-md">
                <Pill className="w-5 h-5 stroke-[2.5]" />
              </div>
              <span className="text-lg font-bold text-white tracking-tight">VDC Store</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Your verified medicine availability partner. Check real-time stock levels of genuine prescription and OTC medications before visiting our dispensary.
            </p>
            <div className="pt-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono bg-slate-900 text-teal-400 border border-slate-800">
                MySQL 8.0+ Raw Query Engine
              </span>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-slate-200 tracking-wide uppercase">Navigation</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button
                  onClick={() => setActivePage('home')}
                  className="hover:text-emerald-400 transition-colors cursor-pointer"
                >
                  Pharmacy Home
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActivePage('search')}
                  className="hover:text-emerald-400 transition-colors cursor-pointer"
                >
                  Search All Medicines
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActivePage('about')}
                  className="hover:text-emerald-400 transition-colors cursor-pointer"
                >
                  About & Contact Us
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActivePage('login')}
                  className="hover:text-teal-400 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Shield className="w-3 h-3 text-teal-400" />
                  Staff Management Portal
                </button>
              </li>
            </ul>
          </div>

          {/* Store Hours */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-slate-200 tracking-wide uppercase flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-400" />
              Opening Hours
            </h4>
            <div className="space-y-1.5 text-xs text-slate-400">
              <div className="flex justify-between">
                <span>Mon – Fri:</span>
                <span className="text-slate-200 font-medium">8:00 AM – 10:00 PM</span>
              </div>
              <div className="flex justify-between">
                <span>Saturday:</span>
                <span className="text-slate-200 font-medium">8:30 AM – 9:00 PM</span>
              </div>
              <div className="flex justify-between">
                <span>Sunday & Holidays:</span>
                <span className="text-slate-200 font-medium">9:00 AM – 6:00 PM</span>
              </div>
            </div>
          </div>

          {/* Physical Location & Contact */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-slate-200 tracking-wide uppercase flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-400" />
              Store Address
            </h4>
            <div className="space-y-2 text-xs text-slate-400">
              <p className="leading-relaxed">
                124 Galle Road, Bambalapitiya,<br />
                Colombo 04, Sri Lanka
              </p>
              <div className="flex items-center gap-2 text-emerald-400 pt-1">
                <Phone className="w-3.5 h-3.5" />
                <span className="font-semibold">+94 11 234 5678 / +94 77 123 4567</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-slate-900 mt-12 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <p>© {new Date().getFullYear()} VDC Store Pharmacy. All rights reserved.</p>
          <div className="flex items-center gap-4 text-slate-400 text-[11px]">
            <span>Physical Dispensing Only</span>
            <span>•</span>
            <span>Batch Expiry Excluded</span>
            <span>•</span>
            <span>3NF Normalized RDBMS</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
