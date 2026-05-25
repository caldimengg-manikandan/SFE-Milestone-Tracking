import { useState, useEffect } from 'react';
import { projectAPI } from '../services/api';
import SteelBudgetForm, { defaultWorksheet, recalculateWorksheet } from '../components/forms/SteelBudgetForm';
import { Save, BarChart3, Loader2, FolderKanban, ChevronDown } from 'lucide-react';

export default function SteelBudgetResult() {
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const res = await projectAPI.getAll();
      const data = res.data.results || res.data;
      const parsedProjects = Array.isArray(data) ? data : [];
      setProjects(parsedProjects);

      // Check session storage for an active project context
      const activeProjId = sessionStorage.getItem('sfe_active_budget_project_id');
      if (activeProjId && parsedProjects.some(p => String(p.id) === String(activeProjId))) {
        loadProject(activeProjId, parsedProjects);
      }
    } catch (err) {
      console.error('Failed to load projects:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadProject = (id, projList = projects) => {
    setSelectedProjectId(id);
    sessionStorage.setItem('sfe_active_budget_project_id', id);

    const proj = projList.find(p => String(p.id) === String(id));
    if (proj) {
      const baseWorksheet = proj.steel_budget_worksheet && Object.keys(proj.steel_budget_worksheet).length > 0
        ? proj.steel_budget_worksheet
        : defaultWorksheet;
      
      const recalculated = recalculateWorksheet(baseWorksheet);

      setForm({
        ...proj,
        steel_budget_worksheet: recalculated
      });
    } else {
      setForm(null);
    }
  };

  const handleProjectSelect = (e) => {
    const id = e.target.value;
    if (!id) {
      setSelectedProjectId('');
      sessionStorage.removeItem('sfe_active_budget_project_id');
      setForm(null);
      return;
    }
    loadProject(id);
  };

  // Allow saving manual overrides made on the results page
  const handleSave = async () => {
    if (!form || !selectedProjectId) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        total_ton: form.total_ton || 0
      };
      const res = await projectAPI.update(selectedProjectId, payload);
      
      // Update local projects list and reload project to ensure saved data is reflected
      setProjects(prev => prev.map(p => p.id === res.data.id ? res.data : p));
      // Reload the project data into form (recalculate worksheet if needed)
      loadProject(res.data.id, [res.data]);
      alert('Steel budget estimation results saved successfully!');
    } catch (err) {
      console.error('Failed to save estimation results:', err);
      alert('Failed to save estimation results. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/30 p-4 lg:p-8 space-y-6">
      {/* HEADER SECTION */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-600 shadow-sm">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-wide">Estimation Result</h1>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Total Included Floor SF</label>
            <p className="text-sm text-slate-500 mt-1">Floor SF: {form?.steel_budget_worksheet?.total_floor_sf || '-'} | Roof SF: {form?.steel_budget_worksheet?.total_roof_sf || '-'}</p>
            <p className="text-xs text-slate-500 font-medium">View dynamic weight summaries, contingency premiums, and total estimated budgets</p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap lg:flex-nowrap">
          {/* Project Dropdown Selector */}
          <div className="relative min-w-[240px]">
            <select
              value={selectedProjectId}
              onChange={handleProjectSelect}
              disabled={loading}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-500/5 transition-all appearance-none cursor-pointer"
            >
              <option value="">Select Project</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.code} — {p.name}</option>
              ))}
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </div>
          </div>

        </div>
      </div>

      {/* BODY CONTENT */}
      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh] gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
          <p className="text-sm font-medium text-slate-500">Loading project data...</p>
        </div>
      ) : form ? (
        <div className="bg-white/85 p-8 rounded-3xl border border-slate-200/80 shadow-sm backdrop-blur-md">
          <SteelBudgetForm
            form={form}
            setForm={setForm}
            displayPart="result"
            mode="edit"
          />
          <div className="flex justify-end mt-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-bold shadow-lg hover:shadow-xl hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50"
            >
              {saving ? (
                <><Loader2 className="w-4 h-4 animate-spin"/> Saving...</>
              ) : (
                <>Save Results</>
              )}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 bg-white border border-slate-200/80 rounded-3xl shadow-sm text-center">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-500 mb-4">
            <FolderKanban className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-black text-slate-800">No Project Selected</h2>
          <p className="text-sm text-slate-500 max-w-sm mt-1">
            Please choose a project from the dropdown in the header to view or override Estimation Results.
          </p>
        </div>
      )}
    </div>
  );
}
