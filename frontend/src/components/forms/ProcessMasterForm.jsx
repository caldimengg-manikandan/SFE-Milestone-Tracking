import { useState, useEffect } from 'react';
import { X, Save, Plus, Trash2, Calendar, Loader2, Columns, ChevronRight, CheckCircle2, Layers, Zap, LayoutGrid, FileText, ChevronDown } from 'lucide-react';
import { productionAPI, priorityAPI, projectAPI, scheduleAPI } from '../../services/api';

const DEFAULT_COLUMNS = [
  { key: 'job', label: 'Job #', type: 'text', fixed: true },
  { key: 'seq', label: 'Seq #', type: 'text', fixed: true },
  { key: 'weight', label: 'Weight', type: 'number', fixed: true },
  { key: 'rtsDate', label: 'RTS Date', type: 'date', fixed: true },
  { key: 'runDays', label: 'Run Days', type: 'readonly', fixed: true },
  { key: 'startRunDate', label: 'Start Run Date', type: 'date', fixed: true },
  { key: 'completeRunDate', label: 'Complete Run Date', type: 'readonly', fixed: true },
  { key: 'notes', label: 'Notes', type: 'text', fixed: true },
];

const DEFAULT_RATES = {
  'Plasma': 4500,
  'Plate Over -1': 2000,
  'Bent Plate': 3000,
};

const emptyRow = (jobNum = '', rtsDate = '') => {
  const row = {};
  DEFAULT_COLUMNS.forEach(col => { row[col.key] = ''; });
  row.job = jobNum;
  row.rtsDate = rtsDate;
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
  const [schedules, setSchedules] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedProjectIds, setSelectedProjectIds] = useState([]);
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const [header, setHeader] = useState({
    scheduleNumber: '',
    startDate: '',
    endDate: ''
  });
  const [existingRecords, setExistingRecords] = useState([]);
  const [structuralItems, setStructuralItems] = useState([]);
  const [fetchingSchedules, setFetchingSchedules] = useState(true);
  const [loading, setLoading] = useState(false);
  const [isScheduleLoading, setIsScheduleLoading] = useState(false);

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setFetchingSchedules(true);
        const [schedRes, projRes, structRes] = await Promise.all([
          productionAPI.getSchedules(),
          projectAPI.getAll(),
          scheduleAPI.getAll()
        ]);
        setSchedules(schedRes.data.results || schedRes.data);
        setProjects(projRes.data.results || projRes.data);
        setStructuralItems(structRes.data.results || structRes.data);
      } catch (e) {
        console.error('Error fetching initial data:', e);
      } finally {
        setFetchingSchedules(false);
      }
    };
    fetchData();
  }, []);

  // Sync header when schedule changes
  useEffect(() => {
    if (selectedSchedule) {
      const sched = schedules.find(s => String(s.id) === String(selectedSchedule));
      if (sched) {
        setHeader({
          scheduleNumber: sched.schedule_number,
          startDate: sched.start_date,
          endDate: sched.end_date
        });
        setSelectedProjectIds(sched.projects || []);
      }
    }
  }, [selectedSchedule, schedules]);

  // Load existing records for the schedule
  useEffect(() => {
    if (selectedSchedule) {
      // Block auto-populate while we check for existing records
      setIsScheduleLoading(true);
      setExistingRecords([]);

      // Reset sectionData to clean defaults before loading new schedule data
      setSectionData(() => {
        const data = {};
        STEPS.forEach(step => {
          if (step.processes) {
            step.processes.forEach(proc => {
              data[proc] = { rate: DEFAULT_RATES[proc] || '', rows: [emptyRow()] };
            });
          }
        });
        return data;
      });

      const loadExisting = async () => {
        try {
          const res = await priorityAPI.getAll({ schedule: selectedSchedule });
          const records = res.data.results || res.data;
          setExistingRecords(records);

          if (records.length > 0) {
            // Load saved records into section data (preserving all manual fields).
            // NOTE: weight/rtsDate sync from project master runs in a separate
            // useEffect below so it always has fresh structuralItems/projects data.
            setSectionData(prev => {
              const next = {};
              for (const key of Object.keys(prev)) {
                next[key] = { rate: prev[key].rate, rows: [...prev[key].rows] };
              }
              records.forEach(r => {
                if (next[r.process_type]) {
                  next[r.process_type].rate = r.rate;
                  if (r.items && r.items.length > 0) {
                    next[r.process_type].rows = r.items.map(item => {
                      const weight = parseFloat(item.weight) || 0;
                      const rate = parseFloat(r.rate) || 0;
                      return {
                        job: item.job_number || '',
                        seq: item.sequence_number || '',
                        weight: item.weight || '',
                        rtsDate: item.rts_date || '',
                        runDays: (rate > 0 && weight > 0) ? Math.ceil(weight / rate) : (item.run_days || ''),
                        startRunDate: item.actual_ofa || '',
                        completeRunDate: item.complete_run_date || '',
                        notes: item.notes || '',
                        _machine: ''
                      };
                    });
                  }
                }
              });
              return next;
            });
          }
          // If no records: allow auto-populate to run by releasing the loading lock
        } catch (e) {
          console.error("Failed to load existing data", e);
        } finally {
          setIsScheduleLoading(false);
        }
      };
      loadExisting();
    } else {
      // No schedule selected: reset to empty
      setSectionData(() => {
        const data = {};
        STEPS.forEach(step => {
          if (step.processes) {
            step.processes.forEach(proc => {
              data[proc] = { rate: DEFAULT_RATES[proc] || '', rows: [emptyRow()] };
            });
          }
        });
        return data;
      });
      setExistingRecords([]);
      setIsScheduleLoading(false);
    }
  }, [selectedSchedule]);

  // Sync weight, rtsDate and new sequences from project master into saved rows.
  // Runs whenever existingRecords OR structuralItems change, so it always has
  // fresh data regardless of which resolves first.
  useEffect(() => {
    if (existingRecords.length === 0 || structuralItems.length === 0 || !selectedSchedule) return;

    const clean = (s) => s.replace(/[^a-z0-9]/g, '');
    const getKey = (job, seq) => `${String(job)}__${String(seq)}`;

    const sched = schedules.find(s => String(s.id) === String(selectedSchedule));
    const projIds = sched?.projects || [];
    if (projIds.length === 0) return;

    setSectionData(prev => {
      const next = {};
      for (const key of Object.keys(prev)) {
        // Deep-clone rows so we don't mutate prev directly
        next[key] = { rate: prev[key].rate, rows: prev[key].rows.map(r => ({ ...r })) };
      }

      projIds.forEach(projId => {
        const proj = projects.find(p => String(p.id) === String(projId));
        if (!proj) return;

        const projectStructs = structuralItems.filter(item =>
          String(item.project) === String(projId) ||
          (item.project?.id && String(item.project.id) === String(projId))
        );

        projectStructs.forEach(item => {
          let fabDetails = item.fabrication_details || [];
          if (typeof fabDetails === 'string') {
            try { fabDetails = JSON.parse(fabDetails); } catch (e) { fabDetails = []; }
          }
          if (!Array.isArray(fabDetails) || fabDetails.length === 0) return;

          fabDetails.forEach(fab => {
            const machineName = fab.machine?.trim()?.toLowerCase();
            if (!machineName) return;
            const cm = clean(machineName);

            let matchedProc = null;
            for (const step of STEPS) {
              if (step.processes) {
                const found = step.processes.find(p => {
                  const cp = clean(p.toLowerCase());
                  if (cp.includes(cm) || cm.includes(cp)) return true;
                  if (cp === 'ironworker' && cm === 'ironmaster') return true;
                  if (cp === 'anglemaster' && cm === 'anglemaster') return true;
                  return false;
                });
                if (found) { matchedProc = found; break; }
              }
            }

            if (matchedProc && next[matchedProc]) {
              const rowKey = getKey(proj.code, item.seq_no);
              const existingRowIdx = next[matchedProc].rows.findIndex(
                r => getKey(r.job, r.seq) === rowKey
              );

              if (existingRowIdx >= 0) {
                // Sync weight and rtsDate from project master; recalculate run days
                const rate = parseFloat(next[matchedProc].rate) || 0;
                const weight = parseFloat(item.tons) || 0;
                const runDays = (rate > 0 && weight > 0)
                  ? Math.ceil(weight / rate)
                  : next[matchedProc].rows[existingRowIdx].runDays;
                next[matchedProc].rows[existingRowIdx] = {
                  ...next[matchedProc].rows[existingRowIdx],
                  weight: item.tons,            // sync latest weight
                  rtsDate: item.rts_date || '', // sync latest RTS date
                  runDays,
                };
              } else {
                // New sequence added in project master — append it
                const rate = parseFloat(next[matchedProc].rate) || 0;
                const weight = parseFloat(item.tons) || 0;
                const runDays = (rate > 0 && weight > 0) ? Math.ceil(weight / rate) : '';
                const isInitialEmpty = next[matchedProc].rows.length === 1 &&
                  Object.values(next[matchedProc].rows[0]).every(v => v === '');
                const newRow = {
                  job: proj.code,
                  seq: item.seq_no,
                  weight: item.tons,
                  rtsDate: item.rts_date || '',
                  runDays,
                  startRunDate: '',
                  completeRunDate: '',
                  notes: '',
                  _machine: machineName
                };
                if (isInitialEmpty) next[matchedProc].rows = [newRow];
                else next[matchedProc].rows = [...next[matchedProc].rows, newRow];
              }
            }
          });
        });
      });

      return next;
    });
  }, [existingRecords, structuralItems, schedules, projects, selectedSchedule]);

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '-';
    return `${String(date.getDate()).padStart(2,'0')}-${String(date.getMonth()+1).padStart(2,'0')}-${date.getFullYear()}`;
  };


  // Auto-populate logic based on selected projects and machine types
  // Only runs when: not editing, schedule has NO existing saved records, and schedule loading is done
  useEffect(() => {
    if (selectedProjectIds.length > 0 && structuralItems.length > 0 && !editRecord && !isScheduleLoading && existingRecords.length === 0) {
      setSectionData(prev => {
        const next = {};
        // Deep copy all process sections
        for (const key of Object.keys(prev)) {
          next[key] = { rate: prev[key].rate, rows: [...prev[key].rows] };
        }
        let dataChanged = false;

        selectedProjectIds.forEach(projId => {
          const proj = projects.find(p => String(p.id) === String(projId));
          if (!proj) return;

          // Filter structural items for this project
          const projectStructs = structuralItems.filter(item =>
            String(item.project) === String(projId) ||
            (item.project?.id && String(item.project.id) === String(projId))
          );

          projectStructs.forEach(item => {
            let fabDetails = item.fabrication_details || [];
            if (typeof fabDetails === 'string') {
              try { fabDetails = JSON.parse(fabDetails); } catch (e) { fabDetails = []; }
            }

            if (!Array.isArray(fabDetails) || fabDetails.length === 0) return;

            fabDetails.forEach(fab => {
              const machineName = fab.machine?.trim()?.toLowerCase();
              if (!machineName) return;

              const clean = (s) => s.replace(/[^a-z0-9]/g, '');
              const cm = clean(machineName);

              let matchedProc = null;
              for (const step of STEPS) {
                if (step.processes) {
                  const found = step.processes.find(p => {
                    const cp = clean(p.toLowerCase());
                    if (cp.includes(cm) || cm.includes(cp)) return true;
                    // Industrial aliases
                    if (cp === 'ironworker' && cm === 'ironmaster') return true;
                    if (cp === 'anglemaster' && cm === 'anglemaster') return true;
                    return false;
                  });
                  if (found) { matchedProc = found; break; }
                }
              }

              if (matchedProc && next[matchedProc]) {
                const currentRows = next[matchedProc].rows;
                const isInitialEmpty = currentRows.length === 1 && Object.values(currentRows[0]).every(v => v === '');
                // Dedup key includes machine to allow same seq on different machines
                const dupKey = `${proj.code}__${item.seq_no}__${cm}`;
                const exists = currentRows.find(r => `${r.job}__${r.seq}__${clean(r._machine || '')}` === dupKey);

                if (!exists) {
                  const rate = parseFloat(next[matchedProc].rate) || 0;
                  const weight = parseFloat(item.tons) || 0;
                  const runDays = (rate > 0 && weight > 0) ? Math.ceil(weight / rate) : '';
                  const newRow = {
                    job: proj.code,
                    seq: item.seq_no,
                    weight: item.tons,
                    rtsDate: item.rts_date || '',
                    runDays,
                    startRunDate: '',
                    completeRunDate: '',
                    notes: '',
                    _machine: machineName // internal tracking key
                  };
                  if (isInitialEmpty) next[matchedProc].rows = [newRow];
                  else next[matchedProc].rows = [...next[matchedProc].rows, newRow];
                  dataChanged = true;
                }
              }
            });
          });
        });
        return dataChanged ? next : prev;
      });
    }
  }, [selectedProjectIds, structuralItems, projects, editRecord, isScheduleLoading, existingRecords]);

  const [sectionData, setSectionData] = useState(() => {
    const data = {};
    STEPS.forEach(step => {
      if (step.processes) {
        step.processes.forEach(proc => {
          data[proc] = { rate: DEFAULT_RATES[proc] || '', rows: [emptyRow()] };
        });
      }
    });
    return data;
  });



  const updateRow = (processName, ridx, field, value) => {
    setSectionData(prev => {
      const next = { ...prev };
      const nextRows = [...next[processName].rows];
      nextRows[ridx] = { ...nextRows[ridx], [field]: value };
      
      const r = parseFloat(next[processName].rate);
      const w = parseFloat(nextRows[ridx].weight);
      if (r > 0 && w > 0) nextRows[ridx].runDays = Math.ceil(w / r);
      
      if (nextRows[ridx].runDays && nextRows[ridx].startRunDate) {
        const d = new Date(nextRows[ridx].startRunDate);
        d.setDate(d.getDate() + parseInt(nextRows[ridx].runDays));
        nextRows[ridx].completeRunDate = d.toISOString().split('T')[0];
      } else {
        nextRows[ridx].completeRunDate = '';
      }
      
      next[processName].rows = nextRows;
      return next;
    });
  };

  const updateSectionRate = (proc, value) => {
    setSectionData(prev => {
      const next = { ...prev };
      next[proc].rate = value;
      const r = parseFloat(value);
      next[proc].rows = next[proc].rows.map(row => {
        const w = parseFloat(row.weight);
        const runDays = (r > 0 && w > 0) ? Math.ceil(w / r) : row.runDays;
        let completeDate = row.completeRunDate;
        if (runDays && row.startRunDate) {
          const d = new Date(row.startRunDate);
          d.setDate(d.getDate() + parseInt(runDays));
          completeDate = d.toISOString().split('T')[0];
        }
        return { ...row, runDays, completeRunDate: completeDate };
      });
      return next;
    });
  };

  const updateCategoryRate = (categoryStepId, value) => {
    const step = STEPS.find(s => s.id === categoryStepId);
    if (!step || !step.processes) return;
    step.processes.forEach(proc => updateSectionRate(proc, value));
  };

  const addRow = (processName) => {
    setSectionData(prev => ({
      ...prev,
      [processName]: { ...prev[processName], rows: [...prev[processName].rows, emptyRow()] }
    }));
  };

  const removeRow = (processName, ridx) => {
    setSectionData(prev => {
      if (prev[processName].rows.length <= 1) return prev;
      return { ...prev, [processName]: { ...prev[processName], rows: prev[processName].rows.filter((_, i) => i !== ridx) } };
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
              actual_ofa: r.startRunDate || null,
              complete_run_date: r.completeRunDate || null,
              notes: r.notes || null,
            })),
          };
          const existing = existingRecords.find(r => r.process_type === proc);
          if (existing) await priorityAPI.update(existing.id, payload);
          else await priorityAPI.create(payload);
        }
      }
      if (activeStep < STEPS.length - 1) setActiveStep(prev => prev + 1);
      else { if (onSuccess) onSuccess(); onClose(); }
    } catch (err) {
      console.error('Step save error:', err);
      alert('Failed to save data.');
    } finally { setLoading(false); }
  };

  const toggleProjectSelection = (projectId) => {
    setSelectedProjectIds(prev => prev.includes(projectId) ? prev.filter(id => id !== projectId) : [...prev, projectId]);
  };

  const selectedProject = schedules.find(s => s.id == selectedSchedule);
  const selectedSchedNum = selectedProject?.schedule_number || (fetchingSchedules ? "Loading..." : "---");
  const selectedProjName = selectedProject?.project_name || (fetchingSchedules ? "Loading projects..." : "Select a project to begin");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[96vw] lg:max-w-7xl flex flex-col overflow-hidden max-h-[92vh] border border-slate-200">
        
        {/* Tab-style Navigation */}
        <div className="flex items-center px-3 pt-1.5 gap-0.5 bg-white border-b border-slate-200">
          {STEPS.map((step, idx) => (
            <button
              key={step.id}
              onClick={() => setActiveStep(idx)}
              className={`px-4 py-1.5 rounded-t-lg text-[9px] font-black uppercase tracking-widest transition-all
                ${activeStep === idx 
                  ? 'bg-white text-amber-600 shadow-[0_-3px_8px_rgba(0,0,0,0.04)] border-t-2 border-t-amber-500' 
                  : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
            >
              {step.label}
            </button>
          ))}
          <div className="ml-auto pr-1">
             <button onClick={onClose} className="p-1 rounded-lg text-slate-300 hover:text-slate-600 transition-all"><X className="w-3.5 h-3.5" /></button>
          </div>
        </div>

        {/* Form Content */}
        <div className="flex-1 overflow-y-auto p-3 bg-white">
          {activeStep === 0 ? (
            <div className="space-y-3 animate-fade-in max-w-5xl mx-auto">
                {/* 4-Column Header Box */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5 p-3 rounded-xl bg-white border border-slate-200 shadow-sm relative overflow-visible">
                  <div className="relative">
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5 ml-0.5">Schedule Number</label>
                    <div className="relative">
                      <select
                        value={selectedSchedule}
                        onChange={(e) => setSelectedSchedule(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-md border border-slate-200 bg-white text-[11px] font-black outline-none focus:border-amber-400 transition-all cursor-pointer appearance-none pr-8"
                      >
                        <option value="">Select Schedule</option>
                        {schedules.map(s => <option key={s.id} value={s.id}>{s.schedule_number}</option>)}
                      </select>
                      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5 ml-0.5">Start Date</label>
                    <div className="relative">
                      <input
                        type="date"
                        value={header.startDate}
                        readOnly
                        className="w-full px-2.5 py-1.5 rounded-md border border-slate-200 bg-white text-[11px] font-bold text-slate-600 outline-none"
                      />
                      <Calendar className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300 pointer-events-none" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5 ml-0.5">End Date</label>
                    <div className="relative">
                      <input
                        type="date"
                        value={header.endDate}
                        readOnly
                        className="w-full px-2.5 py-1.5 rounded-md border border-slate-200 bg-white text-[11px] font-bold text-slate-600 outline-none"
                      />
                      <Calendar className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300 pointer-events-none" />
                    </div>
                  </div>
                  <div className="relative">
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5 ml-0.5">Select Projects</label>
                    <div 
                      onClick={() => setShowProjectDropdown(!showProjectDropdown)}
                      className={`w-full px-2.5 py-1 rounded-md border bg-white text-[9px] font-bold flex flex-wrap gap-1 cursor-pointer transition-all min-h-[32px] items-center pr-8 ${showProjectDropdown ? 'border-amber-400 ring-2 ring-amber-500/5' : 'border-slate-200 hover:border-slate-300'}`}
                    >
                      {selectedProjectIds.length === 0 ? (
                        <span className="text-slate-400">Choose projects...</span>
                      ) : (
                        selectedProjectIds.map(id => {
                          const p = projects.find(proj => proj.id === id);
                          return p ? (
                            <span key={id} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                              {p.code}
                            </span>
                          ) : null;
                        })
                      )}
                      <ChevronDown className={`absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${showProjectDropdown ? 'rotate-180' : ''}`} />
                    </div>

                    {showProjectDropdown && (
                      <div className="absolute z-[100] top-[105%] left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-xl max-h-56 overflow-y-auto p-1.5 animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="grid grid-cols-1 gap-0.5">
                          {projects.map(p => {
                            const isSelected = selectedProjectIds.includes(p.id);
                            return (
                              <div 
                                key={p.id}
                                onClick={(e) => { e.stopPropagation(); toggleProjectSelection(p.id); }}
                                className={`flex items-center justify-between px-3 py-1.5 rounded-lg cursor-pointer transition-all ${isSelected ? 'bg-amber-50 text-amber-700' : 'hover:bg-slate-50 text-slate-600'}`}
                              >
                                <div className="flex flex-col">
                                  <span className="text-[11px] font-black uppercase tracking-wider">{p.code}</span>
                                  <span className="text-[9px] opacity-70 font-semibold">{p.name}</span>
                                </div>
                                {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-amber-500" />}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                   {/* Plate Priority Section */}
                   <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                      <div className="absolute top-0 left-0 w-1 h-full bg-amber-500"></div>
                      <h3 className="text-[10px] font-black text-slate-900 mb-3 uppercase tracking-widest flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded-md bg-amber-50 flex items-center justify-center text-amber-500"><Plus className="w-2.5 h-2.5" /></div>
                          Plate Priority
                        </div>
                        <div className="flex items-center gap-1 px-1.5 py-0.5 bg-amber-50/50 rounded-md border border-amber-200/60">
                           <span className="text-[7.5px] font-black text-amber-600 uppercase">Master:</span>
                           <input 
                             type="number"
                             onChange={(e) => updateCategoryRate('PLATE', e.target.value)}
                             placeholder="All"
                             className="w-10 bg-transparent outline-none text-[8.5px] font-black text-amber-700 placeholder-amber-400 text-center"
                           />
                        </div>
                      </h3>
                      <div className="flex flex-col gap-2">
                        {['Plasma', 'Plate Over -1', 'Bent Plate'].map(proc => (
                          <div key={proc} className="flex items-center justify-between gap-2 py-0.5">
                             <label className="w-[38%] text-[8.5px] font-black text-slate-500 uppercase tracking-tight pl-0.5 truncate" title={proc}>{proc}</label>
                             <div className="relative flex-1">
                                <input 
                                  type="number"
                                  value={sectionData[proc]?.rate || ''}
                                  onChange={(e) => updateSectionRate(proc, e.target.value)}
                                  placeholder="0"
                                  className="w-full pl-2 pr-10 py-1 rounded-md bg-white border border-slate-200 focus:border-amber-400 transition-all text-[10px] font-black text-slate-900 outline-none text-right"
                                />
                                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[7.5px] font-bold text-slate-300 pointer-events-none">lbs/day</span>
                             </div>
                          </div>
                        ))}
                      </div>
                   </div>

                   {/* Angle Priority Section */}
                   <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                      <div className="absolute top-0 left-0 w-1 h-full bg-orange-500"></div>
                       <h3 className="text-[10px] font-black text-slate-900 mb-3 uppercase tracking-widest flex items-center justify-between gap-2">
                         <div className="flex items-center gap-1.5">
                           <div className="w-5 h-5 rounded-md bg-orange-50 flex items-center justify-center text-orange-500"><Zap className="w-2.5 h-2.5" /></div>
                           Angle Priority
                         </div>
                         <div className="flex items-center gap-1 px-1.5 py-0.5 bg-orange-50/50 rounded-md border border-orange-200/60">
                           <span className="text-[7.5px] font-black text-orange-600 uppercase">Master:</span>
                           <input 
                             type="number"
                             onChange={(e) => updateCategoryRate('ANGLE', e.target.value)}
                             placeholder="All"
                             className="w-10 bg-transparent outline-none text-[8.5px] font-black text-orange-700 placeholder-orange-400 text-center"
                           />
                         </div>
                       </h3>
                      <div className="flex flex-col gap-2">
                        {['Angle Master', 'Ironworker', 'Peddinghaus (Large)'].map(proc => (
                          <div key={proc} className="flex items-center justify-between gap-2 py-0.5">
                             <label className="w-[38%] text-[8.5px] font-black text-slate-500 uppercase tracking-tight pl-0.5 truncate" title={proc}>{proc}</label>
                             <div className="relative flex-1">
                                <input 
                                  type="number"
                                  value={sectionData[proc]?.rate || ''}
                                  onChange={(e) => updateSectionRate(proc, e.target.value)}
                                  placeholder="0"
                                  className="w-full pl-2 pr-10 py-1 rounded-md bg-white border border-slate-200 focus:border-orange-400 transition-all text-[10px] font-black text-slate-900 outline-none text-right"
                                />
                                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[7.5px] font-bold text-slate-300 pointer-events-none">lbs/day</span>
                             </div>
                          </div>
                        ))}
                      </div>
                   </div>

                   {/* Structural Priority Section */}
                   <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                      <div className="absolute top-0 left-0 w-1 h-full bg-amber-600"></div>
                       <h3 className="text-[10px] font-black text-slate-900 mb-3 uppercase tracking-widest flex items-center justify-between gap-2">
                         <div className="flex items-center gap-1.5">
                           <div className="w-5 h-5 rounded-md bg-amber-50 flex items-center justify-center text-amber-600"><LayoutGrid className="w-2.5 h-2.5" /></div>
                           Structural Priority
                         </div>
                         <div className="flex items-center gap-1 px-1.5 py-0.5 bg-amber-50/50 rounded-md border border-amber-200/60">
                           <span className="text-[7.5px] font-black text-amber-600 uppercase">Master:</span>
                           <input 
                             type="number"
                             onChange={(e) => updateCategoryRate('STRUCTURAL', e.target.value)}
                             placeholder="All"
                             className="w-10 bg-transparent outline-none text-[8.5px] font-black text-amber-700 placeholder-amber-400 text-center"
                           />
                         </div>
                       </h3>
                      <div className="flex flex-col gap-2">
                        {['Peddinghaus Drill Line', 'Ficep', 'Punch'].map(proc => (
                          <div key={proc} className="flex items-center justify-between gap-2 py-0.5">
                             <label className="w-[38%] text-[8.5px] font-black text-slate-500 uppercase tracking-tight pl-0.5 truncate" title={proc}>{proc}</label>
                             <div className="relative flex-1">
                                <input 
                                  type="number"
                                  value={sectionData[proc]?.rate || ''}
                                  onChange={(e) => updateSectionRate(proc, e.target.value)}
                                  placeholder="0"
                                  className="w-full pl-2 pr-10 py-1 rounded-md bg-white border border-slate-200 focus:border-amber-600 transition-all text-[10px] font-black text-slate-900 outline-none text-right"
                                />
                                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[7.5px] font-bold text-slate-300 pointer-events-none">lbs/day</span>
                             </div>
                          </div>
                        ))}
                      </div>
                   </div>
                </div>
            </div>
          ) : (
            <div className="space-y-3 animate-fade-in max-w-7xl mx-auto">
              <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl p-2.5 px-3 text-white flex items-center justify-between border-2 border-white shadow-xl shadow-orange-500/10">
                 <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur-md flex items-center justify-center text-white border border-white/30"><FileText className="w-4 h-4" /></div>
                    <div>
                      <h3 className="text-sm font-black tracking-tight">{STEPS[activeStep].label.toUpperCase()}</h3>
                      <p className="text-white/70 text-[8px] font-black uppercase tracking-widest">Project {selectedSchedNum}</p>
                    </div>
                 </div>
                 <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setActiveStep(0)}
                      className="px-3 py-1.5 rounded-lg bg-white/10 border border-white/30 text-[8px] font-black uppercase tracking-widest hover:bg-white/20 transition-all backdrop-blur-md"
                    >
                      Back to Rates
                    </button>
                    <button 
                      onClick={handleSaveStep}
                      disabled={loading}
                      className="px-4 py-1.5 rounded-lg bg-white text-amber-600 text-[8px] font-black uppercase tracking-widest hover:bg-amber-50 shadow-md transition-all active:scale-95"
                    >
                      {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : (activeStep < STEPS.length - 1 ? 'Save & Next' : 'Finalize & Save')}
                    </button>
                 </div>
              </div>

              {STEPS[activeStep].processes.map(proc => (
                <div key={proc} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                  <div className="px-3 py-2 bg-white border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded bg-white shadow-sm border border-slate-200 flex items-center justify-center text-amber-500 font-black text-[10px]">
                        {proc.charAt(0)}
                      </div>
                      <div>
                        <h4 className="font-black text-[9px] uppercase tracking-widest text-slate-900">{proc}</h4>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50/40 border border-amber-200/50 rounded-lg select-none">
                        <span className="text-[8px] font-black text-amber-600 uppercase">Rate:</span>
                        <span className="text-[11px] font-black text-slate-800 px-0.5">
                          {parseFloat(sectionData[proc].rate || 0).toFixed(2)}
                        </span>
                        <span className="text-[8px] font-bold text-amber-500">lbs/day</span>
                      </div>
                      <button onClick={() => addRow(proc)} className="px-3 py-1 rounded-lg bg-amber-500 text-white text-[8px] font-black uppercase tracking-widest hover:bg-amber-600 transition-all flex items-center gap-1.5">
                        <Plus className="w-2.5 h-2.5" /> Add Row
                      </button>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-white border-b border-slate-100">
                          {DEFAULT_COLUMNS.map(col => (
                            <th key={col.key} className="px-1.5 py-1 text-[8px] font-black text-slate-400 uppercase tracking-widest text-center">{col.label}</th>
                          ))}
                          <th className="w-10"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {[...sectionData[proc].rows]
                          .sort((a, b) => {
                            if (!a.rtsDate && !b.rtsDate) return 0;
                            if (!a.rtsDate) return 1;
                            if (!b.rtsDate) return -1;
                            return new Date(a.rtsDate) - new Date(b.rtsDate);
                          })
                          .map((row, ridx) => (
                          <tr key={ridx} className="hover:bg-slate-50/30 transition-colors">
                            {DEFAULT_COLUMNS.map(col => (
                              <td key={col.key} className="p-0.5">
                                {col.type === 'readonly' ? (
                                  <div className="w-full py-1 bg-white text-slate-800 text-center text-[9px] font-bold rounded-md border border-slate-200">
                                    {col.key === 'completeRunDate' ? formatDate(row[col.key]) : (row[col.key] || '-')}
                                  </div>
                                ) : col.type === 'date' ? (
                                  <div className="relative group/date">
                                    <input
                                      type="date"
                                      value={row[col.key] || ''}
                                      onChange={(e) => updateRow(proc, ridx, col.key, e.target.value)}
                                      className="w-full px-1 py-1 rounded-md border border-slate-200 focus:border-amber-400 outline-none text-[9px] text-slate-600 absolute inset-0 opacity-0 cursor-pointer"
                                    />
                                    <div className="w-full px-1 py-1 rounded-md border border-slate-200 bg-white text-[8px] font-bold text-slate-600 flex items-center justify-between pointer-events-none group-hover/date:border-amber-200 transition-all">
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
                                    className="w-full px-1 py-1 rounded-md border border-slate-200 focus:border-amber-400 outline-none bg-white text-[9px] text-slate-700 font-bold transition-all"
                                  />
                                )}
                              </td>
                            ))}
                            <td className="text-center px-1">
                              <button onClick={() => removeRow(proc, ridx)} className="p-1 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded transition-all"><Trash2 className="w-3 h-3" /></button>
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
        <div className="px-4 py-2 border-t border-slate-200 bg-white flex items-center justify-between">
           <button 
             onClick={() => setActiveStep(prev => Math.max(0, prev - 1))}
             disabled={activeStep === 0}
             className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all
               ${activeStep === 0 ? 'opacity-0 pointer-events-none' : 'text-slate-400 hover:text-slate-900 hover:bg-slate-50'}`}
           >
             Previous Step
           </button>
           
           <div className="flex items-center gap-2">
              <button onClick={onClose} className="px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600">Cancel</button>
              <button 
                onClick={handleSaveStep}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-amber-500 text-white text-[9px] font-black uppercase tracking-widest hover:bg-amber-600 shadow-md shadow-amber-500/10 transition-all active:scale-95"
              >
                {activeStep === 0 ? 'Start Entry Wizard' : (activeStep < STEPS.length - 1 ? 'Save & Next' : 'Finalize & Save')}
                <ChevronRight className="w-3.5 h-3.5" />
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