import React, { useState } from 'react';
import { Shield, KeyRound, User, Lock, AlertCircle, ArrowRight, Pill } from 'lucide-react';
import { loginStaff } from '../services/api';

export default function StaffLoginPage({ onLoginSuccess, setActivePage }) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
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
      setIdentifier('admin@vdcstore.com');
      setPassword('admin123');
    } else {
      setIdentifier('pharmacist@vdcstore.com');
      setPassword('pharma123');
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16 space-y-8">
      {/* Branding Header */}
      <div className="text-center space-y-3">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-teal-500 to-emerald-400 flex items-center justify-center text-slate-950 mx-auto shadow-xl shadow-teal-500/20">
          <Shield className="w-7 h-7 stroke-[2.5]" />
        </div>
        <h1 className="text-2xl font-black text-white">Staff Management Portal</h1>
        <p className="text-xs text-slate-400">
          Authorized pharmacy personnel only. Access inventory and batch controls.
        </p>
      </div>

      {/* Card Form */}
      <div className="p-8 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-2xl backdrop-blur-xl space-y-6">
        
        {error && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Username or Email</label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="admin@vdcstore.com"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-teal-500"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-teal-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-400 hover:from-teal-400 hover:to-emerald-300 text-slate-950 font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-teal-500/20 disabled:opacity-50"
          >
            {loading ? (
              <span>Authenticating...</span>
            ) : (
              <>
                <KeyRound className="w-4 h-4" />
                <span>Log In To Dispensary</span>
              </>
            )}
          </button>
        </form>

        {/* Quick Demo Credentials Autofill Helper */}
        <div className="pt-4 border-t border-slate-800 space-y-2">
          <span className="text-[11px] text-slate-400 block text-center font-medium">Quick Demo Test Credentials:</span>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => autofill('admin')}
              className="px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-[11px] text-teal-300 font-medium transition-colors cursor-pointer"
            >
              Fill Admin
            </button>
            <button
              type="button"
              onClick={() => autofill('pharmacist')}
              className="px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-[11px] text-emerald-300 font-medium transition-colors cursor-pointer"
            >
              Fill Pharmacist
            </button>
          </div>
        </div>

      </div>

      <div className="text-center">
        <button
          onClick={() => setActivePage('home')}
          className="text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          ← Return to Public Medicine Search
        </button>
      </div>

    </div>
  );
}
