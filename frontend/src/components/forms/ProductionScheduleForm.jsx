import { useState, useEffect } from 'react';
import { X, Save, Plus, Trash2, Loader2, ChevronDown } from 'lucide-react';
import { productionAPI, projectAPI } from '../../services/api';
import FormattedDateInput from './FormattedDateInput';

const parseLocalDate = (dateStr) => {
  if (!dateStr) return null;
  const cleanDateStr = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
  const parts = cleanDateStr.trim().split('-').map(Number);
  if (parts.length === 3) {
    if (parts[0] > 1000) {
      return new Date(parts[0], parts[1] - 1, parts[2]);
    } else {
      // MM-DD-YYYY
      return new Date(parts[2], parts[0] - 1, parts[1]);
    }
  }
  return null;
};

const formatDateString = (d) => {
  if (!d) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const addOneDay = (dateStr) => {
  const d = parseLocalDate(dateStr);
  if (!d) return '';
  d.setDate(d.getDate() + 1);
  return formatDateString(d);
};

export default function ProductionScheduleForm({ onClose, onSuccess, editSchedule, nextNumber }) {
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState([]);
  const [selectedProjectIds, setSelectedProjectIds] = useState([]);
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const [projectSearchTerm, setProjectSearchTerm] = useState('');
  const [userChangedProjects, setUserChangedProjects] = useState(false);
  const [planOption, setPlanOption] = useState('auto'); // 'auto', '1month', '3month'
  const [header, setHeader] = useState({
    scheduleNumber: `SCH-${String(nextNumber || 1).padStart(2, '0')}`,
    startDate: '',
    endDate: ''
  });

  const [rows, setRows] = useState([
    { job: '', seq: '', weight: '', quantity: '', rtsDate: '', shipDate: '', productionStartDate: '', productionEndDate: '', notes: '' }
  ]);

  // Fetch projects from Project Master
  useEffect(() => {
    projectAPI.getAll()
      .then(res => setProjects(res.data.results || res.data))
      .catch(err => console.error('Error fetching projects:', err));
  }, []);

  // Close project dropdown when clicked outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.project-dropdown-container')) {
        setShowProjectDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Load existing data if editing, and sync with live project master data
  useEffect(() => {
    if (editSchedule) {
      setHeader({
        scheduleNumber: editSchedule.schedule_number,
        startDate: editSchedule.start_date,
        endDate: editSchedule.end_date
      });
      setSelectedProjectIds(editSchedule.projects || []);

      if (editSchedule.start_date && editSchedule.end_date) {
        const start = parseLocalDate(editSchedule.start_date);
        const end = parseLocalDate(editSchedule.end_date);
        if (start && end) {
          const diff1M = new Date(start);
          diff1M.setMonth(diff1M.getMonth() + 1);
          const diff3M = new Date(start);
          diff3M.setMonth(diff3M.getMonth() + 3);
          const diff6M = new Date(start);
          diff6M.setMonth(diff6M.getMonth() + 6);

          if (formatDateString(diff1M) === editSchedule.end_date) {
            setPlanOption('1month');
          } else if (formatDateString(diff3M) === editSchedule.end_date) {
            setPlanOption('3month');
          } else if (formatDateString(diff6M) === editSchedule.end_date) {
            setPlanOption('6month');
          } else {
            setPlanOption('auto');
          }
        }
      }

      if (editSchedule.items && editSchedule.items.length > 0) {
        const mappedRows = editSchedule.items.map((item, idx) => {
          const matchingProj = projects.find(p => String(p.code).trim() === String(item.job_number).trim());
          if (matchingProj && matchingProj.structural_schedules) {
            const matchingItem = matchingProj.structural_schedules.find(s => String(s.seq_no).trim() === String(item.sequence_number).trim());
            if (matchingItem) {
              return {
                job: item.job_number,
                seq: item.sequence_number || (idx + 1).toString(),
                weight: item.weight ? item.weight : (matchingItem.tons || ''),
                quantity: item.quantity,
                rtsDate: item.rts_date || matchingItem.actual_rts_date || matchingItem.rts_date || '',
                shipDate: item.ship_date || '',
                productionStartDate: item.production_start_date || '',
                productionEndDate: item.production_end_date || '',
                notes: item.notes || '',
                isValidSeq: true
              };
            } else {
              return { isValidSeq: false };
            }
          }
          return {
            job: item.job_number,
            seq: item.sequence_number || (idx + 1).toString(),
            weight: item.weight,
            quantity: item.quantity,
            rtsDate: item.rts_date || '',
            shipDate: item.ship_date || '',
            productionStartDate: item.production_start_date || '',
            productionEndDate: item.production_end_date || '',
            notes: item.notes || '',
            isValidSeq: true
          };
        });

        const filtered = mappedRows.filter(r => r.isValidSeq !== false);
        setRows(filtered.length > 0 ? filtered : [{ job: '', seq: '', weight: '', quantity: '', rtsDate: '', shipDate: '', productionStartDate: '', productionEndDate: '', notes: '' }]);
      }
    }
  }, [editSchedule, projects]);

  // Auto-calculate schedule Start/End dates when selected projects change or planOption changes
  useEffect(() => {
    if (selectedProjectIds.length > 0 && (!editSchedule || userChangedProjects || planOption === 'auto') && projects.length > 0) {
      const selectedProjects = projects.filter(p => selectedProjectIds.includes(p.id));
      let minRTSObj = null;
      let maxRTSObj = null;
      let leadWeeksForMaxRTS = 0;

      selectedProjects.forEach(proj => {
        if (proj.structural_schedules) {
          proj.structural_schedules.forEach(item => {
            if (item.notes && item.notes.toLowerCase() === 'not in scope') return;
            const rtsDateToUse = item.actual_rts_date || item.rts_date;
            if (rtsDateToUse) {
              const rtsDateObj = parseLocalDate(rtsDateToUse);
              if (!rtsDateObj) return;

              // 2. Early RTS date -> production start date
              if (!minRTSObj || rtsDateObj < minRTSObj) {
                minRTSObj = rtsDateObj;
              }

              // 3. Late RTS date -> add plant Lead Time in WEEKS -> production end date
              if (!maxRTSObj || rtsDateObj > maxRTSObj) {
                maxRTSObj = rtsDateObj;
                leadWeeksForMaxRTS = parseFloat(item.plant_lead_time_weeks) || 0;
              } else if (rtsDateObj.getTime() === maxRTSObj.getTime()) {
                // If RTS dates are equal, take the one with the larger lead time
                const weeks = parseFloat(item.plant_lead_time_weeks) || 0;
                if (weeks > leadWeeksForMaxRTS) {
                  leadWeeksForMaxRTS = weeks;
                }
              }
            }
          });
        }
      });

      const calculatedStart = minRTSObj ? formatDateString(minRTSObj) : '';
      let calculatedEnd = '';
      if (planOption === 'auto') {
        if (maxRTSObj) {
          // Add leadWeeksForMaxRTS in WEEKS to the late RTS date
          const calculatedEndDateObj = new Date(maxRTSObj.getTime() + leadWeeksForMaxRTS * 7 * 24 * 60 * 60 * 1000);
          calculatedEnd = formatDateString(calculatedEndDateObj);
        }
        setHeader(prev => ({
          ...prev,
          startDate: calculatedStart,
          endDate: calculatedEnd
        }));
      } else {
        const baseStart = header.startDate || calculatedStart;
        let calculatedEndFixed = '';
        if (baseStart) {
          const startDateObj = parseLocalDate(baseStart);
          if (startDateObj) {
            const endDateObj = new Date(startDateObj);
            if (planOption === '1month') {
              endDateObj.setMonth(endDateObj.getMonth() + 1);
            } else if (planOption === '3month') {
              endDateObj.setMonth(endDateObj.getMonth() + 3);
            } else if (planOption === '6month') {
              endDateObj.setMonth(endDateObj.getMonth() + 6);
            }
            calculatedEndFixed = formatDateString(endDateObj);
          }
        }
        setHeader(prev => ({
          ...prev,
          startDate: baseStart,
          endDate: calculatedEndFixed
        }));
      }
    } else if (selectedProjectIds.length === 0 && (!editSchedule || userChangedProjects)) {
      setHeader(prev => ({
        ...prev,
        startDate: '',
        endDate: ''
      }));
    }
  }, [selectedProjectIds, projects, editSchedule, userChangedProjects, planOption]);

  // Auto-calculate end date when start date or plan option changes for fixed duration plans (1m/3m/6m)
  useEffect(() => {
    if (planOption !== 'auto' && header.startDate) {
      const startDateObj = parseLocalDate(header.startDate);
      if (startDateObj) {
        const endDateObj = new Date(startDateObj);
        if (planOption === '1month') {
          endDateObj.setMonth(endDateObj.getMonth() + 1);
        } else if (planOption === '3month') {
          endDateObj.setMonth(endDateObj.getMonth() + 3);
        } else if (planOption === '6month') {
          endDateObj.setMonth(endDateObj.getMonth() + 6);
        }
        const calculatedEnd = formatDateString(endDateObj);
        setHeader(prev => {
          if (prev.endDate !== calculatedEnd) {
            return { ...prev, endDate: calculatedEnd };
          }
          return prev;
        });
      }
    }
  }, [header.startDate, planOption]);

  // Auto-populate logic when projects or dates change
  useEffect(() => {
    if (selectedProjectIds.length > 0 && (!editSchedule || userChangedProjects) && projects.length > 0) {
      const selectedProjects = projects.filter(p => selectedProjectIds.includes(p.id));
      let allItems = [];
      
      selectedProjects.forEach(proj => {
        if (proj.structural_schedules) {
          proj.structural_schedules.forEach(item => {
            if (item.notes && item.notes.toLowerCase() === 'not in scope') return;
            
            let inRange = true;
            const rtsDateToUse = item.actual_rts_date || item.rts_date;
            if (header.startDate && header.endDate && rtsDateToUse) {
              const rts = parseLocalDate(rtsDateToUse);
              const start = parseLocalDate(header.startDate);
              const end = parseLocalDate(header.endDate);
              inRange = rts && start && end && rts >= start && rts <= end;
            }
            
            if (inRange) {
              const rtsD = item.actual_rts_date || item.rts_date || '';
              allItems.push({
                job: proj.code,
                seq: item.seq_no,
                weight: item.tons,
                quantity: 1,
                rtsDate: rtsD,
                shipDate: item.ship_date || '',
                productionStartDate: rtsD ? addOneDay(rtsD) : '',
                productionEndDate: '',
                notes: item.notes || '',
                // For sorting
                erectionDate: item.scheduled_erection_date || '',
                priority: proj.priority || 'Medium'
              });
            }
          });
        }
      });
      
      if (allItems.length > 0) {
        // Sort items by RTS, then Seq, then Erection, then Priority
        allItems.sort((a, b) => {
          const dateA = parseLocalDate(a.rtsDate) || new Date('9999-12-31');
          const dateB = parseLocalDate(b.rtsDate) || new Date('9999-12-31');
          if (dateA - dateB !== 0) return dateA - dateB;

          const seqA = parseFloat(a.seq) || 999;
          const seqB = parseFloat(b.seq) || 999;
          if (seqA !== seqB) return seqA - seqB;

          const erecA = parseLocalDate(a.erectionDate) || new Date('9999-12-31');
          const erecB = parseLocalDate(b.erectionDate) || new Date('9999-12-31');
          if (erecA - erecB !== 0) return erecA - erecB;

          const priorityMap = { 'High': 1, 'Medium': 2, 'Low': 3 };
          const priA = priorityMap[a.priority] || 4;
          const priB = priorityMap[b.priority] || 4;
          return priA - priB;
        });
        setRows(allItems);
      } else {
        setRows([{ job: '', seq: '', weight: '', quantity: '', rtsDate: '', shipDate: '', productionStartDate: '', productionEndDate: '', notes: '' }]);
      }
    }
  }, [selectedProjectIds, header.startDate, header.endDate, projects, editSchedule, userChangedProjects]);

  const handlePlanOptionChange = (option) => {
    setUserChangedProjects(true);
    setPlanOption(option);
  };

  const handleStartDateChange = (e) => {
    setUserChangedProjects(true);
    setHeader(prev => ({ ...prev, startDate: e.target.value }));
  };

  const handleEndDateChange = (e) => {
    setUserChangedProjects(true);
    setHeader(prev => ({ ...prev, endDate: e.target.value }));
  };

  const toggleProjectSelection = (projectId) => {
    setUserChangedProjects(true);
    setSelectedProjectIds(prev => 
      prev.includes(projectId) 
        ? prev.filter(id => id !== projectId) 
        : [...prev, projectId]
    );
  };

  const addRow = () => {
    const lastSeq = rows.length > 0 ? (parseInt(rows[rows.length - 1].seq) || 0) : 0;
    const nextSeq = lastSeq + 1;
    setRows([...rows, { job: '', seq: nextSeq.toString(), weight: '', quantity: '', rtsDate: '', shipDate: '', productionStartDate: '', productionEndDate: '', notes: '' }]);
  };

  const removeRow = (index) => {
    if (rows.length > 1) {
      setRows(rows.filter((_, i) => i !== index));
    }
  };

  const updateRow = (index, field, value) => {
    const newRows = [...rows];
    newRows[index][field] = value;

    // Automatically lookup and autofetch item details if job and seq are entered
    if (field === 'job' || field === 'seq') {
      const jobVal = field === 'job' ? value : newRows[index].job;
      const seqVal = field === 'seq' ? value : newRows[index].seq;

      if (jobVal && seqVal) {
        const matchingProj = projects.find(p => p.code === jobVal);
        if (matchingProj && matchingProj.structural_schedules) {
          const matchingItem = matchingProj.structural_schedules.find(item => item.seq_no === seqVal);
          if (matchingItem) {
            newRows[index].weight = matchingItem.tons || '';
            const rtsD = matchingItem.actual_rts_date || matchingItem.rts_date || '';
            newRows[index].rtsDate = rtsD;
            newRows[index].shipDate = matchingItem.ship_date || '';
            newRows[index].productionStartDate = rtsD ? addOneDay(rtsD) : '';
          }
        }
      }
    }

    if (field === 'rtsDate') {
      newRows[index].productionStartDate = value ? addOneDay(value) : '';
    }

    setRows(newRows);
  };

  const handleSave = async () => {
    // Frontend validation
    if (!header.scheduleNumber || !header.scheduleNumber.trim()) {
      alert('Save Failed: Schedule Number is required.');
      return;
    }
    if (!header.startDate) {
      alert('Save Failed: Start Date is required.');
      return;
    }
    if (!header.endDate) {
      alert('Save Failed: End Date is required.');
      return;
    }

    try {
      setLoading(true);
      const payload = {
        schedule_number: header.scheduleNumber.trim(),
        start_date: header.startDate,
        end_date: header.endDate,
        projects: selectedProjectIds,
        items_input: rows.map(r => ({
          job_number: r.job,
          sequence_number: r.seq,
          weight: r.weight || 0,
          quantity: r.quantity || 0,
          rts_date: r.rtsDate || null,
          ship_date: r.shipDate || null,
          production_start_date: r.productionStartDate || null,
          production_end_date: r.productionEndDate || null,
          notes: r.notes
        })).filter(r => r.job_number)
      };

      if (payload.items_input.length === 0) {
        alert('Save Failed: Please add at least one production item with a Job #');
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
      let errorMsg = 'Failed to save schedule.';
      if (error.response?.data) {
        const data = error.response.data;
        if (typeof data === 'string') {
          errorMsg = data;
        } else if (data.detail) {
          errorMsg = data.detail;
        } else if (typeof data === 'object') {
          errorMsg = Object.entries(data)
            .map(([field, errors]) => {
              const fieldName = field.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
              const fieldErrors = Array.isArray(errors) ? errors.join(', ') : String(errors);
              return `${fieldName}: ${fieldErrors}`;
            })
            .join('\n');
        }
      }
      alert(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in" onClick={() => setShowProjectDropdown(false)}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-[95vw] lg:max-w-[1450px] flex flex-col overflow-hidden max-h-[95vh]" onClick={(e) => e.stopPropagation()}>
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
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 p-6 rounded-2xl bg-slate-50 border border-slate-300">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">Schedule Number</label>
              <input
                value={header.scheduleNumber}
                onChange={(e) => setHeader({ ...header, scheduleNumber: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-white text-sm font-bold text-slate-700 outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-500/5 transition-all"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">Plan Option</label>
              <div className="flex bg-white rounded-xl border border-slate-300 p-1 min-h-[46px] items-center">
                {[
                  { value: 'auto', label: 'Auto' },
                  { value: '1month', label: '1 Month' },
                  { value: '3month', label: '3 Months' },
                  { value: '6month', label: '6 Months' }
                ].map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handlePlanOptionChange(opt.value)}
                    className={`flex-1 py-1.5 px-1 rounded-lg text-[10px] font-bold transition-all ${
                      planOption === opt.value
                        ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
             <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">Start Date</label>
              <FormattedDateInput
                value={header.startDate}
                onChange={handleStartDateChange}
                disabled={planOption === 'auto'}
                className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-white text-sm outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-500/5 transition-all"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">End Date</label>
              <FormattedDateInput
                value={header.endDate}
                onChange={handleEndDateChange}
                disabled={true}
                className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-white text-sm outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-500/5 transition-all"
              />
            </div>
            <div className="relative project-dropdown-container">
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">Select Projects</label>
              <div 
                onClick={(e) => { e.stopPropagation(); setShowProjectDropdown(!showProjectDropdown); }}
                className={`w-full px-4 py-2.5 rounded-xl border bg-white text-[11px] font-bold flex flex-wrap gap-2 cursor-pointer transition-all min-h-[46px] items-center pr-10 ${showProjectDropdown ? 'border-amber-400 ring-4 ring-amber-500/5' : 'border-slate-300 hover:border-slate-400'}`}
              >
                {selectedProjectIds.length === 0 ? (
                  <span className="text-slate-400">Choose projects...</span>
                ) : (
                  selectedProjectIds.map(id => {
                    const p = projects.find(proj => proj.id === id);
                    return p ? (
                      <span key={id} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-200">
                        {p.code}
                        <X className="w-3 h-3 hover:text-red-500 transition-colors" onClick={(e) => { e.stopPropagation(); toggleProjectSelection(id); }} />
                      </span>
                    ) : null;
                  })
                )}
                <div className="absolute right-4 top-[40px] opacity-40 group-hover:opacity-100 transition-opacity">
                  <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showProjectDropdown ? 'rotate-180' : ''}`} />
                </div>
              </div>
              {showProjectDropdown && (
                <div 
                  className="absolute z-[100] top-[75px] left-0 right-0 bg-white border border-slate-200 rounded-2xl shadow-2xl p-2 animate-in fade-in slide-in-from-top-2 duration-200"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="p-2 border-b border-slate-100">
                    <input 
                      type="text"
                      placeholder="Search by code or name..."
                      value={projectSearchTerm}
                      onChange={(e) => setProjectSearchTerm(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-500/5 transition-all"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-1 mt-1 max-h-48 overflow-y-auto custom-scrollbar">
                    {(() => {
                      const filtered = projects.filter(p => 
                        (p.code || '').toLowerCase().includes(projectSearchTerm.toLowerCase()) ||
                        (p.name || '').toLowerCase().includes(projectSearchTerm.toLowerCase())
                      );
                      if (filtered.length === 0) {
                        return <div className="p-4 text-center text-xs text-slate-400">No matching projects found</div>;
                      }
                      return filtered.map(p => {
                        const isSelected = selectedProjectIds.includes(p.id);
                        return (
                          <div 
                            key={p.id}
                            onClick={() => toggleProjectSelection(p.id)}
                            className={`flex items-center justify-between px-4 py-3 rounded-xl cursor-pointer transition-all ${isSelected ? 'bg-amber-50 text-amber-700 shadow-sm' : 'hover:bg-slate-50 text-slate-600'}`}
                          >
                            <div className="flex flex-col">
                              <span className="text-xs font-black uppercase tracking-wider">{p.code}</span>
                              <span className="text-[10px] opacity-70 font-semibold">{p.name}</span>
                            </div>
                            {isSelected && (
                              <div className="w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center shadow-md">
                                <Save className="w-2.5 h-2.5 text-white" />
                              </div>
                            )}
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              )}
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
                <table className="w-full text-left border-collapse min-w-[1280px]">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-300">
                      <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider w-36">Job (Project)</th>
                      <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider w-16 text-center">Seq #</th>
                      <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider w-24 text-center">Weight (in Tons)</th>
                      <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider w-28 text-center">Weight (in LBS)</th>
                      <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider w-24 text-center">Quantity</th>
                      <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider w-40 text-center">RTS Date</th>
                      <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider w-32 text-center">Status</th>
                      <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider w-40 text-center">Ship Date</th>
                      <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider w-40 text-center">Prod Start</th>
                      <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider w-40 text-center">Prod End</th>
                      <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">Notes</th>
                      <th className="px-4 py-3 w-12"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rows.map((row, index) => {
                      const calculateStatus = () => {
                        const shipDate = row.shipDate ? new Date(row.shipDate) : null;
                        
                        if (shipDate) {
                          return { label: 'COMPLETED', color: 'text-emerald-600', bg: 'bg-emerald-50', dot: 'bg-emerald-500' };
                        }

                        if (!row.rtsDate) return { label: 'TBD', color: 'text-slate-400', bg: 'bg-slate-100', dot: 'bg-slate-400' };
                        
                        const [year, month, day] = row.rtsDate.split('-').map(Number);
                        const rtsDate = new Date(year, month - 1, day);
                        const today = new Date();
                        const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                        
                        const diffTime = todayMidnight - rtsDate;
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                        if (diffDays === 0) {
                          return { label: 'IN PROGRESS', color: 'text-blue-600', bg: 'bg-blue-50', dot: 'bg-blue-500' };
                        } else if (diffDays > 0 && diffDays <= 7) {
                          return { label: 'LIKELY DELAY', color: 'text-yellow-600', bg: 'bg-yellow-50', dot: 'bg-yellow-500' };
                        } else if (diffDays > 7) {
                          return { label: 'DELAYED', color: 'text-red-600', bg: 'bg-red-50', dot: 'bg-red-500' };
                        } else {
                          return { label: 'YET TO START', color: 'text-slate-500', bg: 'bg-slate-50', dot: 'bg-slate-400' };
                        }
                      };

                      const status = calculateStatus();

                      return (
                        <tr key={index} className="hover:bg-white transition-colors group">
                          <td className="p-2">
                            <input
                              value={row.job}
                              onChange={(e) => updateRow(index, 'job', e.target.value)}
                              disabled={loading}
                              className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-amber-400 outline-none bg-white text-[11px] font-bold transition-all"
                              placeholder="Job #"
                            />
                          </td>
                          <td className="p-2 text-center">
                            <div className="w-full py-2 px-1 bg-amber-50 border border-amber-200 text-amber-700 font-black text-center text-sm rounded-lg">
                              {row.seq}
                            </div>
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              value={row.weight}
                              onChange={(e) => updateRow(index, 'weight', e.target.value)}
                              className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-amber-400 outline-none bg-transparent text-sm transition-all text-right font-semibold"
                              placeholder="0.00"
                              disabled={loading}
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="text"
                              value={row.weight ? (parseFloat(row.weight) * 2000).toFixed(2) : ''}
                              readOnly
                              className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-500 outline-none text-sm text-center font-bold"
                              placeholder="0.00"
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
                            <FormattedDateInput
                              value={row.rtsDate}
                              onChange={(e) => updateRow(index, 'rtsDate', e.target.value)}
                              className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-amber-400 outline-none bg-transparent text-sm transition-all text-slate-600"
                              disabled={loading}
                            />
                          </td>
                          <td className="p-2">
                            <div className={`flex items-center justify-center gap-1.5 px-2 py-1 rounded-full text-[9px] font-black tracking-tight ${status.bg} ${status.color} border border-current/10 whitespace-nowrap`}>
                              <div className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                              {status.label}
                            </div>
                          </td>
                          <td className="p-2">
                            <FormattedDateInput
                              value={row.shipDate}
                              onChange={(e) => updateRow(index, 'shipDate', e.target.value)}
                              className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-amber-400 outline-none bg-transparent text-sm transition-all text-slate-600"
                              disabled={loading}
                            />
                          </td>
                          <td className="p-2">
                            <FormattedDateInput
                              value={row.productionStartDate}
                              onChange={(e) => updateRow(index, 'productionStartDate', e.target.value)}
                              className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-amber-400 outline-none bg-transparent text-sm transition-all text-slate-600"
                              disabled={loading}
                            />
                          </td>
                          <td className="p-2">
                            <FormattedDateInput
                              value={row.productionEndDate}
                              onChange={(e) => updateRow(index, 'productionEndDate', e.target.value)}
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
                      );
                    })}
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
