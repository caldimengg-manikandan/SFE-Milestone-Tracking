import { useState, useEffect } from 'react';
import { X, Save, Plus, Trash2, ChevronLeft, ChevronRight, Calendar, Loader2 } from 'lucide-react';
import { productionAPI, platePriorityAPI } from '../../services/api';

export default function PriorityPlateForm({ onClose, onSuccess, editRecord }) {
  const tabs = ["Plasma", "Plate over -1", "Bent"];
  const [activeTab, setActiveTab] = useState(0);
  const [selectedSchedule, setSelectedSchedule] = useState('');
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchingSchedules, setFetchingSchedules] = useState(true);
  
  const [tabData, setTabData] = useState({
    0: { rate: '', rows: [{ job: '', seq: '', weight: '', lbs: '', rtsDate: '', actualRtsDate: '', runDays: '', startRun: '', completeRunDate: '', notes: '' }] },
    1: { rate: '', rows: [{ job: '', seq: '', weight: '', lbs: '', rtsDate: '', actualRtsDate: '', runDays: '', startRun: '', completeRunDate: '', notes: '' }] },
    2: { rate: '', rows: [{ job: '', seq: '', weight: '', lbs: '', rtsDate: '', actualRtsDate: '', runDays: '', startRun: '', completeRunDate: '', notes: '' }] }
  });

  useEffect(() => {
    const fetchSchedules = async () => {
      try {
        const response = await productionAPI.getSchedules();
        setSchedules(response.data.results || response.data);
      } catch (error) {
        console.error('Error fetching schedules:', error);
      } finally {
        setFetchingSchedules(false);
      }
    };
    fetchSchedules();

    if (editRecord) {
        setSelectedSchedule(editRecord.schedule);
        const tabIndex = tabs.indexOf(editRecord.process_type);
        if (tabIndex !== -1) {
            setActiveTab(tabIndex);
            setTabData(prev => {
                const newData = { ...prev };
                newData[tabIndex] = {
                    rate: editRecord.rate,
                    rows: editRecord.items.map(item => {
                        const weight = parseFloat(item.weight) || 0;
                        return {
                            job: item.job_number || '',
                            seq: item.sequence_number || '',
                            weight: item.weight || '',
                            lbs: weight > 0 ? (weight * 2000).toFixed(2) : '',
                            rtsDate: item.rts_date || '',
                            actualRtsDate: item.actual_rts_date || '',
                            runDays: item.run_days || '',
                            startRun: item.start_run_date || '',
                            completeRunDate: item.complete_run_date || '',
                            notes: item.notes || ''
                        };
                    })
                };
                if (newData[tabIndex].rows.length === 0) {
                    newData[tabIndex].rows = [{ job: '', seq: '', weight: '', lbs: '', rtsDate: '', actualRtsDate: '', runDays: '', startRun: '', completeRunDate: '', notes: '' }];
                }
                return newData;
            });
        }
    }
  }, [editRecord]);

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '-';
    const d = date.getDate().toString().padStart(2, '0');
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const y = date.getFullYear();
    return `${m}-${d}-${y}`;
  };

  const parseDateSafe = (dateStr) => {
    if (!dateStr) return null;
    if (dateStr instanceof Date) return new Date(dateStr.getTime());
    
    const separator = dateStr.includes('-') ? '-' : (dateStr.includes('/') ? '/' : null);
    if (separator) {
      const parts = dateStr.split(separator);
      if (parts.length === 3) {
        let y, m, d;
        if (parts[0].length === 4) {
          y = parseInt(parts[0], 10);
          m = parseInt(parts[1], 10) - 1;
          d = parseInt(parts[2], 10);
        } else {
          y = parseInt(parts[2], 10);
          m = parseInt(parts[0], 10) - 1;
          d = parseInt(parts[1], 10);
        }
        const parsed = new Date(y, m, d);
        if (!isNaN(parsed.getTime())) return parsed;
      }
    }
    
    const parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) return parsed;
    return null;
  };

  const formatDateStr = (dateObj) => {
    if (!dateObj || isNaN(dateObj.getTime())) return '';
    const yyyy = dateObj.getFullYear();
    const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
    const dd = String(dateObj.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const calculateRowValues = (row, rate) => {
    const r = parseFloat(rate) || 0;
    const w = parseFloat(row.weight) || 0;
    
    // Calculate runDays
    let runDays = '';
    let days = 0;
    if (r > 0 && w > 0) {
      days = (w * 2000) / r;
      runDays = days.toFixed(2);
    }

    // Calculate startRun
    let startRun = '';
    if (row.actualRtsDate) {
      startRun = row.actualRtsDate;
    } else if (row.rtsDate) {
      const parsedRts = parseDateSafe(row.rtsDate);
      if (parsedRts) {
        parsedRts.setDate(parsedRts.getDate() + 1);
        startRun = formatDateStr(parsedRts);
      }
    }

    // Calculate completeRunDate
    let completeRunDate = '';
    if (days > 0 && startRun) {
      const parsedStart = parseDateSafe(startRun);
      if (parsedStart) {
        parsedStart.setDate(parsedStart.getDate() + Math.ceil(days));
        completeRunDate = formatDateStr(parsedStart);
      }
    }

    return { ...row, runDays, startRun, completeRunDate };
  };

  const updateRate = (value) => {
    const newTabData = { ...tabData };
    newTabData[activeTab].rate = value;
    newTabData[activeTab].rows = newTabData[activeTab].rows.map(row => calculateRowValues(row, value));
    setTabData(newTabData);
  };

  const addRow = () => {
    const newRow = { job: '', seq: '', weight: '', lbs: '', rtsDate: '', actualRtsDate: '', runDays: '', startRun: '', completeRunDate: '', notes: '' };
    const newRows = [...tabData[activeTab].rows, newRow];
    setTabData({ ...tabData, [activeTab]: { ...tabData[activeTab], rows: newRows } });
  };

  const updateRow = (index, field, value) => {
    const newRows = [...tabData[activeTab].rows];
    newRows[index][field] = value;
    if (field === 'weight') {
      const numVal = parseFloat(value);
      newRows[index].lbs = isNaN(numVal) ? '' : (numVal * 2000).toFixed(2);
    }
    if (field === 'weight' || field === 'startRun' || field === 'actualRtsDate') {
      newRows[index] = calculateRowValues(newRows[index], tabData[activeTab].rate);
    }
    setTabData({ ...tabData, [activeTab]: { ...tabData[activeTab], rows: newRows } });
  };

  const removeRow = (index) => {
    if (tabData[activeTab].rows.length > 1) {
      const newRows = tabData[activeTab].rows.filter((_, i) => i !== index);
      setTabData({ ...tabData, [activeTab]: { ...tabData[activeTab], rows: newRows } });
    }
  };

  const handleNext = () => { if (activeTab < tabs.length - 1) setActiveTab(activeTab + 1); };
  const handlePrev = () => { if (activeTab > 0) setActiveTab(activeTab - 1); };

  const handleSave = async () => {
    if (!selectedSchedule) {
      alert('Please select a schedule');
      return;
    }

    try {
      setLoading(true);
      const savePromises = [];
      
      // Collect data from ALL tabs
      for (let i = 0; i < tabs.length; i++) {
        const currentTab = tabData[i];
        
        // Filter rows that have at least one field filled (not just job)
        const validRows = currentTab.rows.filter(r => 
            r.job || r.seq || r.weight || r.rtsDate || r.startRun || r.notes
        );
        
        if (validRows.length > 0) {
          const payload = {
            schedule: selectedSchedule,
            process_type: tabs[i],
            rate: currentTab.rate || 0,
            items_input: validRows.map(r => ({
              job_number: r.job || null,
              sequence_number: r.seq || null,
              weight: r.weight || null,
              actual_rts_date: r.actualRtsDate || null,
              rts_date: r.rtsDate || null,
              run_days: r.runDays || null,
              start_run_date: r.startRun || null,
              complete_run_date: r.completeRunDate || null,
              notes: r.notes || null,
              is_complete: false
            }))
          };
          
          if (editRecord && tabs[i] === editRecord.process_type) {
            savePromises.push(platePriorityAPI.update(editRecord.id, payload));
          } else {
            savePromises.push(platePriorityAPI.create(payload));
          }
        }
      }

      if (savePromises.length === 0) {
        alert('Please enter data in at least one row');
        setLoading(false);
        return;
      }

      await Promise.all(savePromises);
      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      console.error('Error saving plate priority:', error);
      alert('Failed to save records. Please check your network connection.');
    } finally {
      setLoading(false);
    }
  };

  const isLastTab = activeTab === tabs.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-[95vw] lg:max-w-7xl flex flex-col overflow-hidden max-h-[95vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/20 text-white">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900">{editRecord ? 'Edit Priority Plate' : 'New Priority Plate'}</h3>
              <p className="text-xs text-slate-500 mt-0.5">Define priorities for different plate processes</p>
            </div>
          </div>
          <button onClick={onClose} disabled={loading} className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"><X className="w-6 h-6" /></button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-8 space-y-6">
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="w-full lg:w-72 shrink-0">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Schedule Selection <span className="text-red-500">*</span></label>
              <select 
                value={selectedSchedule}
                onChange={(e) => setSelectedSchedule(e.target.value)}
                disabled={loading || fetchingSchedules}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-700 outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-500/5 transition-all disabled:opacity-50"
              >
                <option value="">{fetchingSchedules ? 'Loading...' : 'Choose Schedule...'}</option>
                {schedules.map(s => <option key={s.id} value={s.id}>{s.schedule_number}</option>)}
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Process Sections</label>
              <div className="flex p-1 bg-slate-100 rounded-2xl w-full">
                {tabs.map((tab, idx) => (
                  <button
                    key={tab}
                    disabled={loading}
                    onClick={() => setActiveTab(idx)}
                    className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === idx ? 'bg-white text-amber-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6 animate-fade-in" key={activeTab}>
            <div className="flex items-end justify-between gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="flex items-center gap-4">
                <div className="bg-white px-4 py-2.5 rounded-xl border border-slate-200 flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Production Rate:</span>
                  <input type="number" value={tabData[activeTab].rate} onChange={(e) => updateRate(e.target.value)} placeholder="0" disabled={loading} className="w-20 bg-transparent outline-none text-sm font-black text-slate-900 focus:text-amber-600" />
                  <span className="text-[10px] font-bold text-slate-400">lbs/day</span>
                </div>
              </div>
              <button onClick={addRow} disabled={loading} className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#0c1222] text-white text-xs font-bold hover:bg-[#1a1a2e] transition-all shadow-md">
                <Plus className="w-4 h-4" /> Add Item
              </button>
            </div>

            <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm">
              <div className="overflow-x-auto lg:overflow-x-visible">
                <table className="w-full text-left border-collapse table-fixed">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200">
                      <th className="px-3 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider w-[9%]">Job</th>
                      <th className="px-3 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider w-[7%] text-center">Seq</th>
                      <th className="px-3 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider w-[9%] text-center">Weight</th>
                      <th className="px-3 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider w-[9%] text-center">in LBS</th>
                      <th className="px-3 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider w-[12%]">RTS Date</th>
                      <th className="px-3 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider w-[12%]">Actual RTS Date</th>
                      <th className="px-3 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider w-[8%] text-center">Run Days</th>
                      <th className="px-3 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider w-[12%]">Start Run</th>
                      <th className="px-3 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider w-[12%]">Complete Date</th>
                      <th className="px-3 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Notes</th>
                      <th className="px-2 py-4 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {tabData[activeTab].rows.map((row, index) => (
                      <tr key={index} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-1.5">
                          <input value={row.job} onChange={(e) => updateRow(index, 'job', e.target.value)} disabled={loading} className="w-full px-2 py-2 rounded-lg border border-slate-100 focus:border-amber-400 outline-none bg-transparent text-xs transition-all" placeholder="Job #" />
                        </td>
                        <td className="p-1.5">
                          <input value={row.seq} onChange={(e) => updateRow(index, 'seq', e.target.value)} disabled={loading} className="w-full px-2 py-2 rounded-lg border border-slate-100 focus:border-amber-400 outline-none bg-transparent text-xs text-center" placeholder="Seq" />
                        </td>
                        <td className="p-1.5">
                          <input type="number" value={row.weight} onChange={(e) => updateRow(index, 'weight', e.target.value)} disabled={loading} className="w-full px-2 py-2 rounded-lg border border-slate-100 focus:border-amber-400 outline-none bg-transparent text-xs text-center" placeholder="0" />
                        </td>
                        <td className="p-1.5">
                          <input type="text" value={row.lbs} readOnly className="w-full px-2 py-2 rounded-lg border border-slate-100 bg-slate-50 text-xs text-center font-semibold text-slate-600 outline-none" placeholder="0" />
                        </td>
                        <td className="p-1.5">
                          <div className="w-full py-2 bg-slate-50 text-slate-600 font-bold text-center text-xs rounded-lg">{formatDate(row.rtsDate)}</div>
                        </td>
                        <td className="p-1.5">
                          <div className="relative group">
                            <input type="date" value={row.actualRtsDate || ''} onChange={(e) => updateRow(index, 'actualRtsDate', e.target.value)} disabled={loading} className="w-full px-2 py-2 rounded-lg border border-slate-100 focus:border-amber-400 outline-none bg-transparent text-[11px] text-slate-600 appearance-none opacity-0 absolute inset-0 z-10 cursor-pointer" />
                            <div className="w-full px-2 py-2 rounded-lg border border-slate-100 bg-white text-[11px] text-slate-600 flex items-center justify-between">{formatDate(row.actualRtsDate)}<Calendar className="w-3 h-3 text-slate-400" /></div>
                          </div>
                        </td>
                        <td className="p-1.5">
                           <div className="w-full py-2 bg-amber-50/50 text-amber-700 font-bold text-center text-xs rounded-lg">{row.runDays || '-'}</div>
                        </td>
                        <td className="p-1.5">
                           <div className="w-full py-2 bg-slate-50 text-slate-700 font-bold text-center text-xs rounded-lg">{formatDate(row.startRun)}</div>
                        </td>
                        <td className="p-1.5">
                           <div className="w-full py-2 bg-green-50 text-green-700 font-bold text-center text-xs rounded-lg">{formatDate(row.completeRunDate)}</div>
                        </td>
                        <td className="p-1.5">
                          <input value={row.notes} onChange={(e) => updateRow(index, 'notes', e.target.value)} disabled={loading} className="w-full px-2 py-2 rounded-lg border border-slate-100 focus:border-amber-400 outline-none bg-transparent text-xs truncate" placeholder="..." />
                        </td>
                        <td className="p-1.5 text-center">
                          <button onClick={() => removeRow(index)} disabled={tabData[activeTab].rows.length === 1 || loading} className="p-1.5 text-slate-300 hover:text-red-500 disabled:opacity-0 transition-all">
                            <Trash2 className="w-3.5 h-3.5" />
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

        <div className="flex items-center justify-between px-8 py-5 border-t border-slate-100 bg-slate-50/50">
          <div className="flex gap-2">
            <button onClick={handlePrev} disabled={activeTab === 0 || loading} className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-white disabled:opacity-50 flex items-center gap-2">
              <ChevronLeft className="w-3.5 h-3.5" /> Previous Section
            </button>
            {!isLastTab && (
              <button onClick={handleNext} disabled={loading} className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-all flex items-center gap-2 shadow-md">
                Next Section <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} disabled={loading} className="px-6 py-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-white transition-all">Cancel</button>
            {isLastTab && (
              <button onClick={handleSave} disabled={loading} className="px-8 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-bold shadow-lg hover:shadow-xl transform hover:scale-[1.01] active:scale-[0.99] flex items-center gap-2">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {loading ? 'Saving...' : editRecord ? 'Update All' : 'Save All'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}