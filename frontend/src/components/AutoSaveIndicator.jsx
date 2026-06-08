import React from 'react';
import { Cloud, CheckCircle, RefreshCw, AlertCircle } from 'lucide-react';

export default function AutoSaveIndicator({ state, lastSaved }) {
  const formatTime = (date) => {
    if (!date) return '';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border bg-slate-50 border-slate-200 dark:bg-slate-900/40 dark:border-slate-800 text-[10px] font-mono tracking-wider uppercase select-none shrink-0 transition-all">
      {state === 'saving' && (
        <>
          <RefreshCw className="w-3 h-3 animate-spin text-amber-500" />
          <span className="text-amber-600 dark:text-amber-400 font-bold">Saving...</span>
        </>
      )}
      {state === 'saved' && (
        <>
          <CheckCircle className="w-3 h-3 text-emerald-500" />
          <span className="text-emerald-600 dark:text-emerald-400 font-bold">Saved</span>
          {lastSaved && <span className="text-slate-450 dark:text-slate-550">at {formatTime(lastSaved)}</span>}
        </>
      )}
      {state === 'error' && (
        <>
          <AlertCircle className="w-3 h-3 text-rose-500" />
          <span className="text-rose-600 dark:text-rose-400 font-bold">Save Failed</span>
        </>
      )}
      {(state === 'idle' || !state) && (
        <>
          <Cloud className="w-3 h-3 text-slate-400 dark:text-slate-500" />
          <span className="text-slate-500 dark:text-slate-400">Sync'd</span>
          {lastSaved && <span className="text-slate-400 dark:text-slate-500">({formatTime(lastSaved)})</span>}
        </>
      )}
    </div>
  );
}
