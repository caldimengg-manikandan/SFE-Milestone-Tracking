import { useState } from 'react';
import {
  Users, FolderKanban, BarChart3, TrendingUp, ArrowUpRight, ArrowDownRight,
  Clock, CheckCircle2, AlertTriangle, Box
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell
} from 'recharts';

/* ── Mock Data ── */
const stats = [
  { label: 'Total Employees', value: '48', change: '+3', up: true, icon: Users, gradient: 'stat-gradient-amber', color: 'text-amber-600', iconBg: 'bg-amber-100' },
  { label: 'Active Projects', value: '12', change: '+2', up: true, icon: FolderKanban, gradient: 'stat-gradient-blue', color: 'text-blue-600', iconBg: 'bg-blue-100' },
  { label: 'Active Jobs', value: '34', change: '+5', up: true, icon: Box, gradient: 'stat-gradient-emerald', color: 'text-emerald-600', iconBg: 'bg-emerald-100' },
  { label: 'Efficiency Rate', value: '92%', change: '+4%', up: true, icon: TrendingUp, gradient: 'stat-gradient-purple', color: 'text-purple-600', iconBg: 'bg-purple-100' },
];

const areaData = [
  { month: 'Jan', jobs: 120, projects: 2 },
  { month: 'Feb', jobs: 145, projects: 3 },
  { month: 'Mar', jobs: 180, projects: 3 },
  { month: 'Apr', jobs: 160, projects: 4 },
  { month: 'May', jobs: 210, projects: 5 },
  { month: 'Jun', jobs: 195, projects: 5 },
  { month: 'Jul', jobs: 240, projects: 6 },
];

const barData = [
  { name: 'Steel Framing', completed: 85, pending: 15 },
  { name: 'Fabrication', completed: 60, pending: 40 },
  { name: 'Installation', completed: 50, pending: 30 },
  { name: 'Quality Check', completed: 90, pending: 10 },
  { name: 'Delivery', completed: 75, pending: 25 },
];

const pieData = [
  { name: 'Completed', value: 420, color: '#10b981' },
  { name: 'In Progress', value: 280, color: '#f59e0b' },
  { name: 'Pending', value: 150, color: '#6366f1' },
  { name: 'On Hold', value: 50, color: '#ef4444' },
];

const recentActivities = [
  { id: 1, action: 'Job #101 Processed', project: 'Steel Bridge Phase 2', user: 'Rajesh K.', time: '10 min ago', type: 'success' },
  { id: 2, action: 'New project created', project: 'Factory Expansion', user: 'Priya S.', time: '1h ago', type: 'info' },
  { id: 3, action: 'Shipment Delayed', project: 'Warehouse Unit B', user: 'System', time: '3h ago', type: 'warning' },
  { id: 4, action: 'Employee added', project: 'Team Update', user: 'Admin', time: '5h ago', type: 'info' },
];

const announcements = [
  { id: 1, title: 'Safety audit scheduled for May 15', priority: 'high' },
  { id: 2, title: 'Quarterly production targets updated', priority: 'medium' },
  { id: 3, title: 'Server maintenance — May 10, 2AM', priority: 'low' },
];

export default function Dashboard() {
  const [period, setPeriod] = useState('7d');

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
        {stats.map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className="bg-white border border-slate-300 p-6 transition-all duration-300 hover:shadow-xl hover:border-amber-400 group">
              <div className="flex items-start justify-between">
                <div className={`w-12 h-12 ${s.iconBg} flex items-center justify-center text-amber-600 shadow-inner group-hover:bg-amber-500 group-hover:text-white transition-all`}>
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
        {/* Area Chart */}
        <div className="lg:col-span-2 bg-white border border-slate-300 p-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.25em]">Production Throughput</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Monthly Job Processing Trends</p>
            </div>
            <BarChart3 className="w-5 h-5 text-slate-300" />
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={areaData}>
              <defs>
                <linearGradient id="colorJobs" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.1} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 10, fontWeight: 800, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fontWeight: 800, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 0, border: '1px solid #e2e8f0', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', fontSize: 10, fontWeight: 900 }} />
              <Area type="monotone" dataKey="jobs" stroke="#f59e0b" strokeWidth={3} fillOpacity={1} fill="url(#colorJobs)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Pie Chart */}
        <div className="bg-white border border-slate-300 p-8">
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.25em] mb-1">Inventory Status</h3>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-6">Distribution Overview</p>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={0} dataKey="value">
                {pieData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 0, border: '1px solid #e2e8f0', fontSize: 10, fontWeight: 900 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-3 mt-6">
            {pieData.map((d, i) => (
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
            <BarChart data={barData} barGap={4}>
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
              {recentActivities.map((a) => (
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
