import { useState, useEffect, useMemo } from 'react';
import {
  Trophy, TrendingUp, AlertTriangle, CheckCircle2, Clock,
  ChevronDown, ChevronRight, Zap, Calendar, BarChart3,
  Activity, Target, Briefcase, Star, Bell, RefreshCw,
  Lightbulb, Info, Loader2
} from 'lucide-react';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, ReferenceLine, LabelList
} from 'recharts';
import { dashboardAPI, projectAPI, scheduleAPI, rfqAPI, manpowerAPI, capacityAPI } from '../../services/api';

/* ─────────────────────────────────────────────────────────
   CONSTANTS & HELPERS
───────────────────────────────────────────────────────── */
const TODAY = new Date();
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS_SHORT = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const fmt = (d) => {
  if (!d) return '—';
  const dt = new Date(d);
  if (isNaN(dt)) return '—';
  return `${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}-${dt.getFullYear()}`;
};

const fmtMoney = (v) => {
  const n = parseFloat(v) || 0;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
};

const parseMonthYear = (str) => {
  if (!str) return null;
  if (str.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const parts = str.split('-');
    return { month: parseInt(parts[1]) - 1, year: parseInt(parts[0]) };
  }
  const lower = str.toLowerCase().trim();
  let month = null;
  for (let i = 0; i < MONTHS_FULL.length; i++) {
    if (lower.startsWith(MONTHS_FULL[i].slice(0, 3).toLowerCase())) { month = i; break; }
  }
  const ym = str.match(/\d{4}|\d{2}/);
  if (!ym || month === null) return null;
  const y = parseInt(ym[0]);
  return { month, year: y < 100 ? 2000 + y : y };
};

/* Classify project delay based on its sequences */
const classifyProject = (project, schedules) => {
  if (project.status === 'Completed') return 'completed';
  const seqs = schedules.filter(s => String(s.project?.id || s.project) === String(project.id));
  if (seqs.length === 0) return 'yet_to_start';

  const now = TODAY.getTime();
  let delayed = false, light = false, onTrack = false;
  for (const s of seqs) {
    if (s.actual_rts_date) continue;
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

  const allCompleted = seqs.every(s => s.actual_rts_date);
  if (allCompleted) return 'completed';

  return 'on_track';
};

const classifySeq = (seq) => {
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

/* ─────────────────────────────────────────────────────────
   TOOLTIP
───────────────────────────────────────────────────────── */
const ChartTooltip = ({ active, payload, label, isValue }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded px-3 py-2 shadow-lg text-[10px]">
      <p className="font-black text-slate-500 uppercase tracking-widest mb-1.5">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 mb-0.5">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color }} />
          <span className="font-bold text-slate-600">{p.name}:</span>
          <span className="font-black text-slate-900">
            {isValue
              ? (typeof p.value === 'number' && p.value > 999 ? fmtMoney(p.value) : p.value)
              : (typeof p.value === 'number' ? p.value.toLocaleString() : p.value)
            }
          </span>
        </div>
      ))}
    </div>
  );
};

/* ─────────────────────────────────────────────────────────
   PANEL WRAPPER — matches Operations dashboard card style
───────────────────────────────────────────────────────── */
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

/* Toggle button pair matching the existing selects/buttons in the app */
const ToggleGroup = ({ options, value, onChange }) => (
  <div className="flex border border-slate-300 rounded overflow-hidden">
    {options.map(([k, lbl]) => (
      <button key={k} onClick={() => onChange(k)}
        className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-widest transition-colors border-r border-slate-300 last:border-r-0
          ${value === k ? 'bg-slate-800 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}>
        {lbl}
      </button>
    ))}
  </div>
);



/* ─────────────────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────────────────── */
export default function VPDashboard() {
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [bids, setBids] = useState([]);
  const [manpower, setManpower] = useState([]);
  const [capData, setCapData] = useState([]);

  /* Hierarchy */
  const [activeHierarchyTab, setActiveHierarchyTab] = useState('completed');
  const [openProjects, setOpenProjects] = useState({});

  /* Bid chart */
  const [bidView, setBidView] = useState('yoy');
  const [bidMetric, setBidMetric] = useState('value');
  const [bidYear, setBidYear] = useState(TODAY.getFullYear());

  /* Capacity */
  const [capMonth, setCapMonth] = useState(TODAY.getMonth());
  const [capYear, setCapYear] = useState(TODAY.getFullYear());

  /* Activity Feed Filter ('yesterday' | 'today' | 'tomorrow') */
  const [feedFilter, setFeedFilter] = useState('today');

  /* ── Fetch ── */
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [a, b, c, d, e] = await Promise.allSettled([
          projectAPI.getAll(),
          scheduleAPI.getAll({ page_size: 1000 }),
          rfqAPI.getAll(),
          manpowerAPI.getAll(),
          capacityAPI.getAll(),
        ]);
        const safe = r => r.status === 'fulfilled' ? (r.value?.data?.results || r.value?.data || []) : [];

        const projData = Array.isArray(safe(a)) ? safe(a) : [];
        const schedData = Array.isArray(safe(b)) ? safe(b) : [];
        const bidsData = Array.isArray(safe(c)) ? safe(c) : [];
        const manData = Array.isArray(safe(d)) ? safe(d) : [];
        const capRaw = Array.isArray(safe(e)) ? safe(e) : [];

        setProjects(projData);
        setSchedules(schedData);
        setBids(bidsData);
        setManpower(manData);
        setCapData(capRaw);
      } catch (e) {
        console.error(e);
        setProjects([]);
        setSchedules([]);
        setBids([]);
        setManpower([]);
        setCapData([]);
      }
      finally { setLoading(false); }
    })();
  }, []);

  const [dashboardStats, setDashboardStats] = useState(null);
  useEffect(() => {
    (async () => {
      try {
        const res = await dashboardAPI.getStats({ capacity_year: capYear.toString() });
        setDashboardStats(res.data);
      } catch (err) {
        console.error(err);
      }
    })();
  }, [capYear]);


  /* ── Derived ── */
  const wonBids = useMemo(() => bids.filter(b => b.won_lost === 'Won'), [bids]);
  const wonBidsCurrentYear = useMemo(() => {
    const curYear = TODAY.getFullYear();
    return wonBids.filter(b => {
      const dt = new Date(b.awarded_job_date || b.created_at);
      return dt.getFullYear() === curYear;
    });
  }, [wonBids]);
  const wonBidsCurrentYearValue = useMemo(() => {
    return wonBidsCurrentYear.reduce((s, b) => s + parseFloat(b.awarded_amount || b.bid_amount || 0), 0);
  }, [wonBidsCurrentYear]);
  const latestWins = useMemo(() => {
    return wonBids.filter(b => {
      const dt = new Date(b.awarded_job_date || b.created_at);
      return dt.getFullYear() === bidYear;
    }).sort((a, b) => new Date(b.awarded_job_date || b.created_at) - new Date(a.awarded_job_date || a.created_at)).slice(0, 6);
  }, [wonBids, bidYear]);

  const latestQuotes = useMemo(() => {
    return [...bids].sort((a, b) => new Date(b.quote_date || b.created_at) - new Date(a.quote_date || a.created_at)).slice(0, 8);
  }, [bids]);

  const kpi = useMemo(() => {
    const pending = bids.filter(b => b.won_lost === 'Pending');
    const atRisk = projects.filter(p => { const s = classifyProject(p, schedules); return s === 'delayed' || s === 'light_delay'; }).length;
    const health = projects.length > 0 ? Math.round(((projects.length - atRisk) / projects.length) * 100) : 100;
    const winRate = bids.length > 0 ? Math.round((wonBids.length / bids.length) * 100) : 0;
    return {
      won: wonBids.length,
      health, atRisk,
      pipeline: pending.reduce((s, b) => s + parseFloat(b.bid_amount || 0), 0),
      winRate,
    };
  }, [bids, wonBids, projects, schedules]);

  const grouped = useMemo(() => {
    const g = { delayed: [], light_delay: [], on_track: [], yet_to_start: [], completed: [] };
    projects.forEach(p => g[classifyProject(p, schedules)].push(p));
    return g;
  }, [projects, schedules]);

  /* Bid chart */
  const bidChart = useMemo(() => {
    if (bidView === 'yoy') {
      const m = {};
      bids.forEach(b => {
        const yr = new Date(b.awarded_job_date || b.created_at).getFullYear();
        if (!m[yr]) m[yr] = { year: String(yr), quoted: 0, won: 0, quotedCount: 0, wonCount: 0 };
        m[yr].quoted += parseFloat(b.bid_amount || 0);
        m[yr].quotedCount += 1;
        if (b.won_lost === 'Won') { m[yr].won += parseFloat(b.awarded_amount || b.bid_amount || 0); m[yr].wonCount += 1; }
      });
      return Object.values(m).sort((a, b) => a.year - b.year).slice(-6);
    }
    const rows = MONTHS.map(m => ({ month: m, quoted: 0, won: 0, quotedCount: 0, wonCount: 0 }));
    bids.forEach(b => {
      const dt = new Date(b.awarded_job_date || b.created_at);
      if (dt.getFullYear() !== bidYear) return;
      const mi = dt.getMonth();
      rows[mi].quoted += parseFloat(b.bid_amount || 0); rows[mi].quotedCount += 1;
      if (b.won_lost === 'Won') { rows[mi].won += parseFloat(b.awarded_amount || b.bid_amount || 0); rows[mi].wonCount += 1; }
    });
    return rows;
  }, [bids, bidView, bidYear]);

  /* Bid chart dynamic ticks and domain */
  const { bidTicks, bidDomain } = useMemo(() => {
    const key = bidMetric === 'value' ? 'quoted' : 'quotedCount';
    let maxVal = 0;
    bidChart.forEach(item => {
      const val = parseFloat(item[key]) || 0;
      if (val > maxVal) maxVal = val;
    });

    if (maxVal === 0) {
      if (bidMetric === 'value') {
        return { bidTicks: [0, 1_000_000], bidDomain: [0, 1_000_000] };
      } else {
        return { bidTicks: [0, 5], bidDomain: [0, 5] };
      }
    }

    let step;
    if (bidMetric === 'value') {
      const targetTicks = 5;
      const rawStep = maxVal / targetTicks;
      const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
      const normalized = rawStep / magnitude;
      
      let niceStep;
      if (normalized < 1.5) niceStep = 1;
      else if (normalized < 2.5) niceStep = 2;
      else if (normalized < 5) niceStep = 5;
      else niceStep = 10;
      
      step = niceStep * magnitude;
      if (step < 10_000) step = 10_000;
    } else {
      const targetTicks = 5;
      const rawStep = maxVal / targetTicks;
      const magnitude = Math.pow(10, Math.max(0, Math.floor(Math.log10(rawStep))));
      const normalized = rawStep / magnitude;
      
      let niceStep;
      if (normalized < 1.5) niceStep = 1;
      else if (normalized < 2.5) niceStep = 2;
      else if (normalized < 5) niceStep = 5;
      else niceStep = 10;
      
      step = Math.max(1, niceStep * magnitude);
    }

    const ticks = [0];
    let current = 0;
    while (current < maxVal) {
      current += step;
      ticks.push(current);
    }
    if (current - maxVal < step * 0.1) {
      current += step;
      ticks.push(current);
    }
    return { bidTicks: ticks, bidDomain: [0, current] };
  }, [bidChart, bidMetric]);

  /* Capacity chart */
  const capChart = useMemo(() => {
    const rows = MONTHS.map(m => ({ month: m, required: 0, available: 0 }));
    wonBids.forEach(b => {
      const p = parseMonthYear(b.struct_fab_start_month);
      if (!p || p.year !== capYear) return;
      const hrs = parseFloat(b.struct_fab_hours || 0);
      const dur = Math.max(1, parseInt(b.struct_fab_duration_months || 1));
      for (let d = 0; d < dur; d++) rows[(p.month + d) % 12].required += hrs / dur;
    });
    manpower.forEach(mp => {
      const mi = MONTHS_FULL.findIndex(m => m.toLowerCase() === (mp.month || '').toLowerCase());
      if (mi < 0) return;
      rows[mi].available += parseFloat(mp.manhours || 8) * 22;
    });
    capData.forEach(cap => {
      const monthly = parseFloat(cap.capacity_per_day || 0) * 22 / 12;
      rows.forEach(r => r.available += monthly);
    });
    return rows.map(r => ({ ...r, required: Math.round(r.required), available: Math.round(r.available), balance: Math.round(r.available - r.required) }));
  }, [wonBids, manpower, capData, capYear]);

  const aiInsight = useMemo(() => {
    if (!dashboardStats || !dashboardStats.barData || dashboardStats.barData.length <= capMonth) return null;
    const d = dashboardStats.barData[capMonth];
    const available = d.capacity || 0;
    const required = d.allocated || 0;
    const balance = d.remaining || 0;

    const pct = available > 0 ? Math.round((required / available) * 100) : 0;
    const actions = [];
    if (balance < 0) {
      actions.push({ sev: 'critical', text: `Deficit of ${Math.abs(balance).toLocaleString()} hrs in ${MONTHS[capMonth]}. Subcontracting recommended.` });
      actions.push({ sev: 'warning', text: 'Authorize overtime — 2 hrs/day recovers ~10% of deficit.' });
      actions.push({ sev: 'info', text: 'Outsource detailing for non-critical sequences to free shop floor.' });
    } else if (balance < available * 0.15) {
      actions.push({ sev: 'warning', text: `Thin surplus of ${balance.toLocaleString()} hrs in ${MONTHS[capMonth]}. Monitor load closely.` });
      actions.push({ sev: 'info', text: 'Spread sequence scheduling to reduce peak demand this month.' });
    } else {
      actions.push({ sev: 'success', text: `Surplus of ${balance.toLocaleString()} hrs in ${MONTHS[capMonth]}. Capacity available for new bids.` });
      actions.push({ sev: 'info', text: 'Accelerate delayed sequences using spare capacity.' });
      actions.push({ sev: 'info', text: 'Allocate surplus to preventive maintenance or skills training.' });
    }
    return { required, available, balance, pct, actions };
  }, [dashboardStats, capMonth]);

  /* Calendar events */
  const calEvents = useMemo(() => {
    const ev = {};
    const add = (dt, e) => {
      if (!dt) return; const d = new Date(dt); if (isNaN(d)) return;
      const k = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      ev[k] = (ev[k] || []); ev[k].push(e);
    };
    bids.forEach(b => {
      add(b.bid_due_date, {
        type: 'bid_due',
        label: `Bid Due: ${b.project_name || b.quote_no}`,
        projectCode: b.quote_no || 'N/A',
        details: `Bid Amount: ${fmtMoney(b.bid_amount)} · Status: ${b.won_lost}`,
        extra: `Expected Start: ${b.struct_fab_start_month || 'N/A'}`
      });
      add(b.quote_date, {
        type: 'quote_date',
        label: `Quote Submitted: ${b.project_name || b.quote_no}`,
        projectCode: b.quote_no || 'N/A',
        details: `Bid Amount: ${fmtMoney(b.bid_amount)} · Primary Estimator: ${b.primary_estimator_initials || 'N/A'}`,
        extra: `Status: ${b.won_lost}`
      });
      add(b.awarded_job_date, {
        type: 'awarded_date',
        label: `Bid Awarded: ${b.project_name || b.quote_no}`,
        projectCode: b.quote_no || 'N/A',
        details: `Awarded Amount: ${fmtMoney(b.awarded_amount)} · SFE Job No: ${b.sfe_job_no || 'N/A'}`,
        extra: `Awarded`
      });
      add(b.fab_start_date || b.fabrication_start_date, {
        type: 'fab_start',
        label: `Fabrication Start: ${b.project_name || b.quote_no}`,
        projectCode: b.quote_no || 'N/A',
        details: `SFE Job No: ${b.sfe_job_no || 'N/A'}`,
        extra: `Fab Start`
      });
    });
    return ev;
  }, [bids]);

  // Selected date based on feedFilter
  const activeDate = useMemo(() => {
    const d = new Date(TODAY);
    if (feedFilter === 'yesterday') d.setDate(TODAY.getDate() - 1);
    if (feedFilter === 'tomorrow') d.setDate(TODAY.getDate() + 1);
    return d;
  }, [feedFilter]);

  const activeDateKey = useMemo(() => {
    return `${activeDate.getFullYear()}-${activeDate.getMonth()}-${activeDate.getDate()}`;
  }, [activeDate]);

  const dayEvents = useMemo(() => calEvents[activeDateKey] || [], [calEvents, activeDateKey]);

  // Overall monthly stats (for the current month)
  const monthEventCounts = useMemo(() => {
    const c = { bid_due: 0, quote_date: 0, awarded_date: 0, fab_start: 0 };
    const curYear = TODAY.getFullYear();
    const curMonth = TODAY.getMonth();
    Object.entries(calEvents).forEach(([k, arr]) => {
      const [y, m] = k.split('-').map(Number);
      if (y === curYear && m === curMonth) arr.forEach(e => c[e.type] = (c[e.type] || 0) + 1);
    });
    return c;
  }, [calEvents]);

  /* ── Event type style ── */
  const EVT = {
    bid_due: { label: 'Bid Due Date', dot: 'bg-red-500', badge: 'bg-red-50 text-red-700 border border-red-100' },
    quote_date: { label: 'Quote Submitted Date', dot: 'bg-rose-500', badge: 'bg-rose-50 text-rose-700 border border-rose-100' },
    awarded_date: { label: 'Awarded Date', dot: 'bg-yellow-600', badge: 'bg-yellow-50 text-yellow-750 border border-yellow-200' },
    fab_start: { label: 'Fab Start Date', dot: 'bg-fuchsia-500', badge: 'bg-fuchsia-50 text-fuchsia-700 border border-fuchsia-100' },
  };

  /* ── Loading ── */
  const isInitialLoad = loading && projects.length === 0;

  if (isInitialLoad) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-7 h-7 text-amber-500 animate-spin" />
    </div>
  );

  /* ────────────────────────────────────────────────────────
     RENDER
  ──────────────────────────────────────────────────────── */
  return (
    <div className={`space-y-6 page-enter relative ${loading ? 'opacity-75 pointer-events-none' : ''} transition-opacity duration-300`}>
      {loading && (
        <div className="fixed top-0 left-0 right-0 h-1 bg-amber-500 overflow-hidden z-[9999]">
          <div className="h-full bg-amber-600 animate-pulse w-full" />
        </div>
      )}



      {/* ══ ANNOUNCEMENT BAR — Latest Quotes ══════════════════ */}
      {latestQuotes.length > 0 && (
        <div className="flex items-center border border-slate-300 bg-white overflow-hidden mt-2">
          <div className="shrink-0 flex items-center gap-2 px-4 py-2.5 bg-sky-500">
            <Target className="w-3.5 h-3.5 text-white" />
            <span className="text-[9px] font-black text-white uppercase tracking-[0.25em] whitespace-nowrap">Latest Quotes</span>
          </div>
          <div className="overflow-hidden flex-1 border-l border-slate-300">
            <div className="animate-marquee whitespace-nowrap" style={{ animationDirection: 'reverse' }}>
              {[...latestQuotes, ...latestQuotes].map((b, i) => (
                <span key={i} className="inline-flex items-center gap-2 mx-8">
                  <Target className="w-3 h-3 text-sky-500 shrink-0" />
                  <span className="text-[11px] font-bold text-slate-800">{b.project_name || b.quote_no}</span>
                  {b.bid_amount > 0 && <span className="text-[10px] font-black text-sky-600">· {fmtMoney(b.bid_amount)}</span>}
                  {b.quote_date && <span className="text-[9px] text-slate-400">Quoted {fmt(b.quote_date)}</span>}
                  <span className="text-slate-300 mx-2">|</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      )}




      {/* ══ SECTION 2 — DAILY ACTIVITY FEED ═══════════════ */}
      <Panel>
        <PanelHeader
          title="Daily Activity Feed"
          sub={`${feedFilter.charAt(0).toUpperCase() + feedFilter.slice(1)} · ${activeDate.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}`}>
          <ToggleGroup
            options={[
              ['yesterday', 'Yesterday'],
              ['today', 'Today'],
              ['tomorrow', 'Tomorrow']
            ]}
            value={feedFilter}
            onChange={setFeedFilter}
          />
        </PanelHeader>

        <div className="p-6 space-y-6">
          {/* Day events list */}
          {dayEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 border border-dashed border-slate-200 bg-slate-50/50 rounded-xl">
              <Calendar className="w-8 h-8 text-slate-300" />
              <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">No activities scheduled for this day</p>
              <p className="text-[10px] text-slate-400 font-bold">Everything is clear for this selected timeline.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {dayEvents.map((ev, i) => {
                const tc = EVT[ev.type] || EVT.rts;

                // Select custom Lucide icon based on type
                let IconComponent = Clock;
                if (ev.type === 'bid_due' || ev.type === 'quote_date' || ev.type === 'ofa_sched' || ev.type === 'bfa_sched' || ev.type === 'field_measure') {
                  IconComponent = Target;
                } else if (ev.type === 'ship' || ev.type === 'ship_act' || ev.type === 'rts_act' || ev.type === 'contract') {
                  IconComponent = CheckCircle2;
                } else if (ev.type === 'erection' || ev.type === 'erection_sched' || ev.type === 'fab_start') {
                  IconComponent = TrendingUp;
                } else if (ev.type === 'awarded_date') {
                  IconComponent = Trophy;
                }

                return (
                  <div key={i} className={`flex items-start gap-4 p-4 border rounded-xl shadow-[0_2px_10px_rgba(0,0,0,0.01)] hover:shadow-md transition-shadow duration-200 bg-white border-l-4 ${ev.type === 'bid_due' ? 'border-l-red-500' :
                      ev.type === 'quote_date' ? 'border-l-rose-500' :
                        ev.type === 'awarded_date' ? 'border-l-yellow-500' :
                          ev.type === 'fab_start' ? 'border-l-fuchsia-500' :
                            'border-l-amber-500'
                    }`}>
                    {/* Left Icon */}
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${tc.badge}`}>
                      <IconComponent className="w-4 h-4" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 font-mono">
                          {ev.projectCode}
                        </span>
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wide border ${tc.badge}`}>
                          {tc.label}
                        </span>
                      </div>
                      <p className="text-[12px] font-black text-slate-800 mt-1 truncate" title={ev.label}>
                        {ev.label}
                      </p>
                      <p className="text-[10px] font-medium text-slate-500 mt-1.5 line-clamp-2">
                        {ev.details}
                      </p>
                    </div>

                    {/* Right Extra metrics */}
                    <div className="shrink-0 text-right self-center pl-2">
                      <span className="inline-block px-2.5 py-1 text-[9px] font-black uppercase tracking-wider bg-slate-100 border border-slate-200 text-slate-600 rounded">
                        {ev.extra}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Legend and stats */}
          <div className="pt-6 border-t border-slate-200">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              {/* Legend */}
              <div className="flex flex-wrap gap-4">
                {Object.entries(EVT).map(([k, v]) => (
                  <div key={k} className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${v.dot}`} />
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">{v.label}</span>
                  </div>
                ))}
              </div>
              {/* Monthly summary */}
              <div className="flex flex-wrap items-center gap-3 text-[9px] font-black uppercase tracking-widest text-slate-500">
                <span className="whitespace-nowrap">{MONTHS_FULL[TODAY.getMonth()]} {TODAY.getFullYear()} Target Summary:</span>
                {Object.entries(EVT).map(([k, v]) => (
                  <span key={k} className="flex items-center gap-1">
                    <span className={`w-2 h-2 rounded-full ${v.dot}`} />
                    <span className="whitespace-nowrap">{v.label.split(' ')[0]}s: {monthEventCounts[k] || 0}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Panel>

      {/* ══ SECTION 3 — BID PERFORMANCE ══════════════════════ */}
      <Panel>
        <PanelHeader title="Bid Performance Analytics" sub="Total Quoted vs Won">
          <ToggleGroup options={[['yoy', 'Year-on-Year'], ['mom', 'Month-on-Month']]} value={bidView} onChange={setBidView} />
          <ToggleGroup options={[['value', 'Revenue $'], ['count', 'Count']]} value={bidMetric} onChange={setBidMetric} />
          {bidView === 'mom' && (
            <select value={bidYear} onChange={e => setBidYear(parseInt(e.target.value))}
              className="text-[9px] font-black uppercase tracking-wider border border-slate-300 px-2 py-1.5 bg-white outline-none text-slate-600 cursor-pointer">
              {Array.from({ length: TODAY.getFullYear() + 4 - 2012 + 1 }, (_, i) => {
                const y = 2012 + i;
                return <option key={y} value={y}>{y}</option>;
              })}
            </select>
          )}
        </PanelHeader>

        <div className="p-6">
          {/* Summary pills */}
          <div className="flex flex-wrap gap-2 mb-6">
            {[
              { label: 'Total', value: bids.length, cls: 'bg-slate-100 text-slate-700' },
              { label: 'Won', value: wonBids.length, cls: 'bg-emerald-50 text-emerald-700 border border-emerald-100' },
              { label: `Won (${TODAY.getFullYear()})`, value: `${wonBidsCurrentYear.length} (${fmtMoney(wonBidsCurrentYearValue)})`, cls: 'bg-emerald-50 text-emerald-700 border border-emerald-100 font-bold' },
              { label: 'Lost', value: bids.filter(b => b.won_lost === 'Lost').length, cls: 'bg-red-50 text-red-700 border border-red-100' },
              { label: 'Pending', value: bids.filter(b => b.won_lost === 'Pending').length, cls: 'bg-amber-50 text-amber-700 border border-amber-100' },
            ].map((p, i) => (
              <span key={i} className={`flex items-center gap-2 px-3 py-1.5 text-[10px] font-black uppercase tracking-wide rounded ${p.cls}`}>
                {p.label}: <span className="text-sm font-black">{p.value}</span>
              </span>
            ))}
          </div>

          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart
              data={bidChart}
              barGap={4}
              margin={{ top: 20, right: 10, left: 10, bottom: 0 }}
              onClick={(state) => {
                if (bidView === 'yoy' && state && state.activeLabel) {
                  const yr = parseInt(state.activeLabel);
                  if (!isNaN(yr)) {
                    setBidYear(yr);
                    setBidView('mom');
                  }
                }
              }}
              style={{ cursor: bidView === 'yoy' ? 'pointer' : 'default' }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey={bidView === 'yoy' ? 'year' : 'month'} tick={{ fontSize: 9, fontWeight: 800, fill: '#252525ff' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 9, fontWeight: 800, fill: '#94a3b8' }} axisLine={false} tickLine={false}
                tickFormatter={v => bidMetric === 'value' ? fmtMoney(v) : v}
                ticks={bidTicks}
                domain={bidDomain} />
              <Tooltip content={<ChartTooltip isValue={bidMetric === 'value'} />} />
              <Legend verticalAlign="top" height={32} wrapperStyle={{ fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }} />
              <Bar
                dataKey={bidMetric === 'value' ? 'quoted' : 'quotedCount'}
                name="Total Quoted"
                fill="#000000ff"
                radius={[2, 2, 0, 0]}
                maxBarSize={36}
                onClick={(data) => {
                  if (bidView === 'yoy' && data && data.year) {
                    const yr = parseInt(data.year);
                    if (!isNaN(yr)) {
                      setBidYear(yr);
                      setBidView('mom');
                    }
                  }
                }}
              >
                <LabelList
                  dataKey={bidMetric === 'value' ? 'quoted' : 'quotedCount'}
                  position="top"
                  style={{ fontSize: '8px', fontWeight: 900, fill: '#334155' }}
                  formatter={v => v > 0 ? (bidMetric === 'value' ? fmtMoney(v) : v) : ''}
                />
              </Bar>
              <Bar
                dataKey={bidMetric === 'value' ? 'won' : 'wonCount'}
                name="Won / Awarded"
                fill="#f59e0b"
                radius={[2, 2, 0, 0]}
                maxBarSize={36}
                onClick={(data) => {
                  if (bidView === 'yoy' && data && data.year) {
                    const yr = parseInt(data.year);
                    if (!isNaN(yr)) {
                      setBidYear(yr);
                      setBidView('mom');
                    }
                  }
                }}
              >
                <LabelList
                  dataKey={bidMetric === 'value' ? 'won' : 'wonCount'}
                  position="top"
                  style={{ fontSize: '8px', fontWeight: 900, fill: '#b45309' }}
                  formatter={v => v > 0 ? (bidMetric === 'value' ? fmtMoney(v) : v) : ''}
                />
              </Bar>
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </Panel>

{/* ══ SECTION 3 — EXECUTIVE ADVISOR ════════════════ */}
      <Panel>
            <PanelHeader title="Executive Advisor" sub={`Capacity outlook — ${MONTHS[capMonth]} ${capYear}`}>
              <Lightbulb className="w-4 h-4 text-amber-500" />
            </PanelHeader>
            <div className="p-6 space-y-5">
              {aiInsight ? (
                <>
                  {/* Metric row */}
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: 'Available', value: aiInsight.available.toLocaleString(), unit: 'hrs', color: 'text-emerald-600' },
                      { label: 'Required', value: aiInsight.required.toLocaleString(), unit: 'hrs', color: 'text-amber-600' },
                      { label: aiInsight.balance >= 0 ? 'Surplus' : 'Deficit', value: Math.abs(aiInsight.balance).toLocaleString(), unit: 'hrs', color: aiInsight.balance >= 0 ? 'text-blue-600' : 'text-red-600' },
                    ].map((m, i) => (
                      <div key={i} className="bg-slate-50 border border-slate-200 rounded p-3 text-center">
                        <p className={`text-base font-black leading-none ${m.color}`}>{m.value}</p>
                        <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest mt-1">{m.unit}</p>
                        <p className="text-[8px] text-slate-500 font-bold uppercase tracking-widest">{m.label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Utilisation bar */}
                  <div>
                    <div className="flex justify-between text-[9px] font-black uppercase tracking-widest mb-1.5 text-slate-500">
                      <span>Load Utilisation</span>
                      <span className={aiInsight.pct > 100 ? 'text-red-600' : aiInsight.pct > 85 ? 'text-amber-600' : 'text-emerald-600'}>
                        {aiInsight.pct}%
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 border border-slate-200 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-500
                        ${aiInsight.pct > 100 ? 'bg-red-500' : aiInsight.pct > 85 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                        style={{ width: `${Math.min(100, aiInsight.pct)}%` }} />
                    </div>
                  </div>

                  {/* Swift Actions */}
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 flex items-center gap-1.5">
                      <Zap className="w-3 h-3" /> Swift Actions
                    </p>
                    <div className="space-y-2">
                      {aiInsight.actions.map((a, i) => {
                        const cls = {
                          critical: 'bg-red-50 border-red-100 text-red-700',
                          warning: 'bg-amber-50 border-amber-100 text-amber-700',
                          success: 'bg-emerald-50 border-emerald-100 text-emerald-700',
                          info: 'bg-slate-50 border-slate-200 text-slate-600',
                        }[a.sev];
                        return (
                          <div key={i} className={`border rounded px-3 py-2.5 text-[10px] font-semibold leading-relaxed ${cls}`}>
                            {a.text}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-40 gap-2">
                  <Info className="w-7 h-7 text-slate-300" />
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest text-center">
                    No capacity data.<br />Add Workforce Master records.
                  </p>
                </div>
              )}
            </div>
          </Panel>


    </div>
  );
}
