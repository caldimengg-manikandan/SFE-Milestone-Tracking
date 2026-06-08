import { useState, useCallback, useRef } from 'react';

export function useAutoSave(delay = 1000) {
  const [saveState, setSaveState] = useState('idle'); // 'idle', 'saving', 'saved', 'error'
  const [lastSaved, setLastSaved] = useState(null);
  
  const timeoutRef = useRef(null);
  const callbackRef = useRef(null);

  const triggerSave = useCallback((saveFn) => {
    setSaveState('saving');
    callbackRef.current = saveFn;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(async () => {
      try {
        if (callbackRef.current) {
          await callbackRef.current();
          setSaveState('saved');
          setLastSaved(new Date());
          
          // Clear "saved" indicator after 3 seconds
          setTimeout(() => {
            setSaveState((prev) => (prev === 'saved' ? 'idle' : prev));
          }, 3000);
        }
      } catch (err) {
        console.error('AutoSave failed:', err);
        setSaveState('error');
      }
    }, delay);
  }, [delay]);

  return { saveState, lastSaved, triggerSave };
}
