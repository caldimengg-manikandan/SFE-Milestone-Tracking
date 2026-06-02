import { useState, useEffect, useMemo } from 'react';
import {
  Trophy, TrendingUp, AlertTriangle, CheckCircle2, Clock,
  ChevronDown, ChevronRight, Zap, Calendar, BarChart3,
  Activity, Target, Briefcase, Star, Bell, RefreshCw,
  Lightbulb, Info, Loader2
} from 'lucide-react';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, ReferenceLine
} from 'recharts';
import { projectAPI, scheduleAPI, bidEnquiryAPI, manpowerAPI, capacityAPI } from '../../services/api';

/* ─────────────────────────────────────────────────────────
   CONSTANTS & HELPERS
───────────────────────────────────────────────────────── */
const TODAY = new Date();
const MONTHS     = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MONTHS_FULL = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS_SHORT  = ['Su','Mo','Tu','We','Th','Fr','Sa'];

const fmt = (d) => {
  if (!d) return '—';
  const dt = new Date(d);
  if (isNaN(dt)) return '—';
  return `${String(dt.getDate()).padStart(2,'0')}-${String(dt.getMonth()+1).padStart(2,'0')}-${dt.getFullYear()}`;
};

const fmtMoney = (v) => {
  const n = parseFloat(v) || 0;
  if (n >= 1_000_000) return `$${(n/1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `$${(n/1_000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
};

const parseMonthYear = (str) => {
  if (!str) return null;
  const lower = str.toLowerCase().trim();
  let month = null;
  for (let i = 0; i < MONTHS_FULL.length; i++) {
    if (lower.startsWith(MONTHS_FULL[i].slice(0,3).toLowerCase())) { month = i; break; }
  }
  const ym = str.match(/\d{4}|\d{2}/);
  if (!ym || month === null) return null;
  const y = parseInt(ym[0]); 
  return { month, year: y < 100 ? 2000+y : y };
};

/* Classify project delay based on its sequences */
const classifyProject = (project, schedules) => {
  if (project.status === 'Completed') return 'completed';
  const seqs = schedules.filter(s => String(s.project?.id || s.project) === String(project.id));
  const now = TODAY.getTime();
  let delayed=false, light=false, onTrack=false;
  for (const s of seqs) {
    if (s.actual_ship_date) continue;
    const sd = s.ship_date ? new Date(s.ship_date) : null;
    if (!sd) { onTrack=true; continue; }
    const diff = (sd.getTime()-now)/(1000*60*60*24);
    if (diff<0) delayed=true;
    else if (diff<=7) light=true;
    else onTrack=true;
  }
  if (delayed) return 'delayed';
  if (light)   return 'light_delay';
  return 'on_track';
};

const classifySeq = (seq) => {
  if (seq.actual_ship_date) return 'completed';
  const sd = seq.ship_date ? new Date(seq.ship_date) : null;
  if (!sd) return 'on_track';
  const diff = (sd.getTime()-TODAY.getTime())/(1000*60*60*24);
  if (diff<0)    return 'delayed';
  if (diff<=7)   return 'light_delay';
  return 'on_track';
};

/* ─────────────────────────────────────────────────────────
   STATUS CONFIG — matching existing app palette
───────────────────────────────────────────────────────── */
const S = {
  completed:  { label:'Completed',       dot:'bg-emerald-500', badge:'bg-emerald-50 text-emerald-700 border-emerald-100',  row:'',              blink:'' },
  on_track:   { label:'On Track',        dot:'bg-blue-500',    badge:'bg-blue-50 text-blue-700 border-blue-100',            row:'',              blink:'' },
  light_delay:{ label:'Lightly Delayed', dot:'bg-amber-500',   badge:'bg-amber-50 text-amber-700 border-amber-200',         row:'bg-amber-50/30',blink:'animate-blink-amber' },
  delayed:    { label:'Delayed',         dot:'bg-red-500',     badge:'bg-red-50 text-red-700 border-red-100',               row:'bg-red-50/20',  blink:'animate-blink-red' },
};
const STATUS_ORDER = ['delayed','light_delay','on_track','completed'];

/* ─────────────────────────────────────────────────────────
   TOOLTIP
───────────────────────────────────────────────────────── */
const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded px-3 py-2 shadow-lg text-[10px]">
      <p className="font-black text-slate-500 uppercase tracking-widest mb-1.5">{label}</p>
      {payload.map((p,i) => (
        <div key={i} className="flex items-center gap-2 mb-0.5">
          <span className="w-2 h-2 rounded-full shrink-0" style={{background:p.color}}/>
          <span className="font-bold text-slate-600">{p.name}:</span>
          <span className="font-black text-slate-900">
            {typeof p.value==='number' && p.value>999 ? fmtMoney(p.value) : p.value}
          </span>
        </div>
      ))}
    </div>
  );
};

/* ─────────────────────────────────────────────────────────
   PANEL WRAPPER — matches Operations dashboard card style
───────────────────────────────────────────────────────── */
const Panel = ({ children, className='' }) => (
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
    {options.map(([k,lbl]) => (
      <button key={k} onClick={() => onChange(k)}
        className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-widest transition-colors border-r border-slate-300 last:border-r-0
          ${value===k ? 'bg-slate-800 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}>
        {lbl}
      </button>
    ))}
  </div>
);



/* ─────────────────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────────────────── */
export default function VPDashboard() {
  const [loading, setLoading]       = useState(true);
  const [projects, setProjects]     = useState([]);
  const [schedules, setSchedules]   = useState([]);
  const [bids, setBids]             = useState([]);
  const [manpower, setManpower]     = useState([]);
  const [capData, setCapData]       = useState([]);

  /* Hierarchy */
  const [openGroups, setOpenGroups]   = useState({delayed:true,light_delay:true,on_track:false,completed:false});
  const [openProjects, setOpenProjects] = useState({});

  /* Bid chart */
  const [bidView, setBidView]     = useState('yoy');
  const [bidMetric, setBidMetric] = useState('value');
  const [bidYear, setBidYear]     = useState(TODAY.getFullYear());

  /* Capacity */
  const [capMonth, setCapMonth] = useState(TODAY.getMonth());
  const [capYear, setCapYear]   = useState(TODAY.getFullYear());

  /* Activity Feed Filter ('yesterday' | 'today' | 'tomorrow') */
  const [feedFilter, setFeedFilter] = useState('today');

  /* ── Fetch ── */
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [a,b,c,d,e] = await Promise.allSettled([
          projectAPI.getAll(),
          scheduleAPI.getAll({ page_size:1000 }),
          bidEnquiryAPI.getAll({ page_size:1000 }),
          manpowerAPI.getAll(),
          capacityAPI.getAll(),
        ]);
        const safe = r => r.status==='fulfilled' ? (r.value?.data?.results||r.value?.data||[]) : [];

        const projData  = Array.isArray(safe(a)) ? safe(a) : [];
        const schedData = Array.isArray(safe(b)) ? safe(b) : [];
        const bidsData  = Array.isArray(safe(c)) ? safe(c) : [];
        const manData   = Array.isArray(safe(d)) ? safe(d) : [];
        const capRaw    = Array.isArray(safe(e)) ? safe(e) : [];

        setProjects(projData);
        setSchedules(schedData);
        setBids(bidsData);
        setManpower(manData);
        setCapData(capRaw);
      } catch(e){ console.error(e);
        setProjects([]);
        setSchedules([]);
        setBids([]);
        setManpower([]);
        setCapData([]);
      }
      finally { setLoading(false); }
    })();
  }, []);


  /* ── Derived ── */
  const wonBids = useMemo(() => bids.filter(b=>b.won_lost==='Won'), [bids]);
  const latestWins = useMemo(() => [...wonBids].sort((a,b)=>new Date(b.awarded_job_no_date||b.created_at)-new Date(a.awarded_job_no_date||a.created_at)).slice(0,6), [wonBids]);

  const kpi = useMemo(() => {
    const pending  = bids.filter(b=>b.won_lost==='Pending');
    const atRisk   = projects.filter(p=>{ const s=classifyProject(p,schedules); return s==='delayed'||s==='light_delay'; }).length;
    const health   = projects.length>0 ? Math.round(((projects.length-atRisk)/projects.length)*100) : 100;
    const winRate  = bids.length>0 ? Math.round((wonBids.length/bids.length)*100) : 0;
    return {
      won:    wonBids.length,
      health, atRisk,
      pipeline: pending.reduce((s,b)=>s+parseFloat(b.bid_amount||0),0),
      winRate,
    };
  }, [bids, wonBids, projects, schedules]);

  const grouped = useMemo(() => {
    const g = {delayed:[],light_delay:[],on_track:[],completed:[]};
    projects.forEach(p => g[classifyProject(p,schedules)].push(p));
    return g;
  }, [projects, schedules]);

  /* Bid chart */
  const bidChart = useMemo(() => {
    if (bidView==='yoy') {
      const m={};
      bids.forEach(b => {
        const yr = new Date(b.awarded_job_no_date||b.created_at).getFullYear();
        if (!m[yr]) m[yr]={year:String(yr),quoted:0,won:0,quotedCount:0,wonCount:0};
        m[yr].quoted += parseFloat(b.bid_amount||0);
        m[yr].quotedCount += 1;
        if (b.won_lost==='Won') { m[yr].won+=parseFloat(b.awarded_amount||b.bid_amount||0); m[yr].wonCount+=1; }
      });
      return Object.values(m).sort((a,b)=>a.year-b.year).slice(-6);
    }
    const rows = MONTHS.map(m=>({month:m,quoted:0,won:0,quotedCount:0,wonCount:0}));
    bids.forEach(b => {
      const dt=new Date(b.awarded_job_no_date||b.created_at);
      if (dt.getFullYear()!==bidYear) return;
      const mi=dt.getMonth();
      rows[mi].quoted+=parseFloat(b.bid_amount||0); rows[mi].quotedCount+=1;
      if (b.won_lost==='Won'){rows[mi].won+=parseFloat(b.awarded_amount||b.bid_amount||0);rows[mi].wonCount+=1;}
    });
    return rows;
  }, [bids, bidView, bidYear]);

  /* Capacity chart */
  const capChart = useMemo(() => {
    const rows = MONTHS.map(m=>({month:m,required:0,available:0}));
    wonBids.forEach(b => {
      const p=parseMonthYear(b.struct_fab_start_month);
      if (!p || p.year!==capYear) return;
      const hrs=parseFloat(b.struct_fab_hours||0);
      const dur=Math.max(1,parseInt(b.struct_fab_duration||1));
      for (let d=0;d<dur;d++) rows[(p.month+d)%12].required+=hrs/dur;
    });
    manpower.forEach(mp => {
      const mi=MONTHS_FULL.findIndex(m=>m.toLowerCase()===(mp.month||'').toLowerCase());
      if (mi<0) return;
      rows[mi].available+=parseFloat(mp.manhours||8)*22;
    });
    capData.forEach(cap => {
      const monthly=parseFloat(cap.capacity_per_day||0)*22/12;
      rows.forEach(r=>r.available+=monthly);
    });
    return rows.map(r=>({...r,required:Math.round(r.required),available:Math.round(r.available),balance:Math.round(r.available-r.required)}));
  }, [wonBids, manpower, capData, capYear]);

  const aiInsight = useMemo(() => {
    const d=capChart[capMonth]; if (!d) return null;
    const {required,available,balance}=d;
    const pct=available>0?Math.round((required/available)*100):0;
    const actions=[];
    if (balance<0){
      actions.push({sev:'critical',text:`Deficit of ${Math.abs(balance).toLocaleString()} hrs in ${MONTHS[capMonth]}. Subcontracting recommended.`});
      actions.push({sev:'warning', text:'Authorize overtime — 2 hrs/day recovers ~10% of deficit.'});
      actions.push({sev:'info',    text:'Outsource detailing for non-critical sequences to free shop floor.'});
    } else if (balance<available*0.15){
      actions.push({sev:'warning',text:`Thin surplus of ${balance.toLocaleString()} hrs in ${MONTHS[capMonth]}. Monitor load closely.`});
      actions.push({sev:'info',   text:'Spread sequence scheduling to reduce peak demand this month.'});
    } else {
      actions.push({sev:'success',text:`Surplus of ${balance.toLocaleString()} hrs in ${MONTHS[capMonth]}. Capacity available for new bids.`});
      actions.push({sev:'info',   text:'Accelerate delayed sequences using spare capacity.'});
      actions.push({sev:'info',   text:'Allocate surplus to preventive maintenance or skills training.'});
    }
    return {required,available,balance,pct,actions};
  }, [capChart,capMonth]);

  /* Calendar events */
  const calEvents = useMemo(()=>{
    const ev={};
    const add=(dt,e)=>{
      if(!dt) return; const d=new Date(dt); if(isNaN(d)) return;
      const k=`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      ev[k]=(ev[k]||[]); ev[k].push(e);
    };
    bids.forEach(b=>{
      add(b.bid_due_date,{
        type:'bid_due',
        label:`Bid Due: ${b.project_name||b.quote_no}`,
        projectCode: b.quote_no || 'N/A',
        details: `Bid Amount: ${fmtMoney(b.bid_amount)} · Status: ${b.won_lost}`,
        extra: `Expected Start: ${b.struct_fab_start_month || 'N/A'}`
      });
      add(b.quote_date,{
        type:'quote_date',
        label:`Quote Submitted: ${b.project_name||b.quote_no}`,
        projectCode: b.quote_no || 'N/A',
        details: `Bid Amount: ${fmtMoney(b.bid_amount)} · Primary Estimator: ${b.primary_estimator?.initials || b.primary_estimator || 'N/A'}`,
        extra: `Status: ${b.won_lost}`
      });
      add(b.estimator_followup_date,{
        type:'follow_up',
        label:`Estimator Follow-up: ${b.project_name||b.quote_no}`,
        projectCode: b.quote_no || 'N/A',
        details: `Follow-up Notes: ${b.estimator_followup_notes || 'N/A'}`,
        extra: `Follow-up`
      });
      add(b.awarded_job_no_date,{
        type:'awarded_date',
        label:`Bid Awarded: ${b.project_name||b.quote_no}`,
        projectCode: b.quote_no || 'N/A',
        details: `Awarded Amount: ${fmtMoney(b.awarded_amount)} · SFE Job No: ${b.sfe_job_no || 'N/A'}`,
        extra: `Awarded`
      });
      add(b.contract_executed_date,{
        type:'contract',
        label:`Contract Executed: ${b.project_name||b.quote_no}`,
        projectCode: b.quote_no || 'N/A',
        details: `SFE Job No: ${b.sfe_job_no || 'N/A'}`,
        extra: `Executed`
      });
      add(b.fab_start_date || b.fabrication_start_date,{
        type:'fab_start',
        label:`Fabrication Start: ${b.project_name||b.quote_no}`,
        projectCode: b.quote_no || 'N/A',
        details: `SFE Job No: ${b.sfe_job_no || 'N/A'}`,
        extra: `Fab Start`
      });
    });
    schedules.forEach(s=>{
      const proj = projects.find(p => String(p.id) === String(s.project?.id || s.project)) || {};
      const pCode = proj.code || 'N/A';
      const pName = proj.name || 'N/A';
      
      add(s.rts_date,{
        type:'rts',
        label:`Ready to Ship (RTS): Seq ${s.seq_no}`,
        projectCode: pCode,
        details: `${s.item_description || 'No description'} · Project: ${pName}`,
        extra: `${parseFloat(s.tons || 0).toFixed(1)} tons`
      });
      add(s.ship_date,{
        type:'ship',
        label:`Shipment Date: Seq ${s.seq_no}`,
        projectCode: pCode,
        details: `${s.item_description || 'No description'} · Project: ${pName}`,
        extra: `${parseFloat(s.tons || 0).toFixed(1)} tons`
      });
      add(s.scheduled_ofa_date,{
        type:'ofa_sched',
        label:`OFA Scheduled: Seq ${s.seq_no}`,
        projectCode: pCode,
        details: `Drawing Out for Approval · Project: ${pName}`,
        extra: `OFA Sched`
      });
      add(s.actual_ofa_date,{
        type:'ofa_act',
        label:`OFA Actual: Seq ${s.seq_no}`,
        projectCode: pCode,
        details: `Drawing sent Out for Approval · Project: ${pName}`,
        extra: `OFA Actual`
      });
      add(s.scheduled_bfa_date,{
        type:'bfa_sched',
        label:`BFA Scheduled: Seq ${s.seq_no}`,
        projectCode: pCode,
        details: `Drawing Back for Approval · Project: ${pName}`,
        extra: `BFA Sched`
      });
      add(s.actual_bfa_date,{
        type:'bfa_act',
        label:`BFA Actual: Seq ${s.seq_no}`,
        projectCode: pCode,
        details: `Drawing returned Back for Approval · Project: ${pName}`,
        extra: `BFA Actual`
      });
      add(s.scheduled_field_measure_date,{
        type:'field_measure',
        label:`Field Measure Scheduled: Seq ${s.seq_no}`,
        projectCode: pCode,
        details: `Field measurement for layout · Project: ${pName}`,
        extra: `Field Measure`
      });
      add(s.actual_rts_date,{
        type:'rts_act',
        label:`Actual RTS: Seq ${s.seq_no}`,
        projectCode: pCode,
        details: `Sequence completed in shop · Project: ${pName}`,
        extra: `Actual RTS`
      });
      add(s.actual_ship_date,{
        type:'ship_act',
        label:`Actual Ship: Seq ${s.seq_no}`,
        projectCode: pCode,
        details: `Sequence departed shop · Project: ${pName}`,
        extra: `Actual Ship`
      });
      add(s.scheduled_erection_date,{
        type:'erection_sched',
        label:`Seq Erection Scheduled: Seq ${s.seq_no}`,
        projectCode: pCode,
        details: `Site steel erection begins · Project: ${pName}`,
        extra: `Erect Sched`
      });
    });
    projects.forEach(p=>add(p.erection_date,{
      type:'erection',
      label:`Site Erection Milestone: ${p.name}`,
      projectCode: p.code || 'N/A',
      details: `Customer: ${p.customer_name || 'N/A'}`,
      extra: `Status: ${p.status}`
    }));
    return ev;
  },[bids,schedules,projects]);

  // Selected date based on feedFilter
  const activeDate = useMemo(() => {
    const d = new Date(TODAY);
    if (feedFilter === 'yesterday') d.setDate(TODAY.getDate() - 1);
    if (feedFilter === 'tomorrow')  d.setDate(TODAY.getDate() + 1);
    return d;
  }, [feedFilter]);

  const activeDateKey = useMemo(() => {
    return `${activeDate.getFullYear()}-${activeDate.getMonth()}-${activeDate.getDate()}`;
  }, [activeDate]);

  const dayEvents = useMemo(() => calEvents[activeDateKey] || [], [calEvents, activeDateKey]);

  // Overall monthly stats (for the current month)
  const monthEventCounts = useMemo(()=>{
    const c={bid_due:0,rts:0,ship:0,erection:0};
    const curYear = TODAY.getFullYear();
    const curMonth = TODAY.getMonth();
    Object.entries(calEvents).forEach(([k,arr])=>{
      const [y,m]=k.split('-').map(Number);
      if(y===curYear&&m===curMonth) arr.forEach(e=>c[e.type]=(c[e.type]||0)+1);
    });
    return c;
  },[calEvents]);

  /* ── Event type style ── */
  const EVT = {
    bid_due:       {label:'Bid Due',         dot:'bg-red-500',     badge:'bg-red-50 text-red-700 border border-red-100'},
    rts:           {label:'RTS Target',      dot:'bg-blue-500',    badge:'bg-blue-50 text-blue-700 border border-blue-100'},
    ship:          {label:'Ship Target',     dot:'bg-emerald-500', badge:'bg-emerald-50 text-emerald-700 border border-emerald-100'},
    erection:      {label:'Erection Target', dot:'bg-amber-500',   badge:'bg-amber-50 text-amber-700 border border-amber-100'},
    ofa_sched:     {label:'OFA Scheduled',   dot:'bg-slate-400',   badge:'bg-slate-50 text-slate-600 border border-slate-200'},
    ofa_act:       {label:'OFA Actual',      dot:'bg-slate-700',   badge:'bg-slate-100 text-slate-800 border border-slate-300'},
    bfa_sched:     {label:'BFA Scheduled',   dot:'bg-indigo-400',  badge:'bg-indigo-50 text-indigo-600 border border-indigo-200'},
    bfa_act:       {label:'BFA Actual',      dot:'bg-indigo-700',  badge:'bg-indigo-100 text-indigo-800 border border-indigo-300'},
    field_measure: {label:'Field Measure',   dot:'bg-cyan-500',    badge:'bg-cyan-50 text-cyan-700 border border-cyan-100'},
    rts_act:       {label:'Actual RTS',      dot:'bg-blue-800',    badge:'bg-blue-100 text-blue-850 border border-blue-200'},
    ship_act:      {label:'Actual Ship',     dot:'bg-emerald-800', badge:'bg-emerald-100 text-emerald-850 border border-emerald-250'},
    erection_sched:{label:'Seq Erection',    dot:'bg-amber-700',   badge:'bg-amber-100 text-amber-800 border border-amber-200'},
    quote_date:    {label:'Quote Submitted', dot:'bg-rose-500',     badge:'bg-rose-50 text-rose-700 border border-rose-100'},
    follow_up:     {label:'Follow-up Date',  dot:'bg-violet-500',  badge:'bg-violet-50 text-violet-700 border border-violet-100'},
    awarded_date:  {label:'Award Date',      dot:'bg-yellow-600',  badge:'bg-yellow-50 text-yellow-750 border border-yellow-200'},
    contract:      {label:'Contract Executed',dot:'bg-teal-500',   badge:'bg-teal-50 text-teal-700 border border-teal-100'},
    fab_start:     {label:'Fab Start Date',  dot:'bg-fuchsia-500', badge:'bg-fuchsia-50 text-fuchsia-700 border border-fuchsia-100'},
  };

  /* ── Loading ── */
  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-7 h-7 text-amber-500 animate-spin"/>
    </div>
  );

  /* ────────────────────────────────────────────────────────
     RENDER
  ──────────────────────────────────────────────────────── */
  return (
    <div className="space-y-6">

      {/* ══ ANNOUNCEMENT BAR — Latest Wins ══════════════════ */}
      {latestWins.length > 0 && (
        <div className="flex items-center border border-slate-300 bg-white overflow-hidden">
          <div className="shrink-0 flex items-center gap-2 px-4 py-2.5 bg-amber-500">
            <Trophy className="w-3.5 h-3.5 text-white"/>
            <span className="text-[9px] font-black text-white uppercase tracking-[0.25em] whitespace-nowrap">Latest Wins</span>
          </div>
          <div className="overflow-hidden flex-1 border-l border-slate-300">
            <div className="animate-marquee whitespace-nowrap">
              {[...latestWins,...latestWins].map((b,i)=>(
                <span key={i} className="inline-flex items-center gap-2 mx-8">
                  <Star className="w-3 h-3 text-amber-500 shrink-0"/>
                  <span className="text-[11px] font-bold text-slate-800">{b.project_name||b.quote_no}</span>
                  {b.awarded_amount>0 && <span className="text-[10px] font-black text-amber-600">· {fmtMoney(b.awarded_amount)}</span>}
                  {b.awarded_job_no_date && <span className="text-[9px] text-slate-400">Awarded {fmt(b.awarded_job_no_date)}</span>}
                  <span className="text-slate-300 mx-2">|</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      )}


      {/* ══ SECTION 1 — PROJECT HIERARCHY ════════════════════ */}
      <Panel>
        <PanelHeader title="Project Health Hierarchy" sub="Status grouped by schedule adherence · Click to expand">
          <div className="flex flex-wrap items-center gap-2">
            {Object.entries(S).map(([k,c])=>(
              <span key={k} className={`flex items-center gap-1.5 px-2 py-1 text-[9px] font-black uppercase tracking-wider border rounded ${c.badge}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${c.dot} ${c.blink}`}/>
                {c.label}
              </span>
            ))}
          </div>
        </PanelHeader>

        <div className="divide-y divide-slate-100">
          {STATUS_ORDER.map(sk => {
            const cfg=S[sk];
            const projs=grouped[sk]||[];
            const open=openGroups[sk];
            return (
              <div key={sk}>
                {/* Group Row */}
                <button
                  onClick={()=>setOpenGroups(p=>({...p,[sk]:!p[sk]}))}
                  className="w-full flex items-center justify-between px-6 py-3.5 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-2 h-2 rounded-full ${cfg.dot} ${cfg.blink}`}/>
                    <span className={`text-[11px] font-black uppercase tracking-[0.2em] ${cfg.badge.split(' ')[1]}`}>{cfg.label}</span>
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded border ${cfg.badge}`}>{projs.length} Project{projs.length!==1?'s':''}</span>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${open?'rotate-180':''}`}/>
                </button>

                {open && (
                  <div className="border-t border-slate-100 bg-slate-50/30">
                    {projs.length===0 && (
                      <p className="px-8 py-4 text-[10px] text-slate-400 font-bold uppercase tracking-widest">No projects in this category.</p>
                    )}
                    {projs.map(proj=>{
                      const projSeqs=schedules.filter(s=>String(s.project?.id||s.project)===String(proj.id));
                      const isOpen=openProjects[proj.id];
                      return (
                        <div key={proj.id} className="border-b border-slate-100/60 last:border-b-0">
                          {/* Project row */}
                          <button
                            onClick={()=>setOpenProjects(p=>({...p,[proj.id]:!p[proj.id]}))}
                            className="w-full flex items-center gap-3 px-8 py-3 hover:bg-white/60 transition-colors text-left"
                          >
                            <div className={`w-0.5 h-5 ${cfg.dot}`}/>
                            {isOpen ? <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0"/> : <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0"/>}
                            <div className="flex-1 min-w-0">
                              <p className="text-[12px] font-bold text-slate-800 truncate">{proj.name}</p>
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">{proj.code} · {proj.customer_name||'N/A'}</p>
                            </div>
                            {cfg.blink && <span className={`w-2 h-2 rounded-full ${cfg.dot} ${cfg.blink} shrink-0`}/>}
                            <span className={`text-[9px] font-black px-2 py-0.5 border rounded shrink-0 ${cfg.badge}`}>{projSeqs.length} Seq</span>
                          </button>

                          {/* Sequence table */}
                          {isOpen && (
                            <div className="bg-white border-t border-slate-100 overflow-x-auto">
                              {projSeqs.length===0 ? (
                                <p className="px-10 py-3 text-[10px] text-slate-400 font-bold uppercase tracking-widest">No sequences.</p>
                              ) : (
                                <table className="w-full text-left min-w-[700px]">
                                  <thead>
                                    <tr className="bg-slate-800 text-slate-100 text-[9px] font-black uppercase tracking-wider">
                                      <th className="px-8 py-2.5">Seq No</th>
                                      <th className="px-4 py-2.5">Description</th>
                                      <th className="px-4 py-2.5 text-center">RTS Date</th>
                                      <th className="px-4 py-2.5 text-center">Ship Date</th>
                                      <th className="px-4 py-2.5 text-center">Actual Ship</th>
                                      <th className="px-4 py-2.5 text-center">Status</th>
                                      <th className="px-4 py-2.5 text-center">Tons</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {projSeqs.map(seq=>{
                                      const ss=classifySeq(seq); const sc=S[ss];
                                      const overdue=seq.ship_date&&new Date(seq.ship_date)<TODAY&&!seq.actual_ship_date;
                                      return (
                                        <tr key={seq.id} className={`text-[11px] font-medium hover:bg-slate-50/40 transition-colors ${sc.row}`}>
                                          <td className="px-8 py-2.5 font-mono font-bold text-slate-700">{seq.seq_no}</td>
                                          <td className="px-4 py-2.5 text-slate-600 truncate max-w-[180px]" title={seq.item_description}>{seq.item_description||'—'}</td>
                                          <td className="px-4 py-2.5 text-center text-slate-600 whitespace-nowrap">{fmt(seq.rts_date)}</td>
                                          <td className={`px-4 py-2.5 text-center whitespace-nowrap font-bold ${overdue?'text-red-600':'text-slate-600'}`}>{fmt(seq.ship_date)}</td>
                                          <td className="px-4 py-2.5 text-center text-slate-600 whitespace-nowrap">{fmt(seq.actual_ship_date)}</td>
                                          <td className="px-4 py-2.5 text-center">
                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[8px] font-black uppercase tracking-wide ${sc.badge}`}>
                                              <span className={`w-1.5 h-1.5 rounded-full ${sc.dot} ${sc.blink}`}/>
                                              {sc.label}
                                            </span>
                                          </td>
                                          <td className="px-4 py-2.5 text-center text-slate-500">{parseFloat(seq.tons||0).toFixed(1)}t</td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Panel>

      {/* ══ SECTION 2 — BID PERFORMANCE ══════════════════════ */}
      <Panel>
        <PanelHeader title="Bid Performance Analytics" sub="Total Quoted vs Won">
          <ToggleGroup options={[['yoy','Year-on-Year'],['mom','Month-on-Month']]} value={bidView} onChange={setBidView}/>
          <ToggleGroup options={[['value','Revenue $'],['count','Count']]} value={bidMetric} onChange={setBidMetric}/>
          {bidView==='mom' && (
            <select value={bidYear} onChange={e=>setBidYear(parseInt(e.target.value))}
              className="text-[9px] font-black uppercase tracking-wider border border-slate-300 px-2 py-1.5 bg-white outline-none text-slate-600 cursor-pointer">
              {[...Array(6)].map((_,i)=>{const y=TODAY.getFullYear()-3+i;return<option key={y} value={y}>{y}</option>;})}
            </select>
          )}
        </PanelHeader>

        <div className="p-6">
          {/* Summary pills */}
          <div className="flex flex-wrap gap-2 mb-6">
            {[
              {label:'Total',value:bids.length,      cls:'bg-slate-100 text-slate-700'},
              {label:'Won',  value:wonBids.length,   cls:'bg-emerald-50 text-emerald-700 border border-emerald-100'},
              {label:'Lost', value:bids.filter(b=>b.won_lost==='Lost').length, cls:'bg-red-50 text-red-700 border border-red-100'},
              {label:'Pending',value:bids.filter(b=>b.won_lost==='Pending').length, cls:'bg-amber-50 text-amber-700 border border-amber-100'},
              {label:'Win Rate',value:kpi.winRate+'%', cls:'bg-slate-100 text-slate-700'},
            ].map((p,i)=>(
              <span key={i} className={`flex items-center gap-2 px-3 py-1.5 text-[10px] font-black uppercase tracking-wide rounded ${p.cls}`}>
                {p.label}: <span className="text-sm font-black">{p.value}</span>
              </span>
            ))}
          </div>

          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={bidChart} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false}/>
              <XAxis dataKey={bidView==='yoy'?'year':'month'} tick={{fontSize:9,fontWeight:800,fill:'#94a3b8'}} axisLine={false} tickLine={false}/>
              <YAxis tick={{fontSize:9,fontWeight:800,fill:'#94a3b8'}} axisLine={false} tickLine={false}
                tickFormatter={v=>bidMetric==='value'?fmtMoney(v):v}/>
              <Tooltip content={<ChartTooltip/>}/>
              <Legend verticalAlign="top" height={32} wrapperStyle={{fontSize:'9px',fontWeight:800,textTransform:'uppercase',letterSpacing:'0.1em'}}/>
              <Bar dataKey={bidMetric==='value'?'quoted':'quotedCount'} name="Total Quoted" fill="#e2e8f0" radius={[2,2,0,0]} maxBarSize={36}/>
              <Bar dataKey={bidMetric==='value'?'won':'wonCount'}       name="Won / Awarded" fill="#f59e0b" radius={[2,2,0,0]} maxBarSize={36}/>
              <Line type="monotone" dataKey={bidMetric==='value'?'won':'wonCount'} name="Win Trend"
                stroke="#1e293b" strokeWidth={2} dot={{r:3,fill:'#1e293b',strokeWidth:2,stroke:'#fff'}}/>
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      {/* ══ SECTION 3 — CAPACITY vs WORKFORCE ════════════════ */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">

        {/* Chart — 3 cols */}
        <div className="xl:col-span-3">
          <Panel>
            <PanelHeader title="Capacity vs Bid Load" sub="Available workforce hours vs required load from won bids">
              <select value={capMonth} onChange={e=>setCapMonth(parseInt(e.target.value))}
                className="text-[9px] font-black uppercase tracking-wider border border-slate-300 px-2 py-1.5 bg-white outline-none text-slate-600 cursor-pointer">
                {MONTHS.map((m,i)=><option key={i} value={i}>{m}</option>)}
              </select>
              <select value={capYear} onChange={e=>setCapYear(parseInt(e.target.value))}
                className="text-[9px] font-black uppercase tracking-wider border border-slate-300 px-2 py-1.5 bg-white outline-none text-slate-600 cursor-pointer">
                {[...Array(5)].map((_,i)=>{const y=TODAY.getFullYear()-2+i;return<option key={y} value={y}>{y}</option>;})}
              </select>
            </PanelHeader>
            <div className="p-6">
              <ResponsiveContainer width="100%" height={260}>
                <ComposedChart data={capChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false}/>
                  <XAxis dataKey="month" tick={{fontSize:9,fontWeight:800,fill:'#94a3b8'}} axisLine={false} tickLine={false}/>
                  <YAxis yAxisId="l" tick={{fontSize:9,fontWeight:800,fill:'#94a3b8'}} axisLine={false} tickLine={false}/>
                  <YAxis yAxisId="r" orientation="right" tick={{fontSize:9,fontWeight:800,fill:'#94a3b8'}} axisLine={false} tickLine={false}/>
                  <Tooltip content={<ChartTooltip/>}/>
                  <Legend verticalAlign="top" height={32} wrapperStyle={{fontSize:'9px',fontWeight:800,textTransform:'uppercase',letterSpacing:'0.1em'}}/>
                  <ReferenceLine yAxisId="l" y={0} stroke="#e2e8f0"/>
                  <Bar yAxisId="l" dataKey="available" name="Available (hrs)" fill="#e2e8f0" radius={[2,2,0,0]} maxBarSize={28}/>
                  <Bar yAxisId="l" dataKey="required"  name="Required (hrs)"  fill="#f59e0b" radius={[2,2,0,0]} maxBarSize={28}/>
                  <Line yAxisId="r" type="monotone" dataKey="balance" name="Surplus/Deficit"
                    stroke="#1e293b" strokeWidth={2} dot={{r:3,fill:'#1e293b',strokeWidth:2,stroke:'#fff'}}/>
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        </div>

        {/* AI Advisor — 2 cols */}
        <div className="xl:col-span-2">
          <Panel className="h-full">
            <PanelHeader title="Executive Advisor" sub={`Capacity outlook — ${MONTHS[capMonth]} ${capYear}`}>
              <Lightbulb className="w-4 h-4 text-amber-500"/>
            </PanelHeader>
            <div className="p-6 space-y-5">
              {aiInsight ? (
                <>
                  {/* Metric row */}
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      {label:'Available',value:aiInsight.available.toLocaleString(),unit:'hrs',color:'text-emerald-600'},
                      {label:'Required', value:aiInsight.required.toLocaleString(), unit:'hrs',color:'text-amber-600'},
                      {label:aiInsight.balance>=0?'Surplus':'Deficit',value:Math.abs(aiInsight.balance).toLocaleString(),unit:'hrs',color:aiInsight.balance>=0?'text-blue-600':'text-red-600'},
                    ].map((m,i)=>(
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
                      <span className={aiInsight.pct>100?'text-red-600':aiInsight.pct>85?'text-amber-600':'text-emerald-600'}>
                        {aiInsight.pct}%
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 border border-slate-200 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-500
                        ${aiInsight.pct>100?'bg-red-500':aiInsight.pct>85?'bg-amber-500':'bg-emerald-500'}`}
                        style={{width:`${Math.min(100,aiInsight.pct)}%`}}/>
                    </div>
                  </div>

                  {/* Swift Actions */}
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 flex items-center gap-1.5">
                      <Zap className="w-3 h-3"/> Swift Actions
                    </p>
                    <div className="space-y-2">
                      {aiInsight.actions.map((a,i)=>{
                        const cls={
                          critical:'bg-red-50 border-red-100 text-red-700',
                          warning: 'bg-amber-50 border-amber-100 text-amber-700',
                          success: 'bg-emerald-50 border-emerald-100 text-emerald-700',
                          info:    'bg-slate-50 border-slate-200 text-slate-600',
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
                  <Info className="w-7 h-7 text-slate-300"/>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest text-center">
                    No capacity data.<br/>Add Workforce Master records.
                  </p>
                </div>
              )}
            </div>
          </Panel>
        </div>
      </div>

      {/* ══ SECTION 4 — DAILY ACTIVITY FEED ═══════════════ */}
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
              <Calendar className="w-8 h-8 text-slate-300"/>
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
                  <div key={i} className={`flex items-start gap-4 p-4 border rounded-xl shadow-[0_2px_10px_rgba(0,0,0,0.01)] hover:shadow-md transition-shadow duration-200 bg-white border-l-4 ${
                    ev.type === 'bid_due' || ev.type === 'quote_date' ? 'border-l-red-500' :
                    ev.type === 'rts' || ev.type === 'rts_act' ? 'border-l-blue-500' :
                    ev.type === 'ship' || ev.type === 'ship_act' ? 'border-l-emerald-500' :
                    ev.type === 'ofa_sched' || ev.type === 'ofa_act' ? 'border-l-slate-500' :
                    ev.type === 'bfa_sched' || ev.type === 'bfa_act' ? 'border-l-indigo-500' :
                    ev.type === 'field_measure' ? 'border-l-cyan-500' :
                    ev.type === 'follow_up' ? 'border-l-violet-500' :
                    ev.type === 'awarded_date' ? 'border-l-yellow-500' :
                    ev.type === 'contract' ? 'border-l-teal-500' :
                    ev.type === 'fab_start' ? 'border-l-fuchsia-500' :
                    'border-l-amber-500'
                  }`}>
                    {/* Left Icon */}
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${tc.badge}`}>
                      <IconComponent className="w-4 h-4"/>
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
                    <span className={`w-2.5 h-2.5 rounded-full ${v.dot}`}/>
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{v.label}</span>
                  </div>
                ))}
              </div>

              {/* Stats */}
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em]">
                  {MONTHS_FULL[TODAY.getMonth()]} {TODAY.getFullYear()} Target Summary:
                </span>
                <div className="flex items-center gap-3">
                  {[
                    { label: "Bids Due", k: 'bid_due', dot: 'bg-red-500' },
                    { label: "RTS", k: 'rts', dot: 'bg-blue-500' },
                    { label: "Shipments", k: 'ship', dot: 'bg-emerald-500' },
                    { label: "Erections", k: 'erection', dot: 'bg-amber-500' },
                  ].map((s, i) => (
                    <span key={i} className="inline-flex items-center gap-1 text-[9px] font-black text-slate-700 bg-slate-50 border border-slate-200 px-2 py-1 rounded">
                      <span className={`w-1 h-1 rounded-full ${s.dot}`}/>
                      {s.label}: {monthEventCounts[s.k] || 0}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </Panel>

    </div>
  );
}
