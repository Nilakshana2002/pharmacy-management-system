import React, { useState, useEffect } from 'react';
import { Database, Server, ShieldCheck, Pill, Activity, UserCheck, Layers, Terminal } from 'lucide-react';

export default function App() {
  const [serverStatus, setServerStatus] = useState('checking');
  const [dbStatus, setDbStatus] = useState('checking');
  const [lastCheck, setLastCheck] = useState(null);

  const checkHealth = async () => {
    try {
      setServerStatus('checking');
      setDbStatus('checking');
      const res = await fetch('/api/health');
      const data = await res.json();
      setServerStatus(data.status === 'ok' ? 'online' : 'error');
      setDbStatus(data.database === 'connected' ? 'connected' : 'disconnected');
      setLastCheck(new Date().toLocaleTimeString());
    } catch (err) {
      setServerStatus('offline');
      setDbStatus('disconnected');
      setLastCheck(new Date().toLocaleTimeString());
    }
  };

  useEffect(() => {
    checkHealth();
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-emerald-500 selection:text-slate-950">
      {/* Background ambient glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-emerald-600/15 rounded-full blur-3xl"></div>
        <div className="absolute top-1/3 -right-40 w-96 h-96 bg-teal-600/15 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-cyan-600/15 rounded-full blur-3xl"></div>
      </div>

      {/* Header Navigation */}
      <header className="relative z-10 border-b border-slate-800/80 bg-slate-900/50 backdrop-blur-xl px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 shadow-lg shadow-emerald-500/20">
              <Pill className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                PharmaCare ADMS
              </h1>
              <p className="text-xs text-slate-400 font-medium">Advanced Database Management System</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              MySQL 8.0+ Raw Query Layer
            </span>
          </div>
        </div>
      </header>

      {/* Main Content Dashboard */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 py-12 flex-1 w-full flex flex-col justify-center">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium bg-slate-900 border border-slate-800 text-slate-300 mb-6 shadow-inner">
            <Layers className="w-3.5 h-3.5 text-teal-400" />
            Full-Stack Base Architecture Initialized
          </div>
          <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white mb-4">
            University Pharmacy Management System
          </h2>
          <p className="text-slate-400 text-lg leading-relaxed">
            Built with Express.js, <code className="text-emerald-400 font-mono bg-slate-900 px-2 py-0.5 rounded border border-slate-800">mysql2/promise</code>, parameterized SQL, stored procedures, triggers, views, and React + Tailwind CSS.
          </p>
        </div>

        {/* System Architecture Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto w-full">
          {/* Express Backend Status */}
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl relative overflow-hidden group hover:border-slate-700 transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                <Server className="w-6 h-6" />
              </div>
              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                serverStatus === 'online' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 
                serverStatus === 'offline' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 
                'bg-slate-800 text-slate-400'
              }`}>
                {serverStatus.toUpperCase()}
              </span>
            </div>
            <h3 className="text-lg font-bold text-white mb-1">Express API Server</h3>
            <p className="text-slate-400 text-sm mb-4">Node.js ES Modules backend architecture running on port 5000.</p>
            <div className="text-xs font-mono text-slate-500 flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5" />
              <span>/server/index.js</span>
            </div>
          </div>

          {/* MySQL Database Status */}
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl relative overflow-hidden group hover:border-slate-700 transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Database className="w-6 h-6" />
              </div>
              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                dbStatus === 'connected' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 
                'bg-slate-800 text-slate-400 border border-slate-700'
              }`}>
                {dbStatus.toUpperCase()}
              </span>
            </div>
            <h3 className="text-lg font-bold text-white mb-1">MySQL Connection Pool</h3>
            <p className="text-slate-400 text-sm mb-4">Using <code className="text-emerald-400">mysql2/promise</code> for direct SQL query execution.</p>
            <div className="text-xs font-mono text-slate-500 flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5" />
              <span>/server/config/db.js</span>
            </div>
          </div>

          {/* Auth & RBAC Architecture */}
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl relative overflow-hidden group hover:border-slate-700 transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                JWT + BCRYPT
              </span>
            </div>
            <h3 className="text-lg font-bold text-white mb-1">Role-Based Access</h3>
            <p className="text-slate-400 text-sm mb-4">Configured for Admin, Pharmacist, and Customer authorization layers.</p>
            <div className="text-xs font-mono text-slate-500 flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5" />
              <span>3 Roles Middleware</span>
            </div>
          </div>
        </div>

        {/* Health Check Interactive Action */}
        <div className="mt-10 flex flex-col items-center">
          <button
            onClick={checkHealth}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold shadow-lg shadow-emerald-500/25 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] flex items-center gap-2 cursor-pointer"
          >
            <Activity className="w-4 h-4 stroke-[2.5]" />
            Refresh Backend Connection Check
          </button>
          {lastCheck && (
            <p className="text-xs text-slate-500 mt-3 font-mono">
              Last status ping: {lastCheck}
            </p>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-800/80 bg-slate-900/30 py-6 px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© 2026 Advanced Database Module — Pharmacy Management System</p>
          <div className="flex items-center gap-6">
            <span>Raw SQL Query Engine</span>
            <span>Stored Procedures</span>
            <span>Triggers & Views</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
