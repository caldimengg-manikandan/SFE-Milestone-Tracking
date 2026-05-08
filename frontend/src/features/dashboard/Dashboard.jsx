import { useState, useEffect } from 'react';
import {
  Users, FolderKanban, BarChart3, TrendingUp, ArrowUpRight, ArrowDownRight,
  Clock, CheckCircle2, AlertTriangle, Box, Loader2
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell
} from 'recharts';
import { dashboardAPI } from '../../services/api';

/* ── Configs ── */
const statConfigs = {
  'Total Employees': { icon: Users, iconBg: 'bg-amber-100', color: 'text-amber-600' },
  'Active Projects': { icon: FolderKanban, iconBg: 'bg-blue-100', color: 'text-blue-600' },
  'Active Jobs': { icon: Box, iconBg: 'bg-emerald-100', color: 'text-emerald-600' },
  'Efficiency Rate': { icon: TrendingUp, iconBg: 'bg-purple-100', color: 'text-purple-600' },
};

const announcements = [
  { id: 1, title: 'Safety audit scheduled for May 15', priority: 'high' },
  { id: 2, title: 'Quarterly production targets updated', priority: 'medium' },
  { id: 3, title: 'Server maintenance — May 10, 2AM', priority: 'low' },
];

export default function Dashboard() {
  const [period, setPeriod] = useState('7d');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    stats: [],
    areaData: [],
    pieData: [],
    barData: [],
    recentActivities: []
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const response = await dashboardAPI.getStats();
        setData(response.data);
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Executive Dashboard</h2>
          <p className="text-sm text-slate-500 font-medium">Real-time production and workforce overview</p>
        </div>
        <div className="flex items-center gap-1 bg-white border border-slate-300 p-1 shadow-sm">
          {['24h', '7d', '30d', '90d'].map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest transition-all ${
                period === p
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {data.stats.map((s, i) => {
          const config = statConfigs[s.label] || { icon: Users, iconBg: 'bg-slate-100', color: 'text-slate-600' };
          const Icon = config.icon;
          return (
            <div key={i} className="bg-white border border-slate-300 p-6 transition-all duration-300 hover:shadow-xl hover:border-amber-400 group">
              <div className="flex items-start justify-between">
                <div className={`w-12 h-12 ${config.iconBg} flex items-center justify-center ${config.color} shadow-inner group-hover:bg-amber-500 group-hover:text-white transition-all`}>
                  <Icon className="w-6 h-6" />
                </div>
                <span className={`inline-flex items-center gap-0.5 text-[10px] font-black uppercase tracking-widest ${s.up ? 'text-emerald-600' : 'text-red-500'}`}>
                  {s.up ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                  {s.change}
                </span>
              </div>
              <div className="mt-5">
                <p className="text-3xl font-black text-slate-900 leading-none tracking-tighter">{s.value}</p>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mt-2">{s.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gantt Chart — Production Throughput */}
        <div className="lg:col-span-2 bg-white border border-slate-300 overflow-hidden">
          <div className="p-8 border-bottom border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.25em]">Production Throughput</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Gantt Chart • Project Timelines & Prioritization</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-amber-500" />
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">High Priority</span>
              </div>
              <BarChart3 className="w-5 h-5 text-slate-300" />
            </div>
          </div>

          <div className="overflow-x-auto scrollbar-thin">
            <div className="min-w-[800px] gantt-grid">
              {/* Header Row 1: Quarters */}
              <div className="gantt-header-cell gantt-pink-header flex flex-col justify-center row-span-2">
                <span>Process / Project</span>
              </div>
              <div className="col-span-3 gantt-header-cell text-center border-b-0 py-2 bg-slate-50/50">Quarter 1</div>
              <div className="col-span-3 gantt-header-cell text-center border-b-0 py-2 bg-slate-50/50">Quarter 2</div>
              <div className="col-span-3 gantt-header-cell text-center border-b-0 py-2 bg-slate-50/50">Quarter 3</div>
              <div className="col-span-3 gantt-header-cell text-center border-b-0 py-2 bg-slate-50/50">Quarter 4</div>
              
              {/* Header Row 2: Months */}
              {data.ganttData?.months.map((m, i) => (
                <div key={i} className="gantt-header-cell text-center py-2">
                  {m}
                </div>
              ))}

              {/* Task Rows */}
              {data.ganttData?.tasks && data.ganttData.tasks.length > 0 ? (
                data.ganttData.tasks.map((task, idx) => (
                  <div key={idx} className="gantt-row">
                    <div className="gantt-label-cell">
                      <div className="flex flex-col">
                        <span className="truncate max-w-[160px]">{task.name}</span>
                        <span className="text-[8px] uppercase tracking-tighter text-slate-400 mt-0.5">{task.priority} Priority</span>
                      </div>
                    </div>
                    {/* Grid Cells */}
                    {Array.from({ length: 12 }).map((_, mIdx) => (
                      <div key={mIdx} className="gantt-cell">
                        {/* Task Bar */}
                        {mIdx === task.startMonth && (
                          <div 
                            className="gantt-bar"
                            style={{ 
                              width: `calc(${task.duration} * 100% + (${task.duration} - 1) * 1px)`,
                              backgroundColor: task.color + '20',
                              borderLeft: `4px solid ${task.color}`,
                              color: task.color
                            }}
                          >
                            {task.name}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ))
              ) : (
                <div className="col-span-13 flex flex-col items-center justify-center py-20 bg-slate-50/30">
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

        {/* Pie Chart */}
        <div className="bg-white border border-slate-300 p-8">
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.25em] mb-1">Inventory Status</h3>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-6">Distribution Overview</p>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={data.pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={0} dataKey="value">
                {data.pieData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 0, border: '1px solid #e2e8f0', fontSize: 10, fontWeight: 900 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-3 mt-6">
            {data.pieData.map((d, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-2.5 h-2.5" style={{ backgroundColor: d.color }} />
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{d.name}</span>
                <span className="ml-auto text-[10px] font-black text-slate-900 tracking-widest">{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Activities Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         {/* Bar Chart */}
         <div className="lg:col-span-2 bg-white border border-slate-300 p-8">
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.25em] mb-1">Section Performance</h3>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-8">Completed vs Pending by Workcenter</p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data.barData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 9, fontWeight: 800, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fontWeight: 800, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 0, border: '1px solid #e2e8f0', fontSize: 10, fontWeight: 900 }} />
              <Bar dataKey="completed" fill="#1e293b" radius={0} />
              <Bar dataKey="pending" fill="#fbbf24" radius={0} />
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
                  <div className={`w-8 h-8 flex items-center justify-center shrink-0 mt-0.5 ${
                    a.type === 'success' ? 'bg-emerald-50' : a.type === 'warning' ? 'bg-amber-50' : 'bg-slate-50'
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
              {announcements.map((a) => (
                <div key={a.id} className="flex items-start gap-3">
                  <div className={`w-1.5 h-1.5 mt-1.5 shrink-0 ${
                    a.priority === 'high' ? 'bg-red-500' : a.priority === 'medium' ? 'bg-amber-500' : 'bg-slate-400'
                  }`} />
                  <p className="text-[10px] text-slate-600 font-bold uppercase tracking-wide leading-relaxed">{a.title}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
