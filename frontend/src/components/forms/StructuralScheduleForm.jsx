import React from 'react';
import { Plus, Save, Loader2, Trash2, FolderKanban, Info } from 'lucide-react';

export default function StructuralScheduleForm({
  projects,
  schedules,
  selectedProjectId,
  setSelectedProjectId,
  loading,
  saving,
  addScheduleRow,
  handleRowChange,
  handleDeleteRow,
  handleSave
}) {
  const selectedProject = projects.find(p => p.id === parseInt(selectedProjectId));

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden">
      {/* Top Header */}
      <div className="px-8 py-5 border-b border-slate-300 flex flex-col sm:flex-row sm:items-center justify-between bg-white gap-4 shrink-0 shadow-sm z-10">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-none bg-amber-100 flex items-center justify-center text-amber-600 shadow-sm">
            <FolderKanban className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 leading-tight">Structural Schedule Management</h2>
            <p className="text-sm text-slate-500 font-medium">Manage timelines and sequencing per project</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Select Active Project</label>
            <select 
              className="px-4 py-2.5 bg-white border border-slate-300 rounded-none text-sm font-bold text-slate-800 outline-none focus:ring-4 focus:ring-amber-500/5 focus:border-amber-400 transition-all cursor-pointer min-w-[250px]"
              value={selectedProjectId}
              onChange={e => setSelectedProjectId(e.target.value)}
            >
              <option value="">Choose a Project...</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Project Details Section */}
      {selectedProject && (
        <div className="px-8 py-6 bg-white border-b border-slate-300">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-y-3 gap-x-12 p-8 bg-white border border-slate-300 shadow-sm">
            <div className="space-y-3">
              <p className="text-sm flex justify-between items-center border-b border-slate-100 pb-2">
                <span className="font-bold text-slate-400 uppercase text-[10px] tracking-widest">Customer:</span>
                <span className="font-black text-slate-900">{selectedProject.customer_name}</span>
              </p>
              <p className="text-sm flex justify-between items-center border-b border-slate-100 pb-2">
                <span className="font-bold text-slate-400 uppercase text-[10px] tracking-widest">Job #:</span>
                <span className="font-black text-slate-900">{selectedProject.code}</span>
              </p>
              <p className="text-sm flex justify-between items-center">
                <span className="font-bold text-slate-400 uppercase text-[10px] tracking-widest">PM:</span>
                <span className="font-black text-slate-900">{selectedProject.project_manager_name || 'N/A'}</span>
              </p>
            </div>
            
            <div className="space-y-3">
              <p className="text-sm flex justify-between items-center border-b border-slate-100 pb-2">
                <span className="font-bold text-slate-400 uppercase text-[10px] tracking-widest">Detailer:</span>
                <span className="font-black text-slate-900">{selectedProject.detailer_name || 'TBD'}</span>
              </p>
              <p className="text-sm flex justify-between items-center border-b border-slate-100 pb-2">
                <span className="font-bold text-slate-400 uppercase text-[10px] tracking-widest">Start up date:</span>
                <span className="font-black text-slate-900">TBD</span>
              </p>
            </div>

            <div className="space-y-3">
              <p className="text-sm flex justify-between items-center border-b border-slate-100 pb-2">
                <span className="font-bold text-slate-400 uppercase text-[10px] tracking-widest">Ton's:</span>
                <span className="font-black text-slate-900">{selectedProject.total_ton}</span>
              </p>
              <p className="text-sm flex justify-between items-center border-b border-slate-100 pb-2">
                <span className="font-bold text-slate-400 uppercase text-[10px] tracking-widest">MH's:</span>
                <span className="font-black text-slate-900">{selectedProject.total_manhours}</span>
              </p>
              <p className="text-sm flex justify-between items-center">
                <span className="font-bold text-slate-400 uppercase text-[10px] tracking-widest">MH per Ton:</span>
                <span className="font-black text-amber-600">{selectedProject.manhour_ton}</span>
              </p>
            </div>
          </div>

          <div className="mt-8 flex justify-end gap-4">
            <button 
              onClick={addScheduleRow}
              className="inline-flex items-center gap-2.5 px-8 py-3.5 bg-white border-2 border-slate-900 text-slate-900 text-xs font-black uppercase tracking-widest shadow-lg hover:bg-slate-50 transition-all active:scale-95"
            >
              <Plus className="w-5 h-5" /> Add Row
            </button>
            <button 
              onClick={handleSave}
              disabled={saving || !selectedProjectId}
              className="inline-flex items-center gap-2.5 px-10 py-3.5 bg-slate-900 text-white text-xs font-black uppercase tracking-[0.2em] shadow-xl hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              Save All Changes
            </button>
          </div>
        </div>
      )}

      {/* Main Content: Schedule Table */}
      <div className="flex-1 overflow-auto bg-white">
        {!selectedProjectId ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 bg-white">
            <div className="w-16 h-16 rounded-none bg-slate-100 flex items-center justify-center mb-4 border border-slate-200">
              <Info className="w-8 h-8 text-slate-300" />
            </div>
            <p className="text-lg font-black text-slate-900 uppercase tracking-tight">Select Project to Start Planning</p>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-2">Use the dropdown menu above</p>
          </div>
        ) : loading ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400">
            <Loader2 className="w-10 h-10 animate-spin mb-4 text-amber-500" />
            <p className="text-xs font-black uppercase tracking-widest">Loading schedules...</p>
          </div>
        ) : (
          <table className="w-full border-collapse table-fixed min-w-[3000px]">
            <thead className="bg-white sticky top-0 z-20 text-[10px] font-black text-slate-500 uppercase tracking-widest text-left border-b border-slate-300">
              <tr>
                <th style={{ width: '80px' }} className="px-4 py-5 border-r border-slate-300 sticky left-0 bg-white z-10 text-center">SEQ #</th>
                <th style={{ width: '100px' }} className="px-4 py-5 border-r border-slate-300">Tons</th>
                <th style={{ width: '300px' }} className="px-4 py-5 border-r border-slate-300">Item Description</th>
                <th style={{ width: '150px' }} className="px-4 py-5 border-r border-slate-300">Sched OFA</th>
                <th style={{ width: '150px' }} className="px-4 py-5 border-r border-slate-300 text-slate-400">Actual OFA</th>
                <th style={{ width: '150px' }} className="px-4 py-5 border-r border-slate-300">Sched BFA</th>
                <th style={{ width: '150px' }} className="px-4 py-5 border-r border-slate-300 text-slate-400">Actual BFA</th>
                <th style={{ width: '150px' }} className="px-4 py-5 border-r border-slate-300">Sched Field</th>
                <th style={{ width: '150px' }} className="px-4 py-5 border-r border-slate-300 font-black text-amber-600">RTS Date</th>
                <th style={{ width: '80px' }} className="px-4 py-5 border-r border-slate-300 text-center">Days</th>
                <th style={{ width: '100px' }} className="px-4 py-5 border-r border-slate-300">Lead (Wks)</th>
                <th style={{ width: '150px' }} className="px-4 py-5 border-r border-slate-300 font-black text-blue-600">Sched Erection</th>
                <th style={{ width: '100px' }} className="px-4 py-5 border-r border-slate-300">Shop Hrs</th>
                <th style={{ width: '100px' }} className="px-4 py-5 border-r border-slate-300">Field Hrs</th>
                <th style={{ width: '150px' }} className="px-4 py-5 border-r border-slate-300">Status</th>
                <th style={{ width: '180px' }} className="px-4 py-5 border-r border-slate-300">Location</th>
                <th style={{ width: '180px' }} className="px-4 py-5 border-r border-slate-300">Finish</th>
                <th style={{ width: '180px' }} className="px-4 py-5 border-r border-slate-300">Detailer</th>
                <th style={{ width: '150px' }} className="px-4 py-5 border-r border-slate-300">Dwg Status</th>
                <th style={{ width: '300px' }} className="px-4 py-5 border-r border-slate-300">Notes</th>
                <th style={{ width: '80px' }} className="px-4 py-5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {schedules.map((row) => {
                const isSaved = typeof row.id === 'number' && row.id < 1000000000;
                return (
                  <tr key={row.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="p-2 border-r border-slate-300 sticky left-0 bg-white group-hover:bg-slate-50 z-10">
                      <input 
                        className="w-full px-2 py-2 text-xs border border-transparent focus:border-amber-400 outline-none bg-transparent font-black text-center" 
                        value={row.seq_no} 
                        onChange={e => handleRowChange(row.id, 'seq_no', e.target.value)} 
                      />
                    </td>
                    <td className="p-2 border-r border-slate-300">
                      <input 
                        type="number" 
                        className="w-full px-2 py-2 text-xs border border-transparent focus:border-amber-400 outline-none bg-transparent font-bold" 
                        value={row.tons} 
                        onChange={e => handleRowChange(row.id, 'tons', e.target.value)} 
                      />
                    </td>
                    <td className="p-2 border-r border-slate-300">
                      <input 
                        className="w-full px-2 py-2 text-xs border border-transparent focus:border-amber-400 outline-none bg-transparent font-bold" 
                        value={row.item_description} 
                        onChange={e => handleRowChange(row.id, 'item_description', e.target.value)} 
                      />
                    </td>
                    <td className="p-2 border-r border-slate-300">
                      <input 
                        type="date" 
                        className="w-full px-2 py-2 text-xs border border-transparent focus:border-amber-400 outline-none bg-transparent" 
                        value={row.scheduled_ofa_date} 
                        onChange={e => handleRowChange(row.id, 'scheduled_ofa_date', e.target.value)} 
                      />
                    </td>
                    <td className="p-2 border-r border-slate-300 opacity-50">
                      <input 
                        type="date" 
                        className="w-full px-2 py-2 text-xs border border-transparent focus:border-amber-400 outline-none bg-transparent" 
                        value={row.actual_ofa_date} 
                        onChange={e => handleRowChange(row.id, 'actual_ofa_date', e.target.value)} 
                      />
                    </td>
                    <td className="p-2 border-r border-slate-300">
                      <input 
                        type="date" 
                        className="w-full px-2 py-2 text-xs border border-transparent focus:border-amber-400 outline-none bg-transparent" 
                        value={row.scheduled_bfa_date} 
                        onChange={e => handleRowChange(row.id, 'scheduled_bfa_date', e.target.value)} 
                      />
                    </td>
                    <td className="p-2 border-r border-slate-300 opacity-50">
                      <input 
                        type="date" 
                        className="w-full px-2 py-2 text-xs border border-transparent focus:border-amber-400 outline-none bg-transparent" 
                        value={row.actual_bfa_date} 
                        onChange={e => handleRowChange(row.id, 'actual_bfa_date', e.target.value)} 
                      />
                    </td>
                    <td className="p-2 border-r border-slate-300">
                      <input 
                        type="date" 
                        className="w-full px-2 py-2 text-xs border border-transparent focus:border-amber-400 outline-none bg-transparent" 
                        value={row.scheduled_field_measure_date} 
                        onChange={e => handleRowChange(row.id, 'scheduled_field_measure_date', e.target.value)} 
                      />
                    </td>
                    <td className="p-2 border-r border-slate-300">
                      <input 
                        type="date" 
                        className="w-full px-2 py-2 text-xs border border-transparent focus:border-amber-400 outline-none bg-transparent font-black text-amber-600" 
                        value={row.rts_date} 
                        onChange={e => handleRowChange(row.id, 'rts_date', e.target.value)} 
                      />
                    </td>
                    <td className="p-2 border-r border-slate-300 text-center font-black text-slate-400 text-xs">
                      {row.num_days || '-'}
                    </td>
                    <td className="p-2 border-r border-slate-300">
                      <input 
                        type="number" 
                        className="w-full px-2 py-2 text-xs border border-transparent focus:border-amber-400 outline-none bg-transparent font-black" 
                        value={row.shop_lead_time_weeks} 
                        onChange={e => handleRowChange(row.id, 'shop_lead_time_weeks', e.target.value)} 
                      />
                    </td>
                    <td className="p-2 border-r border-slate-300">
                      <input 
                        type="date" 
                        className="w-full px-2 py-2 text-xs border border-transparent focus:border-amber-400 outline-none bg-transparent font-black text-blue-600" 
                        value={row.scheduled_erection_date} 
                        onChange={e => handleRowChange(row.id, 'scheduled_erection_date', e.target.value)} 
                      />
                    </td>
                    <td className="p-2 border-r border-slate-300">
                      <input 
                        type="number" 
                        className="w-full px-2 py-2 text-xs border border-transparent focus:border-amber-400 outline-none bg-transparent" 
                        value={row.shop_hours} 
                        onChange={e => handleRowChange(row.id, 'shop_hours', e.target.value)} 
                      />
                    </td>
                    <td className="p-2 border-r border-slate-300">
                      <input 
                        type="number" 
                        className="w-full px-2 py-2 text-xs border border-transparent focus:border-amber-400 outline-none bg-transparent" 
                        value={row.field_hours} 
                        onChange={e => handleRowChange(row.id, 'field_hours', e.target.value)} 
                      />
                    </td>
                    <td className="p-2 border-r border-slate-300">
                      <input 
                        className="w-full px-2 py-2 text-xs border border-transparent focus:border-amber-400 outline-none bg-transparent font-bold" 
                        value={row.status} 
                        onChange={e => handleRowChange(row.id, 'status', e.target.value)} 
                      />
                    </td>
                    <td className="p-2 border-r border-slate-300">
                      <input 
                        className="w-full px-2 py-2 text-xs border border-transparent focus:border-amber-400 outline-none bg-transparent" 
                        value={row.location} 
                        onChange={e => handleRowChange(row.id, 'location', e.target.value)} 
                      />
                    </td>
                    <td className="p-2 border-r border-slate-300">
                      <input 
                        className="w-full px-2 py-2 text-xs border border-transparent focus:border-amber-400 outline-none bg-transparent" 
                        value={row.material_finish} 
                        onChange={e => handleRowChange(row.id, 'material_finish', e.target.value)} 
                      />
                    </td>
                    <td className="p-2 border-r border-slate-300">
                      <input 
                        className="w-full px-2 py-2 text-xs border border-transparent focus:border-amber-400 outline-none bg-transparent" 
                        value={row.detailer_vendor} 
                        onChange={e => handleRowChange(row.id, 'detailer_vendor', e.target.value)} 
                      />
                    </td>
                    <td className="p-2 border-r border-slate-300">
                      <input 
                        className="w-full px-2 py-2 text-xs border border-transparent focus:border-amber-400 outline-none bg-transparent" 
                        value={row.dwg_status} 
                        onChange={e => handleRowChange(row.id, 'dwg_status', e.target.value)} 
                      />
                    </td>
                    <td className="p-2 border-r border-slate-300">
                      <input 
                        className="w-full px-2 py-2 text-xs border border-transparent focus:border-amber-400 outline-none bg-transparent" 
                        value={row.notes} 
                        onChange={e => handleRowChange(row.id, 'notes', e.target.value)} 
                      />
                    </td>
                    <td className="p-2 text-center">
                      <button onClick={() => handleDeleteRow(row.id)} className="p-2 rounded-none text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
