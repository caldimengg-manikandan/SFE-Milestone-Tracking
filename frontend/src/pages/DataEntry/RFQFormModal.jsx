import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { rfqAPI } from '../../api/client'
import { X } from 'lucide-react'

export default function RFQFormModal({ customers, estimators, onClose, onSaved }) {
  const [form, setForm] = useState({
    quote_no: '', budget_type: 'Budget', bid_reference: '',
    project_name: '', project_comments: '', bid_due_date: '', bid_due_time: '',
    location: '', distance_travel: '',
    prevailing_wage: false,
    customer: '', decision_to_bid: 'Bid',
    primary_estimator: '', bid_amount: '', won_lost: 'Pending',
    quote_date: new Date().toISOString().slice(0, 10),
    scope_of_work: '',
  })

  const mutation = useMutation({
    mutationFn: (data) => rfqAPI.create(data),
    onSuccess: () => {
      toast.success('RFQ created')
      onSaved()
    },
    onError: (err) => {
      const errors = err.response?.data
      const msg = errors
        ? Object.entries(errors).map(([k, v]) => `${k}: ${Array.isArray(v) ? v[0] : v}`).join('\n')
        : 'Failed to create RFQ'
      toast.error(msg)
    },
  })

  const set = (field, val) => setForm(prev => ({ ...prev, [field]: val }))

  function handleSubmit(e) {
    e.preventDefault()
    const payload = { ...form }
    // Convert empty strings to null for optional numeric/fk fields
    ;['bid_amount', 'customer', 'primary_estimator', 'distance_travel', 'scope_of_work'].forEach(f => {
      if (payload[f] === '' || payload[f] === null) payload[f] = null
    })
    ;['bid_due_time'].forEach(f => {
      if (payload[f] === '') payload[f] = null
    })
    mutation.mutate(payload)
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal animate-slide-up">
        <div className="modal-header">
          <h2 className="modal-title">New RFQ</h2>
          <button className="modal-close" onClick={onClose}><X /></button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            {/* Row 1: Quote No + Type + Quote Date + Bid Reference */}
            <div className="form-group">
              <label className="form-label">Quote No *</label>
              <input className="form-input" value={form.quote_no}
                onChange={e => set('quote_no', e.target.value)}
                placeholder="e.g. 26-05-01" required />
            </div>
            <div className="form-group">
              <label className="form-label">Type</label>
              <select className="form-select" value={form.budget_type}
                onChange={e => set('budget_type', e.target.value)}>
                {['Budget','Final','Rebid'].map(v => <option key={v}>{v}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Quote Date</label>
              <input className="form-input" type="date" value={form.quote_date}
                onChange={e => set('quote_date', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Bid Reference</label>
              <input className="form-input" value={form.bid_reference}
                onChange={e => set('bid_reference', e.target.value)}
                placeholder="e.g. Ref #123" />
            </div>

            {/* Row 2: Project Name (full width) */}
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Project Name *</label>
              <input className="form-input" value={form.project_name}
                onChange={e => set('project_name', e.target.value)} required />
            </div>

            {/* Row 3: Project Comments (full width) */}
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Project Comments</label>
              <textarea className="form-input" style={{ minHeight: '60px', resize: 'vertical' }} value={form.project_comments}
                onChange={e => set('project_comments', e.target.value)} />
            </div>

            {/* Row 4: Bid Due Date + Bid Due Time + Location */}
            <div className="form-group">
              <label className="form-label">Bid Due Date</label>
              <input className="form-input" type="date" value={form.bid_due_date}
                onChange={e => set('bid_due_date', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Bid Due Time</label>
              <input className="form-input" type="time" value={form.bid_due_time}
                onChange={e => set('bid_due_time', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Location</label>
              <input className="form-input" value={form.location}
                onChange={e => set('location', e.target.value)} />
            </div>

            {/* Row 5: Distance + Customer + Decision to Bid */}
            <div className="form-group">
              <label className="form-label">Distance (miles)</label>
              <input className="form-input" type="number" step="1" value={form.distance_travel}
                onChange={e => set('distance_travel', e.target.value)} placeholder="0" />
            </div>
            <div className="form-group">
              <label className="form-label">Customer</label>
              <select className="form-select" value={form.customer}
                onChange={e => set('customer', e.target.value)}>
                <option value="">— Select —</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Decision to Bid</label>
              <select className="form-select" value={form.decision_to_bid}
                onChange={e => set('decision_to_bid', e.target.value)}>
                {['Yes','No','NoBid','Bid'].map(v => <option key={v}>{v}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Scope of work</label>
              <select className="form-select" value={form.scope_of_work}
                onChange={e => set('scope_of_work', e.target.value)}>
                <option value="">None</option>
                <option value="Detailing">Detailing</option>
                <option value="Fabrication">Fabrication</option>
                <option value="Erection">Erection</option>
              </select>
            </div>

            {/* Row 6: Primary Estimator + Bid Amount + Status */}
            <div className="form-group">
              <label className="form-label">Primary Estimator</label>
              <select className="form-select" value={form.primary_estimator}
                onChange={e => set('primary_estimator', e.target.value)}>
                <option value="">— Select —</option>
                {estimators.map(e => <option key={e.id} value={e.id}>{e.initials}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Bid Amount</label>
              <input className="form-input" type="number" value={form.bid_amount}
                onChange={e => set('bid_amount', e.target.value)} placeholder="0.00" />
            </div>
            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="form-select" value={form.won_lost}
                onChange={e => set('won_lost', e.target.value)}>
                <option value="Won">Won</option>
                <option value="Lost">Lost</option>
                <option value="Pending">Pending</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--border-default)' }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={mutation.isPending}>
              {mutation.isPending ? 'Creating…' : 'Create RFQ'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
