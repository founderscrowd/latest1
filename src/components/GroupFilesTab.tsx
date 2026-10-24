import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  FileText,
  FileSpreadsheet,
  Presentation,
  FileImage,
  File as FileIcon,
  Upload,
  Download,
  Trash2,
  Search,
  Filter as FilterIcon,
  ArrowUpDown,
  Loader2,
  AlertCircle,
  FolderOpen,
  X,
  Edit2,
  Check,
  HardDrive,
  Image as ImageIcon,
} from 'lucide-react';
import { groupFilesAPI, GroupFile } from '../lib/groupFilesApi';
import { useAuth } from '../hooks/useAuth';
import ConfirmationModal from './ConfirmationModal';

interface GroupFilesTabProps {
  groupId: string;
  userRole: string | null;
  currentUserId: string | null;
}

type SortOption = 'newest' | 'oldest' | 'filename';
type FileTypeFilter = 'all' | 'pdf' | 'document' | 'spreadsheet' | 'presentation' | 'image' | 'text';

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_FILES = 100;
const MAX_TOTAL_BYTES = 500 * 1024 * 1024;
const ACCEPTED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.jpg', '.jpeg', '.png', '.webp', '.txt'];
const ACCEPTED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'image/jpeg',
  'image/png',
  'image/webp',
  'text/plain',
];

function getFileCategory(mimeType: string): FileTypeFilter {
  if (mimeType === 'application/pdf') return 'pdf';
  if (mimeType.includes('word') || mimeType.includes('msword')) return 'document';
  if (mimeType.includes('sheet') || mimeType.includes('excel')) return 'spreadsheet';
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return 'presentation';
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('text/')) return 'text';
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

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString();
}

function getAcceptedExtensionsForFilter(filter: FileTypeFilter): string[] {
  switch (filter) {
    case 'pdf': return ['.pdf'];
    case 'document': return ['.doc', '.docx'];
    case 'spreadsheet': return ['.xls', '.xlsx'];
    case 'presentation': return ['.ppt', '.pptx'];
    case 'image': return ['.jpg', '.jpeg', '.png', '.webp'];
    case 'text': return ['.txt'];
    default: return ACCEPTED_EXTENSIONS;
  }
}

interface UploadItem {
  file: File;
  description: string;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
}

const GroupFilesTab: React.FC<GroupFilesTabProps> = ({ groupId, userRole, currentUserId }) => {
  const { user } = useAuth();
  const [files, setFiles] = useState<GroupFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<FileTypeFilter>('all');
  const [sortOption, setSortOption] = useState<SortOption>('newest');
  const [showUploadArea, setShowUploadArea] = useState(false);
  const [uploadItems, setUploadItems] = useState<UploadItem[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [storageUsage, setStorageUsage] = useState<{ fileCount: number; totalBytes: number } | null>(null);
  const [storageUnavailable, setStorageUnavailable] = useState(false);
  const [deletingFileId, setDeletingFileId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [editingDescriptionId, setEditingDescriptionId] = useState<string | null>(null);
  const [descriptionDraft, setDescriptionDraft] = useState('');
  const [descriptionSaveError, setDescriptionSaveError] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<GroupFile | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canUpload = userRole === 'starter' || userRole === 'admin' || userRole === 'cofounder';
  const canDeleteAny = userRole === 'starter' || userRole === 'admin';

  const fetchFiles = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const fileData = await groupFilesAPI.listFiles(groupId);
      setFiles(fileData);

      setStorageUnavailable(false);
      try {
        const usage = await groupFilesAPI.getGroupStorageUsage(groupId);
        setStorageUsage(usage);
      } catch {
        setStorageUsage(null);
        setStorageUnavailable(true);
      }
    } catch (err) {
      console.error('Error fetching files:', err);
      setError('Could not load files. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const filteredFiles = React.useMemo(() => {
    let result = [...files];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(f =>
        f.original_filename.toLowerCase().includes(q) ||
        (f.description && f.description.toLowerCase().includes(q))
      );
    }

    if (typeFilter !== 'all') {
      result = result.filter(f => getFileCategory(f.mime_type) === typeFilter);
    }

    switch (sortOption) {
      case 'newest':
        result.sort((a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime());
        break;
      case 'oldest':
        result.sort((a, b) => new Date(a.uploaded_at).getTime() - new Date(b.uploaded_at).getTime());
        break;
      case 'filename':
        result.sort((a, b) => a.original_filename.localeCompare(b.original_filename));
        break;
    }

    return result;
  }, [files, searchQuery, typeFilter, sortOption]);

  const validateFile = (file: File): string | null => {
    if (file.size > MAX_FILE_SIZE) {
      return `${file.name} exceeds the 10 MB limit.`;
    }
    if (file.size === 0) {
      return `${file.name} is empty.`;
    }
    const ext = '.' + (file.name.split('.').pop() || '').toLowerCase();
    if (!ACCEPTED_EXTENSIONS.includes(ext)) {
      return `${file.name} is not a supported file type.`;
    }
    if (file.type && !ACCEPTED_MIME_TYPES.includes(file.type)) {
      return `${file.name} has an unsupported MIME type.`;
    }
    return null;
  };

  const addFilesToUpload = (fileList: File[]) => {
    const validItems: UploadItem[] = [];
    for (const file of fileList) {
      const validationError = validateFile(file);
      if (validationError) {
        validItems.push({
          file,
          description: '',
          progress: 0,
          status: 'error',
          error: validationError,
        });
      } else {
        validItems.push({
          file,
          description: '',
          progress: 0,
          status: 'pending',
        });
      }
    }
    setUploadItems(prev => [...prev, ...validItems]);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      addFilesToUpload(Array.from(e.target.files));
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files) {
      addFilesToUpload(Array.from(e.dataTransfer.files));
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const removeUploadItem = (index: number) => {
    setUploadItems(prev => prev.filter((_, i) => i !== index));
  };

  const updateUploadDescription = (index: number, description: string) => {
    setUploadItems(prev => prev.map((item, i) => i === index ? { ...item, description } : item));
  };

  const uploadSingleFile = async (item: UploadItem, index: number): Promise<void> => {
    setUploadItems(prev => prev.map((it, i) => i === index ? { ...it, status: 'uploading', progress: 10 } : it));
    try {
      await groupFilesAPI.uploadFile(groupId, item.file, item.description || undefined);
      setUploadItems(prev => prev.map((it, i) => i === index ? { ...it, status: 'success', progress: 100 } : it));
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Upload failed.';
      setUploadItems(prev => prev.map((it, i) => i === index ? { ...it, status: 'error', error: errorMsg } : it));
    }
  };

  const handleUploadAll = async () => {
    const pendingItems = uploadItems.filter(item => item.status === 'pending');
    if (pendingItems.length === 0) return;

    const remainingFiles = storageUsage ? MAX_FILES - storageUsage.fileCount : MAX_FILES;
    const remainingBytes = storageUsage ? MAX_TOTAL_BYTES - storageUsage.totalBytes : MAX_TOTAL_BYTES;

    let skippedCount = 0;
    let pendingBytes = 0;
    for (const item of pendingItems) {
      if (pendingBytes + item.file.size > remainingBytes) {
        skippedCount++;
      } else {
        pendingBytes += item.file.size;
      }
    }

    if (pendingItems.length > remainingFiles) {
      setError(`Only ${remainingFiles} more files can be uploaded (group limit: ${MAX_FILES}).`);
      return;
    }

    if (skippedCount > 0) {
      setError(`Some files would exceed the group storage quota (${formatFileSize(MAX_TOTAL_BYTES)}). ${skippedCount} file(s) skipped.`);
      return;
    }

    setError(null);
    const indices = uploadItems.map((item, i) => item.status === 'pending' ? i : -1).filter(i => i !== -1);

    for (let idx = 0; idx < indices.length; idx++) {
      const index = indices[idx];
      const item = uploadItems[index];
      await uploadSingleFile(item, index);
    }

    await fetchFiles();
  };

  const clearCompletedUploads = () => {
    setUploadItems(prev => prev.filter(item => item.status !== 'success'));
  };

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

  const handleDeleteClick = (file: GroupFile) => {
    setDeletingFileId(file.id);
    setDeleteError(null);
  };

  const handleConfirmDelete = async () => {
    if (!deletingFileId) return;
    try {
      setDeleteError(null);
      await groupFilesAPI.deleteFile(deletingFileId);
      setDeletingFileId(null);
      await fetchFiles();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Delete failed.';
      setDeleteError(msg);
      setDeletingFileId(null);
      setTimeout(() => setDeleteError(null), 5000);
    }
  };

  const canEditDescription = (file: GroupFile): boolean => {
    if (!canUpload) return false;
    if (canDeleteAny) return true;
    if (userRole === 'cofounder' && file.uploader_user_id === currentUserId) return true;
    return false;
  };

  const canDeleteFile = (file: GroupFile): boolean => {
    if (!canUpload) return false;
    if (canDeleteAny) return true;
    if (userRole === 'cofounder' && file.uploader_user_id === currentUserId) return true;
    return false;
  };

  const startEditDescription = (file: GroupFile) => {
    setEditingDescriptionId(file.id);
    setDescriptionDraft(file.description || '');
    setDescriptionSaveError(null);
  };

  const cancelEditDescription = () => {
    setEditingDescriptionId(null);
    setDescriptionDraft('');
    setDescriptionSaveError(null);
  };

  const saveDescription = async (fileId: string) => {
    try {
      setDescriptionSaveError(null);
      await groupFilesAPI.updateDescription(fileId, descriptionDraft.trim());
      setFiles(prev => prev.map(f => f.id === fileId ? { ...f, description: descriptionDraft.trim() || null } : f));
      setEditingDescriptionId(null);
      setDescriptionDraft('');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not save description.';
      setDescriptionSaveError(msg);
    }
  };

  const storagePercent = storageUsage ? Math.min(100, (storageUsage.totalBytes / MAX_TOTAL_BYTES) * 100) : 0;
  const storageColor = storagePercent > 90 ? 'bg-red-500' : storagePercent > 70 ? 'bg-amber-500' : 'bg-emerald-500';
  const remainingFiles = storageUsage ? MAX_FILES - storageUsage.fileCount : MAX_FILES;
  const remainingBytes = storageUsage ? MAX_TOTAL_BYTES - storageUsage.totalBytes : MAX_TOTAL_BYTES;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
        <span className="ml-3 text-slate-600">Loading files...</span>
      </div>
    );
  }

  if (error && files.length === 0 && !showUploadArea) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertCircle className="w-10 h-10 text-red-400 mb-3" />
        <p className="text-slate-700 mb-4">{error}</p>
        <button
          onClick={fetchFiles}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Storage Usage Bar */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
        {storageUnavailable ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-slate-500" />
              <span className="text-sm font-medium text-slate-700">Group Storage</span>
            </div>
            <span className="text-xs text-slate-400 italic">Storage usage unavailable</span>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-slate-500" />
                <span className="text-sm font-medium text-slate-700">Group Storage</span>
              </div>
              <span className="text-xs text-slate-500">
                {formatFileSize(storageUsage?.totalBytes ?? 0)} of {formatFileSize(MAX_TOTAL_BYTES)} used
                {' · '}{storageUsage?.fileCount ?? 0}/{MAX_FILES} files
              </span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${storageColor}`}
                style={{ width: `${storagePercent}%` }}
              />
            </div>
          </>
        )}
      </div>

      {/* Action Bar */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search files..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Type Filter */}
          <div className="flex items-center gap-2">
            <FilterIcon className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value as FileTypeFilter)}
              className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="all">All types</option>
              <option value="pdf">PDF</option>
              <option value="document">Word</option>
              <option value="spreadsheet">Excel</option>
              <option value="presentation">PowerPoint</option>
              <option value="image">Images</option>
              <option value="text">Text</option>
            </select>
          </div>

          {/* Sort */}
          <div className="flex items-center gap-2">
            <ArrowUpDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <select
              value={sortOption}
              onChange={e => setSortOption(e.target.value as SortOption)}
              className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="filename">Filename A-Z</option>
            </select>
          </div>

          {/* Upload Button */}
          {canUpload && (
            <button
              onClick={() => setShowUploadArea(!showUploadArea)}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium whitespace-nowrap"
            >
              <Upload className="w-4 h-4" />
              Upload Files
            </button>
          )}
        </div>

        {/* Inline error message */}
        {error && files.length > 0 && (
          <div className="mt-3 flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
            <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        {deleteError && (
          <div className="mt-3 flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{deleteError}</span>
            <button onClick={() => setDeleteError(null)} className="ml-auto text-red-400 hover:text-red-600">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Upload Area */}
      {showUploadArea && canUpload && (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 space-y-4">
          {/* Drag & Drop Zone */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${
              isDragOver
                ? 'border-blue-500 bg-blue-50'
                : 'border-slate-300 hover:border-slate-400'
            }`}
          >
            <Upload className="w-8 h-8 mx-auto text-slate-400 mb-2" />
            <p className="text-sm text-slate-600 mb-1">
              Drag and drop files here, or
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              browse to select files
            </button>
            <p className="text-xs text-slate-400 mt-2">
              PDF, Word, Excel, PowerPoint, JPEG, PNG, WebP, TXT · Max 10 MB per file
            </p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={ACCEPTED_EXTENSIONS.join(',')}
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {/* Upload Queue */}
          {uploadItems.length > 0 && (
            <div className="space-y-2">
              {uploadItems.map((item, index) => (
                <div
                  key={index}
                  className={`flex flex-col sm:flex-row sm:items-center gap-2 p-3 rounded-lg border ${
                    item.status === 'error'
                      ? 'border-red-200 bg-red-50'
                      : item.status === 'success'
                      ? 'border-green-200 bg-green-50'
                      : 'border-slate-200 bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {getFileIcon(item.file.type || 'text/plain')}
                    <span className="text-sm font-medium text-slate-800 truncate">
                      {item.file.name}
                    </span>
                    <span className="text-xs text-slate-400 flex-shrink-0">
                      {formatFileSize(item.file.size)}
                    </span>
                  </div>

                  {item.status === 'pending' && (
                    <input
                      type="text"
                      placeholder="Description (optional)"
                      value={item.description}
                      onChange={e => updateUploadDescription(index, e.target.value)}
                      className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 w-full sm:w-48 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  )}

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {item.status === 'pending' && (
                      <button
                        onClick={() => removeUploadItem(index)}
                        className="p-1 text-slate-400 hover:text-slate-600"
                        title="Remove"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                    {item.status === 'uploading' && (
                      <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                    )}
                    {item.status === 'success' && (
                      <Check className="w-4 h-4 text-green-500" />
                    )}
                    {item.status === 'error' && (
                      <span className="text-xs text-red-600 truncate max-w-[200px]" title={item.error}>
                        {item.error}
                      </span>
                    )}
                  </div>
                </div>
              ))}

              <div className="flex items-center justify-between gap-2 pt-1">
                <button
                  onClick={clearCompletedUploads}
                  className="text-xs text-slate-500 hover:text-slate-700"
                >
                  Clear completed
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setUploadItems([]);
                      setShowUploadArea(false);
                    }}
                    className="px-3 py-1.5 text-sm border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  {uploadItems.some(i => i.status === 'pending') && (
                    <button
                      onClick={handleUploadAll}
                      className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                    >
                      Upload {uploadItems.filter(i => i.status === 'pending').length} file(s)
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* File List */}
      {filteredFiles.length === 0 ? (
        <div className="bg-white rounded-xl p-8 shadow-sm border border-slate-200 text-center">
          <FolderOpen className="w-12 h-12 mx-auto text-slate-300 mb-3" />
          <h3 className="text-lg font-semibold text-slate-700 mb-1">
            {files.length === 0 ? 'No files yet' : 'No files match your search'}
          </h3>
          <p className="text-sm text-slate-500">
            {files.length === 0
              ? canUpload
                ? 'Upload documents to share with your team.'
                : 'Files will appear here when authorised members upload them.'
              : 'Try adjusting your search or filters.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {/* Desktop header */}
          <div className="hidden sm:grid grid-cols-12 gap-3 px-4 py-3 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wide">
            <div className="col-span-5">Filename</div>
            <div className="col-span-2">Type</div>
            <div className="col-span-1 text-right">Size</div>
            <div className="col-span-2">Uploaded</div>
            <div className="col-span-2 text-right">Actions</div>
          </div>

          <div className="divide-y divide-slate-100">
            {filteredFiles.map(file => (
              <div
                key={file.id}
                className="px-4 py-3 hover:bg-slate-50 transition-colors"
              >
                {/* Desktop layout */}
                <div className="hidden sm:grid grid-cols-12 gap-3 items-center">
                  <div className="col-span-5 flex items-center gap-2 min-w-0">
                    {getFileIcon(file.mime_type)}
                    <div className="min-w-0 flex-1">
                      <button
                        onClick={() => handlePreview(file)}
                        className="text-sm font-medium text-slate-900 hover:text-blue-600 hover:underline truncate text-left block"
                        title={file.original_filename}
                      >
                        {file.original_filename}
                      </button>
                      {editingDescriptionId === file.id ? (
                        <div className="mt-1 flex items-center gap-1">
                          <input
                            type="text"
                            value={descriptionDraft}
                            onChange={e => setDescriptionDraft(e.target.value)}
                            placeholder="Add a description..."
                            className="text-xs border border-slate-200 rounded px-2 py-1 w-full focus:outline-none focus:ring-1 focus:ring-blue-500"
                            autoFocus
                            onKeyDown={e => {
                              if (e.key === 'Enter') saveDescription(file.id);
                              if (e.key === 'Escape') cancelEditDescription();
                            }}
                          />
                          <button onClick={() => saveDescription(file.id)} className="p-1 text-green-600 hover:bg-green-50 rounded">
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={cancelEditDescription} className="p-1 text-slate-400 hover:bg-slate-100 rounded">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 mt-0.5">
                          {file.description && (
                            <span className="text-xs text-slate-500 truncate" title={file.description}>
                              {file.description}
                            </span>
                          )}
                          {canEditDescription(file) && (
                            <button
                              onClick={() => startEditDescription(file)}
                              className="text-xs text-blue-500 hover:text-blue-700 flex-shrink-0"
                              title="Edit description"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      )}
                      {descriptionSaveError && editingDescriptionId === file.id && (
                        <p className="text-xs text-red-600 mt-0.5">{descriptionSaveError}</p>
                      )}
                    </div>
                  </div>

                  <div className="col-span-2 text-xs text-slate-600 capitalize">
                    {getFileCategory(file.mime_type) === 'pdf' ? 'PDF' :
                     getFileCategory(file.mime_type) === 'document' ? 'Word' :
                     getFileCategory(file.mime_type) === 'spreadsheet' ? 'Excel' :
                     getFileCategory(file.mime_type) === 'presentation' ? 'PowerPoint' :
                     getFileCategory(file.mime_type) === 'image' ? 'Image' : 'Text'}
                  </div>

                  <div className="col-span-1 text-xs text-slate-600 text-right">
                    {formatFileSize(file.file_size)}
                  </div>

                  <div className="col-span-2 text-xs text-slate-600">
                    <div>{formatDate(file.uploaded_at)}</div>
                    {file.uploader_profile?.username && (
                      <div className="text-slate-400 truncate">{file.uploader_profile.username}</div>
                    )}
                  </div>

                  <div className="col-span-2 flex items-center justify-end gap-1">
                    <button
                      onClick={() => handleDownload(file)}
                      className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Download"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    {canDeleteFile(file) && (
                      <button
                        onClick={() => handleDeleteClick(file)}
                        className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Mobile layout */}
                <div className="sm:hidden">
                  <div className="flex items-start gap-2">
                    {getFileIcon(file.mime_type)}
                    <div className="flex-1 min-w-0">
                      <button
                        onClick={() => handlePreview(file)}
                        className="text-sm font-medium text-slate-900 hover:text-blue-600 text-left block truncate w-full"
                        title={file.original_filename}
                      >
                        {file.original_filename}
                      </button>
                      {file.description && (
                        <p className="text-xs text-slate-500 truncate mt-0.5">{file.description}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
                        <span>{formatFileSize(file.file_size)}</span>
                        <span>·</span>
                        <span>{formatDate(file.uploaded_at)}</span>
                        {file.uploader_profile?.username && (
                          <>
                            <span>·</span>
                            <span className="truncate">{file.uploader_profile.username}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      onClick={() => handleDownload(file)}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download
                    </button>
                    {canEditDescription(file) && editingDescriptionId !== file.id && (
                      <button
                        onClick={() => startEditDescription(file)}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        Edit
                      </button>
                    )}
                    {canDeleteFile(file) && (
                      <button
                        onClick={() => handleDeleteClick(file)}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors ml-auto"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete
                      </button>
                    )}
                  </div>
                  {editingDescriptionId === file.id && (
                    <div className="mt-2 flex items-center gap-1">
                      <input
                        type="text"
                        value={descriptionDraft}
                        onChange={e => setDescriptionDraft(e.target.value)}
                        placeholder="Add a description..."
                        className="text-xs border border-slate-200 rounded px-2 py-1.5 flex-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        autoFocus
                        onKeyDown={e => {
                          if (e.key === 'Enter') saveDescription(file.id);
                          if (e.key === 'Escape') cancelEditDescription();
                        }}
                      />
                      <button onClick={() => saveDescription(file.id)} className="p-1.5 text-green-600 hover:bg-green-50 rounded">
                        <Check className="w-4 h-4" />
                      </button>
                      <button onClick={cancelEditDescription} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!deletingFileId}
        onClose={() => setDeletingFileId(null)}
        onConfirm={handleConfirmDelete}
        title="Delete File"
        message="Are you sure you want to delete this file? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        isDestructive={true}
      />

      {/* File Preview Modal */}
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
                  <X className="w-5 h-5" />
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
                ) : (
                  <div className="text-center py-12">
                    <FileIcon className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                    <p className="text-sm text-slate-600 mb-3">Preview not available for this file type.</p>
                    <button
                      onClick={() => handleDownload(previewFile)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                    >
                      Download instead
                    </button>
                  </div>
                )
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
    </div>
  );
};

export default GroupFilesTab;
