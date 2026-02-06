import React, { memo, useState } from 'react';

interface PanelShellProps {
  title: string;
  children: React.ReactNode;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  className?: string;
  headerRight?: React.ReactNode;
  noPadding?: boolean;
  maxHeight?: string;
}

const PanelShell: React.FC<PanelShellProps> = ({
  title,
  children,
  collapsible = true,
  defaultCollapsed = false,
  className = '',
  headerRight,
  noPadding = false,
  maxHeight,
}) => {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  return (
    <div className={`pointer-events-auto bg-black/80 backdrop-blur-md border border-white/10 rounded-md shadow-lg overflow-hidden flex flex-col ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-2 py-1 border-b border-white/5 flex-shrink-0 select-none">
        <button
          onClick={() => collapsible && setCollapsed(!collapsed)}
          className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400 hover:text-white transition-colors"
          disabled={!collapsible}
        >
          {collapsible && (
            <svg
              className={`w-2.5 h-2.5 transition-transform duration-150 ${collapsed ? '' : 'rotate-90'}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          )}
          {title}
        </button>
        {headerRight && <div className="flex items-center gap-1">{headerRight}</div>}
      </div>

      {/* Content */}
      {!collapsed && (
        <div
          className={`flex-1 min-h-0 overflow-y-auto custom-scrollbar ${noPadding ? '' : 'p-2'}`}
          style={maxHeight ? { maxHeight } : undefined}
        >
          {children}
        </div>
      )}
    </div>
  );
};

export default memo(PanelShell);
