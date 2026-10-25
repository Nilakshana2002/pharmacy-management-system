import React, { useState, useEffect, useRef } from 'react';
import { 
  UploadCloud, Image as ImageIcon, Link as LinkIcon, Grid, 
  Check, X, Trash2, AlertCircle, Eye, RefreshCw, Sparkles, Search
} from 'lucide-react';
import { uploadMedicineImage, getMedicineLibraryImages } from '../services/api';
import { getMedicineProductImage } from '../utils/pharmacyImages';

export default function MedicineImageUploadField({
  value = '',
  onChange = () => {},
  dosageForm = 'Tablet',
  medicineName = '',
  isDark = false
}) {
  const [tab, setTab] = useState('upload'); // 'upload' | 'library' | 'url'
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState(false);
  
  // Library images state
  const [libraryImages, setLibraryImages] = useState([]);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [librarySearch, setLibrarySearch] = useState('');

  const fileInputRef = useRef(null);

  // Load dispensary library images when library tab is clicked
  useEffect(() => {
    if (tab === 'library' && libraryImages.length === 0) {
      loadLibrary();
    }
  }, [tab]);

  const loadLibrary = async () => {
    setLibraryLoading(true);
    try {
      const res = await getMedicineLibraryImages();
      if (res?.success) {
        setLibraryImages(res.data || []);
      }
    } catch (err) {
      console.warn('Could not load library images:', err);
    } finally {
      setLibraryLoading(false);
    }
  };

  // Process file upload
  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setUploadError('Please select a valid image file (JPG, PNG, or WebP).');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setUploadError('Image file is too large (Maximum size: 10MB).');
      return;
    }

    setUploadError('');
    setIsUploading(true);
    setUploadSuccess(false);

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64Data = event.target.result;
        try {
          const res = await uploadMedicineImage({
            imageBase64: base64Data,
            fileName: file.name
          });

          if (res?.success && res.image_url) {
            onChange(res.image_url);
            setUploadSuccess(true);
            setTimeout(() => setUploadSuccess(false), 3000);
          } else {
            setUploadError(res?.message || 'Failed to upload image.');
          }
        } catch (apiErr) {
          setUploadError(apiErr.response?.data?.message || apiErr.message || 'Error uploading file.');
        } finally {
          setIsUploading(false);
        }
      };

      reader.onerror = () => {
        setUploadError('Failed to read the selected file.');
        setIsUploading(false);
      };

      reader.readAsDataURL(file);
    } catch (err) {
      setUploadError('An unexpected error occurred while reading file.');
      setIsUploading(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const syntheticEvent = { target: { files: e.dataTransfer.files } };
      handleFileSelect(syntheticEvent);
    }
  };

  // Determine fallback image for live preview
  const fallbackPreview = getMedicineProductImage({
    dosage_form: dosageForm,
    name: medicineName
  });

  const filteredLibrary = libraryImages.filter(img => 
    img.name.toLowerCase().includes(librarySearch.toLowerCase()) ||
    img.fileName.toLowerCase().includes(librarySearch.toLowerCase())
  );

  return (
    <div className={`p-3.5 sm:p-4 rounded-2xl border transition-all ${
      isDark 
        ? 'bg-slate-950/60 border-slate-800' 
        : 'bg-slate-50/80 border-slate-200'
    }`}>
      {/* Header & Source Mode Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 mb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <label className="text-xs font-black flex items-center gap-1.5 text-slate-800 dark:text-slate-200 uppercase tracking-wider">
            <ImageIcon className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
            <span>Medicine Product Photo</span>
          </label>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Add packaging photography or select from existing dispensary stocks
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center p-0.5 rounded-xl bg-slate-200/70 dark:bg-slate-900 border border-slate-300/50 dark:border-slate-800 text-[11px] font-bold">
          <button
            type="button"
            onClick={() => setTab('upload')}
            className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
              tab === 'upload'
                ? 'bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <UploadCloud className="w-3 h-3" />
            <span>Upload</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('library')}
            className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
              tab === 'library'
                ? 'bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Grid className="w-3 h-3" />
            <span>Dispensary Library</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('url')}
            className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
              tab === 'url'
                ? 'bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <LinkIcon className="w-3 h-3" />
            <span>Web URL</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-start">
        {/* Left Side: Upload / Selector Control (8 cols) */}
        <div className="md:col-span-8 space-y-2.5">
          {/* TAB 1: FILE UPLOAD DROPZONE */}
          {tab === 'upload' && (
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/jpg"
                className="hidden"
                onChange={handleFileSelect}
              />

              <div
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-4 sm:p-5 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 group ${
                  isUploading
                    ? 'border-teal-500 bg-teal-50/20 dark:bg-teal-950/20 pointer-events-none'
                    : 'border-slate-300 dark:border-slate-700 hover:border-teal-500 dark:hover:border-teal-400 bg-white/70 dark:bg-slate-900/60 hover:bg-teal-50/30 dark:hover:bg-teal-950/10'
                }`}
              >
                <div className="w-10 h-10 rounded-2xl bg-teal-500/10 dark:bg-teal-500/20 text-teal-600 dark:text-teal-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  {isUploading ? (
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  ) : (
                    <UploadCloud className="w-5 h-5" />
                  )}
                </div>

                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {isUploading ? 'Uploading and optimizing packaging photo...' : 'Click to browse or drag & drop photo here'}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Supports high-resolution JPG, PNG, or WebP packaging images (up to 10MB)
                  </p>
                </div>
              </div>

              {uploadError && (
                <div className="mt-2 p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-1.5 animate-in fade-in">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}

              {uploadSuccess && (
                <div className="mt-2 p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-1.5 animate-in fade-in">
                  <Check className="w-3.5 h-3.5 shrink-0" />
                  <span>Packaging photo uploaded and attached successfully!</span>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: DISPENSARY IMAGE LIBRARY */}
          {tab === 'library' && (
            <div className="space-y-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                <input
                  type="text"
                  value={librarySearch}
                  onChange={(e) => setLibrarySearch(e.target.value)}
                  placeholder="Search existing dispensary medicine images..."
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl border text-xs border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:outline-none focus:border-teal-500"
                />
              </div>

              {libraryLoading ? (
                <div className="p-6 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-teal-600" />
                  <span>Loading catalog images...</span>
                </div>
              ) : filteredLibrary.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500 border border-dashed rounded-xl">
                  No matching images found in library.
                </div>
              ) : (
                <div className="max-h-48 overflow-y-auto pr-1 grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {filteredLibrary.map((item, idx) => {
                    const isSelected = value === item.url || value.includes(item.fileName);
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => onChange(item.url)}
                        className={`p-1.5 rounded-xl border text-left flex items-center gap-2 transition-all cursor-pointer group ${
                          isSelected
                            ? 'border-teal-500 bg-teal-50/50 dark:bg-teal-950/40 ring-2 ring-teal-500/20'
                            : 'border-slate-200 dark:border-slate-800 hover:border-teal-400 bg-white dark:bg-slate-900'
                        }`}
                      >
                        <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                          <img
                            src={item.url}
                            alt={item.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-bold truncate text-slate-800 dark:text-slate-200">
                            {item.name}
                          </p>
                          <span className="text-[9px] text-slate-400 block truncate">
                            {item.fileName}
                          </span>
                        </div>
                        {isSelected && (
                          <Check className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: DIRECT WEB URL */}
          {tab === 'url' && (
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block">
                Direct Image URL (HTTPS link from pharmaceutical distributor or manufacturer)
              </label>
              <div className="relative">
                <LinkIcon className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                <input
                  type="url"
                  value={value}
                  onChange={(e) => onChange(e.target.value)}
                  placeholder="https://images.example.com/products/amoxil-pack.jpg"
                  className="w-full pl-9 pr-3 py-2 rounded-xl border text-xs border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:outline-none focus:border-teal-500 font-mono"
                />
              </div>
              <p className="text-[10px] text-slate-500">
                Ensure the image link is publicly accessible and starts with https://
              </p>
            </div>
          )}
        </div>

        {/* Right Side: Live Visual Preview Card (4 cols) */}
        <div className="md:col-span-4 flex flex-col items-center">
          <div className="w-full rounded-2xl border p-2.5 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 flex flex-col items-center text-center shadow-xs">
            {/* Thumbnail Box */}
            <div className="relative w-full aspect-square max-w-[140px] rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 flex items-center justify-center group">
              <img
                src={value || fallbackPreview}
                alt={medicineName || 'Medicine preview'}
                className="w-full h-full object-cover transition-transform group-hover:scale-105"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = fallbackPreview;
                }}
              />

              {/* Status Badge */}
              <div className="absolute top-1.5 left-1.5 right-1.5 flex items-center justify-between pointer-events-none">
                <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider backdrop-blur-md shadow-xs ${
                  value 
                    ? 'bg-emerald-600/90 text-white' 
                    : 'bg-slate-700/80 text-white'
                }`}>
                  {value ? 'Custom Photo' : 'Auto Fallback'}
                </span>
              </div>
            </div>

            {/* Caption & Reset */}
            <div className="mt-2 w-full text-center">
              <p className="text-[11px] font-bold text-slate-800 dark:text-slate-200 truncate px-1">
                {medicineName || 'Product Preview'}
              </p>
              <p className="text-[10px] text-slate-400">
                {value ? 'Custom packaging photo active' : `Standard ${dosageForm} category icon`}
              </p>

              {value && (
                <button
                  type="button"
                  onClick={() => onChange('')}
                  className="mt-2 w-full py-1 px-2 rounded-lg text-[11px] font-bold text-rose-600 hover:text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                  title="Remove custom image and revert to category preset"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Remove Custom Photo</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
