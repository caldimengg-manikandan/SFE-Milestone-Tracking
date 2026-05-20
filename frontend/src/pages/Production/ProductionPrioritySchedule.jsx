import { useState, useEffect, Fragment } from 'react';
import { Plus, Search, Edit2, Trash2, Eye, Filter, Download, ChevronLeft, ChevronRight, X, ClipboardList, FileText } from "lucide-react";
import ProductionScheduleForm from '../../components/forms/ProductionScheduleForm';
import { productionAPI } from '../../services/api';

export default function ProductionPrioritySchedule() {
  const [showModal, setShowModal] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [search, setSearch] = useState('');
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editSchedule, setEditSchedule] = useState(null);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const fetchSchedules = async () => {
    try {
      setLoading(true);
      const response = await productionAPI.getSchedules();
      setSchedules(response.data.results || response.data);
    } catch (error) {
      console.error('Error fetching schedules:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, []);

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '-';
    const d = date.getDate().toString().padStart(2, '0');
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const y = date.getFullYear();
    return `${d}-${m}-${y}`;
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this schedule and all its items?')) {
      try {
        await productionAPI.deleteSchedule(id);
        fetchSchedules();
      } catch (error) {
        alert('Failed to delete schedule');
      }
    }
  };

  const openAdd = () => {
    setEditSchedule(null);
    setShowModal(true);
  };

  const openEdit = (schedule) => {
    setEditSchedule(schedule);
    setShowModal(true);
  };

  const openPlan = (schedule) => {
    setSelectedSchedule(schedule);
    setShowPlanModal(true);
  };

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };


  const exportToCSV = () => {
    const headers = ["Schedule Number", "Start Date", "End Date"];
    const rows = filteredSchedules.map(s => [
      s.schedule_number,
      s.start_date,
      s.end_date
    ]);

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "production_schedules.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredSchedules = schedules.filter(s =>
    s.schedule_number.toLowerCase().includes(search.toLowerCase())
  );


  const totalPages = Math.ceil(filteredSchedules.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = filteredSchedules.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Control Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Schedule #..."
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
            onClick={openAdd}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-bold shadow-lg shadow-amber-500/20 hover:from-amber-400 hover:to-orange-400 transition-all"
          >
            <Plus className="w-4 h-4" /> New Schedule
          </button>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-lg border border-slate-200 p-12 text-center shadow-sm">
          <div className="animate-spin w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-sm text-slate-500">Loading schedules...</p>
        </div>
      ) : schedules.length === 0 ? (
        <div className="bg-white rounded-lg border border-slate-200 p-12 text-center shadow-sm">
          <div className="w-16 h-16 bg-gradient-to-br from-amber-100 to-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-amber-600" />
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-1">No production schedules yet</h3>
          <p className="text-sm text-slate-500 max-w-xs mx-auto">Click "New Schedule" to start defining your production priorities.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gradient-to-r from-amber-500 to-orange-500 text-white">
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider border-b border-white/10">Schedule Number</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider border-b border-white/10">Production Start Date</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider border-b border-white/10">Production End Date</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider border-b border-white/10 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedData.map((schedule) => (
                  <Fragment key={schedule.id}>
                    <tr
                      className={`hover:bg-slate-50/50 transition-colors group cursor-pointer text-[12px] ${expandedId === schedule.id ? 'bg-slate-50' : ''}`}
                      onClick={() => toggleExpand(schedule.id)}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 font-bold text-[10px] border transition-all ${expandedId === schedule.id ? 'bg-amber-500 text-white border-amber-600' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                            {schedule.schedule_number.split('-')[1] || '01'}
                          </div>
                          <span className="font-bold text-slate-800">{schedule.schedule_number}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600 font-medium">{formatDate(schedule.start_date)}</td>
                      <td className="px-6 py-4 text-slate-600 font-medium">{formatDate(schedule.end_date)}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={(e) => { e.stopPropagation(); openEdit(schedule); }}
                            className="p-1.5 rounded text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDelete(schedule.id); }}
                            className="p-1.5 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expandedId === schedule.id && (
                      <tr>
                        <td colSpan="4" className="px-0 py-4 bg-slate-50/50">
                          <div className="border-y border-slate-200 overflow-hidden shadow-inner bg-white animate-in slide-in-from-top-4 duration-300">
                            <table className="w-full text-left border-collapse">
                              <thead>
                                <tr className="bg-gradient-to-r from-amber-500 to-orange-500 text-white">
                                  <th className="px-4 py-3 text-[9px] font-black uppercase tracking-wider w-20 text-center">Serial No.</th>
                                  <th className="px-4 py-3 text-[9px] font-black uppercase tracking-wider">Job #</th>
                                  <th className="px-4 py-3 text-[9px] font-black uppercase tracking-wider text-center">Seq #</th>
                                  <th className="px-4 py-3 text-[9px] font-black uppercase tracking-wider text-center">Weight</th>
                                  <th className="px-4 py-3 text-[9px] font-black uppercase tracking-wider text-center">Quantity</th>
                                  <th className="px-4 py-3 text-[9px] font-black uppercase tracking-wider">RTS Date</th>
                                  <th className="px-4 py-3 text-[9px] font-black uppercase tracking-wider">Status</th>
                                  <th className="px-4 py-3 text-[9px] font-black uppercase tracking-wider">Ship Date</th>
                                  <th className="px-4 py-3 text-[9px] font-black uppercase tracking-wider">Notes</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {(() => {
                                  const sortedItems = [...(schedule.items || [])].sort((a, b) => {
                                    // 1. RTS Date (Soonest first)
                                    const dateA = new Date(a.rts_date || '9999-12-31');
                                    const dateB = new Date(b.rts_date || '9999-12-31');
                                    if (dateA - dateB !== 0) return dateA - dateB;

                                    // 2. Sequence (Lowest first)
                                    const seqA = parseFloat(a.sequence_number) || 999;
                                    const seqB = parseFloat(b.sequence_number) || 999;
                                    if (seqA !== seqB) return seqA - seqB;

                                    // 3. Schedule Erection Date (Soonest first)
                                    const erecA = new Date(a.scheduled_erection_date || '9999-12-31');
                                    const erecB = new Date(b.scheduled_erection_date || '9999-12-31');
                                    if (erecA - erecB !== 0) return erecA - erecB;

                                    // 4. Project Priority (High > Medium > Low)
                                    const priorityMap = { 'High': 1, 'Medium': 2, 'Low': 3 };
                                    const priA = priorityMap[a.project_priority] || 4;
                                    const priB = priorityMap[b.project_priority] || 4;
                                    return priA - priB;
                                  });

                                  return sortedItems.length > 0 ? sortedItems.map((item, idx) => {
                                    const calculateStatus = () => {
                                      const shipDate = item.ship_date ? new Date(item.ship_date) : null;

                                      if (shipDate) {
                                        return { label: 'COMPLETED', color: 'text-emerald-600', bg: 'bg-emerald-50', dot: 'bg-emerald-500' };
                                      }

                                      if (!item.rts_date) {
                                        return { label: 'TBD', color: 'text-slate-400', bg: 'bg-slate-100', dot: 'bg-slate-400' };
                                      }

                                      const rtsDate = new Date(item.rts_date);
                                      const twoDaysFromNow = new Date();
                                      twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);

                                      if (rtsDate > twoDaysFromNow) {
                                        return { label: 'YET TO START', color: 'text-blue-600', bg: 'bg-blue-50', dot: 'bg-blue-500' };
                                      } else {
                                        return { label: 'UNDER PROGRESS', color: 'text-amber-600', bg: 'bg-amber-50', dot: 'bg-amber-500' };
                                      }
                                    };

                                    const status = calculateStatus();

                                    return (
                                      <tr key={idx} className="hover:bg-slate-50/50 transition-colors text-[11px]">
                                        <td className="px-4 py-3 text-center">
                                          <span className="w-6 h-6 inline-flex items-center justify-center rounded bg-amber-100 text-amber-700 font-bold text-[9px]">
                                            {idx + 1}
                                          </span>
                                        </td>
                                        <td className="px-4 py-3 font-bold text-slate-800">{item.job_number}</td>
                                        <td className="px-4 py-3 text-center text-slate-600 font-bold">{item.sequence_number}</td>
                                        <td className="px-4 py-3 text-center text-orange-600 font-black">{item.weight}</td>
                                        <td className="px-4 py-3 text-center text-slate-500 font-bold">{item.quantity}</td>
                                        <td className="px-4 py-3 text-slate-600 font-medium">{formatDate(item.rts_date)}</td>
                                        <td className="px-4 py-3">
                                          <div className={`flex items-center justify-center gap-1.5 px-2 py-0.5 rounded-full text-[8px] font-black tracking-tight ${status.bg} ${status.color} border border-current/10 whitespace-nowrap w-fit`}>
                                            <div className={`w-1 h-1 rounded-full ${status.dot}`} />
                                            {status.label}
                                          </div>
                                        </td>
                                        <td className="px-4 py-2">
                                          <input
                                            type="date"
                                            value={item.ship_date || ''}
                                            onChange={async (e) => {
                                              const newDate = e.target.value || null;
                                              try {
                                                await productionAPI.updateItem(item.id, { ship_date: newDate });
                                                fetchSchedules();
                                              } catch (err) {
                                                console.error('Failed to update ship date:', err);
                                                alert('Failed to update ship date');
                                              }
                                            }}
                                            className="px-2 py-1 rounded border border-slate-300 focus:border-amber-400 outline-none text-[11px] bg-white text-slate-700 font-medium w-[120px] transition-all"
                                          />
                                        </td>
                                        <td className="px-4 py-3 text-slate-400 italic text-[10px]">{item.notes || '—'}</td>
                                      </tr>
                                    );
                                  }) : (
                                    <tr>
                                      <td colSpan="9" className="px-6 py-8 text-center text-slate-400 italic">No production items defined for this schedule</td>
                                    </tr>
                                  );
                                })()}
                              </tbody>
                            </table>
                            <div className="bg-slate-50 px-6 py-2 border-t border-slate-100 flex items-center">
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{schedule.items?.length || 0} Production Items Tracked</span>
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

          {/* Pagination Footer */}
          <div className="bg-slate-50 px-6 py-3 border-t border-slate-100 flex items-center justify-between">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              {filteredSchedules.length} {filteredSchedules.length === 1 ? 'Record' : 'Records'} Found
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => prev - 1)}
                className="p-1.5 rounded border border-slate-200 bg-white text-slate-600 disabled:opacity-40 hover:bg-slate-50"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-1">
                {[...Array(totalPages)].map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentPage(i + 1)}
                    className={`w-7 h-7 rounded text-[10px] font-bold transition-all ${currentPage === i + 1 ? 'bg-amber-500 text-white shadow-md' : 'text-slate-600 hover:bg-slate-200'}`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => prev + 1)}
                className="p-1.5 rounded border border-slate-200 bg-white text-slate-600 disabled:opacity-40 hover:bg-slate-50"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <ProductionScheduleForm
          onClose={() => setShowModal(false)}
          onSuccess={fetchSchedules}
          editSchedule={editSchedule}
          nextNumber={schedules.length + 1}
        />
      )}
    </div>
  );
}
