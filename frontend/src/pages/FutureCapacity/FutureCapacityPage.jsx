import { Fragment } from 'react'
import { useQuery } from '@tanstack/react-query'
import { dashboardAPI } from '../../api/client'
import { format, parseISO } from 'date-fns'
import { AlertTriangle } from 'lucide-react'

const CAPACITY_THRESHOLD = 2000 // Alert when confirmed hours exceed this

const TRADE_ROWS = [
  { label: 'Structural Fabrication',   potential: 'struct_fab_potential',   confirmed: 'struct_fab_confirmed' },
  { label: 'Misc. Fabrication',        potential: 'misc_fab_potential',      confirmed: 'misc_fab_confirmed' },
  { label: 'Structural Erection',      potential: 'struct_erect_potential',  confirmed: 'struct_erect_confirmed' },
  { label: 'Misc. Erection',           potential: 'misc_erect_potential',    confirmed: 'misc_erect_confirmed' },
]

function fmt(n) {
  if (!n || n === 0) return '—'
  return n.toLocaleString(undefined, { maximumFractionDigits: 0 })
}

export default function FutureCapacityPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['future-capacity'],
    queryFn: () => dashboardAPI.futureCapacity().then(r => r.data),
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
  })

  const months = data?.data || []

  if (isLoading) return <div className="loading-overlay">Loading Capacity Projection…</div>

  // Column totals (Potential and Confirmed per month)
  const monthTotals = months.map(m => ({
    cap_month: m.cap_month,
    total_potential: TRADE_ROWS.reduce((s, t) => s + (m[t.potential] || 0), 0),
    total_confirmed: TRADE_ROWS.reduce((s, t) => s + (m[t.confirmed] || 0), 0),
  }))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, animation: 'fadeIn 250ms ease' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Future Capacity</h1>
          <div className="page-subtitle">
            Rolling 18-Month Projection · 4 Trade Types · Potential vs Confirmed Hours
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-head)', letterSpacing: '0.06em' }}>
          <AlertTriangle style={{ width: 14, color: 'var(--warning)' }} />
          Alert threshold: {CAPACITY_THRESHOLD.toLocaleString()} hrs
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 24, fontFamily: 'var(--font-head)', fontSize: '0.72rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 12, height: 12, background: 'var(--primary-muted)', border: '1px solid var(--primary-border)', borderRadius: 2 }} />
          <span style={{ color: 'var(--text-secondary)' }}>Potential (excl. Lost)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 12, height: 12, background: 'var(--success-muted)', border: '1px solid var(--success-border)', borderRadius: 2 }} />
          <span style={{ color: 'var(--text-secondary)' }}>Confirmed (Won only)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 12, height: 12, background: 'var(--danger-muted)', border: '1px solid var(--danger-border)', borderRadius: 2 }} />
          <span style={{ color: 'var(--text-secondary)' }}>Over {CAPACITY_THRESHOLD.toLocaleString()} hrs</span>
        </div>
      </div>

      {/* Capacity Table */}
      <div className="card">
        <div className="capacity-table-wrapper">
          <table className="capacity-table">
            <thead>
              <tr>
                <th style={{ textAlign: 'left', minWidth: 170 }}>Trade Type</th>
                <th style={{ textAlign: 'center', width: 50, fontSize: '0.6rem', letterSpacing: 0, color: 'var(--text-muted)', fontWeight: 400, border: 'none' }}>
                  P / C
                </th>
                {months.map(m => (
                  <th key={m.cap_month} colSpan={1} style={{ minWidth: 75, textAlign: 'center' }}>
                    {m.cap_month
                      ? format(parseISO(m.cap_month), 'MMM yy')
                      : ''}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TRADE_ROWS.map((trade, ti) => (
                <Fragment key={trade.label}>
                  <tr key={`${trade.label}-potential`}>
                    <td className="trade-label" rowSpan={2} style={{ verticalAlign: 'middle' }}>
                      {trade.label}
                    </td>
                    <td style={{
                      textAlign: 'center', background: 'var(--bg-elevated)',
                      fontFamily: 'var(--font-head)', fontSize: '0.62rem',
                      color: 'var(--primary)', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '4px 6px',
                    }}>P</td>
                    {months.map(m => {
                      const val = m[trade.potential] || 0
                      return (
                        <td key={m.cap_month} style={{
                          background: 'var(--primary-muted)',
                          color: val > 0 ? 'var(--primary)' : 'var(--text-muted)',
                          textAlign: 'right',
                        }}>
                          {fmt(val)}
                        </td>
                      )
                    })}
                  </tr>
                  <tr key={`${trade.label}-confirmed`}>
                    <td style={{
                      textAlign: 'center', background: 'var(--bg-elevated)',
                      fontFamily: 'var(--font-head)', fontSize: '0.62rem',
                      color: 'var(--success)', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '4px 6px',
                    }}>C</td>
                    {months.map(m => {
                      const val = m[trade.confirmed] || 0
                      const isAlert = val > CAPACITY_THRESHOLD
                      return (
                        <td key={m.cap_month} className={`capacity-cell ${isAlert ? 'alert' : val > 0 ? 'confirmed' : ''}`}
                          style={{
                            background: isAlert ? 'var(--danger-muted)' : val > 0 ? 'var(--success-muted)' : undefined,
                          }}>
                          {fmt(val)}
                          {isAlert && <AlertTriangle style={{ width: 9, marginLeft: 3, verticalAlign: 'middle' }} />}
                        </td>
                      )
                    })}
                  </tr>
                </Fragment>
              ))}

              {/* Total Row */}
              <tr className="total-row">
                <td className="trade-label" style={{ background: 'var(--grid-header-bg)', fontWeight: 700 }}>TOTAL</td>
                <td style={{ background: 'var(--grid-header-bg)', fontFamily: 'var(--font-head)', fontSize: '0.62rem', textAlign: 'center', color: 'var(--text-muted)', letterSpacing: '0.08em' }}>P/C</td>
                {monthTotals.map(mt => (
                  <td key={mt.cap_month} style={{ textAlign: 'right' }}>
                    <div className="mono" style={{ color: 'var(--primary)', fontSize: '0.72rem' }}>{fmt(mt.total_potential)}</div>
                    <div className="mono" style={{ color: mt.total_confirmed > CAPACITY_THRESHOLD ? 'var(--danger)' : 'var(--success)', fontSize: '0.72rem' }}>
                      {fmt(mt.total_confirmed)}
                    </div>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
