import React, { useState, useEffect } from 'react';
import { 
  User, Mail, Lock, Phone, Calendar, MapPin, 
  CheckCircle2, AlertCircle, X, Shield, ArrowRight, UserPlus, LogIn, LogOut,
  Eye, EyeOff, Check, AlertTriangle, KeyRound
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { loginCustomer, registerCustomer } from '../utils/customerAuthService';

export default function CustomerAuthModal({ 
  isOpen, 
  onClose, 
  initialMode = 'login', // 'login' | 'register'
  onSuccess 
}) {
  const { isDark } = useTheme();
  const [mode, setMode] = useState(initialMode); // 'login' | 'register'

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [contactNo, setContactNo] = useState('');
  const [patientAge, setPatientAge] = useState('');
  const [nic, setNic] = useState('');
  const [address, setAddress] = useState('');

  // Password Visibility Toggles
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Field Touched Tracking for real-time inline errors
  const [touched, setTouched] = useState({});

  // Submission & UI States
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [activeStaffUser, setActiveStaffUser] = useState(null);

  // Sync mode with initialMode & check for active staff session
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      resetForm();
      const staffToken = localStorage.getItem('vdc_staff_token');
      const staffUserStr = localStorage.getItem('vdc_staff_user');
      if (staffToken && staffUserStr) {
        try {
          setActiveStaffUser(JSON.parse(staffUserStr));
        } catch (e) {
          setActiveStaffUser(null);
        }
      } else {
        setActiveStaffUser(null);
      }
    }
  }, [isOpen, initialMode]);

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setFullName('');
    setContactNo('');
    setPatientAge('');
    setNic('');
    setAddress('');
    setTouched({});
    setErrorMsg('');
    setSuccessMsg('');
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  // Body scroll lock & ESC key
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleBlur = (field) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  // ==========================================================
  // REAL-TIME VALIDATION RULES
  // ==========================================================
  const validate = () => {
    const errors = {};

    // Email validation
    const trimmedEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!trimmedEmail) {
      errors.email = 'Email address is required.';
    } else if (!emailRegex.test(trimmedEmail)) {
      errors.email = 'Please enter a valid email address (e.g. name@domain.com).';
    }

    // Password validation
    if (!password) {
      errors.password = 'Password is required.';
    } else if (password.length < 6) {
      errors.password = 'Password must be at least 6 characters long.';
    }

    // Register-specific validations
    if (mode === 'register') {
      // Full Name
      const trimmedName = fullName.trim();
      if (!trimmedName) {
        errors.fullName = 'Patient full name is required.';
      } else if (trimmedName.length < 3) {
        errors.fullName = 'Full name must be at least 3 characters.';
      } else if (!/^[a-zA-Z\s.'-]+$/.test(trimmedName)) {
        errors.fullName = 'Full name should only contain letters and spaces.';
      }

      // Contact No
      const cleanPhone = contactNo.trim().replace(/[\s\-\+\(\)]/g, '');
      if (!contactNo.trim()) {
        errors.contactNo = 'Contact phone number is required.';
      } else if (cleanPhone.length < 9 || cleanPhone.length > 15) {
        errors.contactNo = 'Please enter a valid phone number (e.g. +94 77 123 4567 or 0771234567).';
      }

      // Patient Age
      const cleanAge = patientAge.trim().replace(/[^\d]/g, '');
      const parsedAge = parseInt(cleanAge, 10);
      if (!patientAge.trim()) {
        errors.patientAge = 'Patient age is required.';
      } else if (isNaN(parsedAge) || parsedAge < 1 || parsedAge > 120) {
        errors.patientAge = 'Please enter a valid age between 1 and 120.';
      }

      // Confirm Password
      if (!confirmPassword) {
        errors.confirmPassword = 'Please confirm your password.';
      } else if (confirmPassword !== password) {
        errors.confirmPassword = 'Passwords do not match.';
      }

      // NIC (Optional, but if filled, validate Sri Lankan format)
      if (nic.trim()) {
        const cleanNic = nic.trim().toUpperCase();
        const oldNicRegex = /^[0-9]{9}[VX]$/;
        const newNicRegex = /^[0-9]{12}$/;
        if (!oldNicRegex.test(cleanNic) && !newNicRegex.test(cleanNic)) {
          errors.nic = 'NIC must be 9 digits + V/X (e.g. 942150821V) or 12 digits.';
        }
      }
    }

    return errors;
  };

  const errors = validate();

  // Password strength meter calculation
  const getPasswordStrength = (pass) => {
    if (!pass) return { score: 0, label: '', color: 'bg-slate-200' };
    let score = 0;
    if (pass.length >= 6) score += 1;
    if (pass.length >= 8) score += 1;
    if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass) || /[^A-Za-z0-9]/.test(pass)) score += 1;

    if (score <= 1) return { score: 1, label: 'Weak', color: 'bg-rose-500', text: 'text-rose-500' };
    if (score === 2 || score === 3) return { score: 2, label: 'Fair / Medium', color: 'bg-amber-500', text: 'text-amber-500' };
    return { score: 3, label: 'Strong', color: 'bg-emerald-500', text: 'text-emerald-500' };
  };

  const passStrength = getPasswordStrength(password);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Mark all fields as touched to display errors immediately
    const allTouched = {
      email: true,
      password: true,
      confirmPassword: true,
      fullName: true,
      contactNo: true,
      patientAge: true,
      nic: true
    };
    setTouched(allTouched);

    if (activeStaffUser) {
      setErrorMsg('Please sign out of your staff account first before signing in as a patient.');
      return;
    }

    const currentErrors = validate();
    if (Object.keys(currentErrors).length > 0) {
      setErrorMsg('Please correct the highlighted fields before submitting.');
      return;
    }

    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    try {
      if (mode === 'login') {
        const res = await loginCustomer({ email: email.trim().toLowerCase(), password });
        setLoading(false);
        if (res.success) {
          localStorage.removeItem('vdc_staff_token');
          localStorage.removeItem('vdc_staff_user');
          window.dispatchEvent(new Event('pharmacy_staff_auth_change'));
          setSuccessMsg(res.message || 'Signed in successfully!');
          setTimeout(() => {
            if (onSuccess) onSuccess(res.customer);
            handleClose();
          }, 600);
        } else {
          setErrorMsg(res.message || 'Login failed. Please check credentials.');
        }
      } else {
        // Register Mode
        const res = await registerCustomer({
          fullName: fullName.trim(),
          email: email.trim().toLowerCase(),
          password,
          contactNo: contactNo.trim(),
          patientAge: patientAge.trim().includes('Yr') ? patientAge.trim() : `${patientAge.trim()} Yrs`,
          nic: nic.trim() ? nic.trim().toUpperCase() : null,
          address: address.trim() || null
        });
        setLoading(false);
        if (res.success) {
          localStorage.removeItem('vdc_staff_token');
          localStorage.removeItem('vdc_staff_user');
          window.dispatchEvent(new Event('pharmacy_staff_auth_change'));
          setSuccessMsg(res.message || 'Patient profile registered successfully!');
          setTimeout(() => {
            if (onSuccess) onSuccess(res.customer);
            handleClose();
          }, 600);
        } else {
          setErrorMsg(res.message || 'Registration failed. Please try again.');
        }
      }
    } catch (err) {
      setLoading(false);
      setErrorMsg(err.response?.data?.message || err.message || 'An unexpected connection error occurred.');
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={handleClose}
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full max-w-xl max-h-[92vh] sm:max-h-[88vh] rounded-3xl shadow-2xl border flex flex-col overflow-hidden transition-all duration-200 ${
          isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* ======================================================== */}
        {/* HEADER */}
        {/* ======================================================== */}
        <div className={`px-5 py-4 sm:px-6 sm:py-4.5 border-b flex items-center justify-between shrink-0 ${
          isDark ? 'border-slate-800 bg-slate-950/70' : 'border-slate-100 bg-slate-50/90'
        }`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0 ring-1 ring-teal-500/20">
              {mode === 'login' ? <LogIn className="w-5 h-5 stroke-[2.2]" /> : <UserPlus className="w-5 h-5 stroke-[2.2]" />}
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black tracking-tight">
                {mode === 'login' ? 'Patient Portal Sign In' : 'Create Patient Account'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {mode === 'login' 
                  ? 'Access your prescription statuses, inquiries & past invoices' 
                  : 'Register for priority prescription review & real-time updates'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            aria-label="Close modal"
            className="p-2 sm:px-3 sm:py-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors cursor-pointer group flex items-center gap-1.5"
          >
            <span className="text-xs font-bold text-slate-500 group-hover:text-slate-800 dark:group-hover:text-white hidden sm:inline">Close</span>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ======================================================== */}
        {/* MODE SELECTOR TABS */}
        {/* ======================================================== */}
        <div className="px-5 sm:px-6 pt-4 pb-1">
          <div className="p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 flex items-center text-xs font-bold">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setErrorMsg('');
                setSuccessMsg('');
              }}
              className={`flex-1 py-2 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                mode === 'login'
                  ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-300 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setErrorMsg('');
                setSuccessMsg('');
              }}
              className={`flex-1 py-2 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                mode === 'register'
                  ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-300 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Register New Patient</span>
            </button>
          </div>
        </div>

        {/* ======================================================== */}
        {/* FORM CONTENT */}
        {/* ======================================================== */}
        <form onSubmit={handleSubmit} noValidate className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto px-5 py-4 sm:px-6 sm:py-5 space-y-4">
            
            {/* Active Staff Session Warning */}
            {activeStaffUser && (
              <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 space-y-2.5 animate-in fade-in">
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-amber-800 dark:text-amber-300">
                      Active Staff Session Detected ({activeStaffUser.role})
                    </h4>
                    <p className="text-xs text-amber-700 dark:text-amber-300/90 mt-0.5 leading-relaxed">
                      You are currently logged into the dispensary as <strong>{activeStaffUser.fullName}</strong>.
                      To access a patient profile, please sign out of your staff session first.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    localStorage.removeItem('vdc_staff_token');
                    localStorage.removeItem('vdc_staff_user');
                    setActiveStaffUser(null);
                    window.dispatchEvent(new Event('pharmacy_staff_auth_change'));
                  }}
                  className="w-full py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out Staff Session &amp; Continue</span>
                </button>
              </div>
            )}

            {/* Error & Success Feedback Banners */}
            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/80 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* ==================================================== */}
            {/* REGISTER FIELDS */}
            {/* ==================================================== */}
            {mode === 'register' && (
              <div className="space-y-3.5">
                {/* Full Name */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Patient Full Name <span className="text-rose-500">*</span>
                    </label>
                    {touched.fullName && !errors.fullName && (
                      <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-0.5">
                        <Check className="w-3 h-3" /> Valid
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      onBlur={() => handleBlur('fullName')}
                      placeholder="e.g. Kasun Perera"
                      className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-xs sm:text-sm border transition-colors ${
                        touched.fullName && errors.fullName
                          ? 'border-rose-500 bg-rose-50/30 dark:bg-rose-950/20 text-rose-900 dark:text-rose-100 focus:ring-2 focus:ring-rose-500/20'
                          : touched.fullName && !errors.fullName
                            ? 'border-emerald-500/80 bg-emerald-50/20 dark:bg-emerald-950/10 focus:ring-2 focus:ring-emerald-500/20'
                            : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600'
                      }`}
                    />
                  </div>
                  {touched.fullName && errors.fullName && (
                    <p className="text-[11px] text-rose-500 font-medium mt-1 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 shrink-0" />
                      <span>{errors.fullName}</span>
                    </p>
                  )}
                </div>

                {/* Email & Contact No Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-3.5">
                  {/* Email */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Email Address <span className="text-rose-500">*</span>
                      </label>
                      {touched.email && !errors.email && (
                        <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-0.5">
                          <Check className="w-3 h-3" /> Valid
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onBlur={() => handleBlur('email')}
                        placeholder="patient@example.com"
                        className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-xs sm:text-sm border transition-colors ${
                          touched.email && errors.email
                            ? 'border-rose-500 bg-rose-50/30 dark:bg-rose-950/20 text-rose-900 dark:text-rose-100 focus:ring-2 focus:ring-rose-500/20'
                            : touched.email && !errors.email
                              ? 'border-emerald-500/80 bg-emerald-50/20 dark:bg-emerald-950/10 focus:ring-2 focus:ring-emerald-500/20'
                              : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600'
                        }`}
                      />
                    </div>
                    {touched.email && errors.email && (
                      <p className="text-[11px] text-rose-500 font-medium mt-1 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 shrink-0" />
                        <span>{errors.email}</span>
                      </p>
                    )}
                  </div>

                  {/* Phone */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Contact Phone <span className="text-rose-500">*</span>
                      </label>
                      {touched.contactNo && !errors.contactNo && (
                        <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-0.5">
                          <Check className="w-3 h-3" /> Valid
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                      <input
                        type="tel"
                        value={contactNo}
                        onChange={(e) => setContactNo(e.target.value)}
                        onBlur={() => handleBlur('contactNo')}
                        placeholder="+94 77 123 4567"
                        className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-xs sm:text-sm border transition-colors ${
                          touched.contactNo && errors.contactNo
                            ? 'border-rose-500 bg-rose-50/30 dark:bg-rose-950/20 text-rose-900 dark:text-rose-100 focus:ring-2 focus:ring-rose-500/20'
                            : touched.contactNo && !errors.contactNo
                              ? 'border-emerald-500/80 bg-emerald-50/20 dark:bg-emerald-950/10 focus:ring-2 focus:ring-emerald-500/20'
                              : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600'
                        }`}
                      />
                    </div>
                    {touched.contactNo && errors.contactNo && (
                      <p className="text-[11px] text-rose-500 font-medium mt-1 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 shrink-0" />
                        <span>{errors.contactNo}</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Password & Confirm Password Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-3.5">
                  {/* Password */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Create Password <span className="text-rose-500">*</span>
                      </label>
                      {password && (
                        <span className={`text-[10px] font-black uppercase ${passStrength.text}`}>
                          {passStrength.label}
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onBlur={() => handleBlur('password')}
                        placeholder="Min 6 characters"
                        className={`w-full pl-10 pr-10 py-2.5 rounded-xl text-xs sm:text-sm border transition-colors ${
                          touched.password && errors.password
                            ? 'border-rose-500 bg-rose-50/30 dark:bg-rose-950/20 text-rose-900 dark:text-rose-100 focus:ring-2 focus:ring-rose-500/20'
                            : touched.password && !errors.password
                              ? 'border-emerald-500/80 bg-emerald-50/20 dark:bg-emerald-950/10 focus:ring-2 focus:ring-emerald-500/20'
                              : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-0.5"
                        title={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>

                    {/* Password Strength Meter Bar */}
                    {password && (
                      <div className="mt-1.5 flex gap-1 h-1">
                        <div className={`h-full flex-1 rounded-full ${passStrength.score >= 1 ? passStrength.color : 'bg-slate-200 dark:bg-slate-700'}`} />
                        <div className={`h-full flex-1 rounded-full ${passStrength.score >= 2 ? passStrength.color : 'bg-slate-200 dark:bg-slate-700'}`} />
                        <div className={`h-full flex-1 rounded-full ${passStrength.score >= 3 ? passStrength.color : 'bg-slate-200 dark:bg-slate-700'}`} />
                      </div>
                    )}

                    {touched.password && errors.password && (
                      <p className="text-[11px] text-rose-500 font-medium mt-1 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 shrink-0" />
                        <span>{errors.password}</span>
                      </p>
                    )}
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Confirm Password <span className="text-rose-500">*</span>
                      </label>
                      {touched.confirmPassword && !errors.confirmPassword && (
                        <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-0.5">
                          <Check className="w-3 h-3" /> Match
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        onBlur={() => handleBlur('confirmPassword')}
                        placeholder="Re-enter password"
                        className={`w-full pl-10 pr-10 py-2.5 rounded-xl text-xs sm:text-sm border transition-colors ${
                          touched.confirmPassword && errors.confirmPassword
                            ? 'border-rose-500 bg-rose-50/30 dark:bg-rose-950/20 text-rose-900 dark:text-rose-100 focus:ring-2 focus:ring-rose-500/20'
                            : touched.confirmPassword && !errors.confirmPassword
                              ? 'border-emerald-500/80 bg-emerald-50/20 dark:bg-emerald-950/10 focus:ring-2 focus:ring-emerald-500/20'
                              : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-0.5"
                        title={showConfirmPassword ? 'Hide password' : 'Show password'}
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {touched.confirmPassword && errors.confirmPassword && (
                      <p className="text-[11px] text-rose-500 font-medium mt-1 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 shrink-0" />
                        <span>{errors.confirmPassword}</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Age & Optional NIC Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-3.5">
                  {/* Age */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Patient Age <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                      <input
                        type="number"
                        min="1"
                        max="120"
                        value={patientAge}
                        onChange={(e) => setPatientAge(e.target.value)}
                        onBlur={() => handleBlur('patientAge')}
                        placeholder="e.g. 38"
                        className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-xs sm:text-sm border transition-colors ${
                          touched.patientAge && errors.patientAge
                            ? 'border-rose-500 bg-rose-50/30 dark:bg-rose-950/20 text-rose-900 dark:text-rose-100 focus:ring-2 focus:ring-rose-500/20'
                            : touched.patientAge && !errors.patientAge
                              ? 'border-emerald-500/80 bg-emerald-50/20 dark:bg-emerald-950/10 focus:ring-2 focus:ring-emerald-500/20'
                              : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600'
                        }`}
                      />
                    </div>
                    {touched.patientAge && errors.patientAge && (
                      <p className="text-[11px] text-rose-500 font-medium mt-1 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 shrink-0" />
                        <span>{errors.patientAge}</span>
                      </p>
                    )}
                  </div>

                  {/* NIC */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      National ID / NIC (Optional)
                    </label>
                    <input
                      type="text"
                      value={nic}
                      onChange={(e) => setNic(e.target.value.toUpperCase())}
                      onBlur={() => handleBlur('nic')}
                      placeholder="e.g. 942150821V or 12 digits"
                      className={`w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm border transition-colors uppercase ${
                        touched.nic && errors.nic
                          ? 'border-rose-500 bg-rose-50/30 dark:bg-rose-950/20 text-rose-900 dark:text-rose-100 focus:ring-2 focus:ring-rose-500/20'
                          : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600'
                      }`}
                    />
                    {touched.nic && errors.nic && (
                      <p className="text-[11px] text-rose-500 font-medium mt-1 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 shrink-0" />
                        <span>{errors.nic}</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Residential Address */}
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Residential / Delivery Address (Optional)
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="e.g. No 45/2, Galle Road, Colombo 03"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl text-xs sm:text-sm border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition-colors"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ==================================================== */}
            {/* LOGIN FIELDS */}
            {/* ==================================================== */}
            {mode === 'login' && (
              <div className="space-y-4">
                {/* Email */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Email Address <span className="text-rose-500">*</span>
                    </label>
                    {touched.email && !errors.email && (
                      <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-0.5">
                        <Check className="w-3 h-3" /> Valid
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onBlur={() => handleBlur('email')}
                      placeholder="you@example.com"
                      className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-xs sm:text-sm border transition-colors ${
                        touched.email && errors.email
                          ? 'border-rose-500 bg-rose-50/30 dark:bg-rose-950/20 text-rose-900 dark:text-rose-100 focus:ring-2 focus:ring-rose-500/20'
                          : touched.email && !errors.email
                            ? 'border-emerald-500/80 bg-emerald-50/20 dark:bg-emerald-950/10 focus:ring-2 focus:ring-emerald-500/20'
                            : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600'
                      }`}
                    />
                  </div>
                  {touched.email && errors.email && (
                    <p className="text-[11px] text-rose-500 font-medium mt-1 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 shrink-0" />
                      <span>{errors.email}</span>
                    </p>
                  )}
                </div>

                {/* Password */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Password <span className="text-rose-500">*</span>
                    </label>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onBlur={() => handleBlur('password')}
                      placeholder="••••••••"
                      className={`w-full pl-10 pr-10 py-2.5 rounded-xl text-xs sm:text-sm border transition-colors ${
                        touched.password && errors.password
                          ? 'border-rose-500 bg-rose-50/30 dark:bg-rose-950/20 text-rose-900 dark:text-rose-100 focus:ring-2 focus:ring-rose-500/20'
                          : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-0.5"
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {touched.password && errors.password && (
                    <p className="text-[11px] text-rose-500 font-medium mt-1 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 shrink-0" />
                      <span>{errors.password}</span>
                    </p>
                  )}
                </div>

                <div className="text-center pt-2">
                  <p className="text-xs text-slate-500">
                    Don't have a patient account yet?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setMode('register');
                        setErrorMsg('');
                        setSuccessMsg('');
                      }}
                      className="text-teal-700 dark:text-teal-400 font-bold hover:underline cursor-pointer"
                    >
                      Register New Patient
                    </button>
                  </p>
                </div>
              </div>
            )}

            {mode === 'register' && (
              <div className="text-center pt-1">
                <p className="text-xs text-slate-500">
                  Already have a registered account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setMode('login');
                      setErrorMsg('');
                      setSuccessMsg('');
                    }}
                    className="text-teal-700 dark:text-teal-400 font-bold hover:underline cursor-pointer"
                  >
                    Sign in here
                  </button>
                </p>
              </div>
            )}

          </div>

          {/* ======================================================== */}
          {/* FOOTER ACTIONS */}
          {/* ======================================================== */}
          <div className={`px-5 py-3.5 sm:px-6 sm:py-4 border-t flex items-center justify-between gap-3 shrink-0 ${
            isDark ? 'border-slate-800 bg-slate-950/70' : 'border-slate-100 bg-slate-50/90'
          }`}>
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading || Boolean(activeStaffUser)}
              className="px-6 py-2.5 rounded-xl font-black text-xs sm:text-sm text-slate-950 shadow-md bg-[#f59e0b] hover:bg-[#d97706] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center gap-2"
            >
              {loading ? (
                <span>Validating &amp; Connecting...</span>
              ) : mode === 'login' ? (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Sign In to Patient Portal</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>Validate &amp; Create Account</span>
                </>
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
