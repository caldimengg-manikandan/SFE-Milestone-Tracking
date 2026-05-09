import { useState, useEffect } from 'react';
import { Plus, Search, FileText, Calendar, Edit2, Trash2, ClipboardList, Eye, Loader2, X, Download, Columns, LayoutGrid, Layers, Zap, Info, Save, ChevronRight, CheckCircle2 } from 'lucide-react';
import ProcessMasterForm from '../../components/forms/ProcessMasterForm';
import { priorityAPI } from '../../services/api';

export default function ProcessMaster() {
  const [showModal, setShowModal] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [search, setSearch] = useState('');
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editRecord, setEditRecord] = useState(null);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [selectedScheduleId, setSelectedScheduleId] = useState(null);
  const [isSaving, setIsSaving] = useState(null);

  const fetchRecords = async () => {
    try {
      setLoading(true);
      const response = await priorityAPI.getAll();
      setRecords(response.data.results || response.data);
    } catch (error) {
      console.error('Error fetching records:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '-';
    return `${date.getDate().toString().padStart(2, '0')}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getFullYear()}`;
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this record?')) {
      try {
        await priorityAPI.delete(id);
        fetchRecords();
      } catch (error) {
        alert('Failed to delete record');
      }
    }
  };

  const openNew = () => {
    setEditRecord(null);
    setSelectedScheduleId(null);
    setShowModal(true);
  };

  const openEdit = (record) => {
    setEditRecord(record);
    setSelectedScheduleId(null);
    setShowModal(true);
  };

  const openView = (record) => { setSelectedRecord(record); setShowPlanModal(true); };
  const handlePrint = () => { window.print(); };

  // Filter records based on search
  const filteredSchedules = Array.from(new Set(records.map(r => r.schedule_number)))
    .filter(num => num?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Process Master</h2>
          <p className="text-sm text-slate-500 mt-1 font-medium">Project-centric production tracking dashboard</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search projects..." 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
              className="pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-amber-400 transition-all w-64 shadow-sm" 
            />
          </div>
          <button onClick={openNew} className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-900 text-white text-sm font-black shadow-lg hover:bg-slate-800 transition-all transform active:scale-95">
            <Plus className="w-4 h-4" /> New Record
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm">
          <Loader2 className="w-12 h-12 text-amber-500 animate-spin mb-4" />
          <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Fetching Production Data...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-fade-in">
          {filteredSchedules.map(scheduleNumber => {
            const scheduleRecords = records.filter(r => r.schedule_number === scheduleNumber);
            const scheduleId = scheduleRecords[0]?.schedule;
            
            return (
              <div key={scheduleNumber} className="bg-white rounded-[2.5rem] border border-slate-200/60 p-8 shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all group border-t-8 border-t-amber-500">
                <div className="flex items-start justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-3xl bg-amber-50 text-amber-600 flex items-center justify-center shadow-sm">
                      <ClipboardList className="w-8 h-8" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-slate-900 tracking-tight">{scheduleNumber}</h3>
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">Active Project</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      setEditRecord(null);
                      setSelectedScheduleId(scheduleId);
                      setShowModal(true);
                    }}
                    className="p-3 rounded-2xl bg-slate-900 text-white hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/10"
                    title="Add Priority"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4 mb-8">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-2">Active Priorities</h4>
                  <div className="flex flex-wrap gap-2">
                    {scheduleRecords.map(p => (
                      <div key={p.id} className={`group/p pl-4 pr-2 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3 border transition-all
                        ${p.module_type === 'PLATE' ? 'bg-amber-50 border-amber-100 text-amber-600 hover:bg-amber-100' : 
                          p.module_type === 'ANGLE' ? 'bg-blue-50 border-blue-100 text-blue-600 hover:bg-blue-100' : 
                          'bg-emerald-50 border-emerald-100 text-emerald-600 hover:bg-emerald-100'}`}>
                        <div className="flex items-center gap-2">
                          <Zap className="w-3 h-3" />
                          {p.process_type}
                        </div>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleDelete(p.id); }}
                          className="w-5 h-5 rounded-md flex items-center justify-center hover:bg-white/50 text-slate-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    {scheduleRecords.length === 0 && (
                      <p className="text-xs text-slate-400 font-medium italic">No priorities added yet.</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                   <div className="flex -space-x-2">
                     {scheduleRecords.slice(0, 3).map((_, i) => (
                       <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-400">
                         {i + 1}
                       </div>
                     ))}
                     {scheduleRecords.length > 3 && (
                       <div className="w-8 h-8 rounded-full border-2 border-white bg-amber-500 flex items-center justify-center text-[10px] font-bold text-white">
                         +{scheduleRecords.length - 3}
                       </div>
                     )}
                   </div>
                   <button 
                    onClick={() => {
                      setSelectedRecord(scheduleRecords[0]);
                      setShowPlanModal(true);
                    }}
                    className="text-[10px] font-black text-amber-600 uppercase tracking-widest hover:underline"
                   >
                     View Full Plan
                   </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showPlanModal && selectedRecord && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-7xl flex flex-col overflow-hidden max-h-[90vh]">
            <div className="flex items-center justify-between px-8 py-6 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-500 flex items-center justify-center text-white shadow-lg shadow-amber-500/20"><Eye className="w-6 h-6" /></div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Project Plan: {selectedRecord.schedule_number}</h3>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Comprehensive Production View</p>
                </div>
              </div>
              <div className="flex items-center gap-3 no-print">
                <button onClick={handlePrint} className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-bold hover:shadow-lg transition-all transform active:scale-95"><Download className="w-4 h-4" /> Download PDF</button>
                <button onClick={() => setShowPlanModal(false)} className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"><X className="w-6 h-6" /></button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-8">
              {/* Detailed tables could be added here similar to previous version if needed */}
              <p className="text-center text-slate-400 italic">Select a process within the dashboard to see detailed tracking items.</p>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <ProcessMasterForm 
          onClose={() => { setShowModal(false); setSelectedScheduleId(null); }} 
          onSuccess={fetchRecords}
          editRecord={editRecord}
          preselectedScheduleId={selectedScheduleId}
        />
      )}

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in { animation: fade-in 0.3s ease-out forwards; }
      `}</style>
    </div>
  );
}
