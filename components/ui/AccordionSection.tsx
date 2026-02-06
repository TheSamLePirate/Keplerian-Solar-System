import React, { memo } from 'react';

interface AccordionSectionProps {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

const AccordionSection: React.FC<AccordionSectionProps> = ({ title, isOpen, onToggle, children }) => {
  return (
    <div className="border-b border-white/5 last:border-b-0">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-500 hover:text-gray-300 transition-colors select-none"
      >
        <span>{title}</span>
        <svg
          className={`w-3 h-3 transition-transform duration-150 ${isOpen ? 'rotate-90' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
      <div
        className="accordion-body"
        style={{ maxHeight: isOpen ? '800px' : '0px', opacity: isOpen ? 1 : 0 }}
      >
        <div className="px-2 pb-2 flex flex-col gap-1.5">
          {children}
        </div>
      </div>
    </div>
  );
};

export default memo(AccordionSection);
