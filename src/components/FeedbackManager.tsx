import React, { useState, useEffect, useCallback } from 'react';
import { MessageSquare, Search, Filter, X, Inbox, Eye, CheckCircle, XCircle, Clock, Trash2, Save } from 'lucide-react';
import { feedbackApi, Feedback, FeedbackType, FeedbackStatus, FeedbackStats } from '../lib/feedbackApi';

const typeLabels: Record<FeedbackType, string> = {
  suggestion: 'Suggestion',
  problem: 'Problem',
  experience: 'Experience',
  feature: 'Feature Request',
  confusing: 'Confusing',
  other: 'Other',
};

const typeColors: Record<FeedbackType, string> = {
  suggestion: 'bg-blue-100 text-blue-700',
  problem: 'bg-red-100 text-red-700',
  experience: 'bg-green-100 text-green-700',
  feature: 'bg-purple-100 text-purple-700',
  confusing: 'bg-amber-100 text-amber-700',
  other: 'bg-slate-100 text-slate-700',
};

const statusConfig: Record<FeedbackStatus, { label: string; color: string; icon: React.ReactNode }> = {
  new: { label: 'New', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: <Inbox size={14} /> },
  reviewing: { label: 'Reviewing', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: <Eye size={14} /> },
  implemented: { label: 'Implemented', color: 'bg-green-100 text-green-700 border-green-200', icon: <CheckCircle size={14} /> },
  dismissed: { label: 'Dismissed', color: 'bg-slate-100 text-slate-500 border-slate-200', icon: <XCircle size={14} /> },
};

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
};

const FeedbackManager: React.FC = () => {
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [stats, setStats] = useState<FeedbackStats>({ total: 0, new: 0, reviewing: 0, implemented: 0, dismissed: 0 });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<FeedbackStatus | ''>('');
  const [typeFilter, setTypeFilter] = useState<FeedbackType | ''>('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<'newest' | 'oldest'>('newest');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);

  const fetchFeedback = useCallback(async () => {
    setLoading(true);
    try {
      const [data, s] = await Promise.all([
        feedbackApi.getAllFeedback({
          status: statusFilter || undefined,
          type: typeFilter || undefined,
          search: search || undefined,
          sort,
        }),
        feedbackApi.getFeedbackStats(),
      ]);
      setFeedback(data);
      setStats(s);
    } catch (err) {
      console.error('Error fetching feedback:', err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, typeFilter, search, sort]);

  useEffect(() => {
    fetchFeedback();
  }, [fetchFeedback]);

  const selectedFeedback = feedback.find((f) => f.id === selectedId) || null;

  useEffect(() => {
    if (selectedFeedback) {
      setAdminNotes(selectedFeedback.admin_notes || '');
    }
  }, [selectedId, selectedFeedback]);

  const handleStatusChange = async (id: string, status: FeedbackStatus) => {
    try {
      await feedbackApi.updateFeedbackStatus(id, status);
      setFeedback((prev) => prev.map((f) => (f.id === id ? { ...f, status } : f)));
      const s = await feedbackApi.getFeedbackStats();
      setStats(s);
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  const handleSaveNotes = async () => {
    if (!selectedId) return;
    setSavingNotes(true);
    try {
      await feedbackApi.updateAdminNotes(selectedId, adminNotes);
      setFeedback((prev) => prev.map((f) => (f.id === selectedId ? { ...f, admin_notes: adminNotes } : f)));
    } catch (err) {
      console.error('Error saving notes:', err);
    } finally {
      setSavingNotes(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this feedback? This cannot be undone.')) return;
    try {
      await feedbackApi.deleteFeedback(id);
      if (selectedId === id) setSelectedId(null);
      await fetchFeedback();
    } catch (err) {
      console.error('Error deleting feedback:', err);
    }
  };

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-teal-600 rounded-lg flex items-center justify-center">
          <MessageSquare size={16} className="text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900">Suggestions & Feedback</h2>
          <p className="text-slate-600">View and manage feedback from users and visitors</p>
        </div>
      </div>

      {/* Dashboard Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
          <div className="text-2xl font-bold text-slate-900">{stats.total}</div>
          <div className="text-sm text-slate-600">Total Feedback</div>
        </div>
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="text-2xl font-bold text-blue-700">{stats.new}</div>
          <div className="text-sm text-blue-600">New</div>
        </div>
        <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
          <div className="text-2xl font-bold text-amber-700">{stats.reviewing}</div>
          <div className="text-sm text-amber-600">Reviewing</div>
        </div>
        <div className="p-4 bg-green-50 rounded-lg border border-green-200">
          <div className="text-2xl font-bold text-green-700">{stats.implemented}</div>
          <div className="text-sm text-green-600">Implemented</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search feedback..."
            className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as FeedbackStatus | '')}
          className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
        >
          <option value="">All Status</option>
          <option value="new">New</option>
          <option value="reviewing">Reviewing</option>
          <option value="implemented">Implemented</option>
          <option value="dismissed">Dismissed</option>
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as FeedbackType | '')}
          className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
        >
          <option value="">All Types</option>
          {Object.entries(typeLabels).map(([val, label]) => (
            <option key={val} value={val}>{label}</option>
          ))}
        </select>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as 'newest' | 'oldest')}
          className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
        >
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
        </select>
      </div>

      {/* Feedback List + Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* List */}
        <div className="space-y-2 max-h-[600px] overflow-y-auto">
          {loading ? (
            <div className="text-center py-8 text-slate-500">Loading feedback...</div>
          ) : feedback.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <Inbox size={32} className="mx-auto mb-2 text-slate-300" />
              No feedback found.
            </div>
          ) : (
            feedback.map((f) => (
              <button
                key={f.id}
                onClick={() => setSelectedId(f.id)}
                className={`w-full text-left p-4 rounded-lg border transition-colors ${
                  selectedId === f.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${typeColors[f.feedback_type]}`}>
                    {typeLabels[f.feedback_type]}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium border ${statusConfig[f.status].color}`}>
                    {statusConfig[f.status].icon}
                    <span className="ml-1">{statusConfig[f.status].label}</span>
                  </span>
                </div>
                <p className="text-sm text-slate-700 line-clamp-2 mb-1">{f.message}</p>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span>{f.email || (f.user_id ? 'Registered user' : 'Visitor')}</span>
                  <span>·</span>
                  <span>{formatDate(f.created_at)}</span>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Detail Panel */}
        {selectedFeedback ? (
          <div className="p-4 border border-slate-200 rounded-lg bg-white">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${typeColors[selectedFeedback.feedback_type]}`}>
                  {typeLabels[selectedFeedback.feedback_type]}
                </span>
                <span className={`px-2 py-0.5 rounded text-xs font-medium border ${statusConfig[selectedFeedback.status].color}`}>
                  {statusConfig[selectedFeedback.status].label}
                </span>
              </div>
              <button onClick={() => setSelectedId(null)} className="text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>

            <div className="text-xs text-slate-400 mb-3 space-y-1">
              <div>From: {selectedFeedback.email || (selectedFeedback.user_id ? 'Registered user' : 'Anonymous visitor')}</div>
              <div>Date: {formatDate(selectedFeedback.created_at)}</div>
              {selectedFeedback.page_url && (
                <div className="truncate">Page: {selectedFeedback.page_url}</div>
              )}
            </div>

            <div className="p-3 bg-slate-50 rounded-lg mb-4">
              <p className="text-sm text-slate-800 whitespace-pre-wrap">{selectedFeedback.message}</p>
            </div>

            <div className="mb-4">
              <label className="block mb-2 text-sm font-semibold text-slate-700">Change Status</label>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(statusConfig) as FeedbackStatus[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => handleStatusChange(selectedFeedback.id, s)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      selectedFeedback.status === s
                        ? statusConfig[s].color
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {statusConfig[s].icon}
                    <span className="ml-1">{statusConfig[s].label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label className="block mb-2 text-sm font-semibold text-slate-700">Admin Notes (private)</label>
              <textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                rows={3}
                className="w-full p-3 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-blue-500 resize-none"
                placeholder="Add private notes about this feedback..."
              />
              <button
                onClick={handleSaveNotes}
                disabled={savingNotes}
                className="mt-2 flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 text-white rounded-lg text-xs font-medium hover:bg-slate-800 transition-colors disabled:opacity-50"
              >
                {savingNotes ? <Clock size={12} className="animate-spin" /> : <Save size={12} />}
                Save Notes
              </button>
            </div>

            <button
              onClick={() => handleDelete(selectedFeedback.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-red-600 hover:text-red-700 text-xs font-medium transition-colors"
            >
              <Trash2 size={12} />
              Delete Feedback
            </button>
          </div>
        ) : (
          <div className="p-4 border border-slate-200 rounded-lg bg-slate-50 flex items-center justify-center min-h-[200px]">
            <div className="text-center text-slate-400">
              <Eye size={24} className="mx-auto mb-2" />
              <span className="text-sm">Select feedback to view details</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FeedbackManager;
