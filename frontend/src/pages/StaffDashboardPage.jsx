import React, { useState, useEffect } from 'react';
import { 
  Layers, Package, AlertTriangle, Clock, History, Plus, 
  RefreshCw, CheckCircle2, Shield, Edit, Sliders, Calendar, 
  Building2, Search, ShoppingCart, User, FileText, Check, 
  Receipt, ArrowRight, X, AlertCircle, Sparkles, Filter, ChevronRight,
  Printer, Pill, Minus, PanelLeftClose, PanelLeftOpen, TrendingUp, TrendingDown,
  BarChart3, PieChart, ShieldCheck, Activity, LogOut, ChevronLeft, Globe, Menu, ExternalLink,
  Download, CalendarRange, FileSpreadsheet, KeyRound, CheckSquare, Square,
  ShieldAlert, Trash2, RotateCcw, FileCheck, Ban
} from 'lucide-react';
import { 
  getAdminDashboard, getAdminMedicines, getAdminBatches, 
  getLowStockReport, getExpiringBatchesReport, getAuditLogs, 
  getSuppliers, getCategories, getBrands, createMedicine,
  updateMedicine, createBatch, adjustBatchStock, createSale,
  getSalesHistory, getDailySalesReport, getMonthlySalesReport,
  getBestSellingReport, getInventoryValuationReport, getUsers,
  createUser, updateUser, toggleUserStatus, executeBatchAction
} from '../services/api';
import { useTheme } from '../context/ThemeContext';

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
    low_stock_threshold: 20, is_active: true
  });

  // Admin New Staff Modal state
  const [isNewUserModalOpen, setIsNewUserModalOpen] = useState(false);
  const [newUserForm, setNewUserForm] = useState({
    username: '', email: '', password: '', full_name: '', role: 'PHARMACIST',
    permissions: {
      can_pos: true,
      can_manage_medicines: false,
      can_manage_batches: false,
      can_view_reports: false,
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
      can_view_audit: false
    }
  });

  // Operational Reports Timeline & Export state
  const [reportTimeline, setReportTimeline] = useState('all'); // 'today', '7days', 'month', '30days', 'all', 'custom'
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [timelineLoading, setTimelineLoading] = useState(false);

  // Quick Dispense (POS Counter) state
  const [dispenseCategoryId, setDispenseCategoryId] = useState('');
  const [dispenseSearch, setDispenseSearch] = useState('');
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
  const [dispenseSuccess, setDispenseSuccess] = useState(null);
  const [dispenseLoading, setDispenseLoading] = useState(false);

  // Form states
  const [medForm, setMedForm] = useState({
    name: '', generic_name: '', brand_id: '', category_id: '',
    dosage_form: 'Tablet', strength: '', description: '', unit_price: '',
    is_public_price: true, low_stock_threshold: 20
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
  }, []);

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
        getUsers()
      ]);

      const [
        statsRes, medsRes, batchRes, lowRes, expRes, 
        logRes, supRes, catRes, brRes, salesRes, 
        dailyRes, monthRes, bestRes, valRes, usersRes
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
    } catch (err) {
      console.error('Error loading dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEditMedicine = (med) => {
    setSelectedMedForEdit(med);
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
      is_active: med.is_active !== undefined ? med.is_active : true
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
        is_active: Boolean(editMedForm.is_active)
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
            can_view_audit: false
          }
        });
        await loadDashboardData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Error creating staff user');
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
        low_stock_threshold: parseInt(medForm.low_stock_threshold, 10) || 20
      });
      if (res.success) {
        setIsNewMedModalOpen(false);
        setMedForm({
          name: '', generic_name: '', brand_id: '', category_id: '',
          dosage_form: 'Tablet', strength: '', description: '', unit_price: '',
          is_public_price: true, low_stock_threshold: 20
        });
        await loadDashboardData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Error creating medicine formulation');
    }
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

  // Filtered medicines for POS Counter
  const filteredDispenseMedicines = medicines.filter(m => {
    const matchesCategory = !dispenseCategoryId || String(m.category_id) === String(dispenseCategoryId);
    const matchesSearch = !dispenseSearch || 
      m.name?.toLowerCase().includes(dispenseSearch.toLowerCase()) ||
      m.generic_name?.toLowerCase().includes(dispenseSearch.toLowerCase());
    return matchesCategory && matchesSearch;
  });

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

      let res;
      let invoiceNo = 'INV-COUNTER';

      try {
        res = await createSale({
          patient_name: patientName.trim() || 'Walk-in Customer',
          prescription_ref: prescriptionRef.trim() || 'OTC',
          medicine_id: batch.medicine_id,
          batch_id: batch.batch_id,
          quantity: calculatedDispenseUnits,
          unit_price: price,
          packaging_desc: packagingDescription,
          payment_method: 'CASH',
          amount_paid: totalBill
        });
        if (res?.data?.invoice_number) {
          invoiceNo = res.data.invoice_number;
        }
      } catch (saleErr) {
        // Safe fallback to batch adjustment if sales table is being migrated
        console.warn('createSale fallback:', saleErr);
        const newStock = batch.stock_quantity - calculatedDispenseUnits;
        const reasonNote = `POS: ${packagingDescription} to ${patientName || 'Walk-in'} (Rx: ${prescriptionRef || 'OTC'})`.slice(0, 240);
        res = await adjustBatchStock(batch.batch_id, {
          new_quantity: newStock,
          reason: reasonNote,
          movement_type: 'DISPENSED'
        });
      }

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

        // 4. Reload live inventory stock
        await loadDashboardData();
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
  const filteredMeds = medicines.filter(m => 
    m.name?.toLowerCase().includes(medSearch.toLowerCase()) ||
    m.generic_name?.toLowerCase().includes(medSearch.toLowerCase()) ||
    m.brand_name?.toLowerCase().includes(medSearch.toLowerCase())
  );

  // Batch inventory calculations for Expiry, Quarantine & Action protocols
  const expiredBatchesCount = batches.filter(b => (b.is_expired === 1 || Number(b.days_to_expiry) <= 0) && b.stock_quantity > 0 && b.status === 'active').length;
  const criticalBatchesCount = batches.filter(b => Number(b.days_to_expiry) > 0 && Number(b.days_to_expiry) <= 30 && b.stock_quantity > 0 && b.status === 'active').length;
  const quarantinedBatchesCount = batches.filter(b => b.status === 'quarantined').length;
  const activeSaleableBatchesCount = batches.filter(b => b.status === 'active' && Number(b.days_to_expiry) > 0 && b.stock_quantity > 0).length;

  const filteredBatches = batches.filter(b => {
    // Search match
    const matchesSearch = !batchSearch ||
      b.batch_number?.toLowerCase().includes(batchSearch.toLowerCase()) ||
      b.medicine_name?.toLowerCase().includes(batchSearch.toLowerCase()) ||
      b.supplier_name?.toLowerCase().includes(batchSearch.toLowerCase());
    if (!matchesSearch) return false;

    // Filter type match
    if (batchFilter === 'expired') {
      return (b.is_expired === 1 || Number(b.days_to_expiry) <= 0) && b.stock_quantity > 0 && b.status === 'active';
    }
    if (batchFilter === 'critical') {
      return Number(b.days_to_expiry) > 0 && Number(b.days_to_expiry) <= 30 && b.stock_quantity > 0 && b.status === 'active';
    }
    if (batchFilter === 'quarantined') {
      return b.status === 'quarantined';
    }
    if (batchFilter === 'active') {
      return b.status === 'active' && Number(b.days_to_expiry) > 0 && b.stock_quantity > 0;
    }
    return true;
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
    can_manage_users: isAdmin
  };

  // Safety: Prevent Admin from being stuck on POS tab
  useEffect(() => {
    if (isAdmin && activeTab === 'pos') {
      setActiveTab('overview');
    }
  }, [isAdmin, activeTab]);

  // Distinct Navigation Tabs: Admin has Executive Governance & Staff Control, Pharmacist has POS Dispense Counter
  const navTabs = isAdmin ? [
    { id: 'overview', label: 'Executive Overview', icon: Layers, badge: null, show: true },
    { id: 'medicines', label: `Formulary Master (${medicines.length})`, icon: Package, badge: null, show: true },
    { id: 'batches', label: `Batch & Stock (${batches.length})`, icon: Clock, badge: expiringList.length > 0 ? `${expiringList.length}` : null, badgeColor: 'rose', show: true },
    { id: 'reports', label: 'Reports & Analytics', icon: BarChart3, badge: null, show: true },
    { id: 'users', label: `Staff Accounts (${staffUsers.length})`, icon: ShieldCheck, badge: 'Admin', show: true }
  ] : [
    { id: 'overview', label: 'Dispensary Overview', icon: Activity, badge: null, show: true },
    { id: 'pos', label: 'POS Dispense Counter', icon: ShoppingCart, badge: 'Live', show: userPerms.can_pos },
    { id: 'medicines', label: `Medicine Master (${medicines.length})`, icon: Package, badge: null, show: userPerms.can_manage_medicines },
    { id: 'batches', label: `Batch & Expiry (${batches.length})`, icon: Clock, badge: expiringList.length > 0 ? `${expiringList.length}` : null, badgeColor: 'rose', show: userPerms.can_manage_batches },
    { id: 'reports', label: 'Dispensary Reports', icon: BarChart3, badge: null, show: userPerms.can_view_reports }
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
          <div className={`p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 flex items-center justify-between gap-2 ${
            sidebarCollapsed ? 'justify-center' : ''
          }`}>
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-teal-600/10 text-teal-600 flex items-center justify-center font-black text-xs shrink-0">
                {staffUser?.fullName ? staffUser.fullName[0].toUpperCase() : 'P'}
              </div>
              {!sidebarCollapsed && (
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                    {staffUser?.fullName || 'Pharmacist'}
                  </p>
                  <p className="text-[10px] text-slate-400 capitalize">
                    {staffUser?.role || 'Staff'} Mode
                  </p>
                </div>
              )}
            </div>

            {!sidebarCollapsed && (
              <button
                onClick={onLogout}
                title="Sign out of dispensary session"
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
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
                  activeTab === 'medicines' ? 'Formulary Master & Catalog Governance' :
                  activeTab === 'batches' ? 'Batch Stock & Supplier Supply Chain' :
                  activeTab === 'reports' ? 'Operational Reports & Financial Analytics' :
                  activeTab === 'users' ? 'Staff User Accounts & Access Control' : 'Executive Portal'
                ) : (
                  activeTab === 'overview' ? 'Dispensary Station & Prescription Queue' :
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
                  onClick={() => setIsNewMedModalOpen(true)}
                  className="p-2 sm:px-3 sm:py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition-all flex items-center gap-1.5 cursor-pointer"
                  title="Add New Medicine Formulation"
                >
                  <Package className="w-3.5 h-3.5" />
                  <span className="hidden xl:inline">New Medicine</span>
                </button>
              </>
            ) : (
              <>
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

                {userPerms.can_manage_medicines && (
                  <button
                    onClick={() => setIsNewMedModalOpen(true)}
                    className="p-2 sm:px-3 sm:py-2 rounded-xl text-xs font-bold border border-teal-200 dark:border-teal-800 bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 hover:bg-teal-100 transition-all flex items-center gap-1.5 cursor-pointer"
                    title="Add New Medicine Formulation"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span className="hidden xl:inline">Add Medicine</span>
                  </button>
                )}

                {userPerms.can_manage_batches && (
                  <button
                    onClick={() => setIsNewBatchModalOpen(true)}
                    className="p-2 sm:px-3 sm:py-2 rounded-xl text-xs font-bold border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 transition-all flex items-center gap-1.5 cursor-pointer"
                    title="Receive New Inventory Batch"
                  >
                    <Package className="w-3.5 h-3.5" />
                    <span className="hidden xl:inline">Receive Batch</span>
                  </button>
                )}
              </>
            )}
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
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
                    <div className="space-y-1.5 max-w-xl">
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

                    {userPerms.can_pos && (
                      <button
                        onClick={() => setActiveTab('pos')}
                        className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-300 hover:from-emerald-300 hover:to-teal-200 text-slate-950 font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/25 shrink-0"
                      >
                        <ShoppingCart className="w-4 h-4 stroke-[2.5]" />
                        <span>Launch POS Counter</span>
                      </button>
                    )}
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

      {/* TAB 2: QUICK DISPENSE / POS COUNTER */}
      {activeTab === 'pos' && (
        isAdmin ? (
          <div className={`p-8 sm:p-12 rounded-3xl border text-center space-y-4 max-w-2xl mx-auto my-12 animate-in fade-in duration-150 ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
          }`}>
            <div className="w-16 h-16 rounded-3xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center mx-auto border border-indigo-500/20">
              <ShieldCheck className="w-8 h-8 stroke-[2.2]" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                POS Dispense Counter is Restricted to Working Pharmacists
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                The Point-of-Sale dispense counter is reserved exclusively for clinical pharmacists dispensing prescription medicines to walk-in patients. As an Administrator, you oversee executive governance, financial reports, and user privileges.
              </p>
            </div>
            <div className="pt-2 flex justify-center gap-3">
              <button
                onClick={() => setActiveTab('overview')}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs cursor-pointer shadow-md transition-all"
              >
                Go to Executive Overview
              </button>
              <button
                onClick={() => setActiveTab('reports')}
                className={`px-5 py-2.5 rounded-xl border text-xs font-bold cursor-pointer transition-colors ${
                  isDark ? 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white' : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                }`}
              >
                View Financial Reports
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left 2 Cols: Dispensing Counter Form */}
          <div className={`lg:col-span-2 p-6 sm:p-8 rounded-3xl border space-y-6 ${
            isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
          }`}>
            <div className="flex items-center justify-between pb-4 border-b border-slate-800/40">
              <div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider text-teal-400 bg-teal-500/10 border border-teal-500/20 font-bold">
                  Dispensary Counter POS
                </span>
                <h2 className={`text-xl font-black mt-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Prescription Dispensing & Packaging Calculator
                </h2>
                <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  Select category, choose formulation, and dispense by cards, loose tablets, bottles, or packs with instant FEFO lot tracking.
                </p>
              </div>
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-teal-500/20 to-emerald-500/10 text-teal-400 border border-teal-500/20 flex items-center justify-center shadow-inner">
                <ShoppingCart className="w-5 h-5 stroke-[2.2]" />
              </div>
            </div>

            <form onSubmit={handleQuickDispense} className="space-y-6 text-xs">
              
              {/* STEP 1: CATEGORY SELECTION */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className={`font-bold flex items-center gap-1.5 text-xs ${isDark ? 'text-teal-400' : 'text-teal-700'}`}>
                    <span className="w-5 h-5 rounded-full bg-teal-500 text-slate-950 flex items-center justify-center text-[10px] font-black">1</span>
                    Select Medicine Category
                  </label>
                  {dispenseCategoryId && (
                    <button
                      type="button"
                      onClick={() => handleSelectCategoryForDispense('')}
                      className="text-[11px] text-slate-400 hover:text-white underline cursor-pointer"
                    >
                      Clear Category (Show All)
                    </button>
                  )}
                </div>

                {/* Category Pills Bar */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => handleSelectCategoryForDispense('')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                      !dispenseCategoryId
                        ? 'bg-gradient-to-r from-teal-500 to-emerald-500 text-slate-950 font-bold border-teal-400 shadow-sm shadow-teal-500/20'
                        : isDark
                          ? 'bg-slate-950 hover:bg-slate-800 text-slate-300 border-slate-800'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                    }`}
                  >
                    All Categories ({medicines.length})
                  </button>
                  {categories.map((cat) => {
                    const countInCat = medicines.filter(m => String(m.category_id) === String(cat.category_id)).length;
                    const isSelected = String(dispenseCategoryId) === String(cat.category_id);
                    return (
                      <button
                        key={cat.category_id}
                        type="button"
                        onClick={() => handleSelectCategoryForDispense(String(cat.category_id))}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-gradient-to-r from-teal-500 to-emerald-500 text-slate-950 font-bold border-teal-400 shadow-sm shadow-teal-500/20'
                            : isDark
                              ? 'bg-slate-950 hover:bg-slate-800 text-slate-300 border-slate-800'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                        }`}
                      >
                        <span>{cat.category_name}</span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                          isSelected ? 'bg-slate-950/20 text-slate-950 font-bold' : isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-600'
                        }`}>
                          {countInCat}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* STEP 2: MEDICINE FORMULATION */}
              <div className="space-y-2 pt-1 border-t border-slate-800/40">
                <div className="flex items-center justify-between">
                  <label className={`font-bold flex items-center gap-1.5 text-xs ${isDark ? 'text-teal-400' : 'text-teal-700'}`}>
                    <span className="w-5 h-5 rounded-full bg-teal-500 text-slate-950 flex items-center justify-center text-[10px] font-black">2</span>
                    Select Prescription Medicine *
                  </label>
                  <span className="text-[11px] text-slate-400">
                    {filteredDispenseMedicines.length} formulation{filteredDispenseMedicines.length === 1 ? '' : 's'} available
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="sm:col-span-2">
                    <select
                      required
                      value={dispenseMedId}
                      onChange={(e) => handleSelectMedicineForDispense(e.target.value)}
                      className={`w-full p-3 rounded-xl border text-xs focus:outline-none focus:border-teal-500 font-medium ${
                        isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                      }`}
                    >
                      <option value="">-- Choose Medicine Formulation --</option>
                      {filteredDispenseMedicines.map((m) => (
                        <option key={m.medicine_id} value={m.medicine_id}>
                          {m.name} ({m.generic_name}) — [{m.dosage_form}] — Stock: {m.total_saleable_stock} units
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Filter search box */}
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={dispenseSearch}
                      onChange={(e) => setDispenseSearch(e.target.value)}
                      placeholder="Quick filter med..."
                      className={`w-full pl-9 pr-3 py-3 rounded-xl border text-xs focus:outline-none focus:border-teal-500 ${
                        isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>
                </div>

                {/* Selected Medicine Info Card */}
                {selectedDispenseMed && (
                  <div className={`p-3.5 rounded-2xl border flex flex-wrap items-center justify-between gap-3 ${
                    isDark ? 'bg-teal-950/20 border-teal-500/20' : 'bg-teal-50/70 border-teal-200'
                  }`}>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-teal-500/10 text-teal-500 flex items-center justify-center font-bold">
                        <Pill className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            {selectedDispenseMed.name}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/20 text-teal-400 border border-teal-500/30">
                            {selectedDispenseMed.dosage_form}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {selectedDispenseMed.strength}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400 block mt-0.5">
                          Generic: {selectedDispenseMed.generic_name}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className={`text-[10px] uppercase font-bold block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        Catalog Unit Price
                      </span>
                      <span className="text-sm font-bold text-emerald-500">
                        Rs. {Number(selectedDispenseMed.unit_price || 0).toFixed(2)}
                      </span>
                      <span className="text-[10px] text-slate-400 block font-mono">
                        Total Stock: {selectedDispenseMed.total_saleable_stock} units
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* STEP 3: PHYSICAL LOT / BATCH (FEFO PRIORITIZED) */}
              {dispenseMedId && (
                <div className="space-y-2 pt-1 border-t border-slate-800/40">
                  <div className="flex items-center justify-between">
                    <label className={`font-bold flex items-center gap-1.5 text-xs ${isDark ? 'text-teal-400' : 'text-teal-700'}`}>
                      <span className="w-5 h-5 rounded-full bg-teal-500 text-slate-950 flex items-center justify-center text-[10px] font-black">3</span>
                      Select Physical Batch / Lot (FEFO Prioritized) *
                    </label>
                    <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Earliest Expiry First
                    </span>
                  </div>

                  {blockedBatchesForMed.length > 0 && (
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-start gap-2.5">
                      <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
                      <div>
                        <span className="font-bold">Dispensing Lock Active: </span>
                        {blockedBatchesForMed.length} lot(s) ({blockedBatchesForMed.map(b => `#${b.batch_number}`).join(', ')}) for this medicine are expired or quarantined and strictly blocked from counter dispensing.
                      </div>
                    </div>
                  )}

                  {availableBatchesForMed.length === 0 ? (
                    <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>No active unexpired batches with stock available for this medication. Please receive or add a new batch in Batch Records.</span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <select
                        required
                        value={dispenseBatchId}
                        onChange={(e) => setDispenseBatchId(e.target.value)}
                        className={`w-full p-3 rounded-xl border text-xs focus:outline-none focus:border-teal-500 font-mono ${
                          isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                        }`}
                      >
                        <option value="">-- Select Active Batch / Lot --</option>
                        {availableBatchesForMed.map((b, idx) => (
                          <option key={b.batch_id} value={b.batch_id}>
                            {idx === 0 ? '★ [FEFO Priority] ' : ''}Lot: {b.batch_number} | Available: {b.stock_quantity} units | Expiry: {new Date(b.expiry_date).toLocaleDateString()} ({b.days_to_expiry}d left)
                          </option>
                        ))}
                      </select>

                      {selectedDispenseBatch && (
                        <div className={`p-2.5 rounded-xl border flex items-center justify-between text-[11px] ${
                          isDark ? 'bg-slate-950/60 border-slate-800 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'
                        }`}>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-teal-400">Lot #{selectedDispenseBatch.batch_number}</span>
                            <span className="text-slate-400">•</span>
                            <span>Exp: {new Date(selectedDispenseBatch.expiry_date).toLocaleDateString()}</span>
                            <span className={`px-1.5 py-0.2 rounded font-bold ${
                              selectedDispenseBatch.days_to_expiry <= 30
                                ? 'bg-rose-500/20 text-rose-400'
                                : selectedDispenseBatch.days_to_expiry <= 90
                                  ? 'bg-amber-500/20 text-amber-400'
                                  : 'bg-emerald-500/20 text-emerald-400'
                            }`}>
                              {selectedDispenseBatch.days_to_expiry} days remaining
                            </span>
                          </div>
                          <div>
                            Current Lot Stock: <strong className="text-emerald-400">{selectedDispenseBatch.stock_quantity}</strong> units
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* STEP 4: PACKAGING & DISPENSING QUANTITY MODE SELECTOR */}
              {dispenseMedId && (
                <div className="space-y-3 pt-1 border-t border-slate-800/40">
                  <div className="flex items-center justify-between">
                    <label className={`font-bold flex items-center gap-1.5 text-xs ${isDark ? 'text-teal-400' : 'text-teal-700'}`}>
                      <span className="w-5 h-5 rounded-full bg-teal-500 text-slate-950 flex items-center justify-center text-[10px] font-black">4</span>
                      Dispensing Packaging & Quantity Selection *
                    </label>
                    <span className="text-[11px] text-teal-400 font-mono font-bold">
                      Mode: {dispenseMode.toUpperCase()}
                    </span>
                  </div>

                  {/* CASE A: TABLETS & CAPSULES */}
                  {isTabletOrCapsule && (
                    <div className="space-y-3">
                      {/* Sub-mode switcher for tablets */}
                      <div className={`p-1 rounded-2xl border flex gap-1 ${
                        isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'
                      }`}>
                        <button
                          type="button"
                          onClick={() => setDispenseMode('card')}
                          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                            dispenseMode === 'card'
                              ? 'bg-teal-500 text-slate-950 shadow-sm'
                              : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          <span>By Card / Blister Strip</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setDispenseMode('loose')}
                          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                            dispenseMode === 'loose'
                              ? 'bg-teal-500 text-slate-950 shadow-sm'
                              : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          <span>Loose Tablets / Units</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setDispenseMode('pack')}
                          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                            dispenseMode === 'pack'
                              ? 'bg-teal-500 text-slate-950 shadow-sm'
                              : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          <span>Full Box / Pack</span>
                        </button>
                      </div>

                      {/* Mode: Cards */}
                      {dispenseMode === 'card' && (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between text-[11px] text-slate-400">
                            <span>Quick Card Presets:</span>
                            <div className="flex items-center gap-1">
                              <span>Tablets per card:</span>
                              <input
                                type="number"
                                min="1"
                                max="100"
                                value={tabletsPerCard}
                                onChange={(e) => setTabletsPerCard(Math.max(1, parseInt(e.target.value, 10) || 10))}
                                className={`w-12 px-1.5 py-0.5 rounded text-center font-bold border ${
                                  isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                                }`}
                              />
                            </div>
                          </div>

                          {/* Quick Card Presets: 1, 2, 3, 4, 5, 10 */}
                          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                            {[1, 2, 3, 4, 5, 10].map((num) => (
                              <button
                                key={num}
                                type="button"
                                onClick={() => setCardCount(num)}
                                className={`py-2.5 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center ${
                                  cardCount === num
                                    ? 'bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 border-emerald-400 shadow-md shadow-emerald-500/20'
                                    : isDark
                                      ? 'bg-slate-950 hover:bg-slate-800 text-slate-300 border-slate-800'
                                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                                }`}
                              >
                                <span className="block">{num} Card{num > 1 ? 's' : ''}</span>
                                <span className={`text-[10px] block font-mono ${cardCount === num ? 'text-slate-900 font-bold' : 'text-slate-400'}`}>
                                  ({num * tabletsPerCard} tabs)
                                </span>
                              </button>
                            ))}
                          </div>

                          {/* Custom Card Stepper */}
                          <div className="flex items-center gap-3 pt-1">
                            <span className="text-[11px] text-slate-400">Custom Card Count:</span>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => setCardCount(Math.max(1, cardCount - 1))}
                                className={`w-8 h-8 rounded-lg border flex items-center justify-center font-bold text-sm cursor-pointer ${
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
                                className={`w-16 h-8 rounded-lg text-center font-bold text-xs border ${
                                  isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                                }`}
                              />
                              <button
                                type="button"
                                onClick={() => setCardCount(cardCount + 1)}
                                className={`w-8 h-8 rounded-lg border flex items-center justify-center font-bold text-sm cursor-pointer ${
                                  isDark ? 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-white' : 'bg-slate-100 border-slate-300 hover:bg-slate-200 text-slate-900'
                                }`}
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <span className="text-[11px] font-bold text-emerald-400">
                              = {cardCount * tabletsPerCard} {selectedDispenseMed?.dosage_form || 'Tablets'}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Mode: Loose Tablets */}
                      {dispenseMode === 'loose' && (
                        <div className="space-y-3">
                          <span className="text-[11px] text-slate-400 block">Quick Loose Tablet Presets:</span>
                          <div className="flex flex-wrap gap-2">
                            {[1, 2, 5, 10, 14, 20, 28, 30, 50].map((qty) => (
                              <button
                                key={qty}
                                type="button"
                                onClick={() => setLooseCount(qty)}
                                className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                                  looseCount === qty
                                    ? 'bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 border-emerald-400 shadow-md'
                                    : isDark
                                      ? 'bg-slate-950 hover:bg-slate-800 text-slate-300 border-slate-800'
                                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                                }`}
                              >
                                {qty} {selectedDispenseMed?.dosage_form || 'Tab'}
                              </button>
                            ))}
                          </div>

                          <div className="flex items-center gap-2 pt-1">
                            <span className="text-[11px] text-slate-400">Exact Loose Quantity:</span>
                            <input
                              type="number"
                              min="1"
                              value={looseCount}
                              onChange={(e) => setLooseCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
                              className={`w-24 p-2 rounded-xl font-bold font-mono text-xs border ${
                                isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                              }`}
                            />
                            <span className="text-[11px] text-slate-400">individual units</span>
                          </div>
                        </div>
                      )}

                      {/* Mode: Full Pack */}
                      {dispenseMode === 'pack' && (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between text-[11px] text-slate-400">
                            <span>Select Pack Count:</span>
                            <div className="flex items-center gap-1">
                              <span>Units per pack:</span>
                              <input
                                type="number"
                                min="1"
                                value={unitsPerPack}
                                onChange={(e) => setUnitsPerPack(Math.max(1, parseInt(e.target.value, 10) || 30))}
                                className={`w-14 px-1.5 py-0.5 rounded text-center font-bold border ${
                                  isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                                }`}
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-4 gap-2">
                            {[1, 2, 3, 5].map((pk) => (
                              <button
                                key={pk}
                                type="button"
                                onClick={() => setPackCount(pk)}
                                className={`py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center ${
                                  packCount === pk
                                    ? 'bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 border-emerald-400 shadow-md'
                                    : isDark
                                      ? 'bg-slate-950 hover:bg-slate-800 text-slate-300 border-slate-800'
                                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                                }`}
                              >
                                {pk} Pack{pk > 1 ? 's' : ''} ({pk * unitsPerPack} units)
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* CASE B: SYRUP / LIQUIDS / DROPS */}
                  {isLiquidOrSyrup && (
                    <div className="space-y-3">
                      <span className="text-[11px] text-slate-400 block">Select Bottle / Container Count:</span>
                      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                        {[1, 2, 3, 4, 5].map((btl) => (
                          <button
                            key={btl}
                            type="button"
                            onClick={() => setBottleCount(btl)}
                            className={`py-3 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center ${
                              bottleCount === btl
                                ? 'bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 border-emerald-400 shadow-md'
                                : isDark
                                  ? 'bg-slate-950 hover:bg-slate-800 text-slate-300 border-slate-800'
                                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                            }`}
                          >
                            {btl} Bottle{btl > 1 ? 's' : ''}
                          </button>
                        ))}
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <span className="text-[11px] text-slate-400">Custom Bottle Count:</span>
                        <input
                          type="number"
                          min="1"
                          value={bottleCount}
                          onChange={(e) => setBottleCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
                          className={`w-20 p-2 rounded-xl font-bold font-mono text-xs border ${
                            isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                          }`}
                        />
                      </div>
                    </div>
                  )}

                  {/* CASE C: INJECTIONS / AMPOULES */}
                  {isInjection && (
                    <div className="space-y-3">
                      <span className="text-[11px] text-slate-400 block">Select Vial / Ampoule Count:</span>
                      <div className="grid grid-cols-4 gap-2">
                        {[1, 2, 5, 10].map((v) => (
                          <button
                            key={v}
                            type="button"
                            onClick={() => setVialCount(v)}
                            className={`py-3 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center ${
                              vialCount === v
                                ? 'bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 border-emerald-400 shadow-md'
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

                  {/* CASE D: CREAMS & OINTMENTS */}
                  {isTopical && (
                    <div className="space-y-3">
                      <span className="text-[11px] text-slate-400 block">Select Tube Count:</span>
                      <div className="grid grid-cols-3 gap-2">
                        {[1, 2, 3].map((tb) => (
                          <button
                            key={tb}
                            type="button"
                            onClick={() => setTubeCount(tb)}
                            className={`py-3 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center ${
                              tubeCount === tb
                                ? 'bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 border-emerald-400 shadow-md'
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

                  {/* CASE E: INHALERS */}
                  {isInhaler && (
                    <div className="space-y-3">
                      <span className="text-[11px] text-slate-400 block">Select Canister Count:</span>
                      <div className="grid grid-cols-2 gap-2">
                        {[1, 2].map((inh) => (
                          <button
                            key={inh}
                            type="button"
                            onClick={() => setInhalerCount(inh)}
                            className={`py-3 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center ${
                              inhalerCount === inh
                                ? 'bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 border-emerald-400 shadow-md'
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

                  {/* CASE F: OTHER GENERIC FORMS */}
                  {!isTabletOrCapsule && !isLiquidOrSyrup && !isInjection && !isTopical && !isInhaler && (
                    <div className="space-y-3">
                      <span className="text-[11px] text-slate-400 block">Select Quantity to Dispense:</span>
                      <div className="flex flex-wrap gap-2">
                        {[1, 2, 3, 5, 10].map((q) => (
                          <button
                            key={q}
                            type="button"
                            onClick={() => setLooseCount(q)}
                            className={`px-4 py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                              looseCount === q
                                ? 'bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 border-emerald-400 shadow-md'
                                : isDark
                                  ? 'bg-slate-950 hover:bg-slate-800 text-slate-300 border-slate-800'
                                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                            }`}
                          >
                            {q} Units
                          </button>
                        ))}
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <span className="text-[11px] text-slate-400">Custom Count:</span>
                        <input
                          type="number"
                          min="1"
                          value={looseCount}
                          onChange={(e) => setLooseCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
                          className={`w-20 p-2 rounded-xl font-bold font-mono text-xs border ${
                            isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                          }`}
                        />
                      </div>
                    </div>
                  )}

                </div>
              )}

              {/* STEP 5: PATIENT & PRESCRIPTION DETAILS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-800/40">
                <div>
                  <label className={`font-bold block mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Patient / Customer Full Name
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={patientName}
                      onChange={(e) => setPatientName(e.target.value)}
                      placeholder="e.g. Kasun Fernando (or leave blank for Walk-in)"
                      className={`w-full pl-9 pr-3 py-2.5 rounded-xl border text-xs focus:outline-none focus:border-teal-500 ${
                        isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>
                </div>

                <div>
                  <label className={`font-bold block mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Doctor's Prescription Ref / SLMC #
                  </label>
                  <div className="relative">
                    <FileText className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={prescriptionRef}
                      onChange={(e) => setPrescriptionRef(e.target.value)}
                      placeholder="e.g. RX-2026-904 (or OTC)"
                      className={`w-full pl-9 pr-3 py-2.5 rounded-xl border text-xs focus:outline-none focus:border-teal-500 ${
                        isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* STEP 6: LIVE CALCULATION SUMMARY & DISPENSE TRIGGER */}
              {selectedDispenseMed && selectedDispenseBatch && (
                <div className={`p-4 rounded-2xl border space-y-3 ${
                  isDark ? 'bg-slate-950/90 border-slate-800' : 'bg-slate-50 border-slate-300'
                }`}>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                    <div className="p-2.5 rounded-xl bg-white border border-slate-200 shadow-xs">
                      <span className="text-[10px] text-slate-500 block font-semibold">Packaging Unit</span>
                      <span className="font-bold text-xs text-teal-700 mt-0.5 block truncate">
                        {packagingDescription}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-white border border-slate-200 shadow-xs">
                      <span className="text-[10px] text-slate-500 block font-semibold">Deduction Units</span>
                      <span className="font-bold text-xs text-slate-900 mt-0.5 block font-mono">
                        {calculatedDispenseUnits} units
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-white border border-slate-200 shadow-xs">
                      <span className="text-[10px] text-slate-500 block font-semibold">Rate per Unit</span>
                      <span className="font-bold text-xs text-slate-700 mt-0.5 block font-mono">
                        Rs. {Number(selectedDispenseBatch.unit_price || selectedDispenseMed.unit_price || 0).toFixed(2)}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 shadow-xs">
                      <span className="text-[10px] text-emerald-800 block font-bold">Payable Counter Bill</span>
                      <span className="font-black text-sm text-emerald-700 mt-0.5 block font-mono">
                        Rs. {Number((selectedDispenseBatch.unit_price || selectedDispenseMed.unit_price || 0) * calculatedDispenseUnits).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Stock validation warning */}
                  {calculatedDispenseUnits > selectedDispenseBatch.stock_quantity ? (
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>
                        <strong>Cannot dispense:</strong> Requested {calculatedDispenseUnits} units exceeds available lot stock ({selectedDispenseBatch.stock_quantity} units).
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
                      <span>Stock remaining in lot after dispense:</span>
                      <strong className="text-emerald-400 font-mono">
                        {selectedDispenseBatch.stock_quantity - calculatedDispenseUnits} units remaining
                      </strong>
                    </div>
                  )}
                </div>
              )}

              <div className="pt-2">
                <button
                  type="submit"
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
                      : `Confirm & Dispense ${packagingDescription}`
                    }
                  </span>
                </button>
              </div>

            </form>
          </div>

          {/* Right Col: Instant Dispense Receipt Voucher & Pharmacist Protocol */}
          <div className="space-y-6">
            <div className={`p-6 rounded-3xl border space-y-4 ${
              isDark ? 'bg-slate-900/70 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className={`text-sm sm:text-base font-black uppercase tracking-wider flex items-center gap-2 ${
                    isDark ? 'text-white' : 'text-slate-950'
                  }`}>
                    <Receipt className="w-5 h-5 text-emerald-500 stroke-[2.5]" />
                    Dispensary Receipt Voucher
                  </h3>
                  <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    Official counter prescription billing slip
                  </span>
                </div>

                {dispenseSuccess ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setDispenseSuccess(null)}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:text-white hover:bg-slate-800 cursor-pointer transition-colors"
                    >
                      New Bill
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePrintReceiptSlip(dispenseSuccess)}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-black bg-emerald-500 text-slate-950 hover:bg-emerald-400 flex items-center gap-1.5 cursor-pointer shadow-md transition-all"
                      title="Print compact receipt slip"
                    >
                      <Printer className="w-4 h-4 stroke-[2.5]" />
                      <span>Print Slip</span>
                    </button>
                  </div>
                ) : selectedDispenseMed && selectedDispenseBatch ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handlePrintReceiptSlip(null)}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold border border-teal-500/40 text-teal-600 dark:text-teal-400 hover:bg-teal-500/10 flex items-center gap-1.5 cursor-pointer transition-colors"
                      title="Print draft receipt slip"
                    >
                      <Printer className="w-3.5 h-3.5 stroke-[2]" />
                      <span>Print Draft</span>
                    </button>
                    <span className="px-2.5 py-1 rounded-full text-xs font-extrabold bg-teal-500/15 text-teal-700 dark:text-teal-300 border border-teal-500/30">
                      Live Bill Active
                    </span>
                  </div>
                ) : null}
              </div>

              {/* SCENARIO 1: CONFIRMED DISPENSED VOUCHER */}
              {dispenseSuccess ? (
                <div className="space-y-3">
                  <div className={`p-3 rounded-xl border text-xs font-bold flex flex-wrap items-center justify-between gap-2 ${
                    isDark ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300' : 'bg-emerald-50 border-emerald-300 text-emerald-800'
                  }`}>
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>Bill passed to print side! Counter form is ready for next bill.</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => handlePrintReceiptSlip(dispenseSuccess)}
                      className="px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs cursor-pointer flex items-center gap-1 shadow-sm transition-all"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Print Slip</span>
                    </button>
                  </div>

                  <div
                    id="printable-receipt-card"
                    className={`p-6 rounded-2xl border-2 space-y-4 text-sm ${
                      isDark
                        ? 'bg-slate-950 border-emerald-500/50 text-white shadow-xl'
                        : 'bg-white border-emerald-600/40 text-slate-950 shadow-md'
                    }`}
                  >
                  <div className="text-center border-b-2 border-dashed border-slate-300 dark:border-slate-700 pb-4">
                    <span className="font-black text-lg sm:text-xl block tracking-wide text-emerald-600 dark:text-emerald-400">
                      VDC STORE PHARMACY
                    </span>
                    <span className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 block mt-0.5">
                      124 Galle Road, Bambalapitiya
                    </span>
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-400 block mt-0.5">
                      {dispenseSuccess.date}
                    </span>
                    <span className="inline-block mt-2 px-3 py-1 rounded-full text-xs font-black bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-2 border-emerald-500 uppercase tracking-wider">
                      ✓ PAID & DISPENSED
                    </span>
                  </div>

                  <div className="space-y-2.5 text-xs sm:text-sm">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-600 dark:text-slate-400">Patient Name:</span>
                      <span className="font-black text-sm text-slate-950 dark:text-white">{dispenseSuccess.patientName}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-600 dark:text-slate-400">Doctor Rx Ref:</span>
                      <span className="font-extrabold text-slate-900 dark:text-slate-200">{dispenseSuccess.prescriptionRef}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-600 dark:text-slate-400">Medication:</span>
                      <span className="font-black text-sm text-emerald-700 dark:text-emerald-400">{dispenseSuccess.medicineName}</span>
                    </div>
                    {dispenseSuccess.genericName && (
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-semibold text-slate-500 dark:text-slate-400">Generic:</span>
                        <span className="font-medium text-slate-700 dark:text-slate-300">{dispenseSuccess.genericName}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-600 dark:text-slate-400">Lot / Batch #:</span>
                      <span className="font-mono font-bold text-teal-700 dark:text-teal-300">{dispenseSuccess.batchNumber}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-600 dark:text-slate-400">Packaging:</span>
                      <span className="font-black text-slate-950 dark:text-white bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                        {dispenseSuccess.packagingSummary}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-600 dark:text-slate-400">Units Deducted:</span>
                      <span className="font-extrabold text-slate-950 dark:text-white">{dispenseSuccess.quantity} units</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-600 dark:text-slate-400">Unit Price:</span>
                      <span className="font-extrabold text-slate-900 dark:text-slate-200">Rs. {Number(dispenseSuccess.unitPrice).toFixed(2)}</span>
                    </div>
                    
                    <div className="flex justify-between items-center border-t-2 border-slate-900 dark:border-slate-600 pt-3 mt-2">
                      <span className="text-sm sm:text-base font-black text-slate-950 dark:text-white">TOTAL PAID:</span>
                      <span className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                        Rs. {Number(dispenseSuccess.totalBill).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <div className="text-center pt-3 border-t border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300">
                    Dispensed by Pharmacist: <strong className="text-slate-950 dark:text-white font-black">{staffUser?.fullName || 'Licensed Pharmacist'}</strong>
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => handlePrintReceiptSlip(dispenseSuccess)}
                      className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
                    >
                      <Printer className="w-4 h-4 stroke-[2.5]" />
                      <span>Print Receipt Slip Only</span>
                    </button>
                  </div>
                </div>
              </div>
              ) : selectedDispenseMed && selectedDispenseBatch ? (
                /* SCENARIO 2: LIVE DRAFT BILL GENERATION (ACTIVE WHILE MAKING IT) */
                <div
                  id="printable-receipt-card"
                  className={`p-6 rounded-2xl border-2 space-y-4 text-sm ${
                    isDark
                      ? 'bg-slate-950 border-teal-500/40 text-white shadow-xl'
                      : 'bg-white border-teal-600/40 text-slate-950 shadow-md'
                  }`}
                >
                  <div className="text-center border-b-2 border-dashed border-slate-300 dark:border-slate-700 pb-4">
                    <span className="font-black text-lg sm:text-xl block tracking-wide text-emerald-600 dark:text-emerald-400">
                      VDC STORE PHARMACY
                    </span>
                    <span className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 block mt-0.5">
                      124 Galle Road, Bambalapitiya
                    </span>
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-400 block mt-0.5">
                      {new Date().toLocaleString()}
                    </span>
                    <span className="inline-block mt-2 px-3 py-1 rounded-full text-xs font-black bg-teal-100 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 border-2 border-teal-500 uppercase tracking-wider">
                      COUNTER BILL (READY TO DISPENSE)
                    </span>
                  </div>

                  <div className="space-y-2.5 text-xs sm:text-sm">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-600 dark:text-slate-400">Patient Name:</span>
                      <span className="font-black text-sm text-slate-950 dark:text-white">{patientName || 'Walk-in Customer'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-600 dark:text-slate-400">Doctor Rx Ref:</span>
                      <span className="font-extrabold text-slate-900 dark:text-slate-200">{prescriptionRef || 'OTC-Walk-in'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-600 dark:text-slate-400">Medication:</span>
                      <span className="font-black text-sm text-teal-700 dark:text-teal-300">{selectedDispenseMed.name}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-slate-500 dark:text-slate-400">Form & Strength:</span>
                      <span className="font-medium text-slate-700 dark:text-slate-300">
                        {selectedDispenseMed.dosage_form} {selectedDispenseMed.strength ? `(${selectedDispenseMed.strength})` : ''}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-600 dark:text-slate-400">Lot / Batch #:</span>
                      <span className="font-mono font-bold text-teal-700 dark:text-teal-300">{selectedDispenseBatch.batch_number}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-600 dark:text-slate-400">Packaging:</span>
                      <span className="font-black text-slate-950 dark:text-white bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                        {packagingDescription}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-600 dark:text-slate-400">Total Units:</span>
                      <span className="font-extrabold text-slate-950 dark:text-white">{calculatedDispenseUnits} units</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-600 dark:text-slate-400">Rate / Unit:</span>
                      <span className="font-extrabold text-slate-900 dark:text-slate-200">Rs. {liveUnitPrice.toFixed(2)}</span>
                    </div>

                    <div className="flex justify-between items-center border-t-2 border-slate-200 pt-3 mt-2">
                      <span className="text-sm sm:text-base font-black text-slate-900">TOTAL BILL:</span>
                      <span className="text-xl sm:text-2xl font-black text-emerald-600 font-mono">
                        Rs. {liveTotalBill.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={handleQuickDispense}
                      disabled={dispenseLoading || calculatedDispenseUnits > selectedDispenseBatch.stock_quantity}
                      className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-900 font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-40"
                    >
                      <Receipt className="w-4 h-4 stroke-[2.5]" />
                      <span>{dispenseLoading ? 'Dispensing...' : `Confirm & Dispense (Rs. ${liveTotalBill.toFixed(2)})`}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handlePrintReceiptSlip(null)}
                      className="w-full py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-800 font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Print Draft Slip Only</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* SCENARIO 3: NO MEDICATION CHOSEN YET */
                <div className="py-12 text-center text-sm text-slate-500 space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto">
                    <Receipt className="w-7 h-7" />
                  </div>
                  <p className="font-black text-base text-slate-800">Bill Voucher Generator</p>
                  <p className="text-xs font-medium leading-relaxed max-w-xs mx-auto text-slate-600">
                    Select a medicine formulation in Steps 1 & 2 to automatically generate and calculate the prescription counter bill voucher here.
                  </p>
                </div>
              )}
            </div>

            {/* Dispensary Guidelines Card */}
            <div className="p-5 rounded-2xl border text-xs space-y-2.5 bg-slate-50 border-slate-200 text-slate-600">
              <span className="font-bold text-teal-700 flex items-center gap-1.5 text-xs">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Dispensing Protocol & Packaging Guide
              </span>
              <ul className="space-y-1.5 text-[11px] leading-relaxed list-disc list-inside">
                <li><strong className="text-slate-800">Blister Cards:</strong> Standard blister strips contain 10 tablets. Use quick presets for 1, 2, 3, 4, 5 cards.</li>
                <li><strong className="text-slate-800">Liquids & Syrups:</strong> Dispensed in unopened whole bottles with measuring spoons/droppers.</li>
                <li><strong className="text-slate-800">FEFO Policy:</strong> System automatically selects the earliest expiring lot to prevent inventory spoilage.</li>
              </ul>
            </div>
          </div>

        </div>
        )
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
                  <th className="py-3 px-3">Threshold</th>
                  <th className="py-3 px-3">Unit Price</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className={`divide-y text-xs ${
                isDark ? 'divide-slate-800 text-slate-300' : 'divide-slate-200 text-slate-700'
              }`}>
                {filteredMeds.map((m) => (
                  <tr key={m.medicine_id} className={isDark ? 'hover:bg-slate-850/40' : 'hover:bg-slate-50'}>
                    <td className="py-3 px-3 font-mono text-slate-400">#{m.medicine_id}</td>
                    <td className={`py-3 px-3 font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{m.name}</td>
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
                    <td className="py-3 px-3 text-slate-400">{m.low_stock_threshold}</td>
                    <td className="py-3 px-3 font-mono font-bold text-emerald-500">
                      Rs. {Number(m.unit_price).toFixed(2)}
                    </td>
                    <td className="py-3 px-3 text-right">
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

            <div className="flex items-center gap-3">
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
                className="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md shadow-teal-600/20 transition-all shrink-0"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
                Receive Batch
              </button>
            </div>
          </div>

          {/* Expired Stock Emergency Action Banner */}
          {expiredBatchesCount > 0 && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs animate-in fade-in duration-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-rose-600/30 animate-pulse">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-black text-rose-600 dark:text-rose-400 text-sm flex items-center gap-2">
                    Action Required: {expiredBatchesCount} Expired Medicine Batch Lot(s) In Inventory
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
                <span>View Expired Lots ({expiredBatchesCount})</span>
              </button>
            </div>
          )}

          {/* Filter Chips Bar */}
          <div className="flex flex-wrap items-center gap-2 pt-1 border-b pb-3 border-slate-200 dark:border-slate-800">
            {[
              { id: 'all', label: 'All Lots', count: batches.length },
              { id: 'expired', label: 'Expired Lots (Action Required)', count: expiredBatchesCount, isWarning: expiredBatchesCount > 0 },
              { id: 'critical', label: 'Expiring ≤30d', count: criticalBatchesCount },
              { id: 'quarantined', label: 'Quarantined Lots', count: quarantinedBatchesCount },
              { id: 'active', label: 'Active Saleable', count: activeSaleableBatchesCount },
            ].map((f) => {
              const isActive = batchFilter === f.id;
              return (
                <button
                  key={f.id}
                  onClick={() => setBatchFilter(f.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border ${
                    isActive
                      ? f.id === 'expired'
                        ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
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
                      : f.isWarning
                        ? 'bg-rose-500 text-white animate-pulse'
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
                    const isPastExpiryActive = (b.is_expired === 1 || Number(b.days_to_expiry) <= 0) && b.status === 'active' && b.stock_quantity > 0;
                    const isQuarantined = b.status === 'quarantined';
                    const isCritical = Number(b.days_to_expiry) > 0 && Number(b.days_to_expiry) <= 30 && b.status === 'active';
                    const isDepleted = b.stock_quantity === 0 || b.status === 'depleted';
                    const isCalendarExpired = b.is_expired === 1 || Number(b.days_to_expiry) <= 0;

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
                              b.days_to_expiry <= 90 ? 'bg-amber-500/10 text-amber-500' :
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
                          ) : isQuarantined ? (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-amber-500/20 text-amber-500 border border-amber-500/30 flex items-center gap-1 w-fit">
                              <Shield className="w-3 h-3" />
                              QUARANTINED
                            </span>
                          ) : isCritical ? (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-orange-500/10 text-orange-500 border border-orange-500/20 flex items-center gap-1 w-fit">
                              <Clock className="w-3 h-3" />
                              CRITICAL (≤30D)
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
                onClick={() => window.print()}
                className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer border transition-colors ${
                  isDark ? 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
                title="Print current report view"
              >
                <Printer className="w-3.5 h-3.5" />
                Print Report
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
                              {new Date(d.sale_date).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono font-bold">{d.sale_count || d.total_sales || 0}</td>
                            <td className="py-2.5 px-3 text-right font-mono font-semibold">
                              Rs. {Number(d.gross_sales || d.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-slate-400">
                              Rs. {Number(d.total_tax || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-teal-600 dark:text-teal-400">
                              Rs. {Number(d.net_sales || d.total_net || d.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
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
                      Atomic POS transactions committed with row-level pessimistic locking
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
                      </tr>
                    </thead>
                    <tbody className={`divide-y text-xs ${
                      isDark ? 'divide-slate-800 text-slate-300' : 'divide-slate-200 text-slate-700'
                    }`}>
                      {salesHistory.length === 0 ? (
                        <tr>
                          <td colSpan="8" className="py-6 text-center text-slate-500 italic">
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
                              {s.customer_name || 'Walk-in'}
                            </td>
                            <td className="py-2.5 px-3 text-slate-400">
                              {s.cashier_name || 'Pharmacist'}
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono">
                              {s.item_count || 1}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                              Rs. {Number(s.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span className={`px-2 py-0.5 rounded-md font-mono text-[10px] font-bold ${
                                s.payment_method === 'CARD' ? 'bg-sky-500/10 text-sky-500' : 'bg-emerald-500/10 text-emerald-500'
                              }`}>
                                {s.payment_method || 'CASH'}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-500 text-[10px] font-bold uppercase">
                                {s.status || 'COMPLETED'}
                              </span>
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

      {/* TAB 6: STAFF USER ACCOUNTS & ACCESS CONTROL (ADMIN ONLY) */}
      {activeTab === 'users' && (
        isAdmin ? (
          <div className={`p-6 rounded-3xl border space-y-4 animate-in fade-in duration-150 ${
            isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className={`text-base font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  <ShieldCheck className="w-5 h-5 text-teal-500" />
                  Staff User Accounts & Access Control
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Configure dispensary pharmacists, cashier credentials, and feature-level accessibility privileges
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
                          {u.last_login ? new Date(u.last_login).toLocaleDateString() : 'Never'}
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
                  <label className="text-slate-500 dark:text-slate-400 font-bold block mb-1">Dosage Form *</label>
                  <input
                    type="text"
                    required
                    value={medForm.dosage_form}
                    onChange={(e) => setMedForm({ ...medForm, dosage_form: e.target.value })}
                    placeholder="Tablet / Syrup"
                    className={`w-full p-2.5 sm:p-3 rounded-xl border text-xs focus:outline-none focus:border-teal-500 ${
                      isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
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
                <label className="text-slate-500 dark:text-slate-400 font-bold block mb-1">Batch / Lot Number *</label>
                <input
                  type="text"
                  required
                  value={batchForm.batch_number}
                  onChange={(e) => setBatchForm({ ...batchForm, batch_number: e.target.value })}
                  placeholder="e.g. AUG-2026-X1"
                  className={`w-full p-2.5 sm:p-3 rounded-xl border font-mono text-xs focus:outline-none focus:border-teal-500 ${
                    isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
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
                  <label className="text-slate-500 dark:text-slate-400 font-bold block mb-1">Dosage Form</label>
                  <select
                    value={editMedForm.dosage_form}
                    onChange={(e) => setEditMedForm({ ...editMedForm, dosage_form: e.target.value })}
                    className={`w-full p-2.5 sm:p-3 rounded-xl border text-xs focus:outline-none focus:border-teal-500 cursor-pointer ${
                      isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  >
                    {['Tablet', 'Capsule', 'Syrup', 'Suspension', 'Injection', 'Cream', 'Ointment', 'Inhaler', 'Drops'].map(df => (
                      <option key={df} value={df}>{df}</option>
                    ))}
                  </select>
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
