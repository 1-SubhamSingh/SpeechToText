import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { Mic, History, Settings, Activity, Menu, X, Sparkles, Server } from 'lucide-react';
import { transcriptionApi } from '../services/api';

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [backendStatus, setBackendStatus] = useState('checking'); // 'up' | 'down' | 'checking'

  const checkHealth = async () => {
    try {
      const res = await transcriptionApi.checkHealth();
      setBackendStatus(res.status === 'UP' ? 'up' : 'down');
    } catch {
      setBackendStatus('down');
    }
  };

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const navLinkClass = ({ isActive }) =>
    `flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
      isActive
        ? 'bg-brand-600/20 text-brand-400 border border-brand-500/30 shadow-sm shadow-brand-500/10'
        : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
    }`;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <NavLink to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 via-indigo-500 to-violet-400 flex items-center justify-center shadow-lg shadow-brand-500/25 group-hover:shadow-brand-500/40 transition-all duration-300">
              <Mic className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-lg text-white tracking-tight">Procucev</span>
                <span className="text-xs px-1.5 py-0.5 rounded font-semibold bg-brand-500/20 text-brand-400 border border-brand-500/30">AI</span>
              </div>
              <p className="text-[11px] text-slate-400 tracking-wide font-medium">Real-Time Speech to Text</p>
            </div>
          </NavLink>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-2">
            <NavLink to="/" className={navLinkClass}>
              <Mic className="w-4 h-4" />
              <span>Transcribe</span>
            </NavLink>
            <NavLink to="/history" className={navLinkClass}>
              <History className="w-4 h-4" />
              <span>History</span>
            </NavLink>
            <NavLink to="/settings" className={navLinkClass}>
              <Settings className="w-4 h-4" />
              <span>Settings</span>
            </NavLink>
          </nav>

          {/* Backend Status indicator & Quick Info */}
          <div className="hidden md:flex items-center gap-3">
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border ${
                backendStatus === 'up'
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : backendStatus === 'checking'
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                  : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
              }`}
              title={`Spring Boot Backend: ${backendStatus.toUpperCase()}`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  backendStatus === 'up'
                    ? 'bg-emerald-400 animate-pulse'
                    : backendStatus === 'checking'
                    ? 'bg-amber-400 animate-ping'
                    : 'bg-rose-400'
                }`}
              />
              <span className="capitalize">
                Backend {backendStatus === 'up' ? 'Connected' : backendStatus === 'checking' ? 'Connecting...' : 'Offline'}
              </span>
            </div>
          </div>

          {/* Mobile hamburger button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 focus:outline-none"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-slate-800 bg-slate-900/95 px-4 pt-2 pb-4 space-y-2">
          <NavLink
            to="/"
            onClick={() => setMobileMenuOpen(false)}
            className={navLinkClass}
          >
            <Mic className="w-4 h-4" />
            <span>Transcribe</span>
          </NavLink>
          <NavLink
            to="/history"
            onClick={() => setMobileMenuOpen(false)}
            className={navLinkClass}
          >
            <History className="w-4 h-4" />
            <span>History</span>
          </NavLink>
          <NavLink
            to="/settings"
            onClick={() => setMobileMenuOpen(false)}
            className={navLinkClass}
          >
            <Settings className="w-4 h-4" />
            <span>Settings</span>
          </NavLink>
          <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 px-2">
            <span>Backend Status:</span>
            <span
              className={`font-semibold ${
                backendStatus === 'up' ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {backendStatus.toUpperCase()}
            </span>
          </div>
        </div>
      )}
    </header>
  );
}
