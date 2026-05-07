import { useState, useEffect, useMemo } from 'react';
import { FolderKanban, Plus, Search, Edit2, Trash2, X, Save } from 'lucide-react';
import { projectAPI } from '../services/api';

const statusColors = { 'In Progress': 'bg-blue-50 text-blue-600', Completed: 'bg-emerald-50 text-emerald-600', Delayed: 'bg-red-50 text-red-600', Planning: 'bg-slate-100 text-slate-600' };
const statusDot = { 'In Progress': 'bg-blue-500', Completed: 'bg-emerald-500', Delayed: 'bg-red-500', Planning: 'bg-slate-400' };

export default function ProjectMaster() {
  const [search, setSearch] = useState('');
  const [projects, setProjects] = useState([]);
  
  // 'new' | id | null
  const [editRowId, setEditRowId] = useState(null);
  
  const [form, setForm] = useState({
    id: null, customer: '', detailer: '', tons: '',
    job_number: '', start_up_meeting_date: '', isTbd: false,
    mhs: '', pm: '', status: 'Planning', progress: 0
  });

  const fetchProjects = async () => {
    try {
      const res = await projectAPI.getAll();
      const data = res.data;
      setProjects(Array.isArray(data) ? data : (data?.results || []));
    } catch (err) {
      console.error("Failed to fetch projects", err);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const filtered = projects.filter(p => 
    (p.customer || '').toLowerCase().includes(search.toLowerCase()) || 
    (p.job_number || '').toLowerCase().includes(search.toLowerCase())
  );

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const calculatedMhsPerTon = useMemo(() => {
    const tons = parseFloat(form.tons);
    const mhs = parseFloat(form.mhs);
    if (tons > 0 && mhs > 0) {
      return (mhs / tons).toFixed(2);
    }
    return form.mhs_per_ton || '';
  }, [form.tons, form.mhs, form.mhs_per_ton]);

  const handleEdit = (project) => {
    setForm({
      id: project.id,
      customer: project.customer || '',
      detailer: project.detailer || '',
      tons: project.tons || '',
      job_number: project.job_number || '',
      start_up_meeting_date: project.start_up_meeting_date || '',
      isTbd: !project.start_up_meeting_date,
      mhs: project.mhs || '',
      pm: project.pm || '',
      mhs_per_ton: project.mhs_per_ton || '',
      status: project.status || 'Planning',
      progress: project.progress || 0
    });
    setEditRowId(project.id);
  };

  const handleAddRow = () => {
    setForm({ 
      id: null, customer: '', detailer: '', tons: '', job_number: '', 
      start_up_meeting_date: '', isTbd: false, mhs: '', pm: '', 
      status: 'Planning', progress: 0 
    });
    setEditRowId('new');
  };

  const handleSubmit = async () => {
    const payload = {
      job_number: form.job_number || 'TBD',
      customer: form.customer || 'Unnamed',
      detailer: form.detailer,
      tons: parseFloat(form.tons) || 0,
      start_up_meeting_date: form.isTbd ? null : (form.start_up_meeting_date || null),
      mhs: parseFloat(form.mhs) || 0,
      pm: form.pm,
      mhs_per_ton: parseFloat(calculatedMhsPerTon) || null,
      status: form.status || 'Planning',
      progress: parseFloat(form.progress) || 0
    };

    try {
      if (editRowId === 'new') {
        await projectAPI.create(payload);
      } else {
        await projectAPI.update(editRowId, payload);
      }
      setEditRowId(null);
      fetchProjects();
    } catch (err) {
      console.error("Failed to save project", err);
      alert("Failed to save project. Please check your inputs.");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this project?")) {
      try {
        await projectAPI.delete(id);
        fetchProjects();
      } catch (err) {
        console.error("Failed to delete project", err);
      }
    }
  };

  const tableHeaders = [
    'Status', 'Progress', 'Job #', 'Customer', 'Detailer', 'PM',
    "Ton's", "MH's", 'MH/Ton', 'Start Up Meeting', 'Actions'
  ];

  const renderEditRow = () => {
    return (
      <tr className="bg-amber-50 shadow-inner">
        <td className="px-2 py-2 border-r border-slate-200">
          <select name="status" value={form.status} onChange={handleFormChange} className="w-full min-w-[110px] px-2 py-1.5 rounded border border-amber-300 text-xs focus:ring-1 focus:ring-amber-500 outline-none">
            <option value="Planning">Planning</option>
            <option value="In Progress">In Progress</option>
            <option value="Completed">Completed</option>
            <option value="Delayed">Delayed</option>
          </select>
        </td>
        <td className="px-2 py-2 border-r border-slate-200">
          <div className="flex items-center gap-1">
            <input type="number" name="progress" value={form.progress} onChange={handleFormChange} min="0" max="100" className="w-full min-w-[60px] px-2 py-1.5 rounded border border-amber-300 text-xs focus:ring-1 focus:ring-amber-500 outline-none" />
            <span className="text-xs font-bold text-slate-500">%</span>
          </div>
        </td>
        <td className="px-2 py-2 border-r border-slate-200">
          <input name="job_number" value={form.job_number} onChange={handleFormChange} placeholder="e.g. PRJ-001" className="w-full min-w-[100px] px-2 py-1.5 rounded border border-amber-300 text-xs focus:ring-1 focus:ring-amber-500 outline-none" />
        </td>
        <td className="px-2 py-2 border-r border-slate-200">
          <input name="customer" value={form.customer} onChange={handleFormChange} className="w-full min-w-[150px] px-2 py-1.5 rounded border border-amber-300 text-xs focus:ring-1 focus:ring-amber-500 outline-none" />
        </td>
        <td className="px-2 py-2 border-r border-slate-200">
          <input name="detailer" value={form.detailer} onChange={handleFormChange} className="w-full min-w-[120px] px-2 py-1.5 rounded border border-amber-300 text-xs focus:ring-1 focus:ring-amber-500 outline-none" />
        </td>
        <td className="px-2 py-2 border-r border-slate-200">
          <input name="pm" value={form.pm} onChange={handleFormChange} className="w-full min-w-[120px] px-2 py-1.5 rounded border border-amber-300 text-xs focus:ring-1 focus:ring-amber-500 outline-none" />
        </td>
        <td className="px-2 py-2 border-r border-slate-200">
          <input type="number" name="tons" value={form.tons} onChange={handleFormChange} className="w-full min-w-[80px] px-2 py-1.5 rounded border border-amber-300 text-xs focus:ring-1 focus:ring-amber-500 outline-none" />
        </td>
        <td className="px-2 py-2 border-r border-slate-200">
          <input type="number" name="mhs" value={form.mhs} onChange={handleFormChange} className="w-full min-w-[80px] px-2 py-1.5 rounded border border-amber-300 text-xs focus:ring-1 focus:ring-amber-500 outline-none" />
        </td>
        <td className="px-3 py-2 border-r border-slate-200 text-xs font-semibold text-slate-500 bg-white/50">
          {calculatedMhsPerTon}
        </td>
        <td className="px-2 py-2 border-r border-slate-200">
          <div className="flex items-center gap-2">
            <input type="date" name="start_up_meeting_date" value={form.start_up_meeting_date} onChange={handleFormChange} disabled={form.isTbd} className="w-full min-w-[120px] px-2 py-1.5 rounded border border-amber-300 text-xs focus:ring-1 focus:ring-amber-500 outline-none disabled:bg-slate-100 disabled:text-slate-400" />
            <label className="flex items-center gap-1 cursor-pointer shrink-0">
              <input type="checkbox" name="isTbd" checked={form.isTbd} onChange={handleFormChange} className="w-4 h-4 rounded border-amber-300 text-amber-500 focus:ring-amber-500" />
              <span className="text-[11px] font-bold text-slate-600">TBD</span>
            </label>
          </div>
        </td>
        <td className="px-2 py-2 whitespace-nowrap bg-amber-50/90 backdrop-blur sticky right-0 border-l border-amber-200 shadow-[-4px_0_10px_rgba(251,191,36,0.1)]">
          <div className="flex items-center gap-1.5">
            <button onClick={handleSubmit} className="p-1.5 rounded bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-400 hover:to-orange-400 shadow-sm transition-all"><Save className="w-4 h-4" /></button>
            <button onClick={() => setEditRowId(null)} className="p-1.5 rounded bg-slate-200 text-slate-600 hover:bg-slate-300 transition-colors"><X className="w-4 h-4" /></button>
          </div>
        </td>
      </tr>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Project Master</h2>
          <p className="text-sm text-slate-500 mt-0.5">Create and maintain project information</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" placeholder="Search projects..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 bg-white text-sm outline-none focus:border-amber-400" />
          </div>
          <button onClick={handleAddRow} disabled={editRowId !== null} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-bold shadow-md hover:from-amber-400 hover:to-orange-400 disabled:opacity-50 transition-all">
            <Plus className="w-4 h-4" /> Add Project
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col h-[calc(100vh-220px)]">
        <div className="overflow-auto flex-1 custom-scrollbar">
          <table className="w-full text-sm text-left border-collapse min-w-max">
            <thead className="sticky top-0 bg-slate-100 z-10 shadow-sm">
              <tr>
                {tableHeaders.map((header, i) => (
                  <th key={i} className="px-3 py-2.5 font-bold text-slate-700 border-r border-b border-slate-200 text-xs whitespace-nowrap bg-slate-100">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              
              {/* Show the "New" row at the top if adding */}
              {editRowId === 'new' && renderEditRow()}

              {filtered.map(p => {
                if (editRowId === p.id) {
                  return renderEditRow();
                }

                return (
                  <tr key={p.id} className="hover:bg-amber-50/30 transition-colors group">
                    <td className="px-3 py-3 border-r border-slate-200 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${statusColors[p.status] || statusColors['Planning']}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${statusDot[p.status] || statusDot['Planning']}`} /> {p.status || 'Planning'}
                      </span>
                    </td>
                    <td className="px-3 py-3 border-r border-slate-200 min-w-[120px]">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-slate-700 w-8 text-right">{p.progress || 0}%</span>
                        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${p.progress === 100 ? 'bg-emerald-500' : (p.status === 'Delayed' ? 'bg-red-400' : 'bg-gradient-to-r from-amber-400 to-orange-500')}`} style={{ width: `${p.progress || 0}%` }} />
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 border-r border-slate-200 whitespace-nowrap font-mono text-slate-500">{p.job_number}</td>
                    <td className="px-3 py-3 border-r border-slate-200 whitespace-nowrap font-bold text-slate-800">{p.customer}</td>
                    <td className="px-3 py-3 border-r border-slate-200 whitespace-nowrap">{p.detailer}</td>
                    <td className="px-3 py-3 border-r border-slate-200 whitespace-nowrap">{p.pm}</td>
                    <td className="px-3 py-3 border-r border-slate-200 whitespace-nowrap">{p.tons}</td>
                    <td className="px-3 py-3 border-r border-slate-200 whitespace-nowrap">{p.mhs}</td>
                    <td className="px-3 py-3 border-r border-slate-200 whitespace-nowrap font-semibold text-slate-600">{p.mhs_per_ton || (p.tons > 0 ? (p.mhs/p.tons).toFixed(2) : 0)}</td>
                    <td className="px-3 py-3 border-r border-slate-200 whitespace-nowrap">
                      {p.start_up_meeting_date ? p.start_up_meeting_date : <span className="text-slate-400 italic font-medium">TBD</span>}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap bg-white/50 group-hover:bg-amber-50/30 backdrop-blur sticky right-0 border-l border-slate-200 shadow-[-4px_0_10px_rgba(0,0,0,0.02)] transition-colors">
                      <div className="flex items-center gap-1">
                        <button onClick={() => handleEdit(p)} className="p-1 text-slate-400 hover:text-blue-600 transition-colors"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(p.id)} className="p-1 text-slate-400 hover:text-red-600 transition-colors"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              
              {filtered.length === 0 && editRowId !== 'new' && (
                <tr>
                  <td colSpan={11} className="px-4 py-16 text-center">
                    <FolderKanban className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                    <p className="text-sm font-semibold text-slate-500">No projects found</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
