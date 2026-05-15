import { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, Eye, FileText, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { projectAPI, scheduleAPI } from '../../services/api';
import ProjectForm from '../../components/forms/ProjectForm';

export default function PlanCreation() {
  const [projects, setProjects] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [allSchedules, setAllSchedules] = useState([]);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [form, setForm] = useState({
    name: '', code: '', customer_name: '', detailer_name: '',
    project_manager_name: '', total_ton: '', total_manhours: '',
    erection_date: '', status: 'Planning', priority: 'Medium'
  });

  useEffect(() => {
    fetchProjects();
    fetchAllSchedules();
  }, []);

  const autocalculateManhourTon = () => {
    const ton = parseFloat(form.total_ton) || 0;
    const hours = parseFloat(form.total_manhours) || 0;
    return ton > 0 ? (hours / ton).toFixed(2) : '0.00';
  };

  // Recalculate all budget shop hours if project-wide manhour/ton changes
  useEffect(() => {
    const mhTon = parseFloat(autocalculateManhourTon());
    if (schedules.length > 0 && mhTon > 0) {
      setSchedules(prev => prev.map(row => {
        const rowTons = parseFloat(row.tons) || 0;
        const newBudget = (mhTon * rowTons).toFixed(2);
        if (row.budget_shop_hours === newBudget) return row;
        return { ...row, budget_shop_hours: newBudget };
      }));
    }
  }, [form.total_manhours, form.total_ton]);

  const fetchProjects = async () => {
    try {
      const res = await projectAPI.getAll();
      const data = res.data.results || res.data;
      setProjects(Array.isArray(data) ? data : []);
    } catch (err) { console.error(err); }
  };

  const fetchAllSchedules = async () => {
    try {
      const res = await scheduleAPI.getAll();
      const data = res.data.results || res.data;
      setAllSchedules(Array.isArray(data) ? data : []);
    } catch (err) { console.error(err); }
  };

  const calculateDates = (erectionDate) => {
    if (!erectionDate) return {};
    const base = new Date(erectionDate);
    const formatDate = (d) => d.toISOString().split('T')[0];

    const rts = new Date(base); rts.setMonth(rts.getMonth() - 2);
    const fm = new Date(rts); fm.setDate(fm.getDate() - 14);
    const bfa = new Date(fm); bfa.setDate(bfa.getDate() - 14);
    const ofa = new Date(bfa); ofa.setDate(ofa.getDate() - 14);

    return {
      rts_date: formatDate(rts),
      scheduled_field_measure_date: formatDate(fm),
      scheduled_bfa_date: formatDate(bfa),
      scheduled_ofa_date: formatDate(ofa)
    };
  };

  const createDefaultRow = (projectData) => ({
    id: Date.now(),
    is_new: true,
    project: projectData.id || '',
    seq_no: '1',
    tons: '',
    item_description: '',
    category: '',
    scheduled_erection_date: projectData.erection_date || '',
    ...calculateDates(projectData.erection_date),
    shop_lead_time_weeks: '0',
    budget_shop_hours: '0',
    budget_field_hours: '0',
    actual_shop_hours: '0',
    actual_field_hours: '0',
    detailer_vendor: projectData.detailer_name || '',
    dwg_status: '',
    notes: '',
    fabrication_details: []
  });

  const handleSave = async () => {
    if (!form.name || !form.code) { alert('Project Name and Code are required'); return; }
    setLoading(true);
    try {
      const payload = {
        ...form,
        total_ton: parseFloat(form.total_ton) || 0,
        total_manhours: parseFloat(form.total_manhours) || 0
      };

      let res;
      let projectId = form.id;
      if (form.id) {
        res = await projectAPI.update(form.id, payload);
        setProjects(projects.map(p => p.id === form.id ? res.data : p));
      } else {
        res = await projectAPI.create(payload);
        setProjects([res.data, ...projects]);
        projectId = res.data.id;
      }

      for (const row of schedules) {
        if (!row.item_description && !row.tons && row.is_new) continue;
        const schedPayload = { ...row, project: projectId, tons: parseFloat(row.tons) || 0 };
        if (row.is_new) await scheduleAPI.create(schedPayload);
        else await scheduleAPI.update(row.id, schedPayload);
      }
      fetchAllSchedules();
      setShowModal(false);
      resetForm();
    } catch (err) { console.error(err); alert('Failed to save'); }
    finally { setLoading(false); }
  };

  const resetForm = () => {
    setForm({
      name: '', code: '', customer_name: '', detailer_name: '',
      project_manager_name: '', total_ton: '', total_manhours: '',
      erection_date: '', status: 'Planning', priority: 'Medium'
    });
    setSchedules([createDefaultRow({})]);
    setIsEditing(false);
  };

  const filtered = projects.filter(p =>
    (p.name?.toLowerCase() || '').includes(search.toLowerCase()) ||
    (p.code?.toLowerCase() || '').includes(search.toLowerCase())
  );

  const paginatedData = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="min-h-screen bg-slate-50/30 p-4 lg:p-8 space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Plan Creation</h1>
        <p className="text-sm text-slate-500">Create new structural plans and initialize project schedules</p>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 text-sm outline-none focus:border-amber-400 transition-all"
          />
        </div>
        <button
          onClick={() => { resetForm(); setShowModal(true); }}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-amber-600 text-white text-sm font-bold shadow-lg hover:bg-amber-700 transition-all"
        >
          <Plus className="w-4 h-4" /> Create New Plan
        </button>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-amber-600 text-white">
                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider">Project Name</th>
                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider">Code</th>
                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider">Customer</th>
                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedData.map(p => (
                <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 text-slate-900 text-sm font-medium border-r border-slate-100">{p.name}</td>
                  <td className="px-4 py-3 text-slate-900 text-sm font-medium border-r border-slate-100">{p.code}</td>
                  <td className="px-4 py-3 text-slate-900 text-sm font-medium border-r border-slate-100">{p.customer_name || 'N/A'}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => { setForm(p); setSchedules(allSchedules.filter(s => (s.project?.id || s.project) === p.id)); setIsEditing(true); setShowModal(true); }}
                      className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 transition-all"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <ProjectForm
          form={form}
          schedules={schedules}
          setForm={setForm}
          projects={projects}
          onProjectSelect={(selected) => {
            setForm({
              ...selected,
              id: selected.id,
              name: selected.name,
              code: selected.code,
              customer_name: selected.customer_name,
              detailer_name: selected.detailer_name,
              project_manager_name: selected.project_manager_name,
              total_ton: selected.total_ton,
              total_manhours: selected.total_manhours,
              erection_date: selected.erection_date,
              status: selected.status,
              priority: selected.priority
            });
            // Fetch and set existing schedules for this project
            const existingSchedules = allSchedules.filter(s =>
              (s.project?.id || s.project) === selected.id
            );
            if (existingSchedules.length > 0) {
              setSchedules(existingSchedules.map(s => ({ ...s, is_new: false })));
            } else {
              setSchedules([createDefaultRow(selected)]);
            }
          }}
          addScheduleRow={() => setSchedules([...schedules, createDefaultRow(form)])}
          handleScheduleChange={(id, f, v) => {
            setSchedules(prev => prev.map(s => {
              if (s.id !== id) return s;
              let updated = { ...s, [f]: v };

              if (f === 'tons') {
                const mhTon = parseFloat(autocalculateManhourTon()) || 0;
                const rowTons = parseFloat(v) || 0;
                updated.budget_shop_hours = (mhTon * rowTons).toFixed(2);
              }

              if (f === 'scheduled_erection_date' && v) {
                updated = { ...updated, ...calculateDates(v) };
              }
              return updated;
            }));
          }}
          handleDeleteSchedule={(id) => setSchedules(schedules.filter(s => s.id !== id))}
          handleSave={handleSave}
          onClose={() => setShowModal(false)}
          isEditing={isEditing}
          loading={loading}
          initialTab="structural"
          showTabs={false}
          autocalculateManhourTon={() => (form.total_ton > 0 ? (form.total_manhours / form.total_ton).toFixed(2) : '0.00')}
        />
      )}
    </div>
  );
}
