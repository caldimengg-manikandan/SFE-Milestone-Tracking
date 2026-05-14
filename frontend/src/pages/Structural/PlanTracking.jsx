import { useState, useEffect } from 'react';
import { Search, ListChecks, CheckCircle2, Clock, AlertCircle, LayoutList } from 'lucide-react';
import { projectAPI, scheduleAPI } from '../../services/api';

export default function PlanTracking() {
  const [projects, setProjects] = useState([]);
  const [allSchedules, setAllSchedules] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [projRes, schedRes] = await Promise.all([
        projectAPI.getAll(),
        scheduleAPI.getAll()
      ]);

      const projData = projRes.data.results || projRes.data;
      const schedData = schedRes.data.results || schedRes.data;

      setProjects(Array.isArray(projData) ? projData : []);
      setAllSchedules(Array.isArray(schedData) ? schedData : []);
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  };

  const calculateStatus = (rtsDateStr, leadWeeks) => {
    if (!rtsDateStr) return { label: 'TBD', color: 'text-slate-400', bg: 'bg-slate-100', dot: 'bg-slate-400', icon: Clock };

    const now = new Date();
    const rtsDate = new Date(rtsDateStr);
    const weeks = parseFloat(leadWeeks) || 0;
    const leadDays = weeks * 7;
    const completionDate = new Date(rtsDate.getTime() + leadDays * 24 * 60 * 60 * 1000);

    const twoDaysFromNow = new Date();
    twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);

    if (rtsDate > twoDaysFromNow) {
      return { label: 'Yet to Start', color: 'text-blue-600', bg: 'bg-blue-50', dot: 'bg-blue-500', icon: AlertCircle };
    } else if (now >= completionDate) {
      return { label: 'Completed', color: 'text-emerald-600', bg: 'bg-emerald-50', dot: 'bg-emerald-500', icon: CheckCircle2 };
    } else {
      return { label: 'Under Progress', color: 'text-amber-600', bg: 'bg-amber-50', dot: 'bg-amber-500', icon: Clock };
    }
  };

  const formatDate = (d) => {
    if (!d) return '-';
    return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const getExpectedCompletion = (rtsDateStr, leadWeeks) => {
    if (!rtsDateStr) return '-';
    const rtsDate = new Date(rtsDateStr);
    const weeks = parseFloat(leadWeeks) || 0;
    const completionDate = new Date(rtsDate.getTime() + weeks * 7 * 24 * 60 * 60 * 1000);
    return formatDate(completionDate);
  };

  const trackingData = allSchedules.map(s => {
    const project = projects.find(p => (p.id === (s.project?.id || s.project)));
    return {
      ...s,
      projectName: project?.name || 'N/A',
      customerName: project?.customer_name || 'N/A',
    };
  });

  const filteredData = trackingData.filter(item =>
    item.projectName.toLowerCase().includes(search.toLowerCase()) ||
    item.customerName.toLowerCase().includes(search.toLowerCase()) ||
    item.item_description?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50/30 p-4 lg:p-8 space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <ListChecks className="w-6 h-6 text-amber-600" /> Plan Tracking
        </h1>
        <p className="text-sm text-slate-500 font-medium">Real-time status monitoring for all structural plans</p>
      </div>

      {/* Search Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Job, Customer or Item Description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 text-sm outline-none focus:border-amber-400 transition-all"
          />
        </div>
      </div>

      {/* Standardized Table - Compressed for Static Width */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-hidden">
          <table className="w-full text-left border-collapse table-fixed">
            <thead>
              <tr className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-bold uppercase tracking-wider">
                <th className="px-3 py-4 border-r border-white/10 w-[12%]">Job Name</th>
                <th className="px-3 py-4 border-r border-white/10 w-[12%]">Customer Name</th>
                <th className="px-3 py-4 border-r border-white/10 w-[14%]">Item Description</th>
                <th className="px-3 py-4 border-r border-white/10 w-[10%]">Material</th>
                <th className="px-3 py-4 border-r border-white/10 text-center w-[8%]">Weight</th>
                <th className="px-3 py-4 border-r border-white/10 text-center w-[10%]">RTS date</th>
                <th className="px-3 py-4 border-r border-white/10 text-center w-[12%]">Status</th>
                <th className="px-3 py-4 border-r border-white/10 text-center w-[10%]">Lead Time</th>
                <th className="px-3 py-4 text-center w-[12%]">Exp. Completion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="9" className="px-6 py-12 text-center text-slate-400">Loading tracking data...</td>
                </tr>
              ) : filteredData.length > 0 ? (
                filteredData.map((item) => {
                  const status = calculateStatus(item.rts_date, item.shop_lead_time_weeks);
                  const leadDays = (parseFloat(item.shop_lead_time_weeks) || 0) * 7;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-3 py-4 text-slate-900 text-[12px] font-medium border-r border-slate-100 truncate" title={item.projectName}>{item.projectName}</td>
                      <td className="px-3 py-4 text-slate-900 text-[12px] font-medium border-r border-slate-100 truncate" title={item.customerName}>{item.customerName}</td>
                      <td className="px-3 py-4 text-slate-900 text-[12px] font-medium border-r border-slate-100 truncate" title={item.item_description}>{item.item_description || '-'}</td>
                      <td className="px-3 py-4 text-slate-900 text-[12px] font-medium border-r border-slate-100 truncate">{item.category || '-'}</td>
                      <td className="px-3 py-4 text-center text-slate-900 text-[12px] font-medium border-r border-slate-100">{parseFloat(item.tons || 0).toFixed(2)}</td>
                      <td className="px-3 py-4 text-center text-slate-900 text-[12px] font-medium border-r border-slate-100">{formatDate(item.rts_date)}</td>
                      <td className="px-3 py-4 border-r border-slate-100">
                        <div className={`flex items-center justify-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-tight ${status.bg} ${status.color} border border-current/10 whitespace-nowrap`}>
                          <div className={`w-1 h-1 rounded-full ${status.dot}`} />
                          {status.label}
                        </div>
                      </td>
                      <td className="px-3 py-4 text-center text-slate-900 text-[12px] font-medium border-r border-slate-100">{leadDays}</td>
                      <td className="px-3 py-4 text-center text-slate-900 text-[12px] font-medium whitespace-nowrap">{getExpectedCompletion(item.rts_date, item.shop_lead_time_weeks)}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="9" className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center justify-center gap-4">
                      <LayoutList className="w-12 h-12 text-slate-200" />
                      <p className="text-slate-400 text-sm font-medium italic">No tracking data found. Add sequences in Plan Creation first.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
