/**
 * Shared formatting utilities
 */

export function formatCurrency(value, compact = false) {
  if (value === null || value === undefined) return '—'
  const n = parseFloat(value)
  if (isNaN(n)) return '—'
  if (compact && Math.abs(n) >= 1_000_000) {
    return `$${(n / 1_000_000).toFixed(2)}M`
  }
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
}

export function formatDate(value) {
  if (!value) return '—'
  try {
    const d = new Date(value + 'T00:00:00')
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return value
  }
}

export function formatNumber(value, decimals = 2) {
  if (value === null || value === undefined) return '—'
  const n = parseFloat(value)
  if (isNaN(n)) return '—'
  return n.toLocaleString('en-US', { maximumFractionDigits: decimals })
}

export function formatPercent(value) {
  if (value === null || value === undefined) return '—'
  return `${parseFloat(value).toFixed(1)}%`
}

export function formatMonth(dateStr) {
  if (!dateStr) return '—'
  try {
    const d = new Date(dateStr + 'T00:00:00')
    return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
  } catch {
    return dateStr
  }
}
