import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function AvailabilityBadge({ status, size = 'md', isStaff = false }) {
  const { isDark } = useTheme();
  const isLarge = size === 'lg';

  // For Pharmacists & Admins (Detailed internal stock views)
  if (isStaff) {
    if (status === 'In Stock') {
      return (
        <span className={`inline-flex items-center gap-1.5 font-bold rounded-full transition-colors ${
          isLarge ? 'px-3.5 py-1.5 text-xs' : 'px-2.5 py-1 text-[11px]'
        } ${
          isDark
            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
            : 'bg-emerald-50 text-emerald-700 border border-emerald-300 shadow-xs'
        }`}>
          <CheckCircle2 className={`${isLarge ? 'w-4 h-4' : 'w-3 h-3'}`} />
          In Stock
        </span>
      );
    }

    if (status === 'Low Stock') {
      return (
        <span className={`inline-flex items-center gap-1.5 font-bold rounded-full transition-colors ${
          isLarge ? 'px-3.5 py-1.5 text-xs' : 'px-2.5 py-1 text-[11px]'
        } ${
          isDark
            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
            : 'bg-amber-50 text-amber-800 border border-amber-300 shadow-xs'
        }`}>
          <AlertTriangle className={`${isLarge ? 'w-4 h-4' : 'w-3 h-3'}`} />
          Low Stock
        </span>
      );
    }

    return (
      <span className={`inline-flex items-center gap-1.5 font-bold rounded-full transition-colors ${
        isLarge ? 'px-3.5 py-1.5 text-xs' : 'px-2.5 py-1 text-[11px]'
      } ${
        isDark
          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
          : 'bg-rose-50 text-rose-800 border border-rose-300 shadow-xs'
      }`}>
        <XCircle className={`${isLarge ? 'w-4 h-4' : 'w-3 h-3'}`} />
        Out of Stock
      </span>
    );
  }

  // For Customers (Clean & Simple: Available vs Not Available)
  const isAvailable = status === 'In Stock' || status === 'Low Stock';

  if (isAvailable) {
    return (
      <span className={`inline-flex items-center gap-1.5 font-bold rounded-full transition-colors ${
        isLarge ? 'px-3.5 py-1.5 text-xs' : 'px-2.5 py-1 text-[11px]'
      } ${
        isDark
          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
          : 'bg-emerald-50 text-emerald-700 border border-emerald-300 shadow-xs'
      }`}>
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <CheckCircle2 className={`${isLarge ? 'w-4 h-4' : 'w-3 h-3'}`} />
        Available
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1.5 font-bold rounded-full transition-colors ${
      isLarge ? 'px-3.5 py-1.5 text-xs' : 'px-2.5 py-1 text-[11px]'
    } ${
      isDark
        ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
        : 'bg-rose-50 text-rose-800 border border-rose-300 shadow-xs'
    }`}>
      <XCircle className={`${isLarge ? 'w-4 h-4' : 'w-3 h-3'}`} />
      Not Available
    </span>
  );
}
