import { useQuery } from '@tanstack/react-query'
import { dashboardAPI } from '../../api/client'
import { ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, Legend } from 'recharts'

const MONTHS = ['January','February','March','April','May','June',
                 'July','August','September','October','November','December']

const CustomTooltip = ({ active, payload, label, unit }) => {
  if (active && payload && payload.length) {
    return (
      <div className="card" style={{ padding: '8px 12px', background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', fontSize: '0.78rem', boxShadow: 'var(--shadow-md)' }}>
        <div style={{ fontWeight: 600, marginBottom: 4, fontFamily: 'var(--font-head)' }}>{label}</div>
        {payload.map((p, idx) => (
          <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, color: p.color }}>
            <span style={{ fontWeight: 500 }}>{p.name}:</span>
            <span className="mono" style={{ fontWeight: 600 }}>${p.value.toLocaleString(undefined, { minimumFractionDigits: 2 })}/{unit}</span>
          </div>
        ))}
      </div>
    )
  }
  return null
}

export default function JobAnalyticsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['job-analytics'],
    queryFn: () => dashboardAPI.jobAnalytics().then(r => r.data),
  })

  const currentYear = data?.current_year || new Date().getFullYear()
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i)
  const rows = data?.data || []

  // Real-time calculations of historical statistics & insights
  const allTons = rows.map(r => r.avg_cost_per_ton).filter(v => v !== null && v !== undefined && v > 0)
  const avgTon = allTons.length ? allTons.reduce((a, b) => a + b, 0) / allTons.length : null
  const minTon = allTons.length ? Math.min(...allTons) : null
  const minTonRow = rows.find(r => r.avg_cost_per_ton === minTon)

  const allSqfts = rows.map(r => r.avg_cost_per_sqft).filter(v => v !== null && v !== undefined && v > 0)
  const avgSqft = allSqfts.length ? allSqfts.reduce((a, b) => a + b, 0) / allSqfts.length : null
  const minSqft = allSqfts.length ? Math.min(...allSqfts) : null
  const minSqftRow = rows.find(r => r.avg_cost_per_sqft === minSqft)

  const pivotTon = {}; const pivotSqft = {}
  MONTHS.forEach(m => { pivotTon[m] = {}; pivotSqft[m] = {} })
  rows.forEach(r => {
    if (r.month in pivotTon) {
      pivotTon[r.month][r.year] = r.avg_cost_per_ton
      pivotSqft[r.month][r.year] = r.avg_cost_per_sqft
    }
  })

  // Format Recharts seasonal data for grouped bar chart (histogram style)
  const chartData = MONTHS.map(m => {
    const d = { month: m.slice(0, 3) }
    years.forEach(y => {
      const match = rows.find(r => r.month === m && r.year === y)
      if (match) {
        if (match.avg_cost_per_ton) d[`ton_${y}`] = parseFloat(match.avg_cost_per_ton.toFixed(2))
        if (match.avg_cost_per_sqft) d[`sqft_${y}`] = parseFloat(match.avg_cost_per_sqft.toFixed(2))
      }
    })
    return d
  })

  const getHeatmapColor = (val, avg) => {
    if (val === null || val === undefined || !avg) return { color: 'var(--text-muted)' }
    if (val < avg * 0.85) {
      return { 
        color: '#10b981', 
        fontWeight: '600',
        background: 'rgba(16, 185, 129, 0.08)'
      }
    }
    if (val > avg * 1.15) {
      return { 
        color: '#ef4444', 
        fontWeight: '600',
        background: 'rgba(239, 68, 68, 0.08)'
      }
    }
    return { color: 'var(--text-primary)' }
  }

  if (isLoading) return <div className="loading-overlay">Loading Job Analytics…</div>

  const renderTable = (pivot, title, unit, average) => (
    <div className="card">
      <div className="card-header">
        <div>
          <span className="card-title">{title}</span>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>
            Heatmapped relative to historical average (${average?.toFixed(2)}/{unit})
          </div>
        </div>
        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>Won jobs only</span>
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
                <td style={{ fontWeight: 600 }}>{month.slice(0,3)}</td>
                {years.map(yr => {
                  const val = pivot[month]?.[yr]
                  const heatmapStyle = getHeatmapColor(val, average)
                  return (
                    <td key={yr} className="mono" style={{ ...heatmapStyle, borderBottom: '1px solid var(--border-subtle)' }}>
                      {val != null ? `$${val.toFixed(2)}` : '—'}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, animation: 'fadeIn 250ms ease' }}>
      <div className="page-header" style={{ marginBottom: 0 }}>
        <div>
          <h1 className="page-title">Job Analytics</h1>
          <div className="page-subtitle">Historical Performance &amp; Unit Cost Trends of Awarded Bids</div>
        </div>
      </div>

      {/* KPI Cards Section */}
      <div className="kpi-grid" style={{ marginBottom: 0 }}>
        <div className="kpi-card" style={{ borderLeft: '3px solid var(--primary)' }}>
          <div className="kpi-label">Historical Avg Cost/Ton</div>
          <div className="kpi-value">{avgTon ? `$${avgTon.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—'}</div>
          <div className="kpi-subtitle">Weighted average across won jobs</div>
        </div>
        <div className="kpi-card" style={{ borderLeft: '3px solid #10b981' }}>
          <div className="kpi-label">Historical Avg Cost/Sq.Ft</div>
          <div className="kpi-value">{avgSqft ? `$${avgSqft.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—'}</div>
          <div className="kpi-subtitle">Weighted average across won jobs</div>
        </div>
        <div className="kpi-card" style={{ borderLeft: '3px solid #f59e0b' }}>
          <div className="kpi-label">Peak Efficiency (Ton)</div>
          <div className="kpi-value" style={{ color: '#10b981' }}>
            {minTon ? `$${minTon.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—'}
          </div>
          <div className="kpi-subtitle">
            {minTonRow ? `${minTonRow.month.slice(0,3)} ${minTonRow.year}` : '—'}
          </div>
        </div>
        <div className="kpi-card" style={{ borderLeft: '3px solid #8b5cf6' }}>
          <div className="kpi-label">Peak Efficiency (Sq.Ft)</div>
          <div className="kpi-value" style={{ color: '#10b981' }}>
            {minSqft ? `$${minSqft.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—'}
          </div>
          <div className="kpi-subtitle">
            {minSqftRow ? `${minSqftRow.month.slice(0,3)} ${minSqftRow.year}` : '—'}
          </div>
        </div>
      </div>

      {/* Interactive Seasonal Trends Section (Histogram/Grouped Bar Chart style) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <div className="card" style={{ padding: 16, display: 'flex', flexDirection: 'column', height: 350 }}>
          <div className="card-header" style={{ marginBottom: 12, border: 'none', padding: 0 }}>
            <span className="card-title" style={{ fontSize: '0.9rem' }}>Cost / Ton Seasonal Trends (Histogram)</span>
          </div>
          <div style={{ flex: 1, minHeight: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                <XAxis dataKey="month" stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                <YAxis stroke="var(--text-muted)" fontSize={11} tickFormatter={v => `$${v}`} tickLine={false} />
                <Tooltip content={<CustomTooltip unit="ton" />} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                <Bar dataKey="ton_2026" fill="var(--primary)" radius={[4, 4, 0, 0]} name="2026" />
                <Bar dataKey="ton_2025" fill="#10b981" radius={[4, 4, 0, 0]} name="2025" />
                <Bar dataKey="ton_2024" fill="#f59e0b" radius={[4, 4, 0, 0]} name="2024" />
                <Bar dataKey="ton_2023" fill="#06b6d4" radius={[4, 4, 0, 0]} name="2023" />
                <Bar dataKey="ton_2022" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="2022" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card" style={{ padding: 16, display: 'flex', flexDirection: 'column', height: 350 }}>
          <div className="card-header" style={{ marginBottom: 12, border: 'none', padding: 0 }}>
            <span className="card-title" style={{ fontSize: '0.9rem' }}>Cost / Sq.Ft Seasonal Trends (Histogram)</span>
          </div>
          <div style={{ flex: 1, minHeight: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                <XAxis dataKey="month" stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                <YAxis stroke="var(--text-muted)" fontSize={11} tickFormatter={v => `$${v}`} tickLine={false} />
                <Tooltip content={<CustomTooltip unit="sqft" />} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                <Bar dataKey="sqft_2026" fill="var(--primary)" radius={[4, 4, 0, 0]} name="2026" />
                <Bar dataKey="sqft_2025" fill="#10b981" radius={[4, 4, 0, 0]} name="2025" />
                <Bar dataKey="sqft_2024" fill="#f59e0b" radius={[4, 4, 0, 0]} name="2024" />
                <Bar dataKey="sqft_2023" fill="#06b6d4" radius={[4, 4, 0, 0]} name="2023" />
                <Bar dataKey="sqft_2022" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="2022" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Grid Pivot Tables with Heatmaps */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {renderTable(pivotTon, 'Avg Cost / Ton Matrix', '$/ton', avgTon)}
        {renderTable(pivotSqft, 'Avg Cost / Sq.Ft Matrix', '$/sqft', avgSqft)}
      </div>
    </div>
  )
}
