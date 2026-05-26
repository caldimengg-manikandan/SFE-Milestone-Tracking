import { useState, useEffect } from 'react';
import {
  FolderInput, Search, X, Plus, Calendar, Clock, Lock,
  ChevronDown, AlertTriangle, CheckCircle2, SlidersHorizontal,
  ChevronRight, Calculator, FileSpreadsheet, Eye, Info, Sparkles, Loader2,
  Pencil, Download
} from 'lucide-react';
import { bidEnquiryAPI, customerAPI, employeeAPI } from '../../services/api';

const MONTHS_LIST = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const MONTH_MAP = {
  'january': 1, 'february': 2, 'march': 3, 'april': 4, 'may': 5, 'june': 6,
  'july': 7, 'august': 8, 'september': 9, 'october': 10, 'november': 11, 'december': 12,
  'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'jun': 6, 'jul': 7, 'aug': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12
};

const REV_MONTH_MAP = {
  1: 'January', 2: 'February', 3: 'March', 4: 'April', 5: 'May', 6: 'June',
  7: 'July', 8: 'August', 9: 'September', 10: 'October', 11: 'November', 12: 'December'
};

const calculateEndMonth = (startMonthStr, duration) => {
  if (!startMonthStr || isNaN(duration) || parseInt(duration) <= 0) return '';
  const cleaned = startMonthStr.trim().toLowerCase();
  
  let words = cleaned.split(/\s+/);
  let monthPart = words[0] || cleaned;
  let yearPart = words[1] || '';
  
  if (cleaned.includes('-')) {
    let parts = cleaned.split('-');
    monthPart = parts[0];
    yearPart = parts[1];
  }

  const monthNum = MONTH_MAP[monthPart];
  if (!monthNum) return startMonthStr;

  const endNumRaw = monthNum + Math.max(0, parseInt(duration) - 1);
  
  if (yearPart) {
    try {
      let year = yearPart.length === 2 ? parseInt('20' + yearPart) : parseInt(yearPart);
      let yearsToAdd = Math.floor((endNumRaw - 1) / 12);
      let endNum = ((endNumRaw - 1) % 12) + 1;
      let finalYear = year + yearsToAdd;
      
      const endMonthName = REV_MONTH_MAP[endNum];
      return yearPart.length === 2 ? `${endMonthName} '${String(finalYear).substring(2)}` : `${endMonthName} ${finalYear}`;
    } catch (e) {
      // ignore
    }
  }

  let endNum = ((endNumRaw - 1) % 12) + 1;
  const endMonthName = REV_MONTH_MAP[endNum] || '';
  return endMonthName.charAt(0).toUpperCase() + endMonthName.slice(1);
};

export default function BidEnquiry() {
  const [bids, setBids] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [estimators, setEstimators] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Toast notification state
  const [toast, setToast] = useState({ show: false, type: '', message: '' });

  // Delete confirmation modal
  const [deleteConfirm, setDeleteConfirm] = useState({ show: false, id: null });
  
  // UI Options
  const [showAllColumns, setShowAllColumns] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeFormTab, setActiveFormTab] = useState('bidding_pricing'); // 'bidding_pricing', 'fab_erect', or 'estimating_execution'
  const [editingId, setEditingId] = useState(null);

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCustomer, setFilterCustomer] = useState('');
  const [filterEstimator, setFilterEstimator] = useState('');
  const [filterDecision, setFilterDecision] = useState('');
  const [filterWonLost, setFilterWonLost] = useState('');

  // Initial Form Data
  const initialFormState = {
    // Part 1: Pink Section — Bidding & Enquiry Details (19 fields)
    quote_no: '',
    project_name: '',
    project_comments: '',
    bid_due_date: '',
    bid_due_time: '',
    location: '',
    distance: '',
    aisc_fab_req: 'No',
    aisc_erect_req: 'No',
    customer_name: '',
    scope_of_work: '',
    decision_to_bid: 'TBD',
    primary_estimator: '',
    sent_to_jd: '',
    sent_to_detailing: '',
    sent_to_erection: '',
    est_sqft_ton: 0,
    sfe_job_no: '',
    awarded_job_no_date: '',
    contract_executed_date: '',

    // Part 2: Estimation Details (45 fields)
    price_structure: 0,
    price_struc_erection: 0,
    price_misc: 0,
    price_misc_erection: 0,
    bid_amount: 0,
    quoted_profit: 0,
    ton_steel: 0,
    ton_joist: 0,
    main_structural_pcs: 0,
    sqft_structural: 0,
    struct_fab_hours: 0,
    struct_fab_start_month: '',
    struct_fab_duration: 0,
    misc_fab_hours: 0,
    misc_fab_start_month: '',
    misc_fab_duration: 0,
    struct_erect_hours: 0,
    struct_erect_start_month: '',
    struct_erect_duration: 0,
    misc_erect_hours: 0,
    misc_erect_start_month: '',
    misc_erect_duration: 0,
    estimating_hours: 0,
    quote_date: '',
    won_lost: 'Pending',
    estimator_followup_notes: '',
    estimator_followup_date: '',
    awarded_amount: 0,
    fab_start_date: '',
  };

  const [formData, setFormData] = useState(initialFormState);
  const [calculatedReadouts, setCalculatedReadouts] = useState({});

  const fetchBids = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filterCustomer) params.customer_name = filterCustomer;
      if (filterEstimator) params.primary_estimator = filterEstimator;
      if (filterWonLost) params.won_lost = filterWonLost;
      if (filterDecision) params.decision_to_bid = filterDecision;
      
      const response = await bidEnquiryAPI.getAll(params);
      setBids(response.data.results || response.data);
    } catch (err) {
      console.error(err);
      setError('Failed to load bid enquiries.');
    } finally {
      setLoading(false);
    }
  };

  const fetchMasters = async () => {
    try {
      const custResp = await customerAPI.getAll();
      setCustomers(custResp.data.results || custResp.data);

      const empResp = await employeeAPI.getAll();
      setEstimators(empResp.data.results || empResp.data);
    } catch (err) {
      console.error('Failed to load drop-downs:', err);
    }
  };

  useEffect(() => {
    fetchBids();
  }, [filterCustomer, filterEstimator, filterWonLost, filterDecision]);

  useEffect(() => {
    fetchMasters();
  }, []);

  // Update calculated fields in real-time
  useEffect(() => {
    const tonSteel = parseFloat(formData.ton_steel) || 0;
    const tonJoist = parseFloat(formData.ton_joist) || 0;
    const pcs = parseInt(formData.main_structural_pcs) || 0;
    const sqft = parseFloat(formData.sqft_structural) || 0;
    const priceStruc = parseFloat(formData.price_structure) || 0;
    const priceErect = parseFloat(formData.price_struc_erection) || 0;
    
    const structFabHours = parseFloat(formData.struct_fab_hours) || 0;
    const structFabDur = parseInt(formData.struct_fab_duration) || 0;
    
    const miscFabHours = parseFloat(formData.misc_fab_hours) || 0;
    const miscFabDur = parseInt(formData.misc_fab_duration) || 0;

    const structErectHours = parseFloat(formData.struct_erect_hours) || 0;
    const structErectDur = parseInt(formData.struct_erect_duration) || 0;

    const miscErectHours = parseFloat(formData.misc_erect_hours) || 0;
    const miscErectDur = parseInt(formData.misc_erect_duration) || 0;

    // Maths
    const totalTonnage = tonSteel + tonJoist;
    const structPcsPerTon = tonSteel > 0 ? pcs / tonSteel : 0;
    const structTonPerSqftNoJoist = sqft > 0 ? tonSteel / sqft : 0;
    const structTonPerSqftWithJoist = sqft > 0 ? totalTonnage / sqft : 0;
    const structCostPerTon = tonSteel > 0 ? priceStruc / tonSteel : 0;
    const structErectCostPerTon = totalTonnage > 0 ? priceErect / totalTonnage : 0;
    const structCostPerSqft = sqft > 0 ? priceStruc / sqft : 0;
    const structErectCostPerSqft = sqft > 0 ? priceErect / sqft : 0;

    const structFabEndMonth = calculateEndMonth(formData.struct_fab_start_month, structFabDur);
    const avgMonthlyStructFabHours = structFabDur > 0 ? structFabHours / structFabDur : 0;

    const miscFabEndMonth = calculateEndMonth(formData.misc_fab_start_month, miscFabDur);
    const avgMonthlyMiscFabHours = miscFabDur > 0 ? miscFabHours / miscFabDur : 0;

    const structErectEndMonth = calculateEndMonth(formData.struct_erect_start_month, structErectDur);
    const avgMonthlyStructErectHours = structErectDur > 0 ? structErectHours / structErectDur : 0;

    const miscErectEndMonth = calculateEndMonth(formData.misc_erect_start_month, miscErectDur);
    const avgMonthlyMiscErectHours = miscErectDur > 0 ? miscErectHours / miscErectDur : 0;

    setCalculatedReadouts({
      total_tonnage: totalTonnage.toFixed(2),
      struct_pcs_per_ton: structPcsPerTon.toFixed(4),
      struct_ton_per_sqft_no_joist: structTonPerSqftNoJoist.toFixed(6),
      struct_ton_per_sqft_with_joist: structTonPerSqftWithJoist.toFixed(6),
      struct_cost_per_ton: structCostPerTon.toFixed(2),
      struct_erect_cost_per_ton: structErectCostPerTon.toFixed(2),
      struct_cost_per_sqft: structCostPerSqft.toFixed(2),
      struct_erect_cost_per_sqft: structErectCostPerSqft.toFixed(2),
      
      struct_fab_end_month: structFabEndMonth,
      avg_monthly_struct_fab_hours: avgMonthlyStructFabHours.toFixed(2),
      
      misc_fab_end_month: miscFabEndMonth,
      avg_monthly_misc_fab_hours: avgMonthlyMiscFabHours.toFixed(2),
      
      struct_erect_end_month: structErectEndMonth,
      avg_monthly_struct_erect_hours: avgMonthlyStructErectHours.toFixed(2),
      
      misc_erect_end_month: miscErectEndMonth,
      avg_monthly_misc_erect_hours: avgMonthlyMiscErectHours.toFixed(2),
    });
  }, [formData]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleOpenAddModal = () => {
    setEditingId(null);
    setFormData(initialFormState);
    setActiveFormTab('bidding_pricing');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (bid) => {
    setEditingId(bid.id);
    
    // Copy all properties
    const editData = {};
    Object.keys(initialFormState).forEach(key => {
      editData[key] = bid[key] !== null && bid[key] !== undefined ? bid[key] : initialFormState[key];
    });

    setFormData(editData);
    setActiveFormTab('bidding_pricing');
    setIsModalOpen(true);
  };

  const showToast = (type, message) => {
    setToast({ show: true, type, message });
    setTimeout(() => setToast({ show: false, type: '', message: '' }), 4000);
  };

  const handleDeleteBid = (id) => {
    setDeleteConfirm({ show: true, id });
  };

  const confirmDelete = async () => {
    const id = deleteConfirm.id;
    setDeleteConfirm({ show: false, id: null });
    try {
      await bidEnquiryAPI.delete(id);
      showToast('success', 'Bid enquiry deleted successfully.');
      fetchBids();
    } catch (err) {
      console.error(err);
      showToast('error', 'Failed to delete bid enquiry. Please try again.');
    }
  };

  const handleExportCSV = (bid) => {
    const headers = [
      'Quote No', 'Project Name', 'Project Comments', 'Bid Due Date', 'Bid Due Time',
      'Location', 'Distance', 'AISC Fab Y/N', 'AISC Erect Y/N', 'Customer Name',
      'Decision to Bid', 'Primary Estimator', 'Sent to J&D', 'Sent to Detailing',
      'Sent to Erection', 'Est Sq-Feet/Ton',
      'Price Structure', 'Price Struc-Erection', 'Price Misc', 'Price Misc-Erection',
      'Bid Amount', 'Quoted Profit', 'Ton Steel', 'Ton Joist', 'Total Tonnage',
      '# Main Structural Pcs', 'Struct Pcs/Ton', 'Sq Ft Structural',
      'Struct Tonnage/Sq Ft (No Joist)', 'Struct Tonnage/Sq Ft (With Joist)',
      'Struct Cost/Ton', 'Struct Erect Cost/Ton', 'Struct Cost/Sq Ft', 'Struct Erect Cost/Sq Ft',
      'Struct Fab Hours', 'Struct Fab Start Month', 'Struct Fab Duration (mo)',
      'Struct Fab End Month', 'Avg Monthly Struct Fab Hours',
      'Misc Fab Hours', 'Misc Fab Start Month', 'Misc Fab Duration (mo)',
      'Misc Fab End Month', 'Avg Monthly Misc Fab Hours',
      'Struct Erect Hours', 'Struct Erect Start Month', 'Struct Erect Duration (mo)',
      'Struct Erect End Month', 'Avg Monthly Struct Erect Hours',
      'Misc Erect Hours', 'Misc Erect Start Month', 'Misc Erect Duration (mo)',
      'Misc Erect End Month', 'Avg Monthly Misc Erect Hours',
      'Estimating Hours', 'Quote Date', 'Won/Lost', 'Follow Up Notes', 'Follow Up Date',
      'Awarded Amount', 'SFE Job #', 'Awarded Job # Date', 'Contract Executed Date',
      'Fab Start Date'
    ];

    const values = [
      bid.quote_no || '', bid.project_name || '', bid.project_comments || '',
      bid.bid_due_date || '', bid.bid_due_time || '', bid.location || '',
      bid.distance || '', bid.aisc_fab_req || '', bid.aisc_erect_req || '',
      bid.customer_name_str || '', bid.scope_of_work || '', bid.decision_to_bid || '',
      bid.primary_estimator_name || '', bid.sent_to_jd || '',
      bid.sent_to_detailing || '', bid.sent_to_erection || '',
      bid.est_sqft_ton || 0,
      bid.price_structure || 0, bid.price_struc_erection || 0,
      bid.price_misc || 0, bid.price_misc_erection || 0,
      bid.bid_amount || 0, bid.quoted_profit || 0,
      bid.ton_steel || 0, bid.ton_joist || 0,
      parseFloat(bid.ton_steel || 0) + parseFloat(bid.ton_joist || 0),
      bid.main_structural_pcs || 0,
      bid.struct_pcs_per_ton || 0, bid.sqft_structural || 0,
      bid.struct_ton_per_sqft_no_joist || 0, bid.struct_ton_per_sqft_with_joist || 0,
      bid.struct_cost_per_ton || 0, bid.struct_erect_cost_per_ton || 0,
      bid.struct_cost_per_sqft || 0, bid.struct_erect_cost_per_sqft || 0,
      bid.struct_fab_hours || 0, bid.struct_fab_start_month || '',
      bid.struct_fab_duration || 0, bid.struct_fab_end_month || '',
      bid.avg_monthly_struct_fab_hours || 0,
      bid.misc_fab_hours || 0, bid.misc_fab_start_month || '',
      bid.misc_fab_duration || 0, bid.misc_fab_end_month || '',
      bid.avg_monthly_misc_fab_hours || 0,
      bid.struct_erect_hours || 0, bid.struct_erect_start_month || '',
      bid.struct_erect_duration || 0, bid.struct_erect_end_month || '',
      bid.avg_monthly_struct_erect_hours || 0,
      bid.misc_erect_hours || 0, bid.misc_erect_start_month || '',
      bid.misc_erect_duration || 0, bid.misc_erect_end_month || '',
      bid.avg_monthly_misc_erect_hours || 0,
      bid.estimating_hours || 0, bid.quote_date || '', bid.won_lost || '',
      bid.estimator_followup_notes || '', bid.estimator_followup_date || '',
      bid.awarded_amount || 0, bid.sfe_job_no || '',
      bid.awarded_job_no_date || '', bid.contract_executed_date || '',
      bid.fab_start_date || ''
    ];

    const escape = (v) => `"${String(v).replace(/"/g, '""')}"`;
    const csv = [headers.map(escape).join(','), values.map(escape).join(',')].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bid_${bid.quote_no || bid.id}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('success', `Exported bid "${bid.quote_no || bid.id}" as CSV.`);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');


    // Clean inputs: replace empty text fields for numbers to 0
    const submitData = { ...formData };
    
    // Set blank foreign keys to null
    if (!submitData.customer_name) submitData.customer_name = null;
    if (!submitData.primary_estimator) submitData.primary_estimator = null;

    // Convert empty fields to null for dates
    const dateFields = [
      'bid_due_date', 'sent_to_jd', 'sent_to_detailing', 'sent_to_erection',
      'awarded_job_no_date', 'contract_executed_date', 'quote_date',
      'estimator_followup_date', 'fab_start_date'
    ];
    dateFields.forEach(f => {
      if (!submitData[f]) submitData[f] = null;
    });

    if (!submitData.bid_due_time) submitData.bid_due_time = null;

    try {
      let response;
      if (editingId) {
        response = await bidEnquiryAPI.update(editingId, submitData);
        let msg = 'Bid enquiry updated successfully.';
        if (response.data.email_sent) {
          msg += ' Email sent.';
        } else if (submitData.scope_of_work) {
          msg += ' Email failed to send.';
        }
        showToast(response.data.email_sent || !submitData.scope_of_work ? 'success' : 'warning', msg);
      } else {
        response = await bidEnquiryAPI.create(submitData);
        let msg = 'Bid enquiry created successfully.';
        if (response.data.email_sent) {
          msg += ' Email sent.';
        } else if (submitData.scope_of_work) {
          msg += ' Email failed to send.';
        }
        showToast(response.data.email_sent || !submitData.scope_of_work ? 'success' : 'warning', msg);
      }
      setIsModalOpen(false);
      fetchBids();
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.detail || err.response?.data?.quote_no?.[0] || 'Failed to save. Please check all fields and try again.';
      showToast('error', msg);
    }
  };

  // Filter list locally for live search
  const filteredBids = bids.filter(bid => {
    const terms = searchTerm.toLowerCase();
    return (
      bid.quote_no?.toLowerCase().includes(terms) ||
      bid.project_name?.toLowerCase().includes(terms) ||
      bid.location?.toLowerCase().includes(terms) ||
      bid.customer_name_str?.toLowerCase().includes(terms) ||
      bid.scope_of_work?.toLowerCase().includes(terms) ||
      bid.primary_estimator_name?.toLowerCase().includes(terms)
    );
  });

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'Won': return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
      case 'Lost': return 'bg-rose-500/10 text-rose-400 border border-rose-500/20';
      case 'Pending': return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
      case 'Cancelled': return 'bg-slate-500/10 text-slate-400 border border-slate-500/20';
      default: return 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20';
    }
  };

  const formatShortDate = (dateStr) => {
    if (!dateStr) return '—';
    const parts = dateStr.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return dateStr;
  };

  return (
    <div className="h-[calc(100vh-72px)] -m-4 sm:-m-6 lg:-m-8 bg-slate-50/30 flex flex-col overflow-hidden">

      {/* Toast Notification */}
      {toast.show && (
        <div className={`fixed top-5 right-5 z-[200] flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl text-sm font-bold animate-fade-in border max-w-sm ${
          toast.type === 'success'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
            : 'bg-rose-50 border-rose-200 text-rose-700'
        }`}>
          {toast.type === 'success'
            ? <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-500" />
            : <AlertTriangle className="w-5 h-5 shrink-0 text-rose-500" />}
          <span>{toast.message}</span>
          <button onClick={() => setToast({ show: false, type: '', message: '' })} className="ml-2 text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm.show && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-8 flex flex-col items-center gap-4 border border-rose-100">
            <div className="w-14 h-14 rounded-full bg-rose-50 flex items-center justify-center">
              <AlertTriangle className="w-7 h-7 text-rose-500" />
            </div>
            <h3 className="text-base font-bold text-slate-900 text-center">Confirm Deletion</h3>
            <p className="text-sm text-slate-500 text-center">Do you want to delete this bid enquiry? This action cannot be undone.</p>
            <div className="flex gap-3 w-full mt-2">
              <button
                onClick={() => setDeleteConfirm({ show: false, id: null })}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 px-4 py-2.5 rounded-xl bg-rose-500 text-white text-xs font-bold hover:bg-rose-600 transition-all shadow-sm"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Combined Header & Filter Bar */}
      <div className="flex-none bg-white border-b border-slate-200 shadow-sm z-30 p-3 lg:px-6 space-y-3 animate-fade-in">
        {/* Search & Actions Row */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Live Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search quotes, projects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs text-slate-800 border border-slate-200 focus:border-amber-400 focus:ring-4 focus:ring-amber-500/5 bg-white rounded-lg pl-9 pr-3 py-2 outline-none transition-all placeholder-slate-400"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAllColumns(!showAllColumns)}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border text-xs font-bold transition-all ${
                showAllColumns 
                  ? 'bg-amber-50 border-amber-300 text-amber-600 shadow-inner' 
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              {showAllColumns ? 'Showing 64 Columns' : 'Showing Main Columns'}
            </button>

            <button
              onClick={handleOpenAddModal}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold shadow-sm hover:from-amber-400 hover:to-orange-400 transition-all transform active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              Create Enquiry
            </button>
          </div>
        </div>

        {/* Dropdown Filters Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t border-slate-100">
          {/* Customer filter */}
          <select
            value={filterCustomer}
            onChange={(e) => setFilterCustomer(e.target.value)}
            className="w-full text-xs text-slate-600 border border-slate-200 focus:border-amber-400 bg-white rounded-lg px-3 py-2 outline-none transition-colors cursor-pointer font-semibold"
          >
            <option value="">All Customers</option>
            {customers.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          {/* Estimator filter */}
          <select
            value={filterEstimator}
            onChange={(e) => setFilterEstimator(e.target.value)}
            className="w-full text-xs text-slate-600 border border-slate-200 focus:border-amber-400 bg-white rounded-lg px-3 py-2 outline-none transition-colors cursor-pointer font-semibold"
          >
            <option value="">All Estimators</option>
            {estimators.map(e => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>

          {/* Decision filter */}
          <select
            value={filterDecision}
            onChange={(e) => setFilterDecision(e.target.value)}
            className="w-full text-xs text-slate-600 border border-slate-200 focus:border-amber-400 bg-white rounded-lg px-3 py-2 outline-none transition-colors cursor-pointer font-semibold"
          >
            <option value="">All Decisions</option>
            <option value="Yes">Bid (Yes)</option>
            <option value="No">No Bid (No)</option>
            <option value="TBD">To Be Decided (TBD)</option>
          </select>

          {/* Won/Lost filter */}
          <select
            value={filterWonLost}
            onChange={(e) => setFilterWonLost(e.target.value)}
            className="w-full text-xs text-slate-600 border border-slate-200 focus:border-amber-400 bg-white rounded-lg px-3 py-2 outline-none transition-colors cursor-pointer font-semibold"
          >
            <option value="">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Won">Won</option>
            <option value="Lost">Lost</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Main Content Body Area */}
      <div className="flex-1 overflow-hidden flex flex-col p-4 bg-slate-50/50 min-h-0">

        {/* Datagrid Section */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col min-h-0 overflow-hidden animate-fade-in flex-1">
          <div className="overflow-auto min-h-0 flex-1 scrollbar-thin">
            <table className={`w-full border-collapse text-left text-xs ${showAllColumns ? 'min-w-[7200px]' : 'min-w-full table-fixed md:table-auto'} relative`}>
              {/* Multi-Section Headers */}
              <thead className="sticky top-0 z-20 shadow-sm">
                {showAllColumns ? (
                    <tr className="bg-gradient-to-r from-amber-500 to-orange-500 text-white uppercase text-[10px] font-black tracking-wider select-none">

                      {/* 1-16 (MB) */}
                      <th className="px-3 py-3 border-r border-white/10 w-[110px]">Quote No (MB)</th>
                      <th className="px-3 py-3 border-r border-white/10 min-w-[160px]">Project Name (MB)</th>
                      <th className="px-3 py-3 border-r border-white/10 min-w-[200px]">Project Comments (MB)</th>
                      <th className="px-3 py-3 border-r border-white/10 text-center w-[100px]">Bid Due Date (MB)</th>
                      <th className="px-3 py-3 border-r border-white/10 text-center w-[100px]">Bid Due Time (MB)</th>
                      <th className="px-3 py-3 border-r border-white/10 min-w-[140px]">Location (MB)</th>
                      <th className="px-3 py-3 border-r border-white/10 text-center w-[130px]">Distance (Earlier Time Travelled) (MB)</th>
                      <th className="px-3 py-3 border-r border-white/10 text-center w-[100px]">AISC Fab Y/N (MB)</th>
                      <th className="px-3 py-3 border-r border-white/10 text-center w-[100px]">AISC Erect Y/N (MB)</th>
                      <th className="px-3 py-3 border-r border-white/10 min-w-[120px]">Customer Name (MB)</th>
                      <th className="px-3 py-3 border-r border-white/10 text-center w-[110px]">Decision to Bid (Y/N) (MB)</th>
                      <th className="px-3 py-3 border-r border-white/10 min-w-[150px]">Primary Estimator (First, Middle & Last Name Initial) (MB)</th>
                      <th className="px-3 py-3 border-r border-white/10 text-center w-[100px]">Sent to J&D (MB)</th>
                      <th className="px-3 py-3 border-r border-white/10 text-center w-[100px]">Sent to Detailing (MB)</th>
                      <th className="px-3 py-3 border-r border-white/10 text-center w-[100px]">Sent to Erection (MB)</th>
                      <th className="px-3 py-3 border-r border-white/10 text-right w-[110px]">Est Sq-Feet/Ton (MB)</th>

                      {/* 17-34 (Pricing, Tonnages & Ratios) */}
                      <th className="px-3 py-3 border-r border-white/10 text-right w-[110px]">Price Structure (Estimator)</th>
                      <th className="px-3 py-3 border-r border-white/10 text-right w-[110px]">Price Struc- Erection (Estimator)</th>
                      <th className="px-3 py-3 border-r border-white/10 text-right w-[110px]">Price Misc (Estimator)</th>
                      <th className="px-3 py-3 border-r border-white/10 text-right w-[110px]">Price Misc. - Erection (Estimator)</th>
                      <th className="px-3 py-3 border-r border-white/10 text-right w-[110px]">Bid Amount (Estimator)</th>
                      <th className="px-3 py-3 border-r border-white/10 text-right w-[110px]">Quoted Profit (Estimator)</th>
                      <th className="px-3 py-3 border-r border-white/10 text-right w-[90px]">Ton Steel (Estimator)</th>
                      <th className="px-3 py-3 border-r border-white/10 text-right w-[90px]">Ton Joist (Estimator)</th>
                      <th className="px-3 py-3 border-r border-white/10 text-right w-[110px]">Total Tonnage (No Fill)</th>
                      <th className="px-3 py-3 border-r border-white/10 text-right w-[90px]"># of Main Structural Pcs. (Estimator)</th>
                      <th className="px-3 py-3 border-r border-white/10 text-right w-[120px]">Structural Pieces / Ton (Without Jst) (No Fill)</th>
                      <th className="px-3 py-3 border-r border-white/10 text-right w-[110px]">Sq. Ft. Structural (Estimator)</th>
                      <th className="px-3 py-3 border-r border-white/10 text-right w-[130px]">Structural Tonnage / Sq. ft (Without Jst) (No Fill)</th>
                      <th className="px-3 py-3 border-r border-white/10 text-right w-[130px]">Structural Tonnage / Sq. ft. (With Joist) (No Fill)</th>
                      <th className="px-3 py-3 border-r border-white/10 text-right w-[120px]">Structural Cost / Structural Ton (No Fill)</th>
                      <th className="px-3 py-3 border-r border-white/10 text-right w-[120px]">Structural Erection Cost / Ton (No Fill)</th>
                      <th className="px-3 py-3 border-r border-white/10 text-right w-[110px]">Structural Cost / Sq. ft. (No Fill)</th>
                      <th className="px-3 py-3 border-r border-white/10 text-right w-[110px]">Structural Erection Cost / Sq. ft. (No Fill)</th>

                      {/* 35-54 (Fabrication & Erection Schedules) */}
                      <th className="px-3 py-3 border-r border-white/10 text-right w-[110px]">Structural Fabrication Hours at Time of Bid (Estimator)</th>
                      <th className="px-3 py-3 border-r border-white/10 text-center w-[120px]">Anticipated Structural Fabrication Start Month (Estimator)</th>
                      <th className="px-3 py-3 border-r border-white/10 text-center w-[80px]">Anticipated Structural Fabrication Duration in Months (Estimator)</th>
                      <th className="px-3 py-3 border-r border-white/10 text-center w-[110px]">Anticipated Structural Fabrication End Month (No Fill)</th>
                      <th className="px-3 py-3 border-r border-white/10 text-right w-[120px]">Average Monthly Structural Fabrication Hours (No Fill)</th>
                      <th className="px-3 py-3 border-r border-white/10 text-right w-[110px]">Misc Fabrication Hours at Time of Bid (Estimator)</th>
                      <th className="px-3 py-3 border-r border-white/10 text-center w-[120px]">Anticipated Misc. Fabrication Start Month (Estimator)</th>
                      <th className="px-3 py-3 border-r border-white/10 text-center w-[80px]">Anticipated Misc. Fabrication Duration in Months (Estimator)</th>
                      <th className="px-3 py-3 border-r border-white/10 text-center w-[110px]">Anticipated Misc. Fabrication End Month (No Fill)</th>
                      <th className="px-3 py-3 border-r border-white/10 text-right w-[120px]">Average Monthly Misc. Fabrication Hours (No Fill)</th>
                      <th className="px-3 py-3 border-r border-white/10 text-right w-[110px]">Structural Erection Hours at Time of Bid (Estimator)</th>
                      <th className="px-3 py-3 border-r border-white/10 text-center w-[120px]">Anticipated Structural Erection Start Month (Estimator)</th>
                      <th className="px-3 py-3 border-r border-white/10 text-center w-[80px]">Anticipated Structural Erection Duration in Months (Estimator)</th>
                      <th className="px-3 py-3 border-r border-white/10 text-center w-[110px]">Anticipated Structural Erection End Month (No Fill)</th>
                      <th className="px-3 py-3 border-r border-white/10 text-right w-[120px]">Average Monthly Structural Erection Hours (No Fill)</th>
                      <th className="px-3 py-3 border-r border-white/10 text-right w-[110px]">Misc. Erection Hours at Time of Bid (Estimator)</th>
                      <th className="px-3 py-3 border-r border-white/10 text-center w-[120px]">Anticipated Misc. Erection Start Month (Estimator)</th>
                      <th className="px-3 py-3 border-r border-white/10 text-center w-[80px]">Anticipated Misc. Erection Duration in Months (Estimator)</th>
                      <th className="px-3 py-3 border-r border-white/10 text-center w-[110px]">Anticipated Misc. Erection End Month (No Fill)</th>
                      <th className="px-3 py-3 border-r border-white/10 text-right w-[120px]">Average Monthly Misc. Erection Hours (No Fill)</th>

                      {/* 55-60 (Estimating & Follow-up) */}
                      <th className="px-3 py-3 border-r border-white/10 text-right w-[110px]">Estimating Hours (Estimator)</th>
                      <th className="px-3 py-3 border-r border-white/10 text-center w-[100px]">Quote Date (Estimator)</th>
                      <th className="px-3 py-3 border-r border-white/10 text-center w-[100px]">Won / Lost (Estimator)</th>
                      <th className="px-3 py-3 border-r border-white/10 min-w-[200px]">Estimator Follow Up Notes (Estimator)</th>
                      <th className="px-3 py-3 border-r border-white/10 text-center w-[100px]">Estimator Follow Up Date (Estimator)</th>
                      <th className="px-3 py-3 border-r border-white/10 text-right w-[110px]">Awarded Amount (Estimator)</th>

                      {/* 61-63 (Job Award & Execution) */}
                      <th className="px-3 py-3 border-r border-white/10 text-center w-[110px]">SFE Job # (MB)</th>
                      <th className="px-3 py-3 border-r border-white/10 text-center w-[100px]">Awarded Job # Date (MB)</th>
                      <th className="px-3 py-3 border-r border-white/10 text-center w-[100px]">Contract Executed Date (MB)</th>

                      {/* 64 (Fabrication Start) */}
                      <th className="px-3 py-3 border-r border-white/10 text-center w-[100px]">Fabrication Start Date (JF)</th>
                      
                      <th className="px-3 py-3 text-center w-[90px]">Actions</th>
                    </tr>
                ) : (
                  <tr className="bg-gradient-to-r from-amber-500 to-orange-500 text-white uppercase text-[10px] font-black tracking-wider select-none">
                    <th className="px-3 py-2.5 border-r border-white/10 w-[90px]">Quote No</th>
                    <th className="px-3 py-2.5 border-r border-white/10 min-w-[150px]">Project Name</th>
                    <th className="px-3 py-2.5 border-r border-white/10 w-[110px]">Customer</th>
                    <th className="px-3 py-2.5 border-r border-white/10 w-[110px]">Estimator</th>
                    <th className="px-3 py-2.5 border-r border-white/10 text-center w-[90px]">Due Date</th>
                    <th className="px-3 py-2.5 border-r border-white/10 text-right w-[95px]">Tonnage</th>
                    <th className="px-3 py-2.5 border-r border-white/10 text-right w-[95px]">Bid Amount</th>
                    <th className="px-3 py-2.5 border-r border-white/10 text-center w-[85px]">Status</th>
                    <th className="px-3 py-2.5 border-r border-white/10 min-w-[150px]">Follow Up Notes</th>
                    <th className="px-3 py-2.5 text-center w-[80px]">Actions</th>
                  </tr>
                )}
              </thead>
              
              <tbody className="divide-y divide-slate-100 bg-white">
                {loading ? (
                  <tr>
                    <td colSpan={showAllColumns ? 65 : 10} className="py-20 text-center">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto text-amber-500 mb-2" />
                      <p className="text-xs font-bold text-slate-400">Loading bid enquiries...</p>
                    </td>
                  </tr>
                ) : filteredBids.length > 0 ? (
                  filteredBids.map((bid) => (
                    <tr key={bid.id} className="transition-colors group text-[12px] border-b border-slate-100 hover:bg-slate-50/30">
                      {showAllColumns ? (
                        <>
                          {/* 1-16 (MB) */}
                          <td className="px-3 py-3 font-mono font-bold text-slate-900 border-r border-slate-100">{bid.quote_no}</td>
                          <td className="px-3 py-3 font-bold text-slate-800 border-r border-slate-100 break-words leading-tight" title={bid.project_name}>
                            {bid.project_name}
                          </td>
                          <td className="px-3 py-3 text-slate-500 border-r border-slate-100 max-w-[200px] truncate leading-normal" title={bid.project_comments}>
                            {bid.project_comments || '—'}
                          </td>
                          <td className="px-3 py-3 text-center text-slate-600 border-r border-slate-100 font-medium">{formatShortDate(bid.bid_due_date)}</td>
                          <td className="px-3 py-3 text-center text-slate-600 border-r border-slate-100">{bid.bid_due_time || '—'}</td>
                          <td className="px-3 py-3 text-slate-600 border-r border-slate-100 break-words leading-tight">{bid.location || '—'}</td>
                          <td className="px-3 py-3 text-center text-slate-600 border-r border-slate-100">{bid.distance || '—'}</td>
                          <td className="px-3 py-3 text-center text-slate-600 border-r border-slate-100">{bid.aisc_fab_req || 'No'}</td>
                          <td className="px-3 py-3 text-center text-slate-600 border-r border-slate-100">{bid.aisc_erect_req || 'No'}</td>
                          <td className="px-3 py-3 text-slate-600 border-r border-slate-100 leading-tight">{bid.customer_name_str || '—'}</td>
                          <td className="px-3 py-3 text-center text-slate-600 border-r border-slate-100 font-semibold">{bid.decision_to_bid || 'TBD'}</td>
                          <td className="px-3 py-3 text-slate-600 border-r border-slate-100 leading-tight">{bid.primary_estimator_name || '—'}</td>
                          <td className="px-3 py-3 text-center text-slate-600 border-r border-slate-100">{formatShortDate(bid.sent_to_jd)}</td>
                          <td className="px-3 py-3 text-center text-slate-600 border-r border-slate-100">{formatShortDate(bid.sent_to_detailing)}</td>
                          <td className="px-3 py-3 text-center text-slate-600 border-r border-slate-100">{formatShortDate(bid.sent_to_erection)}</td>
                          <td className="px-3 py-3 text-right text-slate-600 border-r border-slate-100">{parseFloat(bid.est_sqft_ton || 0).toFixed(4)}</td>

                          {/* 17-34 (Pricing, Tonnages & Ratios) */}
                          <td className="px-3 py-3 text-right font-bold text-slate-800 border-r border-slate-100">${parseFloat(bid.price_structure || 0).toLocaleString()}</td>
                          <td className="px-3 py-3 text-right font-bold text-slate-800 border-r border-slate-100">${parseFloat(bid.price_struc_erection || 0).toLocaleString()}</td>
                          <td className="px-3 py-3 text-right text-slate-600 border-r border-slate-100">${parseFloat(bid.price_misc || 0).toLocaleString()}</td>
                          <td className="px-3 py-3 text-right text-slate-600 border-r border-slate-100">${parseFloat(bid.price_misc_erection || 0).toLocaleString()}</td>
                          <td className="px-3 py-3 text-right font-bold text-amber-600 border-r border-slate-100">${parseFloat(bid.bid_amount || 0).toLocaleString()}</td>
                          <td className="px-3 py-3 text-right text-slate-600 border-r border-slate-100">${parseFloat(bid.quoted_profit || 0).toLocaleString()}</td>
                          <td className="px-3 py-3 text-right font-semibold text-slate-700 border-r border-slate-100">{parseFloat(bid.ton_steel || 0).toFixed(2)}</td>
                          <td className="px-3 py-3 text-right text-slate-600 border-r border-slate-100">{parseFloat(bid.ton_joist || 0).toFixed(2)}</td>
                          <td className="px-3 py-3 text-right font-extrabold text-amber-600 border-r border-slate-100">{parseFloat(bid.total_tonnage || 0).toFixed(2)} Tons</td>
                          <td className="px-3 py-3 text-right text-slate-600 border-r border-slate-100">{parseInt(bid.main_structural_pcs || 0)}</td>
                          <td className="px-3 py-3 text-right text-slate-600 border-r border-slate-100">{parseFloat(bid.struct_pcs_per_ton || 0).toFixed(4)}</td>
                          <td className="px-3 py-3 text-right text-slate-600 border-r border-slate-100">{parseFloat(bid.sqft_structural || 0).toLocaleString()}</td>
                          <td className="px-3 py-3 text-right text-slate-600 border-r border-slate-100">{parseFloat(bid.struct_ton_per_sqft_no_joist || 0).toFixed(6)}</td>
                          <td className="px-3 py-3 text-right text-slate-600 border-r border-slate-100">{parseFloat(bid.struct_ton_per_sqft_with_joist || 0).toFixed(6)}</td>
                          <td className="px-3 py-3 text-right text-slate-600 border-r border-slate-100">${parseFloat(bid.struct_cost_per_ton || 0).toFixed(2)}</td>
                          <td className="px-3 py-3 text-right text-slate-600 border-r border-slate-100">${parseFloat(bid.struct_erect_cost_per_ton || 0).toFixed(2)}</td>
                          <td className="px-3 py-3 text-right text-slate-600 border-r border-slate-100">${parseFloat(bid.struct_cost_per_sqft || 0).toFixed(2)}</td>
                          <td className="px-3 py-3 text-right text-slate-600 border-r border-slate-100">${parseFloat(bid.struct_erect_cost_per_sqft || 0).toFixed(2)}</td>

                          {/* 35-54 (Fabrication & Erection Schedules) */}
                          <td className="px-3 py-3 text-right text-slate-600 border-r border-slate-100">{parseFloat(bid.struct_fab_hours || 0).toFixed(2)}</td>
                          <td className="px-3 py-3 text-center text-slate-700 border-r border-slate-100 font-medium">{bid.struct_fab_start_month || '—'}</td>
                          <td className="px-3 py-3 text-center text-slate-600 border-r border-slate-100">{parseInt(bid.struct_fab_duration || 0)} mo</td>
                          <td className="px-3 py-3 text-center text-slate-700 border-r border-slate-100">{bid.struct_fab_end_month || '—'}</td>
                          <td className="px-3 py-3 text-right text-slate-600 border-r border-slate-100">{parseFloat(bid.avg_monthly_struct_fab_hours || 0).toFixed(2)} hr</td>
                          <td className="px-3 py-3 text-right text-slate-600 border-r border-slate-100">{parseFloat(bid.misc_fab_hours || 0).toFixed(2)}</td>
                          <td className="px-3 py-3 text-center text-slate-700 border-r border-slate-100 font-medium">{bid.misc_fab_start_month || '—'}</td>
                          <td className="px-3 py-3 text-center text-slate-600 border-r border-slate-100">{parseInt(bid.misc_fab_duration || 0)} mo</td>
                          <td className="px-3 py-3 text-center text-slate-700 border-r border-slate-100">{bid.misc_fab_end_month || '—'}</td>
                          <td className="px-3 py-3 text-right text-slate-600 border-r border-slate-100">{parseFloat(bid.avg_monthly_misc_fab_hours || 0).toFixed(2)} hr</td>
                          <td className="px-3 py-3 text-right text-slate-600 border-r border-slate-100">{parseFloat(bid.struct_erect_hours || 0).toFixed(2)}</td>
                          <td className="px-3 py-3 text-center text-slate-700 border-r border-slate-100 font-medium">{bid.struct_erect_start_month || '—'}</td>
                          <td className="px-3 py-3 text-center text-slate-600 border-r border-slate-100">{parseInt(bid.struct_erect_duration || 0)} mo</td>
                          <td className="px-3 py-3 text-center text-slate-700 border-r border-slate-100">{bid.struct_erect_end_month || '—'}</td>
                          <td className="px-3 py-3 text-right text-slate-600 border-r border-slate-100">{parseFloat(bid.avg_monthly_struct_erect_hours || 0).toFixed(2)} hr</td>
                          <td className="px-3 py-3 text-right text-slate-600 border-r border-slate-100">{parseFloat(bid.misc_erect_hours || 0).toFixed(2)}</td>
                          <td className="px-3 py-3 text-center text-slate-700 border-r border-slate-100 font-medium">{bid.misc_erect_start_month || '—'}</td>
                          <td className="px-3 py-3 text-center text-slate-600 border-r border-slate-100">{parseInt(bid.misc_erect_duration || 0)} mo</td>
                          <td className="px-3 py-3 text-center text-slate-700 border-r border-slate-100">{bid.misc_erect_end_month || '—'}</td>
                          <td className="px-3 py-3 text-right text-slate-600 border-r border-slate-100">{parseFloat(bid.avg_monthly_misc_erect_hours || 0).toFixed(2)} hr</td>

                          {/* 55-60 (Estimating & Follow-up) */}
                          <td className="px-3 py-3 text-right text-slate-600 border-r border-slate-100">{parseFloat(bid.estimating_hours || 0).toFixed(2)}</td>
                          <td className="px-3 py-3 text-center text-slate-600 border-r border-slate-100">{formatShortDate(bid.quote_date)}</td>
                          <td className="px-3 py-3 text-center font-bold border-r border-slate-100">
                            <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[9px] uppercase tracking-wider font-bold ${
                              bid.won_lost === 'Won' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                              bid.won_lost === 'Lost' ? 'bg-rose-50 text-rose-600 border border-rose-100' :
                              bid.won_lost === 'Pending' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                              'bg-slate-50 text-slate-600 border border-slate-200'
                            }`}>
                              {bid.won_lost || 'Pending'}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-slate-500 border-r border-slate-100 max-w-[200px] truncate leading-normal" title={bid.estimator_followup_notes}>
                            {bid.estimator_followup_notes || '—'}
                          </td>
                          <td className="px-3 py-3 text-center text-slate-600 border-r border-slate-100">{formatShortDate(bid.estimator_followup_date)}</td>
                          <td className="px-3 py-3 text-right font-bold text-slate-800 border-r border-slate-100">${parseFloat(bid.awarded_amount || 0).toLocaleString()}</td>

                          {/* 61-63 (Job Award & Execution) */}
                          <td className="px-3 py-3 text-center text-slate-600 border-r border-slate-100 font-medium">{bid.sfe_job_no || '—'}</td>
                          <td className="px-3 py-3 text-center text-slate-600 border-r border-slate-100">{formatShortDate(bid.awarded_job_no_date)}</td>
                          <td className="px-3 py-3 text-center text-slate-600 border-r border-slate-100">{formatShortDate(bid.contract_executed_date)}</td>

                          {/* 64 (Fabrication Start) */}
                          <td className="px-3 py-3 text-center text-slate-600 border-r border-slate-100">{formatShortDate(bid.fab_start_date)}</td>
                        </>
                      ) : (
                        <>
                          <td className="px-3 py-3 font-mono font-bold text-slate-900 border-r border-slate-100">{bid.quote_no}</td>
                          <td className="px-3 py-3 font-bold text-slate-800 border-r border-slate-100 break-words leading-tight" title={bid.project_name}>
                            {bid.project_name}
                          </td>
                          <td className="px-3 py-3 text-slate-600 border-r border-slate-100 leading-tight">{bid.customer_name_str || '—'}</td>
                          <td className="px-3 py-3 text-slate-600 border-r border-slate-100 leading-tight">{bid.primary_estimator_name || '—'}</td>
                          <td className="px-3 py-3 text-center text-slate-600 border-r border-slate-100 font-medium">{formatShortDate(bid.bid_due_date)}</td>
                          <td className="px-3 py-3 text-right font-extrabold text-amber-600 border-r border-slate-100">{parseFloat(bid.total_tonnage || 0).toFixed(2)} Tons</td>
                          <td className="px-3 py-3 text-right font-bold text-slate-800 border-r border-slate-100">${parseFloat(bid.bid_amount || 0).toLocaleString()}</td>
                          <td className="px-3 py-3 text-center border-r border-slate-100">
                            <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[9px] uppercase tracking-wider font-bold ${
                              bid.won_lost === 'Won' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                              bid.won_lost === 'Lost' ? 'bg-rose-50 text-rose-600 border border-rose-100' :
                              bid.won_lost === 'Pending' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                              'bg-slate-50 text-slate-600 border border-slate-200'
                            }`}>
                              {bid.won_lost || 'Pending'}
                            </span>
                          </td>
                          <td className="px-3 py-3 border-r border-slate-100 text-slate-600 leading-normal max-w-[240px] truncate" title={bid.estimator_followup_notes}>
                            {bid.estimator_followup_notes || '—'}
                          </td>
                        </>
                      )}

                      <td className="px-3 py-3 text-center">
                        <div className="flex items-center justify-center gap-0.5">
                          <button
                            onClick={() => handleOpenEditModal(bid)}
                            className="p-1 rounded text-blue-500 hover:bg-blue-50"
                            title="Edit Record"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleExportCSV(bid)}
                            className="p-1 rounded text-emerald-600 hover:bg-emerald-50"
                            title="Export as CSV"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteBid(bid.id)}
                            className="p-1 rounded text-red-500 hover:bg-red-50"
                            title="Delete"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={showAllColumns ? 65 : 10} className="px-6 py-12 text-center text-slate-500 italic">
                      No bid enquiries found matching your search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {/* Locked Pagination Footer */}
          <div className="flex-none bg-slate-50 px-6 py-4 flex items-center justify-between border-t border-slate-200">
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              {filteredBids.length} {filteredBids.length === 1 ? 'Record' : 'Records'} Found
            </div>
            <div className="flex items-center gap-1.5">
              <button className="p-1.5 rounded-md border border-slate-200 bg-white text-slate-400 opacity-50"><ChevronRight className="w-4 h-4 rotate-180" /></button>
              <button className="w-7 h-7 rounded-md bg-[#f28c28] text-white text-xs font-black flex items-center justify-center shadow-sm">1</button>
              <button className="p-1.5 rounded-md border border-slate-200 bg-white text-slate-400"><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
        </div>
      </div>

      {/* Bid Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden transition-all duration-300 border border-slate-100">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between px-8 py-5 border-b border-slate-100 bg-slate-50/50 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white">
                  <Calculator className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 tracking-wide">
                    {editingId ? 'Edit Bid Details & Calculation' : 'Create New Bid Enquiry & Estimate'}
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-white shadow-sm transition-all"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Split Section Tabs */}
            <div className="flex bg-slate-50 p-1.5 shrink-0 border-b border-slate-100">
              <button
                type="button"
                onClick={() => setActiveFormTab('bidding_pricing')}
                className={`flex-1 text-center py-3 text-xs font-bold transition-all rounded-xl flex items-center justify-center gap-2 border ${
                  activeFormTab === 'bidding_pricing'
                    ? 'bg-pink-100/50 border-pink-200/50 text-pink-700 shadow-sm'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <div className="w-2 h-2 rounded-full bg-pink-400"></div>
                Bidding & Pricing
              </button>
              <button
                type="button"
                onClick={() => setActiveFormTab('fab_erect')}
                className={`flex-1 text-center py-3 text-xs font-bold transition-all rounded-xl flex items-center justify-center gap-2 border ${
                  activeFormTab === 'fab_erect'
                    ? 'bg-cyan-100/50 border-cyan-200/50 text-cyan-700 shadow-sm'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <div className="w-2 h-2 rounded-full bg-cyan-400"></div>
                Fabrication & Erection
              </button>
              <button
                type="button"
                onClick={() => setActiveFormTab('estimating_execution')}
                className={`flex-1 text-center py-3 text-xs font-bold transition-all rounded-xl flex items-center justify-center gap-2 border ${
                  activeFormTab === 'estimating_execution'
                    ? 'bg-indigo-100/50 border-indigo-200/50 text-indigo-700 shadow-sm'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <div className="w-2 h-2 rounded-full bg-indigo-400"></div>
                Estimating & Execution
              </button>
            </div>

            {/* Modal Body: Form */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-6">
              
              {/* TAB 1: Bidding & Pricing */}
              {activeFormTab === 'bidding_pricing' && (
                <div className="space-y-6 animate-fade-in">
                  {/* Section 1: General & Bidding Details (MB) */}
                  <div className="bg-pink-50/20 border border-pink-100 p-5 rounded-2xl">
                    <h4 className="text-xs font-bold text-pink-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-pink-500" /> General & Bidding Details (MB)
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                      {/* 1: Quote No */}
                      <div>
                        <label className="text-[11px] font-bold text-slate-500 block mb-1.5 uppercase tracking-wider ml-1">1. Quote No (MB)</label>
                        <input
                          type="text"
                          name="quote_no"
                          value={formData.quote_no}
                          onChange={handleInputChange}
                          placeholder="e.g. Q-9821"
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-pink-400 focus:ring-4 focus:ring-pink-500/5 transition-all text-slate-800"
                        />
                      </div>

                      {/* 2: Project Name */}
                      <div>
                        <label className="text-[11px] font-bold text-slate-500 block mb-1.5 uppercase tracking-wider ml-1">2. Project Name (MB)</label>
                        <input
                          type="text"
                          name="project_name"
                          value={formData.project_name}
                          onChange={handleInputChange}
                          placeholder="e.g. Skyline Industrial Hub"
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-pink-400 focus:ring-4 focus:ring-pink-500/5 transition-all text-slate-800"
                        />
                      </div>

                      {/* 3: Project Comments (Area) */}
                      <div>
                        <label className="text-[11px] font-bold text-slate-500 block mb-1.5 uppercase tracking-wider ml-1">3. Comments (MB)</label>
                        <input
                          type="text"
                          name="project_comments"
                          value={formData.project_comments || ''}
                          onChange={handleInputChange}
                          placeholder="General comments..."
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-pink-400 focus:ring-4 focus:ring-pink-500/5 transition-all text-slate-800"
                        />
                      </div>

                      {/* 4: Bid Due Date */}
                      <div>
                        <label className="text-[11px] font-bold text-slate-500 block mb-1.5 uppercase tracking-wider ml-1">4. Due Date (MB)</label>
                        <input
                          type="date"
                          name="bid_due_date"
                          value={formData.bid_due_date || ''}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-pink-400 focus:ring-4 focus:ring-pink-500/5 transition-all text-slate-800"
                        />
                      </div>

                      {/* 5: Bid Due Time */}
                      <div>
                        <label className="text-[11px] font-bold text-slate-500 block mb-1.5 uppercase tracking-wider ml-1">5. Due Time (MB)</label>
                        <input
                          type="time"
                          name="bid_due_time"
                          value={formData.bid_due_time || ''}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-pink-400 focus:ring-4 focus:ring-pink-500/5 transition-all text-slate-800"
                        />
                      </div>

                      {/* 6: Location */}
                      <div>
                        <label className="text-[11px] font-bold text-slate-500 block mb-1.5 uppercase tracking-wider ml-1">6. Location (MB)</label>
                        <input
                          type="text"
                          name="location"
                          value={formData.location || ''}
                          onChange={handleInputChange}
                          placeholder="e.g. Houston, TX"
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-pink-400 focus:ring-4 focus:ring-pink-500/5 transition-all text-slate-800"
                        />
                      </div>

                      {/* 7: Distance */}
                      <div>
                        <label className="text-[11px] font-bold text-slate-500 block mb-1.5 uppercase tracking-wider ml-1">7. Distance (MB)</label>
                        <input
                          type="text"
                          name="distance"
                          value={formData.distance || ''}
                          onChange={handleInputChange}
                          placeholder="e.g. 45 miles"
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-pink-400 focus:ring-4 focus:ring-pink-500/5 transition-all text-slate-800"
                        />
                      </div>

                      {/* 8: AISC Fab */}
                      <div>
                        <label className="text-[11px] font-bold text-slate-500 block mb-1.5 uppercase tracking-wider ml-1">8. AISC Fab (MB)</label>
                        <select
                          name="aisc_fab_req"
                          value={formData.aisc_fab_req}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-pink-400 focus:ring-4 focus:ring-pink-500/5 transition-all text-slate-600 font-semibold"
                        >
                          <option value="No">No</option>
                          <option value="Yes">Yes</option>
                        </select>
                      </div>

                      {/* 9: AISC Erect */}
                      <div>
                        <label className="text-[11px] font-bold text-slate-500 block mb-1.5 uppercase tracking-wider ml-1">9. AISC Erect (MB)</label>
                        <select
                          name="aisc_erect_req"
                          value={formData.aisc_erect_req}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-pink-400 focus:ring-4 focus:ring-pink-500/5 transition-all text-slate-600 font-semibold"
                        >
                          <option value="No">No</option>
                          <option value="Yes">Yes</option>
                        </select>
                      </div>

                      {/* 10: Customer */}
                      <div>
                        <label className="text-[11px] font-bold text-slate-500 block mb-1.5 uppercase tracking-wider ml-1">10. Customer (MB)</label>
                        <select
                          name="customer_name"
                          value={formData.customer_name}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-pink-400 focus:ring-4 focus:ring-pink-500/5 transition-all text-slate-600 font-semibold cursor-pointer"
                        >
                          <option value="">Select Customer</option>
                          {customers.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </div>

                      {/* Scope of Work */}
                      <div>
                        <label className="text-[11px] font-bold text-slate-500 block mb-1.5 uppercase tracking-wider ml-1">Scope of Work</label>
                        <select
                          name="scope_of_work"
                          value={formData.scope_of_work}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-pink-400 focus:ring-4 focus:ring-pink-500/5 transition-all text-slate-600 font-semibold cursor-pointer"
                        >
                          <option value="">Select Scope</option>
                          <option value="Detailing">Detailing</option>
                          <option value="Fabrication">Fabrication</option>
                          <option value="Erection">Erection</option>
                        </select>
                      </div>

                      {/* 11: Decision to Bid */}
                      <div>
                        <label className="text-[11px] font-bold text-slate-500 block mb-1.5 uppercase tracking-wider ml-1">11. Decision to Bid (MB)</label>
                        <select
                          name="decision_to_bid"
                          value={formData.decision_to_bid}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-pink-400 focus:ring-4 focus:ring-pink-500/5 transition-all text-slate-600 font-semibold cursor-pointer"
                        >
                          <option value="TBD">TBD</option>
                          <option value="Yes">Yes (Bid)</option>
                          <option value="No">No (Declined)</option>
                        </select>
                      </div>

                      {/* 12: Primary Estimator */}
                      <div>
                        <label className="text-[11px] font-bold text-slate-500 block mb-1.5 uppercase tracking-wider ml-1">12. Estimator (MB)</label>
                        <select
                          name="primary_estimator"
                          value={formData.primary_estimator}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-pink-400 focus:ring-4 focus:ring-pink-500/5 transition-all text-slate-600 font-semibold cursor-pointer"
                        >
                          <option value="">Select Estimator</option>
                          {estimators.map(e => (
                            <option key={e.id} value={e.id}>{e.name}</option>
                          ))}
                        </select>
                      </div>

                      {/* 13: Sent to J&D */}
                      <div>
                        <label className="text-[11px] font-bold text-slate-500 block mb-1.5 uppercase tracking-wider ml-1">13. Sent to J&D (MB)</label>
                        <input
                          type="date"
                          name="sent_to_jd"
                          value={formData.sent_to_jd || ''}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-pink-400 focus:ring-4 focus:ring-pink-500/5 transition-all text-slate-800"
                        />
                      </div>

                      {/* 14: Sent to Detailing */}
                      <div>
                        <label className="text-[11px] font-bold text-slate-500 block mb-1.5 uppercase tracking-wider ml-1">14. Sent to Detailing (MB)</label>
                        <input
                          type="date"
                          name="sent_to_detailing"
                          value={formData.sent_to_detailing || ''}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-pink-400 focus:ring-4 focus:ring-pink-500/5 transition-all text-slate-800"
                        />
                      </div>

                      {/* 15: Sent to Erection */}
                      <div>
                        <label className="text-[11px] font-bold text-slate-500 block mb-1.5 uppercase tracking-wider ml-1">15. Sent to Erection (MB)</label>
                        <input
                          type="date"
                          name="sent_to_erection"
                          value={formData.sent_to_erection || ''}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-pink-400 focus:ring-4 focus:ring-pink-500/5 transition-all text-slate-800"
                        />
                      </div>

                      {/* 16: Est Sq-Ft/Ton */}
                      <div>
                        <label className="text-[11px] font-bold text-slate-500 block mb-1.5 uppercase tracking-wider ml-1">16. Est Sq-Ft/Ton (MB)</label>
                        <input
                          type="number"
                          step="0.0001"
                          name="est_sqft_ton"
                          value={formData.est_sqft_ton}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-pink-400 focus:ring-4 focus:ring-pink-500/5 transition-all text-slate-800"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Section 2: Pricing, Tonnages & Ratios */}
                  <div className="bg-violet-50/20 border border-violet-100 p-5 rounded-2xl">
                    <h4 className="text-xs font-bold text-violet-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-violet-500" /> Pricing, Tonnages & Ratios
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                      {/* 17: Price Structure */}
                      <div>
                        <label className="text-[11px] font-bold text-slate-500 block mb-1.5 uppercase tracking-wider ml-1">17. Price Structure (Est)</label>
                        <input
                          type="number"
                          step="0.01"
                          name="price_structure"
                          value={formData.price_structure}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-500/5 transition-all text-slate-800 font-bold"
                        />
                      </div>

                      {/* 18: Price Struc- Erection */}
                      <div>
                        <label className="text-[11px] font-bold text-slate-500 block mb-1.5 uppercase tracking-wider ml-1">18. Price Struct Erection (Est)</label>
                        <input
                          type="number"
                          step="0.01"
                          name="price_struc_erection"
                          value={formData.price_struc_erection}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-500/5 transition-all text-slate-800"
                        />
                      </div>

                      {/* 19: Price Misc */}
                      <div>
                        <label className="text-[11px] font-bold text-slate-500 block mb-1.5 uppercase tracking-wider ml-1">19. Price Misc (Est)</label>
                        <input
                          type="number"
                          step="0.01"
                          name="price_misc"
                          value={formData.price_misc}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-500/5 transition-all text-slate-800"
                        />
                      </div>

                      {/* 20: Price Misc. - Erection */}
                      <div>
                        <label className="text-[11px] font-bold text-slate-500 block mb-1.5 uppercase tracking-wider ml-1">20. Price Misc Erection (Est)</label>
                        <input
                          type="number"
                          step="0.01"
                          name="price_misc_erection"
                          value={formData.price_misc_erection}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-500/5 transition-all text-slate-800"
                        />
                      </div>

                      {/* 21: Bid Amount */}
                      <div>
                        <label className="text-[11px] font-bold text-slate-500 block mb-1.5 uppercase tracking-wider ml-1">21. Bid Amount (Est)</label>
                        <input
                          type="number"
                          step="0.01"
                          name="bid_amount"
                          value={formData.bid_amount}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-500/5 transition-all text-slate-800 font-bold text-amber-600"
                        />
                      </div>

                      {/* 22: Quoted Profit */}
                      <div>
                        <label className="text-[11px] font-bold text-slate-500 block mb-1.5 uppercase tracking-wider ml-1">22. Quoted Profit (Est)</label>
                        <input
                          type="number"
                          step="0.01"
                          name="quoted_profit"
                          value={formData.quoted_profit}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-500/5 transition-all text-slate-800"
                        />
                      </div>

                      {/* 23: Ton Steel */}
                      <div>
                        <label className="text-[11px] font-bold text-slate-500 block mb-1.5 uppercase tracking-wider ml-1">23. Steel Tonnage (Est)</label>
                        <input
                          type="number"
                          step="0.01"
                          name="ton_steel"
                          value={formData.ton_steel}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-500/5 transition-all text-slate-800 font-semibold"
                        />
                      </div>

                      {/* 24: Ton Joist */}
                      <div>
                        <label className="text-[11px] font-bold text-slate-500 block mb-1.5 uppercase tracking-wider ml-1">24. Joist Tonnage (Est)</label>
                        <input
                          type="number"
                          step="0.01"
                          name="ton_joist"
                          value={formData.ton_joist}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-500/5 transition-all text-slate-800"
                        />
                      </div>

                      {/* 25: Total Tonnage (No Fill) - READ ONLY */}
                      <div>
                        <label className="text-[11px] font-bold text-slate-500 block mb-1.5 uppercase tracking-wider ml-1">25. Total Tonnage (No Fill)</label>
                        <div className="relative">
                          <input
                            type="text"
                            value={calculatedReadouts.total_tonnage ? `${calculatedReadouts.total_tonnage} Tons` : '0.00 Tons'}
                            readOnly
                            className="w-full px-4 py-3 rounded-xl border border-cyan-200 bg-cyan-50/20 text-sm font-extrabold text-cyan-700 outline-none select-none pr-10"
                          />
                          <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-400" />
                        </div>
                      </div>

                      {/* 26: # of Main Structural Pcs. */}
                      <div>
                        <label className="text-[11px] font-bold text-slate-500 block mb-1.5 uppercase tracking-wider ml-1">26. Main Struct Pcs (Est)</label>
                        <input
                          type="number"
                          name="main_structural_pcs"
                          value={formData.main_structural_pcs}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-500/5 transition-all text-slate-800"
                        />
                      </div>

                      {/* 27: Structural Pieces / Ton (Without Jst) (No Fill) - READ ONLY */}
                      <div>
                        <label className="text-[11px] font-bold text-slate-500 block mb-1.5 uppercase tracking-wider ml-1">27. Struct Pcs/Ton (No Fill)</label>
                        <div className="relative">
                          <input
                            type="text"
                            value={calculatedReadouts.struct_pcs_per_ton || '0.0000'}
                            readOnly
                            className="w-full px-4 py-3 rounded-xl border border-cyan-200 bg-cyan-50/20 text-sm font-extrabold text-cyan-700 outline-none select-none pr-10"
                          />
                          <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-400" />
                        </div>
                      </div>

                      {/* 28: Sq. Ft. Structural */}
                      <div>
                        <label className="text-[11px] font-bold text-slate-500 block mb-1.5 uppercase tracking-wider ml-1">28. Struct Sq Ft (Est)</label>
                        <input
                          type="number"
                          step="0.01"
                          name="sqft_structural"
                          value={formData.sqft_structural}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-500/5 transition-all text-slate-800"
                        />
                      </div>

                      {/* 29: Structural Tonnage / Sq. ft (Without Jst) (No Fill) - READ ONLY */}
                      <div>
                        <label className="text-[11px] font-bold text-slate-500 block mb-1.5 uppercase tracking-wider ml-1">29. Struct Ton/Sq Ft (No Fill)</label>
                        <div className="relative">
                          <input
                            type="text"
                            value={calculatedReadouts.struct_ton_per_sqft_no_joist || '0.000000'}
                            readOnly
                            className="w-full px-4 py-3 rounded-xl border border-cyan-200 bg-cyan-50/20 text-sm font-extrabold text-cyan-700 outline-none select-none pr-10"
                          />
                          <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-400" />
                        </div>
                      </div>

                      {/* 30: Structural Tonnage / Sq. ft. (With Joist) (No Fill) - READ ONLY */}
                      <div>
                        <label className="text-[11px] font-bold text-slate-500 block mb-1.5 uppercase tracking-wider ml-1">30. Struct Ton/Sq Ft w/ Jst (No Fill)</label>
                        <div className="relative">
                          <input
                            type="text"
                            value={calculatedReadouts.struct_ton_per_sqft_with_joist || '0.000000'}
                            readOnly
                            className="w-full px-4 py-3 rounded-xl border border-cyan-200 bg-cyan-50/20 text-sm font-extrabold text-cyan-700 outline-none select-none pr-10"
                          />
                          <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-400" />
                        </div>
                      </div>

                      {/* 31: Structural Cost / Structural Ton (No Fill) - READ ONLY */}
                      <div>
                        <label className="text-[11px] font-bold text-slate-500 block mb-1.5 uppercase tracking-wider ml-1">31. Struct Cost/Ton (No Fill)</label>
                        <div className="relative">
                          <input
                            type="text"
                            value={calculatedReadouts.struct_cost_per_ton ? `$${calculatedReadouts.struct_cost_per_ton}` : '$0.00'}
                            readOnly
                            className="w-full px-4 py-3 rounded-xl border border-cyan-200 bg-cyan-50/20 text-sm font-extrabold text-cyan-700 outline-none select-none pr-10"
                          />
                          <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-400" />
                        </div>
                      </div>

                      {/* 32: Structural Erection Cost / Ton (No Fill) - READ ONLY */}
                      <div>
                        <label className="text-[11px] font-bold text-slate-500 block mb-1.5 uppercase tracking-wider ml-1">32. Struct Erect Cost/Ton (No Fill)</label>
                        <div className="relative">
                          <input
                            type="text"
                            value={calculatedReadouts.struct_erect_cost_per_ton ? `$${calculatedReadouts.struct_erect_cost_per_ton}` : '$0.00'}
                            readOnly
                            className="w-full px-4 py-3 rounded-xl border border-cyan-200 bg-cyan-50/20 text-sm font-extrabold text-cyan-700 outline-none select-none pr-10"
                          />
                          <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-400" />
                        </div>
                      </div>

                      {/* 33: Structural Cost / Sq. ft. (No Fill) - READ ONLY */}
                      <div>
                        <label className="text-[11px] font-bold text-slate-500 block mb-1.5 uppercase tracking-wider ml-1">33. Struct Cost/Sq Ft (No Fill)</label>
                        <div className="relative">
                          <input
                            type="text"
                            value={calculatedReadouts.struct_cost_per_sqft ? `$${calculatedReadouts.struct_cost_per_sqft}` : '$0.00'}
                            readOnly
                            className="w-full px-4 py-3 rounded-xl border border-cyan-200 bg-cyan-50/20 text-sm font-extrabold text-cyan-700 outline-none select-none pr-10"
                          />
                          <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-400" />
                        </div>
                      </div>

                      {/* 34: Structural Erection Cost / Sq. ft. (No Fill) - READ ONLY */}
                      <div>
                        <label className="text-[11px] font-bold text-slate-500 block mb-1.5 uppercase tracking-wider ml-1">34. Struct Erect Cost/Sq Ft (No Fill)</label>
                        <div className="relative">
                          <input
                            type="text"
                            value={calculatedReadouts.struct_erect_cost_per_sqft ? `$${calculatedReadouts.struct_erect_cost_per_sqft}` : '$0.00'}
                            readOnly
                            className="w-full px-4 py-3 rounded-xl border border-cyan-200 bg-cyan-50/20 text-sm font-extrabold text-cyan-700 outline-none select-none pr-10"
                          />
                          <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-400" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-2">
                    <div />
                    <div className="flex items-center gap-3">
                      <button
                        type="submit"
                        className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold shadow-lg shadow-amber-500/20 hover:from-amber-400 hover:to-orange-400 transition-all flex items-center gap-2"
                      >
                        {editingId ? 'Save Worksheet' : 'Publish Estimate'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveFormTab('fab_erect')}
                        className="px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 text-xs font-bold hover:bg-slate-50 flex items-center gap-1 transition-all"
                      >
                        Next: Fab & Erection
                        <ChevronRight className="w-4 h-4 text-cyan-500" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: Fabrication & Erection */}
              {activeFormTab === 'fab_erect' && (
                <div className="space-y-6 animate-fade-in">
                  <div className="bg-cyan-50/20 border border-cyan-100 p-5 rounded-2xl space-y-4">
                    <h4 className="text-xs font-bold text-cyan-600 uppercase tracking-widest flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-cyan-500" /> Fabrication & Erection Schedules
                    </h4>
                    
                    {/* Structural Fabrication Block */}
                    <h5 className="text-[11px] font-black text-cyan-600 uppercase tracking-widest ml-1 mb-2">Structural Fabrication Schedule (35-39)</h5>
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
                      {/* 35: Structural Fabrication Hours at Time of Bid */}
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block mb-1.5 uppercase tracking-wider ml-1">35. Struct Fab Hours (Est)</label>
                        <input
                          type="number"
                          step="0.1"
                          name="struct_fab_hours"
                          value={formData.struct_fab_hours}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-xs outline-none focus:border-cyan-400 focus:ring-4 focus:ring-cyan-500/5 transition-all text-slate-800"
                        />
                      </div>
                      {/* 36: Anticipated Structural Fabrication Start Month */}
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block mb-1.5 uppercase tracking-wider ml-1">36. Struct Fab Start Month (Est)</label>
                        <input
                          type="text"
                          name="struct_fab_start_month"
                          placeholder="e.g. May 2026"
                          value={formData.struct_fab_start_month || ''}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-xs outline-none focus:border-cyan-400 focus:ring-4 focus:ring-cyan-500/5 transition-all text-slate-800"
                        />
                      </div>
                      {/* 37: Anticipated Structural Fabrication Duration in Months */}
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block mb-1.5 uppercase tracking-wider ml-1">37. Struct Fab Duration (Est)</label>
                        <input
                          type="number"
                          name="struct_fab_duration"
                          value={formData.struct_fab_duration}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-xs outline-none focus:border-cyan-400 focus:ring-4 focus:ring-cyan-500/5 transition-all text-slate-800"
                        />
                      </div>
                      {/* 38: Anticipated Structural Fabrication End Month (No Fill) - READ ONLY */}
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block mb-1.5 uppercase tracking-wider ml-1">38. Struct Fab End Month (No Fill)</label>
                        <div className="relative">
                          <input
                            type="text"
                            value={calculatedReadouts.struct_fab_end_month || '—'}
                            readOnly
                            className="w-full px-3 py-2.5 rounded-xl border border-cyan-200 bg-cyan-50/20 text-xs font-extrabold text-cyan-700 outline-none select-none pr-8"
                          />
                          <Lock className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-cyan-400" />
                        </div>
                      </div>
                      {/* 39: Average Monthly Structural Fabrication Hours (No Fill) - READ ONLY */}
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block mb-1.5 uppercase tracking-wider ml-1">39. Avg Struct Fab Hours/Mo (No Fill)</label>
                        <div className="relative">
                          <input
                            type="text"
                            value={calculatedReadouts.avg_monthly_struct_fab_hours ? `${calculatedReadouts.avg_monthly_struct_fab_hours} hr` : '0.00 hr'}
                            readOnly
                            className="w-full px-3 py-2.5 rounded-xl border border-cyan-200 bg-cyan-50/20 text-xs font-extrabold text-cyan-700 outline-none select-none pr-8"
                          />
                          <Lock className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-cyan-400" />
                        </div>
                      </div>
                    </div>

                    {/* Misc Fabrication Block */}
                    <h5 className="text-[11px] font-black text-cyan-600 uppercase tracking-widest ml-1 mb-2">Misc Fabrication Schedule (40-44)</h5>
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
                      {/* 40: Misc Fabrication Hours at Time of Bid */}
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block mb-1.5 uppercase tracking-wider ml-1">40. Misc Fab Hours (Est)</label>
                        <input
                          type="number"
                          step="0.1"
                          name="misc_fab_hours"
                          value={formData.misc_fab_hours}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-xs outline-none focus:border-cyan-400 focus:ring-4 focus:ring-cyan-500/5 transition-all text-slate-800"
                        />
                      </div>
                      {/* 41: Anticipated Misc. Fabrication Start Month */}
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block mb-1.5 uppercase tracking-wider ml-1">41. Misc Fab Start Month (Est)</label>
                        <input
                          type="text"
                          name="misc_fab_start_month"
                          placeholder="e.g. June 2026"
                          value={formData.misc_fab_start_month || ''}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-xs outline-none focus:border-cyan-400 focus:ring-4 focus:ring-cyan-500/5 transition-all text-slate-800"
                        />
                      </div>
                      {/* 42: Anticipated Misc. Fabrication Duration in Months */}
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block mb-1.5 uppercase tracking-wider ml-1">42. Misc Fab Duration (Est)</label>
                        <input
                          type="number"
                          name="misc_fab_duration"
                          value={formData.misc_fab_duration}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-xs outline-none focus:border-cyan-400 focus:ring-4 focus:ring-cyan-500/5 transition-all text-slate-800"
                        />
                      </div>
                      {/* 43: Anticipated Misc. Fabrication End Month (No Fill) - READ ONLY */}
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block mb-1.5 uppercase tracking-wider ml-1">43. Misc Fab End Month (No Fill)</label>
                        <div className="relative">
                          <input
                            type="text"
                            value={calculatedReadouts.misc_fab_end_month || '—'}
                            readOnly
                            className="w-full px-3 py-2.5 rounded-xl border border-cyan-200 bg-cyan-50/20 text-xs font-extrabold text-cyan-700 outline-none select-none pr-8"
                          />
                          <Lock className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-cyan-400" />
                        </div>
                      </div>
                      {/* 44: Average Monthly Misc. Fabrication Hours (No Fill) - READ ONLY */}
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block mb-1.5 uppercase tracking-wider ml-1">44. Avg Misc Fab Hours/Mo (No Fill)</label>
                        <div className="relative">
                          <input
                            type="text"
                            value={calculatedReadouts.avg_monthly_misc_fab_hours ? `${calculatedReadouts.avg_monthly_misc_fab_hours} hr` : '0.00 hr'}
                            readOnly
                            className="w-full px-3 py-2.5 rounded-xl border border-cyan-200 bg-cyan-50/20 text-xs font-extrabold text-cyan-700 outline-none select-none pr-8"
                          />
                          <Lock className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-cyan-400" />
                        </div>
                      </div>
                    </div>

                    {/* Structural Erection Block */}
                    <h5 className="text-[11px] font-black text-cyan-600 uppercase tracking-widest ml-1 mb-2">Structural Erection Schedule (45-49)</h5>
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
                      {/* 45: Structural Erection Hours at Time of Bid */}
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block mb-1.5 uppercase tracking-wider ml-1">45. Struct Erect Hours (Est)</label>
                        <input
                          type="number"
                          step="0.1"
                          name="struct_erect_hours"
                          value={formData.struct_erect_hours}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-xs outline-none focus:border-cyan-400 focus:ring-4 focus:ring-cyan-500/5 transition-all text-slate-800"
                        />
                      </div>
                      {/* 46: Anticipated Structural Erection Start Month */}
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block mb-1.5 uppercase tracking-wider ml-1">46. Struct Erect Start Month (Est)</label>
                        <input
                          type="text"
                          name="struct_erect_start_month"
                          placeholder="e.g. August 2026"
                          value={formData.struct_erect_start_month || ''}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-xs outline-none focus:border-cyan-400 focus:ring-4 focus:ring-cyan-500/5 transition-all text-slate-800"
                        />
                      </div>
                      {/* 47: Anticipated Structural Erection Duration in Months */}
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block mb-1.5 uppercase tracking-wider ml-1">47. Struct Erect Duration (Est)</label>
                        <input
                          type="number"
                          name="struct_erect_duration"
                          value={formData.struct_erect_duration}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-xs outline-none focus:border-cyan-400 focus:ring-4 focus:ring-cyan-500/5 transition-all text-slate-800"
                        />
                      </div>
                      {/* 48: Anticipated Structural Erection End Month (No Fill) - READ ONLY */}
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block mb-1.5 uppercase tracking-wider ml-1">48. Struct Erect End Month (No Fill)</label>
                        <div className="relative">
                          <input
                            type="text"
                            value={calculatedReadouts.struct_erect_end_month || '—'}
                            readOnly
                            className="w-full px-3 py-2.5 rounded-xl border border-cyan-200 bg-cyan-50/20 text-xs font-extrabold text-cyan-700 outline-none select-none pr-8"
                          />
                          <Lock className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-cyan-400" />
                        </div>
                      </div>
                      {/* 49: Average Monthly Structural Erection Hours (No Fill) - READ ONLY */}
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block mb-1.5 uppercase tracking-wider ml-1">49. Avg Struct Erect Hours/Mo (No Fill)</label>
                        <div className="relative">
                          <input
                            type="text"
                            value={calculatedReadouts.avg_monthly_struct_erect_hours ? `${calculatedReadouts.avg_monthly_struct_erect_hours} hr` : '0.00 hr'}
                            readOnly
                            className="w-full px-3 py-2.5 rounded-xl border border-cyan-200 bg-cyan-50/20 text-xs font-extrabold text-cyan-700 outline-none select-none pr-8"
                          />
                          <Lock className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-cyan-400" />
                        </div>
                      </div>
                    </div>

                    {/* Misc Erection Block */}
                    <h5 className="text-[11px] font-black text-cyan-600 uppercase tracking-widest ml-1 mb-2">Misc Erection Schedule (50-54)</h5>
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                      {/* 50: Misc. Erection Hours at Time of Bid */}
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block mb-1.5 uppercase tracking-wider ml-1">50. Misc Erect Hours (Est)</label>
                        <input
                          type="number"
                          step="0.1"
                          name="misc_erect_hours"
                          value={formData.misc_erect_hours}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-xs outline-none focus:border-cyan-400 focus:ring-4 focus:ring-cyan-500/5 transition-all text-slate-800"
                        />
                      </div>
                      {/* 51: Anticipated Misc. Erection Start Month */}
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block mb-1.5 uppercase tracking-wider ml-1">51. Misc Erect Start Month (Est)</label>
                        <input
                          type="text"
                          name="misc_erect_start_month"
                          placeholder="e.g. September 2026"
                          value={formData.misc_erect_start_month || ''}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-xs outline-none focus:border-cyan-400 focus:ring-4 focus:ring-cyan-500/5 transition-all text-slate-800"
                        />
                      </div>
                      {/* 52: Anticipated Misc. Erection Duration in Months */}
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block mb-1.5 uppercase tracking-wider ml-1">52. Misc Erect Duration (Est)</label>
                        <input
                          type="number"
                          name="misc_erect_duration"
                          value={formData.misc_erect_duration}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-xs outline-none focus:border-cyan-400 focus:ring-4 focus:ring-cyan-500/5 transition-all text-slate-800"
                        />
                      </div>
                      {/* 53: Anticipated Misc. Erection End Month (No Fill) - READ ONLY */}
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block mb-1.5 uppercase tracking-wider ml-1">53. Misc Erect End Month (No Fill)</label>
                        <div className="relative">
                          <input
                            type="text"
                            value={calculatedReadouts.misc_erect_end_month || '—'}
                            readOnly
                            className="w-full px-3 py-2.5 rounded-xl border border-cyan-200 bg-cyan-50/20 text-xs font-extrabold text-cyan-700 outline-none select-none pr-8"
                          />
                          <Lock className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-cyan-400" />
                        </div>
                      </div>
                      {/* 54: Average Monthly Misc. Erection Hours (No Fill) - READ ONLY */}
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block mb-1.5 uppercase tracking-wider ml-1">54. Avg Misc Erect Hours/Mo (No Fill)</label>
                        <div className="relative">
                          <input
                            type="text"
                            value={calculatedReadouts.avg_monthly_misc_erect_hours ? `${calculatedReadouts.avg_monthly_misc_erect_hours} hr` : '0.00 hr'}
                            readOnly
                            className="w-full px-3 py-2.5 rounded-xl border border-cyan-200 bg-cyan-50/20 text-xs font-extrabold text-cyan-700 outline-none select-none pr-8"
                          />
                          <Lock className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-cyan-400" />
                        </div>
                      </div>
                    </div>

                  </div>

                  <div className="flex justify-between items-center pt-2">
                    <button
                      type="button"
                      onClick={() => setActiveFormTab('bidding_pricing')}
                      className="px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 text-xs font-bold hover:bg-slate-50 transition-all"
                    >
                      Back to Bidding & Pricing
                    </button>

                    <div className="flex items-center gap-3">
                      <button
                        type="submit"
                        className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold shadow-lg shadow-amber-500/20 hover:from-amber-400 hover:to-orange-400 transition-all flex items-center gap-2"
                      >
                        {editingId ? 'Save Worksheet' : 'Publish Estimate'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveFormTab('estimating_execution')}
                        className="px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 text-xs font-bold hover:bg-slate-50 flex items-center gap-1 transition-all"
                      >
                        Next: Estimating & Execution
                        <ChevronRight className="w-4 h-4 text-indigo-500" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: Estimating & Execution */}
              {activeFormTab === 'estimating_execution' && (
                <div className="space-y-6 animate-fade-in">
                  
                  {/* Section 4: Estimating & Follow-up (Estimator) */}
                  <div className="bg-indigo-50/20 border border-indigo-100 p-5 rounded-2xl space-y-4">
                    <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-widest flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-indigo-500" /> Estimating & Follow-up (Estimator)
                    </h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                      {/* 55: Estimating Hours */}
                      <div>
                        <label className="text-[11px] font-bold text-slate-500 block mb-1.5 uppercase tracking-wider ml-1">55. Estimating Hours (Est)</label>
                        <input
                          type="number"
                          step="0.01"
                          name="estimating_hours"
                          value={formData.estimating_hours}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/5 transition-all text-slate-800"
                        />
                      </div>

                      {/* 56: Quote Date */}
                      <div>
                        <label className="text-[11px] font-bold text-slate-500 block mb-1.5 uppercase tracking-wider ml-1">56. Quote Date (Est)</label>
                        <input
                          type="date"
                          name="quote_date"
                          value={formData.quote_date || ''}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/5 transition-all text-slate-800"
                        />
                      </div>

                      {/* 57: Won / Lost */}
                      <div>
                        <label className="text-[11px] font-bold text-slate-500 block mb-1.5 uppercase tracking-wider ml-1">57. Won/Lost (Est)</label>
                        <select
                          name="won_lost"
                          value={formData.won_lost}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/5 transition-all text-slate-600 font-semibold cursor-pointer"
                        >
                          <option value="Pending">Pending</option>
                          <option value="Won">Won</option>
                          <option value="Lost">Lost</option>
                          <option value="Cancelled">Cancelled</option>
                        </select>
                      </div>

                      {/* 59: Estimator Follow Up Date */}
                      <div>
                        <label className="text-[11px] font-bold text-slate-500 block mb-1.5 uppercase tracking-wider ml-1">59. Follow Up Date (Est)</label>
                        <input
                          type="date"
                          name="estimator_followup_date"
                          value={formData.estimator_followup_date || ''}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/5 transition-all text-slate-800"
                        />
                      </div>

                      {/* 60: Awarded Amount */}
                      <div>
                        <label className="text-[11px] font-bold text-slate-500 block mb-1.5 uppercase tracking-wider ml-1">60. Awarded Amount (Est)</label>
                        <input
                          type="number"
                          step="0.01"
                          name="awarded_amount"
                          value={formData.awarded_amount}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/5 transition-all text-slate-800"
                        />
                      </div>
                    </div>

                    {/* 58: Estimator Follow Up Notes */}
                    <div>
                      <label className="text-[11px] font-bold text-slate-500 block mb-1.5 uppercase tracking-wider ml-1">58. Follow Up Notes (Est)</label>
                      <textarea
                        name="estimator_followup_notes"
                        value={formData.estimator_followup_notes}
                        onChange={handleInputChange}
                        placeholder="Add scheduling or follow up notes..."
                        rows="3"
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/5 transition-all text-slate-800 resize-none"
                      />
                    </div>
                  </div>

                  {/* Section 5: Job Award & Execution (MB) */}
                  <div className="bg-pink-50/20 border border-pink-100 p-5 rounded-2xl">
                    <h4 className="text-xs font-bold text-pink-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-pink-500" /> Job Award & Execution (MB)
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                      {/* 61: SFE Job # */}
                      <div>
                        <label className="text-[11px] font-bold text-slate-500 block mb-1.5 uppercase tracking-wider ml-1">61. SFE Job # (MB)</label>
                        <input
                          type="text"
                          name="sfe_job_no"
                          value={formData.sfe_job_no || ''}
                          onChange={handleInputChange}
                          placeholder="e.g. J-2026A"
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-pink-400 focus:ring-4 focus:ring-pink-500/5 transition-all text-slate-800"
                        />
                      </div>

                      {/* 62: Awarded Job # Date */}
                      <div>
                        <label className="text-[11px] font-bold text-slate-500 block mb-1.5 uppercase tracking-wider ml-1">62. Awarded Date (MB)</label>
                        <input
                          type="date"
                          name="awarded_job_no_date"
                          value={formData.awarded_job_no_date || ''}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 rounded-xl border border-pink-400 focus:ring-4 focus:ring-pink-500/5 transition-all text-slate-800"
                        />
                      </div>

                      {/* 63: Contract Executed Date */}
                      <div>
                        <label className="text-[11px] font-bold text-slate-500 block mb-1.5 uppercase tracking-wider ml-1">63. Contract Executed Date (MB)</label>
                        <input
                          type="date"
                          name="contract_executed_date"
                          value={formData.contract_executed_date || ''}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 rounded-xl border border-pink-400 focus:ring-4 focus:ring-pink-500/5 transition-all text-slate-800"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Section 6: Fabrication Start (JF) */}
                  <div className="bg-emerald-50/20 border border-emerald-100 p-5 rounded-2xl">
                    <h4 className="text-xs font-bold text-emerald-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-emerald-500" /> Fabrication Start (JF)
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                      {/* 64: Fabrication Start Date */}
                      <div>
                        <label className="text-[11px] font-bold text-slate-500 block mb-1.5 uppercase tracking-wider ml-1">64. Fab Start Date (JF)</label>
                        <input
                          type="date"
                          name="fab_start_date"
                          value={formData.fab_start_date || ''}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 rounded-xl border border-emerald-400 focus:ring-4 focus:ring-emerald-500/5 transition-all text-slate-800"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-2">
                    <button
                      type="button"
                      onClick={() => setActiveFormTab('fab_erect')}
                      className="px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 text-xs font-bold hover:bg-slate-50 transition-all"
                    >
                      Back to Fabrication & Erection
                    </button>

                    <button
                      type="submit"
                      className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold shadow-lg shadow-amber-500/20 hover:from-amber-400 hover:to-orange-400 transition-all flex items-center gap-2"
                    >
                      {editingId ? 'Save Worksheet' : 'Publish Estimate'}
                    </button>
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fade-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fade-in 0.3s ease-out forwards; }
      `}</style>
    </div>
  );
}
