import { useState, useEffect, useRef } from 'react';
import { 
  ChevronDown, X, Check, Loader2, Save, Calendar, Plus, Zap, LayoutGrid 
} from 'lucide-react';
import { productionAPI, priorityAPI, projectAPI } from '../../services/api';
import FormattedDateInput from '../../components/forms/FormattedDateInput';
import toast from 'react-hot-toast';

const DEFAULT_RATES = {
  'Plasma': 4500,
  'Plate Over -1': 2000,
  'Bent Plate': 3000,
  'Angle Master': 0,
  'Ironworker': 0,
  'Peddinghaus (Large)': 0,
  'Peddinghaus Drill Line': 0,
  'Ficep': 0,
  'Punch': 0,
};

const STEPS_CONFIG = [
  { id: 'PLATE', label: 'Plate Priority', color: 'amber', processes: ['Plasma', 'Plate Over -1', 'Bent Plate'], icon: Plus, bgClass: 'bg-amber-500', textClass: 'text-amber-500', lightBg: 'bg-amber-50' },
  { id: 'ANGLE', label: 'Angle Priority', color: 'blue', processes: ['Angle Master', 'Ironworker', 'Peddinghaus (Large)'], icon: Zap, bgClass: 'bg-orange-500', textClass: 'text-orange-500', lightBg: 'bg-orange-50' },
  { id: 'STRUCTURAL', label: 'Structural Priority', color: 'emerald', processes: ['Peddinghaus Drill Line', 'Ficep', 'Punch'], icon: LayoutGrid, bgClass: 'bg-amber-600', textClass: 'text-amber-600', lightBg: 'bg-amber-50' },
];

export default function ProcessMasterSettings() {
  const [fetching, setFetching] = useState(true);
  const [schedules, setSchedules] = useState([]);
  const [projects, setProjects] = useState([]);
  
  const [selectedSchedule, setSelectedSchedule] = useState('');
  const [selectedProjectIds, setSelectedProjectIds] = useState([]);
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const dropdownRef = useRef(null);

  const [header, setHeader] = useState({
    scheduleNumber: '',
    startDate: '',
    endDate: ''
  });

  const [rates, setRates] = useState(DEFAULT_RATES);
  const [existingPriorities, setExistingPriorities] = useState([]);
  const [saving, setSaving] = useState(false);
  const [loadingRates, setLoadingRates] = useState(false);

  // Click outside listener for dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowProjectDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch initial schedules and projects
  const fetchInitialData = async () => {
    try {
      setFetching(true);
      const [schedRes, projRes] = await Promise.all([
        productionAPI.getSchedules(),
        projectAPI.getAll()
      ]);
      setSchedules(schedRes.data.results || schedRes.data);
      setProjects(projRes.data.results || projRes.data);
    } catch (err) {
      console.error('Failed to load initial data:', err);
      toast.error('Failed to load schedules or projects.');
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  // Fetch rates for selected schedule
  const fetchRates = async (scheduleId) => {
    try {
      setLoadingRates(true);
      const res = await priorityAPI.getAll({ schedule: scheduleId });
      const records = res.data.results || res.data;
      setExistingPriorities(records);
      
      const newRates = { ...DEFAULT_RATES };
      records.forEach(r => {
        if (newRates[r.process_type] !== undefined) {
          newRates[r.process_type] = r.rate;
        }
      });
      setRates(newRates);
    } catch (err) {
      console.error('Failed to load rates:', err);
      toast.error('Failed to load existing rates for schedule.');
    } finally {
      setLoadingRates(false);
    }
  };

  // Sync selected schedule details
  useEffect(() => {
    if (selectedSchedule) {
      const sched = schedules.find(s => String(s.id) === String(selectedSchedule));
      if (sched) {
        setHeader({
          scheduleNumber: sched.schedule_number,
          startDate: sched.start_date || '',
          endDate: sched.end_date || ''
        });
        setSelectedProjectIds(sched.projects || []);
        fetchRates(sched.id);
      }
    } else {
      setHeader({ scheduleNumber: '', startDate: '', endDate: '' });
      setSelectedProjectIds([]);
      setRates(DEFAULT_RATES);
      setExistingPriorities([]);
    }
  }, [selectedSchedule, schedules]);

  const toggleProjectSelection = (projectId) => {
    setSelectedProjectIds(prev => 
      prev.includes(projectId) 
        ? prev.filter(id => id !== projectId) 
        : [...prev, projectId]
    );
  };

  const updateSectionRate = (proc, val) => {
    setRates(prev => ({
      ...prev,
      [proc]: val
    }));
  };

  const updateCategoryRate = (stepId, val) => {
    const step = STEPS_CONFIG.find(s => s.id === stepId);
    if (!step) return;
    step.processes.forEach(proc => {
      updateSectionRate(proc, val);
    });
  };

  const handleSave = async () => {
    if (!selectedSchedule) {
      toast.error('Please select a schedule first.');
      return;
    }

    try {
      setSaving(true);
      
      // 1. Update schedule projects
      const schedulePayload = {
        schedule_number: header.scheduleNumber,
        start_date: header.startDate || null,
        end_date: header.endDate || null,
        projects: selectedProjectIds
      };
      await productionAPI.updateSchedule(selectedSchedule, schedulePayload);

      // 2. Save rates for each process type
      for (const step of STEPS_CONFIG) {
        for (const proc of step.processes) {
          const rateVal = parseFloat(rates[proc]) || 0;
          const payload = {
            schedule: selectedSchedule,
            module_type: step.id,
            process_type: proc,
            rate: rateVal,
          };
          const existing = existingPriorities.find(r => r.process_type === proc);
          if (existing) {
            await priorityAPI.update(existing.id, payload);
          } else {
            await priorityAPI.create(payload);
          }
        }
      }

      toast.success('Process master settings saved successfully!');
      
      // Refresh options & rates list
      await fetchInitialData();
      await fetchRates(selectedSchedule);
    } catch (err) {
      console.error('Failed to save settings:', err);
      toast.error('Failed to save process master settings.');
    } finally {
      setSaving(false);
    }
  };

  if (fetching) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest animate-pulse">Loading settings panel...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-4 animate-fade-in">
      {/* 4-Column Header Config Card */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 rounded-xl bg-white border border-slate-200 shadow-sm relative overflow-visible">
        <div className="relative">
          <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-0.5">Schedule Number</label>
          <div className="relative">
            <select
              value={selectedSchedule}
              onChange={(e) => setSelectedSchedule(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-[11px] font-black outline-none focus:border-amber-400 transition-all cursor-pointer appearance-none pr-8"
            >
              <option value="">Select Schedule</option>
              {schedules.map(s => <option key={s.id} value={s.id}>{s.schedule_number}</option>)}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
        </div>
        <div>
          <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-0.5">Start Date</label>
          <FormattedDateInput
            value={header.startDate}
            readOnly
            className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50/50 text-[11px] font-bold text-slate-500 outline-none cursor-not-allowed"
          />
        </div>
        <div>
          <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-0.5">End Date</label>
          <FormattedDateInput
            value={header.endDate}
            readOnly
            className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50/50 text-[11px] font-bold text-slate-500 outline-none cursor-not-allowed"
          />
        </div>
        <div className="relative" ref={dropdownRef}>
          <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-0.5">Select Projects</label>
          <div 
            onClick={() => selectedSchedule && setShowProjectDropdown(!showProjectDropdown)}
            className={`w-full px-3 py-1.5 rounded-lg border bg-white text-[10px] font-bold flex flex-wrap gap-1 cursor-pointer transition-all min-h-[36px] items-center pr-8 ${!selectedSchedule ? 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed' : showProjectDropdown ? 'border-amber-400 ring-2 ring-amber-500/5' : 'border-slate-200 hover:border-slate-300'}`}
          >
            {selectedProjectIds.length === 0 ? (
              <span className="text-slate-400">Choose projects...</span>
            ) : (
              selectedProjectIds.map(id => {
                const p = projects.find(proj => proj.id === id);
                return p ? (
                  <span key={id} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 font-extrabold text-[9px]">
                    {p.code}
                  </span>
                ) : null;
              })
            )}
            <ChevronDown className={`absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 transition-transform duration-200 ${showProjectDropdown ? 'rotate-180' : ''}`} />
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
                      {isSelected && <Check className="w-3.5 h-3.5 text-amber-500" />}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3 Priority Columns */}
      {!selectedSchedule ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-sm">
          <div className="w-16 h-16 bg-gradient-to-br from-amber-100 to-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Calendar className="w-8 h-8 text-amber-600" />
          </div>
          <h3 className="text-md font-bold text-slate-800 mb-1">No Schedule Selected</h3>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">Please select a schedule from the dropdown to load and edit priority rate settings.</p>
        </div>
      ) : loadingRates ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-sm flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest animate-pulse">Loading rates...</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {STEPS_CONFIG.map(step => {
              const Icon = step.icon;
              return (
                <div key={step.id} className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                  <div className={`absolute top-0 left-0 w-1 h-full ${step.bgClass}`}></div>
                  <h3 className="text-[11px] font-black text-slate-900 mb-4 uppercase tracking-widest flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-6 h-6 rounded-md ${step.lightBg} flex items-center justify-center ${step.textClass}`}>
                        <Icon className="w-3 h-3" />
                      </div>
                      {step.label}
                    </div>
                    <div className={`flex items-center gap-1.5 px-2 py-0.5 ${step.lightBg} rounded-md border border-slate-200`}>
                      <span className={`text-[8px] font-black ${step.textClass} uppercase`}>Master:</span>
                      <input 
                        type="number"
                        onChange={(e) => updateCategoryRate(step.id, e.target.value)}
                        placeholder="All"
                        className={`w-12 bg-transparent outline-none text-[9px] font-black ${step.textClass} placeholder-slate-450 text-center`}
                      />
                    </div>
                  </h3>
                  <div className="flex flex-col gap-3">
                    {step.processes.map(proc => (
                      <div key={proc} className="flex items-center justify-between gap-3 py-0.5">
                        <label className="w-[40%] text-[9px] font-black text-slate-500 uppercase tracking-tight pl-0.5 truncate" title={proc}>
                          {proc}
                        </label>
                        <div className="relative flex-1">
                          <input 
                            type="number"
                            value={rates[proc] ?? ''}
                            onChange={(e) => updateSectionRate(proc, e.target.value)}
                            placeholder="0"
                            className="w-full pl-3 pr-12 py-1.5 rounded-lg bg-white border border-slate-200 focus:border-amber-400 transition-all text-[11px] font-black text-slate-900 outline-none text-right"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[8px] font-bold text-slate-400 pointer-events-none">lbs/day</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Action Bar */}
          <div className="flex justify-end pt-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-black uppercase tracking-widest shadow-lg shadow-orange-500/10 hover:from-amber-400 hover:to-orange-400 transition-all transform active:scale-95 disabled:opacity-55"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Save Settings
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
