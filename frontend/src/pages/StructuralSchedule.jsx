import { useState, useEffect } from 'react';
import { FolderKanban, Plus, Search, Eye, Edit3, Trash, Download } from 'lucide-react';
import { projectAPI, scheduleAPI } from '../services/api';
import ScheduleCreationModal from '../components/Modals/ScheduleCreationModal';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function StructuralSchedule() {
  const [projects, setProjects] = useState([]);
  const [schedules, setSchedules] = useState([]); 
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('view'); 
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const projRes = await projectAPI.getAll();
      const projData = projRes.data.results || projRes.data;
      setProjects(Array.isArray(projData) ? projData : []);
      
      const schedRes = await scheduleAPI.getAll();
      const schedData = schedRes.data.results || schedRes.data;
      if (Array.isArray(schedData)) {
        setSchedules(schedData.map(s => ({
          ...s,
          project: typeof s.project === 'object' ? s.project.id : s.project
        })));
      }
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  };

  const selectedProject = projects.find(p => p.id.toString() === selectedProjectId.toString());

  const currentProjectSchedules = schedules.filter(s => 
    selectedProjectId && s.project.toString() === selectedProjectId.toString()
  );

  const calculateDates = (erectionDate) => {
    if (!erectionDate) return {};
    const base = new Date(erectionDate);
    const rts = new Date(base); rts.setDate(rts.getDate() - 7);
    const fm = new Date(rts); fm.setDate(fm.getDate() - 7);
    const bfa = new Date(fm); bfa.setDate(bfa.getDate() - 30);
    const ofa = new Date(bfa); ofa.setDate(ofa.getDate() - 7);
    const formatDate = (d) => d.toISOString().split('T')[0];
    return {
      rts_date: formatDate(rts),
      scheduled_field_measure_date: formatDate(fm),
      scheduled_bfa_date: formatDate(bfa),
      scheduled_ofa_date: formatDate(ofa)
    };
  };

  const handleRowChange = (id, field, value) => {
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
    if (!selectedProjectId) return;
    const projectSchedules = currentProjectSchedules;
    const maxSeq = projectSchedules.reduce((max, row) => {
      const num = parseInt(row.seq_no);
      return !isNaN(num) && num > max ? num : max;
    }, 0);

    const initialErectionDate = selectedProject?.erection_date || '';
    const calculated = initialErectionDate ? calculateDates(initialErectionDate) : {};

    const newRow = {
      id: Date.now(),
      is_new: true,
      project: parseInt(selectedProjectId),
      seq_no: (maxSeq + 1).toString(),
      tons: '',
      item_description: '',
      scheduled_erection_date: initialErectionDate,
      ...calculated,
      actual_ofa_date: '',
      actual_bfa_date: '',
      num_days: initialErectionDate ? 7 : 0,
      shop_lead_time_weeks: '',
      shop_hours: '',
      field_hours: '',
      status: '',
      location: '',
      material_finish: '',
      detailer_vendor: '',
      dwg_status: '',
      notes: ''
    };
    setSchedules([...schedules, newRow]);
  };

  const handleDeleteRow = async (id) => {
    if (typeof id === 'number' && id > 1000000000) {
      setSchedules(schedules.filter(s => s.id !== id));
      return;
    }
    if (window.confirm('Delete this record?')) {
      try {
        await scheduleAPI.delete(id);
        setSchedules(schedules.filter(s => s.id !== id));
      } catch (err) {
        alert('Delete failed');
      }
    }
  };

  const handleDeleteAllSchedules = async () => {
    if (!selectedProjectId) return;
    if (window.confirm('Are you sure you want to delete ALL schedule data for this project?')) {
      setLoading(true);
      try {
        const rowsToDelete = currentProjectSchedules.filter(s => typeof s.id === 'number' && s.id < 1000000000);
        await Promise.all(rowsToDelete.map(row => scheduleAPI.delete(row.id)));
        alert('All schedule data deleted.');
        setIsModalOpen(false);
        fetchData();
      } catch (err) {
        alert('Failed to delete records.');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSave = async () => {
    const rowsToSave = currentProjectSchedules;
    for (const row of rowsToSave) {
      if (!row.tons || !row.item_description) {
        alert('Tons and Item Description are required.');
        return;
      }
    }
    setSaving(true);
    try {
      const promises = rowsToSave.map(row => {
        const payload = { ...row, project: parseInt(row.project) };
        delete payload.is_new;
        if (row.is_new) {
          const { id, ...createData } = payload;
          return scheduleAPI.create(createData);
        } else {
          return scheduleAPI.update(row.id, payload);
        }
      });
      await Promise.all(promises);
      alert('Saved successfully!');
      fetchData();
      setIsModalOpen(false);
    } catch (err) {
      alert('Error saving changes.');
    } finally {
      setSaving(false);
    }
  };

  const generatePDF = () => {
    try {
      if (!selectedProject) {
        alert("No project selected.");
        return;
      }
      const doc = new jsPDF('l', 'mm', 'a4');
      
      // Title
      doc.setFontSize(22);
      doc.setTextColor(30, 41, 59);
      doc.text('Structural Schedule Plan', 14, 20);
      
      // Project Information Grid
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text('PROJECT DETAILS', 14, 32);
      
      autoTable(doc, {
        startY: 35,
        theme: 'plain',
        body: [
          ['Project Name:', selectedProject.name, 'Customer:', selectedProject.customer_name || 'N/A'],
          ['Project Code:', selectedProject.code, 'Detailer:', selectedProject.detailer_name || 'N/A'],
          ['Manager:', selectedProject.project_manager_name || 'N/A', 'Erection Date:', selectedProject.erection_date || 'N/A'],
        ],
        styles: { fontSize: 9, cellPadding: 2 },
        columnStyles: { 0: { fontStyle: 'bold', width: 30 }, 2: { fontStyle: 'bold', width: 30 } }
      });

      const summaryY = doc.lastAutoTable.finalY + 10;
      doc.setTextColor(100, 116, 139);
      doc.text('METRICS', 14, summaryY - 2);

      const totalTons = currentProjectSchedules.reduce((sum, r) => sum + (parseFloat(r.tons) || 0), 0).toFixed(2);
      const totalMH = currentProjectSchedules.reduce((sum, r) => sum + (parseFloat(r.shop_hours) || 0) + (parseFloat(r.field_hours) || 0), 0).toFixed(2);
      const mhPerTon = totalTons > 0 ? (totalMH / totalTons).toFixed(2) : '0.00';

      autoTable(doc, {
        startY: summaryY,
        theme: 'grid',
        head: [['TOTAL TON', 'TOTAL MANHOURS', 'MANHOUR / TON']],
        body: [[totalTons, totalMH, mhPerTon]],
        headStyles: { fillColor: [254, 252, 232], textColor: [154, 52, 18], fontStyle: 'bold' },
        styles: { halign: 'center', fontSize: 10 }
      });

      // Schedule Table
      const tableY = doc.lastAutoTable.finalY + 15;
      doc.setTextColor(100, 116, 139);
      doc.text('EXECUTION PLAN', 14, tableY - 2);

      const tableData = currentProjectSchedules.map(row => [
        row.seq_no, 
        row.tons, 
        row.item_description, 
        row.scheduled_ofa_date, 
        row.actual_ofa_date || 'dd-mm-yyyy',
        row.scheduled_bfa_date,
        row.actual_bfa_date || 'dd-mm-yyyy',
        row.scheduled_field_measure_date,
        row.rts_date
      ]);

      autoTable(doc, {
        startY: tableY,
        head: [['SEQ#', 'TONS', 'DESCRIPTION', 'SCHED OFA', 'ACTUAL OFA', 'SCHED BFA', 'ACTUAL BFA', 'FIELD MEAS.', 'RTS DATE']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [245, 158, 11], textColor: [255, 255, 255], fontStyle: 'bold' },
        styles: { fontSize: 8, cellPadding: 2 },
        columnStyles: {
          3: { fillColor: [255, 251, 235] }, // Sched OFA color
          5: { fillColor: [239, 246, 255] }, // Sched BFA color
          7: { fillColor: [236, 253, 245] }, // Field Meas color
          8: { fillColor: [250, 245, 255] }  // RTS color
        }
      });

      doc.save(`Schedule_${selectedProject.code}.pdf`);
    } catch (error) {
      console.error("PDF Generation Error:", error);
      alert("Failed to generate PDF. Check console for details.");
    }
  };

  const openModal = (proj, mode) => {
    setSelectedProjectId(proj.id.toString());
    setModalMode(mode);
    setIsModalOpen(true);
  };

  const projectList = projects.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col bg-slate-50 overflow-hidden">
      <div className="px-10 py-8 bg-white border-b border-slate-200 flex items-center justify-between shrink-0 shadow-sm z-10">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-600 shadow-sm">
            <FolderKanban className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900">Structural Schedule</h2>
            <p className="text-sm text-slate-500 font-medium">Manage and track project execution plans</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-10">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex items-center justify-between mb-4">
            <div className="relative w-96">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text"
                placeholder="Search projects..."
                className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white border border-slate-200 text-sm font-medium outline-none focus:border-amber-500"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest">Project Name</th>
                  <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest">Project ID (Job #)</th>
                  <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest">Project Manager</th>
                  <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest">Detailer Name</th>
                  <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {projectList.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-8 py-5 text-sm font-black text-slate-900">{p.name}</td>
                    <td className="px-8 py-5 text-sm font-bold text-slate-600">{p.code}</td>
                    <td className="px-8 py-5 text-sm font-bold text-slate-600">{p.project_manager_name || 'N/A'}</td>
                    <td className="px-8 py-5 text-sm font-bold text-slate-600">{p.detailer_name || 'N/A'}</td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <button onClick={() => openModal(p, 'view')} className="p-2.5 rounded-xl bg-amber-50 text-amber-600 hover:bg-amber-100"><Eye className="w-4 h-4" /></button>
                        <button onClick={() => openModal(p, 'edit')} className="p-2.5 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100"><Edit3 className="w-4 h-4" /></button>
                        <button onClick={() => openModal(p, 'delete')} className="p-2.5 rounded-xl bg-red-50 text-red-600 hover:bg-red-100"><Trash className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <ScheduleCreationModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        mode={modalMode}
        project={selectedProject}
        schedules={currentProjectSchedules}
        addScheduleRow={addScheduleRow}
        handleRowChange={handleRowChange}
        handleDeleteRow={handleDeleteRow}
        handleSave={handleSave}
        handleDeleteAll={handleDeleteAllSchedules}
        generatePDF={generatePDF}
        saving={saving}
      />
    </div>
  );
}
