import { useState, useCallback, useRef, useEffect } from 'react';

interface UseResizeOptions {
  initialSize: number;
  minSize: number;
  maxSize: number;
  direction: 'left' | 'right'; // which side the handle is on
}

export function useResize({ initialSize, minSize, maxSize, direction }: UseResizeOptions) {
  const [size, setSize] = useState(initialSize);
  const isResizing = useRef(false);
  const startX = useRef(0);
  const startSize = useRef(0);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = true;
    startX.current = e.clientX;
    startSize.current = size;
    document.body.classList.add('resizing-col');
  }, [size]);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isResizing.current) return;
      const delta = e.clientX - startX.current;
      const newSize = direction === 'right'
        ? startSize.current - delta  // right sidebar: drag left = bigger
        : startSize.current + delta; // left sidebar: drag right = bigger
      setSize(Math.max(minSize, Math.min(maxSize, newSize)));
    };

    const onMouseUp = () => {
      if (!isResizing.current) return;
      isResizing.current = false;
      document.body.classList.remove('resizing-col');
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [minSize, maxSize, direction]);

  return { size, setSize, onMouseDown, isResizing: isResizing.current };
}
