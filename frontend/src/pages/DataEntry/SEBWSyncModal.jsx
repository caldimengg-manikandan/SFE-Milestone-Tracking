import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { rfqAPI } from '../../api/client'
import { X, Zap, Info } from 'lucide-react'

/**
 * SEBWSyncModal
 * Accepts the 5 key output values from SEBW and patches them onto an RFQ record.
 * Days → Months conversion: months = ceil(days / 22)
 */
export default function SEBWSyncModal({ rfq, onClose, onSaved }) {
  const qc = useQueryClient()

  const [form, setForm] = useState({
    bid_amount:                   rfq.bid_amount ?? '',
    quoted_profit:                rfq.quoted_profit ?? '',
    struct_erect_hours:           rfq.struct_erect_hours ?? '',
    working_days_raw:             '',            // SEBW input (days)
    struct_erect_duration_months: rfq.struct_erect_duration_months ?? '', // auto-filled
    sq_ft_structural:             rfq.sq_ft_structural ?? '',
  })

  const set = (field, val) => setForm(prev => ({ ...prev, [field]: val }))

  // Auto-convert working days → months whenever days field changes
  function handleDaysChange(days) {
    set('working_days_raw', days)
    if (days && !isNaN(days) && Number(days) > 0) {
      const months = Math.ceil(Number(days) / 22)
      set('struct_erect_duration_months', months)
    } else {
      set('struct_erect_duration_months', '')
    }
  }

  const mutation = useMutation({
    mutationFn: () => {
      const payload = {}
      if (form.bid_amount !== '')                   payload.bid_amount = parseFloat(form.bid_amount)
      if (form.quoted_profit !== '')                payload.quoted_profit = parseFloat(form.quoted_profit)
      if (form.struct_erect_hours !== '')           payload.struct_erect_hours = parseFloat(form.struct_erect_hours)
      if (form.struct_erect_duration_months !== '') payload.struct_erect_duration_months = parseInt(form.struct_erect_duration_months, 10)
      if (form.sq_ft_structural !== '')            payload.sq_ft_structural = parseFloat(form.sq_ft_structural)
      return rfqAPI.sebwSync(rfq.id, payload)
    },
    onSuccess: () => {
      toast.success('SEBW values applied to RFQ')
      qc.invalidateQueries({ queryKey: ['rfq'] })
      onSaved()
    },
    onError: (err) => {
      const msg = err.response?.data?.detail || 'SEBW sync failed'
      toast.error(msg)
    },
  })

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal animate-slide-up" style={{ maxWidth: 560 }}>

        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Zap style={{ width: 18, height: 18, color: '#F97316' }} />
            <h2 className="modal-title" style={{ color: '#F97316' }}>Pull from SEBW</h2>
          </div>
          <button className="modal-close" onClick={onClose}><X /></button>
        </div>

        {/* Instruction Banner */}
        <div style={{
          background: 'rgba(249, 115, 22, 0.08)',
          border: '1px solid rgba(249, 115, 22, 0.25)',
          borderRadius: 6,
          padding: '10px 14px',
          marginBottom: 20,
          display: 'flex',
          gap: 8,
          alignItems: 'flex-start',
          fontSize: '0.8rem',
          color: 'var(--text-secondary)',
          lineHeight: 1.5,
        }}>
          <Info style={{ width: 14, height: 14, color: '#F97316', marginTop: 2, flexShrink: 0 }} />
          <span>
            Copy these values from the <strong style={{ color: 'var(--text-primary)' }}>Totals Dashboard</strong> section
            at the top of your SEBW bid. Only fields you fill in will be updated — leave blank to keep existing values.
          </span>
        </div>

        {/* Record Context */}
        <div style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-default)',
          borderRadius: 6,
          padding: '8px 12px',
          marginBottom: 20,
          fontFamily: 'var(--font-mono)',
          fontSize: '0.78rem',
          color: 'var(--text-secondary)',
        }}>
          <strong style={{ color: 'var(--text-primary)' }}>{rfq.quote_no}</strong>
          {' — '}
          {rfq.project_name}
        </div>

        <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 16 }}>

          {/* Actual Selling */}
          <div className="form-group">
            <label className="form-label">
              Actual Selling
              <Hint>SEBW Totals Dashboard → "Actual Selling"</Hint>
            </label>
            <input
              className="form-input"
              type="number"
              step="0.01"
              placeholder="e.g. 485000"
              value={form.bid_amount}
              onChange={e => set('bid_amount', e.target.value)}
            />
            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>→ Bid Amount (Col AL)</span>
          </div>

          {/* Profit */}
          <div className="form-group">
            <label className="form-label">
              Profit
              <Hint>SEBW Totals Dashboard → "Profit"</Hint>
            </label>
            <input
              className="form-input"
              type="number"
              step="0.01"
              placeholder="e.g. 48500"
              value={form.quoted_profit}
              onChange={e => set('quoted_profit', e.target.value)}
            />
            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>→ Quoted Profit (Col AM)</span>
          </div>

          {/* Hours */}
          <div className="form-group">
            <label className="form-label">
              Hours (Total Labor)
              <Hint>SEBW Totals Dashboard → "Hours"</Hint>
            </label>
            <input
              className="form-input"
              type="number"
              step="0.01"
              placeholder="e.g. 1899.27"
              value={form.struct_erect_hours}
              onChange={e => set('struct_erect_hours', e.target.value)}
            />
            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>→ Structural Erection Hours (Col BJ)</span>
          </div>

          {/* Struc SQFT */}
          <div className="form-group">
            <label className="form-label">
              Struc. SQFT
              <Hint>SEBW Bid Detail → Project Information → "Struc. SQFT"</Hint>
            </label>
            <input
              className="form-input"
              type="number"
              step="1"
              placeholder="e.g. 165000"
              value={form.sq_ft_structural}
              onChange={e => set('sq_ft_structural', e.target.value)}
            />
            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>→ Sq. Ft. Structural (Col AS)</span>
          </div>

          {/* Working Days (SEBW raw input) */}
          <div className="form-group">
            <label className="form-label">
              Working Days
              <Hint>SEBW Totals Dashboard → "Working Days" (total days shown)</Hint>
            </label>
            <input
              className="form-input"
              type="number"
              step="1"
              placeholder="e.g. 50"
              value={form.working_days_raw}
              onChange={e => handleDaysChange(e.target.value)}
            />
            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
              SEBW shows days — auto-converted below
            </span>
          </div>

          {/* Duration months (auto-calculated, editable) */}
          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              Duration (Months)
              <span style={{ fontSize: '0.65rem', background: 'rgba(249,115,22,0.15)', color: '#F97316', padding: '1px 6px', borderRadius: 10, fontWeight: 600 }}>
                Auto ÷22
              </span>
            </label>
            <input
              className="form-input"
              type="number"
              step="1"
              placeholder="Auto-filled"
              value={form.struct_erect_duration_months}
              onChange={e => set('struct_erect_duration_months', e.target.value)}
              style={{ borderColor: form.working_days_raw ? 'rgba(249,115,22,0.5)' : undefined }}
            />
            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
              ceil(days ÷ 22). Adjust if needed. → Col BL
            </span>
          </div>

        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--border-default)' }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button
            className="btn"
            style={{ background: '#F97316', color: '#fff', borderColor: '#F97316' }}
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
          >
            <Zap style={{ width: 13, height: 13 }} />
            {mutation.isPending ? 'Applying…' : 'Apply SEBW Values'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Hint({ children }) {
  return (
    <span
      title={children}
      style={{ marginLeft: 4, cursor: 'help', color: 'var(--text-muted)', opacity: 0.7 }}
    >
      <Info style={{ width: 10, height: 10, display: 'inline', verticalAlign: 'middle' }} />
    </span>
  )
}
