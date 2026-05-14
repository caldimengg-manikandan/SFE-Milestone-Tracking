import { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Download, X, Save, FolderKanban, LayoutTemplate, CalendarDays, ChevronRight } from 'lucide-react';
import StructuralScheduleForm from './StructuralScheduleForm';
import { customerAPI, detailerAPI } from '../../services/api';

export default function ProjectForm({ 
  schedules,
  addScheduleRow,
  handleScheduleChange,
  handleDeleteSchedule,
  form, 
  setForm, 
  handleSave, 
  onClose, 
  isEditing, 
  loading,
  autocalculateManhourTon,
  initialTab = "basic",
  showTabs = true,
  mode = "edit",
  projects = [],
  onProjectSelect
}) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [customers, setCustomers] = useState([]);
  const [detailers, setDetailers] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [custRes, detRes] = await Promise.all([
          customerAPI.getAll(),
          detailerAPI.getAll()
        ]);
        setCustomers(custRes.data.results || custRes.data);
        setDetailers(detRes.data.results || detRes.data);
      } catch (err) {
        console.error('Failed to load masters', err);
      }
    };
    fetchData();
  }, []);

  const exportToPDF = () => {
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
    doc.setFont(undefined, 'normal'); doc.setTextColor(15, 23, 42); doc.text(form.name || 'N/A', 45, 32);

    doc.setTextColor(71, 85, 105); doc.setFont(undefined, 'bold'); doc.text("CUSTOMER:", 14, 38);
    doc.setFont(undefined, 'normal'); doc.setTextColor(15, 23, 42); doc.text(form.customer_name || 'N/A', 45, 38);

    doc.setTextColor(71, 85, 105); doc.setFont(undefined, 'bold'); doc.text("DETAILER:", 14, 44);
    doc.setFont(undefined, 'normal'); doc.setTextColor(15, 23, 42); doc.text(form.detailer_name || 'N/A', 45, 44);

    // Meta Grid - Column 2
    doc.setTextColor(71, 85, 105); doc.setFont(undefined, 'bold'); doc.text("PROJECT CODE:", 150, 32);
    doc.setFont(undefined, 'normal'); doc.setTextColor(15, 23, 42); doc.text(form.code || 'N/A', 180, 32);

    doc.setTextColor(71, 85, 105); doc.setFont(undefined, 'bold'); doc.text("MANAGER:", 150, 38);
    doc.setFont(undefined, 'normal'); doc.setTextColor(15, 23, 42); doc.text(form.project_manager_name || 'N/A', 180, 38);

    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184); // Slate 400
    doc.text(`Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, 230, 44);


    const tableHeaders = [["SEQ #", "Tons", "Description", "Category", "OFA Sch", "OFA Act", "BFA Sch", "BFA Act", "FM Sch", "RTS", "Lead", "Erection", "B.Shop", "B.Field", "A.Shop", "A.Field", "Vendor", "Status", "Notes"]];
    
    const tableData = (schedules || []).map(s => [
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
    
    doc.save(`Schedule_${form.code}.pdf`);
  };


  // Sync tab if prop changes (e.g. switching between View Plan and Edit)
  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
      <div className={`bg-white rounded-3xl shadow-2xl w-full ${activeTab === 'structural' ? 'max-w-[98vw]' : 'max-w-6xl'} max-h-[95vh] flex flex-col overflow-hidden transition-all duration-300`}>
        {/* Modal Header */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-slate-100 bg-slate-50/50">
          <div>
            <h3 className="text-xl font-bold text-slate-900">{isEditing ? 'Project Details' : 'New Project Master Setup'}</h3>
            <p className="text-xs text-slate-500 mt-0.5">{isEditing ? 'View and update project schedules' : 'Fill in the basic project details'}</p>
          </div>
                    <div className="flex items-center gap-2">
            {activeTab === 'structural' && (
              <button 
                onClick={exportToPDF}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-50 text-emerald-600 text-xs font-bold border border-emerald-100 hover:bg-emerald-100 transition-all"
              >
                <Download className="w-4 h-4" /> Download PDF
              </button>
            )}
            <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-white shadow-sm transition-all"><X className="w-6 h-6" /></button>
          </div>
        </div>


        {/* Tabs */}
        {showTabs && (
          <div className="flex px-8 border-b border-slate-200 bg-white">
            <button 
              onClick={() => setActiveTab('basic')}
              className={`flex items-center gap-2 px-6 py-4 text-sm font-bold border-b-2 transition-all ${activeTab === 'basic' ? 'border-amber-500 text-amber-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
            >
              <LayoutTemplate className="w-4 h-4" /> Basic Details
            </button>
            <button 
              onClick={() => setActiveTab('structural')}
              className={`flex items-center gap-2 px-6 py-4 text-sm font-bold border-b-2 transition-all ${activeTab === 'structural' ? 'border-amber-500 text-amber-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
            >
              <CalendarDays className="w-4 h-4" /> Structural Schedule
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className={`flex-1 ${activeTab === 'basic' ? 'overflow-y-auto p-8 space-y-8' : 'overflow-hidden flex flex-col p-4 bg-slate-50/50'}`}>
          {activeTab === "basic" && (
          <div className="space-y-6 animate-fade-in">
          {/* Basic Details Section */}
          <section className="space-y-6">
            <div className="flex items-center gap-3 pb-2 border-b border-slate-100">
              <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600">
                <FolderKanban className="w-4 h-4" />
              </div>
              <h4 className="font-bold text-slate-800">Basic Project Information</h4>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Project Name</label>
                <input 
                  value={form.name}
                  onChange={e => setForm({...form, name: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-500/5 transition-all" 
                  placeholder="e.g. Skyline Tower" 
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Project Code</label>
                <input 
                  value={form.code}
                  onChange={e => setForm({...form, code: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-500/5 transition-all" 
                  placeholder="e.g. PRJ-001" 
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Customer Name</label>
                <select 
                  value={form.customer_name || ''}
                  onChange={e => setForm({...form, customer_name: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-500/5 transition-all appearance-none"
                >
                  <option value="">Select Customer</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Detailer Name</label>
                <select 
                  value={form.detailer_name || ''}
                  onChange={e => setForm({...form, detailer_name: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-500/5 transition-all appearance-none"
                >
                  <option value="">Select Detailer</option>
                  {detailers.map(d => (
                    <option key={d.id} value={d.name}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Project Manager</label>
                <input 
                  value={form.project_manager_name}
                  onChange={e => setForm({...form, project_manager_name: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-500/5 transition-all" 
                  placeholder="Enter PM name" 
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Erection Date</label>
                <input 
                  type="date"
                  value={form.erection_date}
                  onChange={e => setForm({...form, erection_date: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-500/5 transition-all" 
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Project Priority</label>
                <select 
                  value={form.priority}
                  onChange={e => setForm({...form, priority: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-500/5 transition-all appearance-none"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Project Status</label>
                <select 
                  value={form.status}
                  onChange={e => setForm({...form, status: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-500/5 transition-all appearance-none"
                >
                  <option value="Planning">Planning</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                  <option value="Delayed">Delayed</option>
                  <option value="On Hold">On Hold</option>
                </select>
              </div>
              <div className="lg:col-span-2 grid grid-cols-3 gap-4 p-4 rounded-2xl bg-amber-50/50 border border-amber-100">
                <div>
                  <label className="block text-[10px] font-bold text-amber-700 uppercase mb-1.5">Total Ton</label>
                  <input 
                    type="number"
                    value={form.total_ton}
                    onChange={e => setForm({...form, total_ton: e.target.value})}
                    className="w-full px-3 py-2 rounded-lg border border-amber-200 bg-white text-sm outline-none focus:border-amber-400" 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-amber-700 uppercase mb-1.5">Total Manhours</label>
                  <input 
                    type="number"
                    value={form.total_manhours}
                    onChange={e => setForm({...form, total_manhours: e.target.value})}
                    className="w-full px-3 py-2 rounded-lg border border-amber-200 bg-white text-sm outline-none focus:border-amber-400" 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-amber-700 uppercase mb-1.5">Manhour / Ton</label>
                  <div className="w-full px-3 py-2 rounded-lg bg-amber-100/50 text-amber-900 font-bold text-sm border border-amber-200 text-center">
                    {autocalculateManhourTon()}
                  </div>
                </div>
              </div>
            </div>
          </section>
          </div>
          )}

          {activeTab === "structural" && (
            <div className="flex-1 flex flex-col border border-slate-200 rounded-xl overflow-hidden animate-fade-in bg-white shadow-sm">
              <StructuralScheduleForm
                mode="edit"
                project={form}
                projects={projects}
                onProjectSelect={onProjectSelect}
                schedules={schedules}
                addScheduleRow={addScheduleRow}
                handleRowChange={handleScheduleChange}
                handleDeleteRow={handleDeleteSchedule}
                hideMetrics={false}
              />
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex justify-end gap-3 px-8 py-5 border-t border-slate-100 bg-slate-50/50">
          <button onClick={onClose} className="px-6 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-white transition-all shadow-sm">Cancel</button>
          {showTabs && activeTab === 'basic' ? (
            <button 
              onClick={(e) => { e.preventDefault(); setActiveTab('structural'); }}
              className="px-8 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-bold shadow-lg hover:bg-slate-800 transition-all flex items-center gap-2"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button 
              onClick={handleSave}
              disabled={loading}
              className="px-8 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-bold shadow-lg shadow-amber-500/20 hover:from-amber-400 hover:to-orange-400 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? 'Saving...' : <><Save className="w-4 h-4" /> Save Project</>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
