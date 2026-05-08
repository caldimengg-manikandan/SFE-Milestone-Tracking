import { useState, useEffect } from 'react';
import { X, Save, Plus, Trash2, Calendar, Loader2, Columns, ChevronRight, CheckCircle2, Layers, Zap, LayoutGrid, FileText } from 'lucide-react';
import { productionAPI, priorityAPI } from '../../services/api';

const DEFAULT_COLUMNS = [
  { key: 'job', label: 'Job #', type: 'text', fixed: true },
  { key: 'seq', label: 'Seq #', type: 'text', fixed: true },
  { key: 'weight', label: 'Weight', type: 'number', fixed: true },
  { key: 'rtsDate', label: 'Sched. OFA', type: 'date', fixed: true },
  { key: 'actualOfa', label: 'Actual OFA', type: 'date', fixed: true },
  { key: 'completeRunDate', label: 'Sched. BFA', type: 'readonly', fixed: true },
  { key: 'actualBfa', label: 'Actual BFA', type: 'date', fixed: true },
  { key: 'notes', label: 'Notes', type: 'text', fixed: true },
];

const emptyRow = () => {
  const row = {};
  DEFAULT_COLUMNS.forEach(col => { row[col.key] = ''; });
  return row;
};

const STEPS = [
  { id: 'BASIC', label: 'Basic Info', color: 'amber' },
  { id: 'PLATE', label: 'Plate Priority', color: 'amber', processes: ['Plasma', 'Plate Over -1', 'Bent Plate'] },
  { id: 'ANGLE', label: 'Angle Priority', color: 'blue', processes: ['Angle Master', 'Ironworker', 'Peddinghaus (Large)'] },
  { id: 'STRUCTURAL', label: 'Structural Priority', color: 'emerald', processes: ['Peddinghaus Drill Line', 'Ficep', 'Punch'] },
];

export default function ProcessMasterForm({ onClose, onSuccess, editRecord, preselectedScheduleId }) {
  const [activeStep, setActiveStep] = useState(0);
  const [selectedSchedule, setSelectedSchedule] = useState(editRecord?.schedule || preselectedScheduleId || '');
  const [existingRecords, setExistingRecords] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [fetchingSchedules, setFetchingSchedules] = useState(true);
  const [fetchingExisting, setFetchingExisting] = useState(false);
  const [loading, setLoading] = useState(false);

  // Sync rates when schedule changes
  useEffect(() => {
    if (selectedSchedule) {
      const loadRates = async () => {
        try {
          const res = await priorityAPI.getAll({ schedule: selectedSchedule });
          const records = res.data.results || res.data;
          setExistingRecords(records);
          
          setSectionData(prev => {
            const next = { ...prev };
            records.forEach(r => {
              if (next[r.process_type]) {
                next[r.process_type].rate = r.rate;
              }
            });
            return next;
          });
        } catch (e) {
          console.error("Failed to load existing rates", e);
        }
      };
      loadRates();
    }
  }, [selectedSchedule]);
  
  useEffect(() => {
    const fetchExisting = async () => {
      try {
        setFetchingExisting(true);
        const res = await priorityAPI.getAll(); 
        setExistingRecords(res.data.results || res.data);
      } catch (e) {
        console.error('Error fetching existing records:', e);
      } finally {
        setFetchingExisting(false);
      }
    };
    fetchExisting();
  }, []);
  
  const [sectionData, setSectionData] = useState(() => {
    const data = {};
    STEPS.forEach(step => {
      if (step.processes) {
        step.processes.forEach(proc => {
          data[proc] = {
            rate: '',
            rows: [emptyRow()]
          };
        });
      }
    });
    return data;
  });

  useEffect(() => {
    const fetchSchedules = async () => {
      try {
        const res = await productionAPI.getSchedules();
        setSchedules(res.data.results || res.data);
      } catch (e) {
        console.error('Error fetching schedules:', e);
      } finally {
        setFetchingSchedules(false);
      }
    };
    fetchSchedules();
  }, []);

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '-';
    return `${String(date.getDate()).padStart(2,'0')}-${String(date.getMonth()+1).padStart(2,'0')}-${date.getFullYear()}`;
  };

  const updateSectionRate = (processName, rateValue) => {
    setSectionData(prev => ({
      ...prev,
      [processName]: { ...prev[processName], rate: rateValue }
    }));
  };

  const updateRow = (processName, ridx, field, value) => {
    setSectionData(prev => {
      const next = { ...prev };
      const nextRows = [...next[processName].rows];
      nextRows[ridx] = { ...nextRows[ridx], [field]: value };
      
      if (field === 'weight' || field === 'rtsDate') {
        const r = parseFloat(next[processName].rate);
        const w = parseFloat(nextRows[ridx].weight);
        if (r > 0 && w > 0 && nextRows[ridx].rtsDate) {
          const days = w / r;
          const d = new Date(nextRows[ridx].rtsDate);
          d.setDate(d.getDate() + Math.ceil(days));
          nextRows[ridx].completeRunDate = d.toISOString().split('T')[0];
        }
      }
      
      next[processName].rows = nextRows;
      return next;
    });
  };

  const addRow = (processName) => {
    setSectionData(prev => ({
      ...prev,
      [processName]: {
        ...prev[processName],
        rows: [...prev[processName].rows, emptyRow()]
      }
    }));
  };

  const removeRow = (processName, ridx) => {
    setSectionData(prev => {
      if (prev[processName].rows.length <= 1) return prev;
      const nextRows = prev[processName].rows.filter((_, i) => i !== ridx);
      return {
        ...prev,
        [processName]: { ...prev[processName], rows: nextRows }
      };
    });
  };

  const handleSaveStep = async () => {
    if (!selectedSchedule) { alert('Please select a schedule'); return; }
    const currentStep = STEPS[activeStep];
    if (currentStep.id === 'BASIC') { setActiveStep(1); return; }

    try {
      setLoading(true);
      for (const proc of currentStep.processes) {
        const data = sectionData[proc];
        const validRows = data.rows.filter(r => Object.values(r).some(v => v !== ''));
        if (validRows.length > 0) {
          const payload = {
            schedule: selectedSchedule,
            module_type: currentStep.id,
            process_type: proc,
            rate: data.rate || 0,
            items_input: validRows.map(r => ({
              job_number: r.job || null,
              sequence_number: r.seq || null,
              weight: r.weight || null,
              rts_date: r.rtsDate || null,
              actual_ofa: r.actualOfa || null,
              complete_run_date: r.completeRunDate || null,
              actual_bfa: r.actualBfa || null,
              notes: r.notes || null,
            })),
          };
          await priorityAPI.create(payload);
        }
      }
      if (activeStep < STEPS.length - 1) { setActiveStep(prev => prev + 1); } 
      else { if (onSuccess) onSuccess(); onClose(); }
    } catch (err) {
      console.error('Step save error:', err);
      alert('Failed to save data.');
    } finally { setLoading(false); }
  };

  const selectedSchedNum = schedules.find(s => s.id == selectedSchedule)?.schedule_number || "---";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-[98vw] lg:max-w-7xl flex flex-col overflow-hidden max-h-[95vh] border border-slate-200">
        
        {/* Tab-style Navigation */}
        <div className="flex items-center px-4 pt-2 gap-1 bg-white border-b border-slate-200">
          {STEPS.map((step, idx) => (
            <button
              key={step.id}
              onClick={() => setActiveStep(idx)}
              className={`px-6 py-2 rounded-t-xl text-[9px] font-black uppercase tracking-widest transition-all
                ${activeStep === idx 
                  ? 'bg-white text-amber-600 shadow-[0_-4px_12px_rgba(0,0,0,0.05)] border-t-2 border-t-amber-500' 
                  : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
            >
              {step.label}
            </button>
          ))}
          <div className="ml-auto pr-2">
             <button onClick={onClose} className="p-1.5 rounded-lg text-slate-300 hover:text-slate-600 transition-all"><X className="w-4 h-4" /></button>
          </div>
        </div>

        {/* Form Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30">
          {activeStep === 0 ? (
            <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
                {/* Schedule Header Box */}
                <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-3xl p-6 shadow-xl shadow-orange-500/10 flex items-center justify-between border-2 border-white">
                   <div className="flex items-center gap-4">
                     <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white border border-white/30">
                        <Layers className="w-6 h-6" />
                     </div>
                     <div>
                       <h2 className="text-white text-xl font-black tracking-tight">Schedule No: {selectedSchedNum}</h2>
                       <p className="text-white/70 text-[9px] font-black uppercase tracking-widest">Project Assignment ID</p>
                     </div>
                   </div>
                   <div className="w-56">
                      <select
                        value={selectedSchedule}
                        onChange={(e) => setSelectedSchedule(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl bg-white/10 border border-white/30 text-white text-xs font-black outline-none focus:bg-white/20 transition-all cursor-pointer backdrop-blur-md appearance-none text-center"
                      >
                        <option value="" className="text-slate-900">Select Project</option>
                        {schedules.map(s => <option key={s.id} value={s.id} className="text-slate-900">{s.schedule_number}</option>)}
                      </select>
                   </div>
                </div>

                <div className="flex flex-col gap-6">
                   {/* Plate Priority Section */}
                   <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                      <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-500"></div>
                      <h3 className="text-xs font-black text-slate-900 mb-6 uppercase tracking-widest flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center text-amber-500"><Plus className="w-3.5 h-3.5" /></div>
                        Plate Priority
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {['Plasma', 'Plate Over -1', 'Bent Plate'].map(proc => (
                          <div key={proc} className="space-y-1.5">
                             <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">{proc} Rate</label>
                             <div className="relative">
                                <input 
                                  type="number"
                                  value={sectionData[proc]?.rate || ''}
                                  onChange={(e) => updateSectionRate(proc, e.target.value)}
                                  placeholder="0"
                                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border-2 border-transparent focus:border-amber-400 focus:bg-white transition-all text-xs font-black text-slate-900 outline-none shadow-inner"
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] font-bold text-slate-300">lbs/day</span>
                             </div>
                          </div>
                        ))}
                      </div>
                   </div>

                   {/* Angle Priority Section */}
                   <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                      <div className="absolute top-0 left-0 w-1.5 h-full bg-orange-500"></div>
                      <h3 className="text-xs font-black text-slate-900 mb-6 uppercase tracking-widest flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-orange-50 flex items-center justify-center text-orange-500"><Zap className="w-3.5 h-3.5" /></div>
                        Angle Priority
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {['Angle Master', 'Ironworker', 'Peddinghaus (Large)'].map(proc => (
                          <div key={proc} className="space-y-1.5">
                             <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">{proc}</label>
                             <div className="relative">
                                <input 
                                  type="number"
                                  value={sectionData[proc]?.rate || ''}
                                  onChange={(e) => updateSectionRate(proc, e.target.value)}
                                  placeholder="0"
                                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border-2 border-transparent focus:border-orange-400 focus:bg-white transition-all text-xs font-black text-slate-900 outline-none shadow-inner"
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] font-bold text-slate-300">lbs/day</span>
                             </div>
                          </div>
                        ))}
                      </div>
                   </div>

                   {/* Structural Priority Section */}
                   <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                      <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-600"></div>
                      <h3 className="text-xs font-black text-slate-900 mb-6 uppercase tracking-widest flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600"><LayoutGrid className="w-3.5 h-3.5" /></div>
                        Structural Priority
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {['Peddinghaus Drill Line', 'Ficep', 'Punch'].map(proc => (
                          <div key={proc} className="space-y-1.5">
                             <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">{proc}</label>
                             <div className="relative">
                                <input 
                                  type="number"
                                  value={sectionData[proc]?.rate || ''}
                                  onChange={(e) => updateSectionRate(proc, e.target.value)}
                                  placeholder="0"
                                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border-2 border-transparent focus:border-amber-600 focus:bg-white transition-all text-xs font-black text-slate-900 outline-none shadow-inner"
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] font-bold text-slate-300">lbs/day</span>
                             </div>
                          </div>
                        ))}
                      </div>
                   </div>
                </div>
            </div>
          ) : (
            <div className="space-y-6 animate-fade-in max-w-7xl mx-auto">
              <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-3xl p-6 text-white flex items-center justify-between border-2 border-white shadow-xl shadow-orange-500/10">
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white border border-white/30"><FileText className="w-6 h-6" /></div>
                    <div>
                      <h3 className="text-lg font-black tracking-tight">{STEPS[activeStep].label.toUpperCase()}</h3>
                      <p className="text-white/70 text-[9px] font-black uppercase tracking-widest">Project {selectedSchedNum}</p>
                    </div>
                 </div>
                 <div className="flex items-center gap-3">
                    <button 
                      onClick={() => setActiveStep(0)}
                      className="px-6 py-2 rounded-xl bg-white/10 border border-white/30 text-[9px] font-black uppercase tracking-widest hover:bg-white/20 transition-all backdrop-blur-md"
                    >
                      Back to Rates
                    </button>
                    <button 
                      onClick={handleSaveStep}
                      disabled={loading}
                      className="px-8 py-2 rounded-xl bg-white text-amber-600 text-[9px] font-black uppercase tracking-widest hover:bg-amber-50 shadow-lg transition-all active:scale-95"
                    >
                      {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : (activeStep < STEPS.length - 1 ? 'Save & Next' : 'Finalize & Save')}
                    </button>
                 </div>
              </div>

              {STEPS[activeStep].processes.map(proc => (
                <div key={proc} className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
                  <div className="px-6 py-4 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-white shadow-sm border border-slate-200 flex items-center justify-center text-amber-500 font-black text-xs">
                        {proc.charAt(0)}
                      </div>
                      <div>
                        <h4 className="font-black text-[10px] uppercase tracking-widest text-slate-900">{proc}</h4>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-xl">
                        <span className="text-[9px] font-black text-slate-400 uppercase">Rate:</span>
                        <input
                          type="number"
                          value={sectionData[proc].rate}
                          onChange={(e) => updateSectionRate(proc, e.target.value)}
                          className="w-16 bg-transparent outline-none text-xs font-black text-slate-900"
                        />
                        <span className="text-[9px] font-bold text-slate-400">lbs/day</span>
                      </div>
                      <button onClick={() => addRow(proc)} className="px-4 py-1.5 rounded-xl bg-amber-500 text-white text-[9px] font-black uppercase tracking-widest hover:bg-amber-600 transition-all flex items-center gap-2">
                        <Plus className="w-3 h-3" /> Add Row
                      </button>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-white border-b border-slate-100">
                          {DEFAULT_COLUMNS.map(col => (
                            <th key={col.key} className="px-4 py-3 text-[8px] font-black text-slate-400 uppercase tracking-widest text-center">{col.label}</th>
                          ))}
                          <th className="w-12"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {sectionData[proc].rows.map((row, ridx) => (
                          <tr key={ridx} className="hover:bg-slate-50/30 transition-colors">
                            {DEFAULT_COLUMNS.map(col => (
                              <td key={col.key} className="p-1.5">
                                {col.type === 'readonly' ? (
                                  <div className="w-full py-2 bg-slate-50 text-slate-400 text-center text-[9px] font-bold rounded-lg border border-dashed border-slate-200">{formatDate(row[col.key])}</div>
                                ) : col.type === 'date' ? (
                                  <div className="relative group/date">
                                    <input
                                      type="date"
                                      value={row[col.key] || ''}
                                      onChange={(e) => updateRow(proc, ridx, col.key, e.target.value)}
                                      className="w-full px-2 py-2 rounded-lg border border-slate-200 focus:border-amber-400 outline-none text-[10px] text-slate-600 absolute inset-0 opacity-0 cursor-pointer"
                                    />
                                    <div className="w-full px-2 py-2 rounded-lg border border-slate-200 bg-white text-[9px] font-bold text-slate-600 flex items-center justify-between pointer-events-none group-hover/date:border-amber-200 transition-all">
                                      <span>{formatDate(row[col.key])}</span>
                                      <Calendar className="w-3 h-3 text-slate-300" />
                                    </div>
                                  </div>
                                ) : (
                                  <input
                                    type={col.type === 'number' ? 'number' : 'text'}
                                    value={row[col.key] || ''}
                                    onChange={(e) => updateRow(proc, ridx, col.key, e.target.value)}
                                    placeholder={col.label}
                                    className="w-full px-2 py-2 rounded-lg border border-slate-200 focus:border-amber-400 outline-none bg-white text-[10px] text-slate-700 font-bold transition-all"
                                  />
                                )}
                              </td>
                            ))}
                            <td className="text-center px-2">
                              <button onClick={() => removeRow(proc, ridx)} className="p-1.5 text-slate-200 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3 border-t border-slate-200 bg-white flex items-center justify-between">
           <button 
             onClick={() => setActiveStep(prev => Math.max(0, prev - 1))}
             disabled={activeStep === 0}
             className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all
               ${activeStep === 0 ? 'opacity-0 pointer-events-none' : 'text-slate-400 hover:text-slate-900 hover:bg-slate-50'}`}
           >
             Previous Step
           </button>
           
           <div className="flex items-center gap-3">
              <button onClick={onClose} className="px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600">Cancel</button>
              <button 
                onClick={handleSaveStep}
                className="flex items-center gap-2 px-8 py-3 rounded-2xl bg-amber-500 text-white text-[10px] font-black uppercase tracking-widest hover:bg-amber-600 shadow-lg shadow-amber-500/20 transition-all active:scale-95"
              >
                {activeStep === 0 ? 'Start Entry Wizard' : (activeStep < STEPS.length - 1 ? 'Save & Next' : 'Finalize & Save')}
                <ChevronRight className="w-4 h-4" />
              </button>
           </div>
        </div>
      </div>
      
      <style>{`
        @keyframes fade-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fade-in 0.3s ease-out forwards; }
      `}</style>
    </div>
  );
}
