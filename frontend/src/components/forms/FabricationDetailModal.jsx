import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Save, Loader2 } from 'lucide-react';
import { fabricationAPI } from '../../services/api';

export default function FabricationDetailModal({ isOpen, onClose, scheduleItem, onSave }) {
  const [rows, setRows] = useState([]);

  useEffect(() => {
    if (isOpen) {
      const details = scheduleItem?.fabrication_details || [];
      setRows(details.length > 0 ? [...details] : Array.from({ length: 5 }, () => ({ pieces: '', material_size: '', dimension: '', machine: '' })));
    }
  }, [isOpen, scheduleItem]);

  const addRow = () => {
    setRows([...rows, { pieces: '', material_size: '', dimension: '', machine: '' }]);
  };

  const updateRow = (index, field, value) => {
    const newRows = [...rows];
    newRows[index] = { ...newRows[index], [field]: value };
    setRows(newRows);
  };

  const removeRow = (index) => {
    setRows(rows.filter((_, i) => i !== index));
  };

  const handleSaveLocal = () => {
    // Filter out completely empty rows
    const validRows = rows.filter(r => r.pieces || r.material_size || r.dimension || r.machine);
    onSave(validRows);
    onClose();
  };


  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-slate-100 bg-slate-50/50">
          <div>
            <h3 className="text-xl font-bold text-slate-900">Fabrication Details (Materials)</h3>
            <p className="text-xs text-slate-500 mt-0.5">Item: {scheduleItem?.item_description || 'N/A'}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-white shadow-sm transition-all">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-800 text-white text-[10px] font-bold uppercase tracking-wider">
                  <th className="px-4 py-3 border-r border-white/10 w-24">Pieces</th>
                  <th className="px-4 py-3 border-r border-white/10">Material Size</th>
                  <th className="px-4 py-3 border-r border-white/10">Dimension</th>
                  <th className="px-4 py-3 border-r border-white/10 w-48">Machine</th>
                  <th className="px-4 py-3 text-center w-16">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-2 py-2 border-r border-slate-100">
                      <input 
                        value={row.pieces} 
                        onChange={e => updateRow(idx, 'pieces', e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-amber-400 outline-none text-xs font-bold text-center"
                        placeholder="Qty"
                      />
                    </td>
                    <td className="px-2 py-2 border-r border-slate-100">
                      <input 
                        value={row.material_size} 
                        onChange={e => updateRow(idx, 'material_size', e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-amber-400 outline-none text-xs"
                        placeholder="e.g. W14x22"
                      />
                    </td>
                    <td className="px-2 py-2 border-r border-slate-100">
                      <input 
                        value={row.dimension} 
                        onChange={e => updateRow(idx, 'dimension', e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-amber-400 outline-none text-xs"
                        placeholder="e.g. 20'-0&quot;"
                      />
                    </td>
                    <td className="px-2 py-2 border-r border-slate-100">
                      <input 
                        value={row.machine} 
                        onChange={e => updateRow(idx, 'machine', e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-amber-400 outline-none text-xs"
                        placeholder="Assign Machine"
                      />
                    </td>
                    <td className="px-2 py-2 text-center">
                      <button onClick={() => removeRow(idx)} className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            <div className="p-4 bg-slate-50 border-t border-slate-100">
              <button 
                onClick={addRow}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-all shadow-sm"
              >
                <Plus className="w-4 h-4 text-amber-500" /> Add More Items
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-8 py-5 border-t border-slate-100 bg-slate-50/50">
          <button onClick={onClose} className="px-6 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-white transition-all shadow-sm">Cancel</button>
          <button 
            onClick={handleSaveLocal} 
            className="px-8 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-bold shadow-lg hover:from-amber-400 hover:to-orange-400 transition-all flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            Save Details
          </button>

        </div>
      </div>
    </div>
  );
}
