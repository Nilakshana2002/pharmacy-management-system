import React, { useState, useEffect } from 'react';
import { 
  Search, Filter, RotateCcw, ArrowUpDown, Tag, Building2, 
  CheckCircle2, AlertTriangle, XCircle, Pill, Frown, ChevronDown
} from 'lucide-react';
import MedicineCard from '../components/MedicineCard';
import Pagination from '../components/Pagination';
import { getMedicines, getCategories, getBrands } from '../services/api';

export default function MedicineSearchPage({ initialQuery = '', initialCategoryId = '', onViewDetails }) {
  const [search, setSearch] = useState(initialQuery);
  const [selectedCategory, setSelectedCategory] = useState(initialCategoryId);
  const [selectedBrand, setSelectedBrand] = useState('');
  const [availability, setAvailability] = useState('all'); // 'all', 'in_stock', 'low_stock', 'out_of_stock'
  const [sortBy, setSortBy] = useState('name_asc');
  const [page, setPage] = useState(1);
  const limit = 9;

  const [medicines, setMedicines] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  // Fetch categories and brands for filter dropdowns on mount
  useEffect(() => {
    loadFilterOptions();
  }, []);

  // Fetch medicines whenever search/filter/pagination changes
  useEffect(() => {
    fetchMedicines();
  }, [search, selectedCategory, selectedBrand, availability, sortBy, page]);

  // Sync initial props if changed from home page
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
    setSortBy('name_asc');
    setPage(1);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Header and Search Bar */}
      <div className="space-y-4">
        <div>
          <span className="text-xs font-mono uppercase tracking-wider text-teal-400 font-semibold">Live Inventory Catalog</span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white mt-1">
            Medicine Search & Stock Availability
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Browse authentic medicines, filter by generic names, brands, categories, and real-time physical stock.
          </p>
        </div>

        {/* Global Search Field */}
        <div className="relative">
          <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1); // reset to page 1 on new search
            }}
            placeholder="Search by brand name, generic formulation (e.g. Amoxicillin), or therapeutic indication..."
            className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-slate-900 border border-slate-700/80 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-sm shadow-inner transition-all"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white px-2 py-1 bg-slate-800 rounded-lg cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Main Layout: Filters Sidebar + Results Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Filter Sidebar (Desktop) */}
        <aside className="lg:col-span-1 space-y-6">
          <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 backdrop-blur-sm space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2 text-sm font-bold text-white">
                <Filter className="w-4 h-4 text-emerald-400" />
                <span>Filters & Facets</span>
              </div>
              <button
                onClick={handleResetFilters}
                className="text-xs text-slate-400 hover:text-emerald-400 flex items-center gap-1 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                Reset
              </button>
            </div>

            {/* Availability Filter */}
            <div className="space-y-3">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                Availability Status
              </label>
              <div className="space-y-1.5">
                {[
                  { id: 'all', label: 'All Medicines' },
                  { id: 'in_stock', label: 'In Stock' },
                  { id: 'low_stock', label: 'Low Stock' },
                  { id: 'out_of_stock', label: 'Out of Stock' }
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setAvailability(item.id);
                      setPage(1);
                    }}
                    className={`w-full px-3 py-2 rounded-xl text-xs font-medium text-left flex items-center justify-between transition-all cursor-pointer ${
                      availability === item.id
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    <span>{item.label}</span>
                    {availability === item.id && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>}
                  </button>
                ))}
              </div>
            </div>

            {/* Category Filter */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                Therapeutic Category
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value="">All Categories ({categories.length})</option>
                {categories.map((c) => (
                  <option key={c.category_id} value={c.category_id}>
                    {c.category_name} ({c.medicine_count})
                  </option>
                ))}
              </select>
            </div>

            {/* Brand Filter */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                Pharmaceutical Brand
              </label>
              <select
                value={selectedBrand}
                onChange={(e) => {
                  setSelectedBrand(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value="">All Brands ({brands.length})</option>
                {brands.map((b) => (
                  <option key={b.brand_id} value={b.brand_id}>
                    {b.brand_name} ({b.medicine_count})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </aside>

        {/* Results Column */}
        <main className="lg:col-span-3 space-y-6">
          
          {/* Top Sort and Results Summary Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/50 border border-slate-800 text-xs text-slate-400">
            <div>
              <span className="font-semibold text-white">{totalRecords}</span> medicines found
              {search && <span> matching "<span className="text-emerald-400">{search}</span>"</span>}
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
              <span className="shrink-0 flex items-center gap-1 text-slate-400">
                <ArrowUpDown className="w-3.5 h-3.5" />
                Sort:
              </span>
              <select
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-emerald-500 cursor-pointer text-xs"
              >
                <option value="name_asc">Alphabetical (A → Z)</option>
                <option value="name_desc">Alphabetical (Z → A)</option>
                <option value="price_asc">Price (Low → High)</option>
                <option value="price_desc">Price (High → Low)</option>
              </select>
            </div>
          </div>

          {/* Cards Grid or Loading / Empty States */}
          {loading ? (
            <div className="text-center py-20 text-slate-400">
              <div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full mx-auto mb-3"></div>
              Executing database catalog query...
            </div>
          ) : medicines.length === 0 ? (
            /* Clear Empty State Message */
            <div className="p-12 rounded-3xl bg-slate-900/40 border border-slate-800 text-center space-y-4 max-w-lg mx-auto">
              <div className="w-14 h-14 rounded-2xl bg-slate-800/80 text-slate-400 flex items-center justify-center mx-auto">
                <Frown className="w-7 h-7 text-amber-400" />
              </div>
              <h3 className="text-lg font-bold text-white">No Medicines Found</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                We couldn't find any medications matching your active search criteria or filters.
              </p>
              <div className="pt-2">
                <button
                  onClick={handleResetFilters}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-500/15 hover:bg-emerald-500 text-emerald-400 hover:text-slate-950 border border-emerald-500/30 transition-all cursor-pointer"
                >
                  Clear All Filters & Show Full Catalog
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {medicines.map((med) => (
                  <MedicineCard
                    key={med.medicine_id}
                    medicine={med}
                    onViewDetails={onViewDetails}
                  />
                ))}
              </div>

              {/* Pagination */}
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={(newPage) => setPage(newPage)}
              />
            </div>
          )}

        </main>
      </div>

    </div>
  );
}
