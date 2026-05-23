import { useState, useEffect, Fragment } from 'react';
import { Plus, Search, Edit2, Trash2, Eye, Filter, Download, ChevronLeft, ChevronRight, X, ClipboardList, FileText } from "lucide-react";
import ProductionScheduleForm from '../../components/forms/ProductionScheduleForm';
import { productionAPI, projectAPI } from '../../services/api';

export default function ProductionPrioritySchedule() {
  const [showModal, setShowModal] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [search, setSearch] = useState('');
  const [schedules, setSchedules] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editSchedule, setEditSchedule] = useState(null);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [expandedViewMode, setExpandedViewMode] = useState('table'); // 'table' or 'gantt'
  const [selectedGanttMonths, setSelectedGanttMonths] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const fetchSchedules = async () => {
    try {
      setLoading(true);
      const [schedulesRes, projectsRes] = await Promise.all([
        productionAPI.getSchedules(),
        projectAPI.getAll()
      ]);
      setSchedules(schedulesRes.data.results || schedulesRes.data);
      setProjects(projectsRes.data.results || projectsRes.data);
    } catch (error) {
      console.error('Error fetching schedules and projects:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, []);

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '-';
    const d = date.getDate().toString().padStart(2, '0');
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const y = date.getFullYear();
    return `${m}-${d}-${y}`;
  };

  const getPlanCreationDates = (item) => {
    const proj = projects.find(p => p.code === item.job_number);
    const seq = proj?.structural_schedules?.find(s => String(s.seq_no) === String(item.sequence_number));
    
    const rts_date = seq?.rts_date || item.rts_date;
    let scheduled_erection_date = seq?.scheduled_erection_date || item.ship_date;
    
    const leadWeeks = parseFloat(seq?.shop_lead_time_weeks || item.shop_lead_time_weeks) || 0;
    if (rts_date && leadWeeks > 0) {
      const rtsDateObj = new Date(rts_date);
      if (!isNaN(rtsDateObj.getTime())) {
        const erectionDateObj = new Date(rtsDateObj.getTime() + leadWeeks * 7 * 24 * 60 * 60 * 1000);
        const year = erectionDateObj.getFullYear();
        const month = String(erectionDateObj.getMonth() + 1).padStart(2, '0');
        const day = String(erectionDateObj.getDate()).padStart(2, '0');
        scheduled_erection_date = `${year}-${month}-${day}`;
      }
    }

    return {
      rts_date,
      scheduled_erection_date
    };
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this schedule and all its items?')) {
      try {
        await productionAPI.deleteSchedule(id);
        fetchSchedules();
      } catch (error) {
        alert('Failed to delete schedule');
      }
    }
  };

  const openAdd = () => {
    setEditSchedule(null);
    setShowModal(true);
  };

  const openEdit = (schedule) => {
    setEditSchedule(schedule);
    setShowModal(true);
  };

  const openPlan = (schedule) => {
    setSelectedSchedule(schedule);
    setShowPlanModal(true);
  };

  const toggleExpand = (id, mode = 'table') => {
    if (expandedId === id && expandedViewMode === mode) {
      setExpandedId(null);
      setSelectedGanttMonths([]);
    } else {
      setExpandedId(id);
      setExpandedViewMode(mode);
      const sched = schedules.find(s => s.id === id);
      if (sched && mode === 'gantt') {
        const { months } = getScheduleTimelineRange(sched);
        const monthKeys = months.map(m => 
          m.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }).toUpperCase()
        );
        setSelectedGanttMonths(monthKeys);
      } else {
        setSelectedGanttMonths([]);
      }
    }
  };

  const getMonday = (d) => {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(date.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday;
  };

  const getFractionalWeekIndex = (date, filteredWeeks) => {
    if (!filteredWeeks || filteredWeeks.length === 0) return 0;
    const targetMs = date.getTime();
    
    for (let i = 0; i < filteredWeeks.length; i++) {
      const wStart = filteredWeeks[i].getTime();
      const wEnd = wStart + 7 * 24 * 60 * 60 * 1000;
      
      if (targetMs >= wStart && targetMs < wEnd) {
        const fraction = (targetMs - wStart) / (7 * 24 * 60 * 60 * 1000);
        return i + fraction;
      }
    }
    
    if (targetMs < filteredWeeks[0].getTime()) return 0;
    return filteredWeeks.length;
  };

  const getScheduleTimelineRange = (schedule) => {
    let minDate = schedule.start_date ? new Date(schedule.start_date) : null;
    let maxDate = schedule.end_date ? new Date(schedule.end_date) : null;

    (schedule.items || []).forEach(item => {
      const planDates = getPlanCreationDates(item);
      if (planDates.rts_date) {
        const d = new Date(planDates.rts_date);
        if (!isNaN(d.getTime())) {
          if (!minDate || d < minDate) minDate = d;
          if (!maxDate || d > maxDate) maxDate = d;
        }
      }
      if (planDates.scheduled_erection_date) {
        const d = new Date(planDates.scheduled_erection_date);
        if (!isNaN(d.getTime())) {
          if (!minDate || d < minDate) minDate = d;
          if (!maxDate || d > maxDate) maxDate = d;
        }
      }
    });

    if (!minDate) minDate = new Date();
    if (!maxDate) maxDate = new Date(minDate.getTime() + 90 * 24 * 60 * 60 * 1000);

    const startMonth = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
    const endMonth = new Date(maxDate.getFullYear(), maxDate.getMonth() + 1, 0);

    const months = [];
    let curr = new Date(startMonth);
    while (curr <= endMonth) {
      months.push(new Date(curr));
      curr.setMonth(curr.getMonth() + 1);
    }

    const timelineStart = getMonday(minDate);
    const maxMonday = getMonday(maxDate);
    const timelineEnd = new Date(maxMonday);
    timelineEnd.setDate(timelineEnd.getDate() + 7);

    const weeks = [];
    let currWeek = new Date(timelineStart);
    while (currWeek < timelineEnd) {
      weeks.push(new Date(currWeek));
      currWeek.setDate(currWeek.getDate() + 7);
    }

    return { startMonth, endMonth, months, weeks };
  };


  const exportToCSV = () => {
    const headers = ["Schedule Number", "Start Date", "End Date"];
    const rows = filteredSchedules.map(s => [
      s.schedule_number,
      s.start_date,
      s.end_date
    ]);

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "production_schedules.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredSchedules = schedules.filter(s =>
    s.schedule_number.toLowerCase().includes(search.toLowerCase())
  );


  const totalPages = Math.ceil(filteredSchedules.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = filteredSchedules.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Control Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Schedule #..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-slate-200 text-sm outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-500/5 transition-all"
          />
          {search && (
            <button
              onClick={() => { setSearch(''); setCurrentPage(1); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-slate-100 text-slate-400"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-all">
            <Filter className="w-4 h-4" /> Filters
          </button>
          <button
            onClick={exportToCSV}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-all"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
          <button
            onClick={openAdd}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-bold shadow-lg shadow-amber-500/20 hover:from-amber-400 hover:to-orange-400 transition-all"
          >
            <Plus className="w-4 h-4" /> New Schedule
          </button>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-lg border border-slate-200 p-12 text-center shadow-sm">
          <div className="animate-spin w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-sm text-slate-500">Loading schedules...</p>
        </div>
      ) : schedules.length === 0 ? (
        <div className="bg-white rounded-lg border border-slate-200 p-12 text-center shadow-sm">
          <div className="w-16 h-16 bg-gradient-to-br from-amber-100 to-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-amber-600" />
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-1">No production schedules yet</h3>
          <p className="text-sm text-slate-500 max-w-xs mx-auto">Click "New Schedule" to start defining your production priorities.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gradient-to-r from-amber-500 to-orange-500 text-white">
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider border-b border-white/10">Schedule Number</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider border-b border-white/10">Production Start Date</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider border-b border-white/10">Production End Date</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider border-b border-white/10 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedData.map((schedule) => (
                  <Fragment key={schedule.id}>
                    <tr
                      className={`hover:bg-slate-50/50 transition-colors group cursor-pointer text-[12px] ${expandedId === schedule.id ? 'bg-slate-50' : ''}`}
                      onClick={() => toggleExpand(schedule.id, 'table')}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 font-bold text-[10px] border transition-all ${expandedId === schedule.id ? 'bg-amber-500 text-white border-amber-600' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                            {schedule.schedule_number.split('-')[1] || '01'}
                          </div>
                          <span className="font-bold text-slate-800">{schedule.schedule_number}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600 font-medium">{formatDate(schedule.start_date)}</td>
                      <td className="px-6 py-4 text-slate-600 font-medium">{formatDate(schedule.end_date)}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleExpand(schedule.id, 'gantt'); }}
                            className={`p-1.5 rounded transition-colors ${expandedId === schedule.id && expandedViewMode === 'gantt' ? 'text-amber-600 bg-amber-50' : 'text-slate-400 hover:text-amber-600 hover:bg-amber-50'}`}
                            title="View Gantt Chart"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); openEdit(schedule); }}
                            className="p-1.5 rounded text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDelete(schedule.id); }}
                            className="p-1.5 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expandedId === schedule.id && (
                      <tr>
                        <td colSpan="4" className="px-0 py-4 bg-slate-50/50">
                          <div className="border-y border-slate-200 overflow-hidden shadow-inner bg-white animate-in slide-in-from-top-4 duration-300">
                            {expandedViewMode === 'gantt' ? (
                              <div className="overflow-x-auto">
                                {(() => {
                                  const { startMonth, endMonth, months, weeks } = getScheduleTimelineRange(schedule);
                                  
                                  const filteredWeeks = weeks.filter(w => {
                                    const mLabel = w.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }).toUpperCase();
                                    return selectedGanttMonths.includes(mLabel);
                                  });

                                  // Fallback to all weeks if somehow none are selected
                                  const activeWeeks = filteredWeeks.length > 0 ? filteredWeeks : weeks;

                                  // Group active weeks by month for the top-tier header
                                  const activeMonthsMap = {};
                                  activeWeeks.forEach(w => {
                                    const mLabel = w.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }).toUpperCase();
                                    if (!activeMonthsMap[mLabel]) {
                                      activeMonthsMap[mLabel] = {
                                        label: mLabel,
                                        weeks: []
                                      };
                                    }
                                    activeMonthsMap[mLabel].weeks.push(w);
                                  });
                                  const activeMonthsList = Object.values(activeMonthsMap);

                                  const visibleStart = activeWeeks[0];
                                  const visibleEnd = new Date(activeWeeks[activeWeeks.length - 1].getTime() + 7 * 24 * 60 * 60 * 1000);

                                  const sortedItems = [...(schedule.items || [])].sort((a, b) => {
                                    const datesA = getPlanCreationDates(a);
                                    const datesB = getPlanCreationDates(b);
                                    const dateA = new Date(datesA.rts_date || '9999-12-31');
                                    const dateB = new Date(datesB.rts_date || '9999-12-31');
                                    if (dateA - dateB !== 0) return dateA - dateB;
                                    const seqA = parseFloat(a.sequence_number) || 999;
                                    const seqB = parseFloat(b.sequence_number) || 999;
                                    return seqA - seqB;
                                  });

                                  // Filter sortedItems to only show items that overlap with the selected months OR have no dates
                                  const visibleItems = sortedItems.filter(item => {
                                    const planDates = getPlanCreationDates(item);
                                    const rts = planDates.rts_date ? new Date(planDates.rts_date) : null;
                                    const erection = planDates.scheduled_erection_date ? new Date(planDates.scheduled_erection_date) : null;
                                    const hasValidDates = rts && !isNaN(rts.getTime()) && erection && !isNaN(erection.getTime());
                                    if (!hasValidDates) return true;

                                    const dStart = rts < erection ? rts : erection;
                                    const dEnd = rts < erection ? erection : rts;
                                    return dStart < visibleEnd && dEnd >= visibleStart;
                                  });

                                  return (
                                    <div className="min-w-[800px] p-4 bg-white space-y-4">
                                      {/* Beautiful Month Filter Bar */}
                                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50 p-3 rounded-lg border border-slate-200/80 shadow-sm">
                                        <div className="flex items-center gap-3">
                                          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Filter Months:</span>
                                          <div className="flex flex-wrap items-center gap-1.5">
                                            {months.map((m) => {
                                              const label = m.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }).toUpperCase();
                                              const isSelected = selectedGanttMonths.includes(label);
                                              return (
                                                <button
                                                  key={label}
                                                  onClick={() => {
                                                    if (isSelected) {
                                                      if (selectedGanttMonths.length > 1) {
                                                        setSelectedGanttMonths(prev => prev.filter(x => x !== label));
                                                      }
                                                    } else {
                                                      setSelectedGanttMonths(prev => [...prev, label]);
                                                    }
                                                  }}
                                                  className={`px-3 py-1.5 rounded-full text-[10px] font-extrabold border transition-all ${
                                                    isSelected 
                                                      ? 'bg-amber-500 text-white border-amber-600 shadow-sm shadow-amber-500/20' 
                                                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-800'
                                                  }`}
                                                >
                                                  {label}
                                                </button>
                                              );
                                            })}
                                          </div>
                                        </div>
                                        <button
                                          onClick={() => {
                                            const allLabels = months.map(m => m.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }).toUpperCase());
                                            setSelectedGanttMonths(allLabels);
                                          }}
                                          className="self-end sm:self-auto px-3 py-1.5 rounded bg-white border border-slate-200 text-slate-500 text-[10px] font-bold hover:bg-slate-50 hover:text-slate-700 transition-all shadow-sm"
                                        >
                                          Select All
                                        </button>
                                      </div>

                                      <table className="w-full text-left border-collapse border border-slate-200 rounded-lg overflow-hidden">
                                        <thead>
                                          {/* First-tier Month Header */}
                                          <tr className="bg-slate-50 border-b border-slate-200">
                                            <th rowSpan="2" className="px-4 py-3 text-[10px] font-black uppercase tracking-wider w-[180px] border-r border-slate-200 text-slate-500 valign-middle">
                                              Job #
                                            </th>
                                            {activeMonthsList.map((mInfo, mIdx) => (
                                              <th key={mIdx} colSpan={mInfo.weeks.length} className="px-2 py-2 text-[10px] font-black uppercase tracking-wider text-center text-slate-500 border-r border-slate-200 last:border-r-0">
                                                {mInfo.label}
                                              </th>
                                            ))}
                                          </tr>
                                          {/* Second-tier Week Header */}
                                          <tr className="bg-slate-50/50 border-b border-slate-200">
                                            {activeWeeks.map((w, wIdx) => (
                                              <th key={wIdx} className="px-1 py-1.5 text-[9px] font-bold text-center text-slate-400 border-r border-slate-100 last:border-r-0 whitespace-nowrap">
                                                {w.getDate().toString().padStart(2, '0')} {w.toLocaleDateString('en-US', { month: 'short' })}
                                              </th>
                                            ))}
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                          {visibleItems.length > 0 ? visibleItems.map((item, idx) => {
                                            const planDates = getPlanCreationDates(item);
                                            const rts = planDates.rts_date ? new Date(planDates.rts_date) : null;
                                            const erection = planDates.scheduled_erection_date ? new Date(planDates.scheduled_erection_date) : null;
                                            const hasValidDates = rts && !isNaN(rts.getTime()) && erection && !isNaN(erection.getTime());
                                            
                                            let leftPct = 0;
                                            let widthPct = 0;
                                            let isBarVisible = false;
                                            
                                            if (hasValidDates) {
                                              let dStart = rts < erection ? rts : erection;
                                              let dEnd = rts < erection ? erection : rts;
                                              
                                              const overlaps = dStart < visibleEnd && dEnd >= visibleStart;
                                              
                                              if (overlaps) {
                                                isBarVisible = true;
                                                let startIdx = getFractionalWeekIndex(dStart, activeWeeks);
                                                let endIdx = getFractionalWeekIndex(dEnd, activeWeeks);
                                                
                                                startIdx = Math.max(0, Math.min(activeWeeks.length, startIdx));
                                                endIdx = Math.max(0, Math.min(activeWeeks.length, endIdx));
                                                
                                                leftPct = (startIdx / activeWeeks.length) * 100;
                                                widthPct = ((endIdx - startIdx) / activeWeeks.length) * 100;
                                                if (widthPct < 0.5) widthPct = 0.5;
                                              }
                                            }

                                            return (
                                              <tr key={idx} className="hover:bg-slate-50/50 transition-colors text-[11px] h-[55px]">
                                                <td className="px-4 py-3 font-bold text-slate-800 w-[180px] shrink-0 border-r border-slate-200">
                                                  <div className="flex flex-col">
                                                    <span className="font-bold text-slate-800">{item.job_number}</span>
                                                    <span className="text-[9px] text-slate-400 font-medium">
                                                      Seq {item.sequence_number} | {parseFloat(item.weight || 0).toFixed(2)} Tons
                                                    </span>
                                                  </div>
                                                </td>
                                                <td colSpan={activeWeeks.length} className="p-0 relative h-[55px] bg-slate-50/10">
                                                  {/* Column grid lines */}
                                                  <div className="absolute inset-0 flex pointer-events-none">
                                                    {activeWeeks.map((_, wIdx) => (
                                                      <div key={wIdx} className="flex-1 border-r border-slate-100 last:border-r-0 h-full" />
                                                    ))}
                                                  </div>
                                                  {/* Gantt Bar */}
                                                  {hasValidDates ? (
                                                    isBarVisible ? (
                                                      <div 
                                                        className="absolute top-1/2 -translate-y-1/2 h-8 bg-amber-500/10 border border-amber-500 border-l-4 text-amber-800 rounded-lg shadow-sm flex items-center px-3 justify-between transition-all hover:scale-[1.01] hover:shadow-md cursor-pointer group"
                                                        style={{
                                                          left: `${leftPct}%`,
                                                          width: `${widthPct}%`,
                                                          minWidth: '24px'
                                                        }}
                                                      >
                                                        <span className="text-[10px] font-black tracking-tight truncate">{item.job_number}</span>
                                                        {widthPct > 15 && (
                                                          <span className="text-[9px] font-bold opacity-80 whitespace-nowrap ml-2">
                                                            {formatDate(planDates.rts_date)} → {formatDate(planDates.scheduled_erection_date)}
                                                          </span>
                                                        )}
                                                        {/* Floating Tooltip */}
                                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 bg-slate-900 text-white text-[9px] font-bold rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                                                          <div className="font-extrabold text-[10px] text-amber-400 mb-0.5">{item.job_number}</div>
                                                          <div>RTS Date: {formatDate(planDates.rts_date)}</div>
                                                          <div>Scheduled Start of Erection: {formatDate(planDates.scheduled_erection_date)}</div>
                                                          <div>Weight: {item.weight} Tons</div>
                                                        </div>
                                                      </div>
                                                    ) : (
                                                      <div className="absolute inset-0 flex items-center pl-4 text-[10px] text-slate-400 italic">
                                                        Out of selected range ({formatDate(planDates.rts_date)} → {formatDate(planDates.scheduled_erection_date)})
                                                      </div>
                                                    )
                                                  ) : (
                                                    <div className="absolute inset-0 flex items-center pl-4 text-[10px] text-slate-400 italic">
                                                      Timeline TBD (Dates missing)
                                                    </div>
                                                  )}
                                                </td>
                                              </tr>
                                            );
                                          }) : (
                                            <tr>
                                              <td colSpan={activeWeeks.length + 1} className="px-6 py-8 text-center text-slate-400 italic">
                                                No production items visible for selected months
                                              </td>
                                            </tr>
                                          )}
                                        </tbody>
                                      </table>
                                      
                                      {/* Legend */}
                                      <div className="bg-slate-50 px-6 py-3 border border-t-0 border-slate-200 flex items-center justify-between text-[10px] font-semibold text-slate-500 rounded-b-lg">
                                        <div className="flex items-center gap-6">
                                          <div className="flex items-center gap-2">
                                          </div>
                                        </div>
                                        <div className="uppercase tracking-widest text-[9px] font-bold text-slate-400">
                                          {visibleItems.filter(item => {
                                            const dates = getPlanCreationDates(item);
                                            return dates.rts_date && dates.scheduled_erection_date;
                                          }).length} of {schedule.items?.length || 0} Project Timelines Rendered
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })()}
                              </div>
                            ) : (
                              <table className="w-full text-left border-collapse">
                              <thead>
                                <tr className="bg-gradient-to-r from-amber-500 to-orange-500 text-white">
                                  <th className="px-4 py-3 text-[9px] font-black uppercase tracking-wider w-20 text-center">Serial No.</th>
                                  <th className="px-4 py-3 text-[9px] font-black uppercase tracking-wider">Job #</th>
                                  <th className="px-4 py-3 text-[9px] font-black uppercase tracking-wider text-center">Seq #</th>
                                  <th className="px-4 py-3 text-[9px] font-black uppercase tracking-wider text-center">Weight</th>
                                  <th className="px-4 py-3 text-[9px] font-black uppercase tracking-wider text-center">Quantity</th>
                                  <th className="px-4 py-3 text-[9px] font-black uppercase tracking-wider">RTS Date</th>
                                  <th className="px-4 py-3 text-[9px] font-black uppercase tracking-wider">Status</th>
                                  <th className="px-4 py-3 text-[9px] font-black uppercase tracking-wider">Ship Date</th>
                                  <th className="px-4 py-3 text-[9px] font-black uppercase tracking-wider">Notes</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {(() => {
                                  const sortedItems = [...(schedule.items || [])].sort((a, b) => {
                                    // 1. RTS Date (Soonest first)
                                    const dateA = new Date(a.rts_date || '9999-12-31');
                                    const dateB = new Date(b.rts_date || '9999-12-31');
                                    if (dateA - dateB !== 0) return dateA - dateB;

                                    // 2. Sequence (Lowest first)
                                    const seqA = parseFloat(a.sequence_number) || 999;
                                    const seqB = parseFloat(b.sequence_number) || 999;
                                    if (seqA !== seqB) return seqA - seqB;

                                    // 3. Schedule Erection Date (Soonest first)
                                    const erecA = new Date(a.scheduled_erection_date || '9999-12-31');
                                    const erecB = new Date(b.scheduled_erection_date || '9999-12-31');
                                    if (erecA - erecB !== 0) return erecA - erecB;

                                    // 4. Project Priority (High > Medium > Low)
                                    const priorityMap = { 'High': 1, 'Medium': 2, 'Low': 3 };
                                    const priA = priorityMap[a.project_priority] || 4;
                                    const priB = priorityMap[b.project_priority] || 4;
                                    return priA - priB;
                                  });

                                  return sortedItems.length > 0 ? sortedItems.map((item, idx) => {
                                    const calculateStatus = () => {
                                      const shipDate = item.ship_date ? new Date(item.ship_date) : null;

                                      if (shipDate) {
                                        return { label: 'COMPLETED', color: 'text-emerald-600', bg: 'bg-emerald-50', dot: 'bg-emerald-500' };
                                      }

                                      if (!item.rts_date) {
                                        return { label: 'TBD', color: 'text-slate-400', bg: 'bg-slate-100', dot: 'bg-slate-400' };
                                      }

                                      const rtsDate = new Date(item.rts_date);
                                      const twoDaysFromNow = new Date();
                                      twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);

                                      if (rtsDate > twoDaysFromNow) {
                                        return { label: 'YET TO START', color: 'text-blue-600', bg: 'bg-blue-50', dot: 'bg-blue-500' };
                                      } else {
                                        return { label: 'IN PROGRESS', color: 'text-amber-600', bg: 'bg-amber-50', dot: 'bg-amber-500' };
                                      }
                                    };

                                    const status = calculateStatus();

                                    return (
                                      <tr key={idx} className="hover:bg-slate-50/50 transition-colors text-[11px]">
                                        <td className="px-4 py-3 text-center">
                                          <span className="w-6 h-6 inline-flex items-center justify-center rounded bg-amber-100 text-amber-700 font-bold text-[9px]">
                                            {idx + 1}
                                          </span>
                                        </td>
                                        <td className="px-4 py-3 font-bold text-slate-800">{item.job_number}</td>
                                        <td className="px-4 py-3 text-center text-slate-600 font-bold">{item.sequence_number}</td>
                                        <td className="px-4 py-3 text-center text-orange-600 font-black">{item.weight}</td>
                                        <td className="px-4 py-3 text-center text-slate-500 font-bold">{item.quantity}</td>
                                        <td className="px-4 py-3 text-slate-600 font-medium">{formatDate(item.rts_date)}</td>
                                        <td className="px-4 py-3">
                                          <div className={`flex items-center justify-center gap-1.5 px-2 py-0.5 rounded-full text-[8px] font-black tracking-tight ${status.bg} ${status.color} border border-current/10 whitespace-nowrap w-fit`}>
                                            <div className={`w-1 h-1 rounded-full ${status.dot}`} />
                                            {status.label}
                                          </div>
                                        </td>
                                        <td className="px-4 py-2">
                                          <input
                                            type="date"
                                            value={item.ship_date || ''}
                                            onChange={async (e) => {
                                              const newDate = e.target.value || null;
                                              try {
                                                await productionAPI.updateItem(item.id, { ship_date: newDate });
                                                fetchSchedules();
                                              } catch (err) {
                                                console.error('Failed to update ship date:', err);
                                                alert('Failed to update ship date');
                                              }
                                            }}
                                            className="px-2 py-1 rounded border border-slate-300 focus:border-amber-400 outline-none text-[11px] bg-white text-slate-700 font-medium w-[120px] transition-all"
                                          />
                                        </td>
                                        <td className="px-4 py-3 text-slate-400 italic text-[10px]">{item.notes || '—'}</td>
                                      </tr>
                                    );
                                  }) : (
                                    <tr>
                                      <td colSpan="9" className="px-6 py-8 text-center text-slate-400 italic">No production items defined for this schedule</td>
                                    </tr>
                                  );
                                })()}
                              </tbody>
                            </table>
                          )}
                          <div className="bg-slate-50 px-6 py-2 border-t border-slate-100 flex items-center">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{schedule.items?.length || 0} Production Items Tracked</span>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="bg-slate-50 px-6 py-3 border-t border-slate-100 flex items-center justify-between">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              {filteredSchedules.length} {filteredSchedules.length === 1 ? 'Record' : 'Records'} Found
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => prev - 1)}
                className="p-1.5 rounded border border-slate-200 bg-white text-slate-600 disabled:opacity-40 hover:bg-slate-50"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-1">
                {[...Array(totalPages)].map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentPage(i + 1)}
                    className={`w-7 h-7 rounded text-[10px] font-bold transition-all ${currentPage === i + 1 ? 'bg-amber-500 text-white shadow-md' : 'text-slate-600 hover:bg-slate-200'}`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => prev + 1)}
                className="p-1.5 rounded border border-slate-200 bg-white text-slate-600 disabled:opacity-40 hover:bg-slate-50"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <ProductionScheduleForm
          onClose={() => setShowModal(false)}
          onSuccess={fetchSchedules}
          editSchedule={editSchedule}
          nextNumber={schedules.length + 1}
        />
      )}
    </div>
  );
}
