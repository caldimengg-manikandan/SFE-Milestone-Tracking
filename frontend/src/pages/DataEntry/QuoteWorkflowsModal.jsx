import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { quoteWorkflowsAPI } from '../../api/client'
import toast from 'react-hot-toast'
import {
  X, RefreshCw, Send, CheckCircle2, Clock, Mail,
  FileText, Sparkles, AlertCircle, Trash2
} from 'lucide-react'

export default function QuoteWorkflowsModal({ isOpen, onClose }) {
  const qc = useQueryClient()
  const [selectedQuoteId, setSelectedQuoteId] = useState(null)
  const [autoSyncRepliesEnabled, setAutoSyncRepliesEnabled] = useState(true)
  const [isAutoSyncingReplies, setIsAutoSyncingReplies] = useState(false)
  const [composerState, setComposerState] = useState({
    recipient: '',
    fromEmail: '',
    subject: '',
    body: '',
    estimatorBody: '',
    detailerBody: '',
  })

  // Auto-sync quote replies every 30 seconds while modal is open
  useEffect(() => {
    if (!isOpen || !autoSyncRepliesEnabled) return

    const runAutoSyncReplies = async () => {
      try {
        setIsAutoSyncingReplies(true)
        const res = await quoteWorkflowsAPI.syncReplies()
        const { imported_count = 0, synced_replies_count = 0 } = res.data || {}

        if (synced_replies_count > 0 || imported_count > 0) {
          toast.success(
            `Auto-sync: ${synced_replies_count} reply update(s)${imported_count > 0 ? `, ${imported_count} new quote(s)` : ''}`,
            { duration: 4000 }
          )
          qc.invalidateQueries({ queryKey: ['quote-workflows'] })
          qc.invalidateQueries({ queryKey: ['rfq'] })
        }
      } catch (err) {
        console.debug('Auto reply sync background notice:', err)
      } finally {
        setIsAutoSyncingReplies(false)
      }
    }

    const intervalId = setInterval(runAutoSyncReplies, 30000)
    return () => clearInterval(intervalId)
  }, [isOpen, autoSyncRepliesEnabled, qc])

  // Fetch list of Quote Workflows with 30s auto-refresh
  const { data: workflows = [], isLoading } = useQuery({
    queryKey: ['quote-workflows'],
    queryFn: () => quoteWorkflowsAPI.list().then(res => res.data),
    enabled: isOpen,
    refetchInterval: isOpen && autoSyncRepliesEnabled ? 30000 : false,
  })

  // Derive active selected workflow from live query data
  const selectedWorkflow = workflows.find(w => w.quote_id === selectedQuoteId) || null

  // Sync replies mutation
  const syncMutation = useMutation({
    mutationFn: () => quoteWorkflowsAPI.syncReplies(),
    onSuccess: (res) => {
      const { imported_count = 0, synced_replies_count = 0 } = res.data || {}
      toast.success(
        `Sync complete! ${synced_replies_count} reply updates, ${imported_count} new quotes.`,
        { duration: 4000 }
      )
      qc.invalidateQueries({ queryKey: ['quote-workflows'] })
      qc.invalidateQueries({ queryKey: ['rfq'] })
    },
    onError: (err) => {
      toast.error(err.response?.data?.detail || 'Failed to sync reply emails')
    }
  })

  // Combine and send mutation
  const sendMutation = useMutation({
    mutationFn: ({ id, data }) => quoteWorkflowsAPI.combineAndSend(id, data),
    onSuccess: (res) => {
      toast.success(res.data?.message || 'Combined quotation email dispatched successfully!', { duration: 4000 })
      qc.invalidateQueries({ queryKey: ['quote-workflows'] })
      setSelectedQuoteId(null)
    },
    onError: (err) => {
      toast.error(err.response?.data?.detail || 'Failed to dispatch quotation email')
    }
  })

  // Delete workflow mutation
  const deleteMutation = useMutation({
    mutationFn: (id) => quoteWorkflowsAPI.delete(id),
    onSuccess: () => {
      toast.success('Quote workflow deleted successfully')
      qc.invalidateQueries({ queryKey: ['quote-workflows'] })
      qc.invalidateQueries({ queryKey: ['rfq'] })
      setSelectedQuoteId(null)
      setComposerState({
        recipient: '',
        fromEmail: '',
        subject: '',
        body: '',
        estimatorBody: '',
        detailerBody: '',
      })
    },
    onError: (err) => {
      toast.error(err.response?.data?.detail || 'Failed to delete quote workflow')
    }
  })

  // Clean email address
  const cleanEmail = (str) => {
    if (!str) return ''
    const match = str.match(/<([^>]+)>/)
    if (match) return match[1].trim()
    const matchEmail = str.match(/[\w.+]+@[\w.-]+\.[a-zA-Z]{2,}/)
    if (matchEmail) return matchEmail[0].trim()
    return str.trim()
  }

  // Clean reply text on client side
  const cleanReplySnippet = (text) => {
    if (!text) return ''
    const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')
    const cleaned = []
    
    for (const line of lines) {
      const stripped = line.trim()
      if (/^(On\s+.+wrote:|From:\s*.+|Sent:\s*.+|To:\s*.+|Subject:\s*.+|---------- Forwarded message ----------)/i.test(stripped)) {
        break
      }
      if (stripped.startsWith('>') || stripped.startsWith('>>')) {
        continue
      }
      cleaned.push(stripped)
    }

    const greetingRegex = /^(?:hi|hello|hey|dear|good\s+morning|good\s+afternoon|good\s+evening|greetings)(?:\s+[\w\s.,\-/&]+)?[,:!-]?$/i
    while (cleaned.length > 0 && (!cleaned[0] || greetingRegex.test(cleaned[0]))) {
      cleaned.shift()
    }

    const signoffRegex = /^(?:thanks(?:\s+and|\s*&)?\s*(?:regards|warm\s+regards)?|thank\s+you(?:\s+very\s+much|\s+all)?|regards|best\s+regards|warm\s+regards|kind\s+regards|sincerely|cheers|with\s+regards|best|sent\s+from\s+my\s+iphone|sent\s+from\s+mail\s+for\s+windows|sent\s+from\s+outlook|get\s+outlook\s+for\s+android|get\s+outlook\s+for\s+ios)(?:\s*,)?(?:\s+[\w\s.,-]+)?$/i

    const footerLineRegex = /^(?:--\s*|[-_=*~]{2,}|caldim\s+engineering.*|caldim.*|steel\s+fab\s+enterprises.*|das\s*\(?digitalization.*|division\s*:?|department\s*:?|corporate\s+office.*|registered\s+office.*|branch\s+office.*|head\s+office.*|plot\s+no.*|near\s+rto.*|minmac\s+center.*|arcot\s+road.*|valasaravakkam.*|.*(?:hosur|chennai|bangalore|bengaluru)\s*[-–\s]*\d{5,6}.*|(?:office\s*#?|cell\s*:|tel\s*:|phone\s*:|mobile\s*:|fax\s*:|direct\s*:).*|(?:email|e-mail)\s*:.*@.*|(?:website|web)\s*:?.*|(?:https?:\/\/)?(?:www\.)?(?:caldimproducts|caldimengg)\.com.*|(?:system\s+engineer|software\s+development|software\s+engineer|estimator|detailer|draftsman|modeler|lead\s+estimator|senior\s+estimator|project\s+manager|sales\s+manager|manager|director|vp|ceo).*|namrutha(?:\s+k\.?r\.?)?|divya(?:\s+[a-z]\.?)?|manikandan(?:\s+[a-z]\.?)?|thamizh(?:arasan)?|disclaimer:?.*|confidentiality\s+notice:?.*|privileged\s+and\s+confidential.*|this\s+email\s+and\s+any\s+files.*)$/i

    while (cleaned.length > 0) {
      const last = cleaned[cleaned.length - 1]
      if (!last || signoffRegex.test(last) || footerLineRegex.test(last)) {
        cleaned.pop()
      } else {
        break
      }
    }

    while (cleaned.length > 0) {
      const last = cleaned[cleaned.length - 1]
      if (!last || signoffRegex.test(last) || footerLineRegex.test(last)) {
        cleaned.pop()
      } else {
        break
      }
    }

    return cleaned.join('\n').trim()
  }

  // Load preview data when a workflow is opened for dispatching
  const handleOpenComposer = async (workflow) => {
    setSelectedQuoteId(workflow.quote_id)
    const cleanedEst = cleanReplySnippet(workflow.estimator_reply_body)
    const cleanedDet = cleanReplySnippet(workflow.detailer_reply_body)
    const defaultRecipient = cleanEmail(workflow.clean_sender || workflow.sender) || ''
    const defaultSubject = `Quotation Details - Ref: ${workflow.quote_id}${workflow.project_name ? ` - ${workflow.project_name}` : ''}`
    const projClause = workflow.project_name ? ` for ${workflow.project_name}` : ''
    const custName = workflow.customer_name || "Customer"
    const initialBody = `Dear ${custName},\n\nWe are pleased to provide the compiled commercial estimation and detailing quotation${projClause} (Ref: ${workflow.quote_id}).\n\nBelow is the consolidated summary provided by our technical teams:\n\n=== ESTIMATION DETAILS ===\n${cleanedEst || 'Commercial estimation in progress.'}\n\n=== DETAILING DETAILS ===\n${cleanedDet || 'Detailing schedule in progress.'}\n\nPlease review the details above and let us know if you require any revisions or have questions.\n\nThanks & Best regards,\nProject Sales & Estimation Team\nSteel Fab Enterprises`

    setComposerState({
      recipient: defaultRecipient,
      fromEmail: '',
      subject: defaultSubject,
      body: initialBody,
      estimatorBody: cleanedEst || '',
      detailerBody: cleanedDet || '',
    })

    try {
      const res = await quoteWorkflowsAPI.previewCombined(workflow.quote_id)
      const data = res.data
      const resolvedRecipient = cleanEmail(data.recipient) || defaultRecipient
      const estBody = cleanReplySnippet(data.estimator_reply_body) || cleanedEst || ''
      const detBody = cleanReplySnippet(data.detailer_reply_body) || cleanedDet || ''

      setComposerState(prev => ({
        ...prev,
        recipient: resolvedRecipient,
        fromEmail: data.from_email || '',
        subject: data.subject || defaultSubject,
        body: data.body || initialBody,
        estimatorBody: estBody,
        detailerBody: detBody,
      }))
    } catch (err) {
      console.error("Failed to load preview", err)
    }
  }

  // Live auto-sync composer textboxes when background email sync receives new replies
  useEffect(() => {
    if (!selectedWorkflow) return
    const cleanedEst = cleanReplySnippet(selectedWorkflow.estimator_reply_body)
    const cleanedDet = cleanReplySnippet(selectedWorkflow.detailer_reply_body)

    setComposerState(prev => {
      const isEstEmpty = !prev.estimatorBody || prev.estimatorBody === 'Commercial estimation in progress.'
      const isDetEmpty = !prev.detailerBody || prev.detailerBody === 'Detailing schedule in progress.'

      const newEst = (isEstEmpty && cleanedEst) ? cleanedEst : prev.estimatorBody
      const newDet = (isDetEmpty && cleanedDet) ? cleanedDet : prev.detailerBody

      if (newEst !== prev.estimatorBody || newDet !== prev.detailerBody) {
        const projClause = selectedWorkflow.project_name ? ` for ${selectedWorkflow.project_name}` : ''
        const custName = selectedWorkflow.customer_name || "Customer"
        const updatedBody = `Dear ${custName},\n\nWe are pleased to provide the compiled commercial estimation and detailing quotation${projClause} (Ref: ${selectedWorkflow.quote_id}).\n\nBelow is the consolidated summary provided by our technical teams:\n\n=== ESTIMATION DETAILS ===\n${newEst || 'Commercial estimation in progress.'}\n\n=== DETAILING DETAILS ===\n${newDet || 'Detailing schedule in progress.'}\n\nPlease review the details above and let us know if you require any revisions or have questions.\n\nThanks & Best regards,\nProject Sales & Estimation Team\nSteel Fab Enterprises`

        return {
          ...prev,
          estimatorBody: newEst,
          detailerBody: newDet,
          body: updatedBody,
        }
      }
      return prev
    })
  }, [
    selectedWorkflow?.quote_id,
    selectedWorkflow?.estimator_reply_body,
    selectedWorkflow?.detailer_reply_body,
    selectedWorkflow?.estimator_replied,
    selectedWorkflow?.detailer_replied
  ])

  // Update full body when parts change
  const handleRebuildBody = (estText, detText) => {
    const projName = selectedWorkflow?.project_name ? ` for ${selectedWorkflow.project_name}` : ''
    const custName = selectedWorkflow?.customer_name || "Customer"
    const cleanedEst = cleanReplySnippet(estText)
    const cleanedDet = cleanReplySnippet(detText)
    const newBody = `Dear ${custName},

We are pleased to provide the compiled commercial estimation and detailing quotation${projName} (Ref: ${selectedWorkflow?.quote_id}).

Below is the consolidated summary provided by our technical teams:

=== ESTIMATION DETAILS ===
${cleanedEst || 'Commercial estimation in progress.'}

=== DETAILING DETAILS ===
${cleanedDet || 'Detailing schedule in progress.'}

Please review the details above and let us know if you require any revisions or have questions.

Thanks & Best regards,
Project Sales & Estimation Team
Steel Fab Enterprises`

    setComposerState(prev => ({
      ...prev,
      estimatorBody: estText,
      detailerBody: detText,
      body: newBody,
    }))
  }



  const handleSendCombinedEmail = () => {
    if (!composerState.recipient || !composerState.recipient.includes('@')) {
      toast.error('Please provide a valid recipient customer email address.')
      return
    }
    sendMutation.mutate({
      id: selectedWorkflow.quote_id,
      data: {
        recipient: composerState.recipient,
        subject: composerState.subject,
        body: composerState.body,
      }
    })
  }

  if (!isOpen) return null

  const readyCount = workflows.filter(w => w.status === 'Ready' || (w.estimator_replied && w.detailer_replied && w.status !== 'Completed')).length

  return (
    <div className="modal-overlay" style={{ zIndex: 1100 }} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div
        className="modal animate-slide-up"
        style={{
          maxWidth: selectedWorkflow ? 1100 : 960,
          width: '95vw',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          overflow: 'hidden',
          background: '#ffffff',
          borderRadius: 12,
          boxShadow: '0 20px 40px rgba(0,0,0,0.18)',
          border: '1px solid #e2e8f0'
        }}
      >
        {/* Header */}
        <div style={{
          padding: '16px 24px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#ffffff'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 38,
              height: 38,
              borderRadius: 8,
              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 2px 8px rgba(37, 99, 235, 0.25)'
            }}>
              <Mail style={{ width: 20, height: 20 }} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: '#0f172a' }}>
                  Quote Workflows & Reply Engine
                </h2>
                {workflows.some(w => w.status === 'Completed') && (
                  <span style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    padding: '3px 10px',
                    borderRadius: 12,
                    background: '#ecfdf5',
                    color: '#059669',
                    border: '1px solid #a7f3d0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5
                  }}>
                    <CheckCircle2 style={{ width: 12, height: 12 }} /> Automated Background Dispatch Active
                  </span>
                )}
              </div>
              <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: '#64748b' }}>
                Syncing replies from scope recipients (Fabrication, Detailing, Erection) & automatically dispatching combined quotes to clients in background
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={() => syncMutation.mutate()}
              disabled={syncMutation.isPending || isAutoSyncingReplies}
              className="btn btn-secondary"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '7px 14px',
                fontSize: '0.82rem',
                borderRadius: 6,
                fontWeight: 600,
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                color: '#334155',
                cursor: (syncMutation.isPending || isAutoSyncingReplies) ? 'not-allowed' : 'pointer',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
              }}
              title="Manually check & sync reply emails now"
            >
              <RefreshCw style={{ width: 14, height: 14, animation: (syncMutation.isPending || isAutoSyncingReplies) ? 'spin 1s linear infinite' : 'none' }} />
              {syncMutation.isPending ? 'Syncing...' : isAutoSyncingReplies ? 'Auto-Syncing...' : 'Sync Replies'}
            </button>

            <button
              onClick={() => setAutoSyncRepliesEnabled(prev => !prev)}
              title={autoSyncRepliesEnabled ? "Auto-sync replies is active (every 30s). Click to pause." : "Auto-sync replies is paused. Click to enable 30s auto-sync."}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '7px 12px',
                borderRadius: 6,
                fontSize: '0.78rem',
                fontWeight: 600,
                background: autoSyncRepliesEnabled ? 'rgba(16, 185, 129, 0.08)' : '#ffffff',
                border: `1px solid ${autoSyncRepliesEnabled ? 'rgba(16, 185, 129, 0.4)' : '#cbd5e1'}`,
                color: autoSyncRepliesEnabled ? '#059669' : '#64748b',
                cursor: 'pointer',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
              }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  backgroundColor: autoSyncRepliesEnabled ? '#10b981' : '#9ca3af',
                  display: 'inline-block',
                  boxShadow: autoSyncRepliesEnabled ? '0 0 6px #10b981' : 'none',
                }}
                className={autoSyncRepliesEnabled ? "animate-pulse" : ""}
              />
              Auto-Sync: {autoSyncRepliesEnabled ? '30s' : 'Off'}
            </button>
            <button
              onClick={onClose}
              style={{
                background: '#f1f5f9',
                border: '1px solid #e2e8f0',
                borderRadius: 6,
                color: '#64748b',
                cursor: 'pointer',
                padding: 6,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <X style={{ width: 18, height: 18 }} />
            </button>
          </div>
        </div>

        {/* Body content */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden', background: '#f8fafc' }}>
          {/* Left panel: List of Workflows */}
          <div style={{
            flex: selectedWorkflow ? '0 0 45%' : '1 1 100%',
            display: 'flex',
            flexDirection: 'column',
            borderRight: selectedWorkflow ? '1px solid #e2e8f0' : 'none',
            overflowY: 'auto',
            background: '#f8fafc'
          }}>
            {/* List Table / Cards */}
            <div style={{ padding: '16px 20px', overflowY: 'auto', flex: 1 }}>
              {isLoading ? (
                <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
                  <RefreshCw style={{ width: 24, height: 24, animation: 'spin 1s linear infinite', margin: '0 auto 10px', color: '#3b82f6' }} />
                  Loading quote workflows...
                </div>
              ) : workflows.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
                  <AlertCircle style={{ width: 32, height: 32, margin: '0 auto 10px', opacity: 0.5 }} />
                  <p style={{ margin: 0, fontWeight: 600, color: '#1e293b' }}>No Quote Workflows Found</p>
                  <p style={{ margin: '4px 0 0', fontSize: '0.8rem' }}>
                    Send an RFQ email or sync emails to initialize workflows.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {workflows.map(wf => {
                    const isSelected = selectedWorkflow?.quote_id === wf.quote_id
                    const isCompleted = wf.status === 'Completed'
                    const isReady = (wf.status === 'Ready' || (wf.estimator_replied && wf.detailer_replied)) && !isCompleted
                    const isPartiallyReplied = !isCompleted && !isReady && (wf.estimator_replied || wf.detailer_replied || wf.status === 'Partially Replied')
                    const noRepliesYet = !isCompleted && !isReady && !isPartiallyReplied

                    return (
                      <div
                        key={wf.quote_id}
                        onClick={() => handleOpenComposer(wf)}
                        style={{
                          padding: '14px 18px',
                          borderRadius: 8,
                          background: isSelected
                            ? '#eff6ff'
                            : '#ffffff',
                          border: isSelected
                            ? '1.5px solid #3b82f6'
                            : isReady
                            ? '1.5px solid #93c5fd'
                            : isPartiallyReplied
                            ? '1px solid #fde68a'
                            : '1px solid #e2e8f0',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          boxShadow: isSelected ? '0 2px 6px rgba(59, 130, 246, 0.15)' : '0 1px 3px rgba(0,0,0,0.04)'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{
                              fontFamily: 'monospace',
                              fontWeight: 700,
                              fontSize: '0.9rem',
                              color: '#0f172a'
                            }}>
                              {wf.quote_id}
                            </span>
                            {wf.project_name && (
                              <span style={{ fontSize: '0.84rem', color: '#334155', fontWeight: 600 }}>
                                • {wf.project_name}
                              </span>
                            )}
                          </div>
                          
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            {/* Status Badge */}
                            <span style={{
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              padding: '3px 9px',
                              borderRadius: 12,
                              background: isCompleted
                                ? '#ecfdf5'
                                : isReady
                                ? '#eff6ff'
                                : isPartiallyReplied
                                ? '#fffbeb'
                                : '#f8fafc',
                              color: isCompleted
                                ? '#059669'
                                : isReady
                                ? '#2563eb'
                                : isPartiallyReplied
                                ? '#b45309'
                                : '#64748b',
                              border: `1px solid ${
                                isCompleted ? '#a7f3d0' :
                                isReady ? '#bfdbfe' :
                                isPartiallyReplied ? '#fde68a' :
                                '#cbd5e1'
                              }`
                            }}>
                              {isCompleted
                                ? '✓ Sent to Client'
                                : isReady
                                ? 'Ready for Reply'
                                : isPartiallyReplied
                                ? 'Partially Replied'
                                : 'No Reply from Both'}
                            </span>

                            {/* Delete Button for all cards including Sent to Client */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                if (window.confirm(`Delete quote workflow for ${wf.quote_id}?`)) {
                                  deleteMutation.mutate(wf.quote_id)
                                }
                              }}
                              title="Delete this quote workflow"
                              style={{
                                background: '#ffffff',
                                border: '1px solid #e2e8f0',
                                color: '#94a3b8',
                                cursor: 'pointer',
                                padding: '4px 6px',
                                borderRadius: 5,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.15s ease'
                              }}
                              onMouseEnter={e => {
                                e.currentTarget.style.color = '#ef4444'
                                e.currentTarget.style.borderColor = '#fca5a5'
                                e.currentTarget.style.background = '#fef2f2'
                              }}
                              onMouseLeave={e => {
                                e.currentTarget.style.color = '#94a3b8'
                                e.currentTarget.style.borderColor = '#e2e8f0'
                                e.currentTarget.style.background = '#ffffff'
                              }}
                            >
                              <Trash2 style={{ width: 13, height: 13 }} />
                            </button>
                          </div>
                        </div>

                        {/* Customer line */}
                        <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: 8 }}>
                          Customer: <strong style={{ color: '#0f172a' }}>{wf.customer_name || 'N/A'}</strong>
                          {wf.sender && <span style={{ marginLeft: 6, color: '#334155' }}>({wf.sender})</span>}
                        </div>

                        {/* Estimator & Detailer status pills */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: '0.78rem' }}>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 5,
                            color: wf.estimator_replied ? '#059669' : '#64748b',
                            fontWeight: wf.estimator_replied ? 600 : 500
                          }}>
                            {wf.estimator_replied ? (
                              <CheckCircle2 style={{ width: 14, height: 14, color: '#059669' }} />
                            ) : (
                              <Clock style={{ width: 14, height: 14, color: '#94a3b8' }} />
                            )}
                            Estimator: {wf.estimator_replied ? 'Replied' : 'No reply'}
                          </div>

                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 5,
                            color: wf.detailer_replied ? '#059669' : '#64748b',
                            fontWeight: wf.detailer_replied ? 600 : 500
                          }}>
                            {wf.detailer_replied ? (
                              <CheckCircle2 style={{ width: 14, height: 14, color: '#059669' }} />
                            ) : (
                              <Clock style={{ width: 14, height: 14, color: '#94a3b8' }} />
                            )}
                            Detailer: {wf.detailer_replied ? 'Replied' : 'No reply'}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right panel: Interactive Composer */}
          {selectedWorkflow ? (
            <div style={{
              flex: '0 0 55%',
              display: 'flex',
              flexDirection: 'column',
              background: '#ffffff',
              overflowY: 'auto'
            }}>
              <div style={{
                padding: '14px 22px',
                borderBottom: '1px solid #e2e8f0',
                background: '#f8fafc',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <FileText style={{ width: 18, height: 18, color: '#2563eb' }} />
                  <span style={{ fontWeight: 700, fontSize: '0.92rem', color: '#0f172a' }}>
                    Compose Combined Quotation (Ref: {selectedWorkflow.quote_id})
                  </span>
                </div>
                <button
                  onClick={() => setSelectedQuoteId(null)}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: 4,
                    color: '#64748b',
                    cursor: 'pointer',
                    fontSize: '0.78rem',
                    padding: '4px 10px',
                    fontWeight: 600
                  }}
                >
                  Close Composer
                </button>
              </div>

              <div style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 14, flex: 1, overflowY: 'auto', background: '#ffffff' }}>
                {/* Recipient Customer Field */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#334155', marginBottom: 5 }}>
                    Client Recipient Email
                  </label>
                  <input
                    type="email"
                    placeholder="e.g. client@example.com"
                    value={composerState.recipient}
                    onChange={e => setComposerState(prev => ({ ...prev, recipient: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: 6,
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      color: '#0f172a',
                      fontSize: '0.85rem',
                      fontFamily: 'monospace',
                      outline: 'none',
                      boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.03)'
                    }}
                  />
                </div>

                {/* Subject Field */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#334155', marginBottom: 5 }}>
                    Subject Line
                  </label>
                  <input
                    type="text"
                    value={composerState.subject}
                    onChange={e => setComposerState(prev => ({ ...prev, subject: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: 6,
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      color: '#0f172a',
                      fontSize: '0.85rem',
                      outline: 'none',
                      boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.03)'
                    }}
                  />
                </div>

                {/* Side-by-Side Estimator & Detailer Snippets */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {/* Estimator Box */}
                  <div style={{
                    padding: 12,
                    borderRadius: 8,
                    background: '#f8fafc',
                    border: `1px solid ${selectedWorkflow.estimator_replied ? '#86efac' : '#cbd5e1'}`
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: 700, color: selectedWorkflow.estimator_replied ? '#059669' : '#64748b' }}>
                        Estimator Reply {selectedWorkflow.estimator_replied ? '✓' : '(Pending)'}
                      </span>
                    </div>
                    <textarea
                      rows={4}
                      placeholder="Estimator pricing details..."
                      value={composerState.estimatorBody}
                      onChange={e => handleRebuildBody(e.target.value, composerState.detailerBody)}
                      style={{
                        width: '100%',
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: 4,
                        padding: 8,
                        color: '#0f172a',
                        fontSize: '0.8rem',
                        resize: 'vertical',
                        outline: 'none'
                      }}
                    />
                  </div>

                  {/* Detailer Box */}
                  <div style={{
                    padding: 12,
                    borderRadius: 8,
                    background: '#f8fafc',
                    border: `1px solid ${selectedWorkflow.detailer_replied ? '#86efac' : '#cbd5e1'}`
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: 700, color: selectedWorkflow.detailer_replied ? '#059669' : '#64748b' }}>
                        Detailer Reply {selectedWorkflow.detailer_replied ? '✓' : '(Pending)'}
                      </span>
                    </div>
                    <textarea
                      rows={4}
                      placeholder="Detailing & modeling schedule..."
                      value={composerState.detailerBody}
                      onChange={e => handleRebuildBody(composerState.estimatorBody, e.target.value)}
                      style={{
                        width: '100%',
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: 4,
                        padding: 8,
                        color: '#0f172a',
                        fontSize: '0.8rem',
                        resize: 'vertical',
                        outline: 'none'
                      }}
                    />
                  </div>
                </div>

                {/* Combined Body Textarea */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#334155', marginBottom: 5 }}>
                    Compiled Unified Email Body (Dispatched to Customer)
                  </label>
                  <textarea
                    rows={9}
                    value={composerState.body}
                    onChange={e => setComposerState(prev => ({ ...prev, body: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: 6,
                      background: '#ffffff',
                      border: '1.5px solid #cbd5e1',
                      color: '#0f172a',
                      fontSize: '0.85rem',
                      lineHeight: 1.55,
                      fontFamily: 'inherit',
                      outline: 'none',
                      boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.03)'
                    }}
                  />
                </div>
              </div>

              {/* Footer Dispatch Action */}
              <div style={{
                padding: '14px 22px',
                borderTop: '1px solid #e2e8f0',
                background: '#f8fafc',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                  Sends via <b style={{ color: '#0f172a' }}>{composerState.fromEmail || 'thamizh1700@gmail.com'}</b>
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    className="btn btn-ghost"
                    onClick={() => setSelectedWorkflow(null)}
                    style={{ fontSize: '0.82rem', padding: '6px 14px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#475569', borderRadius: 6 }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSendCombinedEmail}
                    disabled={sendMutation.isPending}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '8px 20px',
                      fontSize: '0.84rem',
                      fontWeight: 700,
                      borderRadius: 6,
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      color: '#ffffff',
                      border: 'none',
                      cursor: sendMutation.isPending ? 'not-allowed' : 'pointer',
                      boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)'
                    }}
                  >
                    <Send style={{ width: 14, height: 14 }} />
                    {sendMutation.isPending ? 'Dispatching…' : 'Send Combined Quote to Customer'}
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
