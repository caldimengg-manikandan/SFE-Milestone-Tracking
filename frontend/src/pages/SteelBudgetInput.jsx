import { useState, useEffect } from 'react';
import { projectAPI } from '../services/api';
import { useNavigate } from 'react-router-dom';
import DesignInputsModal from '../components/forms/DesignInputsModal';
import { FileSpreadsheet, Loader2, FolderKanban, Plus, Pencil, Calculator, DollarSign, Eye, Trash2 } from 'lucide-react';

export default function SteelBudgetInput() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);

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
    } catch (err) {
      console.error('Failed to load projects:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingProject(null);
    setIsModalOpen(true);
  };

  const handleEdit = (proj) => {
    setEditingProject(proj);
    setIsModalOpen(true);
  };

  const handleView = (proj) => {
    sessionStorage.setItem('sfe_active_budget_project_id', proj.id);
    navigate('/steel-budget/result');
  };

  const handleDelete = async (proj) => {
    if (!window.confirm(`Are you sure you want to delete the design inputs for project ${proj.code}? This will also remove the estimation results.`)) {
      return;
    }
    
    try {
      const payload = {
        ...proj,
        steel_budget_worksheet: {},
        total_ton: 0
      };
      await projectAPI.update(proj.id, payload);
      fetchProjects();
    } catch (err) {
      console.error('Failed to delete inputs:', err);
      alert('Failed to delete design inputs. Please try again.');
    }
  };

  const handleSaveSuccess = () => {
    setIsModalOpen(false);
    setEditingProject(null);
    fetchProjects();
  };

  // Filter only projects that have design inputs saved
  const projectsWithInputs = projects.filter(p => 
    p.steel_budget_worksheet && Object.keys(p.steel_budget_worksheet).length > 0
  );

  return (
    <div className="min-h-screen bg-slate-50/30 p-4 lg:p-8 space-y-6">
      {/* HEADER SECTION */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-600 shadow-sm">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-wide">Design Inputs</h1>
            <p className="text-xs text-slate-500 font-medium">Manage Level Areas and Weight/Framing assumptions</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-bold shadow-lg shadow-orange-500/20 hover:shadow-xl hover:scale-[1.01] active:scale-[0.99] transition-all"
          >
            <Plus className="w-4 h-4" />
            Add Inputs
          </button>
        </div>
      </div>

      {/* BODY CONTENT - LIST VIEW */}
      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh] gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
          <p className="text-sm font-medium text-slate-500">Loading design inputs...</p>
        </div>
      ) : projectsWithInputs.length > 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Project</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Floor SF</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Roof SF</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Est. Steel (Tons)</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Budget</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {projectsWithInputs.map(p => {
                  const ws = p.steel_budget_worksheet || {};
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-800 text-sm">{p.code}</span>
                          <span className="text-xs text-slate-500 truncate max-w-[200px]">{p.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-slate-600 text-sm">
                        {ws.total_floor_sf || '-'}
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-slate-600 text-sm">
                        {ws.total_roof_sf || '-'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-50 text-amber-700 font-bold text-sm border border-amber-100">
                          <Calculator className="w-3.5 h-3.5" />
                          {ws.total_est_steel_tons || '0'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 font-bold text-sm border border-emerald-100">
                          <DollarSign className="w-3.5 h-3.5" />
                          {ws.total_budget_usd || '0'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-4">
                          <button
                            onClick={() => handleView(p)}
                            className="text-amber-500 hover:text-amber-600 hover:scale-110 transition-all"
                            title="View Estimation Result"
                          >
                            <Eye className="w-[18px] h-[18px]" />
                          </button>
                          <button
                            onClick={() => handleEdit(p)}
                            className="text-blue-500 hover:text-blue-600 hover:scale-110 transition-all"
                            title="Edit Inputs"
                          >
                            <Pencil className="w-[18px] h-[18px]" />
                          </button>
                          <button
                            onClick={() => handleDelete(p)}
                            className="text-red-500 hover:text-red-600 hover:scale-110 transition-all"
                            title="Delete Inputs"
                          >
                            <Trash2 className="w-[18px] h-[18px]" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 bg-white border border-slate-200/80 rounded-3xl shadow-sm text-center">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-500 mb-4">
            <FolderKanban className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-black text-slate-800">No Design Inputs Added</h2>
          <p className="text-sm text-slate-500 max-w-sm mt-1 mb-6">
            You haven't added design inputs for any projects yet. Click the button below to get started.
          </p>
          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-900 text-white text-sm font-bold shadow-lg hover:shadow-xl hover:scale-[1.01] active:scale-[0.99] transition-all"
          >
            <Plus className="w-4 h-4" />
            Add Inputs Now
          </button>
        </div>
      )}

      {/* DESIGN INPUTS MODAL */}
      <DesignInputsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        projects={projects}
        onSaveSuccess={handleSaveSuccess}
        editingProject={editingProject}
      />
    </div>
  );
}
