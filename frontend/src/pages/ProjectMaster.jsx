import { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Plus, Search, Edit2, Trash2, Eye, Filter, Download, ChevronLeft, ChevronRight, X, FileText } from 'lucide-react';
import { projectAPI, scheduleAPI } from '../services/api';
import ProjectForm from '../components/forms/ProjectForm';

export default function ProjectMaster() {
  const [projects, setProjects] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [allSchedules, setAllSchedules] = useState([]);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [initialTab, setInitialTab] = useState("basic");
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatClock = (date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit', 
      hour12: true 
    }).toLowerCase();
  };

  const formatDateLong = (date) => {
    return date.toLocaleDateString('en-GB', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    });
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
    status: 'Planning',
    priority: 'Medium'
  });

  useEffect(() => {
    fetchProjects();
    fetchAllSchedules();
  }, []);

  
  const fetchAllSchedules = async () => {
    try {
      const res = await scheduleAPI.getAll();
      const data = res.data.results || res.data;
      setAllSchedules(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    }
  };

  
  const createDefaultRow = (projectData) => {
    const initialErectionDate = projectData.erection_date || '';
    const calculated = initialErectionDate ? calculateDates(initialErectionDate) : {};
    return {
      id: Date.now(),
      is_new: true,
      project: projectData.id || '',
      seq_no: '1',
      tons: '',
      item_description: '',
      category: '',
      scheduled_erection_date: initialErectionDate,
      ...calculated,
      shop_lead_time_weeks: '0',
      budget_shop_hours: '0',
      budget_field_hours: '0',
      actual_shop_hours: '0',
      actual_field_hours: '0',
      detailer_vendor: projectData.detailer_name || '',
      dwg_status: '',
      notes: '',
      fabrication_details: []
    };
  };

  const calculateDates = (erectionDate) => {
    if (!erectionDate) return {};
    const base = new Date(erectionDate);
    
    // RTS Date: 2 months prior
    const rts = new Date(base); 
    rts.setMonth(rts.getMonth() - 2);
    
    // Field Measure: 2 weeks prior to RTS
    const fm = new Date(rts); 
    fm.setDate(fm.getDate() - 14);
    
    // BFA: 2 weeks prior to Field Measure
    const bfa = new Date(fm); 
    bfa.setDate(bfa.getDate() - 14);
    
    // OFA: 2 weeks prior to BFA
    const ofa = new Date(bfa); 
    ofa.setDate(ofa.getDate() - 14);
    
    const formatDate = (d) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    
    return {
      rts_date: formatDate(rts),
      scheduled_field_measure_date: formatDate(fm),
      scheduled_bfa_date: formatDate(bfa),
      scheduled_ofa_date: formatDate(ofa)
    };
  };

  const handleScheduleChange = (id, field, value) => {
    setSchedules(prev => prev.map(row => {
      if (row.id !== id) return row;
      let updated = { ...row, [field]: value };
      if (field === 'scheduled_erection_date' && value) {
        const calculated = calculateDates(value);
        updated = { ...updated, ...calculated };
      }
      if (field === 'shop_lead_time_weeks') {
        const weeks = parseFloat(value) || 0;
        updated.num_days = Math.round(weeks * 7);
      }
      return updated;
    }));
  };

  const addScheduleRow = () => {
    const maxSeq = schedules.reduce((max, row) => {
      const num = parseInt(row.seq_no);
      return !isNaN(num) && num > max ? num : max;
    }, 0);

    const initialErectionDate = form.erection_date || '';
    const calculated = initialErectionDate ? calculateDates(initialErectionDate) : {};

    const newRow = {
      id: Date.now(),
      is_new: true,
      project: form.id || '',
      seq_no: (maxSeq + 1).toString(),
      tons: '',
      item_description: '',
      category: '',
      scheduled_erection_date: initialErectionDate,
      ...calculated,
      shop_lead_time_weeks: '0',
      budget_shop_hours: '0',
      budget_field_hours: '0',
      actual_shop_hours: '0',
      actual_field_hours: '0',
      detailer_vendor: form.detailer_name || '',
      dwg_status: '',
      notes: '',
      fabrication_details: []
    };
    setSchedules([...schedules, newRow]);
  };

  const handleDeleteSchedule = async (id) => {
    const row = schedules.find(s => s.id === id);
    if (!row.is_new) {
      if (!window.confirm("Delete this schedule permanently?")) return;
      try {
        await scheduleAPI.delete(id);
      } catch (err) {
        console.error(err);
        return;
      }
    }
    setSchedules(schedules.filter(s => s.id !== id));
  };

  const fetchProjects = async () => {
    try {
      const res = await projectAPI.getAll();
      const data = res.data.results || res.data;
      setProjects(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch projects:', err);
    }
  };

  // Automatically sync project-level erection date to the first schedule row
  useEffect(() => {
    if (schedules.length > 0 && schedules[0].is_new) {
      const firstRow = schedules[0];
      if (form.erection_date && firstRow.scheduled_erection_date !== form.erection_date) {
        handleScheduleChange(firstRow.id, 'scheduled_erection_date', form.erection_date);
      }
    }
  }, [form.erection_date]);

  
  

  
  const downloadProjectPDF = (project) => {
    const projectSchedules = allSchedules.filter(s => {
      const sId = typeof s.project === 'object' ? s.project.id : s.project;
      return String(sId) === String(project.id);
    });
    
    if (projectSchedules.length === 0) {
      alert("No schedule data found for this project.");
      return;
    }

    const doc = new jsPDF('l', 'mm', 'a4');
    
    
    // Title & Branding
    doc.setFontSize(22);
    doc.setTextColor(15, 23, 42); // Slate 900
    doc.setFont(undefined, 'bold');
    doc.text("STRUCTURAL SCHEDULE", 14, 20);
    
    // Horizontal Divider
    doc.setDrawColor(203, 213, 225); // Slate 300
    doc.setLineWidth(0.5);
    doc.line(14, 24, 283, 24);

    // Meta Grid - Column 1
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105); // Slate 600
    doc.setFont(undefined, 'bold'); doc.text("PROJECT NAME:", 14, 32);
    doc.setFont(undefined, 'normal'); doc.setTextColor(15, 23, 42); doc.text(project.name || 'N/A', 45, 32);

    doc.setTextColor(71, 85, 105); doc.setFont(undefined, 'bold'); doc.text("CUSTOMER:", 14, 38);
    doc.setFont(undefined, 'normal'); doc.setTextColor(15, 23, 42); doc.text(project.customer_name || 'N/A', 45, 38);

    doc.setTextColor(71, 85, 105); doc.setFont(undefined, 'bold'); doc.text("DETAILER:", 14, 44);
    doc.setFont(undefined, 'normal'); doc.setTextColor(15, 23, 42); doc.text(project.detailer_name || 'N/A', 45, 44);

    // Meta Grid - Column 2
    doc.setTextColor(71, 85, 105); doc.setFont(undefined, 'bold'); doc.text("PROJECT CODE:", 150, 32);
    doc.setFont(undefined, 'normal'); doc.setTextColor(15, 23, 42); doc.text(project.code || 'N/A', 180, 32);

    doc.setTextColor(71, 85, 105); doc.setFont(undefined, 'bold'); doc.text("MANAGER:", 150, 38);
    doc.setFont(undefined, 'normal'); doc.setTextColor(15, 23, 42); doc.text(project.project_manager_name || 'N/A', 180, 38);


    const tableHeaders = [["SEQ #", "Tons", "Description", "Category", "OFA Sch", "OFA Act", "BFA Sch", "BFA Act", "FM Sch", "RTS", "Lead", "Erection", "B.Shop", "B.Field", "A.Shop", "A.Field", "Vendor", "Status", "Notes"]];
    
    const tableData = projectSchedules.map(s => [
      s.seq_no,
      s.tons,
      s.item_description,
      s.category || '',
      s.scheduled_ofa_date,
      s.actual_ofa_date || '-',
      s.scheduled_bfa_date,
      s.actual_bfa_date || '-',
      s.scheduled_field_measure_date || '-',
      s.rts_date,
      s.shop_lead_time_weeks,
      s.scheduled_erection_date,
      s.budget_shop_hours,
      s.budget_field_hours,
      s.actual_shop_hours,
      s.actual_field_hours,
      s.detailer_vendor,
      s.dwg_status,
      s.notes
    ]);
    
    autoTable(doc, {
      startY: 50,
      head: tableHeaders,
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [30, 41, 59], fontSize: 6, fontStyle: 'bold' },
      bodyStyles: { fontSize: 5 },
      styles: { cellPadding: 1 },
      didDrawPage: (data) => {
        const pageSize = doc.internal.pageSize;
        const pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight();
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184); // slate-400
        doc.text(`Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, 14, pageHeight - 10);
      },
      columnStyles: {
        0: { cellWidth: 8 }, // SEQ
        1: { cellWidth: 10 }, // Tons
        2: { cellWidth: 'auto' }, // Desc
        3: { cellWidth: 20 }, // Category
        4: { cellWidth: 15 }, // OFA Sch
        5: { cellWidth: 15 }, // OFA Act
        6: { cellWidth: 15 }, // BFA Sch
        7: { cellWidth: 15 }, // BFA Act
        8: { cellWidth: 15 }, // FM Sch
        9: { cellWidth: 15 }, // RTS
        10: { cellWidth: 8 }, // Lead
        11: { cellWidth: 15 }, // Erection
        12: { cellWidth: 12 }, // B.Shop
        13: { cellWidth: 12 }, // B.Field
        14: { cellWidth: 12 }, // A.Shop
        15: { cellWidth: 12 }, // A.Field
        16: { cellWidth: 15 }, // Vendor
        17: { cellWidth: 15 }, // Status
        18: { cellWidth: 20 }  // Notes
      }

    });
    
    doc.save(`Plan_${project.code}.pdf`);
  };


  const [viewMode, setViewMode] = useState('edit');

  const handleDetails = async (project, mode = 'edit') => {
    setForm({
      ...project,
      name: project.name || '',
      code: project.code || '',
      customer_name: project.customer_name || '',
      detailer_name: project.detailer_name || '',
      project_manager_name: project.project_manager_name || '',
      total_ton: project.total_ton || '',
      total_manhours: project.total_manhours || '',
      erection_date: project.erection_date || '',
      status: project.status || 'Planning',
      priority: project.priority || 'Medium'
    });
    setViewMode(mode);
    setIsEditing(true);
    
    const projSchedules = allSchedules.filter(s => {
      const sId = typeof s.project === 'object' ? s.project.id : s.project;
      return String(sId) === String(project.id);
    }).map(s => ({...s, project: project.id}));

    if (projSchedules.length === 0) {
      projSchedules.push(createDefaultRow(project));
    }
    setSchedules(projSchedules);
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

      let projectId = form.id;
      if (form.id) {
        res = await projectAPI.update(form.id, payload);
        setProjects(projects.map(p => p.id === form.id ? res.data : p));
      } else {
        res = await projectAPI.create(payload);
        setProjects([res.data, ...projects]);
        projectId = res.data.id;
        setForm(res.data); // Update form with new ID to allow subsequent updates if schedule save fails
      }

      // Save schedules
      for (const row of schedules) {
        const schedPayload = {
          project: projectId,
          seq_no: row.seq_no || '1',
          tons: parseFloat(row.tons) || 0,
          item_description: row.item_description || '',
          category: row.category || '',
          scheduled_ofa_date: row.scheduled_ofa_date || null,
          actual_ofa_date: row.actual_ofa_date || null,
          scheduled_bfa_date: row.scheduled_bfa_date || null,
          actual_bfa_date: row.actual_bfa_date || null,
          scheduled_field_measure_date: row.scheduled_field_measure_date || null,
          rts_date: row.rts_date || null,
          shop_lead_time_weeks: parseInt(row.shop_lead_time_weeks) || 0,
          scheduled_erection_date: row.scheduled_erection_date || null,
          budget_shop_hours: parseFloat(row.budget_shop_hours) || 0,
          budget_field_hours: parseFloat(row.budget_field_hours) || 0,
          actual_shop_hours: parseFloat(row.actual_shop_hours) || 0,
          actual_field_hours: parseFloat(row.actual_field_hours) || 0,
          detailer_vendor: row.detailer_vendor || '',
          dwg_status: row.dwg_status || '',
          notes: row.notes || '',
          fabrication_details: (row.fabrication_details || []).map(d => ({
            pieces: d.pieces,
            material_size: d.material_size,
            dimension: d.dimension,
            machine: d.machine
          }))
        };

        if (row.is_new) {
          await scheduleAPI.create(schedPayload);
        } else {
          await scheduleAPI.update(row.id, schedPayload);
        }
      }

      fetchAllSchedules();

      setShowModal(false);
      resetForm();
    } catch (err) {
      console.error('Failed to save project:', err);
      console.error('Error response:', err.response?.data);
      const errorMsg = err.response?.data ? JSON.stringify(err.response.data) : err.message;
      alert(`Failed to save project/schedule: ${errorMsg}`);
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
      erection_date: '', status: 'Planning', priority: 'Medium'
    });
    setIsEditing(false);
    setInitialTab("basic");
    setSchedules([createDefaultRow({})]);
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

  const exportToCSV = () => {
    const headers = ["Project Code", "Project Name", "Customer", "PM", "Priority", "Status", "Total Ton"];
    const rows = filtered.map(p => [
      p.code,
      p.name,
      p.customer_name,
      p.project_manager_name,
      p.priority,
      p.status,
      p.total_ton
    ]);
    
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "projects_master.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filtered = projects.filter(p => 
    (p.name?.toLowerCase() || '').includes(search.toLowerCase()) || 
    (p.code?.toLowerCase() || '').includes(search.toLowerCase()) ||
    (p.customer_name?.toLowerCase() || '').includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = filtered.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="min-h-screen bg-slate-50/30 p-4 lg:p-8 space-y-6">
      {/* Top Professional Header */}


      <div className="space-y-4 animate-fade-in">
      {/* Control Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search projects by name, code or customer..." 
            value={search} 
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }} 
            className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-slate-200 text-sm outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-500/5 transition-all" 
          />
          {search && (
            <button 
              onClick={() => { setSearch(''); setCurrentPage(1); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-slate-100 text-slate-400"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-all">
            <Filter className="w-4 h-4" /> Filters
          </button>
          <button 
            onClick={exportToCSV}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-all"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
          <button 
            onClick={() => {
              resetForm();
              setShowModal(true);
            }} 
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-bold shadow-lg shadow-amber-500/20 hover:from-amber-400 hover:to-orange-400 transition-all"
          >
            <Plus className="w-4 h-4" /> Add Project
          </button>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gradient-to-r from-amber-500 to-orange-500 text-white">
                <th className="px-2 py-3 text-[10px] font-black uppercase tracking-wider border-b border-white/10 border-r border-white/5 min-w-[120px]">Project Name</th>
                <th className="px-2 py-3 text-[10px] font-black uppercase tracking-wider border-b border-white/10 border-r border-white/5 w-20">Code</th>
                <th className="px-2 py-3 text-[10px] font-black uppercase tracking-wider border-b border-white/10 border-r border-white/5 min-w-[100px]">Customer Name</th>
                <th className="px-2 py-3 text-[10px] font-black uppercase tracking-wider border-b border-white/10 border-r border-white/5">Detailer Name</th>
                <th className="px-2 py-3 text-[10px] font-black uppercase tracking-wider border-b border-white/10 border-r border-white/5">Manager</th>
                <th className="px-2 py-3 text-[10px] font-black uppercase tracking-wider border-b border-white/10 border-r border-white/5">Erection</th>
                <th className="px-2 py-3 text-[10px] font-black uppercase tracking-wider border-b border-white/10 border-r border-white/5">Priority</th>
                <th className="px-2 py-3 text-[10px] font-black uppercase tracking-wider border-b border-white/10 border-r border-white/5">Ton</th>
                <th className="px-2 py-3 text-[10px] font-black uppercase tracking-wider border-b border-white/10 border-r border-white/5">M.Hrs</th>
                <th className="px-2 py-3 text-[10px] font-black uppercase tracking-wider border-b border-white/10 border-r border-white/5">M/T</th>
                <th className="px-2 py-3 text-[10px] font-black uppercase tracking-wider border-b border-white/10 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {paginatedData.length > 0 ? paginatedData.map((p) => (
                <tr key={p.id} className="transition-colors group text-[12px] border-b border-slate-100">
                  <td className="px-2 py-3 font-bold text-slate-800 border-r border-slate-100 break-words leading-tight">{p.name}</td>
                  <td className="px-2 py-3 font-mono text-[10px] text-slate-500 border-r border-slate-100">{p.code}</td>
                  <td className="px-2 py-3 text-slate-700 border-r border-slate-100 break-words leading-tight">{p.customer_name || 'N/A'}</td>
                  <td className="px-2 py-3 text-slate-700 border-r border-slate-100 leading-tight">{p.detailer_name || 'N/A'}</td>
                  <td className="px-2 py-3 text-slate-700 border-r border-slate-100 leading-tight">{p.project_manager_name || 'N/A'}</td>
                  <td className="px-2 py-3 text-slate-600 font-medium border-r border-slate-100">
                    {p.erection_date ? new Date(p.erection_date).toLocaleDateString('en-GB') : 'N/A'}
                  </td>
                  <td className="px-2 py-3 border-r border-slate-100 text-center">
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                      p.priority === 'High' ? 'bg-red-50 text-red-600 border border-red-100' : 
                      p.priority === 'Medium' ? 'bg-amber-50 text-amber-600 border border-amber-100' : 
                      'bg-emerald-50 text-emerald-600 border border-emerald-100'
                    }`}>
                      {p.priority}
                    </span>
                  </td>
                  <td className="px-2 py-3 font-bold text-slate-700 border-r border-slate-100 text-center">{p.total_ton}</td>
                  <td className="px-2 py-3 text-slate-600 border-r border-slate-100 text-center">{p.total_manhours}</td>
                  <td className="px-2 py-3 border-r border-slate-100 text-center font-bold text-amber-600">
                    {p.total_ton > 0 ? (p.total_manhours / p.total_ton).toFixed(1) : '0.0'}
                  </td>
                  <td className="px-2 py-3 text-right">
                    <div className="flex items-center justify-end gap-0.5">
                                            <button onClick={() => downloadProjectPDF(p)} className="p-1 rounded text-indigo-500 hover:bg-indigo-50" title="Structural Plan">
                        <FileText className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDetails(p, 'view')} className="p-1 rounded text-amber-500 hover:bg-amber-50" title="View">
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
                </tr>
              )) : (
                <tr>
                  <td colSpan="11" className="px-6 py-12 text-center text-slate-500 italic">No projects found matching your search.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination & Footer */}
        <div className="bg-slate-50 px-4 py-3 border-t border-slate-100 flex items-center justify-between">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            {filtered.length} {filtered.length === 1 ? 'Record' : 'Records'} Found
          </div>
          <div className="flex items-center gap-2">
            <button 
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => prev - 1)}
              className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-40 hover:bg-slate-50 transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-1">
              {[...Array(totalPages)].map((_, i) => (
                <button 
                  key={i}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${currentPage === i + 1 ? 'bg-amber-500 text-white shadow-md' : 'text-slate-600 hover:bg-slate-200'}`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            <button 
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(prev => prev + 1)}
              className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-40 hover:bg-slate-50 transition-all"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
      </div>

      {showModal && (
        <ProjectForm 
          form={form}
          schedules={schedules}
          addScheduleRow={addScheduleRow}
          handleScheduleChange={handleScheduleChange}
          handleDeleteSchedule={handleDeleteSchedule}
          initialTab={initialTab}
          setForm={setForm}
          handleSave={handleSave}
          mode={viewMode}
          onClose={() => setShowModal(false)}
          isEditing={isEditing}
          loading={loading}
          autocalculateManhourTon={autocalculateManhourTon}
        />
      )}
    </div>
  );
}