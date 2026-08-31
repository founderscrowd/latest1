import React, { useState } from 'react';
import { X, MessageSquare, Paperclip, Image, FileText, Trash2 } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { forumAPI } from '../../lib/forumApi';

interface CreateTopicModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
  onTopicCreated: (topicId: string) => void;
}

const CreateTopicModal: React.FC<CreateTopicModalProps> = ({
  isOpen,
  onClose,
  groupId,
  onTopicCreated
}) => {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(file => {
      const allowedTypes = [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain'
      ];
      
      const maxSize = 10 * 1024 * 1024; // 10MB
      
      if (!allowedTypes.includes(file.type)) {
        setError(`File "${file.name}" has an unsupported format. Please use images, PDFs, or documents.`);
        return false;
      }
      
      if (file.size > maxSize) {
        setError(`File "${file.name}" is too large. Maximum size is 10MB.`);
        return false;
      }
      
      return true;
    });
    
    setSelectedFiles(prev => [...prev, ...validFiles]);
    if (validFiles.length > 0) {
      setError(''); // Clear error if files are valid
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) {
      return <Image size={16} className="text-blue-600" />;
    } else if (fileType === 'application/pdf') {
      return <FileText size={16} className="text-red-600" />;
    } else {
      return <FileText size={16} className="text-slate-600" />;
    }
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !title.trim() || !content.trim() || creating) return;

    try {
      setCreating(true);
      setError('');
      
      const topic = await forumAPI.createTopic(
        groupId,
        title.trim(),
        content.trim(),
        user.id,
        selectedFiles.length > 0 ? selectedFiles : undefined
      );
      
      // Reset form
      setTitle('');
      setContent('');
      setSelectedFiles([]);
      
      // Close modal and navigate to new topic
      onClose();
      onTopicCreated(topic.id);
    } catch (err: any) {
      setError(err.message || 'Failed to create topic. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  const handleClose = () => {
    if (!creating) {
      setTitle('');
      setContent('');
      setSelectedFiles([]);
      setError('');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[2000] p-4">
      <div className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <MessageSquare size={20} className="text-white" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Create New Topic</h3>
          </div>
          <button 
            onClick={handleClose}
            disabled={creating}
            className="text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Topic Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full p-3 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
              placeholder="Enter a descriptive title for your topic..."
              required
              maxLength={200}
              disabled={creating}
            />
            <div className="text-right text-xs text-slate-500 mt-1">
              {title.length}/200 characters
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Initial Post Content *
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full p-3 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 resize-vertical min-h-[150px]"
              placeholder="Start the discussion with your thoughts, questions, or ideas..."
              required
              maxLength={10000}
              disabled={creating}
            />
            <div className="text-right text-xs text-slate-500 mt-1">
              {content.length}/10,000 characters
            </div>
          </div>

          {/* File Upload Section */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Attachments (Optional)
            </label>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
                  <Paperclip size={16} className="text-slate-600" />
                  <span className="text-sm font-medium text-slate-700">Add Files</span>
                  <input
                    type="file"
                    multiple
                    accept="image/*,.pdf,.doc,.docx,.txt"
                    onChange={handleFileSelect}
                    className="hidden"
                    disabled={creating}
                  />
                </label>
                <span className="text-xs text-slate-500">
                  Images, PDFs, Documents • Max 10MB each
                </span>
              </div>

              {/* Selected Files Preview */}
              {selectedFiles.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-slate-700">Selected Files:</h4>
                  <div className="space-y-2">
                    {selectedFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg">
                        <div className="flex items-center gap-3">
                          {getFileIcon(file.type)}
                          <div>
                            <div className="text-sm font-medium text-slate-900 truncate max-w-48">
                              {file.name}
                            </div>
                            <div className="text-xs text-slate-500">
                              {formatFileSize(file.size)}
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFile(index)}
                          className="p-1 text-red-500 hover:text-red-700 transition-colors"
                          disabled={creating}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 mb-2">Discussion Guidelines</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Keep discussions relevant to the group's focus</li>
              <li>• Be respectful and constructive in your communication</li>
              <li>• Search existing topics before creating duplicates</li>
              <li>• Use clear, descriptive titles to help others find your topic</li>
              <li>• Only upload relevant files (images, PDFs, documents)</li>
            </ul>
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t border-slate-200">
            <button 
              type="button"
              onClick={handleClose}
              disabled={creating}
              className="px-6 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium disabled:opacity-50"
            >
              Cancel
            </button>
            <button 
              type="submit"
              disabled={creating || !title.trim() || !content.trim()}
              className="px-6 py-2 text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: creating || !title.trim() || !content.trim() ? '#FF69B4' : '#FF69B4' }}
              onMouseEnter={(e) => !(creating || !title.trim() || !content.trim()) && (e.currentTarget.style.backgroundColor = '#E91E63')}
              onMouseLeave={(e) => !(creating || !title.trim() || !content.trim()) && (e.currentTarget.style.backgroundColor = '#FF69B4')}
            >
              {creating ? 'Creating Topic...' : `Create Topic${selectedFiles.length > 0 ? ` (${selectedFiles.length} file${selectedFiles.length !== 1 ? 's' : ''})` : ''}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateTopicModal;