import { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, X, Eye, Calendar, Calculator, Save, ArrowRight, FolderKanban } from 'lucide-react';
import { projectAPI } from '../services/api';
import ProjectForm from '../components/Forms/ProjectForm';

export default function ProjectMaster() {
  const [projects, setProjects] = useState([]);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchProjects();
  }, []);

  const [isEditing, setIsEditing] = useState(false);

  const fetchProjects = async () => {
    try {
      const res = await projectAPI.getAll();
      setProjects(res.data.results || res.data);
    } catch (err) {
      console.error('Failed to fetch projects:', err);
    }
  };

  const [form, setForm] = useState({
    name: '',
    code: '',
    customer_name: '',
    detailer_name: '',
    project_manager_name: '',
    total_ton: '',
    total_manhours: '',
    erection_date: '',
    status: 'Planning'
  });

  const handleDetails = async (project) => {
    setForm({
      id: project.id,
      name: project.name || '',
      code: project.code || '',
      customer_name: project.customer_name || '',
      detailer_name: project.detailer_name || '',
      project_manager_name: project.project_manager_name || '',
      total_ton: project.total_ton || '',
      total_manhours: project.total_manhours || '',
      erection_date: project.erection_date || '',
      status: project.status || 'Planning'
    });
    setIsEditing(true);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.code) {
      alert('Project Name and Code are required');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...form,
        total_ton: parseFloat(form.total_ton) || 0,
        total_manhours: parseFloat(form.total_manhours) || 0,
        erection_date: form.erection_date || null
      };
      
      let res;
      if (form.id) {
        res = await projectAPI.update(form.id, payload);
        setProjects(projects.map(p => p.id === form.id ? res.data : p));
        setShowModal(false);
        resetForm();
      } else {
        res = await projectAPI.create(payload);
        setProjects([...projects, res.data]);
        setShowModal(false);
        resetForm();
      }
    } catch (err) {
      console.error('Failed to save project:', err);
      const formatError = (data) => {
        if (typeof data === 'string') return data;
        if (Array.isArray(data)) return data.map(formatError).join(', ');
        if (typeof data === 'object' && data !== null) {
          return Object.entries(data).map(([k, v]) => `${k}: ${formatError(v)}`).join('\n');
        }
        return JSON.stringify(data);
      };
      
      let errorMsg = 'Unknown error';
      if (err.response?.data) {
        errorMsg = formatError(err.response.data);
      } else if (err.message) {
        errorMsg = err.message;
      }
      
      alert(`Failed to save project:\n${errorMsg}${err.response ? ` (Status: ${err.response.status})` : ''}`);
    } finally {
      setLoading(false);
    }
  };

  const autocalculateManhourTon = () => {
    const ton = parseFloat(form.total_ton) || 0;
    const hours = parseFloat(form.total_manhours) || 0;
    return ton > 0 ? (hours / ton).toFixed(2) : '0.00';
  };

  const resetForm = () => {
    setForm({
      name: '', code: '', customer_name: '', detailer_name: '',
      project_manager_name: '', total_ton: '', total_manhours: '',
      erection_date: '', status: 'Planning'
    });
    setIsEditing(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this project?')) return;
    try {
      await projectAPI.delete(id);
      setProjects(projects.filter(p => p.id !== id));
    } catch (err) {
      alert('Failed to delete project');
    }
  };

  const filtered = projects.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Project Master</h2>
          <p className="text-sm text-slate-500 mt-0.5">Manage enterprise projects and schedules</p>
        </div>
        <button 
          onClick={() => {
            resetForm();
            setShowModal(true);
          }} 
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-bold shadow-lg shadow-amber-500/20 hover:from-amber-400 hover:to-orange-400 transition-all"
        >
          <Plus className="w-4 h-4" /> New Project
        </button>
      </div>

      {/* ... search bar ... */}

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input 
          type="text" 
          placeholder="Search projects..." 
          value={search} 
          onChange={(e) => setSearch(e.target.value)} 
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-500/10 transition-all" 
        />
      </div>

      {/* Project Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((p) => (
          <div key={p.id} className="bg-white rounded-2xl border border-slate-200/60 p-5 shadow-card hover:shadow-card-hover transition-all duration-300 hover:-translate-y-0.5 group">
            <div className="flex items-start justify-between mb-3">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-600`}>
                {p.status}
              </span>
              <span className="text-xs font-mono text-slate-400">{p.code}</span>
            </div>
            <h3 className="text-base font-bold text-slate-800 mb-1 group-hover:text-amber-600 transition-colors">{p.name}</h3>
            <p className="text-xs text-slate-500 mb-4">{p.customer_name}</p>
            
            <div className="grid grid-cols-2 gap-3 text-xs mb-4">
              <div><p className="text-slate-400">Total Ton</p><p className="text-slate-700 font-semibold">{p.total_ton}</p></div>
              <div><p className="text-slate-400">MH/Ton</p><p className="text-amber-600 font-bold">{p.manhour_ton}</p></div>
            </div>

            <div className="flex items-center gap-1 mt-4 pt-4 border-t border-slate-100">
              <button onClick={() => handleDetails(p)} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold text-slate-500 hover:text-amber-600 hover:bg-amber-50 transition-colors"><Eye className="w-3.5 h-3.5" /> Details</button>
              <button onClick={() => handleDelete(p.id)} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"><Trash2 className="w-3.5 h-3.5" /> Delete</button>
            </div>
          </div>
        ))}
      </div>

      {/* Full Screen Modal for Project Entry */}
      {showModal && (
        <ProjectForm 
          form={form}
          setForm={setForm}
          handleSave={handleSave}
          handleCancel={() => setShowModal(false)}
          loading={loading}
          isEditing={isEditing}
        />
      )}
    </div>
  );
}

