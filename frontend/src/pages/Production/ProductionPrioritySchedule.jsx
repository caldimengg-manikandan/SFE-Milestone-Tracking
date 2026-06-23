import { useState, useEffect, Fragment } from 'react';
import { Plus, Search, Edit2, Trash2, Eye, Filter, Download, ChevronLeft, ChevronRight, X, ClipboardList, FileText } from "lucide-react";
import ProductionScheduleForm from '../../components/forms/ProductionScheduleForm';
import { productionAPI, projectAPI } from '../../services/api';
import FormattedDateInput from '../../components/forms/FormattedDateInput';

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
  const [currentPage, setCurrentPage] = useState(1);
  const [ganttFilter, setGanttFilter] = useState('all'); // 'all', '1month', '3month', '6month'
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
    if (seq) {
      return {
        rts_date: seq.actual_rts_date || seq.rts_date || null,
        scheduled_erection_date: seq.scheduled_erection_date || item.ship_date
      };
    }
    return {
      rts_date: item.rts_date,
      scheduled_erection_date: item.ship_date
    };
  };

  const getGanttBarColorClasses = (item) => {
    const shipDate = item.ship_date ? new Date(item.ship_date) : null;
    if (shipDate) {
      return 'bg-emerald-500/10 border-emerald-500 text-emerald-800'; // COMPLETED
    }

    const planDates = getPlanCreationDates(item);
    const rtsDateStr = planDates.rts_date;
    if (!rtsDateStr) {
      return 'bg-slate-500/10 border-slate-500 text-slate-800'; // TBD
    }

    const [year, month, day] = rtsDateStr.split('-').map(Number);
    const rtsDate = new Date(year, month - 1, day);
    const today = new Date();
    const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    const diffTime = todayMidnight - rtsDate;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return 'bg-blue-500/10 border-blue-500 text-blue-800'; // IN PROGRESS
    } else if (diffDays > 0 && diffDays <= 7) {
      return 'bg-yellow-500/10 border-yellow-500 text-yellow-800'; // LIKELY DELAY
    } else if (diffDays > 7) {
      return 'bg-red-500/10 border-red-500 text-red-800'; // DELAYED
    } else {
      return 'bg-slate-400/10 border-slate-400 text-slate-700'; // YET TO START
    }
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
    } else {
      setExpandedId(id);
      setExpandedViewMode(mode);
    }
  };

  const getScheduleTimelineRange = (schedule, filter = 'all') => {
    let minDate = schedule.start_date ? new Date(schedule.start_date) : null;
    let maxDate = schedule.end_date ? new Date(schedule.end_date) : null;

    const validItems = (schedule.items || []).filter(item => {
      const proj = projects.find(p => p.code === item.job_number);
      if (!proj) return true;
      return proj.structural_schedules?.some(s => String(s.seq_no) === String(item.sequence_number));
    });

    validItems.forEach(item => {
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
    
    if (filter === '1month') {
      maxDate = new Date(minDate);
      maxDate.setMonth(maxDate.getMonth() + 1);
    } else if (filter === '3month') {
      maxDate = new Date(minDate);
      maxDate.setMonth(maxDate.getMonth() + 3);
    } else if (filter === '6month') {
      maxDate = new Date(minDate);
      maxDate.setMonth(maxDate.getMonth() + 6);
    } else {
      if (!maxDate) maxDate = new Date(minDate.getTime() + 90 * 24 * 60 * 60 * 1000);
    }

    const startMonth = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
    const endMonth = new Date(maxDate.getFullYear(), maxDate.getMonth() + 1, 0);

    const months = [];
    let curr = new Date(startMonth);
    while (curr <= endMonth) {
      months.push(new Date(curr));
      curr.setMonth(curr.getMonth() + 1);
    }
    return { startMonth, endMonth, months };
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
                          {(() => {
                            const validItems = (schedule.items || []).filter(item => {
                              const proj = projects.find(p => p.code === item.job_number);
                              if (!proj) return true;
                              return proj.structural_schedules?.some(s => String(s.seq_no) === String(item.sequence_number));
                            });

                            return (
                              <div className="border-y border-slate-200 overflow-x-auto shadow-inner bg-white animate-in slide-in-from-top-4 duration-300">
                                {expandedViewMode === 'gantt' ? (
                                  <div className="overflow-x-auto">
                                    {(() => {
                                      const { startMonth, endMonth, months } = getScheduleTimelineRange(schedule, ganttFilter);
                                      const sortedItems = [...validItems].sort((a, b) => {
                                        const datesA = getPlanCreationDates(a);
                                        const datesB = getPlanCreationDates(b);
                                        const dateA = new Date(datesA.rts_date || '9999-12-31');
                                        const dateB = new Date(datesB.rts_date || '9999-12-31');
                                        if (dateA - dateB !== 0) return dateA - dateB;
                                        const seqA = parseFloat(a.sequence_number) || 999;
                                        const seqB = parseFloat(b.sequence_number) || 999;
                                        return seqA - seqB;
                                      });

                                      return (
                                        <div className="min-w-[800px] p-4 bg-white">
                                          {/* View Filter buttons */}
                                          <div className="flex justify-end items-center gap-2 mb-4">
                                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Timeline View Range:</span>
                                            {[
                                              { value: 'all', label: 'All' },
                                              { value: '1month', label: '1 Month' },
                                              { value: '3month', label: '3 Months' },
                                              { value: '6month', label: '6 Months' }
                                            ].map(opt => (
                                              <button
                                                key={opt.value}
                                                onClick={() => setGanttFilter(opt.value)}
                                                className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all border ${
                                                  ganttFilter === opt.value
                                                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white border-transparent shadow-md shadow-amber-500/10'
                                                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                                }`}
                                              >
                                                {opt.label}
                                              </button>
                                            ))}
                                          </div>

                                      <table className="w-full text-left border-collapse border border-slate-200 rounded-lg overflow-hidden">
                                        <thead>
                                          <tr className="bg-slate-50 border-b border-slate-200">
                                            <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider w-[180px] border-r border-slate-200 text-slate-500">
                                              Job #
                                            </th>
                                            {months.map((m, mIdx) => (
                                              <th key={mIdx} className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-center text-slate-500 border-r border-slate-200 last:border-r-0">
                                                {m.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }).toUpperCase()}
                                              </th>
                                            ))}
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                          {sortedItems.length > 0 ? sortedItems.map((item, idx) => {
                                            const planDates = getPlanCreationDates(item);
                                            const rts = planDates.rts_date ? new Date(planDates.rts_date) : null;
                                            const erection = planDates.scheduled_erection_date ? new Date(planDates.scheduled_erection_date) : null;
                                            const hasValidDates = rts && !isNaN(rts.getTime()) && erection && !isNaN(erection.getTime());
                                            
                                            let isBarVisible = false;
                                            let leftPct = 0;
                                            let widthPct = 0;
                                            
                                            if (hasValidDates) {
                                              let dStart = rts < erection ? rts : erection;
                                              let dEnd = rts < erection ? erection : rts;
                                              
                                              const totalMs = endMonth - startMonth;
                                              const visibleStart = dStart < startMonth ? startMonth : dStart;
                                              const visibleEnd = dEnd > endMonth ? endMonth : dEnd;
                                              
                                              if (visibleEnd > visibleStart) {
                                                isBarVisible = true;
                                                const startMs = visibleStart - startMonth;
                                                const durationMs = visibleEnd - visibleStart;
                                                
                                                leftPct = Math.max(0, Math.min(100, (startMs / totalMs) * 100));
                                                widthPct = Math.max(0.5, Math.min(100 - leftPct, (durationMs / totalMs) * 100));
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
                                                <td colSpan={months.length} className="p-0 relative h-[55px] bg-slate-50/10">
                                                  {/* Column grid lines */}
                                                  <div className="absolute inset-0 flex pointer-events-none">
                                                    {months.map((_, mIdx) => (
                                                      <div key={mIdx} className="flex-1 border-r border-slate-100 last:border-r-0 h-full" />
                                                    ))}
                                                  </div>
                                                  {/* Gantt Bar */}
                                                  {isBarVisible ? (
                                                    <div 
                                                      className={`absolute top-1/2 -translate-y-1/2 h-8 ${getGanttBarColorClasses(item)} border border-l-4 rounded-lg shadow-sm flex items-center px-3 justify-between transition-all hover:scale-[1.01] hover:shadow-md cursor-pointer group`}
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
                                                        <div>Erection Start: {formatDate(planDates.scheduled_erection_date)}</div>
                                                        <div>Weight: {item.weight} Tons</div>
                                                      </div>
                                                    </div>
                                                  ) : (
                                                    <div className="absolute inset-0 flex items-center pl-4 text-[10px] text-slate-400 italic">
                                                      {hasValidDates ? 'Outside visible range' : 'Timeline TBD (Dates missing)'}
                                                    </div>
                                                  )}
                                                </td>
                                              </tr>
                                            );
                                          }) : (
                                            <tr>
                                              <td colSpan={months.length + 1} className="px-6 py-8 text-center text-slate-400 italic">
                                                No production items defined for this schedule
                                              </td>
                                            </tr>
                                          )}
                                        </tbody>
                                      </table>
                                      {/* Legend */}
                                      <div className="bg-slate-50 px-6 py-3.5 border border-t-0 border-slate-200 flex flex-wrap items-center justify-between gap-4 text-[10px] font-semibold text-slate-500 rounded-b-lg">
                                        <div className="flex flex-wrap items-center gap-4">
                                          <span className="font-bold text-slate-700 uppercase tracking-wider text-[9px]">Status Legend:</span>
                                          {[
                                            { label: 'Completed', colorBg: 'bg-emerald-500' },
                                            { label: 'In Progress', colorBg: 'bg-blue-500' },
                                            { label: 'Likely Delay', colorBg: 'bg-yellow-500' },
                                            { label: 'Delayed', colorBg: 'bg-red-500' },
                                            { label: 'Yet to Start', colorBg: 'bg-slate-400' },
                                            { label: 'TBD', colorBg: 'bg-slate-500' }
                                          ].map(leg => (
                                            <div key={leg.label} className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-md border border-slate-100 shadow-sm">
                                              <span className={`w-2 h-2 rounded-full ${leg.colorBg}`} />
                                              <span className="text-slate-600 font-bold">{leg.label}</span>
                                            </div>
                                          ))}
                                        </div>
                                        <div className="uppercase tracking-widest text-[9px] font-bold text-slate-400">
                                          {validItems.length} Project Timelines Rendered
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })()}
                              </div>
                            ) : (
                              <table className="w-full text-left border-collapse min-w-[1200px]">
                              <thead>
                                <tr className="bg-gradient-to-r from-amber-500 to-orange-500 text-white">
                                  <th className="px-4 py-3 text-[9px] font-black uppercase tracking-wider w-20 text-center">Serial No.</th>
                                  <th className="px-4 py-3 text-[9px] font-black uppercase tracking-wider">Job #</th>
                                  <th className="px-4 py-3 text-[9px] font-black uppercase tracking-wider text-center">Seq #</th>
                                  <th className="px-4 py-3 text-[9px] font-black uppercase tracking-wider text-center">Weight (in Tons)</th>
                                  <th className="px-4 py-3 text-[9px] font-black uppercase tracking-wider text-center">Weight (in LBS)</th>
                                  <th className="px-4 py-3 text-[9px] font-black uppercase tracking-wider text-center">Quantity</th>
                                  <th className="px-4 py-3 text-[9px] font-black uppercase tracking-wider">RTS Date</th>
                                  <th className="px-4 py-3 text-[9px] font-black uppercase tracking-wider">Status</th>
                                  <th className="px-4 py-3 text-[9px] font-black uppercase tracking-wider">Ship Date</th>
                                  <th className="px-4 py-3 text-[9px] font-black uppercase tracking-wider">Production Start</th>
                                  <th className="px-4 py-3 text-[9px] font-black uppercase tracking-wider">Production End</th>
                                  <th className="px-4 py-3 text-[9px] font-black uppercase tracking-wider">Notes</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {(() => {
                                  const validItems = (schedule.items || []).filter(item => {
                                    const proj = projects.find(p => p.code === item.job_number);
                                    if (!proj) return true;
                                    return proj.structural_schedules?.some(s => String(s.seq_no) === String(item.sequence_number));
                                  });

                                  const sortedItems = [...validItems].sort((a, b) => {
                                    const planDatesA = getPlanCreationDates(a);
                                    const planDatesB = getPlanCreationDates(b);
                                    // 1. RTS Date (Soonest first)
                                    const dateA = new Date(planDatesA.rts_date || '9999-12-31');
                                    const dateB = new Date(planDatesB.rts_date || '9999-12-31');
                                    if (dateA - dateB !== 0) return dateA - dateB;

                                    // 2. Sequence (Lowest first)
                                    const seqA = parseFloat(a.sequence_number) || 999;
                                    const seqB = parseFloat(b.sequence_number) || 999;
                                    if (seqA !== seqB) return seqA - seqB;

                                    // 3. Schedule Erection Date (Soonest first)
                                    const erecA = new Date(planDatesA.scheduled_erection_date || '9999-12-31');
                                    const erecB = new Date(planDatesB.scheduled_erection_date || '9999-12-31');
                                    if (erecA - erecB !== 0) return erecA - erecB;

                                    // 4. Project Priority (High > Medium > Low)
                                    const priorityMap = { 'High': 1, 'Medium': 2, 'Low': 3 };
                                    const priA = priorityMap[a.project_priority] || 4;
                                    const priB = priorityMap[b.project_priority] || 4;
                                    return priA - priB;
                                  });

                                  return sortedItems.length > 0 ? sortedItems.map((item, idx) => {
                                    const planDates = getPlanCreationDates(item);
                                    const calculateStatus = () => {
                                      const shipDate = item.ship_date ? new Date(item.ship_date) : null;

                                      if (shipDate) {
                                        return { label: 'COMPLETED', color: 'text-emerald-600', bg: 'bg-emerald-50', dot: 'bg-emerald-500' };
                                      }

                                      if (!planDates.rts_date) {
                                        return { label: 'TBD', color: 'text-slate-400', bg: 'bg-slate-100', dot: 'bg-slate-400' };
                                      }

                                      const [year, month, day] = planDates.rts_date.split('-').map(Number);
                                      const rtsDate = new Date(year, month - 1, day);
                                      const today = new Date();
                                      const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                                      
                                      const diffTime = todayMidnight - rtsDate;
                                      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                                      if (diffDays === 0) {
                                        return { label: 'IN PROGRESS', color: 'text-blue-600', bg: 'bg-blue-50', dot: 'bg-blue-500' };
                                      } else if (diffDays > 0 && diffDays <= 7) {
                                        return { label: 'LIKELY DELAY', color: 'text-yellow-600', bg: 'bg-yellow-50', dot: 'bg-yellow-500' };
                                      } else if (diffDays > 7) {
                                        return { label: 'DELAYED', color: 'text-red-600', bg: 'bg-red-50', dot: 'bg-red-500' };
                                      } else {
                                        return { label: 'YET TO START', color: 'text-slate-500', bg: 'bg-slate-50', dot: 'bg-slate-400' };
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
                                        <td className="px-4 py-3 text-center text-slate-700 font-bold">{(parseFloat(item.weight || 0) * 2000).toFixed(2)}</td>
                                        <td className="px-4 py-3 text-center text-slate-500 font-bold">{item.quantity}</td>
                                        <td className="px-4 py-3 text-slate-600 font-medium">{formatDate(planDates.rts_date)}</td>
                                        <td className="px-4 py-3">
                                          <div className={`flex items-center justify-center gap-1.5 px-2 py-0.5 rounded-full text-[8px] font-black tracking-tight ${status.bg} ${status.color} border border-current/10 whitespace-nowrap w-fit`}>
                                            <div className={`w-1 h-1 rounded-full ${status.dot}`} />
                                            {status.label}
                                          </div>
                                        </td>
                                        <td className="px-4 py-2">
                                          <FormattedDateInput
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
                                        <td className="px-4 py-2">
                                          <FormattedDateInput
                                            value={item.production_start_date || ''}
                                            onChange={async (e) => {
                                              const newDate = e.target.value || null;
                                              try {
                                                await productionAPI.updateItem(item.id, { production_start_date: newDate });
                                                fetchSchedules();
                                              } catch (err) {
                                                console.error('Failed to update production start date:', err);
                                                alert('Failed to update production start date');
                                              }
                                            }}
                                            className="px-2 py-1 rounded border border-slate-300 focus:border-amber-400 outline-none text-[11px] bg-white text-slate-700 font-medium w-[120px] transition-all"
                                          />
                                        </td>
                                        <td className="px-4 py-2">
                                          <FormattedDateInput
                                            value={item.production_end_date || ''}
                                            onChange={async (e) => {
                                              const newDate = e.target.value || null;
                                              try {
                                                await productionAPI.updateItem(item.id, { production_end_date: newDate });
                                                fetchSchedules();
                                              } catch (err) {
                                                console.error('Failed to update production end date:', err);
                                                alert('Failed to update production end date');
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
                                      <td colSpan="11" className="px-6 py-8 text-center text-slate-400 italic">No production items defined for this schedule</td>
                                    </tr>
                                  );
                                })()}
                              </tbody>
                            </table>
                          )}
                          <div className="bg-slate-50 px-6 py-2 border-t border-slate-100 flex items-center">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{validItems.length} Production Items Tracked</span>
                          </div>
                              </div>
                            );
                          })()}
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
