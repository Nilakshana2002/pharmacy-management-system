import React, { useState, useEffect } from 'react';
import { 
  Star, MessageSquare, CheckCircle2, ThumbsUp, Plus, ShieldCheck, 
  Sparkles, User, Award, Heart, Send, X, ChevronLeft, ChevronRight,
  Quote
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const INITIAL_REVIEWS = [
  {
    id: 1,
    name: 'Dr. Senaka Wickramasinghe',
    role: 'Consultant Physician',
    rating: 5,
    date: '2 days ago',
    category: 'Cardiovascular Care',
    comment: 'Exceptional inventory tracking. Being able to check real-time availability of specialized cardiac medications (Norvasc, Lipitor) before driving to the counter saved immense time for my patients.',
    verified: true,
    helpful: 24,
    avatarColor: 'from-blue-600 to-indigo-600'
  },
  {
    id: 2,
    name: 'Nadeesha Senanayake',
    role: 'Mother of two',
    rating: 5,
    date: '1 week ago',
    category: 'Baby & Pediatric Care',
    comment: 'The beauty & baby wellness collection is authentic and carefully handled. The Sebamed baby products and Panadol infant drops were in fresh condition with long expiry dates.',
    verified: true,
    helpful: 19,
    avatarColor: 'from-pink-500 to-rose-500'
  },
  {
    id: 3,
    name: 'Mahesh Bandara',
    role: 'Chronic Care Patient',
    rating: 5,
    date: '2 weeks ago',
    category: 'Cold-Chain Insulin',
    comment: 'I rely on Lantus SoloStar insulin pens monthly. The dispensary strictly follows the 2°C – 8°C cold-chain protocol with temperature monitored transport packs. Highly dependable!',
    verified: true,
    helpful: 31,
    avatarColor: 'from-teal-600 to-emerald-600'
  },
  {
    id: 4,
    name: 'Dilini Karunaratne',
    role: 'Fitness Enthusiast',
    rating: 5,
    date: '3 weeks ago',
    category: 'Diet & Nutrition',
    comment: 'Purchased Optimum Nutrition whey and Vitabiotics multivitamins. Excellent price with genuine hologram labels. Much better than shady online sellers!',
    verified: true,
    helpful: 14,
    avatarColor: 'from-amber-500 to-orange-500'
  },
  {
    id: 5,
    name: 'K. V. Perera',
    role: 'Senior Citizen',
    rating: 5,
    date: '1 month ago',
    category: 'Hypertension Care',
    comment: 'Very professional dispensary staff. They checked my doctor prescription thoroughly and explained the dosage schedule for Cozaar and Betaloc with clear instructions.',
    verified: true,
    helpful: 22,
    avatarColor: 'from-purple-600 to-indigo-600'
  },
  {
    id: 6,
    name: 'Amanda Rodrigo',
    role: 'Verified Customer',
    rating: 5,
    date: '1 month ago',
    category: 'Beauty & Skincare',
    comment: 'The CeraVe cleanser and La Roche-Posay SPF 50+ are 100% original imported stock. Great customer support and genuine medical-grade skincare options.',
    verified: true,
    helpful: 18,
    avatarColor: 'from-emerald-600 to-teal-600'
  }
];

export default function FeedbackSection() {
  const { isDark } = useTheme();
  const [reviews, setReviews] = useState(() => {
    try {
      const saved = localStorage.getItem('pharmacy_customer_feedback');
      return saved ? JSON.parse(saved) : INITIAL_REVIEWS;
    } catch (e) {
      return INITIAL_REVIEWS;
    }
  });

  // Track the start index for side-by-side slides
  const [startIndex, setStartIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newRating, setNewRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('Prescription Medicines');
  const [newComment, setNewComment] = useState('');
  const [submittedToast, setSubmittedToast] = useState(false);

  // Number of cards visible side-by-side: 3 on desktop, 2 on tablet, 1 on mobile
  const cardsPerPage = 3;
  const maxStartIndex = Math.max(0, reviews.length - cardsPerPage);

  // Auto-slide side-by-side reviews smoothly
  useEffect(() => {
    if (isPaused || reviews.length <= cardsPerPage) return;
    const interval = setInterval(() => {
      setStartIndex((prev) => (prev >= maxStartIndex ? 0 : prev + 1));
    }, 5000);
    return () => clearInterval(interval);
  }, [isPaused, reviews.length, maxStartIndex]);

  useEffect(() => {
    try {
      localStorage.setItem('pharmacy_customer_feedback', JSON.stringify(reviews));
    } catch (e) {
      console.warn('Could not save reviews to localStorage', e);
    }
  }, [reviews]);

  const handlePrev = () => {
    setStartIndex((prev) => (prev <= 0 ? maxStartIndex : prev - 1));
  };

  const handleNext = () => {
    setStartIndex((prev) => (prev >= maxStartIndex ? 0 : prev + 1));
  };

  const handleHelpful = (id) => {
    setReviews(prev => prev.map(r => r.id === id ? { ...r, helpful: r.helpful + 1 } : r));
  };

  const handleAddReview = (e) => {
    e.preventDefault();
    if (!newName.trim() || !newComment.trim()) return;

    const newRev = {
      id: Date.now(),
      name: newName.trim(),
      role: 'Verified Patient',
      rating: newRating,
      date: 'Just now',
      category: newCategory,
      comment: newComment.trim(),
      verified: true,
      helpful: 1,
      avatarColor: 'from-teal-600 to-cyan-600'
    };

    setReviews([newRev, ...reviews]);
    setStartIndex(0);
    setIsModalOpen(false);
    setNewName('');
    setNewComment('');
    setNewRating(5);
    setSubmittedToast(true);
    setTimeout(() => setSubmittedToast(false), 4000);
  };

  // Visible window of reviews (showing small side-by-side cards)
  const visibleReviews = reviews.slice(startIndex, startIndex + cardsPerPage);
  // Pad if end reached
  if (visibleReviews.length < cardsPerPage && reviews.length >= cardsPerPage) {
    visibleReviews.push(...reviews.slice(0, cardsPerPage - visibleReviews.length));
  }

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
      
      {/* Toast Notification */}
      {submittedToast && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-2xl bg-emerald-600 text-white shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom duration-300">
          <CheckCircle2 className="w-5 h-5" />
          <span className="text-xs font-bold">Thank you! Your feedback has been published.</span>
        </div>
      )}

      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-6 gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 mb-1.5">
            <Sparkles className="w-3.5 h-3.5 text-teal-600" />
            <span>Verified Patient Experience</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
            Customer & Patient Reviews
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Real feedback from patients and doctors across Colombo and suburbs.
          </p>
        </div>

        {/* Controls: Leave Review + Slide Arrows */}
        <div className="flex items-center gap-3 self-start sm:self-auto shrink-0">
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Leave Feedback</span>
          </button>

          {/* Navigation Arrows for Side-by-Side Slides */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={handlePrev}
              className="w-9 h-9 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-teal-50 dark:hover:bg-teal-950 text-slate-700 dark:text-slate-300 flex items-center justify-center transition-all cursor-pointer shadow-xs"
              title="Previous Review"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleNext}
              className="w-9 h-9 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-teal-50 dark:hover:bg-teal-950 text-slate-700 dark:text-slate-300 flex items-center justify-center transition-all cursor-pointer shadow-xs"
              title="Next Review"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* SMALL SIDE-BY-SIDE SLIDING CARDS TRACK */}
      {/* ======================================================== */}
      <div 
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
      >
        {visibleReviews.map((rev, index) => (
          <div
            key={`${rev.id}-${index}`}
            className={`p-5 rounded-2xl border transition-all duration-300 flex flex-col justify-between hover:shadow-lg hover:-translate-y-0.5 ${
              isDark 
                ? 'bg-slate-900/90 border-slate-800 hover:border-teal-500/40' 
                : 'bg-white border-slate-200/90 hover:border-teal-500/40 hover:shadow-slate-200/50'
            }`}
          >
            {/* Top Row: Stars + Category Pill */}
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-0.5 text-amber-400">
                  {[...Array(rev.rating)].map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <span className="text-[10px] text-slate-400">
                  {rev.date}
                </span>
              </div>

              <div className="mb-2.5">
                <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-md bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 uppercase">
                  {rev.category}
                </span>
              </div>

              {/* Review Text */}
              <p className="text-xs sm:text-[13px] text-slate-700 dark:text-slate-200 leading-relaxed italic line-clamp-4">
                "{rev.comment}"
              </p>
            </div>

            {/* Author Footer */}
            <div className="pt-3 mt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className={`w-8 h-8 rounded-xl bg-gradient-to-tr ${rev.avatarColor || 'from-teal-600 to-cyan-600'} text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs`}>
                  {rev.name.charAt(0)}
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate flex items-center gap-1">
                    <span>{rev.name}</span>
                    {rev.verified && (
                      <CheckCircle2 className="w-3 h-3 text-teal-600 shrink-0" title="Verified Patient" />
                    )}
                  </h4>
                  <p className="text-[10px] text-slate-400 truncate">
                    {rev.role}
                  </p>
                </div>
              </div>

              <button
                onClick={() => handleHelpful(rev.id)}
                className="text-[11px] text-slate-400 hover:text-teal-600 flex items-center gap-1 cursor-pointer shrink-0 ml-2"
                title="Mark Helpful"
              >
                <ThumbsUp className="w-3 h-3" />
                <span>{rev.helpful}</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Stepper Dots (Slide indicators) */}
      <div className="flex items-center justify-center gap-1.5 mt-5">
        {Array.from({ length: maxStartIndex + 1 }).map((_, idx) => (
          <button
            key={idx}
            onClick={() => setStartIndex(idx)}
            className={`h-1.5 rounded-full transition-all cursor-pointer ${
              idx === startIndex
                ? 'w-6 bg-teal-600 dark:bg-teal-400'
                : 'w-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300'
            }`}
            title={`Slide ${idx + 1}`}
          />
        ))}
      </div>

      {/* Interactive Review Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className={`relative w-full max-w-md rounded-3xl p-6 sm:p-8 shadow-2xl border ${
            isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-5 right-5 p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-black mb-1">Share Your Patient Experience</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
              Help other patients and doctors know about our dispensary service and genuine medicine availability.
            </p>

            <form onSubmit={handleAddReview} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1.5">
                  Your Overall Rating
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => setNewRating(star)}
                      className="p-1 focus:outline-none transition-transform hover:scale-125 cursor-pointer"
                    >
                      <Star
                        className={`w-7 h-7 ${
                          (hoverRating || newRating) >= star
                            ? 'text-amber-400 fill-amber-400'
                            : 'text-slate-300 dark:text-slate-700'
                        }`}
                      />
                    </button>
                  ))}
                  <span className="text-xs font-bold text-teal-600 ml-2">
                    {newRating === 5 ? '5.0 - Excellent Service' : `${newRating}.0 Stars`}
                  </span>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
                  Your Name
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Priyantha Silva"
                  className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-teal-600"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
                  Category / Medicine Purchased
                </label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-teal-600"
                >
                  <option value="Prescription Medicines">Prescription Medicines (Rx)</option>
                  <option value="Cardiovascular & Heart">Cardiovascular & Blood Pressure</option>
                  <option value="Diabetes Care & Insulin">Diabetes Care & Insulin</option>
                  <option value="Diet & Nutrition">Diet & Nutrition Supplements</option>
                  <option value="Beauty Care & Cosmetics">Beauty Care & Cosmetics</option>
                  <option value="Baby Care">Baby & Infant Care</option>
                  <option value="Medical Devices">Medical Devices & Stethoscopes</option>
                  <option value="Ayurvedic Care">Ayurvedic & Herbal Remedies</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
                  Your Comments & Experience
                </label>
                <textarea
                  rows={3}
                  required
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Share details about medicine stock availability, cold-chain handling, or pharmacist counseling..."
                  className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-teal-600"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-md transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Submit Feedback</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </section>
  );
}
