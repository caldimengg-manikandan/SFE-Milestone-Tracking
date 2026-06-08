import React, { useState, useRef, useEffect } from 'react';
import { Trash, ChevronDown } from 'lucide-react';

export default function UnitCombobox({ 
  value, 
  onChange, 
  standardUnits, 
  customUnits, 
  onAddCustomUnit, 
  onRemoveCustomUnit,
  disabled
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!isTyping) {
      setInputValue(value || "pc");
    }
  }, [value, isTyping]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        if (isOpen) setIsOpen(false);
        if (isTyping) {
          handleBlurOrEnter();
        }
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, isTyping, inputValue]);

  const handleBlurOrEnter = () => {
    const trimmed = inputValue.trim().toLowerCase();
    setIsTyping(false);
    setIsOpen(false);
    
    if (!trimmed || trimmed === "other") {
      setInputValue(value || "pc");
      onChange(value || "pc");
    } else {
      if (!standardUnits.includes(trimmed) && !customUnits.includes(trimmed)) {
        onAddCustomUnit(trimmed);
      }
      onChange(trimmed);
    }
  };

  const handleSelect = (unit) => {
    if (unit === 'other') {
      setIsTyping(true);
      setInputValue("");
      setIsOpen(false);
      setTimeout(() => inputRef.current?.focus(), 0);
    } else {
      setInputValue(unit);
      setIsTyping(false);
      setIsOpen(false);
      onChange(unit);
    }
  };

  const displayValue = isTyping ? inputValue : (value || "pc").toUpperCase();

  return (
    <div className="relative w-20 sm:w-24" ref={containerRef}>
      <div 
        className={`flex items-center justify-between bg-slate-950/30 border border-slate-800/80 rounded px-2 py-0.5 text-xs transition-all font-mono ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-text focus-within:border-primary hover:border-slate-600'}`}
        onClick={() => {
          if (!disabled) {
            if (!isTyping) {
              setInputValue(value === "pc" ? "" : value);
            }
            setIsTyping(true);
            setIsOpen(true);
            setTimeout(() => inputRef.current?.focus(), 0);
          }
        }}
      >
        <input 
          ref={inputRef}
          type="text"
          className="bg-transparent outline-none w-full text-white placeholder-slate-500 uppercase"
          value={displayValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setIsTyping(true);
            if (!isOpen) setIsOpen(true);
          }}
          disabled={disabled}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleBlurOrEnter();
            if (e.key === 'Escape') {
              setInputValue(value || "pc");
              setIsTyping(false);
              setIsOpen(false);
            }
          }}
        />
        <button 
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (!disabled) {
              if (isOpen) {
                setIsOpen(false);
              } else {
                setIsOpen(true);
                inputRef.current?.focus();
              }
            }
          }}
          className="text-slate-400 hover:text-white shrink-0 ml-1"
          tabIndex={-1}
        >
          <ChevronDown size={12} />
        </button>
      </div>

      {isOpen && !disabled && (
        <div className="absolute right-0 z-[100] w-32 mt-1 bg-slate-900 border border-slate-700 rounded shadow-lg overflow-hidden flex flex-col">
          <ul className="max-h-48 overflow-y-auto py-1">
            {standardUnits.map(u => (
              <li 
                key={u} 
                className="px-3 py-1.5 text-xs text-white hover:bg-primary/20 cursor-pointer font-mono uppercase"
                onClick={() => handleSelect(u)}
              >
                {u}
              </li>
            ))}
            {customUnits.map(u => (
              <li 
                key={u} 
                className="px-3 py-1.5 text-xs text-white hover:bg-primary/20 cursor-pointer font-mono uppercase flex justify-between items-center group"
                onClick={() => handleSelect(u)}
              >
                <span>{u}</span>
                <button
                  type="button"
                  className="text-slate-500 opacity-0 group-hover:opacity-100 hover:text-red-400 transition-all p-0.5 rounded hover:bg-red-500/20"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveCustomUnit(u);
                  }}
                  title="Remove custom unit"
                >
                  <Trash size={12} />
                </button>
              </li>
            ))}
            {(!standardUnits.includes(value?.toLowerCase()) && !customUnits.includes(value?.toLowerCase()) && value && value !== "other") && (
               <li 
                 className="px-3 py-1.5 text-xs text-white hover:bg-primary/20 cursor-pointer font-mono uppercase"
                 onClick={() => handleSelect(value)}
               >
                 {value}
               </li>
            )}
            <li 
              className="px-3 py-1.5 text-xs text-slate-400 hover:bg-primary/20 cursor-pointer font-sans italic border-t border-slate-800/80 mt-1"
              onClick={() => handleSelect('other')}
            >
              Other (Type to add)...
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}
