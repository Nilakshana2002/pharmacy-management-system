import React, { useState, useEffect } from 'react';
import { 
  Building2, Phone, Mail, MapPin, Clock, ShieldCheck, 
  Send, CheckCircle2, MessageSquare, AlertCircle, HeartHandshake
} from 'lucide-react';
import { getPublicSettings } from '../services/api';

export default function AboutContactPage() {
  const [settings, setSettings] = useState({});
  const [formData, setFormData] = useState({ name: '', phone: '', medicineQuery: '', message: '' });
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const res = await getPublicSettings();
      if (res.success) {
        setSettings(res.data);
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setFormData({ name: '', phone: '', medicineQuery: '', message: '' });
    }, 4000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-16">
      
      {/* Header Banner */}
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
          <HeartHandshake className="w-4 h-4" />
          <span>Patient-Centered Healthcare Information</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-white">
          About VDC Store Pharmacy
        </h1>
        <p className="text-sm sm:text-base text-slate-400 leading-relaxed">
          VDC Store is an established retail pharmacy dedicated to pharmaceutical integrity, patient counseling, and accurate medicine availability tracking.
        </p>
      </div>

      {/* Grid: Details & Hours / Inquiry Form */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        
        {/* Left Column: Pharmacy Information & Operating Schedule */}
        <div className="space-y-6">
          <div className="p-8 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
              <Building2 className="w-5 h-5 text-emerald-400" />
              Dispensary & Location Details
            </h2>

            <div className="space-y-4 text-xs sm:text-sm text-slate-300">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-white block">Physical Pharmacy Address:</span>
                  <p className="text-slate-400 mt-0.5 leading-relaxed">
                    {settings.address_street || '124 Galle Road, Bambalapitiya'},<br />
                    {settings.address_city || 'Colombo 04, Sri Lanka'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-white block">Pharmacist Helplines:</span>
                  <p className="text-slate-400 mt-0.5">
                    Landline: {settings.phone_primary || '+94 11 234 5678'}<br />
                    24/7 Stock Hotline: {settings.phone_hotline || '+94 77 123 4567'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-white block">Inquiries Email:</span>
                  <p className="text-slate-400 mt-0.5">
                    {settings.email || 'info@vdcstore.com'}
                  </p>
                </div>
              </div>
            </div>

            {/* Operating Hours Box */}
            <div className="pt-4 border-t border-slate-800">
              <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4 text-teal-400" />
                Dispensary Counter Timetable
              </h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1.5 px-3 rounded-lg bg-slate-950/60 border border-slate-800">
                  <span className="text-slate-400">Monday – Friday</span>
                  <span className="font-semibold text-emerald-400">{settings.hours_weekday || '8:00 AM – 10:00 PM'}</span>
                </div>
                <div className="flex justify-between py-1.5 px-3 rounded-lg bg-slate-950/60 border border-slate-800">
                  <span className="text-slate-400">Saturday</span>
                  <span className="font-semibold text-emerald-400">{settings.hours_saturday || '8:30 AM – 9:00 PM'}</span>
                </div>
                <div className="flex justify-between py-1.5 px-3 rounded-lg bg-slate-950/60 border border-slate-800">
                  <span className="text-slate-400">Sunday & Public Holidays</span>
                  <span className="font-semibold text-emerald-400">{settings.hours_sunday || '9:00 AM – 6:00 PM'}</span>
                </div>
              </div>
            </div>

            {/* In-Store Dispensation Reminder */}
            <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/20 text-xs text-emerald-300 flex items-start gap-3">
              <AlertCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                <strong>Dispensation Protocol:</strong> Prescription drugs strictly require a physical prescription issued by a registered medical practitioner. No medicines are shipped or delivered online.
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Medicine Availability Inquiry Form */}
        <div className="p-8 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-6">
          <div>
            <span className="text-xs font-mono uppercase tracking-wider text-teal-400 font-semibold">Have a Question?</span>
            <h2 className="text-xl font-bold text-white mt-1">Medicine Availability Inquiry</h2>
            <p className="text-xs text-slate-400 mt-1">
              Need to check on a specialized formulation or have questions for our pharmacists? Send an inquiry and our team will verify our stock.
            </p>
          </div>

          {submitted ? (
            <div className="p-6 rounded-2xl bg-emerald-950/30 border border-emerald-500/40 text-center space-y-3">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
              <h4 className="text-base font-bold text-white">Inquiry Received</h4>
              <p className="text-xs text-slate-300">
                Thank you! Our pharmacy team has logged your stock verification inquiry and will contact you via phone promptly during dispensary hours.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Your Full Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Kasun Fernando"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Phone Number for Verification</label>
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="e.g. +94 77 123 4567"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Medicine Name & Strength</label>
                <input
                  type="text"
                  required
                  value={formData.medicineQuery}
                  onChange={(e) => setFormData({ ...formData, medicineQuery: e.target.value })}
                  placeholder="e.g. Augmentin 625mg or Salbutamol Inhaler"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Additional Notes / Inquiry Details</label>
                <textarea
                  rows={3}
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Ask any dosage, brand alternative, or batch inquiry..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 resize-none"
                ></textarea>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-emerald-500/20"
              >
                <Send className="w-4 h-4" />
                Submit Availability Inquiry
              </button>
            </form>
          )}

        </div>

      </div>

    </div>
  );
}
