import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, Filter, RotateCcw, ArrowUpDown, Tag, Building2, 
  CheckCircle2, AlertTriangle, XCircle, Pill, Frown, ChevronDown,
  LayoutGrid, List, SlidersHorizontal, FileText, X, 
  Eye, Star, Flame, Sparkles, Sliders, ChevronRight
} from 'lucide-react';
import MedicineCard from '../components/MedicineCard';
import Pagination from '../components/Pagination';
import AvailabilityBadge from '../components/AvailabilityBadge';
import { getMedicines, getCategories, getBrands } from '../services/api';
import { useTheme } from '../context/ThemeContext';
import { getMedicineProductImage } from '../utils/pharmacyImages';

export default function MedicineSearchPage({ 
  initialQuery = '', 
  initialCategoryId = '', 
  onViewDetails
}) {
  const { isDark } = useTheme();

  // Primary search & filters state
  const [search, setSearch] = useState(initialQuery && initialQuery.toLowerCase() !== 'offer' ? initialQuery : '');
  const [selectedCategory, setSelectedCategory] = useState(initialCategoryId || '');
  const [selectedBrands, setSelectedBrands] = useState([]);
  const [onlyInStock, setOnlyInStock] = useState(false);
  const [selectedDosage, setSelectedDosage] = useState('');
  const [minRating, setMinRating] = useState(0); // 0 = all, 3, 4, 5
  const [rxFilter, setRxFilter] = useState('all'); // 'all', 'otc', 'rx'
  const [onlyOffers, setOnlyOffers] = useState(Boolean(initialQuery && initialQuery.toLowerCase() === 'offer'));

  // Price range slider state (Rs. 0 to Rs. 80,000)
  const [priceRange, setPriceRange] = useState([0, 80000]);
  const [appliedPriceRange, setAppliedPriceRange] = useState([0, 80000]);

  // Display & pagination state
  const [sortBy, setSortBy] = useState('default'); // 'default', 'price_asc', 'price_desc', 'name_asc', 'rating_desc'
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);

  // Raw API datasets
  const [apiMedicines, setApiMedicines] = useState([]);
  const [dbCategories, setDbCategories] = useState([]);
  const [dbBrands, setDbBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  // Load initial options
  useEffect(() => {
    loadFilterOptions();
  }, []);

  useEffect(() => {
    fetchApiMedicines();
  }, []);

  // Update if parent passes new props
  useEffect(() => {
    if (initialQuery && initialQuery.toLowerCase() === 'offer') {
      setOnlyOffers(true);
      setSearch('');
    } else {
      setSearch(initialQuery || '');
      setOnlyOffers(false);
    }
    setSelectedCategory(initialCategoryId || '');
    setPage(1);
  }, [initialQuery, initialCategoryId]);

  const loadFilterOptions = async () => {
    try {
      const [catRes, brandRes] = await Promise.all([
        getCategories(),
        getBrands()
      ]);
      if (catRes.success) setDbCategories(catRes.data);
      if (brandRes.success) setDbBrands(brandRes.data);
    } catch (err) {
      console.error('Error fetching filter options:', err);
    }
  };

  const fetchApiMedicines = async () => {
    try {
      setLoading(true);
      const res = await getMedicines({ limit: 100, sortBy: 'name_asc' });
      if (res.success) {
        setApiMedicines(res.data);
      }
    } catch (err) {
      console.error('Error fetching medicines:', err);
    } finally {
      setLoading(false);
    }
  };

  // 100% Database-Driven: All products come from the MySQL Database
  const allCatalogProducts = useMemo(() => {
    return apiMedicines;
  }, [apiMedicines]);

  // Categories list driven directly by MySQL medicine_categories table + Wellness department
  const unifiedCategories = useMemo(() => {
    const wellnessCount = allCatalogProducts.filter(p => {
      const cName = (p.category_name || '').toLowerCase();
      return Boolean(p.is_wellness) || 
        cName.includes('beauty') || cName.includes('nutrition') || 
        cName.includes('supplement') || cName.includes('vitamin') || 
        cName.includes('personal') || cName.includes('baby') || 
        cName.includes('device') || cName.includes('equipment') || 
        cName.includes('ayurved') || cName.includes('herbal');
    }).length;

    const list = [
      { id: '', name: 'All Categories', count: allCatalogProducts.length },
      { id: 'wellness', name: 'Beauty & Wellness', count: wellnessCount },
      ...dbCategories.map(c => ({
        id: String(c.category_id),
        name: c.category_name,
        count: allCatalogProducts.filter(p => String(p.category_id) === String(c.category_id)).length
      }))
    ];
    return list;
  }, [dbCategories, allCatalogProducts]);

  // Available brands list
  const availableBrands = useMemo(() => {
    const brandSet = new Set();
    allCatalogProducts.forEach(p => {
      if (p.brand_name) brandSet.add(p.brand_name);
    });
    return Array.from(brandSet).sort();
  }, [allCatalogProducts]);

  // Common dosage forms
  const dosageForms = ['Tablet', 'Capsule', 'Syrup', 'Injection', 'Cream', 'Inhaler', 'Drops', 'Medical Device', 'Powder'];

  // Toggle brand in multi-select
  const handleBrandToggle = (brandName) => {
    setSelectedBrands(prev => 
      prev.includes(brandName) 
        ? prev.filter(b => b !== brandName)
        : [...prev, brandName]
    );
    setPage(1);
  };

  // Reset all filters
  const handleResetFilters = () => {
    setSearch('');
    setSelectedCategory('');
    setSelectedBrands([]);
    setOnlyInStock(false);
    setSelectedDosage('');
    setMinRating(0);
    setRxFilter('all');
    setOnlyOffers(false);
    setPriceRange([0, 80000]);
    setAppliedPriceRange([0, 80000]);
    setSortBy('default');
    setPage(1);
  };

  // Filter & Sort Logic
  const filteredProducts = useMemo(() => {
    return allCatalogProducts.filter(p => {
      // 1. Text Search
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matchName = (p.name || '').toLowerCase().includes(q);
        const matchGeneric = (p.generic_name || '').toLowerCase().includes(q);
        const matchBrand = (p.brand_name || '').toLowerCase().includes(q);
        const matchCategory = (p.category_name || '').toLowerCase().includes(q);
        if (!matchName && !matchGeneric && !matchBrand && !matchCategory) return false;
      }

      // 2. Category Filter (Handles 'wellness' department or specific categories)
      if (selectedCategory) {
        const catStr = String(selectedCategory).toLowerCase().trim();
        const pCatName = (p.category_name || '').toLowerCase();
        const pCatId = String(p.category_id || '');

        if (catStr === 'wellness') {
          // All Beauty, Wellness, Nutrition, Devices, Baby & Herbal care
          const isWellnessItem = Boolean(p.is_wellness) || 
            pCatName.includes('beauty') || 
            pCatName.includes('nutrition') || 
            pCatName.includes('supplement') || 
            pCatName.includes('vitamin') || 
            pCatName.includes('personal') || 
            pCatName.includes('baby') || 
            pCatName.includes('device') || 
            pCatName.includes('equipment') || 
            pCatName.includes('ayurved') || 
            pCatName.includes('herbal');
          if (!isWellnessItem) return false;
        } else if (catStr === 'nutrition') {
          if (!pCatName.includes('nutrition') && !pCatName.includes('supplement') && pCatId !== '7' && pCatId !== '9') return false;
        } else if (catStr === 'beauty' || catStr === 'skincare') {
          if (!pCatName.includes('beauty') && !pCatName.includes('cosmetic') && !pCatName.includes('skin') && pCatId !== '8' && pCatId !== '10') return false;
        } else if (catStr === 'personal') {
          if (!pCatName.includes('personal') && !pCatName.includes('hygiene') && pCatId !== '11') return false;
        } else if (catStr === 'baby') {
          if (!pCatName.includes('baby') && !pCatName.includes('mother') && pCatId !== '12') return false;
        } else if (catStr === 'devices') {
          if (!pCatName.includes('device') && !pCatName.includes('equipment') && !pCatName.includes('monitor') && !pCatName.includes('stethoscope') && pCatId !== '13') return false;
        } else if (catStr === 'ayurveda' || catStr === 'herbal') {
          if (!pCatName.includes('ayurved') && !pCatName.includes('herbal') && pCatId !== '14') return false;
        } else {
          // Direct ID or Exact Name matching
          const matchesId = pCatId === catStr;
          const matchesName = pCatName === catStr;
          if (!matchesId && !matchesName) return false;
        }
      }

      // 3. Brands Multi-select
      if (selectedBrands.length > 0) {
        if (!selectedBrands.includes(p.brand_name)) return false;
      }

      // 4. Only in stock toggle
      if (onlyInStock) {
        const status = (p.availability_status || '').toLowerCase();
        const stockQty = Number(p.saleable_stock ?? p.stock_quantity ?? 0);
        if (status === 'out of stock' || (stockQty <= 0 && status !== 'in stock')) return false;
      }

      // 5. Offers only filter: Strictly show only allocated promotional offers
      if (onlyOffers) {
        const isOfferActive = Boolean(p.is_offer) && Number(p.discount_percent) > 0;
        if (!isOfferActive) return false;
      }

      // 6. Dosage Form
      if (selectedDosage) {
        const form = (p.dosage_form || '').toLowerCase();
        if (!form.includes(selectedDosage.toLowerCase())) return false;
      }

      // 7. Ratings Filter
      if (minRating > 0) {
        const itemRating = p.rating || 5;
        if (itemRating < minRating) return false;
      }

      // 8. Rx / OTC Filter
      if (rxFilter !== 'all') {
        const isRx = ['Antibiotics', 'Antibiotics & Antimicrobials', 'Cardiovascular', 'Cardiovascular & Blood Pressure', 'Respiratory', 'Respiratory & Allergy'].includes(p.category_name) || 
          p.dosage_form?.toLowerCase().includes('injection');
        if (rxFilter === 'rx' && !isRx) return false;
        if (rxFilter === 'otc' && isRx) return false;
      }

      // 9. Price Range Filter
      const price = Number(p.unit_price) || 0;
      if (price < appliedPriceRange[0] || price > appliedPriceRange[1]) {
        return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'price_asc') {
        return (Number(a.unit_price) || 0) - (Number(b.unit_price) || 0);
      }
      if (sortBy === 'price_desc') {
        return (Number(b.unit_price) || 0) - (Number(a.unit_price) || 0);
      }
      if (sortBy === 'name_asc') {
        return (a.name || '').localeCompare(b.name || '');
      }
      if (sortBy === 'name_desc') {
        return (b.name || '').localeCompare(a.name || '');
      }
      if (sortBy === 'rating_desc') {
        return (b.rating || 5) - (a.rating || 5);
      }
      return 0;
    });
  }, [allCatalogProducts, search, selectedCategory, selectedBrands, onlyInStock, onlyOffers, selectedDosage, minRating, rxFilter, appliedPriceRange, sortBy]);

  // Pagination calculation
  const totalRecords = filteredProducts.length;
  const totalPages = Math.ceil(totalRecords / pageSize) || 1;
  const paginatedProducts = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredProducts.slice(start, start + pageSize);
  }, [filteredProducts, page, pageSize]);

  // Count active filter chips
  const activeFilters = useMemo(() => {
    const list = [];
    if (search) list.push({ label: `Search: "${search}"`, onRemove: () => setSearch('') });
    if (selectedCategory) {
      const cat = unifiedCategories.find(c => c.id === selectedCategory);
      list.push({ label: cat ? cat.name : 'Category', onRemove: () => setSelectedCategory('') });
    }
    selectedBrands.forEach(b => {
      list.push({ label: `Brand: ${b}`, onRemove: () => handleBrandToggle(b) });
    });
    if (onlyInStock) list.push({ label: 'In Stock Only', onRemove: () => setOnlyInStock(false) });
    if (onlyOffers) list.push({ label: 'On Sale / Offers', onRemove: () => setOnlyOffers(false) });
    if (selectedDosage) list.push({ label: `Form: ${selectedDosage}`, onRemove: () => setSelectedDosage('') });
    if (minRating > 0) list.push({ label: `${minRating}★ & Up`, onRemove: () => setMinRating(0) });
    if (appliedPriceRange[0] > 0 || appliedPriceRange[1] < 80000) {
      list.push({
        label: `Price: Rs. ${appliedPriceRange[0]} - ${appliedPriceRange[1]}`,
        onRemove: () => {
          setPriceRange([0, 80000]);
          setAppliedPriceRange([0, 80000]);
        }
      });
    }
    return list;
  }, [search, selectedCategory, selectedBrands, onlyInStock, onlyOffers, selectedDosage, minRating, appliedPriceRange, unifiedCategories]);

  return (
    <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 overflow-hidden">
      
      {/* Breadcrumb & Title Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <span>Home</span>
            <span>/</span>
            <span className="font-bold text-teal-600 dark:text-teal-400">Shop Catalog</span>
            {selectedCategory && (
              <>
                <span>/</span>
                <span className="text-slate-800 dark:text-slate-200">
                  {unifiedCategories.find(c => c.id === selectedCategory)?.name || 'Filtered'}
                </span>
              </>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
            Pharmacy & Wellness Store
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Verified prescription drugs, non-medicine wellness, skincare, and medical diagnostics.
          </p>
        </div>

        {/* Mobile Filter Toggle Button */}
        <button
          onClick={() => setMobileFilterOpen(!mobileFilterOpen)}
          className="lg:hidden px-4 py-2.5 rounded-xl bg-teal-700 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md"
        >
          <SlidersHorizontal className="w-4 h-4" />
          <span>Filter Products ({activeFilters.length})</span>
        </button>
      </div>

      {/* Main 2-Column Layout (Sidebar + Product Catalog) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* ======================================================== */}
        {/* LEFT SIDEBAR: FILTERS (Inspired by Screenshot 3) */}
        {/* ======================================================== */}
        <aside className={`lg:col-span-3 space-y-6 ${
          mobileFilterOpen ? 'block' : 'hidden lg:block'
        }`}>
          
          <div className="p-5 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-6">
            
            {/* 1. Header with Reset Button */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 font-black text-sm text-slate-900 dark:text-white">
                <Filter className="w-4 h-4 text-teal-600" />
                <span>Filter By</span>
              </div>
              {activeFilters.length > 0 && (
                <button
                  onClick={handleResetFilters}
                  className="text-xs font-bold text-rose-500 hover:text-rose-600 flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Clear All</span>
                </button>
              )}
            </div>

            {/* 2. In Stock Only Toggle Switch */}
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
              <label htmlFor="inStockToggle" className="text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer">
                View only in stock
              </label>
              <input
                id="inStockToggle"
                type="checkbox"
                checked={onlyInStock}
                onChange={(e) => {
                  setOnlyInStock(e.target.checked);
                  setPage(1);
                }}
                className="w-4 h-4 accent-teal-600 rounded cursor-pointer"
              />
            </div>

            {/* 3. On Sale / Offers Quick Filter */}
            <div className="p-3 rounded-2xl bg-gradient-to-r from-amber-500/10 to-rose-500/10 border border-amber-300/40 dark:border-amber-500/20 flex items-center justify-between">
              <label htmlFor="offersToggle" className="text-xs font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1.5 cursor-pointer">
                <Flame className="w-3.5 h-3.5 text-rose-500" />
                <span>Special Offers Only</span>
              </label>
              <input
                id="offersToggle"
                type="checkbox"
                checked={onlyOffers}
                onChange={(e) => {
                  setOnlyOffers(e.target.checked);
                  setPage(1);
                }}
                className="w-4 h-4 accent-rose-600 rounded cursor-pointer"
              />
            </div>

            {/* 4. Categories Section (Screenshot 3 style vertical list) */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Categories
              </h4>
              <div className="space-y-1 max-h-64 overflow-y-auto pr-1 text-xs">
                {unifiedCategories.map((cat) => {
                  const isSelected = selectedCategory === cat.id;
                  return (
                    <button
                      key={cat.id || 'all'}
                      onClick={() => {
                        setSelectedCategory(cat.id);
                        setPage(1);
                      }}
                      className={`w-full px-3 py-2 rounded-xl flex items-center justify-between text-left transition-colors cursor-pointer ${
                        isSelected 
                          ? 'bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 font-bold border border-teal-200 dark:border-teal-800' 
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900'
                      }`}
                    >
                      <span className="truncate pr-2">{cat.name}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
                        {cat.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 5. Price Filter Slider (Screenshot 3 style) */}
            <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  By Price
                </h4>
                <span className="text-[11px] font-bold text-teal-600">
                  Rs. {priceRange[0]} - Rs. {priceRange[1]}
                </span>
              </div>

              {/* Slider Input */}
              <input
                type="range"
                min="0"
                max="80000"
                step="500"
                value={priceRange[1]}
                onChange={(e) => setPriceRange([priceRange[0], Number(e.target.value)])}
                className="w-full accent-teal-600 cursor-pointer"
              />

              {/* Price Range Manual Inputs & Apply Button */}
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <span className="text-[10px] text-slate-400 block mb-0.5">Min (Rs.)</span>
                  <input
                    type="number"
                    value={priceRange[0]}
                    onChange={(e) => setPriceRange([Number(e.target.value), priceRange[1]])}
                    className="w-full px-2 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
                  />
                </div>
                <div className="flex-1">
                  <span className="text-[10px] text-slate-400 block mb-0.5">Max (Rs.)</span>
                  <input
                    type="number"
                    value={priceRange[1]}
                    onChange={(e) => setPriceRange([priceRange[0], Number(e.target.value)])}
                    className="w-full px-2 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setAppliedPriceRange([...priceRange]);
                    setPage(1);
                  }}
                  className="mt-4 px-3 py-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs cursor-pointer"
                >
                  Filter
                </button>
              </div>
            </div>

            {/* 6. Brands Multi-Select (Screenshot 3 style checkboxes) */}
            <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Brands & Manufacturers
              </h4>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 text-xs">
                {availableBrands.map((brand) => (
                  <label 
                    key={brand}
                    className="flex items-center gap-2.5 text-slate-700 dark:text-slate-300 hover:text-teal-600 cursor-pointer py-1"
                  >
                    <input
                      type="checkbox"
                      checked={selectedBrands.includes(brand)}
                      onChange={() => handleBrandToggle(brand)}
                      className="w-4 h-4 accent-teal-600 rounded cursor-pointer"
                    />
                    <span className="truncate">{brand}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* 7. Dosage Form Selection */}
            <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Dosage Form
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {dosageForms.map((df) => (
                  <button
                    key={df}
                    onClick={() => {
                      setSelectedDosage(selectedDosage === df ? '' : df);
                      setPage(1);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer ${
                      selectedDosage === df
                        ? 'bg-teal-700 text-white border-teal-700'
                        : 'bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-teal-500'
                    }`}
                  >
                    {df}
                  </button>
                ))}
              </div>
            </div>

            {/* 8. Customer Ratings Filter (Screenshot 3 style) */}
            <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Ratings
              </h4>
              <div className="space-y-1">
                {[5, 4, 3].map((r) => (
                  <button
                    key={r}
                    onClick={() => {
                      setMinRating(minRating === r ? 0 : r);
                      setPage(1);
                    }}
                    className={`w-full px-2.5 py-1.5 rounded-xl flex items-center justify-between text-xs transition-colors cursor-pointer ${
                      minRating === r
                        ? 'bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 font-bold'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-1 text-amber-400">
                      {[...Array(r)].map((_, i) => (
                        <Star key={i} className="w-3.5 h-3.5 fill-amber-400" />
                      ))}
                      <span className="text-[11px] text-slate-600 dark:text-slate-400 ml-1.5">
                        {r === 5 ? '5 Stars' : `${r} Stars & Up`}
                      </span>
                    </div>
                    {minRating === r && <Check className="w-3.5 h-3.5 text-teal-600" />}
                  </button>
                ))}
              </div>
            </div>

            {/* 9. Prescription Type Filter (Rx vs OTC) */}
            <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Prescription Requirement
              </h4>
              <div className="grid grid-cols-3 gap-1 text-[11px]">
                {['all', 'otc', 'rx'].map((type) => (
                  <button
                    key={type}
                    onClick={() => {
                      setRxFilter(type);
                      setPage(1);
                    }}
                    className={`py-1.5 rounded-lg font-bold uppercase border transition-all cursor-pointer ${
                      rxFilter === type
                        ? 'bg-teal-700 text-white border-teal-700'
                        : 'bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    {type === 'all' ? 'All' : type === 'otc' ? 'OTC' : 'Rx Only'}
                  </button>
                ))}
              </div>
            </div>

          </div>
        </aside>

        {/* ======================================================== */}
        {/* RIGHT AREA: SEARCH BAR, SORT & PRODUCT CATALOG */}
        {/* ======================================================== */}
        <main className="lg:col-span-9 space-y-6">
          
          {/* Active Promotional Offers Highlight Banner */}
          {onlyOffers && (
            <div className="p-4 sm:p-5 rounded-3xl border border-rose-200 dark:border-rose-900/60 bg-gradient-to-r from-rose-500/10 via-amber-500/10 to-transparent flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in duration-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-rose-500 to-amber-500 text-white flex items-center justify-center shrink-0 shadow-md">
                  <Flame className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>Special Promotional Offers & Deals</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-600 text-white uppercase">
                      {filteredProducts.length} Items Allocated
                    </span>
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                    Showing only medications and wellness products currently allocated for promotional discounts by our pharmacy.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setOnlyOffers(false)}
                className="px-3.5 py-1.5 rounded-xl border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-bold transition-colors cursor-pointer self-start sm:self-auto"
              >
                Show All Products
              </button>
            </div>
          )}

          {/* Top Search & Filter Bar */}
          <div className="p-4 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-3">
            
            {/* Search Input Field */}
            <div className="relative flex items-center rounded-2xl border bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus-within:border-teal-600 transition-all">
              <Search className="w-4 h-4 text-teal-600 dark:text-teal-400 ml-3.5 shrink-0" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search trade name, active chemical formula, or wellness brand..."
                className="w-full bg-transparent px-3 py-2.5 text-xs sm:text-sm focus:outline-none text-slate-900 dark:text-white placeholder-slate-400"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="p-1 mr-3 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Sort Controls & View Mode Toggle */}
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs pt-1">
              
              {/* Product Counts */}
              <div className="text-slate-500 dark:text-slate-400 font-medium">
                Showing <strong className="text-slate-900 dark:text-white">{filteredProducts.length}</strong> products
              </div>

              {/* Sort By & Per Page Selectors */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400 text-[11px]">Sort By:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 text-xs focus:outline-none focus:border-teal-600"
                  >
                    <option value="default">Default</option>
                    <option value="price_asc">Price: Low to High</option>
                    <option value="price_desc">Price: High to Low</option>
                    <option value="name_asc">Name: A to Z</option>
                    <option value="name_desc">Name: Z to A</option>
                    <option value="rating_desc">Highest Rated</option>
                  </select>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400 text-[11px]">Show:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setPage(1);
                    }}
                    className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 text-xs focus:outline-none"
                  >
                    <option value={9}>9</option>
                    <option value={12}>12</option>
                    <option value={18}>18</option>
                    <option value={24}>24</option>
                  </select>
                </div>

                {/* View Mode Toggle */}
                <div className="p-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-1.5 rounded-lg ${viewMode === 'grid' ? 'bg-teal-700 text-white' : 'text-slate-400'}`}
                    title="Grid View"
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-1.5 rounded-lg ${viewMode === 'list' ? 'bg-teal-700 text-white' : 'text-slate-400'}`}
                    title="List View"
                  >
                    <List className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

            </div>

            {/* Active Filters Pill Row */}
            {activeFilters.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="text-[11px] font-bold text-slate-400">Active Filters:</span>
                {activeFilters.map((f, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800"
                  >
                    <span>{f.label}</span>
                    <button
                      onClick={f.onRemove}
                      className="hover:text-rose-500 cursor-pointer p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
                <button
                  onClick={handleResetFilters}
                  className="text-[11px] font-bold text-rose-500 hover:underline cursor-pointer ml-1"
                >
                  Clear all
                </button>
              </div>
            )}

          </div>

          {/* Product Results Grid */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div 
                  key={i} 
                  className="h-80 rounded-3xl animate-pulse bg-slate-200 dark:bg-slate-800 border border-slate-200 dark:border-slate-800"
                />
              ))}
            </div>
          ) : paginatedProducts.length === 0 ? (
            <div className="p-12 text-center rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
                <Pill className="w-8 h-8 stroke-1" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                No matching medications or wellness products found
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                We couldn't find items matching your active filters. Try adjusting price limits, clearing brand filters, or searching by generic formula.
              </p>
              <button
                onClick={handleResetFilters}
                className="px-5 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs inline-flex items-center gap-2 cursor-pointer transition-all"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Reset All Filters</span>
              </button>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {paginatedProducts.map((med) => (
                <MedicineCard
                  key={med.medicine_id}
                  medicine={med}
                  onViewDetails={onViewDetails}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden shadow-xs">
              {paginatedProducts.map((med) => {
                const isPrescription = ['Antibiotics', 'Antibiotics & Antimicrobials', 'Cardiovascular', 'Cardiovascular & Blood Pressure', 'Respiratory', 'Respiratory & Allergy'].includes(med.category_name) || 
                  med.dosage_form?.toLowerCase().includes('injection');
                const img = getMedicineProductImage(med);
                const isOffer = med.is_offer || Boolean(med.discount_percent);

                return (
                  <div 
                    key={med.medicine_id}
                    className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-slate-50/80 dark:hover:bg-slate-950/40 transition-colors"
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="relative w-20 h-20 rounded-2xl overflow-hidden bg-slate-50/80 dark:bg-slate-950/60 shrink-0 border border-slate-200 dark:border-slate-700 p-1.5 flex items-center justify-center">
                        <img 
                          src={img} 
                          alt={med.name} 
                          className="w-full h-full object-contain" 
                          loading="lazy"
                        />
                        {isOffer && (
                          <span className="absolute top-1 right-1 px-1.5 py-0.2 rounded bg-rose-600 text-white font-black text-[8px] uppercase">
                            SALE
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 uppercase">
                            {med.category_name}
                          </span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md uppercase ${
                            med.is_wellness
                              ? 'bg-pink-100 text-pink-800 dark:bg-pink-950/60 dark:text-pink-300'
                              : isPrescription
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                                : 'bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300'
                          }`}>
                            {med.is_wellness ? 'Wellness' : isPrescription ? 'Rx Only' : 'OTC'}
                          </span>
                          <AvailabilityBadge status={med.availability_status} size="sm" />
                        </div>

                        <h3 className="text-base font-bold text-slate-900 dark:text-white truncate">
                          {med.name}
                        </h3>

                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                          Active: <span className="italic">{med.generic_name}</span> • {med.brand_name} • {med.strength} • {med.dosage_form}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-4 shrink-0">
                      <div className="text-left sm:text-right">
                        {med.is_public_price && med.unit_price ? (
                          <>
                            <span className="text-[10px] uppercase font-bold text-slate-400 block">Retail Price</span>
                            <div className="flex items-baseline gap-1 sm:justify-end">
                              <span className="text-base font-black text-slate-900 dark:text-white">
                                Rs. {Number(med.unit_price).toFixed(2)}
                              </span>
                              {med.original_price && (
                                <span className="text-xs text-slate-400 line-through">
                                  Rs. {Number(med.original_price).toFixed(2)}
                                </span>
                              )}
                            </div>
                          </>
                        ) : (
                          <span className="text-xs font-semibold text-slate-500">Inquire at Counter</span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onViewDetails(med)}
                          className="px-3.5 py-2 rounded-xl text-xs font-bold bg-teal-700 hover:bg-teal-800 text-white flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Details</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={(p) => {
                setPage(p);
                window.scrollTo({ top: 120, behavior: 'smooth' });
              }}
            />
          )}

        </main>

      </div>

    </div>
  );
}
