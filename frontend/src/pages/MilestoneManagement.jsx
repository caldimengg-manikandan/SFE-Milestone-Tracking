import { useState } from 'react';
import { Flag, Plus, Search, Edit2, Trash2, X, CheckCircle2, Clock, AlertTriangle, Calendar } from 'lucide-react';

const mockMilestones = [
  { id: 1, title: 'Foundation Complete', project: 'Steel Bridge Phase 2', dueDate: '2026-03-15', assignee: 'Rajesh Kumar', status: 'Completed' },
  { id: 2, title: 'Steel Frame Erected', project: 'Steel Bridge Phase 2', dueDate: '2026-05-20', assignee: 'Vikram Singh', status: 'In Progress' },
  { id: 3, title: 'Welding Inspection', project: 'Factory Expansion Unit A', dueDate: '2026-04-10', assignee: 'Arun Patel', status: 'Overdue' },
  { id: 4, title: 'Roofing Installation', project: 'Warehouse Unit B', dueDate: '2026-06-01', assignee: 'Priya Sharma', status: 'Pending' },
  { id: 5, title: 'Quality Certification', project: 'Commercial Complex', dueDate: '2026-07-15', assignee: 'Meena Iyer', status: 'Pending' },
  { id: 6, title: 'Client Handover', project: 'Steel Bridge Phase 2', dueDate: '2026-08-30', assignee: 'Rajesh Kumar', status: 'Pending' },
];

const statusConfig = {
  Completed: { bg: 'bg-emerald-50', text: 'text-emerald-600', dot: 'bg-emerald-500', icon: CheckCircle2 },
  'In Progress': { bg: 'bg-blue-50', text: 'text-blue-600', dot: 'bg-blue-500', icon: Clock },
  Overdue: { bg: 'bg-red-50', text: 'text-red-600', dot: 'bg-red-500', icon: AlertTriangle },
  Pending: { bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400', icon: Calendar },
};

const statusFilters = ['All', 'Completed', 'In Progress', 'Overdue', 'Pending'];

export default function MilestoneManagement() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [showModal, setShowModal] = useState(false);
  const [viewMode, setViewMode] = useState('table');

  const filtered = mockMilestones.filter(m =>
    (statusFilter === 'All' || m.status === statusFilter) &&
    (m.title.toLowerCase().includes(search.toLowerCase()) || m.project.toLowerCase().includes(search.toLowerCase()))
  );

  const statusCounts = {
    All: mockMilestones.length,
    Completed: mockMilestones.filter(m => m.status === 'Completed').length,
    'In Progress': mockMilestones.filter(m => m.status === 'In Progress').length,
    Overdue: mockMilestones.filter(m => m.status === 'Overdue').length,
    Pending: mockMilestones.filter(m => m.status === 'Pending').length,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Milestone Management</h2>
          <p className="text-sm text-slate-500 mt-0.5">Track project progress, deliverables and timelines</p>
        </div>
        <button onClick={() => setShowModal(true)} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-bold shadow-lg shadow-amber-500/20 hover:from-amber-400 hover:to-orange-400 transition-all">
          <Plus className="w-4 h-4" /> Add Milestone
        </button>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
        {statusFilters.map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 ${statusFilter === s ? 'bg-amber-500 text-white shadow-sm' : 'bg-white text-slate-500 border border-slate-200 hover:border-amber-300'
              }`}>
            {s}
            <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold ${statusFilter === s ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
              }`}>{statusCounts[s]}</span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input type="text" placeholder="Search milestones..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-500/10 transition-all" />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Milestone</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Project</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden lg:table-cell">Assignee</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden sm:table-cell">Due Date</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="text-right px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(m => {
                const sc = statusConfig[m.status];
                const Icon = sc.icon;
                return (
                  <tr key={m.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg ${sc.bg} flex items-center justify-center shrink-0`}>
                          <Icon className={`w-4 h-4 ${sc.text}`} />
                        </div>
                        <span className="font-semibold text-slate-800">{m.title}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 hidden md:table-cell text-slate-600">{m.project}</td>
                    <td className="px-5 py-4 hidden lg:table-cell text-slate-600">{m.assignee}</td>
                    <td className="px-5 py-4 hidden sm:table-cell text-slate-600 font-mono text-xs">{m.dueDate}</td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${sc.bg} ${sc.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} /> {m.status}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <button className="p-2 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"><Edit2 className="w-4 h-4" /></button>
                        <button className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="px-5 py-12 text-center">
                  <Flag className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-sm font-semibold text-slate-500">No milestones found</p>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-slate-50/30">
          <p className="text-xs text-slate-500">Showing <strong>{filtered.length}</strong> milestones</p>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">Add Milestone</h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              {['Milestone Title', 'Project', 'Assignee', 'Due Date'].map(label => (
                <div key={label}>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">{label}</label>
                  <input type={label === 'Due Date' ? 'date' : 'text'} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-500/10 transition-all" placeholder={`Enter ${label.toLowerCase()}`} />
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100">
              <button onClick={() => setShowModal(false)} className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
              <button className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-bold shadow-md hover:from-amber-400 hover:to-orange-400 transition-all">Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
