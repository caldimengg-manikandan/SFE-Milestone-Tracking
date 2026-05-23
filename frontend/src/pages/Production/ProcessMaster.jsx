import { useState, useEffect, Fragment, useRef } from 'react';
import { Plus, Search, Edit2, Trash2, Eye, Loader2, Columns, Download, ChevronRight } from 'lucide-react';
import ProcessMasterForm from '../../components/forms/ProcessMasterForm';
import { priorityAPI, scheduleAPI, projectAPI } from '../../services/api';

export default function ProcessMaster() {
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');
  const [scheduleFilter, setScheduleFilter] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const filterRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (filterRef.current && !filterRef.current.contains(event.target)) {
        setShowFilters(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  const [records, setRecords] = useState([]);
  const [structuralItems, setStructuralItems] = useState([]);
  const [projects, setProjects] = useState([]);
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
      const [priorityRes, structRes, projRes] = await Promise.all([
        priorityAPI.getAll(),
        scheduleAPI.getAll(),
        projectAPI.getAll(),
      ]);
      setRecords(priorityRes.data.results || priorityRes.data);
      setStructuralItems(structRes.data.results || structRes.data);
      setProjects(projRes.data.results || projRes.data);
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
    return `${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}-${date.getFullYear()}`;
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

  const uniqueProjectNames = [...new Set(Object.values(groupedRecords).flatMap(r => r.project_names ? r.project_names.split(', ') : []))].filter(Boolean);

  const displayRows = Object.values(groupedRecords).filter(r => {
    if (scheduleFilter && r.schedule_number !== scheduleFilter) return false;
    if (projectFilter && !r.project_names?.includes(projectFilter)) return false;
    return r.schedule_number?.toLowerCase().includes(search.toLowerCase()) ||
           r.project_names?.toLowerCase().includes(search.toLowerCase()) ||
           r.project_codes?.toLowerCase().includes(search.toLowerCase());
  });

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

  const handleExportCSV = () => {
    if (!displayRows || !displayRows.length) return;
    
    const headers = ['Schedule Number', 'Project Name', 'Project Code', 'Process Types', 'Total Items'];
    
    const csvRows = displayRows.map(row => {
      const escape = (text) => `"${String(text || '').replace(/"/g, '""')}"`;
      return [
        escape(row.schedule_number),
        escape(row.project_names),
        escape(row.project_codes),
        escape(row.process_types),
        row.total_items || 0
      ].join(',');
    });

    const csvString = [headers.join(','), ...csvRows].join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `Process_Master_Export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="h-[calc(100vh-72px)] -m-4 sm:-m-6 lg:-m-8 bg-slate-50/30 flex flex-col overflow-hidden">
      <div className="flex-none bg-white border-b border-slate-200 shadow-sm z-30 p-3 lg:px-6 space-y-3 animate-fade-in" ref={filterRef}>
        {/* Search and Action Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search projects by name, code or schedule..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 bg-white text-xs outline-none focus:border-amber-400 transition-all"
            />
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-bold transition-all ${showFilters ? 'bg-amber-50 text-amber-600 border-amber-200 shadow-inner' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
            >
              <Columns className="w-3.5 h-3.5" /> Filters
            </button>
            <button 
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-600 text-xs font-bold hover:bg-slate-50 transition-all"
            >
              <Download className="w-3.5 h-3.5" /> Export CSV
            </button>
            <button
              onClick={openNew}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold shadow-sm hover:from-amber-400 hover:to-orange-400 transition-all transform active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" /> New Record
            </button>
          </div>
        </div>

        {/* Expandable Inline Filters */}
        {showFilters && (
          <div className="flex flex-col md:flex-row gap-4 pt-3 border-t border-slate-100 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="w-full md:w-48">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-0.5">Schedule Number</label>
              <div className="relative">
                <select 
                  value={scheduleFilter}
                  onChange={(e) => setScheduleFilter(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-md border border-slate-200 bg-slate-50 text-xs font-bold text-slate-700 outline-none focus:border-amber-400 focus:bg-white transition-all cursor-pointer appearance-none"
                >
                  <option value="">All Schedules</option>
                  {Object.keys(groupedRecords).map(sched => (
                    <option key={sched} value={sched}>{sched}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
                  <ChevronRight className="w-3 h-3 rotate-90" />
                </div>
              </div>
            </div>
            <div className="w-full md:w-56">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-0.5">Project Name</label>
              <div className="relative">
                <select 
                  value={projectFilter}
                  onChange={(e) => setProjectFilter(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-md border border-slate-200 bg-slate-50 text-xs font-bold text-slate-700 outline-none focus:border-amber-400 focus:bg-white transition-all cursor-pointer appearance-none"
                >
                  <option value="">All Projects</option>
                  {uniqueProjectNames.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
                  <ChevronRight className="w-3 h-3 rotate-90" />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-hidden flex flex-col p-3 lg:p-6 bg-slate-50/50">
        {loading ? (
          <div className="flex flex-col items-center justify-center flex-1 bg-white rounded-xl border border-slate-200 shadow-sm">
            <Loader2 className="w-12 h-12 text-amber-500 animate-spin mb-4" />
            <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Fetching Production Data...</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col min-h-0 overflow-hidden animate-fade-in">
            <div className="overflow-auto min-h-0">
              <table className="w-full text-left border-collapse relative">
                <thead className="sticky top-0 z-10 shadow-sm">
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
                                className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter border transition-all hover:scale-105 active:scale-95 ${activeSubFilter === moduleType && expandedId === row.schedule_number
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
                        <tr className="bg-slate-50/30">
                          <td colSpan="6" className="px-0 py-0 border-b border-slate-200">
                            <div className="overflow-hidden animate-in slide-in-from-top-2 duration-300">
                              <div className="bg-white border border-slate-200 mx-3 my-2 rounded-xl shadow-sm overflow-hidden">
                                <table className="w-full text-left border-collapse">
                                  <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200">
                                      <th className="px-3 py-1.5 text-[8px] font-black text-slate-500 uppercase tracking-widest text-center w-12">Serial</th>
                                      <th className="px-3 py-1.5 text-[8px] font-black text-slate-500 uppercase tracking-widest">Process / Job</th>
                                      <th className="px-3 py-1.5 text-[8px] font-black text-slate-500 uppercase tracking-widest text-center w-16">Seq #</th>
                                      <th className="px-3 py-1.5 text-[8px] font-black text-slate-500 uppercase tracking-widest text-center">Weight</th>
                                      <th className="px-3 py-1.5 text-[8px] font-black text-slate-500 uppercase tracking-widest">RTS Date</th>
                                      <th className="px-3 py-1.5 text-[8px] font-black text-slate-500 uppercase tracking-widest text-center">Run Days</th>
                                      <th className="px-3 py-1.5 text-[8px] font-black text-slate-500 uppercase tracking-widest">Start Run Date</th>
                                      <th className="px-3 py-1.5 text-[8px] font-black text-slate-500 uppercase tracking-widest">Complete Run Date</th>
                                      <th className="px-3 py-1.5 text-[8px] font-black text-slate-500 uppercase tracking-widest">Notes</th>
                                    </tr>
                                  </thead>
                                   <tbody className="divide-y divide-slate-50">
                                    {(() => {
                                      // Build a live lookup: "jobCode__seqNo" -> { tons, rts_date }
                                      // so the sub-table always shows the current weight from Project Master
                                      const weightLookup = {};
                                      structuralItems.forEach(si => {
                                        const proj = projects.find(p =>
                                          String(p.id) === String(si.project) ||
                                          (si.project?.id && String(si.project.id) === String(p.id))
                                        );
                                        if (proj) {
                                          weightLookup[`${proj.code}__${si.seq_no}`] = {
                                            tons: si.tons,
                                            rts_date: si.rts_date,
                                          };
                                        }
                                      });

                                      const flatItems = [];
                                      getSubTableData(row.schedule_number).forEach((prec) => {
                                        const rate = parseFloat(prec.rate) || 0;
                                        prec.items?.forEach((item) => {
                                          const liveData = weightLookup[`${item.job_number}__${item.sequence_number}`];
                                          const liveWeight = liveData ? parseFloat(liveData.tons) : (parseFloat(item.weight) || 0);
                                          const liveRtsDate = liveData?.rts_date || item.rts_date;
                                          const runDays = (rate > 0 && liveWeight > 0) ? Math.ceil(liveWeight / rate) : '-';
                                          flatItems.push({
                                            prec,
                                            item,
                                            liveWeight,
                                            liveRtsDate,
                                            runDays,
                                          });
                                        });
                                      });

                                      // Sort flatItems according to RTS date
                                      flatItems.sort((a, b) => {
                                        // 1. RTS Date (Soonest first)
                                        const dateA = a.liveRtsDate ? new Date(a.liveRtsDate).getTime() : Infinity;
                                        const dateB = b.liveRtsDate ? new Date(b.liveRtsDate).getTime() : Infinity;

                                        // Handle invalid dates
                                        const isInvalidA = isNaN(dateA);
                                        const isInvalidB = isNaN(dateB);

                                        if (isInvalidA && isInvalidB) {
                                          // Secondary sort: Sequence Number
                                          const seqA = parseFloat(a.item.sequence_number) || 999;
                                          const seqB = parseFloat(b.item.sequence_number) || 999;
                                          return seqA - seqB;
                                        }
                                        if (isInvalidA) return 1;
                                        if (isInvalidB) return -1;

                                        if (dateA !== dateB) return dateA - dateB;

                                        // Secondary sort: Sequence Number
                                        const seqA = parseFloat(a.item.sequence_number) || 999;
                                        const seqB = parseFloat(b.item.sequence_number) || 999;
                                        return seqA - seqB;
                                      });

                                      if (flatItems.length === 0) {
                                        return (
                                          <tr>
                                            <td colSpan="9" className="px-6 py-8 text-center text-slate-400 italic">No items found for the selected process type.</td>
                                          </tr>
                                        );
                                      }

                                      return flatItems.map(({ prec, item, liveWeight, liveRtsDate, runDays }, idx) => {
                                        return (
                                          <tr key={`${prec.id}-${idx}`} className="hover:bg-slate-50/30 transition-colors text-[10px]">
                                            <td className="px-3 py-1.5 text-center">
                                              <span className="inline-flex items-center justify-center w-4 h-4 rounded bg-slate-100 text-slate-500 font-bold text-[8px]">{idx + 1}</span>
                                            </td>
                                            <td className="px-3 py-1.5">
                                              <div className="flex flex-col">
                                                <span className="text-[8px] font-black text-amber-600 uppercase tracking-tighter">{prec.process_type}</span>
                                                <span className="font-bold text-slate-800">{item.job_number}</span>
                                              </div>
                                            </td>
                                            <td className="px-3 py-1.5 text-center font-bold text-slate-500">{item.sequence_number}</td>
                                            <td className="px-3 py-1.5 text-center font-black text-orange-600">{liveWeight > 0 ? liveWeight.toFixed(2) : '0.00'}</td>
                                            <td className="px-3 py-1.5 text-slate-500 font-medium">{formatDate(liveRtsDate)}</td>
                                            <td className="px-3 py-1.5 text-center font-bold text-slate-600">{runDays}</td>
                                            <td className="px-3 py-1.5 text-slate-900 font-bold">{formatDate(item.actual_ofa) || '-'}</td>
                                            <td className="px-3 py-1.5 text-slate-900 font-bold">{formatDate(item.complete_run_date) || '-'}</td>
                                            <td className="px-3 py-1.5 text-slate-400 italic text-[9px]">{item.notes || '-'}</td>
                                          </tr>
                                        );
                                      });
                                    })()}
                                  </tbody>
                                </table>
                                <div className="px-4 py-1.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                                    {activeSubFilter ? `Filtered by ${activeSubFilter}` : 'All Processes View'}
                                  </span>
                                  <button
                                    onClick={() => toggleExpand(row.schedule_number)}
                                    className="text-[8px] font-black text-amber-600 uppercase tracking-widest hover:underline"
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
            <div className="flex-none bg-slate-50 px-6 py-4 flex items-center justify-between border-t border-slate-200">
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                {displayRows.length} Records Found
              </div>
              <div className="flex items-center gap-1.5">
                <button className="p-1.5 rounded-md border border-slate-200 bg-white text-slate-400 opacity-50"><ChevronRight className="w-4 h-4 rotate-180" /></button>
                <button className="w-7 h-7 rounded-md bg-[#f28c28] text-white text-xs font-black flex items-center justify-center shadow-sm">1</button>
                <button className="p-1.5 rounded-md border border-slate-200 bg-white text-slate-400"><ChevronRight className="w-4 h-4" /></button>
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
