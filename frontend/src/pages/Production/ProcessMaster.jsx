import { useState, useEffect, Fragment } from 'react';
import { Plus, Search, Edit2, Trash2, Eye, Loader2, Columns, Download, ChevronRight } from 'lucide-react';
import ProcessMasterForm from '../../components/forms/ProcessMasterForm';
import { priorityAPI } from '../../services/api';

export default function ProcessMaster() {
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editRecord, setEditRecord] = useState(null);
  const [selectedScheduleId, setSelectedScheduleId] = useState(null);
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

  const handleDelete = async (row) => {
    if (!window.confirm(`Delete all process records for schedule "${row.schedule_number}"?`)) return;
    try {
      await Promise.all(row.processes.map(p => priorityAPI.delete(p.id)));
      fetchRecords();
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete one or more records. Please try again.');
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

  // Group records by schedule_number
  const groupedRecords = records.reduce((acc, curr) => {
    const key = curr.schedule_number || 'N/A';
    if (!acc[key]) {
      acc[key] = {
        schedule_number: key,
        schedule_id: curr.schedule,
        project_names: curr.project_names,
        project_codes: curr.project_codes,
        processes: [],
        total_items: 0,
        last_updated: curr.created_at,
        original: curr
      };
    }
    acc[key].processes.push({ id: curr.id, type: curr.process_type, module: curr.module_type });
    acc[key].total_items += curr.items?.length || 0;
    return acc;
  }, {});

  const displayRows = Object.values(groupedRecords).filter(r => 
    r.schedule_number?.toLowerCase().includes(search.toLowerCase()) ||
    r.project_names?.toLowerCase().includes(search.toLowerCase()) ||
    r.project_codes?.toLowerCase().includes(search.toLowerCase())
  );

  const [expandedId, setExpandedId] = useState(null);
  const [activeSubFilter, setActiveSubFilter] = useState(null);

  const toggleExpand = (scheduleNum, subFilter = null) => {
    if (expandedId === scheduleNum && activeSubFilter === subFilter) {
      setExpandedId(null);
      setActiveSubFilter(null);
    } else {
      setExpandedId(scheduleNum);
      setActiveSubFilter(subFilter);
    }
  };

  const getSubTableData = (scheduleNum) => {
    const group = groupedRecords[scheduleNum];
    if (!group) return [];
    
    // Get all records for this schedule
    let allRecords = records.filter(r => r.schedule_number === scheduleNum);
    
    // Filter by module if activeSubFilter is set
    if (activeSubFilter) {
      allRecords = allRecords.filter(r => r.module_type === activeSubFilter);
    }
    
    return allRecords;
  };

  return (
    <div className="min-h-screen bg-slate-50/30 p-4 lg:p-8 space-y-6">
      <div className="space-y-6 animate-fade-in">
      {/* Search and Action Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative flex-1 max-w-2xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search projects by name, code or schedule..." 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
            className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-100 bg-slate-50 text-sm outline-none focus:border-amber-400 focus:bg-white transition-all shadow-inner" 
          />
        </div>
        <div className="flex items-center gap-3">
          <button className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 text-sm font-bold hover:bg-slate-50 transition-all">
            <Columns className="w-4 h-4" /> Filters
          </button>
          <button className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 text-sm font-bold hover:bg-slate-50 transition-all">
            <Download className="w-4 h-4" /> Export CSV
          </button>
          <button 
            onClick={openNew} 
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-bold shadow-lg shadow-amber-500/20 hover:from-amber-400 hover:to-orange-400 transition-all transform active:scale-95"
          >
            <Plus className="w-5 h-5" /> New Record
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm">
          <Loader2 className="w-12 h-12 text-amber-500 animate-spin mb-4" />
          <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Fetching Production Data...</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-fade-in">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#f28c28] text-white">
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest border-b border-white/10">Schedule Number</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest border-b border-white/10">Project Name</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest border-b border-white/10">Code</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest border-b border-white/10">Process Type</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest border-b border-white/10 text-center">Total Items</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest border-b border-white/10 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayRows.map((row) => (
                  <Fragment key={row.schedule_number}>
                    <tr 
                      className={`hover:bg-slate-50/50 transition-colors group text-[12px] cursor-pointer ${expandedId === row.schedule_number ? 'bg-slate-50' : ''}`}
                      onClick={() => toggleExpand(row.schedule_number)}
                    >
                      <td className="px-6 py-4 font-black text-slate-700">
                        {row.schedule_number}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          {(row.project_names || '').split(', ').map((name, i) => (
                            <span key={i} className="font-bold text-slate-900 uppercase block">{name}</span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          {(row.project_codes || '').split(', ').map((code, i) => (
                            <span key={i} className="font-mono text-slate-500 block">{code}</span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1.5">
                          {Array.from(new Set(row.processes.map(p => p.module))).map(moduleType => (
                            <button 
                              key={moduleType} 
                              onClick={(e) => { e.stopPropagation(); toggleExpand(row.schedule_number, moduleType); }}
                              className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter border transition-all hover:scale-105 active:scale-95 ${
                                activeSubFilter === moduleType && expandedId === row.schedule_number
                                  ? 'bg-slate-900 text-white border-slate-900 shadow-md'
                                  : moduleType === 'PLATE' ? 'bg-amber-50 text-amber-600 border-amber-100 hover:bg-amber-100' : 
                                    moduleType === 'ANGLE' ? 'bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-100' : 
                                    'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100'
                              }`}
                            >
                              {moduleType}
                            </button>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center font-bold text-slate-600">
                        {row.total_items}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button 
                            onClick={(e) => { e.stopPropagation(); openEdit(row.original); }}
                            className="p-1.5 rounded text-amber-500 hover:bg-amber-50 transition-all"
                            title="View"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); openEdit(row.original); }}
                            className="p-1.5 rounded text-blue-500 hover:bg-blue-50 transition-all"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleDelete(row); }}
                            className="p-1.5 rounded text-red-500 hover:bg-red-50 transition-all"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expandedId === row.schedule_number && (
                      <tr className="bg-slate-50/50">
                        <td colSpan="6" className="px-0 py-0 border-b border-slate-200">
                          <div className="overflow-hidden animate-in slide-in-from-top-2 duration-300">
                            <div className="bg-white border-x border-slate-100 mx-6 my-4 rounded-2xl shadow-inner border border-slate-200 overflow-hidden">
                              <table className="w-full text-left border-collapse">
                                <thead>
                                  <tr className="bg-slate-100/80 border-b border-slate-200">
                                    <th className="px-4 py-3 text-[9px] font-black text-slate-500 uppercase tracking-widest text-center w-16">Serial</th>
                                    <th className="px-4 py-3 text-[9px] font-black text-slate-500 uppercase tracking-widest">Process / Job</th>
                                    <th className="px-4 py-3 text-[9px] font-black text-slate-500 uppercase tracking-widest text-center w-20">Seq #</th>
                                    <th className="px-4 py-3 text-[9px] font-black text-slate-500 uppercase tracking-widest text-center">Weight</th>
                                    <th className="px-4 py-3 text-[9px] font-black text-slate-500 uppercase tracking-widest">Sched. OFA</th>
                                    <th className="px-4 py-3 text-[9px] font-black text-slate-500 uppercase tracking-widest">Actual OFA</th>
                                    <th className="px-4 py-3 text-[9px] font-black text-slate-500 uppercase tracking-widest">Sched. BFA</th>
                                    <th className="px-4 py-3 text-[9px] font-black text-slate-500 uppercase tracking-widest">Actual BFA</th>
                                    <th className="px-4 py-3 text-[9px] font-black text-slate-500 uppercase tracking-widest">Notes</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                  {getSubTableData(row.schedule_number).map((prec) => (
                                    prec.items?.map((item, iIdx) => (
                                      <tr key={`${prec.id}-${iIdx}`} className="hover:bg-slate-50/30 transition-colors text-[11px]">
                                        <td className="px-4 py-2.5 text-center">
                                          <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-slate-100 text-slate-500 font-bold text-[9px]">{iIdx + 1}</span>
                                        </td>
                                        <td className="px-4 py-2.5">
                                          <div className="flex flex-col">
                                            <span className="text-[10px] font-black text-amber-600 uppercase tracking-tighter">{prec.process_type}</span>
                                            <span className="font-bold text-slate-800">{item.job_number}</span>
                                          </div>
                                        </td>
                                        <td className="px-4 py-2.5 text-center font-bold text-slate-500">{item.sequence_number}</td>
                                        <td className="px-4 py-2.5 text-center font-black text-orange-600">{item.weight}</td>
                                        <td className="px-4 py-2.5 text-slate-500 font-medium">{formatDate(item.rts_date)}</td>
                                        <td className="px-4 py-2.5 text-slate-900 font-bold">{formatDate(item.actual_ofa) || '-'}</td>
                                        <td className="px-4 py-2.5 text-slate-500 font-medium">{formatDate(item.complete_run_date)}</td>
                                        <td className="px-4 py-2.5 text-slate-900 font-bold">{formatDate(item.actual_bfa) || '-'}</td>
                                        <td className="px-4 py-2.5 text-slate-400 italic text-[10px]">{item.notes || '-'}</td>
                                      </tr>
                                    ))
                                  ))}
                                  {getSubTableData(row.schedule_number).length === 0 && (
                                    <tr>
                                      <td colSpan="9" className="px-6 py-8 text-center text-slate-400 italic">No items found for the selected process type.</td>
                                    </tr>
                                  )}
                                </tbody>
                              </table>
                              <div className="px-6 py-2 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                  {activeSubFilter ? `Filtered by ${activeSubFilter}` : 'All Processes View'}
                                </span>
                                <button 
                                  onClick={() => toggleExpand(row.schedule_number)}
                                  className="text-[9px] font-black text-amber-600 uppercase tracking-widest hover:underline"
                                >
                                  Close Sub-Table
                                </button>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
          {/* Footer Pagination */}
          <div className="bg-slate-50 px-6 py-4 flex items-center justify-between border-t border-slate-100">
             <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
               {records.length} Records Found
             </div>
             <div className="flex items-center gap-1.5">
               <button className="p-2 rounded-lg border border-slate-200 bg-white text-slate-400 opacity-50"><ChevronRight className="w-4 h-4 rotate-180" /></button>
               <button className="w-8 h-8 rounded-lg bg-[#f28c28] text-white text-xs font-black flex items-center justify-center shadow-md shadow-orange-500/20">1</button>
               <button className="p-2 rounded-lg border border-slate-200 bg-white text-slate-400"><ChevronRight className="w-4 h-4" /></button>
             </div>
          </div>
        </div>
      )}
      </div>

      {showModal && (
        <ProcessMasterForm 
          onClose={() => { setShowModal(false); setSelectedScheduleId(null); }} 
          onSuccess={fetchRecords}
          editRecord={editRecord}
          preselectedScheduleId={selectedScheduleId}
        />
      )}

      <style>{`
        @keyframes fade-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fade-in 0.3s ease-out forwards; }
      `}</style>
    </div>
  );
}
