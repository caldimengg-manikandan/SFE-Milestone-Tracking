import { useState, useEffect, useRef } from 'react'
import { ChevronDown, X } from 'lucide-react'

export default function MultiSelectDropdown({
  options = [],
  value = '',
  onChange,
  placeholder = 'Select options',
  className = '',
  disabled = false,
}) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef(null)

  // Normalize options to ensure they all have { id, label } structure
  const normalizedOptions = options.map((opt) => {
    if (typeof opt === 'string' || typeof opt === 'number') {
      return { id: opt, label: String(opt) }
    }
    return {
      id: opt.id !== undefined ? opt.id : opt.value,
      label: opt.label !== undefined ? opt.label : String(opt.id || opt.value || '')
    }
  })

  // Selected list is a comma-separated string
  const selectedIds = value
    ? value
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : []

  const handleToggle = (optId) => {
    if (disabled) return

    let nextIds
    if (optId === '' || optId === 'None') {
      // Selecting "None" clears all selections
      nextIds = []
    } else {
      // Toggle the selected ID
      if (selectedIds.includes(String(optId))) {
        nextIds = selectedIds.filter((id) => id !== String(optId))
      } else {
        nextIds = [...selectedIds, String(optId)]
      }
    }

    const nextValue = nextIds.join(', ')
    onChange({ target: { value: nextValue } })
  }

  // Click outside logic to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const displayLabel = selectedIds.length > 0 
    ? selectedIds.join(', ') 
    : 'None'

  return (
    <div ref={containerRef} className="relative w-full">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between bg-white border border-gray-300 rounded-md px-3 py-2 text-left text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      >
        <span className="block truncate text-gray-700">
          {displayLabel}
        </span>
        <ChevronDown className="h-4 w-4 text-gray-400 ml-2 flex-shrink-0" />
      </button>

      {isOpen && (
        <div className="absolute z-[999] w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
          <ul className="py-1 text-sm text-gray-700">
            {normalizedOptions.map((opt) => {
              const isSelected = opt.id === '' || opt.id === 'None'
                ? selectedIds.length === 0
                : selectedIds.includes(String(opt.id))

              return (
                <li
                  key={String(opt.id)}
                  onClick={() => handleToggle(opt.id)}
                  className="relative flex items-center px-3 py-2 hover:bg-gray-100 cursor-pointer select-none"
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    readOnly
                    className="h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500 mr-3 pointer-events-none"
                  />
                  <span className={`block truncate ${isSelected ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                    {opt.label}
                  </span>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
