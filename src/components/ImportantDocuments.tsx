import React, { useState, useEffect, useCallback } from 'react';
import {
  Pin,
  FileText,
  FileSpreadsheet,
  Presentation,
  FileImage,
  File as FileIcon,
  Download,
  Loader2,
  AlertCircle,
  ChevronUp,
  ChevronDown,
  Star,
} from 'lucide-react';
import { groupFilesAPI, GroupFile } from '../lib/groupFilesApi';

interface ImportantDocumentsProps {
  groupId: string;
  userRole: string | null;
}

function getFileCategory(mimeType: string): string {
  if (mimeType === 'application/pdf') return 'pdf';
  if (mimeType.includes('word') || mimeType.includes('msword')) return 'document';
  if (mimeType.includes('sheet') || mimeType.includes('excel')) return 'spreadsheet';
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return 'presentation';
  if (mimeType.startsWith('image/')) return 'image';
  return 'text';
}

function getFileIcon(mimeType: string): React.ReactNode {
  const cat = getFileCategory(mimeType);
  const className = 'w-5 h-5';
  switch (cat) {
    case 'pdf':
      return <FileText className={`${className} text-red-500`} />;
    case 'document':
      return <FileText className={`${className} text-blue-500`} />;
    case 'spreadsheet':
      return <FileSpreadsheet className={`${className} text-green-500`} />;
    case 'presentation':
      return <Presentation className={`${className} text-orange-500`} />;
    case 'image':
      return <FileImage className={`${className} text-purple-500`} />;
    default:
      return <FileIcon className={`${className} text-slate-400`} />;
  }
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const ImportantDocuments: React.FC<ImportantDocumentsProps> = ({ groupId, userRole }) => {
  const [pinnedFiles, setPinnedFiles] = useState<GroupFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<GroupFile | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [reorderError, setReorderError] = useState<string | null>(null);

  const canManage = userRole === 'starter' || userRole === 'admin';
  const canView = userRole === 'starter' || userRole === 'admin' || userRole === 'cofounder';

  const fetchPinnedFiles = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const files = await groupFilesAPI.listPinnedFiles(groupId);
      setPinnedFiles(files);
    } catch (err) {
      console.error('Error fetching pinned files:', err);
      setError('Could not load important documents.');
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    if (canView) {
      fetchPinnedFiles();
    }
  }, [fetchPinnedFiles, canView]);

  const handleDownload = async (file: GroupFile) => {
    try {
      const result = await groupFilesAPI.getDownloadUrl(file.id);
      const link = document.createElement('a');
      link.href = result.url;
      link.download = file.original_filename;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Download failed.';
      setError(msg);
      setTimeout(() => setError(null), 5000);
    }
  };

  const handlePreview = async (file: GroupFile) => {
    const cat = getFileCategory(file.mime_type);
    if (cat !== 'image' && cat !== 'pdf') {
      handleDownload(file);
      return;
    }
    try {
      setPreviewLoading(true);
      setPreviewFile(file);
      setPreviewUrl(null);
      const result = await groupFilesAPI.getDownloadUrl(file.id);
      setPreviewUrl(result.url);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Preview failed.';
      setError(msg);
      setPreviewFile(null);
      setTimeout(() => setError(null), 5000);
    } finally {
      setPreviewLoading(false);
    }
  };

  const closePreview = () => {
    setPreviewFile(null);
    setPreviewUrl(null);
  };

  const handleReorder = async (fileId: string, direction: 'up' | 'down') => {
    const currentOrder = [...pinnedFiles];
    const idx = currentOrder.findIndex(f => f.id === fileId);
    if (idx === -1) return;
    if (direction === 'up' && idx === 0) return;
    if (direction === 'down' && idx === currentOrder.length - 1) return;

    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    const reordered = [...currentOrder];
    [reordered[idx], reordered[swapIdx]] = [reordered[swapIdx], reordered[idx]];

    setReordering(true);
    setReorderError(null);
    try {
      await groupFilesAPI.reorderPinnedFiles(groupId, reordered.map(f => f.id));
      setPinnedFiles(reordered);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not reorder documents.';
      setReorderError(msg);
      setTimeout(() => setReorderError(null), 5000);
      await fetchPinnedFiles();
    } finally {
      setReordering(false);
    }
  };

  if (!canView) return null;

  if (loading) {
    return (
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
        <div className="flex items-center gap-2 mb-4">
          <Pin className="w-5 h-5 text-amber-500" />
          <h3 className="text-lg font-semibold text-slate-900">Important Documents</h3>
        </div>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
        <div className="flex items-center gap-2 mb-4">
          <Pin className="w-5 h-5 text-amber-500" />
          <h3 className="text-lg font-semibold text-slate-900">Important Documents</h3>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-500 py-4">
          <AlertCircle className="w-4 h-4 text-slate-400" />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  if (pinnedFiles.length === 0) {
    if (!canManage) return null;
    return (
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
        <div className="flex items-center gap-2 mb-4">
          <Pin className="w-5 h-5 text-amber-500" />
          <h3 className="text-lg font-semibold text-slate-900">Important Documents</h3>
        </div>
        <div className="text-center py-6">
          <Star className="w-10 h-10 mx-auto text-amber-300 mb-2" />
          <p className="text-sm text-slate-600 mb-1">No important documents pinned yet.</p>
          <p className="text-xs text-slate-400">
            Go to Files &amp; Resources and pin up to 3 key documents to display them here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
        <div className="flex items-center gap-2 mb-4">
          <Pin className="w-5 h-5 text-amber-500" fill="currentColor" />
          <h3 className="text-lg font-semibold text-slate-900">Important Documents</h3>
          <span className="text-xs text-slate-400 ml-1">({pinnedFiles.length}/3)</span>
        </div>

        {reorderError && (
          <div className="mb-3 flex items-start gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{reorderError}</span>
          </div>
        )}

        <div className="space-y-2">
          {pinnedFiles.map((file, index) => {
            const cat = getFileCategory(file.mime_type);
            const canPreview = cat === 'image' || cat === 'pdf';
            return (
              <div
                key={file.id}
                className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors group"
              >
                <div className="flex-shrink-0">
                  {getFileIcon(file.mime_type)}
                </div>

                <div className="flex-1 min-w-0">
                  <button
                    onClick={() => handlePreview(file)}
                    className="text-sm font-medium text-slate-900 hover:text-blue-600 hover:underline truncate text-left block w-full"
                    title={file.original_filename}
                  >
                    {file.original_filename}
                  </button>
                  {file.description && (
                    <p className="text-xs text-slate-500 truncate mt-0.5">{file.description}</p>
                  )}
                  <div className="text-xs text-slate-400 mt-0.5">
                    {formatFileSize(file.file_size)}
                  </div>
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                  {canManage && pinnedFiles.length > 1 && (
                    <div className="flex flex-col">
                      <button
                        onClick={() => handleReorder(file.id, 'up')}
                        disabled={index === 0 || reordering}
                        className="p-0.5 text-slate-400 hover:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Move up"
                        aria-label="Move up"
                      >
                        <ChevronUp className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleReorder(file.id, 'down')}
                        disabled={index === pinnedFiles.length - 1 || reordering}
                        className="p-0.5 text-slate-400 hover:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Move down"
                        aria-label="Move down"
                      >
                        <ChevronDown className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  <button
                    onClick={() => handleDownload(file)}
                    className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title={canPreview ? 'Preview' : 'Download'}
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Preview Modal */}
      {previewFile && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-[2000] p-4" onClick={closePreview}>
          <div
            className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <div className="flex items-center gap-2 min-w-0">
                {getFileIcon(previewFile.mime_type)}
                <span className="text-sm font-medium text-slate-900 truncate">
                  {previewFile.original_filename}
                </span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => handleDownload(previewFile)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors font-medium"
                >
                  <Download className="w-4 h-4" />
                  Download
                </button>
                <button
                  onClick={closePreview}
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <span className="sr-only">Close</span>
                  <span className="text-xl leading-none">&times;</span>
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto bg-slate-50 flex items-center justify-center">
              {previewLoading ? (
                <div className="flex items-center gap-2 py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                  <span className="text-slate-600">Loading preview...</span>
                </div>
              ) : previewUrl ? (
                getFileCategory(previewFile.mime_type) === 'image' ? (
                  <img
                    src={previewUrl}
                    alt={previewFile.original_filename}
                    className="max-w-full max-h-[70vh] object-contain"
                  />
                ) : getFileCategory(previewFile.mime_type) === 'pdf' ? (
                  <iframe
                    src={previewUrl}
                    title={previewFile.original_filename}
                    className="w-full h-[70vh] border-0"
                  />
                ) : null
              ) : (
                <div className="text-center py-12">
                  <AlertCircle className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                  <p className="text-sm text-slate-600">Could not load preview.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ImportantDocuments;
