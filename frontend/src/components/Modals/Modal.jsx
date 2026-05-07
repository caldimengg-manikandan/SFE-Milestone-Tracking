import React, { useEffect, useMemo, useRef, useState } from 'react';
import { X } from 'lucide-react';

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const Modal = ({ isOpen, onClose, title, children, size = 'md', className = '', draggable = true }) => {
  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'sm:max-w-md',
    md: 'sm:max-w-2xl',
    lg: 'sm:max-w-4xl',
    xl: 'sm:max-w-6xl',
    full: 'sm:max-w-[95vw]'
  };

  const modalRef = useRef(null);
  const dragStateRef = useRef({ dragging: false, offsetX: 0, offsetY: 0 });
  const [position, setPosition] = useState({ left: 0, top: 0 });

  useEffect(() => {
    if (!draggable) return;
    const el = modalRef.current;
    if (!el) return;

    const setCenteredPosition = () => {
      const rect = el.getBoundingClientRect();
      const padding = 8;
      const maxLeft = Math.max(padding, window.innerWidth - rect.width - padding);
      const maxTop = Math.max(padding, window.innerHeight - rect.height - padding);
      const left = clamp((window.innerWidth - rect.width) / 2, padding, maxLeft);
      const top = clamp((window.innerHeight - rect.height) / 2, padding, maxTop);
      setPosition({ left, top });
    };

    const raf = window.requestAnimationFrame(setCenteredPosition);
    return () => window.cancelAnimationFrame(raf);
  }, [draggable, title, size, className]);

  useEffect(() => {
    if (!draggable) return;

    const handleMove = (e) => {
      const el = modalRef.current;
      if (!el) return;
      if (!dragStateRef.current.dragging) return;

      const rect = el.getBoundingClientRect();
      const minLeft = -rect.width;
      const maxLeft = window.innerWidth;
      const minTop = -rect.height;
      const maxTop = window.innerHeight;
      const left = clamp(e.clientX - dragStateRef.current.offsetX, minLeft, maxLeft);
      const top = clamp(e.clientY - dragStateRef.current.offsetY, minTop, maxTop);
      setPosition({ left, top });
    };

    const handleUp = () => {
      dragStateRef.current.dragging = false;
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };
  }, [draggable]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const isDragBlockedTarget = (target) => {
    if (!target || typeof target.closest !== 'function') return false;
    return !!target.closest('input, textarea, select, button, a, [role="button"], [contenteditable="true"], [data-no-drag="true"]');
  };

  const handleDragPointerDown = (e) => {
    if (!draggable) return;
    if (e.button !== undefined && e.button !== 0) return;
    if (isDragBlockedTarget(e.target)) return;

    const el = modalRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    dragStateRef.current.dragging = true;
    dragStateRef.current.offsetX = e.clientX - rect.left;
    dragStateRef.current.offsetY = e.clientY - rect.top;
  };

  const modalClasses = useMemo(() => {
    const base = `bg-white rounded-lg text-left shadow-xl transition-all max-h-[95vh] overflow-y-auto pointer-events-auto ${sizeClasses[size]} sm:w-full ${className}`;
    if (!draggable) {
      return `inline-block align-middle transform sm:my-4 ${base}`;
    }
    return `fixed transform ${base} w-[calc(100vw-2rem)] sm:w-full`;
  }, [draggable, size, className]);

  return (
    <div className={`fixed inset-0 z-50 overflow-y-auto ${draggable ? 'pointer-events-none' : ''}`}>
      <div className={`flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0 ${draggable ? 'pointer-events-none' : ''}`}>
        {/* Background overlay */}
        <div
          className={`fixed inset-0 transition-opacity ${draggable ? 'bg-gray-900/10 pointer-events-none' : 'bg-gray-500 bg-opacity-75'}`}
          aria-hidden="true"
        ></div>
        
        {/* Center modal vertically */}
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        <div
          ref={modalRef}
          className={modalClasses}
          style={draggable ? { left: position.left, top: position.top } : undefined}
          onPointerDown={handleDragPointerDown}
        >
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div
              className={`flex items-center justify-between mb-4 ${draggable ? 'cursor-move select-none' : ''}`}
              onPointerDown={handleDragPointerDown}
            >
              <h3 className="text-lg font-medium text-gray-900">{title}</h3>
              <button
                onClick={onClose}
                onPointerDown={(e) => e.stopPropagation()}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Modal;
