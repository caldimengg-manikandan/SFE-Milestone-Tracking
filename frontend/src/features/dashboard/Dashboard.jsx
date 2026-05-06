import { useState } from 'react';
import {
  Users, FolderKanban, Flag, TrendingUp, ArrowUpRight, ArrowDownRight,
  Clock, CheckCircle2, AlertTriangle, BarChart3
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell
} from 'recharts';

/* ── Mock Data ── */
const stats = [
  { label: 'Total Employees', value: '48', change: '+3', up: true, icon: Users, gradient: 'stat-gradient-amber', color: 'text-amber-600', iconBg: 'bg-amber-100' },
  { label: 'Active Projects', value: '12', change: '+2', up: true, icon: FolderKanban, gradient: 'stat-gradient-blue', color: 'text-blue-600', iconBg: 'bg-blue-100' },
  { label: 'Milestones Due', value: '7', change: '-1', up: false, icon: Flag, gradient: 'stat-gradient-emerald', color: 'text-emerald-600', iconBg: 'bg-emerald-100' },
  { label: 'Completion Rate', value: '87%', change: '+5%', up: true, icon: TrendingUp, gradient: 'stat-gradient-purple', color: 'text-purple-600', iconBg: 'bg-purple-100' },
];

const areaData = [
  { month: 'Jan', milestones: 4, projects: 2 },
  { month: 'Feb', milestones: 6, projects: 3 },
  { month: 'Mar', milestones: 8, projects: 3 },
  { month: 'Apr', milestones: 5, projects: 4 },
  { month: 'May', milestones: 12, projects: 5 },
  { month: 'Jun', milestones: 10, projects: 5 },
  { month: 'Jul', milestones: 14, projects: 6 },
];

const barData = [
  { name: 'Steel Framing', completed: 8, pending: 2 },
  { name: 'Fabrication', completed: 6, pending: 4 },
  { name: 'Installation', completed: 5, pending: 3 },
  { name: 'Quality Check', completed: 9, pending: 1 },
  { name: 'Delivery', completed: 7, pending: 2 },
];

const pieData = [
  { name: 'Completed', value: 42, color: '#10b981' },
  { name: 'In Progress', value: 28, color: '#f59e0b' },
  { name: 'Pending', value: 15, color: '#6366f1' },
  { name: 'Overdue', value: 5, color: '#ef4444' },
];

const recentActivities = [
  { id: 1, action: 'Milestone completed', project: 'Steel Bridge Phase 2', user: 'Rajesh K.', time: '10 min ago', type: 'success' },
  { id: 2, action: 'New project created', project: 'Factory Expansion', user: 'Priya S.', time: '1h ago', type: 'info' },
  { id: 3, action: 'Milestone overdue', project: 'Warehouse Unit B', user: 'System', time: '3h ago', type: 'warning' },
  { id: 4, action: 'Employee added', project: 'Team Update', user: 'Admin', time: '5h ago', type: 'info' },
];

const announcements = [
  { id: 1, title: 'Safety audit scheduled for May 15', priority: 'high' },
  { id: 2, title: 'New milestone templates available', priority: 'medium' },
  { id: 3, title: 'Server maintenance — May 10, 2AM', priority: 'low' },
];

export default function Dashboard() {
  const [period, setPeriod] = useState('7d');

  return (
    <div className="space-y-6">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Dashboard Overview</h2>
          <p className="text-sm text-slate-500 mt-0.5">Welcome back! Here's what's happening today.</p>
        </div>
        <div className="flex items-center gap-1 bg-white rounded-xl border border-slate-200 p-1 shadow-sm">
          {['24h', '7d', '30d', '90d'].map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                period === p
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
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
            <div key={i} className={`${s.gradient} rounded-2xl p-5 transition-all duration-300 hover:shadow-md hover:-translate-y-0.5`}>
              <div className="flex items-start justify-between">
                <div className={`w-10 h-10 rounded-xl ${s.iconBg} flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${s.color}`} />
                </div>
                <span className={`inline-flex items-center gap-0.5 text-xs font-bold ${s.up ? 'text-emerald-600' : 'text-red-500'}`}>
                  {s.up ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                  {s.change}
                </span>
              </div>
              <div className="mt-3">
                <p className="text-2xl font-extrabold text-slate-900">{s.value}</p>
                <p className="text-xs text-slate-600 font-medium mt-0.5">{s.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Area Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/60 p-5 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Milestone Trends</h3>
              <p className="text-xs text-slate-400 mt-0.5">Milestones vs Projects over time</p>
            </div>
            <BarChart3 className="w-4 h-4 text-slate-400" />
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={areaData}>
              <defs>
                <linearGradient id="colorMilestones" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorProjects" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.06)', fontSize: 12 }} />
              <Area type="monotone" dataKey="milestones" stroke="#f59e0b" strokeWidth={2} fillOpacity={1} fill="url(#colorMilestones)" />
              <Area type="monotone" dataKey="projects" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorProjects)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Pie Chart */}
        <div className="bg-white rounded-2xl border border-slate-200/60 p-5 shadow-card">
          <h3 className="text-sm font-bold text-slate-800 mb-1">Milestone Status</h3>
          <p className="text-xs text-slate-400 mb-3">Current distribution</p>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                {pieData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {pieData.map((d, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                <span className="text-[11px] text-slate-600">{d.name}</span>
                <span className="ml-auto text-[11px] font-bold text-slate-800">{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bar Chart + Activities Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Bar Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/60 p-5 shadow-card">
          <h3 className="text-sm font-bold text-slate-800 mb-1">Project Progress</h3>
          <p className="text-xs text-slate-400 mb-4">Completed vs Pending tasks by category</p>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={barData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
              <Bar dataKey="completed" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="pending" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Activity Feed + Announcements */}
        <div className="space-y-4">
          {/* Recent Activity */}
          <div className="bg-white rounded-2xl border border-slate-200/60 p-5 shadow-card">
            <h3 className="text-sm font-bold text-slate-800 mb-3">Recent Activity</h3>
            <div className="space-y-3">
              {recentActivities.map((a) => (
                <div key={a.id} className="flex items-start gap-3">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                    a.type === 'success' ? 'bg-emerald-100' : a.type === 'warning' ? 'bg-amber-100' : 'bg-blue-100'
                  }`}>
                    {a.type === 'success' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> :
                     a.type === 'warning' ? <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> :
                     <Clock className="w-3.5 h-3.5 text-blue-600" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-700">{a.action}</p>
                    <p className="text-[11px] text-slate-400 truncate">{a.project} · {a.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Announcements */}
          <div className="bg-white rounded-2xl border border-slate-200/60 p-5 shadow-card">
            <h3 className="text-sm font-bold text-slate-800 mb-3">Announcements</h3>
            <div className="space-y-2.5">
              {announcements.map((a) => (
                <div key={a.id} className="flex items-start gap-2.5">
                  <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${
                    a.priority === 'high' ? 'bg-red-500' : a.priority === 'medium' ? 'bg-amber-500' : 'bg-slate-300'
                  }`} />
                  <p className="text-xs text-slate-600 leading-relaxed">{a.title}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
