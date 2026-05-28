import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { dashboardAPI } from '../../api/client'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, LineChart, Line
} from 'recharts'

const MONTHS = ['January','February','March','April','May','June',
                 'July','August','September','October','November','December']

function getRatioClass(val) {
  if (val === null || val === undefined) return 'ratio-none'
  if (val >= 50) return 'ratio-high'
  if (val >= 25) return 'ratio-mid'
  return 'ratio-low'
}

export default function BidPerformancePage() {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())

  const { data, isLoading } = useQuery({
    queryKey: ['bid-performance'],
    queryFn: () => dashboardAPI.bidPerformance().then(r => r.data),
  })

  const currentYear = data?.current_year || new Date().getFullYear()
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i)
  const rows = data?.data || []

  // Pivot data: month → { year: value }
  const pivotCount = {}
  const pivotDollar = {}
  MONTHS.forEach(m => { pivotCount[m] = {}; pivotDollar[m] = {} })

  rows.forEach(row => {
    if (pivotCount[row.month]) {
      pivotCount[row.month][row.year] = row.win_ratio_count_pct
      pivotDollar[row.month][row.year] = row.win_ratio_dollar_pct
    }
  })

  // Chart data — annual averages for line chart
  const chartData = years.map(yr => {
    const yearRows = rows.filter(r => r.year === yr)
    const countVals = yearRows.map(r => r.win_ratio_count_pct).filter(v => v !== null)
    const dollarVals = yearRows.map(r => r.win_ratio_dollar_pct).filter(v => v !== null)
    return {
      year: String(yr),
      avgCountRatio: countVals.length ? +(countVals.reduce((a,b)=>a+b,0)/countVals.length).toFixed(1) : null,
      avgDollarRatio: dollarVals.length ? +(dollarVals.reduce((a,b)=>a+b,0)/dollarVals.length).toFixed(1) : null,
    }
  }).reverse()

  if (isLoading) return <div className="loading-overlay">Loading Bid Performance Data…</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, animation: 'fadeIn 250ms ease' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Bid Performance Dashboard</h1>
          <div className="page-subtitle">Quote Win Ratio — Count & $ — Monthly × 5 Years</div>
        </div>
      </div>

      {/* Chart */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">5-Year Win Ratio Trend</span>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Annual Average %</span>
        </div>
        <div className="card-body">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
              <XAxis dataKey="year" tick={{ fontFamily: 'var(--font-mono)', fontSize: 11, fill: 'var(--text-muted)' }} />
              <YAxis tick={{ fontFamily: 'var(--font-mono)', fontSize: 11, fill: 'var(--text-muted)' }}
                     tickFormatter={v => `${v}%`} domain={[0, 100]} />
              <Tooltip
                contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-strong)', borderRadius: 6 }}
                labelStyle={{ color: 'var(--text-primary)', fontFamily: 'var(--font-head)', fontSize: '0.78rem' }}
                formatter={(v) => v !== null ? `${v}%` : '—'}
              />
              <Legend wrapperStyle={{ fontFamily: 'var(--font-head)', fontSize: '0.72rem', letterSpacing: '0.06em' }} />
              <Line type="monotone" dataKey="avgCountRatio" name="Count Win %" stroke="var(--primary)" strokeWidth={2} dot={{ fill: 'var(--primary)' }} />
              <Line type="monotone" dataKey="avgDollarRatio" name="$ Win %" stroke="var(--success)" strokeWidth={2} dot={{ fill: 'var(--success)' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Side-by-side tables */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* Count Table */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Win Ratio — Count (%)</span>
          </div>
          <div className="dash-table-wrapper">
            <table className="dash-table">
              <thead>
                <tr>
                  <th style={{ textAlign: 'left' }}>Month</th>
                  {years.map(y => <th key={y}>{y}</th>)}
                </tr>
              </thead>
              <tbody>
                {MONTHS.map(month => (
                  <tr key={month}>
                    <td>{month.slice(0,3)}</td>
                    {years.map(yr => {
                      const val = pivotCount[month]?.[yr]
                      return (
                        <td key={yr} className={`ratio-cell ${getRatioClass(val)}`}>
                          {val !== null && val !== undefined ? `${val}%` : '—'}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Dollar Table */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Win Ratio — $ (%)</span>
          </div>
          <div className="dash-table-wrapper">
            <table className="dash-table">
              <thead>
                <tr>
                  <th style={{ textAlign: 'left' }}>Month</th>
                  {years.map(y => <th key={y}>{y}</th>)}
                </tr>
              </thead>
              <tbody>
                {MONTHS.map(month => (
                  <tr key={month}>
                    <td>{month.slice(0,3)}</td>
                    {years.map(yr => {
                      const val = pivotDollar[month]?.[yr]
                      return (
                        <td key={yr} className={`ratio-cell ${getRatioClass(val)}`}>
                          {val !== null && val !== undefined ? `${val}%` : '—'}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-head)', letterSpacing: '0.06em' }}>
        Color scale: <span className="ratio-high">■ ≥50%</span> &nbsp;
        <span className="ratio-mid">■ 25–49%</span> &nbsp;
        <span className="ratio-low">■ &lt;25%</span> &nbsp;
        <span className="ratio-none">■ No data</span>
      </div>
    </div>
  )
}
