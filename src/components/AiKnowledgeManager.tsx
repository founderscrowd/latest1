import React, { useState, useEffect, useCallback } from 'react';
import {
  Bot, Plus, Edit2, Trash2, Search, Filter, ToggleLeft, ToggleRight,
  Send, BookOpen, AlertCircle, ChevronDown, ChevronRight, X, Save, Lightbulb,
  RefreshCw, Check, CheckCheck, FileText, Sparkles, Clock, HelpCircle,
} from 'lucide-react';
import {
  aiKnowledgeAPI, AiKnowledgeEntry, AiKnowledgeGap, KnowledgeTestResult,
  AiKnowledgeSuggestion, SyncRunSummary, SyncResult, SuggestionType,
} from '../lib/aiKnowledgeApi';

const SUGGESTION_TYPE_LABELS: Record<SuggestionType, { label: string; color: string; bg: string; border: string }> = {
  new: { label: 'New', color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-200' },
  updated: { label: 'Updated', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200' },
  conflict: { label: 'Conflict', color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200' },
  needs_review: { label: 'Needs Review', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' },
};

const AiKnowledgeManager: React.FC = () => {
  const [entries, setEntries] = useState<AiKnowledgeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [categories, setCategories] = useState<string[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState<AiKnowledgeEntry | null>(null);
  const [showGaps, setShowGaps] = useState(false);
  const [gaps, setGaps] = useState<AiKnowledgeGap[]>([]);
  const [gapsLoading, setGapsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');

  // Status dashboard
  const [activeCount, setActiveCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [gapCount, setGapCount] = useState(0);
  const [lastSync, setLastSync] = useState<SyncRunSummary | null>(null);

  // Sync state
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [suggestions, setSuggestions] = useState<AiKnowledgeSuggestion[]>([]);
  const [selectedSuggestionIds, setSelectedSuggestionIds] = useState<Set<string>>(new Set());
  const [editingSuggestion, setEditingSuggestion] = useState<AiKnowledgeSuggestion | null>(null);

  // Test assistant state
  const [testQuestion, setTestQuestion] = useState('');
  const [testResult, setTestResult] = useState<KnowledgeTestResult | null>(null);
  const [testLoading, setTestLoading] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    title: '', question: '', answer: '', category: 'General', keywords: '', is_active: true,
  });

  const showMessage = (msg: string, type: 'success' | 'error' | 'info') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(''), 5000);
  };

  const fetchStatus = async () => {
    try {
      const [active, pending, gaps, last] = await Promise.all([
        aiKnowledgeAPI.getActiveCount(),
        aiKnowledgeAPI.getPendingSuggestionCount(),
        aiKnowledgeAPI.getGapCount(),
        aiKnowledgeAPI.getLastSyncRun(),
      ]);
      setActiveCount(active);
      setPendingCount(pending);
      setGapCount(gaps);
      setLastSync(last);
    } catch {
      // Non-critical
    }
  };

  const fetchEntries = useCallback(async () => {
    try {
      setLoading(true);
      let data: AiKnowledgeEntry[];
      if (searchQuery.trim()) {
        data = await aiKnowledgeAPI.search(searchQuery.trim());
      } else if (categoryFilter !== 'all') {
        data = await aiKnowledgeAPI.getByCategory(categoryFilter);
      } else {
        data = await aiKnowledgeAPI.getAll();
      }
      setEntries(data);
      const cats = await aiKnowledgeAPI.getCategories();
      setCategories(cats);
    } catch (error: any) {
      showMessage(error.message || 'Error loading knowledge entries.', 'error');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, categoryFilter]);

  useEffect(() => {
    fetchEntries();
    fetchStatus();
  }, [fetchEntries]);

  const handleAdd = () => {
    setEditingEntry(null);
    setFormData({ title: '', question: '', answer: '', category: 'General', keywords: '', is_active: true });
    setShowForm(true);
  };

  const handleEdit = (entry: AiKnowledgeEntry) => {
    setEditingEntry(entry);
    setFormData({
      title: entry.title, question: entry.question, answer: entry.answer,
      category: entry.category, keywords: entry.keywords || '', is_active: entry.is_active,
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formData.title.trim() || !formData.question.trim() || !formData.answer.trim()) {
      showMessage('Title, question, and answer are required.', 'error');
      return;
    }
    try {
      if (editingEntry) {
        await aiKnowledgeAPI.update(editingEntry.id, formData);
        showMessage('Knowledge entry updated successfully.', 'success');
      } else {
        await aiKnowledgeAPI.create(formData);
        showMessage('Knowledge entry created successfully.', 'success');
      }
      setShowForm(false);
      fetchEntries();
      fetchStatus();
    } catch (error: any) {
      showMessage(error.message || 'Error saving knowledge entry.', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this knowledge entry?')) return;
    try {
      await aiKnowledgeAPI.remove(id);
      showMessage('Entry deleted.', 'success');
      fetchEntries();
      fetchStatus();
    } catch (error: any) {
      showMessage(error.message || 'Error deleting entry.', 'error');
    }
  };

  const handleToggle = async (entry: AiKnowledgeEntry) => {
    try {
      await aiKnowledgeAPI.toggleActive(entry.id, !entry.is_active);
      fetchEntries();
      fetchStatus();
    } catch (error: any) {
      showMessage(error.message || 'Error toggling entry.', 'error');
    }
  };

  const fetchGaps = async () => {
    setGapsLoading(true);
    try {
      const data = await aiKnowledgeAPI.getGaps(50);
      setGaps(data);
    } catch (error: any) {
      showMessage(error.message || 'Error loading knowledge gaps.', 'error');
    } finally {
      setGapsLoading(false);
    }
  };

  const handleDeleteGap = async (id: string) => {
    try {
      await aiKnowledgeAPI.deleteGap(id);
      setGaps(gaps.filter(g => g.id !== id));
      fetchStatus();
    } catch (error: any) {
      showMessage(error.message || 'Error deleting gap.', 'error');
    }
  };

  const handleCreateFromGap = (gap: AiKnowledgeGap) => {
    setEditingEntry(null);
    setFormData({
      title: '', question: gap.user_question.slice(0, 200), answer: '',
      category: 'General', keywords: '', is_active: true,
    });
    setShowForm(true);
    setShowGaps(false);
  };

  const handleTest = async () => {
    if (!testQuestion.trim()) return;
    setTestLoading(true);
    setTestResult(null);
    try {
      const result = await aiKnowledgeAPI.testQuestion(testQuestion.trim());
      setTestResult(result);
    } catch (error: any) {
      showMessage(error.message || 'Error testing question.', 'error');
    } finally {
      setTestLoading(false);
    }
  };

  // ── Sync handlers ────────────────────────────────────────────────────────

  const handleRunSync = async () => {
    setSyncLoading(true);
    setSyncResult(null);
    setSuggestions([]);
    setSelectedSuggestionIds(new Set());
    try {
      const result = await aiKnowledgeAPI.runSync();
      setSyncResult(result);
      const pending = await aiKnowledgeAPI.getPendingSuggestions();
      setSuggestions(pending);
      fetchStatus();
      showMessage(`Sync complete: ${result.suggestions_generated} suggestions generated.`, 'success');
    } catch (error: any) {
      showMessage(error.message || 'Knowledge sync failed.', 'error');
    } finally {
      setSyncLoading(false);
    }
  };

  const handleApprove = async (suggestion: AiKnowledgeSuggestion) => {
    try {
      await aiKnowledgeAPI.approveSuggestion(suggestion);
      setSuggestions(suggestions.filter(s => s.id !== suggestion.id));
      setSelectedSuggestionIds(prev => { const n = new Set(prev); n.delete(suggestion.id); return n; });
      fetchEntries();
      fetchStatus();
      showMessage('Suggestion approved and published to knowledge base.', 'success');
    } catch (error: any) {
      showMessage(error.message || 'Error approving suggestion.', 'error');
    }
  };

  const handleApproveSelected = async () => {
    const ids = [...selectedSuggestionIds];
    if (ids.length === 0) return;
    try {
      await aiKnowledgeAPI.approveSuggestions(ids);
      setSuggestions(suggestions.filter(s => !selectedSuggestionIds.has(s.id)));
      setSelectedSuggestionIds(new Set());
      fetchEntries();
      fetchStatus();
      showMessage(`${ids.length} suggestions approved.`, 'success');
    } catch (error: any) {
      showMessage(error.message || 'Error approving suggestions.', 'error');
    }
  };

  const handleReject = async (id: string) => {
    try {
      await aiKnowledgeAPI.rejectSuggestion(id);
      setSuggestions(suggestions.filter(s => s.id !== id));
      setSelectedSuggestionIds(prev => { const n = new Set(prev); n.delete(id); return n; });
      fetchStatus();
      showMessage('Suggestion rejected.', 'info');
    } catch (error: any) {
      showMessage(error.message || 'Error rejecting suggestion.', 'error');
    }
  };

  const handleSaveSuggestionEdit = async () => {
    if (!editingSuggestion) return;
    try {
      await aiKnowledgeAPI.updateSuggestion(editingSuggestion.id, {
        title: editingSuggestion.title,
        question: editingSuggestion.question,
        answer: editingSuggestion.answer,
        category: editingSuggestion.category,
        keywords: editingSuggestion.keywords || '',
      });
      setSuggestions(suggestions.map(s => s.id === editingSuggestion.id ? editingSuggestion : s));
      setEditingSuggestion(null);
      showMessage('Suggestion updated.', 'success');
    } catch (error: any) {
      showMessage(error.message || 'Error updating suggestion.', 'error');
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedSuggestionIds(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  };

  // Group suggestions by type for the review screen
  const suggestionsByType = {
    new: suggestions.filter(s => s.suggestion_type === 'new'),
    updated: suggestions.filter(s => s.suggestion_type === 'updated'),
    conflict: suggestions.filter(s => s.suggestion_type === 'conflict'),
    needs_review: suggestions.filter(s => s.suggestion_type === 'needs_review'),
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 p-6 border-b border-slate-200">
        <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-lg flex items-center justify-center">
          <Bot size={20} className="text-white" />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-bold text-slate-900">AI Knowledge</h2>
          <p className="text-sm text-slate-600">Manage the AI assistant's knowledge base</p>
        </div>
        <button
          onClick={handleAdd}
          className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-sm font-semibold"
        >
          <Plus size={16} />
          Add Entry
        </button>
      </div>

      <div className="p-6 space-y-6">
        {message && (
          <div className={`p-3 rounded-lg border text-sm ${
            messageType === 'success' ? 'bg-green-50 border-green-200 text-green-700'
            : messageType === 'error' ? 'bg-red-50 border-red-200 text-red-700'
            : 'bg-blue-50 border-blue-200 text-blue-700'
          }`}>
            {message}
          </div>
        )}

        {/* ── Status Dashboard ─────────────────────────────────────────────── */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles size={16} className="text-teal-600" />
            <h3 className="text-sm font-bold text-slate-900">AI Knowledge Status</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="bg-white rounded-lg p-3 border border-slate-200">
              <div className="flex items-center gap-2 mb-1">
                <BookOpen size={14} className="text-teal-600" />
                <span className="text-xs text-slate-500 font-medium">Active entries</span>
              </div>
              <p className="text-2xl font-bold text-slate-900">{activeCount}</p>
            </div>
            <div className="bg-white rounded-lg p-3 border border-slate-200">
              <div className="flex items-center gap-2 mb-1">
                <FileText size={14} className="text-amber-500" />
                <span className="text-xs text-slate-500 font-medium">Pending</span>
              </div>
              <p className="text-2xl font-bold text-slate-900">{pendingCount}</p>
            </div>
            <div className="bg-white rounded-lg p-3 border border-slate-200">
              <div className="flex items-center gap-2 mb-1">
                <AlertCircle size={14} className="text-orange-500" />
                <span className="text-xs text-slate-500 font-medium">Gaps</span>
              </div>
              <p className="text-2xl font-bold text-slate-900">{gapCount}</p>
            </div>
            <div className="bg-white rounded-lg p-3 border border-slate-200">
              <div className="flex items-center gap-2 mb-1">
                <Clock size={14} className="text-slate-400" />
                <span className="text-xs text-slate-500 font-medium">Last update</span>
              </div>
              <p className="text-xs font-medium text-slate-700 pt-1">
                {lastSync?.completed_at ? formatDate(lastSync.completed_at) : 'Never'}
              </p>
            </div>
          </div>

          {/* Update Knowledge Button */}
          <button
            onClick={handleRunSync}
            disabled={syncLoading}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-lg hover:from-teal-700 hover:to-cyan-700 transition-all text-sm font-bold disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
          >
            {syncLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Scanning website and generating suggestions...
              </>
            ) : (
              <>
                <RefreshCw size={18} />
                Update Knowledge
              </>
            )}
          </button>
          {lastSync && (
            <p className="text-xs text-slate-400 mt-2 text-center">
              Last scan: {lastSync.pages_scanned} pages scanned, {lastSync.suggestions_generated} suggestions generated
            </p>
          )}
        </div>

        {/* ── Sync Results / Review Screen ─────────────────────────────────── */}
        {(syncResult || suggestions.length > 0) && (
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-teal-600" />
                <h3 className="text-sm font-bold text-slate-900">Knowledge Update Results</h3>
                {suggestions.length > 0 && (
                  <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-xs font-bold">
                    {suggestions.length} pending
                  </span>
                )}
              </div>
              {selectedSuggestionIds.size > 0 && (
                <button
                  onClick={handleApproveSelected}
                  className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-xs font-semibold"
                >
                  <CheckCheck size={14} />
                  Approve Selected ({selectedSuggestionIds.size})
                </button>
              )}
            </div>

            {syncResult && suggestions.length === 0 && (
              <div className="p-6 text-center">
                <Check size={32} className="mx-auto mb-3 text-green-500" />
                <p className="text-sm text-slate-600">
                  Scan complete. {syncResult.pages_scanned} pages were scanned.
                  {syncResult.suggestions_generated === 0
                    ? ' No new suggestions — your knowledge base is up to date.'
                    : ` ${syncResult.suggestions_generated} suggestions were generated and all have been reviewed.`}
                </p>
              </div>
            )}

            {suggestions.length > 0 && (
              <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
                {(['new', 'updated', 'conflict', 'needs_review'] as SuggestionType[]).map(type => {
                  const typeSuggestions = suggestionsByType[type];
                  if (typeSuggestions.length === 0) return null;
                  const typeInfo = SUGGESTION_TYPE_LABELS[type];
                  return (
                    <div key={type}>
                      <div className={`px-4 py-2 ${typeInfo.bg} ${typeInfo.border} border-b`}>
                        <span className={`text-xs font-bold ${typeInfo.color}`}>
                          {typeInfo.label} ({typeSuggestions.length})
                        </span>
                      </div>
                      {typeSuggestions.map(s => (
                        <div key={s.id} className="p-4 hover:bg-slate-50 transition-colors">
                          <div className="flex items-start gap-3">
                            <input
                              type="checkbox"
                              checked={selectedSuggestionIds.has(s.id)}
                              onChange={() => toggleSelect(s.id)}
                              className="mt-1 w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
                            />
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-semibold text-slate-900">{s.title}</h4>
                              <p className="text-xs text-slate-600 mt-1"><strong>Q:</strong> {s.question}</p>
                              <p className="text-xs text-slate-600 mt-1"><strong>A:</strong> {s.answer}</p>
                              <div className="flex items-center gap-2 mt-2 flex-wrap">
                                <span className="px-2 py-0.5 bg-teal-50 text-teal-700 rounded text-xs font-medium">
                                  {s.category}
                                </span>
                                {s.keywords && (
                                  <span className="text-xs text-slate-400">Keywords: {s.keywords}</span>
                                )}
                                {s.source_reference && (
                                  <span className="text-xs text-slate-400">Source: {s.source_reference}</span>
                                )}
                              </div>

                              {/* Show existing entry for conflicts/updates */}
                              {(s.suggestion_type === 'conflict' || s.suggestion_type === 'updated') && s.existing_entry_answer && (
                                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                                  <p className="text-xs font-semibold text-red-800 mb-1">Existing entry:</p>
                                  <p className="text-xs text-red-700"><strong>Q:</strong> {s.existing_entry_title}</p>
                                  <p className="text-xs text-red-700 mt-1"><strong>A:</strong> {s.existing_entry_answer}</p>
                                </div>
                              )}
                            </div>
                            <div className="flex flex-col gap-1 shrink-0">
                              <button
                                onClick={() => handleApprove(s)}
                                className="flex items-center gap-1 px-2 py-1 bg-green-600 text-white rounded text-xs font-medium hover:bg-green-700 transition-colors"
                                title="Approve"
                              >
                                <Check size={14} />
                                Approve
                              </button>
                              <button
                                onClick={() => setEditingSuggestion(s)}
                                className="flex items-center gap-1 px-2 py-1 bg-slate-200 text-slate-700 rounded text-xs font-medium hover:bg-slate-300 transition-colors"
                                title="Edit before approving"
                              >
                                <Edit2 size={14} />
                                Edit
                              </button>
                              <button
                                onClick={() => handleReject(s.id)}
                                className="flex items-center gap-1 px-2 py-1 bg-slate-100 text-slate-500 rounded text-xs font-medium hover:bg-red-50 hover:text-red-600 transition-colors"
                                title="Reject"
                              >
                                <X size={14} />
                                Reject
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Search & Filter */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search entries..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10"
            />
          </div>
          <div className="relative">
            <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="pl-9 pr-8 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-teal-500 bg-white appearance-none cursor-pointer"
            >
              <option value="all">All categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Knowledge Entries List */}
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mx-auto mb-3"></div>
            <p className="text-sm text-slate-500">Loading entries...</p>
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <BookOpen size={32} className="mx-auto mb-3 text-slate-300" />
            <p className="text-sm">No knowledge entries found. Click "Add Entry" to create one, or "Update Knowledge" to scan automatically.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {entries.map(entry => (
              <div
                key={entry.id}
                className={`border rounded-lg p-4 transition-all ${entry.is_active ? 'border-slate-200 bg-white' : 'border-slate-200 bg-slate-50 opacity-60'}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-semibold text-slate-900 truncate">{entry.title}</h3>
                      <span className="px-2 py-0.5 bg-teal-50 text-teal-700 rounded text-xs font-medium shrink-0">
                        {entry.category}
                      </span>
                      {!entry.is_active && (
                        <span className="px-2 py-0.5 bg-slate-200 text-slate-500 rounded text-xs font-medium shrink-0">
                          Inactive
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 mb-1"><strong>Q:</strong> {entry.question}</p>
                    <p className="text-xs text-slate-600 line-clamp-2"><strong>A:</strong> {entry.answer}</p>
                    {entry.keywords && (
                      <p className="text-xs text-slate-400 mt-1">Keywords: {entry.keywords}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleToggle(entry)}
                      className="p-1.5 rounded hover:bg-slate-100 transition-colors"
                      title={entry.is_active ? 'Deactivate' : 'Activate'}
                    >
                      {entry.is_active
                        ? <ToggleRight size={18} className="text-green-600" />
                        : <ToggleLeft size={18} className="text-slate-400" />}
                    </button>
                    <button
                      onClick={() => handleEdit(entry)}
                      className="p-1.5 rounded hover:bg-slate-100 transition-colors"
                      title="Edit"
                    >
                      <Edit2 size={16} className="text-slate-600" />
                    </button>
                    <button
                      onClick={() => handleDelete(entry.id)}
                      className="p-1.5 rounded hover:bg-red-50 transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={16} className="text-red-500" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Test Assistant Section */}
        <div className="border-t border-slate-200 pt-6">
          <div className="flex items-center gap-2 mb-4">
            <Lightbulb size={18} className="text-amber-500" />
            <h3 className="text-sm font-bold text-slate-900">Test Assistant</h3>
            <span className="text-xs text-slate-500">— check which knowledge entries the AI finds for a question</span>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={testQuestion}
              onChange={(e) => setTestQuestion(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleTest(); } }}
              placeholder="Type a question to test..."
              className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10"
            />
            <button
              onClick={handleTest}
              disabled={testLoading || !testQuestion.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {testLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <Send size={16} />
              )}
              Test
            </button>
          </div>
          {testResult && (
            <div className="mt-4 space-y-3">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-xs font-semibold text-amber-900 mb-1">Question:</p>
                <p className="text-sm text-amber-800">{testResult.question}</p>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <p className="text-xs font-semibold text-slate-700 mb-2">
                  Knowledge entries found: {testResult.knowledge_entries.length}
                </p>
                {testResult.knowledge_entries.length > 0 ? (
                  <div className="space-y-2">
                    {testResult.knowledge_entries.map(e => (
                      <div key={e.id} className="p-2 bg-white border border-slate-200 rounded text-xs">
                        <p className="font-semibold text-slate-800">{e.title}</p>
                        <p className="text-slate-600"><strong>Q:</strong> {e.question}</p>
                        <p className="text-slate-600"><strong>A:</strong> {e.answer}</p>
                        <p className="text-slate-400 mt-1">Category: {e.category}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">No matching knowledge entries were found for this question.</p>
                )}
              </div>
              <div className="p-3 bg-teal-50 border border-teal-200 rounded-lg">
                <p className="text-xs font-semibold text-teal-900 mb-1">Assistant answer:</p>
                <p className="text-sm text-teal-800 whitespace-pre-wrap">{testResult.answer}</p>
              </div>
            </div>
          )}
        </div>

        {/* Knowledge Gaps Section */}
        <div className="border-t border-slate-200 pt-6">
          <button
            onClick={() => {
              if (!showGaps) fetchGaps();
              setShowGaps(!showGaps);
            }}
            className="flex items-center gap-2 text-sm font-bold text-slate-900 hover:text-slate-700 transition-colors"
          >
            {showGaps ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
            <AlertCircle size={18} className="text-orange-500" />
            Knowledge Gaps
            <span className="text-xs font-normal text-slate-500">— questions where no knowledge entry was found</span>
            {gapCount > 0 && (
              <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded text-xs font-bold">
                {gapCount}
              </span>
            )}
          </button>
          {showGaps && (
            <div className="mt-4">
              {gapsLoading ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-500 mx-auto"></div>
                </div>
              ) : gaps.length === 0 ? (
                <p className="text-sm text-slate-500 py-4">No knowledge gaps recorded yet.</p>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {gaps.map(gap => (
                    <div key={gap.id} className="flex items-start justify-between gap-3 p-3 border border-slate-200 rounded-lg bg-slate-50">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-700">{gap.user_question}</p>
                        <p className="text-xs text-slate-400 mt-1">{formatDate(gap.created_at)}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleCreateFromGap(gap)}
                          className="flex items-center gap-1 px-2 py-1 bg-teal-600 text-white rounded text-xs font-medium hover:bg-teal-700 transition-colors"
                        >
                          <Plus size={12} />
                          Create Entry
                        </button>
                        <button
                          onClick={() => handleDeleteGap(gap.id)}
                          className="p-1 rounded hover:bg-red-50 transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={14} className="text-red-500" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-200">
              <h3 className="text-lg font-bold text-slate-900">
                {editingEntry ? 'Edit Knowledge Entry' : 'Add Knowledge Entry'}
              </h3>
              <button onClick={() => setShowForm(false)} className="p-1 rounded hover:bg-slate-100 transition-colors">
                <X size={20} className="text-slate-500" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block mb-1 text-sm font-semibold text-slate-700">Title *</label>
                <input type="text" value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Changing available equity"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10" />
              </div>
              <div>
                <label className="block mb-1 text-sm font-semibold text-slate-700">Question *</label>
                <input type="text" value={formData.question}
                  onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                  placeholder="e.g. How do I change the amount of equity available in my group?"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10" />
              </div>
              <div>
                <label className="block mb-1 text-sm font-semibold text-slate-700">Answer *</label>
                <textarea value={formData.answer}
                  onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
                  rows={4}
                  placeholder="e.g. Open your group and select Manage Equity. From there you can adjust the amount of equity available and save your changes."
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 resize-none" />
              </div>
              <div>
                <label className="block mb-1 text-sm font-semibold text-slate-700">Category</label>
                <input type="text" value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  placeholder="e.g. Equity Management"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10" />
              </div>
              <div>
                <label className="block mb-1 text-sm font-semibold text-slate-700">Keywords</label>
                <input type="text" value={formData.keywords}
                  onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
                  placeholder="e.g. change equity, available equity, manage equity"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10" />
                <p className="text-xs text-slate-400 mt-1">Comma-separated keywords to help match user questions.</p>
              </div>
              <div className="flex items-center justify-between p-3 border border-slate-200 rounded-lg">
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">Active</h4>
                  <p className="text-xs text-slate-500">Inactive entries are not used by the AI assistant.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="sr-only peer" />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:border-slate-300 after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-slate-200">
              <button onClick={() => setShowForm(false)}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium">
                Cancel
              </button>
              <button onClick={handleSave}
                className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-sm font-semibold">
                <Save size={16} />
                {editingEntry ? 'Update Entry' : 'Create Entry'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Suggestion Modal */}
      {editingSuggestion && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-200">
              <h3 className="text-lg font-bold text-slate-900">Edit Suggestion</h3>
              <button onClick={() => setEditingSuggestion(null)} className="p-1 rounded hover:bg-slate-100 transition-colors">
                <X size={20} className="text-slate-500" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block mb-1 text-sm font-semibold text-slate-700">Title</label>
                <input type="text" value={editingSuggestion.title}
                  onChange={(e) => setEditingSuggestion({ ...editingSuggestion, title: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10" />
              </div>
              <div>
                <label className="block mb-1 text-sm font-semibold text-slate-700">Question</label>
                <input type="text" value={editingSuggestion.question}
                  onChange={(e) => setEditingSuggestion({ ...editingSuggestion, question: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10" />
              </div>
              <div>
                <label className="block mb-1 text-sm font-semibold text-slate-700">Answer</label>
                <textarea value={editingSuggestion.answer}
                  onChange={(e) => setEditingSuggestion({ ...editingSuggestion, answer: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 resize-none" />
              </div>
              <div>
                <label className="block mb-1 text-sm font-semibold text-slate-700">Category</label>
                <input type="text" value={editingSuggestion.category}
                  onChange={(e) => setEditingSuggestion({ ...editingSuggestion, category: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10" />
              </div>
              <div>
                <label className="block mb-1 text-sm font-semibold text-slate-700">Keywords</label>
                <input type="text" value={editingSuggestion.keywords || ''}
                  onChange={(e) => setEditingSuggestion({ ...editingSuggestion, keywords: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10" />
              </div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-slate-200">
              <button onClick={() => setEditingSuggestion(null)}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium">
                Cancel
              </button>
              <button onClick={handleSaveSuggestionEdit}
                className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-sm font-semibold">
                <Save size={16} />
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AiKnowledgeManager;
