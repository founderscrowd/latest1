import React, { useCallback, useRef, useState } from 'react';
import { Info } from 'lucide-react';
import CompanyValueInfoPopover from './CompanyValueInfoPopover';

interface CompanyValueCellProps {
  value: string | number;
  valueClassName?: string;
}

const CLOSE_DELAY_MS = 120;

const CompanyValueCell: React.FC<CompanyValueCellProps> = ({ value, valueClassName = 'text-red-600' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const iconRef = useRef<HTMLButtonElement>(null);
  const closeTimer = useRef<number | undefined>(undefined);

  const clearCloseTimer = useCallback(() => {
    if (closeTimer.current) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = undefined;
    }
  }, []);

  const scheduleClose = useCallback(() => {
    clearCloseTimer();
    closeTimer.current = window.setTimeout(() => setIsOpen(false), CLOSE_DELAY_MS);
  }, [clearCloseTimer]);

  const open = useCallback(() => {
    clearCloseTimer();
    setIsOpen(true);
  }, [clearCloseTimer]);

  const handleIconClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    clearCloseTimer();
    setIsOpen((prev) => !prev);
  }, [clearCloseTimer]);

  const handleIconKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.stopPropagation();
      clearCloseTimer();
      setIsOpen((prev) => !prev);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      setIsOpen(false);
    }
  }, [clearCloseTimer]);

  const stopProp = useCallback((e: React.MouseEvent | React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
  }, []);

  return (
    <div className="bg-slate-50 p-2 rounded-lg text-center">
      <span className={`text-base font-bold ${valueClassName} block`}>{value}</span>
      <span className="text-xs text-slate-600 uppercase tracking-wide mt-1 inline-flex items-center gap-0.5">
        Company Value
        <button
          ref={iconRef}
          type="button"
          className="inline-flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors align-middle"
          aria-label="About Company Value"
          onMouseEnter={open}
          onMouseLeave={scheduleClose}
          onFocus={open}
          onBlur={scheduleClose}
          onClick={handleIconClick}
          onKeyDown={handleIconKeyDown}
          onPointerDown={stopProp}
          onMouseDown={stopProp}
          style={{ lineHeight: 0 }}
        >
          <Info size={11} aria-hidden="true" />
        </button>
      </span>

      <CompanyValueInfoPopover
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        targetRef={iconRef}
        onMouseEnter={open}
        onMouseLeave={scheduleClose}
        onPointerDown={stopProp}
      />
    </div>
  );
};

export default CompanyValueCell;
