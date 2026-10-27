import React, { useState, useEffect } from 'react';
import { X, Save, FileText, CheckCircle2 } from 'lucide-react';

export default function SaveTranscriptModal({
  isOpen,
  onClose,
  onSave,
  defaultContent = '',
  defaultLanguage = 'hi-IN,en-US',
  durationSeconds = 0,
}) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState(defaultContent);
  const [language, setLanguage] = useState(defaultLanguage);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      // Generate default title based on current date & time
      const dateStr = new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
      setTitle(`Speech Note — ${dateStr}`);
      setContent(defaultContent);
      setLanguage(defaultLanguage);
      setError('');
    }
  }, [isOpen, defaultContent, defaultLanguage]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Title cannot be empty');
      return;
    }
    if (!content.trim()) {
      setError('Content cannot be empty');
      return;
    }

    try {
      setIsSaving(true);
      setError('');
      await onSave({
        title: title.trim(),
        content: content.trim(),
        language,
        durationSeconds,
      });
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to save transcript');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg glass-panel rounded-2xl p-6 shadow-2xl border border-slate-700/60 text-slate-100"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-brand-500/10 text-brand-400 border border-brand-500/20">
              <FileText className="w-5 h-5" />
            </div>
            <h2 id="modal-title" className="text-lg font-bold text-white">
              Save Transcript
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="mt-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label htmlFor="transcript-title" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Title
            </label>
            <input
              id="transcript-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-white text-sm outline-none transition-all"
              placeholder="e.g. Project Progress Standup"
              maxLength={255}
              required
            />
          </div>

          <div>
            <label htmlFor="transcript-language" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Language Tag
            </label>
            <input
              id="transcript-language"
              type="text"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-white text-sm outline-none transition-all"
              placeholder="e.g. hi-IN,en-US"
            />
          </div>

          <div>
            <label htmlFor="transcript-content" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Content Preview / Edit
            </label>
            <textarea
              id="transcript-content"
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-white text-sm outline-none transition-all resize-y"
              required
            />
          </div>

          <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
            <span>Duration: {Math.floor(durationSeconds / 60)}m {durationSeconds % 60}s</span>
            <span>Words: {content.trim() ? content.trim().split(/\s+/).length : 0}</span>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold shadow-lg shadow-brand-500/20 disabled:opacity-50 transition-all"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Saving...' : 'Save to History'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
