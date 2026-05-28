import { useState, Fragment } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { dashboardAPI, goalsAPI } from '../../api/client'
import { useAuthStore } from '../../store/authStore'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { formatCurrency } from '../../utils/formatters'
import { Edit3, Check, X } from 'lucide-react'

const MONTHS = ['January','February','March','April','May','June',
                 'July','August','September','October','November','December']

function GoalCell({ goal, id, isManager }) {
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

  if (!isManager) return <span className="mono">{formatCurrency(goal)}</span>

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

export default function DollarDashboardPage() {
  const isManager = useAuthStore(s => s.isManager())
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i)

  const { data, isLoading } = useQuery({
    queryKey: ['dollar-dashboard'],
    queryFn: () => dashboardAPI.dollar().then(r => r.data),
  })

  const rows = data?.data || []

  // Pivot: month → year → { amount_bid, amount_awarded, quoted_profit_awarded, monthly_goal, id }
  const pivot = {}
  MONTHS.forEach(m => { pivot[m] = {} })
  rows.forEach(r => {
    if (pivot[r.month]) {
      pivot[r.month][r.year] = r
    }
  })

  // Annual totals
  const annualTotals = years.reduce((acc, yr) => {
    acc[yr] = { bid: 0, awarded: 0, profit: 0, goal: 0 }
    rows.filter(r => r.year === yr).forEach(r => {
      acc[yr].bid += r.amount_bid || 0
      acc[yr].awarded += r.amount_awarded || 0
      acc[yr].profit += r.quoted_profit_awarded || 0
      acc[yr].goal += r.monthly_goal || 0
    })
    return acc
  }, {})

  // Bar chart data for current year
  const chartData = MONTHS.map(m => ({
    name: m.slice(0, 3),
    Bid: pivot[m]?.[currentYear]?.amount_bid || 0,
    Awarded: pivot[m]?.[currentYear]?.amount_awarded || 0,
    Goal: pivot[m]?.[currentYear]?.monthly_goal || 2000000,
  }))

  if (isLoading) return <div className="loading-overlay">Loading $ Dashboard…</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, animation: 'fadeIn 250ms ease' }}>
      <div className="page-header">
        <div>
          <div className="page-subtitle">Amount Bid / Awarded / Quoted Profit · Monthly × 5 Years</div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        {[
          { label: 'Total Bid (YTD)', val: annualTotals[currentYear]?.bid, color: 'primary' },
          { label: 'Total Awarded (YTD)', val: annualTotals[currentYear]?.awarded, color: 'success' },
          { label: 'Quoted Profit (YTD)', val: annualTotals[currentYear]?.profit, color: 'warning' },
          { label: 'Annual Goal', val: annualTotals[currentYear]?.goal, color: 'info' },
        ].map(({ label, val, color }) => (
          <div key={label} className={`kpi-card ${color}`}>
            <div className="kpi-label">{label}</div>
            <div className="kpi-value">{formatCurrency(val || 0)}</div>
          </div>
        ))}
      </div>

      {/* Bar Chart */}
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
              <Bar dataKey="Bid" fill="var(--primary)" radius={[2,2,0,0]} />
              <Bar dataKey="Awarded" fill="var(--success)" radius={[2,2,0,0]} />
              <Bar dataKey="Goal" fill="var(--info)" radius={[2,2,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Main Table */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Monthly Detail · All Years</span>
          {isManager && <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Click goal $ to edit</span>}
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
                    <th key={`${yr}-bid`}>Bid</th>
                    <th key={`${yr}-award`}>Awarded</th>
                    <th key={`${yr}-profit`}>Profit</th>
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
                          <td key={`${yr}-bid`}>{r?.amount_bid ? formatCurrency(r.amount_bid) : '—'}</td>
                          <td key={`${yr}-award`} style={{ color: r?.amount_awarded ? 'var(--success)' : undefined }}>
                            {r?.amount_awarded ? formatCurrency(r.amount_awarded) : '—'}
                          </td>
                          <td key={`${yr}-profit`}>{r?.quoted_profit_awarded ? formatCurrency(r.quoted_profit_awarded) : '—'}</td>
                        </Fragment>
                      )
                    })}
                    <td>
                      {goalRow && (
                        <div>
                          <GoalCell goal={goalRow.monthly_goal} id={goalRow.id} isManager={isManager} />
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
              {/* Annual Totals */}
              <tr>
                <td className="total-row" style={{ color: 'var(--text-primary)', fontWeight: 700 }}>TOTAL</td>
                {years.map(yr => (
                  <Fragment key={yr}>
                    <td key={`tot-${yr}-bid`} className="total-row">{formatCurrency(annualTotals[yr]?.bid)}</td>
                    <td key={`tot-${yr}-award`} className="total-row" style={{ color: 'var(--success)' }}>{formatCurrency(annualTotals[yr]?.awarded)}</td>
                    <td key={`tot-${yr}-profit`} className="total-row">{formatCurrency(annualTotals[yr]?.profit)}</td>
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
