import React from 'react';
import { X, Plus, Save, Loader2, Trash2, Info, Download, Calendar, FolderKanban } from 'lucide-react';

export default function ScheduleCreationModal({
  isOpen,
  onClose,
  mode,
  project,
  projects = [],
  schedules,
  addScheduleRow,
  handleRowChange,
  handleDeleteRow,
  handleSave,
  handleDeleteAll,
  generatePDF,
  saving,
  setSelectedProjectId
}) {
  if (!isOpen) return null;

  const isViewOnly = mode === 'view';
  const isDeleteMode = mode === 'delete';

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '-';
    const d = date.getDate().toString().padStart(2, '0');
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const y = date.getFullYear();
    return `${d}-${m}-${y}`;
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-[95vw] lg:max-w-[98vw] flex flex-col overflow-hidden h-[95vh] border border-slate-300">
        {/* Header */}
        <div className="flex items-center justify-between px-10 py-6 border-b border-slate-300 bg-white">
          <div className="flex items-center gap-5">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-amber-500/20 ${
              isDeleteMode ? 'bg-red-500' : 'bg-gradient-to-br from-amber-500 to-orange-500'
            }`}>
              {isDeleteMode ? <Trash2 className="w-7 h-7" /> : <FolderKanban className="w-7 h-7" />}
            </div>
            <div>
              <h3 className="text-2xl font-bold text-slate-900 tracking-tight">
                {isDeleteMode ? 'Delete Project Schedule' : isViewOnly ? 'View Structural Schedule' : 'Edit Structural Schedule'}
              </h3>
              <p className="text-sm text-slate-500 font-medium mt-0.5">
                {isDeleteMode ? 'Permanently remove project execution data' : 'Define and track structural production timelines'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
             {isViewOnly && (
              <button 
                onClick={generatePDF}
                className="inline-flex items-center gap-2.5 px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[11px] font-black uppercase tracking-widest shadow-lg hover:shadow-xl transition-all active:scale-95"
              >
                <Download className="w-4 h-4" /> Export PDF
              </button>
            )}
            <button onClick={onClose} className="p-3 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all">
              <X className="w-7 h-7" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col bg-white">
          {isDeleteMode ? (
            <div className="flex-1 flex flex-col items-center justify-center p-20 text-center">
              <div className="w-24 h-24 rounded-2xl bg-red-50 flex items-center justify-center mb-8 border border-red-100 shadow-sm">
                <Trash2 className="w-12 h-12 text-red-500" />
              </div>
              <h4 className="text-2xl font-bold text-slate-900 mb-4 text-red-600">Critical Warning</h4>
              <p className="text-slate-500 max-w-lg font-medium leading-relaxed mb-10 text-lg">
                Are you sure you want to delete <span className="text-red-600 font-black underline decoration-2">ALL schedule data</span> for <span className="text-slate-900 font-black">{project?.name}</span>? This action is permanent and cannot be reversed.
              </p>
              <div className="flex gap-4">
                <button onClick={onClose} className="px-10 py-4 rounded-xl bg-white border border-slate-300 text-slate-600 text-sm font-bold hover:bg-slate-50 transition-all">Cancel Operation</button>
                <button onClick={handleDeleteAll} className="px-10 py-4 rounded-xl bg-red-600 text-white text-sm font-bold shadow-xl shadow-red-500/20 hover:bg-red-700 transition-all transform active:scale-95">Confirm Full Wipe</button>
              </div>
            </div>
          ) : (
            <>
              {/* Project Selection & Header Info */}
              <div className="px-10 py-8 bg-slate-50/50 border-b border-slate-300 grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-6">
                <div className="md:col-span-1">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Job Selection <span className="text-red-500">*</span></label>
                  <select 
                    value={project?.id || ''}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    disabled={isViewOnly}
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-white text-sm font-black text-slate-900 outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-500/5 transition-all shadow-sm disabled:opacity-50 appearance-none cursor-pointer"
                  >
                    <option value="">Choose Project...</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>[{p.code}] {p.name}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Customer Name</label>
                  <div className="px-4 py-3 rounded-xl border border-slate-300 bg-white text-sm font-bold text-slate-700 shadow-sm min-h-[46px] flex items-center">
                    {project?.customer_name || '—'}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Project Manager</label>
                  <div className="px-4 py-3 rounded-xl border border-slate-300 bg-white text-sm font-bold text-slate-700 shadow-sm min-h-[46px] flex items-center">
                    {project?.project_manager_name || '—'}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Detailer / Vendor</label>
                  <div className="px-4 py-3 rounded-xl border border-slate-300 bg-white text-sm font-bold text-slate-700 shadow-sm min-h-[46px] flex items-center">
                    {project?.detailer_name || '—'}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Total Ton (EST)</label>
                  <div className="px-4 py-3 rounded-xl border border-slate-300 bg-white text-sm font-black text-amber-600 shadow-sm min-h-[46px] flex items-center">
                    {project?.total_ton || '0.00'} LBS
                  </div>
                </div>
              </div>

              {/* Toolbar */}
              {!isViewOnly && (
                <div className="px-10 py-5 border-b border-slate-200 bg-white flex justify-between items-center shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Structural Sequencing Active</span>
                  </div>
                  <button 
                    onClick={addScheduleRow}
                    className="inline-flex items-center gap-2.5 px-8 py-3 rounded-xl bg-[#0c1222] text-white text-[10px] font-black uppercase tracking-widest hover:bg-[#1a1a2e] transition-all active:scale-95 shadow-md"
                  >
                    <Plus className="w-4 h-4" /> Add Sequence Row
                  </button>
                </div>
              )}

              {/* Table Area */}
              <div className="flex-1 overflow-auto bg-white">
                <table className="w-full border-collapse table-fixed min-w-[3500px]">
                  <thead className="bg-slate-50 sticky top-0 z-20 text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] text-left border-b border-slate-300">
                    <tr>
                      <th style={{ width: '100px' }} className="px-4 py-5 border-r border-slate-200 sticky left-0 bg-slate-50 z-10 text-center">SEQ #</th>
                      <th style={{ width: '120px' }} className="px-4 py-5 border-r border-slate-200">Tonnage</th>
                      <th style={{ width: '400px' }} className="px-4 py-5 border-r border-slate-200">Description of Items</th>
                      <th style={{ width: '180px' }} className="px-4 py-5 border-r border-slate-200">Sched. OFA</th>
                      <th style={{ width: '180px' }} className="px-4 py-5 border-r border-slate-200 text-slate-400">Actual OFA</th>
                      <th style={{ width: '180px' }} className="px-4 py-5 border-r border-slate-200">Sched. BFA</th>
                      <th style={{ width: '180px' }} className="px-4 py-5 border-r border-slate-200 text-slate-400">Actual BFA</th>
                      <th style={{ width: '180px' }} className="px-4 py-5 border-r border-slate-200">Field Meas.</th>
                      <th style={{ width: '180px' }} className="px-4 py-5 border-r border-slate-200 font-black text-amber-600 bg-amber-50/30">RTS Date</th>
                      <th style={{ width: '100px' }} className="px-4 py-5 border-r border-slate-200 text-center">Days</th>
                      <th style={{ width: '120px' }} className="px-4 py-5 border-r border-slate-200">Lead (Wks)</th>
                      <th style={{ width: '180px' }} className="px-4 py-5 border-r border-slate-200 font-black text-blue-600 bg-blue-50/30">Sched. Erection</th>
                      <th style={{ width: '120px' }} className="px-4 py-5 border-r border-slate-200">Shop Hrs</th>
                      <th style={{ width: '120px' }} className="px-4 py-5 border-r border-slate-200">Field Hrs</th>
                      <th style={{ width: '180px' }} className="px-4 py-5 border-r border-slate-200">Status</th>
                      <th style={{ width: '250px' }} className="px-4 py-5 border-r border-slate-200">Location</th>
                      <th style={{ width: '250px' }} className="px-4 py-5 border-r border-slate-200">Material Finish</th>
                      <th style={{ width: '250px' }} className="px-4 py-5 border-r border-slate-200">Detailer/Vendor</th>
                      <th style={{ width: '180px' }} className="px-4 py-5 border-r border-slate-200">Dwg Status</th>
                      <th style={{ width: '400px' }} className="px-4 py-5 border-r border-slate-200">Notes</th>
                      {!isViewOnly && <th style={{ width: '80px' }} className="px-4 py-5 text-center">Action</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {schedules.map((row) => (
                      <tr key={row.id} className="hover:bg-white transition-colors group">
                        <td className="p-2 border-r border-slate-200 sticky left-0 bg-white group-hover:bg-slate-50 z-10">
                          <input 
                            readOnly={isViewOnly}
                            className={`w-full px-2 py-2 rounded-lg border border-slate-300 outline-none bg-transparent font-black text-center text-xs transition-all ${isViewOnly ? 'cursor-default border-transparent' : 'focus:border-amber-400 focus:bg-white'}`} 
                            value={row.seq_no} 
                            placeholder="Seq"
                            onChange={e => handleRowChange(row.id, 'seq_no', e.target.value)} 
                          />
                        </td>
                        <td className="p-2 border-r border-slate-200">
                          <input 
                            type="number" 
                            readOnly={isViewOnly}
                            className={`w-full px-2 py-2 rounded-lg border border-slate-300 outline-none bg-transparent font-bold text-center text-xs transition-all ${isViewOnly ? 'cursor-default border-transparent' : 'focus:border-amber-400 focus:bg-white'}`} 
                            value={row.tons} 
                            placeholder="0"
                            onChange={e => handleRowChange(row.id, 'tons', e.target.value)} 
                          />
                        </td>
                        <td className="p-2 border-r border-slate-200">
                          <input 
                            readOnly={isViewOnly}
                            className={`w-full px-2 py-2 rounded-lg border border-slate-300 outline-none bg-transparent font-bold text-xs transition-all ${isViewOnly ? 'cursor-default border-transparent' : 'focus:border-amber-400 focus:bg-white'}`} 
                            value={row.item_description} 
                            placeholder="Description"
                            onChange={e => handleRowChange(row.id, 'item_description', e.target.value)} 
                          />
                        </td>
                        <td className="p-2 border-r border-slate-200">
                          <div className="relative group">
                            <input 
                              type="date" 
                              readOnly={isViewOnly}
                              className={`w-full px-2 py-2 rounded-lg border border-slate-300 outline-none bg-transparent text-[11px] text-slate-600 appearance-none opacity-0 absolute inset-0 z-10 cursor-pointer ${isViewOnly ? 'hidden' : ''}`} 
                              value={row.scheduled_ofa_date} 
                              onChange={e => handleRowChange(row.id, 'scheduled_ofa_date', e.target.value)} 
                            />
                            <div className="w-full px-2 py-2 rounded-lg border border-slate-300 bg-white text-[11px] text-slate-600 flex items-center justify-between">
                              {formatDate(row.scheduled_ofa_date)}
                              <Calendar className="w-3 h-3 text-slate-400" />
                            </div>
                          </div>
                        </td>
                        <td className="p-2 border-r border-slate-200">
                          <div className="relative group opacity-40">
                            <input 
                              type="date" 
                              readOnly={isViewOnly}
                              className={`w-full px-2 py-2 rounded-lg border border-slate-300 outline-none bg-transparent text-[11px] text-slate-600 appearance-none opacity-0 absolute inset-0 z-10 cursor-pointer ${isViewOnly ? 'hidden' : ''}`} 
                              value={row.actual_ofa_date} 
                              onChange={e => handleRowChange(row.id, 'actual_ofa_date', e.target.value)} 
                            />
                            <div className="w-full px-2 py-2 rounded-lg border border-slate-300 bg-white text-[11px] text-slate-600 flex items-center justify-between">
                              {formatDate(row.actual_ofa_date)}
                              <Calendar className="w-3 h-3 text-slate-400" />
                            </div>
                          </div>
                        </td>
                        <td className="p-2 border-r border-slate-200">
                          <div className="relative group">
                            <input 
                              type="date" 
                              readOnly={isViewOnly}
                              className={`w-full px-2 py-2 rounded-lg border border-slate-300 outline-none bg-transparent text-[11px] text-slate-600 appearance-none opacity-0 absolute inset-0 z-10 cursor-pointer ${isViewOnly ? 'hidden' : ''}`} 
                              value={row.scheduled_bfa_date} 
                              onChange={e => handleRowChange(row.id, 'scheduled_bfa_date', e.target.value)} 
                            />
                            <div className="w-full px-2 py-2 rounded-lg border border-slate-300 bg-white text-[11px] text-slate-600 flex items-center justify-between">
                              {formatDate(row.scheduled_bfa_date)}
                              <Calendar className="w-3 h-3 text-slate-400" />
                            </div>
                          </div>
                        </td>
                        <td className="p-2 border-r border-slate-200">
                          <div className="relative group opacity-40">
                            <input 
                              type="date" 
                              readOnly={isViewOnly}
                              className={`w-full px-2 py-2 rounded-lg border border-slate-300 outline-none bg-transparent text-[11px] text-slate-600 appearance-none opacity-0 absolute inset-0 z-10 cursor-pointer ${isViewOnly ? 'hidden' : ''}`} 
                              value={row.actual_bfa_date} 
                              onChange={e => handleRowChange(row.id, 'actual_bfa_date', e.target.value)} 
                            />
                            <div className="w-full px-2 py-2 rounded-lg border border-slate-300 bg-white text-[11px] text-slate-600 flex items-center justify-between">
                              {formatDate(row.actual_bfa_date)}
                              <Calendar className="w-3 h-3 text-slate-400" />
                            </div>
                          </div>
                        </td>
                        <td className="p-2 border-r border-slate-200">
                          <div className="relative group">
                            <input 
                              type="date" 
                              readOnly={isViewOnly}
                              className={`w-full px-2 py-2 rounded-lg border border-slate-300 outline-none bg-transparent text-[11px] text-slate-600 appearance-none opacity-0 absolute inset-0 z-10 cursor-pointer ${isViewOnly ? 'hidden' : ''}`} 
                              value={row.scheduled_field_measure_date} 
                              onChange={e => handleRowChange(row.id, 'scheduled_field_measure_date', e.target.value)} 
                            />
                            <div className="w-full px-2 py-2 rounded-lg border border-slate-300 bg-white text-[11px] text-slate-600 flex items-center justify-between">
                              {formatDate(row.scheduled_field_measure_date)}
                              <Calendar className="w-3 h-3 text-slate-400" />
                            </div>
                          </div>
                        </td>
                        <td className="p-2 border-r border-slate-200">
                           <div className="w-full py-2 bg-amber-50/50 text-amber-700 font-bold text-center text-xs rounded-lg border border-amber-100">
                              {formatDate(row.rts_date)}
                           </div>
                        </td>
                        <td className="p-2 border-r border-slate-200">
                          <div className="w-full py-2 bg-amber-50/50 text-amber-700 font-bold text-center text-xs rounded-lg border border-amber-100">
                            {row.num_days || '-'}
                          </div>
                        </td>
                        <td className="p-2 border-r border-slate-200">
                          <input 
                            type="number" 
                            readOnly={isViewOnly}
                            className={`w-full px-2 py-2 rounded-lg border border-slate-300 outline-none bg-transparent font-black text-center text-xs transition-all ${isViewOnly ? 'cursor-default border-transparent' : 'focus:border-amber-400 focus:bg-white'}`} 
                            value={row.shop_lead_time_weeks} 
                            placeholder="0"
                            onChange={e => handleRowChange(row.id, 'shop_lead_time_weeks', e.target.value)} 
                          />
                        </td>
                        <td className="p-2 border-r border-slate-200">
                          <div className="relative group">
                            <input 
                              type="date" 
                              readOnly={isViewOnly}
                              className={`w-full px-2 py-2 rounded-lg border border-slate-300 outline-none bg-transparent text-[11px] text-blue-600 font-bold appearance-none opacity-0 absolute inset-0 z-10 cursor-pointer ${isViewOnly ? 'hidden' : ''}`} 
                              value={row.scheduled_erection_date} 
                              onChange={e => handleRowChange(row.id, 'scheduled_erection_date', e.target.value)} 
                            />
                            <div className="w-full px-2 py-2 rounded-lg border border-slate-300 bg-white text-[11px] text-blue-600 font-bold flex items-center justify-between">
                              {formatDate(row.scheduled_erection_date)}
                              <Calendar className="w-3 h-3 text-slate-400" />
                            </div>
                          </div>
                        </td>
                        <td className="p-2 border-r border-slate-200">
                          <input 
                            type="number" 
                            readOnly={isViewOnly}
                            className={`w-full px-2 py-2 rounded-lg border border-slate-300 outline-none bg-transparent text-center text-xs transition-all ${isViewOnly ? 'cursor-default border-transparent' : 'focus:border-amber-400 focus:bg-white'}`} 
                            value={row.shop_hours} 
                            placeholder="0"
                            onChange={e => handleRowChange(row.id, 'shop_hours', e.target.value)} 
                          />
                        </td>
                        <td className="p-2 border-r border-slate-200">
                          <input 
                            type="number" 
                            readOnly={isViewOnly}
                            className={`w-full px-2 py-2 rounded-lg border border-slate-300 outline-none bg-transparent text-center text-xs transition-all ${isViewOnly ? 'cursor-default border-transparent' : 'focus:border-amber-400 focus:bg-white'}`} 
                            value={row.field_hours} 
                            placeholder="0"
                            onChange={e => handleRowChange(row.id, 'field_hours', e.target.value)} 
                          />
                        </td>
                        <td className="p-2 border-r border-slate-200">
                          <input 
                            readOnly={isViewOnly}
                            className={`w-full px-2 py-2 rounded-lg border border-slate-300 outline-none bg-transparent font-bold text-xs transition-all ${isViewOnly ? 'cursor-default border-transparent' : 'focus:border-amber-400 focus:bg-white'}`} 
                            value={row.status} 
                            placeholder="Status"
                            onChange={e => handleRowChange(row.id, 'status', e.target.value)} 
                          />
                        </td>
                        <td className="p-2 border-r border-slate-200">
                          <input 
                            readOnly={isViewOnly}
                            className={`w-full px-2 py-2 rounded-lg border border-slate-300 outline-none bg-transparent text-xs transition-all ${isViewOnly ? 'cursor-default border-transparent' : 'focus:border-amber-400 focus:bg-white'}`} 
                            value={row.location} 
                            placeholder="Location"
                            onChange={e => handleRowChange(row.id, 'location', e.target.value)} 
                          />
                        </td>
                        <td className="p-2 border-r border-slate-200">
                          <input 
                            readOnly={isViewOnly}
                            className={`w-full px-2 py-2 rounded-lg border border-slate-300 outline-none bg-transparent text-xs transition-all ${isViewOnly ? 'cursor-default border-transparent' : 'focus:border-amber-400 focus:bg-white'}`} 
                            value={row.material_finish} 
                            placeholder="Finish"
                            onChange={e => handleRowChange(row.id, 'material_finish', e.target.value)} 
                          />
                        </td>
                        <td className="p-2 border-r border-slate-200">
                          <input 
                            readOnly={isViewOnly}
                            className={`w-full px-2 py-2 rounded-lg border border-slate-300 outline-none bg-transparent text-xs transition-all ${isViewOnly ? 'cursor-default border-transparent' : 'focus:border-amber-400 focus:bg-white'}`} 
                            value={row.detailer_vendor} 
                            placeholder="Vendor"
                            onChange={e => handleRowChange(row.id, 'detailer_vendor', e.target.value)} 
                          />
                        </td>
                        <td className="p-2 border-r border-slate-200">
                          <input 
                            readOnly={isViewOnly}
                            className={`w-full px-2 py-2 rounded-lg border border-slate-300 outline-none bg-transparent text-xs transition-all ${isViewOnly ? 'cursor-default border-transparent' : 'focus:border-amber-400 focus:bg-white'}`} 
                            value={row.dwg_status} 
                            placeholder="Dwg Status"
                            onChange={e => handleRowChange(row.id, 'dwg_status', e.target.value)} 
                          />
                        </td>
                        <td className="p-2 border-r border-slate-200">
                          <input 
                            readOnly={isViewOnly}
                            className={`w-full px-2 py-2 rounded-lg border border-slate-300 outline-none bg-transparent text-xs transition-all ${isViewOnly ? 'cursor-default border-transparent' : 'focus:border-amber-400 focus:bg-white'}`} 
                            value={row.notes} 
                            placeholder="..."
                            onChange={e => handleRowChange(row.id, 'notes', e.target.value)} 
                          />
                        </td>
                        {!isViewOnly && (
                          <td className="p-2 text-center">
                            <button onClick={() => handleDeleteRow(row.id)} className="p-2 rounded-xl text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-10 py-6 border-t border-slate-300 bg-white flex justify-end gap-4 shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.05)]">
          <button onClick={onClose} className="px-10 py-3 rounded-xl bg-white border border-slate-300 text-slate-600 text-sm font-bold hover:bg-slate-50 transition-all">
            {isDeleteMode ? 'Close' : 'Cancel'}
          </button>
          {!isViewOnly && !isDeleteMode && (
            <button 
              onClick={handleSave} 
              disabled={saving || !project}
              className="px-12 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-bold shadow-lg shadow-amber-500/20 hover:from-amber-400 hover:to-orange-400 transition-all transform active:scale-95 disabled:opacity-50 inline-flex items-center gap-3"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Execution Plan
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
