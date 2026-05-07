import { useState, useEffect } from 'react';
import { Plus, Search, FileText, Edit2, Trash2, Calendar, Package, MoreVertical, LayoutGrid, List, Eye, ClipboardList } from 'lucide-react';
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

  const handlePrint = () => {
    window.print();
  };

  const filteredSchedules = schedules.filter(s => 
    s.schedule_number.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Production Priority Schedule</h2>
          <p className="text-sm text-slate-500 mt-0.5">Manage production records and schedules</p>
        </div>
        <button 
          onClick={openAdd} 
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-bold shadow-lg shadow-amber-500/20 hover:from-amber-400 hover:to-orange-400 transition-all hover:shadow-xl"
        >
          <Plus className="w-4 h-4" /> New Schedule
        </button>
      </div>

      {/* Filters */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input 
          type="text" 
          placeholder="Search by Schedule #..." 
          value={search} 
          onChange={(e) => setSearch(e.target.value)} 
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-500/10 transition-all" 
        />
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200/60 p-12 text-center shadow-card">
          <div className="animate-spin w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-sm text-slate-500">Loading schedules...</p>
        </div>
      ) : schedules.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/60 p-12 text-center shadow-card">
          <div className="w-16 h-16 bg-gradient-to-br from-amber-100 to-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-amber-600" />
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-1">No production schedules yet</h3>
          <p className="text-sm text-slate-500 max-w-xs mx-auto">Click "New Schedule" to start defining your production priorities.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="text-left px-8 py-5 text-xs font-bold text-slate-500 uppercase tracking-wider">Schedule Number</th>
                  <th className="text-left px-8 py-5 text-xs font-bold text-slate-500 uppercase tracking-wider">Production Start Date</th>
                  <th className="text-left px-8 py-5 text-xs font-bold text-slate-500 uppercase tracking-wider">Production End Date</th>
                  <th className="text-right px-8 py-5 text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSchedules.map((schedule) => (
                  <tr key={schedule.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 shrink-0 font-bold text-xs shadow-sm">
                          {schedule.schedule_number.split('-')[1] || '01'}
                        </div>
                        <span className="font-bold text-slate-800 tracking-tight">{schedule.schedule_number}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-slate-600 font-medium">{schedule.start_date}</td>
                    <td className="px-8 py-5 text-slate-600 font-medium">{schedule.end_date}</td>
                    <td className="px-8 py-5">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => openPlan(schedule)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-600 text-xs font-bold hover:bg-indigo-100 transition-all"
                          title="Plan Details"
                        >
                          <ClipboardList className="w-3.5 h-3.5" /> Plan
                        </button>
                        <div className="w-px h-4 bg-slate-200 mx-1"></div>
                        <button 
                          onClick={() => openPlan(schedule)}
                          className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" 
                          title="View"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => openEdit(schedule)}
                          className="p-2 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors" 
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(schedule.id)}
                          className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors" 
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Plan Details Modal */}
      {showPlanModal && selectedSchedule && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-6xl flex flex-col overflow-hidden max-h-[90vh]">
            <div className="flex items-center justify-between px-8 py-6 border-b border-slate-100 bg-slate-50/50">
              <div>
                <h3 className="text-xl font-bold text-slate-900 flex items-center gap-3">
                  <ClipboardList className="w-6 h-6 text-indigo-600" />
                  Production Plan: {selectedSchedule.schedule_number}
                </h3>
                <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest font-bold">
                  {selectedSchedule.start_date} — {selectedSchedule.end_date}
                </p>
              </div>
              <div className="flex items-center gap-3 no-print">
                <button 
                  onClick={handlePrint}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 text-white text-xs font-bold hover:bg-amber-600 transition-all shadow-md shadow-amber-500/20"
                >
                  <Package className="w-3.5 h-3.5" /> Download PDF
                </button>
                <button onClick={() => setShowPlanModal(false)} className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all">
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8">
              <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                      <th className="px-6 py-4">Job #</th>
                      <th className="px-6 py-4 text-center">Seq #</th>
                      <th className="px-6 py-4 text-center">Weight (KG)</th>
                      <th className="px-6 py-4 text-center">Qty</th>
                      <th className="px-6 py-4 text-center">RTS Date</th>
                      <th className="px-6 py-4 text-center">Ship Date</th>
                      <th className="px-6 py-4">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedSchedule.items?.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/30 transition-colors">
                        <td className="px-6 py-4 font-bold text-slate-800">{item.job_number}</td>
                        <td className="px-6 py-4 text-center text-slate-600">{item.sequence_number}</td>
                        <td className="px-6 py-4 text-center text-slate-600">{item.weight}</td>
                        <td className="px-6 py-4 text-center text-slate-600">{item.quantity}</td>
                        <td className="px-6 py-4 text-center text-slate-600">{item.rts_date || '-'}</td>
                        <td className="px-6 py-4 text-center text-slate-600">{item.ship_date || '-'}</td>
                        <td className="px-6 py-4 text-slate-500 text-sm">{item.notes || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            
            <div className="px-8 py-5 border-t border-slate-100 bg-slate-50/50 flex justify-end no-print">
              <button 
                onClick={() => setShowPlanModal(false)}
                className="px-6 py-2 rounded-xl bg-slate-900 text-white text-sm font-bold shadow-lg hover:bg-slate-800 transition-all"
              >
                Close Plan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Print Styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body * { visibility: hidden; }
          .fixed.inset-0 { position: absolute !important; top: 0 !important; left: 0 !important; width: 100% !important; height: auto !important; display: block !important; background: white !important; }
          .fixed.inset-0, .fixed.inset-0 * { visibility: visible; }
          .max-w-6xl { max-width: 100% !important; width: 100% !important; margin: 0 !important; border: none !important; box-shadow: none !important; }
          .max-h-[90vh] { max-height: none !important; overflow: visible !important; }
          .overflow-y-auto { overflow: visible !important; }
          .p-8 { padding: 0 !important; }
          .px-8 { padding-left: 20px !important; padding-right: 20px !important; }
          .py-6 { padding-top: 20px !important; padding-bottom: 20px !important; }
          .rounded-3xl, .rounded-2xl { border-radius: 0 !important; }
          .shadow-2xl, .shadow-sm { box-shadow: none !important; }
          .bg-slate-50 { background: #f8fafc !important; -webkit-print-color-adjust: exact; }
          table { border: 1px solid #e2e8f0 !important; }
          th { background-color: #f1f5f9 !important; -webkit-print-color-adjust: exact; }
        }
      `}</style>

      {showModal && (
        <ProductionScheduleForm 
          onClose={() => setShowModal(false)} 
          onSuccess={fetchSchedules}
          editSchedule={editSchedule}
        />
      )}
    </div>
  );
}

function X({ className, ...props }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
      {...props}
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}
