import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, X, Maximize2 } from 'lucide-react';

interface DescriptionPopoverProps {
  description: string;
  isOpen: boolean;
  onClose: () => void;
  targetRect: DOMRect | null;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  groupName?: string;
  onOpenFullScreen: (description: string, groupName?: string) => void;
}

const DescriptionPopover: React.FC<DescriptionPopoverProps> = ({
  description,
  isOpen,
  onClose,
  targetRect,
  onMouseEnter,
  onMouseLeave,
  groupName,
  onOpenFullScreen
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  const CHARACTER_LIMIT = 150;
  const shouldTruncate = description.length > CHARACTER_LIMIT;
  const displayText = isExpanded || !shouldTruncate 
    ? description 
    : description.slice(0, CHARACTER_LIMIT) + '...';

  const handleFullScreenOpen = () => {
    onOpenFullScreen(description, groupName);
    onClose(); // Close the popover when opening full screen
  };

  useEffect(() => {
    if (targetRect && isOpen) {
      const popoverWidth = 320; // Fixed width for the popover
      const popoverHeight = isExpanded ? 400 : 200; // Estimated heights
      
      // Calculate position relative to the target element
      let left = targetRect.left + (targetRect.width / 2) - (popoverWidth / 2);
      let top = targetRect.bottom + 8; // 8px gap below the target
      
      // Ensure popover stays within viewport bounds
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      // Adjust horizontal position if it goes off-screen
      if (left < 8) {
        left = 8;
      } else if (left + popoverWidth > viewportWidth - 8) {
        left = viewportWidth - popoverWidth - 8;
      }
      
      // Adjust vertical position if it goes off-screen
      if (top + popoverHeight > viewportHeight - 8) {
        top = targetRect.top - popoverHeight - 8; // Show above instead
      }
      
      setPosition({ top, left });
    }
  }, [targetRect, isOpen, isExpanded]);

  if (!isOpen || !targetRect) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-40"
        onClick={onClose}
      />
      
      {/* Popover */}
      <div
        className="fixed z-50 bg-white rounded-lg shadow-xl border border-slate-200 max-w-sm w-80"
        style={{
          top: `${position.top}px`,
          left: `${position.left}px`,
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
          <h3 className="text-lg font-semibold text-slate-900">About This Group</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={handleFullScreenOpen}
              className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded hover:bg-slate-100"
              title="View in full screen"
            >
              <Maximize2 size={16} />
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded hover:bg-slate-100"
            >
              <X size={16} />
            </button>
          </div>
        </div>
        
        {/* Content */}
        <div className="p-4">
          <div className={`text-sm text-slate-700 leading-relaxed ${isExpanded ? 'max-h-64 overflow-y-auto' : ''}`}>
            {displayText}
          </div>
          
          {/* Expand/Collapse Button */}
          {shouldTruncate && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-1 mt-3 text-blue-600 hover:text-blue-700 text-sm font-medium transition-colors"
            >
              {isExpanded ? (
                <>
                  <ChevronUp size={14} />
                  Show Less
                </>
              ) : (
                <>
                  <ChevronDown size={14} />
                  Read More
                </>
              )}
            </button>
          )}
        </div>
        
        {/* Footer */}
        <div className="px-4 py-3 bg-slate-50 rounded-b-lg border-t border-slate-100">
          <p className="text-xs text-slate-500">
            Hover over tabs to see quick previews • Click <Maximize2 size={12} className="inline" /> for full screen
          </p>
        </div>
      </div>
    </>
  );
};

export default DescriptionPopover;