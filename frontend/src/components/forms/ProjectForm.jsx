import { X, Save, FolderKanban } from 'lucide-react';

export default function ProjectForm({ 
  form, 
  setForm, 
  handleSave, 
  onClose, 
  isEditing, 
  loading,
  autocalculateManhourTon 
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-6xl max-h-[95vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-slate-100 bg-slate-50/50">
          <div>
            <h3 className="text-xl font-bold text-slate-900">{isEditing ? 'Project Details' : 'New Project Master Setup'}</h3>
            <p className="text-xs text-slate-500 mt-0.5">{isEditing ? 'View and update project schedules' : 'Fill in the basic project details'}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-white shadow-sm transition-all"><X className="w-6 h-6" /></button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          {/* Basic Details Section */}
          <section className="space-y-6">
            <div className="flex items-center gap-3 pb-2 border-b border-slate-100">
              <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600">
                <FolderKanban className="w-4 h-4" />
              </div>
              <h4 className="font-bold text-slate-800">Basic Project Information</h4>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Project Name</label>
                <input 
                  value={form.name}
                  onChange={e => setForm({...form, name: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-500/5 transition-all" 
                  placeholder="e.g. Skyline Tower" 
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Project Code</label>
                <input 
                  value={form.code}
                  onChange={e => setForm({...form, code: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-500/5 transition-all" 
                  placeholder="e.g. PRJ-001" 
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Customer Name</label>
                <input 
                  value={form.customer_name}
                  onChange={e => setForm({...form, customer_name: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-500/5 transition-all" 
                  placeholder="Enter customer" 
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Detailer Name</label>
                <input 
                  value={form.detailer_name}
                  onChange={e => setForm({...form, detailer_name: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-500/5 transition-all" 
                  placeholder="Enter detailer" 
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Project Manager</label>
                <input 
                  value={form.project_manager_name}
                  onChange={e => setForm({...form, project_manager_name: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-500/5 transition-all" 
                  placeholder="Enter PM name" 
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Erection Date</label>
                <input 
                  type="date"
                  value={form.erection_date}
                  onChange={e => setForm({...form, erection_date: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-500/5 transition-all" 
                />
              </div>
              <div className="lg:col-span-2 grid grid-cols-3 gap-4 p-4 rounded-2xl bg-amber-50/50 border border-amber-100">
                <div>
                  <label className="block text-[10px] font-bold text-amber-700 uppercase mb-1.5">Total Ton</label>
                  <input 
                    type="number"
                    value={form.total_ton}
                    onChange={e => setForm({...form, total_ton: e.target.value})}
                    className="w-full px-3 py-2 rounded-lg border border-amber-200 bg-white text-sm outline-none focus:border-amber-400" 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-amber-700 uppercase mb-1.5">Total Manhours</label>
                  <input 
                    type="number"
                    value={form.total_manhours}
                    onChange={e => setForm({...form, total_manhours: e.target.value})}
                    className="w-full px-3 py-2 rounded-lg border border-amber-200 bg-white text-sm outline-none focus:border-amber-400" 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-amber-700 uppercase mb-1.5">Manhour / Ton</label>
                  <div className="w-full px-3 py-2 rounded-lg bg-amber-100/50 text-amber-900 font-bold text-sm border border-amber-200 text-center">
                    {autocalculateManhourTon()}
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Modal Footer */}
        <div className="flex justify-end gap-3 px-8 py-5 border-t border-slate-100 bg-slate-50/50">
          <button onClick={onClose} className="px-6 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-white transition-all shadow-sm">Cancel</button>
          <button 
            onClick={handleSave}
            disabled={loading}
            className="px-8 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-bold shadow-lg shadow-blue-500/20 hover:from-blue-500 hover:to-indigo-500 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {loading ? 'Saving...' : <><Save className="w-4 h-4" /> Save Project</>}
          </button>
        </div>
      </div>
    </div>
  );
}
