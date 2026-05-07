import { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, X, Save } from 'lucide-react';
import { projectAPI, milestoneAPI } from '../services/api';

export default function MilestoneManagement() {
  const [search, setSearch] = useState('');
  const [milestones, setMilestones] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  
  // 'new' | id | null
  const [editRowId, setEditRowId] = useState(null);
  
  const [form, setForm] = useState({
    id: null, project: '', seq_number: '', tons: '', item_description: '',
    scheduled_ofa_date: '', actual_ofa_date: '', scheduled_bfa_date: '', actual_bfa_date: '',
    scheduled_field_measure_date: '', rts_date: '', Days: '', shop_lead_time_weeks: '',
    scheduled_start_of_erection: '', shop_hours: '', field_hours: '', status_location: '',
    material_finish: '', detailer_vendor: '', dwg_status: '', notes: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [projRes, mileRes] = await Promise.all([
        projectAPI.getAll(),
        milestoneAPI.getAll()
      ]);
      const pData = projRes.data;
      const mData = mileRes.data;
      setProjects(Array.isArray(pData) ? pData : (pData?.results || []));
      setMilestones(Array.isArray(mData) ? mData : (mData?.results || []));
    } catch (err) {
      console.error("Failed to fetch data", err);
    }
  };

  const filtered = selectedProjectId 
    ? milestones.filter(m => 
        m.project === parseInt(selectedProjectId) && 
        (
          (m.item_description || '').toLowerCase().includes(search.toLowerCase()) || 
          (m.seq_number || '').toLowerCase().includes(search.toLowerCase())
        )
      )
    : [];

  const subDays = (dateStr, days) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    d.setDate(d.getDate() - days);
    return d.toISOString().split('T')[0];
  };

  // Project selection is now handled via the global dropdown.

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => {
      const newForm = { ...prev, [name]: value };
      if (name === 'scheduled_start_of_erection' && value) {
        newForm.actual_bfa_date = subDays(value, 7);
        newForm.scheduled_bfa_date = subDays(value, 14);
        newForm.actual_ofa_date = subDays(value, 21);
        newForm.scheduled_ofa_date = subDays(value, 28);
      }
      return newForm;
    });
  };

  const handleEdit = (milestone) => {
    setForm({
      id: milestone.id,
      project: milestone.project || '',
      seq_number: milestone.seq_number || '',
      tons: milestone.tons || '',
      item_description: milestone.item_description || '',
      scheduled_ofa_date: milestone.scheduled_ofa_date || '',
      actual_ofa_date: milestone.actual_ofa_date || '',
      scheduled_bfa_date: milestone.scheduled_bfa_date || '',
      actual_bfa_date: milestone.actual_bfa_date || '',
      scheduled_field_measure_date: milestone.scheduled_field_measure_date || '',
      rts_date: milestone.rts_date || '',
      Days: milestone.days || '',
      shop_lead_time_weeks: milestone.shop_lead_time_weeks || '',
      scheduled_start_of_erection: milestone.scheduled_start_of_erection || '',
      shop_hours: milestone.shop_hours || '',
      field_hours: milestone.field_hours || '',
      status_location: milestone.status_location || '',
      material_finish: milestone.material_finish || '',
      detailer_vendor: milestone.detailer_vendor || '',
      dwg_status: milestone.dwg_status || '',
      notes: milestone.notes || ''
    });
    setEditRowId(milestone.id);
  };

  const handleAddRow = () => {
    const proj = projects.find(p => p.id === parseInt(selectedProjectId));
    const startErection = proj?.start_up_meeting_date || '';

    setForm({
      id: null, 
      project: selectedProjectId, 
      seq_number: proj?.job_number || '', 
      tons: '', 
      item_description: '',
      scheduled_ofa_date: startErection ? subDays(startErection, 28) : '', 
      actual_ofa_date: startErection ? subDays(startErection, 21) : '', 
      scheduled_bfa_date: startErection ? subDays(startErection, 14) : '', 
      actual_bfa_date: startErection ? subDays(startErection, 7) : '',
      scheduled_field_measure_date: '', 
      rts_date: '', 
      Days: '', 
      shop_lead_time_weeks: '',
      scheduled_start_of_erection: startErection, 
      shop_hours: '', 
      field_hours: '', 
      status_location: '',
      material_finish: '', 
      detailer_vendor: '', 
      dwg_status: '', 
      notes: ''
    });
    setEditRowId('new');
  };

  const handleSubmit = async () => {
    if (!form.project) {
      alert('Please select a project first.');
      return;
    }
    const proj = projects.find(p => p.id === parseInt(form.project));
    
    const payload = {
      project: proj.id,
      seq_number: form.seq_number,
      tons: parseFloat(form.tons) || 0,
      item_description: form.item_description,
      scheduled_ofa_date: form.scheduled_ofa_date || null,
      actual_ofa_date: form.actual_ofa_date || null,
      scheduled_bfa_date: form.scheduled_bfa_date || null,
      actual_bfa_date: form.actual_bfa_date || null,
      scheduled_field_measure_date: form.scheduled_field_measure_date || null,
      rts_date: form.rts_date || null,
      days: form.Days,
      shop_lead_time_weeks: parseInt(form.shop_lead_time_weeks) || 0,
      scheduled_start_of_erection: form.scheduled_start_of_erection || null,
      shop_hours: parseFloat(form.shop_hours) || 0,
      field_hours: parseFloat(form.field_hours) || 0,
      status_location: form.status_location,
      material_finish: form.material_finish,
      detailer_vendor: form.detailer_vendor,
      dwg_status: form.dwg_status,
      notes: form.notes
    };

    try {
      if (editRowId === 'new') {
        await milestoneAPI.create(payload);
      } else {
        await milestoneAPI.update(editRowId, payload);
      }
      setEditRowId(null);
      fetchData();
    } catch (err) {
      console.error("Failed to save schedule", err);
      alert("Failed to save. Please check your inputs.");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this schedule item?")) {
      try {
        await milestoneAPI.delete(id);
        fetchData();
      } catch (err) {
        console.error("Failed to delete schedule", err);
      }
    }
  };

  const tableHeaders = [
    'SEQ #', 'Tons', 'Item Description',
    'Scheduled OFA Date', 'Actual OFA Date', 'Scheduled BFA Date', 'Actual BFA Date',
    'Scheduled Field Measure Date', 'RTS Date', 'Days', 'Shop Lead Time In WEEKS',
    'Scheduled Start of Erection', 'Shop Hours', 'Field Hours', 'Status / Location',
    'Material Finish', 'Detailer / Vendor', 'Dwg Status', 'Notes', 'Actions'
  ];

  const renderEditRow = () => {
    return (
      <tr className="bg-amber-50 shadow-inner">
        <td className="px-2 py-2 border-r border-slate-200">
          <input name="seq_number" value={form.seq_number} onChange={handleFormChange} className="w-full min-w-[80px] px-2 py-1 rounded border border-amber-300 text-xs focus:ring-1 focus:ring-amber-500 outline-none" />
        </td>
        <td className="px-2 py-2 border-r border-slate-200">
          <input type="number" name="tons" value={form.tons} onChange={handleFormChange} className="w-full min-w-[70px] px-2 py-1 rounded border border-amber-300 text-xs focus:ring-1 focus:ring-amber-500 outline-none" />
        </td>
        <td className="px-2 py-2 border-r border-slate-200">
          <input name="item_description" value={form.item_description} onChange={handleFormChange} className="w-full min-w-[140px] px-2 py-1 rounded border border-amber-300 text-xs focus:ring-1 focus:ring-amber-500 outline-none" />
        </td>
        <td className="px-2 py-2 border-r border-slate-200">
          <input type="date" name="scheduled_ofa_date" value={form.scheduled_ofa_date} onChange={handleFormChange} className="w-full min-w-[110px] px-2 py-1 rounded border border-amber-300 text-xs focus:ring-1 focus:ring-amber-500 outline-none" />
        </td>
        <td className="px-2 py-2 border-r border-slate-200">
          <input type="date" name="actual_ofa_date" value={form.actual_ofa_date} onChange={handleFormChange} className="w-full min-w-[110px] px-2 py-1 rounded border border-amber-300 text-xs focus:ring-1 focus:ring-amber-500 outline-none" />
        </td>
        <td className="px-2 py-2 border-r border-slate-200">
          <input type="date" name="scheduled_bfa_date" value={form.scheduled_bfa_date} onChange={handleFormChange} className="w-full min-w-[110px] px-2 py-1 rounded border border-amber-300 text-xs focus:ring-1 focus:ring-amber-500 outline-none" />
        </td>
        <td className="px-2 py-2 border-r border-slate-200">
          <input type="date" name="actual_bfa_date" value={form.actual_bfa_date} onChange={handleFormChange} className="w-full min-w-[110px] px-2 py-1 rounded border border-amber-300 text-xs focus:ring-1 focus:ring-amber-500 outline-none" />
        </td>
        <td className="px-2 py-2 border-r border-slate-200">
          <input type="date" name="scheduled_field_measure_date" value={form.scheduled_field_measure_date} onChange={handleFormChange} className="w-full min-w-[110px] px-2 py-1 rounded border border-amber-300 text-xs focus:ring-1 focus:ring-amber-500 outline-none" />
        </td>
        <td className="px-2 py-2 border-r border-slate-200">
          <input type="date" name="rts_date" value={form.rts_date} onChange={handleFormChange} className="w-full min-w-[110px] px-2 py-1 rounded border border-amber-300 text-xs focus:ring-1 focus:ring-amber-500 outline-none" />
        </td>
        <td className="px-2 py-2 border-r border-slate-200">
          <input name="Days" value={form.Days} onChange={handleFormChange} className="w-full min-w-[80px] px-2 py-1 rounded border border-amber-300 text-xs focus:ring-1 focus:ring-amber-500 outline-none" />
        </td>
        <td className="px-2 py-2 border-r border-slate-200">
          <input type="number" name="shop_lead_time_weeks" value={form.shop_lead_time_weeks} onChange={handleFormChange} className="w-full min-w-[80px] px-2 py-1 rounded border border-amber-300 text-xs focus:ring-1 focus:ring-amber-500 outline-none" />
        </td>
        <td className="px-2 py-2 border-r border-slate-200">
          <input type="date" name="scheduled_start_of_erection" value={form.scheduled_start_of_erection} onChange={handleFormChange} className="w-full min-w-[110px] px-2 py-1 rounded border border-amber-300 text-xs focus:ring-1 focus:ring-amber-500 outline-none" />
        </td>
        <td className="px-2 py-2 border-r border-slate-200">
          <input type="number" name="shop_hours" value={form.shop_hours} onChange={handleFormChange} className="w-full min-w-[80px] px-2 py-1 rounded border border-amber-300 text-xs focus:ring-1 focus:ring-amber-500 outline-none" />
        </td>
        <td className="px-2 py-2 border-r border-slate-200">
          <input type="number" name="field_hours" value={form.field_hours} onChange={handleFormChange} className="w-full min-w-[80px] px-2 py-1 rounded border border-amber-300 text-xs focus:ring-1 focus:ring-amber-500 outline-none" />
        </td>
        <td className="px-2 py-2 border-r border-slate-200">
          <input name="status_location" value={form.status_location} onChange={handleFormChange} className="w-full min-w-[100px] px-2 py-1 rounded border border-amber-300 text-xs focus:ring-1 focus:ring-amber-500 outline-none" />
        </td>
        <td className="px-2 py-2 border-r border-slate-200">
          <input name="material_finish" value={form.material_finish} onChange={handleFormChange} className="w-full min-w-[100px] px-2 py-1 rounded border border-amber-300 text-xs focus:ring-1 focus:ring-amber-500 outline-none" />
        </td>
        <td className="px-2 py-2 border-r border-slate-200">
          <input name="detailer_vendor" value={form.detailer_vendor} onChange={handleFormChange} className="w-full min-w-[120px] px-2 py-1 rounded border border-amber-300 text-xs focus:ring-1 focus:ring-amber-500 outline-none" />
        </td>
        <td className="px-2 py-2 border-r border-slate-200">
          <input name="dwg_status" value={form.dwg_status} onChange={handleFormChange} className="w-full min-w-[100px] px-2 py-1 rounded border border-amber-300 text-xs focus:ring-1 focus:ring-amber-500 outline-none" />
        </td>
        <td className="px-2 py-2 border-r border-slate-200">
          <input name="notes" value={form.notes} onChange={handleFormChange} className="w-full min-w-[150px] px-2 py-1 rounded border border-amber-300 text-xs focus:ring-1 focus:ring-amber-500 outline-none" />
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
          <h2 className="text-2xl font-bold text-slate-900">STRUCTURAL SCHEDULE</h2>
          <p className="text-sm text-slate-500 mt-0.5">Manage schedule details</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select 
            value={selectedProjectId} 
            onChange={(e) => {
              setSelectedProjectId(e.target.value);
              setEditRowId(null);
            }} 
            className="px-4 py-2 rounded-lg border border-slate-200 bg-white text-sm outline-none focus:border-amber-400 min-w-[200px]"
          >
            <option value="">Select a Project...</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.project_name || p.job_number}</option>)}
          </select>
          <div className="relative max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" placeholder="Search schedule..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 bg-white text-sm outline-none focus:border-amber-400" />
          </div>
          <button onClick={handleAddRow} disabled={editRowId !== null || !selectedProjectId} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-bold shadow-md hover:from-amber-400 hover:to-orange-400 disabled:opacity-50 transition-all">
            <Plus className="w-4 h-4" /> Add Row
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

              {filtered.map(m => {
                if (editRowId === m.id) {
                  return renderEditRow();
                }

                return (
                  <tr key={m.id} className="hover:bg-amber-50/30 transition-colors group">
                    <td className="px-3 py-2 border-r border-slate-200 whitespace-nowrap">{m.seq_number}</td>
                    <td className="px-3 py-2 border-r border-slate-200 whitespace-nowrap">{m.tons}</td>
                    <td className="px-3 py-2 border-r border-slate-200 whitespace-nowrap font-medium text-slate-900">{m.item_description}</td>
                    <td className="px-3 py-2 border-r border-slate-200 whitespace-nowrap">{m.scheduled_ofa_date}</td>
                    <td className="px-3 py-2 border-r border-slate-200 whitespace-nowrap">{m.actual_ofa_date}</td>
                    <td className="px-3 py-2 border-r border-slate-200 whitespace-nowrap">{m.scheduled_bfa_date}</td>
                    <td className="px-3 py-2 border-r border-slate-200 whitespace-nowrap">{m.actual_bfa_date}</td>
                    <td className="px-3 py-2 border-r border-slate-200 whitespace-nowrap">{m.scheduled_field_measure_date}</td>
                    <td className="px-3 py-2 border-r border-slate-200 whitespace-nowrap">{m.rts_date}</td>
                    <td className="px-3 py-2 border-r border-slate-200 whitespace-nowrap">{m.Days}</td>
                    <td className="px-3 py-2 border-r border-slate-200 whitespace-nowrap">{m.shop_lead_time_weeks}</td>
                    <td className="px-3 py-2 border-r border-slate-200 whitespace-nowrap">{m.scheduled_start_of_erection}</td>
                    <td className="px-3 py-2 border-r border-slate-200 whitespace-nowrap">{m.shop_hours}</td>
                    <td className="px-3 py-2 border-r border-slate-200 whitespace-nowrap">{m.field_hours}</td>
                    <td className="px-3 py-2 border-r border-slate-200 whitespace-nowrap">{m.status_location}</td>
                    <td className="px-3 py-2 border-r border-slate-200 whitespace-nowrap">{m.material_finish}</td>
                    <td className="px-3 py-2 border-r border-slate-200 whitespace-nowrap">{m.detailer_vendor}</td>
                    <td className="px-3 py-2 border-r border-slate-200 whitespace-nowrap">{m.dwg_status}</td>
                    <td className="px-3 py-2 border-r border-slate-200 whitespace-nowrap max-w-[200px] truncate" title={m.notes}>{m.notes}</td>
                    <td className="px-3 py-2 whitespace-nowrap bg-white/50 group-hover:bg-amber-50/30 backdrop-blur sticky right-0 border-l border-slate-200 shadow-[-4px_0_10px_rgba(0,0,0,0.02)] transition-colors">
                      <div className="flex items-center gap-1">
                        <button onClick={() => handleEdit(m)} className="p-1 text-slate-400 hover:text-blue-600 transition-colors"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(m.id)} className="p-1 text-slate-400 hover:text-red-600 transition-colors"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              
              {!selectedProjectId ? (
                <tr>
                  <td colSpan={20} className="px-4 py-12 text-center text-slate-500 font-medium">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-2">
                        <Search className="w-6 h-6 text-slate-400" />
                      </div>
                      <p className="text-lg text-slate-700 font-semibold">No project selected</p>
                      <p className="text-sm">Please select a project from the dropdown above to view its schedule.</p>
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 && editRowId !== 'new' && (
                <tr>
                  <td colSpan={20} className="px-4 py-8 text-center text-slate-500 font-medium">
                    No schedule data found for this project
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
