import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Calendar, LayoutList, Eye } from 'lucide-react';
import FabricationDetailModal from './FabricationDetailModal';

const FormattedDateInput = ({ value, onChange, readOnly, className }) => {
  const getDisplayValue = (val) => {
    if (!val) return '';
    const parts = val.split('-');
    if (parts.length === 3 && parts[0].length === 4) {
      return `${parts[1]}-${parts[2]}-${parts[0]}`;
    }
    return val;
  };

  if (readOnly) {
    return (
      <div className="relative w-full flex items-center">
        <input
          type="text"
          readOnly
          className={`${className} pointer-events-none pr-6`}
          value={getDisplayValue(value)}
        />
        <Calendar className="w-3 h-3 text-slate-400 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-60" />
      </div>
    );
  }

  return (
    <div className="relative w-full flex items-center">
      <input
        type="text"
        readOnly
        placeholder="mm-dd-yyyy"
        className={`${className} pr-6 bg-white`}
        value={getDisplayValue(value)}
      />
      <Calendar className="w-3 h-3 text-slate-400 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
      <input
        type="date"
        value={value || ''}
        onChange={onChange}
        className="absolute inset-0 opacity-0 cursor-pointer z-10 w-full h-full"
      />
    </div>
  );
};

export default function StructuralScheduleForm({
  hideMetrics = false,
  mode,
  project,
  projects = [],
  schedules,
  addScheduleRow,
  handleRowChange,
  handleDeleteRow,
  setSelectedProjectId,
  onProjectSelect
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const isViewOnly = mode === 'view';

  // Auto-population removed per user request

  const openFabricationModal = (item) => {
    setSelectedItem(item);
    setIsModalOpen(true);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '-';
    const d = date.getDate().toString().padStart(2, '0');
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const y = date.getFullYear();
    return `${m}-${d}-${y}`;
  };

  return (
    <div className="flex-1 overflow-hidden flex flex-col bg-white">
      {/* Spreadsheet Header Metrics */}
      {!hideMetrics && (
        <div className="bg-white border-b border-slate-300">
          {/* Project Selector - Only if not editing an existing plan or if explicitly requested */}
          {projects.length > 0 && !project?.id && (
            <div className="p-4 bg-amber-50 border-b border-amber-100 flex items-center gap-4">
              <label className="text-xs font-bold text-amber-800 uppercase tracking-wider">Select Project to Initialize Plan:</label>
              <select
                className="px-4 py-2 rounded-lg border border-amber-200 bg-white text-sm outline-none focus:ring-2 focus:ring-amber-500/20 transition-all min-w-[300px]"
                onChange={(e) => {
                  const selected = projects.find(p => p.code === e.target.value);
                  if (selected && onProjectSelect) onProjectSelect(selected);
                }}
                value={project?.code || ''}
              >
                <option value="">-- Select Project Code --</option>
                {projects.map(p => (
                  <option key={p.id} value={p.code}>{p.code} - {p.name}</option>
                ))}
              </select>
              <p className="text-[10px] text-amber-600 font-medium italic">Fetching data from Project Master...</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-4 border-b border-slate-200">
            <div className="flex border-r border-slate-200">
              <div className="w-32 bg-slate-900 px-4 py-2 text-[10px] font-bold tracking-widest text-white uppercase flex items-center border-r border-slate-800 shadow-inner">Customer:</div>
              <div className="flex-1 px-4 py-2 text-[10px] font-bold text-slate-800">{project?.customer_name || 'N/A'}</div>
            </div>
            <div className="flex border-r border-slate-200">
              <div className="w-32 bg-slate-900 px-4 py-2 text-[10px] font-bold tracking-widest text-white uppercase flex items-center border-r border-slate-800 shadow-inner">Job #</div>
              <div className="flex-1 px-4 py-2 text-[10px] font-mono font-bold text-slate-600">{project?.code || 'N/A'}</div>
            </div>
            <div className="flex border-r border-slate-200">
              <div className="w-32 bg-slate-900 px-4 py-2 text-[10px] font-bold tracking-widest text-white uppercase flex items-center border-r border-slate-800 shadow-inner">PM</div>
              <div className="flex-1 px-4 py-2 text-[10px] font-bold text-slate-800">{project?.project_manager_name || 'N/A'}</div>
            </div>
            <div className="flex">
              <div className="w-32 bg-slate-900 px-4 py-2 text-[10px] font-bold tracking-widest text-white uppercase flex items-center border-r border-slate-800 shadow-inner">Detailer:</div>
              <div className="flex-1 px-4 py-2 text-[10px] font-bold text-slate-800">{project?.detailer_name || 'N/A'}</div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4">
            <div className="flex border-r border-slate-200">
              <div className="w-32 bg-slate-900 px-4 py-2 text-[10px] font-bold tracking-widest text-white uppercase flex items-center border-r border-slate-800 shadow-inner">Erection Date:</div>
              <div className="flex-1 px-4 py-2 text-[10px] font-bold text-slate-800">{project?.erection_date ? formatDate(project.erection_date) : 'TBD'}</div>
            </div>
            <div className="flex border-r border-slate-200">
              <div className="w-32 bg-slate-900 px-4 py-2 text-[10px] font-bold tracking-widest text-white uppercase flex items-center border-r border-slate-800 shadow-inner">Ton's =</div>
              <div className="flex-1 px-4 py-2 text-[10px] font-bold text-amber-600">{project?.total_ton || '0.00'}</div>
            </div>
            <div className="flex border-r border-slate-200">
              <div className="w-32 bg-slate-900 px-4 py-2 text-[10px] font-bold tracking-widest text-white uppercase flex items-center border-r border-slate-800 shadow-inner">MH's =</div>
              <div className="flex-1 px-4 py-2 text-[10px] font-bold text-slate-800">{project?.total_manhours || '0'}</div>
            </div>
            <div className="flex">
              <div className="w-32 bg-slate-900 px-4 py-2 text-[10px] font-bold tracking-widest text-white uppercase flex items-center border-r border-slate-800 shadow-inner">MH / Ton =</div>
              <div className="flex-1 px-4 py-2 text-[10px] font-bold text-slate-800">
                {project?.total_ton > 0 ? (project?.total_manhours / project?.total_ton).toFixed(2) : '0.00'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toolbar */}
      {!isViewOnly && (
        <div className="flex items-center justify-end px-4 py-3 bg-slate-50 border-b border-slate-200 shrink-0">
          <button
            onClick={addScheduleRow}
            className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white text-[11px] font-bold tracking-wider uppercase rounded shadow-sm hover:bg-amber-700 transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Sequence
          </button>
        </div>
      )}

      {/* Table Area */}
      <div className="flex-1 flex flex-col overflow-hidden bg-slate-50/30 p-4">
        <div className="bg-white rounded-lg border border-slate-300 shadow-sm overflow-auto h-max max-h-full relative [&::-webkit-scrollbar]:h-3 [&::-webkit-scrollbar]:w-3 [&::-webkit-scrollbar-track]:bg-slate-100/50 [&::-webkit-scrollbar-thumb]:bg-slate-800 [&::-webkit-scrollbar-thumb]:border-2 [&::-webkit-scrollbar-thumb]:border-white [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-900">
          <table className="w-full text-left min-w-[2350px]" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
            <thead>
              <tr className="text-white text-[9px] font-bold uppercase tracking-wider bg-slate-800">
                <th
                  className="px-1 py-1 border-r border-b border-white/10 text-center bg-slate-800 shadow-[1px_0_0_rgba(0,0,0,0.1)]"
                  style={{ width: '48px', minWidth: '48px', maxWidth: '48px', left: '0px', top: '0px', position: 'sticky', zIndex: 50 }}
                >
                  SEQ #
                </th>
                <th
                  className="px-1 py-1 border-r border-b border-white/10 text-center bg-slate-800 shadow-[1px_0_0_rgba(0,0,0,0.1)]"
                  style={{ width: '96px', minWidth: '96px', maxWidth: '96px', left: '48px', top: '0px', position: 'sticky', zIndex: 50 }}
                >
                  Tons
                </th>
                <th
                  className="px-1 py-1 border-r border-b border-white/10 bg-slate-800 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.3)]"
                  style={{ width: '240px', minWidth: '240px', maxWidth: '240px', left: '144px', top: '0px', position: 'sticky', zIndex: 50 }}
                >
                  Item Description
                </th>
                <th className="px-1 py-1 border-r border-b border-white/10 text-center w-28 bg-slate-800 sticky top-0 z-20">Category</th>
                <th className="px-1 py-1 border-r border-b border-white/10 text-center w-28 bg-slate-800 sticky top-0 z-20">Scheduled OFA Date</th>
                <th className="px-1 py-1 border-r border-b border-white/10 text-center w-28 bg-slate-700 sticky top-0 z-20">Actual OFA Date</th>
                <th className="px-1 py-1 border-r border-b border-white/10 text-center w-28 bg-slate-800 sticky top-0 z-20">Scheduled BFA Date</th>
                <th className="px-1 py-1 border-r border-b border-white/10 text-center w-28 bg-slate-700 sticky top-0 z-20">Actual BFA Date</th>
                {project?.schedule_field_measure_required?.trim() !== 'No' && (
                  <th className="px-1 py-1 border-r border-b border-white/10 text-center w-12 bg-slate-800 sticky top-0 z-20">Scheduled Field Measure Date</th>
                )}
                <th className="px-1 py-1 border-r border-b border-white/10 text-center w-28 bg-slate-800 sticky top-0 z-20">RTS Date</th>
                <th className="px-1 py-1 border-r border-b border-white/10 text-center w-12 bg-slate-800 sticky top-0 z-20">Shop Lead Time in WEEKS</th>
                <th className="px-1 py-1 border-r border-b border-white/10 text-center w-12 bg-slate-800 sticky top-0 z-20">Scheduled Start of Erection</th>
                <th className="px-1 py-1 border-r border-b border-white/10 text-center w-24 bg-slate-800 sticky top-0 z-20">Budget Shop Hours</th>
                <th className="px-1 py-1 border-r border-b border-white/10 text-center w-24 bg-slate-800 sticky top-0 z-20">Budget Field Hours</th>
                <th className="px-1 py-1 border-r border-b border-white/10 text-center w-24 bg-slate-700 sticky top-0 z-20">Shop Hours actual</th>
                <th className="px-1 py-1 border-r border-b border-white/10 text-center w-24 bg-slate-700 sticky top-0 z-20">Field Hours Actual</th>
                <th className="px-1 py-1 border-r border-b border-white/10 text-center w-12 bg-slate-800 sticky top-0 z-20">Detailer / Vendor</th>
                <th className="px-1 py-1 border-r border-b border-white/10 text-center w-12 bg-slate-800 sticky top-0 z-20">Dwg Status</th>
                <th className="px-1 py-1 border-r border-b border-white/10 w-48 bg-slate-800 sticky top-0 z-20">Notes</th>
                <th className="px-1 py-1 border-b text-center w-12 bg-slate-800 sticky top-0 z-20">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {[...schedules].sort((a, b) => {
                const aNum = parseFloat(a.seq_no);
                const bNum = parseFloat(b.seq_no);
                if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
                return String(a.seq_no).localeCompare(String(b.seq_no), undefined, { numeric: true });
              }).map((row) => (
                <tr key={row.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td
                    className="px-1 py-1 border-r border-b border-slate-200 sticky left-0 z-30 bg-white outline outline-1 outline-slate-200 group-hover:bg-slate-50"
                    style={{ width: '48px', minWidth: '48px', maxWidth: '48px', left: '0px' }}
                  >
                    <input
                      readOnly={isViewOnly}
                      className="w-full px-1.5 py-1 rounded border border-slate-200 outline-none text-center text-[10px] font-black focus:border-amber-400 bg-white transition-all relative z-10"
                      value={row.seq_no}
                      onChange={e => handleRowChange(row.id, 'seq_no', e.target.value)}
                    />
                  </td>
                  <td
                    className="px-1 py-1 border-r border-b border-slate-200 sticky left-[48px] z-30 bg-white outline outline-1 outline-slate-200 group-hover:bg-slate-50"
                    style={{ width: '96px', minWidth: '96px', maxWidth: '96px', left: '48px' }}
                  >
                    <input
                      type="number"
                      readOnly={isViewOnly}
                      className="w-full px-1.5 py-1 rounded border border-slate-200 outline-none text-center text-[10px] font-bold focus:border-amber-400 bg-white transition-all relative z-10"
                      value={row.tons}
                      onChange={e => handleRowChange(row.id, 'tons', e.target.value)}
                    />
                  </td>
                  <td
                    className="px-1 py-1 border-r border-b border-slate-200 sticky left-[144px] z-30 bg-white outline outline-1 outline-slate-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.3)] group-hover:bg-slate-50"
                    style={{ width: '240px', minWidth: '240px', maxWidth: '240px', left: '144px' }}
                  >
                    <div className="flex flex-col gap-1.5 p-1">
                      <input
                        readOnly={isViewOnly}
                        className="w-full px-1.5 py-1 rounded border border-slate-200 outline-none text-[10px] font-medium focus:border-amber-400 bg-white transition-all relative z-10"
                        value={row.item_description}
                        onChange={e => handleRowChange(row.id, 'item_description', e.target.value)}
                        placeholder="Item Description"
                      />
                      {!isViewOnly && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openFabricationModal(row)}
                            disabled={!row.is_new}
                            className={`flex-1 flex items-center justify-center gap-1 px-1.5 py-0.5 rounded transition-all border shadow-sm text-[8px] font-bold ${row.is_new
                                ? 'bg-slate-100 hover:bg-amber-100 text-slate-600 hover:text-amber-700 border-slate-200 hover:border-amber-200'
                                : 'bg-slate-50 text-slate-400 border-slate-100 cursor-not-allowed opacity-60'
                              }`}
                          >
                            <Plus className="w-2.5 h-2.5" /> Add Item
                          </button>
                          <button
                            onClick={() => openFabricationModal(row)}
                            className="flex-1 flex items-center justify-center gap-1 px-1.5 py-0.5 bg-slate-100 hover:bg-blue-100 text-[8px] font-bold text-slate-600 hover:text-blue-700 rounded transition-all border border-slate-200 hover:border-blue-200 shadow-sm"
                          >
                            <Eye className="w-2.5 h-2.5" /> View {row.fabrication_details?.length > 0 && `(${row.fabrication_details.length})`}
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-1 py-1 border-r border-b border-slate-200">
                    <input
                      readOnly={isViewOnly}
                      className="w-full px-1.5 py-1 rounded border border-slate-200 outline-none text-[10px] font-medium focus:border-amber-400 bg-transparent transition-all"
                      value={row.category || ''}
                      onChange={e => handleRowChange(row.id, 'category', e.target.value)}
                    />
                  </td>
                  <td className="px-1 py-1 border-r border-b border-slate-200">
                    <FormattedDateInput
                      readOnly={isViewOnly}
                      className="w-full px-1.5 py-1 rounded border border-slate-200 outline-none text-[10px] font-bold text-slate-600 focus:border-amber-400 bg-transparent transition-all relative z-0"
                      value={row.scheduled_ofa_date}
                      onChange={e => handleRowChange(row.id, 'scheduled_ofa_date', e.target.value)}
                    />
                  </td>
                  <td className="px-1 py-1 border-r border-b border-slate-200 bg-slate-50/50">
                    <FormattedDateInput
                      readOnly={isViewOnly}
                      className="w-full px-1.5 py-1 rounded border border-slate-200 outline-none text-[10px] text-slate-500 focus:border-amber-400 bg-transparent transition-all"
                      value={row.actual_ofa_date || ''}
                      onChange={e => handleRowChange(row.id, 'actual_ofa_date', e.target.value)}
                    />
                  </td>
                  <td className="px-1 py-1 border-r border-b border-slate-200">
                    <FormattedDateInput
                      readOnly={isViewOnly}
                      className="w-full px-1.5 py-1 rounded border border-slate-200 outline-none text-[10px] font-bold text-slate-600 focus:border-amber-400 bg-transparent transition-all relative z-0"
                      value={row.scheduled_bfa_date}
                      onChange={e => handleRowChange(row.id, 'scheduled_bfa_date', e.target.value)}
                    />
                  </td>
                  <td className="px-1 py-1 border-r border-b border-slate-200 bg-slate-50/50">
                    <FormattedDateInput
                      readOnly={isViewOnly}
                      className="w-full px-1.5 py-1 rounded border border-slate-200 outline-none text-[10px] text-slate-500 focus:border-amber-400 bg-transparent transition-all"
                      value={row.actual_bfa_date || ''}
                      onChange={e => handleRowChange(row.id, 'actual_bfa_date', e.target.value)}
                    />
                  </td>
                  {project?.schedule_field_measure_required?.trim() !== 'No' && (
                    <td className="px-1 py-1 border-r border-b border-slate-200">
                      <FormattedDateInput
                        readOnly={isViewOnly}
                        className="w-full px-1.5 py-1 rounded border border-slate-200 outline-none text-[10px] text-slate-600 focus:border-amber-400 bg-transparent transition-all"
                        value={row.scheduled_field_measure_date || ''}
                        onChange={e => handleRowChange(row.id, 'scheduled_field_measure_date', e.target.value)}
                      />
                    </td>
                  )}
                  <td className="px-1 py-1 border-r border-b border-slate-200">
                    <FormattedDateInput
                      readOnly={isViewOnly}
                      className="w-full px-1.5 py-1 rounded border border-slate-200 outline-none text-[10px] font-black text-amber-600 focus:border-amber-400 bg-transparent transition-all"
                      value={row.rts_date}
                      onChange={e => handleRowChange(row.id, 'rts_date', e.target.value)}
                    />
                  </td>
                  <td className="px-1 py-1 border-r border-b border-slate-200 bg-amber-500/5">
                    <input
                      type="number"
                      readOnly={isViewOnly}
                      className="w-full px-1.5 py-1 rounded border border-slate-200 outline-none text-center text-[10px] font-black text-amber-700 focus:border-amber-400 bg-transparent transition-all"
                      value={row.shop_lead_time_weeks}
                      onChange={e => handleRowChange(row.id, 'shop_lead_time_weeks', e.target.value)}
                    />
                  </td>
                  <td className="px-1 py-1 border-r border-b border-slate-200">
                    <FormattedDateInput
                      readOnly={isViewOnly}
                      className="w-full px-1.5 py-1 rounded border border-slate-200 outline-none text-[10px] font-bold text-slate-600 focus:border-amber-400 bg-transparent transition-all relative z-0"
                      value={row.scheduled_erection_date}
                      onChange={e => handleRowChange(row.id, 'scheduled_erection_date', e.target.value)}
                    />
                  </td>
                  <td className="px-1 py-1 border-r border-b border-slate-200">
                    <input
                      type="number"
                      readOnly={isViewOnly}
                      className="w-full px-1.5 py-1 rounded border border-slate-200 outline-none text-center text-[10px] font-bold text-slate-600 focus:border-amber-400 bg-transparent transition-all"
                      value={row.budget_shop_hours}
                      onChange={e => handleRowChange(row.id, 'budget_shop_hours', e.target.value)}
                    />
                  </td>
                  <td className="px-1 py-1 border-r border-b border-slate-200">
                    <input
                      type="number"
                      readOnly={isViewOnly}
                      className="w-full px-1.5 py-1 rounded border border-slate-200 outline-none text-center text-[10px] font-bold text-slate-600 focus:border-amber-400 bg-transparent transition-all"
                      value={row.budget_field_hours}
                      onChange={e => handleRowChange(row.id, 'budget_field_hours', e.target.value)}
                    />
                  </td>
                  <td className="px-1 py-1 border-r border-b border-slate-200 bg-slate-50/50">
                    <input
                      type="number"
                      readOnly={isViewOnly}
                      className="w-full px-1.5 py-1 rounded border border-slate-200 outline-none text-center text-[10px] font-bold text-slate-600 focus:border-amber-400 bg-transparent transition-all"
                      value={row.actual_shop_hours}
                      onChange={e => handleRowChange(row.id, 'actual_shop_hours', e.target.value)}
                    />
                  </td>
                  <td className="px-1 py-1 border-r border-b border-slate-200 bg-slate-50/50">
                    <input
                      type="number"
                      readOnly={isViewOnly}
                      className="w-full px-1.5 py-1 rounded border border-slate-200 outline-none text-center text-[10px] font-bold text-slate-600 focus:border-amber-400 bg-transparent transition-all"
                      value={row.actual_field_hours}
                      onChange={e => handleRowChange(row.id, 'actual_field_hours', e.target.value)}
                    />
                  </td>
                  <td className="px-1 py-1 border-r border-b border-slate-200">
                    <input
                      readOnly={isViewOnly}
                      className="w-full px-1.5 py-1 rounded border border-slate-200 outline-none text-[10px] font-medium focus:border-amber-400 bg-transparent transition-all"
                      value={row.detailer_vendor}
                      onChange={e => handleRowChange(row.id, 'detailer_vendor', e.target.value)}
                    />
                  </td>
                  <td className="px-1 py-1 border-r border-b border-slate-200">
                    <input
                      readOnly={isViewOnly}
                      className="w-full px-1.5 py-1 rounded border border-slate-200 outline-none text-[10px] font-medium focus:border-amber-400 bg-transparent transition-all"
                      value={row.dwg_status}
                      onChange={e => handleRowChange(row.id, 'dwg_status', e.target.value)}
                    />
                  </td>
                  <td className="px-1 py-1 border-r border-b border-slate-200">
                    <input
                      readOnly={isViewOnly}
                      className="w-full px-1.5 py-1 rounded border border-slate-200 outline-none text-[10px] font-medium focus:border-amber-400 bg-transparent transition-all"
                      value={row.notes}
                      onChange={e => handleRowChange(row.id, 'notes', e.target.value)}
                    />
                  </td>
                  <td className="px-1 py-1 border-b text-center">
                    {!isViewOnly && (
                      <button onClick={() => handleDeleteRow(row.id)} className="p-1.5 rounded hover:bg-red-50 text-slate-300 hover:text-red-500 transition-all">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <FabricationDetailModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        scheduleItem={selectedItem}
        onSave={(details) => {
          if (selectedItem) {
            handleRowChange(selectedItem.id, 'fabrication_details', details);
          }
        }}
      />
    </div>
  );
}
