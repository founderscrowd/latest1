import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Info, X } from 'lucide-react';

interface CompanyValueInfoPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  targetRef: React.RefObject<HTMLElement | null>;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  onPointerDown?: (e: React.PointerEvent) => void;
}

const POPOVER_WIDTH = 280;
const GAP = 8;

const CompanyValueInfoPopover: React.FC<CompanyValueInfoPopoverProps> = ({
  isOpen,
  onClose,
  targetRef,
  onMouseEnter,
  onMouseLeave,
  onPointerDown,
}) => {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0, arrowLeft: 0, showBelow: true });

  useLayoutEffect(() => {
    if (!isOpen || !targetRef.current) return;

    const target = targetRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const popoverHeight = popoverRef.current?.offsetHeight || 160;

    let left = target.left + target.width / 2 - POPOVER_WIDTH / 2;
    const showBelow = target.bottom + GAP + popoverHeight < viewportHeight - GAP;
    const top = showBelow ? target.bottom + GAP : target.top - popoverHeight - GAP;

    if (left < GAP) left = GAP;
    if (left + POPOVER_WIDTH > viewportWidth - GAP) left = viewportWidth - POPOVER_WIDTH - GAP;

    const arrowLeft = Math.max(12, Math.min(target.left + target.width / 2 - left, POPOVER_WIDTH - 12));

    setPosition({ top, left, arrowLeft, showBelow });
  }, [isOpen, targetRef]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <>
      <div
        className="fixed inset-0"
        style={{ zIndex: 9998 }}
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        onPointerDown={(e) => { e.stopPropagation(); }}
      />

      <div
        ref={popoverRef}
        role="tooltip"
        className="fixed bg-white rounded-lg shadow-xl border border-slate-200"
        style={{
          top: `${position.top}px`,
          left: `${position.left}px`,
          width: `${POPOVER_WIDTH}px`,
          zIndex: 9999,
        }}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        onPointerDown={onPointerDown}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={`absolute w-3 h-3 bg-white border-slate-200 transform rotate-45 ${
            position.showBelow
              ? 'border-l border-t -top-1.5'
              : 'border-r border-b -bottom-1.5'
          }`}
          style={{ left: `${position.arrowLeft - 6}px` }}
        />

        <div className="flex items-center justify-between p-3 border-b border-slate-100">
          <div className="flex items-center gap-1.5">
            <Info size={14} className="text-blue-600" />
            <h4 className="text-sm font-semibold text-slate-900">Proposed Company Value</h4>
          </div>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            onPointerDown={(e) => e.stopPropagation()}
            className="text-slate-400 hover:text-slate-600 transition-colors p-0.5 rounded hover:bg-slate-100"
            aria-label="Close"
          >
            <X size={14} />
          </button>
        </div>

        <div className="p-3">
          <p className="text-xs text-slate-600 leading-relaxed">
            The value assigned to 100% of this business by the group creator. It is used to calculate
            the reference value of equity claims and is not an independently verified valuation.
          </p>
        </div>
      </div>
    </>,
    document.body,
  );
};

export default CompanyValueInfoPopover;
