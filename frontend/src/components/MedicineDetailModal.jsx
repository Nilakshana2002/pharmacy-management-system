import React, { useState, useEffect } from 'react';
import { X, Building2, Tag, ShieldCheck, AlertCircle, RefreshCw, Phone, MapPin, Pill, CheckCircle2 } from 'lucide-react';
import AvailabilityBadge from './AvailabilityBadge';
import { getMedicineAvailability } from '../services/api';

export default function MedicineDetailModal({ medicine, onClose }) {
  const [liveAvailability, setLiveAvailability] = useState(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (medicine?.medicine_id) {
      checkLiveStock(medicine.medicine_id);
    }
  }, [medicine]);

  const checkLiveStock = async (id) => {
    try {
      setChecking(true);
      const res = await getMedicineAvailability(id);
      if (res.success) {
        setLiveAvailability(res.data);
      }
    } catch (err) {
      console.error('Failed to query live stock:', err);
    } finally {
      setChecking(false);
    }
  };

  if (!medicine) return null;

  const currentStatus = liveAvailability ? liveAvailability.availability_status : medicine.availability_status;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="relative px-6 py-5 border-b border-slate-800 bg-slate-950/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Pill className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-mono uppercase tracking-wider text-teal-400">Medicine Specifications</span>
              <h2 className="text-xl font-extrabold text-white">{medicine.name}</h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-800 border border-slate-700/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          
          {/* Real-Time Availability Live Banner */}
          <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
            currentStatus === 'In Stock'
              ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
              : currentStatus === 'Low Stock'
              ? 'bg-amber-950/20 border-amber-500/30 text-amber-300'
              : 'bg-rose-950/20 border-rose-500/30 text-rose-300'
          }`}>
            <div className="flex items-start gap-3">
              <div className="pt-0.5">
                <AvailabilityBadge status={currentStatus} size="lg" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Current Physical Store Availability</h4>
                <p className="text-xs mt-0.5 leading-relaxed">
                  {currentStatus === 'Out of Stock'
                    ? 'This medicine is currently out of stock. Please contact the pharmacy for further information.'
                    : currentStatus === 'Low Stock'
                    ? 'Limited saleable units available at our counter. Contact our team to confirm current stock.'
                    : 'Saleable stock is currently verified and available at the VDC Store dispensary.'}
                </p>
              </div>
            </div>

            <button
              onClick={() => checkLiveStock(medicine.medicine_id)}
              disabled={checking}
              className="shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-900 border border-slate-700 text-slate-200 hover:text-white flex items-center gap-1.5 hover:bg-slate-800 transition-all cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${checking ? 'animate-spin' : ''}`} />
              {checking ? 'Checking...' : 'Re-verify Stock'}
            </button>
          </div>

          {/* Key Attributes Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">Generic Molecule</span>
              <span className="text-xs font-bold text-slate-200">{medicine.generic_name}</span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">Brand / Lab</span>
              <span className="text-xs font-bold text-slate-200">{medicine.brand_name}</span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">Therapeutic Category</span>
              <span className="text-xs font-bold text-teal-400">{medicine.category_name}</span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">Dosage Form</span>
              <span className="text-xs font-bold text-slate-200">{medicine.dosage_form}</span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">Strength / Potency</span>
              <span className="text-xs font-bold text-slate-200">{medicine.strength}</span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">Public Unit Price</span>
              <span className="text-xs font-bold text-emerald-400">
                {medicine.is_public_price && medicine.unit_price
                  ? `Rs. ${Number(medicine.unit_price).toFixed(2)}`
                  : 'Inquire In-Store'}
              </span>
            </div>
          </div>

          {/* Description & Clinical Information */}
          <div className="space-y-4 text-xs leading-relaxed text-slate-300">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Therapeutic Description</h4>
              <p className="bg-slate-950/40 p-3 rounded-xl border border-slate-800/60">
                {medicine.description || 'Clinical profile not specified. Please consult a qualified pharmacist.'}
              </p>
            </div>

            {medicine.usage_instructions && (
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Administration & Dosage Instructions</h4>
                <p className="bg-slate-950/40 p-3 rounded-xl border border-slate-800/60 text-slate-300">
                  {medicine.usage_instructions}
                </p>
              </div>
            )}

            {medicine.side_effects && (
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400/80 mb-1.5">Important Safety & Side Effects</h4>
                <p className="bg-amber-950/10 p-3 rounded-xl border border-amber-900/30 text-amber-200/90">
                  {medicine.side_effects}
                </p>
              </div>
            )}
          </div>

          {/* Pharmacy Dispensary Visit Advisory */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-950 to-slate-900 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" />
                In-Store Dispensation Only
              </span>
              <p className="text-xs text-slate-400">
                Visit VDC Store at 124 Galle Road, Bambalapitiya, Colombo 04 with a valid doctor's prescription.
              </p>
            </div>

            <a
              href="tel:+94112345678"
              className="shrink-0 px-4 py-2.5 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/20"
            >
              <Phone className="w-3.5 h-3.5" />
              Call Pharmacy
            </a>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs text-slate-400">
          <span>Batch expiry status verified via database engine</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
