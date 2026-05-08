import { useState, useEffect } from 'react';
import { Plus, Search, FileText, Calendar, Edit2, Trash2, ClipboardList, Eye, Loader2, X, Download, Package } from 'lucide-react';
import PriorityPlateForm from '../../components/forms/PriorityPlateForm';
import { platePriorityAPI } from '../../services/api';

export default function PriorityPlate() {
  const [showModal, setShowModal] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [search, setSearch] = useState('');
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editRecord, setEditRecord] = useState(null);
  const [selectedRecord, setSelectedRecord] = useState(null);

  const fetchRecords = async () => {
    try {
      setLoading(true);
      const response = await platePriorityAPI.getAll();
      setRecords(response.data.results || response.data);
    } catch (error) {
      console.error('Error fetching plate records:', error);
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
    const d = date.getDate().toString().padStart(2, '0');
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const y = date.getFullYear();
    return `${d}-${m}-${y}`;
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this record?')) {
      try {
        await platePriorityAPI.delete(id);
        fetchRecords();
      } catch (error) {
        alert('Failed to delete record');
      }
    }
  };

  const openAdd = () => {
    setEditRecord(null);
    setShowModal(true);
  };

  const openEdit = (record) => {
    setEditRecord(record);
    setShowModal(true);
  };

  const openView = (record) => {
    setSelectedRecord(record);
    setShowPlanModal(true);
  };

  const handlePrint = () => {
    window.print();
  };

  const filteredRecords = records.filter(r => 
    r.schedule_number?.toLowerCase().includes(search.toLowerCase()) ||
    r.process_type?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Plate Priority</h2>
          <p className="text-sm text-slate-500 mt-0.5">Manage plate production priorities and tracking</p>
        </div>
        <button 
          onClick={openAdd} 
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-bold shadow-lg shadow-amber-500/20 hover:from-amber-400 hover:to-orange-400 transition-all hover:shadow-xl transform hover:scale-[1.02]"
        >
          <Plus className="w-4 h-4" /> New Record
        </button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input 
          type="text" 
          placeholder="Search by schedule or process..." 
          value={search} 
          onChange={(e) => setSearch(e.target.value)} 
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-500/5 transition-all" 
        />
      </div>

      {loading ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-100 shadow-sm">
          <Loader2 className="animate-spin w-8 h-8 text-amber-500 mx-auto mb-4" />
          <p className="text-sm text-slate-500 font-bold">Loading records...</p>
        </div>
      ) : filteredRecords.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200/60 p-16 text-center shadow-sm">
          <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-slate-200" />
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-1">No records found</h3>
          <p className="text-sm text-slate-500">Click "New Record" to start adding plate priorities.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRecords.map((record) => (
            <div key={record.id} className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm hover:shadow-xl transition-all group relative border-t-4 border-t-amber-500">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600 shadow-sm">
                    <ClipboardList className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900">{record.schedule_number}</h4>
                    <p className="text-[10px] text-amber-600 font-bold uppercase tracking-widest mt-0.5">{record.process_type}</p>
                  </div>
                </div>
                <div className="flex gap-1 no-print">
                   <button 
                    onClick={() => openView(record)}
                    className="p-2 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-all"
                    title="View Plan"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => openEdit(record)}
                    className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
                    title="Edit Record"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleDelete(record.id)}
                    className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all"
                    title="Delete Record"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-3 mb-2 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-400 uppercase tracking-tighter">Production Rate:</span>
                  <span className="font-bold text-slate-700">{record.rate} lbs/day</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-400 uppercase tracking-tighter">Item Count:</span>
                  <span className="font-bold text-slate-700">{record.items?.length || 0} Rows</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* View Modal */}
      {showPlanModal && selectedRecord && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-7xl flex flex-col overflow-hidden max-h-[90vh]">
            <div className="flex items-center justify-between px-8 py-6 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-500 flex items-center justify-center text-white shadow-lg shadow-amber-500/20">
                    <Eye className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Plate Priority Plan: {selectedRecord.schedule_number}</h3>
                  <div className="flex items-center gap-4 mt-1">
                    <span className="text-xs text-amber-600 uppercase tracking-widest font-black">Process: {selectedRecord.process_type}</span>
                    <span className="text-[10px] text-slate-400 px-2 py-0.5 bg-slate-100 rounded-full font-bold">Rate: {selectedRecord.rate} lbs/day</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 no-print">
                <button 
                  onClick={handlePrint}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-bold hover:shadow-lg transition-all transform active:scale-95"
                >
                  <Download className="w-4 h-4" /> Download Plan
                </button>
                <button onClick={() => setShowPlanModal(false)} className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all">
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8">
              <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm">
                <table className="w-full text-left border-collapse table-fixed">
                  <thead>
                    <tr className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                      <th className="px-4 py-4 w-[12%]">Job #</th>
                      <th className="px-4 py-4 w-[10%] text-center">Seq #</th>
                      <th className="px-4 py-4 w-[10%] text-center">Weight</th>
                      <th className="px-4 py-4 w-[14%]">RTS Date</th>
                      <th className="px-4 py-4 w-[10%] text-center">Run Days</th>
                      <th className="px-4 py-4 w-[14%]">Start Run</th>
                      <th className="px-4 py-4 w-[15%]">Complete Date</th>
                      <th className="px-4 py-4">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedRecord.items?.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/30 transition-colors">
                        <td className="px-4 py-4 font-bold text-slate-800 text-xs">{item.job_number || '-'}</td>
                        <td className="px-4 py-4 text-center text-slate-600 text-xs">{item.sequence_number || '-'}</td>
                        <td className="px-4 py-4 text-center text-slate-600 text-xs font-bold">{item.weight || '-'}</td>
                        <td className="px-4 py-4 text-slate-600 text-[11px]">{formatDate(item.rts_date)}</td>
                        <td className="px-4 py-4 text-center">
                            <span className="px-2 py-1 bg-amber-50 text-amber-700 text-[10px] font-black rounded-lg">{item.run_days || '-'}</span>
                        </td>
                        <td className="px-4 py-4 text-slate-600 text-[11px] font-bold">{formatDate(item.start_run_date)}</td>
                        <td className="px-4 py-4">
                            <span className="px-2 py-1 bg-green-50 text-green-700 text-[10px] font-black rounded-lg">{formatDate(item.complete_run_date)}</span>
                        </td>
                        <td className="px-4 py-4 text-slate-500 text-[11px] italic truncate">{item.notes || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            
            <div className="px-8 py-5 border-t border-slate-100 bg-slate-50/50 flex justify-end no-print">
              <button 
                onClick={() => setShowPlanModal(false)}
                className="px-8 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-bold shadow-lg hover:bg-slate-800 transition-all transform active:scale-95"
              >
                Close Viewer
              </button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <PriorityPlateForm 
          onClose={() => setShowModal(false)} 
          onSuccess={fetchRecords}
          editRecord={editRecord}
        />
      )}

       <style>{`
        @media print {
          .no-print { display: none !important; }
          body * { visibility: hidden; }
          .fixed.inset-0 { position: absolute !important; top: 0 !important; left: 0 !important; width: 100% !important; height: auto !important; background: white !important; display: block !important; }
          .fixed.inset-0, .fixed.inset-0 * { visibility: visible; }
          .max-w-7xl { max-width: 100% !important; width: 100% !important; margin: 0 !important; border: none !important; box-shadow: none !important; }
          .max-h-[90vh] { max-height: none !important; overflow: visible !important; }
          .overflow-y-auto { overflow: visible !important; }
          .p-8 { padding: 10mm !important; }
          .rounded-3xl, .rounded-2xl { border-radius: 0 !important; }
          .shadow-2xl, .shadow-sm { box-shadow: none !important; }
          .bg-slate-50 { background: #f8fafc !important; -webkit-print-color-adjust: exact; }
          table { border: 1px solid #e2e8f0 !important; width: 100% !important; border-collapse: collapse !important; }
          th { background-color: #f1f5f9 !important; -webkit-print-color-adjust: exact; padding: 3mm !important; font-size: 8pt !important; }
          td { padding: 2mm !important; font-size: 8pt !important; border-bottom: 1px solid #f1f5f9 !important; }
          .bg-green-50 { background-color: #f0fdf4 !important; -webkit-print-color-adjust: exact; }
          .bg-amber-50 { background-color: #fffbeb !important; -webkit-print-color-adjust: exact; }
        }
      `}</style>
    </div>
  );
}
