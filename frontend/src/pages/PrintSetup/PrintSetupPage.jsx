import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { rfqAPI } from '../../api/client'
import { Printer, Calendar, Filter, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { formatDate } from '../../utils/formatters'
import FormattedDateInput from '../../components/forms/FormattedDateInput'

function formatTime(t) {
  if (!t) return '—'
  const parts = t.split(':')
  if (parts.length >= 2) {
    const hh = parseInt(parts[0], 10)
    const mm = parts[1]
    const ampm = hh >= 12 ? 'PM' : 'AM'
    const hh12 = hh % 12 || 12
    return `${hh12}:${mm} ${ampm}`
  }
  return t
}

export default function PrintSetupPage() {
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 14)
    return d.toISOString().slice(0, 10)
  })

  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)

  const { data: rows = [], isLoading, refetch } = useQuery({
    queryKey: ['print-view', dateFrom, dateTo],
    queryFn: () => rfqAPI.printView({
      ...(dateFrom && { date_from: dateFrom }),
      ...(dateTo && { date_to: dateTo }),
    }).then(r => r.data),
  })

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize))
  const startIndex = (currentPage - 1) * pageSize
  const paginatedRows = rows.slice(startIndex, startIndex + pageSize)

  function handlePrint() {
    window.print()
  }

  const BoolCell = ({ v, className }) => v
    ? <td className={className} style={{ textAlign: 'center', color: 'var(--success)', fontWeight: 'bold' }}>✓</td>
    : <td className={className} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>—</td>

  return (
    <div className="print-setup-container">
      {/* Header — hidden in print */}
      <div className="page-header no-print">
        <div>
          <h1 className="page-title">Print Setup</h1>
          <div className="page-subtitle">Weekly Meeting View — {rows.length} bids</div>
        </div>
        <button className="btn btn-primary" onClick={handlePrint}>
          <Printer /> Print / Save PDF
        </button>
      </div>

      {/* Filters — hidden in print */}
      <div className="toolbar no-print">
        <Calendar style={{ width: 14, color: 'var(--text-muted)' }} />
        <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <label className="form-label" style={{ whiteSpace: 'nowrap' }}>Bid Due From</label>
          <FormattedDateInput className="form-input" style={{ width: 150 }} value={dateFrom}
            onChange={e => {
              setDateFrom(e.target.value)
              setCurrentPage(1)
            }} />
        </div>
        <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <label className="form-label" style={{ whiteSpace: 'nowrap' }}>To</label>
          <FormattedDateInput className="form-input" style={{ width: 150 }} value={dateTo}
            onChange={e => {
              setDateTo(e.target.value)
              setCurrentPage(1)
            }} />
        </div>
        <button className="btn btn-secondary btn-sm" onClick={() => {
          setCurrentPage(1)
          refetch()
        }}>
          <Filter /> Apply
        </button>
      </div>

      {/* Print Header — visible in print only */}
      <div className="print-header print-only">
        <span>SFE — Weekly Bid Meeting</span>
        <span style={{ fontWeight: 400, fontSize: '0.85em', opacity: 0.8 }}>
          {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </span>
      </div>

      {/* Screen Table Card — hidden in print */}
      {isLoading ? (
        <div className="loading-overlay no-print">Loading print view…</div>
      ) : (
        <div className="card no-print" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div className="dash-table-wrapper" style={{ flex: 1, overflowY: 'auto', borderBottomLeftRadius: 0, borderBottomRightRadius: 0, borderBottom: 'none' }}>
            <table className="dash-table" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
              <thead>
                <tr>
                  <th style={{ position: 'sticky', top: 0, background: 'var(--grid-header-bg)', zIndex: 10, textAlign: 'left', borderBottom: '1px solid var(--border-default)', width: '14%' }}>Quote + Project</th>
                  <th className="nowrap" style={{ position: 'sticky', top: 0, background: 'var(--grid-header-bg)', zIndex: 10, textAlign: 'left', borderBottom: '1px solid var(--border-default)', width: '6.5%' }}>Quote No</th>
                  <th style={{ position: 'sticky', top: 0, background: 'var(--grid-header-bg)', zIndex: 10, borderBottom: '1px solid var(--border-default)', width: '4%' }}>Type</th>
                  <th className="nowrap" style={{ position: 'sticky', top: 0, background: 'var(--grid-header-bg)', zIndex: 10, borderBottom: '1px solid var(--border-default)', width: '7.5%' }}>Bid Due</th>
                  <th className="nowrap" style={{ position: 'sticky', top: 0, background: 'var(--grid-header-bg)', zIndex: 10, borderBottom: '1px solid var(--border-default)', width: '5.5%' }}>Time</th>
                  <th style={{ position: 'sticky', top: 0, background: 'var(--grid-header-bg)', zIndex: 10, textAlign: 'left', borderBottom: '1px solid var(--border-default)', width: '9%' }}>Location</th>
                  <th className="nowrap" style={{ position: 'sticky', top: 0, background: 'var(--grid-header-bg)', zIndex: 10, borderBottom: '1px solid var(--border-default)', width: '4.5%' }}>Distance</th>
                  <th style={{ position: 'sticky', top: 0, background: 'var(--grid-header-bg)', zIndex: 10, borderBottom: '1px solid var(--border-default)', width: '4%' }}>AISC Fab</th>
                  <th style={{ position: 'sticky', top: 0, background: 'var(--grid-header-bg)', zIndex: 10, borderBottom: '1px solid var(--border-default)', width: '4%' }}>AISC Erect</th>
                  <th style={{ position: 'sticky', top: 0, background: 'var(--grid-header-bg)', zIndex: 10, textAlign: 'left', borderBottom: '1px solid var(--border-default)', width: '11%' }}>Customer</th>
                  <th className="nowrap" style={{ position: 'sticky', top: 0, background: 'var(--grid-header-bg)', zIndex: 10, borderBottom: '1px solid var(--border-default)', width: '6%' }}>Decision</th>
                  <th className="nowrap" style={{ position: 'sticky', top: 0, background: 'var(--grid-header-bg)', zIndex: 10, borderBottom: '1px solid var(--border-default)', width: '6.5%' }}>Estimator</th>
                  <th className="nowrap" style={{ position: 'sticky', top: 0, background: 'var(--grid-header-bg)', zIndex: 10, borderBottom: '1px solid var(--border-default)', width: '3.5%' }}>J&D</th>
                  <th className="nowrap" style={{ position: 'sticky', top: 0, background: 'var(--grid-header-bg)', zIndex: 10, borderBottom: '1px solid var(--border-default)', width: '3.5%' }}>Detail</th>
                  <th className="nowrap" style={{ position: 'sticky', top: 0, background: 'var(--grid-header-bg)', zIndex: 10, borderBottom: '1px solid var(--border-default)', width: '3.5%' }}>Erect</th>
                  <th className="nowrap" style={{ position: 'sticky', top: 0, background: 'var(--grid-header-bg)', zIndex: 10, textAlign: 'left', borderBottom: '1px solid var(--border-default)', width: '7%' }}>Sqft/Tons</th>
                </tr>
              </thead>
              <tbody>
                {paginatedRows.length === 0 ? (
                  <tr>
                    <td colSpan={16} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>
                      No bids found for the selected date range
                    </td>
                  </tr>
                ) : paginatedRows.map((r, i) => (
                  <tr key={i}>
                    <td className="wrap" style={{ textAlign: 'left', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {r.quote_project}
                    </td>
                    <td className="nowrap" style={{ textAlign: 'left', fontFamily: 'var(--font-mono)', fontSize: '0.72rem' }}>{r.quote_no}</td>
                    <td className="nowrap">{r.budget_type || '—'}</td>
                    <td className="nowrap mono">{formatDate(r.bid_due_date)}</td>
                    <td className="nowrap mono">{formatTime(r.bid_due_time)}</td>
                    <td className="wrap" style={{ textAlign: 'left' }}>{r.location || '—'}</td>
                    <td className="nowrap">{r.distance_travel || '—'}</td>
                    <BoolCell className="nowrap" v={r.aisc_fab} />
                    <BoolCell className="nowrap" v={r.aisc_erect} />
                    <td className="wrap" style={{ textAlign: 'left' }}>{r.customer_name || '—'}</td>
                    <td className="nowrap">
                      <span className={`badge badge-${r.decision_to_bid === 'Yes' || r.decision_to_bid === 'Bid' ? 'primary' : 'pending'}`}>
                        {r.decision_to_bid || '—'}
                      </span>
                    </td>
                    <td className="nowrap mono">{r.primary_estimator_initials || '—'}</td>
                    <BoolCell className="nowrap" v={r.sent_to_jd} />
                    <BoolCell className="nowrap" v={r.sent_to_detailing} />
                    <BoolCell className="nowrap" v={r.sent_to_erection} />
                    <td className="nowrap" style={{ textAlign: 'left', fontSize: '0.72rem' }}>{r.est_sqft_ton || '—'}</td>
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
      )}

      {/* Print-Only Table — hidden on screen, visible in print, renders ALL rows */}
      {!isLoading && (
        <div className="dash-table-wrapper print-table print-only">
          <table className="dash-table" id="print-table" style={{ fontSize: '0.78rem' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', width: '14%' }}>Quote + Project</th>
                <th className="nowrap" style={{ textAlign: 'left', width: '6.5%' }}>Quote No</th>
                <th style={{ width: '4%' }}>Type</th>
                <th className="nowrap" style={{ width: '7.5%' }}>Bid Due</th>
                <th className="nowrap" style={{ width: '5.5%' }}>Time</th>
                <th style={{ textAlign: 'left', width: '9%' }}>Location</th>
                <th className="nowrap" style={{ width: '4.5%' }}>Distance</th>
                <th style={{ width: '4%' }}>AISC Fab</th>
                <th style={{ width: '4%' }}>AISC Erect</th>
                <th style={{ textAlign: 'left', width: '11%' }}>Customer</th>
                <th className="nowrap" style={{ width: '6%' }}>Decision</th>
                <th className="nowrap" style={{ width: '6.5%' }}>Estimator</th>
                <th className="nowrap" style={{ width: '3.5%' }}>J&D</th>
                <th className="nowrap" style={{ width: '3.5%' }}>Detail</th>
                <th className="nowrap" style={{ width: '3.5%' }}>Erect</th>
                <th className="nowrap" style={{ textAlign: 'left', width: '7%' }}>Sqft/Tons</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={16} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>
                    No bids found for the selected date range
                  </td>
                </tr>
              ) : rows.map((r, i) => (
                <tr key={i}>
                  <td className="wrap" style={{ textAlign: 'left', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {r.quote_project}
                  </td>
                  <td className="nowrap" style={{ textAlign: 'left', fontFamily: 'var(--font-mono)', fontSize: '0.72rem' }}>{r.quote_no}</td>
                  <td className="nowrap">{r.budget_type || '—'}</td>
                  <td className="nowrap mono">{formatDate(r.bid_due_date)}</td>
                  <td className="nowrap mono">{formatTime(r.bid_due_time)}</td>
                  <td className="wrap" style={{ textAlign: 'left' }}>{r.location || '—'}</td>
                  <td className="nowrap">{r.distance_travel || '—'}</td>
                  <BoolCell className="nowrap" v={r.aisc_fab} />
                  <BoolCell className="nowrap" v={r.aisc_erect} />
                  <td className="wrap" style={{ textAlign: 'left' }}>{r.customer_name || '—'}</td>
                  <td className="nowrap">{r.decision_to_bid || '—'}</td>
                  <td className="nowrap mono">{r.primary_estimator_initials || '—'}</td>
                  <BoolCell className="nowrap" v={r.sent_to_jd} />
                  <BoolCell className="nowrap" v={r.sent_to_detailing} />
                  <BoolCell className="nowrap" v={r.sent_to_erection} />
                  <td className="nowrap" style={{ textAlign: 'left', fontSize: '0.72rem' }}>{r.est_sqft_ton || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Screen and Print CSS Media Queries */}
      <style>{`
        @media screen {
          .print-setup-container {
            display: flex;
            flex-direction: column;
            height: calc(100vh - 56px - 32px);
            gap: 16px;
            animation: fadeIn 250ms ease;
            overflow: hidden;
          }
          .print-only {
            display: none !important;
          }
        }
        @media print {
          .print-setup-container {
            display: block !important;
            height: auto !important;
            overflow: visible !important;
          }
          .no-print {
            display: none !important;
          }
          .print-only {
            display: block !important;
          }
          @page { size: landscape; margin: 0.6cm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print-header { 
            display: flex !important; 
            justify-content: space-between !important;
            align-items: center !important;
            font-family: var(--font-head);
            font-weight: bold; 
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-bottom: 12px; 
            font-size: 11px; 
            color: #000 !important;
            border-bottom: 1.5px solid #000 !important;
            padding-bottom: 4px;
          }
          .dash-table-wrapper.print-table { overflow: visible !important; border: none !important; }
          .dash-table { 
            font-size: 6.2px !important; 
            width: 100% !important; 
            border-collapse: collapse; 
            table-layout: fixed !important;
          }
          .dash-table th, .dash-table td { 
            padding: 2.5px 2px !important; 
            border-bottom: 1px solid #ddd !important;
            overflow: hidden;
            text-overflow: ellipsis;
            font-size: 6.0px !important;
          }
          .dash-table th {
            font-weight: bold !important;
            background-color: #f5f5f5 !important;
            color: #000 !important;
            border-bottom: 1.5px solid #000 !important;
            white-space: normal !important;
            overflow: visible !important;
            text-overflow: clip !important;
            word-break: normal !important;
            font-size: 6.5px !important;
          }
          .dash-table td.nowrap, .dash-table th.nowrap {
            white-space: nowrap !important;
            word-break: keep-all !important;
          }
          .dash-table td.wrap {
            white-space: normal !important;
            word-wrap: break-word !important;
          }
        }
      `}</style>
    </div>
  )
}
