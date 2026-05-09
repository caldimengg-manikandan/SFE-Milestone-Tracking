import { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, Eye, Filter, Download, ChevronLeft, ChevronRight, X, ClipboardList, FileText } from "lucide-react";
import ProductionPriorityForm from '../../components/forms/ProductionPriorityForm';
import { priorityAPI } from '../../services/api';

export default function PriorityPlate() {
  const [showModal, setShowModal] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [search, setSearch] = useState('');
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editRecord, setEditRecord] = useState(null);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const moduleType = 'PLATE';
  const tabs = ["Plasma", "Plate over -1", "Bent"];

  const fetchRecords = async () => {
    try {
      setLoading(true);
      const response = await priorityAPI.getAll({ module_type: moduleType });
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
    const d = date.getDate().toString().padStart(2, '0');
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const y = date.getFullYear();
    return `${d}-${m}-${y}`;
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

  const openAdd = () => { setEditRecord(null); setShowModal(true); };
  const openEdit = (record) => { setEditRecord(record); setShowModal(true); };
  const openView = (record) => { setSelectedRecord(record); setShowPlanModal(true); };
  
  const exportToCSV = () => {
    const headers = ["Schedule Number", "Process Type", "Rate (lbs/day)"];
    const rows = filteredRecords.map(r => [r.schedule_number, r.process_type, r.rate]);
    
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "production_priorities.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => { window.print(); };

  const filteredRecords = records.filter(r => 
    r.schedule_number?.toLowerCase().includes(search.toLowerCase()) ||
    r.process_type?.toLowerCase().includes(search.toLowerCase())
  );

  
  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = filteredRecords.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Control Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search..." 
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
            <Plus className="w-4 h-4" /> New Record
          </button>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-lg border border-slate-200 p-12 text-center shadow-sm">
          <div className="animate-spin w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-sm text-slate-500">Loading records...</p>
        </div>
      ) : filteredRecords.length === 0 ? (
        <div className="bg-white rounded-lg border border-slate-200 p-12 text-center shadow-sm">
          <div className="w-16 h-16 bg-gradient-to-br from-amber-100 to-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-amber-600" />
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-1">No records found</h3>
          <p className="text-sm text-slate-500 max-w-xs mx-auto">Click "New Record" to start adding priorities.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gradient-to-r from-amber-500 to-orange-500 text-white">
                  
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider border-b border-white/10">Schedule Number</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider border-b border-white/10">Process Type</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider border-b border-white/10">Rate (lbs/day)</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider border-b border-white/10">Items</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider border-b border-white/10 text-right">Actions</th>
        
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                
                {paginatedData.map((record) => (
                  <tr key={record.id} className="hover:bg-slate-50/50 transition-colors group text-[12px]">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600 shrink-0 font-bold text-[10px] border border-amber-100">
                          {record.schedule_number.split('-')[1] || '01'}
                        </div>
                        <span className="font-bold text-slate-800">{record.schedule_number}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-bold uppercase tracking-wider border border-slate-200">
                        {record.process_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600 font-bold">{record.rate}</td>
                    <td className="px-6 py-4 text-slate-600 font-medium">{record.items?.length || 0} Rows</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openView(record)} className="flex items-center gap-1 px-2 py-1 rounded bg-indigo-50 text-indigo-600 text-[10px] font-bold hover:bg-indigo-100 transition-all" title="View Plan"><ClipboardList className="w-3 h-3" /> Plan</button>
                        <button onClick={() => openView(record)} className="p-1.5 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" title="View"><Eye className="w-3.5 h-3.5" /></button>
                        <button onClick={() => openEdit(record)} className="p-1.5 rounded text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors" title="Edit"><Edit2 className="w-3.5 h-3.5" /></button>
                        <button onClick={() => handleDelete(record.id)} className="p-1.5 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
        
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="bg-slate-50 px-6 py-3 border-t border-slate-100 flex items-center justify-between">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              {filteredRecords.length} {filteredRecords.length === 1 ? 'Record' : 'Records'} Found
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

      {showPlanModal && selectedRecord && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-7xl flex flex-col overflow-hidden max-h-[90vh]">
            <div className="flex items-center justify-between px-8 py-6 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-500 flex items-center justify-center text-white shadow-lg shadow-amber-500/20"><Eye className="w-6 h-6" /></div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">{moduleType} Priority Plan: {selectedRecord.schedule_number}</h3>
                  <div className="flex items-center gap-4 mt-1">
                    <span className="text-xs text-amber-600 uppercase tracking-widest font-black">Process: {selectedRecord.process_type}</span>
                    <span className="text-[10px] text-slate-400 px-2 py-0.5 bg-slate-100 rounded-full font-bold">Rate: {selectedRecord.rate} lbs/day</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 no-print">
                <button onClick={handlePrint} className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-bold hover:shadow-lg transition-all transform active:scale-95"><Download className="w-4 h-4" /> Download Plan</button>
                <button onClick={() => setShowPlanModal(false)} className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"><X className="w-6 h-6" /></button>
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
                        <td className="px-4 py-4 text-center"><span className="px-2 py-1 bg-amber-50 text-amber-700 text-[10px] font-black rounded-lg">{item.run_days || '-'}</span></td>
                        <td className="px-4 py-4 text-slate-600 text-[11px] font-bold">{formatDate(item.start_run_date)}</td>
                        <td className="px-4 py-4"><span className="px-2 py-1 bg-green-50 text-green-700 text-[10px] font-black rounded-lg">{formatDate(item.complete_run_date)}</span></td>
                        <td className="px-4 py-4 text-slate-500 text-[11px] italic truncate">{item.notes || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="px-8 py-5 border-t border-slate-100 bg-slate-50/50 flex justify-end no-print">
              <button onClick={() => setShowPlanModal(false)} className="px-8 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-bold shadow-lg hover:bg-slate-800 transition-all">Close Viewer</button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <ProductionPriorityForm 
          onClose={() => setShowModal(false)} 
          onSuccess={fetchRecords}
          editRecord={editRecord}
          moduleType={moduleType}
          tabs={tabs}
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
