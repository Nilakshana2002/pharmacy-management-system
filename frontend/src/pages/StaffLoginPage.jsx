import React, { useState, useEffect } from 'react';
import { 
  Shield, KeyRound, User, Lock, AlertCircle, ArrowRight, 
  Pill, Eye, EyeOff, Stethoscope, UserCog, CheckCircle2, LogOut
} from 'lucide-react';
import { loginStaff } from '../services/api';
import { useTheme } from '../context/ThemeContext';
import { getCurrentCustomer, logoutCustomer } from '../utils/customerAuthService';

export default function StaffLoginPage({ onLoginSuccess, setActivePage }) {
  const { isDark } = useTheme();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeCustomer, setActiveCustomer] = useState(getCurrentCustomer());

  useEffect(() => {
    setActiveCustomer(getCurrentCustomer());
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (activeCustomer) {
      setError('Please sign out of your patient account first before accessing the staff portal.');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const res = await loginStaff({ identifier, password });
      if (res.success) {
        // Enforce strict single-role session: Terminate any active patient session
        logoutCustomer();
        localStorage.setItem('vdc_staff_token', res.token);
        localStorage.setItem('vdc_staff_user', JSON.stringify(res.user));
        onLoginSuccess(res.user);
        setActivePage('dashboard');
      } else {
        setError(res.message || 'Login failed.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Authentication error. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const autofill = (userType) => {
    if (activeCustomer) return;
    if (userType === 'admin') {
      setIdentifier('admin@vdcstore.lk');
      setPassword('admin123');
    } else {
      setIdentifier('pharmacist@vdcstore.lk');
      setPassword('pharma123');
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-12 sm:py-20 space-y-8">
      {/* Branding Header */}
      <div className="text-center space-y-3">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-teal-700 to-teal-500 flex items-center justify-center text-white mx-auto shadow-xl shadow-teal-700/20">
          <Shield className="w-7 h-7 stroke-[2.2]" />
        </div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white">
          Dispensary &amp; Staff Portal
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
          Authorized pharmacy personnel access only. Manage live batch inventory, dispensation registers, and audit records.
        </p>
      </div>

      {/* Card Form */}
      <div className="p-8 rounded-3xl border border-slate-200 bg-white shadow-xl space-y-6">
        
        {/* Active Patient Session Conflict Alert */}
        {activeCustomer && (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 space-y-3 animate-in fade-in duration-200">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-amber-800">
                  Active Patient Session Detected
                </h4>
                <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                  You are currently signed in as patient <strong>{activeCustomer.full_name}</strong> ({activeCustomer.email}).
                  Under pharmacy data security policies, patient and staff credentials cannot be used simultaneously.
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  logoutCustomer();
                  setActiveCustomer(null);
                  setError('');
                }}
                className="w-full sm:w-auto px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out Patient Account</span>
              </button>
              <button
                type="button"
                onClick={() => setActivePage('home')}
                className="w-full sm:w-auto px-4 py-2 rounded-xl border border-amber-300 text-amber-800 text-xs font-bold hover:bg-amber-100 transition-all cursor-pointer text-center"
              >
                Return to Storefront
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold block mb-1 text-slate-700">
              Username or Staff Email
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                required
                disabled={Boolean(activeCustomer)}
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="pharmacist@mypharmacist.com"
                className={`w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-teal-600 transition-colors ${
                  activeCustomer ? 'opacity-60 cursor-not-allowed' : ''
                }`}
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold block mb-1 text-slate-700">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                disabled={Boolean(activeCustomer)}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className={`w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-teal-600 transition-colors ${
                  activeCustomer ? 'opacity-60 cursor-not-allowed' : ''
                }`}
              />
              <button
                type="button"
                disabled={Boolean(activeCustomer)}
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer disabled:opacity-50"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || Boolean(activeCustomer)}
            className="w-full py-3 rounded-xl bg-teal-700 hover:bg-teal-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md shadow-teal-900/10 transition-all cursor-pointer"
          >
            {loading ? (
              <span>Authenticating...</span>
            ) : activeCustomer ? (
              <span>Sign Out Patient Above to Unlock Staff Portal</span>
            ) : (
              <>
                <span>Sign In to Dispensary</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Quick Demo Credentials Autofill */}
        <div className="pt-4 border-t border-slate-100 space-y-2.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block text-center">
            Quick Fill Demo Accounts
          </span>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={Boolean(activeCustomer)}
              onClick={() => autofill('pharmacist')}
              className="px-3 py-2 rounded-xl text-xs font-semibold border border-teal-200 bg-teal-50 text-teal-800 hover:bg-teal-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Stethoscope className="w-3.5 h-3.5" />
              <span>Pharmacist</span>
            </button>
            <button
              type="button"
              disabled={Boolean(activeCustomer)}
              onClick={() => autofill('admin')}
              className="px-3 py-2 rounded-xl text-xs font-semibold border border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <UserCog className="w-3.5 h-3.5" />
              <span>Admin</span>
            </button>
          </div>
        </div>

      </div>

      <div className="text-center">
        <button
          onClick={() => setActivePage('home')}
          className="text-xs font-semibold text-slate-500 hover:text-teal-600 cursor-pointer"
        >
          ← Return to Public Pharmacy Storefront
        </button>
      </div>

    </div>
  );
}
