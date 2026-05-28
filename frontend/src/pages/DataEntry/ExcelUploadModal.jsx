import { useState, useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { rfqAPI } from '../../api/client'
import { X, Upload, FileSpreadsheet, Check, AlertCircle, ChevronRight } from 'lucide-react'

/**
 * ExcelUploadModal
 * Drag-and-drop Excel upload with preview diff before committing.
 */
export default function ExcelUploadModal({ onClose, onImported }) {
  const qc = useQueryClient()
  const fileInputRef = useRef(null)

  const [step, setStep] = useState('select')    // 'select' | 'preview' | 'done'
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [dragOver, setDragOver] = useState(false)

  // Preview mutation (dry-run)
  const previewMutation = useMutation({
    mutationFn: (f) => {
      const fd = new FormData()
      fd.append('file', f)
      fd.append('commit', 'false')
      return rfqAPI.uploadExcel(fd).then(r => r.data)
    },
    onSuccess: (data) => {
      setPreview(data)
      setStep('preview')
    },
    onError: (err) => {
      const msg = err.response?.data?.detail || 'Failed to read file'
      toast.error(msg)
    },
  })

  // Commit mutation
  const commitMutation = useMutation({
    mutationFn: () => {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('commit', 'true')
      return rfqAPI.uploadExcel(fd).then(r => r.data)
    },
    onSuccess: (data) => {
      toast.success(`Import complete: ${preview.new.length} new, ${preview.updated.length} to update`)
      qc.invalidateQueries({ queryKey: ['rfq'] })
      setStep('done')
      onImported?.()
    },
    onError: (err) => {
      const msg = err.response?.data?.detail || 'Import failed'
      toast.error(msg)
    },
  })

  function handleFile(f) {
    if (!f) return
    if (!f.name.endsWith('.xlsx')) {
      toast.error('Only .xlsx files are accepted')
      return
    }
    setFile(f)
    previewMutation.mutate(f)
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files?.[0]
    handleFile(f)
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal animate-slide-up" style={{ maxWidth: 680 }}>

        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <FileSpreadsheet style={{ width: 18, height: 18, color: 'var(--success)' }} />
            <h2 className="modal-title">Upload Excel</h2>
          </div>
          <button className="modal-close" onClick={onClose}><X /></button>
        </div>

        {/* Step: Select File */}
        {step === 'select' && (
          <div>
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: `2px dashed ${dragOver ? 'var(--primary)' : 'var(--border-strong)'}`,
                borderRadius: 8,
                padding: '48px 24px',
                textAlign: 'center',
                cursor: 'pointer',
                background: dragOver ? 'var(--primary-muted)' : 'var(--bg-surface)',
                transition: 'all 200ms ease',
              }}
            >
              <Upload style={{ width: 36, height: 36, color: 'var(--text-muted)', margin: '0 auto 12px' }} />
              <p style={{ fontFamily: 'var(--font-head)', fontSize: '0.9rem', fontWeight: 600, marginBottom: 6 }}>
                Drop your Excel file here
              </p>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                or click to browse — accepts <strong>.xlsx</strong> with a "Data" sheet
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx"
                style={{ display: 'none' }}
                onChange={e => handleFile(e.target.files?.[0])}
              />
            </div>

            {previewMutation.isPending && (
              <div className="loading-overlay" style={{ minHeight: 80 }}>
                Reading file…
              </div>
            )}
          </div>
        )}

        {/* Step: Preview */}
        {step === 'preview' && preview && (
          <div>
            {/* Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
              <SummaryCard label="New Records" value={preview.new.length} color="var(--success)" />
              <SummaryCard label="Existing (update)" value={preview.updated.length} color="var(--primary)" />
              <SummaryCard label="Skipped / Invalid" value={preview.skipped} color="var(--text-muted)" />
            </div>

            {/* Filename */}
            <div style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-default)',
              borderRadius: 6,
              padding: '8px 12px',
              marginBottom: 16,
              fontFamily: 'var(--font-mono)',
              fontSize: '0.78rem',
              color: 'var(--text-secondary)',
            }}>
              <FileSpreadsheet style={{ width: 12, height: 12, display: 'inline', marginRight: 6 }} />
              {file?.name}
            </div>

            {/* New Records preview table */}
            {preview.new.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--success)', marginBottom: 8 }}>
                  New Records ({Math.min(preview.new.length, 10)} of {preview.new.length} shown)
                </div>
                <div style={{ border: '1px solid var(--border-default)', borderRadius: 6, overflow: 'hidden', maxHeight: 200, overflowY: 'auto' }}>
                  <table className="dash-table">
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'left' }}>Quote #</th>
                        <th style={{ textAlign: 'left' }}>Project Name</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.new.slice(0, 10).map(r => (
                        <tr key={r.quote_no}>
                          <td style={{ textAlign: 'left', fontFamily: 'var(--font-mono)', color: 'var(--success)' }}>
                            {r.quote_no}
                          </td>
                          <td style={{ textAlign: 'left' }}>{r.project_name || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Errors */}
            {preview.errors?.length > 0 && (
              <div style={{
                background: 'var(--danger-muted)',
                border: '1px solid var(--danger-border)',
                borderRadius: 6,
                padding: '10px 12px',
                marginBottom: 16,
                fontSize: '0.78rem',
                color: 'var(--danger)',
              }}>
                <AlertCircle style={{ width: 12, height: 12, display: 'inline', marginRight: 6 }} />
                {preview.errors.length} errors detected — review before committing
              </div>
            )}

            {preview.message && (
              <div style={{
                background: 'var(--warning-muted)',
                border: '1px solid var(--warning-border)',
                borderRadius: 6,
                padding: '10px 12px',
                marginBottom: 16,
                fontSize: '0.75rem',
                color: 'var(--warning)',
              }}>
                ℹ️ {preview.message}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, paddingTop: 16, borderTop: '1px solid var(--border-default)' }}>
              <button className="btn btn-ghost" onClick={() => { setStep('select'); setPreview(null); setFile(null) }}>
                ← Choose Different File
              </button>
              <button
                className="btn btn-primary"
                onClick={() => commitMutation.mutate()}
                disabled={commitMutation.isPending}
              >
                <Check style={{ width: 13, height: 13 }} />
                {commitMutation.isPending ? 'Importing…' : `Confirm Import (${preview.new.length} new)`}
              </button>
            </div>
          </div>
        )}

        {/* Step: Done */}
        {step === 'done' && (
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--success-muted)', border: '1px solid var(--success-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Check style={{ width: 24, height: 24, color: 'var(--success)' }} />
            </div>
            <p style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '1rem', marginBottom: 6 }}>Import Complete</p>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              {preview?.new.length} new records · {preview?.updated.length} existing reviewed
            </p>
            <button className="btn btn-primary" style={{ marginTop: 20 }} onClick={onClose}>
              Done <ChevronRight style={{ width: 13, height: 13 }} />
            </button>
          </div>
        )}

      </div>
    </div>
  )
}

function SummaryCard({ label, value, color }) {
  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: '1px solid var(--border-default)',
      borderRadius: 8,
      padding: '12px 16px',
      textAlign: 'center',
    }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.6rem', fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: '0.68rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginTop: 4 }}>{label}</div>
    </div>
  )
}
