import { useState, Fragment } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { dashboardAPI, goalsAPI } from '../../api/client'
import { useAuthStore } from '../../store/authStore'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LabelList
} from 'recharts'
import { formatCurrency } from '../../utils/formatters'
import { Edit3, Check, X } from 'lucide-react'

const MONTHS = ['January','February','March','April','May','June',
                 'July','August','September','October','November','December']

// ── Format helpers ────────────────────────────────────────────────────────────
function fmtM(val) {
  if (!val && val !== 0) return '$0'
  const m = val / 1_000_000
  return m >= 1000 ? `$${(m / 1000).toFixed(1)}B` : `$${m.toFixed(1)}M`
}

const RenderMinBar = (props) => {
  const { fill, x, y, width, height, value, r = 2 } = props;
  if (!value || value <= 0) return null;
  const minH = 4;
  const activeHeight = height < minH ? minH : height;
  const activeY = height < minH ? y - (minH - height) : y;
  
  const path = `
    M ${x},${activeY + activeHeight}
    L ${x},${activeY + r}
    Q ${x},${activeY} ${x + r},${activeY}
    L ${x + width - r},${activeY}
    Q ${x + width},${activeY} ${x + width},${activeY + r}
    L ${x + width},${activeY + activeHeight}
    Z
  `;
  return <path d={path} fill={fill} />;
};

// ── Custom tooltip for bid estimation chart ───────────────────────────────────
function BidEstTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'var(--bg-elevated)', border: '1px solid var(--border-strong)',
      borderRadius: 8, padding: '10px 14px', fontSize: '0.78rem',
      fontFamily: 'var(--font-head)',
    }}>
      <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
        Year {label}
      </div>
      {payload.map((p) => (
        <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
          <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: p.fill }} />
          <span style={{ color: 'var(--text-secondary)' }}>{p.name}:</span>
          <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
            {p.value.toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  )
}

// ── GoalCell ──────────────────────────────────────────────────────────────────
function GoalCell({ goal, id, canEdit }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(goal)
  const qc = useQueryClient()

  const mutation = useMutation({
    mutationFn: (newGoal) => goalsAPI.update(id, { goal: newGoal }),
    onSuccess: () => {
      toast.success('Goal updated')
      qc.invalidateQueries({ queryKey: ['dollar-dashboard'] })
      setEditing(false)
    },
  })

  if (!canEdit) return <span className="mono">{formatCurrency(goal)}</span>

  if (editing) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <input
          type="number"
          className="form-input"
          style={{ width: 120, padding: '2px 6px', fontSize: '0.78rem' }}
          value={val}
          onChange={e => setVal(e.target.value)}
          autoFocus
        />
        <button className="btn btn-primary btn-sm" style={{ padding: '2px 6px' }}
          onClick={() => mutation.mutate(parseFloat(val))}>
          <Check style={{ width: 12, height: 12 }} />
        </button>
        <button className="btn btn-ghost btn-sm" style={{ padding: '2px 6px' }}
          onClick={() => setEditing(false)}>
          <X style={{ width: 12, height: 12 }} />
        </button>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}
         onClick={() => setEditing(true)}>
      <span className="mono">{formatCurrency(goal)}</span>
      <Edit3 style={{ width: 11, height: 11, color: 'var(--text-muted)', opacity: 0.6 }} />
    </div>
  )
}

// ── StatPill & StatDivider ────────────────────────────────────────────────────
function StatPill({ label, value, color, highlight }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6,
      padding: '5px 14px',
      background: highlight ? 'rgba(16,185,129,0.08)' : 'transparent',
      borderRadius: highlight ? 6 : 0,
    }}>
      <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem', letterSpacing: '0.07em', textTransform: 'uppercase' }}>
        {label}:
      </span>
      <span style={{ color, fontFamily: 'var(--font-mono)', fontSize: '0.82rem', fontWeight: 800 }}>
        {value ?? '—'}
      </span>
    </div>
  )
}

function StatDivider() {
  return (
    <span style={{ color: 'var(--border-strong)', fontSize: '1rem', padding: '0 2px', userSelect: 'none' }}>|</span>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function DollarDashboardPage() {
  const canEdit = useAuthStore(s => s.canEdit())
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i)

  // Dollar dashboard (monthly bid/awarded)
  const { data, isLoading } = useQuery({
    queryKey: ['dollar-dashboard'],
    queryFn: () => dashboardAPI.dollar().then(r => r.data),
  })

  // Bid Estimation Summary (yearly, grouped by quote_no prefix)
  const { data: summaryData, isLoading: summaryLoading } = useQuery({
    queryKey: ['bid-estimation-summary'],
    queryFn: () => dashboardAPI.bidEstimationSummary().then(r => r.data),
  })

  const rows     = data?.data        || []
  const yearRows = summaryData?.data || []
  const summary  = summaryData?.summary || {}

  // Pivot for monthly dollar table
  const pivot = {}
  MONTHS.forEach(m => { pivot[m] = {} })
  rows.forEach(r => {
    if (pivot[r.month]) pivot[r.month][r.year] = r
  })

  // Annual dollar totals
  const annualTotals = years.reduce((acc, yr) => {
    acc[yr] = { bid: 0, awarded: 0, profit: 0, goal: 0 }
    rows.filter(r => r.year === yr).forEach(r => {
      acc[yr].bid     += r.amount_bid             || 0
      acc[yr].awarded += r.amount_awarded          || 0
      acc[yr].profit  += r.quoted_profit_awarded   || 0
      acc[yr].goal    += r.monthly_goal            || 0
    })
    return acc
  }, {})

  // Monthly bar chart data
  const chartData = MONTHS.map(m => ({
    name:    m.slice(0, 3),
    Bid:     pivot[m]?.[currentYear]?.amount_bid     || 0,
    Awarded: pivot[m]?.[currentYear]?.amount_awarded || 0,
    Goal:    pivot[m]?.[currentYear]?.monthly_goal   || 2000000,
  }))

  if (isLoading || summaryLoading) {
    return <div className="loading-overlay">Loading Dashboard…</div>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, animation: 'fadeIn 250ms ease' }}>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* BID & ESTIMATION SUMMARY (quote_no year-prefix × won_lost)         */}
      {/* ═══════════════════════════════════════════════════════════════════ */}

      {/* Summary Stats Bar */}
      <div style={{
        display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 0,
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
        borderRadius: 8, padding: '6px 8px',
        fontFamily: 'var(--font-head)', fontWeight: 700,
      }}>
        <StatPill label="TOTAL"    value={summary.total?.toLocaleString()}    color="var(--text-primary)" />
        <StatDivider />
        <StatPill label="WON"      value={summary.total_won?.toLocaleString()} color="var(--success)" />
        <StatDivider />
        <StatPill
          label={`WON (${summary.current_year || currentYear})`}
          value={`${(summary.current_year_won ?? 0).toLocaleString()} (${fmtM(summary.current_year_won_amount || 0)})`}
          color="var(--success)"
          highlight
        />
        <StatDivider />
        <StatPill label="LOST"    value={summary.total_lost?.toLocaleString()}    color="var(--danger)" />
        <StatDivider />
        <StatPill label="PENDING" value={summary.total_pending?.toLocaleString()} color="var(--warning)" />
      </div>

      {/* Bid & Estimation Bar Chart — Total Quoted vs Won per Year */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Bid &amp; Estimation — Total Quoted vs Won / Awarded (by Year)</span>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            Year derived from Quote No prefix (e.g. 26‑xx‑xx → 2026)
          </span>
        </div>
        <div className="card-body">
          {/* Legend */}
          <div style={{
            display: 'flex', gap: 20, marginBottom: 14,
            fontFamily: 'var(--font-head)', fontSize: '0.72rem',
            fontWeight: 700, letterSpacing: '0.06em',
          }}>
            <LegendDot color="#1a1a1a" label="TOTAL QUOTED" />
            <LegendDot color="#f59e0b" label="WON / AWARDED" />
          </div>

          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={yearRows} barCategoryGap="30%" barGap={6}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
              <XAxis
                dataKey="year"
                tick={{ fontFamily: 'var(--font-mono)', fontSize: 11, fill: 'var(--text-muted)' }}
              />
              <YAxis
                tick={{ fontFamily: 'var(--font-mono)', fontSize: 10, fill: 'var(--text-muted)' }}
                tickFormatter={v => v.toLocaleString()}
                width={55}
              />
              <Tooltip content={<BidEstTooltip />} />

              {/* Total Quoted (dark/black) */}
              <Bar dataKey="total_quoted" name="Total Quoted" fill="#1a1a1a" shape={<RenderMinBar r={3} />}>
                <LabelList
                  dataKey="total_quoted"
                  position="top"
                  style={{
                    fontFamily: 'var(--font-mono)', fontSize: '0.65rem',
                    fill: 'var(--text-secondary)', fontWeight: 700,
                  }}
                  formatter={v => v ? v.toLocaleString() : ''}
                />
              </Bar>

              {/* Won / Awarded (amber/orange) */}
              <Bar dataKey="total_won" name="Won / Awarded" fill="#f59e0b" shape={<RenderMinBar r={3} />}>
                <LabelList
                  dataKey="total_won"
                  position="top"
                  style={{
                    fontFamily: 'var(--font-mono)', fontSize: '0.65rem',
                    fill: '#b45309', fontWeight: 700,
                  }}
                  formatter={v => v ? v.toLocaleString() : ''}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          {/* Per-year summary table */}
          {yearRows.length > 0 && (
            <div style={{ overflowX: 'auto', marginTop: 20 }}>
              <table style={{
                width: '100%', borderCollapse: 'collapse',
                fontFamily: 'var(--font-head)', fontSize: '0.74rem',
              }}>
                <thead>
                  <tr style={{ background: 'var(--bg-subtle)', borderBottom: '2px solid var(--border-default)' }}>
                    {['YEAR','TOTAL QUOTED','WON','LOST','PENDING','WON AMOUNT','WIN RATE'].map((h, idx) => (
                      <th key={h} style={{
                        padding: '7px 12px',
                        textAlign: idx === 0 ? 'left' : 'right',
                        fontWeight: 700, letterSpacing: '0.05em', fontSize: '0.68rem',
                        color: h === 'WON' ? 'var(--success)'
                             : h === 'LOST' ? 'var(--danger)'
                             : h === 'PENDING' ? 'var(--warning)'
                             : h === 'WON AMOUNT' ? 'var(--success)'
                             : 'var(--text-muted)',
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {yearRows.map((row, i) => {
                    const winRate = row.total_quoted > 0
                      ? ((row.total_won / row.total_quoted) * 100).toFixed(1)
                      : '0.0'
                    const isCurrent = row.year === currentYear
                    return (
                      <tr key={row.year} style={{
                        background: isCurrent
                          ? 'rgba(245,158,11,0.07)'
                          : i % 2 === 0 ? 'transparent' : 'var(--bg-subtle)',
                        borderBottom: '1px solid var(--border-subtle)',
                      }}>
                        <td style={{
                          padding: '7px 12px', fontWeight: isCurrent ? 800 : 600,
                          color: isCurrent ? 'var(--primary)' : 'var(--text-primary)',
                          fontFamily: 'var(--font-mono)',
                        }}>
                          {row.year}
                          {isCurrent && (
                            <span style={{ fontSize: '0.6rem', marginLeft: 6, color: 'var(--primary)', opacity: 0.7 }}>YTD</span>
                          )}
                        </td>
                        <td style={{ padding: '7px 12px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                          {row.total_quoted.toLocaleString()}
                        </td>
                        <td style={{ padding: '7px 12px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--success)' }}>
                          {row.total_won.toLocaleString()}
                        </td>
                        <td style={{ padding: '7px 12px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--danger)' }}>
                          {row.total_lost.toLocaleString()}
                        </td>
                        <td style={{ padding: '7px 12px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--warning)' }}>
                          {row.total_pending.toLocaleString()}
                        </td>
                        <td style={{ padding: '7px 12px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--success)' }}>
                          {fmtM(row.total_won_amount)}
                        </td>
                        <td style={{
                          padding: '7px 12px', textAlign: 'right', fontFamily: 'var(--font-mono)',
                          color: parseFloat(winRate) >= 15 ? 'var(--success)' : 'var(--text-muted)',
                        }}>
                          {winRate}%
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* DOLLAR DASHBOARD — Monthly Bid / Awarded / Goal                    */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="page-header" style={{ marginBottom: 0 }}>
        <div>
          <div className="page-subtitle">Amount Bid / Awarded / Quoted Profit · Monthly × 5 Years</div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        {[
          { label: 'Total Bid (YTD)',     val: annualTotals[currentYear]?.bid,     color: 'primary' },
          { label: 'Total Awarded (YTD)', val: annualTotals[currentYear]?.awarded, color: 'success' },
          { label: 'Quoted Profit (YTD)', val: annualTotals[currentYear]?.profit,  color: 'warning' },
          { label: 'Annual Goal',         val: annualTotals[currentYear]?.goal,    color: 'info'    },
        ].map(({ label, val, color }) => (
          <div key={label} className={`kpi-card ${color}`}>
            <div className="kpi-label">{label}</div>
            <div className="kpi-value">{formatCurrency(val || 0)}</div>
          </div>
        ))}
      </div>

      {/* Monthly Bar Chart */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">{currentYear} — Monthly Bid vs Awarded vs Goal</span>
        </div>
        <div className="card-body">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
              <XAxis dataKey="name" tick={{ fontFamily: 'var(--font-mono)', fontSize: 10, fill: 'var(--text-muted)' }} />
              <YAxis tick={{ fontFamily: 'var(--font-mono)', fontSize: 10, fill: 'var(--text-muted)' }}
                     tickFormatter={v => `$${(v/1e6).toFixed(1)}M`} />
              <Tooltip
                contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-strong)', borderRadius: 6, fontSize: '0.78rem' }}
                formatter={v => formatCurrency(v)}
              />
              <Bar dataKey="Bid"     fill="var(--primary)" radius={[2,2,0,0]} />
              <Bar dataKey="Awarded" fill="var(--success)" radius={[2,2,0,0]} />
              <Bar dataKey="Goal"    fill="var(--info)"    radius={[2,2,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Monthly Detail Table */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Monthly Detail · All Years</span>
          {canEdit && <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Click goal $ to edit</span>}
        </div>
        <div className="dash-table-wrapper">
          <table className="dash-table">
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>Month</th>
                {years.map(yr => (
                  <th key={yr} colSpan={3} style={{ textAlign: 'center', borderLeft: '1px solid var(--border-default)' }}>
                    {yr}
                  </th>
                ))}
                <th>Goal ({currentYear})</th>
              </tr>
              <tr>
                <th style={{ textAlign: 'left' }}>—</th>
                {years.map(yr => (
                  <Fragment key={yr}>
                    <th>Bid</th>
                    <th>Awarded</th>
                    <th>Profit</th>
                  </Fragment>
                ))}
                <th>—</th>
              </tr>
            </thead>
            <tbody>
              {MONTHS.map(month => {
                const goalRow = pivot[month]?.[currentYear]
                const goalPct = goalRow?.monthly_goal
                  ? Math.min(100, Math.round((goalRow.amount_bid / goalRow.monthly_goal) * 100))
                  : 0
                return (
                  <tr key={month}>
                    <td>{month.slice(0,3)}</td>
                    {years.map(yr => {
                      const r = pivot[month]?.[yr]
                      return (
                        <Fragment key={yr}>
                          <td>{r?.amount_bid ? formatCurrency(r.amount_bid) : '—'}</td>
                          <td style={{ color: r?.amount_awarded ? 'var(--success)' : undefined }}>
                            {r?.amount_awarded ? formatCurrency(r.amount_awarded) : '—'}
                          </td>
                          <td>{r?.quoted_profit_awarded ? formatCurrency(r.quoted_profit_awarded) : '—'}</td>
                        </Fragment>
                      )
                    })}
                    <td>
                      {goalRow && (
                        <div>
                          <GoalCell goal={goalRow.monthly_goal} id={goalRow.id} canEdit={canEdit} />
                          <div className="progress-bar">
                            <div
                              className={`progress-fill ${goalPct >= 100 ? 'over-goal' : goalPct < 50 ? 'under-50' : ''}`}
                              style={{ width: `${goalPct}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
              <tr>
                <td className="total-row" style={{ color: 'var(--text-primary)', fontWeight: 700 }}>TOTAL</td>
                {years.map(yr => (
                  <Fragment key={yr}>
                    <td className="total-row">{formatCurrency(annualTotals[yr]?.bid)}</td>
                    <td className="total-row" style={{ color: 'var(--success)' }}>{formatCurrency(annualTotals[yr]?.awarded)}</td>
                    <td className="total-row">{formatCurrency(annualTotals[yr]?.profit)}</td>
                  </Fragment>
                ))}
                <td className="total-row">{formatCurrency(annualTotals[currentYear]?.goal)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ── LegendDot helper ──────────────────────────────────────────────────────────
function LegendDot({ color, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{ display: 'inline-block', width: 14, height: 14, borderRadius: 2, background: color }} />
      <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
    </div>
  )
}
