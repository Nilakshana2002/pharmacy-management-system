import React, { useState, useEffect } from 'react';
import { 
  X, 
  User, 
  FileText, 
  MessageSquare, 
  ShoppingBag, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  ShieldCheck, 
  Calendar, 
  Phone, 
  Mail, 
  MapPin, 
  Edit3, 
  Save, 
  RefreshCw, 
  Eye, 
  ExternalLink,
  ChevronRight,
  UploadCloud,
  BadgeCheck,
  Receipt
} from 'lucide-react';
import { 
  getCustomerProfile, 
  updateCustomerProfile, 
  getCustomerPrescriptions, 
  getCustomerInquiries, 
  getCustomerOrders 
} from '../services/api';
import { notifyCustomerAuthChanged } from '../utils/customerAuthService';

export default function CustomerProfileModal({ 
  isOpen, 
  onClose, 
  currentCustomer, 
  isDark = false,
  onOpenUploadPrescription = () => {}
}) {
  const [activeTab, setActiveTab] = useState('prescriptions'); // 'prescriptions' | 'inquiries' | 'orders' | 'profile'
  
  // Data states
  const [prescriptions, setPrescriptions] = useState([]);
  const [inquiries, setInquiries] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Filter states
  const [rxFilter, setRxFilter] = useState('all'); // 'all' | 'accepted' | 'rejected' | 'pending' | 'dispensed'
  const [inqFilter, setInqFilter] = useState('all'); // 'all' | 'RESOLVED' | 'IN_REVIEW' | 'NEW'

  // Image zoom modal
  const [previewImage, setPreviewImage] = useState(null);

  // Edit Profile Form State
  const [editMode, setEditMode] = useState(false);
  const [profileData, setProfileData] = useState({
    fullName: '',
    contactNo: '',
    patientAge: '',
    nic: '',
    address: ''
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileFeedback, setProfileFeedback] = useState(null);

  // Initialize and load data on modal open
  useEffect(() => {
    if (isOpen && currentCustomer) {
      setProfileData({
        fullName: currentCustomer.full_name || '',
        contactNo: currentCustomer.contact_no || '',
        patientAge: currentCustomer.patient_age || '',
        nic: currentCustomer.nic || '',
        address: currentCustomer.address || ''
      });
      loadCustomerPortalData();
    }
  }, [isOpen, currentCustomer]);

  const loadCustomerPortalData = async () => {
    setLoading(true);
    try {
      const [rxRes, inqRes, ordRes] = await Promise.allSettled([
        getCustomerPrescriptions(),
        getCustomerInquiries(),
        getCustomerOrders()
      ]);

      if (rxRes.status === 'fulfilled' && rxRes.value?.success) {
        setPrescriptions(rxRes.value.data || []);
      }
      if (inqRes.status === 'fulfilled' && inqRes.value?.success) {
        setInquiries(inqRes.value.data || []);
      }
      if (ordRes.status === 'fulfilled' && ordRes.value?.success) {
        setOrders(ordRes.value.data || []);
      }
    } catch (err) {
      console.warn('[Customer Profile Portal Data Notice]:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadCustomerPortalData();
    setTimeout(() => setRefreshing(false), 500);
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileFeedback(null);

    try {
      const res = await updateCustomerProfile(profileData);
      if (res?.success) {
        setProfileFeedback({ type: 'success', message: 'Profile details updated successfully!' });
        setEditMode(false);
        // Update local customer auth state
        const updatedCust = {
          ...currentCustomer,
          ...res.customer
        };
        localStorage.setItem('pharmacy_current_customer', JSON.stringify(updatedCust));
        notifyCustomerAuthChanged(updatedCust);
      } else {
        setProfileFeedback({ type: 'error', message: res?.message || 'Failed to update profile.' });
      }
    } catch (err) {
      setProfileFeedback({ type: 'error', message: err.response?.data?.message || err.message || 'Failed to update profile.' });
    } finally {
      setSavingProfile(false);
    }
  };

  if (!isOpen || !currentCustomer) return null;

  // Filtered lists
  const filteredPrescriptions = prescriptions.filter(item => {
    if (rxFilter === 'all') return true;
    return item.status?.toLowerCase() === rxFilter.toLowerCase();
  });

  const filteredInquiries = inquiries.filter(item => {
    if (inqFilter === 'all') return true;
    return item.status?.toUpperCase() === inqFilter.toUpperCase();
  });

  // Counters
  const acceptedRxCount = prescriptions.filter(p => p.status === 'accepted').length;
  const rejectedRxCount = prescriptions.filter(p => p.status === 'rejected').length;
  const pendingRxCount = prescriptions.filter(p => p.status === 'pending').length;
  const resolvedInqCount = inquiries.filter(i => i.status === 'RESOLVED').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className={`w-full max-w-5xl max-h-[92vh] flex flex-col rounded-3xl shadow-2xl border overflow-hidden transition-all duration-300 ${
          isDark 
            ? 'bg-slate-900 border-slate-800 text-slate-100 shadow-teal-950/30' 
            : 'bg-white border-slate-200 text-slate-900 shadow-slate-300/40'
        }`}
      >
        {/* ========================================================== */}
        {/* MODAL HEADER */}
        {/* ========================================================== */}
        <div className={`p-4 sm:p-6 border-b flex flex-wrap items-center justify-between gap-4 ${
          isDark 
            ? 'bg-gradient-to-r from-slate-900 via-slate-800/90 to-slate-900 border-slate-800' 
            : 'bg-gradient-to-r from-teal-50/80 via-emerald-50/50 to-white border-slate-200'
        }`}>
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white flex items-center justify-center font-black text-xl shadow-md ring-2 ring-emerald-500/30">
              {currentCustomer.full_name?.charAt(0) || 'P'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black tracking-tight">{currentCustomer.full_name}</h2>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                  <BadgeCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Verified Patient
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-2">
                <span>{currentCustomer.email}</span>
                {currentCustomer.contact_no && (
                  <>
                    <span>•</span>
                    <span>{currentCustomer.contact_no}</span>
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className={`p-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                isDark 
                  ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200' 
                  : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700'
              }`}
              title="Refresh Data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-teal-500' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <button
              onClick={onClose}
              className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                isDark 
                  ? 'bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border-slate-700' 
                  : 'bg-white hover:bg-rose-50 text-slate-500 hover:text-rose-600 border-slate-200'
              }`}
              title="Close Profile Modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ========================================================== */}
        {/* TAB NAVIGATION */}
        {/* ========================================================== */}
        <div className={`px-4 sm:px-6 border-b flex overflow-x-auto no-scrollbar gap-2 sm:gap-4 ${
          isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50/70 border-slate-200'
        }`}>
          <button
            onClick={() => setActiveTab('prescriptions')}
            className={`py-3 px-3 sm:px-4 font-bold text-xs sm:text-sm border-b-2 flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'prescriptions'
                ? 'border-teal-500 text-teal-600 dark:text-teal-400 bg-teal-50/50 dark:bg-teal-950/20'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Prescription Orders</span>
            <span className="px-2 py-0.5 rounded-full text-[11px] bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-black">
              {prescriptions.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('inquiries')}
            className={`py-3 px-3 sm:px-4 font-bold text-xs sm:text-sm border-b-2 flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'inquiries'
                ? 'border-teal-500 text-teal-600 dark:text-teal-400 bg-teal-50/50 dark:bg-teal-950/20'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Inquiries & Consultations</span>
            <span className="px-2 py-0.5 rounded-full text-[11px] bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-black">
              {inquiries.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('orders')}
            className={`py-3 px-3 sm:px-4 font-bold text-xs sm:text-sm border-b-2 flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'orders'
                ? 'border-teal-500 text-teal-600 dark:text-teal-400 bg-teal-50/50 dark:bg-teal-950/20'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Medication Invoices</span>
            <span className="px-2 py-0.5 rounded-full text-[11px] bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-black">
              {orders.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('profile')}
            className={`py-3 px-3 sm:px-4 font-bold text-xs sm:text-sm border-b-2 flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'profile'
                ? 'border-teal-500 text-teal-600 dark:text-teal-400 bg-teal-50/50 dark:bg-teal-950/20'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Account Details</span>
          </button>
        </div>

        {/* ========================================================== */}
        {/* MODAL BODY CONTENT */}
        {/* ========================================================== */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {loading && !refreshing ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-400">
              <RefreshCw className="w-8 h-8 animate-spin text-teal-500 mb-3" />
              <p className="text-sm font-semibold">Loading your clinical history from database...</p>
            </div>
          ) : (
            <>
              {/* ==================================================== */}
              {/* TAB 1: PRESCRIPTION ORDERS & REVIEW STATUS */}
              {/* ==================================================== */}
              {activeTab === 'prescriptions' && (
                <div className="space-y-4">
                  {/* Summary Bar & Filters */}
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                      {[
                        { id: 'all', label: `All (${prescriptions.length})` },
                        { id: 'accepted', label: `Accepted (${acceptedRxCount})`, color: 'emerald' },
                        { id: 'rejected', label: `Rejected (${rejectedRxCount})`, color: 'rose' },
                        { id: 'pending', label: `Pending Review (${pendingRxCount})`, color: 'amber' },
                        { id: 'dispensed', label: 'Dispensed' }
                      ].map(pill => (
                        <button
                          key={pill.id}
                          onClick={() => setRxFilter(pill.id)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            rxFilter === pill.id
                              ? 'bg-teal-600 text-white shadow-xs'
                              : isDark
                                ? 'bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700'
                                : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                          }`}
                        >
                          {pill.label}
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={() => {
                        onClose();
                        onOpenUploadPrescription();
                      }}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-teal-600 to-emerald-600 text-white hover:from-teal-700 hover:to-emerald-700 flex items-center gap-1.5 shadow-sm cursor-pointer ml-auto"
                    >
                      <UploadCloud className="w-3.5 h-3.5" />
                      <span>Upload New Prescription</span>
                    </button>
                  </div>

                  {/* Orders List */}
                  {filteredPrescriptions.length === 0 ? (
                    <div className={`py-16 text-center rounded-2xl border border-dashed ${
                      isDark ? 'border-slate-800 bg-slate-800/20' : 'border-slate-200 bg-slate-50/50'
                    }`}>
                      <FileText className="w-12 h-12 text-slate-400 mx-auto mb-3 opacity-60" />
                      <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">No prescriptions found</h3>
                      <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                        {rxFilter === 'all' 
                          ? 'You have not submitted any doctor prescriptions yet. Upload your prescription slip to have our pharmacists prepare your medicine.'
                          : `No prescriptions currently matching the "${rxFilter}" status filter.`}
                      </p>
                      {rxFilter === 'all' && (
                        <button
                          onClick={() => {
                            onClose();
                            onOpenUploadPrescription();
                          }}
                          className="mt-4 px-4 py-2 rounded-xl text-xs font-bold bg-teal-600 text-white hover:bg-teal-700 inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <UploadCloud className="w-4 h-4" />
                          <span>Upload Prescription Now</span>
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {filteredPrescriptions.map(order => {
                        const isAccepted = order.status === 'accepted';
                        const isRejected = order.status === 'rejected';
                        const isPending = order.status === 'pending';
                        const isDispensed = order.status === 'dispensed';

                        return (
                          <div 
                            key={order.order_id}
                            className={`p-4 sm:p-5 rounded-2xl border transition-all duration-200 ${
                              isAccepted 
                                ? isDark 
                                  ? 'bg-slate-800/40 border-emerald-900/60 shadow-xs' 
                                  : 'bg-emerald-50/30 border-emerald-200 shadow-xs'
                                : isRejected
                                  ? isDark
                                    ? 'bg-slate-800/40 border-rose-900/60 shadow-xs'
                                    : 'bg-rose-50/30 border-rose-200 shadow-xs'
                                  : isDispensed
                                    ? isDark
                                      ? 'bg-slate-800/40 border-blue-900/60 shadow-xs'
                                      : 'bg-blue-50/30 border-blue-200 shadow-xs'
                                    : isDark
                                      ? 'bg-slate-800/30 border-amber-900/40'
                                      : 'bg-amber-50/30 border-amber-200'
                            }`}
                          >
                            {/* Card Top: Order ID & Status Badge */}
                            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200/60 dark:border-slate-700/60">
                              <div className="flex items-center gap-2.5">
                                <span className="font-mono text-xs font-black px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700">
                                  {order.order_id}
                                </span>
                                <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                  <Calendar className="w-3.5 h-3.5" />
                                  {new Date(order.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                                </span>
                              </div>

                              {/* Status Badge */}
                              <div>
                                {isAccepted && (
                                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 shadow-xs">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                    <span>APPROVED & PREPARING</span>
                                  </span>
                                )}
                                {isRejected && (
                                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-700 shadow-xs">
                                    <XCircle className="w-3.5 h-3.5 text-rose-600" />
                                    <span>ACTION REQUIRED / REJECTED</span>
                                  </span>
                                )}
                                {isPending && (
                                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                                    <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                                    <span>UNDER PHARMACIST REVIEW</span>
                                  </span>
                                )}
                                {isDispensed && (
                                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-700">
                                    <BadgeCheck className="w-3.5 h-3.5 text-blue-600" />
                                    <span>MEDICATION DISPENSED</span>
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Clinical Response Alert Box */}
                            {isAccepted && (
                              <div className="mt-3.5 p-3.5 rounded-xl bg-emerald-100/60 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-xs">
                                <div className="flex flex-wrap items-center justify-between gap-2 mb-2 font-bold text-emerald-900 dark:text-emerald-200">
                                  <span className="flex items-center gap-1.5">
                                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                                    <span>Reviewed by: {order.pharmacist_name || 'Supervising Pharmacist'}</span>
                                  </span>
                                  {order.ready_time && (
                                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-200 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-100 font-black flex items-center gap-1">
                                      <Clock className="w-3 h-3" />
                                      <span>Ready in: {order.ready_time}</span>
                                    </span>
                                  )}
                                </div>
                                <p className="text-emerald-800 dark:text-emerald-300 leading-relaxed font-medium">
                                  {order.confirmation_message || 'Your prescription has been clinically validated. Your medicines are currently being prepared at Dispensary Counter 01.'}
                                </p>
                              </div>
                            )}

                            {isRejected && (
                              <div className="mt-3.5 p-3.5 rounded-xl bg-rose-100/60 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-xs">
                                <div className="flex items-center gap-1.5 font-bold text-rose-900 dark:text-rose-200 mb-1.5">
                                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                                  <span>Reason from Pharmacist {order.pharmacist_name ? `(${order.pharmacist_name})` : ''}:</span>
                                </div>
                                <p className="text-rose-800 dark:text-rose-300 leading-relaxed font-semibold">
                                  {order.rejection_reason || 'Prescription photo was illegible or doctor license seal was missing.'}
                                </p>
                                <p className="text-[11px] text-rose-700/80 dark:text-rose-400/80 mt-2 font-medium">
                                  Action Required: Please visit the physical dispensary counter with your original paper prescription, or upload a clear high-resolution replacement image.
                                </p>
                              </div>
                            )}

                            {isPending && (
                              <div className="mt-3.5 p-3 rounded-xl bg-amber-100/50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
                                <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                                <span>Your prescription is queued for review by our registered dispensary pharmacists. Estimated response time: 10-20 minutes.</span>
                              </div>
                            )}

                            {/* Order Details Grid */}
                            <div className="mt-3.5 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-600 dark:text-slate-400">
                              <div>
                                <span className="font-semibold text-slate-500">Patient:</span>{' '}
                                <span className="font-bold text-slate-800 dark:text-slate-200">{order.patient_name}</span>
                                {order.patient_age && <span className="text-[11px] opacity-80"> ({order.patient_age})</span>}
                              </div>
                              <div>
                                <span className="font-semibold text-slate-500">Delivery:</span>{' '}
                                <span className="font-medium text-slate-800 dark:text-slate-200">{order.delivery_option}</span>
                              </div>
                              <div>
                                <span className="font-semibold text-slate-500">Contact:</span>{' '}
                                <span className="font-medium text-slate-800 dark:text-slate-200">{order.contact_no}</span>
                              </div>
                            </div>

                            {/* Attached Prescription Files Previews */}
                            {order.files && order.files.length > 0 && (
                              <div className="mt-3.5 pt-3 border-t border-slate-200/50 dark:border-slate-700/50">
                                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                                  Uploaded Prescription Files ({order.files.length})
                                </span>
                                <div className="flex flex-wrap gap-2.5">
                                  {order.files.map((file, idx) => (
                                    <div 
                                      key={idx}
                                      onClick={() => file.data && setPreviewImage(file.data)}
                                      className={`p-2 rounded-xl border flex items-center gap-2 text-xs transition-all cursor-pointer ${
                                        file.data ? 'hover:border-teal-500' : ''
                                      } ${
                                        isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'
                                      }`}
                                    >
                                      {file.data ? (
                                        <img 
                                          src={file.data} 
                                          alt={file.name || 'Prescription preview'} 
                                          className="w-8 h-8 rounded-lg object-cover border border-slate-200 dark:border-slate-700" 
                                        />
                                      ) : (
                                        <FileText className="w-5 h-5 text-teal-600" />
                                      )}
                                      <div className="max-w-[140px] truncate">
                                        <p className="font-bold truncate text-[11px]">{file.name || `Prescription Doc ${idx + 1}`}</p>
                                        <p className="text-[10px] text-slate-400">Click to view document</p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ==================================================== */}
              {/* TAB 2: INQUIRIES & CONSULTATION RESPONSES */}
              {/* ==================================================== */}
              {activeTab === 'inquiries' && (
                <div className="space-y-4">
                  {/* Filters */}
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                      {[
                        { id: 'all', label: `All (${inquiries.length})` },
                        { id: 'RESOLVED', label: `Replied / Resolved (${resolvedInqCount})`, color: 'emerald' },
                        { id: 'IN_REVIEW', label: 'In Review', color: 'blue' },
                        { id: 'NEW', label: 'Awaiting Staff', color: 'amber' }
                      ].map(pill => (
                        <button
                          key={pill.id}
                          onClick={() => setInqFilter(pill.id)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            inqFilter === pill.id
                              ? 'bg-teal-600 text-white shadow-xs'
                              : isDark
                                ? 'bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700'
                                : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                          }`}
                        >
                          {pill.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {filteredInquiries.length === 0 ? (
                    <div className={`py-16 text-center rounded-2xl border border-dashed ${
                      isDark ? 'border-slate-800 bg-slate-800/20' : 'border-slate-200 bg-slate-50/50'
                    }`}>
                      <MessageSquare className="w-12 h-12 text-slate-400 mx-auto mb-3 opacity-60" />
                      <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">No inquiries recorded</h3>
                      <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                        You have not submitted any questions or consultation messages through the online contact portal.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {filteredInquiries.map(inq => {
                        const isResolved = inq.status === 'RESOLVED';
                        const isReview = inq.status === 'IN_REVIEW';
                        const isNew = inq.status === 'NEW';

                        return (
                          <div
                            key={inq.inquiry_id}
                            className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                              isResolved 
                                ? isDark ? 'bg-slate-800/40 border-teal-900/60' : 'bg-teal-50/20 border-teal-200' 
                                : isDark ? 'bg-slate-800/20 border-slate-800' : 'bg-white border-slate-200'
                            }`}
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200/50 dark:border-slate-700/50">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-teal-700 dark:text-teal-400 border border-teal-200 dark:border-teal-800">
                                  {inq.reference_code}
                                </span>
                                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                  {inq.medicine_query || 'General Consultation'}
                                </span>
                              </div>

                              <div className="flex items-center gap-2">
                                <span className="text-[11px] text-slate-400">
                                  {new Date(inq.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                                </span>

                                {isResolved && (
                                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                                    REPLIED
                                  </span>
                                )}
                                {isReview && (
                                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-700">
                                    IN REVIEW
                                  </span>
                                )}
                                {isNew && (
                                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                                    AWAITING STAFF
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Patient's Original Inquiry */}
                            <div className="mt-3">
                              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Your Question:</p>
                              <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 italic bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800">
                                "{inq.message}"
                              </p>
                            </div>

                            {/* Pharmacist Reply Box */}
                            {inq.staff_notes ? (
                              <div className="mt-3 p-3.5 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800/60 text-xs">
                                <div className="flex items-center justify-between gap-2 mb-1.5 font-bold text-teal-900 dark:text-teal-200">
                                  <span className="flex items-center gap-1.5">
                                    <ShieldCheck className="w-4 h-4 text-teal-600" />
                                    <span>Pharmacist Reply {inq.responded_by ? `(${inq.responded_by})` : ''}:</span>
                                  </span>
                                  {inq.responded_at && (
                                    <span className="text-[10px] text-teal-700 dark:text-teal-300 font-normal">
                                      {new Date(inq.responded_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                                    </span>
                                  )}
                                </div>
                                <p className="text-teal-950 dark:text-teal-100 leading-relaxed font-medium whitespace-pre-line">
                                  {inq.staff_notes}
                                </p>
                              </div>
                            ) : (
                              <div className="mt-3 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/30 text-[11px] text-amber-800 dark:text-amber-300 flex items-center gap-2">
                                <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                <span>Our registered pharmacists have received your inquiry. A reply will be displayed here and sent to your email.</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ==================================================== */}
              {/* TAB 3: PAST ORDERS & INVOICES */}
              {/* ==================================================== */}
              {activeTab === 'orders' && (
                <div className="space-y-4">
                  {orders.length === 0 ? (
                    <div className={`py-16 text-center rounded-2xl border border-dashed ${
                      isDark ? 'border-slate-800 bg-slate-800/20' : 'border-slate-200 bg-slate-50/50'
                    }`}>
                      <Receipt className="w-12 h-12 text-slate-400 mx-auto mb-3 opacity-60" />
                      <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">No past purchases recorded</h3>
                      <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                        Purchases made at dispensary checkout counters or online invoices linked to your patient account will appear here.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {orders.map(sale => (
                        <div 
                          key={sale.sale_id}
                          className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                            isDark ? 'bg-slate-800/30 border-slate-800' : 'bg-white border-slate-200 shadow-2xs'
                          }`}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200/60 dark:border-slate-700/60">
                            <div>
                              <span className="font-mono text-xs font-black text-teal-600 dark:text-teal-400">
                                {sale.invoice_number}
                              </span>
                              <p className="text-xs text-slate-500 mt-0.5">
                                {new Date(sale.sale_date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                              </p>
                            </div>

                            <div className="text-right">
                              <span className="text-base font-black text-slate-900 dark:text-white">
                                LKR {parseFloat(sale.net_amount || sale.total_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                              </span>
                              <span className="block text-[11px] font-bold text-emerald-600 uppercase">
                                {sale.payment_status || 'PAID'} • {sale.payment_method || 'CASH'}
                              </span>
                            </div>
                          </div>

                          {/* Items List */}
                          {sale.items && sale.items.length > 0 && (
                            <div className="mt-3 divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                              {sale.items.map((item, idx) => (
                                <div key={idx} className="py-2 flex items-center justify-between gap-3">
                                  <div className="flex items-center gap-2.5">
                                    <div className="w-7 h-7 rounded-lg bg-teal-50 dark:bg-teal-950/60 flex items-center justify-center shrink-0 border border-teal-200 dark:border-teal-800">
                                      <ShoppingBag className="w-3.5 h-3.5 text-teal-600" />
                                    </div>
                                    <div>
                                      <p className="font-bold text-slate-800 dark:text-slate-200">{item.medicine_name}</p>
                                      <p className="text-[11px] text-slate-400">{item.strength || ''} {item.dosage_form || ''}</p>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <span className="text-slate-500">{item.quantity} x LKR {parseFloat(item.unit_price).toFixed(2)}</span>
                                    <span className="font-black text-slate-800 dark:text-slate-200 block">
                                      LKR {parseFloat(item.subtotal).toFixed(2)}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ==================================================== */}
              {/* TAB 4: ACCOUNT DETAILS & PROFILE UPDATE */}
              {/* ==================================================== */}
              {activeTab === 'profile' && (
                <div className="max-w-2xl mx-auto space-y-6">
                  {profileFeedback && (
                    <div className={`p-3.5 rounded-xl text-xs font-bold flex items-center gap-2 ${
                      profileFeedback.type === 'success'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : 'bg-rose-100 text-rose-800 border border-rose-300'
                    }`}>
                      {profileFeedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 text-rose-600" />}
                      <span>{profileFeedback.message}</span>
                    </div>
                  )}

                  <form onSubmit={handleSaveProfile} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Full Legal Name *</label>
                        <input
                          type="text"
                          required
                          disabled={!editMode}
                          value={profileData.fullName}
                          onChange={(e) => setProfileData({ ...profileData, fullName: e.target.value })}
                          className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-semibold transition-all ${
                            !editMode 
                              ? 'bg-slate-100 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 cursor-not-allowed'
                              : 'bg-white dark:bg-slate-900 border-teal-500 focus:ring-2 focus:ring-teal-500/20'
                          }`}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Registered Email (Non-editable)</label>
                        <input
                          type="email"
                          disabled
                          value={currentCustomer.email}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/50 text-slate-500 text-xs font-semibold cursor-not-allowed"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Contact Phone Number</label>
                        <input
                          type="text"
                          disabled={!editMode}
                          value={profileData.contactNo}
                          placeholder="+94 77 123 4567"
                          onChange={(e) => setProfileData({ ...profileData, contactNo: e.target.value })}
                          className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-semibold transition-all ${
                            !editMode 
                              ? 'bg-slate-100 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 cursor-not-allowed'
                              : 'bg-white dark:bg-slate-900 border-teal-500 focus:ring-2 focus:ring-teal-500/20'
                          }`}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Patient Age</label>
                        <input
                          type="text"
                          disabled={!editMode}
                          value={profileData.patientAge}
                          placeholder="e.g. 38 Yrs"
                          onChange={(e) => setProfileData({ ...profileData, patientAge: e.target.value })}
                          className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-semibold transition-all ${
                            !editMode 
                              ? 'bg-slate-100 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 cursor-not-allowed'
                              : 'bg-white dark:bg-slate-900 border-teal-500 focus:ring-2 focus:ring-teal-500/20'
                          }`}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">National Identity Card (NIC)</label>
                        <input
                          type="text"
                          disabled={!editMode}
                          value={profileData.nic}
                          placeholder="e.g. 942150821V"
                          onChange={(e) => setProfileData({ ...profileData, nic: e.target.value })}
                          className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-semibold transition-all ${
                            !editMode 
                              ? 'bg-slate-100 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 cursor-not-allowed'
                              : 'bg-white dark:bg-slate-900 border-teal-500 focus:ring-2 focus:ring-teal-500/20'
                          }`}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Delivery & Residential Address</label>
                      <textarea
                        rows={3}
                        disabled={!editMode}
                        value={profileData.address}
                        placeholder="Street, City, District"
                        onChange={(e) => setProfileData({ ...profileData, address: e.target.value })}
                        className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-semibold transition-all ${
                          !editMode 
                            ? 'bg-slate-100 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 cursor-not-allowed'
                            : 'bg-white dark:bg-slate-900 border-teal-500 focus:ring-2 focus:ring-teal-500/20'
                        }`}
                      />
                    </div>

                    <div className="pt-3 flex items-center justify-end gap-2.5">
                      {!editMode ? (
                        <button
                          type="button"
                          onClick={() => setEditMode(true)}
                          className="px-4 py-2.5 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white flex items-center gap-1.5 shadow-sm cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit Profile Information</span>
                        </button>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setEditMode(false);
                              setProfileData({
                                fullName: currentCustomer.full_name || '',
                                contactNo: currentCustomer.contact_no || '',
                                patientAge: currentCustomer.patient_age || '',
                                nic: currentCustomer.nic || '',
                                address: currentCustomer.address || ''
                              });
                            }}
                            className={`px-4 py-2.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                              isDark ? 'border-slate-700 hover:bg-slate-800' : 'border-slate-300 hover:bg-slate-100'
                            }`}
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={savingProfile}
                            className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 shadow-sm cursor-pointer"
                          >
                            <Save className="w-3.5 h-3.5" />
                            <span>{savingProfile ? 'Saving Changes...' : 'Save Profile Changes'}</span>
                          </button>
                        </>
                      )}
                    </div>
                  </form>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ========================================================== */}
      {/* IMAGE PREVIEW LIGHTBOX */}
      {/* ========================================================== */}
      {previewImage && (
        <div 
          className="fixed inset-0 z-60 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute -top-10 right-0 text-white hover:text-slate-300 cursor-pointer p-1"
            >
              <X className="w-7 h-7" />
            </button>
            <img 
              src={previewImage} 
              alt="Prescription Document" 
              className="max-h-[85vh] max-w-full rounded-2xl shadow-2xl object-contain border border-slate-700" 
            />
          </div>
        </div>
      )}
    </div>
  );
}
