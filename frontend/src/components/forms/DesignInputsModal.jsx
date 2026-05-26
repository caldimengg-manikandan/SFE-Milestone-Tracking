import { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronLeft, Save, Building2, Calculator, DollarSign, Loader2 } from 'lucide-react';
import { projectAPI } from '../../services/api';
import { defaultWorksheet, recalculateWorksheet, parseNum } from './SteelBudgetForm';

export default function DesignInputsModal({ isOpen, onClose, projects, onSaveSuccess, editingProject = null }) {
  const [step, setStep] = useState(1);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [worksheet, setWorksheet] = useState(defaultWorksheet);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (editingProject) {
        setSelectedProjectId(editingProject.id);
        const baseWorksheet = editingProject.steel_budget_worksheet && Object.keys(editingProject.steel_budget_worksheet).length > 0
          ? editingProject.steel_budget_worksheet
          : defaultWorksheet;
        setWorksheet(recalculateWorksheet(baseWorksheet));
      } else {
        setSelectedProjectId('');
        setWorksheet(recalculateWorksheet(defaultWorksheet));
      }
      setStep(1);
    }
  }, [isOpen, editingProject]);

  const handleProjectSelect = (e) => {
    const id = e.target.value;
    setSelectedProjectId(id);
    if (id) {
      const proj = projects.find(p => String(p.id) === String(id));
      if (proj) {
        const baseWorksheet = proj.steel_budget_worksheet && Object.keys(proj.steel_budget_worksheet).length > 0
          ? proj.steel_budget_worksheet
          : defaultWorksheet;
        setWorksheet(recalculateWorksheet(baseWorksheet));
      }
    } else {
      setWorksheet(recalculateWorksheet(defaultWorksheet));
    }
  };

  const handleWorksheetChange = (field, value) => {
    const updated = { ...worksheet, [field]: value };
    setWorksheet(recalculateWorksheet(updated));
  };

  const handleNext = () => {
    if (step === 1 && !selectedProjectId) {
      alert("Please select a project first.");
      return;
    }
    setStep(s => Math.min(s + 1, 3));
  };

  const handleBack = () => {
    setStep(s => Math.max(s - 1, 1));
  };

  const handleSave = async () => {
    if (!selectedProjectId) return;
    setSaving(true);
    try {
      const proj = projects.find(p => String(p.id) === String(selectedProjectId));
      const payload = {
        ...proj,
        steel_budget_worksheet: worksheet,
        total_ton: parseNum(worksheet.total_est_steel_tons) || (proj?.total_ton || 0)
      };
      await projectAPI.update(selectedProjectId, payload);
      onSaveSuccess();
    } catch (err) {
      console.error('Failed to save inputs:', err);
      alert('Failed to save inputs. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const renderAreaRow = (levelLabel, areaField, includeField, notesField) => (
    <tr key={levelLabel} className="hover:bg-slate-50/50 transition-colors">
      <td className="px-4 py-3 font-semibold text-slate-700 text-sm border-r border-slate-100">{levelLabel}</td>
      <td className="px-4 py-2 border-r border-slate-100">
        <input
          value={worksheet[areaField] || ''}
          onChange={e => handleWorksheetChange(areaField, e.target.value)}
          className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-500/5 transition-all text-right font-medium"
          placeholder="0"
        />
      </td>
      <td className="px-4 py-2 border-r border-slate-100">
        <select
          value={worksheet[includeField] || 'Y'}
          onChange={e => handleWorksheetChange(includeField, e.target.value)}
          className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-500/5 transition-all font-semibold text-slate-700"
        >
          <option value="Y">Y</option>
          <option value="N">N</option>
        </select>
      </td>
      <td className="px-4 py-2">
        <input
          value={worksheet[notesField] || ''}
          onChange={e => handleWorksheetChange(notesField, e.target.value)}
          className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-500/5 transition-all text-slate-600"
          placeholder="Notes..."
        />
      </td>
    </tr>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden ring-1 ring-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
          <div>
            <h2 className="text-xl font-black text-slate-800 tracking-tight">Design Inputs Wizard</h2>
            <p className="text-sm text-slate-500 font-medium">Step {step} of 3</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="flex h-1 bg-slate-100">
          <div 
            className="h-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-300"
            style={{ width: `${(step / 3) * 100}%` }}
          />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          {/* Step 1: Project & Areas */}
          {step === 1 && (
            <div className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-300">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600">
                  <Building2 className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-slate-800">1. Project Areas</h3>
              </div>

              <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200">
                <label className="block text-sm font-bold text-slate-700 mb-2">Select Project</label>
                <select
                  value={selectedProjectId}
                  onChange={handleProjectSelect}
                  disabled={!!editingProject}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-500/5 transition-all disabled:opacity-60"
                >
                  <option value="">Choose a project...</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.code} — {p.name}</option>
                  ))}
                </select>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left border-collapse bg-white">
                  <thead>
                    <tr className="bg-slate-50 text-slate-700 font-bold text-xs uppercase tracking-wider">
                      <th className="px-4 py-3 border-r border-slate-100">Level</th>
                      <th className="px-4 py-3 border-r border-slate-100 text-right">Area (SF)</th>
                      <th className="px-4 py-3 border-r border-slate-100">Include in Steel?</th>
                      <th className="px-4 py-3">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {renderAreaRow("Level 1", "level1_area", "level1_include", "level1_notes")}
                    {renderAreaRow("Level 2", "level2_area", "level2_include", "level2_notes")}
                    {renderAreaRow("Level 3", "level3_area", "level3_include", "level3_notes")}
                    {renderAreaRow("Level 4", "level4_area", "level4_include", "level4_notes")}
                    {renderAreaRow("Roof", "roof_area", "roof_include", "roof_notes")}
                  </tbody>
                </table>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Total Included Floor SF</label>
                  <p className="text-xl font-black text-slate-800 text-right">{worksheet.total_floor_sf || '0'}</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Roof SF</label>
                  <input
                    value={worksheet.total_roof_sf}
                    onChange={e => handleWorksheetChange('total_roof_sf', e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-slate-200 bg-white text-lg font-black text-slate-800 outline-none focus:border-amber-400 transition-all text-right"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Assumptions */}
          {step === 2 && (
            <div className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-300">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600">
                  <Calculator className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-slate-800">2. Steel Weight Assumptions</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-6 rounded-2xl border border-slate-200">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Typical Floor Framing (lbs/SF)</label>
                  <input
                    value={worksheet.typ_floor_framing_lbs_sf}
                    onChange={e => handleWorksheetChange('typ_floor_framing_lbs_sf', e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-amber-400 transition-all font-medium text-slate-800"
                    placeholder="e.g., 15.0"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Roof Framing (lbs/SF)</label>
                  <input
                    value={worksheet.roof_framing_lbs_sf}
                    onChange={e => handleWorksheetChange('roof_framing_lbs_sf', e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-amber-400 transition-all font-medium text-slate-800"
                    placeholder="e.g., 12.0"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Misc/Secondary Steel (lbs/SF)</label>
                  <input
                    value={worksheet.misc_steel_lbs_sf}
                    onChange={e => handleWorksheetChange('misc_steel_lbs_sf', e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-amber-400 transition-all font-medium text-slate-800"
                    placeholder="e.g., 2.5"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Moment Frame Adder (%)</label>
                  <input
                    value={worksheet.moment_frame_adder_pct}
                    onChange={e => handleWorksheetChange('moment_frame_adder_pct', e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-amber-400 transition-all font-medium text-slate-800"
                    placeholder="e.g., 1.0"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Façade Support Premium (%)</label>
                  <input
                    value={worksheet.facade_support_premium_pct}
                    onChange={e => handleWorksheetChange('facade_support_premium_pct', e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-amber-400 transition-all font-medium text-slate-800"
                    placeholder="e.g., 3.0"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Rooftop Allowance (lump sum lb)</label>
                  <input
                    value={worksheet.rooftop_allowance_lb}
                    onChange={e => handleWorksheetChange('rooftop_allowance_lb', e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-amber-400 transition-all font-medium text-slate-800"
                    placeholder="e.g., 15000"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Canopy Allowance (lump sum lb)</label>
                  <input
                    value={worksheet.canopy_allowance_lb}
                    onChange={e => handleWorksheetChange('canopy_allowance_lb', e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-amber-400 transition-all font-medium text-slate-800"
                    placeholder="e.g., 25000"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Contingency (%)</label>
                  <input
                    value={worksheet.contingency_pct}
                    onChange={e => handleWorksheetChange('contingency_pct', e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-amber-400 transition-all font-medium text-slate-800"
                    placeholder="e.g., 5.0"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Costing */}
          {step === 3 && (
            <div className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-300">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600">
                  <DollarSign className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-slate-800">3. Costing</h3>
              </div>

              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Budget $/Ton (enter 0 to ignore)</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <span className="text-amber-600 font-black">$</span>
                  </div>
                  <input
                    value={worksheet.budget_ton_rate}
                    onChange={e => handleWorksheetChange('budget_ton_rate', e.target.value)}
                    className="w-full pl-8 pr-4 py-4 rounded-xl border border-slate-200 bg-white text-lg outline-none focus:border-amber-400 transition-all font-black text-amber-700 shadow-sm"
                    placeholder="e.g., 5500"
                  />
                </div>
              </div>

              {/* Summary card before saving */}
              <div className="bg-emerald-50 border border-emerald-200 p-6 rounded-2xl flex flex-col items-center justify-center text-center">
                 <p className="text-emerald-800 font-bold mb-2">Estimated Output Preview</p>
                 <div className="flex flex-wrap items-center justify-center gap-6">
                    <div>
                      <p className="text-xs text-emerald-600/80 uppercase font-black tracking-wider">Est. Steel Tons</p>
                      <p className="text-2xl font-black text-emerald-900">{worksheet.total_est_steel_tons || '0'}</p>
                    </div>
                    <div className="w-px h-8 bg-emerald-200 hidden sm:block"></div>
                    <div>
                      <p className="text-xs text-emerald-600/80 uppercase font-black tracking-wider">Total Budget</p>
                      <p className="text-2xl font-black text-emerald-900">${worksheet.total_budget_usd || '0'}</p>
                    </div>
                 </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <button
            onClick={handleBack}
            disabled={step === 1 || saving}
            className="px-5 py-2.5 rounded-xl font-bold text-sm text-slate-600 hover:bg-slate-200 transition-all disabled:opacity-30 flex items-center gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>

          {step < 3 ? (
            <button
              onClick={handleNext}
              className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm shadow-md transition-all flex items-center gap-2 active:scale-95"
            >
              Next Step
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-bold text-sm shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'Saving...' : 'Add Save Inputs'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
