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
    <div className="flex flex-col h-full bg-slate-50 overflow-hidden">
      {/* Top Header */}
      <div className="px-8 py-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between bg-white gap-4 shrink-0 shadow-sm z-10">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-600 shadow-sm">
            <FolderKanban className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 leading-tight">Structural Schedule Management</h2>
            <p className="text-sm text-slate-500">Manage timelines and sequencing per project</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 ml-1">Select Active Project</label>
            <select 
              className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 outline-none focus:ring-4 focus:ring-amber-500/5 focus:border-amber-400 transition-all cursor-pointer min-w-[250px]"
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

      {/* Project Details Section (Matching Screenshot) */}
      {selectedProject && (
        <div className="px-8 py-6 bg-white border-b border-slate-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-y-3 gap-x-12 p-8 rounded-[32px] bg-amber-50/40 border border-amber-100 shadow-sm">
            <div className="space-y-3">
              <p className="text-sm flex justify-between items-center border-b border-amber-100/50 pb-2">
                <span className="font-bold text-slate-500 uppercase text-[11px] tracking-tight">Customer:</span>
                <span className="font-extrabold text-slate-900">{selectedProject.customer_name}</span>
              </p>
              <p className="text-sm flex justify-between items-center border-b border-amber-100/50 pb-2">
                <span className="font-bold text-slate-500 uppercase text-[11px] tracking-tight">Job #:</span>
                <span className="font-extrabold text-slate-900">{selectedProject.code}</span>
              </p>
              <p className="text-sm flex justify-between items-center">
                <span className="font-bold text-slate-500 uppercase text-[11px] tracking-tight">PM:</span>
                <span className="font-extrabold text-slate-900">{selectedProject.project_manager_name || 'N/A'}</span>
              </p>
            </div>
            
            <div className="space-y-3">
              <p className="text-sm flex justify-between items-center border-b border-amber-100/50 pb-2">
                <span className="font-bold text-slate-500 uppercase text-[11px] tracking-tight">Detailer:</span>
                <span className="font-extrabold text-slate-900">{selectedProject.detailer_name || 'TBD'}</span>
              </p>
              <p className="text-sm flex justify-between items-center border-b border-amber-100/50 pb-2">
                <span className="font-bold text-slate-500 uppercase text-[11px] tracking-tight">Start up meeting date:</span>
                <span className="font-extrabold text-slate-900">TBD</span>
              </p>
            </div>

            <div className="space-y-3">
              <p className="text-sm flex justify-between items-center border-b border-amber-100/50 pb-2">
                <span className="font-bold text-slate-500 uppercase text-[11px] tracking-tight">Ton's:</span>
                <span className="font-extrabold text-slate-900">{selectedProject.total_ton}</span>
              </p>
              <p className="text-sm flex justify-between items-center border-b border-amber-100/50 pb-2">
                <span className="font-bold text-slate-500 uppercase text-[11px] tracking-tight">MH's:</span>
                <span className="font-extrabold text-slate-900">{selectedProject.total_manhours}</span>
              </p>
              <p className="text-sm flex justify-between items-center">
                <span className="font-bold text-slate-500 uppercase text-[11px] tracking-tight">MH per Ton:</span>
                <span className="font-black text-amber-600">{selectedProject.manhour_ton}</span>
              </p>
            </div>
          </div>

          <div className="mt-8 flex justify-end gap-4">
            <button 
              onClick={addScheduleRow}
              className="inline-flex items-center gap-2.5 px-8 py-3.5 rounded-2xl bg-white border-2 border-amber-500 text-amber-600 text-sm font-black shadow-lg shadow-amber-500/5 hover:bg-amber-50 transition-all active:scale-95"
            >
              <Plus className="w-5 h-5" /> Add Row
            </button>
            <button 
              onClick={handleSave}
              disabled={saving || !selectedProjectId}
              className="inline-flex items-center gap-2.5 px-10 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 text-white text-sm font-black shadow-xl shadow-orange-500/20 hover:shadow-orange-500/40 hover:-translate-y-0.5 transition-all active:scale-95 disabled:opacity-50"
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
          <div className="flex flex-col items-center justify-center h-full text-slate-400 bg-slate-50/50">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
              <Info className="w-8 h-8 text-slate-300" />
            </div>
            <p className="text-lg font-medium text-slate-500">Please select a project to manage its schedule</p>
            <p className="text-sm text-slate-400 mt-1">Use the dropdown menu at the top right</p>
          </div>
        ) : loading ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400">
            <Loader2 className="w-10 h-10 animate-spin mb-4" />
            <p className="text-sm font-medium">Loading schedules...</p>
          </div>
        ) : (
          <table className="w-full border-collapse table-fixed min-w-[3000px]">
            <thead className="bg-slate-50/80 sticky top-0 z-20 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-left border-b border-slate-200 backdrop-blur-sm">
              <tr>
                <th style={{ width: '80px' }} className="px-4 py-4 border-r border-slate-200 sticky left-0 bg-slate-50 z-10 text-center">SEQ #</th>
                <th style={{ width: '100px' }} className="px-4 py-4 border-r border-slate-200">Tons <span className="text-red-500">*</span></th>
                <th style={{ width: '300px' }} className="px-4 py-4 border-r border-slate-200">Item Description <span className="text-red-500">*</span></th>
                <th style={{ width: '150px' }} className="px-4 py-4 border-r border-slate-200 bg-amber-50/30">Scheduled OFA Date</th>
                <th style={{ width: '150px' }} className="px-4 py-4 border-r border-slate-200 bg-amber-50/30 text-slate-400">Actual OFA Date</th>
                <th style={{ width: '150px' }} className="px-4 py-4 border-r border-slate-200 bg-blue-50/30">Scheduled BFA Date</th>
                <th style={{ width: '150px' }} className="px-4 py-4 border-r border-slate-200 bg-blue-50/30 text-slate-400">Actual BFA Date</th>
                <th style={{ width: '150px' }} className="px-4 py-4 border-r border-slate-200 bg-emerald-50/30">Sched. Field Measure</th>
                <th style={{ width: '150px' }} className="px-4 py-4 border-r border-slate-200 bg-purple-50/30 font-bold text-purple-700">RTS Date</th>
                <th style={{ width: '80px' }} className="px-4 py-4 border-r border-slate-200 text-center bg-orange-50/30">Days</th>
                <th style={{ width: '100px' }} className="px-4 py-4 border-r border-slate-200 bg-orange-50/30">Lead (Wks)</th>
                <th style={{ width: '150px' }} className="px-4 py-4 border-r border-slate-200 bg-indigo-50/30 font-bold text-indigo-700">Sched. Erection</th>
                <th style={{ width: '100px' }} className="px-4 py-4 border-r border-slate-200">Shop Hours</th>
                <th style={{ width: '100px' }} className="px-4 py-4 border-r border-slate-200">Field Hours</th>
                <th style={{ width: '150px' }} className="px-4 py-4 border-r border-slate-200">Status</th>
                <th style={{ width: '180px' }} className="px-4 py-4 border-r border-slate-200">Location</th>
                <th style={{ width: '180px' }} className="px-4 py-4 border-r border-slate-200">Material Finish</th>
                <th style={{ width: '180px' }} className="px-4 py-4 border-r border-slate-200">Detailer/Vendor</th>
                <th style={{ width: '150px' }} className="px-4 py-4 border-r border-slate-200">Dwg Status</th>
                <th style={{ width: '300px' }} className="px-4 py-4 border-r border-slate-200">Notes</th>
                <th style={{ width: '80px' }} className="px-4 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {schedules.map((row) => {
                const isSaved = typeof row.id === 'number' && row.id < 1000000000;
                return (
                  <tr key={row.id} className={`hover:bg-slate-50/50 transition-colors group ${isSaved ? 'bg-slate-50/30' : ''}`}>
                    <td style={{ width: '80px' }} className="p-2 border-r border-slate-200 sticky left-0 bg-white group-hover:bg-slate-50 z-10">
                      <input 
                        readOnly={isSaved}
                        className={`w-full px-2 py-1.5 text-xs border border-transparent hover:border-slate-300 focus:border-amber-500 rounded outline-none bg-transparent font-bold text-center ${isSaved ? 'text-slate-500' : ''}`} 
                        value={row.seq_no} 
                        onChange={e => handleRowChange(row.id, 'seq_no', e.target.value)} 
                      />
                    </td>
                    <td style={{ width: '100px' }} className="p-2 border-r border-slate-200">
                      <input 
                        type="number" 
                        readOnly={isSaved}
                        className={`w-full px-2 py-1.5 text-xs border border-transparent hover:border-slate-300 focus:border-amber-500 rounded outline-none bg-transparent ${isSaved ? 'text-slate-500' : ''}`} 
                        value={row.tons} 
                        onChange={e => handleRowChange(row.id, 'tons', e.target.value)} 
                      />
                    </td>
                    <td style={{ width: '300px' }} className="p-2 border-r border-slate-200">
                      <input 
                        readOnly={isSaved}
                        className={`w-full px-2 py-1.5 text-xs border border-transparent hover:border-slate-300 focus:border-amber-500 rounded outline-none bg-transparent ${isSaved ? 'text-slate-500' : ''}`} 
                        value={row.item_description} 
                        onChange={e => handleRowChange(row.id, 'item_description', e.target.value)} 
                      />
                    </td>
                    <td style={{ width: '150px' }} className="p-2 border-r border-slate-200 bg-amber-50/10">
                      <input 
                        type="date" 
                        readOnly={isSaved}
                        className={`w-full px-2 py-1.5 text-xs border border-transparent bg-transparent outline-none font-medium ${isSaved ? 'text-slate-400' : 'text-amber-700'}`} 
                        value={row.scheduled_ofa_date} 
                        onChange={e => handleRowChange(row.id, 'scheduled_ofa_date', e.target.value)} 
                      />
                    </td>
                    <td style={{ width: '150px' }} className="p-2 border-r border-slate-200 bg-amber-50/10 opacity-60">
                      <input 
                        type="date" 
                        readOnly={isSaved}
                        className={`w-full px-2 py-1.5 text-xs border border-transparent bg-transparent outline-none ${isSaved ? 'text-slate-400' : ''}`} 
                        value={row.actual_ofa_date} 
                        onChange={e => handleRowChange(row.id, 'actual_ofa_date', e.target.value)} 
                      />
                    </td>
                    <td style={{ width: '150px' }} className="p-2 border-r border-slate-200 bg-blue-50/10">
                      <input 
                        type="date" 
                        readOnly={isSaved}
                        className={`w-full px-2 py-1.5 text-xs border border-transparent bg-transparent outline-none font-medium ${isSaved ? 'text-slate-400' : 'text-blue-700'}`} 
                        value={row.scheduled_bfa_date} 
                        onChange={e => handleRowChange(row.id, 'scheduled_bfa_date', e.target.value)} 
                      />
                    </td>
                    <td style={{ width: '150px' }} className="p-2 border-r border-slate-200 bg-blue-50/10 opacity-60">
                      <input 
                        type="date" 
                        readOnly={isSaved}
                        className={`w-full px-2 py-1.5 text-xs border border-transparent bg-transparent outline-none ${isSaved ? 'text-slate-400' : ''}`} 
                        value={row.actual_bfa_date} 
                        onChange={e => handleRowChange(row.id, 'actual_bfa_date', e.target.value)} 
                      />
                    </td>
                    <td style={{ width: '150px' }} className="p-2 border-r border-slate-200 bg-emerald-50/10">
                      <input 
                        type="date" 
                        readOnly={isSaved}
                        className={`w-full px-2 py-1.5 text-xs border border-transparent bg-transparent outline-none font-medium ${isSaved ? 'text-slate-400' : 'text-emerald-700'}`} 
                        value={row.scheduled_field_measure_date} 
                        onChange={e => handleRowChange(row.id, 'scheduled_field_measure_date', e.target.value)} 
                      />
                    </td>
                    <td style={{ width: '150px' }} className="p-2 border-r border-slate-200 bg-purple-50/10">
                      <input 
                        type="date" 
                        readOnly={isSaved}
                        className={`w-full px-2 py-1.5 text-xs border border-transparent bg-transparent outline-none font-bold ${isSaved ? 'text-slate-400' : 'text-purple-700'}`} 
                        value={row.rts_date} 
                        onChange={e => handleRowChange(row.id, 'rts_date', e.target.value)} 
                      />
                    </td>
                    <td style={{ width: '80px' }} className="p-2 border-r border-slate-200 bg-orange-50/10 text-center font-bold text-orange-700 text-xs">
                      {row.num_days}
                    </td>
                    <td style={{ width: '100px' }} className="p-2 border-r border-slate-200 bg-orange-50/10">
                      <input 
                        type="number" 
                        readOnly={isSaved}
                        className={`w-full px-2 py-1.5 text-xs border border-transparent hover:border-slate-300 focus:border-amber-500 rounded outline-none bg-white font-bold ${isSaved ? 'text-slate-400' : ''}`} 
                        value={row.shop_lead_time_weeks} 
                        onChange={e => handleRowChange(row.id, 'shop_lead_time_weeks', e.target.value)} 
                      />
                    </td>
                    <td style={{ width: '150px' }} className="p-2 border-r border-slate-200 bg-indigo-50/10">
                      <input 
                        type="date" 
                        readOnly={isSaved}
                        className={`w-full px-2 py-1.5 text-xs border border-transparent bg-transparent outline-none font-bold ${isSaved ? 'text-slate-400' : 'text-indigo-700'}`} 
                        value={row.scheduled_erection_date} 
                        onChange={e => handleRowChange(row.id, 'scheduled_erection_date', e.target.value)} 
                      />
                    </td>
                    <td style={{ width: '100px' }} className="p-2 border-r border-slate-200">
                      <input 
                        type="number" 
                        readOnly={isSaved}
                        className={`w-full px-2 py-1.5 text-xs border border-transparent hover:border-slate-300 focus:border-amber-500 rounded outline-none ${isSaved ? 'text-slate-500' : ''}`} 
                        value={row.shop_hours} 
                        onChange={e => handleRowChange(row.id, 'shop_hours', e.target.value)} 
                      />
                    </td>
                    <td style={{ width: '100px' }} className="p-2 border-r border-slate-200">
                      <input 
                        type="number" 
                        readOnly={isSaved}
                        className={`w-full px-2 py-1.5 text-xs border border-transparent hover:border-slate-300 focus:border-amber-500 rounded outline-none ${isSaved ? 'text-slate-500' : ''}`} 
                        value={row.field_hours} 
                        onChange={e => handleRowChange(row.id, 'field_hours', e.target.value)} 
                      />
                    </td>
                    <td style={{ width: '150px' }} className="p-2 border-r border-slate-200">
                      <input 
                        readOnly={isSaved}
                        className={`w-full px-2 py-1.5 text-xs border border-transparent hover:border-slate-300 focus:border-amber-500 rounded outline-none ${isSaved ? 'text-slate-500' : ''}`} 
                        value={row.status} 
                        onChange={e => handleRowChange(row.id, 'status', e.target.value)} 
                      />
                    </td>
                    <td style={{ width: '180px' }} className="p-2 border-r border-slate-200">
                      <input 
                        readOnly={isSaved}
                        className={`w-full px-2 py-1.5 text-xs border border-transparent hover:border-slate-300 focus:border-amber-500 rounded outline-none ${isSaved ? 'text-slate-500' : ''}`} 
                        value={row.location} 
                        onChange={e => handleRowChange(row.id, 'location', e.target.value)} 
                      />
                    </td>
                    <td style={{ width: '180px' }} className="p-2 border-r border-slate-200">
                      <input 
                        readOnly={isSaved}
                        className={`w-full px-2 py-1.5 text-xs border border-transparent hover:border-slate-300 focus:border-amber-500 rounded outline-none ${isSaved ? 'text-slate-500' : ''}`} 
                        value={row.material_finish} 
                        onChange={e => handleRowChange(row.id, 'material_finish', e.target.value)} 
                      />
                    </td>
                    <td style={{ width: '180px' }} className="p-2 border-r border-slate-200">
                      <input 
                        readOnly={isSaved}
                        className={`w-full px-2 py-1.5 text-xs border border-transparent hover:border-slate-300 focus:border-amber-500 rounded outline-none ${isSaved ? 'text-slate-500' : ''}`} 
                        value={row.detailer_vendor} 
                        onChange={e => handleRowChange(row.id, 'detailer_vendor', e.target.value)} 
                      />
                    </td>
                    <td style={{ width: '150px' }} className="p-2 border-r border-slate-200">
                      <input 
                        readOnly={isSaved}
                        className={`w-full px-2 py-1.5 text-xs border border-transparent hover:border-slate-300 focus:border-amber-500 rounded outline-none ${isSaved ? 'text-slate-500' : ''}`} 
                        value={row.dwg_status} 
                        onChange={e => handleRowChange(row.id, 'dwg_status', e.target.value)} 
                      />
                    </td>
                    <td style={{ width: '300px' }} className="p-2 border-r border-slate-200">
                      <input 
                        readOnly={isSaved}
                        className={`w-full px-2 py-1.5 text-xs border border-transparent hover:border-slate-300 focus:border-amber-500 rounded outline-none ${isSaved ? 'text-slate-500' : ''}`} 
                        value={row.notes} 
                        onChange={e => handleRowChange(row.id, 'notes', e.target.value)} 
                      />
                    </td>
                    <td style={{ width: '80px' }} className="p-2 text-center">
                      <button onClick={() => handleDeleteRow(row.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all">
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
