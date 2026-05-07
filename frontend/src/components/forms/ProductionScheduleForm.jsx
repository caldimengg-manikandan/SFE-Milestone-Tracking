import { useState, useEffect } from 'react';
import { X, Save, Plus, Trash2, Loader2 } from 'lucide-react';
import { productionAPI } from '../../services/api';

export default function ProductionScheduleForm({ onClose, onSuccess, editSchedule }) {
  const [loading, setLoading] = useState(false);
  const [header, setHeader] = useState({
    scheduleNumber: 'Schedule-' + Math.floor(10 + Math.random() * 90),
    startDate: '',
    endDate: ''
  });

  const [rows, setRows] = useState([
    { job: '', seq: '', weight: '', quantity: '', rtsDate: '', shipDate: '', notes: '' }
  ]);

  // Load existing data if editing
  useEffect(() => {
    if (editSchedule) {
      setHeader({
        scheduleNumber: editSchedule.schedule_number,
        startDate: editSchedule.start_date,
        endDate: editSchedule.end_date
      });

      if (editSchedule.items && editSchedule.items.length > 0) {
        setRows(editSchedule.items.map(item => ({
          job: item.job_number,
          seq: item.sequence_number,
          weight: item.weight,
          quantity: item.quantity,
          rtsDate: item.rts_date || '',
          shipDate: item.ship_date || '',
          notes: item.notes || ''
        })));
      }
    }
  }, [editSchedule]);

  const addRow = () => {
    setRows([...rows, { job: '', seq: '', weight: '', quantity: '', rtsDate: '', shipDate: '', notes: '' }]);
  };

  const removeRow = (index) => {
    if (rows.length > 1) {
      setRows(rows.filter((_, i) => i !== index));
    }
  };

  const updateRow = (index, field, value) => {
    const newRows = [...rows];
    newRows[index][field] = value;
    setRows(newRows);
  };

  const handleSave = async () => {
    if (!header.startDate || !header.endDate) {
      alert('Please select start and end dates');
      return;
    }

    try {
      setLoading(true);
      const payload = {
        schedule_number: header.scheduleNumber,
        start_date: header.startDate,
        end_date: header.endDate,
        items_input: rows.map(r => ({
          job_number: r.job,
          sequence_number: r.seq,
          weight: r.weight || 0,
          quantity: r.quantity || 0,
          rts_date: r.rtsDate || null,
          ship_date: r.shipDate || null,
          notes: r.notes
        })).filter(r => r.job_number)
      };

      if (payload.items_input.length === 0) {
        alert('Please add at least one production item with a Job #');
        setLoading(false);
        return;
      }

      if (editSchedule) {
        await productionAPI.updateSchedule(editSchedule.id, payload);
      } else {
        await productionAPI.createSchedule(payload);
      }

      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      console.error('Error saving schedule:', error);
      alert(error.response?.data?.detail || 'Failed to save schedule.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-[95vw] lg:max-w-7xl flex flex-col overflow-hidden max-h-[95vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-slate-300 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <Plus className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900">{editSchedule ? 'Edit Schedule' : 'New Production Schedule'}</h3>
              <p className="text-xs text-slate-500 mt-0.5">Define master schedule and item priorities</p>
            </div>
          </div>
          <button onClick={onClose} disabled={loading} className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-white transition-all"><X className="w-6 h-6" /></button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 p-6 rounded-2xl bg-slate-50 border border-slate-300">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">Schedule Number</label>
              <input
                value={header.scheduleNumber}
                onChange={(e) => setHeader({ ...header, scheduleNumber: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-white text-sm font-bold text-slate-700 outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-500/5 transition-all"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">Production Start Date</label>
              <input
                type="date"
                value={header.startDate}
                onChange={(e) => setHeader({ ...header, startDate: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-white text-sm outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-500/5 transition-all"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">Production End Date</label>
              <input
                type="date"
                value={header.endDate}
                onChange={(e) => setHeader({ ...header, endDate: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-white text-sm outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-500/5 transition-all"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-slate-800 flex items-center gap-2">
                Production Items
                <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-600 text-[10px] uppercase tracking-wider font-bold">{rows.length} Rows</span>
              </h4>
              <button
                onClick={addRow}
                disabled={loading}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0c1222] text-white text-xs font-bold hover:bg-[#1a1a2e] transition-all shadow-md"
              >
                <Plus className="w-3.5 h-3.5" /> Add Row
              </button>
            </div>

            <div className="border border-slate-300 rounded-2xl overflow-hidden bg-white shadow-sm hover:shadow-md transition-all">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[1000px]">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-300">
                      <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider w-32 text-center">Job</th>
                      <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider w-24 text-center">Seq</th>
                      <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider w-24 text-center">Weight</th>
                      <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider w-24 text-center">Quantity</th>
                      <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider w-40 text-center">RTS Date</th>
                      <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider w-40 text-center">Ship Date</th>
                      <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">Notes</th>
                      <th className="px-4 py-3 w-12"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rows.map((row, index) => (
                      <tr key={index} className="hover:bg-white transition-colors group">
                        <td className="p-2">
                          <input
                            value={row.job}
                            onChange={(e) => updateRow(index, 'job', e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-amber-400 outline-none bg-transparent text-sm transition-all"
                            placeholder="Job #"
                            disabled={loading}
                          />
                        </td>
                        <td className="p-2">
                          <input
                            value={row.seq}
                            onChange={(e) => updateRow(index, 'seq', e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-amber-400 outline-none bg-transparent text-sm transition-all"
                            placeholder="Seq"
                            disabled={loading}
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            value={row.weight}
                            onChange={(e) => updateRow(index, 'weight', e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-amber-400 outline-none bg-transparent text-sm transition-all"
                            placeholder="0.00"
                            disabled={loading}
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            value={row.quantity}
                            onChange={(e) => updateRow(index, 'quantity', e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-amber-400 outline-none bg-transparent text-sm transition-all"
                            placeholder="0"
                            disabled={loading}
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="date"
                            value={row.rtsDate}
                            onChange={(e) => updateRow(index, 'rtsDate', e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-amber-400 outline-none bg-transparent text-sm transition-all text-slate-600"
                            disabled={loading}
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="date"
                            value={row.shipDate}
                            onChange={(e) => updateRow(index, 'shipDate', e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-amber-400 outline-none bg-transparent text-sm transition-all text-slate-600"
                            disabled={loading}
                          />
                        </td>
                        <td className="p-2">
                          <input
                            value={row.notes}
                            onChange={(e) => updateRow(index, 'notes', e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-amber-400 outline-none bg-transparent text-sm transition-all"
                            placeholder="Add notes..."
                            disabled={loading}
                          />
                        </td>
                        <td className="p-2 text-center">
                          <button
                            onClick={() => removeRow(index)}
                            disabled={rows.length === 1 || loading}
                            className="p-2 text-slate-300 hover:text-red-500 disabled:opacity-0 transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex justify-end gap-3 px-8 py-5 border-t border-slate-300 bg-white">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-6 py-2.5 rounded-xl border border-slate-300 text-sm font-bold text-slate-600 hover:bg-white hover:border-slate-300 transition-all shadow-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-8 py-2.5 rounded-xl bg-gradient-to-r from-[#0c1222] to-[#1a1a2e] text-white text-sm font-bold shadow-lg hover:shadow-xl transition-all transform hover:scale-[1.01] active:scale-[0.99] flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {loading ? 'Saving...' : editSchedule ? 'Update Schedule' : 'Save Schedule'}
          </button>
        </div>
      </div>
    </div>
  );
}
