import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  ArrowUpDown,
  Calendar,
  Clock,
  Trash2,
  Edit,
  Eye,
  Copy,
  Download,
  FileText,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Inbox,
  Globe,
} from 'lucide-react';
import { transcriptionApi } from '../services/api';
import ViewEditModal from '../components/ViewEditModal';
import DeleteConfirmModal from '../components/DeleteConfirmModal';
import Toast from '../components/Toast';

export default function HistoryView() {
  const [transcriptions, setTranscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Search & Pagination params
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [sortOrder, setSortOrder] = useState('desc'); // 'desc' | 'asc'
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(9);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);

  // Modals state
  const [selectedTranscript, setSelectedTranscript] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Feedback Toast
  const [toast, setToast] = useState({ message: '', type: 'info' });

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
      setPage(0); // Reset to page 0 on search
    }, 400);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const fetchTranscriptions = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const data = await transcriptionApi.getTranscriptions({
        query: debouncedQuery,
        page,
        size: pageSize,
        sort: sortOrder,
      });
      setTranscriptions(data.content || []);
      setTotalPages(data.totalPages || 1);
      setTotalElements(data.totalElements || 0);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load transcriptions');
    } finally {
      setLoading(false);
    }
  }, [debouncedQuery, page, pageSize, sortOrder]);

  useEffect(() => {
    fetchTranscriptions();
  }, [fetchTranscriptions]);

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
  };

  const handleOpenDetail = (item) => {
    setSelectedTranscript(item);
    setIsViewModalOpen(true);
  };

  const handleUpdate = async (id, updatedData) => {
    const updated = await transcriptionApi.updateTranscription(id, updatedData);
    setTranscriptions((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...updated } : t))
    );
    setSelectedTranscript(updated);
    showToast('Transcript updated successfully!', 'success');
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      setIsDeleting(true);
      await transcriptionApi.deleteTranscription(deleteTarget.id);
      showToast('Transcript deleted successfully', 'success');
      setDeleteTarget(null);
      fetchTranscriptions();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to delete transcript', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCopy = async (text) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      showToast('Copied to clipboard!', 'success');
    } catch {
      showToast('Failed to copy', 'error');
    }
  };

  const handleDownload = (item) => {
    const element = document.createElement('a');
    const file = new Blob([`${item.title}\n\nLanguage: ${item.language}\nDate: ${new Date(item.createdAt).toLocaleString()}\n\n---\n\n${item.content}`], {
      type: 'text/plain;charset=utf-8',
    });
    element.href = URL.createObjectURL(file);
    element.download = `${item.title.replace(/[^a-z0-9_-]/gi, '_').toLowerCase() || 'transcript'}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    showToast('Download started', 'info');
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-6 rounded-2xl">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <FileText className="w-6 h-6 text-brand-400" />
            <span>Transcription History</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Browse, search, edit, and export saved multilingual transcripts ({totalElements} total).
          </p>
        </div>

        <button
          onClick={fetchTranscriptions}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 border border-slate-700/80 hover:bg-slate-800 text-xs font-semibold text-slate-200 transition-all self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Controls: Search, Sort, Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 glass-panel p-4 rounded-xl">
        {/* Search input */}
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search transcripts by title or text..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-700/80 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-sm text-white outline-none transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
            >
              ✕
            </button>
          )}
        </div>

        {/* Sort order toggle */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700/80 text-xs font-medium text-slate-200 hover:bg-slate-800 transition-all"
            title="Toggle sort direction"
          >
            <ArrowUpDown className="w-3.5 h-3.5 text-brand-400" />
            <span>Sort: {sortOrder === 'desc' ? 'Newest First' : 'Oldest First'}</span>
          </button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading state skeleton */}
      {loading && transcriptions.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="glass-panel p-5 rounded-2xl animate-pulse space-y-3">
              <div className="h-5 bg-slate-800 rounded w-3/4" />
              <div className="h-4 bg-slate-800/60 rounded w-1/2" />
              <div className="space-y-2 pt-2">
                <div className="h-3 bg-slate-800/40 rounded w-full" />
                <div className="h-3 bg-slate-800/40 rounded w-5/6" />
              </div>
            </div>
          ))}
        </div>
      ) : transcriptions.length === 0 ? (
        /* Empty state */
        <div className="glass-panel p-12 rounded-2xl text-center flex flex-col items-center justify-center space-y-3">
          <div className="p-4 rounded-full bg-slate-900 border border-slate-800 text-slate-500">
            <Inbox className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-white">No Transcripts Found</h3>
          <p className="text-sm text-slate-400 max-w-sm">
            {debouncedQuery
              ? `No transcripts matched "${debouncedQuery}". Try another search term.`
              : 'You haven\'t saved any transcripts yet. Go to Transcribe and record your speech!'}
          </p>
        </div>
      ) : (
        /* Grid of Transcripts */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {transcriptions.map((item) => (
            <div
              key={item.id}
              className="glass-card p-5 rounded-2xl flex flex-col justify-between hover:border-brand-500/40 hover:shadow-lg hover:shadow-brand-500/5 transition-all duration-200 group"
            >
              <div>
                {/* Title & Language badge */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3
                    onClick={() => handleOpenDetail(item)}
                    className="font-bold text-white text-base hover:text-brand-400 cursor-pointer line-clamp-1 transition-colors"
                    title={item.title}
                  >
                    {item.title}
                  </h3>
                  <span className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-brand-500/10 text-brand-300 border border-brand-500/20 shrink-0">
                    {item.language || 'hi-IN,en-US'}
                  </span>
                </div>

                {/* Metadata details */}
                <div className="flex items-center gap-3 text-xs text-slate-400 mb-3">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'N/A'}
                  </span>
                  {item.durationSeconds > 0 && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      {item.durationSeconds}s
                    </span>
                  )}
                  <span>{item.wordCount || 0} words</span>
                </div>

                {/* Preview snippet */}
                <p
                  onClick={() => handleOpenDetail(item)}
                  className="text-xs text-slate-300 leading-relaxed line-clamp-3 cursor-pointer select-text"
                >
                  {item.preview || item.content}
                </p>
              </div>

              {/* Card Footer Actions */}
              <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-800/80">
                <button
                  onClick={() => handleOpenDetail(item)}
                  className="flex items-center gap-1 text-xs text-brand-400 hover:text-brand-300 font-medium transition-colors"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>View & Edit</span>
                </button>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleCopy(item.content)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                    title="Copy text"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDownload(item)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                    title="Download .txt"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(item)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                    title="Delete transcript"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between glass-panel px-5 py-3 rounded-xl text-xs text-slate-400">
          <span>
            Page {page + 1} of {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0 || loading}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 disabled:opacity-40 transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Previous</span>
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1 || loading}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 disabled:opacity-40 transition-colors"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* View & Edit Modal */}
      <ViewEditModal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        transcript={selectedTranscript}
        onSaveUpdate={handleUpdate}
        onCopy={handleCopy}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title={deleteTarget ? `Delete "${deleteTarget.title}"?` : 'Delete Transcript'}
        isDeleting={isDeleting}
      />

      {/* Feedback Toast */}
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
