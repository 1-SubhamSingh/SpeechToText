import React, { useState, useEffect } from 'react';
import { X, Edit3, Save, Copy, Download, Calendar, Clock, Globe, Hash } from 'lucide-react';

export default function ViewEditModal({
  isOpen,
  onClose,
  transcript,
  onSaveUpdate,
  onCopy,
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [language, setLanguage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (transcript) {
      setTitle(transcript.title || '');
      setContent(transcript.content || '');
      setLanguage(transcript.language || 'hi-IN,en-US');
      setIsEditing(false);
      setError('');
    }
  }, [transcript]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !transcript) return null;

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) {
      setError('Title and content are required');
      return;
    }
    try {
      setIsSaving(true);
      setError('');
      await onSaveUpdate(transcript.id, {
        title: title.trim(),
        content: content.trim(),
        language: language.trim(),
        durationSeconds: transcript.durationSeconds || 0,
      });
      setIsEditing(false);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to update transcript');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadTxt = () => {
    const element = document.createElement('a');
    const file = new Blob([`${title}\n\nLanguage: ${language}\nDate: ${new Date(transcript.createdAt).toLocaleString()}\n\n---\n\n${content}`], {
      type: 'text/plain;charset=utf-8',
    });
    element.href = URL.createObjectURL(file);
    element.download = `${title.replace(/[^a-z0-9_-]/gi, '_').toLowerCase() || 'transcript'}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl glass-panel rounded-2xl p-6 shadow-2xl border border-slate-700/60 text-slate-100 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-800 gap-4">
          <div className="flex-1 min-w-0">
            {isEditing ? (
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full text-lg font-bold text-white bg-slate-900 px-3 py-1.5 rounded-lg border border-brand-500 focus:outline-none"
                placeholder="Transcript Title"
              />
            ) : (
              <h2 className="text-xl font-bold text-white truncate">{title}</h2>
            )}

            <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                {transcript.createdAt ? new Date(transcript.createdAt).toLocaleString() : 'Recent'}
              </span>
              <span className="flex items-center gap-1">
                <Globe className="w-3.5 h-3.5 text-brand-400" />
                {language}
              </span>
              <span className="flex items-center gap-1">
                <Hash className="w-3.5 h-3.5 text-slate-500" />
                {content.trim() ? content.trim().split(/\s+/).length : 0} words
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-3 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm">
            {error}
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto my-4 pr-1">
          {isEditing ? (
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full h-72 p-4 rounded-xl bg-slate-900/90 border border-slate-700 focus:border-brand-500 text-slate-200 text-sm leading-relaxed outline-none resize-none"
              placeholder="Transcript text..."
            />
          ) : (
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 text-slate-200 text-sm leading-relaxed whitespace-pre-wrap select-text">
              {content}
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-800">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onCopy(content)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 hover:text-white transition-colors"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Copy</span>
            </button>
            <button
              onClick={handleDownloadTxt}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 hover:text-white transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download (.txt)</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setTitle(transcript.title);
                    setContent(transcript.content);
                  }}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={handleSave}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-md shadow-brand-500/20 disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-semibold border border-slate-700 transition-all"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Transcript</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
