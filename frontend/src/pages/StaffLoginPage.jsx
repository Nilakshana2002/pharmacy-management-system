import React, { useState } from 'react';
import { 
  Shield, KeyRound, User, Lock, AlertCircle, ArrowRight, 
  Pill, Eye, EyeOff, Stethoscope, UserCog, CheckCircle2 
} from 'lucide-react';
import { loginStaff } from '../services/api';
import { useTheme } from '../context/ThemeContext';

export default function StaffLoginPage({ onLoginSuccess, setActivePage }) {
  const { isDark } = useTheme();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await loginStaff({ identifier, password });
      if (res.success) {
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
    if (userType === 'admin') {
      setIdentifier('admin');
      setPassword('admin123');
    } else {
      setIdentifier('pharmacist');
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
          Dispensary & Staff Portal
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
          Authorized pharmacy personnel access only. Manage live batch inventory, dispensation registers, and audit records.
        </p>
      </div>

      {/* Card Form */}
      <div className="p-8 rounded-3xl border border-slate-200 bg-white shadow-xl space-y-6">
        
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
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="admin or pharmacist@vdcstore.lk"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-teal-600 transition-colors"
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
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-teal-600 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-teal-700 hover:bg-teal-800 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md shadow-teal-900/10 transition-all cursor-pointer"
          >
            {loading ? (
              <span>Authenticating...</span>
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
              onClick={() => autofill('pharmacist')}
              className="px-3 py-2 rounded-xl text-xs font-semibold border border-teal-200 bg-teal-50 text-teal-800 hover:bg-teal-100 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Stethoscope className="w-3.5 h-3.5" />
              <span>Pharmacist</span>
            </button>
            <button
              type="button"
              onClick={() => autofill('admin')}
              className="px-3 py-2 rounded-xl text-xs font-semibold border border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <UserCog className="w-3.5 h-3.5" />
              <span>Admin</span>
            </button>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 text-[11px] text-slate-500 space-y-1 font-mono">
            <div className="flex justify-between">
              <span>Admin: <strong className="text-slate-800">admin</strong></span>
              <span className="text-teal-700 font-bold">admin123</span>
            </div>
            <div className="flex justify-between">
              <span>Staff: <strong className="text-slate-800">pharmacist</strong></span>
              <span className="text-teal-700 font-bold">pharma123</span>
            </div>
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
