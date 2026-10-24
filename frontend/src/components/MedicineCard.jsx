import React, { useState } from 'react';
import { Eye, Building2, Tag, ShieldCheck, Pill, ThermometerSnowflake, FileText, Star, Sparkles } from 'lucide-react';
import AvailabilityBadge from './AvailabilityBadge';
import { useTheme } from '../context/ThemeContext';
import { getMedicineProductImage } from '../utils/pharmacyImages';
import { getMedicinePricing } from '../utils/medicinePricing';

export default function MedicineCard({ 
  medicine, 
  onViewDetails 
}) {
  const { isDark } = useTheme();
  const [imgError, setImgError] = useState(false);

  // Determine if medicine is typically prescription-only or OTC based on category / dosage
  const isPrescription = ['Antibiotics', 'Antibiotics & Antimicrobials', 'Cardiovascular', 'Cardiovascular & Blood Pressure', 'Respiratory', 'Respiratory & Allergy'].includes(medicine.category_name) || 
    medicine.dosage_form?.toLowerCase().includes('injection');

  const isWellness = Boolean(medicine.is_wellness) || [
    'Diet & Nutrition', 
    'Beauty Care & Cosmetics', 
    'Personal Care & Hygiene', 
    'Baby & Mother Care', 
    'Medical Devices & Equipment', 
    'Ayurvedic & Herbal Care'
  ].includes(medicine.category_name);

  const {
    isPublic,
    isOffer,
    regularPrice,
    finalPrice,
    discountPercent,
    discountDeduction,
    formattedFinalPrice,
    formattedRegularPrice,
    formattedDiscountDeduction
  } = getMedicinePricing(medicine);

  const rating = medicine.rating || 5;
  const productImage = imgError ? null : getMedicineProductImage(medicine);

  return (
    <div className={`group relative rounded-2xl p-4 flex flex-col justify-between transition-all duration-300 border ${
      isDark 
        ? 'bg-slate-900/80 hover:bg-slate-900 border-slate-800 hover:border-teal-500/40 hover:shadow-xl hover:shadow-teal-950/20' 
        : 'bg-white hover:bg-slate-50/50 border-slate-200/90 hover:border-teal-500/50 hover:shadow-xl hover:shadow-slate-200/70'
    }`}>
      
      {/* Corner Sale Badge if on Offer */}
      {isOffer && (
        <div className="absolute -top-2.5 -right-2.5 z-20">
          <span className="px-2.5 py-1 rounded-full text-[10px] font-black tracking-wide uppercase bg-gradient-to-r from-amber-500 via-rose-500 to-red-600 text-white shadow-md flex items-center gap-1">
            <Sparkles className="w-2.5 h-2.5" />
            <span>-{discountPercent}% OFF</span>
          </span>
        </div>
      )}

      {/* Top Section with Image & Badges */}
      <div>
        {/* Visual Product Thumbnail Header */}
        <div className="relative w-full h-48 rounded-xl overflow-hidden mb-3.5 bg-slate-50/80 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800/80 p-2.5 flex items-center justify-center">
          {productImage ? (
            <img 
              src={productImage} 
              alt={medicine.name}
              onError={() => setImgError(true)}
              loading="lazy"
              className="w-full h-full object-contain object-center group-hover:scale-105 transition-transform duration-300 drop-shadow-sm"
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-slate-400 p-4">
              <Pill className="w-12 h-12 stroke-[1.5] mb-1 text-teal-600/60" />
              <span className="text-[11px] font-medium">{medicine.dosage_form || 'Medicine'}</span>
            </div>
          )}

          {/* Floating Badges on Image */}
          <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none">
            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider backdrop-blur-md shadow-xs ${
              isWellness
                ? 'bg-pink-600/90 text-white'
                : isPrescription
                  ? 'bg-amber-500/90 text-white'
                  : 'bg-teal-600/90 text-white'
            }`}>
              {isWellness ? <Sparkles className="w-2.5 h-2.5" /> : <FileText className="w-2.5 h-2.5" />}
              {isWellness ? 'Wellness' : isPrescription ? 'Rx Required' : 'OTC'}
            </span>

            <div className="backdrop-blur-md rounded-full shadow-xs">
              <AvailabilityBadge status={medicine.availability_status} size="sm" />
            </div>
          </div>
        </div>

        {/* Category & Rating Label */}
        <div className="flex items-center justify-between gap-1.5 mb-1.5">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
            isDark 
              ? 'bg-teal-950/60 text-teal-300 border border-teal-800/60' 
              : 'bg-teal-50 text-teal-700 border border-teal-200/80'
          }`}>
            <Tag className="w-2.5 h-2.5 text-teal-500" />
            <span className="truncate max-w-[130px]">{medicine.category_name}</span>
          </span>

          {/* Star Rating */}
          <div className="flex items-center gap-1 text-amber-400 text-xs font-bold">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            <span className="text-[11px] text-slate-600 dark:text-slate-300">{Number(rating).toFixed(1)}</span>
          </div>
        </div>

        {/* Medicine Trade Name */}
        <h3 className={`text-base font-extrabold transition-colors line-clamp-1 mb-0.5 ${
          isDark ? 'text-white group-hover:text-teal-400' : 'text-slate-900 group-hover:text-teal-700'
        }`}>
          {medicine.name}
        </h3>

        {/* Generic Chemical Active Ingredient */}
        <p className={`text-xs font-medium italic mb-2.5 line-clamp-1 ${
          isDark ? 'text-slate-400' : 'text-slate-600'
        }`}>
          Active: <span className={isDark ? 'text-slate-300' : 'text-slate-700'}>{medicine.generic_name}</span>
        </p>

        {/* Brand & Strength Specs */}
        <div className="flex flex-wrap items-center gap-1.5 mb-3">
          <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md border font-medium ${
            isDark ? 'text-slate-300 bg-slate-800/80 border-slate-700/60' : 'text-slate-700 bg-slate-100 border-slate-200'
          }`}>
            <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
            <span className="truncate max-w-[120px]">{medicine.brand_name}</span>
          </span>
          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border ${
            isDark ? 'text-teal-400 bg-teal-950/40 border-teal-800/50' : 'text-teal-800 bg-teal-50/80 border-teal-200'
          }`}>
            {medicine.strength} • {medicine.dosage_form}
          </span>
        </div>

        {/* Short Description */}
        <p className={`text-xs line-clamp-2 leading-relaxed mb-4 ${
          isDark ? 'text-slate-400' : 'text-slate-500'
        }`}>
          {medicine.description || 'Verified pharmaceutical formulation stocked under certified dispensary standards.'}
        </p>
      </div>

      {/* Bottom Row: Price and Actions */}
      <div className={`pt-3.5 border-t flex items-center justify-between gap-2 ${
        isDark ? 'border-slate-800' : 'border-slate-100'
      }`}>
        {/* Real Price Display with Strikethrough & Promotional Savings support */}
        <div>
          {isPublic && regularPrice > 0 ? (
            <div>
              <span className={`text-[10px] uppercase font-bold tracking-wider block ${
                isOffer ? 'text-rose-500 dark:text-rose-400 font-extrabold' : isDark ? 'text-slate-500' : 'text-slate-400'
              }`}>
                {isOffer ? `Special Offer (-${discountPercent}%)` : 'Counter Price'}
              </span>
              <div className="flex items-baseline gap-1.5 flex-wrap">
                <span className={`text-base font-black ${
                  isOffer ? 'text-rose-600 dark:text-rose-400' : isDark ? 'text-white' : 'text-slate-900'
                }`}>
                  Rs. {formattedFinalPrice}
                </span>
                {isOffer && (
                  <span className="text-xs text-slate-400 line-through font-medium">
                    Rs. {formattedRegularPrice}
                  </span>
                )}
              </div>
              {isOffer && discountDeduction > 0 && (
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 block -mt-0.5">
                  Save Rs. {formattedDiscountDeduction}
                </span>
              )}
            </div>
          ) : (
            <div>
              <span className={`text-[10px] uppercase font-bold tracking-wider block ${
                isDark ? 'text-slate-500' : 'text-slate-400'
              }`}>
                Counter Price
              </span>
              <span className={`text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Inquire In-Store
              </span>
            </div>
          )}
        </div>

        {/* Action Button: View Details */}
        <div>
          <button
            onClick={() => onViewDetails(medicine)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs ${
              isDark
                ? 'bg-teal-600 hover:bg-teal-500 text-white'
                : 'bg-teal-700 hover:bg-teal-800 text-white'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Details</span>
          </button>
        </div>
      </div>
    </div>
  );
}
