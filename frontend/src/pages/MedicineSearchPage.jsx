import React, { useState, useEffect } from 'react';
import { 
  Search, Filter, RotateCcw, ArrowUpDown, Tag, Building2, 
  CheckCircle2, AlertTriangle, XCircle, Pill, Frown, ChevronDown,
  LayoutGrid, List, SlidersHorizontal, FileText, ShoppingBag, X, Check, Eye
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
  onViewDetails,
  onAddToCart,
  cartItems = []
}) {
  const { isDark } = useTheme();
  const [search, setSearch] = useState(initialQuery);
  const [selectedCategory, setSelectedCategory] = useState(initialCategoryId);
  const [selectedBrand, setSelectedBrand] = useState('');
  const [availability, setAvailability] = useState('all'); // 'all', 'in_stock', 'low_stock', 'out_of_stock'
  const [dosageFilter, setDosageFilter] = useState('');
  const [sortBy, setSortBy] = useState('name_asc');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
  const [page, setPage] = useState(1);
  const limit = viewMode === 'list' ? 12 : 9;

  const [medicines, setMedicines] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  // Dosage Form options commonly used in pharmacy
  const dosageForms = ['Tablet', 'Capsule', 'Syrup', 'Injection', 'Cream', 'Inhaler', 'Drops', 'Suspension'];

  useEffect(() => {
    loadFilterOptions();
  }, []);

  useEffect(() => {
    fetchMedicines();
  }, [search, selectedCategory, selectedBrand, availability, sortBy, page, limit]);

  useEffect(() => {
    if (initialQuery !== undefined) setSearch(initialQuery);
    if (initialCategoryId !== undefined) setSelectedCategory(initialCategoryId);
  }, [initialQuery, initialCategoryId]);

  const loadFilterOptions = async () => {
    try {
      const [catRes, brandRes] = await Promise.all([
        getCategories(),
        getBrands()
      ]);
      if (catRes.success) setCategories(catRes.data);
      if (brandRes.success) setBrands(brandRes.data);
    } catch (err) {
      console.error('Error fetching filter options:', err);
    }
  };

  const fetchMedicines = async () => {
    try {
      setLoading(true);
      const params = {
        search: search.trim(),
        categoryId: selectedCategory || undefined,
        brandId: selectedBrand || undefined,
        availability: availability !== 'all' ? availability : undefined,
        sortBy,
        page,
        limit
      };

      const res = await getMedicines(params);
      if (res.success) {
        setMedicines(res.data);
        setTotalRecords(res.total);
        setTotalPages(res.totalPages);
      }
    } catch (err) {
      console.error('Error fetching medicines:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleResetFilters = () => {
    setSearch('');
    setSelectedCategory('');
    setSelectedBrand('');
    setAvailability('all');
    setDosageFilter('');
    setSortBy('name_asc');
    setPage(1);
  };

  const isItemSaved = (id) => cartItems.some(item => item.medicine_id === id);

  // Filter medicines locally if dosage filter is selected
  const displayedMedicines = dosageFilter 
    ? medicines.filter(m => m.dosage_form?.toLowerCase().includes(dosageFilter.toLowerCase()))
    : medicines;

  const activeFiltersCount = [
    Boolean(search),
    Boolean(selectedCategory),
    Boolean(selectedBrand),
    availability !== 'all',
    Boolean(dosageFilter)
  ].filter(Boolean).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Search Header Banner */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400">
                Pharmaceutical Catalog
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                {totalRecords} Formulations Available
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1">
              Browse Medicines & Check Availability
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-0.5">
              Filter by medical categories, pharmaceutical brands, dosage forms, and real-time counter stock.
            </p>
          </div>

          {/* View Mode Switcher (Grid vs List) */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <div className="p-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex items-center gap-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 font-bold'
                    : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
                title="Grid Cards View"
              >
                <LayoutGrid className="w-4 h-4" />
                <span className="hidden sm:inline">Grid</span>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === 'list'
                    ? 'bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 font-bold'
                    : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
                title="Detailed List View"
              >
                <List className="w-4 h-4" />
                <span className="hidden sm:inline">List</span>
              </button>
            </div>
          </div>
        </div>

        {/* Primary Search Input Field */}
        <div className="relative">
          <div className="relative flex items-center rounded-2xl border shadow-md bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus-within:border-teal-600 transition-all">
            <Search className="w-5 h-5 text-teal-600 dark:text-teal-400 ml-4 shrink-0" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by trade name, generic chemical formula (e.g. Paracetamol, Amoxicillin), or brand..."
              className="w-full bg-transparent px-4 py-3.5 text-xs sm:text-sm focus:outline-none text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="p-1 mr-3 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Filter Controls Bar (Category, Brand, Stock Status, Sort) */}
        <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            
            {/* Category Filter */}
            <div>
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
                Category
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-teal-600"
              >
                <option value="">All Categories</option>
                {categories.map((c) => (
                  <option key={c.category_id} value={c.category_id}>
                    {c.category_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Brand Filter */}
            <div>
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
                Brand / Manufacturer
              </label>
              <select
                value={selectedBrand}
                onChange={(e) => {
                  setSelectedBrand(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-teal-600"
              >
                <option value="">All Brands</option>
                {brands.map((b) => (
                  <option key={b.brand_id} value={b.brand_id}>
                    {b.brand_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Stock Availability Filter */}
            <div>
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
                Store Availability
              </label>
              <select
                value={availability}
                onChange={(e) => {
                  setAvailability(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-teal-600"
              >
                <option value="all">All Statuses</option>
                <option value="in_stock">Available in Dispensary</option>
                <option value="low_stock">Low Stock (Limited)</option>
                <option value="out_of_stock">Out of Stock</option>
              </select>
            </div>

            {/* Dosage Form Filter */}
            <div>
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
                Dosage Form
              </label>
              <select
                value={dosageFilter}
                onChange={(e) => setDosageFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-teal-600"
              >
                <option value="">All Forms</option>
                {dosageForms.map((df) => (
                  <option key={df} value={df}>{df}</option>
                ))}
              </select>
            </div>

            {/* Sort Options */}
            <div>
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
                Sort Results
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-teal-600"
              >
                <option value="name_asc">Name: A to Z</option>
                <option value="name_desc">Name: Z to A</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
              </select>
            </div>

          </div>

          {/* Active Filters row & Reset button */}
          {activeFiltersCount > 0 && (
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400">
                {activeFiltersCount} active {activeFiltersCount === 1 ? 'filter' : 'filters'} applied
              </span>
              <button
                onClick={handleResetFilters}
                className="text-xs font-bold text-rose-500 hover:text-rose-600 flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Filters</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Results Display */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div 
              key={i} 
              className="h-80 rounded-2xl animate-pulse bg-slate-200 dark:bg-slate-800 border border-slate-200 dark:border-slate-800"
            />
          ))}
        </div>
      ) : displayedMedicines.length === 0 ? (
        /* Polished Empty State */
        <div className="p-12 text-center rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
            <Pill className="w-8 h-8 stroke-1" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            No medications found
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            We couldn't find any medications matching your search parameters. Try clearing some filters or searching by a generic chemical name.
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
        /* Grid Cards View */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayedMedicines.map((med) => (
            <MedicineCard
              key={med.medicine_id}
              medicine={med}
              onViewDetails={onViewDetails}
              onAddToCart={onAddToCart}
              isSaved={isItemSaved(med.medicine_id)}
            />
          ))}
        </div>
      ) : (
        /* Detailed List View */
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden shadow-xs">
          {displayedMedicines.map((med) => {
            const isPrescription = ['Antibiotics', 'Antibiotics & Antimicrobials', 'Cardiovascular', 'Cardiovascular & Blood Pressure', 'Respiratory', 'Respiratory & Allergy'].includes(med.category_name) || 
              med.dosage_form?.toLowerCase().includes('injection');
            const img = getMedicineProductImage(med);

            return (
              <div 
                key={med.medicine_id}
                className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-slate-50/80 dark:hover:bg-slate-950/40 transition-colors"
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0 border border-slate-200 dark:border-slate-700">
                    <img 
                      src={img} 
                      alt={med.name} 
                      className="w-full h-full object-cover" 
                      loading="lazy"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 uppercase">
                        {med.category_name}
                      </span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md uppercase ${
                        isPrescription ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300' : 'bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300'
                      }`}>
                        {isPrescription ? 'Rx Only' : 'OTC'}
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
                        <span className="text-base font-black text-slate-900 dark:text-white">
                          Rs. {Number(med.unit_price).toFixed(2)}
                        </span>
                      </>
                    ) : (
                      <span className="text-xs font-semibold text-slate-500">Inquire at Counter</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {onAddToCart && (
                      <button
                        onClick={() => onAddToCart(med)}
                        className={`p-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                          isItemSaved(med.medicine_id)
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200'
                        }`}
                        title="Add to Inquiry List"
                      >
                        {isItemSaved(med.medicine_id) ? <Check className="w-4 h-4 stroke-[2.5]" /> : <ShoppingBag className="w-4 h-4" />}
                      </button>
                    )}

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
      <Pagination
        currentPage={page}
        totalPages={totalPages}
        onPageChange={(p) => {
          setPage(p);
          window.scrollTo({ top: 180, behavior: 'smooth' });
        }}
      />

    </div>
  );
}
