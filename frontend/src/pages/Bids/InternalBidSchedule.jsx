import { useState, useEffect, useRef } from 'react';
import {
  Search, Loader2, ChevronRight, ChevronLeft, ChevronDown,
  AlertTriangle, CheckCircle2, Calendar, Clock, Columns,
  FileSpreadsheet, AlertCircle, X, Inbox
} from 'lucide-react';
import { bidEnquiryAPI, customerAPI, employeeAPI } from '../../services/api';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const HOLIDAYS = {
  '01-01': "New Year's Day (UK, US, CAN)",
  '07-04': "Independence Day",
  '12-25': "Christmas Day",
  '12-26': "Boxing Day",
};

function getHoliday(date) {
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const mmdd = `${m}-${d}`;
  if (HOLIDAYS[mmdd]) return HOLIDAYS[mmdd];

  const y = date.getFullYear();
  const dateStr = `${y}-${m}-${d}`;
  
  if (y === 2026) {
    if (dateStr === '2026-05-25') return 'Memorial Day';
    if (dateStr === '2026-09-07') return 'Labor Day';
    if (dateStr === '2026-11-26') return 'Thanksgiving Day';
  } else if (y === 2025) {
    if (dateStr === '2025-05-26') return 'Memorial Day';
    if (dateStr === '2025-09-01') return 'Labor Day';
    if (dateStr === '2025-11-27') return 'Thanksgiving Day';
  } else if (y === 2027) {
    if (dateStr === '2027-05-31') return 'Memorial Day';
    if (dateStr === '2027-09-06') return 'Labor Day';
    if (dateStr === '2027-11-25') return 'Thanksgiving Day';
  }
  return null;
}

function getBidStatus(bid) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (bid.won_lost === 'Won') return 'won';
  if (bid.won_lost === 'Lost') return 'lost';
  if (bid.won_lost === 'Cancelled') return 'cancelled';

  if (!bid.bid_due_date) return 'pending';

  const dueDate = new Date(bid.bid_due_date);
  dueDate.setHours(0, 0, 0, 0);

  if (dueDate < today) return 'overdue';
  if (dueDate.getTime() === today.getTime()) return 'due-today';
  return 'upcoming';
}

function getBidCategory(bid) {
  if (bid.decision_to_bid === 'Yes') return 'sfe-bid';
  if (bid.decision_to_bid === 'TBD') return 'sfe-pre-bid';
  return 'other';
}

function formatDate(dateStr) {
  if (!dateStr) return null;
  const parts = dateStr.split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return dateStr;
}

function formatDateYYYYMMDD(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDateDDMMYYYY(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${d}/${m}/${y}`;
}

function getCalendarWeeks(year, month) {
  const firstDay = new Date(year, month, 1);
  const firstDayOfWeek = firstDay.getDay();

  const lastDay = new Date(year, month + 1, 0);
  const totalDays = lastDay.getDate();

  const prevLastDay = new Date(year, month, 0).getDate();

  const days = [];

  // Trailing days from previous month
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const d = prevLastDay - i;
    const prevMonthDate = new Date(year, month - 1, d);
    days.push({
      date: prevMonthDate,
      dayNumber: d,
      isCurrentMonth: false,
      formattedDate: formatDateYYYYMMDD(prevMonthDate),
      displayDate: formatDateDDMMYYYY(prevMonthDate)
    });
  }

  // Days of current month
  for (let d = 1; d <= totalDays; d++) {
    const currentMonthDate = new Date(year, month, d);
    days.push({
      date: currentMonthDate,
      dayNumber: d,
      isCurrentMonth: true,
      formattedDate: formatDateYYYYMMDD(currentMonthDate),
      displayDate: formatDateDDMMYYYY(currentMonthDate)
    });
  }

  // Leading days of next month
  const remaining = 7 - (days.length % 7);
  if (remaining < 7) {
    for (let d = 1; d <= remaining; d++) {
      const nextMonthDate = new Date(year, month + 1, d);
      days.push({
        date: nextMonthDate,
        dayNumber: d,
        isCurrentMonth: false,
        formattedDate: formatDateYYYYMMDD(nextMonthDate),
        displayDate: formatDateDDMMYYYY(nextMonthDate)
      });
    }
  }

  const weeks = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }
  return weeks;
}

const CATEGORY_CONFIG = {
  'sfe-bid': {
    bg: 'bg-[#c6dafc]',
    border: 'border-[#b8d2f8]',
    text: 'text-[#1e3a8a]',
  },
  'sfe-pre-bid': {
    bg: 'bg-[#f8c8c4]',
    border: 'border-[#fbc5c0]',
    text: 'text-[#7f1d1d]',
  },
  'other': {
    bg: 'bg-[#fef1c9]',
    border: 'border-[#fdeab2]',
    text: 'text-[#78350f]',
  }
};

const STATUS_CONFIG = {
  overdue:    { label: 'Overdue',    badge: 'bg-rose-500 text-white',         dot: 'bg-rose-500' },
  'due-today':{ label: 'Due Today',  badge: 'bg-orange-500 text-white',       dot: 'bg-orange-400' },
  upcoming:   { label: 'Upcoming',   badge: 'bg-blue-500 text-white',         dot: 'bg-blue-400' },
  won:        { label: 'Won',        badge: 'bg-emerald-500 text-white',      dot: 'bg-emerald-500' },
  lost:       { label: 'Lost',       badge: 'bg-slate-500 text-white',        dot: 'bg-slate-400' },
  cancelled:  { label: 'Cancelled',  badge: 'bg-slate-400 text-white',        dot: 'bg-slate-300' },
  pending:    { label: 'No Date',    badge: 'bg-amber-400 text-white',        dot: 'bg-amber-400' },
};

export default function InternalBidSchedule() {
  const [bids, setBids] = useState([]);
  const [estimators, setEstimators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Search & Filters
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filterEstimator, setFilterEstimator] = useState('');
  const [filterDecision, setFilterDecision] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const filterRef = useRef(null);

  // Month navigation
  const today = new Date();
  const [startOffset, setStartOffset] = useState(0); // months from current

  // Bid Details Modal state
  const [selectedBid, setSelectedBid] = useState(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (filterRef.current && !filterRef.current.contains(e.target)) {
        setShowFilters(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filterEstimator) params.primary_estimator = filterEstimator;
      if (filterDecision) params.decision_to_bid = filterDecision;

      const [bidsRes, empRes] = await Promise.all([
        bidEnquiryAPI.getAll(params),
        employeeAPI.getAll(),
      ]);
      setBids(bidsRes.data.results || bidsRes.data);
      setEstimators(empRes.data.results || empRes.data);
    } catch (err) {
      console.error(err);
      setError('Failed to load bid schedule data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, [filterEstimator, filterDecision]);

  const targetDate = new Date(today.getFullYear(), today.getMonth() + startOffset, 1);
  const visibleMonth = { year: targetDate.getFullYear(), month: targetDate.getMonth() };

  // Filter & search bids
  const filteredBids = bids.filter(bid => {
    const term = search.toLowerCase();
    const matchSearch = !term || (
      bid.quote_no?.toLowerCase().includes(term) ||
      bid.project_name?.toLowerCase().includes(term) ||
      bid.customer_name_str?.toLowerCase().includes(term) ||
      bid.primary_estimator_name?.toLowerCase().includes(term)
    );
    const matchStatus = !filterStatus || getBidStatus(bid) === filterStatus;
    return matchSearch && matchStatus;
  });

  // Match day bids
  const getDayBids = (dateStr) => {
    return filteredBids.filter(bid => bid.bid_due_date === dateStr);
  };

  // Unscheduled bids (no due date)
  const unscheduledBids = filteredBids.filter(bid => !bid.bid_due_date);

  // Grouped weeks
  const weeks = getCalendarWeeks(visibleMonth.year, visibleMonth.month);

  // Stats
  const totalBids = filteredBids.length;
  const overdueBids = filteredBids.filter(b => getBidStatus(b) === 'overdue').length;
  const wonBids = filteredBids.filter(b => getBidStatus(b) === 'won').length;
  const pendingBids = filteredBids.filter(b => ['upcoming', 'due-today'].includes(getBidStatus(b))).length;

  const exportToCSV = () => {
    if (filteredBids.length === 0) return;
    const headers = ['Quote No', 'Project Name', 'Customer', 'Estimator', 'Bid Due Date', 'Bid Due Time', 'Bid Amount', 'Decision to Bid', 'Won/Lost', 'Location'];
    const rows = filteredBids.map(bid => [
      bid.quote_no || '',
      bid.project_name || '',
      bid.customer_name_str || '',
      bid.primary_estimator_name || '',
      bid.bid_due_date || '',
      bid.bid_due_time || '',
      bid.bid_amount || '0',
      bid.decision_to_bid || '',
      bid.won_lost || '',
      bid.location || ''
    ]);
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Bid_Schedule_${MONTH_NAMES[visibleMonth.month]}_${visibleMonth.year}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="h-[calc(100vh-72px)] -m-4 sm:-m-6 lg:-m-8 bg-slate-50/30 flex flex-col overflow-hidden">

      {/* Header & Filter Controls Bar */}
      <div className="flex-none bg-white border-b border-slate-200 shadow-sm z-30 p-3 lg:px-6 space-y-3 animate-fade-in" ref={filterRef}>
        {/* Top row */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search project, quote, customer..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 bg-white text-xs outline-none focus:border-amber-400 transition-all"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={exportToCSV}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" /> Export CSV
            </button>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-bold transition-all ${showFilters ? 'bg-amber-50 text-amber-600 border-amber-200 shadow-inner' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
            >
              <Columns className="w-3.5 h-3.5" /> Filters
            </button>
          </div>
        </div>

        {/* Stats bar */}
        <div className="flex items-center gap-4 text-[10px]">
          <span className="font-black text-slate-500 uppercase tracking-widest">{totalBids} Bids Total</span>
          <span className="w-px h-3 bg-slate-200" />
          <span className="flex items-center gap-1 font-bold text-rose-500"><span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />{overdueBids} Overdue</span>
          <span className="flex items-center gap-1 font-bold text-blue-500"><span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />{pendingBids} Pending</span>
          <span className="flex items-center gap-1 font-bold text-emerald-500"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />{wonBids} Won</span>
        </div>

        {/* Expandable Filters */}
        {showFilters && (
          <div className="flex flex-col md:flex-row gap-4 pt-3 border-t border-slate-100 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="w-full md:w-56">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-0.5">Estimator</label>
              <div className="relative">
                <select
                  value={filterEstimator}
                  onChange={e => setFilterEstimator(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-md border border-slate-200 bg-slate-50 text-xs font-bold text-slate-700 outline-none focus:border-amber-400 focus:bg-white transition-all cursor-pointer appearance-none"
                >
                  <option value="">All Estimators</option>
                  {estimators.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
                  <ChevronDown className="w-3 h-3" />
                </div>
              </div>
            </div>
            <div className="w-full md:w-48">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-0.5">Decision to Bid</label>
              <div className="relative">
                <select
                  value={filterDecision}
                  onChange={e => setFilterDecision(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-md border border-slate-200 bg-slate-50 text-xs font-bold text-slate-700 outline-none focus:border-amber-400 focus:bg-white transition-all cursor-pointer appearance-none"
                >
                  <option value="">All Decisions</option>
                  <option value="Yes">Bid (Yes)</option>
                  <option value="No">No Bid (No)</option>
                  <option value="TBD">TBD</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
                  <ChevronDown className="w-3 h-3" />
                </div>
              </div>
            </div>
            <div className="w-full md:w-48">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-0.5">Bid Status</label>
              <div className="relative">
                <select
                  value={filterStatus}
                  onChange={e => setFilterStatus(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-md border border-slate-200 bg-slate-50 text-xs font-bold text-slate-700 outline-none focus:border-amber-400 focus:bg-white transition-all cursor-pointer appearance-none"
                >
                  <option value="">All Statuses</option>
                  <option value="overdue">Overdue</option>
                  <option value="due-today">Due Today</option>
                  <option value="upcoming">Upcoming</option>
                  <option value="won">Won</option>
                  <option value="lost">Lost</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="pending">No Date</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
                  <ChevronDown className="w-3 h-3" />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Calendar Body */}
      <div className="flex-1 overflow-hidden flex flex-col min-h-0 p-3 lg:p-4 bg-slate-50/50">
        {error && (
          <div className="mb-3 p-3 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-600 text-xs font-bold flex-none">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm">
            <Loader2 className="w-12 h-12 text-amber-500 animate-spin mb-4" />
            <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Loading Bid Calendar...</p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden min-h-0">

            {/* Calendar Top Bar — amber gradient matching other modules */}
            <div className="flex-none bg-gradient-to-r from-amber-500 to-orange-500 py-3 px-4 lg:px-6 flex items-center justify-between shadow-sm select-none">

              {/* Navigation */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setStartOffset(o => o - 1)}
                  className="p-1.5 rounded-lg bg-white/15 hover:bg-white/25 transition-colors text-white"
                  title="Previous Month"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setStartOffset(0)}
                  className="px-3 py-1 rounded-md bg-white text-[10px] font-black text-amber-600 hover:bg-amber-50 transition-all uppercase tracking-wider shadow-sm"
                >
                  Today
                </button>
                <button
                  onClick={() => setStartOffset(o => o + 1)}
                  className="p-1.5 rounded-lg bg-white/15 hover:bg-white/25 transition-colors text-white"
                  title="Next Month"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Month / Year Title */}
              <h2 className="text-base font-black text-white tracking-wide">
                {MONTH_NAMES[visibleMonth.month]} {visibleMonth.year}
              </h2>

              {/* Legend */}
              <div className="flex items-center gap-3 text-[10px] font-bold text-white/90">
                <div className="flex items-center gap-1">
                  <span className="w-3 h-3 bg-white/30 border border-white/40 rounded inline-block" />
                  <span>Holidays</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-3 h-3 bg-[#c6dafc] border border-[#b8d2f8] rounded inline-block" />
                  <span>SFE BID</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-3 h-3 bg-[#f8c8c4] border border-[#fbc5c0] rounded inline-block" />
                  <span>PRE-BID</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-3 h-3 bg-[#fef1c9] border border-[#fdeab2] rounded inline-block" />
                  <span>Other</span>
                </div>
              </div>
            </div>            {/* Calendar Table Container */}
            <div className="flex-1 overflow-hidden bg-white min-h-0 flex flex-col">
              <table className="w-full h-full border-collapse border border-slate-300 table-fixed">
                <thead className="bg-slate-50 border-b border-slate-300 select-none h-10">
                  <tr>
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                      <th
                        key={day}
                        className="py-2.5 text-center text-[10px] font-black uppercase tracking-widest text-slate-500 border border-slate-300 bg-slate-50/80"
                      >
                        {day}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {weeks.map((week, wIndex) => (
                    <tr key={wIndex}>
                      {week.map((day) => {
                        const dateStr = day.formattedDate;
                        const dayBids = getDayBids(dateStr);
                        const holiday = getHoliday(day.date);
                        const isToday = formatDateYYYYMMDD(new Date()) === dateStr;
                        const isOtherMonth = !day.isCurrentMonth;

                        if (isOtherMonth) {
                          return (
                            <td
                              key={dateStr}
                              className="p-1 border border-slate-300 bg-slate-50/10 align-top"
                            />
                          );
                        }

                        return (
                          <td
                            key={dateStr}
                            className={`p-1 border border-slate-300 align-top transition-all ${
                              isToday
                                ? 'bg-amber-50/60 ring-2 ring-inset ring-amber-400'
                                : 'bg-white hover:bg-slate-50/40'
                            }`}
                          >
                            <div className="flex flex-col h-full overflow-hidden">
                              {/* Day Number — prominent, clean */}
                              <div className="flex items-center justify-end mb-1 select-none">
                                <span
                                  className={`text-sm font-black leading-none flex items-center justify-center rounded-full w-7 h-7 ${
                                    isToday
                                      ? 'bg-amber-500 text-white shadow-sm'
                                      : 'text-slate-700 hover:bg-slate-100'
                                  }`}
                                >
                                  {day.dayNumber}
                                </span>
                              </div>

                              {/* Content: Holiday + Bids */}
                              <div className="flex-1 space-y-0.5 overflow-hidden">
                                {holiday && (
                                  <div className="rounded bg-slate-100 border border-slate-200 text-[8px] font-semibold text-slate-500 px-1 py-0.5 leading-tight truncate select-none" title={holiday}>
                                    🎉 {holiday}
                                  </div>
                                )}
                                {dayBids.map((bid) => {
                                  const cat = getBidCategory(bid);
                                  const cfg = CATEGORY_CONFIG[cat];
                                  const status = getBidStatus(bid);
                                  return (
                                    <div
                                      key={bid.id}
                                      onClick={() => setSelectedBid(bid)}
                                      className={`rounded border ${cfg.border} ${cfg.bg} ${cfg.text} text-[8px] font-bold px-1 py-0.5 cursor-pointer transition-all hover:brightness-95 hover:shadow-sm leading-tight flex items-center gap-1`}
                                      title={`${bid.quote_no} — ${bid.project_name}`}
                                    >
                                      {status === 'overdue' && <span className="w-1 h-1 shrink-0 rounded-full bg-rose-500 inline-block" title="Overdue" />}
                                      {status === 'due-today' && <span className="w-1 h-1 shrink-0 rounded-full bg-orange-400 inline-block" title="Due Today" />}
                                      {bid.won_lost === 'Won' && <span className="text-[6px] shrink-0 bg-emerald-500 text-white px-0.5 rounded leading-none" title="Won">W</span>}
                                      {bid.won_lost === 'Lost' && <span className="text-[6px] shrink-0 bg-rose-500 text-white px-0.5 rounded leading-none" title="Lost">L</span>}
                                      
                                      <span className="font-mono opacity-60 shrink-0">{bid.quote_no}</span>
                                      <span className="truncate">{bid.project_name}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Unscheduled Bids Drawer */}
        {!loading && unscheduledBids.length > 0 && (
          <div className="mt-3 bg-white rounded-2xl border border-amber-200 overflow-hidden flex-none shadow-md">
            <div className="bg-amber-50 px-4 py-2 flex items-center justify-between border-b border-amber-200 select-none">
              <div className="flex items-center gap-2">
                <Inbox className="w-4 h-4 text-amber-500" />
                <span className="text-[10px] font-black text-amber-700 uppercase tracking-widest">Unscheduled — No Bid Due Date</span>
              </div>
              <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-600 text-[10px] font-black flex items-center justify-center border border-amber-200">
                {unscheduledBids.length}
              </span>
            </div>
            <div className="p-3 bg-slate-50/50 max-h-[160px] overflow-y-auto grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
              {unscheduledBids.map(bid => {
                const cat = getBidCategory(bid);
                const cfg = CATEGORY_CONFIG[cat];
                return (
                  <div
                    key={bid.id}
                    onClick={() => setSelectedBid(bid)}
                    className={`rounded-lg border ${cfg.border} ${cfg.bg} ${cfg.text} text-[10px] font-bold p-2 cursor-pointer transition-all hover:brightness-95 hover:shadow-sm leading-tight`}
                    title={bid.project_name}
                  >
                    <div className="flex items-start justify-between gap-1 mb-1">
                      <span className="font-mono text-[9px] opacity-75">{bid.quote_no}</span>
                      {bid.won_lost === 'Won' && <span className="text-[8px] bg-emerald-500 text-white px-0.5 rounded leading-none">W</span>}
                    </div>
                    <p className="line-clamp-2">{bid.project_name}</p>
                    <p className="text-[8px] mt-1 opacity-75 truncate">{bid.primary_estimator_name || 'No Estimator'}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Bid Details Modal */}
      {selectedBid && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-amber-500 to-orange-500 flex items-center justify-between select-none">
              <div className="flex items-center gap-2">
                <span className="font-mono font-black text-[10px] text-white/80 uppercase tracking-widest bg-white/15 border border-white/20 px-2 py-0.5 rounded">
                  {selectedBid.quote_no}
                </span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wide border ${
                  selectedBid.won_lost === 'Won' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                  selectedBid.won_lost === 'Lost' ? 'bg-rose-50 text-rose-600 border-rose-200' :
                  'bg-white text-amber-600 border-amber-200'
                }`}>
                  {selectedBid.won_lost || 'Pending'}
                </span>
              </div>
              <button
                onClick={() => setSelectedBid(null)}
                className="p-1 rounded-full text-white/70 hover:bg-white/20 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 text-xs overflow-y-auto max-h-[60vh]">
              <div>
                <h3 className="text-sm font-bold text-slate-800 leading-tight">
                  {selectedBid.project_name}
                </h3>
                <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider mt-0.5">
                  Customer: {selectedBid.customer_name_str || '—'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-100">
                <div>
                  <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">Estimator</span>
                  <span className="text-slate-700 font-bold">{selectedBid.primary_estimator_name || '—'}</span>
                </div>
                <div>
                  <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">Bid Due Date</span>
                  <span className="text-slate-700 font-bold">
                    {formatDate(selectedBid.bid_due_date)} {selectedBid.bid_due_time ? `@ ${selectedBid.bid_due_time}` : ''}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">Bid Amount</span>
                  <span className="text-slate-700 font-black text-sm text-amber-600">
                    {parseFloat(selectedBid.bid_amount) > 0 ? `$${parseFloat(selectedBid.bid_amount).toLocaleString()}` : '—'}
                  </span>
                </div>
                <div>
                  <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">Decision to Bid</span>
                  <span className="text-slate-700 font-bold">{selectedBid.decision_to_bid || '—'}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">Quote Submitted</span>
                  <span className="text-slate-700 font-bold">{formatDate(selectedBid.quote_date) || '—'}</span>
                </div>
                <div>
                  <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">Awarded Date</span>
                  <span className="text-slate-700 font-bold">{formatDate(selectedBid.awarded_job_no_date) || '—'}</span>
                </div>
              </div>

              {selectedBid.location && (
                <div className="pt-2 border-t border-slate-100">
                  <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">Location</span>
                  <span className="text-slate-700 font-semibold">{selectedBid.location} {selectedBid.distance ? `(${selectedBid.distance})` : ''}</span>
                </div>
              )}

              {selectedBid.project_comments && (
                <div className="pt-2 border-t border-slate-100">
                  <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">Project Comments</span>
                  <p className="text-slate-600 bg-slate-50 p-2 rounded-lg mt-1 border border-slate-100 leading-normal max-h-24 overflow-y-auto">
                    {selectedBid.project_comments}
                  </p>
                </div>
              )}

              {selectedBid.estimator_followup_notes && (
                <div className="pt-2 border-t border-slate-100">
                  <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">Estimator Followup Notes</span>
                  <p className="text-slate-600 bg-slate-50 p-2 rounded-lg mt-1 border border-slate-100 leading-normal max-h-24 overflow-y-auto">
                    {selectedBid.estimator_followup_notes}
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                onClick={() => setSelectedBid(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs font-black transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fade-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fade-in 0.3s ease-out forwards; }
        .line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
      `}</style>
    </div>
  );
}
