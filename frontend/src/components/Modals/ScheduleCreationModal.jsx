import React from 'react';
import { X, Plus, Save, Loader2, Trash2, FolderKanban, Download, Trash, ClipboardList } from 'lucide-react';

export default function ScheduleCreationModal({
  isOpen,
  onClose,
  mode, // 'view', 'edit', 'delete'
  project,
  schedules,
  saving,
  addScheduleRow,
  handleRowChange,
  handleDeleteRow,
  handleSave,
  handleDeleteAll,
  generatePDF
}) {
  if (!isOpen) return null;

  const isReadOnly = mode === 'view' || mode === 'delete';

  // Calculate Summary Metrics
  const totalTons = schedules.reduce((sum, r) => sum + (parseFloat(r.tons) || 0), 0).toFixed(2);
  const totalMH = schedules.reduce((sum, r) => sum + (parseFloat(r.shop_hours) || 0) + (parseFloat(r.field_hours) || 0), 0).toFixed(2);
  const mhPerTon = totalTons > 0 ? (totalMH / totalTons).toFixed(2) : '0.00';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 md:p-10">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={onClose} />
      <div className="relative w-full max-w-[75vw] h-[85vh] bg-slate-50 rounded-[40px] shadow-2xl overflow-hidden flex flex-col border border-white/20">
        
        {/* Modal Header */}
        <div className="px-10 py-8 bg-white border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 rounded-[22px] bg-amber-100 flex items-center justify-center text-amber-600 shadow-inner">
              <ClipboardList className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                {mode === 'view' ? 'View' : mode === 'edit' ? 'Edit' : 'Delete'} Schedule Plan
              </h2>
              <p className="text-sm text-slate-500 font-medium">
                Comprehensive project execution tracking
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={generatePDF}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-100 text-slate-600 text-sm font-bold hover:bg-slate-200"
            >
              <Download className="w-4 h-4" /> Download PDF
            </button>
            <button onClick={onClose} className="p-3 hover:bg-slate-100 rounded-2xl transition-all active:scale-90 text-slate-400">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-10 space-y-10">
          
          {/* BASIC PROJECT INFORMATION BLOCK (Image 2) */}
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
                <FolderKanban className="w-4 h-4" />
              </div>
              <h3 className="text-base font-black text-slate-800">Basic Project Information</h3>
            </div>

            <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-4 gap-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Project Name</label>
                <div className="px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-700">
                  {project?.name || '---'}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Project Code</label>
                <div className="px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-700">
                  {project?.code || '---'}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Customer Name</label>
                <div className="px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-700">
                  {project?.customer_name || '---'}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Detailer Name</label>
                <div className="px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-700">
                  {project?.detailer_name || '---'}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Project Manager</label>
                <div className="px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-700">
                  {project?.project_manager_name || '---'}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Erection Date</label>
                <div className="px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-700">
                  {project?.erection_date || '---'}
                </div>
              </div>

              {/* Metrics Summary Card */}
              <div className="md:col-span-2 bg-amber-50/50 border border-amber-100 rounded-[28px] p-6 flex items-center justify-around">
                <div className="text-center">
                  <p className="text-[9px] font-black text-orange-400 uppercase tracking-widest mb-1">Total Ton</p>
                  <p className="text-lg font-black text-slate-800">{totalTons}</p>
                </div>
                <div className="w-px h-10 bg-amber-200/50" />
                <div className="text-center">
                  <p className="text-[9px] font-black text-orange-400 uppercase tracking-widest mb-1">Total Manhours</p>
                  <p className="text-lg font-black text-slate-800">{totalMH}</p>
                </div>
                <div className="w-px h-10 bg-amber-200/50" />
                <div className="text-center">
                  <p className="text-[9px] font-black text-orange-400 uppercase tracking-widest mb-1">Manhour / Ton</p>
                  <p className="text-lg font-black text-orange-700">{mhPerTon}</p>
                </div>
              </div>
            </div>
          </div>

          {/* TABLE SECTION (Image 1) */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                  <ClipboardList className="w-4 h-4" />
                </div>
                <h3 className="text-base font-black text-slate-800">Execution Schedule</h3>
              </div>
              <div className="flex gap-4">
                {mode === 'edit' && (
                  <>
                    <button 
                      onClick={addScheduleRow}
                      className="inline-flex items-center gap-3 px-8 py-3.5 rounded-2xl bg-white border-2 border-amber-500 text-amber-600 text-sm font-black shadow-lg shadow-amber-500/5 hover:bg-amber-50 transition-all active:scale-95"
                    >
                      <Plus className="w-5 h-5" /> Add a Row
                    </button>
                    <button 
                      onClick={handleSave}
                      disabled={saving}
                      className="inline-flex items-center gap-3 px-10 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 text-white text-sm font-black shadow-xl shadow-orange-500/20 hover:shadow-orange-500/40 hover:-translate-y-0.5 transition-all active:scale-95 disabled:opacity-50"
                    >
                      {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                      Save All Changes
                    </button>
                  </>
                )}
                {mode === 'delete' && (
                  <button 
                    onClick={handleDeleteAll}
                    className="inline-flex items-center gap-3 px-10 py-3.5 rounded-2xl bg-red-600 text-white text-sm font-black shadow-xl shadow-red-500/20 hover:bg-red-700 transition-all active:scale-95"
                  >
                    <Trash className="w-5 h-5" /> Confirm Delete All Data
                  </button>
                )}
              </div>
            </div>

            <div className="rounded-[32px] border border-slate-200 overflow-hidden bg-white shadow-xl shadow-slate-200/20">
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full border-collapse table-fixed min-w-[3000px]">
                  <thead className="bg-slate-50 text-[11px] font-black text-slate-400 uppercase tracking-widest text-left border-b border-slate-200">
                    <tr>
                      <th style={{ width: '80px' }} className="px-6 py-5 border-r border-slate-200 sticky left-0 bg-slate-50 z-10 text-center">SEQ #</th>
                      <th style={{ width: '100px' }} className="px-6 py-5 border-r border-slate-200">Tons</th>
                      <th style={{ width: '300px' }} className="px-6 py-5 border-r border-slate-200">Description</th>
                      <th style={{ width: '150px' }} className="px-6 py-5 border-r border-slate-200 bg-amber-50/30 text-amber-600">Sched OFA</th>
                      <th style={{ width: '150px' }} className="px-6 py-5 border-r border-slate-200 bg-amber-50/10">Actual OFA</th>
                      <th style={{ width: '150px' }} className="px-6 py-5 border-r border-slate-200 bg-blue-50/30 text-blue-600">Sched BFA</th>
                      <th style={{ width: '150px' }} className="px-6 py-5 border-r border-slate-200 bg-blue-50/10">Actual BFA</th>
                      <th style={{ width: '150px' }} className="px-6 py-5 border-r border-slate-200 bg-emerald-50/30 text-emerald-600">Field Meas.</th>
                      <th style={{ width: '150px' }} className="px-6 py-5 border-r border-slate-200 bg-purple-50/30 text-purple-600 font-black">RTS Date</th>
                      <th style={{ width: '80px' }} className="px-6 py-5 border-r border-slate-200 text-center bg-orange-50/30">Days</th>
                      <th style={{ width: '100px' }} className="px-6 py-5 border-r border-slate-200 bg-orange-50/30">Lead (Wks)</th>
                      <th style={{ width: '150px' }} className="px-6 py-5 border-r border-slate-200 bg-indigo-50/30 text-indigo-600 font-black">Erection</th>
                      <th style={{ width: '100px' }} className="px-6 py-5 border-r border-slate-200">Shop Hrs</th>
                      <th style={{ width: '100px' }} className="px-6 py-5 border-r border-slate-200">Field Hrs</th>
                      <th style={{ width: '150px' }} className="px-6 py-5 border-r border-slate-200">Status</th>
                      <th style={{ width: '180px' }} className="px-6 py-5 border-r border-slate-200">Location</th>
                      <th style={{ width: '180px' }} className="px-6 py-5 border-r border-slate-200">Material</th>
                      <th style={{ width: '180px' }} className="px-6 py-5 border-r border-slate-200">Detailer</th>
                      <th style={{ width: '150px' }} className="px-6 py-5 border-r border-slate-200">DWG Stat</th>
                      <th style={{ width: '300px' }} className="px-6 py-5 border-r border-slate-200">Notes</th>
                      {mode === 'edit' && <th style={{ width: '80px' }} className="px-6 py-5 text-center">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {schedules.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-50 transition-colors group">
                        <td className="p-3 border-r border-slate-100 sticky left-0 bg-white group-hover:bg-slate-50 z-10">
                          <input readOnly={isReadOnly} className={`w-full px-3 py-2 text-xs font-black text-center outline-none bg-transparent ${isReadOnly ? 'text-slate-400' : 'text-slate-900'}`} value={row.seq_no} onChange={e => handleRowChange(row.id, 'seq_no', e.target.value)} />
                        </td>
                        <td className="p-3 border-r border-slate-100">
                          <input type="number" readOnly={isReadOnly} className="w-full px-3 py-2 text-xs font-bold outline-none bg-transparent" value={row.tons} onChange={e => handleRowChange(row.id, 'tons', e.target.value)} />
                        </td>
                        <td className="p-3 border-r border-slate-100">
                          <input readOnly={isReadOnly} className="w-full px-3 py-2 text-xs font-bold outline-none bg-transparent" value={row.item_description} onChange={e => handleRowChange(row.id, 'item_description', e.target.value)} />
                        </td>
                        <td className="p-3 border-r border-slate-100 bg-amber-50/10">
                          <input type="date" readOnly={isReadOnly} className={`w-full px-3 py-2 text-xs font-bold outline-none bg-transparent ${isReadOnly ? 'text-slate-400' : 'text-amber-700'}`} value={row.scheduled_ofa_date} onChange={e => handleRowChange(row.id, 'scheduled_ofa_date', e.target.value)} />
                        </td>
                        <td className="p-3 border-r border-slate-100">
                          <input type="date" readOnly={isReadOnly} className="w-full px-3 py-2 text-xs font-bold outline-none bg-transparent text-slate-400" value={row.actual_ofa_date || ''} onChange={e => handleRowChange(row.id, 'actual_ofa_date', e.target.value)} />
                        </td>
                        <td className="p-3 border-r border-slate-100 bg-blue-50/10">
                          <input type="date" readOnly={isReadOnly} className={`w-full px-3 py-2 text-xs font-bold outline-none bg-transparent ${isReadOnly ? 'text-slate-400' : 'text-blue-700'}`} value={row.scheduled_bfa_date} onChange={e => handleRowChange(row.id, 'scheduled_bfa_date', e.target.value)} />
                        </td>
                        <td className="p-3 border-r border-slate-100">
                          <input type="date" readOnly={isReadOnly} className="w-full px-3 py-2 text-xs font-bold outline-none bg-transparent text-slate-400" value={row.actual_bfa_date || ''} onChange={e => handleRowChange(row.id, 'actual_bfa_date', e.target.value)} />
                        </td>
                        <td className="p-3 border-r border-slate-100 bg-emerald-50/10">
                          <input type="date" readOnly={isReadOnly} className={`w-full px-3 py-2 text-xs font-bold outline-none bg-transparent ${isReadOnly ? 'text-slate-400' : 'text-emerald-700'}`} value={row.scheduled_field_measure_date} onChange={e => handleRowChange(row.id, 'scheduled_field_measure_date', e.target.value)} />
                        </td>
                        <td className="p-3 border-r border-slate-100 bg-purple-50/10">
                          <input type="date" readOnly={isReadOnly} className={`w-full px-3 py-2 text-xs font-black outline-none bg-transparent ${isReadOnly ? 'text-slate-400' : 'text-purple-700'}`} value={row.rts_date} onChange={e => handleRowChange(row.id, 'rts_date', e.target.value)} />
                        </td>
                        <td className="p-3 border-r border-slate-100 text-center font-black text-orange-600 text-xs bg-orange-50/20">
                          {row.num_days}
                        </td>
                        <td className="p-3 border-r border-slate-100 bg-orange-50/20">
                          <input type="number" readOnly={isReadOnly} className="w-full px-3 py-2 text-xs font-black outline-none bg-transparent text-center" value={row.shop_lead_time_weeks} onChange={e => handleRowChange(row.id, 'shop_lead_time_weeks', e.target.value)} />
                        </td>
                        <td className="p-3 border-r border-slate-100 bg-indigo-50/10">
                          <input type="date" readOnly={isReadOnly} className={`w-full px-3 py-2 text-xs font-black outline-none bg-transparent ${isReadOnly ? 'text-slate-400' : 'text-indigo-700'}`} value={row.scheduled_erection_date} onChange={e => handleRowChange(row.id, 'scheduled_erection_date', e.target.value)} />
                        </td>
                        <td className="p-3 border-r border-slate-100">
                          <input type="number" readOnly={isReadOnly} className="w-full px-3 py-2 text-xs font-bold outline-none bg-transparent" value={row.shop_hours} onChange={e => handleRowChange(row.id, 'shop_hours', e.target.value)} />
                        </td>
                        <td className="p-3 border-r border-slate-100">
                          <input type="number" readOnly={isReadOnly} className="w-full px-3 py-2 text-xs font-bold outline-none bg-transparent" value={row.field_hours} onChange={e => handleRowChange(row.id, 'field_hours', e.target.value)} />
                        </td>
                        <td className="p-3 border-r border-slate-100">
                          <input readOnly={isReadOnly} className="w-full px-3 py-2 text-xs font-bold outline-none bg-transparent" value={row.status} onChange={e => handleRowChange(row.id, 'status', e.target.value)} />
                        </td>
                        <td className="p-3 border-r border-slate-100">
                          <input readOnly={isReadOnly} className="w-full px-3 py-2 text-xs font-bold outline-none bg-transparent" value={row.location} onChange={e => handleRowChange(row.id, 'location', e.target.value)} />
                        </td>
                        <td className="p-3 border-r border-slate-100">
                          <input readOnly={isReadOnly} className="w-full px-3 py-2 text-xs font-bold outline-none bg-transparent" value={row.material_finish} onChange={e => handleRowChange(row.id, 'material_finish', e.target.value)} />
                        </td>
                        <td className="p-3 border-r border-slate-100">
                          <input readOnly={isReadOnly} className="w-full px-3 py-2 text-xs font-bold outline-none bg-transparent" value={row.detailer_vendor} onChange={e => handleRowChange(row.id, 'detailer_vendor', e.target.value)} />
                        </td>
                        <td className="p-3 border-r border-slate-100">
                          <input readOnly={isReadOnly} className="w-full px-3 py-2 text-xs font-bold outline-none bg-transparent" value={row.dwg_status} onChange={e => handleRowChange(row.id, 'dwg_status', e.target.value)} />
                        </td>
                        <td className="p-3 border-r border-slate-100">
                          <input readOnly={isReadOnly} className="w-full px-3 py-2 text-xs font-bold outline-none bg-transparent" value={row.notes} onChange={e => handleRowChange(row.id, 'notes', e.target.value)} />
                        </td>
                        {mode === 'edit' && (
                          <td className="p-3 text-center">
                            <button onClick={() => handleDeleteRow(row.id)} className="p-2 rounded-xl text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all active:scale-90">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
