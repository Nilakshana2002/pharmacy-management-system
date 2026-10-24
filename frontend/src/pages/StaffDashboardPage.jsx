import React, { useState, useEffect } from 'react';
import { 
  Layers, Package, AlertTriangle, Clock, History, Plus, 
  RefreshCw, CheckCircle2, Shield, Edit, Sliders, Calendar, 
  Building2, Search, ShoppingCart, User, FileText, Check, 
  Receipt, ArrowRight, X, AlertCircle, Sparkles, Filter, ChevronRight,
  Printer, Pill, Minus, PanelLeftClose, PanelLeftOpen, TrendingUp, TrendingDown,
  BarChart3, PieChart, ShieldCheck, Activity, LogOut, ChevronLeft, Globe, Menu, ExternalLink,
  Download, CalendarRange, FileSpreadsheet, KeyRound, CheckSquare, Square,
  ShieldAlert, Trash2, RotateCcw, FileCheck, Ban, Eye, Info, Copy,
  Zap, Droplets, Tag, ShoppingBag, Banknote, CreditCard, Flame, Percent,
  Users, UserCheck, UserX, Mail, Phone, MapPin, UserPlus,
  MessageSquare, Send, Inbox, Reply, MailCheck, MessageCircle
} from 'lucide-react';
import { 
  getAdminDashboard, getAdminMedicines, getAdminBatches, 
  getLowStockReport, getExpiringBatchesReport, getAuditLogs, 
  getSuppliers, getCategories, getBrands, createMedicine,
  updateMedicine, updateMedicineOffer, createBatch, adjustBatchStock, createSale,
  getSalesHistory, getSaleById, getDailySalesReport, getMonthlySalesReport,
  getBestSellingReport, getInventoryValuationReport, getUsers,
  createUser, updateUser, toggleUserStatus, executeBatchAction,
  getAdminCustomers, createAdminCustomer, updateAdminCustomer,
  toggleAdminCustomerStatus, deleteAdminCustomer,
  getAdminInquiries, updateAdminInquiryStatus, respondToAdminInquiry,
  deleteAdminInquiry
} from '../services/api';
import { useTheme } from '../context/ThemeContext';
import PrescriptionOrdersManager from '../components/PrescriptionOrdersManager';
import { getPrescriptionOrders, fetchPrescriptionOrdersFromApi } from '../utils/prescriptionOrdersService';
import { getMedicineProductImage } from '../utils/pharmacyImages';
import MedicineImageUploadField from '../components/MedicineImageUploadField';
import { DOSAGE_AND_PACKAGING_GROUPS, ALL_DOSAGE_FORMS } from '../utils/dosageForms';

export default function StaffDashboardPage({ staffUser, onLogout, onBrowseWebsite }) {
  const { isDark } = useTheme();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('overview'); // overview, pos, medicines, batches, reports, users
  const [stats, setStats] = useState(null);
  const [medicines, setMedicines] = useState([]);
  const [batches, setBatches] = useState([]);
  const [lowStockList, setLowStockList] = useState([]);
  const [expiringList, setExpiringList] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);

  // Advanced Reports & Sales state
  const [reportSubTab, setReportSubTab] = useState('sales'); // 'sales', 'bestsellers', 'valuation', 'audit'
  const [salesHistory, setSalesHistory] = useState([]);
  const [dailySales, setDailySales] = useState([]);
  const [monthlySales, setMonthlySales] = useState([]);
  const [bestSellers, setBestSellers] = useState([]);
  const [valuation, setValuation] = useState(null);
  const [staffUsers, setStaffUsers] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [userSubTab, setUserSubTab] = useState('staff'); // 'staff' | 'customers'
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerStatusFilter, setCustomerStatusFilter] = useState('all'); // 'all' | 'active' | 'suspended'
  const [customerSaving, setCustomerSaving] = useState(false);
  const [selectedSaleForInfo, setSelectedSaleForInfo] = useState(null);
  const [saleInfoLoading, setSaleInfoLoading] = useState(false);
  const [copiedInvoice, setCopiedInvoice] = useState(false);

  // Customer Contact Inquiries & Consultation state
  const [inquiries, setInquiries] = useState([]);
  const [inquiriesLoading, setInquiriesLoading] = useState(false);
  const [inquiryFilter, setInquiryFilter] = useState('ALL'); // 'ALL' | 'NEW' | 'IN_REVIEW' | 'RESOLVED'
  const [inquirySearch, setInquirySearch] = useState('');
  const [selectedInquiryForReply, setSelectedInquiryForReply] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [replySubject, setReplySubject] = useState('');
  const [replyStatus, setReplyStatus] = useState('RESOLVED');
  const [replySending, setReplySending] = useState(false);
  const [replyFeedback, setReplyFeedback] = useState(null);
  const [statusUpdatingId, setStatusUpdatingId] = useState(null);
  const [deletingInquiryId, setDeletingInquiryId] = useState(null);

  const handleOpenSaleInfo = async (sale) => {
    setSelectedSaleForInfo(sale);
    setCopiedInvoice(false);
    if (!sale.items || sale.items.length === 0) {
      try {
        setSaleInfoLoading(true);
        const res = await getSaleById(sale.sale_id);
        if (res?.success && res.data) {
          setSelectedSaleForInfo(res.data);
        }
      } catch (err) {
        console.warn('Could not fetch deep sale details, using cached row:', err);
      } finally {
        setSaleInfoLoading(false);
      }
    }
  };

  const handleCopyInvoiceNumber = (inv) => {
    if (!inv) return;
    navigator.clipboard?.writeText(inv);
    setCopiedInvoice(true);
    setTimeout(() => setCopiedInvoice(false), 2000);
  };
  const [pendingRxCount, setPendingRxCount] = useState(() => {
    try {
      const orders = getPrescriptionOrders();
      return (orders || []).filter(o => o.status === 'pending').length;
    } catch (e) {
      return 0;
    }
  });

  // Poll & listen to pending prescription orders count
  useEffect(() => {
    const updatePendingCount = async () => {
      try {
        const orders = await fetchPrescriptionOrdersFromApi();
        const count = (orders || []).filter(o => o.status === 'pending').length;
        setPendingRxCount(count);
      } catch (e) {
        try {
          const orders = getPrescriptionOrders();
          setPendingRxCount((orders || []).filter(o => o.status === 'pending').length);
        } catch (err) {
          // ignore
        }
      }
    };
    updatePendingCount();
    window.addEventListener('pharmacy_prescription_orders_change', updatePendingCount);
    const interval = setInterval(updatePendingCount, 5000);
    return () => {
      window.removeEventListener('pharmacy_prescription_orders_change', updatePendingCount);
      clearInterval(interval);
    };
  }, []);

  // Search & Filter within staff tabs
  const [medSearch, setMedSearch] = useState('');
  const [batchSearch, setBatchSearch] = useState('');

  // Modals state
  const [isNewMedModalOpen, setIsNewMedModalOpen] = useState(false);
  const [isNewBatchModalOpen, setIsNewBatchModalOpen] = useState(false);
  const [selectedBatchForAdjust, setSelectedBatchForAdjust] = useState(null);

  // Batch Expiry, Quarantine & Disposal Protocol state
  const [batchFilter, setBatchFilter] = useState('all'); // 'all', 'expired', 'critical', 'quarantined', 'active'
  const [selectedBatchForAction, setSelectedBatchForAction] = useState(null);
  const [batchActionType, setBatchActionType] = useState('QUARANTINE'); // 'QUARANTINE', 'UPDATE_EXPIRY', 'DISPOSE', 'RETURN', 'ACTIVATE'
  const [batchActionReason, setBatchActionReason] = useState('');
  const [batchDisposalMethod, setBatchDisposalMethod] = useState('Certified High-Temperature Medical Incineration');
  const [batchActionLoading, setBatchActionLoading] = useState(false);
  const [actionNewExpiryDate, setActionNewExpiryDate] = useState('');
  const [actionNewMfgDate, setActionNewMfgDate] = useState('');

  // Edit Medicine Modal state
  const [isEditMedModalOpen, setIsEditMedModalOpen] = useState(false);
  const [selectedMedForEdit, setSelectedMedForEdit] = useState(null);
  const [editMedForm, setEditMedForm] = useState({
    name: '', generic_name: '', brand_id: '', category_id: '',
    dosage_form: 'Tablet', strength: '', description: '', unit_price: '',
    low_stock_threshold: 20, is_active: true, is_offer: false, discount_percent: 0,
    image_url: ''
  });

  const [isCustomDosageForm, setIsCustomDosageForm] = useState(false);
  const [isEditCustomDosageForm, setIsEditCustomDosageForm] = useState(false);

  // Promotional Offer Allocation state
  const [isOfferModalOpen, setIsOfferModalOpen] = useState(false);
  const [selectedMedForOffer, setSelectedMedForOffer] = useState(null);
  const [offerForm, setOfferForm] = useState({ is_offer: false, discount_percent: 10 });
  const [offerSaving, setOfferSaving] = useState(false);
  const [medOfferFilter, setMedOfferFilter] = useState('all'); // 'all' | 'offers' | 'regular'

  // Admin New Staff Modal state
  const [isNewUserModalOpen, setIsNewUserModalOpen] = useState(false);
  const [newUserForm, setNewUserForm] = useState({
    username: '', email: '', password: '', full_name: '', role: 'PHARMACIST',
    permissions: {
      can_pos: true,
      can_manage_medicines: false,
      can_manage_batches: false,
      can_view_reports: false,
      can_manage_inquiries: false,
      can_view_audit: false
    }
  });

  // Admin Edit Staff Privileges Modal state
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);
  const [selectedUserForEdit, setSelectedUserForEdit] = useState(null);
  const [editUserForm, setEditUserForm] = useState({
    full_name: '',
    email: '',
    role: 'PHARMACIST',
    password: '',
    is_active: true,
    permissions: {
      can_pos: true,
      can_manage_medicines: false,
      can_manage_batches: false,
      can_view_reports: false,
      can_manage_inquiries: false,
      can_view_audit: false
    }
  });

  // Admin New Patient / Customer Modal state
  const [isNewCustomerModalOpen, setIsNewCustomerModalOpen] = useState(false);
  const [newCustomerForm, setNewCustomerForm] = useState({
    full_name: '', email: '', password: '', contact_no: '', patient_age: '', nic: '', address: '', is_active: true
  });

  // Admin Edit Patient Details & Status Modal state
  const [isEditCustomerModalOpen, setIsEditCustomerModalOpen] = useState(false);
  const [selectedCustomerForEdit, setSelectedCustomerForEdit] = useState(null);
  const [editCustomerForm, setEditCustomerForm] = useState({
    full_name: '', email: '', password: '', contact_no: '', patient_age: '', nic: '', address: '', is_active: true, status: 'active'
  });

  // Operational Reports Timeline & Export state
  const [reportTimeline, setReportTimeline] = useState('all'); // 'today', '7days', 'month', '30days', 'all', 'custom'
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [timelineLoading, setTimelineLoading] = useState(false);

  // Quick Dispense (POS Counter) state
  const [dispenseCategoryId, setDispenseCategoryId] = useState('');
  const [dispenseSearch, setDispenseSearch] = useState('');
  const [dispenseFormFilter, setDispenseFormFilter] = useState('all'); // 'all', 'tablet', 'syrup', 'injection', 'topical', 'inhaler'
  const [dispenseMedId, setDispenseMedId] = useState('');
  const [dispenseBatchId, setDispenseBatchId] = useState('');
  const [dispenseMode, setDispenseMode] = useState('card'); // 'card' | 'loose' | 'pack' | 'bottle' | 'vial' | 'tube' | 'inhaler'
  const [cardCount, setCardCount] = useState(1);
  const [tabletsPerCard, setTabletsPerCard] = useState(10);
  const [looseCount, setLooseCount] = useState(1);
  const [packCount, setPackCount] = useState(1);
  const [unitsPerPack, setUnitsPerPack] = useState(30);
  const [bottleCount, setBottleCount] = useState(1);
  const [vialCount, setVialCount] = useState(1);
  const [tubeCount, setTubeCount] = useState(1);
  const [inhalerCount, setInhalerCount] = useState(1);
  const [patientName, setPatientName] = useState('');
  const [prescriptionRef, setPrescriptionRef] = useState('');
  const [dispensePaymentMethod, setDispensePaymentMethod] = useState('CASH'); // 'CASH' | 'CARD'
  const [dispenseSuccess, setDispenseSuccess] = useState(null);
  const [dispenseLoading, setDispenseLoading] = useState(false);

  // Form states
  const [medForm, setMedForm] = useState({
    name: '', generic_name: '', brand_id: '', category_id: '',
    dosage_form: 'Tablet', strength: '', description: '', unit_price: '',
    is_public_price: true, low_stock_threshold: 20, image_url: ''
  });

  const [batchForm, setBatchForm] = useState({
    medicine_id: '', supplier_id: '', batch_number: '',
    manufacture_date: '', expiry_date: '', quantity: '', unit_cost: ''
  });

  const [adjustQty, setAdjustQty] = useState('');
  const [adjustReason, setAdjustReason] = useState('Routine counter stock update');
  const [adjustExpiryDate, setAdjustExpiryDate] = useState('');
  const [adjustMfgDate, setAdjustMfgDate] = useState('');
  const [adjustStatus, setAdjustStatus] = useState('active');

  useEffect(() => {
    loadDashboardData();

    const handleSalesChange = () => {
      loadDashboardData();
    };

    window.addEventListener('pharmacy_sales_change', handleSalesChange);
    return () => {
      window.removeEventListener('pharmacy_sales_change', handleSalesChange);
    };
  }, []);

  useEffect(() => {
    if (activeTab === 'reports') {
      loadDashboardData();
    }
  }, [activeTab]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const results = await Promise.allSettled([
        getAdminDashboard(),
        getAdminMedicines(),
        getAdminBatches(),
        getLowStockReport(),
        getExpiringBatchesReport(),
        getAuditLogs(),
        getSuppliers(),
        getCategories(),
        getBrands(),
        getSalesHistory(),
        getDailySalesReport(),
        getMonthlySalesReport(),
        getBestSellingReport(),
        getInventoryValuationReport(),
        getUsers(),
        getAdminCustomers(),
        getAdminInquiries()
      ]);

      const [
        statsRes, medsRes, batchRes, lowRes, expRes, 
        logRes, supRes, catRes, brRes, salesRes, 
        dailyRes, monthRes, bestRes, valRes, usersRes,
        customersRes, inquiriesRes
      ] = results.map((r) => (r.status === 'fulfilled' ? r.value : null));

      if (statsRes?.success) setStats(statsRes.data);
      if (medsRes?.success) setMedicines(medsRes.data || []);
      if (batchRes?.success) setBatches(batchRes.data || []);
      if (lowRes?.success) setLowStockList(lowRes.data || []);
      if (expRes?.success) setExpiringList(expRes.data || []);
      if (logRes?.success) setAuditLogs(logRes.data || []);
      if (supRes?.success) setSuppliers(supRes.data || []);
      if (catRes?.success) setCategories(catRes.data || []);
      if (brRes?.success) setBrands(brRes.data || []);
      if (salesRes?.success) setSalesHistory(salesRes.data || []);
      if (dailyRes?.success) setDailySales(dailyRes.data || []);
      if (monthRes?.success) setMonthlySales(monthRes.data || []);
      if (bestRes?.success) setBestSellers(bestRes.data || []);
      if (valRes?.success) setValuation(valRes.data || null);
      if (usersRes?.success) setStaffUsers(usersRes.data || []);
      if (customersRes?.success) setCustomers(customersRes.data || []);
      if (inquiriesRes?.success) setInquiries(inquiriesRes.data || []);
    } catch (err) {
      console.error('Error loading dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchInquiries = async () => {
    try {
      setInquiriesLoading(true);
      const res = await getAdminInquiries();
      if (res?.success) {
        setInquiries(res.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch inquiries:', err);
    } finally {
      setInquiriesLoading(false);
    }
  };

  const handleOpenReplyModal = (inq) => {
    setSelectedInquiryForReply(inq);
    setReplySubject(`Response to Inquiry [${inq.reference_code}] - My Pharmacist Dispensary`);
    setReplyText('');
    setReplyStatus('RESOLVED');
    setReplyFeedback(null);
  };

  const handleSendInquiryReply = async (e) => {
    e.preventDefault();
    if (!selectedInquiryForReply || !replyText.trim()) return;

    setReplySending(true);
    setReplyFeedback(null);
    try {
      const res = await respondToAdminInquiry(selectedInquiryForReply.inquiry_id, {
        response_message: replyText.trim(),
        subject: replySubject.trim(),
        status: replyStatus
      });

      if (res?.success) {
        setReplyFeedback({
          type: 'success',
          message: res.message || 'Response recorded and email successfully sent.'
        });

        // Update local state immediately
        setInquiries(prev => prev.map(item => {
          if (item.inquiry_id === selectedInquiryForReply.inquiry_id) {
            return {
              ...item,
              status: replyStatus,
              staff_notes: replyText.trim(),
              responded_by: staffUser?.fullName || 'Pharmacist',
              responded_at: new Date().toISOString()
            };
          }
          return item;
        }));

        setTimeout(() => {
          setSelectedInquiryForReply(null);
          setReplyFeedback(null);
        }, 1800);
      } else {
        setReplyFeedback({
          type: 'error',
          message: res?.message || 'Failed to dispatch email response.'
        });
      }
    } catch (err) {
      console.error('Inquiry reply error:', err);
      setReplyFeedback({
        type: 'error',
        message: err.response?.data?.message || err.message || 'Error processing inquiry response.'
      });
    } finally {
      setReplySending(false);
    }
  };

  const handleQuickUpdateInquiryStatus = async (inquiryId, newStatus) => {
    setStatusUpdatingId(inquiryId);
    try {
      const res = await updateAdminInquiryStatus(inquiryId, { status: newStatus });
      if (res?.success) {
        setInquiries(prev => prev.map(item => {
          if (item.inquiry_id === inquiryId) {
            return {
              ...item,
              status: newStatus,
              responded_by: staffUser?.fullName || 'Pharmacist',
              responded_at: new Date().toISOString()
            };
          }
          return item;
        }));
      }
    } catch (err) {
      console.error('Quick status update error:', err);
    } finally {
      setStatusUpdatingId(null);
    }
  };

  const handleDeleteInquiry = async (inq) => {
    const refText = inq.reference_code ? ` [${inq.reference_code}]` : '';
    const nameText = inq.name ? ` from "${inq.name}"` : '';
    if (!window.confirm(`Are you sure you want to permanently delete this customer inquiry${refText}${nameText}? This action cannot be undone.`)) {
      return;
    }
    setDeletingInquiryId(inq.inquiry_id);
    try {
      const res = await deleteAdminInquiry(inq.inquiry_id);
      if (res?.success) {
        setInquiries(prev => prev.filter(item => item.inquiry_id !== inq.inquiry_id));
      } else {
        alert(res?.message || 'Failed to delete inquiry');
      }
    } catch (err) {
      console.error('Delete inquiry error:', err);
      alert(err.response?.data?.message || 'Error deleting inquiry');
    } finally {
      setDeletingInquiryId(null);
    }
  };

  const handleOpenEditMedicine = (med) => {
    setSelectedMedForEdit(med);
    const isCustom = med.dosage_form && !ALL_DOSAGE_FORMS.includes(med.dosage_form);
    setIsEditCustomDosageForm(Boolean(isCustom));
    setEditMedForm({
      name: med.name || '',
      generic_name: med.generic_name || '',
      brand_id: med.brand_id || '',
      category_id: med.category_id || '',
      dosage_form: med.dosage_form || 'Tablet',
      strength: med.strength || '',
      description: med.description || '',
      unit_price: med.unit_price || '',
      low_stock_threshold: med.low_stock_threshold || 20,
      is_active: med.is_active !== undefined ? med.is_active : true,
      is_offer: Boolean(med.is_offer),
      discount_percent: Number(med.discount_percent) || 0,
      image_url: med.image_url || ''
    });
    setIsEditMedModalOpen(true);
  };

  const handleUpdateMedicine = async (e) => {
    e.preventDefault();
    if (!selectedMedForEdit) return;
    try {
      const res = await updateMedicine(selectedMedForEdit.medicine_id, {
        ...editMedForm,
        brand_id: parseInt(editMedForm.brand_id, 10),
        category_id: parseInt(editMedForm.category_id, 10),
        unit_price: parseFloat(editMedForm.unit_price) || 0,
        low_stock_threshold: parseInt(editMedForm.low_stock_threshold, 10) || 20,
        is_active: Boolean(editMedForm.is_active),
        is_offer: Boolean(editMedForm.is_offer),
        discount_percent: editMedForm.is_offer ? (parseFloat(editMedForm.discount_percent) || 0) : 0,
        image_url: editMedForm.image_url !== undefined ? editMedForm.image_url : null
      });
      if (res.success) {
        setIsEditMedModalOpen(false);
        setSelectedMedForEdit(null);
        await loadDashboardData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Error updating medicine formulation');
    }
  };

  // Open Promotional Offer Allocation Modal
  const handleOpenOfferModal = (med) => {
    setSelectedMedForOffer(med);
    const hasOffer = Boolean(med.is_offer);
    const disc = Number(med.discount_percent) || 10;
    setOfferForm({
      is_offer: hasOffer,
      discount_percent: disc > 0 ? disc : 10
    });
    setIsOfferModalOpen(true);
  };

  // Save Promotional Offer
  const handleSaveOffer = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!selectedMedForOffer) return;
    try {
      setOfferSaving(true);
      const res = await updateMedicineOffer(selectedMedForOffer.medicine_id, {
        is_offer: offerForm.is_offer,
        discount_percent: offerForm.is_offer ? (parseFloat(offerForm.discount_percent) || 10) : 0
      });
      if (res.success) {
        setIsOfferModalOpen(false);
        setSelectedMedForOffer(null);
        await loadDashboardData();
      } else {
        alert(res.message || 'Failed to update offer');
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Error updating promotional offer');
    } finally {
      setOfferSaving(false);
    }
  };

  // Quick 1-click offer toggle
  const handleQuickToggleOffer = async (med) => {
    try {
      const nextOffer = !med.is_offer;
      const nextDiscount = nextOffer ? (Number(med.discount_percent) > 0 ? Number(med.discount_percent) : 10) : 0;
      const res = await updateMedicineOffer(med.medicine_id, {
        is_offer: nextOffer,
        discount_percent: nextDiscount
      });
      if (res.success) {
        await loadDashboardData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Error toggling promotional offer');
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      const res = await createUser(newUserForm);
      if (res.success) {
        setIsNewUserModalOpen(false);
        setNewUserForm({
          username: '', email: '', password: '', full_name: '', role: 'PHARMACIST',
          permissions: {
            can_pos: true,
            can_manage_medicines: false,
            can_manage_batches: false,
            can_view_reports: false,
            can_manage_inquiries: false,
            can_view_audit: false
          }
        });
        await loadDashboardData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Error creating staff user');
    }
  };

  // Customer / Patient Management Action Handlers
  const handleCreateCustomer = async (e) => {
    e.preventDefault();
    try {
      setCustomerSaving(true);
      const res = await createAdminCustomer(newCustomerForm);
      if (res.success) {
        setIsNewCustomerModalOpen(false);
        setNewCustomerForm({
          full_name: '',
          email: '',
          password: '',
          contact_no: '',
          patient_age: '',
          nic: '',
          address: '',
          is_active: true
        });
        await loadDashboardData();
      } else {
        alert(res.message || 'Failed to create patient account');
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Error registering patient account');
    } finally {
      setCustomerSaving(false);
    }
  };

  const handleOpenEditCustomer = (cust) => {
    setSelectedCustomerForEdit(cust);
    setEditCustomerForm({
      full_name: cust.full_name || '',
      email: cust.email || '',
      password: '',
      contact_no: cust.contact_no || '',
      patient_age: cust.patient_age || '',
      nic: cust.nic || '',
      address: cust.address || '',
      is_active: cust.is_active !== undefined ? Boolean(cust.is_active) : true,
      status: cust.status || 'active'
    });
    setIsEditCustomerModalOpen(true);
  };

  const handleUpdateCustomer = async (e) => {
    e.preventDefault();
    if (!selectedCustomerForEdit) return;
    try {
      setCustomerSaving(true);
      const res = await updateAdminCustomer(selectedCustomerForEdit.customer_id, editCustomerForm);
      if (res.success) {
        setIsEditCustomerModalOpen(false);
        setSelectedCustomerForEdit(null);
        await loadDashboardData();
      } else {
        alert(res.message || 'Failed to update patient profile');
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Error updating patient profile');
    } finally {
      setCustomerSaving(false);
    }
  };

  const handleToggleCustomerStatus = async (cust) => {
    try {
      const nextActive = !cust.is_active;
      const res = await toggleAdminCustomerStatus(cust.customer_id, nextActive);
      if (res.success) {
        await loadDashboardData();
      } else {
        alert(res.message || 'Failed to toggle customer status');
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Error toggling customer status');
    }
  };

  const handleDeleteCustomer = async (cust) => {
    if (!window.confirm(`Are you sure you want to permanently delete patient account for "${cust.full_name}"?`)) {
      return;
    }
    try {
      const res = await deleteAdminCustomer(cust.customer_id);
      if (res.success) {
        await loadDashboardData();
      } else {
        alert(res.message || 'Failed to delete customer');
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Error deleting customer');
    }
  };

  const handleOpenBatchActionModal = (batch, defaultAction = null) => {
    setSelectedBatchForAction(batch);
    const isPast = Number(batch.days_to_expiry) <= 0 || new Date(batch.expiry_date) <= new Date();
    if (defaultAction) {
      setBatchActionType(defaultAction);
    } else if (batch.status === 'quarantined') {
      setBatchActionType('DISPOSE');
    } else if (isPast) {
      setBatchActionType('QUARANTINE');
    } else {
      setBatchActionType('QUARANTINE');
    }
    setBatchActionReason(
      isPast 
        ? `Expired batch (${batch.stock_quantity} units) quarantine & disposal per pharmacy protocol`
        : `Quarantine isolation for lot ${batch.batch_number}`
    );
    setBatchDisposalMethod('Certified High-Temperature Medical Incineration');

    // Pre-populate date fields
    const toDateInputStr = (val) => {
      if (!val) return '';
      try {
        const d = new Date(val);
        return isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
      } catch {
        return '';
      }
    };
    let defaultFutureExpiry = '';
    try {
      const nextYear = new Date();
      nextYear.setFullYear(nextYear.getFullYear() + 1);
      defaultFutureExpiry = nextYear.toISOString().slice(0, 10);
    } catch {}
    setActionNewExpiryDate(defaultFutureExpiry);
    setActionNewMfgDate(toDateInputStr(batch.manufacture_date));
  };

  const handleExecuteBatchAction = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!selectedBatchForAction) return;
    try {
      setBatchActionLoading(true);
      const payload = {
        action: batchActionType,
        reason: batchActionReason,
        disposal_method: batchActionType === 'DISPOSE' ? batchDisposalMethod : undefined
      };
      if (batchActionType === 'UPDATE_EXPIRY') {
        if (!actionNewExpiryDate) {
          alert('Please enter a valid future expiry date.');
          setBatchActionLoading(false);
          return;
        }
        payload.new_expiry_date = actionNewExpiryDate;
        payload.new_manufacture_date = actionNewMfgDate || undefined;
      }
      const res = await executeBatchAction(selectedBatchForAction.batch_id, payload);
      if (res.success) {
        setSelectedBatchForAction(null);
        setBatchActionReason('');
        setActionNewExpiryDate('');
        setActionNewMfgDate('');
        await loadDashboardData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Error executing batch action protocol');
    } finally {
      setBatchActionLoading(false);
    }
  };

  const handleOpenEditUser = (user) => {
    setSelectedUserForEdit(user);
    setEditUserForm({
      full_name: user.full_name || '',
      email: user.email || '',
      role: user.role || 'PHARMACIST',
      password: '',
      is_active: user.is_active !== undefined ? user.is_active : true,
      permissions: user.permissions || {
        can_pos: true,
        can_manage_medicines: user.role === 'ADMIN',
        can_manage_batches: user.role === 'ADMIN',
        can_view_reports: user.role === 'ADMIN',
        can_manage_inquiries: user.role === 'ADMIN',
        can_view_audit: user.role === 'ADMIN',
        can_manage_users: user.role === 'ADMIN'
      }
    });
    setIsEditUserModalOpen(true);
  };

  const handleSaveUserPermissions = async (e) => {
    e.preventDefault();
    if (!selectedUserForEdit) return;
    try {
      const res = await updateUser(selectedUserForEdit.user_id, editUserForm);
      if (res.success) {
        setIsEditUserModalOpen(false);
        setSelectedUserForEdit(null);
        await loadDashboardData();
      } else {
        alert(res.message || 'Failed to update user details.');
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Error updating user privileges');
    }
  };

  const loadFilteredReports = async (startDate, endDate) => {
    try {
      setTimelineLoading(true);
      const params = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const [salesRes, dailyRes, bestRes, auditRes] = await Promise.allSettled([
        getSalesHistory(params),
        getDailySalesReport(params),
        getBestSellingReport(params),
        getAuditLogs(params)
      ]);

      if (salesRes.status === 'fulfilled' && salesRes.value?.success) setSalesHistory(salesRes.value.data || []);
      if (dailyRes.status === 'fulfilled' && dailyRes.value?.success) setDailySales(dailyRes.value.data || []);
      if (bestRes.status === 'fulfilled' && bestRes.value?.success) setBestSellers(bestRes.value.data || []);
      if (auditRes.status === 'fulfilled' && auditRes.value?.success) setAuditLogs(auditRes.value.data || []);
    } catch (err) {
      console.error('Error filtering reports:', err);
    } finally {
      setTimelineLoading(false);
    }
  };

  const handleTimelinePreset = (preset) => {
    setReportTimeline(preset);
    const today = new Date();
    let start = '';
    let end = today.toISOString().slice(0, 10);

    if (preset === 'today') {
      start = end;
    } else if (preset === '7days') {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      start = d.toISOString().slice(0, 10);
    } else if (preset === 'month') {
      const d = new Date(today.getFullYear(), today.getMonth(), 1);
      start = d.toISOString().slice(0, 10);
    } else if (preset === '30days') {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      start = d.toISOString().slice(0, 10);
    } else if (preset === 'all') {
      start = '';
      end = '';
    } else if (preset === 'custom') {
      return;
    }

    loadFilteredReports(start || undefined, end || undefined);
  };

  const formatAuditCaller = (performedBy) => {
    if (!performedBy) return 'System Automated Audit';
    const lower = String(performedBy).toLowerCase();
    if (lower.includes('trigger') || lower.includes('trg_')) {
      return 'System Automated Audit';
    }
    return performedBy;
  };

  const formatAuditRecord = (tableName, recordId) => {
    if (!tableName) return `#${recordId}`;
    const cleanName = String(tableName).toLowerCase().replace(/_/g, ' ');
    if (cleanName.includes('batch')) return `Batch Lot #${recordId}`;
    if (cleanName.includes('med')) return `Medicine #${recordId}`;
    if (cleanName.includes('sale') || cleanName.includes('invoice')) return `Invoice #${recordId}`;
    return `Record #${recordId}`;
  };

  const handleExportReportCSV = () => {
    let csvContent = '';
    let filename = '';
    const dateStr = new Date().toISOString().slice(0, 10);

    if (reportSubTab === 'sales') {
      filename = `MyPharmacist_Sales_Invoices_${dateStr}.csv`;
      const headers = ['Invoice Number', 'Date', 'Customer Name', 'Prescription Ref', 'Cashier', 'Items', 'Payment Method', 'Payment Status', 'Net Total (LKR)'];
      const rows = salesHistory.map(s => [
        `"${s.invoice_number || ''}"`,
        `"${new Date(s.sale_date).toLocaleString()}"`,
        `"${s.patient_name || 'Walk-in'}"`,
        `"${s.prescription_ref || 'OTC'}"`,
        `"${s.cashier_name || 'Staff'}"`,
        `"${(s.items_summary || '').replace(/"/g, '""')}"`,
        `"${s.payment_method || 'CASH'}"`,
        `"${s.payment_status || 'PAID'}"`,
        Number(s.total_amount || 0).toFixed(2)
      ]);
      csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    } else if (reportSubTab === 'bestsellers') {
      filename = `MyPharmacist_Top_Dispensed_Medicines_${dateStr}.csv`;
      const headers = ['Rank', 'Medicine Formulation', 'Generic Molecule', 'Category', 'Units Dispensed', 'Total Revenue (LKR)'];
      const rows = bestSellers.map((item, idx) => [
        idx + 1,
        `"${(item.medicine_name || item.name || '').replace(/"/g, '""')}"`,
        `"${(item.generic_name || '').replace(/"/g, '""')}"`,
        `"${(item.category_name || '').replace(/"/g, '""')}"`,
        item.total_units_sold || 0,
        Number(item.total_sales_amount || item.total_revenue || 0).toFixed(2)
      ]);
      csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    } else if (reportSubTab === 'valuation') {
      filename = `MyPharmacist_Inventory_Valuation_${dateStr}.csv`;
      const headers = ['Metric', 'Evaluated Value'];
      const rows = [
        ['Total Evaluated Formulations', valuation?.total_evaluated_formulations || medicines.length],
        ['Total Evaluated Batches', valuation?.total_evaluated_batches || batches.length],
        ['Total Physical Stock (Units)', valuation?.total_stock_units || 0],
        ['Total Wholesale Inventory Cost (LKR)', Number(valuation?.total_inventory_cost_value || 0).toFixed(2)],
        ['Total Retail Valuation Potential (LKR)', Number(valuation?.total_inventory_retail_value || 0).toFixed(2)],
        ['Estimated Potential Gross Profit (LKR)', Number(valuation?.potential_gross_profit || 0).toFixed(2)]
      ];
      csvContent = [headers.join(','), ...rows.map(r => `"${r[0]}",${r[1]}`)].join('\n');
    } else if (reportSubTab === 'audit') {
      filename = `MyPharmacist_Inventory_Audit_Trail_${dateStr}.csv`;
      const headers = ['Log ID', 'Operation', 'Batch Lot #', 'Prior State', 'Applied State', 'Authorized Staff / Source', 'Timestamp'];
      const rows = auditLogs.map(l => [
        l.log_id,
        l.operation,
        l.record_id,
        `"${(typeof l.old_value === 'string' ? l.old_value : JSON.stringify(l.old_value)).replace(/"/g, '""')}"`,
        `"${(typeof l.new_value === 'string' ? l.new_value : JSON.stringify(l.new_value)).replace(/"/g, '""')}"`,
        `"${formatAuditCaller(l.performed_by)}"`,
        `"${new Date(l.timestamp).toLocaleString()}"`
      ]);
      csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    }

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleToggleUserStatus = async (user) => {
    if (confirm(`Are you sure you want to ${user.is_active ? 'deactivate' : 'activate'} user '${user.username}'?`)) {
      try {
        const res = await toggleUserStatus(user.user_id, !user.is_active);
        if (res.success) {
          await loadDashboardData();
        }
      } catch (err) {
        alert(err.response?.data?.message || 'Error toggling user status');
      }
    }
  };


  const handleCreateMedicine = async (e) => {
    e.preventDefault();
    try {
      const res = await createMedicine({
        ...medForm,
        brand_id: parseInt(medForm.brand_id, 10),
        category_id: parseInt(medForm.category_id, 10),
        unit_price: parseFloat(medForm.unit_price) || 0,
        low_stock_threshold: parseInt(medForm.low_stock_threshold, 10) || 20,
        image_url: medForm.image_url ? medForm.image_url.trim() : null
      });
      if (res.success) {
        setIsNewMedModalOpen(false);
        setMedForm({
          name: '', generic_name: '', brand_id: '', category_id: '',
          dosage_form: 'Tablet', strength: '', description: '', unit_price: '',
          is_public_price: true, low_stock_threshold: 20, image_url: ''
        });
        await loadDashboardData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Error creating medicine formulation');
    }
  };

  const handleAutoGenerateBatchNumber = () => {
    let prefix = 'LOT';
    if (batchForm.medicine_id) {
      const selectedMed = medicines.find(m => String(m.medicine_id) === String(batchForm.medicine_id));
      if (selectedMed?.name) {
        const cleanName = selectedMed.name.trim();
        const words = cleanName.split(/[\s\-_]+/).filter(Boolean);
        if (words.length > 1) {
          prefix = words.map(w => w[0]).join('').replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase();
        } else {
          prefix = cleanName.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase();
        }
      }
    }
    if (!prefix || prefix.length < 2) prefix = 'LOT';

    let year = new Date().getFullYear();
    if (batchForm.manufacture_date) {
      const mfg = new Date(batchForm.manufacture_date);
      if (!isNaN(mfg.getTime())) {
        year = mfg.getFullYear();
      }
    }

    let generatedBatch = '';
    let attempts = 0;
    const existingNumbers = new Set(batches.map(b => (b.batch_number || '').trim().toUpperCase()));

    do {
      const randLetter = String.fromCharCode(65 + Math.floor(Math.random() * 26));
      const randDigits = Math.floor(1000 + Math.random() * 9000);
      generatedBatch = `${prefix}-${year}-${randLetter}${randDigits}`;
      attempts++;
    } while (existingNumbers.has(generatedBatch) && attempts < 50);

    setBatchForm(prev => ({ ...prev, batch_number: generatedBatch }));
  };

  const handleCreateBatch = async (e) => {
    e.preventDefault();
    try {
      const res = await createBatch({
        ...batchForm,
        medicine_id: parseInt(batchForm.medicine_id, 10),
        supplier_id: parseInt(batchForm.supplier_id, 10),
        quantity: parseInt(batchForm.quantity, 10),
        unit_cost: parseFloat(batchForm.unit_cost) || 0
      });
      if (res.success) {
        setIsNewBatchModalOpen(false);
        setBatchForm({
          medicine_id: '', supplier_id: '', batch_number: '',
          manufacture_date: '', expiry_date: '', quantity: '', unit_cost: ''
        });
        await loadDashboardData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Error registering inventory batch');
    }
  };

  const handleOpenAdjustModal = (batch) => {
    setSelectedBatchForAdjust(batch);
    setAdjustQty(batch.stock_quantity ?? 0);
    const isPast = batch.is_expired === 1 || Number(batch.days_to_expiry) <= 0 || new Date(batch.expiry_date) <= new Date();
    setAdjustReason(
      isPast 
        ? 'Physical stock and shelf-life schedule correction' 
        : 'Routine physical count adjustment'
    );
    const toDateInputStr = (val) => {
      if (!val) return '';
      try {
        const d = new Date(val);
        return isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
      } catch {
        return '';
      }
    };
    setAdjustMfgDate(toDateInputStr(batch.manufacture_date));
    setAdjustExpiryDate(toDateInputStr(batch.expiry_date));
    setAdjustStatus(batch.status || 'active');
  };

  const handleAdjustStock = async (e) => {
    e.preventDefault();
    if (!selectedBatchForAdjust) return;
    try {
      const res = await adjustBatchStock(selectedBatchForAdjust.batch_id, {
        new_quantity: parseInt(adjustQty, 10),
        expiry_date: adjustExpiryDate || undefined,
        manufacture_date: adjustMfgDate || undefined,
        status: adjustStatus || undefined,
        reason: adjustReason,
        movement_type: 'ADJUSTMENT'
      });
      if (res.success) {
        setSelectedBatchForAdjust(null);
        setAdjustQty('');
        setAdjustExpiryDate('');
        setAdjustMfgDate('');
        setAdjustReason('Routine counter stock update');
        await loadDashboardData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Error adjusting stock');
    }
  };

  // Selected medicine for POS
  const selectedDispenseMed = medicines.find(m => String(m.medicine_id) === String(dispenseMedId));
  const dosageForm = selectedDispenseMed?.dosage_form?.toLowerCase() || '';

  const isTabletOrCapsule = dosageForm.includes('tablet') || dosageForm.includes('capsule');
  const isLiquidOrSyrup = dosageForm.includes('syrup') || dosageForm.includes('suspension') || dosageForm.includes('drop') || dosageForm.includes('liquid');
  const isInjection = dosageForm.includes('inject') || dosageForm.includes('vial') || dosageForm.includes('ampoule');
  const isTopical = dosageForm.includes('cream') || dosageForm.includes('ointment') || dosageForm.includes('gel');
  const isInhaler = dosageForm.includes('inhal');

  // Compute calculated total dispensing units and packaging description
  let calculatedDispenseUnits = 1;
  let packagingDescription = '1 Unit';

  if (isTabletOrCapsule) {
    if (dispenseMode === 'card') {
      const numCards = Math.max(1, parseInt(cardCount, 10) || 1);
      const perCard = Math.max(1, parseInt(tabletsPerCard, 10) || 10);
      calculatedDispenseUnits = numCards * perCard;
      packagingDescription = `${numCards} Card${numCards > 1 ? 's' : ''} (${calculatedDispenseUnits} ${selectedDispenseMed?.dosage_form || 'Tablets'})`;
    } else if (dispenseMode === 'pack') {
      const numPacks = Math.max(1, parseInt(packCount, 10) || 1);
      const perPack = Math.max(1, parseInt(unitsPerPack, 10) || 30);
      calculatedDispenseUnits = numPacks * perPack;
      packagingDescription = `${numPacks} Pack${numPacks > 1 ? 's' : ''} (${calculatedDispenseUnits} Units)`;
    } else {
      const numLoose = Math.max(1, parseInt(looseCount, 10) || 1);
      calculatedDispenseUnits = numLoose;
      packagingDescription = `${numLoose} Loose ${selectedDispenseMed?.dosage_form || 'Tablet'}${numLoose > 1 ? 's' : ''}`;
    }
  } else if (isLiquidOrSyrup) {
    const numBottles = Math.max(1, parseInt(bottleCount, 10) || 1);
    calculatedDispenseUnits = numBottles;
    packagingDescription = `${numBottles} Bottle${numBottles > 1 ? 's' : ''}`;
  } else if (isInjection) {
    const numVials = Math.max(1, parseInt(vialCount, 10) || 1);
    calculatedDispenseUnits = numVials;
    packagingDescription = `${numVials} Vial${numVials > 1 ? 's' : ''} / Ampoule${numVials > 1 ? 's' : ''}`;
  } else if (isTopical) {
    const numTubes = Math.max(1, parseInt(tubeCount, 10) || 1);
    calculatedDispenseUnits = numTubes;
    packagingDescription = `${numTubes} Tube${numTubes > 1 ? 's' : ''}`;
  } else if (isInhaler) {
    const numInhalers = Math.max(1, parseInt(inhalerCount, 10) || 1);
    calculatedDispenseUnits = numInhalers;
    packagingDescription = `${numInhalers} Canister${numInhalers > 1 ? 's' : ''}`;
  } else {
    if (dispenseMode === 'pack') {
      const numPacks = Math.max(1, parseInt(packCount, 10) || 1);
      const perPack = Math.max(1, parseInt(unitsPerPack, 10) || 30);
      calculatedDispenseUnits = numPacks * perPack;
      packagingDescription = `${numPacks} Pack${numPacks > 1 ? 's' : ''} (${calculatedDispenseUnits} Units)`;
    } else {
      const numLoose = Math.max(1, parseInt(looseCount, 10) || 1);
      calculatedDispenseUnits = numLoose;
      packagingDescription = `${numLoose} Unit${numLoose > 1 ? 's' : ''}`;
    }
  }

  // Filtered medicines for POS Counter (Category, Search query, and Dosage Form)
  const filteredDispenseMedicines = medicines.filter(m => {
    const matchesCategory = !dispenseCategoryId || String(m.category_id) === String(dispenseCategoryId);
    const matchesSearch = !dispenseSearch || 
      m.name?.toLowerCase().includes(dispenseSearch.toLowerCase()) ||
      m.generic_name?.toLowerCase().includes(dispenseSearch.toLowerCase());

    let matchesForm = true;
    if (dispenseFormFilter !== 'all') {
      const f = (m.dosage_form || '').toLowerCase();
      if (dispenseFormFilter === 'tablet') matchesForm = f.includes('tablet') || f.includes('capsule');
      else if (dispenseFormFilter === 'syrup') matchesForm = f.includes('syrup') || f.includes('suspension') || f.includes('liquid') || f.includes('drop');
      else if (dispenseFormFilter === 'injection') matchesForm = f.includes('inject') || f.includes('vial') || f.includes('ampoule');
      else if (dispenseFormFilter === 'topical') matchesForm = f.includes('cream') || f.includes('ointment') || f.includes('gel');
      else if (dispenseFormFilter === 'inhaler') matchesForm = f.includes('inhal');
    }

    return matchesCategory && matchesSearch && matchesForm;
  });

  // e-POS Category Dynamic Icon Resolver
  const getCategoryIcon = (name = '') => {
    const n = (name || '').toLowerCase();
    if (n.includes('anti') || n.includes('infect')) return Pill;
    if (n.includes('pain') || n.includes('analgesic') || n.includes('inflam')) return Zap;
    if (n.includes('respir') || n.includes('cough') || n.includes('cold') || n.includes('lung')) return Activity;
    if (n.includes('cardio') || n.includes('heart') || n.includes('hyper')) return Activity;
    if (n.includes('gastro') || n.includes('stomach') || n.includes('digest')) return ShieldCheck;
    if (n.includes('derma') || n.includes('skin') || n.includes('topical')) return Sparkles;
    if (n.includes('vitamin') || n.includes('supplement') || n.includes('mineral')) return Sparkles;
    if (n.includes('diabet') || n.includes('endocr')) return Clock;
    if (n.includes('eye') || n.includes('ear') || n.includes('drop')) return Eye;
    return Layers;
  };

  // e-POS Dosage Form Icon Resolver
  const getDosageFormIcon = (form = '') => {
    const f = (form || '').toLowerCase();
    if (f.includes('tablet') || f.includes('capsule')) return Pill;
    if (f.includes('syrup') || f.includes('liquid') || f.includes('suspension') || f.includes('drop')) return Droplets;
    if (f.includes('inject') || f.includes('vial') || f.includes('ampoule')) return Activity;
    if (f.includes('cream') || f.includes('ointment') || f.includes('gel')) return Sparkles;
    if (f.includes('inhal')) return Activity;
    return Package;
  };

  // One-click Walk-in Customer Autofill for fast cashier checkout
  const handleQuickWalkIn = () => {
    setPatientName('Walk-in Customer');
    setPrescriptionRef('OTC-Walk-in');
  };

  // Full Reset POS register for next customer
  const handleResetPos = () => {
    setDispenseMedId('');
    setDispenseBatchId('');
    setPatientName('');
    setPrescriptionRef('');
    setCardCount(1);
    setLooseCount(1);
    setBottleCount(1);
    setVialCount(1);
    setTubeCount(1);
    setInhalerCount(1);
    setPackCount(1);
    setDispenseSuccess(null);
  };

  // Available batches for selected medicine in POS counter (strictly unexpired and active, sorted by FEFO)
  const availableBatchesForMed = batches
    .filter(b => 
      String(b.medicine_id) === String(dispenseMedId) && 
      b.stock_quantity > 0 && 
      b.status === 'active' && 
      (b.is_expired !== 1 && Number(b.days_to_expiry) > 0)
    )
    .sort((a, b) => new Date(a.expiry_date) - new Date(b.expiry_date));

  // Blocked batches detection for selected medicine (expired, quarantined, recalled)
  const blockedBatchesForMed = batches.filter(b => 
    String(b.medicine_id) === String(dispenseMedId) && 
    b.stock_quantity > 0 &&
    (b.is_expired === 1 || Number(b.days_to_expiry) <= 0 || b.status !== 'active')
  );

  const selectedDispenseBatch = batches.find(b => String(b.batch_id) === String(dispenseBatchId));
  const liveUnitPrice = Number(selectedDispenseBatch?.unit_price || selectedDispenseMed?.unit_price || 0);
  const liveTotalBill = liveUnitPrice * calculatedDispenseUnits;

  // Handler for category selection
  const handleSelectCategoryForDispense = (catId) => {
    setDispenseCategoryId(catId);
    if (catId && dispenseMedId) {
      const curMed = medicines.find(m => String(m.medicine_id) === String(dispenseMedId));
      if (curMed && String(curMed.category_id) !== String(catId)) {
        setDispenseMedId('');
        setDispenseBatchId('');
      }
    }
  };

  // Handler for medicine selection (auto-detects packaging mode and picks FEFO batch)
  const handleSelectMedicineForDispense = (medId) => {
    setDispenseMedId(medId);
    if (!medId) {
      setDispenseBatchId('');
      return;
    }
    const med = medicines.find(m => String(m.medicine_id) === String(medId));
    const form = med?.dosage_form?.toLowerCase() || '';
    if (form.includes('tablet') || form.includes('capsule')) {
      setDispenseMode('card');
    } else if (form.includes('syrup') || form.includes('suspension') || form.includes('drop') || form.includes('liquid')) {
      setDispenseMode('bottle');
    } else if (form.includes('inject') || form.includes('vial') || form.includes('ampoule')) {
      setDispenseMode('vial');
    } else if (form.includes('cream') || form.includes('ointment') || form.includes('gel')) {
      setDispenseMode('tube');
    } else if (form.includes('inhal')) {
      setDispenseMode('inhaler');
    } else {
      setDispenseMode('loose');
    }

    // Auto-select FEFO lot (strictly unexpired and active batch)
    const validBatches = batches
      .filter(b => 
        String(b.medicine_id) === String(medId) && 
        b.stock_quantity > 0 && 
        b.status === 'active' && 
        (b.is_expired !== 1 && Number(b.days_to_expiry) > 0)
      )
      .sort((a, b) => new Date(a.expiry_date) - new Date(b.expiry_date));
    if (validBatches.length > 0) {
      setDispenseBatchId(String(validBatches[0].batch_id));
    } else {
      setDispenseBatchId('');
    }
  };

  // Dedicated receipt printer: opens a clean compact slip window (80mm POS style) to print ONLY the receipt
  const handlePrintReceiptSlip = (data) => {
    const medName = data?.medicineName || selectedDispenseMed?.name || 'Prescription Drug';
    const generic = data?.genericName || selectedDispenseMed?.generic_name || '';
    const dosage = data?.dosageForm || selectedDispenseMed?.dosage_form || '';
    const strength = selectedDispenseMed?.strength || '';
    const lot = data?.batchNumber || selectedDispenseBatch?.batch_number || 'N/A';
    const pkg = data?.packagingSummary || packagingDescription || '1 Unit';
    const units = data?.quantity || calculatedDispenseUnits || 1;
    const rate = Number(data?.unitPrice || liveUnitPrice || 0).toFixed(2);
    const total = Number(data?.totalBill || liveTotalBill || 0).toFixed(2);
    const patient = data?.patientName || patientName || 'Walk-in Customer';
    const rx = data?.prescriptionRef || prescriptionRef || 'OTC-Walk-in';
    const dateStr = data?.date || new Date().toLocaleString();
    const pharmacist = staffUser?.fullName || 'Licensed Pharmacist';

    const w = 440;
    const h = 680;
    const left = Math.max(0, (window.screen.width - w) / 2);
    const top = Math.max(0, (window.screen.height - h) / 2);
    const printWindow = window.open(
      '',
      '_blank',
      `width=${w},height=${h},top=${top},left=${left},scrollbars=no,status=no,toolbar=no,menubar=no`
    );

    if (!printWindow) {
      window.print();
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Dispensary Receipt - ${medName}</title>
          <style>
            @page {
              size: 80mm auto;
              margin: 4mm;
            }
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
              color: #0f172a;
              background: #ffffff;
              padding: 16px;
              width: 100%;
              max-width: 380px;
              margin: 0 auto;
              font-size: 14px;
              line-height: 1.5;
            }
            .receipt-card {
              border: 1.5px solid #0f172a;
              border-radius: 8px;
              padding: 14px;
            }
            .text-center { text-align: center; }
            .pharmacy-title {
              font-size: 18px;
              font-weight: 900;
              color: #047857;
              letter-spacing: 0.5px;
            }
            .sub-info {
              font-size: 12px;
              color: #334155;
              font-weight: 600;
              margin-top: 2px;
            }
            .status-badge {
              display: inline-block;
              background: #dcfce7;
              color: #166534;
              border: 1.5px solid #16a34a;
              font-size: 12px;
              font-weight: 800;
              padding: 3px 12px;
              border-radius: 999px;
              margin-top: 8px;
              letter-spacing: 0.5px;
            }
            .dashed-line {
              border-top: 1.5px dashed #64748b;
              margin: 12px 0;
            }
            .solid-line {
              border-top: 2.5px solid #0f172a;
              margin: 12px 0;
            }
            .row {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              margin-bottom: 6px;
            }
            .row-label {
              color: #475569;
              font-weight: 700;
              font-size: 13px;
            }
            .row-val {
              color: #0f172a;
              font-weight: 800;
              text-align: right;
              font-size: 13.5px;
              max-width: 65%;
            }
            .row-val-highlight {
              color: #047857;
              font-weight: 900;
              font-size: 14.5px;
            }
            .total-row {
              display: flex;
              justify-content: space-between;
              align-items: center;
              font-size: 18px;
              font-weight: 900;
              color: #0f172a;
              padding-top: 4px;
            }
            .total-amount {
              color: #047857;
              font-size: 22px;
              font-family: monospace;
              font-weight: 900;
            }
            .footer-note {
              margin-top: 12px;
              text-align: center;
              font-size: 12px;
              color: #334155;
              border-top: 1px dashed #94a3b8;
              padding-top: 8px;
            }
            .no-print-bar {
              margin-top: 14px;
              text-align: center;
            }
            .btn-print {
              background: #0d9488;
              color: #ffffff;
              border: none;
              padding: 10px 22px;
              font-size: 14px;
              font-weight: 800;
              border-radius: 8px;
              cursor: pointer;
            }
            @media print {
              .no-print-bar { display: none !important; }
              body { padding: 0 !important; max-width: 100% !important; }
              .receipt-card { border: none !important; padding: 2px !important; }
            }
          </style>
        </head>
        <body>
          <div class="receipt-card">
            <div class="text-center">
              <div class="pharmacy-title">MY PHARMACIST DISPENSARY</div>
              <div class="sub-info">124 Galle Road, Bambalapitiya</div>
              <div class="sub-info">Tel: +94 11 234 5678 • Reg #PH-8942</div>
              <div class="sub-info">${dateStr}</div>
              <div class="status-badge">✓ PAID & DISPENSED</div>
            </div>

            <div class="dashed-line"></div>

            <div class="row">
              <span class="row-label">Invoice #:</span>
              <span class="row-val" style="font-family: monospace; font-weight: 800; color: #047857;">${data?.invoiceNumber || 'INV-COUNTER'}</span>
            </div>
            <div class="row">
              <span class="row-label">Patient Name:</span>
              <span class="row-val">${patient}</span>
            </div>
            <div class="row">
              <span class="row-label">Doctor Rx Ref:</span>
              <span class="row-val">${rx}</span>
            </div>
            <div class="row">
              <span class="row-label">Medication:</span>
              <span class="row-val row-val-highlight">${medName}</span>
            </div>
            ${generic ? `
            <div class="row">
              <span class="row-label">Generic:</span>
              <span class="row-val" style="font-size: 12px; color: #475569;">${generic}</span>
            </div>` : ''}
            <div class="row">
              <span class="row-label">Dosage & Strength:</span>
              <span class="row-val">${dosage} ${strength ? `(${strength})` : ''}</span>
            </div>
            <div class="row">
              <span class="row-label">Lot / Batch #:</span>
              <span class="row-val" style="font-family: monospace; color: #0f766e;">${lot}</span>
            </div>
            <div class="row">
              <span class="row-label">Packaging:</span>
              <span class="row-val row-val-highlight">${pkg}</span>
            </div>
            <div class="row">
              <span class="row-label">Units Deducted:</span>
              <span class="row-val">${units} units</span>
            </div>
            <div class="row">
              <span class="row-label">Unit Rate:</span>
              <span class="row-val">Rs. ${rate}</span>
            </div>
            <div class="row">
              <span class="row-label">Payment Mode:</span>
              <span class="row-val" style="font-weight: 800; color: ${data?.paymentMethod === 'CARD' ? '#0284c7' : '#059669'};">${data?.paymentMethod || 'CASH'}</span>
            </div>

            <div class="solid-line"></div>

            <div class="total-row">
              <span>TOTAL PAID:</span>
              <span class="total-amount">Rs. ${total}</span>
            </div>

            <div class="footer-note">
              <div>Dispensed by Pharmacist: <strong>${pharmacist}</strong></div>
              <div style="margin-top: 4px; font-size: 11px; color: #64748b;">Official Dispensary Receipt • Retain for Medical Records</div>
            </div>
          </div>

          <div class="no-print-bar">
            <button class="btn-print" onclick="window.print()">Print Receipt Slip</button>
          </div>

          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 300);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  // Quick Dispense Handler
  const handleQuickDispense = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const batch = batches.find(b => String(b.batch_id) === String(dispenseBatchId));
    if (!batch) {
      alert('Please select an active batch to dispense from in Step 3.');
      return;
    }

    if (calculatedDispenseUnits > batch.stock_quantity) {
      alert(`Insufficient stock. Current lot stock is ${batch.stock_quantity} units, but requested dispensation is ${calculatedDispenseUnits} units (${packagingDescription}).`);
      return;
    }

    try {
      setDispenseLoading(true);
      const med = medicines.find(m => String(m.medicine_id) === String(batch.medicine_id));
      const price = Number(batch.unit_price || med?.unit_price || 0);
      const totalBill = price * calculatedDispenseUnits;

      const res = await createSale({
        patient_name: patientName.trim() || 'Walk-in Customer',
        prescription_ref: prescriptionRef.trim() || 'OTC',
        medicine_id: batch.medicine_id,
        batch_id: batch.batch_id,
        quantity: calculatedDispenseUnits,
        unit_price: price,
        packaging_desc: packagingDescription,
        payment_method: dispensePaymentMethod || 'CASH',
        amount_paid: totalBill
      });

      const invoiceNo = res?.data?.invoice_number || 'INV-COUNTER';

      if (res && res.success) {
        const receiptData = {
          invoiceNumber: invoiceNo,
          medicineName: batch.medicine_name,
          genericName: med?.generic_name,
          dosageForm: med?.dosage_form,
          batchNumber: batch.batch_number,
          quantity: calculatedDispenseUnits,
          packagingSummary: packagingDescription,
          unitPrice: price,
          totalBill: totalBill,
          patientName: patientName || 'Walk-in Customer',
          prescriptionRef: prescriptionRef || 'OTC-Walk-in',
          paymentMethod: dispensePaymentMethod || 'CASH',
          date: new Date().toLocaleString()
        };

        // 1. Pass the finalized bill voucher to the print panel
        setDispenseSuccess(receiptData);

        // 2. Completely refresh and clear the form so it is instantly ready for the next bill
        setDispenseCategoryId('');
        setDispenseMedId('');
        setDispenseBatchId('');
        setDispenseSearch('');
        setPatientName('');
        setPrescriptionRef('');
        setDispensePaymentMethod('CASH');
        setCardCount(1);
        setTabletsPerCard(10);
        setLooseCount(1);
        setPackCount(1);
        setUnitsPerPack(30);
        setBottleCount(1);
        setVialCount(1);
        setTubeCount(1);
        setInhalerCount(1);

        // 3. Automatically pop up the compact 80mm print slip for immediate printing
        try {
          handlePrintReceiptSlip(receiptData);
        } catch (printErr) {
          console.warn('Auto-print slip dialog could not be opened automatically:', printErr);
        }

        // 4. Reload live inventory stock and notify all reporting views
        await loadDashboardData();
        if (typeof handleTimelinePreset === 'function') {
          handleTimelinePreset(reportTimeline || 'all');
        }
        window.dispatchEvent(new CustomEvent('pharmacy_sales_change'));
      } else {
        alert(res?.message || 'Dispensation failed.');
      }
    } catch (err) {
      console.error('Dispense error:', err);
      alert(err.response?.data?.message || err.message || 'Dispensation failed.');
    } finally {
      setDispenseLoading(false);
    }
  };

  // Filtered lists for tabs
  const filteredMeds = medicines.filter(m => {
    const matchesSearch = 
      m.name?.toLowerCase().includes(medSearch.toLowerCase()) ||
      m.generic_name?.toLowerCase().includes(medSearch.toLowerCase()) ||
      m.brand_name?.toLowerCase().includes(medSearch.toLowerCase());
    if (!matchesSearch) return false;

    if (medOfferFilter === 'offers') {
      return Boolean(m.is_offer) && Number(m.discount_percent) > 0;
    }
    if (medOfferFilter === 'regular') {
      return !m.is_offer || Number(m.discount_percent) <= 0;
    }
    return true;
  });

  // Batch inventory calculations for Expiry, Quarantine & Action protocols
  const isBatchExpired = (b) => (b.is_expired === 1 || Number(b.days_to_expiry) <= 0 || (b.expiry_date && new Date(b.expiry_date) <= new Date()));
  const isBatchCritical = (b) => !isBatchExpired(b) && Number(b.days_to_expiry) <= 30 && Number(b.stock_quantity) > 0;
  const isBatchExpiringSoon = (b) => !isBatchExpired(b) && Number(b.days_to_expiry) <= 90 && Number(b.stock_quantity) > 0;
  const isBatchQuarantined = (b) => b.status === 'quarantined';
  const isBatchDepleted = (b) => Number(b.stock_quantity) === 0 || b.status === 'depleted';
  const isBatchSafeActive = (b) => b.status === 'active' && !isBatchExpired(b) && Number(b.days_to_expiry) > 90 && Number(b.stock_quantity) > 0;

  const expiredBatchesCount = batches.filter(b => isBatchExpired(b)).length;
  const expiredWithStockCount = batches.filter(b => isBatchExpired(b) && Number(b.stock_quantity) > 0).length;
  const criticalBatchesCount = batches.filter(b => isBatchCritical(b)).length;
  const expiringSoonCount = batches.filter(b => isBatchExpiringSoon(b)).length;
  const quarantinedBatchesCount = batches.filter(b => isBatchQuarantined(b)).length;
  const depletedBatchesCount = batches.filter(b => isBatchDepleted(b)).length;
  const activeSaleableBatchesCount = batches.filter(b => isBatchSafeActive(b)).length;

  // Total Alert Count for Sidebar:
  // Flags batches requiring attention: expired with stock (emergency) OR expiring within 90 days with stock (FEFO priority)
  const totalExpiryAlertCount = expiredWithStockCount > 0 ? (expiredWithStockCount + expiringSoonCount) : expiringSoonCount;

  const filteredBatches = batches.filter(b => {
    // Search match across lot #, medicine name, generic name, supplier name
    const q = batchSearch.toLowerCase().trim();
    const matchesSearch = !q ||
      b.batch_number?.toLowerCase().includes(q) ||
      b.medicine_name?.toLowerCase().includes(q) ||
      b.generic_name?.toLowerCase().includes(q) ||
      b.supplier_name?.toLowerCase().includes(q);
    if (!matchesSearch) return false;

    // Filter type match
    if (batchFilter === 'expired') {
      return isBatchExpired(b);
    }
    if (batchFilter === 'critical') {
      return isBatchCritical(b);
    }
    if (batchFilter === 'expiring_soon') {
      return isBatchExpiringSoon(b);
    }
    if (batchFilter === 'quarantined') {
      return isBatchQuarantined(b);
    }
    if (batchFilter === 'depleted') {
      return isBatchDepleted(b);
    }
    if (batchFilter === 'active') {
      return isBatchSafeActive(b);
    }
    return true; // 'all'
  });

  // Calculations for Reference 1 Dashboard Visualizations
  const totalMeds = medicines.length || stats?.total_medicines || 1;
  const lowStockCount = stats?.low_stock_medicines ?? lowStockList.length;
  const outOfStockCount = stats?.out_of_stock_medicines ?? medicines.filter(m => Number(m.total_saleable_stock) === 0).length;
  const healthyStockCount = Math.max(0, totalMeds - lowStockCount - outOfStockCount);
  const healthyPercent = Math.round((healthyStockCount / totalMeds) * 100);
  const lowPercent = Math.round((lowStockCount / totalMeds) * 100);
  const outPercent = Math.round((outOfStockCount / totalMeds) * 100);

  const categoryDistribution = categories.map(cat => {
    const count = medicines.filter(m => m.category_id === cat.category_id).length;
    const percent = medicines.length > 0 ? Math.round((count / medicines.length) * 100) : 0;
    return { ...cat, count, percent };
  }).sort((a, b) => b.count - a.count);

  const renderAuditState = (val) => {
    if (!val) return <span className="text-slate-400 italic">None</span>;
    let parsed = val;
    if (typeof val === 'string') {
      try {
        parsed = JSON.parse(val);
      } catch {
        return <span className="font-mono text-[11px]">{val}</span>;
      }
    }
    if (typeof parsed === 'object' && parsed !== null) {
      return (
        <div className="flex flex-wrap gap-1.5 items-center font-mono text-[11px]">
          {parsed.stock_quantity !== undefined && (
            <span className={`px-2 py-0.5 rounded font-bold ${
              isDark ? 'bg-slate-800 text-teal-300 border border-slate-700' : 'bg-teal-50 text-teal-800 border border-teal-200'
            }`}>
              Stock: {parsed.stock_quantity}
            </span>
          )}
          {parsed.reserved_quantity !== undefined && parsed.reserved_quantity > 0 && (
            <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 font-bold">
              Res: {parsed.reserved_quantity}
            </span>
          )}
          {parsed.status && (
            <span className={`px-2 py-0.5 rounded font-bold uppercase text-[10px] ${
              parsed.status === 'active' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' :
              parsed.status === 'depleted' ? 'bg-slate-700/50 text-slate-400 border border-slate-600' :
              'bg-rose-500/10 text-rose-500 border border-rose-500/20'
            }`}>
              {parsed.status}
            </span>
          )}
          {Object.entries(parsed).map(([k, v]) => {
            if (['stock_quantity', 'reserved_quantity', 'status'].includes(k)) return null;
            return (
              <span key={k} className="text-[10px] text-slate-400">
                {k}: {String(v)}
              </span>
            );
          })}
        </div>
      );
    }
    return <span className="font-mono text-[11px]">{String(val)}</span>;
  };

  const isAdmin = staffUser?.role === 'ADMIN';
  const userPerms = staffUser?.permissions || {
    can_pos: !isAdmin,
    can_manage_medicines: isAdmin,
    can_manage_batches: isAdmin,
    can_view_reports: isAdmin,
    can_view_audit: isAdmin,
    can_manage_users: isAdmin,
    can_manage_inquiries: isAdmin
  };

  const canEditInquiries = isAdmin || Boolean(userPerms.can_manage_inquiries);

  const newInquiriesCount = inquiries.filter(i => i.status === 'NEW').length;

  // Navigation Tabs: Both Admins and Pharmacists have access to the e-POS Counter
  const navTabs = isAdmin ? [
    { id: 'overview', label: 'Executive Overview', icon: Layers, badge: null, show: true },
    { id: 'prescriptions', label: 'Prescription Orders', icon: FileCheck, badge: pendingRxCount > 0 ? `${pendingRxCount} New` : null, badgeColor: 'amber', show: true },
    { id: 'inquiries', label: `Customer Inquiries (${inquiries.length})`, icon: MessageSquare, badge: newInquiriesCount > 0 ? `${newInquiriesCount} New` : null, badgeColor: 'amber', show: true },
    { id: 'pos', label: 'e-POS Counter', icon: ShoppingCart, badge: 'Live', show: true },
    { id: 'medicines', label: `Formulary Master (${medicines.length})`, icon: Package, badge: null, show: true },
    { id: 'batches', label: `Batch & Stock (${batches.length})`, icon: Clock, badge: totalExpiryAlertCount > 0 ? `${totalExpiryAlertCount}` : null, badgeColor: expiredWithStockCount > 0 ? 'rose' : 'amber', show: true },
    { id: 'reports', label: 'Reports & Analytics', icon: BarChart3, badge: null, show: true },
    { id: 'users', label: `User Management (${staffUsers.length + customers.length})`, icon: ShieldCheck, badge: 'Admin', show: true }
  ] : [
    { id: 'overview', label: 'Dispensary Overview', icon: Activity, badge: null, show: true },
    { id: 'prescriptions', label: 'Prescription Orders', icon: FileCheck, badge: pendingRxCount > 0 ? `${pendingRxCount} New` : null, badgeColor: 'amber', show: true },
    { id: 'inquiries', label: `Customer Inquiries (${inquiries.length})`, icon: MessageSquare, badge: newInquiriesCount > 0 ? `${newInquiriesCount} New` : null, badgeColor: 'amber', show: true },
    { id: 'pos', label: 'e-POS Counter', icon: ShoppingCart, badge: 'Live', show: userPerms.can_pos },
    { id: 'medicines', label: `Medicine Master (${medicines.length})`, icon: Package, badge: null, show: userPerms.can_manage_medicines },
    { id: 'batches', label: `Batch & Expiry (${batches.length})`, icon: Clock, badge: totalExpiryAlertCount > 0 ? `${totalExpiryAlertCount}` : null, badgeColor: expiredWithStockCount > 0 ? 'rose' : 'amber', show: userPerms.can_manage_batches },
    { id: 'reports', label: 'Dispensary Reports', icon: BarChart3, badge: null, show: userPerms.can_view_reports !== false }
  ];

  return (
    <div className={`min-h-screen flex transition-colors duration-200 ${
      isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50/70 text-slate-900'
    }`}>
      
      {/* ======================================================== */}
      {/* 1. DESKTOP COLLAPSIBLE SIDEBAR */}
      {/* ======================================================== */}
      <aside className={`hidden lg:flex border-r shrink-0 transition-all duration-300 z-30 flex-col justify-between ${
        isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/90 shadow-xs'
      } ${sidebarCollapsed ? 'w-20' : 'w-64'}`}>
        
        {/* Sidebar Header & Brand */}
        <div>
          <div className="h-20 flex items-center justify-between px-4 border-b border-slate-100 dark:border-slate-800/80">
            <div className={`flex items-center gap-3 overflow-hidden ${sidebarCollapsed ? 'justify-center w-full' : ''}`}>
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-md ${
                isAdmin 
                  ? 'bg-gradient-to-tr from-indigo-700 to-indigo-500 text-white' 
                  : 'bg-gradient-to-tr from-teal-700 to-teal-500 text-white'
              }`}>
                {isAdmin ? <ShieldCheck className="w-5 h-5 stroke-[2.2]" /> : <Pill className="w-5 h-5 stroke-[2.2]" />}
              </div>
              {!sidebarCollapsed && (
                <div className="min-w-0">
                  <h2 className="text-sm font-black tracking-tight text-slate-900 dark:text-white truncate">
                    My Pharmacist
                  </h2>
                  <span className={`text-[10px] font-bold uppercase tracking-wider block ${
                    isAdmin ? 'text-indigo-500' : 'text-teal-600 dark:text-teal-400'
                  }`}>
                    {isAdmin ? 'Executive Portal' : 'Dispensary Counter'}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar Nav Items */}
          <nav className="p-3 space-y-1 text-xs font-bold">
            {navTabs.filter(t => t.show).map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  id={`tab-btn-${tab.id}`}
                  onClick={() => setActiveTab(tab.id)}
                  title={sidebarCollapsed ? tab.label : undefined}
                  className={`w-full px-3 py-3 rounded-xl flex items-center gap-3 transition-all cursor-pointer ${
                    isActive
                      ? isAdmin
                        ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                        : 'bg-teal-700 text-white shadow-sm'
                      : isDark
                        ? 'text-slate-400 hover:text-white hover:bg-slate-800/70'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  } ${sidebarCollapsed ? 'justify-center px-0' : ''}`}
                >
                  <Icon className="w-4 h-4 shrink-0 stroke-[2.2]" />
                  {!sidebarCollapsed && (
                    <div className="flex-1 flex items-center justify-between text-left truncate">
                      <span className="truncate">{tab.label}</span>
                      {tab.badge && (
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                          tab.badgeColor === 'rose'
                            ? 'bg-rose-500 text-white'
                            : tab.badgeColor === 'amber'
                              ? 'bg-amber-400 text-slate-950 font-black animate-pulse'
                              : isAdmin
                                ? 'bg-indigo-500/20 text-indigo-300'
                                : 'bg-teal-500/20 text-teal-300'
                        }`}>
                          {tab.badge}
                        </span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer: Pharmacist User Profile Card & Collapse Toggle */}
        <div className="p-3 border-t border-slate-100 dark:border-slate-800/80 space-y-2">
          
          {/* Pharmacist Profile */}
          <div className={`p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 flex items-center gap-2.5 ${
            sidebarCollapsed ? 'justify-center' : ''
          }`}>
            <div className="w-8 h-8 rounded-lg bg-teal-600/10 text-teal-600 flex items-center justify-center font-black text-xs shrink-0">
              {staffUser?.fullName ? staffUser.fullName[0].toUpperCase() : 'P'}
            </div>
            {!sidebarCollapsed && (
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                  {staffUser?.fullName || 'Pharmacist'}
                </p>
                <p className="text-[10px] text-slate-400 capitalize">
                  {staffUser?.role || 'Staff'} Mode
                </p>
              </div>
            )}
          </div>

          {/* Toggle Sidebar Collapse Button */}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="w-full py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center gap-2 transition-colors cursor-pointer"
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? (
              <PanelLeftOpen className="w-4 h-4" />
            ) : (
              <>
                <PanelLeftClose className="w-4 h-4" />
                <span>Collapse Sidebar</span>
              </>
            )}
          </button>
        </div>
      </aside>

      {/* ======================================================== */}
      {/* 2. MOBILE RESPONSIVE SIDEBAR DRAWER (When opened on mobile) */}
      {/* ======================================================== */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop overlay */}
          <div 
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <aside className="fixed inset-y-0 left-0 w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 z-50 flex flex-col justify-between shadow-2xl animate-in slide-in-from-left duration-200">
            <div>
              <div className="h-16 flex items-center justify-between px-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                    isAdmin ? 'bg-indigo-600 text-white' : 'bg-teal-600 text-white'
                  }`}>
                    {isAdmin ? <ShieldCheck className="w-4 h-4 stroke-[2.2]" /> : <Pill className="w-4 h-4 stroke-[2.2]" />}
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-slate-900 dark:text-white">My Pharmacist</h3>
                    <span className={`text-[10px] font-bold uppercase ${isAdmin ? 'text-indigo-500' : 'text-teal-600'}`}>
                      {isAdmin ? 'Executive Portal' : 'Dispensary Portal'}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setMobileSidebarOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="p-3 space-y-1 text-xs font-bold">
                {navTabs.filter(t => t.show).map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;

                  return (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setActiveTab(tab.id);
                        setMobileSidebarOpen(false);
                      }}
                      className={`w-full px-3 py-2.5 rounded-xl flex items-center justify-between text-left transition-all ${
                        isActive
                          ? isAdmin ? 'bg-indigo-600 text-white shadow-xs' : 'bg-teal-700 text-white shadow-xs'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className="w-4 h-4 stroke-[2.2]" />
                        <span>{tab.label}</span>
                      </div>
                      {tab.badge && (
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                          tab.badgeColor === 'rose'
                            ? 'bg-rose-500 text-white'
                            : tab.badgeColor === 'amber'
                              ? 'bg-amber-400 text-slate-950 font-black animate-pulse'
                              : isAdmin ? 'bg-indigo-500/20 text-indigo-300' : 'bg-teal-500/20 text-teal-300'
                        }`}>
                          {tab.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>

            <div className="p-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-xs">
                <span className="text-[10px] text-slate-400 block font-bold uppercase">
                  {isAdmin ? 'System Administrator' : 'Active Pharmacist'}
                </span>
                <span className="font-bold text-slate-800 dark:text-white truncate block">{staffUser?.fullName}</span>
              </div>
              <button
                onClick={() => {
                  setMobileSidebarOpen(false);
                  onLogout();
                }}
                className="w-full py-2.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. MAIN DASHBOARD CONTENT AREA */}
      {/* ======================================================== */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        
        {/* Top Header Bar */}
        <header className={`h-20 border-b px-4 sm:px-6 flex items-center justify-between gap-3 sticky top-0 z-20 backdrop-blur-md ${
          isDark ? 'bg-slate-950/85 border-slate-800' : 'bg-white/90 border-slate-200/80 shadow-xs'
        }`}>
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 shrink-0"
              title="Open Navigation Menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="min-w-0">
              <span className={`text-[10px] font-bold uppercase tracking-wider block truncate ${
                isAdmin ? 'text-indigo-500' : 'text-teal-600'
              }`}>
                {isAdmin ? 'System Administration & Governance' : 'Clinical Dispensary Station'}
              </span>
              <h1 className="text-sm sm:text-base lg:text-lg font-black text-slate-900 dark:text-white truncate">
                {isAdmin ? (
                  activeTab === 'overview' ? 'Executive Management & Financial Command' :
                  activeTab === 'prescriptions' ? 'Prescription Order Supervision & Validation' :
                  activeTab === 'inquiries' ? 'Customer Inquiries & Patient Consultations' :
                  activeTab === 'medicines' ? 'Formulary Master & Catalog Governance' :
                  activeTab === 'batches' ? 'Batch Stock & Supplier Supply Chain' :
                  activeTab === 'reports' ? 'Operational Reports & Financial Analytics' :
                  activeTab === 'users' ? 'Staff User Accounts & Access Control' : 'Executive Portal'
                ) : (
                  activeTab === 'overview' ? 'Dispensary Station & Prescription Queue' :
                  activeTab === 'prescriptions' ? 'Prescription Order Supervision & Counter Pickup Queue' :
                  activeTab === 'inquiries' ? 'Customer Inquiries & Patient Consultation Portal' :
                  activeTab === 'pos' ? 'Prescription POS Counter & Bill Generator' :
                  activeTab === 'medicines' ? 'Medicine Formulary Reference' :
                  activeTab === 'batches' ? 'Batch Expiry & Lot Shelf Control' :
                  activeTab === 'reports' ? 'Dispensary Sales Reports' : 'Dispensary Counter'
                )}
              </h1>
            </div>
          </div>

          {/* Top Bar Quick Action Buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Dedicated button to browse public website */}
            <button
              onClick={onBrowseWebsite}
              className={`px-2.5 sm:px-3.5 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer shadow-xs ${
                isAdmin
                  ? 'border-indigo-300 dark:border-indigo-700 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-200'
                  : 'border-teal-300 dark:border-teal-700 bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/60 text-teal-800 dark:text-teal-200'
              }`}
              title="Browse public customer storefront"
            >
              <Globe className={`w-4 h-4 shrink-0 ${isAdmin ? 'text-indigo-600' : 'text-teal-600'}`} />
              <span className="font-bold">Browse Website</span>
            </button>

            <button
              onClick={loadDashboardData}
              className="p-2 sm:px-3 sm:py-2 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
              title="Refresh all metrics from database"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden md:inline">Sync</span>
            </button>

            {/* Role-Specific Action Buttons */}
            {isAdmin ? (
              <>
                <button
                  onClick={() => setActiveTab('reports')}
                  className={`px-2.5 sm:px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                    activeTab === 'reports'
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                      : isDark
                      ? 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                  title="Open Operational Reports & Analytics"
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Analytics</span>
                </button>

                <button
                  onClick={() => setActiveTab('users')}
                  className={`px-2.5 sm:px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                    activeTab === 'users'
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                      : isDark
                      ? 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                  title="Manage Staff User Accounts"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Staff ({staffUsers.length})</span>
                </button>

                <button
                  onClick={() => setIsNewUserModalOpen(true)}
                  className="px-2.5 sm:px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-indigo-600/20"
                  title="Add New Staff Account"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span className="hidden xl:inline">Add Staff</span>
                </button>

                <button
                  onClick={() => setActiveTab('inquiries')}
                  className={`px-2.5 sm:px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                    activeTab === 'inquiries'
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                      : isDark
                      ? 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                  title="View Customer Inquiries & Messages"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Inquiries</span>
                  {newInquiriesCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-amber-400 text-slate-950 animate-pulse">
                      {newInquiriesCount}
                    </span>
                  )}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setActiveTab('inquiries')}
                  className={`px-2.5 sm:px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                    activeTab === 'inquiries'
                      ? 'bg-teal-700 text-white border-teal-700 shadow-sm'
                      : isDark
                      ? 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                  title="View Customer Inquiries & Messages"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Inquiries</span>
                  {newInquiriesCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-amber-400 text-slate-950 animate-pulse">
                      {newInquiriesCount}
                    </span>
                  )}
                </button>

                {userPerms.can_pos && (
                  <button
                    onClick={() => setActiveTab('pos')}
                    className={`px-2.5 sm:px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer ${
                      activeTab === 'pos'
                        ? 'bg-teal-800 text-white'
                        : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-600/20 shadow-md'
                    }`}
                    title="Open Prescription POS Counter"
                  >
                    <ShoppingCart className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">POS Counter</span>
                  </button>
                )}
              </>
            )}

            {/* Dedicated Top Navigation Sign Out Button */}
            <button
              onClick={onLogout}
              className="px-3 sm:px-3.5 py-2 rounded-xl text-xs font-bold border border-rose-200 dark:border-rose-900/60 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs shrink-0"
              title="Sign out of dispensary session"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
              <span className="font-bold">Sign Out</span>
            </button>
          </div>
        </header>

        {/* Dashboard Content Container */}
        <div className="p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8 flex-1">
          
          {/* TAB 1: OVERVIEW METRICS & DATA VISUALIZATION */}
          {activeTab === 'overview' && (
            isAdmin ? (
              /* ======================================================== */
              /* A. ADMIN EXECUTIVE MANAGEMENT & FINANCIAL COMMAND CENTER */
              /* ======================================================== */
              <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-150">
                {/* Executive Hero Banner */}
                <div className={`p-6 sm:p-8 rounded-3xl border relative overflow-hidden ${
                  isDark 
                    ? 'bg-gradient-to-r from-slate-900 via-indigo-950/60 to-slate-900 border-indigo-500/20' 
                    : 'bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white border-slate-800 shadow-lg'
                }`}>
                  <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-2 max-w-2xl">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-mono uppercase tracking-wider font-extrabold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1.5">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          Executive Administration & Oversight
                        </span>
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-mono uppercase tracking-wider font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          Data Integrity Active
                        </span>
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-mono uppercase tracking-wider font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          Audit Trail Active
                        </span>
                      </div>

                      <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                        Welcome, Administrator {staffUser?.fullName || 'System Admin'}
                      </h2>
                      <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                        You have full enterprise authority over retail valuation, financial analytics, formulary governance, and staff access privileges. Prescription POS counter dispensing is segregated to working dispensary pharmacists.
                      </p>
                    </div>

                    {/* Fast Action Buttons */}
                    <div className="flex flex-wrap md:flex-col gap-2 shrink-0">
                      <button
                        onClick={() => setActiveTab('prescriptions')}
                        className="px-4 py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 font-bold text-xs flex items-center gap-2 cursor-pointer border border-amber-500/30 transition-all"
                      >
                        <FileCheck className="w-4 h-4 text-amber-400" />
                        Prescription Orders {pendingRxCount > 0 && `(${pendingRxCount})`}
                      </button>
                      <button
                        onClick={() => setActiveTab('reports')}
                        className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-md shadow-indigo-600/30 transition-all"
                      >
                        <BarChart3 className="w-4 h-4" />
                        Financial Intelligence
                      </button>
                      <button
                        onClick={() => setActiveTab('users')}
                        className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-2 cursor-pointer border border-white/20 transition-all"
                      >
                        <User className="w-4 h-4" />
                        Staff Privileges ({staffUsers.length})
                      </button>
                    </div>
                  </div>
                </div>

                {/* 6 Executive KPI Metric Cards */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  
                  {/* Metric 1: Total Retail Valuation */}
                  <div className={`p-4 rounded-2xl border transition-all hover:shadow-md ${
                    isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                        <TrendingUp className="w-4 h-4 stroke-[2.2]" />
                      </div>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                        Asset Value
                      </span>
                    </div>
                    <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono truncate">
                      Rs. {Number(valuation?.total_inventory_retail_value || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </p>
                    <span className="text-[11px] font-bold text-slate-400 block mt-0.5 truncate">
                      Retail Inventory Value
                    </span>
                    <div className="mt-2 text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                      <span>{valuation?.total_stock_units ?? batches.reduce((acc, b) => acc + (b.stock_quantity || 0), 0)} Units on Hand</span>
                    </div>
                  </div>

                  {/* Metric 2: Capital Cost Investment */}
                  <div className={`p-4 rounded-2xl border transition-all hover:shadow-md ${
                    isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
                        <PieChart className="w-4 h-4 stroke-[2.2]" />
                      </div>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-blue-500/10 text-blue-500 border border-blue-500/20">
                        Cost Basis
                      </span>
                    </div>
                    <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono truncate">
                      Rs. {Number(valuation?.total_inventory_cost_value || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </p>
                    <span className="text-[11px] font-bold text-slate-400 block mt-0.5 truncate">
                      Wholesale Cost Basis
                    </span>
                    <div className="mt-2 text-[10px] text-blue-600 font-semibold flex items-center gap-1">
                      <span>Margin: Rs. {Number(valuation?.potential_gross_profit || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                    </div>
                  </div>

                  {/* Metric 3: Today Gross Sales */}
                  <div className={`p-4 rounded-2xl border transition-all hover:shadow-md ${
                    isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="w-8 h-8 rounded-xl bg-teal-500/10 text-teal-500 flex items-center justify-center">
                        <BarChart3 className="w-4 h-4 stroke-[2.2]" />
                      </div>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20">
                        Today
                      </span>
                    </div>
                    <p className="text-xl sm:text-2xl font-black text-teal-600 dark:text-teal-400 font-mono truncate">
                      Rs. {Number(stats?.today_revenue || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </p>
                    <span className="text-[11px] font-bold text-slate-400 block mt-0.5 truncate">
                      Today's Counter Revenue
                    </span>
                    <div className="mt-2 text-[10px] text-teal-600 font-semibold flex items-center gap-1">
                      <Receipt className="w-3 h-3" />
                      <span>{stats?.today_sales_count || 0} Bills Issued</span>
                    </div>
                  </div>

                  {/* Metric 4: Monthly Revenue */}
                  <div className={`p-4 rounded-2xl border transition-all hover:shadow-md ${
                    isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
                        <Activity className="w-4 h-4 stroke-[2.2]" />
                      </div>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-purple-500/10 text-purple-500 border border-purple-500/20">
                        MTD Sales
                      </span>
                    </div>
                    <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono truncate">
                      Rs. {Number(stats?.monthly_revenue || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </p>
                    <span className="text-[11px] font-bold text-slate-400 block mt-0.5 truncate">
                      Month-to-Date Revenue
                    </span>
                    <div className="mt-2 text-[10px] text-purple-600 font-semibold flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>Calendar Month</span>
                    </div>
                  </div>

                  {/* Metric 5: Active Staff Accounts */}
                  <div className={`p-4 rounded-2xl border transition-all hover:shadow-md ${
                    isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
                        <User className="w-4 h-4 stroke-[2.2]" />
                      </div>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                        Security
                      </span>
                    </div>
                    <p className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                      {staffUsers.filter(u => u.is_active).length} <span className="text-xs text-slate-400 font-normal">/ {staffUsers.length}</span>
                    </p>
                    <span className="text-[11px] font-bold text-slate-400 block mt-0.5 truncate">
                      Active Staff Accounts
                    </span>
                    <div className="mt-2 text-[10px] text-indigo-500 font-semibold flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" />
                      <span>Privileges Enforced</span>
                    </div>
                  </div>

                  {/* Metric 6: Trigger Audit Events */}
                  <div className={`p-4 rounded-2xl border transition-all hover:shadow-md ${
                    isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                        <History className="w-4 h-4 stroke-[2.2]" />
                      </div>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-500 border border-amber-500/20">
                        Audit Trail
                      </span>
                    </div>
                    <p className="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono">
                      {auditLogs.length}
                    </p>
                    <span className="text-[11px] font-bold text-slate-400 block mt-0.5 truncate">
                      Audit Trail Events
                    </span>
                    <div className="mt-2 text-[10px] text-amber-600 font-semibold flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>Immutable History</span>
                    </div>
                  </div>

                </div>

                {/* Executive Command & Governance Center (2x2 Grid) */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                  {/* Card 1: Staff User Accounts & Privileges Oversight */}
                  <div className={`p-6 rounded-3xl border space-y-4 ${
                    isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
                  }`}>
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                      <div>
                        <h3 className="text-sm font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                          <ShieldCheck className="w-4 h-4 text-indigo-500" />
                          <span>Staff User Accounts & Privileges Oversight</span>
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Define exact feature access for working pharmacists & cashiers
                        </p>
                      </div>
                      <button
                        onClick={() => setActiveTab('users')}
                        className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        View All <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="space-y-2.5">
                      {staffUsers.slice(0, 4).map((u) => (
                        <div
                          key={u.user_id}
                          className={`p-3 rounded-2xl border flex items-center justify-between gap-3 ${
                            isDark ? 'bg-slate-950/60 border-slate-800/80' : 'bg-slate-50 border-slate-200/80'
                          }`}
                        >
                          <div className="min-w-0 flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                              u.role === 'ADMIN' ? 'bg-rose-500/10 text-rose-500' : 'bg-teal-500/10 text-teal-600'
                            }`}>
                              {u.full_name ? u.full_name[0].toUpperCase() : 'U'}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                {u.full_name || u.username}
                              </p>
                              <p className="text-[10px] text-slate-400 font-mono">
                                @{u.username} • {u.role}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              u.is_active ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-700/50 text-slate-400'
                            }`}>
                              {u.is_active ? 'Active' : 'Inactive'}
                            </span>
                            <button
                              onClick={() => handleOpenEditUser(u)}
                              className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500/20 cursor-pointer transition-colors"
                            >
                              Edit
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="pt-2 flex gap-2">
                      <button
                        onClick={() => setIsNewUserModalOpen(true)}
                        className="flex-1 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add New Staff User
                      </button>
                      <button
                        onClick={() => setActiveTab('users')}
                        className={`px-4 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                          isDark ? 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white' : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        Manage All
                      </button>
                    </div>
                  </div>

                  {/* Card 2: Operational Reports & Financial Intelligence */}
                  <div className={`p-6 rounded-3xl border space-y-4 ${
                    isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
                  }`}>
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                      <div>
                        <h3 className="text-sm font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                          <TrendingUp className="w-4 h-4 text-teal-500" />
                          <span>Financial Intelligence & Timeline Reports</span>
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Multi-timeline sales audit, cash/card breakdown, and CSV exports
                        </p>
                      </div>
                      <button
                        onClick={() => setActiveTab('reports')}
                        className="text-xs font-bold text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        Full Reports <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className={`p-3.5 rounded-2xl border ${
                        isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                      }`}>
                        <span className="text-[10px] text-slate-400 font-bold block">Today's Transactions</span>
                        <span className="text-lg font-black text-slate-900 dark:text-white font-mono mt-0.5 block">
                          {stats?.today_sales_count || 0} Bills
                        </span>
                        <span className="text-[10px] text-teal-600 font-semibold block mt-1">
                          Rs. {Number(stats?.today_revenue || 0).toFixed(2)}
                        </span>
                      </div>

                      <div className={`p-3.5 rounded-2xl border ${
                        isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                      }`}>
                        <span className="text-[10px] text-slate-400 font-bold block">Monthly Performance</span>
                        <span className="text-lg font-black text-slate-900 dark:text-white font-mono mt-0.5 block">
                          {monthlySales[0]?.total_transactions || 0} Bills
                        </span>
                        <span className="text-[10px] text-purple-600 font-semibold block mt-1">
                          Rs. {Number(stats?.monthly_revenue || 0).toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {/* Top-selling snippet */}
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block">
                        Leading Turnover Formulation:
                      </span>
                      {bestSellers[0] ? (
                        <div className={`p-2.5 rounded-xl border flex items-center justify-between text-xs ${
                          isDark ? 'bg-slate-950/40 border-slate-800' : 'bg-white border-slate-200'
                        }`}>
                          <div className="truncate">
                            <span className="font-bold text-slate-900 dark:text-white">{bestSellers[0].medicine_name}</span>
                            <span className="text-[10px] text-slate-400 block truncate">{bestSellers[0].generic_name}</span>
                          </div>
                          <span className="font-mono font-bold text-teal-600 dark:text-teal-400 text-xs shrink-0">
                            {bestSellers[0].total_units_sold} sold
                          </span>
                        </div>
                      ) : (
                        <div className="text-[11px] text-slate-400 italic">No sales recorded yet.</div>
                      )}
                    </div>

                    <div className="pt-2 flex gap-2">
                      <button
                        onClick={() => setActiveTab('reports')}
                        className="flex-1 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                      >
                        <BarChart3 className="w-3.5 h-3.5" />
                        View Financial Analytics
                      </button>
                      <button
                        onClick={handleExportReportCSV}
                        className={`px-4 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer flex items-center gap-1.5 ${
                          isDark ? 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white' : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        <Download className="w-3.5 h-3.5" />
                        Export CSV
                      </button>
                    </div>
                  </div>

                  {/* Card 3: Real-Time Audit Trail Feed */}
                  <div className={`p-6 rounded-3xl border space-y-4 ${
                    isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
                  }`}>
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                      <div>
                        <h3 className="text-sm font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                          <History className="w-4 h-4 text-amber-500" />
                          <span>Real-Time Inventory Audit Trail</span>
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Automated audit tracking capturing all stock modifications and dispensations
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          setActiveTab('reports');
                          setReportSubTab('audit');
                        }}
                        className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        View All ({auditLogs.length}) <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="space-y-2">
                      {auditLogs.slice(0, 4).map((log) => (
                        <div
                          key={log.log_id}
                          className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 text-xs ${
                            isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold uppercase ${
                                log.operation === 'UPDATE' ? 'bg-amber-500/10 text-amber-500' :
                                log.operation === 'INSERT' ? 'bg-teal-500/10 text-teal-600' :
                                'bg-rose-500/10 text-rose-500'
                              }`}>
                                {log.operation}
                              </span>
                              <span className="font-mono text-slate-400 text-[10px]">
                                {formatAuditRecord(log.table_name, log.record_id)}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-400 truncate block mt-0.5">
                              Staff / Source: {formatAuditCaller(log.performed_by)}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono shrink-0">
                            {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="pt-2">
                      <button
                        onClick={() => {
                          setActiveTab('reports');
                          setReportSubTab('audit');
                        }}
                        className={`w-full py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                          isDark ? 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white' : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        <History className="w-3.5 h-3.5" />
                        Inspect Full Audit Trail Log
                      </button>
                    </div>
                  </div>

                  {/* Card 4: Inventory Health & Formulary Scale */}
                  <div className={`p-6 rounded-3xl border space-y-4 ${
                    isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
                  }`}>
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                      <div>
                        <h3 className="text-sm font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                          <Package className="w-4 h-4 text-teal-500" />
                          <span>Formulary Master & Batch Supply Control</span>
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Supplier inbound lots, physical stock thresholds, and expiration rotation
                        </p>
                      </div>
                      <button
                        onClick={() => setActiveTab('batches')}
                        className="text-xs font-bold text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        Batches <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className={`p-3 rounded-2xl border ${isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                        <span className="text-[10px] text-slate-400 block font-bold">Medicines</span>
                        <span className="text-lg font-black text-slate-900 dark:text-white font-mono mt-0.5 block">{medicines.length}</span>
                      </div>
                      <div className={`p-3 rounded-2xl border ${isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                        <span className="text-[10px] text-slate-400 block font-bold">Active Lots</span>
                        <span className="text-lg font-black text-emerald-600 font-mono mt-0.5 block">{batches.length}</span>
                      </div>
                      <div className={`p-3 rounded-2xl border ${isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                        <span className="text-[10px] text-slate-400 block font-bold">Expiring 90d</span>
                        <span className="text-lg font-black text-rose-500 font-mono mt-0.5 block">{expiringList.length}</span>
                      </div>
                    </div>

                    <div className="pt-2 flex gap-2">
                      <button
                        onClick={() => setIsNewBatchModalOpen(true)}
                        className="flex-1 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Receive Shipment Batch
                      </button>
                      <button
                        onClick={() => setIsNewMedModalOpen(true)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                          isDark ? 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white' : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        Add Medicine
                      </button>
                    </div>
                  </div>

                </div>

              </div>
            ) : (
              /* ======================================================== */
              /* B. PHARMACIST CLINICAL DISPENSARY OVERVIEW */
              /* ======================================================== */
              <div className="space-y-8 animate-in fade-in duration-150">
                {/* Pharmacist Hero Dispensary Banner */}
                <div className={`p-6 sm:p-7 rounded-3xl border relative overflow-hidden ${
                  isDark
                    ? 'bg-gradient-to-r from-teal-950/80 via-slate-900 to-emerald-950/70 border-teal-500/25'
                    : 'bg-gradient-to-r from-teal-800 via-teal-700 to-emerald-700 text-white border-teal-600 shadow-md'
                }`}>
                  <div className="space-y-1.5 max-w-3xl">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider font-extrabold bg-teal-400/20 text-teal-200 border border-teal-400/30">
                        Dispensary Counter Active
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider font-bold bg-white/10 text-white border border-white/20">
                        FEFO Enforced
                      </span>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-black text-white">
                      Prescription Dispensing & Patient Counter
                    </h2>
                    <p className="text-xs text-teal-100/90 leading-relaxed">
                      Ready to dispense prescription tablets, blister cards, loose counts, bottles, and vials with automatic lot batch deductions and receipt printing.
                    </p>
                  </div>
                </div>

                {/* Real-time Sales, Revenue & Income Overview */}
                <div className={`p-6 rounded-3xl border ${
                  isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
                }`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                        <h3 className={`text-base font-black flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          <TrendingUp className="w-4 h-4 text-teal-500" />
                          Live Sales & Income Command
                        </h3>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Real-time revenue metrics calculated atomically from POS counter billing & online dispensary receipts
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setActiveTab('pos')}
                        className="px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition-all"
                      >
                        <ShoppingCart className="w-3.5 h-3.5" />
                        Open POS Counter
                      </button>
                      <button
                        onClick={() => {
                          setActiveTab('reports');
                          setReportSubTab('sales');
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                          isDark ? 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white' : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        View All Invoices
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {/* Card 1: Today's Revenue */}
                    <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-950/60 border-slate-800/80' : 'bg-slate-50/80 border-slate-200'}`}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Today's Revenue</span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-teal-500/10 text-teal-600 dark:text-teal-400">
                          Live POS
                        </span>
                      </div>
                      <p className="text-xl sm:text-2xl font-black text-teal-600 dark:text-teal-400 font-mono">
                        Rs. {Number(stats?.today_revenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </p>
                      <span className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                        <Receipt className="w-3 h-3 text-teal-500" />
                        <span>{stats?.today_sales_count || 0} Bills Issued Today</span>
                      </span>
                    </div>

                    {/* Card 2: Month-to-Date Revenue */}
                    <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-950/60 border-slate-800/80' : 'bg-slate-50/80 border-slate-200'}`}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">MTD Income</span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400">
                          This Month
                        </span>
                      </div>
                      <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono">
                        Rs. {Number(stats?.monthly_revenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </p>
                      <span className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-purple-500" />
                        <span>Calendar Month Sales</span>
                      </span>
                    </div>

                    {/* Card 3: Total Transactions */}
                    <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-950/60 border-slate-800/80' : 'bg-slate-50/80 border-slate-200'}`}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Sales Invoices</span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400">
                          Transactions
                        </span>
                      </div>
                      <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono">
                        {Number(stats?.total_sales_count || salesHistory.length).toLocaleString()}
                      </p>
                      <span className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-blue-500" />
                        <span>System Transactions Recorded</span>
                      </span>
                    </div>

                    {/* Card 4: Total Accumulated Income */}
                    <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-950/60 border-slate-800/80' : 'bg-slate-50/80 border-slate-200'}`}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Accumulated Revenue</span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                          Gross Total
                        </span>
                      </div>
                      <p className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                        Rs. {Number(stats?.total_revenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </p>
                      <span className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                        <TrendingUp className="w-3 h-3 text-emerald-500" />
                        <span>All Dispensation Revenue</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* 1. Six Statistic Cards Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                
                {/* Metric 1: Total Formulations */}
                <div className={`p-4 rounded-2xl border transition-all hover:shadow-md ${
                  isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/90 shadow-xs'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 flex items-center justify-center">
                      <Pill className="w-4 h-4 stroke-[2.2]" />
                    </div>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300">
                      Active
                    </span>
                  </div>
                  <p className="text-2xl font-black text-slate-900 dark:text-white">
                    {stats?.total_medicines ?? medicines.length}
                  </p>
                  <span className="text-[11px] font-bold text-slate-400 block mt-0.5 truncate">
                    Total Formulations
                  </span>
                  <div className="mt-2 text-[10px] text-teal-600 font-semibold flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    <span>Catalog Master</span>
                  </div>
                </div>

                {/* Metric 2: Active Batches */}
                <div className={`p-4 rounded-2xl border transition-all hover:shadow-md ${
                  isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/90 shadow-xs'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
                      <Layers className="w-4 h-4 stroke-[2.2]" />
                    </div>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                      Unexpired
                    </span>
                  </div>
                  <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                    {stats?.active_batches ?? batches.length}
                  </p>
                  <span className="text-[11px] font-bold text-slate-400 block mt-0.5 truncate">
                    Active Batches
                  </span>
                  <div className="mt-2 text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>FEFO Ready</span>
                  </div>
                </div>

                {/* Metric 3: Categories & Brands */}
                <div className={`p-4 rounded-2xl border transition-all hover:shadow-md ${
                  isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/90 shadow-xs'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center">
                      <Building2 className="w-4 h-4 stroke-[2.2]" />
                    </div>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                      Coverage
                    </span>
                  </div>
                  <p className="text-2xl font-black text-slate-900 dark:text-white">
                    {categories.length} / {brands.length}
                  </p>
                  <span className="text-[11px] font-bold text-slate-400 block mt-0.5 truncate">
                    Categories / Brands
                  </span>
                  <div className="mt-2 text-[10px] text-blue-600 font-semibold flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" />
                    <span>NMRA Verified</span>
                  </div>
                </div>

                {/* Metric 4: Low Stock Warnings */}
                <div className={`p-4 rounded-2xl border transition-all hover:shadow-md ${
                  isDark ? 'bg-amber-950/15 border-amber-500/25' : 'bg-amber-50/70 border-amber-200'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-600 flex items-center justify-center">
                      <AlertTriangle className="w-4 h-4 stroke-[2.2]" />
                    </div>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-200 dark:bg-amber-900 text-amber-800 dark:text-amber-200">
                      Action
                    </span>
                  </div>
                  <p className="text-2xl font-black text-amber-600 dark:text-amber-400">
                    {lowStockCount}
                  </p>
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mt-0.5 truncate">
                    Low Stock Alerts
                  </span>
                  <div className="mt-2 text-[10px] text-amber-700 font-semibold flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    <span>Reorder Required</span>
                  </div>
                </div>

                {/* Metric 5: Expiring in 90 Days */}
                <div className={`p-4 rounded-2xl border transition-all hover:shadow-md ${
                  isDark ? 'bg-rose-950/15 border-rose-500/25' : 'bg-rose-50/70 border-rose-200'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-8 h-8 rounded-xl bg-rose-100 dark:bg-rose-950 text-rose-600 flex items-center justify-center">
                      <Clock className="w-4 h-4 stroke-[2.2]" />
                    </div>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-rose-200 dark:bg-rose-900 text-rose-800 dark:text-rose-200">
                      Alert
                    </span>
                  </div>
                  <p className="text-2xl font-black text-rose-600 dark:text-rose-400">
                    {stats?.expiring_batches_count ?? expiringList.length}
                  </p>
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mt-0.5 truncate">
                    Expiring (90 Days)
                  </span>
                  <div className="mt-2 text-[10px] text-rose-700 font-semibold flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>Lot Rotation</span>
                  </div>
                </div>

                {/* Metric 6: Out of Stock */}
                <div className={`p-4 rounded-2xl border transition-all hover:shadow-md ${
                  isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/90 shadow-xs'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center">
                      <AlertCircle className="w-4 h-4 stroke-[2.2]" />
                    </div>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                      Stock
                    </span>
                  </div>
                  <p className="text-2xl font-black text-slate-900 dark:text-white">
                    {outOfStockCount}
                  </p>
                  <span className="text-[11px] font-bold text-slate-400 block mt-0.5 truncate">
                    Out of Stock
                  </span>
                  <div className="mt-2 text-[10px] text-slate-500 font-semibold flex items-center gap-1">
                    <span>Depleted Items</span>
                  </div>
                </div>

              </div>

              {/* 2. Charts & Data Visualizations (Reference 1 Style) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Category Distribution Visual Breakdown (7 cols) */}
                <div className={`lg:col-span-7 p-6 rounded-3xl border ${
                  isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/90 shadow-sm'
                }`}>
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <BarChart3 className="w-4 h-4 text-teal-600" />
                        <span>Medicine Distribution by Therapeutic Category</span>
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Breakdown of inventory catalog across medical disciplines
                      </p>
                    </div>
                    <span className="text-xs font-mono font-bold text-teal-600 dark:text-teal-400">
                      {medicines.length} Total Meds
                    </span>
                  </div>

                  <div className="space-y-4">
                    {categoryDistribution.map((cat, idx) => (
                      <div key={cat.category_id} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-700 dark:text-slate-300 truncate max-w-xs">
                            {cat.category_name}
                          </span>
                          <span className="font-mono text-slate-500 dark:text-slate-400">
                            {cat.count} meds ({cat.percent}%)
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-teal-600 to-cyan-500"
                            style={{ width: `${Math.max(5, cat.percent)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Dispensary Stock Health Status (5 cols) */}
                <div className={`lg:col-span-5 p-6 rounded-3xl border flex flex-col justify-between ${
                  isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/90 shadow-sm'
                }`}>
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <PieChart className="w-4 h-4 text-teal-600" />
                          <span>Dispensary Stock Health</span>
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Shelf safety threshold ratio
                        </p>
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300">
                        Healthy {healthyPercent}%
                      </span>
                    </div>

                    {/* Multi-segment Health Bar */}
                    <div className="w-full h-4 rounded-xl overflow-hidden flex gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 mb-6">
                      <div
                        className="h-full rounded-lg bg-teal-500 transition-all"
                        style={{ width: `${healthyPercent}%` }}
                        title={`Healthy Stock: ${healthyPercent}%`}
                      />
                      <div
                        className="h-full rounded-lg bg-amber-500 transition-all"
                        style={{ width: `${lowPercent}%` }}
                        title={`Low Stock: ${lowPercent}%`}
                      />
                      <div
                        className="h-full rounded-lg bg-rose-500 transition-all"
                        style={{ width: `${outPercent}%` }}
                        title={`Out of Stock: ${outPercent}%`}
                      />
                    </div>

                    {/* Breakdown Details */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-teal-500" />
                          <span className="font-semibold text-slate-700 dark:text-slate-300">Healthy Stock Level</span>
                        </div>
                        <span className="font-bold text-slate-900 dark:text-white">{healthyStockCount} items ({healthyPercent}%)</span>
                      </div>

                      <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-amber-500" />
                          <span className="font-semibold text-slate-700 dark:text-slate-300">Low Stock Reorders</span>
                        </div>
                        <span className="font-bold text-amber-600">{lowStockCount} items ({lowPercent}%)</span>
                      </div>

                      <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-rose-500" />
                          <span className="font-semibold text-slate-700 dark:text-slate-300">Out of Stock Lots</span>
                        </div>
                        <span className="font-bold text-rose-600">{outOfStockCount} items ({outPercent}%)</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 mt-6 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                    <span>Dispensary Cold Storage:</span>
                    <span className="font-bold text-cyan-600 dark:text-cyan-400">2°C – 8°C Monitored</span>
                  </div>
                </div>

              </div>

              {/* 3. Actionable Priority Alert Tables */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Low Stock Priority Table */}
                <div className={`p-6 rounded-3xl border space-y-4 ${
                  isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/90 shadow-sm'
                }`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold flex items-center gap-2 text-amber-600 dark:text-amber-400">
                        <AlertTriangle className="w-4 h-4" />
                        <span>Low Stock Reorder Priorities</span>
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Items requiring immediate stock replenishment
                      </p>
                    </div>
                    <span className="text-xs font-mono font-bold text-slate-400">{lowStockList.length} items</span>
                  </div>

                  {lowStockList.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-400 space-y-1">
                      <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-1" />
                      <p className="font-bold text-emerald-500">Stock Levels Optimal</p>
                      <p className="text-[11px]">All active medicine formulations are above safety thresholds.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className={`border-b font-bold ${isDark ? 'text-slate-400 border-slate-800' : 'text-slate-500 border-slate-200'}`}>
                          <tr>
                            <th className="py-2.5">Medicine</th>
                            <th className="py-2.5">Stock</th>
                            <th className="py-2.5">Threshold</th>
                            <th className="py-2.5">Shortfall</th>
                            <th className="py-2.5 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className={`divide-y text-xs ${isDark ? 'divide-slate-800 text-slate-300' : 'divide-slate-100 text-slate-700'}`}>
                          {lowStockList.slice(0, 5).map((item) => (
                            <tr key={item.medicine_id}>
                              <td className="py-3 font-bold text-slate-900 dark:text-white">{item.medicine_name}</td>
                              <td className="py-3 text-amber-600 font-bold">{item.current_stock}</td>
                              <td className="py-3 text-slate-400">{item.low_stock_threshold}</td>
                              <td className="py-3 text-rose-600 font-bold">+{item.units_needed}</td>
                              <td className="py-3 text-right">
                                <button
                                  onClick={() => {
                                    setBatchForm(prev => ({ ...prev, medicine_id: item.medicine_id }));
                                    setIsNewBatchModalOpen(true);
                                  }}
                                  className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-amber-500/10 hover:bg-amber-500 text-amber-600 hover:text-white transition-colors cursor-pointer"
                                >
                                  + Receive
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Batches Nearing Expiry Table */}
                <div className={`p-6 rounded-3xl border space-y-4 ${
                  isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/90 shadow-sm'
                }`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold flex items-center gap-2 text-rose-600 dark:text-rose-400">
                        <Clock className="w-4 h-4" />
                        <span>Batches Nearing Expiry (90 Days)</span>
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        FEFO rotation lots requiring shelf priority
                      </p>
                    </div>
                    <span className="text-xs font-mono font-bold text-slate-400">{expiringList.length} lots</span>
                  </div>

                  {expiringList.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-400 space-y-1">
                      <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-1" />
                      <p className="font-bold text-emerald-500">No Expiring Batches</p>
                      <p className="text-[11px]">All active batches in dispensary inventory have over 90 days of shelf life remaining.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className={`border-b font-bold ${isDark ? 'text-slate-400 border-slate-800' : 'text-slate-500 border-slate-200'}`}>
                          <tr>
                            <th className="py-2.5">Batch #</th>
                            <th className="py-2.5">Medicine</th>
                            <th className="py-2.5">Expiry Date</th>
                            <th className="py-2.5">Days Left</th>
                            <th className="py-2.5 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className={`divide-y text-xs ${isDark ? 'divide-slate-800 text-slate-300' : 'divide-slate-100 text-slate-700'}`}>
                          {expiringList.slice(0, 5).map((batch) => {
                            const days = batch.days_to_expiry;
                            const isCritical = days <= 30;
                            return (
                              <tr key={batch.batch_id}>
                                <td className="py-3 font-mono text-teal-600 dark:text-teal-400 font-bold">{batch.batch_number}</td>
                                <td className="py-3 font-bold text-slate-900 dark:text-white truncate max-w-[140px]">{batch.medicine_name}</td>
                                <td className="py-3 text-slate-400">{new Date(batch.expiry_date).toLocaleDateString()}</td>
                                <td className="py-3">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                                    isCritical 
                                      ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300' 
                                      : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                                  }`}>
                                    {days} days
                                  </span>
                                </td>
                                <td className="py-3 text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <button
                                      onClick={() => handleOpenBatchActionModal(batch)}
                                      className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-rose-500/10 hover:bg-rose-500 text-rose-600 hover:text-white transition-colors cursor-pointer flex items-center gap-1"
                                      title="Quarantine or resolve this expiring batch"
                                    >
                                      <Shield className="w-3 h-3" />
                                      <span>Resolve</span>
                                    </button>
                                    <button
                                      onClick={() => handleOpenAdjustModal(batch)}
                                      className="px-2.5 py-1 rounded-lg text-[10px] font-bold border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                    >
                                      Adjust
                                    </button>
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

              </div>

            </div>
          )
        )}

      {/* TAB 2: QUICK DISPENSE / e-POS COUNTER */}
      {activeTab === 'pos' && (
        <div className="space-y-6">
          
          {/* Top e-POS Terminal Bar */}
          <div className={`p-4 sm:p-5 rounded-3xl border flex flex-wrap items-center justify-between gap-4 ${
            isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
          }`}>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-teal-500 to-emerald-400 text-slate-950 flex items-center justify-center font-black shadow-lg shadow-teal-500/20">
                <ShoppingCart className="w-6 h-6 stroke-[2.4]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className={`text-lg sm:text-xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    e-POS Dispensary Terminal
                  </h2>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    Terminal #01 Active
                  </span>
                </div>
                <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  Tactile element point-of-sale: Click category tiles, pick formulations, and dispense with instant FEFO lot tracking.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <div className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
                isDark ? 'bg-slate-950 border-slate-800 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'
              }`}>
                <User className="w-3.5 h-3.5 text-teal-400" />
                <span>Cashier: <strong className={isDark ? 'text-white' : 'text-slate-900'}>{staffUser?.fullName || 'Licensed Pharmacist'}</strong></span>
                {isAdmin && (
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                    Admin Superuser
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={handleResetPos}
                className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  isDark ? 'bg-slate-950 hover:bg-slate-800 border-slate-800 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
                }`}
                title="Reset active register ticket"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Clear / Reset</span>
              </button>
            </div>
          </div>

          {/* Main 2-Column POS Workspace */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* LEFT: Touch-friendly Product Catalog & Selection Elements */}
            <div className="lg:col-span-7 xl:col-span-7 2xl:col-span-8 space-y-5">
              
              {/* SECTION 1: e-POS CATEGORY TILES (ELEMENT-BASED SELECTOR) */}
              <div className={`p-4 sm:p-5 rounded-3xl border ${
                isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-teal-500 text-slate-950 font-black text-xs flex items-center justify-center shadow-xs">
                      1
                    </span>
                    <div>
                      <h3 className={`text-xs font-black uppercase tracking-wider ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        Category Elements
                      </h3>
                      <span className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        Tap a category tile to immediately filter products
                      </span>
                    </div>
                  </div>

                  {dispenseCategoryId && (
                    <button
                      type="button"
                      onClick={() => handleSelectCategoryForDispense('')}
                      className="text-xs text-teal-400 hover:text-teal-300 font-bold flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Show All Categories</span>
                    </button>
                  )}
                </div>

                {/* Touch Category Elements Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                  {/* All Categories Tile */}
                  <button
                    type="button"
                    onClick={() => handleSelectCategoryForDispense('')}
                    className={`p-3 rounded-2xl border text-left transition-all duration-150 cursor-pointer flex flex-col justify-between group relative overflow-hidden ${
                      !dispenseCategoryId
                        ? 'bg-gradient-to-br from-teal-500 to-emerald-600 text-slate-950 border-teal-400 shadow-md shadow-teal-500/20 ring-2 ring-teal-400/50 scale-[1.02]'
                        : isDark
                          ? 'bg-slate-950/80 hover:bg-slate-800/80 text-slate-200 border-slate-800 hover:border-slate-700'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1.5">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                        !dispenseCategoryId ? 'bg-slate-950/20 text-slate-950' : isDark ? 'bg-teal-500/10 text-teal-400' : 'bg-teal-100 text-teal-700'
                      }`}>
                        <Layers className="w-4 h-4 stroke-[2.4]" />
                      </div>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                        !dispenseCategoryId ? 'bg-slate-950/20 text-slate-950' : isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-700'
                      }`}>
                        {medicines.length}
                      </span>
                    </div>
                    <div>
                      <span className="font-black text-xs block leading-tight">All Items</span>
                      <span className={`text-[10px] block mt-0.5 truncate ${!dispenseCategoryId ? 'text-slate-900/80 font-semibold' : 'text-slate-400'}`}>
                        Complete Catalog
                      </span>
                    </div>
                  </button>

                  {/* Individual Categories Tiles */}
                  {categories.map((cat) => {
                    const countInCat = medicines.filter(m => String(m.category_id) === String(cat.category_id)).length;
                    const isSelected = String(dispenseCategoryId) === String(cat.category_id);
                    const CatIcon = getCategoryIcon(cat.category_name);

                    return (
                      <button
                        key={cat.category_id}
                        type="button"
                        onClick={() => handleSelectCategoryForDispense(String(cat.category_id))}
                        className={`p-3 rounded-2xl border text-left transition-all duration-150 cursor-pointer flex flex-col justify-between group relative overflow-hidden ${
                          isSelected
                            ? 'bg-gradient-to-br from-teal-500 to-emerald-600 text-slate-950 border-teal-400 shadow-md shadow-teal-500/20 ring-2 ring-teal-400/50 scale-[1.02]'
                            : isDark
                              ? 'bg-slate-950/80 hover:bg-slate-800/80 text-slate-200 border-slate-800 hover:border-slate-700'
                              : 'bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full mb-1.5">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                            isSelected ? 'bg-slate-950/20 text-slate-950' : isDark ? 'bg-teal-500/10 text-teal-400' : 'bg-teal-100 text-teal-700'
                          }`}>
                            <CatIcon className="w-4 h-4 stroke-[2.4]" />
                          </div>
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                            isSelected ? 'bg-slate-950/20 text-slate-950' : isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-700'
                          }`}>
                            {countInCat}
                          </span>
                        </div>
                        <div>
                          <span className="font-black text-xs block leading-tight truncate" title={cat.category_name}>
                            {cat.category_name}
                          </span>
                          <span className={`text-[10px] block mt-0.5 truncate ${isSelected ? 'text-slate-900/80 font-semibold' : 'text-slate-400'}`}>
                            {cat.description || `${countInCat} med${countInCat === 1 ? '' : 's'}`}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* SECTION 2: MEDICINE FORMULARY CATALOG TILES (ELEMENT TYPE) */}
              <div className={`p-4 sm:p-5 rounded-3xl border space-y-4 ${
                isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
              }`}>
                {/* Search & Fast Formulation Filters */}
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-teal-500 text-slate-950 font-black text-xs flex items-center justify-center shadow-xs">
                        2
                      </span>
                      <div>
                        <h3 className={`text-xs font-black uppercase tracking-wider ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          Select Medication Item
                        </h3>
                        <span className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          {filteredDispenseMedicines.length} formulation{filteredDispenseMedicines.length === 1 ? '' : 's'} available
                        </span>
                      </div>
                    </div>

                    {/* Quick Search */}
                    <div className="relative sm:w-72">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={dispenseSearch}
                        onChange={(e) => setDispenseSearch(e.target.value)}
                        placeholder="Quick search name, generic..."
                        className={`w-full pl-9 pr-8 py-2 rounded-xl border text-xs focus:outline-none focus:border-teal-500 font-medium ${
                          isDark ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                        }`}
                      />
                      {dispenseSearch && (
                        <button
                          type="button"
                          onClick={() => setDispenseSearch('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Dosage Form Tabs */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs scrollbar-none">
                    {[
                      { id: 'all', label: 'All Forms' },
                      { id: 'tablet', label: '💊 Tablets & Caps' },
                      { id: 'syrup', label: '🧪 Syrups & Liquids' },
                      { id: 'injection', label: '💉 Injections & Vials' },
                      { id: 'topical', label: '🧴 Creams & Gels' },
                      { id: 'inhaler', label: '🫁 Inhalers' },
                    ].map(tab => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setDispenseFormFilter(tab.id)}
                        className={`px-3 py-1 rounded-xl text-[11px] font-bold whitespace-nowrap transition-colors cursor-pointer border ${
                          dispenseFormFilter === tab.id
                            ? 'bg-teal-500 text-slate-950 border-teal-400 shadow-xs'
                            : isDark
                              ? 'bg-slate-950 text-slate-400 hover:text-slate-200 border-slate-800'
                              : 'bg-slate-100 text-slate-600 hover:text-slate-900 border-slate-200'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Medicine Items Grid */}
                {filteredDispenseMedicines.length === 0 ? (
                  <div className={`p-8 rounded-2xl border text-center space-y-2 ${
                    isDark ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
                    <p className="text-xs font-bold text-slate-300">No medicines found matching your search or category.</p>
                    <button
                      type="button"
                      onClick={() => { setDispenseSearch(''); setDispenseCategoryId(''); setDispenseFormFilter('all'); }}
                      className="px-3.5 py-1.5 rounded-xl bg-teal-500/20 text-teal-400 hover:bg-teal-500/30 text-xs font-bold transition-colors cursor-pointer"
                    >
                      Reset All Filters
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 max-h-[460px] overflow-y-auto pr-1">
                    {filteredDispenseMedicines.map((m) => {
                      const isSelected = String(dispenseMedId) === String(m.medicine_id);
                      const isOutOfStock = Number(m.total_saleable_stock || 0) <= 0;
                      const isLowStock = !isOutOfStock && Number(m.total_saleable_stock || 0) <= (m.low_stock_threshold || 20);
                      const FormIcon = getDosageFormIcon(m.dosage_form);

                      return (
                        <button
                          key={m.medicine_id}
                          type="button"
                          onClick={() => handleSelectMedicineForDispense(String(m.medicine_id))}
                          className={`p-3 rounded-2xl border text-left transition-all duration-150 cursor-pointer flex flex-col justify-between relative group ${
                            isSelected
                              ? 'bg-teal-500/15 border-teal-400 ring-2 ring-teal-400/60 shadow-lg shadow-teal-500/15 scale-[1.01]'
                              : isOutOfStock
                                ? isDark
                                  ? 'bg-slate-950/40 border-slate-800/80 opacity-60'
                                  : 'bg-slate-100/60 border-slate-200 opacity-60'
                                : isDark
                                  ? 'bg-slate-950/70 hover:bg-slate-800/80 border-slate-800 hover:border-slate-700'
                                  : 'bg-white hover:bg-slate-50 border-slate-200 hover:border-slate-300 shadow-xs'
                          }`}
                        >
                          {isSelected && (
                            <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-teal-500 text-slate-950 flex items-center justify-center shadow-md">
                              <Check className="w-3 h-3 stroke-[3]" />
                            </span>
                          )}

                          <div>
                            {/* Medicine Image Thumbnail */}
                            <div className="w-full h-24 rounded-xl bg-slate-50 dark:bg-slate-900/80 p-1.5 flex items-center justify-center mb-2.5 overflow-hidden border border-slate-100 dark:border-slate-800 shadow-2xs">
                              <img 
                                src={getMedicineProductImage(m)} 
                                alt={m.name} 
                                className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-200" 
                                loading="lazy" 
                              />
                            </div>

                            {/* Dosage Form & Strength Chip */}
                            <div className="flex items-center gap-1.5 flex-wrap mb-1.5 pr-5">
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-1 ${
                                isSelected 
                                  ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40' 
                                  : isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700'
                              }`}>
                                <FormIcon className="w-3 h-3" />
                                <span>{m.dosage_form}</span>
                              </span>
                              {m.strength && (
                                <span className="text-[10px] text-slate-400 font-mono">
                                  {m.strength}
                                </span>
                              )}
                            </div>

                            {/* Medicine Trade Name */}
                            <h4 className={`font-black text-xs sm:text-sm leading-tight line-clamp-2 ${
                              isSelected ? 'text-teal-400' : isDark ? 'text-white' : 'text-slate-900'
                            }`}>
                              {m.name}
                            </h4>

                            {/* Generic / Molecule */}
                            <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5 italic">
                              {m.generic_name || 'Generic formulation'}
                            </p>
                          </div>

                          {/* Bottom Row: Stock Badge & Price */}
                          <div className="pt-2.5 mt-2 border-t border-slate-800/40 flex items-center justify-between">
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              isOutOfStock 
                                ? 'bg-rose-500/10 text-rose-500'
                                : isLowStock 
                                  ? 'bg-amber-500/10 text-amber-500'
                                  : 'bg-emerald-500/10 text-emerald-400'
                            }`}>
                              {isOutOfStock ? 'Out of Stock' : `${m.total_saleable_stock} units`}
                            </span>

                            <span className="font-black text-xs font-mono text-emerald-400">
                              Rs. {Number(m.unit_price || 0).toFixed(2)}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* SECTION 3: PHYSICAL LOT / BATCH SELECTION (ELEMENT CARDS) */}
              {dispenseMedId && (
                <div className={`p-4 sm:p-5 rounded-3xl border space-y-3 ${
                  isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-teal-500 text-slate-950 font-black text-xs flex items-center justify-center shadow-xs">
                        3
                      </span>
                      <div>
                        <h3 className={`text-xs font-black uppercase tracking-wider ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          Physical Batch / Lot (FEFO Prioritized)
                        </h3>
                        <span className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          Earliest expiring lot is automatically pre-selected
                        </span>
                      </div>
                    </div>

                    <span className="text-[11px] text-emerald-400 font-bold flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      <Clock className="w-3 h-3" />
                      FEFO Compliant
                    </span>
                  </div>

                  {blockedBatchesForMed.length > 0 && (
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-start gap-2.5">
                      <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
                      <div>
                        <span className="font-bold">Dispensing Lock Active: </span>
                        {blockedBatchesForMed.length} lot(s) ({blockedBatchesForMed.map(b => `#${b.batch_number}`).join(', ')}) for this medicine are expired or quarantined and blocked from counter dispensing.
                      </div>
                    </div>
                  )}

                  {availableBatchesForMed.length === 0 ? (
                    <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>No active unexpired batches with stock available for this medication. Please receive or add a new batch in Batch Records.</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                      {availableBatchesForMed.map((b, idx) => {
                        const isSelected = String(dispenseBatchId) === String(b.batch_id);
                        const isEarliest = idx === 0;
                        const isExpiringSoon = Number(b.days_to_expiry) <= 90;

                        return (
                          <button
                            key={b.batch_id}
                            type="button"
                            onClick={() => setDispenseBatchId(String(b.batch_id))}
                            className={`p-3 rounded-2xl border text-left transition-all duration-150 cursor-pointer flex flex-col justify-between relative ${
                              isSelected
                                ? 'bg-teal-500/15 border-teal-400 ring-2 ring-teal-400/60 shadow-md'
                                : isDark
                                  ? 'bg-slate-950/70 hover:bg-slate-800 border-slate-800'
                                  : 'bg-white hover:bg-slate-50 border-slate-200'
                            }`}
                          >
                            <div>
                              <div className="flex items-center justify-between gap-1 mb-1">
                                <span className="font-mono font-black text-xs text-teal-400">
                                  Lot #{b.batch_number}
                                </span>
                                {isEarliest && (
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-500/20 text-amber-400 border border-amber-500/30">
                                    ★ FEFO Best
                                  </span>
                                )}
                              </div>

                              <div className="text-[11px] text-slate-400 flex items-center justify-between">
                                <span>Expiry:</span>
                                <span className={`font-mono font-bold ${isExpiringSoon ? 'text-amber-400' : 'text-slate-300'}`}>
                                  {new Date(b.expiry_date).toLocaleDateString()}
                                </span>
                              </div>

                              <div className="text-[11px] text-slate-400 flex items-center justify-between mt-0.5">
                                <span>Shelf Life:</span>
                                <span className={`font-bold text-[10px] px-1.5 rounded ${
                                  b.days_to_expiry <= 30
                                    ? 'bg-rose-500/20 text-rose-400'
                                    : b.days_to_expiry <= 90
                                      ? 'bg-amber-500/20 text-amber-400'
                                      : 'bg-emerald-500/20 text-emerald-400'
                                }`}>
                                  {b.days_to_expiry} days left
                                </span>
                              </div>
                            </div>

                            <div className="pt-2 mt-2 border-t border-slate-800/40 flex items-center justify-between">
                              <span className="text-[10px] text-slate-400">Lot Stock:</span>
                              <span className="font-bold font-mono text-xs text-emerald-400">
                                {b.stock_quantity} units
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

            </div>

            {/* RIGHT: Cashier Checkout Register & Receipt Drawer */}
            <div className="lg:col-span-5 xl:col-span-5 2xl:col-span-4 space-y-5 sticky top-24">
              
              {/* Cashier Register Card */}
              <div className={`p-5 sm:p-6 rounded-3xl border space-y-4 ${
                isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
              }`}>
                {/* Register Header */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-800/40">
                  <div className="flex items-center gap-2">
                    <Receipt className="w-5 h-5 text-emerald-400 stroke-[2.4]" />
                    <div>
                      <h3 className={`text-sm font-black uppercase tracking-wider ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        Counter Register
                      </h3>
                      <span className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        Prescription Bill & Receipt Drawer
                      </span>
                    </div>
                  </div>

                  {/* 1-Click Walk-in OTC Preset */}
                  <button
                    type="button"
                    onClick={handleQuickWalkIn}
                    className="px-2.5 py-1 rounded-xl bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 border border-teal-500/30 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                    title="Fill as Walk-in OTC Customer"
                  >
                    <Zap className="w-3 h-3" />
                    <span>Quick OTC</span>
                  </button>
                </div>

                {/* Patient Information Inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                  <div>
                    <label className={`font-bold block mb-1 text-[11px] ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      Patient / Customer Name
                    </label>
                    <div className="relative">
                      <User className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={patientName}
                        onChange={(e) => setPatientName(e.target.value)}
                        placeholder="e.g. Kasun Fernando"
                        className={`w-full pl-8 pr-2.5 py-2 rounded-xl border text-xs focus:outline-none focus:border-teal-500 ${
                          isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                        }`}
                      />
                    </div>
                  </div>

                  <div>
                    <label className={`font-bold block mb-1 text-[11px] ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      Doctor Rx Ref / SLMC #
                    </label>
                    <div className="relative">
                      <FileText className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={prescriptionRef}
                        onChange={(e) => setPrescriptionRef(e.target.value)}
                        placeholder="e.g. RX-2026-904"
                        className={`w-full pl-8 pr-2.5 py-2 rounded-xl border text-xs focus:outline-none focus:border-teal-500 ${
                          isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                        }`}
                      />
                    </div>
                  </div>
                </div>

                {/* Active Ring-Up Item Details & Tactile Quantity Elements */}
                {selectedDispenseMed ? (
                  <div className="space-y-4 pt-1">
                    
                    {/* Item Ticket Banner */}
                    <div className={`p-3 rounded-2xl border flex items-center justify-between gap-3 ${
                      isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'
                    }`}>
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-13 h-13 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1 shrink-0 flex items-center justify-center overflow-hidden shadow-2xs">
                          <img 
                            src={getMedicineProductImage(selectedDispenseMed)} 
                            alt={selectedDispenseMed.name} 
                            className="w-full h-full object-contain" 
                          />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`font-black text-xs ${isDark ? 'text-white' : 'text-slate-900'}`}>
                              {selectedDispenseMed.name}
                            </span>
                            <span className="text-[10px] font-bold px-1.5 rounded bg-teal-500/20 text-teal-400">
                              {selectedDispenseMed.dosage_form}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-400 block truncate mt-0.5">
                            {selectedDispenseMed.generic_name} • {selectedDispenseMed.strength || 'Standard'}
                          </span>
                          {selectedDispenseBatch && (
                            <span className="font-mono text-[10px] text-teal-400 block mt-0.5">
                              Lot: #{selectedDispenseBatch.batch_number} (Exp: {new Date(selectedDispenseBatch.expiry_date).toLocaleDateString()})
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-[10px] text-slate-400 block uppercase font-bold">Rate</span>
                        <span className="font-black text-sm text-emerald-400 font-mono">
                          Rs. {liveUnitPrice.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {/* Packaging Mode & Touch Quantity Elements */}
                    <div className="space-y-3">
                      
                      {/* Tablets & Capsules Mode Switches */}
                      {isTabletOrCapsule && (
                        <div className="space-y-3">
                          <div className={`p-1 rounded-xl border flex gap-1 ${
                            isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'
                          }`}>
                            <button
                              type="button"
                              onClick={() => setDispenseMode('card')}
                              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                dispenseMode === 'card'
                                  ? 'bg-teal-500 text-slate-950 shadow-xs'
                                  : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                              }`}
                            >
                              By Card / Strip
                            </button>
                            <button
                              type="button"
                              onClick={() => setDispenseMode('loose')}
                              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                dispenseMode === 'loose'
                                  ? 'bg-teal-500 text-slate-950 shadow-xs'
                                  : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                              }`}
                            >
                              Loose Tablets
                            </button>
                            <button
                              type="button"
                              onClick={() => setDispenseMode('pack')}
                              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                dispenseMode === 'pack'
                                  ? 'bg-teal-500 text-slate-950 shadow-xs'
                                  : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                              }`}
                            >
                              Full Box
                            </button>
                          </div>

                          {/* Card Presets & Stepper */}
                          {dispenseMode === 'card' && (
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-[11px] text-slate-400">
                                <span>Quick Cards Preset:</span>
                                <div className="flex items-center gap-1">
                                  <span>Tabs per card:</span>
                                  <input
                                    type="number"
                                    min="1"
                                    max="100"
                                    value={tabletsPerCard}
                                    onChange={(e) => setTabletsPerCard(Math.max(1, parseInt(e.target.value, 10) || 10))}
                                    className={`w-12 px-1 rounded text-center font-bold border text-xs ${
                                      isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                                    }`}
                                  />
                                </div>
                              </div>

                              <div className="grid grid-cols-5 gap-1.5">
                                {[1, 2, 3, 5, 10].map((num) => (
                                  <button
                                    key={num}
                                    type="button"
                                    onClick={() => setCardCount(num)}
                                    className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center ${
                                      cardCount === num
                                        ? 'bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 border-emerald-400 shadow-sm'
                                        : isDark
                                          ? 'bg-slate-950 hover:bg-slate-800 text-slate-300 border-slate-800'
                                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                                    }`}
                                  >
                                    {num} Card{num > 1 ? 's' : ''}
                                  </button>
                                ))}
                              </div>

                              {/* Stepper */}
                              <div className="flex items-center justify-between pt-1">
                                <span className="text-[11px] text-slate-400">Custom Cards:</span>
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => setCardCount(Math.max(1, cardCount - 1))}
                                    className={`w-8 h-8 rounded-xl border flex items-center justify-center font-bold text-sm cursor-pointer ${
                                      isDark ? 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-white' : 'bg-slate-100 border-slate-300 hover:bg-slate-200 text-slate-900'
                                    }`}
                                  >
                                    <Minus className="w-3.5 h-3.5" />
                                  </button>
                                  <input
                                    type="number"
                                    min="1"
                                    value={cardCount}
                                    onChange={(e) => setCardCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
                                    className={`w-14 h-8 rounded-xl text-center font-bold text-xs border ${
                                      isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                                    }`}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setCardCount(cardCount + 1)}
                                    className={`w-8 h-8 rounded-xl border flex items-center justify-center font-bold text-sm cursor-pointer ${
                                      isDark ? 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-white' : 'bg-slate-100 border-slate-300 hover:bg-slate-200 text-slate-900'
                                    }`}
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Loose Presets & Stepper */}
                          {dispenseMode === 'loose' && (
                            <div className="space-y-2">
                              <span className="text-[11px] text-slate-400 block">Quick Loose Tablets Preset:</span>
                              <div className="flex flex-wrap gap-1.5">
                                {[1, 2, 5, 10, 14, 20, 28, 30].map((qty) => (
                                  <button
                                    key={qty}
                                    type="button"
                                    onClick={() => setLooseCount(qty)}
                                    className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                                      looseCount === qty
                                        ? 'bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 border-emerald-400 shadow-sm'
                                        : isDark
                                          ? 'bg-slate-950 hover:bg-slate-800 text-slate-300 border-slate-800'
                                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                                    }`}
                                  >
                                    {qty} tabs
                                  </button>
                                ))}
                              </div>

                              <div className="flex items-center justify-between pt-1">
                                <span className="text-[11px] text-slate-400">Custom Loose Count:</span>
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => setLooseCount(Math.max(1, looseCount - 1))}
                                    className={`w-8 h-8 rounded-xl border flex items-center justify-center font-bold text-sm cursor-pointer ${
                                      isDark ? 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-white' : 'bg-slate-100 border-slate-300 hover:bg-slate-200 text-slate-900'
                                    }`}
                                  >
                                    <Minus className="w-3.5 h-3.5" />
                                  </button>
                                  <input
                                    type="number"
                                    min="1"
                                    value={looseCount}
                                    onChange={(e) => setLooseCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
                                    className={`w-16 h-8 rounded-xl text-center font-bold text-xs border ${
                                      isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                                    }`}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setLooseCount(looseCount + 1)}
                                    className={`w-8 h-8 rounded-xl border flex items-center justify-center font-bold text-sm cursor-pointer ${
                                      isDark ? 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-white' : 'bg-slate-100 border-slate-300 hover:bg-slate-200 text-slate-900'
                                    }`}
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Full Pack Mode */}
                          {dispenseMode === 'pack' && (
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-[11px] text-slate-400">
                                <span>Packs:</span>
                                <div className="flex items-center gap-1">
                                <span>Units/pack:</span>
                                <input
                                  type="number"
                                  min="1"
                                  value={unitsPerPack}
                                  onChange={(e) => setUnitsPerPack(Math.max(1, parseInt(e.target.value, 10) || 30))}
                                  className={`w-12 px-1 rounded text-center font-bold border text-xs ${
                                    isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                                  }`}
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-4 gap-1.5">
                              {[1, 2, 3, 5].map((pk) => (
                                <button
                                  key={pk}
                                  type="button"
                                  onClick={() => setPackCount(pk)}
                                  className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center ${
                                    packCount === pk
                                      ? 'bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 border-emerald-400 shadow-sm'
                                      : isDark
                                        ? 'bg-slate-950 hover:bg-slate-800 text-slate-300 border-slate-800'
                                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                                  }`}
                                >
                                  {pk} Pack{pk > 1 ? 's' : ''}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Syrups & Liquids */}
                    {isLiquidOrSyrup && (
                      <div className="space-y-2">
                        <span className="text-[11px] text-slate-400 block">Select Bottle Count:</span>
                        <div className="grid grid-cols-5 gap-1.5">
                          {[1, 2, 3, 4, 5].map((btl) => (
                            <button
                              key={btl}
                              type="button"
                              onClick={() => setBottleCount(btl)}
                              className={`py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center ${
                                bottleCount === btl
                                  ? 'bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 border-emerald-400 shadow-sm'
                                  : isDark
                                    ? 'bg-slate-950 hover:bg-slate-800 text-slate-300 border-slate-800'
                                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                              }`}
                            >
                              {btl} Bottle{btl > 1 ? 's' : ''}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Injections & Vials */}
                    {isInjection && (
                      <div className="space-y-2">
                        <span className="text-[11px] text-slate-400 block">Select Vial / Ampoule Count:</span>
                        <div className="grid grid-cols-4 gap-1.5">
                          {[1, 2, 5, 10].map((v) => (
                            <button
                              key={v}
                              type="button"
                              onClick={() => setVialCount(v)}
                              className={`py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center ${
                                vialCount === v
                                  ? 'bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 border-emerald-400 shadow-sm'
                                  : isDark
                                    ? 'bg-slate-950 hover:bg-slate-800 text-slate-300 border-slate-800'
                                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                              }`}
                            >
                              {v} Vial{v > 1 ? 's' : ''}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Creams & Topicals */}
                    {isTopical && (
                      <div className="space-y-2">
                        <span className="text-[11px] text-slate-400 block">Select Tube Count:</span>
                        <div className="grid grid-cols-3 gap-1.5">
                          {[1, 2, 3].map((tb) => (
                            <button
                              key={tb}
                              type="button"
                              onClick={() => setTubeCount(tb)}
                              className={`py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center ${
                                tubeCount === tb
                                  ? 'bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 border-emerald-400 shadow-sm'
                                  : isDark
                                    ? 'bg-slate-950 hover:bg-slate-800 text-slate-300 border-slate-800'
                                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                              }`}
                            >
                              {tb} Tube{tb > 1 ? 's' : ''}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Inhalers */}
                    {isInhaler && (
                      <div className="space-y-2">
                        <span className="text-[11px] text-slate-400 block">Select Canister Count:</span>
                        <div className="grid grid-cols-2 gap-1.5">
                          {[1, 2].map((inh) => (
                            <button
                              key={inh}
                              type="button"
                              onClick={() => setInhalerCount(inh)}
                              className={`py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center ${
                                inhalerCount === inh
                                  ? 'bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 border-emerald-400 shadow-sm'
                                  : isDark
                                    ? 'bg-slate-950 hover:bg-slate-800 text-slate-300 border-slate-800'
                                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                              }`}
                            >
                              {inh} Canister{inh > 1 ? 's' : ''}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Other Forms */}
                    {!isTabletOrCapsule && !isLiquidOrSyrup && !isInjection && !isTopical && !isInhaler && (
                      <div className="space-y-2">
                        <span className="text-[11px] text-slate-400 block">Select Quantity:</span>
                        <div className="flex flex-wrap gap-1.5">
                          {[1, 2, 3, 5, 10].map((q) => (
                            <button
                              key={q}
                              type="button"
                              onClick={() => setLooseCount(q)}
                              className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                                looseCount === q
                                  ? 'bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 border-emerald-400 shadow-sm'
                                  : isDark
                                    ? 'bg-slate-950 hover:bg-slate-800 text-slate-300 border-slate-800'
                                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                              }`}
                            >
                              {q} Units
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                  </div>

                  {/* Stock Validation Check & Calculation Summary Card */}
                  <div className={`p-3.5 rounded-2xl border space-y-2 ${
                    isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">Packaging Format:</span>
                      <strong className="text-teal-400 truncate max-w-[200px]">{packagingDescription}</strong>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">Total Deducted Units:</span>
                      <strong className={`font-mono ${isDark ? 'text-white' : 'text-slate-900'}`}>{calculatedDispenseUnits} units</strong>
                    </div>

                    {selectedDispenseBatch && (
                      calculatedDispenseUnits > selectedDispenseBatch.stock_quantity ? (
                        <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-[11px] flex items-center gap-1.5">
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          <span>Requested ({calculatedDispenseUnits}) exceeds lot stock ({selectedDispenseBatch.stock_quantity}).</span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between text-[11px] text-slate-400">
                          <span>Remaining in lot:</span>
                          <strong className="text-emerald-400 font-mono">
                            {selectedDispenseBatch.stock_quantity - calculatedDispenseUnits} units
                          </strong>
                        </div>
                      )
                    )}
                  </div>

                  {/* Live Total Bill */}
                  <div className={`p-4 rounded-2xl border text-center ${
                    isDark ? 'bg-emerald-950/20 border-emerald-500/30' : 'bg-emerald-50 border-emerald-200'
                  }`}>
                    <span className="text-[11px] uppercase tracking-wider font-bold text-slate-400 block">
                      Total Amount Payable
                    </span>
                    <span className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono block mt-0.5">
                      Rs. {liveTotalBill.toFixed(2)}
                    </span>
                  </div>

                  {/* Payment Method Selector (Pay by Cash default, or Card) */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-bold">
                      <span className={isDark ? 'text-slate-300' : 'text-slate-700'}>Payment Method</span>
                      <span className="text-[10px] text-teal-400 font-mono">
                        {dispensePaymentMethod === 'CASH' ? 'Cash Counter' : 'Card Terminal'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        id="pos-pay-cash-btn"
                        onClick={() => setDispensePaymentMethod('CASH')}
                        className={`py-2.5 px-3 rounded-2xl border text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                          dispensePaymentMethod === 'CASH'
                            ? 'bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 border-emerald-400 shadow-md shadow-emerald-500/20 font-black'
                            : isDark
                              ? 'bg-slate-950 hover:bg-slate-800 text-slate-400 border-slate-800'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200'
                        }`}
                      >
                        <Banknote className="w-4 h-4 stroke-[2.4]" />
                        <span>Cash (Default)</span>
                      </button>

                      <button
                        type="button"
                        id="pos-pay-card-btn"
                        onClick={() => setDispensePaymentMethod('CARD')}
                        className={`py-2.5 px-3 rounded-2xl border text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                          dispensePaymentMethod === 'CARD'
                            ? 'bg-gradient-to-r from-sky-500 to-indigo-500 text-white border-sky-400 shadow-md shadow-sky-500/20 font-black'
                            : isDark
                              ? 'bg-slate-950 hover:bg-slate-800 text-slate-400 border-slate-800'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200'
                        }`}
                      >
                        <CreditCard className="w-4 h-4 stroke-[2.4]" />
                        <span>Pay by Card</span>
                      </button>
                    </div>
                  </div>

                  {/* Checkout Button */}
                  <button
                    type="button"
                    onClick={handleQuickDispense}
                    disabled={
                      dispenseLoading || 
                       !dispenseBatchId || 
                      (selectedDispenseBatch && calculatedDispenseUnits > selectedDispenseBatch.stock_quantity)
                    }
                    className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/25 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Receipt className="w-4 h-4 stroke-[2.5]" />
                    <span>
                      {dispenseLoading 
                        ? 'Dispensing Transaction...' 
                        : `Confirm & Dispense (${dispensePaymentMethod === 'CARD' ? 'CARD' : 'CASH'} • Rs. ${liveTotalBill.toFixed(2)})`
                      }
                    </span>
                  </button>

                </div>
              ) : (
                /* Empty state when no item selected */
                <div className="py-12 text-center text-slate-500 space-y-3">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto ${
                    isDark ? 'bg-slate-950 text-slate-600' : 'bg-slate-100 text-slate-400'
                  }`}>
                    <ShoppingBag className="w-7 h-7" />
                  </div>
                  <div>
                    <p className={`font-black text-sm ${isDark ? 'text-slate-300' : 'text-slate-800'}`}>
                      No Item Selected
                    </p>
                    <p className="text-xs text-slate-400 max-w-xs mx-auto mt-1">
                      Tap any medicine tile from the catalog on the left to start prescription ring-up.
                    </p>
                  </div>
                </div>
              )}

            </div>

            {/* Receipt Voucher / Confirmation Area */}
            {dispenseSuccess && (
              <div className={`p-5 rounded-3xl border-2 space-y-4 text-xs animate-in fade-in duration-200 ${
                isDark ? 'bg-slate-950 border-emerald-500/40 text-white' : 'bg-white border-emerald-600/40 text-slate-900 shadow-md'
              }`}>
                <div className="flex items-center justify-between pb-3 border-b border-emerald-500/20">
                  <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Sale Dispensed & Recorded</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDispenseSuccess(null)}
                    className="px-2.5 py-1 rounded-lg border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 text-[11px] font-bold cursor-pointer"
                  >
                    Next Customer
                  </button>
                </div>

                <div className="text-center space-y-1">
                  <span className="font-black text-base text-emerald-400 block">
                    MY PHARMACIST DISPENSARY
                  </span>
                  <span className="text-[11px] text-slate-400 block">
                    Invoice: <strong className="font-mono text-emerald-400">{dispenseSuccess.invoiceNumber}</strong>
                  </span>
                  <span className="text-[11px] text-slate-400 block">
                    {dispenseSuccess.date}
                  </span>
                </div>

                <div className="space-y-1.5 py-2 border-y border-dashed border-slate-800">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Patient:</span>
                    <strong className={isDark ? 'text-white' : 'text-slate-900'}>{dispenseSuccess.patientName}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Doctor Rx:</span>
                    <span className={`font-mono ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{dispenseSuccess.prescriptionRef}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Medication:</span>
                    <strong className="text-teal-400">{dispenseSuccess.medicineName}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Lot / Batch:</span>
                    <span className={`font-mono ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>#{dispenseSuccess.batchNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Packaging:</span>
                    <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{dispenseSuccess.packagingSummary}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Units Deducted:</span>
                    <span className={`font-mono ${isDark ? 'text-white' : 'text-slate-900'}`}>{dispenseSuccess.quantity} units</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Payment Mode:</span>
                    <span className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] uppercase ${
                      dispenseSuccess.paymentMethod === 'CARD'
                        ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                        : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    }`}>
                      {dispenseSuccess.paymentMethod || 'CASH'}
                    </span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-slate-800 text-sm">
                    <span className="font-bold">TOTAL PAID:</span>
                    <strong className="text-emerald-400 font-mono font-black">
                      Rs. {Number(dispenseSuccess.totalBill).toFixed(2)}
                    </strong>
                  </div>
                </div>

                <div className="pt-1 flex gap-2">
                  <button
                    type="button"
                    onClick={() => handlePrintReceiptSlip(dispenseSuccess)}
                    className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer shadow-md transition-all"
                  >
                    <Printer className="w-4 h-4 stroke-[2.4]" />
                    <span>Print Receipt Slip</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDispenseSuccess(null)}
                    className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:text-white font-bold text-xs cursor-pointer"
                  >
                    New Bill
                  </button>
                </div>
              </div>
            )}

          </div>

        </div>

      </div>
    )}

      {/* TAB 3: MEDICINES CATALOG MASTER */}
      {activeTab === 'medicines' && (
        <div className={`p-6 rounded-3xl border space-y-4 ${
          isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
        }`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Pharmaceutical Catalog Master Records
              </h2>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Master formulary containing all approved medical preparations and reorder thresholds.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={medSearch}
                  onChange={(e) => setMedSearch(e.target.value)}
                  placeholder="Filter medicines..."
                  className={`pl-9 pr-3 py-1.5 rounded-xl border text-xs focus:outline-none ${
                    isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
              </div>

              <button
                onClick={() => setIsNewMedModalOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
                Add Medicine
              </button>
            </div>
          </div>

          {/* Quick Offer & Stock Filters */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">
                Filter:
              </span>
              {[
                { id: 'all', label: `All Formulations (${medicines.length})` },
                { id: 'offers', label: `🔥 Active Offers (${medicines.filter(m => m.is_offer && Number(m.discount_percent) > 0).length})`, isHighlight: true },
                { id: 'regular', label: `Regular Pricing (${medicines.filter(m => !m.is_offer || Number(m.discount_percent) <= 0).length})` }
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setMedOfferFilter(tab.id)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                    medOfferFilter === tab.id
                      ? tab.isHighlight 
                        ? 'bg-rose-500 text-white border-rose-400 shadow-sm'
                        : 'bg-teal-600 text-white border-teal-500 shadow-sm'
                      : isDark
                        ? 'bg-slate-950 text-slate-400 hover:text-white border-slate-800'
                        : 'bg-slate-50 text-slate-600 hover:text-slate-900 border-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="text-[11px] text-slate-400 font-medium">
              Showing <strong className={isDark ? 'text-white' : 'text-slate-900'}>{filteredMeds.length}</strong> items
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className={`border-b uppercase tracking-wider text-[10px] font-bold ${
                isDark ? 'bg-slate-950/60 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
              }`}>
                <tr>
                  <th className="py-3 px-3">ID</th>
                  <th className="py-3 px-3">Trade Name</th>
                  <th className="py-3 px-3">Generic Chemical</th>
                  <th className="py-3 px-3">Manufacturer</th>
                  <th className="py-3 px-3">Category</th>
                  <th className="py-3 px-3">Form & Strength</th>
                  <th className="py-3 px-3">Available Stock</th>
                  <th className="py-3 px-3">Unit Price</th>
                  <th className="py-3 px-3">Offer Status</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className={`divide-y text-xs ${
                isDark ? 'divide-slate-800 text-slate-300' : 'divide-slate-200 text-slate-700'
              }`}>
                {filteredMeds.map((m) => (
                  <tr key={m.medicine_id} className={isDark ? 'hover:bg-slate-850/40' : 'hover:bg-slate-50'}>
                    <td className="py-3 px-3 font-mono text-slate-400">#{m.medicine_id}</td>
                    <td className={`py-3 px-3 font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-0.5 shrink-0 overflow-hidden flex items-center justify-center shadow-2xs">
                          <img 
                            src={getMedicineProductImage(m)} 
                            alt={m.name} 
                            className="w-full h-full object-contain" 
                            loading="lazy" 
                          />
                        </div>
                        <span>{m.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 italic text-slate-400">{m.generic_name}</td>
                    <td className="py-3 px-3">{m.brand_name}</td>
                    <td className="py-3 px-3 text-teal-500 font-medium">{m.category_name}</td>
                    <td className="py-3 px-3">{m.dosage_form} ({m.strength})</td>
                    <td className="py-3 px-3 font-bold">
                      <span className={`px-2 py-0.5 rounded-md ${
                        m.total_saleable_stock <= 0 ? 'bg-rose-500/10 text-rose-500' :
                        m.total_saleable_stock <= m.low_stock_threshold ? 'bg-amber-500/10 text-amber-500' :
                        'bg-emerald-500/10 text-emerald-500'
                      }`}>
                        {m.total_saleable_stock} units
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-emerald-500">
                      Rs. {Number(m.unit_price).toFixed(2)}
                    </td>
                    <td className="py-3 px-3">
                      {m.is_offer && Number(m.discount_percent) > 0 ? (
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 flex items-center gap-1 shadow-2xs">
                            <Flame className="w-3 h-3 text-rose-500 animate-pulse" />
                            <span>-{Number(m.discount_percent)}% OFF</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => handleOpenOfferModal(m)}
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold cursor-pointer transition-colors ${
                              isDark ? 'bg-slate-800 hover:bg-slate-700 text-teal-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                            }`}
                            title="Edit discount rate or deactivate offer"
                          >
                            Edit
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleOpenOfferModal(m)}
                          className="px-2.5 py-1 rounded-lg text-[10px] font-bold border border-dashed border-slate-300 dark:border-slate-700 text-slate-400 hover:border-amber-400 hover:text-amber-500 dark:hover:text-amber-400 transition-colors cursor-pointer inline-flex items-center gap-1"
                        >
                          <Plus className="w-2.5 h-2.5" />
                          <span>Make Offer</span>
                        </button>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenOfferModal(m)}
                          className={`p-1.5 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                            m.is_offer 
                              ? 'bg-rose-500/10 text-rose-500 hover:bg-rose-500/20' 
                              : isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                          }`}
                          title="Configure Promotional Offer"
                        >
                          <Flame className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEditMedicine(m)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer inline-flex items-center gap-1 ${
                            isDark ? 'bg-slate-800 hover:bg-slate-700 text-teal-300' : 'bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200'
                          }`}
                        >
                          <Edit className="w-3 h-3" />
                          <span>Edit</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: BATCH & EXPIRY RECORDS */}
      {activeTab === 'batches' && (
        <div className={`p-6 rounded-3xl border space-y-5 ${
          isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
        }`}>
          {/* Section Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-teal-500" />
                <h2 className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Physical Batch Inventory & Expiry Records
                </h2>
              </div>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'} mt-0.5`}>
                Tracks individual lot numbers, manufacture and expiry dates, quarantine holdings, and certified disposal protocols.
              </p>
            </div>

            <div className="flex items-center gap-3 pr-2 sm:pr-4">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={batchSearch}
                  onChange={(e) => setBatchSearch(e.target.value)}
                  placeholder="Filter lot / formulation / supplier..."
                  className={`pl-9 pr-3 py-1.5 rounded-xl border text-xs focus:outline-none ${
                    isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
              </div>

              <button
                onClick={() => setIsNewBatchModalOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md shadow-teal-600/20 transition-all shrink-0 mr-2 sm:mr-3"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
                Receive Batch
              </button>
            </div>
          </div>

          {/* Expired Stock Emergency Action Banner */}
          {expiredWithStockCount > 0 && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs animate-in fade-in duration-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-rose-600/30 animate-pulse">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-black text-rose-600 dark:text-rose-400 text-sm flex items-center gap-2">
                    Action Required: {expiredWithStockCount} Expired Medicine Batch Lot(s) In Stock
                  </h4>
                  <p className="text-slate-600 dark:text-slate-300 mt-0.5 text-[11px] leading-relaxed">
                    Under pharmacy compliance policy, these lots are automatically locked out of counter POS dispensing. Pharmacists must quarantine, return to supplier, or complete certified disposal.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setBatchFilter('expired')}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs shrink-0 cursor-pointer shadow-md shadow-rose-600/20 flex items-center gap-1.5 transition-all"
              >
                <ShieldAlert className="w-4 h-4" />
                <span>View Expired Lots ({expiredWithStockCount})</span>
              </button>
            </div>
          )}


          {/* Filter Chips Bar */}
          <div className="flex flex-wrap items-center gap-2 pt-1 border-b pb-3 border-slate-200 dark:border-slate-800">
            {[
              { id: 'all', label: 'All Lots', count: batches.length },
              { id: 'expiring_soon', label: 'Expiring Soon (≤90d)', count: expiringSoonCount, isWarning: expiringSoonCount > 0 },
              { id: 'critical', label: 'Critical (≤30d)', count: criticalBatchesCount, isDanger: criticalBatchesCount > 0 },
              { id: 'expired', label: 'Expired Lots', count: expiredBatchesCount, isDanger: expiredWithStockCount > 0 },
              { id: 'active', label: 'Active Safe (>90d)', count: activeSaleableBatchesCount },
              { id: 'quarantined', label: 'Quarantined', count: quarantinedBatchesCount },
              { id: 'depleted', label: 'Depleted Stock', count: depletedBatchesCount },
            ].map((f) => {
              const isActive = batchFilter === f.id;
              return (
                <button
                  key={f.id}
                  onClick={() => setBatchFilter(f.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border ${
                    isActive
                      ? f.id === 'expired' || f.id === 'critical'
                        ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                        : f.id === 'expiring_soon'
                          ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                          : 'bg-teal-600 text-white border-teal-600 shadow-sm'
                      : isDark
                        ? 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-900'
                        : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <span>{f.label}</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-black ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : f.isDanger
                        ? 'bg-rose-500 text-white animate-pulse'
                        : f.isWarning
                          ? 'bg-amber-400 text-slate-950 font-bold'
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}>
                    {f.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Batches Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className={`border-b uppercase tracking-wider text-[10px] font-bold ${
                isDark ? 'bg-slate-950/60 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
              }`}>
                <tr>
                  <th className="py-3 px-3">Batch / Lot #</th>
                  <th className="py-3 px-3">Medicine Formulation</th>
                  <th className="py-3 px-3">Supplier Chain</th>
                  <th className="py-3 px-3">Mfg Date</th>
                  <th className="py-3 px-3">Expiry Date</th>
                  <th className="py-3 px-3">Time Remaining</th>
                  <th className="py-3 px-3">Stock Units</th>
                  <th className="py-3 px-3">Status & Regulatory State</th>
                  <th className="py-3 px-3 text-right">Action Protocol</th>
                </tr>
              </thead>
              <tbody className={`divide-y text-xs ${
                isDark ? 'divide-slate-800 text-slate-300' : 'divide-slate-200 text-slate-700'
              }`}>
                {filteredBatches.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="py-8 text-center text-slate-400 italic">
                      No inventory batches match the selected filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredBatches.map((b) => {
                    const isPastExpiryActive = isBatchExpired(b) && b.status === 'active' && b.stock_quantity > 0;
                    const isCalendarExpired = isBatchExpired(b);
                    const isQuarantined = isBatchQuarantined(b);
                    const isCritical = isBatchCritical(b);
                    const isExpiringSoon = isBatchExpiringSoon(b);
                    const isDepleted = isBatchDepleted(b);

                    return (
                      <tr 
                        key={b.batch_id} 
                        className={`transition-colors ${
                          isPastExpiryActive
                            ? isDark ? 'bg-rose-950/20 hover:bg-rose-950/30' : 'bg-rose-50/70 hover:bg-rose-100/70'
                            : isQuarantined
                              ? isDark ? 'bg-amber-950/15 hover:bg-amber-950/25' : 'bg-amber-50/70 hover:bg-amber-100/70'
                              : isDark ? 'hover:bg-slate-850/40' : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="py-3 px-3 font-mono text-teal-600 dark:text-teal-400 font-bold">
                          #{b.batch_number}
                        </td>
                        <td className="py-3 px-3">
                          <span className={`font-bold block ${isDark ? 'text-white' : 'text-slate-900'}`}>{b.medicine_name}</span>
                          <span className="text-[10px] text-slate-400 block truncate max-w-xs">{b.generic_name}</span>
                        </td>
                        <td className="py-3 px-3 text-slate-400">{b.supplier_name}</td>
                        <td className="py-3 px-3 text-slate-400">{new Date(b.manufacture_date).toLocaleDateString()}</td>
                        <td className="py-3 px-3">
                          <span className={`font-medium ${isCalendarExpired ? 'text-rose-600 dark:text-rose-400 font-bold' : ''}`}>
                            {new Date(b.expiry_date).toLocaleDateString()}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          {isCalendarExpired ? (
                            <span className="px-2 py-0.5 rounded-md font-mono text-[10px] font-black uppercase bg-rose-500 text-white">
                              Expired
                            </span>
                          ) : (
                            <span className={`px-2 py-0.5 rounded-md font-mono text-[11px] font-bold ${
                              b.days_to_expiry <= 30 ? 'bg-rose-500/10 text-rose-500' :
                              b.days_to_expiry <= 90 ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 font-black' :
                              'bg-emerald-500/10 text-emerald-500'
                            }`}>
                              {b.days_to_expiry} days
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 font-mono">
                          <span className={`font-bold ${isPastExpiryActive ? 'text-rose-600 dark:text-rose-400' : ''}`}>
                            {b.stock_quantity}
                          </span>
                          <span className="text-slate-400"> / {b.quantity_received}</span>
                        </td>
                        <td className="py-3 px-3">
                          {isPastExpiryActive ? (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-rose-500 text-white shadow-xs flex items-center gap-1 w-fit animate-pulse">
                              <AlertTriangle className="w-3 h-3" />
                              EXPIRED (LOCKED)
                            </span>
                          ) : isCalendarExpired ? (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-rose-500/10 text-rose-500 border border-rose-500/20 flex items-center gap-1 w-fit">
                              <AlertTriangle className="w-3 h-3" />
                              EXPIRED
                            </span>
                          ) : isQuarantined ? (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-purple-500/20 text-purple-600 dark:text-purple-300 border border-purple-500/30 flex items-center gap-1 w-fit">
                              <Shield className="w-3 h-3" />
                              QUARANTINED
                            </span>
                          ) : isCritical ? (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 flex items-center gap-1 w-fit animate-pulse">
                              <Clock className="w-3 h-3" />
                              CRITICAL (≤30D)
                            </span>
                          ) : isExpiringSoon ? (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 flex items-center gap-1 w-fit">
                              <Clock className="w-3 h-3" />
                              EXPIRING (≤90D)
                            </span>
                          ) : isDepleted ? (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-slate-800 text-slate-400">
                              DEPLETED
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center gap-1 w-fit">
                              <CheckCircle2 className="w-3 h-3" />
                              SALEABLE
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenAdjustModal(b)}
                              className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition-colors cursor-pointer ${
                                isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                              }`}
                              title="Adjust stock quantity, expiry date, or manufacturing schedule"
                            >
                              Adjust
                            </button>
                            {isPastExpiryActive ? (
                              <button
                                onClick={() => handleOpenBatchActionModal(b, 'QUARANTINE')}
                                className="px-3 py-1.5 rounded-xl text-xs font-black bg-rose-600 hover:bg-rose-500 text-white shadow-sm flex items-center gap-1.5 cursor-pointer transition-all animate-pulse"
                                title="Quarantine, update expiry, dispose, or return expired lot"
                              >
                                <AlertTriangle className="w-3.5 h-3.5" />
                                <span>Resolve Expiry</span>
                              </button>
                            ) : isQuarantined ? (
                              <button
                                onClick={() => handleOpenBatchActionModal(b, 'DISPOSE')}
                                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center gap-1.5 cursor-pointer transition-all shadow-xs"
                                title="Dispose, return, or reactivate quarantined lot"
                              >
                                <Shield className="w-3.5 h-3.5" />
                                <span>Disposal Action</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => handleOpenBatchActionModal(b, 'QUARANTINE')}
                                className={`p-1.5 rounded-xl text-slate-400 hover:text-amber-500 transition-colors cursor-pointer ${
                                  isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'
                                }`}
                                title="Quarantine safety action"
                              >
                                <Shield className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: OPERATIONAL REPORTS & FINANCIAL ANALYTICS */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          {/* Section Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className={`text-lg font-black flex items-center gap-2.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                <BarChart3 className="w-5 h-5 text-teal-500" />
                Operational Reports & Financial Analytics
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Multi-timeline revenue intelligence, formulary turnover volume, and operational audit history
              </p>
            </div>

            {/* Export & Action Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleExportReportCSV}
                className="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-md shadow-teal-600/20 transition-all"
                title="Export active table to Excel / CSV spreadsheet"
              >
                <Download className="w-3.5 h-3.5" />
                Export CSV
              </button>

              <button
                onClick={() => {
                  if (reportTimeline === 'all') {
                    loadDashboardData();
                  } else {
                    handleTimelinePreset(reportTimeline);
                  }
                }}
                disabled={timelineLoading}
                className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer border transition-colors ${
                  isDark ? 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${timelineLoading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>

          {/* Timeline Filter Toolbar */}
          <div className={`p-4 rounded-2xl border space-y-3 ${
            isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
          }`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                <CalendarRange className="w-4 h-4 text-teal-500" />
                <span>Timeline Filter:</span>
              </div>

              {/* Preset buttons */}
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { id: 'all', label: 'All Time' },
                  { id: 'today', label: 'Today' },
                  { id: '7days', label: 'Last 7 Days' },
                  { id: 'month', label: 'This Month' },
                  { id: '30days', label: 'Last 30 Days' },
                  { id: 'custom', label: 'Custom Range' }
                ].map((preset) => {
                  const isActive = reportTimeline === preset.id;
                  return (
                    <button
                      key={preset.id}
                      onClick={() => handleTimelinePreset(preset.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                        isActive
                          ? 'bg-teal-600 text-white shadow-xs'
                          : isDark
                          ? 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Range Picker */}
            {reportTimeline === 'custom' && (
              <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 dark:border-slate-800 animate-in fade-in duration-150">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">From:</span>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className={`px-2.5 py-1.5 rounded-lg border text-xs focus:outline-none focus:border-teal-500 ${
                      isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">To:</span>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className={`px-2.5 py-1.5 rounded-lg border text-xs focus:outline-none focus:border-teal-500 ${
                      isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
                <button
                  onClick={() => loadFilteredReports(customStartDate, customEndDate)}
                  disabled={!customStartDate && !customEndDate}
                  className="px-3.5 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white font-bold text-xs cursor-pointer shadow-xs transition-colors"
                >
                  Apply Timeline
                </button>
              </div>
            )}
          </div>

          {/* Sub-tab Navigation Bar */}
          <div className="flex flex-wrap items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
            {[
              { id: 'sales', label: 'Sales & Invoices', icon: TrendingUp },
              { id: 'bestsellers', label: 'Top-Selling Formulations', icon: Sparkles },
              { id: 'valuation', label: 'Inventory Valuation', icon: PieChart },
              { id: 'expiring', label: `Expired & Expiring Stock (${expiringList.length})`, icon: Clock },
              { id: 'audit', label: `Inventory Audit Trail (${auditLogs.length})`, icon: History }
            ].map((sub) => {
              const Icon = sub.icon;
              const isActive = reportSubTab === sub.id;
              return (
                <button
                  key={sub.id}
                  onClick={() => setReportSubTab(sub.id)}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-all ${
                    isActive
                      ? 'bg-teal-600 text-white shadow-md shadow-teal-600/20'
                      : isDark
                      ? 'bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-800'
                      : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {sub.label}
                </button>
              );
            })}
          </div>

          {/* SUB-TAB 1: SALES & INVOICES */}
          {reportSubTab === 'sales' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              {/* Financial Performance KPI Ribbon for Active Timeline */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-xs'}`}>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Timeline Total Revenue</span>
                  <p className="text-xl sm:text-2xl font-black text-teal-600 dark:text-teal-400 font-mono mt-1">
                    Rs. {Number(
                      salesHistory.reduce((acc, s) => acc + (Number(s.total_amount) || 0), 0) ||
                      dailySales.reduce((acc, d) => acc + (Number(d.net_sales || d.total_amount || d.total_revenue || 0)), 0)
                    ).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    {reportTimeline === 'all' ? 'All-time accumulated income' : `Filtered: ${reportTimeline}`}
                  </span>
                </div>

                <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-xs'}`}>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Invoices & Receipts</span>
                  <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono mt-1">
                    {salesHistory.length > 0 ? salesHistory.length : dailySales.reduce((acc, d) => acc + (Number(d.sale_count || d.total_sales || 0)), 0)}
                  </p>
                  <span className="text-[11px] text-emerald-500 font-medium mt-1 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Transactions finalized</span>
                  </span>
                </div>

                <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-xs'}`}>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Average Bill Value</span>
                  <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono mt-1">
                    Rs. {salesHistory.length > 0 
                      ? (salesHistory.reduce((acc, s) => acc + (Number(s.total_amount) || 0), 0) / salesHistory.length).toLocaleString(undefined, { maximumFractionDigits: 0 }) 
                      : '0'}
                  </p>
                  <span className="text-[11px] text-slate-400 mt-1 block">Per-customer basket size</span>
                </div>

                <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-xs'}`}>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Payment Methods</span>
                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-500">
                      CASH: {salesHistory.filter(s => (s.payment_method || 'CASH') === 'CASH').length}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-sky-500/10 text-sky-500">
                      CARD: {salesHistory.filter(s => s.payment_method === 'CARD').length}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-500/10 text-purple-500">
                      ONLINE: {salesHistory.filter(s => s.payment_method === 'ONLINE').length}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block">Full payment reconciliation</span>
                </div>
              </div>

              {/* Daily Sales Aggregation */}
              <div className={`p-6 rounded-3xl border space-y-4 ${
                isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
              }`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className={`text-base font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      <TrendingUp className="w-4 h-4 text-teal-500" />
                      Daily Sales Summary
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Consolidated daily revenue summary with cash & card transaction breakdown
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className={`border-b uppercase tracking-wider text-[10px] font-bold ${
                      isDark ? 'bg-slate-950/60 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}>
                      <tr>
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3 text-center">Bills Issued</th>
                        <th className="py-2.5 px-3 text-right">Gross Sales</th>
                        <th className="py-2.5 px-3 text-right">Tax (VAT)</th>
                        <th className="py-2.5 px-3 text-right">Net Revenue</th>
                        <th className="py-2.5 px-3 text-right">Cash / Card</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y text-xs ${
                      isDark ? 'divide-slate-800 text-slate-300' : 'divide-slate-200 text-slate-700'
                    }`}>
                      {dailySales.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="py-6 text-center text-slate-500 italic">
                            No daily sales recorded yet. Complete sales in the POS counter to generate live view entries.
                          </td>
                        </tr>
                      ) : (
                        dailySales.map((d, idx) => (
                          <tr key={idx} className="hover:bg-teal-500/5 transition-colors">
                            <td className="py-2.5 px-3 font-semibold">
                              {new Date(d.sale_date || d.sale_day).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono font-bold">{d.sale_count || d.total_sales || d.total_transactions || 0}</td>
                            <td className="py-2.5 px-3 text-right font-mono font-semibold">
                              Rs. {Number(d.gross_sales || d.total_amount || d.total_revenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-slate-400">
                              Rs. {Number(d.total_tax || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-teal-600 dark:text-teal-400">
                              Rs. {Number(d.net_sales || d.total_net || d.total_revenue || d.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-[11px] text-slate-400">
                              Rs. {Number(d.cash_sales || 0).toFixed(0)} / Rs. {Number(d.card_sales || 0).toFixed(0)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Recent Sales History Log */}
              <div className={`p-6 rounded-3xl border space-y-4 ${
                isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
              }`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className={`text-base font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      <Receipt className="w-4 h-4 text-emerald-500" />
                      Recent POS Sales Invoices
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Atomic POS transactions committed with row-level pessimistic locking & database synchronization
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className={`border-b uppercase tracking-wider text-[10px] font-bold ${
                      isDark ? 'bg-slate-950/60 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}>
                      <tr>
                        <th className="py-2.5 px-3">Invoice #</th>
                        <th className="py-2.5 px-3">Date & Time</th>
                        <th className="py-2.5 px-3">Patient / Customer</th>
                        <th className="py-2.5 px-3">Cashier</th>
                        <th className="py-2.5 px-3 text-center">Items</th>
                        <th className="py-2.5 px-3 text-right">Net Total</th>
                        <th className="py-2.5 px-3 text-center">Payment</th>
                        <th className="py-2.5 px-3 text-center">Status</th>
                        <th className="py-2.5 px-3 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y text-xs ${
                      isDark ? 'divide-slate-800 text-slate-300' : 'divide-slate-200 text-slate-700'
                    }`}>
                      {salesHistory.length === 0 ? (
                        <tr>
                          <td colSpan="9" className="py-6 text-center text-slate-500 italic">
                            No POS sales records found.
                          </td>
                        </tr>
                      ) : (
                        salesHistory.map((s) => (
                          <tr key={s.sale_id} className="hover:bg-teal-500/5 transition-colors">
                            <td className="py-2.5 px-3 font-mono font-bold text-teal-600 dark:text-teal-400">
                              {s.invoice_number}
                            </td>
                            <td className="py-2.5 px-3 text-slate-400">
                              {new Date(s.sale_date).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td className="py-2.5 px-3 font-medium">
                              <span>{s.customer_name || s.patient_name || 'Walk-in'}</span>
                              {s.prescription_ref && s.prescription_ref !== 'OTC' && (
                                <span className="block text-[10px] text-teal-600 dark:text-teal-400 font-mono">Ref: {s.prescription_ref}</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-slate-400">
                              {s.cashier_name || 'Pharmacist'}
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono" title={s.items_summary || undefined}>
                              {s.item_count || 1}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                              Rs. {Number(s.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span className={`px-2 py-0.5 rounded-md font-mono text-[10px] font-bold ${
                                s.payment_method === 'CARD' ? 'bg-sky-500/10 text-sky-500' : 
                                s.payment_method === 'ONLINE' ? 'bg-purple-500/10 text-purple-500' : 
                                'bg-emerald-500/10 text-emerald-500'
                              }`}>
                                {s.payment_method || 'CASH'}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-500 text-[10px] font-bold uppercase">
                                {s.status || s.payment_status || 'COMPLETED'}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <button
                                onClick={() => handleOpenSaleInfo(s)}
                                className="px-3 py-1.5 rounded-xl bg-teal-500/10 hover:bg-teal-500/20 text-teal-600 dark:text-teal-400 font-bold text-xs inline-flex items-center gap-1.5 transition-all cursor-pointer border border-teal-500/20 shadow-xs hover:shadow-md hover:scale-[1.02] active:scale-95"
                                title="View complete transaction breakdown & medicine line items"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                View Info
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* SUB-TAB 2: TOP SELLING MEDICINES */}
          {reportSubTab === 'bestsellers' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className={`p-6 rounded-3xl border space-y-4 ${
                isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
              }`}>
                <div>
                  <h3 className={`text-base font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    Top Dispensed Medications
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Aggregated formulary volume and revenue rankings
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className={`border-b uppercase tracking-wider text-[10px] font-bold ${
                      isDark ? 'bg-slate-950/60 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}>
                      <tr>
                        <th className="py-2.5 px-3 text-center">Rank</th>
                        <th className="py-2.5 px-3">Formulation</th>
                        <th className="py-2.5 px-3">Generic Name</th>
                        <th className="py-2.5 px-3">Category</th>
                        <th className="py-2.5 px-3 text-center">Units Dispensed</th>
                        <th className="py-2.5 px-3 text-right">Total Revenue</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y text-xs ${
                      isDark ? 'divide-slate-800 text-slate-300' : 'divide-slate-200 text-slate-700'
                    }`}>
                      {bestSellers.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="py-6 text-center text-slate-500 italic">
                            No sales data recorded yet.
                          </td>
                        </tr>
                      ) : (
                        bestSellers.map((item, idx) => (
                          <tr key={idx} className="hover:bg-teal-500/5 transition-colors">
                            <td className="py-2.5 px-3 text-center">
                              <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full font-black text-[11px] ${
                                idx === 0 ? 'bg-amber-500 text-white shadow-xs' :
                                idx === 1 ? 'bg-slate-300 text-slate-800' :
                                idx === 2 ? 'bg-amber-700 text-white' :
                                'bg-slate-800/20 text-slate-500 font-mono'
                              }`}>
                                #{idx + 1}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">
                              {item.medicine_name || item.name}
                            </td>
                            <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400 italic">
                              {item.generic_name || '-'}
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="px-2 py-0.5 rounded-md bg-teal-500/10 text-teal-600 dark:text-teal-400 text-[10px] font-bold">
                                {item.category_name || 'General'}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono font-bold">
                              {item.total_units_sold || item.units_sold || 0}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-teal-600 dark:text-teal-400">
                              Rs. {Number(item.total_sales_amount || item.revenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* SUB-TAB 3: INVENTORY VALUATION */}
          {reportSubTab === 'valuation' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className={`p-5 rounded-2xl border ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'}`}>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Active SKUs</span>
                  <div className="text-2xl font-black mt-1 font-mono text-slate-900 dark:text-white">
                    {valuation?.active_medicines || stats?.total_medicines || medicines.length}
                  </div>
                  <span className="text-[11px] text-teal-500 font-medium mt-1 block">Approved formulary items</span>
                </div>

                <div className={`p-5 rounded-2xl border ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'}`}>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Physical Stock Count</span>
                  <div className="text-2xl font-black mt-1 font-mono text-teal-600 dark:text-teal-400">
                    {Number(valuation?.total_stock_units || batches.reduce((acc, b) => acc + (Number(b.stock_quantity) || 0), 0)).toLocaleString()}
                  </div>
                  <span className="text-[11px] text-slate-400 font-medium mt-1 block">Across all non-depleted lots</span>
                </div>

                <div className={`p-5 rounded-2xl border ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'}`}>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Wholesale Cost Value</span>
                  <div className="text-2xl font-black mt-1 font-mono text-slate-900 dark:text-white">
                    Rs. {Number(valuation?.total_inventory_cost || batches.reduce((acc, b) => acc + ((Number(b.stock_quantity) || 0) * (Number(b.unit_cost) || 0)), 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                  <span className="text-[11px] text-slate-400 font-medium mt-1 block">Capital invested in stock</span>
                </div>

                <div className={`p-5 rounded-2xl border ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'}`}>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Retail Valuation Potential</span>
                  <div className="text-2xl font-black mt-1 font-mono text-emerald-600 dark:text-emerald-400">
                    Rs. {Number(valuation?.total_retail_value || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                  <span className="text-[11px] text-emerald-500 font-semibold mt-1 block">
                    Gross Margin: {valuation?.margin_percentage ? `${valuation.margin_percentage}%` : 'Healthy markup'}
                  </span>
                </div>
              </div>

              {/* Formulary Stock Health Distribution */}
              <div className={`p-6 rounded-3xl border space-y-4 ${
                isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
              }`}>
                <h3 className={`text-base font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  <Activity className="w-4 h-4 text-teal-500" />
                  Stock Level & Risk Distribution
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                  <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
                    <span className="text-xs font-bold text-emerald-500 uppercase tracking-wider block">Normal Stock Level</span>
                    <div className="text-2xl font-mono font-black text-emerald-600 dark:text-emerald-400 mt-1">
                      {healthyStockCount} items
                    </div>
                    <span className="text-xs text-slate-400 mt-1 block">{healthyPercent}% of entire formulary</span>
                  </div>
                  <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5">
                    <span className="text-xs font-bold text-amber-500 uppercase tracking-wider block">Low Stock Alert</span>
                    <div className="text-2xl font-mono font-black text-amber-600 dark:text-amber-400 mt-1">
                      {lowStockCount} items
                    </div>
                    <span className="text-xs text-slate-400 mt-1 block">{lowPercent}% at or below reorder threshold</span>
                  </div>
                  <div className="p-4 rounded-xl border border-rose-500/20 bg-rose-500/5">
                    <span className="text-xs font-bold text-rose-500 uppercase tracking-wider block">Stock Depleted (Out of Stock)</span>
                    <div className="text-2xl font-mono font-black text-rose-600 dark:text-rose-400 mt-1">
                      {outOfStockCount} items
                    </div>
                    <span className="text-xs text-slate-400 mt-1 block">{outPercent}% require immediate supplier PO</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SUB-TAB 4: INVENTORY AUDIT TRAIL */}
          {reportSubTab === 'audit' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className={`p-6 rounded-3xl border space-y-4 ${
                isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
              }`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className={`text-base font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      <History className="w-4 h-4 text-emerald-500" />
                      Operational & Inventory Audit Trail
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Automated immutable record capturing every stock adjustment, shipment receipt, and counter dispensation
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20 shrink-0">
                    {auditLogs.length} logged events
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className={`border-b uppercase tracking-wider text-[10px] font-bold ${
                      isDark ? 'bg-slate-950/60 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}>
                      <tr>
                        <th className="py-2.5 px-3">Log ID</th>
                        <th className="py-2.5 px-3">Operation</th>
                        <th className="py-2.5 px-3">Target Record</th>
                        <th className="py-2.5 px-3">Prior Snapshot (Old State)</th>
                        <th className="py-2.5 px-3">Applied Snapshot (New State)</th>
                        <th className="py-2.5 px-3">Authorized Staff / Source</th>
                        <th className="py-2.5 px-3">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y text-xs ${
                      isDark ? 'divide-slate-800 text-slate-300' : 'divide-slate-200 text-slate-700'
                    }`}>
                      {auditLogs.length === 0 ? (
                        <tr>
                          <td colSpan="7" className="py-6 text-center text-slate-500 italic">
                            No audit trail entries found. Audit records will appear when batches are adjusted or dispensed.
                          </td>
                        </tr>
                      ) : (
                        auditLogs.map((log) => (
                          <tr key={log.log_id} className="hover:bg-teal-500/5 transition-colors">
                            <td className="py-2.5 px-3 font-mono text-slate-400 font-bold">#{log.log_id}</td>
                            <td className="py-2.5 px-3">
                              <span className={`px-2 py-0.5 rounded font-mono font-black text-[10px] ${
                                log.operation === 'INSERT' ? 'bg-emerald-500/10 text-emerald-500' :
                                log.operation === 'UPDATE' ? 'bg-sky-500/10 text-sky-500' :
                                'bg-rose-500/10 text-rose-500'
                              }`}>
                                {log.operation}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 font-mono font-bold text-teal-600 dark:text-teal-400">
                              {formatAuditRecord(log.table_name, log.record_id)}
                            </td>
                            <td className="py-2.5 px-3 max-w-xs">
                              {renderAuditState(log.old_value)}
                            </td>
                            <td className="py-2.5 px-3 max-w-xs">
                              {renderAuditState(log.new_value)}
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="font-mono text-[11px] text-slate-400">
                                {formatAuditCaller(log.performed_by)}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-slate-400 whitespace-nowrap">
                              {new Date(log.timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* SUB-TAB 5: EXPIRED & EXPIRING STOCK INTELLIGENCE REPORT */}
          {reportSubTab === 'expiring' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className={`p-6 rounded-3xl border space-y-4 ${
                isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
              }`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className={`text-base font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      <Clock className="w-4 h-4 text-rose-500" />
                      Expired & Expiring Stock Intelligence Report
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Regulatory compliance report detailing medicine formulations, lot numbers, expiry dates, remaining stock, and required protocols
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 shrink-0">
                    {expiringList.length} monitored lots
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className={`border-b uppercase tracking-wider text-[10px] font-bold ${
                      isDark ? 'bg-slate-950/60 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}>
                      <tr>
                        <th className="py-2.5 px-3">Urgency Status</th>
                        <th className="py-2.5 px-3">Lot Number</th>
                        <th className="py-2.5 px-3">Medicine Formulation</th>
                        <th className="py-2.5 px-3">Supplier Chain</th>
                        <th className="py-2.5 px-3">Expiry Date</th>
                        <th className="py-2.5 px-3">Days Left</th>
                        <th className="py-2.5 px-3">Remaining Stock</th>
                        <th className="py-2.5 px-3">Required Protocol Action</th>
                        <th className="py-2.5 px-3 text-right">Action Protocol</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y text-xs ${
                      isDark ? 'divide-slate-800 text-slate-300' : 'divide-slate-200 text-slate-700'
                    }`}>
                      {expiringList.length === 0 ? (
                        <tr>
                          <td colSpan="9" className="py-8 text-center text-slate-500 italic">
                            No batches currently nearing expiry or in quarantine. Inventory shelf-life is optimal.
                          </td>
                        </tr>
                      ) : (
                        expiringList.map((item) => {
                          const isQuarantined = item.urgency_level === 'QUARANTINED' || item.status === 'quarantined';
                          const isExpired = !isQuarantined && (item.urgency_level === 'EXPIRED' || Number(item.days_to_expiry) <= 0);
                          const isCritical = !isQuarantined && !isExpired && (item.urgency_level === 'CRITICAL' || (Number(item.days_to_expiry) > 0 && Number(item.days_to_expiry) <= 30));

                          return (
                            <tr key={item.batch_id} className="hover:bg-rose-500/5 transition-colors">
                              <td className="py-2.5 px-3">
                                {isExpired ? (
                                  <span className="px-2 py-0.5 rounded-md font-mono text-[10px] font-black uppercase bg-rose-500 text-white shadow-xs animate-pulse">
                                    EXPIRED
                                  </span>
                                ) : isQuarantined ? (
                                  <span className="px-2 py-0.5 rounded-md font-mono text-[10px] font-bold uppercase bg-amber-500/20 text-amber-500 border border-amber-500/30">
                                    QUARANTINED
                                  </span>
                                ) : isCritical ? (
                                  <span className="px-2 py-0.5 rounded-md font-mono text-[10px] font-bold uppercase bg-orange-500/10 text-orange-500 border border-orange-500/20">
                                    CRITICAL (≤30D)
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-md font-mono text-[10px] font-bold uppercase bg-teal-500/10 text-teal-600 border border-teal-500/20">
                                    EXPIRING SOON
                                  </span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 font-mono font-bold text-teal-600 dark:text-teal-400">
                                #{item.batch_number}
                              </td>
                              <td className="py-2.5 px-3">
                                <div className="font-bold text-slate-900 dark:text-white">{item.medicine_name}</div>
                                <div className="text-[10px] text-slate-400 truncate max-w-xs">{item.generic_name}</div>
                              </td>
                              <td className="py-2.5 px-3 text-slate-400">{item.supplier_name}</td>
                              <td className="py-2.5 px-3">
                                <span className={isExpired ? 'text-rose-600 dark:text-rose-400 font-bold' : ''}>
                                  {new Date(item.expiry_date).toLocaleDateString()}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 font-mono">
                                <span className={`px-2 py-0.5 rounded font-bold text-[11px] ${
                                  isExpired ? 'bg-rose-500/10 text-rose-600' :
                                  isCritical ? 'bg-amber-500/10 text-amber-600' :
                                  'bg-slate-100 dark:bg-slate-800 text-slate-400'
                                }`}>
                                  {item.days_to_expiry} days
                                </span>
                              </td>
                              <td className="py-2.5 px-3 font-mono font-black text-rose-600 dark:text-rose-400">
                                {item.stock_quantity} units
                              </td>
                              <td className="py-2.5 px-3">
                                <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300">
                                  {item.action_required || 'Monitor shelf rotation'}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={() => handleOpenAdjustModal(item)}
                                    className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition-colors cursor-pointer ${
                                      isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                                    }`}
                                    title="Adjust batch stock, expiry date, or manufacturing schedule"
                                  >
                                    Adjust
                                  </button>
                                  <button
                                    onClick={() => handleOpenBatchActionModal(item)}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-xs ${
                                      isExpired
                                        ? 'bg-rose-600 hover:bg-rose-500 text-white animate-pulse'
                                        : isQuarantined
                                          ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                                          : 'bg-teal-600 hover:bg-teal-500 text-white'
                                    }`}
                                    title="Execute quarantine, update expiry, disposal, or vendor return"
                                  >
                                    <Shield className="w-3.5 h-3.5" />
                                    <span>{isExpired ? 'Resolve Expiry' : isQuarantined ? 'Disposal Action' : 'Quarantine'}</span>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 6: COMPLETE USER MANAGEMENT & ACCESS CONTROL (ADMIN ONLY) */}
      {activeTab === 'users' && (
        isAdmin ? (
          <div className="space-y-6 animate-in fade-in duration-150">
            {/* Top Navigation & Hub Header */}
            <div className={`p-6 rounded-3xl border flex flex-col md:flex-row md:items-center justify-between gap-4 ${
              isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
            }`}>
              <div>
                <h2 className={`text-lg font-black flex items-center gap-2.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  <ShieldCheck className="w-6 h-6 text-teal-500" />
                  User & Access Management Center
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Manage dispensary team credentials & permissions, plus registered public patient accounts
                </p>
              </div>

              {/* Sub-Tab Switcher */}
              <div className="flex items-center gap-1.5 p-1.5 rounded-2xl border bg-slate-100/80 dark:bg-slate-950/80 border-slate-200 dark:border-slate-800 self-start md:self-auto shrink-0">
                <button
                  type="button"
                  onClick={() => setUserSubTab('staff')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-all ${
                    userSubTab === 'staff'
                      ? 'bg-teal-600 text-white shadow-md shadow-teal-600/20'
                      : isDark
                        ? 'text-slate-400 hover:text-white'
                        : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>Staff & Pharmacists ({staffUsers.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setUserSubTab('customers')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-all ${
                    userSubTab === 'customers'
                      ? 'bg-teal-600 text-white shadow-md shadow-teal-600/20'
                      : isDark
                        ? 'text-slate-400 hover:text-white'
                        : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Registered Site Patients ({customers.length})</span>
                </button>
              </div>
            </div>

            {/* SUB-VIEW 1: STAFF & PHARMACISTS */}
            {userSubTab === 'staff' && (
              <div className={`p-6 rounded-3xl border space-y-4 ${
                isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
              }`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className={`text-base font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      <Shield className="w-4 h-4 text-teal-500" />
                      Dispensary Staff Accounts
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Configure pharmacists, cashier credentials, and feature-level accessibility privileges
                    </p>
                  </div>

                  <button
                    onClick={() => setIsNewUserModalOpen(true)}
                    className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-md shadow-teal-600/20 transition-all shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    Add Staff User
                  </button>
                </div>

                {/* Staff Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className={`border-b uppercase tracking-wider text-[10px] font-bold ${
                      isDark ? 'bg-slate-950/60 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}>
                      <tr>
                        <th className="py-2.5 px-3">User ID</th>
                        <th className="py-2.5 px-3">Full Name & Username</th>
                        <th className="py-2.5 px-3">Role</th>
                        <th className="py-2.5 px-3">Dispensary Privileges</th>
                        <th className="py-2.5 px-3">Email Address</th>
                        <th className="py-2.5 px-3 text-center">Account Status</th>
                        <th className="py-2.5 px-3">Created / Last Login</th>
                        <th className="py-2.5 px-3 text-right">Access Actions</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y text-xs ${
                      isDark ? 'divide-slate-800 text-slate-300' : 'divide-slate-200 text-slate-700'
                    }`}>
                      {staffUsers.length === 0 ? (
                        <tr>
                          <td colSpan="8" className="py-6 text-center text-slate-500 italic">
                            No staff accounts found.
                          </td>
                        </tr>
                      ) : (
                        staffUsers.map((u) => (
                          <tr key={u.user_id} className="hover:bg-teal-500/5 transition-colors">
                            <td className="py-2.5 px-3 font-mono text-slate-400 font-bold">#{u.user_id}</td>
                            <td className="py-2.5 px-3">
                              <div className="font-bold text-slate-900 dark:text-white">{u.full_name || u.username}</div>
                              <div className="font-mono text-[11px] text-teal-600 dark:text-teal-400">@{u.username}</div>
                            </td>
                            <td className="py-2.5 px-3">
                              <span className={`px-2.5 py-0.5 rounded-md font-mono text-[10px] font-bold ${
                                u.role === 'ADMIN' ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20' :
                                'bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20'
                              }`}>
                                {u.role}
                              </span>
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="flex flex-wrap gap-1 max-w-xs">
                                {u.role === 'ADMIN' ? (
                                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-500/10 text-rose-500 border border-rose-500/20">
                                    Full System Administrator Access
                                  </span>
                                ) : (
                                  <>
                                    {u.permissions?.can_pos && (
                                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20">
                                        POS Counter
                                      </span>
                                    )}
                                    {u.permissions?.can_manage_medicines && (
                                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-500/10 text-sky-500 border border-sky-500/20">
                                        Formulary Edit
                                      </span>
                                    )}
                                    {u.permissions?.can_manage_batches && (
                                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                                        Batch Stock
                                      </span>
                                    )}
                                    {u.permissions?.can_view_reports && (
                                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                                        Reports
                                      </span>
                                    )}
                                    {u.permissions?.can_manage_inquiries && (
                                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                        Inquiry Analyst
                                      </span>
                                    )}
                                    {u.permissions?.can_view_audit && (
                                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                                        Audit Trail
                                      </span>
                                    )}
                                    {(!u.permissions || Object.values(u.permissions).every(v => !v)) && (
                                      <span className="text-[10px] text-slate-400 italic">No privileges granted</span>
                                    )}
                                  </>
                                )}
                              </div>
                            </td>
                            <td className="py-2.5 px-3 font-mono text-slate-400">{u.email || '-'}</td>
                            <td className="py-2.5 px-3 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                u.is_active ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-700/50 text-slate-400'
                              }`}>
                                {u.is_active ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-slate-400">
                              {u.created_at ? new Date(u.created_at).toLocaleDateString() : 'N/A'}
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => handleOpenEditUser(u)}
                                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-colors flex items-center gap-1 ${
                                    isDark ? 'bg-slate-800 hover:bg-slate-700 text-teal-400' : 'bg-slate-100 hover:bg-slate-200 text-teal-700'
                                  }`}
                                  title="Configure privileges and details for this user"
                                >
                                  <Sliders className="w-3 h-3" />
                                  Edit Privileges
                                </button>
                                <button
                                  onClick={() => handleToggleUserStatus(u)}
                                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-colors ${
                                    u.is_active
                                      ? 'bg-rose-500/10 text-rose-500 hover:bg-rose-500/20'
                                      : 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20'
                                  }`}
                                >
                                  {u.is_active ? 'Deactivate' : 'Activate'}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* SUB-VIEW 2: REGISTERED WEBSITE PATIENTS / CUSTOMERS */}
            {userSubTab === 'customers' && (
              <div className="space-y-6 animate-in fade-in duration-150">
                {/* Metrics Summary Strip */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-xs'}`}>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Registered Patients</span>
                    <p className="text-xl sm:text-2xl font-black text-teal-600 dark:text-teal-400 font-mono mt-1">
                      {customers.length}
                    </p>
                    <span className="text-[11px] text-slate-400 mt-0.5 block">Online customer profiles</span>
                  </div>

                  <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-xs'}`}>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Active Accounts</span>
                    <p className="text-xl sm:text-2xl font-black text-emerald-500 font-mono mt-1">
                      {customers.filter(c => c.is_active && c.status !== 'suspended').length}
                    </p>
                    <span className="text-[11px] text-emerald-500 font-medium mt-0.5 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Verified & Operational</span>
                    </span>
                  </div>

                  <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-xs'}`}>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Suspended / Inactive</span>
                    <p className="text-xl sm:text-2xl font-black text-rose-500 font-mono mt-1">
                      {customers.filter(c => !c.is_active || c.status === 'suspended').length}
                    </p>
                    <span className="text-[11px] text-slate-400 mt-0.5 block">Access temporarily paused</span>
                  </div>

                  <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-xs'}`}>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Prescriptions Linked</span>
                    <p className="text-xl sm:text-2xl font-black text-sky-500 font-mono mt-1">
                      {customers.reduce((acc, c) => acc + (Number(c.total_prescriptions) || 0), 0)}
                    </p>
                    <span className="text-[11px] text-slate-400 mt-0.5 block">Uploaded & processed Rx</span>
                  </div>
                </div>

                {/* Search, Filter & Action Bar */}
                <div className={`p-4 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                  isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
                }`}>
                  <div className="flex flex-wrap items-center gap-2 flex-1 max-w-xl">
                    <div className="relative flex-1 min-w-[200px]">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={customerSearch}
                        onChange={(e) => setCustomerSearch(e.target.value)}
                        placeholder="Search patients by name, email, phone, or NIC..."
                        className={`w-full pl-9 pr-3 py-2 rounded-xl border text-xs focus:outline-none focus:border-teal-500 ${
                          isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                        }`}
                      />
                      {customerSearch && (
                        <button
                          onClick={() => setCustomerSearch('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Filter chips */}
                    <div className="flex items-center gap-1">
                      {[
                        { id: 'all', label: 'All Patients' },
                        { id: 'active', label: 'Active Only' },
                        { id: 'suspended', label: 'Suspended' }
                      ].map((chip) => {
                        const isSelected = customerStatusFilter === chip.id;
                        return (
                          <button
                            key={chip.id}
                            type="button"
                            onClick={() => setCustomerStatusFilter(chip.id)}
                            className={`px-3 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                              isSelected
                                ? 'bg-teal-600 text-white shadow-xs'
                                : isDark
                                  ? 'bg-slate-800 text-slate-400 hover:text-white'
                                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            {chip.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
                    <button
                      type="button"
                      onClick={() => setIsNewCustomerModalOpen(true)}
                      className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md shadow-teal-600/20 transition-all"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>Register Patient</span>
                    </button>
                  </div>
                </div>

                {/* Patients Table */}
                <div className={`rounded-3xl border overflow-hidden ${
                  isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
                }`}>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className={`border-b uppercase tracking-wider text-[10px] font-bold ${
                        isDark ? 'bg-slate-950/60 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
                      }`}>
                        <tr>
                          <th className="py-3 px-3">Patient ID</th>
                          <th className="py-3 px-3">Patient Profile</th>
                          <th className="py-3 px-3">Contact & NIC</th>
                          <th className="py-3 px-3">Age & Address</th>
                          <th className="py-3 px-3 text-center">Rx Orders</th>
                          <th className="py-3 px-3 text-center">Account Status</th>
                          <th className="py-3 px-3">Registered Date</th>
                          <th className="py-3 px-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className={`divide-y text-xs ${
                        isDark ? 'divide-slate-800 text-slate-300' : 'divide-slate-200 text-slate-700'
                      }`}>
                        {(() => {
                          const filtered = customers.filter(c => {
                            const q = customerSearch.toLowerCase().trim();
                            const matchQuery = !q ||
                              c.full_name?.toLowerCase().includes(q) ||
                              c.email?.toLowerCase().includes(q) ||
                              c.contact_no?.toLowerCase().includes(q) ||
                              c.nic?.toLowerCase().includes(q);
                            if (!matchQuery) return false;

                            if (customerStatusFilter === 'active') return c.is_active && c.status !== 'suspended';
                            if (customerStatusFilter === 'suspended') return !c.is_active || c.status === 'suspended';
                            return true;
                          });

                          if (filtered.length === 0) {
                            return (
                              <tr>
                                <td colSpan="8" className="py-10 text-center text-slate-400">
                                  <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                                  <p className="font-bold">No registered patient accounts found</p>
                                  <p className="text-[11px] text-slate-500 mt-0.5">
                                    {customerSearch ? 'Try a different search query' : 'Registered patients will appear here automatically when they sign up on the site'}
                                  </p>
                                </td>
                              </tr>
                            );
                          }

                          return filtered.map((cust) => {
                            const isActive = cust.is_active && cust.status !== 'suspended';
                            const initials = (cust.full_name || 'U')
                              .split(' ')
                              .map(n => n[0])
                              .slice(0, 2)
                              .join('')
                              .toUpperCase();

                            return (
                              <tr key={cust.customer_id} className="hover:bg-teal-500/5 transition-colors">
                                <td className="py-3 px-3 font-mono text-slate-400 font-bold">#{cust.customer_id}</td>
                                
                                <td className="py-3 px-3">
                                  <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-full bg-teal-500/10 text-teal-600 dark:text-teal-400 font-black text-xs flex items-center justify-center shrink-0 border border-teal-500/20">
                                      {initials}
                                    </div>
                                    <div className="min-w-0">
                                      <div className="font-bold text-slate-900 dark:text-white truncate">
                                        {cust.full_name}
                                      </div>
                                      <div className="font-mono text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                        {cust.email}
                                      </div>
                                    </div>
                                  </div>
                                </td>

                                <td className="py-3 px-3">
                                  <div className="space-y-0.5">
                                    <div className="font-medium text-slate-900 dark:text-slate-200 flex items-center gap-1">
                                      <Phone className="w-3 h-3 text-teal-500 shrink-0" />
                                      <span>{cust.contact_no || 'No contact'}</span>
                                    </div>
                                    {cust.nic && (
                                      <div className="font-mono text-[11px] text-slate-400">
                                        NIC: {cust.nic}
                                      </div>
                                    )}
                                  </div>
                                </td>

                                <td className="py-3 px-3 max-w-xs">
                                  <div className="space-y-0.5">
                                    {cust.patient_age && (
                                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                        Age: {cust.patient_age}
                                      </span>
                                    )}
                                    <p className="text-[11px] text-slate-400 truncate" title={cust.address || ''}>
                                      {cust.address || 'No address registered'}
                                    </p>
                                  </div>
                                </td>

                                <td className="py-3 px-3 text-center">
                                  <span className="px-2.5 py-1 rounded-full font-mono text-[11px] font-bold bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
                                    {cust.total_prescriptions || 0} Rx
                                  </span>
                                </td>

                                <td className="py-3 px-3 text-center">
                                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase inline-flex items-center gap-1 ${
                                    isActive
                                      ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                                      : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                                  }`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                    <span>{isActive ? 'Active' : 'Suspended'}</span>
                                  </span>
                                </td>

                                <td className="py-3 px-3 text-slate-400 text-[11px]">
                                  {cust.created_at ? new Date(cust.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A'}
                                </td>

                                <td className="py-3 px-3 text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => handleOpenEditCustomer(cust)}
                                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-colors flex items-center gap-1 ${
                                        isDark ? 'bg-slate-800 hover:bg-slate-700 text-teal-400' : 'bg-slate-100 hover:bg-slate-200 text-teal-700'
                                      }`}
                                      title="Edit patient profile details"
                                    >
                                      <Edit className="w-3 h-3" />
                                      <span>Edit</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => handleToggleCustomerStatus(cust)}
                                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-colors ${
                                        isActive
                                          ? 'bg-amber-500/10 text-amber-500 hover:bg-amber-500/20'
                                          : 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20'
                                      }`}
                                      title={isActive ? 'Suspend patient login access' : 'Reactivate patient login'}
                                    >
                                      {isActive ? 'Suspend' : 'Activate'}
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => handleDeleteCustomer(cust)}
                                      className="p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 cursor-pointer transition-colors"
                                      title="Remove patient record"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          });
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className={`p-8 sm:p-12 rounded-3xl border text-center space-y-4 max-w-xl mx-auto my-12 animate-in fade-in duration-150 ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <Shield className="w-12 h-12 text-rose-500 mx-auto" />
            <h3 className="text-base font-bold">Access Restricted</h3>
            <p className="text-xs text-slate-400">User account management and role-based permissions are reserved for System Administrators.</p>
            <button
              onClick={() => setActiveTab('overview')}
              className="px-4 py-2 rounded-xl bg-teal-600 text-white font-bold text-xs cursor-pointer shadow-md"
            >
              Back to Dispensary Overview
            </button>
          </div>
        )
      )}

      {/* TAB 7: PRESCRIPTION ORDER SUPERVISION & PHARMACIST WORKFLOW */}
      {activeTab === 'prescriptions' && (
        <PrescriptionOrdersManager staffUser={staffUser} />
      )}

      {/* TAB 8: CUSTOMER INQUIRIES & ONLINE CONSULTATION MESSAGES */}
      {activeTab === 'inquiries' && (
        <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-150">
          {/* Header Banner */}
          <div className={`p-6 sm:p-8 rounded-3xl border relative overflow-hidden ${
            isDark 
              ? 'bg-gradient-to-r from-slate-900 via-teal-950/40 to-slate-900 border-teal-500/20' 
              : 'bg-gradient-to-r from-teal-900 via-teal-800 to-slate-900 text-white border-teal-800 shadow-lg'
          }`}>
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2 max-w-2xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30">
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Website Contact & Patient Inquiries</span>
                </div>
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-white">
                  Customer Inquiries & Consultations
                </h2>
                <p className="text-xs sm:text-sm text-teal-100/80 leading-relaxed">
                  Real-time inbox of patient inquiries, medication availability checks, and prescription questions submitted through the online storefront. Review messages and reply directly to customer emails.
                </p>
              </div>

              {/* Inquiries Counter Summary Pills */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 shrink-0">
                <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 text-center min-w-[90px]">
                  <span className="text-[10px] font-bold text-teal-200 uppercase tracking-wider block">Total</span>
                  <span className="text-xl font-black text-white">{inquiries.length}</span>
                </div>
                <div className="p-3 rounded-2xl bg-amber-500/20 backdrop-blur-md border border-amber-500/30 text-center min-w-[90px]">
                  <span className="text-[10px] font-bold text-amber-200 uppercase tracking-wider block">New</span>
                  <span className="text-xl font-black text-amber-300">
                    {inquiries.filter(i => i.status === 'NEW').length}
                  </span>
                </div>
                <div className="p-3 rounded-2xl bg-sky-500/20 backdrop-blur-md border border-sky-500/30 text-center min-w-[90px]">
                  <span className="text-[10px] font-bold text-sky-200 uppercase tracking-wider block">In Review</span>
                  <span className="text-xl font-black text-sky-300">
                    {inquiries.filter(i => i.status === 'IN_REVIEW').length}
                  </span>
                </div>
                <div className="p-3 rounded-2xl bg-emerald-500/20 backdrop-blur-md border border-emerald-500/30 text-center min-w-[90px]">
                  <span className="text-[10px] font-bold text-emerald-200 uppercase tracking-wider block">Resolved</span>
                  <span className="text-xl font-black text-emerald-300">
                    {inquiries.filter(i => i.status === 'RESOLVED').length}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Read-Only Access Notice if user lacks Inquiry Analyst edit privileges */}
          {!canEditInquiries && (
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-3 text-xs text-amber-800 dark:text-amber-300">
              <Shield className="w-4 h-4 text-amber-500 shrink-0" />
              <span>
                <strong>Read-Only Mode:</strong> You can view patient inquiries, but Inquiry Analyst edit privileges (status updates, customer replies, and inquiry deletion) have not been granted to this account. Contact an administrator to enable privileges.
              </span>
            </div>
          )}

          {/* Search, Filter Tabs & Refresh Bar */}
          <div className={`p-4 rounded-2xl border flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
          }`}>
            {/* Status Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
              {[
                { id: 'ALL', label: 'All Inquiries', count: inquiries.length },
                { id: 'NEW', label: 'New / Awaiting', count: inquiries.filter(i => i.status === 'NEW').length, badgeColor: 'amber' },
                { id: 'IN_REVIEW', label: 'In Review', count: inquiries.filter(i => i.status === 'IN_REVIEW').length, badgeColor: 'sky' },
                { id: 'RESOLVED', label: 'Resolved', count: inquiries.filter(i => i.status === 'RESOLVED').length, badgeColor: 'emerald' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setInquiryFilter(tab.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
                    inquiryFilter === tab.id
                      ? 'bg-teal-600 text-white shadow-sm'
                      : isDark
                        ? 'text-slate-400 hover:text-white hover:bg-slate-800'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                    inquiryFilter === tab.id 
                      ? 'bg-white/20 text-white' 
                      : tab.badgeColor === 'amber'
                        ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400'
                        : isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Search Input & Refresh Button */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1 sm:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={inquirySearch}
                  onChange={(e) => setInquirySearch(e.target.value)}
                  placeholder="Search name, email, ref, or topic..."
                  className={`w-full pl-9 pr-3 py-2 rounded-xl text-xs border transition-colors outline-none ${
                    isDark 
                      ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-500 focus:border-teal-500' 
                      : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-teal-600'
                  }`}
                />
              </div>

              <button
                onClick={fetchInquiries}
                disabled={inquiriesLoading}
                className="p-2 sm:px-3 sm:py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 hover:bg-slate-50 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                title="Refresh customer inquiries"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${inquiriesLoading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            </div>
          </div>

          {/* Inquiries Cards Grid / List */}
          {inquiriesLoading ? (
            <div className="py-20 text-center space-y-3">
              <RefreshCw className="w-8 h-8 text-teal-500 animate-spin mx-auto" />
              <p className="text-xs font-bold text-slate-400">Loading customer inquiries...</p>
            </div>
          ) : (() => {
            const filteredInquiries = inquiries.filter(item => {
              if (inquiryFilter !== 'ALL' && item.status !== inquiryFilter) return false;
              if (inquirySearch.trim()) {
                const q = inquirySearch.toLowerCase();
                const matchName = item.name?.toLowerCase().includes(q);
                const matchEmail = item.email?.toLowerCase().includes(q);
                const matchPhone = item.phone?.toLowerCase().includes(q);
                const matchRef = item.reference_code?.toLowerCase().includes(q);
                const matchTopic = item.medicine_query?.toLowerCase().includes(q);
                const matchMsg = item.message?.toLowerCase().includes(q);
                return matchName || matchEmail || matchPhone || matchRef || matchTopic || matchMsg;
              }
              return true;
            });

            if (filteredInquiries.length === 0) {
              return (
                <div className={`p-12 rounded-3xl border text-center space-y-3 ${
                  isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                }`}>
                  <Inbox className="w-12 h-12 text-slate-400 mx-auto stroke-[1.5]" />
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">No Inquiries Found</h3>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    {inquirySearch ? 'No inquiries matched your search criteria.' : 'No customer inquiries in this category.'}
                  </p>
                </div>
              );
            }

            return (
              <div className="space-y-4">
                {filteredInquiries.map((inq) => {
                  const hasEmail = Boolean(inq.email && inq.email.includes('@'));
                  const hasResponded = Boolean(inq.staff_notes);
                  const isUpdating = statusUpdatingId === inq.inquiry_id;

                  return (
                    <div 
                      key={inq.inquiry_id}
                      className={`p-5 sm:p-6 rounded-3xl border transition-all space-y-4 ${
                        inq.status === 'NEW' 
                          ? isDark ? 'bg-slate-900/90 border-amber-500/30 shadow-md' : 'bg-white border-amber-200 shadow-sm'
                          : isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200/90 shadow-xs'
                      }`}
                    >
                      {/* Top Row: Reference, Date, Status */}
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3 border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-black px-2.5 py-1 rounded-lg bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/20">
                            {inq.reference_code}
                          </span>
                          <span className="text-[11px] text-slate-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(inq.created_at).toLocaleString(undefined, {
                              year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                            })}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          {inq.status === 'NEW' && (
                            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                              New / Awaiting Reply
                            </span>
                          )}
                          {inq.status === 'IN_REVIEW' && (
                            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30 flex items-center gap-1">
                              In Review
                            </span>
                          )}
                          {inq.status === 'RESOLVED' && (
                            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Resolved
                            </span>
                          )}

                          {canEditInquiries && (
                            <button
                              type="button"
                              onClick={() => handleDeleteInquiry(inq)}
                              disabled={deletingInquiryId === inq.inquiry_id}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer disabled:opacity-40"
                              title="Delete this inquiry record"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Customer Info & Inquiry Topic */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Customer Column */}
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                            Patient / Inquirer
                          </span>
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-teal-600/10 text-teal-600 flex items-center justify-center font-bold text-xs shrink-0">
                              {inq.name ? inq.name[0].toUpperCase() : 'C'}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                {inq.name}
                              </p>
                              {inq.customer_id && (
                                <span className="inline-block text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                                  Registered Patient #{inq.customer_id}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Contact Channels */}
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                            Contact Information
                          </span>
                          <div className="space-y-1 text-xs">
                            {hasEmail ? (
                              <a 
                                href={`mailto:${inq.email}?subject=Re:%20Inquiry%20[${inq.reference_code}]`}
                                className="flex items-center gap-1.5 text-teal-600 dark:text-teal-400 hover:underline truncate"
                              >
                                <Mail className="w-3.5 h-3.5 shrink-0" />
                                <span className="truncate">{inq.email}</span>
                              </a>
                            ) : (
                              <span className="text-slate-400 flex items-center gap-1 text-[11px]">
                                <Mail className="w-3.5 h-3.5 shrink-0" /> No email provided
                              </span>
                            )}
                            {inq.phone && (
                              <a 
                                href={`tel:${inq.phone}`}
                                className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 hover:text-teal-600 dark:hover:text-teal-400 truncate"
                              >
                                <Phone className="w-3.5 h-3.5 shrink-0" />
                                <span>{inq.phone}</span>
                              </a>
                            )}
                          </div>
                        </div>

                        {/* Medicine Subject / Topic */}
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                            Inquiry Topic / Medication
                          </span>
                          <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
                            <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                              {inq.medicine_query || 'General Consultation'}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Customer Inquiry Message Box */}
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                          Patient Question / Message
                        </span>
                        <div className={`p-4 rounded-2xl border text-xs sm:text-sm leading-relaxed ${
                          isDark ? 'bg-slate-950/60 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
                        }`}>
                          "{inq.message}"
                        </div>
                      </div>

                      {/* Pharmacist Prior Response History (if any) */}
                      {hasResponded && (
                        <div className={`p-3.5 rounded-2xl border space-y-1.5 ${
                          isDark ? 'bg-emerald-950/20 border-emerald-800/40' : 'bg-emerald-50/70 border-emerald-200'
                        }`}>
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Staff Response by {inq.responded_by || 'Pharmacist'}:
                            </span>
                            {inq.responded_at && (
                              <span className="text-slate-400 text-[10px]">
                                {new Date(inq.responded_at).toLocaleString(undefined, {
                                  month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                                })}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-800 dark:text-slate-200 whitespace-pre-line leading-relaxed">
                            {inq.staff_notes}
                          </p>
                        </div>
                      )}

                      {/* Action Bar */}
                      <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800">
                        {/* Status Quick Select */}
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-400 font-semibold">Status:</span>
                          <select
                            value={inq.status}
                            disabled={!canEditInquiries || isUpdating}
                            onChange={(e) => handleQuickUpdateInquiryStatus(inq.inquiry_id, e.target.value)}
                            title={!canEditInquiries ? 'Inquiry Analyst edit privileges required' : 'Update status'}
                            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-colors outline-none cursor-pointer ${
                              !canEditInquiries
                                ? 'opacity-60 cursor-not-allowed bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500'
                                : isDark 
                                  ? 'bg-slate-950 border-slate-800 text-slate-200' 
                                  : 'bg-white border-slate-200 text-slate-700'
                            }`}
                          >
                            <option value="NEW">New</option>
                            <option value="IN_REVIEW">In Review</option>
                            <option value="RESOLVED">Resolved</option>
                          </select>
                        </div>

                        {/* Respond & Action Buttons */}
                        <div className="flex items-center gap-2">
                          {canEditInquiries && (
                            <button
                              type="button"
                              onClick={() => handleDeleteInquiry(inq)}
                              disabled={deletingInquiryId === inq.inquiry_id}
                              className="px-3 py-1.5 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 border border-rose-500/20 hover:border-rose-500/40 flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs disabled:opacity-50"
                              title={`Delete inquiry ${inq.reference_code}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>{deletingInquiryId === inq.inquiry_id ? 'Deleting...' : 'Delete'}</span>
                            </button>
                          )}

                          {hasEmail && (
                            <a
                              href={`mailto:${inq.email}?subject=Re:%20[${inq.reference_code}]%20Dispensary%20Inquiry%20Response`}
                              className="px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center gap-1.5 transition-colors"
                              title="Open in your default mail app"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Mail App</span>
                            </a>
                          )}

                          <button
                            onClick={() => canEditInquiries && handleOpenReplyModal(inq)}
                            disabled={!canEditInquiries || !hasEmail}
                            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md ${
                              !canEditInquiries
                                ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed border border-slate-300/40 dark:border-slate-700/40'
                                : hasEmail 
                                  ? 'bg-teal-600 hover:bg-teal-500 text-white shadow-teal-600/20 cursor-pointer' 
                                  : 'bg-slate-200 dark:bg-slate-800 text-slate-500 cursor-not-allowed'
                            }`}
                            title={
                              !canEditInquiries
                                ? 'Inquiry Analyst edit privileges required to reply'
                                : hasEmail 
                                  ? 'Send email response to customer' 
                                  : 'Customer did not provide an email address'
                            }
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>{hasResponded ? 'Send Follow-up Email' : 'Reply to Customer Email'}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}

      {/* MODAL: SALE & INVOICE DETAILS BREAKDOWN */}
      {selectedSaleForInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-150">
          <div className={`border rounded-3xl p-5 sm:p-7 w-full max-w-2xl max-h-[92vh] overflow-y-auto my-auto space-y-5 shadow-2xl transition-all ${
            isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            {/* Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-black font-mono tracking-tight text-slate-900 dark:text-white">
                      {selectedSaleForInfo.invoice_number}
                    </h3>
                    <button
                      onClick={() => handleCopyInvoiceNumber(selectedSaleForInfo.invoice_number)}
                      className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center gap-1 transition-colors cursor-pointer"
                      title="Copy Invoice Number"
                    >
                      {copiedInvoice ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedInvoice ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {new Date(selectedSaleForInfo.sale_date).toLocaleString(undefined, { 
                      weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
                    })}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold ${
                  selectedSaleForInfo.payment_method === 'CARD' ? 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30' :
                  selectedSaleForInfo.payment_method === 'ONLINE' ? 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30' :
                  'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                }`}>
                  {selectedSaleForInfo.payment_method || 'CASH'}
                </span>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 uppercase">
                  {selectedSaleForInfo.status || selectedSaleForInfo.payment_status || 'PAID'}
                </span>
                <button
                  onClick={() => setSelectedSaleForInfo(null)}
                  className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Meta Info Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className={`p-3.5 rounded-2xl border ${isDark ? 'bg-slate-950/60 border-slate-800/80' : 'bg-slate-50 border-slate-200'}`}>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Customer / Patient</span>
                <p className="text-sm font-bold mt-1 text-slate-900 dark:text-white truncate">
                  {selectedSaleForInfo.customer_name || selectedSaleForInfo.patient_name || 'Walk-in Customer'}
                </p>
                <span className="text-[11px] text-teal-600 dark:text-teal-400 font-mono mt-0.5 block truncate">
                  Ref: {selectedSaleForInfo.prescription_ref || 'OTC'}
                </span>
              </div>

              <div className={`p-3.5 rounded-2xl border ${isDark ? 'bg-slate-950/60 border-slate-800/80' : 'bg-slate-50 border-slate-200'}`}>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Cashier / Pharmacist</span>
                <p className="text-sm font-bold mt-1 text-slate-900 dark:text-white truncate">
                  {selectedSaleForInfo.cashier_name || 'Staff Pharmacist'}
                </p>
                <span className="text-[11px] text-slate-400 mt-0.5 block truncate">
                  Verified Dispensation
                </span>
              </div>

              <div className={`p-3.5 rounded-2xl border ${isDark ? 'bg-slate-950/60 border-slate-800/80' : 'bg-slate-50 border-slate-200'}`}>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Amount</span>
                <p className="text-lg font-black font-mono mt-0.5 text-emerald-600 dark:text-emerald-400">
                  Rs. {Number(selectedSaleForInfo.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
                <span className="text-[11px] text-slate-400 block truncate">
                  Paid: Rs. {Number(selectedSaleForInfo.amount_paid || selectedSaleForInfo.total_amount).toFixed(2)}
                </span>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Pill className="w-3.5 h-3.5 text-teal-500" />
                  Prescription & Medicine Line Items
                </h4>
                {saleInfoLoading && (
                  <span className="text-[11px] text-teal-500 flex items-center gap-1 font-semibold">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    Fetching items...
                  </span>
                )}
              </div>

              <div className={`border rounded-2xl overflow-hidden ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                <table className="w-full text-left text-xs">
                  <thead className={`border-b text-[10px] font-bold uppercase tracking-wider ${
                    isDark ? 'bg-slate-950/80 text-slate-400 border-slate-800' : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}>
                    <tr>
                      <th className="py-2.5 px-3">Medication</th>
                      <th className="py-2.5 px-3">Dosage / Packaging</th>
                      <th className="py-2.5 px-3 text-center">Batch / Lot</th>
                      <th className="py-2.5 px-3 text-right">Unit Rate</th>
                      <th className="py-2.5 px-3 text-center">Qty</th>
                      <th className="py-2.5 px-3 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y text-xs ${
                    isDark ? 'divide-slate-800 text-slate-300' : 'divide-slate-200 text-slate-700'
                  }`}>
                    {(!selectedSaleForInfo.items || selectedSaleForInfo.items.length === 0) ? (
                      <tr>
                        <td className="py-3 px-3 font-semibold text-slate-900 dark:text-white">
                          {selectedSaleForInfo.items_summary || 'Dispensed Medication'}
                        </td>
                        <td className="py-3 px-3 text-slate-400">Standard Dispensation</td>
                        <td className="py-3 px-3 text-center font-mono text-slate-400">Allocated</td>
                        <td className="py-3 px-3 text-right font-mono font-semibold">
                          Rs. {Number(selectedSaleForInfo.total_amount / (selectedSaleForInfo.item_count || 1)).toFixed(2)}
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-bold">
                          {selectedSaleForInfo.item_count || 1}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-teal-600 dark:text-teal-400">
                          Rs. {Number(selectedSaleForInfo.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ) : (
                      selectedSaleForInfo.items.map((item, idx) => (
                        <tr key={idx} className="hover:bg-teal-500/5 transition-colors">
                          <td className="py-2.5 px-3">
                            <span className="font-bold text-slate-900 dark:text-white block">
                              {item.medicine_name}
                            </span>
                            {item.generic_name && (
                              <span className="text-[10px] text-slate-400 italic block">
                                {item.generic_name}
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400">
                            <span>{item.packaging_desc || item.dosage_form || 'Standard'}</span>
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono text-[11px] text-slate-400">
                            {item.batch_number ? (
                              <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-bold text-slate-600 dark:text-slate-300">
                                {item.batch_number}
                              </span>
                            ) : (
                              'Counter Batch'
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono">
                            Rs. {Number(item.unit_price).toFixed(2)}
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono font-bold">
                            {item.quantity}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-teal-600 dark:text-teal-400">
                            Rs. {Number(item.subtotal).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Financial Summary & Calculations Box */}
            <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-500 dark:text-slate-400 font-medium">
                  <span>Gross Subtotal</span>
                  <span className="font-mono">Rs. {Number(selectedSaleForInfo.subtotal || selectedSaleForInfo.total_amount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-500 dark:text-slate-400 font-medium">
                  <span>Discounts Applied</span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400">Rs. {Number(selectedSaleForInfo.discount_amount || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-500 dark:text-slate-400 font-medium">
                  <span>Tax & Dispensary Surcharge (VAT)</span>
                  <span className="font-mono">Rs. {Number(selectedSaleForInfo.tax_amount || 0).toFixed(2)}</span>
                </div>
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center text-sm font-black">
                  <span className="text-slate-900 dark:text-white">Net Total Bill</span>
                  <span className="text-lg font-mono text-emerald-600 dark:text-emerald-400">
                    Rs. {Number(selectedSaleForInfo.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between text-slate-500 dark:text-slate-400 text-[11px] pt-1">
                  <span>Amount Tendered / Paid ({selectedSaleForInfo.payment_method || 'CASH'})</span>
                  <span className="font-mono">Rs. {Number(selectedSaleForInfo.amount_paid || selectedSaleForInfo.total_amount).toFixed(2)}</span>
                </div>
                {Number(selectedSaleForInfo.change_given || (selectedSaleForInfo.amount_paid - selectedSaleForInfo.total_amount)) > 0 && (
                  <div className="flex justify-between text-teal-600 dark:text-teal-400 font-bold text-[11px]">
                    <span>Change Returned</span>
                    <span className="font-mono">
                      Rs. {Number(selectedSaleForInfo.change_given || (selectedSaleForInfo.amount_paid - selectedSaleForInfo.total_amount)).toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedSaleForInfo(null)}
                className={`w-full sm:w-auto px-5 py-2.5 rounded-xl font-bold text-xs border transition-colors cursor-pointer ${
                  isDark ? 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white' : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Close Details
              </button>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => {
                    handlePrintReceiptSlip({
                      invoiceNumber: selectedSaleForInfo.invoice_number,
                      medicineName: selectedSaleForInfo.items?.[0]?.medicine_name || selectedSaleForInfo.patient_name || 'Prescription Items',
                      genericName: selectedSaleForInfo.items?.[0]?.generic_name || '',
                      dosageForm: selectedSaleForInfo.items?.[0]?.dosage_form || '',
                      batchNumber: selectedSaleForInfo.items?.[0]?.batch_number || 'N/A',
                      quantity: selectedSaleForInfo.items?.reduce((acc, it) => acc + (it.quantity || 0), 0) || selectedSaleForInfo.item_count || 1,
                      packagingSummary: selectedSaleForInfo.items?.[0]?.packaging_desc || selectedSaleForInfo.items_summary || 'Prescription Pack',
                      unitPrice: selectedSaleForInfo.items?.[0]?.unit_price || (selectedSaleForInfo.total_amount / (selectedSaleForInfo.item_count || 1)),
                      totalBill: selectedSaleForInfo.total_amount,
                      patientName: selectedSaleForInfo.patient_name || selectedSaleForInfo.customer_name || 'Walk-in Customer',
                      prescriptionRef: selectedSaleForInfo.prescription_ref || 'OTC',
                      date: new Date(selectedSaleForInfo.sale_date).toLocaleString()
                    });
                  }}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-teal-600/20 cursor-pointer transition-all"
                >
                  <Printer className="w-4 h-4" />
                  Print Receipt Slip
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: RESPOND TO CUSTOMER INQUIRY (SEND EMAIL) */}
      {selectedInquiryForReply && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-150">
          <div className={`border rounded-3xl p-5 sm:p-7 w-full max-w-2xl max-h-[92vh] overflow-y-auto my-auto space-y-5 shadow-2xl transition-all ${
            isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
                  <Send className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                    Send Email Response to Customer
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Dispatches an official dispensary clinical response via SMTP to the patient's inbox
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedInquiryForReply(null)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Recipient & Inquiry Summary Card */}
            <div className={`p-4 rounded-2xl border space-y-2 text-xs ${
              isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Recipient</span>
                  <span className="font-bold text-slate-900 dark:text-white">{selectedInquiryForReply.name}</span>
                  <span className="text-teal-600 dark:text-teal-400 ml-1.5 font-mono">({selectedInquiryForReply.email})</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Reference Code</span>
                  <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{selectedInquiryForReply.reference_code}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200 dark:border-slate-800/80">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Original Inquiry:</span>
                <p className="text-slate-600 dark:text-slate-300 italic mt-0.5">
                  "{selectedInquiryForReply.message}"
                </p>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSendInquiryReply} className="space-y-4">
              {/* Subject Input */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Email Subject
                </label>
                <input
                  type="text"
                  required
                  value={replySubject}
                  onChange={(e) => setReplySubject(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl text-xs border transition-colors outline-none ${
                    isDark 
                      ? 'bg-slate-950 border-slate-800 text-white focus:border-teal-500' 
                      : 'bg-white border-slate-200 text-slate-900 focus:border-teal-600'
                  }`}
                />
              </div>

              {/* Quick Template Chips */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Quick Response Templates:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { label: 'Available in Stock', text: 'Hello! We are pleased to confirm that this medication is currently in stock at our dispensary counter and available for immediate pickup or delivery.' },
                    { label: 'Out of Stock / Restocking', text: 'Thank you for reaching out. This medication is currently out of stock in our active lots. We anticipate receiving our next supply shipment within 2-3 business days.' },
                    { label: 'Prescription Required', text: 'Please be advised that this medicine is a prescription-only pharmaceutical (Schedule IV/V). Kindly bring a valid physician prescription to our counter or upload it through the website.' }
                  ].map((tpl, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setReplyText(tpl.text)}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-semibold border border-teal-500/30 bg-teal-500/10 text-teal-700 dark:text-teal-300 hover:bg-teal-500/20 transition-colors cursor-pointer"
                    >
                      + {tpl.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Response Message Textarea */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>Pharmacist / Clinical Response Message</span>
                  <span className="text-[10px] text-slate-400 font-normal">Formatted as professional HTML email</span>
                </label>
                <textarea
                  required
                  rows={6}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Type your professional response to the customer here..."
                  className={`w-full px-3 py-2.5 rounded-xl text-xs border transition-colors outline-none leading-relaxed ${
                    isDark 
                      ? 'bg-slate-950 border-slate-800 text-white focus:border-teal-500' 
                      : 'bg-white border-slate-200 text-slate-900 focus:border-teal-600'
                  }`}
                />
              </div>

              {/* Post-Response Status Update Selection */}
              <div className="flex items-center justify-between gap-4 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-xs">
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-200 block">Status After Sending</span>
                  <span className="text-[11px] text-slate-400">Mark inquiry status once email is dispatched</span>
                </div>
                <select
                  value={replyStatus}
                  onChange={(e) => setReplyStatus(e.target.value)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors outline-none cursor-pointer ${
                    isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
                  }`}
                >
                  <option value="RESOLVED">Resolved (Recommended)</option>
                  <option value="IN_REVIEW">Keep In Review</option>
                </select>
              </div>

              {/* Feedback Alert */}
              {replyFeedback && (
                <div className={`p-3.5 rounded-2xl text-xs flex items-center gap-2 ${
                  replyFeedback.type === 'success'
                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                    : 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30'
                }`}>
                  {replyFeedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                  <span>{replyFeedback.message}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setSelectedInquiryForReply(null)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={replySending || !replyText.trim()}
                  className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-md shadow-teal-600/20"
                >
                  <Send className={`w-3.5 h-3.5 ${replySending ? 'animate-pulse' : ''}`} />
                  <span>{replySending ? 'Dispatching Email...' : 'Send Email Response'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 1: ADD NEW MEDICINE */}
      {isNewMedModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
          <div className={`border rounded-2xl sm:rounded-3xl p-5 sm:p-7 w-full max-w-xl max-h-[92vh] overflow-y-auto my-auto space-y-4 shadow-2xl transition-all ${
            isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                  Create New Medicine Formulation
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Register approved formulary item with dosage and price
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsNewMedModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateMedicine} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="text-slate-500 dark:text-slate-400 font-bold block mb-1">Trade / Brand Name *</label>
                  <input
                    type="text"
                    required
                    value={medForm.name}
                    onChange={(e) => setMedForm({ ...medForm, name: e.target.value })}
                    placeholder="e.g. Augmentin 625mg"
                    className={`w-full p-2.5 sm:p-3 rounded-xl border text-xs focus:outline-none focus:border-teal-500 ${
                      isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
                <div>
                  <label className="text-slate-500 dark:text-slate-400 font-bold block mb-1">Generic Molecule *</label>
                  <input
                    type="text"
                    required
                    value={medForm.generic_name}
                    onChange={(e) => setMedForm({ ...medForm, generic_name: e.target.value })}
                    placeholder="e.g. Amoxicillin + Clavulanate"
                    className={`w-full p-2.5 sm:p-3 rounded-xl border text-xs focus:outline-none focus:border-teal-500 ${
                      isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="text-slate-500 dark:text-slate-400 font-bold block mb-1">Brand Manufacturer *</label>
                  <select
                    required
                    value={medForm.brand_id}
                    onChange={(e) => setMedForm({ ...medForm, brand_id: e.target.value })}
                    className={`w-full p-2.5 sm:p-3 rounded-xl border text-xs focus:outline-none focus:border-teal-500 font-medium ${
                      isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  >
                    <option value="">Select Brand</option>
                    {brands.map((b) => (
                      <option key={b.brand_id} value={b.brand_id}>{b.brand_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-slate-500 dark:text-slate-400 font-bold block mb-1">Therapeutic Category *</label>
                  <select
                    required
                    value={medForm.category_id}
                    onChange={(e) => setMedForm({ ...medForm, category_id: e.target.value })}
                    className={`w-full p-2.5 sm:p-3 rounded-xl border text-xs focus:outline-none focus:border-teal-500 font-medium ${
                      isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  >
                    <option value="">Select Category</option>
                    {categories.map((c) => (
                      <option key={c.category_id} value={c.category_id}>{c.category_name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-slate-500 dark:text-slate-400 font-bold block">
                      Dosage / Packaging Form *
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsCustomDosageForm(!isCustomDosageForm)}
                      className="text-[10px] text-teal-600 dark:text-teal-400 font-bold hover:underline cursor-pointer"
                    >
                      {isCustomDosageForm ? '← Pick from list' : '+ Custom'}
                    </button>
                  </div>
                  {isCustomDosageForm ? (
                    <input
                      type="text"
                      required
                      value={medForm.dosage_form}
                      onChange={(e) => setMedForm({ ...medForm, dosage_form: e.target.value })}
                      placeholder="e.g. Box of 50, 1 Liter, Packet..."
                      className={`w-full p-2.5 sm:p-3 rounded-xl border text-xs focus:outline-none focus:border-teal-500 ${
                        isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                      }`}
                    />
                  ) : (
                    <select
                      required
                      value={medForm.dosage_form}
                      onChange={(e) => {
                        if (e.target.value === '__CUSTOM__') {
                          setIsCustomDosageForm(true);
                        } else {
                          setMedForm({ ...medForm, dosage_form: e.target.value });
                        }
                      }}
                      className={`w-full p-2.5 sm:p-3 rounded-xl border text-xs focus:outline-none focus:border-teal-500 font-medium cursor-pointer ${
                        isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                      }`}
                    >
                      <option value="">Select Dosage / Form</option>
                      {DOSAGE_AND_PACKAGING_GROUPS.map((grp, gIdx) => (
                        <optgroup key={gIdx} label={grp.category}>
                          {grp.items.map((item, iIdx) => (
                            <option key={iIdx} value={item}>{item}</option>
                          ))}
                        </optgroup>
                      ))}
                      <option value="__CUSTOM__">+ Other / Custom Form (Type manually)...</option>
                    </select>
                  )}
                </div>
                <div>
                  <label className="text-slate-500 dark:text-slate-400 font-bold block mb-1">Strength *</label>
                  <input
                    type="text"
                    required
                    value={medForm.strength}
                    onChange={(e) => setMedForm({ ...medForm, strength: e.target.value })}
                    placeholder="500mg"
                    className={`w-full p-2.5 sm:p-3 rounded-xl border text-xs focus:outline-none focus:border-teal-500 ${
                      isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
                <div>
                  <label className="text-slate-500 dark:text-slate-400 font-bold block mb-1">Unit Price (Rs.) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={medForm.unit_price}
                    onChange={(e) => setMedForm({ ...medForm, unit_price: e.target.value })}
                    placeholder="120.00"
                    className={`w-full p-2.5 sm:p-3 rounded-xl border text-xs font-mono font-bold focus:outline-none focus:border-teal-500 ${
                      isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
                <div>
                  <label className="text-slate-500 dark:text-slate-400 font-bold block mb-1">Low Stock Limit</label>
                  <input
                    type="number"
                    min="1"
                    value={medForm.low_stock_threshold}
                    onChange={(e) => setMedForm({ ...medForm, low_stock_threshold: e.target.value })}
                    placeholder="20"
                    className={`w-full p-2.5 sm:p-3 rounded-xl border text-xs font-mono focus:outline-none focus:border-teal-500 ${
                      isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-500 dark:text-slate-400 font-bold block mb-1">Clinical Indications / Usage Note</label>
                <textarea
                  rows={2}
                  value={medForm.description}
                  onChange={(e) => setMedForm({ ...medForm, description: e.target.value })}
                  placeholder="Clinical usage and indications..."
                  className={`w-full p-2.5 sm:p-3 rounded-xl border text-xs focus:outline-none focus:border-teal-500 ${
                    isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                ></textarea>
              </div>

              {/* Product Packaging Photo Upload Field */}
              <MedicineImageUploadField
                value={medForm.image_url}
                onChange={(newUrl) => setMedForm({ ...medForm, image_url: newUrl })}
                dosageForm={medForm.dosage_form}
                medicineName={medForm.name}
                isDark={isDark}
              />

              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsNewMedModalOpen(false)}
                  className={`w-full sm:w-auto px-4 py-2.5 rounded-xl font-bold cursor-pointer transition-colors ${
                    isDark ? 'bg-slate-800 text-slate-300 hover:text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-black cursor-pointer shadow-md shadow-teal-600/20 transition-all"
                >
                  Save Medicine Formulation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: RECEIVE NEW BATCH */}
      {isNewBatchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
          <div className={`border rounded-2xl sm:rounded-3xl p-5 sm:p-7 w-full max-w-xl max-h-[92vh] overflow-y-auto my-auto space-y-4 shadow-2xl transition-all ${
            isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                  Receive New Inventory Batch
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Register verified incoming stock lot from certified supplier
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsNewBatchModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateBatch} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="text-slate-500 dark:text-slate-400 font-bold block mb-1">Target Medicine *</label>
                  <select
                    required
                    value={batchForm.medicine_id}
                    onChange={(e) => setBatchForm({ ...batchForm, medicine_id: e.target.value })}
                    className={`w-full p-2.5 sm:p-3 rounded-xl border text-xs focus:outline-none focus:border-teal-500 font-medium ${
                      isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  >
                    <option value="">Select Medicine Formulation</option>
                    {medicines.map((m) => (
                      <option key={m.medicine_id} value={m.medicine_id}>{m.name} ({m.generic_name})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-slate-500 dark:text-slate-400 font-bold block mb-1">Authorized Supplier *</label>
                  <select
                    required
                    value={batchForm.supplier_id}
                    onChange={(e) => setBatchForm({ ...batchForm, supplier_id: e.target.value })}
                    className={`w-full p-2.5 sm:p-3 rounded-xl border text-xs focus:outline-none focus:border-teal-500 font-medium ${
                      isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  >
                    <option value="">Select Supplier</option>
                    {suppliers.map((s) => (
                      <option key={s.supplier_id} value={s.supplier_id}>{s.supplier_name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-slate-500 dark:text-slate-400 font-bold block text-xs">
                    Batch / Lot Number *
                  </label>
                  <button
                    type="button"
                    onClick={handleAutoGenerateBatchNumber}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-teal-500/10 hover:bg-teal-500 text-teal-600 hover:text-white dark:text-teal-400 dark:hover:text-white border border-teal-500/30 hover:border-teal-500 transition-all cursor-pointer shadow-2xs"
                    title="Generate compliant batch number for new products without lot number"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Generate Batch #</span>
                  </button>
                </div>

                <div className="relative">
                  <input
                    type="text"
                    required
                    value={batchForm.batch_number}
                    onChange={(e) => setBatchForm({ ...batchForm, batch_number: e.target.value.toUpperCase() })}
                    placeholder="e.g. AUG-2026-X1 (or click Generate Batch #)"
                    className={`w-full p-2.5 sm:p-3 pr-28 rounded-xl border font-mono text-xs focus:outline-none focus:border-teal-500 ${
                      isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={handleAutoGenerateBatchNumber}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-teal-600 hover:bg-teal-500 text-white flex items-center gap-1 transition-all shadow-xs cursor-pointer"
                    title="Generate internal batch number"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Generate</span>
                  </button>
                </div>

                {/* Helper notice for new products without batch number */}
                <div className="mt-1.5 p-2 rounded-xl bg-teal-50/70 dark:bg-teal-950/30 border border-teal-200/60 dark:border-teal-800/60 flex items-center justify-between text-[11px] gap-2">
                  <div className="flex items-center gap-1.5 text-teal-800 dark:text-teal-300 min-w-0">
                    <Sparkles className="w-3.5 h-3.5 text-teal-500 shrink-0" />
                    <span className="truncate">
                      <strong>New product without manufacturer lot?</strong> Auto-generate a compliant lot code.
                    </span>
                  </div>
                  {batchForm.batch_number ? (
                    <button
                      type="button"
                      onClick={handleAutoGenerateBatchNumber}
                      className="text-[10px] font-bold text-teal-600 dark:text-teal-400 hover:underline shrink-0 flex items-center gap-1 cursor-pointer"
                      title="Generate another unique lot number"
                    >
                      <RefreshCw className="w-2.5 h-2.5" />
                      Regenerate
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleAutoGenerateBatchNumber}
                      className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-600 text-white hover:bg-teal-500 shrink-0 cursor-pointer transition-colors"
                    >
                      Auto-Fill
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="text-slate-500 dark:text-slate-400 font-bold block mb-1">Manufacture Date *</label>
                  <input
                    type="date"
                    required
                    value={batchForm.manufacture_date}
                    onChange={(e) => setBatchForm({ ...batchForm, manufacture_date: e.target.value })}
                    className={`w-full p-2.5 sm:p-3 rounded-xl border text-xs focus:outline-none focus:border-teal-500 ${
                      isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
                <div>
                  <label className="text-slate-500 dark:text-slate-400 font-bold block mb-1">Expiry Date * (&gt; Mfg Date)</label>
                  <input
                    type="date"
                    required
                    value={batchForm.expiry_date}
                    onChange={(e) => setBatchForm({ ...batchForm, expiry_date: e.target.value })}
                    className={`w-full p-2.5 sm:p-3 rounded-xl border text-xs focus:outline-none focus:border-teal-500 ${
                      isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="text-slate-500 dark:text-slate-400 font-bold block mb-1">Units Received *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={batchForm.quantity}
                    onChange={(e) => setBatchForm({ ...batchForm, quantity: e.target.value })}
                    placeholder="100"
                    className={`w-full p-2.5 sm:p-3 rounded-xl border text-xs font-mono font-bold focus:outline-none focus:border-teal-500 ${
                      isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
                <div>
                  <label className="text-slate-500 dark:text-slate-400 font-bold block mb-1">Wholesale Cost (Rs.) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={batchForm.unit_cost}
                    onChange={(e) => setBatchForm({ ...batchForm, unit_cost: e.target.value })}
                    placeholder="85.00"
                    className={`w-full p-2.5 sm:p-3 rounded-xl border text-xs font-mono font-bold focus:outline-none focus:border-teal-500 ${
                      isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsNewBatchModalOpen(false)}
                  className={`w-full sm:w-auto px-4 py-2.5 rounded-xl font-bold cursor-pointer transition-colors ${
                    isDark ? 'bg-slate-800 text-slate-300 hover:text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-black cursor-pointer shadow-md shadow-teal-600/20 transition-all"
                >
                  Register Inventory Batch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: ADJUST BATCH STOCK & EXPIRY SCHEDULE */}
      {selectedBatchForAdjust && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
          <div className={`border rounded-2xl sm:rounded-3xl p-5 sm:p-7 w-full max-w-lg max-h-[92vh] overflow-y-auto my-auto space-y-4 shadow-2xl transition-all ${
            isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-600 flex items-center justify-center shrink-0">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                    Adjust Batch Stock & Expiry Info
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Lot: <strong className="text-teal-600 dark:text-teal-400 font-mono">#{selectedBatchForAdjust.batch_number}</strong> ({selectedBatchForAdjust.medicine_name})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedBatchForAdjust(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Current Batch Snapshot */}
            <div className={`p-3.5 rounded-2xl border text-xs grid grid-cols-2 sm:grid-cols-4 gap-2.5 ${
              isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div>
                <span className="text-[10px] text-slate-400 block font-bold uppercase">Current Stock</span>
                <span className="font-mono font-black text-sm text-teal-600 dark:text-teal-400">
                  {selectedBatchForAdjust.stock_quantity} units
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-bold uppercase">Current Expiry</span>
                <span className={`font-mono font-bold text-xs ${
                  new Date(selectedBatchForAdjust.expiry_date) <= new Date() ? 'text-rose-500' : 'text-slate-700 dark:text-slate-300'
                }`}>
                  {new Date(selectedBatchForAdjust.expiry_date).toLocaleDateString()}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-bold uppercase">Time Left</span>
                <span className={`font-mono text-xs font-bold ${
                  Number(selectedBatchForAdjust.days_to_expiry) <= 0 ? 'text-rose-500' : 'text-emerald-500'
                }`}>
                  {Number(selectedBatchForAdjust.days_to_expiry) <= 0 ? 'Expired' : `${selectedBatchForAdjust.days_to_expiry}d`}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-bold uppercase">Status</span>
                <span className="font-mono text-[11px] font-bold uppercase">
                  {selectedBatchForAdjust.status}
                </span>
              </div>
            </div>

            <form onSubmit={handleAdjustStock} className="space-y-4 text-xs">
              {/* Field 1: Quantity */}
              <div>
                <label className="text-slate-700 dark:text-slate-300 font-bold block mb-1">
                  New Verified Current Stock Units *
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(e.target.value)}
                  className={`w-full p-3 rounded-xl border font-bold text-base font-mono focus:outline-none focus:border-teal-500 ${
                    isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
                
                {/* Fast presets */}
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">Quick adjust:</span>
                  {[-10, -1, +1, +10, +50].map((delta) => (
                    <button
                      key={delta}
                      type="button"
                      onClick={() => setAdjustQty(Math.max(0, (parseInt(adjustQty, 10) || 0) + delta))}
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold cursor-pointer border transition-colors ${
                        isDark 
                          ? 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700' 
                          : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {delta > 0 ? `+${delta}` : delta}
                    </button>
                  ))}
                </div>
              </div>

              {/* Field 2 & 3: Expiry Date & Manufacture Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="text-slate-700 dark:text-slate-300 font-bold block mb-1">
                    Expiry Date (Shelf Life)
                  </label>
                  <input
                    type="date"
                    value={adjustExpiryDate}
                    onChange={(e) => setAdjustExpiryDate(e.target.value)}
                    className={`w-full p-2.5 rounded-xl border text-xs font-medium focus:outline-none focus:border-teal-500 ${
                      isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block leading-tight">
                    Set a future date to restore expired lot to active status.
                  </span>
                </div>
                <div>
                  <label className="text-slate-700 dark:text-slate-300 font-bold block mb-1">
                    Manufacture Date (Mfg Date)
                  </label>
                  <input
                    type="date"
                    value={adjustMfgDate}
                    onChange={(e) => setAdjustMfgDate(e.target.value)}
                    className={`w-full p-2.5 rounded-xl border text-xs font-medium focus:outline-none focus:border-teal-500 ${
                      isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block leading-tight">
                    Batch production or receipt date.
                  </span>
                </div>
              </div>

              {/* Field 4: Regulatory Status */}
              <div>
                <label className="text-slate-700 dark:text-slate-300 font-bold block mb-1">
                  Regulatory & Usability Status
                </label>
                <select
                  value={adjustStatus}
                  onChange={(e) => setAdjustStatus(e.target.value)}
                  className={`w-full p-2.5 rounded-xl border text-xs font-bold focus:outline-none focus:border-teal-500 cursor-pointer ${
                    isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                >
                  <option value="active">Active (Saleable at POS dispensing counter)</option>
                  <option value="quarantined">Quarantined (Safety hold, excluded from POS)</option>
                  <option value="depleted">Depleted (0 Stock)</option>
                  <option value="recalled">Recalled (Manufacturer recall)</option>
                </select>
              </div>

              {/* Field 5: Adjustment Reason */}
              <div>
                <label className="text-slate-700 dark:text-slate-300 font-bold block mb-1">
                  Adjustment Reason / Dispensary Note *
                </label>
                <input
                  type="text"
                  required
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="e.g. Physical inventory count discrepancy or shelf-life renewal"
                  className={`w-full p-2.5 sm:p-3 rounded-xl border text-xs focus:outline-none focus:border-teal-500 ${
                    isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedBatchForAdjust(null)}
                  className={`w-full sm:w-auto px-4 py-2.5 rounded-xl font-bold cursor-pointer transition-colors ${
                    isDark ? 'bg-slate-800 text-slate-300 hover:text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-black cursor-pointer shadow-md shadow-teal-600/20 transition-all flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Update Stock & Expiry</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: EDIT MEDICINE FORMULATION */}
      {isEditMedModalOpen && selectedMedForEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
          <div className={`border rounded-2xl sm:rounded-3xl p-5 sm:p-7 w-full max-w-xl max-h-[92vh] overflow-y-auto my-auto space-y-4 shadow-2xl transition-all ${
            isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                  Edit Medicine Formulation
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Update formulary details, price, or reorder threshold for #{selectedMedForEdit.medicine_id}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsEditMedModalOpen(false);
                  setSelectedMedForEdit(null);
                }}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateMedicine} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="text-slate-500 dark:text-slate-400 font-bold block mb-1">Trade / Brand Name *</label>
                  <input
                    type="text"
                    required
                    value={editMedForm.name}
                    onChange={(e) => setEditMedForm({ ...editMedForm, name: e.target.value })}
                    className={`w-full p-2.5 sm:p-3 rounded-xl border text-xs focus:outline-none focus:border-teal-500 ${
                      isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
                <div>
                  <label className="text-slate-500 dark:text-slate-400 font-bold block mb-1">Generic Molecule *</label>
                  <input
                    type="text"
                    required
                    value={editMedForm.generic_name}
                    onChange={(e) => setEditMedForm({ ...editMedForm, generic_name: e.target.value })}
                    className={`w-full p-2.5 sm:p-3 rounded-xl border text-xs focus:outline-none focus:border-teal-500 ${
                      isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="text-slate-500 dark:text-slate-400 font-bold block mb-1">Formulary Category *</label>
                  <select
                    required
                    value={editMedForm.category_id}
                    onChange={(e) => setEditMedForm({ ...editMedForm, category_id: e.target.value })}
                    className={`w-full p-2.5 sm:p-3 rounded-xl border text-xs focus:outline-none focus:border-teal-500 cursor-pointer ${
                      isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  >
                    <option value="">Select Category</option>
                    {categories.map((c) => (
                      <option key={c.category_id} value={c.category_id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-slate-500 dark:text-slate-400 font-bold block mb-1">Manufacturer Brand *</label>
                  <select
                    required
                    value={editMedForm.brand_id}
                    onChange={(e) => setEditMedForm({ ...editMedForm, brand_id: e.target.value })}
                    className={`w-full p-2.5 sm:p-3 rounded-xl border text-xs focus:outline-none focus:border-teal-500 cursor-pointer ${
                      isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  >
                    <option value="">Select Brand</option>
                    {brands.map((b) => (
                      <option key={b.brand_id} value={b.brand_id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-slate-500 dark:text-slate-400 font-bold block">
                      Dosage / Packaging Form *
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsEditCustomDosageForm(!isEditCustomDosageForm)}
                      className="text-[10px] text-teal-600 dark:text-teal-400 font-bold hover:underline cursor-pointer"
                    >
                      {isEditCustomDosageForm ? '← Pick from list' : '+ Custom'}
                    </button>
                  </div>
                  {isEditCustomDosageForm ? (
                    <input
                      type="text"
                      required
                      value={editMedForm.dosage_form}
                      onChange={(e) => setEditMedForm({ ...editMedForm, dosage_form: e.target.value })}
                      placeholder="e.g. Box of 100, 2 Liters, Packet..."
                      className={`w-full p-2.5 sm:p-3 rounded-xl border text-xs focus:outline-none focus:border-teal-500 ${
                        isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                      }`}
                    />
                  ) : (
                    <select
                      required
                      value={editMedForm.dosage_form}
                      onChange={(e) => {
                        if (e.target.value === '__CUSTOM__') {
                          setIsEditCustomDosageForm(true);
                        } else {
                          setEditMedForm({ ...editMedForm, dosage_form: e.target.value });
                        }
                      }}
                      className={`w-full p-2.5 sm:p-3 rounded-xl border text-xs focus:outline-none focus:border-teal-500 font-medium cursor-pointer ${
                        isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                      }`}
                    >
                      <option value="">Select Dosage / Form</option>
                      {DOSAGE_AND_PACKAGING_GROUPS.map((grp, gIdx) => (
                        <optgroup key={gIdx} label={grp.category}>
                          {grp.items.map((item, iIdx) => (
                            <option key={iIdx} value={item}>{item}</option>
                          ))}
                        </optgroup>
                      ))}
                      {editMedForm.dosage_form && !ALL_DOSAGE_FORMS.includes(editMedForm.dosage_form) && (
                        <option value={editMedForm.dosage_form}>{editMedForm.dosage_form} (Current Custom)</option>
                      )}
                      <option value="__CUSTOM__">+ Other / Custom Form (Type manually)...</option>
                    </select>
                  )}
                </div>
                <div>
                  <label className="text-slate-500 dark:text-slate-400 font-bold block mb-1">Strength</label>
                  <input
                    type="text"
                    value={editMedForm.strength}
                    onChange={(e) => setEditMedForm({ ...editMedForm, strength: e.target.value })}
                    placeholder="e.g. 500mg"
                    className={`w-full p-2.5 sm:p-3 rounded-xl border text-xs focus:outline-none focus:border-teal-500 ${
                      isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
                <div>
                  <label className="text-slate-500 dark:text-slate-400 font-bold block mb-1">Unit Price (Rs.) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editMedForm.unit_price}
                    onChange={(e) => setEditMedForm({ ...editMedForm, unit_price: e.target.value })}
                    className={`w-full p-2.5 sm:p-3 rounded-xl border text-xs font-mono font-bold focus:outline-none focus:border-teal-500 ${
                      isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 items-center">
                <div>
                  <label className="text-slate-500 dark:text-slate-400 font-bold block mb-1">Low Stock Threshold</label>
                  <input
                    type="number"
                    value={editMedForm.low_stock_threshold}
                    onChange={(e) => setEditMedForm({ ...editMedForm, low_stock_threshold: e.target.value })}
                    className={`w-full p-2.5 sm:p-3 rounded-xl border text-xs font-mono focus:outline-none focus:border-teal-500 ${
                      isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
                <div className="flex items-center gap-2 pt-4">
                  <input
                    type="checkbox"
                    id="edit_is_active"
                    checked={editMedForm.is_active}
                    onChange={(e) => setEditMedForm({ ...editMedForm, is_active: e.target.checked })}
                    className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 cursor-pointer"
                  />
                  <label htmlFor="edit_is_active" className="text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                    Active Formulation (Available for Dispensing)
                  </label>
                </div>
              </div>

              {/* Promotional Offer Allocation Section in Edit Modal */}
              <div className={`p-3.5 rounded-2xl border space-y-3 ${
                editMedForm.is_offer 
                  ? 'bg-rose-500/10 border-rose-500/30' 
                  : isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Flame className={`w-4 h-4 ${editMedForm.is_offer ? 'text-rose-500 animate-pulse' : 'text-slate-400'}`} />
                    <div>
                      <label htmlFor="edit_med_is_offer" className="font-bold text-xs text-slate-900 dark:text-white cursor-pointer">
                        Allocate as Special Promotional Offer
                      </label>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">
                        Displays this medicine in the Website Special Offers section with a SALE badge.
                      </p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    id="edit_med_is_offer"
                    checked={editMedForm.is_offer}
                    onChange={(e) => setEditMedForm({ ...editMedForm, is_offer: e.target.checked })}
                    className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 cursor-pointer"
                  />
                </div>

                {editMedForm.is_offer && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-rose-500/20">
                    <div>
                      <label className="text-slate-700 dark:text-slate-300 font-bold block mb-1">
                        Discount Rate (%) *
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="1"
                          max="90"
                          step="0.5"
                          value={editMedForm.discount_percent}
                          onChange={(e) => setEditMedForm({ ...editMedForm, discount_percent: parseFloat(e.target.value) || 0 })}
                          className={`w-full p-2.5 rounded-xl border text-xs font-mono font-bold focus:outline-none focus:border-rose-500 ${
                            isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-300 text-slate-900'
                          }`}
                        />
                        <span className="font-bold text-rose-500 text-xs">% OFF</span>
                      </div>
                    </div>

                    <div className={`p-2.5 rounded-xl border flex flex-col justify-center ${
                      isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-white border-slate-200'
                    }`}>
                      <span className="text-[10px] text-slate-400 font-bold block">Live Counter Price:</span>
                      <div className="flex items-baseline gap-1.5 mt-0.5">
                        <span className="text-xs font-mono font-bold line-through text-slate-400">
                          Rs. {Number(editMedForm.unit_price || 0).toFixed(2)}
                        </span>
                        <span className="text-sm font-mono font-black text-emerald-500">
                          Rs. {(Number(editMedForm.unit_price || 0) * (1 - (Number(editMedForm.discount_percent) || 0) / 100)).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Product Packaging Photo Field in Edit Modal */}
              <MedicineImageUploadField
                value={editMedForm.image_url}
                onChange={(newUrl) => setEditMedForm({ ...editMedForm, image_url: newUrl })}
                dosageForm={editMedForm.dosage_form}
                medicineName={editMedForm.name}
                isDark={isDark}
              />

              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditMedModalOpen(false);
                    setSelectedMedForEdit(null);
                  }}
                  className={`w-full sm:w-auto px-4 py-2.5 rounded-xl font-bold cursor-pointer transition-colors ${
                    isDark ? 'bg-slate-800 text-slate-300 hover:text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-black cursor-pointer shadow-md shadow-teal-600/20 transition-all"
                >
                  Save Formulation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DEDICATED MODAL: PROMOTIONAL OFFER ALLOCATION & DISCOUNT MANAGER */}
      {isOfferModalOpen && selectedMedForOffer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
          <div className={`border rounded-2xl sm:rounded-3xl p-6 sm:p-7 w-full max-w-lg max-h-[92vh] overflow-y-auto my-auto space-y-5 shadow-2xl transition-all ${
            isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 to-rose-500 text-white flex items-center justify-center shadow-md">
                  <Flame className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                    Promotional Offer Allocation
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Allocate to Website Special Offers with promotional pricing
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsOfferModalOpen(false);
                  setSelectedMedForOffer(null);
                }}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Target Product Summary */}
            <div className={`p-4 rounded-2xl border flex items-center gap-3.5 ${
              isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="w-14 h-14 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1 shrink-0 overflow-hidden flex items-center justify-center shadow-xs">
                <img 
                  src={getMedicineProductImage(selectedMedForOffer)} 
                  alt={selectedMedForOffer.name} 
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wider block">
                  {selectedMedForOffer.category_name}
                </span>
                <h4 className="font-extrabold text-sm text-slate-900 dark:text-white truncate">
                  {selectedMedForOffer.name}
                </h4>
                <span className="text-xs text-slate-400 truncate block">
                  {selectedMedForOffer.generic_name} • {selectedMedForOffer.brand_name}
                </span>
              </div>
              <div className="text-right shrink-0">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Regular Price</span>
                <span className="text-sm font-black font-mono text-slate-900 dark:text-white">
                  Rs. {Number(selectedMedForOffer.unit_price).toFixed(2)}
                </span>
              </div>
            </div>

            {/* Offer Form */}
            <form onSubmit={handleSaveOffer} className="space-y-4 text-xs">
              {/* Toggle Switch */}
              <div className={`p-4 rounded-2xl border flex items-center justify-between transition-colors ${
                offerForm.is_offer 
                  ? 'bg-rose-500/10 border-rose-500/30' 
                  : isDark ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <div>
                  <label htmlFor="modal_is_offer_toggle" className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-1.5 cursor-pointer">
                    <Flame className={`w-4 h-4 ${offerForm.is_offer ? 'text-rose-500 animate-pulse' : 'text-slate-400'}`} />
                    <span>Make This An Active Offer</span>
                  </label>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    When enabled, only this and other allocated offer items will show in the website Offers section.
                  </p>
                </div>
                <input
                  type="checkbox"
                  id="modal_is_offer_toggle"
                  checked={offerForm.is_offer}
                  onChange={(e) => setOfferForm({ ...offerForm, is_offer: e.target.checked })}
                  className="w-5 h-5 rounded text-rose-600 focus:ring-rose-500 cursor-pointer"
                />
              </div>

              {/* Discount controls (enabled only if offer is on) */}
              {offerForm.is_offer && (
                <div className="space-y-3 p-4 rounded-2xl border border-rose-200 dark:border-rose-900/40 bg-gradient-to-br from-rose-500/5 to-amber-500/5 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-slate-700 dark:text-slate-300">
                      Promotional Discount Rate (% OFF) *
                    </label>
                    <span className="font-mono font-black text-rose-600 text-sm">
                      {offerForm.discount_percent}% OFF
                    </span>
                  </div>

                  {/* Quick preset buttons */}
                  <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
                    {[5, 10, 15, 20, 25, 30, 50].map((pct) => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => setOfferForm({ ...offerForm, discount_percent: pct })}
                        className={`py-1.5 rounded-xl font-black text-xs transition-all cursor-pointer border ${
                          Number(offerForm.discount_percent) === pct
                            ? 'bg-rose-500 text-white border-rose-600 shadow-sm scale-105'
                            : isDark
                              ? 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700'
                              : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        {pct}%
                      </button>
                    ))}
                  </div>

                  {/* Custom input */}
                  <div>
                    <input
                      type="number"
                      min="1"
                      max="90"
                      step="0.5"
                      required
                      value={offerForm.discount_percent}
                      onChange={(e) => setOfferForm({ ...offerForm, discount_percent: Math.max(1, Math.min(90, parseFloat(e.target.value) || 0)) })}
                      placeholder="Custom percentage (e.g. 15)"
                      className={`w-full p-2.5 rounded-xl border text-xs font-mono font-bold focus:outline-none focus:border-rose-500 ${
                        isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>

                  {/* Live Pricing Breakdown */}
                  <div className={`p-3 rounded-xl border space-y-1.5 ${
                    isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-white border-slate-200'
                  }`}>
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>Regular Counter Price:</span>
                      <span className="font-mono font-bold">Rs. {Number(selectedMedForOffer.unit_price).toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-rose-500 font-bold">
                      <span>Discount Savings ({offerForm.discount_percent}%):</span>
                      <span className="font-mono">-Rs. {((Number(selectedMedForOffer.unit_price) * Number(offerForm.discount_percent)) / 100).toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs font-black pt-1 border-t border-slate-100 dark:border-slate-800">
                      <span className="text-slate-900 dark:text-white">Discounted Customer Price:</span>
                      <span className="font-mono text-emerald-500 text-sm">
                        Rs. {(Number(selectedMedForOffer.unit_price) * (1 - Number(offerForm.discount_percent) / 100)).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsOfferModalOpen(false);
                    setSelectedMedForOffer(null);
                  }}
                  className={`px-4 py-2.5 rounded-xl font-bold cursor-pointer transition-colors ${
                    isDark ? 'bg-slate-800 text-slate-300 hover:text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={offerSaving}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 text-white font-black cursor-pointer shadow-md shadow-rose-500/20 transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Flame className="w-4 h-4" />
                  <span>
                    {offerSaving 
                      ? 'Saving Offer...' 
                      : offerForm.is_offer 
                        ? 'Publish Offer to Website' 
                        : 'Remove Offer'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: REGISTER NEW STAFF USER */}
      {isNewUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
          <div className={`border rounded-2xl sm:rounded-3xl p-5 sm:p-7 w-full max-w-md max-h-[92vh] overflow-y-auto my-auto space-y-4 shadow-2xl transition-all ${
            isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                  Add Staff User Account
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Create role-based access credentials with bcrypt password hashing
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsNewUserModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4 text-xs">
              <div>
                <label className="text-slate-500 dark:text-slate-400 font-bold block mb-1">Full Legal Name *</label>
                <input
                  type="text"
                  required
                  value={newUserForm.full_name}
                  onChange={(e) => setNewUserForm({ ...newUserForm, full_name: e.target.value })}
                  placeholder="e.g. Kasun Perera"
                  className={`w-full p-2.5 sm:p-3 rounded-xl border text-xs focus:outline-none focus:border-teal-500 ${
                    isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="text-slate-500 dark:text-slate-400 font-bold block mb-1">Username *</label>
                  <input
                    type="text"
                    required
                    value={newUserForm.username}
                    onChange={(e) => setNewUserForm({ ...newUserForm, username: e.target.value.toLowerCase().replace(/\s+/g, '') })}
                    placeholder="e.g. kasun_p"
                    className={`w-full p-2.5 sm:p-3 rounded-xl border text-xs font-mono focus:outline-none focus:border-teal-500 ${
                      isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
                <div>
                  <label className="text-slate-500 dark:text-slate-400 font-bold block mb-1">Assigned Role *</label>
                  <select
                    value={newUserForm.role}
                    onChange={(e) => setNewUserForm({ ...newUserForm, role: e.target.value })}
                    className={`w-full p-2.5 sm:p-3 rounded-xl border text-xs focus:outline-none focus:border-teal-500 cursor-pointer ${
                      isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  >
                    <option value="PHARMACIST">Pharmacist</option>
                    <option value="CASHIER">Cashier</option>
                    <option value="ADMIN">Administrator</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-500 dark:text-slate-400 font-bold block mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={newUserForm.email}
                  onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                  placeholder="kasun@mypharmacist.lk"
                  className={`w-full p-2.5 sm:p-3 rounded-xl border text-xs focus:outline-none focus:border-teal-500 ${
                    isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div>
                <label className="text-slate-500 dark:text-slate-400 font-bold block mb-1">Password *</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newUserForm.password}
                  onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })}
                  placeholder="Min 6 characters"
                  className={`w-full p-2.5 sm:p-3 rounded-xl border text-xs focus:outline-none focus:border-teal-500 ${
                    isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              {/* Dispensary Privileges Configuration */}
              {newUserForm.role !== 'ADMIN' ? (
                <div className={`p-3.5 rounded-2xl border space-y-2.5 ${
                  isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                    Dispensary Permissions & Feature Access
                  </label>
                  <div className="space-y-2">
                    {[
                      { key: 'can_pos', label: 'POS Dispense Counter', desc: 'Prescription dispensing and cashier counter' },
                      { key: 'can_manage_medicines', label: 'Formulary Master Access', desc: 'Create and edit medicine catalog' },
                      { key: 'can_manage_batches', label: 'Batch Stock Management', desc: 'Receive shipments and adjust lot stock' },
                      { key: 'can_view_reports', label: 'Reports & Analytics', desc: 'View sales summaries and export reports' },
                      { key: 'can_manage_inquiries', label: 'Inquiry Analyst Section', desc: 'Access and grant edit privileges for customer inquiries' },
                      { key: 'can_view_audit', label: 'System Audit Trail', desc: 'View inventory and operation audit history' },
                    ].map((perm) => (
                      <label key={perm.key} className="flex items-start gap-2.5 p-2 rounded-xl hover:bg-teal-500/5 cursor-pointer transition-colors">
                        <input
                          type="checkbox"
                          checked={newUserForm.permissions?.[perm.key] || false}
                          onChange={(e) => setNewUserForm({
                            ...newUserForm,
                            permissions: {
                              ...newUserForm.permissions,
                              [perm.key]: e.target.checked
                            }
                          })}
                          className="mt-0.5 w-4 h-4 rounded text-teal-600 focus:ring-teal-500 cursor-pointer"
                        />
                        <div>
                          <div className="font-bold text-slate-800 dark:text-slate-200">{perm.label}</div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400">{perm.desc}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs">
                  <strong>Full Administrator Access:</strong> Administrators automatically have unrestricted access to all pharmacy modules.
                </div>
              )}

              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsNewUserModalOpen(false)}
                  className={`w-full sm:w-auto px-4 py-2.5 rounded-xl font-bold cursor-pointer transition-colors ${
                    isDark ? 'bg-slate-800 text-slate-300 hover:text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-black cursor-pointer shadow-md shadow-teal-600/20 transition-all"
                >
                  Create Staff Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 6: EDIT STAFF USER PRIVILEGES & DETAILS */}
      {isEditUserModalOpen && selectedUserForEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
          <div className={`border rounded-2xl sm:rounded-3xl p-5 sm:p-7 w-full max-w-lg max-h-[92vh] overflow-y-auto my-auto space-y-4 shadow-2xl transition-all ${
            isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-teal-500" />
                  Manage Staff Privileges & Details
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Update profile, role, password, and access permissions for <strong className="font-mono text-teal-600 dark:text-teal-400">@{selectedUserForEdit.username}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsEditUserModalOpen(false);
                  setSelectedUserForEdit(null);
                }}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUserPermissions} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="text-slate-500 dark:text-slate-400 font-bold block mb-1">Full Legal Name *</label>
                  <input
                    type="text"
                    required
                    value={editUserForm.full_name}
                    onChange={(e) => setEditUserForm({ ...editUserForm, full_name: e.target.value })}
                    className={`w-full p-2.5 sm:p-3 rounded-xl border text-xs focus:outline-none focus:border-teal-500 ${
                      isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
                <div>
                  <label className="text-slate-500 dark:text-slate-400 font-bold block mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={editUserForm.email}
                    onChange={(e) => setEditUserForm({ ...editUserForm, email: e.target.value })}
                    className={`w-full p-2.5 sm:p-3 rounded-xl border text-xs focus:outline-none focus:border-teal-500 ${
                      isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 items-center">
                <div>
                  <label className="text-slate-500 dark:text-slate-400 font-bold block mb-1">Assigned Role</label>
                  <select
                    value={editUserForm.role}
                    onChange={(e) => setEditUserForm({ ...editUserForm, role: e.target.value })}
                    className={`w-full p-2.5 sm:p-3 rounded-xl border text-xs focus:outline-none focus:border-teal-500 cursor-pointer ${
                      isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  >
                    <option value="PHARMACIST">Pharmacist</option>
                    <option value="ADMIN">Administrator</option>
                  </select>
                </div>
                <div className="pt-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editUserForm.is_active}
                      onChange={(e) => setEditUserForm({ ...editUserForm, is_active: e.target.checked })}
                      className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 cursor-pointer"
                    />
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Account Status: Active
                    </span>
                  </label>
                </div>
              </div>

              <div>
                <label className="text-slate-500 dark:text-slate-400 font-bold block mb-1">
                  Reset Password <span className="text-[10px] text-slate-400 font-normal">(Optional — leave blank to keep unchanged)</span>
                </label>
                <input
                  type="password"
                  minLength={6}
                  value={editUserForm.password}
                  onChange={(e) => setEditUserForm({ ...editUserForm, password: e.target.value })}
                  placeholder="Enter new password (min 6 characters) or leave blank"
                  className={`w-full p-2.5 sm:p-3 rounded-xl border text-xs focus:outline-none focus:border-teal-500 ${
                    isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              {/* Dispensary Privileges */}
              {editUserForm.role !== 'ADMIN' ? (
                <div className={`p-4 rounded-2xl border space-y-3 ${
                  isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div>
                    <h4 className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Shield className="w-4 h-4 text-teal-500" />
                      Dispensary Module Privileges
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Determine exactly what this pharmacist can see and operate on the platform
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {[
                      { key: 'can_pos', title: 'POS Dispense Counter', subtitle: 'Search, dispense & issue receipts' },
                      { key: 'can_manage_medicines', title: 'Formulary Master', subtitle: 'Add & edit medicine records' },
                      { key: 'can_manage_batches', title: 'Batch & Stock Control', subtitle: 'Receive lots & adjust stock counts' },
                      { key: 'can_view_reports', title: 'Reports & Analytics', subtitle: 'Access sales analytics & CSV export' },
                      { key: 'can_manage_inquiries', title: 'Inquiry Analyst Section', subtitle: 'Manage inquiries & grant edit privileges' },
                      { key: 'can_view_audit', title: 'System Audit Trail', subtitle: 'Inspect operation history & stock logs' },
                    ].map((p) => {
                      const isChecked = Boolean(editUserForm.permissions?.[p.key]);
                      return (
                        <div
                          key={p.key}
                          onClick={() => setEditUserForm({
                            ...editUserForm,
                            permissions: {
                              ...editUserForm.permissions,
                              [p.key]: !isChecked
                            }
                          })}
                          className={`p-3 rounded-xl border cursor-pointer select-none transition-all flex items-start gap-2.5 ${
                            isChecked
                              ? 'bg-teal-500/10 border-teal-500/40 text-teal-900 dark:text-teal-200 shadow-xs'
                              : isDark
                                ? 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                                : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}} 
                            className="mt-0.5 w-4 h-4 rounded text-teal-600 focus:ring-teal-500 cursor-pointer"
                          />
                          <div className="flex-1 min-w-0">
                            <div className={`font-bold text-xs ${isChecked ? 'text-teal-600 dark:text-teal-400' : ''}`}>
                              {p.title}
                            </div>
                            <div className="text-[10px] opacity-75 truncate">{p.subtitle}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs">
                  <strong>Full System Administrator:</strong> This account has unrestricted access to all dispensary counters, inventory batches, financial analytics, audit logs, and user management.
                </div>
              )}

              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditUserModalOpen(false);
                    setSelectedUserForEdit(null);
                  }}
                  className={`w-full sm:w-auto px-4 py-2.5 rounded-xl font-bold cursor-pointer transition-colors ${
                    isDark ? 'bg-slate-800 text-slate-300 hover:text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-black cursor-pointer shadow-md shadow-teal-600/20 transition-all"
                >
                  Save Changes & Privileges
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: REGISTER NEW PATIENT / SITE USER */}
      {isNewCustomerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
          <div className={`border rounded-2xl sm:rounded-3xl p-5 sm:p-7 w-full max-w-lg max-h-[92vh] overflow-y-auto my-auto space-y-4 shadow-2xl transition-all ${
            isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                    Register New Patient Account
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Enroll verified site customer into pharmacy MySQL database
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsNewCustomerModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="text-slate-500 dark:text-slate-400 font-bold block mb-1">Full Legal Name *</label>
                  <input
                    type="text"
                    required
                    value={newCustomerForm.full_name}
                    onChange={(e) => setNewCustomerForm({ ...newCustomerForm, full_name: e.target.value })}
                    placeholder="e.g. Nimal Jayawardena"
                    className={`w-full p-2.5 sm:p-3 rounded-xl border text-xs focus:outline-none focus:border-teal-500 ${
                      isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
                <div>
                  <label className="text-slate-500 dark:text-slate-400 font-bold block mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={newCustomerForm.email}
                    onChange={(e) => setNewCustomerForm({ ...newCustomerForm, email: e.target.value })}
                    placeholder="nimal@gmail.com"
                    className={`w-full p-2.5 sm:p-3 rounded-xl border text-xs focus:outline-none focus:border-teal-500 ${
                      isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="text-slate-500 dark:text-slate-400 font-bold block mb-1">Password *</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={newCustomerForm.password}
                    onChange={(e) => setNewCustomerForm({ ...newCustomerForm, password: e.target.value })}
                    placeholder="Min 6 characters"
                    className={`w-full p-2.5 sm:p-3 rounded-xl border text-xs focus:outline-none focus:border-teal-500 ${
                      isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
                <div>
                  <label className="text-slate-500 dark:text-slate-400 font-bold block mb-1">Contact Phone</label>
                  <input
                    type="text"
                    value={newCustomerForm.contact_no}
                    onChange={(e) => setNewCustomerForm({ ...newCustomerForm, contact_no: e.target.value })}
                    placeholder="+94 77 123 4567"
                    className={`w-full p-2.5 sm:p-3 rounded-xl border text-xs focus:outline-none focus:border-teal-500 ${
                      isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="text-slate-500 dark:text-slate-400 font-bold block mb-1">National Identity Card (NIC)</label>
                  <input
                    type="text"
                    value={newCustomerForm.nic}
                    onChange={(e) => setNewCustomerForm({ ...newCustomerForm, nic: e.target.value })}
                    placeholder="e.g. 199421508210 or 942150821V"
                    className={`w-full p-2.5 sm:p-3 rounded-xl border text-xs focus:outline-none focus:border-teal-500 ${
                      isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
                <div>
                  <label className="text-slate-500 dark:text-slate-400 font-bold block mb-1">Patient Age</label>
                  <input
                    type="text"
                    value={newCustomerForm.patient_age}
                    onChange={(e) => setNewCustomerForm({ ...newCustomerForm, patient_age: e.target.value })}
                    placeholder="e.g. 35 Yrs"
                    className={`w-full p-2.5 sm:p-3 rounded-xl border text-xs focus:outline-none focus:border-teal-500 ${
                      isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-500 dark:text-slate-400 font-bold block mb-1">Residential / Prescription Delivery Address</label>
                <textarea
                  rows={2}
                  value={newCustomerForm.address}
                  onChange={(e) => setNewCustomerForm({ ...newCustomerForm, address: e.target.value })}
                  placeholder="Street address, city, district..."
                  className={`w-full p-2.5 sm:p-3 rounded-xl border text-xs focus:outline-none focus:border-teal-500 ${
                    isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div className="pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={newCustomerForm.is_active}
                    onChange={(e) => setNewCustomerForm({ ...newCustomerForm, is_active: e.target.checked })}
                    className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 cursor-pointer"
                  />
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Activate account immediately upon registration
                  </span>
                </label>
              </div>

              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsNewCustomerModalOpen(false)}
                  className={`w-full sm:w-auto px-4 py-2.5 rounded-xl font-bold cursor-pointer transition-colors ${
                    isDark ? 'bg-slate-800 text-slate-300 hover:text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={customerSaving}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-black cursor-pointer shadow-md shadow-teal-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {customerSaving ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Saving Account...</span>
                    </>
                  ) : (
                    <span>Register Patient Account</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT PATIENT DETAILS & STATUS */}
      {isEditCustomerModalOpen && selectedCustomerForEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
          <div className={`border rounded-2xl sm:rounded-3xl p-5 sm:p-7 w-full max-w-lg max-h-[92vh] overflow-y-auto my-auto space-y-4 shadow-2xl transition-all ${
            isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
                  <Edit className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                    Edit Patient Profile & Status
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Update profile, contact records, and access status for <strong className="text-teal-600 dark:text-teal-400 font-mono">#{selectedCustomerForEdit.customer_id}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsEditCustomerModalOpen(false);
                  setSelectedCustomerForEdit(null);
                }}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateCustomer} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="text-slate-500 dark:text-slate-400 font-bold block mb-1">Full Legal Name *</label>
                  <input
                    type="text"
                    required
                    value={editCustomerForm.full_name}
                    onChange={(e) => setEditCustomerForm({ ...editCustomerForm, full_name: e.target.value })}
                    className={`w-full p-2.5 sm:p-3 rounded-xl border text-xs focus:outline-none focus:border-teal-500 ${
                      isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
                <div>
                  <label className="text-slate-500 dark:text-slate-400 font-bold block mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={editCustomerForm.email}
                    onChange={(e) => setEditCustomerForm({ ...editCustomerForm, email: e.target.value })}
                    className={`w-full p-2.5 sm:p-3 rounded-xl border text-xs focus:outline-none focus:border-teal-500 ${
                      isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="text-slate-500 dark:text-slate-400 font-bold block mb-1">
                    Reset Password <span className="text-[10px] text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="password"
                    minLength={6}
                    value={editCustomerForm.password}
                    onChange={(e) => setEditCustomerForm({ ...editCustomerForm, password: e.target.value })}
                    placeholder="Leave blank to retain password"
                    className={`w-full p-2.5 sm:p-3 rounded-xl border text-xs focus:outline-none focus:border-teal-500 ${
                      isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
                <div>
                  <label className="text-slate-500 dark:text-slate-400 font-bold block mb-1">Contact Phone</label>
                  <input
                    type="text"
                    value={editCustomerForm.contact_no}
                    onChange={(e) => setEditCustomerForm({ ...editCustomerForm, contact_no: e.target.value })}
                    className={`w-full p-2.5 sm:p-3 rounded-xl border text-xs focus:outline-none focus:border-teal-500 ${
                      isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="text-slate-500 dark:text-slate-400 font-bold block mb-1">National Identity Card (NIC)</label>
                  <input
                    type="text"
                    value={editCustomerForm.nic}
                    onChange={(e) => setEditCustomerForm({ ...editCustomerForm, nic: e.target.value })}
                    className={`w-full p-2.5 sm:p-3 rounded-xl border text-xs focus:outline-none focus:border-teal-500 ${
                      isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
                <div>
                  <label className="text-slate-500 dark:text-slate-400 font-bold block mb-1">Patient Age</label>
                  <input
                    type="text"
                    value={editCustomerForm.patient_age}
                    onChange={(e) => setEditCustomerForm({ ...editCustomerForm, patient_age: e.target.value })}
                    className={`w-full p-2.5 sm:p-3 rounded-xl border text-xs focus:outline-none focus:border-teal-500 ${
                      isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-500 dark:text-slate-400 font-bold block mb-1">Residential / Prescription Delivery Address</label>
                <textarea
                  rows={2}
                  value={editCustomerForm.address}
                  onChange={(e) => setEditCustomerForm({ ...editCustomerForm, address: e.target.value })}
                  className={`w-full p-2.5 sm:p-3 rounded-xl border text-xs focus:outline-none focus:border-teal-500 ${
                    isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div className="p-3.5 rounded-2xl border space-y-2.5 bg-slate-50 dark:bg-slate-950/80 border-slate-200 dark:border-slate-800">
                <span className="font-bold text-slate-700 dark:text-slate-300 block">
                  Account Status & Access Permissions
                </span>
                <div className="flex flex-wrap items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="radio"
                      name="customer_status"
                      checked={editCustomerForm.is_active && editCustomerForm.status !== 'suspended'}
                      onChange={() => setEditCustomerForm({ ...editCustomerForm, is_active: true, status: 'active' })}
                      className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      Active (Normal Site & Rx Access)
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="radio"
                      name="customer_status"
                      checked={!editCustomerForm.is_active || editCustomerForm.status === 'suspended'}
                      onChange={() => setEditCustomerForm({ ...editCustomerForm, is_active: false, status: 'suspended' })}
                      className="w-4 h-4 text-rose-600 focus:ring-rose-500 cursor-pointer"
                    />
                    <span className="text-xs font-bold text-rose-600 dark:text-rose-400">
                      Suspended (Disables Online Sign In)
                    </span>
                  </label>
                </div>
              </div>

              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditCustomerModalOpen(false);
                    setSelectedCustomerForEdit(null);
                  }}
                  className={`w-full sm:w-auto px-4 py-2.5 rounded-xl font-bold cursor-pointer transition-colors ${
                    isDark ? 'bg-slate-800 text-slate-300 hover:text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={customerSaving}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-black cursor-pointer shadow-md shadow-teal-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {customerSaving ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Saving Profile...</span>
                    </>
                  ) : (
                    <span>Save Patient Profile</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 7: BATCH EXPIRY, QUARANTINE & CERTIFIED DISPOSAL ACTION */}
      {selectedBatchForAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
          <div className={`border rounded-2xl sm:rounded-3xl p-5 sm:p-7 w-full max-w-xl max-h-[92vh] overflow-y-auto my-auto space-y-4 shadow-2xl transition-all ${
            isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                    Batch Expiry & Disposal Protocol
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Execute regulatory action: Quarantine, Write-off/Disposal, or Vendor Return
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedBatchForAction(null);
                  setBatchActionReason('');
                }}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Batch Snapshot Information Card */}
            <div className={`p-4 rounded-2xl border space-y-3 ${
              isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">Formulation</span>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">{selectedBatchForAction.medicine_name}</h4>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block">{selectedBatchForAction.generic_name}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">Physical Lot</span>
                  <span className="font-mono font-bold text-teal-600 dark:text-teal-400 text-xs">#{selectedBatchForAction.batch_number}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-800/60 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block">Remaining Stock:</span>
                  <span className="font-black text-sm font-mono text-rose-500">{selectedBatchForAction.stock_quantity} units</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Expiry Date:</span>
                  <span className="font-bold">{new Date(selectedBatchForAction.expiry_date).toLocaleDateString()}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Shelf Status:</span>
                  <span className={`font-bold ${
                    selectedBatchForAction.is_expired === 1 || Number(selectedBatchForAction.days_to_expiry) <= 0 
                      ? 'text-rose-500 font-black' 
                      : 'text-amber-500'
                  }`}>
                    {selectedBatchForAction.is_expired === 1 || Number(selectedBatchForAction.days_to_expiry) <= 0 
                      ? 'EXPIRED' 
                      : `${selectedBatchForAction.days_to_expiry} days left`}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Current Status:</span>
                  <span className="font-mono text-[11px] font-bold uppercase">{selectedBatchForAction.status}</span>
                </div>
              </div>
            </div>

            {/* Protocol Action Form */}
            <form onSubmit={handleExecuteBatchAction} className="space-y-4 text-xs">
              <div>
                <label className="text-slate-700 dark:text-slate-300 font-bold block mb-2">
                  Select Action Protocol *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* Action 1: Quarantine */}
                  <div
                    onClick={() => setBatchActionType('QUARANTINE')}
                    className={`p-3.5 rounded-xl border cursor-pointer select-none transition-all flex flex-col justify-between ${
                      batchActionType === 'QUARANTINE'
                        ? 'bg-amber-500/10 border-amber-500 text-amber-900 dark:text-amber-200 ring-1 ring-amber-500'
                        : isDark
                          ? 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                          : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-black text-xs flex items-center gap-1.5 text-amber-500">
                        <Shield className="w-4 h-4" />
                        1. Quarantine Lot
                      </span>
                      <input
                        type="radio"
                        checked={batchActionType === 'QUARANTINE'}
                        onChange={() => setBatchActionType('QUARANTINE')}
                        className="w-3.5 h-3.5 text-amber-500 cursor-pointer"
                      />
                    </div>
                    <p className="text-[11px] leading-relaxed opacity-85">
                      Exclude from sellable inventory immediately. Locks dispensing while retaining lot count in quarantine holding area.
                    </p>
                  </div>

                  {/* Action 2: Certified Disposal */}
                  <div
                    onClick={() => setBatchActionType('DISPOSE')}
                    className={`p-3.5 rounded-xl border cursor-pointer select-none transition-all flex flex-col justify-between ${
                      batchActionType === 'DISPOSE'
                        ? 'bg-rose-500/10 border-rose-500 text-rose-900 dark:text-rose-200 ring-1 ring-rose-500'
                        : isDark
                          ? 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                          : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-black text-xs flex items-center gap-1.5 text-rose-500">
                        <Trash2 className="w-4 h-4" />
                        2. Certified Disposal
                      </span>
                      <input
                        type="radio"
                        checked={batchActionType === 'DISPOSE'}
                        onChange={() => setBatchActionType('DISPOSE')}
                        className="w-3.5 h-3.5 text-rose-500 cursor-pointer"
                      />
                    </div>
                    <p className="text-[11px] leading-relaxed opacity-85">
                      Deduct physical stock to 0. Log certified destruction (write-off) and record movement as EXPIRED_DISCARD.
                    </p>
                  </div>

                  {/* Action 3: Return to Supplier */}
                  <div
                    onClick={() => setBatchActionType('RETURN')}
                    className={`p-3.5 rounded-xl border cursor-pointer select-none transition-all flex flex-col justify-between ${
                      batchActionType === 'RETURN'
                        ? 'bg-sky-500/10 border-sky-500 text-sky-900 dark:text-sky-200 ring-1 ring-sky-500'
                        : isDark
                          ? 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                          : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-black text-xs flex items-center gap-1.5 text-sky-500">
                        <RotateCcw className="w-4 h-4" />
                        3. Return to Supplier
                      </span>
                      <input
                        type="radio"
                        checked={batchActionType === 'RETURN'}
                        onChange={() => setBatchActionType('RETURN')}
                        className="w-3.5 h-3.5 text-sky-500 cursor-pointer"
                      />
                    </div>
                    <p className="text-[11px] leading-relaxed opacity-85">
                      Return expired or recalled stock to vendor ({selectedBatchForAction.supplier_name}) for credit note or replacement.
                    </p>
                  </div>

                  {/* Action 4: Restore to Active (Only if unexpired) */}
                  {selectedBatchForAction.is_expired !== 1 && Number(selectedBatchForAction.days_to_expiry) > 0 ? (
                    <div
                      onClick={() => setBatchActionType('ACTIVATE')}
                      className={`p-3.5 rounded-xl border cursor-pointer select-none transition-all flex flex-col justify-between ${
                        batchActionType === 'ACTIVATE'
                          ? 'bg-emerald-500/10 border-emerald-500 text-emerald-900 dark:text-emerald-200 ring-1 ring-emerald-500'
                          : isDark
                            ? 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                            : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-black text-xs flex items-center gap-1.5 text-emerald-500">
                          <CheckCircle2 className="w-4 h-4" />
                          4. Restore Active
                        </span>
                        <input
                          type="radio"
                          checked={batchActionType === 'ACTIVATE'}
                          onChange={() => setBatchActionType('ACTIVATE')}
                          className="w-3.5 h-3.5 text-emerald-500 cursor-pointer"
                        />
                      </div>
                      <p className="text-[11px] leading-relaxed opacity-85">
                        Restore batch back to saleable stock if quarantine verification cleared and shelf-life is valid.
                      </p>
                    </div>
                  ) : (
                    <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-950/40 text-slate-400 opacity-60 flex flex-col justify-between cursor-not-allowed">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-bold text-xs flex items-center gap-1.5">
                          <Ban className="w-4 h-4" />
                          4. Restore Active (Locked)
                        </span>
                      </div>
                      <p className="text-[10px] leading-relaxed">
                        Cannot restore an expired batch to active status under pharmaceutical law. Expiry date has passed.
                      </p>
                    </div>
                  )}

                  {/* Action 5: Update / Extend Expiry Date */}
                  <div
                    onClick={() => setBatchActionType('UPDATE_EXPIRY')}
                    className={`p-3.5 rounded-xl border cursor-pointer select-none transition-all flex flex-col justify-between sm:col-span-2 ${
                      batchActionType === 'UPDATE_EXPIRY'
                        ? 'bg-teal-500/10 border-teal-500 text-teal-900 dark:text-teal-200 ring-1 ring-teal-500'
                        : isDark
                          ? 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                          : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-black text-xs flex items-center gap-1.5 text-teal-600 dark:text-teal-400">
                        <Clock className="w-4 h-4" />
                        5. Update / Extend Expiry Date (Re-certify Lot)
                      </span>
                      <input
                        type="radio"
                        checked={batchActionType === 'UPDATE_EXPIRY'}
                        onChange={() => setBatchActionType('UPDATE_EXPIRY')}
                        className="w-3.5 h-3.5 text-teal-600 cursor-pointer"
                      />
                    </div>
                    <p className="text-[11px] leading-relaxed opacity-85">
                      Set a renewed, future expiry date for this batch (e.g. shelf-life extension certificate or date data correction). Directly clears expired lockout and restores lot to active saleable stock.
                    </p>
                  </div>
                </div>
              </div>

              {/* Conditional: Date Inputs if UPDATE_EXPIRY chosen */}
              {batchActionType === 'UPDATE_EXPIRY' && (
                <div className="p-3.5 rounded-2xl bg-teal-500/10 border border-teal-500/30 space-y-3 animate-in fade-in duration-150">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-slate-700 dark:text-slate-300 font-bold block mb-1">
                        New Future Expiry Date *
                      </label>
                      <input
                        type="date"
                        required
                        value={actionNewExpiryDate}
                        onChange={(e) => setActionNewExpiryDate(e.target.value)}
                        className={`w-full p-2.5 rounded-xl border text-xs font-bold focus:outline-none focus:border-teal-500 ${
                          isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-300 text-slate-900'
                        }`}
                      />
                    </div>
                    <div>
                      <label className="text-slate-700 dark:text-slate-300 font-bold block mb-1">
                        Manufacture Date (Optional)
                      </label>
                      <input
                        type="date"
                        value={actionNewMfgDate}
                        onChange={(e) => setActionNewMfgDate(e.target.value)}
                        className={`w-full p-2.5 rounded-xl border text-xs focus:outline-none focus:border-teal-500 ${
                          isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-300 text-slate-900'
                        }`}
                      />
                    </div>
                  </div>
                  <p className="text-[11px] text-teal-700 dark:text-teal-300 font-medium">
                    ✓ Setting a valid future expiry date will resolve the alert banner and restore lot #{selectedBatchForAction.batch_number} to saleable stock.
                  </p>
                </div>
              )}

              {/* Conditional: Disposal Method if DISPOSE chosen */}
              {batchActionType === 'DISPOSE' && (
                <div className="space-y-1.5 animate-in fade-in duration-150">
                  <label className="text-slate-700 dark:text-slate-300 font-bold block">
                    Certified Destruction Method *
                  </label>
                  <select
                    value={batchDisposalMethod}
                    onChange={(e) => setBatchDisposalMethod(e.target.value)}
                    className={`w-full p-2.5 sm:p-3 rounded-xl border text-xs focus:outline-none focus:border-teal-500 cursor-pointer ${
                      isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  >
                    <option value="Certified High-Temperature Medical Incineration">Certified High-Temperature Medical Incineration</option>
                    <option value="Chemical Neutralization & Secured Landfill">Chemical Neutralization & Secured Landfill</option>
                    <option value="Municipal Biomedical Waste Collection">Municipal Biomedical Waste Collection</option>
                    <option value="Witnessed Clinical Crushing & Wastewater Dilution">Witnessed Clinical Crushing & Wastewater Dilution</option>
                  </select>
                </div>
              )}

              {/* Justification / Pharmacist Notes */}
              <div className="space-y-1.5">
                <label className="text-slate-700 dark:text-slate-300 font-bold block">
                  Action Justification & Regulatory Reason *
                </label>
                <textarea
                  rows={3}
                  required
                  value={batchActionReason}
                  onChange={(e) => setBatchActionReason(e.target.value)}
                  placeholder="Enter reason for this action (e.g. 'Passed expiry date on shelf, quarantined per SOP-402' or 'Certified disposal witness note')"
                  className={`w-full p-2.5 sm:p-3 rounded-xl border text-xs focus:outline-none focus:border-teal-500 leading-relaxed ${
                    isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              {/* Authorized Performer Note */}
              <div className="flex items-center justify-between text-[11px] text-slate-400 p-2 rounded-xl bg-slate-100 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
                <span>Authorized Pharmacist:</span>
                <span className="font-bold text-slate-700 dark:text-slate-200">{staffUser?.fullName || 'Staff Pharmacist'}</span>
              </div>

              {/* Modal Buttons */}
              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  disabled={batchActionLoading}
                  onClick={() => {
                    setSelectedBatchForAction(null);
                    setBatchActionReason('');
                  }}
                  className={`w-full sm:w-auto px-4 py-2.5 rounded-xl font-bold cursor-pointer transition-colors ${
                    isDark ? 'bg-slate-800 text-slate-300 hover:text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={batchActionLoading}
                  className={`w-full sm:w-auto px-6 py-2.5 rounded-xl text-white font-black cursor-pointer shadow-md transition-all flex items-center justify-center gap-2 ${
                    batchActionType === 'DISPOSE'
                      ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/20'
                      : batchActionType === 'QUARANTINE'
                        ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/20'
                        : batchActionType === 'RETURN'
                          ? 'bg-sky-600 hover:bg-sky-500 shadow-sky-600/20'
                          : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20'
                  }`}
                >
                  {batchActionLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Executing...</span>
                    </>
                  ) : (
                    <>
                      <FileCheck className="w-4 h-4" />
                      <span>Confirm & Execute {batchActionType}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

        </div>
      </div>
    </div>
  );
}
