import React, { useState, useEffect } from 'react';
import {
  Settings,
  Server,
  Key,
  Mic,
  Save,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ExternalLink,
  Shield,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { transcriptionApi } from '../services/api';
import Toast from '../components/Toast';

export default function SettingsView() {
  const [backendUrl, setBackendUrl] = useState(() => localStorage.getItem('procucev_backend_url') || 'http://localhost:8080');
  const [wsUrl, setWsUrl] = useState(() => localStorage.getItem('procucev_ws_url') || 'ws://localhost:8080/ws/transcribe');
  const [defaultProvider, setDefaultProvider] = useState(() => localStorage.getItem('procucev_provider') || 'gemini');

  const [healthStatus, setHealthStatus] = useState(null);
  const [testingHealth, setTestingHealth] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'info' });

  const handleSaveSettings = (e) => {
    e.preventDefault();
    localStorage.setItem('procucev_backend_url', backendUrl.trim());
    localStorage.setItem('procucev_ws_url', wsUrl.trim());
    localStorage.setItem('procucev_provider', defaultProvider);
    setToast({ message: 'Settings saved successfully!', type: 'success' });
  };

  const testConnection = async () => {
    setTestingHealth(true);
    try {
      const res = await transcriptionApi.checkHealth();
      setHealthStatus(res);
      if (res.status === 'UP') {
        setToast({ message: 'Spring Boot backend is online and responding!', type: 'success' });
      } else {
        setToast({ message: 'Backend responded but reported status: ' + res.status, type: 'error' });
      }
    } catch (err) {
      setHealthStatus({ status: 'DOWN', error: err.message });
      setToast({ message: 'Could not connect to backend at ' + backendUrl, type: 'error' });
    } finally {
      setTestingHealth(false);
    }
  };

  useEffect(() => {
    testConnection();
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="glass-panel p-6 rounded-2xl">
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          <Settings className="w-6 h-6 text-brand-400" />
          <span>System &amp; Engine Settings</span>
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Configure backend gateways, AI speech recognition models, and API connection credentials.
        </p>
      </div>

      <form onSubmit={handleSaveSettings} className="space-y-6">
        {/* Backend & Gateway Config */}
        <div className="glass-panel p-6 rounded-2xl space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-800">
            <Server className="w-5 h-5 text-brand-400" />
            <h2 className="text-base font-bold text-white">Backend Endpoints</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="backend-url" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                REST API Base URL
              </label>
              <input
                id="backend-url"
                type="text"
                value={backendUrl}
                onChange={(e) => setBackendUrl(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700/80 focus:border-brand-500 text-sm text-white outline-none"
                placeholder="http://localhost:8080"
                required
              />
              <p className="text-[11px] text-slate-500 mt-1">Spring Boot API endpoint for database CRUD.</p>
            </div>

            <div>
              <label htmlFor="ws-url" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                WebSocket Gateway URL
              </label>
              <input
                id="ws-url"
                type="text"
                value={wsUrl}
                onChange={(e) => setWsUrl(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700/80 focus:border-brand-500 text-sm text-white outline-none"
                placeholder="ws://localhost:8080/ws/transcribe"
                required
              />
              <p className="text-[11px] text-slate-500 mt-1">Live binary audio chunk streaming gateway.</p>
            </div>
          </div>

          {/* Test Health Check Button */}
          <div className="pt-2 flex items-center justify-between">
            <button
              type="button"
              onClick={testConnection}
              disabled={testingHealth}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-xs font-semibold text-slate-200 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${testingHealth ? 'animate-spin' : ''}`} />
              <span>Test Connection</span>
            </button>

            {healthStatus && (
              <span
                className={`text-xs font-medium flex items-center gap-1.5 ${
                  healthStatus.status === 'UP' ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {healthStatus.status === 'UP' ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <AlertCircle className="w-4 h-4" />
                )}
                <span>Backend status: {healthStatus.status}</span>
              </span>
            )}
          </div>
        </div>

        {/* Speech Recognition Engine Preferences */}
        <div className="glass-panel p-6 rounded-2xl space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-800">
            <Mic className="w-5 h-5 text-indigo-400" />
            <h2 className="text-base font-bold text-white">Default Speech Provider</h2>
          </div>

          <div>
            <label htmlFor="default-provider" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Select Engine
            </label>
            <select
              id="default-provider"
              value={defaultProvider}
              onChange={(e) => setDefaultProvider(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700/80 focus:border-brand-500 text-sm text-white outline-none"
            >
              <option value="gemini">✨ Gemini Live (gemini-2.0-flash-live-001) — Recommended</option>
              <option value="deepgram">Deepgram Nova-2 (WebSocket Streaming via Backend)</option>
              <option value="mock">Mock Engine (Offline Hinglish Simulator for Testing)</option>
              <option value="browser">Browser Web Speech API (Client-Native Free Fallback)</option>
            </select>
          </div>

          {/* Security Notice */}
          <div className="p-4 rounded-xl bg-brand-500/10 border border-brand-500/20 text-xs text-brand-300 space-y-1.5">
            <div className="flex items-center gap-2 font-semibold text-brand-200">
              <Shield className="w-4 h-4" />
              <span>Zero Frontend Credential Exposure Policy</span>
            </div>
            <p>
              API keys (Gemini, Deepgram) are stored on the Spring Boot backend via environment variables (<code>GEMINI_API_KEY</code>, <code>DEEPGRAM_API_KEY</code>). They are never exposed in browser-side code.
            </p>
          </div>
        </div>

        {/* Gemini API Key Setup */}
        <div className="glass-panel p-6 rounded-2xl space-y-3 border border-violet-500/20">
          <div className="flex items-center gap-2.5 pb-2 border-b border-slate-800">
            <Sparkles className="w-5 h-5 text-violet-400" />
            <h2 className="text-base font-bold text-white">Gemini Live Setup</h2>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30 uppercase tracking-wider">
              Active Provider
            </span>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            The app uses <strong className="text-violet-300">Gemini 2.0 Flash Live</strong> for real-time Hindi/English/Hinglish speech recognition.
          </p>

          <ol className="list-decimal list-inside text-xs text-slate-400 space-y-2 pl-1">
            <li>
              Get a free API key at{' '}
              <a
                href="https://aistudio.google.com/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-violet-400 underline inline-flex items-center gap-0.5"
              >
                aistudio.google.com/apikey <ExternalLink className="w-3 h-3" />
              </a>
            </li>
            <li>
              Open <code className="text-slate-300">backend/.env</code> (or the project root <code>.env</code>) and set:
              <pre className="mt-1.5 px-3 py-2 rounded-lg bg-slate-900 border border-slate-700/60 text-emerald-300 font-mono text-[11px] overflow-x-auto">
{`GEMINI_API_KEY=AIzaSy...your_key_here
SPEECH_PROVIDER=gemini`}
              </pre>
            </li>
            <li>Restart the Spring Boot backend — the backend proxies all audio to Gemini securely.</li>
          </ol>

          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300">
            <strong>Note:</strong> Gemini Live requires the <em>Gemini API</em> (not Vertex AI). Make sure <code>generativelanguage.googleapis.com</code> is accessible from your server.
          </div>
        </div>

        {/* Save button */}
        <div className="flex justify-end">
          <button
            type="submit"
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-sm font-semibold text-white shadow-lg shadow-brand-500/20 transition-all"
          >
            <Save className="w-4 h-4" />
            <span>Save Configuration</span>
          </button>
        </div>
      </form>

      {/* Toast */}
      {toast.message && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ message: '', type: 'info' })}
        />
      )}
    </div>
  );
}
