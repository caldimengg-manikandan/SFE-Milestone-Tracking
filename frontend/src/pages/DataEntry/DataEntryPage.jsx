import { useCallback, useMemo, useRef, useState } from 'react'
import { AgGridReact } from 'ag-grid-react'
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { rfqAPI, customersAPI, estimatorsAPI } from '../../api/client'
import { useAuthStore } from '../../store/authStore'
import { Plus, Search, Download, RefreshCw, Zap, Copy, Trash2, FileSpreadsheet, Briefcase } from 'lucide-react'
import RFQFormModal from './RFQFormModal'
import SEBWSyncModal from './SEBWSyncModal'
import ExcelUploadModal from './ExcelUploadModal'
import { formatCurrency, formatDate } from '../../utils/formatters'

import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-quartz.css'

// Register all community features
ModuleRegistry.registerModules([AllCommunityModule])

// ── Status display mapping (DB stores "Pending", UI shows "In Progress") ──────
const STATUS_DISPLAY = { Pending: 'Pending', Won: 'Won', Lost: 'Lost' }
const STATUS_BADGE   = { Won: 'won', Lost: 'lost', Pending: 'pending' }

// ── Cell Renderers ────────────────────────────────────────────────────────────

function WonLostRenderer({ value }) {
  if (!value) return null
  return (
    <span className={`badge badge-${STATUS_BADGE[value] || 'pending'}`}>
      {STATUS_DISPLAY[value] || value}
    </span>
  )
}

function BoolRenderer({ value }) {
  if (value === null || value === undefined || value === '') return <span style={{ color: 'var(--text-muted)' }}>—</span>
  const isTrue = value === true || value === 'Yes'
  return (
    <span style={{
      fontWeight: 600,
      color: isTrue ? 'var(--success)' : 'var(--text-muted)',
      fontFamily: 'var(--font-head)',
      fontSize: '0.74rem',
      letterSpacing: '0.04em'
    }}>
      {isTrue ? 'Yes' : 'No'}
    </span>
  )
}

function CurrencyRenderer({ value }) {
  if (value === null || value === undefined) return <span style={{ color: 'var(--text-muted)' }}>—</span>
  return <span className="mono">{formatCurrency(value)}</span>
}

function ReadOnlyRenderer({ value }) {
  if (value === null || value === undefined) return <span style={{ color: 'var(--text-muted)' }}>—</span>
  return (
    <span style={{ color: 'var(--grid-readonly-text)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
      {typeof value === 'number' ? value.toLocaleString(undefined, { maximumFractionDigits: 2 }) : value}
    </span>
  )
}

function BidAgeRenderer({ data }) {
  if (!data?.created_at) return null
  const days = Math.floor((Date.now() - new Date(data.created_at).getTime()) / 86_400_000)
  return (
    <span style={{
      fontFamily: 'var(--font-mono)',
      fontSize: '0.78rem',
      color: days > 90 ? 'var(--danger)' : days > 30 ? 'var(--warning)' : 'var(--text-muted)',
    }}>
      {days}d
    </span>
  )
}

// ── Row Styling ───────────────────────────────────────────────────────────────
function getRowClass({ data }) {
  if (!data) return ''
  if (data.won_lost === 'Won') return 'row-won'
  if (data.won_lost === 'Lost') return 'row-lost'
  return ''
}

// ── Actions Cell Renderer (defined outside component to avoid re-registration) ─
function ActionsRenderer(params) {
  const { data, context } = params
  if (!data) return null
  const { canEdit, isManager, onSebwSync, onDuplicate, onDelete, onSetJobNo, queryClient } = context

  const isWonNoJob = data.won_lost === 'Won' && !data.sfe_job_no
  const isAwarded  = data.won_lost === 'Won' && data.sfe_job_no

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, height: '100%' }}>
      {/* SEBW Sync */}
      {canEdit && (
        <button
          title="Pull from SEBW"
          onClick={() => onSebwSync(data)}
          style={{
            background: 'rgba(249,115,22,0.1)',
            border: '1px solid rgba(249,115,22,0.3)',
            borderRadius: 4,
            padding: '2px 6px',
            cursor: 'pointer',
            color: '#F97316',
            display: 'flex',
            alignItems: 'center',
            gap: 3,
            fontSize: '0.68rem',
            fontFamily: 'var(--font-head)',
            fontWeight: 600,
            letterSpacing: '0.06em',
          }}
        >
          <Zap style={{ width: 10, height: 10 }} /> SEBW
        </button>
      )}

      {/* Duplicate as Rebid */}
      {canEdit && (
        <button
          title="Duplicate as Rebid"
          onClick={() => onDuplicate(data)}
          style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-default)',
            borderRadius: 4,
            padding: '2px 5px',
            cursor: 'pointer',
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <Copy style={{ width: 11, height: 11 }} />
        </button>
      )}

      {/* Set Job # (Won bids without SFE Job No) */}
      {isWonNoJob && canEdit && (
        <button
          title="Set SFE Job #"
          onClick={() => onSetJobNo(data)}
          style={{
            background: 'var(--success-muted)',
            border: '1px solid var(--success-border)',
            borderRadius: 4,
            padding: '2px 6px',
            cursor: 'pointer',
            color: 'var(--success)',
            display: 'flex',
            alignItems: 'center',
            gap: 3,
            fontSize: '0.65rem',
            fontFamily: 'var(--font-head)',
            fontWeight: 700,
          }}
        >
          <Briefcase style={{ width: 10, height: 10 }} /> Job #
        </button>
      )}

      {/* Awarded indicator */}
      {isAwarded && (
        <span style={{
          fontSize: '0.65rem',
          fontWeight: 700,
          color: 'var(--success)',
          fontFamily: 'var(--font-head)',
          letterSpacing: '0.06em',
          whiteSpace: 'nowrap',
        }}>
          ✓ #{data.sfe_job_no}
        </span>
      )}

      {/* Delete (manager only) */}
      {isManager && (
        <button
          title="Delete"
          onClick={() => onDelete(data)}
          style={{
            background: 'transparent',
            border: 'none',
            borderRadius: 4,
            padding: '2px 4px',
            cursor: 'pointer',
            color: 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            marginLeft: 2,
          }}
        >
          <Trash2 style={{ width: 11, height: 11 }} />
        </button>
      )}
    </div>
  )
}

// ── Set Job # Modal (inline lightweight) ──────────────────────────────────────
function SetJobNoModal({ rfq, onClose, onSaved }) {
  const [val, setVal] = useState('')
  const qc = useQueryClient()
  const mut = useMutation({
    mutationFn: () => rfqAPI.patch(rfq.id, { sfe_job_no: val }),
    onSuccess: () => { toast.success('SFE Job # set'); qc.invalidateQueries({ queryKey: ['rfq'] }); onSaved() },
    onError: () => toast.error('Failed to set Job #'),
  })
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal animate-slide-up" style={{ maxWidth: 380 }}>
        <div className="modal-header">
          <h2 className="modal-title">Set SFE Job #</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 16 }}>
          <strong style={{ color: 'var(--text-primary)' }}>{rfq.quote_no}</strong> — {rfq.project_name}
        </div>
        <div className="form-group">
          <label className="form-label">SFE Job Number</label>
          <input
            className="form-input"
            type="text"
            placeholder="e.g. 1042"
            value={val}
            onChange={e => setVal(e.target.value)}
            autoFocus
            onKeyDown={e => e.key === 'Enter' && mut.mutate()}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={() => mut.mutate()} disabled={!val || mut.isPending}>
            {mut.isPending ? 'Saving…' : 'Set Job #'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Column Definitions ────────────────────────────────────────────────────────
function buildColumnDefs(customers, estimators, canEdit) {
  const readonly = { editable: false, cellClass: 'readonly-cell' }
  const editableIf = canEdit ? { editable: true } : readonly

  const boolEditor = {
    valueGetter: (params) => {
      const val = params.data?.[params.colDef.field];
      if (val === null || val === undefined) return '';
      return val ? 'Yes' : 'No';
    },
    valueSetter: (params) => {
      if (params.data) {
        params.data[params.colDef.field] = (params.newValue === 'Yes');
        return true;
      }
      return false;
    },
    cellRenderer: BoolRenderer,
    cellEditor: 'agSelectCellEditor',
    cellEditorParams: { values: ['Yes', 'No'] },
    ...editableIf,
  }

  const currencyEditor = {
    cellRenderer: CurrencyRenderer,
    cellClass: 'numeric-cell',
    type: 'sfeNumericColumn',
    ...editableIf,
  }

  const defs = [
    // ── PROJECT IDENTITY (pinned left) ────────────────────────────────────────
    {
      headerName: 'Project Identity',
      headerClass: 'ag-column-group-header',
      children: [
        {
          headerName: 'Actions',
          field: '__actions',
          pinned: 'left',
          width: 200,
          minWidth: 180,
          sortable: false,
          filter: false,
          resizable: true,
          editable: false,
          suppressMenu: true,
          cellRenderer: ActionsRenderer,
        },
        {
          field: 'quote_no', headerName: 'Quote No', width: 140, pinned: 'left',
          editable: canEdit,
          cellStyle: { fontFamily: 'var(--font-mono)', fontSize: '0.78rem', fontWeight: 600 },
        },
        {
          field: 'project_name', headerName: 'Project Name', width: 260,
          pinned: 'left', editable: canEdit,
        },
      ],
    },

    // ── BID DETAILS (scrollable) ──────────────────────────────────────────────
    {
      headerName: 'Bid Details',
      headerClass: 'ag-column-group-header',
      children: [
        {
          field: 'budget_type', headerName: 'Type', width: 100,
          cellEditor: 'agSelectCellEditor',
          cellEditorParams: { values: ['Budget', 'Final', 'Rebid'] },
          ...editableIf,
        },
        { field: 'bid_reference', headerName: 'Bid Ref', width: 110, ...editableIf },
        { field: 'project_comments', headerName: 'Project Comments', width: 220, ...editableIf },
        { field: 'bid_due_date', headerName: 'Bid Due', width: 110, cellDataType: 'dateString', ...editableIf },
        { field: 'bid_due_time', headerName: 'Time', width: 90, ...editableIf },
        { field: 'location', headerName: 'Location', width: 140, ...editableIf },
        { field: 'distance_travel', headerName: 'Distance', width: 100, type: 'sfeNumericColumn', ...editableIf },
        {
          headerName: 'Age',
          field: '__bid_age',
          width: 80,
          sortable: false,
          filter: false,
          editable: false,
          cellRenderer: BidAgeRenderer,
          headerTooltip: 'Days since this record was created',
        },
        {
          field: 'is_rebid', headerName: 'Rebid?', width: 85,
          cellRenderer: BoolRenderer,
          ...readonly,
        },
      ],
    },

    // ── PROJECT FLAGS ─────────────────────────────────────────────────────────
    {
      headerName: 'Project Flags',
      children: [
        { field: 'aisc_fab',              headerName: 'AISC Fab',    width: 80,  ...boolEditor },
        { field: 'aisc_erect',            headerName: 'AISC Erect',  width: 90,  ...boolEditor },
        { field: 'domestic_steel',        headerName: 'Dom Steel',   width: 90,  ...boolEditor },
        { field: 'leed_project',          headerName: 'LEED',        width: 70,  ...boolEditor },
        { field: 'minority_participation',headerName: 'Minority',    width: 80,  ...boolEditor },
        { field: 'prevailing_wage',       headerName: 'Prev Wage',   width: 85,  ...boolEditor },
        { field: 'ccip_ocip',             headerName: 'CCIP/OCIP',   width: 90,  ...boolEditor },
        { field: 'bonded',                headerName: 'Bonded',      width: 75,  ...boolEditor },
        { field: 'paint',                 headerName: 'Paint',       width: 65,  ...boolEditor },
        { field: 'galvanised',            headerName: 'Galv.',       width: 65,  ...boolEditor },
        { field: 'professional_engineer', headerName: 'PE',          width: 60,  ...boolEditor },
        { field: 'third_party_inspection',headerName: '3rd Party',   width: 85,  ...boolEditor },
        {
          field: 'tax_status', headerName: 'Tax Status', width: 100,
          cellEditor: 'agSelectCellEditor',
          cellEditorParams: { values: ['Taxable', 'Exempt', 'Partial'] },
          ...editableIf,
        },
      ],
    },

    // ── CUSTOMER & TEAM ───────────────────────────────────────────────────────
    {
      headerName: 'Customer & Team',
      children: [
        {
          field: 'customer_name', headerName: 'Customer', width: 180,
          editable: canEdit,
          cellEditor: 'agSelectCellEditor',
          cellEditorParams: { values: customers.map(c => c.name) },
          valueSetter: (params) => {
            const found = customers.find(c => c.name === params.newValue)
            if (found) {
              params.data.customer = found.id
              params.data.customer_name = found.name
              return true
            }
            return false
          },
        },
        {
          field: 'decision_to_bid', headerName: 'Decision', width: 100,
          cellEditor: 'agSelectCellEditor',
          cellEditorParams: { values: ['Yes', 'No', 'NoBid', 'Bid'] },
          ...editableIf,
        },
        {
          field: 'primary_estimator_initials', headerName: 'Estimator', width: 100,
          editable: canEdit,
          cellEditor: 'agSelectCellEditor',
          cellEditorParams: { values: estimators.map(e => e.initials) },
          valueSetter: (params) => {
            const found = estimators.find(e => e.initials === params.newValue)
            if (found) {
              params.data.primary_estimator = found.id
              params.data.primary_estimator_initials = found.initials
              return true
            }
            return false
          },
        },
        { field: 'outsourced_estimator', headerName: 'Outsourced Est.', width: 120, ...editableIf },
        { field: 'sent_to_jd',        headerName: 'J&D',      width: 60, ...boolEditor },
        { field: 'sent_to_detailing', headerName: 'Detail',   width: 65, ...boolEditor },
        { field: 'sent_to_erection',  headerName: 'Erect',    width: 65, ...boolEditor },
        { field: 'est_sqft_ton',      headerName: 'Est Sqft/Ton', width: 110, ...editableIf },
      ],
    },

    // ── PRICING ───────────────────────────────────────────────────────────────
    {
      headerName: 'Pricing',
      children: [
        { field: 'price_structure',     headerName: 'Structure',    width: 130, ...currencyEditor },
        { field: 'price_erection',      headerName: 'Erection',     width: 120, ...currencyEditor },
        { field: 'price_misc',          headerName: 'Misc',         width: 110, ...currencyEditor },
        { field: 'price_misc_erection', headerName: 'Misc Erect',   width: 110, ...currencyEditor },
        { field: 'bid_amount',          headerName: 'Bid Amount',   width: 130, ...currencyEditor },
        { field: 'quoted_profit',       headerName: 'Quoted Profit',width: 130, ...currencyEditor },
      ],
    },

    // ── QUANTITIES ────────────────────────────────────────────────────────────
    {
      headerName: 'Quantities',
      children: [
        { field: 'ton_steel', headerName: 'Ton Steel', width: 100, type: 'sfeNumericColumn', ...editableIf },
        { field: 'ton_joist', headerName: 'Ton Joist', width: 100, type: 'sfeNumericColumn', ...editableIf },
        {
          field: 'total_tonnage', headerName: 'Total Tons',
          width: 100, cellRenderer: ReadOnlyRenderer, ...readonly,
        },
        { field: 'num_main_structural_pcs', headerName: '# Struct Pcs', width: 110, type: 'sfeNumericColumn', ...editableIf },
        { field: 'sq_ft_structural', headerName: 'Sq Ft', width: 100, type: 'sfeNumericColumn', ...editableIf },
      ],
    },

    // ── COMPUTED UNIT COSTS (read-only) ───────────────────────────────────────
    {
      headerName: 'Unit Costs (Computed)',
      children: [
        { field: 'structural_pieces_per_ton',         headerName: 'Pcs/Ton',       width: 90,  cellRenderer: ReadOnlyRenderer, ...readonly },
        { field: 'struct_tonnage_per_sqft_no_joist',  headerName: 'T/Sqft (no J)', width: 110, cellRenderer: ReadOnlyRenderer, ...readonly },
        { field: 'struct_tonnage_per_sqft_with_joist',headerName: 'T/Sqft (w J)', width: 110, cellRenderer: ReadOnlyRenderer, ...readonly },
        { field: 'struct_cost_per_ton',               headerName: '$/Ton Fab',     width: 100, cellRenderer: ReadOnlyRenderer, ...readonly },
        { field: 'struct_erect_cost_per_ton',         headerName: '$/Ton Erect',   width: 100, cellRenderer: ReadOnlyRenderer, ...readonly },
        { field: 'struct_cost_per_sqft',              headerName: '$/Sqft Fab',    width: 100, cellRenderer: ReadOnlyRenderer, ...readonly },
        { field: 'struct_erect_cost_per_sqft',        headerName: '$/Sqft Erect',  width: 100, cellRenderer: ReadOnlyRenderer, ...readonly },
      ],
    },

    // ── STRUCTURAL FAB SCHEDULE ───────────────────────────────────────────────
    {
      headerName: 'Struct Fab Schedule',
      children: [
        { field: 'struct_fab_hours',            headerName: 'Hours',    width: 90,  type: 'sfeNumericColumn', ...editableIf },
        { field: 'struct_fab_start_month',       headerName: 'Start',    width: 105, cellDataType: 'dateString', ...editableIf },
        { field: 'struct_fab_duration_months',   headerName: 'Dur (mo)', width: 90,  type: 'sfeNumericColumn', ...editableIf },
        { field: 'struct_fab_end_month',         headerName: 'End',      width: 105, cellRenderer: ReadOnlyRenderer, ...readonly },
        { field: 'avg_monthly_struct_fab',       headerName: 'Avg Hrs/Mo', width: 100, cellRenderer: ReadOnlyRenderer, ...readonly },
      ],
    },

    // ── MISC FAB SCHEDULE ─────────────────────────────────────────────────────
    {
      headerName: 'Misc Fab Schedule',
      children: [
        { field: 'misc_fab_hours',          headerName: 'Hours',    width: 90,  type: 'sfeNumericColumn', ...editableIf },
        { field: 'misc_fab_start_month',     headerName: 'Start',    width: 105, cellDataType: 'dateString', ...editableIf },
        { field: 'misc_fab_duration_months', headerName: 'Dur (mo)', width: 90,  type: 'sfeNumericColumn', ...editableIf },
        { field: 'misc_fab_end_month',       headerName: 'End',      width: 105, cellRenderer: ReadOnlyRenderer, ...readonly },
        { field: 'avg_monthly_misc_fab',     headerName: 'Avg Hrs/Mo', width: 100, cellRenderer: ReadOnlyRenderer, ...readonly },
      ],
    },

    // ── STRUCTURAL ERECTION SCHEDULE ──────────────────────────────────────────
    {
      headerName: 'Struct Erection Schedule',
      children: [
        { field: 'struct_erect_hours',          headerName: 'Hours',    width: 90,  type: 'sfeNumericColumn', ...editableIf },
        { field: 'struct_erect_start_month',     headerName: 'Start',    width: 105, cellDataType: 'dateString', ...editableIf },
        { field: 'struct_erect_duration_months', headerName: 'Dur (mo)', width: 90,  type: 'sfeNumericColumn', ...editableIf },
        { field: 'struct_erect_end_month',       headerName: 'End',      width: 105, cellRenderer: ReadOnlyRenderer, ...readonly },
        { field: 'avg_monthly_struct_erect',     headerName: 'Avg Hrs/Mo', width: 100, cellRenderer: ReadOnlyRenderer, ...readonly },
      ],
    },

    // ── MISC ERECTION SCHEDULE ────────────────────────────────────────────────
    {
      headerName: 'Misc Erection Schedule',
      children: [
        { field: 'misc_erect_hours',          headerName: 'Hours',    width: 90,  type: 'sfeNumericColumn', ...editableIf },
        { field: 'misc_erect_start_month',     headerName: 'Start',    width: 105, cellDataType: 'dateString', ...editableIf },
        { field: 'misc_erect_duration_months', headerName: 'Dur (mo)', width: 90,  type: 'sfeNumericColumn', ...editableIf },
        { field: 'misc_erect_end_month',       headerName: 'End',      width: 105, cellRenderer: ReadOnlyRenderer, ...readonly },
        { field: 'avg_monthly_misc_erect',     headerName: 'Avg Hrs/Mo', width: 100, cellRenderer: ReadOnlyRenderer, ...readonly },
      ],
    },

    // ── ESTIMATING & OUTCOME ──────────────────────────────────────────────────
    {
      headerName: 'Estimating & Outcome',
      children: [
        { field: 'estimating_hours', headerName: 'Est Hours', width: 90, type: 'sfeNumericColumn', ...editableIf },
        { field: 'quote_date', headerName: 'Quote Date', width: 105, cellDataType: 'dateString', ...editableIf },
        {
          field: 'won_lost', headerName: 'Won/Lost', width: 110,
          cellRenderer: WonLostRenderer,
          cellEditor: 'agSelectCellEditor',
          cellEditorParams: { values: ['Won', 'Lost', 'Pending'] },
          ...editableIf,
        },
        { field: 'follow_up_date', headerName: 'Follow-up Date', width: 110, cellDataType: 'dateString', ...editableIf },
        { field: 'follow_up_notes', headerName: 'Follow-up Notes', width: 200, ...editableIf },
        { field: 'awarded_amount', headerName: 'Awarded Amount', width: 140, ...currencyEditor },
      ],
    },

    // ── POST-AWARD ────────────────────────────────────────────────────────────
    {
      headerName: 'Post-Award',
      children: [
        { field: 'sfe_job_no',             headerName: 'SFE Job #',    width: 100, type: 'sfeNumericColumn', ...editableIf },
        { field: 'awarded_job_date',        headerName: 'Award Date',   width: 110, cellDataType: 'dateString', ...editableIf },
        { field: 'contract_executed_date',  headerName: 'Contract Date',width: 115, cellDataType: 'dateString', ...editableIf },
        { field: 'fabrication_start_date',  headerName: 'Fab Start',    width: 110, cellDataType: 'dateString', editable: canEdit },
      ],
    },
  ]

  // Automatically compute and enforce minWidth based on the character length of the header text,
  // guaranteeing that column headers are always fully visible at a minimum!
  return defs.map(group => {
    if (group.children) {
      return {
        ...group,
        children: group.children.map(col => {
          const headerText = col.headerName || col.field || '';
          // 8.5px average character width + 45px padding for AG Grid icons/sort indicators
          const estimatedMin = Math.ceil(headerText.length * 8.5 + 45);
          return {
            minWidth: col.minWidth || estimatedMin,
            ...col
          };
        })
      }
    }
    const headerText = group.headerName || group.field || '';
    const estimatedMin = Math.ceil(headerText.length * 8.5 + 45);
    return {
      minWidth: group.minWidth || estimatedMin,
      ...group
    }
  })
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function DataEntryPage() {
  const gridRef = useRef()
  const queryClient = useQueryClient()
  const canEdit  = useAuthStore((s) => s.canEdit())
  const isManager = useAuthStore((s) => s.isManager())

  const [showModal,       setShowModal]       = useState(false)
  const [sebwTarget,      setSebwTarget]       = useState(null)   // rfq record for SEBW sync
  const [jobNoTarget,     setJobNoTarget]      = useState(null)   // rfq record for Set Job #
  const [showExcelUpload, setShowExcelUpload]  = useState(false)
  const [searchText,      setSearchText]       = useState('')
  const [wonLostFilter,   setWonLostFilter]    = useState('all')

  // Fetch data
  const { data: rfqData, isLoading, refetch } = useQuery({
    queryKey: ['rfq', wonLostFilter],
    queryFn: () => rfqAPI.list(
      wonLostFilter !== 'all' ? { won_lost: wonLostFilter } : {}
    ).then(r => r.data.results || r.data),
  })

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: () => customersAPI.list().then(r => r.data),
  })

  const { data: estimators = [] } = useQuery({
    queryKey: ['estimators'],
    queryFn: () => estimatorsAPI.list().then(r => r.data),
  })

  const columnDefs = useMemo(
    () => buildColumnDefs(customers, estimators, canEdit),
    [customers, estimators, canEdit]
  )

  // Inline cell edit save
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => rfqAPI.patch(id, data),
    onSuccess: () => {
      toast.success('Saved', { duration: 1500 })
      queryClient.invalidateQueries({ queryKey: ['rfq'] })
    },
    onError: (err) => {
      const errors = err.response?.data
      const msg = errors
        ? Object.entries(errors).map(([k, v]) => `${k}: ${v}`).join('\n')
        : 'Save failed'
      toast.error(msg)
      refetch()
    },
  })

  // Duplicate mutation
  const duplicateMutation = useMutation({
    mutationFn: (id) => rfqAPI.duplicate(id),
    onSuccess: (res) => {
      toast.success(`Rebid created: ${res.data.quote_no}`)
      queryClient.invalidateQueries({ queryKey: ['rfq'] })
    },
    onError: (err) => {
      const msg = err.response?.data?.detail || 'Duplicate failed'
      toast.error(msg)
    },
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id) => rfqAPI.delete(id),
    onSuccess: () => {
      toast.success('Record deleted')
      queryClient.invalidateQueries({ queryKey: ['rfq'] })
    },
    onError: () => toast.error('Delete failed'),
  })

  const onCellValueChanged = useCallback((params) => {
    const { data, colDef, newValue } = params
    if (!data?.id) return
    // Skip virtual columns
    if (colDef.field?.startsWith('__')) return

    let finalValue = newValue
    if (newValue === null || newValue === undefined) {
      // If the field is a numeric or date/time/FK field, keep it as null.
      // Otherwise, convert it to an empty string "" to satisfy Django DRF's CharField validation!
      const numericAndDateFields = [
        'distance_travel', 'price_structure', 'price_erection', 'price_misc', 'price_misc_erection',
        'bid_amount', 'quoted_profit', 'ton_steel', 'ton_joist', 'num_main_structural_pcs',
        'sq_ft_structural', 'struct_fab_hours', 'struct_fab_duration_months', 'misc_fab_hours',
        'misc_fab_duration_months', 'struct_erect_hours', 'struct_erect_duration_months',
        'misc_erect_hours', 'misc_erect_duration_months', 'estimating_hours', 'awarded_amount',
        'sfe_job_no', 'bid_due_date', 'bid_due_time', 'quote_date', 'follow_up_date',
        'awarded_job_date', 'contract_executed_date', 'fabrication_start_date', 'struct_fab_start_month',
        'misc_fab_start_month', 'struct_erect_start_month', 'misc_erect_start_month', 'customer', 'primary_estimator'
      ]
      if (!numericAndDateFields.includes(colDef.field)) {
        finalValue = ''
      }
    }

    updateMutation.mutate({ id: data.id, data: { [colDef.field]: finalValue } })
  }, [updateMutation])

  // Quick search
  const onSearch = (e) => {
    setSearchText(e.target.value)
    gridRef.current?.api?.setQuickFilter(e.target.value)
  }

  const exportCSV = () => gridRef.current?.api?.exportDataAsCsv({
    fileName: `SFE_RFQ_Export_${new Date().toISOString().slice(0, 10)}.csv`,
  })

  function handleDelete(data) {
    if (!window.confirm(`Delete ${data.quote_no} — ${data.project_name}? This cannot be undone.`)) return
    deleteMutation.mutate(data.id)
  }

  const rowData = rfqData || []
  const wonCount     = rowData.filter(r => r.won_lost === 'Won').length
  const lostCount    = rowData.filter(r => r.won_lost === 'Lost').length
  const pendingCount = rowData.filter(r => r.won_lost === 'Pending').length

  // AG Grid context — passes callbacks into cell renderers without re-rendering columns
  const gridContext = useMemo(() => ({
    canEdit,
    isManager,
    onSebwSync:  (rfq) => setSebwTarget(rfq),
    onDuplicate: (rfq) => duplicateMutation.mutate(rfq.id),
    onDelete:    (rfq) => handleDelete(rfq),
    onSetJobNo:  (rfq) => setJobNoTarget(rfq),
    queryClient,
  }), [canEdit, isManager, queryClient])

  // Filter pills — display mapping
  const FILTER_OPTIONS = [
    { value: 'all', label: 'All' },
    { value: 'Won', label: 'Won' },
    { value: 'Lost', label: 'Lost' },
    { value: 'Pending', label: 'Pending' },  // DB=Pending, display=In Progress
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: 12 }}>
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 0 }}>
        <div>
          <div className="page-subtitle">
            {rowData.length} records &nbsp;·&nbsp;
            <span style={{ color: 'var(--success)' }}>{wonCount} Won</span> &nbsp;·&nbsp;
            <span style={{ color: 'var(--danger)' }}>{lostCount} Lost</span> &nbsp;·&nbsp;
            <span style={{ color: 'var(--warning)' }}>{pendingCount} Progress</span>
          </div>
        </div>
        <div className="flex gap-sm">
          {canEdit && (
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>
              <Plus /> New RFQ
            </button>
          )}
          { (isManager || canEdit) && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setShowExcelUpload(true)}
              title="Upload Excel file to import records"
            >
              <FileSpreadsheet style={{ width: 13, height: 13 }} /> Upload Excel
            </button>
          )}
          <button className="btn btn-secondary btn-sm" onClick={exportCSV}>
            <Download /> Export
          </button>
          <button className="btn btn-ghost btn-sm" onClick={refetch}>
            <RefreshCw style={{ width: 13, height: 13 }} />
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="toolbar">
        <div className="toolbar-search">
          <Search className="search-icon" />
          <input
            id="rfq-search"
            type="text"
            className="form-input"
            placeholder="Search quote, project, customer…"
            value={searchText}
            onChange={onSearch}
          />
        </div>

        <div className="filter-group">
          {FILTER_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              className={`filter-pill ${wonLostFilter === value ? 'active' : ''}`}
              onClick={() => setWonLostFilter(value)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="ag-theme-quartz ag-theme-rfq" style={{ height: 'calc(100vh - 220px)', width: '100%' }}>
        {isLoading ? (
          <div className="loading-overlay">Loading RFQ data…</div>
        ) : (
          <AgGridReact
            ref={gridRef}
            rowData={rowData}
            columnDefs={columnDefs}
            context={gridContext}
            getRowClass={getRowClass}
            rowSelection="single"
            suppressRowClickSelection
            onCellValueChanged={onCellValueChanged}
            defaultColDef={{
              resizable: true,
              sortable: true,
              unSortIcon: true,
              suppressMenuHide: true,
              filter: true,
              suppressMovable: false,
              minWidth: 60,
            }}
            columnTypes={{
              sfeNumericColumn: {
                cellClass: 'numeric-cell ag-right-aligned-cell',
                headerClass: 'ag-left-aligned-header',
                filter: 'agNumberColumnFilter',
              },
            }}
            groupHeaderHeight={32}
            headerHeight={40}
            rowHeight={36}
            animateRows
            pagination
            paginationPageSize={25}
            paginationPageSizeSelector={[25, 50, 100, 250, 500]}
            overlayNoRowsTemplate="<span class='ag-overlay-no-rows-center'>No result found for this filter</span>"
          />
        )}
      </div>

      {/* New RFQ Modal */}
      {showModal && (
        <RFQFormModal
          customers={customers}
          estimators={estimators}
          onClose={() => setShowModal(false)}
          onSaved={() => {
            setShowModal(false)
            queryClient.invalidateQueries({ queryKey: ['rfq'] })
          }}
        />
      )}

      {/* SEBW Sync Modal */}
      {sebwTarget && (
        <SEBWSyncModal
          rfq={sebwTarget}
          onClose={() => setSebwTarget(null)}
          onSaved={() => setSebwTarget(null)}
        />
      )}

      {/* Set SFE Job # Modal */}
      {jobNoTarget && (
        <SetJobNoModal
          rfq={jobNoTarget}
          onClose={() => setJobNoTarget(null)}
          onSaved={() => setJobNoTarget(null)}
        />
      )}

      {/* Excel Upload Modal */}
      {showExcelUpload && (
        <ExcelUploadModal
          onClose={() => setShowExcelUpload(false)}
          onImported={() => setShowExcelUpload(false)}
        />
      )}
    </div>
  )
}
