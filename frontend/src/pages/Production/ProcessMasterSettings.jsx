import { useState, useEffect } from 'react';
import { 
  Loader2, Save, Plus, Zap, LayoutGrid 
} from 'lucide-react';
import { productionAPI, priorityAPI } from '../../services/api';
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
  const [selectedSchedule, setSelectedSchedule] = useState('');
  const [rates, setRates] = useState(DEFAULT_RATES);
  const [existingPriorities, setExistingPriorities] = useState([]);
  const [saving, setSaving] = useState(false);
  const [loadingRates, setLoadingRates] = useState(false);

  // Fetch initial schedules
  const fetchInitialData = async () => {
    try {
      setFetching(true);
      const schedRes = await productionAPI.getSchedules();
      let schedList = schedRes.data.results || schedRes.data;
      if (schedList.length === 0) {
        // Automatically create a default schedule if none exists
        try {
          const newSchedRes = await productionAPI.createSchedule({ schedule_number: 'SCH-01' });
          schedList = [newSchedRes.data];
        } catch (createErr) {
          console.error('Failed to create default schedule:', createErr);
        }
      }
      if (schedList.length > 0) {
        setSelectedSchedule(schedList[0].id);
      }
    } catch (err) {
      console.error('Failed to load initial data:', err);
      toast.error('Failed to load settings data.');
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
      toast.error('Failed to load priority rates.');
    } finally {
      setLoadingRates(false);
    }
  };

  // Sync selected schedule details
  useEffect(() => {
    if (selectedSchedule) {
      fetchRates(selectedSchedule);
    } else {
      setRates(DEFAULT_RATES);
      setExistingPriorities([]);
    }
  }, [selectedSchedule]);

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
      toast.error('No schedule available to save settings.');
      return;
    }

    try {
      setSaving(true);
      
      // Save rates for each process type
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
    <div className="w-full space-y-6 animate-fade-in">
      {loadingRates || !selectedSchedule ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center shadow-sm flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest animate-pulse">Loading settings...</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {STEPS_CONFIG.map(step => {
              const Icon = step.icon;
              return (
                <div key={step.id} className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                  <div className={`absolute top-0 left-0 w-1.5 h-full ${step.bgClass}`}></div>
                  <h3 className="text-xs sm:text-sm font-black text-slate-900 mb-6 uppercase tracking-widest flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-lg ${step.lightBg} flex items-center justify-center ${step.textClass}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      {step.label}
                    </div>
                    <div className="flex items-center gap-2 px-2.5 py-1.5 bg-slate-50/50 border border-slate-200/60 rounded-xl">
                      <span className="text-[9px] font-bold text-slate-450 uppercase tracking-wider">Master:</span>
                      <input 
                        type="number"
                        onChange={(e) => updateCategoryRate(step.id, e.target.value)}
                        placeholder="All"
                        className={`w-14 bg-transparent outline-none text-[10px] font-black ${step.textClass} text-center`}
                      />
                    </div>
                  </h3>
                  <div className="flex flex-col gap-4">
                    {step.processes.map(proc => (
                      <div key={proc} className="flex items-center justify-between gap-4 py-0.5">
                        <label className="w-[35%] text-[10px] sm:text-xs font-black text-slate-500 uppercase tracking-wider pl-0.5 truncate" title={proc}>
                          {proc}
                        </label>
                        <div className="relative flex-1">
                          <input 
                            type="number"
                            value={rates[proc] ?? ''}
                            onChange={(e) => updateSectionRate(proc, e.target.value)}
                            placeholder="0"
                            className="w-full pl-4 pr-16 py-2.5 rounded-xl bg-white border border-slate-200 hover:border-slate-300 focus:border-amber-400 focus:ring-4 focus:ring-amber-500/5 transition-all text-xs sm:text-sm font-black text-slate-800 outline-none text-right shadow-sm"
                          />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] sm:text-[10px] font-bold text-slate-400 pointer-events-none uppercase tracking-wider">lbs/day</span>
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
              className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white text-xs sm:text-sm font-black uppercase tracking-widest shadow-lg shadow-orange-500/10 transition-all transform active:scale-95 disabled:opacity-55"
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
