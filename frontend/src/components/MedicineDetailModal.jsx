import React, { useState, useEffect } from 'react';
import { 
  X, Building2, Tag, ShieldCheck, AlertCircle, RefreshCw, 
  Phone, MapPin, Pill, CheckCircle2, ThermometerSnowflake, 
  FileText, Clock, AlertTriangle, Info, Layers
} from 'lucide-react';
import AvailabilityBadge from './AvailabilityBadge';
import { getMedicineAvailability } from '../services/api';
import { useTheme } from '../context/ThemeContext';
import { getMedicineProductImage } from '../utils/pharmacyImages';

export default function MedicineDetailModal({ 
  medicine, 
  onClose 
}) {
  const { isDark } = useTheme();
  const [activeTab, setActiveTab] = useState('overview'); // overview, clinical, storage
  const [liveAvailability, setLiveAvailability] = useState(null);
  const [checking, setChecking] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [imgError, setImgError] = useState(false);

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
  const isPrescription = ['Antibiotics', 'Antibiotics & Antimicrobials', 'Cardiovascular', 'Cardiovascular & Blood Pressure', 'Respiratory', 'Respiratory & Allergy'].includes(medicine.category_name) || 
    medicine.dosage_form?.toLowerCase().includes('injection');
  
  const isAvailable = currentStatus === 'In Stock' || currentStatus === 'Low Stock';
  const productImage = imgError ? null : getMedicineProductImage(medicine);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/40 backdrop-blur-xs overflow-y-auto">
      <div className={`relative w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden my-6 border flex flex-col ${
        isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        
        {/* Header Bar */}
        <div className={`px-6 py-4 border-b flex items-center justify-between ${
          isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-100'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-500/10 text-teal-600 flex items-center justify-center">
              <Pill className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-teal-600 dark:text-teal-400 font-bold block">
                Dispensary Formulation #{medicine.medicine_id}
              </span>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                NMRA Catalog Record
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Two-Column Body */}
        <div className="p-6 overflow-y-auto max-h-[75vh]">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Left Column: Product Photography & Live Store Status */}
            <div className="lg:col-span-5 space-y-4">
              <div className="relative w-full h-64 sm:h-72 rounded-2xl overflow-hidden bg-slate-50/80 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 shadow-inner flex items-center justify-center p-4">
                {productImage ? (
                  <img 
                    src={productImage} 
                    alt={medicine.name}
                    onError={() => setImgError(true)}
                    className="w-full h-full object-contain object-center drop-shadow-md"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-slate-400">
                    <Pill className="w-16 h-16 stroke-1 mb-2 text-teal-600/50" />
                    <span className="text-xs font-semibold">{medicine.dosage_form}</span>
                  </div>
                )}

                {/* Badges on image */}
                <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                  <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider backdrop-blur-md shadow-xs ${
                    isPrescription
                      ? 'bg-amber-500/90 text-white'
                      : 'bg-teal-600/90 text-white'
                  }`}>
                    {isPrescription ? 'Prescription Required (Rx)' : 'Over-the-Counter (OTC)'}
                  </span>
                </div>
              </div>

              {/* Real-Time Availability Live Status Box */}
              <div className={`p-4 rounded-2xl border ${
                isAvailable
                  ? isDark ? 'bg-teal-950/20 border-teal-500/30' : 'bg-teal-50/70 border-teal-200'
                  : isDark ? 'bg-rose-950/20 border-rose-500/30' : 'bg-rose-50/70 border-rose-200'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Dispensary Stock
                  </span>
                  <div className="flex items-center gap-2">
                    <AvailabilityBadge status={currentStatus} size="sm" />
                    <button
                      onClick={() => checkLiveStock(medicine.medicine_id)}
                      title="Refresh real-time stock"
                      className="p-1 rounded-md text-slate-400 hover:text-teal-600 dark:hover:text-teal-400"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${checking ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  {isAvailable
                    ? 'Verified in-stock at our dispensary counter. Ready for pharmacist dispensing upon doctor prescription presentation.'
                    : 'Currently depleted in our active lots. Please inquire via hotline or check back for restocking.'}
                </p>

                {liveAvailability && liveAvailability.saleable_stock !== undefined && (
                  <div className="mt-3 pt-2.5 border-t border-slate-200/60 dark:border-slate-800/60 flex justify-between items-center text-xs">
                    <span className="text-slate-500 dark:text-slate-400">Available Batch Units:</span>
                    <span className="font-extrabold text-teal-700 dark:text-teal-400">
                      {liveAvailability.saleable_stock} units
                    </span>
                  </div>
                )}
              </div>

              {/* Dispensary Support hotline card */}
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs bg-slate-50 dark:bg-slate-950/50">
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                  <Phone className="w-4 h-4 text-teal-600" />
                  <span>Questions on this medicine?</span>
                </div>
                <a
                  href="tel:+94112345678"
                  className="font-bold text-teal-700 dark:text-teal-400 hover:underline"
                >
                  Call +94 11 234 5678
                </a>
              </div>
            </div>

            {/* Right Column: Detailed Clinical Specifications & Actions */}
            <div className="lg:col-span-7 space-y-5">
              
              {/* Product Title and Brand */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                    {medicine.category_name}
                  </span>
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Origin: {medicine.country_of_origin || 'Global'}
                  </span>
                </div>

                <h2 className="text-2xl sm:text-3xl font-black tracking-tight mb-1">
                  {medicine.name}
                </h2>

                <p className="text-sm font-semibold text-slate-600 dark:text-slate-400 italic">
                  Active Formula: <span className="text-slate-800 dark:text-slate-200 font-bold not-italic">{medicine.generic_name}</span>
                </p>
              </div>

              {/* Specification Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Manufacturer / Brand</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1 mt-0.5">
                    <Building2 className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                    {medicine.brand_name}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Dosage Strength</span>
                  <span className="font-bold text-teal-700 dark:text-teal-400 mt-0.5 block">
                    {medicine.strength}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Dosage Form</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 mt-0.5 block">
                    {medicine.dosage_form}
                  </span>
                </div>
              </div>

              {/* Price Row */}
              <div className="flex items-baseline gap-3 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                <div className="flex-1">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Official Counter Retail Price
                  </span>
                  {medicine.is_public_price && medicine.unit_price ? (
                    <div className="flex items-baseline gap-2 mt-0.5">
                      <span className="text-2xl font-black text-slate-900 dark:text-white">
                        Rs. {Number(medicine.unit_price).toFixed(2)}
                      </span>
                      <span className="text-xs text-slate-400 font-medium">per unit</span>
                    </div>
                  ) : (
                    <span className="text-sm font-bold text-slate-600 dark:text-slate-400 mt-0.5 block">
                      Counter inquiry upon prescription presentation
                    </span>
                  )}
                </div>
              </div>

              {/* Informational Tabs: Description, Clinical Information, Storage */}
              <div>
                <div className="flex border-b border-slate-200 dark:border-slate-800 text-xs font-bold gap-3 mb-4">
                  {[
                    { id: 'overview', label: 'Overview & Description' },
                    { id: 'clinical', label: 'Side Effects & Usage' },
                    { id: 'storage', label: 'Dispensary Protocol' }
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`pb-2.5 border-b-2 transition-colors cursor-pointer ${
                        activeTab === tab.id
                          ? 'border-teal-600 text-teal-600 dark:text-teal-400 font-extrabold'
                          : 'border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Tab 1: Overview */}
                {activeTab === 'overview' && (
                  <div className="space-y-3 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                    <p>
                      {medicine.description || 'Verified pharmaceutical formulation stocked and cataloged under National Medicines Regulatory Authority standards.'}
                    </p>
                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-1.5">
                      <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-bold">
                        <ShieldCheck className="w-4 h-4 text-teal-600" />
                        <span>Quality & Authenticity Guaranteed</span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Sourced exclusively from authorized pharmaceutical manufacturers with verified batch release certificates.
                      </p>
                    </div>
                  </div>
                )}

                {/* Tab 2: Clinical Usage & Side Effects */}
                {activeTab === 'clinical' && (
                  <div className="space-y-4 text-xs leading-relaxed">
                    <div>
                      <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-1 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-teal-600" />
                        Usage Instructions (Registered Label):
                      </h4>
                      <p className="text-slate-600 dark:text-slate-400">
                        {medicine.usage_instructions || 'Take strictly according to your physician’s written prescription and dose timing.'}
                      </p>
                    </div>

                    <div>
                      <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-1 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                        Possible Side Effects:
                      </h4>
                      <p className="text-slate-600 dark:text-slate-400">
                        {medicine.side_effects || 'Consult prescribing doctor or our licensed dispensary staff if unexpected symptoms occur.'}
                      </p>
                    </div>
                  </div>
                )}

                {/* Tab 3: Storage & Regulations */}
                {activeTab === 'storage' && (
                  <div className="space-y-3 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                    <div className="flex items-start gap-2.5">
                      <ThermometerSnowflake className="w-4 h-4 text-cyan-600 shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-slate-800 dark:text-slate-200 block">Temperature Controlled Storage:</strong>
                        <span>Store below 25°C in a dry place protected from direct sunlight and moisture. Biologicals and insulin kept strictly at 2°C – 8°C.</span>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <Clock className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-slate-800 dark:text-slate-200 block">FEFO Rotation Protocol:</strong>
                        <span>Batches are dispensed First-Expired-First-Out to ensure maximum therapeutic efficacy and safety.</span>
                      </div>
                    </div>
                  </div>
                )}

              </div>

            </div>

          </div>
        </div>

        {/* Modal Footer */}
        <div className={`px-6 py-4 border-t flex items-center justify-between text-xs ${
          isDark ? 'bg-slate-950/70 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-100 text-slate-500'
        }`}>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-teal-600" />
            <span>My Pharmacist Licensed Dispensary Verification Portal</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
