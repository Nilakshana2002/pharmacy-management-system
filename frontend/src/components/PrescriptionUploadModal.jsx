import React, { useState, useEffect } from 'react';
import { 
  UploadCloud, FileText, CheckCircle2, AlertCircle, X, Shield, 
  Clock, Phone, User, Pill, ArrowRight, RefreshCw, FileUp, Check, Trash2, Building2,
  UserPlus
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { savePrescriptionOrder } from '../utils/prescriptionOrdersService';
import { getCurrentCustomer, logoutCustomer } from '../utils/customerAuthService';
import CustomerAuthModal from './CustomerAuthModal';

export default function PrescriptionUploadModal({ isOpen, onClose }) {
  const { isDark } = useTheme();

  // Registered Customer State
  const [currentCustomer, setCurrentCustomer] = useState(() => getCurrentCustomer());
  const [isCustomerAuthOpen, setIsCustomerAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login');

  // Account mode: 'registered' vs 'guest'
  const [accountType, setAccountType] = useState(() => (getCurrentCustomer() ? 'registered' : 'guest'));

  // Form Fields
  const [yourName, setYourName] = useState('');
  const [yourEmail, setYourEmail] = useState('');
  const [patientName, setPatientName] = useState('');
  const [patientAge, setPatientAge] = useState('');
  const [contactNo, setContactNo] = useState('');
  const [pickupOption, setPickupOption] = useState('Dispensary Counter Pickup (Free)');
  
  // 4 File slots
  const [files, setFiles] = useState([null, null, null, null]);
  const [message, setMessage] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedOrder, setSubmittedOrder] = useState(null);
  const [refreshToast, setRefreshToast] = useState(false);

  // Body scroll lock and ESC key handling
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isCustomerAuthOpen) {
        handleResetModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, isCustomerAuthOpen]);

  // Sync customer state and autofill on auth changes or modal open
  useEffect(() => {
    const handleSync = () => {
      const cust = getCurrentCustomer();
      setCurrentCustomer(cust);
      if (cust) {
        setAccountType('registered');
        applyProfile(cust);
      } else {
        setAccountType('guest');
      }
    };

    window.addEventListener('pharmacy_customer_auth_change', handleSync);
    handleSync();

    return () => {
      window.removeEventListener('pharmacy_customer_auth_change', handleSync);
    };
  }, [isOpen]);

  const applyProfile = (prof) => {
    if (!prof) return;
    setYourName(prof.full_name || '');
    setYourEmail(prof.email || '');
    setPatientName(prof.full_name || '');
    setPatientAge(prof.patient_age || '');
    setContactNo(prof.contact_no || '');
  };

  const handleRefreshAccountInfo = () => {
    const cust = getCurrentCustomer();
    if (cust) {
      applyProfile(cust);
      setRefreshToast(true);
      setTimeout(() => setRefreshToast(false), 2500);
    }
  };

  const handleOpenAuth = (mode) => {
    setAuthMode(mode);
    setIsCustomerAuthOpen(true);
  };

  const handleAuthSuccess = (customer) => {
    setCurrentCustomer(customer);
    setAccountType('registered');
    applyProfile(customer);
  };

  const compressImageFile = (file) => {
    return new Promise((resolve) => {
      if (!file.type || !file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => resolve({
          name: file.name,
          size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
          preview: e.target.result
        });
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(file);
        return;
      }

      const reader = new FileReader();
      reader.onload = (uploadEvt) => {
        const img = new Image();
        img.onload = () => {
          const maxDim = 1400;
          let width = img.width;
          let height = img.height;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.82);
          const approxBytes = Math.round((compressedDataUrl.length * 3) / 4);
          const sizeLabel = approxBytes > 1024 * 1024
            ? `${(approxBytes / (1024 * 1024)).toFixed(2)} MB`
            : `${Math.round(approxBytes / 1024)} KB`;

          resolve({
            name: file.name,
            size: sizeLabel,
            preview: compressedDataUrl
          });
        };
        img.onerror = () => {
          resolve({
            name: file.name,
            size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
            preview: uploadEvt.target.result
          });
        };
        img.src = uploadEvt.target.result;
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    });
  };

  const handleFileSlotChange = async (index, event) => {
    if (event.target.files && event.target.files[0]) {
      const selectedFile = event.target.files[0];
      const processed = await compressImageFile(selectedFile);
      if (processed) {
        setFiles((prev) => {
          const next = [...prev];
          next[index] = processed;
          return next;
        });
      }
    }
  };

  const handleRemoveFileSlot = (index) => {
    const newFiles = [...files];
    newFiles[index] = null;
    setFiles(newFiles);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const uploadedFiles = files.filter(Boolean);
    if (uploadedFiles.length === 0 && !message.trim()) {
      alert('Please attach at least one doctor prescription document or enter your medication instructions.');
      return;
    }

    setIsSubmitting(true);

    try {
      const order = await savePrescriptionOrder({
        account_type: accountType,
        customer_id: currentCustomer?.customer_id || null,
        your_name: yourName,
        your_email: yourEmail,
        patient_name: patientName,
        patient_age: patientAge,
        contact_no: contactNo,
        delivery_option: pickupOption,
        files: uploadedFiles,
        message: message.trim()
      });

      setIsSubmitting(false);
      setSubmittedOrder(order);
    } catch (err) {
      setIsSubmitting(false);
      alert('Could not submit prescription order. Please try again.');
    }
  };

  const handleResetModal = () => {
    setSubmittedOrder(null);
    setFiles([null, null, null, null]);
    setMessage('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={handleResetModal}
      >
        <div 
          onClick={(e) => e.stopPropagation()}
          className={`relative w-full max-w-2xl md:max-w-3xl max-h-[92vh] sm:max-h-[88vh] rounded-2xl sm:rounded-3xl shadow-2xl border flex flex-col overflow-hidden transition-all duration-200 ${
            isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}
        >
          {/* ======================================================== */}
          {/* MODAL HEADER (Always Visible with Prominent Close Button) */}
          {/* ======================================================== */}
          <div className={`px-5 py-3.5 sm:px-6 sm:py-4 border-b flex items-center justify-between shrink-0 select-none ${
            isDark ? 'border-slate-800 bg-slate-950/70' : 'border-slate-100 bg-slate-50/90'
          }`}>
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
                <UploadCloud className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base sm:text-lg font-black tracking-tight truncate">
                    Upload Doctor's Prescription
                  </h3>
                  <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                    Counter Pickup
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  Dispensary prescription verification & fast counter packaging
                </p>
              </div>
            </div>

            {/* Prominent Header Close Button */}
            <button
              type="button"
              onClick={handleResetModal}
              title="Close modal (Esc)"
              aria-label="Close prescription upload dialog"
              className="p-2 sm:px-3 sm:py-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors cursor-pointer group flex items-center gap-1.5 shrink-0"
            >
              <span className="text-xs font-bold text-slate-500 group-hover:text-slate-800 dark:group-hover:text-white hidden sm:inline">Close</span>
              <X className="w-5 h-5" />
            </button>
          </div>

          {submittedOrder ? (
            /* ======================================================== */
            /* SUCCESS SCREEN */
            /* ======================================================== */
            <div className="flex-1 overflow-y-auto p-6 sm:p-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center mx-auto ring-8 ring-emerald-500/10">
                <CheckCircle2 className="w-8 h-8 stroke-[2.5]" />
              </div>

              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400 block mb-1">
                  Dispensary Order Created
                </span>
                <h3 className="text-2xl font-black">
                  Prescription Transmitted to Pharmacist
                </h3>
              </div>

              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                Your prescription order <strong className="text-teal-600 dark:text-teal-400 font-mono text-sm">{submittedOrder.order_id}</strong> is now on the Supervising Pharmacist's Dashboard for counter verification.
              </p>

              {/* Order Summary Box */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-left text-xs space-y-2 max-w-md mx-auto">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800 font-bold">
                  <span>Patient Type:</span>
                  <span className={`px-2 py-0.5 rounded-full uppercase text-[10px] font-bold ${
                    submittedOrder.account_type === 'registered'
                      ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-300'
                      : 'bg-amber-500/10 text-amber-600 border border-amber-300'
                  }`}>
                    {submittedOrder.account_type === 'registered' ? 'Registered Patient' : 'Guest Patient'}
                  </span>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Patient Name:</span>
                  <strong className="text-slate-900 dark:text-white">{submittedOrder.patient_name} ({submittedOrder.patient_age})</strong>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Contact Number:</span>
                  <strong className="text-slate-900 dark:text-white">{submittedOrder.contact_no}</strong>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Fulfillment:</span>
                  <strong className="text-teal-600 dark:text-teal-400">Dispensary Counter Pickup (Free)</strong>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Prescription Files:</span>
                  <strong className="text-slate-900 dark:text-white">{submittedOrder.files?.length || 1} Document(s) Attached</strong>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-300 text-xs text-left max-w-md mx-auto flex items-start gap-2.5">
                <Shield className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                <p className="text-[11px] leading-relaxed">
                  Our certified pharmacist will cross-examine your prescription against registered batch stocks. You will receive an SMS confirmation once your medication is verified and packed for counter collection.
                </p>
              </div>

              <div className="pt-3 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={handleResetModal}
                  className="px-6 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-md"
                >
                  Close & Return
                </button>
              </div>
            </div>
          ) : (
            /* ======================================================== */
            /* MAIN PRESCRIPTION UPLOAD FORM (Responsive Layout) */
            /* ======================================================== */
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
              {/* Scrollable Form Body */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
                
                {/* ======================================================== */}
                {/* IDENTIFICATION CALLOUT: REGISTERED VS GUEST */}
                {/* ======================================================== */}
                {currentCustomer ? (
                  <div className="p-3.5 rounded-2xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800/80 flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-teal-700 text-white flex items-center justify-center font-black text-sm shrink-0">
                        {currentCustomer.full_name?.charAt(0) || 'P'}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate">
                            {currentCustomer.full_name}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-600 text-white flex items-center gap-1">
                            <Check className="w-3 h-3 stroke-[3]" />
                            <span>Registered Patient</span>
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          {currentCustomer.email} {currentCustomer.contact_no ? `• ${currentCustomer.contact_no}` : ''}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={handleRefreshAccountInfo}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold text-teal-800 dark:text-teal-300 bg-teal-100/80 dark:bg-teal-900/60 hover:bg-teal-200 transition-colors cursor-pointer flex items-center gap-1.5"
                        title="Reload saved patient information"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${refreshToast ? 'animate-spin' : ''}`} />
                        <span>Autofill Profile</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          logoutCustomer();
                          setAccountType('guest');
                        }}
                        className="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-500 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                        title="Sign out or order as guest"
                      >
                        Sign Out
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 sm:p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <Shield className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                            You are ordering as a Guest Patient
                          </p>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/40">
                            Guest Mode
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          New or returning patient? Register here to link your prescription refills and auto-fill your details.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleOpenAuth('register')}
                        className="px-4 py-2 rounded-xl text-xs font-bold bg-[#f59e0b] hover:bg-[#d97706] text-slate-950 shadow-2xs transition-transform active:scale-95 cursor-pointer flex items-center gap-1.5"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>Register Here</span>
                      </button>
                    </div>
                  </div>
                )}

                {refreshToast && (
                  <div className="text-[11px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-3 py-1.5 rounded-lg">
                    ✓ Registered patient profile information autofilled!
                  </div>
                )}

                {/* Responsive Row 1: Your Name & Your E-mail */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Your Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={yourName}
                      onChange={(e) => setYourName(e.target.value)}
                      placeholder="Enter your full name"
                      className="w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Your E-mail <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={yourEmail}
                      onChange={(e) => setYourEmail(e.target.value)}
                      placeholder="e.g. yourname@example.com"
                      className="w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition-colors"
                    />
                  </div>
                </div>

                {/* Sub-heading: Prescription information */}
                <div className="pt-1 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
                  <h4 className="text-xs font-extrabold text-teal-700 dark:text-teal-400 tracking-wide uppercase flex items-center gap-1.5 pt-2">
                    <Pill className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                    <span>Prescription & Patient Details</span>
                  </h4>
                </div>

                {/* Responsive Row 2: Patient Name & Patient Age */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Patient Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={patientName}
                      onChange={(e) => setPatientName(e.target.value)}
                      placeholder="Name on doctor's prescription"
                      className="w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Patient Age <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={patientAge}
                      onChange={(e) => setPatientAge(e.target.value)}
                      placeholder="e.g. 38 Yrs (or 6 Months for infants)"
                      className="w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition-colors"
                    />
                  </div>
                </div>

                {/* Responsive Row 3: Contact No & Order Pickup Option */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Contact No <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      value={contactNo}
                      onChange={(e) => setContactNo(e.target.value)}
                      placeholder="e.g. +94 77 123 4567"
                      className="w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Order Pickup Option
                    </label>
                    <select
                      value={pickupOption}
                      onChange={(e) => setPickupOption(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-teal-600 cursor-pointer transition-colors"
                    >
                      <option value="Dispensary Counter Pickup (Free)">
                        Dispensary Counter Pickup (Free) — Main Counter
                      </option>
                    </select>
                  </div>
                </div>

                {/* Field: Attach Doctor's Prescription (Responsive 2x2 Grid) */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                      Attach Doctor's Prescription Documents / Images:
                    </label>
                    <span className="text-[11px] text-slate-400">
                      Up to 4 files (JPG, PNG, PDF)
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5">
                    {[0, 1, 2, 3].map((slotIndex) => {
                      const currentFile = files[slotIndex];
                      return (
                        <div 
                          key={slotIndex}
                          className={`flex items-center justify-between gap-2 p-2 sm:p-2.5 rounded-xl border text-xs transition-colors ${
                            currentFile 
                              ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-700/60'
                              : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/80 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <label className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 font-bold text-[11px] cursor-pointer shrink-0 transition-colors shadow-2xs">
                              {currentFile ? 'Change' : 'Choose File'}
                              <input
                                type="file"
                                accept="image/*,.pdf"
                                onChange={(e) => handleFileSlotChange(slotIndex, e)}
                                className="hidden"
                              />
                            </label>

                            <span className="text-slate-500 dark:text-slate-400 text-xs truncate">
                              {currentFile ? (
                                <strong className="text-emerald-700 dark:text-emerald-400 flex items-center gap-1 font-semibold truncate">
                                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
                                  <span className="truncate">{currentFile.name}</span>
                                </strong>
                              ) : (
                                <span className="text-slate-400 text-[11px]">Slot {slotIndex + 1}: No file chosen</span>
                              )}
                            </span>
                          </div>

                          {currentFile && (
                            <button
                              type="button"
                              onClick={() => handleRemoveFileSlot(slotIndex)}
                              className="text-slate-400 hover:text-rose-500 cursor-pointer p-1 shrink-0 transition-colors"
                              title="Remove attached file"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Field: Your Message */}
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Your Message / Special Instructions:
                  </label>
                  <textarea
                    rows={2}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Mention brand preferences (e.g. GSK Panadol, Pfizer Lipitor) or any special instructions for the pharmacist..."
                    className="w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition-colors"
                  />
                </div>

              </div>

              {/* ======================================================== */}
              {/* STICKY MODAL FOOTER (Cancel Button & Send Button) */}
              {/* ======================================================== */}
              <div className={`px-5 py-3.5 sm:px-6 sm:py-4 border-t flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2.5 shrink-0 select-none ${
                isDark ? 'border-slate-800 bg-slate-950/70' : 'border-slate-100 bg-slate-50/90'
              }`}>
                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-[11px]">
                  <Shield className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                  <span>Verified by certified clinical pharmacists before counter pickup</span>
                </div>

                <div className="flex items-center gap-2.5 justify-end w-full sm:w-auto">
                  {/* Dedicated Close / Cancel Button */}
                  <button
                    type="button"
                    onClick={handleResetModal}
                    className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>

                  {/* Primary Submit Button */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 sm:flex-initial px-6 py-2.5 rounded-xl font-black text-xs sm:text-sm text-slate-950 shadow-md bg-[#f59e0b] hover:bg-[#d97706] active:scale-95 disabled:opacity-50 transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Transmitting...</span>
                      </>
                    ) : (
                      <>
                        <FileUp className="w-4 h-4" />
                        <span>Send</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

            </form>
          )}

        </div>
      </div>

      {/* Embedded Customer Sign In / Register Modal */}
      <CustomerAuthModal
        isOpen={isCustomerAuthOpen}
        onClose={() => setIsCustomerAuthOpen(false)}
        initialMode={authMode}
        onSuccess={handleAuthSuccess}
      />
    </>
  );
}
