import { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Plus, Search, Edit2, Trash2, Eye, FileText, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { projectAPI, scheduleAPI } from '../../services/api';
import ProjectForm from '../../components/forms/ProjectForm';
import GanttChart from '../../components/GanttChart';

export default function PlanCreation() {
  const [projects, setProjects] = useState([]);
  // State to hold the generated Gantt PDF URL and the project being viewed
  const [ganttUrl, setGanttUrl] = useState(null);
  const [viewProjectId, setViewProjectId] = useState(null);
  const [schedules, setSchedules] = useState([]);
  const [allSchedules, setAllSchedules] = useState([]);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [deletedSchedules, setDeletedSchedules] = useState([]);
  const [viewMode, setViewMode] = useState('view');
  const itemsPerPage = 10;

  const [form, setForm] = useState({
    name: '', code: '', customer_name: '', detailer_name: '',
    project_manager_name: '', total_ton: '', total_manhours: '',
    erection_date: '', status: 'Planning', priority: 'Medium',
    shop_name: '', schedule_field_measure_required: 'Yes'
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

      // Delete removed schedules from backend
      for (const deleteId of deletedSchedules) {
        try {
          await scheduleAPI.delete(deleteId);
        } catch (err) {
          console.error('Failed to delete schedule:', deleteId, err);
        }
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
    } catch (err) {
      console.error(err);
      alert('Failed to save: ' + JSON.stringify(err.response?.data || err.message));
    }
    finally { setLoading(false); }
  };

  const resetForm = () => {
    setForm({
      name: '', code: '', customer_name: '', detailer_name: '',
      project_manager_name: '', total_ton: '', total_manhours: '',
      erection_date: '', status: 'Planning', priority: 'Medium',
      shop_name: '', schedule_field_measure_required: 'Yes'
    });
    setSchedules([createDefaultRow({})]);
    setDeletedSchedules([]);
    setIsEditing(false);
  };

  const handleDetails = (project, mode = 'edit') => {
    setForm(project);
    setViewMode(mode);
    setDeletedSchedules([]);
    const filtered = allSchedules.filter(s => {
      const sId = typeof s.project === 'object' ? s.project.id : s.project;
      return String(sId) === String(project.id);
    });
    const sorted = [...filtered].sort((a, b) => {
      const aNum = parseFloat(a.seq_no);
      const bNum = parseFloat(b.seq_no);
      if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
      return String(a.seq_no).localeCompare(String(b.seq_no), undefined, { numeric: true });
    });
    setSchedules(sorted);
    setIsEditing(true);
    setShowModal(true);
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

const generateGanttPdf = (project) => {
  const projectSchedules = allSchedules.filter(s => {
    const sId = typeof s.project === 'object' ? s.project.id : s.project;
    return String(sId) === String(project.id);
  });

  if (projectSchedules.length === 0) {
    alert("No schedule data found for this project.");
    return null;
  }

  const doc = new jsPDF('l', 'mm', 'a4');

  const parseDate = dStr => {
    const d = new Date(dStr);
    return isNaN(d.getTime()) ? null : d;
  };

  const sortedSchedules = [...projectSchedules].sort((a, b) => {
    const aNum = parseFloat(a.seq_no);
    const bNum = parseFloat(b.seq_no);
    if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
    return String(a.seq_no).localeCompare(String(b.seq_no), undefined, { numeric: true });
  });

  // Determine timeline range
  let minDate = sortedSchedules.reduce((min, s) => {
    const d = parseDate(s.scheduled_ofa_date);
    return d && (!min || d < min) ? d : min;
  }, null) || new Date();
  const maxDate = new Date(minDate.getTime() + 90 * 24 * 60 * 60 * 1000);
  const startMonth = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
  const endMonth = new Date(maxDate.getFullYear(), maxDate.getMonth() + 1, 0);
  const totalMonths = (endMonth.getFullYear() - startMonth.getFullYear()) * 12 + (endMonth.getMonth() - startMonth.getMonth()) + 1;
  const timelineStart = 74;
  const timelineWidth = 209;
  const getX = date => timelineStart + ((date.getTime() - startMonth.getTime()) / (endMonth.getTime() - startMonth.getTime())) * timelineWidth;

  const getSequenceRange = s => {
    const start = parseDate(s.scheduled_ofa_date) || parseDate(s.scheduled_bfa_date) || parseDate(s.rts_date);
    const end = parseDate(s.scheduled_erection_date) || parseDate(s.rts_date);
    return { start, end };
  };

  const calculateSeqStatus = (rtsDateStr, leadWeeks) => {
    if (!rtsDateStr) return { label: 'TBD', color: [156, 163, 175] };
    const now = new Date();
    const rtsDate = new Date(rtsDateStr);
    const completion = new Date(rtsDate.getTime() + (parseFloat(leadWeeks) || 0) * 7 * 24 * 60 * 60 * 1000);
    if (rtsDate > new Date(Date.now() + 2 * 86400000)) return { label: 'Yet to Start', color: [59, 130, 246] };
    if (now >= completion) return { label: 'Completed', color: [34, 197, 94] };
    return { label: 'InProgress', color: [245, 158, 11] };
  };

  let currentY = 20;
  sortedSchedules.forEach(s => {
    if (currentY > 180) { doc.addPage(); currentY = 20; }
    const { start, end } = getSequenceRange(s);
    if (start && end) {
      const xStart = Math.max(timelineStart, getX(start));
      const xEnd = Math.min(timelineStart + timelineWidth, getX(end));
      const color = calculateSeqStatus(s.rts_date, s.shop_lead_time_weeks).color;
      doc.setFillColor(...color);
      doc.rect(xStart, currentY, xEnd - xStart, 4, 'F');
    }
    currentY += 6;
  });

  return doc.output('bloburl');
};

  const handleViewGantt = (project) => {
    const url = generateGanttPdf(project);
    if (url) {
      setGanttUrl(url);
      setViewProjectId(project.id);
    }
  };

  const filtered = projects.filter(p =>
    (p.name?.toLowerCase() || '').includes(search.toLowerCase()) ||
    (p.code?.toLowerCase() || '').includes(search.toLowerCase())
  );

  const paginatedData = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="min-h-screen bg-slate-50/30 p-4 lg:p-8 space-y-6">
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
              {paginatedData.flatMap(p => [
                <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 text-slate-900 text-sm font-medium border-r border-slate-100">{p.name}</td>
                  <td className="px-4 py-3 text-slate-900 text-sm font-medium border-r border-slate-100">{p.code}</td>
                  <td className="px-4 py-3 text-slate-900 text-sm font-medium border-r border-slate-100">{p.customer_name || 'N/A'}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-0.5">
                      <button onClick={() => generateGanttPdf(p)} className="p-1 rounded text-indigo-500 hover:bg-indigo-50" title="Structural Plan">
                        <FileText className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setViewProjectId(viewProjectId === p.id ? null : p.id)} className={`p-1 rounded ${viewProjectId === p.id ? 'bg-amber-100 text-amber-700' : 'text-amber-500 hover:bg-amber-50'}`} title="Toggle Gantt">
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDetails(p, 'edit')} className="p-1 rounded text-blue-500 hover:bg-blue-50" title="Edit">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(p.id)} className="p-1 rounded text-red-500 hover:bg-red-50" title="Delete">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>,
                viewProjectId === p.id && (
                  <tr key={`gantt-${p.id}`} className="bg-slate-50">
                    <td colSpan={4} className="p-4">
                      <GanttChart project={p} allSchedules={allSchedules} />
                    </td>
                  </tr>
                )
              ].filter(Boolean))}
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
              priority: selected.priority,
              shop_name: selected.shop_name || '',
              schedule_field_measure_required: selected.schedule_field_measure_required || 'No',
            });
            setDeletedSchedules([]);
            // Fetch and set existing schedules for this project
            const existingSchedules = allSchedules.filter(s =>
              (s.project?.id || s.project) === selected.id
            );
            if (existingSchedules.length > 0) {
              const sorted = [...existingSchedules].sort((a, b) => {
                const aNum = parseFloat(a.seq_no);
                const bNum = parseFloat(b.seq_no);
                if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
                return String(a.seq_no).localeCompare(String(b.seq_no), undefined, { numeric: true });
              });
              setSchedules(sorted.map(s => ({ ...s, is_new: false })));
            } else {
              setSchedules([createDefaultRow(selected)]);
            }
          }}
          addScheduleRow={() => {
            const maxSeq = schedules.reduce((max, row) => {
              const num = parseInt(row.seq_no);
              return !isNaN(num) && num > max ? num : max;
            }, 0);
            const nextRow = createDefaultRow(form);
            nextRow.seq_no = (maxSeq + 1).toString();
            setSchedules([...schedules, nextRow]);
          }}
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
          handleDeleteSchedule={(id) => {
            const row = schedules.find(s => s.id === id);
            if (row && !row.is_new) {
              setDeletedSchedules(prev => [...prev, id]);
            }
            setSchedules(schedules.filter(s => s.id !== id));
          }}
          handleSave={handleSave}
          mode={viewMode}
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
