import React from 'react';
import { X, Building } from 'lucide-react';

interface FullScreenDescriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  description: string;
  groupName?: string;
}

const FullScreenDescriptionModal: React.FC<FullScreenDescriptionModalProps> = ({
  isOpen,
  onClose,
  description,
  groupName
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[9999] p-4">
      {/* Modal Container */}
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-purple-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Building size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">About This Group</h2>
              {groupName && (
                <p className="text-sm text-slate-600">{groupName}</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-600"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          <div className="prose prose-slate max-w-none">
            {description ? (
              <div className="text-slate-700 leading-relaxed whitespace-pre-wrap">
                {description}
              </div>
            ) : (
              <div className="text-center py-12">
                <Building size={48} className="text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">No description available for this group.</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default FullScreenDescriptionModal;