import { useState, useEffect, useRef } from 'react';
import { ChevronDown, X, Loader2 } from 'lucide-react';

export default function SearchableDropdown({
  options = [],
  value,
  onChange,
  placeholder = '-- Select --',
  className = '',
  containerClassName = 'w-full',
  loading = false,
  disabled = false,
  name = '',
  required = false
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [userHasTyped, setUserHasTyped] = useState(false);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  // Normalize options to ensure they all have { id, label } structure
  const normalizedOptions = options.map((opt) => {
    if (typeof opt === 'string' || typeof opt === 'number') {
      return { id: opt, label: String(opt) };
    }
    return {
      id: opt.id !== undefined ? opt.id : opt.value,
      label: opt.label !== undefined ? opt.label : String(opt.id || opt.value || '')
    };
  });

  const selectedOption = normalizedOptions.find((opt) => String(opt.id) === String(value));

  // Update searchTerm when selected value changes
  useEffect(() => {
    if (selectedOption) {
      setSearchTerm(selectedOption.label);
    } else {
      setSearchTerm('');
    }
    setUserHasTyped(false);
  }, [value, selectedOption]);

  useEffect(() => {
    if (!isOpen) {
      setUserHasTyped(false);
    }
  }, [isOpen]);

  const filteredOptions = normalizedOptions.filter((opt) => {
    if (!userHasTyped) return true;
    return (opt.label || '').toLowerCase().includes(searchTerm.toLowerCase());
  });

  // Reset highlighted index when options filter changes
  useEffect(() => {
    setHighlightedIndex(-1);
  }, [searchTerm]);

  const handleSelect = (opt) => {
    if (disabled) return;
    onChange({ target: { value: opt.id, name } });
    setSearchTerm(opt.label);
    setIsOpen(false);
    if (inputRef.current) {
      inputRef.current.blur();
    }
  };

  const handleClear = (e) => {
    e.stopPropagation();
    if (disabled) return;
    onChange({ target: { value: '', name } });
    setSearchTerm('');
    setIsOpen(false);
    setUserHasTyped(false);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  // Keyboard navigation & click outside logic
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
        if (selectedOption) {
          setSearchTerm(selectedOption.label);
        } else {
          setSearchTerm('');
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectedOption]);

  const handleKeyDown = (e) => {
    if (disabled) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else {
        setHighlightedIndex((prev) =>
          prev < filteredOptions.length - 1 ? prev + 1 : 0
        );
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (isOpen) {
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : filteredOptions.length - 1
        );
      }
    } else if (e.key === 'Enter') {
      if (isOpen) {
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
          handleSelect(filteredOptions[highlightedIndex]);
        } else if (filteredOptions.length > 0) {
          handleSelect(filteredOptions[0]);
        }
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      if (selectedOption) {
        setSearchTerm(selectedOption.label);
      } else {
        setSearchTerm('');
      }
      if (inputRef.current) {
        inputRef.current.blur();
      }
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative searchable-dropdown-container ${containerClassName}`}
    >
      <div className="relative flex items-center">
        <input
          ref={inputRef}
          type="text"
          name={name}
          required={required && !value}
          disabled={disabled}
          placeholder={placeholder}
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setIsOpen(true);
            setUserHasTyped(true);
            if (e.target.value === '') {
              onChange({ target: { value: '', name } });
            }
          }}
          onFocus={() => {
            if (!disabled) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          className={`w-full pr-16 outline-none transition-all duration-200 ${
            isOpen
              ? 'border-amber-400 ring-4 ring-amber-500/5 bg-white'
              : 'border-slate-200 bg-white'
          } ${className}`}
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-slate-400">
          {value && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600 focus:outline-none transition-colors"
              title="Clear selection"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            disabled={disabled}
            onClick={(e) => {
              e.stopPropagation();
              if (!disabled) {
                if (isOpen) {
                  inputRef.current?.blur();
                  setIsOpen(false);
                } else {
                  inputRef.current?.focus();
                  setIsOpen(true);
                }
              }
            }}
            className="p-1 hover:bg-slate-50 rounded focus:outline-none text-slate-400 transition-colors"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ChevronDown
                className={`w-4 h-4 transition-transform duration-200 ${
                  isOpen ? 'rotate-180 text-amber-500' : ''
                }`}
              />
            )}
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-2 max-h-60 overflow-y-auto bg-slate-50/95 border border-slate-200/60 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.08)] backdrop-blur-sm dropdown-scrollbar py-1.5 flex flex-col gap-1">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((opt, index) => {
              const isSelected = String(opt.id) === String(value);
              const isHighlighted = index === highlightedIndex;
              return (
                <button
                  key={`${opt.id}-${index}`}
                  type="button"
                  onClick={() => handleSelect(opt)}
                  className={`text-left px-4 py-3 mx-2 rounded-xl text-xs font-bold transition-all duration-150 border outline-none ${
                    isSelected
                      ? 'bg-amber-100/90 text-amber-800 border-amber-200/80 shadow-sm'
                      : isHighlighted
                      ? 'bg-amber-50 text-amber-700 border-amber-100 hover:scale-[1.01]'
                      : 'bg-white text-slate-700 border-slate-100/40 hover:bg-slate-100/70 hover:text-slate-800 shadow-[0_1px_2px_rgba(0,0,0,0.02)] hover:scale-[1.01]'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })
          ) : (
            <div className="px-4 py-4 text-xs text-slate-400 italic text-center bg-white mx-2 rounded-xl border border-slate-100/40">
              No matching options found
            </div>
          )}
        </div>
      )}
    </div>
  );
}
