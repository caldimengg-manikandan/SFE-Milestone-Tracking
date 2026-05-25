import { useState, useEffect } from 'react';
import {
  FolderInput, Search, X, Plus, Calendar, Clock, Lock,
  ChevronDown, AlertTriangle, CheckCircle2, SlidersHorizontal,
  ChevronRight, Calculator, FileSpreadsheet, Eye, Info, Sparkles, Loader2
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
  
  // UI Options
  const [showAllColumns, setShowAllColumns] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeFormTab, setActiveFormTab] = useState('bidding'); // 'bidding' or 'estimation'
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
    setActiveFormTab('bidding');
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
    setActiveFormTab('bidding');
    setIsModalOpen(true);
  };

  const handleDeleteBid = async (id) => {
    if (!window.confirm('Are you sure you want to delete this bid enquiry?')) return;
    try {
      await bidEnquiryAPI.delete(id);
      setSuccess('Bid enquiry deleted successfully.');
      fetchBids();
    } catch (err) {
      console.error(err);
      setError('Failed to delete bid enquiry.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.quote_no || !formData.project_name) {
      setError('Quote No and Project Name are required.');
      return;
    }

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
      if (editingId) {
        await bidEnquiryAPI.update(editingId, submitData);
        setSuccess('Bid enquiry updated successfully.');
      } else {
        await bidEnquiryAPI.create(submitData);
        setSuccess('Bid enquiry created successfully.');
      }
      setIsModalOpen(false);
      fetchBids();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'Failed to save bid enquiry. Verify Quote No is unique.');
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
        {/* Alert Notices */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-600 text-sm font-bold animate-shake flex-none">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-4 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center gap-3 text-emerald-600 text-sm font-bold animate-fade-in flex-none">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            {success}
          </div>
        )}

        {/* Datagrid Section */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col min-h-0 overflow-hidden animate-fade-in flex-1">
          <div className="overflow-auto min-h-0 flex-1 scrollbar-thin">
            <table className={`w-full border-collapse text-left text-xs ${showAllColumns ? 'min-w-[7200px]' : 'min-w-full table-fixed md:table-auto'} relative`}>
              {/* Multi-Section Headers */}
              <thead className="sticky top-0 z-20 shadow-sm">
                {showAllColumns ? (
                  <>
                    <tr className="border-b border-slate-200 select-none text-[10px] tracking-wider font-extrabold uppercase text-center">
                      <th colSpan="19" className="bg-pink-50 text-pink-600 border-r border-slate-200 py-2">
                        General & Bidding Details (Pink Section — 19 Fields)
                      </th>
                      <th colSpan="29" className="bg-violet-50 text-violet-600 border-r border-slate-200 py-2">
                        Estimation Inputs (Estimator Section — 29 Fields)
                      </th>
                      <th colSpan="16" className="bg-cyan-50 text-cyan-600 border-r border-slate-200 py-2">
                        Calculated Estimations (No Fill Section — 16 Fields)
                      </th>
                      <th colSpan="1" className="bg-amber-50 text-amber-600 py-2">
                        Action Parameters
                      </th>
                    </tr>
                    
                    <tr className="bg-gradient-to-r from-amber-500 to-orange-500 text-white uppercase text-[10px] font-black tracking-wider select-none">
                      <th className="px-3 py-3 border-r border-white/10 w-[110px]">Quote No</th>
                      <th className="px-3 py-3 border-r border-white/10 min-w-[160px]">Project Name</th>
                      <th className="px-3 py-3 border-r border-white/10 min-w-[120px]">Customer</th>
                      <th className="px-3 py-3 border-r border-white/10 min-w-[120px]">Primary Estimator</th>
                      <th className="px-3 py-3 border-r border-white/10 text-center w-[100px]">Bid Due Date</th>

                      {/* Pink Section Columns (6-19) */}
                      <th className="px-3 py-3 border-r border-white/10 text-center w-[100px]">Bid Due Time</th>
                      <th className="px-3 py-3 border-r border-white/10 min-w-[140px]">Location</th>
                      <th className="px-3 py-3 border-r border-white/10 text-center w-[90px]">Distance</th>
                      <th className="px-3 py-3 border-r border-white/10 text-center w-[80px]">Fab Req</th>
                      <th className="px-3 py-3 border-r border-white/10 text-center w-[80px]">Erect Req</th>
                      <th className="px-3 py-3 border-r border-white/10 text-center w-[90px]">Decision</th>
                      <th className="px-3 py-3 border-r border-white/10 text-center w-[100px]">Sent to JD</th>
                      <th className="px-3 py-3 border-r border-white/10 text-center w-[100px]">Sent Detailing</th>
                      <th className="px-3 py-3 border-r border-white/10 text-center w-[100px]">Sent Erection</th>
                      <th className="px-3 py-3 border-r border-white/10 text-right w-[110px]">Est SqFt/Ton</th>
                      <th className="px-3 py-3 border-r border-white/10 text-center w-[110px]">SFE Job No</th>
                      <th className="px-3 py-3 border-r border-white/10 text-center w-[100px]">Awarded Date</th>
                      <th className="px-3 py-3 border-r border-white/10 text-center w-[100px]">Contract Exec</th>
                      <th className="px-3 py-3 border-r border-white/10 min-w-[200px]">Project Comments</th>

                      {/* Purple/Blue Section Columns (20-48) */}
                      <th className="px-3 py-3 border-r border-white/10 text-right w-[110px]">Price Structure</th>
                      <th className="px-3 py-3 border-r border-white/10 text-right w-[110px]">Price Erect</th>
                      <th className="px-3 py-3 border-r border-white/10 text-right w-[110px]">Price Misc</th>
                      <th className="px-3 py-3 border-r border-white/10 text-right w-[110px]">Price Misc Erect</th>
                      <th className="px-3 py-3 border-r border-white/10 text-right w-[110px]">Bid Amount</th>
                      <th className="px-3 py-3 border-r border-white/10 text-right w-[110px]">Quoted Profit</th>
                      <th className="px-3 py-3 border-r border-white/10 text-right w-[90px]">Ton Steel</th>
                      <th className="px-3 py-3 border-r border-white/10 text-right w-[90px]">Ton Joist</th>
                      <th className="px-3 py-3 border-r border-white/10 text-right w-[90px]">Struct Pieces</th>
                      <th className="px-3 py-3 border-r border-white/10 text-right w-[110px]">SqFt Structural</th>
                      <th className="px-3 py-3 border-r border-white/10 text-right w-[110px]">Struct Fab Hrs</th>
                      <th className="px-3 py-3 border-r border-white/10 text-center w-[120px]">Struct Fab Start</th>
                      <th className="px-3 py-3 border-r border-white/10 text-center w-[80px]">Struct Fab Dur</th>
                      <th className="px-3 py-3 border-r border-white/10 text-right w-[110px]">Misc Fab Hrs</th>
                      <th className="px-3 py-3 border-r border-white/10 text-center w-[120px]">Misc Fab Start</th>
                      <th className="px-3 py-3 border-r border-white/10 text-center w-[80px]">Misc Fab Dur</th>
                      <th className="px-3 py-3 border-r border-white/10 text-right w-[110px]">Struct Erect Hrs</th>
                      <th className="px-3 py-3 border-r border-white/10 text-center w-[120px]">Struct Erect Start</th>
                      <th className="px-3 py-3 border-r border-white/10 text-center w-[80px]">Struct Erect Dur</th>
                      <th className="px-3 py-3 border-r border-white/10 text-right w-[110px]">Misc Erect Hrs</th>
                      <th className="px-3 py-3 border-r border-white/10 text-center w-[120px]">Misc Erect Start</th>
                      <th className="px-3 py-3 border-r border-white/10 text-center w-[80px]">Misc Erect Dur</th>
                      <th className="px-3 py-3 border-r border-white/10 text-right w-[110px]">Estimating Hrs</th>
                      <th className="px-3 py-3 border-r border-white/10 text-center w-[100px]">Quote Date</th>
                      <th className="px-3 py-3 border-r border-white/10 text-center w-[100px]">Won/Lost</th>
                      <th className="px-3 py-3 border-r border-white/10 text-center w-[100px]">Follow Up Date</th>
                      <th className="px-3 py-3 border-r border-white/10 text-right w-[110px]">Awarded Amount</th>
                      <th className="px-3 py-3 border-r border-white/10 text-center w-[100px]">Fab Start Date</th>
                      <th className="px-3 py-3 border-r border-white/10 min-w-[200px]">Follow Up Notes</th>

                      {/* No Fill Section Columns (49-64) */}
                      <th className="px-3 py-3 border-r border-white/10 text-right w-[110px]">Total Tonnage</th>
                      <th className="px-3 py-3 border-r border-white/10 text-right w-[90px]">Pcs/Ton</th>
                      <th className="px-3 py-3 border-r border-white/10 text-right w-[120px]">Ton/SqFt (No Jst)</th>
                      <th className="px-3 py-3 border-r border-white/10 text-right w-[120px]">Ton/SqFt (Jst)</th>
                      <th className="px-3 py-3 border-r border-white/10 text-right w-[110px]">Cost/Ton</th>
                      <th className="px-3 py-3 border-r border-white/10 text-right w-[110px]">Erect Cost/Ton</th>
                      <th className="px-3 py-3 border-r border-white/10 text-right w-[110px]">Cost/SqFt</th>
                      <th className="px-3 py-3 border-r border-white/10 text-right w-[110px]">Erect Cost/SqFt</th>
                      <th className="px-3 py-3 border-r border-white/10 text-center w-[110px]">Struct Fab End</th>
                      <th className="px-3 py-3 border-r border-white/10 text-right w-[120px]">Avg Fab Hrs/Mo</th>
                      <th className="px-3 py-3 border-r border-white/10 text-center w-[110px]">Misc Fab End</th>
                      <th className="px-3 py-3 border-r border-white/10 text-right w-[120px]">Avg Misc Hrs/Mo</th>
                      <th className="px-3 py-3 border-r border-white/10 text-center w-[110px]">Struct Erect End</th>
                      <th className="px-3 py-3 border-r border-white/10 text-right w-[120px]">Avg Erect Hrs/Mo</th>
                      <th className="px-3 py-3 border-r border-white/10 text-center w-[110px]">Misc Erect End</th>
                      <th className="px-3 py-3 border-r border-white/10 text-right w-[120px]">Avg Misc Er Hrs/Mo</th>
                      
                      <th className="px-3 py-3 text-center w-[90px]">Actions</th>
                    </tr>
                  </>
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
                      <td className="px-3 py-3 font-mono font-bold text-slate-900 border-r border-slate-100">{bid.quote_no}</td>
                      <td className="px-3 py-3 font-bold text-slate-800 border-r border-slate-100 break-words leading-tight" title={bid.project_name}>
                        {bid.project_name}
                      </td>
                      <td className="px-3 py-3 text-slate-600 border-r border-slate-100 leading-tight">{bid.customer_name_str || '—'}</td>
                      <td className="px-3 py-3 text-slate-600 border-r border-slate-100 leading-tight">{bid.primary_estimator_name || '—'}</td>
                      <td className="px-3 py-3 text-center text-slate-600 border-r border-slate-100 font-medium">{formatShortDate(bid.bid_due_date)}</td>

                      {showAllColumns ? (
                        <>
                          {/* Pink Section Columns (6-19) */}
                          <td className="px-3 py-3 text-center text-slate-600 border-r border-slate-100">{bid.bid_due_time || '—'}</td>
                          <td className="px-3 py-3 text-slate-600 border-r border-slate-100 break-words leading-tight">{bid.location || '—'}</td>
                          <td className="px-3 py-3 text-center text-slate-600 border-r border-slate-100">{bid.distance || '—'}</td>
                          <td className="px-3 py-3 text-center text-slate-600 border-r border-slate-100">{bid.aisc_fab_req || 'No'}</td>
                          <td className="px-3 py-3 text-center text-slate-600 border-r border-slate-100">{bid.aisc_erect_req || 'No'}</td>
                          <td className="px-3 py-3 text-center text-slate-600 border-r border-slate-100 font-semibold">{bid.decision_to_bid || 'TBD'}</td>
                          <td className="px-3 py-3 text-center text-slate-600 border-r border-slate-100">{formatShortDate(bid.sent_to_jd)}</td>
                          <td className="px-3 py-3 text-center text-slate-600 border-r border-slate-100">{formatShortDate(bid.sent_to_detailing)}</td>
                          <td className="px-3 py-3 text-center text-slate-600 border-r border-slate-100">{formatShortDate(bid.sent_to_erection)}</td>
                          <td className="px-3 py-3 text-right text-slate-600 border-r border-slate-100">{parseFloat(bid.est_sqft_ton || 0).toFixed(4)}</td>
                          <td className="px-3 py-3 text-center text-slate-600 border-r border-slate-100 font-medium">{bid.sfe_job_no || '—'}</td>
                          <td className="px-3 py-3 text-center text-slate-600 border-r border-slate-100">{formatShortDate(bid.awarded_job_no_date)}</td>
                          <td className="px-3 py-3 text-center text-slate-600 border-r border-slate-100">{formatShortDate(bid.contract_executed_date)}</td>
                          <td className="px-3 py-3 text-slate-500 border-r border-slate-100 max-w-[200px] truncate leading-normal" title={bid.project_comments}>
                            {bid.project_comments || '—'}
                          </td>

                          {/* Purple/Blue Section Columns (20-48) */}
                          <td className="px-3 py-3 text-right font-bold text-slate-800 border-r border-slate-100">${parseFloat(bid.price_structure || 0).toLocaleString()}</td>
                          <td className="px-3 py-3 text-right font-bold text-slate-800 border-r border-slate-100">${parseFloat(bid.price_struc_erection || 0).toLocaleString()}</td>
                          <td className="px-3 py-3 text-right text-slate-600 border-r border-slate-100">${parseFloat(bid.price_misc || 0).toLocaleString()}</td>
                          <td className="px-3 py-3 text-right text-slate-600 border-r border-slate-100">${parseFloat(bid.price_misc_erection || 0).toLocaleString()}</td>
                          <td className="px-3 py-3 text-right font-bold text-amber-600 border-r border-slate-100">${parseFloat(bid.bid_amount || 0).toLocaleString()}</td>
                          <td className="px-3 py-3 text-right text-slate-600 border-r border-slate-100">${parseFloat(bid.quoted_profit || 0).toLocaleString()}</td>
                          <td className="px-3 py-3 text-right font-semibold text-slate-700 border-r border-slate-100">{parseFloat(bid.ton_steel || 0).toFixed(2)}</td>
                          <td className="px-3 py-3 text-right text-slate-600 border-r border-slate-100">{parseFloat(bid.ton_joist || 0).toFixed(2)}</td>
                          <td className="px-3 py-3 text-right text-slate-600 border-r border-slate-100">{parseInt(bid.main_structural_pcs || 0)}</td>
                          <td className="px-3 py-3 text-right text-slate-600 border-r border-slate-100">{parseFloat(bid.sqft_structural || 0).toLocaleString()}</td>
                          <td className="px-3 py-3 text-right text-slate-600 border-r border-slate-100">{parseFloat(bid.struct_fab_hours || 0).toFixed(2)}</td>
                          <td className="px-3 py-3 text-center text-slate-700 border-r border-slate-100 font-medium">{bid.struct_fab_start_month || '—'}</td>
                          <td className="px-3 py-3 text-center text-slate-600 border-r border-slate-100">{parseInt(bid.struct_fab_duration || 0)} mo</td>
                          <td className="px-3 py-3 text-right text-slate-600 border-r border-slate-100">{parseFloat(bid.misc_fab_hours || 0).toFixed(2)}</td>
                          <td className="px-3 py-3 text-center text-slate-700 border-r border-slate-100 font-medium">{bid.misc_fab_start_month || '—'}</td>
                          <td className="px-3 py-3 text-center text-slate-600 border-r border-slate-100">{parseInt(bid.misc_fab_duration || 0)} mo</td>
                          <td className="px-3 py-3 text-right text-slate-600 border-r border-slate-100">{parseFloat(bid.struct_erect_hours || 0).toFixed(2)}</td>
                          <td className="px-3 py-3 text-center text-slate-700 border-r border-slate-100 font-medium">{bid.struct_erect_start_month || '—'}</td>
                          <td className="px-3 py-3 text-center text-slate-600 border-r border-slate-100">{parseInt(bid.struct_erect_duration || 0)} mo</td>
                          <td className="px-3 py-3 text-right text-slate-600 border-r border-slate-100">{parseFloat(bid.misc_erect_hours || 0).toFixed(2)}</td>
                          <td className="px-3 py-3 text-center text-slate-700 border-r border-slate-100 font-medium">{bid.misc_erect_start_month || '—'}</td>
                          <td className="px-3 py-3 text-center text-slate-600 border-r border-slate-100">{parseInt(bid.misc_erect_duration || 0)} mo</td>
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
                          <td className="px-3 py-3 text-center text-slate-600 border-r border-slate-100">{formatShortDate(bid.estimator_followup_date)}</td>
                          <td className="px-3 py-3 text-right font-bold text-slate-800 border-r border-slate-100">${parseFloat(bid.awarded_amount || 0).toLocaleString()}</td>
                          <td className="px-3 py-3 text-center text-slate-600 border-r border-slate-100">{formatShortDate(bid.fab_start_date)}</td>
                          <td className="px-3 py-3 text-slate-500 border-r border-slate-100 max-w-[200px] truncate leading-normal" title={bid.estimator_followup_notes}>
                            {bid.estimator_followup_notes || '—'}
                          </td>

                          {/* No Fill Section Columns (49-64) */}
                          <td className="px-3 py-3 text-right font-extrabold text-amber-600 border-r border-slate-100">{parseFloat(bid.total_tonnage || 0).toFixed(2)} Tons</td>
                          <td className="px-3 py-3 text-right text-slate-600 border-r border-slate-100">{parseFloat(bid.struct_pcs_per_ton || 0).toFixed(4)}</td>
                          <td className="px-3 py-3 text-right text-slate-600 border-r border-slate-100">{parseFloat(bid.struct_ton_per_sqft_no_joist || 0).toFixed(6)}</td>
                          <td className="px-3 py-3 text-right text-slate-600 border-r border-slate-100">{parseFloat(bid.struct_ton_per_sqft_with_joist || 0).toFixed(6)}</td>
                          <td className="px-3 py-3 text-right text-slate-600 border-r border-slate-100">${parseFloat(bid.struct_cost_per_ton || 0).toFixed(2)}</td>
                          <td className="px-3 py-3 text-right text-slate-600 border-r border-slate-100">${parseFloat(bid.struct_erect_cost_per_ton || 0).toFixed(2)}</td>
                          <td className="px-3 py-3 text-right text-slate-600 border-r border-slate-100">${parseFloat(bid.struct_cost_per_sqft || 0).toFixed(2)}</td>
                          <td className="px-3 py-3 text-right text-slate-600 border-r border-slate-100">${parseFloat(bid.struct_erect_cost_per_sqft || 0).toFixed(2)}</td>
                          <td className="px-3 py-3 text-center text-slate-700 border-r border-slate-100">{bid.struct_fab_end_month || '—'}</td>
                          <td className="px-3 py-3 text-right text-slate-600 border-r border-slate-100">{parseFloat(bid.avg_monthly_struct_fab_hours || 0).toFixed(2)} hr</td>
                          <td className="px-3 py-3 text-center text-slate-700 border-r border-slate-100">{bid.misc_fab_end_month || '—'}</td>
                          <td className="px-3 py-3 text-right text-slate-600 border-r border-slate-100">{parseFloat(bid.avg_monthly_misc_fab_hours || 0).toFixed(2)} hr</td>
                          <td className="px-3 py-3 text-center text-slate-700 border-r border-slate-100">{bid.struct_erect_end_month || '—'}</td>
                          <td className="px-3 py-3 text-right text-slate-600 border-r border-slate-100">{parseFloat(bid.avg_monthly_struct_erect_hours || 0).toFixed(2)} hr</td>
                          <td className="px-3 py-3 text-center text-slate-700 border-r border-slate-100">{bid.misc_erect_end_month || '—'}</td>
                          <td className="px-3 py-3 text-right text-slate-600 border-r border-slate-100">{parseFloat(bid.avg_monthly_misc_erect_hours || 0).toFixed(2)} hr</td>
                        </>
                      ) : (
                        <>
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
                            title="Edit"
                          >
                            <FileSpreadsheet className="w-4 h-4" />
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
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">64 Fields Enterprise Worksheet</p>
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
                onClick={() => setActiveFormTab('bidding')}
                className={`flex-1 text-center py-3 text-xs font-bold transition-all rounded-xl flex items-center justify-center gap-2 border ${
                  activeFormTab === 'bidding'
                    ? 'bg-pink-100/50 border-pink-200/50 text-pink-700 shadow-sm'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <div className="w-2 h-2 rounded-full bg-pink-400"></div>
                1. Bidding & Enquiry Details (Pink Section)
              </button>
              <button
                type="button"
                onClick={() => setActiveFormTab('estimation')}
                className={`flex-1 text-center py-3 text-xs font-bold transition-all rounded-xl flex items-center justify-center gap-2 border ${
                  activeFormTab === 'estimation'
                    ? 'bg-violet-100/50 border-violet-200/50 text-violet-700 shadow-sm'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <div className="w-2 h-2 rounded-full bg-violet-400"></div>
                2. Estimation & Pricing Details (Purple/Blue)
              </button>
            </div>

            {/* Modal Body: Form */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-6">
              
              {/* TAB 1: Bidding details */}
              {activeFormTab === 'bidding' && (
                <div className="space-y-6 animate-fade-in">
                  <div className="bg-pink-50/20 border border-pink-100 p-5 rounded-2xl">
                    <h4 className="text-xs font-bold text-pink-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-pink-500" /> Bidding Details (Pink Section)
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                      
                      {/* Quote No */}
                      <div>
                        <label className="text-[11px] font-bold text-slate-500 block mb-1.5 uppercase tracking-wider ml-1">Quote No <span className="text-rose-500">*</span></label>
                        <input
                          type="text"
                          name="quote_no"
                          value={formData.quote_no}
                          onChange={handleInputChange}
                          placeholder="e.g. Q-9821"
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-pink-400 focus:ring-4 focus:ring-pink-500/5 transition-all text-slate-800"
                          required
                        />
                      </div>

                      {/* Project Name */}
                      <div>
                        <label className="text-[11px] font-bold text-slate-500 block mb-1.5 uppercase tracking-wider ml-1">Project Name <span className="text-rose-500">*</span></label>
                        <input
                          type="text"
                          name="project_name"
                          value={formData.project_name}
                          onChange={handleInputChange}
                          placeholder="e.g. Skyline Industrial Hub"
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-pink-400 focus:ring-4 focus:ring-pink-500/5 transition-all text-slate-800"
                          required
                        />
                      </div>

                      {/* Customer Dropdown */}
                      <div>
                        <label className="text-[11px] font-bold text-slate-500 block mb-1.5 uppercase tracking-wider ml-1">Customer Name</label>
                        <select
                          name="customer_name"
                          value={formData.customer_name}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-pink-400 focus:ring-4 focus:ring-pink-500/5 transition-all text-slate-600 appearance-none cursor-pointer font-semibold"
                        >
                          <option value="">Select Customer</option>
                          {customers.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </div>

                      {/* Estimator Dropdown */}
                      <div>
                        <label className="text-[11px] font-bold text-slate-500 block mb-1.5 uppercase tracking-wider ml-1">Primary Estimator</label>
                        <select
                          name="primary_estimator"
                          value={formData.primary_estimator}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-pink-400 focus:ring-4 focus:ring-pink-500/5 transition-all text-slate-600 appearance-none cursor-pointer font-semibold"
                        >
                          <option value="">Select Estimator</option>
                          {estimators.map(e => (
                            <option key={e.id} value={e.id}>{e.name}</option>
                          ))}
                        </select>
                      </div>

                      {/* Due date */}
                      <div>
                        <label className="text-[11px] font-bold text-slate-500 block mb-1.5 uppercase tracking-wider ml-1">Bid Due Date</label>
                        <input
                          type="date"
                          name="bid_due_date"
                          value={formData.bid_due_date || ''}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-pink-400 focus:ring-4 focus:ring-pink-500/5 transition-all text-slate-800"
                        />
                      </div>

                      {/* Due Time */}
                      <div>
                        <label className="text-[11px] font-bold text-slate-500 block mb-1.5 uppercase tracking-wider ml-1">Bid Due Time</label>
                        <input
                          type="time"
                          name="bid_due_time"
                          value={formData.bid_due_time || ''}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-pink-400 focus:ring-4 focus:ring-pink-500/5 transition-all text-slate-800"
                        />
                      </div>

                      {/* Location */}
                      <div>
                        <label className="text-[11px] font-bold text-slate-500 block mb-1.5 uppercase tracking-wider ml-1">Location</label>
                        <input
                          type="text"
                          name="location"
                          value={formData.location}
                          onChange={handleInputChange}
                          placeholder="e.g. Houston, TX"
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-pink-400 focus:ring-4 focus:ring-pink-500/5 transition-all text-slate-800"
                        />
                      </div>

                      {/* Distance */}
                      <div>
                        <label className="text-[11px] font-bold text-slate-500 block mb-1.5 uppercase tracking-wider ml-1">Distance (Earlier Travelled)</label>
                        <input
                          type="text"
                          name="distance"
                          value={formData.distance}
                          onChange={handleInputChange}
                          placeholder="e.g. 45 miles"
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-pink-400 focus:ring-4 focus:ring-pink-500/5 transition-all text-slate-800"
                        />
                      </div>

                      {/* AISC Fab Required */}
                      <div>
                        <label className="text-[11px] font-bold text-slate-500 block mb-1.5 uppercase tracking-wider ml-1">AISC Fab Required</label>
                        <select
                          name="aisc_fab_req"
                          value={formData.aisc_fab_req}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-pink-400 focus:ring-4 focus:ring-pink-500/5 transition-all text-slate-600 appearance-none cursor-pointer font-semibold"
                        >
                          <option value="No">No</option>
                          <option value="Yes">Yes</option>
                        </select>
                      </div>

                      {/* AISC Erect Required */}
                      <div>
                        <label className="text-[11px] font-bold text-slate-500 block mb-1.5 uppercase tracking-wider ml-1">AISC Erect Required</label>
                        <select
                          name="aisc_erect_req"
                          value={formData.aisc_erect_req}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-pink-400 focus:ring-4 focus:ring-pink-500/5 transition-all text-slate-600 appearance-none cursor-pointer font-semibold"
                        >
                          <option value="No">No</option>
                          <option value="Yes">Yes</option>
                        </select>
                      </div>

                      {/* Decision to Bid */}
                      <div>
                        <label className="text-[11px] font-bold text-slate-500 block mb-1.5 uppercase tracking-wider ml-1">Decision to Bid</label>
                        <select
                          name="decision_to_bid"
                          value={formData.decision_to_bid}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-pink-400 focus:ring-4 focus:ring-pink-500/5 transition-all text-slate-600 appearance-none cursor-pointer font-semibold"
                        >
                          <option value="TBD">TBD</option>
                          <option value="Yes">Yes (Bid)</option>
                          <option value="No">No (Declined)</option>
                        </select>
                      </div>

                      {/* Est Sqft/Ton */}
                      <div>
                        <label className="text-[11px] font-bold text-slate-500 block mb-1.5 uppercase tracking-wider ml-1">Est Sq-Feet/Ton</label>
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

                  {/* Pink Section — SFE Job Tracking & Workflow Dates */}
                  <div className="bg-pink-50/20 border border-pink-100 p-5 rounded-2xl">
                    <h4 className="text-xs font-bold text-pink-600 uppercase tracking-widest mb-4">SFE Job Tracking & Workflow Dates</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                      <div>
                        <label className="text-[11px] font-bold text-slate-500 block mb-1.5 uppercase tracking-wider ml-1">Sent to J&D</label>
                        <input
                          type="date"
                          name="sent_to_jd"
                          value={formData.sent_to_jd || ''}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-pink-400 focus:ring-4 focus:ring-pink-500/5 transition-all text-slate-800"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-500 block mb-1.5 uppercase tracking-wider ml-1">Sent to Detailing</label>
                        <input
                          type="date"
                          name="sent_to_detailing"
                          value={formData.sent_to_detailing || ''}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-pink-400 focus:ring-4 focus:ring-pink-500/5 transition-all text-slate-800"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-500 block mb-1.5 uppercase tracking-wider ml-1">Sent to Erection</label>
                        <input
                          type="date"
                          name="sent_to_erection"
                          value={formData.sent_to_erection || ''}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-pink-400 focus:ring-4 focus:ring-pink-500/5 transition-all text-slate-800"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-500 block mb-1.5 uppercase tracking-wider ml-1">SFE Job #</label>
                        <input
                          type="text"
                          name="sfe_job_no"
                          value={formData.sfe_job_no}
                          onChange={handleInputChange}
                          placeholder="e.g. J-2026A"
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-pink-400 focus:ring-4 focus:ring-pink-500/5 transition-all text-slate-800"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-500 block mb-1.5 uppercase tracking-wider ml-1">Awarded Job # Date</label>
                        <input
                          type="date"
                          name="awarded_job_no_date"
                          value={formData.awarded_job_no_date || ''}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-pink-400 focus:ring-4 focus:ring-pink-500/5 transition-all text-slate-800"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-500 block mb-1.5 uppercase tracking-wider ml-1">Contract Executed Date</label>
                        <input
                          type="date"
                          name="contract_executed_date"
                          value={formData.contract_executed_date || ''}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-pink-400 focus:ring-4 focus:ring-pink-500/5 transition-all text-slate-800"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-500 block mb-1.5 uppercase tracking-wider ml-1">Project Comments (MB)</label>
                    <textarea
                      name="project_comments"
                      value={formData.project_comments}
                      onChange={handleInputChange}
                      placeholder="Enter other general comments regarding the quote request..."
                      rows="3"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-pink-400 focus:ring-4 focus:ring-pink-500/5 transition-all text-slate-800 resize-none"
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setActiveFormTab('estimation')}
                      className="px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 text-xs font-bold hover:bg-slate-50 flex items-center gap-1 transition-all"
                    >
                      Next: Estimation & Pricing
                      <ChevronRight className="w-4 h-4 text-violet-500" />
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 2: Estimation details */}
              {activeFormTab === 'estimation' && (
                <div className="space-y-6 animate-fade-in">
                  
                  {/* Estimator Inputs */}
                  <div className="bg-violet-50/20 border border-violet-100 p-5 rounded-2xl space-y-5">
                    <h4 className="text-xs font-bold text-violet-600 uppercase tracking-widest flex items-center gap-2">
                      <Calculator className="w-4 h-4 text-violet-500" /> Quantities & Hours (Estimator Input)
                    </h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                      <div>
                        <label className="text-[11px] font-bold text-slate-500 block mb-1.5 uppercase tracking-wider ml-1">Ton Steel</label>
                        <input
                          type="number"
                          step="0.01"
                          name="ton_steel"
                          value={formData.ton_steel}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-500/5 transition-all text-slate-800"
                        />
                      </div>
                      
                      <div>
                        <label className="text-[11px] font-bold text-slate-500 block mb-1.5 uppercase tracking-wider ml-1">Ton Joist</label>
                        <input
                          type="number"
                          step="0.01"
                          name="ton_joist"
                          value={formData.ton_joist}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-500/5 transition-all text-slate-800"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-500 block mb-1.5 uppercase tracking-wider ml-1"># of Main Pcs.</label>
                        <input
                          type="number"
                          name="main_structural_pcs"
                          value={formData.main_structural_pcs}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-500/5 transition-all text-slate-800"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-500 block mb-1.5 uppercase tracking-wider ml-1">Sq. Ft. Structural</label>
                        <input
                          type="number"
                          step="0.01"
                          name="sqft_structural"
                          value={formData.sqft_structural}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-500/5 transition-all text-slate-800"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                      <div>
                        <label className="text-[11px] font-bold text-slate-500 block mb-1.5 uppercase tracking-wider ml-1">Price Structure</label>
                        <input
                          type="number"
                          step="0.01"
                          name="price_structure"
                          value={formData.price_structure}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-500/5 transition-all text-slate-800 font-bold"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-500 block mb-1.5 uppercase tracking-wider ml-1">Price Struc-Erect</label>
                        <input
                          type="number"
                          step="0.01"
                          name="price_struc_erection"
                          value={formData.price_struc_erection}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-500/5 transition-all text-slate-800"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-500 block mb-1.5 uppercase tracking-wider ml-1">Price Misc</label>
                        <input
                          type="number"
                          step="0.01"
                          name="price_misc"
                          value={formData.price_misc}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-500/5 transition-all text-slate-800"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-500 block mb-1.5 uppercase tracking-wider ml-1">Price Misc-Erect</label>
                        <input
                          type="number"
                          step="0.01"
                          name="price_misc_erection"
                          value={formData.price_misc_erection}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-500/5 transition-all text-slate-800"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                      <div>
                        <label className="text-[11px] font-bold text-slate-500 block mb-1.5 uppercase tracking-wider ml-1">Bid Amount</label>
                        <input
                          type="number"
                          step="0.01"
                          name="bid_amount"
                          value={formData.bid_amount}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-500/5 transition-all text-slate-800 font-bold text-amber-600 animate-pulse-subtle"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-500 block mb-1.5 uppercase tracking-wider ml-1">Quoted Profit</label>
                        <input
                          type="number"
                          step="0.01"
                          name="quoted_profit"
                          value={formData.quoted_profit}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-500/5 transition-all text-slate-800"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-500 block mb-1.5 uppercase tracking-wider ml-1">Estimating Hours</label>
                        <input
                          type="number"
                          step="0.01"
                          name="estimating_hours"
                          value={formData.estimating_hours}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-500/5 transition-all text-slate-800"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-500 block mb-1.5 uppercase tracking-wider ml-1">Quote Date</label>
                        <input
                          type="date"
                          name="quote_date"
                          value={formData.quote_date || ''}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-500/5 transition-all text-slate-800"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Timeline Estimates */}
                  <div className="bg-violet-50/20 border border-violet-100 p-5 rounded-2xl space-y-4">
                    <h4 className="text-xs font-bold text-violet-600 uppercase tracking-widest">Workflow Timelines & Hours</h4>
                    
                    {/* Fabrication Hours */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                      <div>
                        <label className="text-[11px] font-bold text-slate-500 block mb-1.5 uppercase tracking-wider ml-1">Structural Fab Hours</label>
                        <input
                          type="number"
                          step="0.1"
                          name="struct_fab_hours"
                          value={formData.struct_fab_hours}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-500/5 transition-all text-slate-800"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-500 block mb-1.5 uppercase tracking-wider ml-1">Fab Start Month</label>
                        <input
                          type="text"
                          name="struct_fab_start_month"
                          placeholder="e.g. May 2026"
                          value={formData.struct_fab_start_month || ''}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-500/5 transition-all text-slate-800"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-500 block mb-1.5 uppercase tracking-wider ml-1">Fab Duration (Months)</label>
                        <input
                          type="number"
                          name="struct_fab_duration"
                          value={formData.struct_fab_duration}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-500/5 transition-all text-slate-800"
                        />
                      </div>
                    </div>

                    {/* Misc Hours */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                      <div>
                        <label className="text-[11px] font-bold text-slate-500 block mb-1.5 uppercase tracking-wider ml-1">Misc Fab Hours</label>
                        <input
                          type="number"
                          step="0.1"
                          name="misc_fab_hours"
                          value={formData.misc_fab_hours}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-500/5 transition-all text-slate-800"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-500 block mb-1.5 uppercase tracking-wider ml-1">Misc Start Month</label>
                        <input
                          type="text"
                          name="misc_fab_start_month"
                          placeholder="e.g. June 2026"
                          value={formData.misc_fab_start_month || ''}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-500/5 transition-all text-slate-800"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-500 block mb-1.5 uppercase tracking-wider ml-1">Misc Duration (Months)</label>
                        <input
                          type="number"
                          name="misc_fab_duration"
                          value={formData.misc_fab_duration}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-500/5 transition-all text-slate-800"
                        />
                      </div>
                    </div>

                    {/* Structural Erection */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                      <div>
                        <label className="text-[11px] font-bold text-slate-500 block mb-1.5 uppercase tracking-wider ml-1">Structural Erection Hours</label>
                        <input
                          type="number"
                          step="0.1"
                          name="struct_erect_hours"
                          value={formData.struct_erect_hours}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-500/5 transition-all text-slate-800"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-500 block mb-1.5 uppercase tracking-wider ml-1">Erect Start Month</label>
                        <input
                          type="text"
                          name="struct_erect_start_month"
                          placeholder="e.g. August 2026"
                          value={formData.struct_erect_start_month || ''}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-500/5 transition-all text-slate-800"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-500 block mb-1.5 uppercase tracking-wider ml-1">Erect Duration (Months)</label>
                        <input
                          type="number"
                          name="struct_erect_duration"
                          value={formData.struct_erect_duration}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-500/5 transition-all text-slate-800"
                        />
                      </div>
                    </div>

                    {/* Misc Erection */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                      <div>
                        <label className="text-[11px] font-bold text-slate-500 block mb-1.5 uppercase tracking-wider ml-1">Misc Erection Hours</label>
                        <input
                          type="number"
                          step="0.1"
                          name="misc_erect_hours"
                          value={formData.misc_erect_hours}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-500/5 transition-all text-slate-800"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-500 block mb-1.5 uppercase tracking-wider ml-1">Misc Erect Start Month</label>
                        <input
                          type="text"
                          name="misc_erect_start_month"
                          placeholder="e.g. September 2026"
                          value={formData.misc_erect_start_month || ''}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-500/5 transition-all text-slate-800"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-500 block mb-1.5 uppercase tracking-wider ml-1">Misc Erect Duration</label>
                        <input
                          type="number"
                          name="misc_erect_duration"
                          value={formData.misc_erect_duration}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-500/5 transition-all text-slate-800"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Auto-Calculated Readouts (No Fill) */}
                  <div className="bg-cyan-50/20 border border-cyan-100 p-6 rounded-3xl space-y-4">
                    <h4 className="text-xs font-bold text-cyan-600 uppercase tracking-widest flex items-center gap-2 select-none">
                      <Calculator className="w-4 h-4 text-cyan-500" />
                      Calculated Estimations (No Fill Columns)
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-bold">
                      
                      <div className="bg-white border border-cyan-100 p-3 rounded-xl shadow-sm flex flex-col justify-between min-h-[60px]">
                        <span className="text-[9px] uppercase tracking-wider text-slate-400 block mb-1">Total Tonnage</span>
                        <span className="text-sm text-cyan-700 font-extrabold flex items-center justify-between">
                          <span>{calculatedReadouts.total_tonnage} Tons</span>
                          <Lock className="w-3.5 h-3.5 text-cyan-300" />
                        </span>
                      </div>

                      <div className="bg-white border border-cyan-100 p-3 rounded-xl shadow-sm flex flex-col justify-between min-h-[60px]">
                        <span className="text-[9px] uppercase tracking-wider text-slate-400 block mb-1">Pcs / Ton</span>
                        <span className="text-sm text-cyan-700 font-extrabold flex items-center justify-between">
                          <span>{calculatedReadouts.struct_pcs_per_ton}</span>
                          <Lock className="w-3.5 h-3.5 text-cyan-300" />
                        </span>
                      </div>

                      <div className="bg-white border border-cyan-100 p-3 rounded-xl shadow-sm flex flex-col justify-between min-h-[60px]">
                        <span className="text-[9px] uppercase tracking-wider text-slate-400 block mb-1">Ton / SqFt (No Jst)</span>
                        <span className="text-sm text-cyan-700 font-extrabold flex items-center justify-between">
                          <span>{calculatedReadouts.struct_ton_per_sqft_no_joist}</span>
                          <Lock className="w-3.5 h-3.5 text-cyan-300" />
                        </span>
                      </div>

                      <div className="bg-white border border-cyan-100 p-3 rounded-xl shadow-sm flex flex-col justify-between min-h-[60px]">
                        <span className="text-[9px] uppercase tracking-wider text-slate-400 block mb-1">Cost / Ton</span>
                        <span className="text-sm text-cyan-700 font-extrabold flex items-center justify-between">
                          <span>${calculatedReadouts.struct_cost_per_ton}</span>
                          <Lock className="w-3.5 h-3.5 text-cyan-300" />
                        </span>
                      </div>

                      <div className="bg-white border border-cyan-100 p-3 rounded-xl shadow-sm flex flex-col justify-between min-h-[60px]">
                        <span className="text-[9px] uppercase tracking-wider text-slate-400 block mb-1">Cost / SqFt</span>
                        <span className="text-sm text-cyan-700 font-extrabold flex items-center justify-between">
                          <span>${calculatedReadouts.struct_cost_per_sqft}</span>
                          <Lock className="w-3.5 h-3.5 text-cyan-300" />
                        </span>
                      </div>

                      <div className="bg-white border border-cyan-100 p-3 rounded-xl shadow-sm flex flex-col justify-between min-h-[60px]">
                        <span className="text-[9px] uppercase tracking-wider text-slate-400 block mb-1">Erect Cost / Ton</span>
                        <span className="text-sm text-cyan-700 font-extrabold flex items-center justify-between">
                          <span>${calculatedReadouts.struct_erect_cost_per_ton}</span>
                          <Lock className="w-3.5 h-3.5 text-cyan-300" />
                        </span>
                      </div>

                      <div className="bg-white border border-cyan-100 p-3 rounded-xl shadow-sm flex flex-col justify-between min-h-[60px]">
                        <span className="text-[9px] uppercase tracking-wider text-slate-400 block mb-1">Avg Fab Hrs/Month</span>
                        <span className="text-sm text-cyan-700 font-extrabold flex items-center justify-between">
                          <span>{calculatedReadouts.avg_monthly_struct_fab_hours} hr</span>
                          <Lock className="w-3.5 h-3.5 text-cyan-300" />
                        </span>
                      </div>

                      <div className="bg-white border border-cyan-100 p-3 rounded-xl shadow-sm flex flex-col justify-between min-h-[60px]">
                        <span className="text-[9px] uppercase tracking-wider text-slate-400 block mb-1">Avg Erect Hrs/Month</span>
                        <span className="text-sm text-cyan-700 font-extrabold flex items-center justify-between">
                          <span>{calculatedReadouts.avg_monthly_struct_erect_hours} hr</span>
                          <Lock className="w-3.5 h-3.5 text-cyan-300" />
                        </span>
                      </div>

                      <div className="bg-white border border-cyan-100 p-3 rounded-xl shadow-sm flex flex-col justify-between min-h-[60px]">
                        <span className="text-[9px] uppercase tracking-wider text-slate-400 block mb-1">Fab End Month</span>
                        <span className="text-xs text-slate-800 font-extrabold flex items-center justify-between">
                          <span>{calculatedReadouts.struct_fab_end_month || '—'}</span>
                          <Lock className="w-3.5 h-3.5 text-cyan-300" />
                        </span>
                      </div>

                      <div className="bg-white border border-cyan-100 p-3 rounded-xl shadow-sm flex flex-col justify-between min-h-[60px]">
                        <span className="text-[9px] uppercase tracking-wider text-slate-400 block mb-1">Misc End Month</span>
                        <span className="text-xs text-slate-800 font-extrabold flex items-center justify-between">
                          <span>{calculatedReadouts.misc_fab_end_month || '—'}</span>
                          <Lock className="w-3.5 h-3.5 text-cyan-300" />
                        </span>
                      </div>

                      <div className="bg-white border border-cyan-100 p-3 rounded-xl shadow-sm flex flex-col justify-between min-h-[60px]">
                        <span className="text-[9px] uppercase tracking-wider text-slate-400 block mb-1">Erect End Month</span>
                        <span className="text-xs text-slate-800 font-extrabold flex items-center justify-between">
                          <span>{calculatedReadouts.struct_erect_end_month || '—'}</span>
                          <Lock className="w-3.5 h-3.5 text-cyan-300" />
                        </span>
                      </div>

                      <div className="bg-white border border-cyan-100 p-3 rounded-xl shadow-sm flex flex-col justify-between min-h-[60px]">
                        <span className="text-[9px] uppercase tracking-wider text-slate-400 block mb-1">Misc Erect End Month</span>
                        <span className="text-xs text-slate-800 font-extrabold flex items-center justify-between">
                          <span>{calculatedReadouts.misc_erect_end_month || '—'}</span>
                          <Lock className="w-3.5 h-3.5 text-cyan-300" />
                        </span>
                      </div>

                    </div>
                  </div>

                  {/* Award Status & Follow Up */}
                  <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl space-y-4">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-widest">Award Status & Estimator Follow-up</h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                      <div>
                        <label className="text-[11px] font-bold text-slate-500 block mb-1.5 uppercase tracking-wider ml-1">Won / Lost (Status)</label>
                        <select
                          name="won_lost"
                          value={formData.won_lost}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-500/5 transition-all text-slate-600 appearance-none cursor-pointer font-semibold"
                        >
                          <option value="Pending">Pending</option>
                          <option value="Won">Won</option>
                          <option value="Lost">Lost</option>
                          <option value="Cancelled">Cancelled</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-500 block mb-1.5 uppercase tracking-wider ml-1">Awarded Amount</label>
                        <input
                          type="number"
                          step="0.01"
                          name="awarded_amount"
                          value={formData.awarded_amount}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-500/5 transition-all text-slate-800"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-500 block mb-1.5 uppercase tracking-wider ml-1">Fabrication Start Date (JF)</label>
                        <input
                          type="date"
                          name="fab_start_date"
                          value={formData.fab_start_date || ''}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-500/5 transition-all text-slate-800"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-500 block mb-1.5 uppercase tracking-wider ml-1">Follow Up Date</label>
                        <input
                          type="date"
                          name="estimator_followup_date"
                          value={formData.estimator_followup_date || ''}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-500/5 transition-all text-slate-800"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-500 block mb-1.5 uppercase tracking-wider ml-1">Estimator Follow Up Notes</label>
                      <textarea
                        name="estimator_followup_notes"
                        value={formData.estimator_followup_notes}
                        onChange={handleInputChange}
                        placeholder="Add scheduling or follow up notes..."
                        rows="3"
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-500/5 transition-all text-slate-800 resize-none"
                      />
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-2">
                    <button
                      type="button"
                      onClick={() => setActiveFormTab('bidding')}
                      className="px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 text-xs font-bold hover:bg-slate-50 transition-all"
                    >
                      Back to Pink Section
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
