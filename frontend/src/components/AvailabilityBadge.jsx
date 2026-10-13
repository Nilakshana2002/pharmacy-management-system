import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';

export default function AvailabilityBadge({ status, size = 'md' }) {
  const isLarge = size === 'lg';

  if (status === 'In Stock') {
    return (
      <span className={`inline-flex items-center gap-1.5 font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 ${
        isLarge ? 'px-3.5 py-1.5 text-sm' : 'px-2.5 py-1 text-xs'
      }`}>
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <CheckCircle2 className={`${isLarge ? 'w-4 h-4' : 'w-3.5 h-3.5'}`} />
        In Stock
      </span>
    );
  }

  if (status === 'Low Stock') {
    return (
      <span className={`inline-flex items-center gap-1.5 font-semibold rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 ${
        isLarge ? 'px-3.5 py-1.5 text-sm' : 'px-2.5 py-1 text-xs'
      }`}>
        <AlertTriangle className={`${isLarge ? 'w-4 h-4' : 'w-3.5 h-3.5'}`} />
        Low Stock
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1.5 font-semibold rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/30 ${
      isLarge ? 'px-3.5 py-1.5 text-sm' : 'px-2.5 py-1 text-xs'
    }`}>
      <XCircle className={`${isLarge ? 'w-4 h-4' : 'w-3.5 h-3.5'}`} />
      Out of Stock
    </span>
  );
}
