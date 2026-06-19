import { useState, useEffect, Fragment, useMemo, useRef } from 'react';
import {
  Users, FolderKanban, BarChart3, TrendingUp, ArrowUpRight, ArrowDownRight,
  Clock, CheckCircle2, AlertTriangle, Box, Loader2, X, Calendar, Search,
  Crown, LayoutDashboard, Scale, ChevronRight, ChevronDown
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Legend, ReferenceLine, ComposedChart, Line,
  LabelList
} from 'recharts';
import { dashboardAPI, projectAPI, scheduleAPI, priorityAPI } from '../../services/api';
import api from '../../services/api';
import VPDashboard from './VPDashboard';

/* ─────────────────────────────────────────────────────────
   STATUS CONFIG — matching existing app palette
───────────────────────────────────────────────────────── */
const S = {
  completed: { label: 'Completed', dot: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700 border-emerald-100', row: '', blink: '' },
  completed_delayed: { label: 'Completed with Delay', dot: 'bg-red-500', badge: 'bg-red-50 text-red-700 border-red-100', row: '', blink: '' },
  on_track: { label: 'On Track', dot: 'bg-blue-500', badge: 'bg-blue-50 text-blue-700 border-blue-100', row: '', blink: '' },
  light_delay: { label: 'Likely Delay', dot: 'bg-amber-500', badge: 'bg-amber-50 text-amber-700 border-amber-200', row: 'bg-amber-50/30', blink: 'animate-blink-amber' },
  delayed: { label: 'Delayed', dot: 'bg-red-500', badge: 'bg-red-50 text-red-700 border-red-100', row: 'bg-red-50/20', blink: 'animate-blink-red' },
  yet_to_start: { label: 'Yet to Start', dot: 'bg-slate-400', badge: 'bg-slate-50 text-slate-600 border-slate-200', row: '', blink: '' },
};
const STATUS_ORDER = ['yet_to_start', 'on_track', 'completed', 'delayed', 'light_delay'];

const TODAY = new Date();
const fmt = d => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

const classifyProject = (project, schedules) => {
  if (project.status === 'Completed') return 'completed';
  const seqs = schedules.filter(s => String(s.project?.id || s.project) === String(project.id));
  if (seqs.length === 0) return 'yet_to_start';

  const now = TODAY.getTime();
  let delayed = false, light = false, onTrack = false;
  for (const s of seqs) {
    if (s.is_complete || s.actual_rts_date) continue;
    const sd = s.rts_date ? new Date(s.rts_date) : null;
    if (!sd) { onTrack = true; continue; }
    const diffTime = now - sd.getTime();
    if (diffTime > 0) {
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays <= 7) light = true;
      else delayed = true;
    } else {
      onTrack = true;
    }
  }

  if (delayed) return 'delayed';
  if (light) return 'light_delay';

  const allCompleted = seqs.every(s => s.is_complete || s.actual_rts_date);
  if (allCompleted) return 'completed';

  return 'on_track';
};

const classifySeq = (seq) => {
  if (seq.is_complete) return 'completed';
  
  const plan = seq.rts_date ? new Date(seq.rts_date) : null;
  const actual = seq.actual_rts_date ? new Date(seq.actual_rts_date) : null;

  if (actual) {
    if (plan && actual > plan) {
      return 'completed_delayed';
    }
    return 'completed';
  }

  if (!plan) return 'on_track';

  const diffTime = TODAY.getTime() - plan.getTime();
  if (diffTime > 0) {
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays <= 7) return 'light_delay';
    return 'delayed';
  }
  return 'on_track';
};

const Panel = ({ children, className = '' }) => (
  <div className={`bg-white border border-slate-300 ${className}`}>{children}</div>
);

const PanelHeader = ({ title, sub, children }) => (
  <div className="p-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
    <div>
      <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.25em]">{title}</h3>
      {sub && <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">{sub}</p>}
    </div>
    {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
  </div>
);

/* ── Configs ── */

/* ─────────────────────────────────────────────────────────
   MONTH MULTI SELECT COMPONENT
   ───────────────────────────────────────────────────────── */
function MonthMultiSelect({ selectedValues, onChange, disabled }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const MONTHS = [
    { id: 'All', label: 'All' },
    { id: 'January', label: 'Jan' },
    { id: 'February', label: 'Feb' },
    { id: 'March', label: 'Mar' },
    { id: 'April', label: 'Apr' },
    { id: 'May', label: 'May' },
    { id: 'June', label: 'Jun' },
    { id: 'July', label: 'Jul' },
    { id: 'August', label: 'Aug' },
    { id: 'September', label: 'Sep' },
    { id: 'October', label: 'Oct' },
    { id: 'November', label: 'Nov' },
    { id: 'December', label: 'Dec' }
  ];

  const currentSelected = useMemo(() => {
    if (!selectedValues) return ['All'];
    return selectedValues.split(',').map(v => v.trim()).filter(Boolean);
  }, [selectedValues]);

  const displayLabel = useMemo(() => {
    if (currentSelected.includes('All')) return 'All';
    const shortNames = currentSelected.map(id => {
      const found = MONTHS.find(m => m.id === id);
      return found ? found.label : id;
    });
    if (shortNames.length > 2) {
      return `${shortNames.length} Months`;
    }
    return shortNames.join(', ');
  }, [currentSelected]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggle = (id) => {
    if (disabled) return;
    let nextSelected = [];
    if (id === 'All') {
      nextSelected = ['All'];
    } else {
      const isSelected = currentSelected.includes(id);
      const tempSelected = currentSelected.filter(item => item !== 'All');
      if (isSelected) {
        nextSelected = tempSelected.filter(item => item !== id);
      } else {
        nextSelected = [...tempSelected, id];
      }
      if (nextSelected.length === 0) {
        nextSelected = ['All'];
      }
    }
    onChange(nextSelected.join(','));
  };

  return (
    <div ref={containerRef} className="relative inline-block text-left animate-fade-in">
      <div>
        <button
          type="button"
          disabled={disabled}
          onClick={() => setIsOpen(!isOpen)}
          className="inline-flex justify-between items-center gap-1.5 w-24 text-[10px] font-bold text-slate-500 uppercase tracking-tighter border border-slate-300 px-2 py-1.5 outline-none bg-white cursor-pointer rounded disabled:bg-slate-50 disabled:cursor-not-allowed select-none transition-all duration-200 focus:border-amber-400 focus:ring-4 focus:ring-amber-500/5 hover:bg-slate-50"
        >
          <span className="truncate">{displayLabel}</span>
          <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180 text-amber-500' : ''}`} />
        </button>
      </div>

      {isOpen && (
        <div className="absolute z-50 right-0 mt-1.5 w-40 max-h-60 overflow-y-auto bg-slate-50/95 border border-slate-200/60 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.08)] backdrop-blur-sm dropdown-scrollbar py-1.5 flex flex-col gap-1">
          {MONTHS.map((opt) => {
            const isSelected = currentSelected.includes(opt.id);
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleToggle(opt.id)}
                className={`text-left px-3 py-2 mx-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-150 border outline-none flex items-center justify-between ${
                  isSelected
                    ? 'bg-amber-100/90 text-amber-800 border-amber-200/80 shadow-sm'
                    : 'bg-white text-slate-600 border-slate-100/40 hover:bg-slate-100/70 hover:text-slate-800 shadow-[0_1px_2px_rgba(0,0,0,0.02)] hover:scale-[1.01]'
                }`}
              >
                <span>{opt.label}</span>
                {isSelected && (
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 shrink-0 ml-1" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const user = JSON.parse(sessionStorage.getItem('user') || '{}');
  const isAdmin = user.role === 'admin';

  const [dashboardMode, setDashboardMode] = useState(isAdmin ? 'executive' : 'operations'); // 'operations' | 'executive'
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [tonnageYear, setTonnageYear] = useState(new Date().getFullYear().toString());
  const [includeSaturdays, setIncludeSaturdays] = useState(false);
  const [saturdaysMonth, setSaturdaysMonth] = useState('All');
  const [includeSundays, setIncludeSundays] = useState(false);
  const [sundaysMonth, setSundaysMonth] = useState('All');
  const [fromMonth, setFromMonth] = useState(0);
  const [toMonth, setToMonth] = useState(11);
  const [loading, setLoading] = useState(true);
  const [capacityMonth, setCapacityMonth] = useState(new Date().getMonth() + 1);
  const [capacityYear, setCapacityYear] = useState(new Date().getFullYear().toString());
  const [capacityView, setCapacityView] = useState('planning'); // 'planning' | 'forecast'
  const [tonnageView, setTonnageView] = useState('planning'); // 'planning' | 'forecast'
  const [data, setData] = useState({
    stats: [],
    areaData: [],
    pieData: [],
    barData: [],
    recentActivities: [],
    total_won_tonnage: 0,
    total_won_structural_tonnage: 0,
    total_won_joist_tonnage: 0
  });
  const [error, setError] = useState('');
  const [expandedTaskId, setExpandedTaskId] = useState(null);
  const [selectedNotice, setSelectedNotice] = useState(null);

  /* -- Real plan tracking state -- */
  const [projects, setProjects] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [priorityItems, setPriorityItems] = useState([]);
  const [activeCardFilter, setActiveCardFilter] = useState(null);
  const [tableSearch, setTableSearch] = useState('');

  const [activeHierarchyTab, setActiveHierarchyTab] = useState('completed');
  const [openProjects, setOpenProjects] = useState({});

  const grouped = useMemo(() => {
    const g = { delayed: [], light_delay: [], on_track: [], yet_to_start: [], completed: [] };

    // Inject is_complete from production priority items OR gantt data (ship_date)
    const enhancedSchedules = schedules.map(s => {
      const proj = projects.find(p => String(p.id) === String(s.project?.id || s.project));
      const pItem = priorityItems.find(pi => pi.job_number === proj?.code && pi.sequence_number === s.seq_no);

      let isGanttComplete = false;
      if (data?.ganttData?.tasks) {
        for (const t of data.ganttData.tasks) {
          const gItem = t.items?.find(i => i.job_number === proj?.code && String(i.sequence_number) === String(s.seq_no));
          if (gItem && gItem.ship_date) {
            isGanttComplete = true;
            break;
          }
        }
      }

      return { ...s, is_complete: pItem?.is_complete || isGanttComplete || false };
    });

    enhancedSchedules.forEach(s => {
      const status = classifySeq(s);
      const mapStatus = status === 'completed_delayed' ? 'completed' : status;
      if (g[mapStatus]) {
        g[mapStatus].push(s);
      }
    });

    // Add placeholder entries for projects that have no sequences (Yet to Start)
    const projectsWithSeqs = new Set(enhancedSchedules.map(s => String(s.project?.id || s.project)));
    projects.forEach(p => {
      if (!projectsWithSeqs.has(String(p.id))) {
        const placeholder = {
          project: p.id,
          id: `placeholder-${p.id}`,
          seq_no: null,
          item_description: '',
          rts_date: null,
          actual_rts_date: null,
          ship_date: null,
          actual_ship_date: null,
        };
        g.yet_to_start.push(placeholder);
      }
    });

    return { g, enhancedSchedules };
  }, [projects, schedules, priorityItems, data]);

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
    return `${m}-${d}-${y}`;
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
        const [statsRes, projRes, schedRes, priorityItemsRes] = await Promise.all([
          dashboardAPI.getStats({
            year: selectedYear,
            capacity_month: capacityMonth,
            capacity_year: capacityYear,
            tonnage_year: tonnageYear,
            include_saturdays: includeSaturdays,
            saturdays_month: saturdaysMonth,
            include_sundays: includeSundays,
            sundays_month: sundaysMonth
          }),
          projectAPI.getAll(),
          scheduleAPI.getAll({ page_size: 1000 }),
          api.get('/production/priority-items/', { params: { page_size: 1000 } })
        ]);
        setData(statsRes.data);

        const projData = projRes.data.results || projRes.data;
        const schedData = schedRes.data.results || schedRes.data;
        const pItemsData = priorityItemsRes.data.results || priorityItemsRes.data;
        setProjects(Array.isArray(projData) ? projData : []);
        setSchedules(Array.isArray(schedData) ? schedData : []);
        setPriorityItems(Array.isArray(pItemsData) ? pItemsData : []);
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
        setError(error.response?.data?.detail || 'Failed to connect to the server');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [selectedYear, capacityMonth, capacityYear, tonnageYear, includeSaturdays, saturdaysMonth, includeSundays, sundaysMonth]);

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

  const monthsNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const selectedMonthData = (Array.isArray(data.barData) && data.barData.length >= capacityMonth)
    ? data.barData[capacityMonth - 1]
    : null;

  const utilizationRate = selectedMonthData && selectedMonthData.capacity > 0
    ? Math.round((selectedMonthData.allocated / selectedMonthData.capacity) * 100)
    : 0;

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

  const totalAllocated = data.barData ? data.barData.reduce((acc, d) => acc + (d.total_ton || 0), 0) : 0;
  const totalWon = data.total_won_tonnage || 0;
  const tonnageDiff = totalAllocated - totalWon;
  const absTonnageDiff = Math.abs(tonnageDiff);

  const isInitialLoad = loading && projects.length === 0;

  if (isInitialLoad) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className={`space-y-6 page-enter relative ${loading ? 'opacity-75 pointer-events-none' : ''} transition-opacity duration-300`}>
      {loading && (
        <div className="fixed top-0 left-0 right-0 h-1 bg-amber-500 overflow-hidden z-[9999]">
          <div className="h-full bg-amber-600 animate-pulse w-full" />
        </div>
      )}

      {/* ─── Premium Mode Switcher ──────────────────────────── */}
      {isAdmin && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
          {/* Tab Switcher Pill */}
          <div className="relative grid grid-cols-2 bg-slate-100 rounded-2xl p-1 self-start shadow-inner w-full max-w-[420px]">
            {/* Sliding background */}
            <div
              className="absolute top-1 bottom-1 rounded-xl bg-white shadow-md transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
              style={{
                left: dashboardMode === 'executive' ? '4px' : 'calc(50% + 2px)',
                width: 'calc(50% - 6px)',
              }}
            />
            <button
              onClick={() => setDashboardMode('executive')}
              className={`relative z-10 flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.18em] transition-colors duration-200 ${
                dashboardMode === 'executive' ? 'text-slate-900' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <Crown className="w-3.5 h-3.5" />
              Bid and Estimation
            </button>
            <button
              onClick={() => setDashboardMode('operations')}
              className={`relative z-10 flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.18em] transition-colors duration-200 ${
                dashboardMode === 'operations' ? 'text-slate-900' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              Operations
            </button>
          </div>
        </div>
      )}

      {/* ─── VP Dashboard Mount ─────────────────────────────── */}
      <div className={dashboardMode === 'executive' ? 'block page-enter' : 'hidden'}>
        <VPDashboard />
      </div>

      {/* ─── Operations Dashboard ───────────────────────────── */}
      <div className={dashboardMode === 'operations' ? 'block page-enter' : 'hidden'}>
        <>
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

          {/* ══ SECTION 1 — PROJECT HEALTH HIERARCHY ════════════════════ */}
          <div className="mb-6">
            <Panel>
              <PanelHeader title="Project Health Hierarchy" sub="Status grouped by schedule adherence · Click to expand">
                <div className="flex flex-wrap items-center gap-2">
                  {STATUS_ORDER.map(sk => {
                    const c = S[sk];
                    const isActive = activeHierarchyTab === sk;
                    const seqs = grouped.g[sk] || [];

                    const inactiveCls = {
                      yet_to_start: 'bg-slate-50  border-slate-200  text-slate-500  hover:bg-slate-100',
                      on_track: 'bg-blue-50   border-blue-100   text-blue-500   hover:bg-blue-100',
                      completed: 'bg-emerald-50 border-emerald-100 text-emerald-600 hover:bg-emerald-100',
                      delayed: 'bg-red-50    border-red-100    text-red-500    hover:bg-red-100',
                      light_delay: 'bg-amber-50  border-amber-100  text-amber-600  hover:bg-amber-100',
                    }[sk] ?? 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50';

                    return (
                      <button
                        key={sk}
                        onClick={() => setActiveHierarchyTab(sk)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-[9px] font-black uppercase tracking-wider border rounded transition-all
                          ${isActive
                            ? `${c.badge} ring-2 ring-slate-800/10 scale-105 shadow-sm`
                            : inactiveCls}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${c.dot} ${c.blink}`} />
                        {c.label}
                        <span className={`ml-1 px-1.5 py-0.5 text-[8px] rounded border font-mono
                          ${isActive ? 'bg-white/60 border-current/30 text-current' : 'bg-white/80 border-slate-200 text-slate-600'}`}>
                          {seqs.length}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </PanelHeader>

              <div className="bg-slate-50/30">
                {(() => {
                  const sk = activeHierarchyTab;
                  const cfg = S[sk];
                  const seqs = grouped.g[sk] || [];

                  if (seqs.length === 0) {
                    return (
                      <p className="px-8 py-8 text-[10px] text-slate-400 font-bold uppercase tracking-widest text-center">
                        No sequences in this category.
                      </p>
                    );
                  }

                  const projsWithSeqs = {};
                  seqs.forEach(s => {
                    const pId = String(s.project?.id || s.project);
                    if (!projsWithSeqs[pId]) {
                      projsWithSeqs[pId] = { proj: projects.find(p => String(p.id) === pId), seqs: [] };
                    }
                    projsWithSeqs[pId].seqs.push(s);
                  });

                  return (
                    <div className="divide-y divide-slate-100">
                      {Object.values(projsWithSeqs).map(({ proj, seqs: projSeqs }) => {
                        if (!proj) return null;
                        const isYetToStart = activeHierarchyTab === 'yet_to_start';
                        const isOpen = !isYetToStart && openProjects[proj.id];
                        return (
                          <div key={proj.id} className="border-b border-slate-100/60 last:border-b-0">
                            {/* Project row */}
                            <div
                              onClick={() => !isYetToStart && setOpenProjects(p => ({ ...p, [proj.id]: !p[proj.id] }))}
                              className={`w-full flex items-center gap-3 px-8 py-3.5 transition-colors text-left bg-white ${isYetToStart ? '' : 'cursor-pointer hover:bg-white/60'}`}
                            >
                              <div className={`w-0.5 h-5 ${cfg.dot}`} />
                              {!isYetToStart && (
                                isOpen ? <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-[12px] font-bold text-slate-800 truncate">{proj.name}</p>
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">{proj.code} · {proj.customer_name || 'N/A'}</p>
                              </div>
                              {cfg.blink && <span className={`w-2 h-2 rounded-full ${cfg.dot} ${cfg.blink} shrink-0`} />}
                              {!isYetToStart && (
                                <span className={`text-[9px] font-black px-2 py-0.5 border rounded shrink-0 ${cfg.badge}`}>{projSeqs.length} Seq</span>
                              )}
                            </div>

                            {/* Sequence table */}
                            {isOpen && (
                              <div className="bg-white border-t border-slate-100 overflow-x-auto">
                                  <table className="w-full text-left min-w-[700px]">
                                    <thead>
                                      <tr className="bg-slate-800 text-slate-100 text-[9px] font-black uppercase tracking-wider">
                                        <th className="px-8 py-2.5">Seq No</th>
                                        <th className="px-4 py-2.5">Description</th>
                                        <th className="px-4 py-2.5 text-center">RTS Date</th>
                                        <th className="px-4 py-2.5 text-center">Act. RTS</th>
                                        <th className="px-4 py-2.5 text-center">Status</th>
                                        <th className="px-4 py-2.5 text-center">Tons</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                      {projSeqs.map(seq => {
                                        const ss = classifySeq(seq); const sc = S[ss];
                                        return (
                                          <tr key={seq.id} className={`text-[11px] font-medium hover:bg-slate-50/40 transition-colors ${sc.row}`}>
                                            <td className="px-8 py-2.5 font-mono font-bold text-slate-700">{seq.seq_no}</td>
                                            <td className="px-4 py-2.5 text-slate-600 truncate max-w-[180px]" title={seq.item_description}>{seq.item_description || '—'}</td>
                                            <td className="px-4 py-2.5 text-center text-slate-600 whitespace-nowrap">{fmt(seq.rts_date)}</td>
                                            <td className="px-4 py-2.5 text-center text-slate-600 whitespace-nowrap">{fmt(seq.actual_rts_date)}</td>
                                            <td className="px-4 py-2.5 text-center">
                                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[8px] font-black uppercase tracking-wide ${sc.badge}`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${sc.dot} ${sc.blink}`} />
                                                {sc.label}
                                              </span>
                                            </td>
                                            <td className="px-4 py-2.5 text-center text-slate-500">{parseFloat(seq.tons || 0).toFixed(1)}t</td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </Panel>
          </div>

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
                    {Array.from({ length: new Date().getFullYear() + 4 - 2012 + 1 }, (_, i) => {
                      const year = 2012 + i;
                      return <option key={year} value={year}>{year}</option>;
                    })}
                  </select>
                  <BarChart3 className="w-5 h-5 text-slate-300" />
                </div>
              </div>

              <div className="overflow-x-auto scrollbar-thin px-8 pb-4">
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
                                          title={`${item.project_name || item.job_number} (Seq: ${item.sequence_number}) • RTS: ${formatDate(item.start_date)} • Exp. Completion: ${formatDate(item.end_date)}`}
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
                                            {item.project_name || item.job_number} (Seq: {item.sequence_number}) • RTS: {formatDate(item.start_date)} • Exp. Completion: {formatDate(item.end_date)}
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

          {/* Charts Row (Parallel 50/50 Split) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Capacity Utilization Summary Card */}
            <div className="bg-white border border-slate-300 p-8 flex flex-col gap-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.25em]">Capacity Utilization Summary</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Manhours loading</p>
                </div>
                <div className="flex flex-wrap items-center gap-4">
                  {/* View Toggle Tabs */}
                  <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                    <button
                      onClick={() => setCapacityView('planning')}
                      className={`px-3 py-1.5 rounded-md text-[9px] font-black uppercase tracking-wider transition-all duration-200 ${
                        capacityView === 'planning'
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      Monthly Planning
                    </button>
                    <button
                      onClick={() => setCapacityView('forecast')}
                      className={`px-3 py-1.5 rounded-md text-[9px] font-black uppercase tracking-wider transition-all duration-200 ${
                        capacityView === 'forecast'
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      Yearly Forecast
                    </button>
                  </div>

                  <select
                    value={capacityMonth}
                    onChange={(e) => setCapacityMonth(parseInt(e.target.value))}
                    disabled={capacityView === 'forecast'}
                    className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter border border-slate-300 px-2.5 py-1.5 outline-none bg-white cursor-pointer rounded disabled:bg-slate-50 disabled:cursor-not-allowed"
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
                    {Array.from({ length: new Date().getFullYear() + 4 - 2012 + 1 }, (_, i) => {
                      const year = 2012 + i;
                      return <option key={year} value={year}>{year}</option>;
                    })}
                  </select>
                </div>
              </div>

              {/* The 5 KPI Cards inside Capacity Utilization Summary Card */}
              {selectedMonthData && (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                  {/* Card 1: Manhours Available */}
                  <div className="bg-blue-50/50 p-3 border border-blue-200 flex items-center gap-2.5">
                    <div className="w-9 h-9 bg-blue-100 flex items-center justify-center text-blue-600 rounded shrink-0">
                      <Clock className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <p className="text-[9px] font-bold text-blue-600/90 uppercase tracking-normal">Available Hours</p>
                      <h4 className="text-md font-black text-slate-800 mt-0.5">{selectedMonthData.capacity} h</h4>
                      <p className="text-[8px] text-slate-400 font-medium leading-none mt-0.5">Workforce Cap.</p>
                    </div>
                  </div>

                  {/* Card 2: Manhours Required */}
                  <div className="bg-amber-50/50 p-3 border border-amber-200 flex items-center gap-2.5">
                    <div className="w-9 h-9 bg-amber-100 flex items-center justify-center text-amber-600 rounded shrink-0">
                      <Box className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <p className="text-[9px] font-bold text-amber-600/90 uppercase tracking-normal">Required Hours</p>
                      <h4 className="text-md font-black text-slate-800 mt-0.5">{selectedMonthData.allocated} h</h4>
                      <p className="text-[8px] text-slate-400 font-medium leading-none mt-0.5">Active Load</p>
                    </div>
                  </div>

                  {/* Card 3: Surplus/Shortage */}
                  <div className={`${selectedMonthData.remaining >= 0 ? 'bg-emerald-50/50 border-emerald-200' : 'bg-rose-50/50 border-rose-200'} p-3 border flex items-center gap-2.5`}>
                    <div className={`w-9 h-9 ${selectedMonthData.remaining >= 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'} flex items-center justify-center rounded shrink-0`}>
                      {selectedMonthData.remaining >= 0 ? <CheckCircle2 className="w-4.5 h-4.5" /> : <AlertTriangle className="w-4.5 h-4.5" />}
                    </div>
                    <div>
                      <p className={`text-[9px] font-bold ${selectedMonthData.remaining >= 0 ? 'text-emerald-600/90' : 'text-rose-600/90'} uppercase tracking-normal`}>
                        {selectedMonthData.remaining >= 0 ? 'Surplus Hours' : 'Shortage Hours'}
                      </p>
                      <h4 className="text-md font-black text-slate-800 mt-0.5">{Math.abs(selectedMonthData.remaining)} h</h4>
                      <p className="text-[8px] text-slate-400 font-medium leading-none mt-0.5">
                        {selectedMonthData.remaining >= 0 ? 'Surplus' : 'Deficit'}
                      </p>
                    </div>
                  </div>

                  {/* Card 4: Capacity Utilization Gauge */}
                  <div className="bg-slate-50/50 p-3 border border-slate-200 flex items-center gap-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="relative flex items-center justify-center shrink-0">
                        <svg className="w-12 h-12 transform -rotate-90">
                          <circle cx="24" cy="24" r="20" stroke="#e2e8f0" strokeWidth="4" fill="transparent" />
                          <circle
                            cx="24"
                            cy="24"
                            r="20"
                            stroke={
                              utilizationRate === 0 ? '#94a3b8' :
                              utilizationRate <= 75 ? '#10b981' :
                              utilizationRate <= 90 ? '#6366f1' :
                              utilizationRate <= 100 ? '#f59e0b' :
                              '#ef4444'
                            }
                            strokeWidth="4"
                            fill="transparent"
                            strokeDasharray={2 * Math.PI * 20}
                            strokeDashoffset={2 * Math.PI * 20 * (1 - Math.min(utilizationRate, 100) / 100)}
                            strokeLinecap="round"
                            className="transition-all duration-500 ease-out"
                          />
                        </svg>
                        <span className="absolute text-[9px] font-black text-slate-800">{utilizationRate}%</span>
                      </div>
                      <div>
                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-normal">Capacity Util.</p>
                        <h4 className={`text-[10px] font-black uppercase tracking-normal mt-0.5 ${
                          utilizationRate === 0 ? 'text-slate-500' :
                          utilizationRate <= 75 ? 'text-emerald-600' :
                          utilizationRate <= 90 ? 'text-indigo-600' :
                          utilizationRate <= 100 ? 'text-amber-600' :
                          'text-rose-600'
                        }`}>
                          {utilizationRate === 0 ? 'No Load' :
                           utilizationRate <= 75 ? 'Underloaded' :
                           utilizationRate <= 90 ? 'Optimal' :
                           utilizationRate <= 100 ? 'High Load' :
                           'Overloaded'}
                        </h4>
                        <p className="text-[8px] text-slate-400 font-medium leading-none mt-0.5">Allocated vs Cap</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {capacityView === 'planning' ? (
                /* Recharts Stacked Chart representing the 12 months - wraps ResponsiveContainer in flex-grow div to fill the vertical space */
                <div className="flex-1 min-h-[380px] w-full relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={data.barData} barGap={6} margin={{ top: 20, right: 10, left: 10, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 800, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <YAxis domain={[0, 1500]} ticks={[0, 500, 1000, 1500, 2000]} tick={{ fontSize: 10, fontWeight: 800, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <ReferenceLine y={0} stroke="#cbd5e1" strokeWidth={1.5} />
                      <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: 10, fontWeight: 900 }} />
                      <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '9px', fontWeight: 800, textTransform: 'uppercase' }} />
                      
                      {/* Stacked Bars showing breakdown of allocated manhours */}
                      <Bar dataKey="struct_fab" stackId="required" name="Struct Fab" fill="#3b82f6" radius={0} />
                      <Bar dataKey="misc_fab" stackId="required" name="Misc Fab" fill="#8b5cf6" radius={0} />
                      <Bar dataKey="struct_erect" stackId="required" name="Struct Erect" fill="#f59e0b" radius={0} />
                      <Bar dataKey="misc_erect" stackId="required" name="Misc Erect" fill="#ec4899" radius={0} />
                      
                      {/* Available Capacity Line overlay */}
                      <Line type="monotone" dataKey="capacity" name="Available Capacity" stroke="#1e293b" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                /* Heat Map Calendar for Yearly Capacity Planning */
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 pt-2">
                  {data.barData.map((m, idx) => {
                    const mUtil = m.capacity > 0 ? Math.round((m.allocated / m.capacity) * 100) : 0;
                    
                    let themeColor = 'slate';
                    let statusLabel = 'No Load';
                    let badgeClass = 'bg-slate-50 text-slate-500 border border-slate-200';
                    let barColor = 'bg-slate-300';
                    let glowBorder = 'border-slate-200';

                    if (mUtil > 0) {
                      if (mUtil <= 75) {
                        themeColor = 'emerald';
                        statusLabel = 'Underloaded';
                        badgeClass = 'bg-emerald-50 text-emerald-600 border border-emerald-100';
                        barColor = 'bg-emerald-500';
                        glowBorder = 'border-emerald-200 shadow-[0_2px_10px_rgba(16,185,129,0.05)] hover:border-emerald-400';
                      } else if (mUtil <= 90) {
                        themeColor = 'indigo';
                        statusLabel = 'Optimal';
                        badgeClass = 'bg-indigo-50 text-indigo-600 border border-indigo-100';
                        barColor = 'bg-indigo-500';
                        glowBorder = 'border-indigo-200 shadow-[0_2px_10px_rgba(99,102,241,0.05)] hover:border-indigo-400';
                      } else if (mUtil <= 100) {
                        themeColor = 'amber';
                        statusLabel = 'High Load';
                        badgeClass = 'bg-amber-50 text-amber-600 border border-amber-100';
                        barColor = 'bg-amber-500';
                        glowBorder = 'border-amber-200 shadow-[0_2px_10px_rgba(245,158,11,0.05)] hover:border-amber-400';
                      } else {
                        themeColor = 'rose';
                        statusLabel = 'Overloaded';
                        badgeClass = 'bg-rose-50 text-rose-600 border border-rose-100';
                        barColor = 'bg-rose-500';
                        glowBorder = 'border-rose-200 shadow-[0_2px_10px_rgba(239,68,68,0.05)] hover:border-rose-400';
                      }
                    }

                    return (
                      <div
                        key={idx}
                        onClick={() => {
                          setCapacityMonth(idx + 1);
                          setCapacityView('planning');
                        }}
                        className={`bg-white border rounded-xl p-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-md cursor-pointer ${glowBorder}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-black text-slate-800 uppercase">{monthsNames[idx]}</span>
                          <span className={`text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${badgeClass}`}>
                            {statusLabel}
                          </span>
                        </div>

                        <div className="mt-3">
                          <div className="flex items-baseline justify-between text-[10px] font-black">
                            <span className="text-slate-800">{mUtil}% Loaded</span>
                            <span className="text-slate-400 font-medium">{m.allocated}h / {m.capacity}h</span>
                          </div>
                          {/* Mini Progress Bar */}
                          <div className="w-full h-1.5 bg-slate-100 rounded-full mt-1.5 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                              style={{ width: `${Math.min(mUtil, 100)}%` }}
                            />
                          </div>
                        </div>

                        <div className="mt-3 pt-2.5 border-t border-slate-100 grid grid-cols-2 gap-1 text-[9px] font-bold text-slate-400">
                          <div className="flex flex-col">
                            <span>AVAILABLE</span>
                            <span className="text-slate-700 font-mono mt-0.5">{m.capacity}h</span>
                          </div>
                          <div className="flex flex-col text-right">
                            <span>{m.remaining >= 0 ? 'SURPLUS' : 'SHORTAGE'}</span>
                            <span className={`font-mono mt-0.5 ${m.remaining >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {m.remaining >= 0 ? `+${m.remaining}h` : `${m.remaining}h`}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Tonnage Loading Summary Card */}
            <div className="bg-white border border-slate-300 p-8 flex flex-col gap-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.25em]">Tonnage Loading Summary ({tonnageYear})</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Monthly Tonnage Loading for {tonnageYear}</p>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  {/* Row 1: Checkboxes and Year Select */}
                  <div className="flex items-center gap-3 whitespace-nowrap">
                    <select
                      value={tonnageYear}
                      onChange={(e) => setTonnageYear(e.target.value)}
                      className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter border border-slate-300 px-2.5 py-1.5 outline-none bg-white cursor-pointer rounded"
                    >
                      {Array.from({ length: new Date().getFullYear() + 4 - 2012 + 1 }, (_, i) => {
                        const year = 2012 + i;
                        return <option key={year} value={year}>{year}</option>;
                      })}
                    </select>

                    <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={includeSaturdays}
                        onChange={(e) => setIncludeSaturdays(e.target.checked)}
                        className="rounded border-slate-300 text-amber-500 focus:ring-amber-500 cursor-pointer w-3.5 h-3.5"
                      />
                      Saturdays
                    </label>

                    {includeSaturdays && (
                      <MonthMultiSelect
                        selectedValues={saturdaysMonth}
                        onChange={setSaturdaysMonth}
                      />
                    )}

                    <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={includeSundays}
                        onChange={(e) => setIncludeSundays(e.target.checked)}
                        className="rounded border-slate-300 text-amber-500 focus:ring-amber-500 cursor-pointer w-3.5 h-3.5"
                      />
                      Sundays
                    </label>

                    {includeSundays && (
                      <MonthMultiSelect
                        selectedValues={sundaysMonth}
                        onChange={setSundaysMonth}
                      />
                    )}
                  </div>

                  {/* Row 2: View Toggle Tabs */}
                  <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                    <button
                      onClick={() => setTonnageView('planning')}
                      className={`px-3 py-1.5 rounded-md text-[9px] font-black uppercase tracking-wider transition-all duration-200 ${
                        tonnageView === 'planning'
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      Monthly Planning
                    </button>
                    <button
                      onClick={() => setTonnageView('forecast')}
                      className={`px-3 py-1.5 rounded-md text-[9px] font-black uppercase tracking-wider transition-all duration-200 ${
                        tonnageView === 'forecast'
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      Yearly Forecast
                    </button>
                  </div>
                </div>
              </div>

              {/* The 3 KPI Cards inside Tonnage Loading Summary Card */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Card 1: Structural Tonnage */}
                <div className="bg-blue-50/50 p-4 border border-blue-200 flex items-center gap-4">
                  <div className="w-10 h-10 bg-blue-100 flex items-center justify-center text-blue-600 rounded">
                    <Box className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-blue-600/90 uppercase tracking-wider">Structural Tonnage</p>
                    <h4 className="text-lg font-black text-slate-800 mt-0.5">
                      {data.total_won_structural_tonnage ? data.total_won_structural_tonnage.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 1 }) : '0'} Tons
                    </h4>
                    <p className="text-[9px] text-slate-400 font-medium leading-none mt-0.5">Won Projects ({tonnageYear})</p>
                  </div>
                </div>

                {/* Card 2: Joist Tonnage */}
                <div className="bg-amber-50/50 p-4 border border-amber-200 flex items-center gap-4">
                  <div className="w-10 h-10 bg-amber-100 flex items-center justify-center text-amber-600 rounded">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-amber-600/90 uppercase tracking-wider">Joist Tonnage</p>
                    <h4 className="text-lg font-black text-slate-800 mt-0.5">
                      {data.total_won_joist_tonnage ? data.total_won_joist_tonnage.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 1 }) : '0'} Tons
                    </h4>
                    <p className="text-[9px] text-slate-400 font-medium leading-none mt-0.5">Won Projects ({tonnageYear})</p>
                  </div>
                </div>

                {/* Card 3: Total Tonnage */}
                <div className="bg-violet-50/50 p-4 border border-violet-200 flex items-center gap-4">
                  <div className="w-10 h-10 bg-violet-100 flex items-center justify-center text-violet-600 rounded">
                    <Scale className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-violet-600/90 uppercase tracking-wider">Total Tonnage</p>
                    <h4 className="text-lg font-black text-slate-800 mt-0.5">
                      {data.total_won_tonnage ? data.total_won_tonnage.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 1 }) : '0'} Tons
                    </h4>
                    <p className="text-[9px] text-slate-400 font-medium leading-none mt-0.5">Won Projects ({tonnageYear})</p>
                  </div>
                </div>
              </div>

              {tonnageView === 'planning' ? (
                <div className="flex-1 min-h-[380px] w-full relative">
                  {/* Floating Tonnage Variance (Surplus / Deficit) Indicator */}
                  {data.barData && data.barData.length > 0 && (
                    <div className="absolute top-1 right-2 z-10">

                    </div>
                  )}
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={data.barData} barGap={6} margin={{ top: 20, right: 10, left: 10, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 800, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fontWeight: 800, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <ReferenceLine y={0} stroke="#cbd5e1" strokeWidth={1.5} />
                      <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: 10, fontWeight: 900 }} />
                      <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '9px', fontWeight: 800, textTransform: 'uppercase' }} />
                      
                      {/* Total Tonnage Bar */}
                      <Bar dataKey="total_ton" name="Planned Capacity" fill="#6366f1" radius={0}>
                        <LabelList dataKey="total_ton" position="top" formatter={(val) => val > 0 ? val.toLocaleString(undefined, { maximumFractionDigits: 1 }) : ''} style={{ fontSize: 9, fontWeight: 800, fill: '#6366f1' }} />
                      </Bar>
                      {/* Capacity Line (Black Dot Thread) */}
                      <Line type="monotone" dataKey="tonnage_capacity" name="Available Capacity" stroke="#000000" strokeWidth={2} dot={{ r: 4, fill: '#000000', stroke: '#000000' }} activeDot={{ r: 6 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                /* Heat Map Calendar for Yearly Tonnage Loading Planning */
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 pt-2">
                  {data.barData && data.barData.map((m, idx) => {
                    const mUtil = m.tonnage_capacity > 0 ? Math.round((m.total_ton / m.tonnage_capacity) * 100) : (m.total_ton > 0 ? 101 : 0);
                    
                    let themeColor = 'slate';
                    let statusLabel = 'No Load';
                    let badgeClass = 'bg-slate-50 text-slate-500 border border-slate-200';
                    let barColor = 'bg-slate-300';
                    let glowBorder = 'border-slate-200';

                    if (mUtil > 0) {
                      if (mUtil <= 75) {
                        themeColor = 'emerald';
                        statusLabel = 'Underloaded';
                        badgeClass = 'bg-emerald-50 text-emerald-600 border border-emerald-100';
                        barColor = 'bg-emerald-500';
                        glowBorder = 'border-emerald-200 shadow-[0_2px_10px_rgba(16,185,129,0.05)] hover:border-emerald-400';
                      } else if (mUtil <= 90) {
                        themeColor = 'indigo';
                        statusLabel = 'Optimal';
                        badgeClass = 'bg-indigo-50 text-indigo-600 border border-indigo-100';
                        barColor = 'bg-indigo-500';
                        glowBorder = 'border-indigo-200 shadow-[0_2px_10px_rgba(99,102,241,0.05)] hover:border-indigo-400';
                      } else if (mUtil <= 100) {
                        themeColor = 'amber';
                        statusLabel = 'High Load';
                        badgeClass = 'bg-amber-50 text-amber-600 border border-amber-100';
                        barColor = 'bg-amber-500';
                        glowBorder = 'border-amber-200 shadow-[0_2px_10px_rgba(245,158,11,0.05)] hover:border-amber-400';
                      } else {
                        themeColor = 'rose';
                        statusLabel = 'Overloaded';
                        badgeClass = 'bg-rose-50 text-rose-600 border border-rose-100';
                        barColor = 'bg-rose-500';
                        glowBorder = 'border-rose-200 shadow-[0_2px_10px_rgba(239,68,68,0.05)] hover:border-rose-400';
                      }
                    }

                    const remaining = m.tonnage_capacity - m.total_ton;
                    const absRemaining = Math.abs(remaining).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 1 });

                    return (
                      <div
                        key={idx}
                        onClick={() => {
                          setSaturdaysMonth(monthsNames[idx]);
                          setIncludeSaturdays(true);
                          setTonnageView('planning');
                        }}
                        className={`bg-white border rounded-xl p-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-md cursor-pointer ${glowBorder}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-black text-slate-800 uppercase">{monthsNames[idx]}</span>
                          <span className={`text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${badgeClass}`}>
                            {statusLabel}
                          </span>
                        </div>

                        <div className="mt-3">
                          <div className="flex items-baseline justify-between text-[10px] font-black">
                            <span className="text-slate-800">{mUtil}% Loaded</span>
                            <span className="text-slate-400 font-medium">
                              {m.total_ton.toLocaleString(undefined, { maximumFractionDigits: 1 })}t / {m.tonnage_capacity.toLocaleString(undefined, { maximumFractionDigits: 1 })}t
                            </span>
                          </div>
                          {/* Mini Progress Bar */}
                          <div className="w-full h-1.5 bg-slate-100 rounded-full mt-1.5 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                              style={{ width: `${Math.min(mUtil, 100)}%` }}
                            />
                          </div>
                        </div>

                        <div className="mt-3 pt-2.5 border-t border-slate-100 grid grid-cols-2 gap-1 text-[9px] font-bold text-slate-400">
                          <div className="flex flex-col">
                            <span>AVAILABLE</span>
                            <span className="text-slate-700 font-mono mt-0.5">
                              {m.tonnage_capacity.toLocaleString(undefined, { maximumFractionDigits: 1 })} Tons
                            </span>
                          </div>
                          <div className="flex flex-col text-right">
                            <span>{remaining >= 0 ? 'SURPLUS' : 'SHORTAGE'}</span>
                            <span className={`font-mono mt-0.5 ${remaining >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {remaining >= 0 ? `+${absRemaining}t` : `-${absRemaining}t`}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Logs & Notices Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recent Activity */}
            <div className="lg:col-span-2 bg-white border border-slate-300 p-8">
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
                {data.announcements && data.announcements.length > 0 ? (
                  data.announcements.map((a) => (
                    <div
                      key={a.id}
                      className="flex items-start gap-3 cursor-pointer hover:bg-slate-50 p-1.5 -mx-1.5 rounded transition-colors"
                      onClick={() => setSelectedNotice(a)}
                      title="Click to view details"
                    >
                      <div className={`w-1.5 h-1.5 mt-1.5 shrink-0 rounded-full ${
                        a.priority === 'high' ? 'bg-red-500' :
                        a.priority === 'medium' ? 'bg-amber-500' :
                        'bg-slate-400'
                      }`} />
                      <p className="text-[10px] text-slate-600 font-bold uppercase tracking-wide leading-relaxed">{a.title}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider text-center py-4">No active notices</p>
                )}
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
        </>
      </div>
    </div>
  );
}
