import React, { useRef, useState } from 'react';
import { Info } from 'lucide-react';
import CompanyValueInfoPopover from './CompanyValueInfoPopover';

interface CompanyValueCellProps {
  value: string | number;
  /** Tailwind text color class for the value, e.g. "text-red-600" */
  valueClassName?: string;
}

const CompanyValueCell: React.FC<CompanyValueCellProps> = ({ value, valueClassName = 'text-red-600' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const targetRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={targetRef}
      className="bg-slate-50 p-2 rounded-lg text-center cursor-help"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setIsOpen((prev) => !prev);
        }
      }}
      role="button"
      tabIndex={0}
      aria-label="Proposed Company Value — tap for more information"
    >
      <span className={`text-base font-bold ${valueClassName} block`}>{value}</span>
      <span className="text-xs text-slate-600 uppercase tracking-wide mt-1 inline-flex items-center gap-0.5">
        Company Value
        <Info size={11} className="text-slate-400" aria-hidden="true" />
      </span>

      <CompanyValueInfoPopover
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        targetRef={targetRef}
      />
    </div>
  );
};

export default CompanyValueCell;
