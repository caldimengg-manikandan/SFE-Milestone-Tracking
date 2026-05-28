import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { dashboardAPI } from '../../api/client'
import { formatCurrency, formatDate } from '../../utils/formatters'
import { Filter, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'

const currentYear = new Date().getFullYear()
const years = Array.from({ length: 5 }, (_, i) => currentYear - i)

function DayCell({ value, threshold }) {
  if (value === null || value === undefined) return <span style={{ color: 'var(--text-muted)' }}>—</span>
  const color = value > (threshold || 365)
    ? 'var(--danger)'
    : value > (threshold / 2 || 180)
    ? 'var(--warning)'
    : 'var(--text-primary)'
  return <span className="mono" style={{ color }}>{value}</span>
}

export default function SalesCyclePage() {
  const [yearFilter, setYearFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)

  const { data, isLoading } = useQuery({
    queryKey: ['sales-cycle', yearFilter],
    queryFn: () => dashboardAPI.salesCycle(yearFilter !== 'all' ? yearFilter : null).then(r => r.data),
  })

  const rows = data?.data || []

  // Summary stats (always computed over the entire unfiltered year dataset for accuracy)
  const avg = (field) => {
    const vals = rows.map(r => r[field]).filter(v => v !== null && v !== undefined)
    return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null
  }

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize))
  const startIndex = (currentPage - 1) * pageSize
  const paginatedRows = rows.slice(startIndex, startIndex + pageSize)

  if (isLoading) return <div className="loading-overlay">Loading Sales Cycle Data…</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 56px - 32px)', gap: 16, animation: 'fadeIn 250ms ease' }}>
      <div className="page-header" style={{ marginBottom: 0, paddingBottom: 12 }}>
        <div>
          <div className="page-subtitle">Milestone Day-Counts per Awarded Job</div>
        </div>
      </div>

      {/* KPI Averages */}
      <div className="kpi-grid" style={{ marginBottom: 0 }}>
        {[
          { label: 'Avg Days: Quote → Award', val: avg('days_quote_to_awarded') },
          { label: 'Avg Days: Quote → Contract', val: avg('days_quote_to_contract') },
          { label: 'Avg Days: Quote → Fab Start', val: avg('days_quote_to_fab_start') },
          { label: 'Avg Days: Award → Fab Start', val: avg('days_awarded_to_fab') },
        ].map(({ label, val }) => (
          <div key={label} className="kpi-card" style={{ padding: '12px var(--space-lg)' }}>
            <div className="kpi-label" style={{ marginBottom: 4 }}>{label}</div>
            <div className="kpi-value" style={{ fontSize: '1.4rem' }}>{val !== null ? `${val}d` : '—'}</div>
          </div>
        ))}
      </div>

      {/* Filter Toolbar */}
      <div className="toolbar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Filter style={{ width: 14, height: 14, color: 'var(--text-muted)' }} />
          <span style={{ fontFamily: 'var(--font-head)', fontSize: '0.72rem', color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            Award Year:
          </span>
          <select
            className="form-select"
            style={{ width: 120, padding: '4px 8px', fontSize: '0.78rem', height: 32, cursor: 'pointer' }}
            value={yearFilter}
            onChange={(e) => {
              setYearFilter(e.target.value)
              setCurrentPage(1)
            }}
          >
            <option value="all">All Years</option>
            {years.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          {rows.length} jobs total
        </span>
      </div>

      {/* Table & Pagination Card */}
      <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Table wrapper stretches to fill the card height and enables sticky header scrolling */}
        <div className="dash-table-wrapper" style={{ flex: 1, overflowY: 'auto', borderBottomLeftRadius: 0, borderBottomRightRadius: 0, borderBottom: 'none' }}>
          <table className="dash-table" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
            <thead>
              <tr>
                <th style={{ position: 'sticky', top: 0, background: 'var(--grid-header-bg)', zIndex: 10, textAlign: 'left', borderBottom: '1px solid var(--border-default)' }}>SFE Job #</th>
                <th style={{ position: 'sticky', top: 0, background: 'var(--grid-header-bg)', zIndex: 10, textAlign: 'left', borderBottom: '1px solid var(--border-default)' }}>Quote No</th>
                <th style={{ position: 'sticky', top: 0, background: 'var(--grid-header-bg)', zIndex: 10, textAlign: 'left', borderBottom: '1px solid var(--border-default)' }}>Project</th>
                <th style={{ position: 'sticky', top: 0, background: 'var(--grid-header-bg)', zIndex: 10, borderBottom: '1px solid var(--border-default)' }}>Quote Date</th>
                <th style={{ position: 'sticky', top: 0, background: 'var(--grid-header-bg)', zIndex: 10, borderBottom: '1px solid var(--border-default)' }}>Award Date</th>
                <th style={{ position: 'sticky', top: 0, background: 'var(--grid-header-bg)', zIndex: 10, borderBottom: '1px solid var(--border-default)' }}>Contract Date</th>
                <th style={{ position: 'sticky', top: 0, background: 'var(--grid-header-bg)', zIndex: 10, borderBottom: '1px solid var(--border-default)' }}>Fab Start</th>
                <th style={{ position: 'sticky', top: 0, background: 'var(--grid-header-bg)', zIndex: 10, borderBottom: '1px solid var(--border-default)' }}>Days Q→Award</th>
                <th style={{ position: 'sticky', top: 0, background: 'var(--grid-header-bg)', zIndex: 10, borderBottom: '1px solid var(--border-default)' }}>Days Q→Contract</th>
                <th style={{ position: 'sticky', top: 0, background: 'var(--grid-header-bg)', zIndex: 10, borderBottom: '1px solid var(--border-default)' }}>Days Q→Fab</th>
                <th style={{ position: 'sticky', top: 0, background: 'var(--grid-header-bg)', zIndex: 10, borderBottom: '1px solid var(--border-default)' }}>Days Awd→Fab</th>
                <th style={{ position: 'sticky', top: 0, background: 'var(--grid-header-bg)', zIndex: 10, borderBottom: '1px solid var(--border-default)' }}>Bid $</th>
                <th style={{ position: 'sticky', top: 0, background: 'var(--grid-header-bg)', zIndex: 10, borderBottom: '1px solid var(--border-default)' }}>Awarded $</th>
              </tr>
            </thead>
            <tbody>
              {paginatedRows.length === 0 ? (
                <tr>
                  <td colSpan={13} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>
                    No awarded jobs found for the selected period
                  </td>
                </tr>
              ) : paginatedRows.map(r => (
                <tr key={r.sfe_job_no}>
                  <td style={{ textAlign: 'left', fontFamily: 'var(--font-mono)', color: 'var(--primary)', borderBottom: '1px solid var(--border-subtle)' }}>
                    {r.sfe_job_no}
                  </td>
                  <td style={{ textAlign: 'left', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', borderBottom: '1px solid var(--border-subtle)' }}>
                    {r.quote_no}
                  </td>
                  <td style={{ textAlign: 'left', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', borderBottom: '1px solid var(--border-subtle)' }}>
                    {r.project_name}
                  </td>
                  <td style={{ borderBottom: '1px solid var(--border-subtle)' }}>{formatDate(r.date_of_first_quote)}</td>
                  <td style={{ borderBottom: '1px solid var(--border-subtle)' }}>{formatDate(r.awarded_job_date)}</td>
                  <td style={{ borderBottom: '1px solid var(--border-subtle)' }}>{formatDate(r.contract_executed_date)}</td>
                  <td style={{ borderBottom: '1px solid var(--border-subtle)' }}>{formatDate(r.fabrication_start_date)}</td>
                  <td style={{ borderBottom: '1px solid var(--border-subtle)' }}><DayCell value={r.days_quote_to_awarded} threshold={365} /></td>
                  <td style={{ borderBottom: '1px solid var(--border-subtle)' }}><DayCell value={r.days_quote_to_contract} threshold={400} /></td>
                  <td style={{ borderBottom: '1px solid var(--border-subtle)' }}><DayCell value={r.days_quote_to_fab_start} threshold={500} /></td>
                  <td style={{ borderBottom: '1px solid var(--border-subtle)' }}><DayCell value={r.days_awarded_to_fab} threshold={180} /></td>
                  <td className="mono" style={{ borderBottom: '1px solid var(--border-subtle)' }}>{r.bid_amount ? formatCurrency(r.bid_amount) : '—'}</td>
                  <td className="mono" style={{ color: 'var(--success)', borderBottom: '1px solid var(--border-subtle)' }}>
                    {r.awarded_amount ? formatCurrency(r.awarded_amount) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* AG Grid Style Premium Pagination Panel */}
        <div style={{
          height: 48,
          borderTop: '1px solid var(--border-default)',
          padding: '0 16px',
          fontFamily: 'var(--font-ui)',
          fontSize: '13px',
          color: 'var(--text-secondary)',
          background: 'var(--bg-surface)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: 24,
          borderBottomLeftRadius: 'var(--radius-lg)',
          borderBottomRightRadius: 'var(--radius-lg)',
        }}>
          {/* Page size select */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>Page Size:</span>
            <select
              className="form-select"
              style={{
                width: 65,
                padding: '2px 6px',
                fontSize: '0.78rem',
                height: 26,
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-default)',
                color: 'var(--text-primary)',
                borderRadius: 4,
                cursor: 'pointer'
              }}
              value={pageSize}
              onChange={e => {
                setPageSize(Number(e.target.value))
                setCurrentPage(1)
              }}
            >
              {[10, 25, 50, 100].map(sz => <option key={sz} value={sz}>{sz}</option>)}
            </select>
          </div>

          {/* Record range */}
          <span>
            {rows.length > 0 ? startIndex + 1 : 0} to {Math.min(startIndex + pageSize, rows.length)} of {rows.length.toLocaleString()}
          </span>

          {/* Navigation Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ display: 'flex', gap: 2 }}>
              <button
                className="btn btn-secondary btn-sm"
                style={{ padding: 0, height: 24, width: 24, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(1)}
                title="First Page"
              >
                <ChevronsLeft style={{ width: 14, height: 14 }} />
              </button>
              <button
                className="btn btn-secondary btn-sm"
                style={{ padding: 0, height: 24, width: 24, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => p - 1)}
                title="Previous Page"
              >
                <ChevronLeft style={{ width: 14, height: 14 }} />
              </button>
            </div>

            <span className="mono" style={{ alignSelf: 'center', fontWeight: 600, fontSize: '0.78rem' }}>
              Page {currentPage} of {totalPages}
            </span>

            <div style={{ display: 'flex', gap: 2 }}>
              <button
                className="btn btn-secondary btn-sm"
                style={{ padding: 0, height: 24, width: 24, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => p + 1)}
                title="Next Page"
              >
                <ChevronRight style={{ width: 14, height: 14 }} />
              </button>
              <button
                className="btn btn-secondary btn-sm"
                style={{ padding: 0, height: 24, width: 24, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(totalPages)}
                title="Last Page"
              >
                <ChevronsRight style={{ width: 14, height: 14 }} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
