import React, { useState } from 'react';

const FloatingInput = ({ 
  label, 
  value, 
  onChange, 
  error, 
  type = 'text', 
  name, 
  required = false, 
  options = [], 
  additionalElements,
  compact = false,
  allowEmptyOption = false,
  ...props 
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const isMultiSelect = type === 'select' && props?.multiple === true;
  const isCheckboxGroup = type === 'checkbox-group';
  const normalizedSelectValue = isMultiSelect
    ? Array.isArray(value)
      ? value
      : value
        ? [value]
        : []
    : (value ?? '');
  const normalizedCheckboxValue = isCheckboxGroup
    ? Array.isArray(value)
      ? value
      : value
        ? [value]
        : []
    : [];
  const safeValue = isMultiSelect ? normalizedSelectValue : isCheckboxGroup ? normalizedCheckboxValue : (value ?? '');
  const hasValue = (isMultiSelect || isCheckboxGroup)
    ? Array.isArray(safeValue) && safeValue.length > 0
    : (safeValue && safeValue.toString().length > 0);
  const isActive = isFocused || hasValue || type === 'date' || type === 'datetime-local';

  // Compact styles
  const paddingClass = compact ? 'px-2 pt-2.5 pb-1' : 'px-3 pt-4 pb-2';
  const textSize = compact ? 'text-xs' : 'text-sm';
  const labelTopPosition = compact ? 'top-2' : 'top-3';
  
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const getInputType = () => {
    if (type === 'password') {
      return showPassword ? 'text' : 'password';
    }
    return type;
  };

  const { className: controlClassName, onBlur: externalOnBlur, onFocus: externalOnFocus, ...restProps } = props || {};

  return (
    <div className={`relative ${compact ? 'mb-2' : 'mb-3'}`}>
      {type === 'checkbox-group' ? (
        <div>
          <div className={`mb-1 ${compact ? 'text-xs' : 'text-sm'} font-medium text-gray-700`}>
            {label} {required && <span className="text-red-500">*</span>}
          </div>
          <div
            className={`w-full rounded border bg-white p-2
              ${error ? 'border-red-500' : 'border-gray-300'}
              ${controlClassName || ''}`}
          >
            <div className="flex flex-col gap-2">
              {options.map((option, index) => {
                const maxSelections = Number.isFinite(props?.maxSelections) ? props.maxSelections : undefined;
                const selectedValues = Array.isArray(normalizedCheckboxValue) ? normalizedCheckboxValue : [];
                const isChecked = selectedValues.includes(option.value);
                const isAtLimit = maxSelections !== undefined && selectedValues.length >= maxSelections;
                const isDisabled = !isChecked && isAtLimit;

                return (
                  <label
                    key={option.key || `${option.value}-${index}`}
                    htmlFor={`${name}-${option.value}`}
                    className={`flex items-center gap-2 ${compact ? 'text-xs' : 'text-sm'} text-gray-900 ${isDisabled ? 'opacity-50' : ''}`}
                  >
                    <input
                      id={`${name}-${option.value}`}
                      type="checkbox"
                      name={name}
                      value={option.value}
                      checked={isChecked}
                      disabled={isDisabled}
                      onChange={() => {
                        const next = isChecked
                          ? selectedValues.filter((v) => v !== option.value)
                          : [...selectedValues, option.value];

                        const limited = maxSelections !== undefined ? next.slice(0, maxSelections) : next;

                        onChange?.({
                          target: {
                            name,
                            value: limited
                          }
                        });
                      }}
                      className="h-4 w-4 accent-[#163832]"
                    />
                    <span>{option.label}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      ) : type === 'select' ? (
        <div className="relative">
          <select
            id={name}
            name={name}
            value={normalizedSelectValue}
            onChange={onChange}
            onFocus={(e) => {
              setIsFocused(true);
              externalOnFocus?.(e);
            }}
            onBlur={(e) => {
              setIsFocused(false);
              externalOnBlur?.(e);
            }}
            className={`block w-full ${paddingClass} ${textSize} text-gray-900 pr-8
              bg-white rounded border appearance-none cursor-pointer
              ${error ? 'border-red-500' : isFocused ? 'border-amber-500' : 'border-gray-300'}
              focus:outline-none focus:border-amber-500 transition-colors duration-200 ${controlClassName || ''}`}
            {...restProps}
          >
            {!isMultiSelect && !allowEmptyOption && <option value="" disabled hidden></option>}
            {!isMultiSelect && value && !options.some(opt => opt.value === value) && (
              <option key={value} value={value}>
                {value}
              </option>
            )}
            {options.map((option, index) => (
              <option key={option.key || `${option.value}-${index}`} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          
          <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
            <svg 
              className={`w-3.5 h-3.5 text-amber-500 transition-transform duration-200 ${isFocused ? 'rotate-180' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
          
          <label
            htmlFor={name}
            className={`absolute left-2.5 transition-all duration-200 pointer-events-none bg-white px-1 z-10
              ${isActive 
                ? 'top-0 text-xs text-amber-500 font-medium transform -translate-y-1/2' 
                : `${labelTopPosition} text-sm text-gray-500`
              }`}
          >
            {label} {required && <span className="text-red-500">*</span>}
          </label>
        </div>
      ) 

      /* --- TEXTAREA --- */
      : type === 'textarea' ? (
        <div className="relative">
          <textarea
            id={name}
            name={name}
            value={value ?? ''}
            onChange={onChange}
            onFocus={(e) => {
              setIsFocused(true);
              externalOnFocus?.(e);
            }}
            onBlur={(e) => {
              setIsFocused(false);
              externalOnBlur?.(e);
            }}
            rows={2}
            className={`block w-full ${paddingClass} ${textSize} text-gray-900 
              bg-white rounded border resize-none
              ${error ? 'border-red-500' : isFocused ? 'border-amber-500' : 'border-gray-300'} 
              focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors duration-200 ${controlClassName || ''}`}
            {...restProps}
          />
          <label
            htmlFor={name}
            className={`absolute left-2.5 transition-all duration-200 pointer-events-none bg-white px-1
              ${isActive 
                ? 'top-0 text-xs text-amber-500 font-medium transform -translate-y-1/2' 
                : `${labelTopPosition} text-sm text-gray-500`
              }`}
          >
            {label} {required && <span className="text-red-500">*</span>}
          </label>
        </div>
      ) 

      /* --- INPUT (DEFAULT) --- */
      : (
        <div className="relative">
          <input
            id={name}
            type={getInputType()}
            name={name}
            value={value ?? ''}
            onChange={onChange}
            onFocus={(e) => {
              setIsFocused(true);
              externalOnFocus?.(e);
            }}
            onBlur={(e) => {
              setIsFocused(false);
              externalOnBlur?.(e);
            }}
            onWheel={(e) => type === 'number' && e.target.blur()}
            className={`block w-full ${paddingClass} ${textSize} text-gray-900 
              bg-white rounded border
              ${type === 'date' ? 'pr-8' : 
                type === 'password' ? 'pr-10' : 
                additionalElements ? 'pr-24' : ''}
              ${error ? 'border-red-500' : isFocused ? 'border-amber-500' : 'border-gray-300'} 
              focus:outline-none focus:border-amber-500 transition-all duration-200 ${controlClassName || ''}`}
            {...restProps}
          />

          {additionalElements && (
            <div className="absolute inset-y-0 right-0 flex items-center pr-2">
              {additionalElements}
            </div>
          )}
          
          <label
            htmlFor={name}
            className={`absolute left-2.5 transition-all duration-200 pointer-events-none bg-white px-1 z-10
              ${isActive || type === 'date' || type === 'password' || additionalElements
                ? 'top-0 text-xs text-amber-500 font-medium transform -translate-y-1/2' 
                : `${labelTopPosition} text-sm text-gray-500`
              }`}
          >
            {label} {required && <span className="text-red-500">*</span>}
          </label>

          {type === 'password' && !additionalElements && (
            <button
              type="button"
              onClick={togglePasswordVisibility}
              className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600 focus:outline-none transition-colors duration-200"
            >
              {showPassword ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
              )}
            </button>
          )}
        </div>
      )}

      {/* --- ERROR MESSAGE --- */}
      {error && (
        <div className="mt-1 flex items-start">
          <svg className="w-3.5 h-3.5 mt-0.5 mr-1 text-red-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path 
              fillRule="evenodd" 
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 
                 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 
                 0 00-1-1z" 
              clipRule="evenodd" 
            />
          </svg>
          <p className="text-xs text-red-600">{error}</p>
        </div>
      )}
    </div>
  );
};

export default FloatingInput;
export { FloatingInput };
