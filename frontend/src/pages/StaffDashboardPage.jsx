import React, { useState, useEffect } from 'react';
import { 
  Layers, Package, AlertTriangle, Clock, History, Plus, 
  RefreshCw, CheckCircle2, Shield, Edit, Sliders, Calendar, Building2
} from 'lucide-react';
import { 
  getAdminDashboard, getAdminMedicines, getAdminBatches, 
  getLowStockReport, getExpiringBatchesReport, getAuditLogs, 
  getSuppliers, getCategories, getBrands, createMedicine,
  createBatch, adjustBatchStock
} from '../services/api';

export default function StaffDashboardPage({ staffUser, onLogout }) {
  const [activeTab, setActiveTab] = useState('overview'); // overview, medicines, batches, reports
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

  // Modals state
  const [isNewMedModalOpen, setIsNewMedModalOpen] = useState(false);
  const [isNewBatchModalOpen, setIsNewBatchModalOpen] = useState(false);
  const [selectedBatchForAdjust, setSelectedBatchForAdjust] = useState(null);

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

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [statsRes, medsRes, batchRes, lowRes, expRes, logRes, supRes, catRes, brRes] = await Promise.all([
        getAdminDashboard(),
        getAdminMedicines(),
        getAdminBatches(),
        getLowStockReport(),
        getExpiringBatchesReport(),
        getAuditLogs(),
        getSuppliers(),
        getCategories(),
        getBrands()
      ]);

      if (statsRes.success) setStats(statsRes.data);
      if (medsRes.success) setMedicines(medsRes.data);
      if (batchRes.success) setBatches(batchRes.data);
      if (lowRes.success) setLowStockList(lowRes.data);
      if (expRes.success) setExpiringList(expRes.data);
      if (logRes.success) setAuditLogs(logRes.data);
      if (supRes.success) setSuppliers(supRes.data);
      if (catRes.success) setCategories(catRes.data);
      if (brRes.success) setBrands(brRes.data);
    } catch (err) {
      console.error('Error loading dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMedicine = async (e) => {
    e.preventDefault();
    try {
      const res = await createMedicine(medForm);
      if (res.success) {
        setIsNewMedModalOpen(false);
        setMedForm({
          name: '', generic_name: '', brand_id: '', category_id: '',
          dosage_form: 'Tablet', strength: '', description: '', unit_price: '',
          is_public_price: true, low_stock_threshold: 20
        });
        loadDashboardData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Error creating medicine');
    }
  };

  const handleCreateBatch = async (e) => {
    e.preventDefault();
    try {
      const res = await createBatch(batchForm);
      if (res.success) {
        setIsNewBatchModalOpen(false);
        setBatchForm({
          medicine_id: '', supplier_id: '', batch_number: '',
          manufacture_date: '', expiry_date: '', quantity: '', unit_cost: ''
        });
        loadDashboardData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Error creating batch');
    }
  };

  const handleAdjustStock = async (e) => {
    e.preventDefault();
    if (!selectedBatchForAdjust) return;
    try {
      const res = await adjustBatchStock(selectedBatchForAdjust.batch_id, {
        new_quantity: parseInt(adjustQty, 10),
        reason: adjustReason,
        movement_type: 'ADJUSTMENT'
      });
      if (res.success) {
        setSelectedBatchForAdjust(null);
        setAdjustQty('');
        loadDashboardData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Error adjusting stock');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Top Header Banner */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/10 text-teal-400 border border-teal-500/20 uppercase">
              Staff Portal • {staffUser?.role} Mode
            </span>
          </div>
          <h1 className="text-2xl font-black text-white">Dispensary & Inventory Control</h1>
          <p className="text-xs text-slate-400">
            Logged in as <strong className="text-slate-200">{staffUser?.fullName}</strong> ({staffUser?.email})
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadDashboardData}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh Data
          </button>

          <button
            onClick={() => setIsNewMedModalOpen(true)}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-all flex items-center gap-1.5 shadow-md shadow-emerald-500/20 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            New Medicine
          </button>

          <button
            onClick={() => setIsNewBatchModalOpen(true)}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-teal-500 hover:bg-teal-400 text-slate-950 transition-all flex items-center gap-1.5 shadow-md shadow-teal-500/20 cursor-pointer"
          >
            <Package className="w-4 h-4 stroke-[3]" />
            Receive Batch
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3 overflow-x-auto text-xs font-semibold">
        {[
          { id: 'overview', label: 'Dashboard Overview', icon: Layers },
          { id: 'medicines', label: `Medicines Master (${medicines.length})`, icon: Package },
          { id: 'batches', label: `Batch & Expiry Records (${batches.length})`, icon: Clock },
          { id: 'reports', label: `DBMS Views & Audit Trail`, icon: History }
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-xl flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW METRICS */}
      {activeTab === 'overview' && stats && (
        <div className="space-y-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            
            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
              <span className="text-xs text-slate-400 uppercase font-semibold">Active Formulations</span>
              <p className="text-3xl font-black text-white mt-2">{stats.total_medicines || medicines.length}</p>
              <span className="text-[11px] text-teal-400 mt-1 block">Catalog items</span>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
              <span className="text-xs text-slate-400 uppercase font-semibold">Active Batches</span>
              <p className="text-3xl font-black text-emerald-400 mt-2">{stats.active_batches || batches.length}</p>
              <span className="text-[11px] text-slate-400 mt-1 block">Unexpired & saleable</span>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/60 border border-amber-500/20 bg-amber-950/10">
              <span className="text-xs text-amber-400 uppercase font-semibold flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                Low Stock Alerts
              </span>
              <p className="text-3xl font-black text-amber-300 mt-2">{stats.low_stock_medicines || lowStockList.length}</p>
              <span className="text-[11px] text-amber-400/80 mt-1 block">At or under threshold</span>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/60 border border-rose-500/20 bg-rose-950/10">
              <span className="text-xs text-rose-400 uppercase font-semibold flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                Expiring in 90 Days
              </span>
              <p className="text-3xl font-black text-rose-300 mt-2">{stats.expiring_batches_count || expiringList.length}</p>
              <span className="text-[11px] text-rose-400/80 mt-1 block">Requires staff rotation</span>
            </div>

          </div>

          {/* Quick Tables Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Low stock alerts view snippet */}
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center justify-between">
                <span className="flex items-center gap-2 text-amber-400">
                  <AlertTriangle className="w-4 h-4" />
                  Active Low Stock Warnings (v_low_stock_alerts)
                </span>
                <span className="text-xs font-mono text-slate-400">{lowStockList.length} items</span>
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="py-2">Medicine</th>
                      <th className="py-2">Current Stock</th>
                      <th className="py-2">Threshold</th>
                      <th className="py-2">Units Needed</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {lowStockList.slice(0, 5).map((item) => (
                      <tr key={item.medicine_id}>
                        <td className="py-2.5 font-medium text-white">{item.medicine_name}</td>
                        <td className="py-2.5 text-amber-400 font-bold">{item.current_stock}</td>
                        <td className="py-2.5 text-slate-400">{item.low_stock_threshold}</td>
                        <td className="py-2.5 text-rose-400 font-bold">+{item.units_needed}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Expiring batches monitor view snippet */}
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center justify-between">
                <span className="flex items-center gap-2 text-rose-400">
                  <Clock className="w-4 h-4" />
                  Batches Nearing Expiry (v_expiring_batches)
                </span>
                <span className="text-xs font-mono text-slate-400">{expiringList.length} batches</span>
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="py-2">Batch #</th>
                      <th className="py-2">Medicine</th>
                      <th className="py-2">Expiry Date</th>
                      <th className="py-2">Days Left</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {expiringList.slice(0, 5).map((batch) => (
                      <tr key={batch.batch_id}>
                        <td className="py-2.5 font-mono text-teal-400">{batch.batch_number}</td>
                        <td className="py-2.5 text-white font-medium">{batch.medicine_name}</td>
                        <td className="py-2.5 text-slate-400">{new Date(batch.expiry_date).toLocaleDateString()}</td>
                        <td className="py-2.5 text-rose-400 font-bold">{batch.days_to_expiry} days</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MEDICINES CATALOG MASTER */}
      {activeTab === 'medicines' && (
        <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white">Pharmaceutical Catalog Master Records</h2>
            <button
              onClick={() => setIsNewMedModalOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Medicine
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-2">ID</th>
                  <th className="py-3 px-2">Trade Name</th>
                  <th className="py-3 px-2">Generic Formulation</th>
                  <th className="py-3 px-2">Brand</th>
                  <th className="py-3 px-2">Category</th>
                  <th className="py-3 px-2">Form & Strength</th>
                  <th className="py-3 px-2">Saleable Stock</th>
                  <th className="py-3 px-2">Threshold</th>
                  <th className="py-3 px-2">Unit Price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {medicines.map((m) => (
                  <tr key={m.medicine_id} className="hover:bg-slate-850/50">
                    <td className="py-3 px-2 font-mono text-slate-500">{m.medicine_id}</td>
                    <td className="py-3 px-2 font-bold text-white">{m.name}</td>
                    <td className="py-3 px-2 italic text-slate-400">{m.generic_name}</td>
                    <td className="py-3 px-2 text-slate-300">{m.brand_name}</td>
                    <td className="py-3 px-2 text-teal-400">{m.category_name}</td>
                    <td className="py-3 px-2">{m.dosage_form} ({m.strength})</td>
                    <td className="py-3 px-2 font-bold">
                      <span className={`px-2 py-0.5 rounded-md ${
                        m.total_saleable_stock <= 0 ? 'bg-rose-500/10 text-rose-400' :
                        m.total_saleable_stock <= m.low_stock_threshold ? 'bg-amber-500/10 text-amber-400' :
                        'bg-emerald-500/10 text-emerald-400'
                      }`}>
                        {m.total_saleable_stock}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-slate-400">{m.low_stock_threshold}</td>
                    <td className="py-3 px-2 font-mono text-emerald-400">Rs. {Number(m.unit_price).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: BATCH & EXPIRY RECORDS */}
      {activeTab === 'batches' && (
        <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white">Physical Batch Inventory & Expiry Records</h2>
              <p className="text-xs text-slate-400">Tracks individual lot numbers, manufacture and expiry dates, and supplier chains</p>
            </div>
            <button
              onClick={() => setIsNewBatchModalOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Receive New Batch
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-2">Batch #</th>
                  <th className="py-3 px-2">Medicine</th>
                  <th className="py-3 px-2">Supplier</th>
                  <th className="py-3 px-2">Mfg Date</th>
                  <th className="py-3 px-2">Expiry Date</th>
                  <th className="py-3 px-2">Stock / Received</th>
                  <th className="py-3 px-2">Status</th>
                  <th className="py-3 px-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {batches.map((b) => (
                  <tr key={b.batch_id} className="hover:bg-slate-850/50">
                    <td className="py-3 px-2 font-mono text-teal-400 font-bold">{b.batch_number}</td>
                    <td className="py-3 px-2 font-medium text-white">{b.medicine_name}</td>
                    <td className="py-3 px-2 text-slate-400">{b.supplier_name}</td>
                    <td className="py-3 px-2 text-slate-400">{new Date(b.manufacture_date).toLocaleDateString()}</td>
                    <td className="py-3 px-2 text-slate-300">{new Date(b.expiry_date).toLocaleDateString()}</td>
                    <td className="py-3 px-2 font-mono">
                      <span className="font-bold text-white">{b.stock_quantity}</span>
                      <span className="text-slate-500"> / {b.quantity_received}</span>
                    </td>
                    <td className="py-3 px-2">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                        b.status === 'active' && b.days_to_expiry > 0 ? 'bg-emerald-500/10 text-emerald-400' :
                        b.status === 'depleted' ? 'bg-slate-800 text-slate-400' :
                        'bg-rose-500/10 text-rose-400'
                      }`}>
                        {b.usability_status}
                      </span>
                    </td>
                    <td className="py-3 px-2">
                      <button
                        onClick={() => {
                          setSelectedBatchForAdjust(b);
                          setAdjustQty(b.stock_quantity);
                        }}
                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-medium transition-colors cursor-pointer"
                      >
                        Adjust Stock
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: DBMS VIEWS & AUDIT TRAIL */}
      {activeTab === 'reports' && (
        <div className="space-y-8">
          
          {/* Audit Logs table */}
          <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <History className="w-4 h-4 text-emerald-400" />
              Automated MySQL Trigger Audit Trail (audit_logs table)
            </h2>
            <p className="text-xs text-slate-400">
              Generated automatically by database trigger <code className="text-emerald-400 font-mono">trg_after_batch_stock_update</code> upon batch modifications.
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-2.5 px-2">Log ID</th>
                    <th className="py-2.5 px-2">Operation</th>
                    <th className="py-2.5 px-2">Batch ID</th>
                    <th className="py-2.5 px-2">Old State</th>
                    <th className="py-2.5 px-2">New State</th>
                    <th className="py-2.5 px-2">Trigger Caller</th>
                    <th className="py-2.5 px-2">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {auditLogs.map((log) => (
                    <tr key={log.log_id}>
                      <td className="py-2 px-2 font-mono text-slate-500">#{log.log_id}</td>
                      <td className="py-2 px-2 font-bold text-teal-400">{log.operation}</td>
                      <td className="py-2 px-2 font-mono">{log.record_id}</td>
                      <td className="py-2 px-2 font-mono text-slate-400 text-[11px] max-w-xs truncate">
                        {typeof log.old_value === 'string' ? log.old_value : JSON.stringify(log.old_value)}
                      </td>
                      <td className="py-2 px-2 font-mono text-emerald-400 text-[11px] max-w-xs truncate">
                        {typeof log.new_value === 'string' ? log.new_value : JSON.stringify(log.new_value)}
                      </td>
                      <td className="py-2 px-2 text-slate-400">{log.performed_by}</td>
                      <td className="py-2 px-2 text-slate-500">{new Date(log.timestamp).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* MODAL 1: ADD NEW MEDICINE */}
      {isNewMedModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-xl space-y-4">
            <h3 className="text-lg font-bold text-white">Create New Medicine Formulation</h3>
            <form onSubmit={handleCreateMedicine} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Trade / Brand Name</label>
                  <input
                    type="text"
                    required
                    value={medForm.name}
                    onChange={(e) => setMedForm({ ...medForm, name: e.target.value })}
                    placeholder="e.g. Augmentin 625mg"
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Generic Name / Molecule</label>
                  <input
                    type="text"
                    required
                    value={medForm.generic_name}
                    onChange={(e) => setMedForm({ ...medForm, generic_name: e.target.value })}
                    placeholder="e.g. Amoxicillin + Clavulanate"
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Brand Manufacturer</label>
                  <select
                    required
                    value={medForm.brand_id}
                    onChange={(e) => setMedForm({ ...medForm, brand_id: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white"
                  >
                    <option value="">Select Brand</option>
                    {brands.map((b) => (
                      <option key={b.brand_id} value={b.brand_id}>{b.brand_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Therapeutic Category</label>
                  <select
                    required
                    value={medForm.category_id}
                    onChange={(e) => setMedForm({ ...medForm, category_id: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white"
                  >
                    <option value="">Select Category</option>
                    {categories.map((c) => (
                      <option key={c.category_id} value={c.category_id}>{c.category_name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Dosage Form</label>
                  <input
                    type="text"
                    required
                    value={medForm.dosage_form}
                    onChange={(e) => setMedForm({ ...medForm, dosage_form: e.target.value })}
                    placeholder="Tablet / Capsule"
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Strength</label>
                  <input
                    type="text"
                    required
                    value={medForm.strength}
                    onChange={(e) => setMedForm({ ...medForm, strength: e.target.value })}
                    placeholder="500mg"
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Unit Price (Rs.)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={medForm.unit_price}
                    onChange={(e) => setMedForm({ ...medForm, unit_price: e.target.value })}
                    placeholder="120.00"
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Short Description</label>
                <textarea
                  rows={2}
                  value={medForm.description}
                  onChange={(e) => setMedForm({ ...medForm, description: e.target.value })}
                  placeholder="Clinical usage and indications..."
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white"
                ></textarea>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsNewMedModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold"
                >
                  Save Medicine
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: RECEIVE NEW BATCH */}
      {isNewBatchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-xl space-y-4">
            <h3 className="text-lg font-bold text-white">Receive New Inventory Batch (Stored Procedure)</h3>
            <p className="text-xs text-slate-400">
              Executes <code className="text-teal-400 font-mono">CALL sp_receive_new_batch(...)</code> to atomically register batch and movement.
            </p>

            <form onSubmit={handleCreateBatch} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Target Medicine</label>
                  <select
                    required
                    value={batchForm.medicine_id}
                    onChange={(e) => setBatchForm({ ...batchForm, medicine_id: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white"
                  >
                    <option value="">Select Medicine</option>
                    {medicines.map((m) => (
                      <option key={m.medicine_id} value={m.medicine_id}>{m.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Authorized Supplier</label>
                  <select
                    required
                    value={batchForm.supplier_id}
                    onChange={(e) => setBatchForm({ ...batchForm, supplier_id: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white"
                  >
                    <option value="">Select Supplier</option>
                    {suppliers.map((s) => (
                      <option key={s.supplier_id} value={s.supplier_id}>{s.supplier_name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Batch / Lot Number</label>
                <input
                  type="text"
                  required
                  value={batchForm.batch_number}
                  onChange={(e) => setBatchForm({ ...batchForm, batch_number: e.target.value })}
                  placeholder="e.g. AUG-2026-X1"
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Manufacture Date</label>
                  <input
                    type="date"
                    required
                    value={batchForm.manufacture_date}
                    onChange={(e) => setBatchForm({ ...batchForm, manufacture_date: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Expiration Date (Must be &gt; Mfg Date)</label>
                  <input
                    type="date"
                    required
                    value={batchForm.expiry_date}
                    onChange={(e) => setBatchForm({ ...batchForm, expiry_date: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Units Received</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={batchForm.quantity}
                    onChange={(e) => setBatchForm({ ...batchForm, quantity: e.target.value })}
                    placeholder="100"
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Unit Wholesale Cost (Rs.)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={batchForm.unit_cost}
                    onChange={(e) => setBatchForm({ ...batchForm, unit_cost: e.target.value })}
                    placeholder="85.00"
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsNewBatchModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold"
                >
                  Register Batch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: ADJUST BATCH STOCK */}
      {selectedBatchForAdjust && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md space-y-4">
            <h3 className="text-lg font-bold text-white">Adjust Physical Batch Stock</h3>
            <p className="text-xs text-slate-400">
              Batch: <strong className="text-teal-400 font-mono">{selectedBatchForAdjust.batch_number}</strong> ({selectedBatchForAdjust.medicine_name})
            </p>

            <form onSubmit={handleAdjustStock} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">New Verified Current Stock</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-bold text-sm"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Adjustment Reason / Dispensary Note</label>
                <input
                  type="text"
                  required
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setSelectedBatchForAdjust(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold"
                >
                  Update & Audit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
