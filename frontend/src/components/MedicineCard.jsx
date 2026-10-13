import React from 'react';
import { Eye, Building2, Tag, ShieldCheck } from 'lucide-react';
import AvailabilityBadge from './AvailabilityBadge';

export default function MedicineCard({ medicine, onViewDetails }) {
  return (
    <div className="group relative bg-slate-900/60 hover:bg-slate-900/90 border border-slate-800 hover:border-emerald-500/40 rounded-2xl p-5 flex flex-col justify-between transition-all duration-300 hover:shadow-xl hover:shadow-emerald-950/20 backdrop-blur-sm">
      {/* Top Meta info */}
      <div>
        <div className="flex items-start justify-between gap-3 mb-3">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-slate-800/80 text-teal-300 border border-slate-700/60">
            <Tag className="w-3 h-3 text-teal-400" />
            {medicine.category_name}
          </span>
          <AvailabilityBadge status={medicine.availability_status} />
        </div>

        {/* Medicine Name and Strength */}
        <h3 className="text-lg font-bold text-white group-hover:text-emerald-400 transition-colors line-clamp-1 mb-1">
          {medicine.name}
        </h3>

        {/* Generic Name */}
        <p className="text-xs text-slate-400 font-medium italic mb-3 line-clamp-1">
          Active: {medicine.generic_name}
        </p>

        {/* Brand & Strength Pills */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span className="inline-flex items-center gap-1 text-[11px] text-slate-300 bg-slate-800/50 px-2 py-0.5 rounded-md border border-slate-700/50">
            <Building2 className="w-3 h-3 text-slate-400" />
            {medicine.brand_name}
          </span>
          <span className="text-[11px] text-emerald-400 font-mono bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
            {medicine.strength} • {medicine.dosage_form}
          </span>
        </div>

        {/* Short Description */}
        <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed mb-4">
          {medicine.description || 'Verified pharmaceutical preparation available through physical dispensary verification.'}
        </p>
      </div>

      {/* Bottom Row: Price and View Details Action */}
      <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between">
        <div>
          {medicine.is_public_price && medicine.unit_price ? (
            <div>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Dispensing Price</span>
              <span className="text-base font-extrabold text-white">
                Rs. {Number(medicine.unit_price).toFixed(2)}
              </span>
            </div>
          ) : (
            <div>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Price Info</span>
              <span className="text-xs font-semibold text-slate-400">Inquire In-Store</span>
            </div>
          )}
        </div>

        {/* View Details Only — NO ADD TO CART OR BUY BUTTONS */}
        <button
          onClick={() => onViewDetails(medicine)}
          className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-500/15 hover:bg-emerald-500 text-emerald-400 hover:text-slate-950 border border-emerald-500/30 hover:border-emerald-500 transition-all duration-200 flex items-center gap-1.5 cursor-pointer shadow-sm hover:shadow-emerald-500/20"
        >
          <Eye className="w-3.5 h-3.5" />
          Check Details
        </button>
      </div>
    </div>
  );
}
