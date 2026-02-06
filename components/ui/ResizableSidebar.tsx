import React, { memo } from 'react';
import { useResize } from '../../hooks/useResize';

interface ResizableSidebarProps {
  side: 'left' | 'right';
  defaultWidth: number;
  minWidth: number;
  maxWidth: number;
  visible: boolean;
  children: React.ReactNode;
}

const ResizableSidebar: React.FC<ResizableSidebarProps> = ({
  side,
  defaultWidth,
  minWidth,
  maxWidth,
  visible,
  children,
}) => {
  const { size: width, onMouseDown } = useResize({
    initialSize: defaultWidth,
    minSize: minWidth,
    maxSize: maxWidth,
    direction: side,
  });

  if (!visible) return null;

  const handle = (
    <div
      onMouseDown={onMouseDown}
      className="w-1 flex-shrink-0 cursor-col-resize group relative"
    >
      <div className="absolute inset-y-0 -left-0.5 -right-0.5 group-hover:bg-blue-500/40 transition-colors duration-150" />
    </div>
  );

  return (
    <div
      className="flex flex-shrink-0 pointer-events-auto h-full"
      style={{ width: `${width}px` }}
    >
      {side === 'right' && handle}
      <div className="flex-1 min-w-0 flex flex-col gap-1 overflow-hidden p-1">
        {children}
      </div>
      {side === 'left' && handle}
    </div>
  );
};

export default memo(ResizableSidebar);
