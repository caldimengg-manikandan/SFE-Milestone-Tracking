import React, { useState } from 'react';
import { ChevronRight, ChevronLeft, BarChart2 } from 'lucide-react';

export default function CollapsibleRightSidebar({ title, children }) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className={`relative lg:sticky lg:top-28 transition-all duration-350 ease-in-out shrink-0 ${isOpen ? 'w-full lg:w-[340px]' : 'w-[50px]'} h-fit self-start`}>
      {/* Toggle Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="absolute -left-3 top-4 z-40 bg-white border border-slate-200 hover:bg-slate-50 text-amber-500 hover:text-amber-600 w-6 h-6 rounded-full flex items-center justify-center shadow-md transition-colors cursor-pointer"
        title={isOpen ? "Collapse Sidebar" : "Expand Sidebar"}
      >
        {isOpen ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      {isOpen ? (
        <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm space-y-5 overflow-hidden">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <BarChart2 className="text-amber-500 w-4 h-4" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
              {title}
            </h3>
          </div>
          <div className="space-y-4">
            {children}
          </div>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 w-[50px] py-6 rounded-xl shadow-sm flex flex-col items-center gap-4 cursor-pointer hover:bg-slate-50" onClick={() => setIsOpen(true)}>
          <BarChart2 className="text-amber-500 w-4 h-4" />
          <span className="text-[10px] font-mono font-bold tracking-widest text-slate-500 uppercase vertical-text transform rotate-90 whitespace-nowrap mt-8">
            {title}
          </span>
        </div>
      )}
    </div>
  );
}
