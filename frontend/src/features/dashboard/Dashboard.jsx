import { useState, useEffect, Fragment } from 'react';
import {
  Users, FolderKanban, BarChart3, TrendingUp, ArrowUpRight, ArrowDownRight,
  Clock, CheckCircle2, AlertTriangle, Box, Loader2, X, Calendar, Search
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Legend
} from 'recharts';
import { dashboardAPI, projectAPI, scheduleAPI } from '../../services/api';

/* ── Configs ── */
const announcements = [
  { id: 1, title: 'Safety audit scheduled for May 15', priority: 'high' },
  { id: 2, title: 'Quarterly production targets updated', priority: 'medium' },
  { id: 3, title: 'Server maintenance — May 10, 2AM', priority: 'low' },
];

export default function Dashboard() {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [fromMonth, setFromMonth] = useState(0);
  const [toMonth, setToMonth] = useState(11);
  const [loading, setLoading] = useState(true);
  const [capacityMonth, setCapacityMonth] = useState(new Date().getMonth() + 1);
  const [capacityYear, setCapacityYear] = useState(new Date().getFullYear().toString());
  const [data, setData] = useState({
    stats: [],
    areaData: [],
    pieData: [],
    barData: [],
    recentActivities: []
  });
  const [error, setError] = useState('');
  const [expandedTaskId, setExpandedTaskId] = useState(null);
  const [selectedNotice, setSelectedNotice] = useState(null);

  /* -- Real plan tracking state -- */
  const [projects, setProjects] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [activeCardFilter, setActiveCardFilter] = useState(null);
  const [tableSearch, setTableSearch] = useState('');

  const toggleExpand = (id) => {
    setExpandedTaskId(expandedTaskId === id ? null : id);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '-';
    const d = date.getDate().toString().padStart(2, '0');
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const y = date.getFullYear();
    return `${d}-${m}-${y}`;
  };

  const getWeekPositions = (startDateStr, endDateStr, startMonth, duration, yearVal, fromM, toM) => {
    let startDate, endDate;
    if (startDateStr && endDateStr) {
      startDate = new Date(startDateStr);
      endDate = new Date(endDateStr);
    } else {
      startDate = new Date(parseInt(yearVal), startMonth, 1);
      endDate = new Date(parseInt(yearVal), startMonth + duration, 0);
    }

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return null;

    const gridStart = new Date(parseInt(yearVal), fromM, 1);
    const gridEnd = new Date(parseInt(yearVal), toM + 1, 0, 23, 59, 59, 999);

    if (endDate < gridStart || startDate > gridEnd) return null;

    const effStart = startDate < gridStart ? gridStart : startDate;
    const effEnd = endDate > gridEnd ? gridEnd : endDate;

    const getFractionalCol = (date) => {
      const m = date.getMonth();
      const d = date.getDate();
      const y = date.getFullYear();

      const monthOffset = m - fromM;
      const totalDaysInMonth = new Date(y, m + 1, 0).getDate();

      let weekPart = 0;
      if (d <= 7) {
        weekPart = (d - 1) / 7;
      } else if (d <= 14) {
        weekPart = 1 + (d - 8) / 7;
      } else if (d <= 21) {
        weekPart = 2 + (d - 15) / 7;
      } else {
        const daysInW4 = totalDaysInMonth - 21;
        weekPart = 3 + (d - 22) / daysInW4;
      }

      return monthOffset * 4 + weekPart;
    };

    const startCol = getFractionalCol(effStart);
    const effEndPlusOne = new Date(effEnd.getTime() + 24 * 60 * 60 * 1000);
    const endCol = getFractionalCol(effEndPlusOne);

    const totalWeeks = (toM - fromM + 1) * 4;
    const clampedStartCol = Math.max(0, Math.min(totalWeeks, startCol));
    const clampedEndCol = Math.max(0, Math.min(totalWeeks, endCol));

    if (clampedStartCol >= clampedEndCol) return null;

    return {
      startCol: clampedStartCol,
      endCol: clampedEndCol
    };
  };

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const [statsRes, projRes, schedRes] = await Promise.all([
          dashboardAPI.getStats({
            year: selectedYear,
            capacity_month: capacityMonth,
            capacity_year: capacityYear
          }),
          projectAPI.getAll(),
          scheduleAPI.getAll({ page_size: 1000 })
        ]);
        setData(statsRes.data);

        const projData = projRes.data.results || projRes.data;
        const schedData = schedRes.data.results || schedRes.data;
        setProjects(Array.isArray(projData) ? projData : []);
        setSchedules(Array.isArray(schedData) ? schedData : []);
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
        setError(error.response?.data?.detail || 'Failed to connect to the server');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [selectedYear, capacityMonth, capacityYear]);

  // Helper to check if a value is present (not null, undefined, or empty string)
  const isPresent = (val) => val !== null && val !== undefined && String(val).trim() !== '';

  // Classify each schedule item (sequence) and associate project details
  const processedSchedules = schedules.map(item => {
    const project = projects.find(p => String(p.id) === String(item.project?.id || item.project));
    const projectName = project ? project.name : 'N/A';
    
    // Categorize
    let category = 'other';
    if (isPresent(item.actual_ship_date)) {
      category = 'sent_for_erection';
    } else if (isPresent(item.actual_rts_date)) {
      category = 'fabrication';
    } else if (isPresent(item.rts_date)) {
      category = 'under_detailing';
    }

    // Determine sub-status (for Fabrication card)
    let subStatus = '';
    if (category === 'sent_for_erection') {
      subStatus = 'Sent for Erection';
    } else if (category === 'fabrication') {
      subStatus = isPresent(item.ship_date) ? 'Under Fabrication' : 'Released for Fabrication';
    } else if (category === 'under_detailing') {
      subStatus = 'Under Detailing';
    } else {
      subStatus = 'Other';
    }

    return {
      ...item,
      projectName,
      category,
      subStatus
    };
  });

  const underDetailingItems = processedSchedules.filter(s => s.category === 'under_detailing');
  const fabricationItems = processedSchedules.filter(s => s.category === 'fabrication');
  const sentForErectionItems = processedSchedules.filter(s => s.category === 'sent_for_erection');

  const getUniqueProjectsCount = (items) => {
    const projectIds = new Set(items.map(item => String(item.project?.id || item.project)));
    return Array.from(projectIds).filter(id => id && id !== 'undefined' && id !== 'null').length;
  };

  const counts = {
    total_projects: {
      projects: projects.length,
      sequences: schedules.length
    },
    under_detailing: {
      projects: getUniqueProjectsCount(underDetailingItems),
      sequences: underDetailingItems.length
    },
    fabrication: {
      projects: getUniqueProjectsCount(fabricationItems),
      sequences: fabricationItems.length
    },
    sent_for_erection: {
      projects: getUniqueProjectsCount(sentForErectionItems),
      sequences: sentForErectionItems.length
    }
  };

  const cards = [
    {
      id: 'total_projects',
      label: 'Total Projects',
      icon: FolderKanban,
      iconBg: 'bg-amber-50 text-amber-600 border border-amber-100',
      activeBorder: 'border-amber-500 ring-2 ring-amber-100/75 bg-gradient-to-br from-white to-amber-50/10 shadow-[0_4px_25px_rgba(245,158,11,0.08)]',
      hoverBorder: 'hover:border-amber-400 hover:shadow-md hover:shadow-amber-50/40',
      accentBg: 'bg-amber-500',
      value: projects.length,
      caption: `${schedules.length} Sequences`
    },
    {
      id: 'under_detailing',
      label: 'Under Detailing',
      icon: Clock,
      iconBg: 'bg-orange-50 text-orange-600 border border-orange-100',
      activeBorder: 'border-orange-500 ring-2 ring-orange-100/75 bg-gradient-to-br from-white to-orange-50/10 shadow-[0_4px_25px_rgba(249,115,22,0.08)]',
      hoverBorder: 'hover:border-orange-400 hover:shadow-md hover:shadow-orange-50/40',
      accentBg: 'bg-orange-500',
      value: counts.under_detailing.sequences,
      caption: `${counts.under_detailing.projects} Projects`
    },
    {
      id: 'fabrication',
      label: 'Fabrication',
      icon: Box,
      iconBg: 'bg-blue-50 text-blue-600 border border-blue-100',
      activeBorder: 'border-blue-500 ring-2 ring-blue-100/75 bg-gradient-to-br from-white to-blue-50/10 shadow-[0_4px_25px_rgba(59,130,246,0.08)]',
      hoverBorder: 'hover:border-blue-400 hover:shadow-md hover:shadow-blue-50/40',
      accentBg: 'bg-blue-500',
      value: counts.fabrication.sequences,
      caption: `${counts.fabrication.projects} Projects`
    },
    {
      id: 'sent_for_erection',
      label: 'Sent for Erection',
      icon: CheckCircle2,
      iconBg: 'bg-emerald-50 text-emerald-600 border border-emerald-100',
      activeBorder: 'border-emerald-500 ring-2 ring-emerald-100/75 bg-gradient-to-br from-white to-emerald-50/10 shadow-[0_4px_25px_rgba(16,185,129,0.08)]',
      hoverBorder: 'hover:border-emerald-400 hover:shadow-md hover:shadow-emerald-50/40',
      accentBg: 'bg-emerald-500',
      value: counts.sent_for_erection.sequences,
      caption: `${counts.sent_for_erection.projects} Projects`
    }
  ];

  const getFilteredSchedules = () => {
    if (!activeCardFilter) return [];
    if (activeCardFilter === 'total_projects') {
      return processedSchedules;
    }
    return processedSchedules.filter(s => s.category === activeCardFilter);
  };

  const filteredTableItems = getFilteredSchedules().filter(item => {
    const searchLower = tableSearch.toLowerCase();
    return (
      (item.projectName || '').toLowerCase().includes(searchLower) ||
      (item.seq_no || '').toLowerCase().includes(searchLower) ||
      (item.item_description || '').toLowerCase().includes(searchLower) ||
      (item.subStatus || '').toLowerCase().includes(searchLower)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Row */}
      {error && (
        <div className="bg-red-50 border border-red-100 p-4 rounded-lg text-red-600 text-xs font-bold animate-shake">
          {error}
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card) => {
          const Icon = card.icon;
          const isActive = activeCardFilter === card.id;
          return (
            <div
              key={card.id}
              onClick={() => {
                setActiveCardFilter(isActive ? null : card.id);
                setTableSearch('');
              }}
              className={`bg-white border rounded-xl p-6 transition-all duration-350 cursor-pointer shadow-[0_4px_20px_rgba(0,0,0,0.02)] transform hover:-translate-y-1 group relative overflow-hidden flex flex-col justify-between min-h-[160px] ${
                isActive ? card.activeBorder : 'border-slate-200/90 ' + card.hoverBorder
              }`}
            >
              {/* Top Accent Indicator Strip */}
              <div className={`absolute top-0 left-0 right-0 h-[4px] transition-all duration-300 ${isActive ? card.accentBg : 'bg-transparent group-hover:' + card.accentBg}`} />

              <div>
                <div className="flex items-start justify-between">
                  <div className={`w-10 h-10 rounded-xl ${card.iconBg} flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  {isActive && (
                    <span className={`inline-flex items-center gap-0.5 text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${card.iconBg}`}>
                      Selected
                    </span>
                  )}
                </div>
                <div className="mt-4">
                  <p className="text-3xl font-black text-slate-900 leading-none tracking-tighter">{card.value}</p>
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mt-2">{card.label}</p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center text-[10px] font-bold text-slate-500">
                <span className="uppercase tracking-wider text-[9px] text-slate-400">Project Stats</span>
                <span className="bg-slate-100/80 text-slate-600 px-2 py-0.5 rounded font-black text-[9px] uppercase tracking-wide">
                  {card.caption}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Details Table Section */}
      {activeCardFilter && (
        <div className="bg-white border border-slate-200/95 rounded-2xl shadow-xl overflow-hidden transition-all duration-300 animate-fade-in">
          {/* Table Header Section with Gradient background */}
          <div className="bg-gradient-to-r from-slate-50 to-slate-100/50 border-b border-slate-200/75 px-8 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={`w-2.5 h-6 rounded ${
                activeCardFilter === 'total_projects' ? 'bg-amber-500' :
                activeCardFilter === 'under_detailing' ? 'bg-orange-500' :
                activeCardFilter === 'fabrication' ? 'bg-blue-500' :
                'bg-emerald-500'
              }`} />
              <div>
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.25em]">
                  {activeCardFilter === 'total_projects' ? 'All Active Sequences' :
                   activeCardFilter === 'under_detailing' ? 'Under Detailing Sequences' :
                   activeCardFilter === 'fabrication' ? 'Fabrication Sequences (Clubbed)' :
                   'Sent for Erection Sequences'}
                </h3>
                <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mt-1">
                  Showing {filteredTableItems.length} of {getFilteredSchedules().length} sequences
                </p>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-4">
              {/* Search input with icons */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by project or sequence..."
                  value={tableSearch}
                  onChange={(e) => setTableSearch(e.target.value)}
                  className="w-full max-w-xs sm:max-w-md pl-9 pr-8 py-2 bg-slate-50 hover:bg-slate-100/60 focus:bg-white text-[11px] rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400 font-semibold text-slate-800 placeholder-slate-400 transition-all shadow-inner"
                />
                {tableSearch && (
                  <button 
                    onClick={() => setTableSearch('')} 
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              
              <button
                onClick={() => {
                  setActiveCardFilter(null);
                  setTableSearch('');
                }}
                className="flex items-center gap-1.5 px-3 py-2 text-[9px] font-black uppercase tracking-widest bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg shadow-sm transition-all active:scale-95"
              >
                <X className="w-3.5 h-3.5" />
                Close Table
              </button>
            </div>
          </div>

          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-left border-collapse table-fixed min-w-[1000px]">
              <thead>
                <tr className="bg-slate-800 text-slate-100 text-[10px] font-black uppercase tracking-wider border-b border-slate-900">
                  <th className="px-6 py-4 w-[6%]">S.No</th>
                  <th className="px-6 py-4 w-[30%]">Project Name</th>
                  <th className="px-6 py-4 w-[14%]">Sequence Number</th>
                  <th className="px-6 py-4 w-[16%]">Sub-Status</th>
                  <th className="px-6 py-4 w-[11%]">Scheduled RTS</th>
                  <th className="px-6 py-4 w-[11%]">Actual RTS</th>
                  <th className="px-6 py-4 w-[11%]">Planned Ship</th>
                  <th className="px-6 py-4 w-[11%]">Actual Ship</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[11px]">
                {filteredTableItems.length > 0 ? (
                  filteredTableItems.map((item, index) => {
                    const isUnderDetailing = activeCardFilter === 'under_detailing';
                    const isFabrication = activeCardFilter === 'fabrication';
                    const isSentForErection = activeCardFilter === 'sent_for_erection';

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/40 transition-colors font-medium odd:bg-white even:bg-slate-50/20">
                        <td className="px-6 py-4 font-semibold text-slate-400">{index + 1}</td>
                        <td className="px-6 py-4 font-bold text-slate-900 truncate" title={item.projectName}>
                          {item.projectName}
                        </td>
                        <td className="px-6 py-4 font-mono font-bold text-slate-700">{item.seq_no}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider rounded-full border ${
                            item.subStatus === 'Under Detailing' ? 'bg-orange-50 text-orange-600 border-orange-100' :
                            item.subStatus === 'Released for Fabrication' ? 'bg-sky-50 text-sky-600 border-sky-100' :
                            item.subStatus === 'Under Fabrication' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                            item.subStatus === 'Sent for Erection' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                            'bg-slate-50 text-slate-600 border-slate-200'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              item.subStatus === 'Under Detailing' ? 'bg-orange-500' :
                              item.subStatus === 'Released for Fabrication' ? 'bg-sky-500' :
                              item.subStatus === 'Under Fabrication' ? 'bg-blue-500' :
                              item.subStatus === 'Sent for Erection' ? 'bg-emerald-500' :
                              'bg-slate-400'
                            }`} />
                            {item.subStatus}
                          </span>
                        </td>
                        
                        {/* Dates cell highlights */}
                        <td className={`px-6 py-4 ${isUnderDetailing ? 'bg-orange-50/20 text-orange-900 font-bold border-x border-orange-100/10' : 'text-slate-600'}`}>
                          {formatDate(item.rts_date)}
                        </td>
                        <td className={`px-6 py-4 ${isUnderDetailing ? 'bg-orange-50/20 text-orange-900 font-bold border-x border-orange-100/10' : isFabrication ? 'bg-blue-50/20 text-blue-900 font-bold border-x border-blue-100/10' : 'text-slate-600'}`}>
                          {formatDate(item.actual_rts_date)}
                        </td>
                        <td className={`px-6 py-4 ${isFabrication ? 'bg-blue-50/20 text-blue-900 font-bold border-x border-blue-100/10' : 'text-slate-600'}`}>
                          {formatDate(item.ship_date)}
                        </td>
                        <td className={`px-6 py-4 ${isSentForErection ? 'bg-emerald-50/20 text-emerald-900 font-bold border-x border-emerald-100/10' : 'text-slate-600'}`}>
                          {formatDate(item.actual_ship_date)}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="8" className="px-6 py-12 text-center text-slate-400 font-bold uppercase tracking-widest text-[10px]">
                      No sequences found matching the filter or search query.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gantt Chart — Production Throughput */}
        <div className="lg:col-span-3 bg-white border border-slate-300 overflow-hidden">
          <div className="p-8 border-bottom border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.25em]">Milestone Management</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Gantt Chart • Project Timelines & Schedules</p>
            </div>
            <div className="flex items-center gap-4">

              <select
                value={fromMonth}
                onChange={(e) => setFromMonth(parseInt(e.target.value))}
                className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter border border-slate-300 px-2 py-1 outline-none bg-white cursor-pointer"
              >
                {['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'].map((m, i) => (
                  <option key={i} value={i} disabled={i > toMonth}>{m}</option>
                ))}
              </select>
              <select
                value={toMonth}
                onChange={(e) => setToMonth(parseInt(e.target.value))}
                className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter border border-slate-300 px-2 py-1 outline-none bg-white cursor-pointer"
              >
                {['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'].map((m, i) => (
                  <option key={i} value={i} disabled={i < fromMonth}>{m}</option>
                ))}
              </select>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter border border-slate-300 px-2 py-1 outline-none bg-white cursor-pointer"
              >
                {[...Array(5)].map((_, i) => {
                  const year = new Date().getFullYear() - 2 + i;
                  return <option key={year} value={year}>{year}</option>;
                })}
              </select>
              <BarChart3 className="w-5 h-5 text-slate-300" />
            </div>
          </div>

          <div className="overflow-x-auto scrollbar-thin">
            <div className="db-gantt-grid">
              {/* Header Row: Months */}
              <div
                className="db-gantt-row"
                style={{
                  gridTemplateColumns: `160px repeat(${(toMonth - fromMonth + 1) * 4}, 1fr)`
                }}
              >
                <div
                  className="db-gantt-header-cell db-gantt-pink-header flex flex-col justify-center font-bold text-slate-700"
                  style={{ padding: '6px 8px' }}
                >
                  <span>Schedule / Project</span>
                </div>

                {data.ganttData?.months?.slice(fromMonth, toMonth + 1).map((m, i) => (
                  <div
                    key={fromMonth + i}
                    className="db-gantt-header-cell text-center font-bold text-slate-700"
                    style={{ gridColumn: 'span 4', padding: '6px 0' }}
                  >
                    {m}
                  </div>
                ))}
              </div>

              {/* Header Row: Weeks */}
              {Array.from({ length: toMonth - fromMonth + 1 }).map((_, mIdx) => (
                <Fragment key={mIdx}>
                </Fragment>
              ))}

              {/* Task Rows */}
              {data.ganttData?.tasks && data.ganttData.tasks.length > 0 ? (
                data.ganttData.tasks.map((task, idx) => {
                  const totalWeeks = (toMonth - fromMonth + 1) * 4;
                  const barPosition = getWeekPositions(
                    task.startDate,
                    task.endDate,
                    task.startMonth,
                    task.duration,
                    selectedYear,
                    fromMonth,
                    toMonth
                  );

                  return (
                    <Fragment key={idx}>
                      <div
                        className={`db-gantt-row cursor-pointer transition-colors hover:bg-slate-50/50 ${expandedTaskId === task.id ? 'bg-slate-50' : ''}`}
                        onClick={() => toggleExpand(task.id)}
                        style={{
                          gridTemplateColumns: `160px repeat(${(toMonth - fromMonth + 1) * 4}, 1fr)`
                        }}
                      >
                        <div className="db-gantt-label-cell flex items-center gap-2">
                          <div className={`w-1.5 h-full absolute left-0 top-0 transition-colors ${expandedTaskId === task.id ? 'bg-amber-500' : 'bg-transparent'}`} />
                          <div className="flex flex-col">
                            <span className="truncate max-w-[160px] font-bold text-slate-800">{task.name}</span>
                          </div>
                        </div>
                        {/* Grid Cells */}
                        {Array.from({ length: totalWeeks }).map((_, colIdx) => {
                          const isFirstVisibleWeek = barPosition && colIdx === Math.floor(barPosition.startCol);

                          return (
                            <div
                              key={colIdx}
                              className="db-gantt-cell"
                              style={isFirstVisibleWeek && barPosition ? { zIndex: 12 } : undefined}
                            >
                              {/* Task Bar */}
                              {isFirstVisibleWeek && barPosition && (
                                <div
                                  className="db-gantt-bar shadow-sm"
                                  title={`${task.name} (${formatDate(task.startDate || new Date(parseInt(selectedYear), task.startMonth, 1))} - ${formatDate(task.endDate || new Date(parseInt(selectedYear), task.startMonth + task.duration, 0))})`}
                                  style={{
                                    left: `${(barPosition.startCol - Math.floor(barPosition.startCol)) * 100}%`,
                                    width: `calc(${barPosition.endCol - barPosition.startCol} * 100% + ${Math.floor(barPosition.endCol) - Math.floor(barPosition.startCol)}px)`,
                                    backgroundColor: task.color,
                                    borderLeft: `4px solid ${task.color}`,
                                    borderRight: `4px solid ${task.color}`,
                                    color: task.color,
                                    fontWeight: 800
                                  }}
                                >
                                  <span className="db-gantt-bar-details">
                                    {task.name} ({formatDate(task.startDate || new Date(parseInt(selectedYear), task.startMonth, 1))} - {formatDate(task.endDate || new Date(parseInt(selectedYear), task.startMonth + task.duration, 0))})
                                  </span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Expanded Sub-Tasks */}
                      {expandedTaskId === task.id && task.items && task.items.length > 0 && task.items.map((item, iIdx) => {
                        const subBarPosition = item.start_date && item.end_date
                          ? getWeekPositions(item.start_date, item.end_date, 0, 1, selectedYear, fromMonth, toMonth)
                          : item.ofa_date && (item.erection_date || item.rts_date)
                            ? getWeekPositions(item.ofa_date, item.erection_date || item.rts_date, 0, 1, selectedYear, fromMonth, toMonth)
                            : null;

                        return (
                          <div
                            key={`sub-${task.id}-${iIdx}`}
                            className="db-gantt-row"
                            style={{
                              gridTemplateColumns: `160px repeat(${(toMonth - fromMonth + 1) * 4}, 1fr)`
                            }}
                          >
                            <div className="db-gantt-label-cell flex items-center bg-slate-50 relative">
                              {/* Indentation line */}
                              <div className="absolute left-4 top-0 bottom-0 w-px bg-slate-300"></div>
                              {/* Horizontal connector */}
                              <div className="absolute left-4 top-1/2 w-3 h-px bg-slate-300"></div>
                              <div className="flex flex-col ml-8">
                                <span className="truncate max-w-[100px] font-bold text-slate-600 text-[11px]">{item.project_name || item.job_number}</span>
                                <span className="text-[8px] uppercase tracking-tighter text-slate-400 mt-0.5">Seq: {item.sequence_number}</span>
                              </div>
                            </div>
                            {/* Sub-task Grid Cells */}
                            {Array.from({ length: totalWeeks }).map((_, colIdx) => {
                              const isFirstVisibleWeek = subBarPosition && colIdx === Math.floor(subBarPosition.startCol);

                              return (
                                <div
                                  key={`sub-cell-${colIdx}`}
                                  className="db-gantt-cell bg-slate-50/50 border-dashed border-slate-200"
                                  style={isFirstVisibleWeek && subBarPosition ? { zIndex: 12 } : undefined}
                                >
                                  {/* Sub-task Bar */}
                                  {isFirstVisibleWeek && subBarPosition && (
                                    <div
                                      className="db-gantt-bar shadow-sm"
                                      title={item.start_date && item.end_date && item.shop_lead_time_weeks
                                        ? `${item.project_name || item.job_number} (Seq: ${item.sequence_number}) • RTS: ${formatDate(item.start_date)} • Exp. Completion: ${formatDate(item.end_date)}`
                                        : `${item.project_name || item.job_number} (Seq: ${item.sequence_number}) • OFA: ${formatDate(item.ofa_date)} • Erection/RTS: ${formatDate(item.erection_date || item.rts_date)}`
                                      }
                                      style={{
                                        left: `${(subBarPosition.startCol - Math.floor(subBarPosition.startCol)) * 100}%`,
                                        width: `calc(${subBarPosition.endCol - subBarPosition.startCol} * 100% + ${Math.floor(subBarPosition.endCol) - Math.floor(subBarPosition.startCol)}px)`,
                                        backgroundColor: task.color,
                                        borderLeft: `3px solid ${task.color}`,
                                        borderRight: `3px solid ${task.color}`,
                                        color: task.color,
                                        fontSize: '0.65rem',
                                        fontWeight: 800
                                      }}
                                    >
                                      <span className="db-gantt-bar-details">
                                        {item.start_date && item.end_date && item.shop_lead_time_weeks
                                          ? `${item.project_name || item.job_number} (Seq: ${item.sequence_number}) • RTS: ${formatDate(item.start_date)} • Exp. Completion: ${formatDate(item.end_date)}`
                                          : `${item.project_name || item.job_number} (Seq: ${item.sequence_number}) • OFA: ${formatDate(item.ofa_date)} • Erection/RTS: ${formatDate(item.erection_date || item.rts_date)}`
                                        }
                                      </span>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </Fragment>
                  );
                })
              ) : (
                <div className="flex flex-col items-center justify-center py-20 bg-slate-50/30" style={{ gridColumn: '1 / -1' }}>
                  <Clock className="w-8 h-8 text-slate-300 mb-3" />
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">No Active Projects Found</p>
                  <p className="text-[9px] text-slate-400 mt-1">Start adding projects to see the timeline</p>
                </div>
              )}
            </div>
          </div>

          <div className="p-4 bg-slate-50/50 border-t border-slate-200 flex justify-end">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">© Steel Fab Enterprises • Production Intelligence Unit</p>
          </div>
        </div>
      </div>

      {/* Activities Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bar Chart */}
        <div className="lg:col-span-2 bg-white border border-slate-300 p-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.25em]">Capacity Utilization Summary</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Capacity vs Shop</p>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={capacityMonth}
                onChange={(e) => setCapacityMonth(parseInt(e.target.value))}
                className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter border border-slate-300 px-2.5 py-1.5 outline-none bg-white cursor-pointer rounded"
              >
                {['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'].map((m, i) => (
                  <option key={i} value={i + 1}>{m}</option>
                ))}
              </select>
              <select
                value={capacityYear}
                onChange={(e) => setCapacityYear(e.target.value)}
                className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter border border-slate-300 px-2.5 py-1.5 outline-none bg-white cursor-pointer rounded"
              >
                {[...Array(5)].map((_, i) => {
                  const year = new Date().getFullYear() - 2 + i;
                  return <option key={year} value={year}>{year}</option>;
                })}
              </select>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data.barData} barGap={6}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 9, fontWeight: 800, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fontWeight: 800, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: 10, fontWeight: 900 }} />
              <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '9px', fontWeight: 800, textTransform: 'uppercase' }} />
              <Bar dataKey="capacity" name="Total Capacity / Month" fill="#1e293b" radius={0} />
              <Bar dataKey="allocated" name="Allocated Load" fill="#f59e0b" radius={0} />
              <Bar dataKey="remaining" name="Remaining Capacity" fill="#10b981" radius={0} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="space-y-6">
          {/* Recent Activity */}
          <div className="bg-white border border-slate-300 p-8">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.25em] mb-6">Operations Log</h3>
            <div className="space-y-5">
              {data.recentActivities.map((a) => (
                <div key={a.id} className="flex items-start gap-4">
                  <div className={`w-8 h-8 flex items-center justify-center shrink-0 mt-0.5 ${a.type === 'success' ? 'bg-emerald-50' : a.type === 'warning' ? 'bg-amber-50' : 'bg-slate-50'
                    }`}>
                    {a.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> :
                      a.type === 'warning' ? <AlertTriangle className="w-4 h-4 text-amber-600" /> :
                        <Clock className="w-4 h-4 text-slate-600" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-black text-slate-800 uppercase tracking-widest">{a.action}</p>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter mt-1">{a.project} · {a.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Announcements */}
          <div className="bg-white border border-slate-300 p-8">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.25em] mb-6">Internal Notices</h3>
            <div className="space-y-4">
              {(data.announcements && data.announcements.length > 0 ? data.announcements : announcements).map((a) => (
                <div
                  key={a.id}
                  className="flex items-start gap-3 cursor-pointer hover:bg-slate-50 p-1.5 -mx-1.5 rounded transition-colors"
                  onClick={() => setSelectedNotice(a)}
                  title="Click to view details"
                >
                  <div className={`w-1.5 h-1.5 mt-1.5 shrink-0 rounded-full ${a.priority === 'high' ? 'bg-red-500' : a.priority === 'medium' ? 'bg-amber-500' : 'bg-slate-400'
                    }`} />
                  <p className="text-[10px] text-slate-600 font-bold uppercase tracking-wide leading-relaxed">{a.title}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Notice Detail Modal */}
      {selectedNotice && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in"
          onClick={() => setSelectedNotice(null)}
        >
          <div
            className="bg-white border border-slate-200 rounded-2xl p-8 max-w-lg w-full mx-4 shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedNotice(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full ${selectedNotice.priority === 'high' ? 'bg-red-500' : selectedNotice.priority === 'medium' ? 'bg-amber-500' : 'bg-slate-400'}`} />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Internal Notice</span>
              </div>
              <h3 className="text-lg font-bold text-slate-800 leading-snug">{selectedNotice.title}</h3>
              <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-xl font-medium border border-slate-100 whitespace-pre-line">
                {selectedNotice.message || 'No additional details provided for this notice.'}
              </p>
              {(selectedNotice.from_date || selectedNotice.to_date) && (
                <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold pt-1">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <span>
                    Active: {selectedNotice.from_date ? formatDate(selectedNotice.from_date) : '-'} to {selectedNotice.to_date ? formatDate(selectedNotice.to_date) : '-'}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
