import { X, Save } from 'lucide-react';

export default function AnglePriorityForm({ onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-8 py-5 border-b border-slate-100 bg-slate-50/50">
          <div>
            <h3 className="text-xl font-bold text-slate-900">Angle Priority Form</h3>
            <p className="text-xs text-slate-500 mt-0.5">Manage angle production priorities</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-white shadow-sm transition-all"><X className="w-6 h-6" /></button>
        </div>

        <div className="p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Angle Size</label>
              <input className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-500/5 transition-all" placeholder="e.g. 50x50x5" />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Length (m)</label>
              <input type="number" className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-500/5 transition-all" />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Quantity</label>
              <input type="number" className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-500/5 transition-all" />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Priority</label>
              <select className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-500/5 transition-all">
                <option>High</option>
                <option>Normal</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 px-8 py-5 border-t border-slate-100 bg-slate-50/50">
          <button onClick={onClose} className="px-6 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-white transition-all shadow-sm">Cancel</button>
          <button className="px-8 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-bold shadow-lg shadow-blue-500/20 hover:from-blue-500 hover:to-indigo-500 transition-all flex items-center gap-2">
            <Save className="w-4 h-4" /> Save Angle
          </button>
        </div>
      </div>
    </div>
  );
}