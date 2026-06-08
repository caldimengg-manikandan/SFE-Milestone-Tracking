import { Calendar } from 'lucide-react';

export default function FormattedDateInput({ value, onChange, readOnly, disabled, className, max, min, placeholder = 'mm-dd-yyyy' }) {
  const getDisplayValue = (val) => {
    if (!val) return '';
    const parts = val.split('-');
    if (parts.length === 3 && parts[0].length === 4) {
      return `${parts[1]}-${parts[2]}-${parts[0]}`;
    }
    return val;
  };

  if (readOnly) {
    return (
      <div className="relative w-full flex items-center">
        <input
          type="text"
          readOnly
          className={`${className} pointer-events-none pr-8`}
          value={getDisplayValue(value)}
        />
        <Calendar className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-60" />
      </div>
    );
  }

  return (
    <div className="relative w-full flex items-center">
      <input
        type="text"
        readOnly
        disabled={disabled}
        placeholder={placeholder}
        className={`${className} pr-8 bg-white disabled:bg-slate-50 disabled:text-slate-400`}
        value={getDisplayValue(value)}
      />
      <Calendar className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
      <input
        type="date"
        value={value || ''}
        onChange={onChange}
        disabled={disabled}
        max={max}
        min={min}
        className="absolute inset-0 opacity-0 cursor-pointer z-10 w-full h-full disabled:cursor-not-allowed"
      />
    </div>
  );
}
