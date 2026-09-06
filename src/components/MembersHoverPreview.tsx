import React, { useState, useEffect } from 'react';
import { Users, Crown, ArrowRight } from 'lucide-react';

interface GroupMember {
  id: string;
  user_id: string;
  role: 'admin' | 'member' | 'cofounder' | 'pending' | 'starter';
  status: 'approved' | 'pending';
  joined_at: string;
  profile: {
    username: string;
    avatar_url?: string;
  };
  subscription_active?: boolean;
}

interface MembersHoverPreviewProps {
  members: GroupMember[];
  isOpen: boolean;
  onClose: () => void;
  onSeeAll: () => void;
  targetRect: DOMRect | null;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

const MembersHoverPreview: React.FC<MembersHoverPreviewProps> = ({
  members,
  isOpen,
  onClose,
  onSeeAll,
  targetRect,
  onMouseEnter,
  onMouseLeave
}) => {
  const [position, setPosition] = useState({ top: 0, left: 0 });

  const PREVIEW_LIMIT = 5;
  const previewMembers = members.slice(0, PREVIEW_LIMIT);
  const hasMoreMembers = members.length > PREVIEW_LIMIT;

  useEffect(() => {
    if (targetRect && isOpen) {
      const modalWidth = 280;
      const modalHeight = Math.min(400, (previewMembers.length * 60) + 120);
      
      // Calculate position relative to the target element
      let left = targetRect.left + (targetRect.width / 2) - (modalWidth / 2);
      let top = targetRect.bottom + 8; // 8px gap below the target
      
      // Ensure modal stays within viewport bounds
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      // Adjust horizontal position if it goes off-screen
      if (left < 8) {
        left = 8;
      } else if (left + modalWidth > viewportWidth - 8) {
        left = viewportWidth - modalWidth - 8;
      }
      
      // Adjust vertical position if it goes off-screen
      if (top + modalHeight > viewportHeight - 8) {
        top = targetRect.top - modalHeight - 8; // Show above instead
      }
      
      setPosition({ top, left });
    }
  }, [targetRect, isOpen, previewMembers.length]);

  if (!isOpen || !targetRect) return null;

  const handleSeeAllClick = () => {
    onSeeAll();
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-40"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div
        className="fixed z-50 bg-white rounded-lg shadow-xl border border-slate-200 w-70"
        style={{
          top: `${position.top}px`,
          left: `${position.left}px`,
          width: '280px'
        }}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        {/* Arrow pointing to the target */}
        <div 
          className="absolute w-3 h-3 bg-white border-l border-t border-slate-200 transform rotate-45 -top-1.5"
          style={{
            left: targetRect ? `${targetRect.left + (targetRect.width / 2) - position.left - 6}px` : '50%'
          }}
        />
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Users size={18} className="text-blue-600" />
            <h3 className="text-lg font-semibold text-slate-900">
              Members ({members.length})
            </h3>
          </div>
        </div>
        
        {/* Members List */}
        <div className="p-2 max-h-64 overflow-y-auto">
          {previewMembers.length === 0 ? (
            <div className="text-center py-6">
              <Users size={32} className="text-slate-300 mx-auto mb-2" />
              <p className="text-slate-500 text-sm">No members found</p>
            </div>
          ) : (
            <div className="space-y-1">
              {previewMembers.map((member) => (
                <div key={member.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors">
                  <div className="relative w-8 h-8">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                      <span className="text-white font-semibold text-sm">
                        {member.profile?.username?.charAt(0)?.toUpperCase() || 'M'}
                      </span>
                    </div>
                    {(member.role === 'admin' || member.role === 'starter') && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-500 rounded-full flex items-center justify-center">
                        <Crown size={8} className="text-white" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-slate-900 text-sm truncate">
                      {member.profile?.username || 'Anonymous'}
                    </h4>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-slate-600 capitalize">
                        {member.role === 'starter' ? 'Starter' : member.role}
                      </span>
                      {member.subscription_active === false && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-200 text-slate-600">
                          Inactive
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Footer */}
        {hasMoreMembers && (
          <div className="px-4 py-3 bg-slate-50 rounded-b-lg border-t border-slate-100">
            <button
              onClick={handleSeeAllClick}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              See all {members.length} members
              <ArrowRight size={14} />
            </button>
          </div>
        )}
        
        {!hasMoreMembers && previewMembers.length > 0 && (
          <div className="px-4 py-3 bg-slate-50 rounded-b-lg border-t border-slate-100">
            <p className="text-xs text-slate-500 text-center">
              All members shown
            </p>
          </div>
        )}
      </div>
    </>
  );
};

export default MembersHoverPreview;