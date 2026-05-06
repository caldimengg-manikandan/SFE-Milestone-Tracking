import { useState } from 'react';
import { FolderKanban, Plus, Search, Edit2, Trash2, X, Eye } from 'lucide-react';

const mockProjects = [
  { id: 1, code: 'PRJ-2026-001', name: 'Steel Bridge Phase 2', client: 'Metro Corp', manager: 'Rajesh Kumar', startDate: '2026-01-15', endDate: '2026-08-30', budget: '₹2.4 Cr', status: 'In Progress', progress: 65 },
  { id: 2, code: 'PRJ-2026-002', name: 'Factory Expansion Unit A', client: 'AutoParts Ltd', manager: 'Priya Sharma', startDate: '2026-02-01', endDate: '2026-06-15', budget: '₹1.8 Cr', status: 'In Progress', progress: 40 },
  { id: 3, code: 'PRJ-2026-003', name: 'Warehouse Unit B', client: 'LogiFreight', manager: 'Arun Patel', startDate: '2025-11-10', endDate: '2026-04-30', budget: '₹3.1 Cr', status: 'Delayed', progress: 78 },
  { id: 4, code: 'PRJ-2025-014', name: 'Commercial Complex Frame', client: 'Sunrise Builders', manager: 'Vikram Singh', startDate: '2025-08-01', endDate: '2026-03-15', budget: '₹5.2 Cr', status: 'Completed', progress: 100 },
];

const statusColors = { 'In Progress': 'bg-blue-50 text-blue-600', Completed: 'bg-emerald-50 text-emerald-600', Delayed: 'bg-red-50 text-red-600', Planning: 'bg-slate-100 text-slate-600' };
const statusDot = { 'In Progress': 'bg-blue-500', Completed: 'bg-emerald-500', Delayed: 'bg-red-500', Planning: 'bg-slate-400' };

export default function ProjectMaster() {
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const filtered = mockProjects.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.code.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Project Master</h2>
          <p className="text-sm text-slate-500 mt-0.5">Create and maintain project information</p>
        </div>
        <button onClick={() => setShowModal(true)} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-bold shadow-lg shadow-amber-500/20 hover:from-amber-400 hover:to-orange-400 transition-all">
          <Plus className="w-4 h-4" /> New Project
        </button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input type="text" placeholder="Search projects..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-500/10 transition-all" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((p) => (
          <div key={p.id} className="bg-white rounded-2xl border border-slate-200/60 p-5 shadow-card hover:shadow-card-hover transition-all duration-300 hover:-translate-y-0.5 group">
            <div className="flex items-start justify-between mb-3">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${statusColors[p.status]}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${statusDot[p.status]}`} /> {p.status}
              </span>
              <span className="text-xs font-mono text-slate-400">{p.code}</span>
            </div>
            <h3 className="text-base font-bold text-slate-800 mb-1 group-hover:text-amber-600 transition-colors">{p.name}</h3>
            <p className="text-xs text-slate-500 mb-4">{p.client}</p>
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-semibold text-slate-500">Progress</span>
                <span className="text-[11px] font-bold text-slate-700">{p.progress}%</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-500 ${p.progress === 100 ? 'bg-emerald-500' : p.status === 'Delayed' ? 'bg-red-400' : 'bg-gradient-to-r from-amber-400 to-orange-500'}`} style={{ width: `${p.progress}%` }} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div><p className="text-slate-400">Manager</p><p className="text-slate-700 font-semibold">{p.manager}</p></div>
              <div><p className="text-slate-400">Budget</p><p className="text-slate-700 font-semibold">{p.budget}</p></div>
            </div>
            <div className="flex items-center gap-1 mt-4 pt-4 border-t border-slate-100">
              <button className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold text-slate-500 hover:text-amber-600 hover:bg-amber-50 transition-colors"><Eye className="w-3.5 h-3.5" /> View</button>
              <button className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"><Edit2 className="w-3.5 h-3.5" /> Edit</button>
              <button className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"><Trash2 className="w-3.5 h-3.5" /> Delete</button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full flex flex-col items-center py-16">
            <FolderKanban className="w-12 h-12 text-slate-300 mb-3" />
            <p className="text-sm font-semibold text-slate-500">No projects found</p>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">Create Project</h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              {['Project Name', 'Client Name', 'Project Manager', 'Budget'].map((label) => (
                <div key={label}>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">{label}</label>
                  <input className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-500/10 transition-all" placeholder={`Enter ${label.toLowerCase()}`} />
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
