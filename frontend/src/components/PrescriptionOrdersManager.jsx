import React, { useState, useEffect } from 'react';
import { 
  FileCheck, Clock, CheckCircle2, XCircle, AlertTriangle, Search, 
  Filter, Eye, Check, X, Shield, Phone, Mail, User, Calendar, 
  ExternalLink, Printer, MessageSquare, Send, RotateCcw, AlertCircle,
  CheckSquare, Download, MapPin, UserCheck, HelpCircle, FileText,
  Sparkles, ChevronRight
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { 
  fetchPrescriptionOrdersFromApi,
  getPrescriptionOrders, 
  updatePrescriptionOrderStatus
} from '../utils/prescriptionOrdersService';

export default function PrescriptionOrdersManager({ staffUser }) {
  const { isDark } = useTheme();
  const [orders, setOrders] = useState(() => getPrescriptionOrders());
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'pending', 'accepted', 'rejected', 'dispensed'
  const [isLoading, setIsLoading] = useState(false);
  
  // Details Modal
  const [selectedOrderDetails, setSelectedOrderDetails] = useState(null);

  // Action Modals
  const [acceptModalOrder, setAcceptModalOrder] = useState(null);
  const [rejectModalOrder, setRejectModalOrder] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Email Toast Notification
  const [emailToast, setEmailToast] = useState(null);

  // Accept Form State
  const [readyTime, setReadyTime] = useState('15 - 20 Minutes');
  const [confirmMsg, setConfirmMsg] = useState('');

  // Reject Form State
  const [rejectReason, setRejectReason] = useState('Doctor signature or clinical license seal missing');
  const [rejectDetails, setRejectDetails] = useState('');



  useEffect(() => {
    loadOrders();

    const handleOrdersChange = () => {
      loadOrders();
    };

    window.addEventListener('pharmacy_prescription_orders_change', handleOrdersChange);
    // Poll every 6 seconds for newly submitted public orders
    const interval = setInterval(loadOrders, 6000);

    return () => {
      window.removeEventListener('pharmacy_prescription_orders_change', handleOrdersChange);
      clearInterval(interval);
    };
  }, []);

  const loadOrders = async () => {
    try {
      const list = await fetchPrescriptionOrdersFromApi();
      setOrders(list || []);
    } catch (err) {
      console.warn('Error loading orders:', err);
    }
  };

  const handleManualRefresh = async () => {
    setIsLoading(true);
    await loadOrders();
    setTimeout(() => setIsLoading(false), 500);
  };

  const handleOpenAcceptModal = (order) => {
    setAcceptModalOrder(order);
    setReadyTime('15 - 20 Minutes');
    setConfirmMsg(
      `Your prescription has been reviewed and verified by Pharmacist ${staffUser?.fullName || 'in charge'}. Your medication is being prepared and will be ready for pickup at Dispensary Counter 01 in 15-20 minutes.`
    );
  };

  const handleConfirmAccept = async () => {
    if (!acceptModalOrder) return;
    setIsProcessing(true);

    try {
      const res = await updatePrescriptionOrderStatus(acceptModalOrder.order_id, {
        status: 'accepted',
        pharmacistName: staffUser?.fullName || 'Supervising Pharmacist',
        confirmationMessage: confirmMsg,
        readyTime
      });

      const isEmailSent = Boolean(res?.emailResult?.messageId || res?.emailResult?.status === 'SENT');

      // Real email dispatch status toast
      setEmailToast({
        type: 'accepted',
        orderId: acceptModalOrder.order_id,
        recipient: acceptModalOrder.your_email,
        patientName: acceptModalOrder.patient_name,
        readyTime,
        confirmMsg,
        engine: res?.emailResult?.engine,
        messageId: res?.emailResult?.messageId,
        success: isEmailSent,
        error: !isEmailSent ? (res?.emailResult?.error || 'Email queued or could not be delivered') : null
      });

      // Auto dismiss after 8s
      setTimeout(() => setEmailToast(null), 8000);

      setAcceptModalOrder(null);
      if (selectedOrderDetails?.order_id === acceptModalOrder.order_id) {
        setSelectedOrderDetails(res?.order || null);
      }
      await loadOrders();
    } catch (err) {
      alert('Could not update order status. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOpenRejectModal = (order) => {
    setRejectModalOrder(order);
    setRejectReason('Doctor signature or clinical license seal missing');
    setRejectDetails('Please visit our dispensary counter with your original doctor prescription or provide an updated legible document.');
  };

  const handleConfirmReject = async () => {
    if (!rejectModalOrder) return;
    setIsProcessing(true);

    try {
      const fullReason = `${rejectReason}. ${rejectDetails}`;
      const res = await updatePrescriptionOrderStatus(rejectModalOrder.order_id, {
        status: 'rejected',
        pharmacistName: staffUser?.fullName || 'Supervising Pharmacist',
        rejectionReason: fullReason
      });

      const isEmailSent = Boolean(res?.emailResult?.messageId || res?.emailResult?.status === 'SENT');

      setEmailToast({
        type: 'rejected',
        orderId: rejectModalOrder.order_id,
        recipient: rejectModalOrder.your_email,
        patientName: rejectModalOrder.patient_name,
        rejectionReason: fullReason,
        engine: res?.emailResult?.engine,
        messageId: res?.emailResult?.messageId,
        success: isEmailSent,
        error: !isEmailSent ? (res?.emailResult?.error || 'Email queued or could not be delivered') : null
      });

      setTimeout(() => setEmailToast(null), 8000);

      setRejectModalOrder(null);
      if (selectedOrderDetails?.order_id === rejectModalOrder.order_id) {
        setSelectedOrderDetails(res?.order || null);
      }
      await loadOrders();
    } catch (err) {
      alert('Could not reject order.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMarkDispensed = async (orderId) => {
    if (confirm(`Confirm customer pickup for order ${orderId}? Medication will be marked as dispensed.`)) {
      const res = await updatePrescriptionOrderStatus(orderId, {
        status: 'dispensed',
        pharmacistName: staffUser?.fullName || 'Supervising Pharmacist',
        confirmationMessage: 'Medication dispensed and collected at counter.'
      });
      if (selectedOrderDetails?.order_id === orderId) {
        setSelectedOrderDetails(res?.order || null);
      }
      await loadOrders();
      window.dispatchEvent(new CustomEvent('pharmacy_sales_change'));
      window.dispatchEvent(new CustomEvent('pharmacy_prescription_orders_change'));
    }
  };

  const handlePrintSlip = (order) => {
    const w = window.open('', '_blank', 'width=650,height=750');
    if (!w) return;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Prescription Dispensing Slip - ${order.order_id}</title>
        <style>
          body { font-family: monospace; padding: 24px; color: #111; }
          .header { text-align: center; border-bottom: 2px dashed #333; padding-bottom: 12px; margin-bottom: 16px; }
          .row { display: flex; justify-content: space-between; margin: 6px 0; font-size: 13px; }
          .box { border: 1px solid #333; padding: 12px; margin: 16px 0; background: #fafafa; }
          .footer { text-align: center; border-top: 1px dashed #333; padding-top: 12px; margin-top: 24px; font-size: 11px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>MY PHARMACIST DISPENSARY</h2>
          <p>Prescription Verification & Order Dispensing Slip</p>
          <p><strong>ORDER ID: ${order.order_id}</strong></p>
        </div>
        <div class="row"><span>Patient Name:</span><strong>${order.patient_name} (${order.patient_age || 'N/A'})</strong></div>
        <div class="row"><span>Submitted By:</span><strong>${order.your_name}</strong></div>
        <div class="row"><span>Contact Phone:</span><strong>${order.contact_no}</strong></div>
        <div class="row"><span>Contact Email:</span><strong>${order.your_email}</strong></div>
        <div class="row"><span>Account Status:</span><strong>${order.account_type === 'registered' ? 'REGISTERED PATIENT' : 'GUEST ORDER'}</strong></div>
        <div class="row"><span>Order Date:</span><strong>${new Date(order.created_at).toLocaleString()}</strong></div>
        <div class="row"><span>Fulfillment:</span><strong>${order.delivery_option}</strong></div>

        <div class="box">
          <strong>PATIENT MESSAGE / INSTRUCTIONS:</strong>
          <p>${order.message || 'No specific notes provided.'}</p>
        </div>

        <div class="box">
          <strong>PHARMACIST VERIFICATION STATUS:</strong>
          <p>Status: ${order.status.toUpperCase()}</p>
          ${order.pharmacist_review?.pharmacist_name ? `<p>Supervising Pharmacist: ${order.pharmacist_review.pharmacist_name}</p>` : ''}
          ${order.pharmacist_review?.ready_time ? `<p>Estimated Ready: ${order.pharmacist_review.ready_time}</p>` : ''}
          ${order.pharmacist_review?.confirmation_message ? `<p>Note: ${order.pharmacist_review.confirmation_message}</p>` : ''}
        </div>

        <div class="footer">
          Dispensary Counter 01 • My Pharmacist Healthcare System • Printed at: ${new Date().toLocaleString()}
        </div>
        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `;
    w.document.open();
    w.document.write(html);
    w.document.close();
  };

  // Filter & Search Logic
  const filteredOrders = orders.filter((o) => {
    const matchesStatus = statusFilter === 'all' || o.status === statusFilter;
    const q = searchQuery.toLowerCase().trim();
    const matchesQuery = !q || 
      o.order_id?.toLowerCase().includes(q) ||
      o.patient_name?.toLowerCase().includes(q) ||
      o.your_name?.toLowerCase().includes(q) ||
      o.your_email?.toLowerCase().includes(q) ||
      o.contact_no?.toLowerCase().includes(q);
    return matchesStatus && matchesQuery;
  });

  const pendingCount = orders.filter(o => o.status === 'pending').length;
  const acceptedCount = orders.filter(o => o.status === 'accepted').length;
  const rejectedCount = orders.filter(o => o.status === 'rejected').length;
  const dispensedCount = orders.filter(o => o.status === 'dispensed').length;

  return (
    <div className="space-y-6">
      
      {/* Email Notification Toast */}
      {emailToast && (
        <div className={`p-4 rounded-2xl ${
          emailToast.success === false
            ? 'bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 border-rose-400/40'
            : 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 border-emerald-400/40'
        } text-white shadow-xl flex items-center justify-between gap-4 border animate-in slide-in-from-top-2`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              {emailToast.success === false ? (
                <AlertTriangle className="w-5 h-5 text-rose-100" />
              ) : (
                <Mail className="w-5 h-5 text-emerald-100" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-extrabold text-sm">
                  {emailToast.type === 'rejected'
                    ? (emailToast.success === false ? 'Rejection Notice (Email Undelivered)' : 'Rejection Notice Email Sent')
                    : (emailToast.success === false ? 'Order Accepted (Email Undelivered)' : 'Confirmation Email Dispatched')}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-white/20 text-white uppercase font-bold">
                  Order {emailToast.orderId}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-black/20 text-white font-semibold border border-white/20">
                  {emailToast.success === false ? 'Delivery Error' : 'Live Gmail SSL (465)'}
                </span>
              </div>
              <p className="text-xs text-white/90 mt-0.5">
                Recipient: <strong>{emailToast.recipient}</strong>
                {emailToast.readyTime && <> • Estimated Ready: <strong>{emailToast.readyTime}</strong></>}
                {emailToast.success === false && emailToast.error && <> • Reason: <em>{emailToast.error}</em></>}
                {emailToast.success !== false && <> • Status: <strong className="text-emerald-200">Delivered to Inbox</strong></>}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setEmailToast(null)}
              className="p-1 rounded-lg text-white/80 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
              Pharmacist Supervision Protocol
            </span>
            {pendingCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500 text-white animate-pulse">
                {pendingCount} Pending Action
              </span>
            )}
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            Prescription Orders Management
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Review live patient prescription submissions, identify registered vs guest accounts, and send automated confirmation emails.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <button
            onClick={handleManualRefresh}
            disabled={isLoading}
            className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 font-bold text-xs flex items-center gap-2 text-slate-700 dark:text-slate-300 cursor-pointer shadow-xs disabled:opacity-50"
          >
            <RotateCcw className={`w-3.5 h-3.5 text-teal-600 ${isLoading ? 'animate-spin' : ''}`} />
            <span>{isLoading ? 'Syncing...' : 'Refresh Orders'}</span>
          </button>
        </div>
      </div>

      {/* Metrics Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div 
          onClick={() => setStatusFilter('pending')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            statusFilter === 'pending'
              ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/30'
              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase">Pending Review</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <span className="text-2xl font-black text-slate-900 dark:text-white mt-1 block">
            {pendingCount}
          </span>
          <span className="text-[10px] text-slate-400">Needs pharmacist verification</span>
        </div>

        <div 
          onClick={() => setStatusFilter('accepted')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            statusFilter === 'accepted'
              ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30'
              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">Confirmed & Ready</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <span className="text-2xl font-black text-slate-900 dark:text-white mt-1 block">
            {acceptedCount}
          </span>
          <span className="text-[10px] text-slate-400">Email sent • Ready at counter 01</span>
        </div>

        <div 
          onClick={() => setStatusFilter('rejected')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            statusFilter === 'rejected'
              ? 'border-rose-500 bg-rose-50/50 dark:bg-rose-950/30'
              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 uppercase">Rejected / Notice</span>
            <XCircle className="w-4 h-4 text-rose-500" />
          </div>
          <span className="text-2xl font-black text-slate-900 dark:text-white mt-1 block">
            {rejectedCount}
          </span>
          <span className="text-[10px] text-slate-400">Clinical feedback sent</span>
        </div>

        <div 
          onClick={() => setStatusFilter('dispensed')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            statusFilter === 'dispensed'
              ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/30'
              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase">Dispensed</span>
            <Check className="w-4 h-4 text-blue-500" />
          </div>
          <span className="text-2xl font-black text-slate-900 dark:text-white mt-1 block">
            {dispensedCount}
          </span>
          <span className="text-[10px] text-slate-400">Collected at counter</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Order ID, Patient Name, Email..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:border-teal-600"
          />
        </div>

        {/* Status Filter Buttons */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold w-full sm:w-auto">
          {[
            { id: 'all', label: 'All Orders' },
            { id: 'pending', label: 'Pending Review' },
            { id: 'accepted', label: 'Confirmed' },
            { id: 'rejected', label: 'Rejected' },
            { id: 'dispensed', label: 'Dispensed' }
          ].map((st) => (
            <button
              key={st.id}
              onClick={() => setStatusFilter(st.id)}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                statusFilter === st.id
                  ? 'bg-teal-700 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {/* Orders Table */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
        {filteredOrders.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-14 h-14 rounded-3xl bg-teal-50 dark:bg-teal-950/50 text-teal-600 flex items-center justify-center mx-auto">
              <FileCheck className="w-7 h-7 stroke-[1.8]" />
            </div>
            <h4 className="text-base font-bold text-slate-700 dark:text-slate-300">No prescription orders found</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
              When a patient submits a doctor's prescription through the website form, their order will appear here live with automatic system verification.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold uppercase text-[10px]">
                <tr>
                  <th className="px-4 py-3">Order Details</th>
                  <th className="px-4 py-3">Patient & Contact</th>
                  <th className="px-4 py-3">Account Type</th>
                  <th className="px-4 py-3">Attached Scripts</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Pharmacist Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {filteredOrders.map((order) => {
                  const isPending = order.status === 'pending';
                  const isAccepted = order.status === 'accepted';
                  const isRejected = order.status === 'rejected';
                  const isDispensed = order.status === 'dispensed';

                  return (
                    <tr key={order.order_id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                      
                      {/* Order Details */}
                      <td className="px-4 py-3.5 align-top">
                        <div className="space-y-0.5">
                          <button
                            type="button"
                            onClick={() => setSelectedOrderDetails(order)}
                            className="font-mono font-bold text-teal-700 hover:text-teal-800 dark:text-teal-400 dark:hover:text-teal-300 underline cursor-pointer text-left block"
                            title="Click to view full order details"
                          >
                            {order.order_id}
                          </button>
                          <span className="block text-[10px] text-slate-400">
                            {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(order.created_at).toLocaleDateString()}
                          </span>
                          <span className="inline-block text-[10px] font-bold text-slate-500">
                            {order.delivery_option}
                          </span>
                        </div>
                      </td>

                      {/* Patient & Contact */}
                      <td className="px-4 py-3.5 align-top">
                        <div className="space-y-0.5">
                          <strong className="text-slate-900 dark:text-white block">
                            {order.patient_name} {order.patient_age ? `(${order.patient_age})` : ''}
                          </strong>
                          <span className="text-[11px] text-slate-500 flex items-center gap-1">
                            <Phone className="w-3 h-3 text-slate-400" />
                            {order.contact_no}
                          </span>
                          {order.your_email && (
                            <span className="text-[11px] text-slate-400 flex items-center gap-1">
                              <Mail className="w-3 h-3 text-slate-400" />
                              {order.your_email}
                            </span>
                          )}
                          {order.message && (
                            <p className="text-[11px] text-slate-600 dark:text-slate-400 italic mt-1 bg-slate-50 dark:bg-slate-800/80 p-1.5 rounded-lg line-clamp-2">
                              "{order.message}"
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Account Type (Guest vs Registered) */}
                      <td className="px-4 py-3.5 align-top">
                        {order.account_type === 'registered' ? (
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold text-[10px] uppercase bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                              <UserCheck className="w-3 h-3 text-indigo-600" />
                              <span>Registered User</span>
                            </span>
                            {order.customer_id && (
                              <span className="block text-[9px] text-slate-400 font-mono">
                                Cust #{order.customer_id}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold text-[10px] uppercase bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                            <HelpCircle className="w-3 h-3 text-amber-500" />
                            <span>Guest Checkout</span>
                          </span>
                        )}
                      </td>

                      {/* Attached Prescriptions */}
                      <td className="px-4 py-3.5 align-top">
                        <div className="space-y-1">
                          {order.files && order.files.length > 0 ? (
                            order.files.map((f, i) => (
                              <button
                                key={i}
                                type="button"
                                onClick={() => f.preview && setImagePreviewUrl(f.preview)}
                                className="flex items-center gap-1 text-[11px] font-bold text-teal-600 hover:text-teal-700 dark:text-teal-400 hover:underline cursor-pointer block truncate max-w-[160px]"
                                title="Click to preview prescription"
                              >
                                <ExternalLink className="w-3 h-3 shrink-0" />
                                <span className="truncate">{f.name || `Script #${i+1}`}</span>
                              </button>
                            ))
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">No files attached</span>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5 align-top">
                        {isPending && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-[10px] uppercase bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-700 animate-pulse">
                            <Clock className="w-2.5 h-2.5" />
                            <span>Pending Review</span>
                          </span>
                        )}
                        {isAccepted && (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-[10px] uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                              <CheckCircle2 className="w-2.5 h-2.5" />
                              <span>Accepted & Ready</span>
                            </span>
                            <span className="block text-[9px] text-slate-400">
                              By: {order.pharmacist_review?.pharmacist_name || 'Pharmacist'}
                            </span>
                            {order.pharmacist_review?.email_sent && (
                              <span className="inline-flex items-center gap-0.5 text-[9px] text-emerald-600 font-bold">
                                <Mail className="w-2.5 h-2.5" />
                                <span>Email Confirmed</span>
                              </span>
                            )}
                          </div>
                        )}
                        {isRejected && (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-[10px] uppercase bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-700">
                              <XCircle className="w-2.5 h-2.5" />
                              <span>Rejected</span>
                            </span>
                            <span className="block text-[9px] text-rose-500 font-semibold truncate max-w-[130px]">
                              {order.pharmacist_review?.rejection_reason}
                            </span>
                          </div>
                        )}
                        {isDispensed && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-[10px] uppercase bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-300 dark:border-blue-700">
                            <Check className="w-2.5 h-2.5" />
                            <span>Dispensed at Counter</span>
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 align-top text-right">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          {/* View Full Details Button */}
                          <button
                            type="button"
                            onClick={() => setSelectedOrderDetails(order)}
                            className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                            title="View Full Order Details & Patient Profile"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {isPending ? (
                            <>
                              <button
                                onClick={() => handleOpenAcceptModal(order)}
                                className="px-2.5 py-1.5 rounded-xl font-bold text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
                                title="Accept prescription and send confirmation email"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Accept Order</span>
                              </button>
                              <button
                                onClick={() => handleOpenRejectModal(order)}
                                className="px-2.5 py-1.5 rounded-xl font-bold text-[11px] bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
                                title="Reject invalid prescription"
                              >
                                <X className="w-3.5 h-3.5" />
                                <span>Reject</span>
                              </button>
                            </>
                          ) : isAccepted ? (
                            <button
                              onClick={() => handleMarkDispensed(order.order_id)}
                              className="px-2.5 py-1.5 rounded-xl font-bold text-[11px] bg-teal-700 hover:bg-teal-800 text-white flex items-center gap-1 cursor-pointer transition-colors"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Mark Dispensed</span>
                            </button>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">No action needed</span>
                          )}
                        </div>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* 1. ORDER DETAILS MODAL (Comprehensive Pharmacist View) */}
      {/* ======================================================== */}
      {selectedOrderDetails && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setSelectedOrderDetails(null)}
        >
          <div 
            className={`relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl shadow-2xl border overflow-hidden ${
              isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className={`p-5 sm:p-6 border-b flex items-center justify-between shrink-0 ${
              isDark ? 'border-slate-800 bg-slate-950/40' : 'border-slate-100 bg-slate-50/70'
            }`}>
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-teal-500/15 text-teal-600 flex items-center justify-center">
                  <FileText className="w-6 h-6 stroke-[2]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-black">{selectedOrderDetails.order_id}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      selectedOrderDetails.status === 'accepted' ? 'bg-emerald-100 text-emerald-800' :
                      selectedOrderDetails.status === 'rejected' ? 'bg-rose-100 text-rose-800' :
                      selectedOrderDetails.status === 'dispensed' ? 'bg-blue-100 text-blue-800' :
                      'bg-amber-100 text-amber-800'
                    }`}>
                      {selectedOrderDetails.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Received on {new Date(selectedOrderDetails.created_at).toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handlePrintSlip(selectedOrderDetails)}
                  className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  title="Print Dispensing Slip"
                >
                  <Printer className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedOrderDetails(null)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body (Scrollable) */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-xs flex-1">
              
              {/* Account Identification Banner (Registered vs Guest) */}
              <div className={`p-4 rounded-2xl border ${
                selectedOrderDetails.account_type === 'registered'
                  ? 'bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800'
                  : 'bg-amber-50/70 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {selectedOrderDetails.account_type === 'registered' ? (
                      <UserCheck className="w-4 h-4 text-indigo-600" />
                    ) : (
                      <HelpCircle className="w-4 h-4 text-amber-600" />
                    )}
                    <span className="font-extrabold text-xs uppercase tracking-wider">
                      {selectedOrderDetails.account_type === 'registered' ? 'Verified Registered Patient Account' : 'Guest Patient Submission'}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500">
                    System Identifier: {selectedOrderDetails.account_type.toUpperCase()}
                  </span>
                </div>

                {selectedOrderDetails.account_type === 'registered' ? (
                  <div className="text-slate-700 dark:text-slate-300 text-[11px] space-y-1">
                    <p>
                      This patient holds a verified account in the hospital database 
                      {selectedOrderDetails.customer_id && ` (Patient Account #${selectedOrderDetails.customer_id})`}.
                    </p>
                    {selectedOrderDetails.customer_details && (
                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-indigo-200/60 dark:border-indigo-800/60 text-[10px]">
                        <div>Registered Name: <strong>{selectedOrderDetails.customer_details.full_name}</strong></div>
                        <div>Registered Email: <strong>{selectedOrderDetails.customer_details.email}</strong></div>
                        {selectedOrderDetails.customer_details.nic && (
                          <div>NIC Number: <strong>{selectedOrderDetails.customer_details.nic}</strong></div>
                        )}
                        {selectedOrderDetails.customer_details.address && (
                          <div className="col-span-2">Address: <strong>{selectedOrderDetails.customer_details.address}</strong></div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-slate-600 dark:text-slate-400 text-[11px]">
                    This patient ordered as a guest without creating an account. All contact and verification details below were supplied directly via the prescription upload form.
                  </p>
                )}
              </div>

              {/* Patient & Contact Information Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50 border-slate-200/80'}`}>
                  <h4 className="font-bold text-slate-400 text-[10px] uppercase mb-2">Patient Details</h4>
                  <div className="space-y-1.5 text-xs">
                    <div>
                      <span className="text-slate-500">Patient Name: </span>
                      <strong className="text-slate-900 dark:text-white">{selectedOrderDetails.patient_name}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500">Patient Age: </span>
                      <strong className="text-slate-900 dark:text-white">{selectedOrderDetails.patient_age || 'Not specified'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500">Submitted By: </span>
                      <strong className="text-slate-900 dark:text-white">{selectedOrderDetails.your_name}</strong>
                    </div>
                  </div>
                </div>

                <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50 border-slate-200/80'}`}>
                  <h4 className="font-bold text-slate-400 text-[10px] uppercase mb-2">Contact & Fulfillment</h4>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <a href={`tel:${selectedOrderDetails.contact_no}`} className="font-bold text-teal-600 hover:underline">
                        {selectedOrderDetails.contact_no}
                      </a>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      <a href={`mailto:${selectedOrderDetails.your_email}`} className="font-bold text-teal-600 hover:underline">
                        {selectedOrderDetails.your_email}
                      </a>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-medium text-slate-700 dark:text-slate-300">{selectedOrderDetails.delivery_option}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Medication Instructions */}
              <div>
                <h4 className="font-bold text-slate-400 text-[10px] uppercase mb-1.5">Patient Notes & Instructions</h4>
                <div className={`p-3.5 rounded-2xl border leading-relaxed text-xs ${
                  selectedOrderDetails.message 
                    ? isDark ? 'bg-slate-950/60 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
                    : 'bg-slate-50/50 text-slate-400 italic'
                }`}>
                  {selectedOrderDetails.message || 'No additional medication notes supplied.'}
                </div>
              </div>

              {/* Attached Prescription Files */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold text-slate-400 text-[10px] uppercase">
                    Attached Prescription Files ({selectedOrderDetails.files?.length || 0})
                  </h4>
                  <span className="text-[10px] text-teal-600 dark:text-teal-400">
                    Click file to preview high-res
                  </span>
                </div>

                {selectedOrderDetails.files && selectedOrderDetails.files.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {selectedOrderDetails.files.map((file, idx) => (
                      <div
                        key={idx}
                        onClick={() => file.preview && setImagePreviewUrl(file.preview)}
                        className={`p-3 rounded-2xl border flex items-center justify-between gap-3 cursor-pointer transition-all hover:border-teal-500/50 ${
                          isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200/80 hover:bg-slate-100'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {file.preview ? (
                            <img 
                              src={file.preview} 
                              alt="thumb" 
                              className="w-10 h-10 rounded-lg object-cover border border-slate-200 dark:border-slate-700 shrink-0" 
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-teal-50 dark:bg-teal-950 text-teal-600 flex items-center justify-center shrink-0">
                              <FileText className="w-5 h-5" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <span className="font-bold text-slate-900 dark:text-white truncate block">
                              {file.name || `Prescription_Script_${idx + 1}`}
                            </span>
                            <span className="text-[10px] text-slate-400 block">{file.size || 'Attached Image'}</span>
                          </div>
                        </div>

                        <ExternalLink className="w-4 h-4 text-slate-400 shrink-0" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-slate-400">
                    No prescription images attached for this order.
                  </div>
                )}
              </div>

              {/* Pharmacist Review Section (If reviewed) */}
              {selectedOrderDetails.pharmacist_review && (
                <div className={`p-4 rounded-2xl border ${
                  selectedOrderDetails.status === 'accepted'
                    ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800'
                    : selectedOrderDetails.status === 'rejected'
                    ? 'bg-rose-50/60 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800'
                    : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800'
                }`}>
                  <h4 className="font-bold text-xs uppercase mb-1.5 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-teal-600" />
                    <span>Clinical Review Record</span>
                  </h4>
                  <div className="space-y-1 text-xs">
                    <div>Pharmacist: <strong>{selectedOrderDetails.pharmacist_review.pharmacist_name}</strong></div>
                    <div>Reviewed At: <strong>{new Date(selectedOrderDetails.pharmacist_review.reviewed_at).toLocaleString()}</strong></div>
                    {selectedOrderDetails.pharmacist_review.ready_time && (
                      <div>Ready For Pickup: <strong>{selectedOrderDetails.pharmacist_review.ready_time}</strong></div>
                    )}
                    {selectedOrderDetails.pharmacist_review.confirmation_message && (
                      <p className="mt-2 text-slate-700 dark:text-slate-300 italic">
                        "{selectedOrderDetails.pharmacist_review.confirmation_message}"
                      </p>
                    )}
                    {selectedOrderDetails.pharmacist_review.rejection_reason && (
                      <p className="mt-2 text-rose-700 dark:text-rose-300 font-medium">
                        Rejection Reason: {selectedOrderDetails.pharmacist_review.rejection_reason}
                      </p>
                    )}
                  </div>
                </div>
              )}

            </div>

            {/* Modal Footer Controls */}
            <div className={`p-4 sm:p-5 border-t flex flex-wrap items-center justify-between gap-3 shrink-0 ${
              isDark ? 'border-slate-800 bg-slate-950/40' : 'border-slate-100 bg-slate-50/70'
            }`}>
              <button
                type="button"
                onClick={() => handlePrintSlip(selectedOrderDetails)}
                className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 hover:bg-slate-100 flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Dispensing Slip</span>
              </button>

              <div className="flex items-center gap-2">
                {selectedOrderDetails.status === 'pending' && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleOpenRejectModal(selectedOrderDetails)}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Reject Order</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenAcceptModal(selectedOrderDetails)}
                      className="px-5 py-2.5 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2 cursor-pointer shadow-md"
                    >
                      <Check className="w-4 h-4" />
                      <span>Accept Order & Send Email</span>
                    </button>
                  </>
                )}

                {selectedOrderDetails.status === 'accepted' && (
                  <button
                    type="button"
                    onClick={() => handleMarkDispensed(selectedOrderDetails.order_id)}
                    className="px-5 py-2.5 rounded-xl text-xs font-black bg-teal-700 hover:bg-teal-800 text-white flex items-center gap-2 cursor-pointer shadow-md"
                  >
                    <Check className="w-4 h-4" />
                    <span>Mark Dispensed at Counter</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setSelectedOrderDetails(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. ACCEPT & CONFIRM PRESCRIPTION MODAL */}
      {/* ======================================================== */}
      {acceptModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className={`relative w-full max-w-lg rounded-3xl p-6 sm:p-7 shadow-2xl border ${
            isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <button
              onClick={() => setAcceptModalOrder(null)}
              className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-2">
              <span className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-500 flex items-center justify-center">
                <Check className="w-5 h-5 stroke-[2.5]" />
              </span>
              <div>
                <h3 className="text-base font-black">Accept Prescription & Send Confirmation</h3>
                <span className="text-xs text-slate-400 font-mono">Order {acceptModalOrder.order_id}</span>
              </div>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
              Supervising Pharmacist verification for <strong>{acceptModalOrder.patient_name}</strong> ({acceptModalOrder.patient_age}). 
              Upon acceptance, the system automatically sends a confirmation message to <strong>{acceptModalOrder.your_email}</strong>.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-600 dark:text-slate-300 block mb-1">
                  Estimated Ready for Pickup Time:
                </label>
                <select
                  value={readyTime}
                  onChange={(e) => setReadyTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 focus:outline-none"
                >
                  <option value="Ready Immediately">Ready Immediately (At Counter 01)</option>
                  <option value="15 - 20 Minutes">15 - 20 Minutes</option>
                  <option value="30 - 45 Minutes">30 - 45 Minutes</option>
                  <option value="1 - 2 Hours">1 - 2 Hours</option>
                  <option value="Same Day Evening">Same Day Evening Pickup</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-600 dark:text-slate-300 block mb-1">
                  Customer Email Message:
                </label>
                <textarea
                  rows={3}
                  value={confirmMsg}
                  onChange={(e) => setConfirmMsg(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 focus:outline-none"
                />
              </div>

              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 text-[11px] flex items-center gap-2">
                <Shield className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>Verification registered under: <strong>{staffUser?.fullName || 'Supervising Pharmacist'}</strong></span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 mt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setAcceptModalOrder(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleConfirmAccept}
                className="px-5 py-2.5 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2 shadow-md cursor-pointer disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isProcessing ? 'Dispatching...' : 'Confirm & Send Confirmation Email'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. REJECT PRESCRIPTION MODAL */}
      {/* ======================================================== */}
      {rejectModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className={`relative w-full max-w-lg rounded-3xl p-6 sm:p-7 shadow-2xl border ${
            isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <button
              onClick={() => setRejectModalOrder(null)}
              className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-2">
              <span className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-500 flex items-center justify-center">
                <X className="w-5 h-5 stroke-[2.5]" />
              </span>
              <div>
                <h3 className="text-base font-black">Reject Prescription Order</h3>
                <span className="text-xs text-slate-400 font-mono">Order {rejectModalOrder.order_id}</span>
              </div>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
              State the clinical reason for rejecting this prescription order. A polite notice will be dispatched to <strong>{rejectModalOrder.your_email}</strong>.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-600 dark:text-slate-300 block mb-1">
                  Primary Clinical Rejection Reason:
                </label>
                <select
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 focus:outline-none"
                >
                  <option value="Doctor signature or clinical license seal missing">Doctor signature or clinical license seal missing</option>
                  <option value="Prescription has expired (>6 months from issue date)">Prescription has expired (>6 months from issue date)</option>
                  <option value="Prescription handwriting is illegible or image blurred">Prescription handwriting is illegible or image blurred</option>
                  <option value="Schedule III controlled drug requires in-person paper original">Schedule III controlled drug requires in-person paper original</option>
                  <option value="Prescribed medication currently out of stock with no generic match">Prescribed medication currently out of stock with no generic match</option>
                  <option value="Dosage or drug interaction clarification required from physician">Dosage or drug interaction clarification required from physician</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-600 dark:text-slate-300 block mb-1">
                  Instructions / Alternative Advice for Customer:
                </label>
                <textarea
                  rows={3}
                  value={rejectDetails}
                  onChange={(e) => setRejectDetails(e.target.value)}
                  placeholder="e.g. Please bring original physical prescription to counter 01 or upload a clearer scan."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 mt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setRejectModalOrder(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleConfirmReject}
                className="px-5 py-2.5 rounded-xl font-bold text-xs bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-2 shadow-md cursor-pointer disabled:opacity-50"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>{isProcessing ? 'Sending...' : 'Reject & Send Rejection Notice'}</span>
              </button>
            </div>
          </div>
        </div>
      )}



      {/* ======================================================== */}
      {/* 4. PRESCRIPTION IMAGE PREVIEW MODAL */}
      {/* ======================================================== */}
      {imagePreviewUrl && (
        <div 
          onClick={() => setImagePreviewUrl(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in"
        >
          <div className="relative max-w-3xl max-h-[90vh] overflow-hidden rounded-2xl bg-black border border-slate-800 shadow-2xl p-2" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setImagePreviewUrl(null)}
              className="absolute top-4 right-4 z-10 p-2 rounded-full bg-slate-900/80 text-white hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
            <img 
              src={imagePreviewUrl} 
              alt="Prescription Document Preview" 
              className="w-full h-auto max-h-[82vh] object-contain rounded-xl"
            />
          </div>
        </div>
      )}

    </div>
  );
}
