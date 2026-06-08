import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Settings2,
  Cpu,
  Users2,
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  Loader2,
  Check,
  ChevronRight,
  TrendingUp,
  Box,
  MapPin,
  Clock,
  Briefcase,
  AlertCircle
} from 'lucide-react';
import { machineAPI, manpowerAPI, capacityAPI, projectAPI, rfqAPI } from '../services/api';
import FormattedDateInput from '../components/forms/FormattedDateInput';

export default function CapacityMapping() {
  const { tab } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(tab || 'capacity');
  const [loading, setLoading] = useState(true);
  const [filterShop, setFilterShop] = useState('All');
  const [filterMonth, setFilterMonth] = useState('All');

  // Sync activeTab with URL param
  useEffect(() => {
    if (tab && tab !== activeTab) {
      setActiveTab(tab);
    } else if (!tab) {
      navigate('/production/capacity-mapping/capacity', { replace: true });
    }
  }, [tab, activeTab, navigate]);

  // Data States
  const [machines, setMachines] = useState([]);
  const [manpower, setManpower] = useState([]);
  const [capacities, setCapacities] = useState([]);
  const [projects, setProjects] = useState([]);
  const [rfqs, setRfqs] = useState([]);

  // Fetch all data
  const fetchData = async () => {
    try {
      setLoading(true);
      const [macRes, manRes, capRes, projRes, rfqRes] = await Promise.all([
        machineAPI.getAll(),
        manpowerAPI.getAll(),
        capacityAPI.getAll(),
        projectAPI.getAll(),
        rfqAPI.getAll({ won_lost: 'Won' })
      ]);
      setMachines(macRes.data.results || macRes.data);
      setManpower(manRes.data.results || manRes.data);
      setCapacities(capRes.data.results || capRes.data);
      setProjects(projRes.data.results || projRes.data);
      setRfqs(rfqRes.data.results || rfqRes.data);
    } catch (error) {
      console.error('Error fetching capacity mapping data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredManpower = filterMonth === 'All'
    ? manpower
    : manpower.filter(m => (m.month || 'June').toLowerCase() === filterMonth.toLowerCase());

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Summary Cards - Always Visible */}
      <SummaryView 
        capacities={capacities} 
        machines={machines} 
        manpower={manpower} 
        projects={projects}
        rfqs={rfqs}
        filterShop={filterShop}
        setFilterShop={setFilterShop}
        filterMonth={filterMonth}
        setFilterMonth={setFilterMonth}
      />

      {/* Content */}
      <div className="mt-6">
        {activeTab === 'capacity' && <CapacityView data={capacities} machines={machines} refresh={fetchData} />}
        {activeTab === 'machine' && <MachineView data={machines} refresh={fetchData} />}
        {activeTab === 'manpower' && <ManpowerView data={filteredManpower} refresh={fetchData} />}
      </div>
    </div>
  );
}

/* ── Summary Cards Component (Header) ── */
function SummaryView({ capacities, machines, manpower, projects = [], rfqs = [], filterShop, setFilterShop, filterMonth, setFilterMonth }) {
  const uniqueShops = [...new Set(machines.filter(m => m.shop).map(m => m.shop))];

  const filteredCapacities = filterShop === 'All' ? capacities : capacities.filter(c => c.shop === filterShop);
  const filteredMachines = filterShop === 'All' ? machines : machines.filter(m => m.shop === filterShop);
  
  const totalCapacity = filteredCapacities.reduce((sum, c) => sum + parseFloat(c.rate_per_day || 0), 0);
  const machineCount = filteredMachines.length;

  const filteredManpower = filterMonth === 'All' 
    ? manpower 
    : manpower.filter(m => (m.month || 'June').toLowerCase() === filterMonth.toLowerCase());

  const skilledManpower = filteredManpower.length;

  const totalMonthlyManhours = filteredManpower.reduce((sum, item) => {
    const mh = item.manhours !== null && item.manhours !== undefined && item.manhours !== '' ? Number(item.manhours) : 8;
    const ot = item.overtime !== null && item.overtime !== undefined && item.overtime !== '' ? Number(item.overtime) : 0;
    return sum + (mh + ot) * 20;
  }, 0);

  const isScheduleActiveInMonth = (startMonthStr, durationMonths, targetMonthName) => {
    if (!startMonthStr || !durationMonths || durationMonths < 1) return false;
    const start = new Date(startMonthStr);
    if (isNaN(start.getTime())) return false;

    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const targetMonthIdx = months.indexOf(targetMonthName);
    if (targetMonthIdx === -1) return false;

    const startMonthIdx = start.getMonth();

    const activeMonths = [];
    for (let i = 0; i < durationMonths; i++) {
      activeMonths.push((startMonthIdx + i) % 12);
    }
    return activeMonths.includes(targetMonthIdx);
  };

  const totalRequiredHours = Math.round(rfqs.reduce((sum, r) => {
    const getAvgIfActive = (startMonthStr, durationMonths, hours) => {
      const hrs = Number(hours || 0);
      const dur = Number(durationMonths || 0);
      if (hrs <= 0) return 0;
      
      const avg = dur > 0 ? hrs / dur : hrs;
      
      if (filterMonth === 'All') {
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        let activeCount = 0;
        for (const m of months) {
          if (isScheduleActiveInMonth(startMonthStr, dur, m)) {
            activeCount++;
          }
        }
        return avg * activeCount;
      }
      
      if (isScheduleActiveInMonth(startMonthStr, dur, filterMonth)) {
        return avg;
      }
      return 0;
    };

    const structFab = getAvgIfActive(r.struct_fab_start_month, r.struct_fab_duration_months, r.struct_fab_hours);
    const miscFab = getAvgIfActive(r.misc_fab_start_month, r.misc_fab_duration_months, r.misc_fab_hours);
    const structErect = getAvgIfActive(r.struct_erect_start_month, r.struct_erect_duration_months, r.struct_erect_hours);
    const miscErect = getAvgIfActive(r.misc_erect_start_month, r.misc_erect_duration_months, r.misc_erect_hours);

    return sum + structFab + miscFab + structErect + miscErect;
  }, 0));

  const manhoursVariance = totalMonthlyManhours - totalRequiredHours;
  const varianceValue = Math.abs(manhoursVariance);
  const varianceLabel = manhoursVariance >= 0 ? 'Surplus Manhours' : 'Shortage of Manhours';
  const varianceSub = manhoursVariance >= 0 ? 'We have more manhours than required' : 'We need more manhours';
  const varianceColor = manhoursVariance >= 0 ? 'text-emerald-600' : 'text-rose-600';
  const varianceBg = manhoursVariance >= 0 ? 'bg-emerald-50' : 'bg-rose-50';

  const stats = [
    { label: 'Total Capacity', value: `${totalCapacity.toFixed(2)} Tonnes`, sub: filterShop === 'All' ? 'Per Day (Global)' : `Per Day (${filterShop})`, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Manhours Available', value: `${totalMonthlyManhours} Hours`, sub: filterMonth === 'All' ? 'Per Month (Workforce Master)' : `Per Month (${filterMonth} - Workforce Master)`, icon: Clock, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Manhours Required', value: `${totalRequiredHours} Hours`, sub: filterMonth === 'All' ? 'All Won Bids Total' : `Won Bids active in ${filterMonth}`, icon: Briefcase, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: varianceLabel, value: `${varianceValue} Hours`, sub: varianceSub, icon: AlertCircle, color: varianceColor, bg: varianceBg },
    { label: 'Total Machinery', value: machineCount, sub: 'Production Equipment', icon: Cpu, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Total Manpower', value: skilledManpower, sub: 'Production Personnel', icon: Users2, color: 'text-indigo-600', bg: 'bg-indigo-50' },
  ];

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
        <h2 className="text-lg font-black text-slate-800 tracking-tight">Performance Overview</h2>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Filter by Month:</label>
            <select 
              className="px-4 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 outline-none focus:border-amber-400 transition-all shadow-sm cursor-pointer"
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
            >
              <option value="All">All Months</option>
              {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Filter by Shop:</label>
            <select 
              className="px-4 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 outline-none focus:border-amber-400 transition-all shadow-sm cursor-pointer"
              value={filterShop}
              onChange={(e) => setFilterShop(e.target.value)}
            >
              <option value="All">All Shops</option>
              {uniqueShops.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 animate-fade-in">
      {stats.map((s, idx) => (
        <div key={idx} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
          <div className={`w-12 h-12 rounded-2xl ${s.bg} flex items-center justify-center mb-4`}>
            <s.icon className={`w-6 h-6 ${s.color}`} />
          </div>
          <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">{s.label}</p>
          <h4 className="text-3xl font-black text-slate-900 mt-1">{s.value}</h4>
          <p className="text-xs text-slate-400 mt-2 font-medium">{s.sub}</p>
        </div>
      ))}
      </div>
    </div>
  );
}

/* ── Update Capacity Sub-module ── */
function CapacityView({ data, machines, refresh }) {
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    shop: '', location: '', category: 'Machine', machine: '', process: '', rate_per_day: ''
  });

  // Derived data for dynamic dropdowns
  const uniqueShops = [...new Set(machines.filter(m => m.shop).map(m => m.shop))];
  const filteredMachines = machines.filter(m => m.shop === form.shop);

  const handleOpen = (item = null) => {
    if (item) {
      setEditItem(item);
      setForm({
        shop: item.shop || '',
        location: item.location || '',
        category: item.category || 'Machine',
        machine: item.machine || '',
        process: item.process || '',
        rate_per_day: item.rate_per_day || ''
      });
    } else {
      setEditItem(null);
      setForm({ shop: '', location: '', category: 'Machine', machine: '', process: '', rate_per_day: '' });
    }
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editItem) await capacityAPI.update(editItem.id, form);
      else await capacityAPI.create(form);
      setShowModal(false);
      refresh();
    } catch (err) {
      alert('Failed to save capacity');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this capacity record?')) {
      try {
        await capacityAPI.delete(id);
        refresh();
      } catch (err) {
        alert('Failed to delete');
      }
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex justify-end">
        <button onClick={() => handleOpen()} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 text-white font-bold text-sm shadow-lg shadow-amber-500/20 hover:bg-amber-400 transition-all">
          <Plus className="w-4 h-4" /> Add Capacity
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="bg-gradient-to-r from-amber-500 to-orange-500 text-white">
              <th className="px-6 py-4 font-black uppercase text-[10px] tracking-widest border-b border-white/10">Shop</th>
              <th className="px-6 py-4 font-black uppercase text-[10px] tracking-widest border-b border-white/10">Location</th>
              <th className="px-6 py-4 font-black uppercase text-[10px] tracking-widest border-b border-white/10">Category</th>
              <th className="px-6 py-4 font-black uppercase text-[10px] tracking-widest border-b border-white/10">Process</th>
              <th className="px-6 py-4 font-black uppercase text-[10px] tracking-widest border-b border-white/10">Machine Name</th>
              <th className="px-6 py-4 font-black uppercase text-[10px] tracking-widest border-b border-white/10 text-right">Daily Rate</th>
              <th className="px-6 py-4 font-black uppercase text-[10px] tracking-widest border-b border-white/10 text-right">Rate/Month</th>
              <th className="px-6 py-4 font-black uppercase text-[10px] tracking-widest border-b border-white/10 text-right">Rate/Year</th>
              <th className="px-6 py-4 font-black uppercase text-[10px] tracking-widest border-b border-white/10 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.map(item => (
              <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-6 py-4 font-bold text-slate-900">{item.shop}</td>
                <td className="px-6 py-4 text-xs text-slate-500 font-medium">{item.location || '-'}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-tighter ${item.category === 'Machine' ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'}`}>
                    {item.category}
                  </span>
                </td>
                <td className="px-6 py-4 font-bold text-slate-700">{item.process || '-'}</td>
                <td className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase">{item.machine_name || '-'}</td>
                <td className="px-6 py-4 text-right font-bold text-emerald-600 whitespace-nowrap">{item.rate_per_day} T</td>
                <td className="px-6 py-4 text-right font-bold text-slate-900 whitespace-nowrap">{item.rate_per_month?.toFixed(1)} T</td>
                <td className="px-6 py-4 text-right font-bold text-slate-900 whitespace-nowrap">{item.rate_per_year?.toFixed(1)} T</td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-1">
                    <button onClick={() => handleOpen(item)} className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(item.id)} className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200">
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900">{editItem ? 'Edit Capacity' : 'New Capacity Entry'}</h3>
              <button onClick={() => setShowModal(false)} className="p-2 rounded-xl text-slate-400 hover:text-slate-600"><X className="w-6 h-6" /></button>
            </div>
            <form onSubmit={handleSave} className="p-8 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Shop Name</label>
                  <select required className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 outline-none appearance-none bg-slate-50/50" value={form.shop} onChange={e => setForm({ ...form, shop: e.target.value, machine: '' })}>
                    <option value="">Select Shop</option>
                    {uniqueShops.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Location</label>
                  <input className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-500/5 transition-all" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="Country" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Category</label>
                <select className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 outline-none appearance-none bg-slate-50/50" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                  <option value="Machine">Machine</option>
                  <option value="Manual">Manual</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Machine (Optional)</label>
                <select className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 outline-none appearance-none bg-slate-50/50" value={form.machine || ''} onChange={e => setForm({ ...form, machine: e.target.value || null })}>
                  <option value="">Select Machine</option>
                  {filteredMachines.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Process Name</label>
                <input required className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-500/5 transition-all" value={form.process} onChange={e => setForm({ ...form, process: e.target.value })} placeholder="e.g. Drilling" />
              </div>
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Daily Rate (Tonnes)</label>
                  <input type="number" step="0.01" required className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-500/5 transition-all" value={form.rate_per_day} onChange={e => setForm({ ...form, rate_per_day: e.target.value })} placeholder="0.00" />
                </div>
              </div>
              <button type="submit" disabled={loading} className="w-full py-4 rounded-2xl bg-slate-900 text-white font-bold text-sm shadow-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {editItem ? 'Update Capacity' : 'Save Capacity'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Update Machine Sub-module ── */
function MachineView({ data, refresh }) {
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: '', machine_id: '', make: '', model_no: '', serial_no: '', shop: '', commissioned_date: '', validity_year: '', custom_fields: [] });

  const handleOpen = (item = null) => {
    if (item) {
      setEditItem(item);
      let parsed = [];
      try {
        const obj = typeof item.other_fields === 'string' ? JSON.parse(item.other_fields) : item.other_fields;
        if (obj && typeof obj === 'object') {
          parsed = Object.entries(obj).map(([k, v]) => ({ label: k, value: v }));
        }
      } catch (e) { }
      setForm({ ...item, custom_fields: parsed });
    } else {
      setEditItem(null);
      setForm({ name: '', machine_id: '', make: '', model_no: '', serial_no: '', shop: '', commissioned_date: '', validity_year: '', custom_fields: [] });
    }
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const other_fields = {};
      (form.custom_fields || []).forEach(f => {
        if (f.label) other_fields[f.label] = f.value;
      });
      const payload = { ...form, other_fields };

      if (editItem) await machineAPI.update(editItem.id, payload);
      else await machineAPI.create(payload);
      setShowModal(false);
      refresh();
    } catch (err) {
      alert('Failed to save machine');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex justify-end">
        <button onClick={() => handleOpen()} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 text-white font-bold text-sm shadow-lg shadow-amber-500/20 hover:bg-amber-400 transition-all">
          <Plus className="w-4 h-4" /> Add Machine
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="bg-gradient-to-r from-amber-500 to-orange-500 text-white">
              <th className="px-6 py-4 font-black uppercase text-[10px] tracking-widest border-b border-white/10">Machine Name</th>
              <th className="px-6 py-4 font-black uppercase text-[10px] tracking-widest border-b border-white/10">Machine ID</th>
              <th className="px-6 py-4 font-black uppercase text-[10px] tracking-widest border-b border-white/10">Make</th>
              <th className="px-6 py-4 font-black uppercase text-[10px] tracking-widest border-b border-white/10 text-right">Model No</th>
              <th className="px-6 py-4 font-black uppercase text-[10px] tracking-widest border-b border-white/10">Serial No</th>
              <th className="px-6 py-4 font-black uppercase text-[10px] tracking-widest border-b border-white/10">Shop</th>
              <th className="px-6 py-4 font-black uppercase text-[10px] tracking-widest border-b border-white/10">Commissioned Date</th>
              <th className="px-6 py-4 font-black uppercase text-[10px] tracking-widest border-b border-white/10">Validity Year</th>
              <th className="px-6 py-4 font-black uppercase text-[10px] tracking-widest border-b border-white/10 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.map(m => (
              <tr key={m.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                      <Cpu className="w-4 h-4 text-amber-500" />
                    </div>
                    <span className="font-bold text-slate-900">{m.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-xs font-bold text-blue-600">{m.machine_id || '-'}</td>
                <td className="px-6 py-4 font-bold text-amber-600 uppercase text-[10px] tracking-widest">{m.make}</td>
                <td className="px-6 py-4 text-right text-xs font-medium text-slate-600">{m.model_no || '-'}</td>
                <td className="px-6 py-4 text-xs font-medium text-slate-600">{m.serial_no || '-'}</td>
                <td className="px-6 py-4 text-xs font-bold text-slate-900">{m.shop || '-'}</td>
                <td className="px-6 py-4 font-medium text-slate-600">{m.commissioned_date || 'N/A'}</td>
                <td className="px-6 py-4 font-medium text-slate-600">{m.validity_year || 'N/A'}</td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-1">
                    <button onClick={() => handleOpen(m)} className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={async () => { if (window.confirm('Delete machine?')) { await machineAPI.delete(m.id); refresh(); } }} className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200">
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900">{editItem ? 'Edit Machine' : 'Register Machine'}</h3>
              <button onClick={() => setShowModal(false)} className="p-2 rounded-xl text-slate-400 hover:text-slate-600"><X className="w-6 h-6" /></button>
            </div>
            <form onSubmit={handleSave} className="p-8 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Machine Name</label>
                  <input required className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-500/5 transition-all" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. CNC Plasma Cutter" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Machine ID</label>
                  <input className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-500/5 transition-all" value={form.machine_id} onChange={e => setForm({ ...form, machine_id: e.target.value })} placeholder="MC-001" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Make</label>
                <input required className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-500/5 transition-all" value={form.make} onChange={e => setForm({ ...form, make: e.target.value })} placeholder="e.g. Voortman" />
              </div>
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Shop</label>
                  <select
                    required
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 outline-none appearance-none bg-slate-50/50"
                    value={form.shop}
                    onChange={e => setForm({ ...form, shop: e.target.value })}
                  >
                    <option value="">Select Shop</option>
                    <option value="shop1">shop1</option>
                    <option value="shop2">shop2</option>
                    <option value="shop3">shop3</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Model No</label>
                  <input className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-500/5 transition-all" value={form.model_no} onChange={e => setForm({ ...form, model_no: e.target.value })} placeholder="V630" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Serial No</label>
                  <input className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-500/5 transition-all" value={form.serial_no} onChange={e => setForm({ ...form, serial_no: e.target.value })} placeholder="SN-12345" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Commissioned Date</label>
                  <FormattedDateInput className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-500/5 transition-all" value={form.commissioned_date || ''} onChange={e => setForm({ ...form, commissioned_date: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Validity (MM/YY)</label>
                  <input className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-500/5 transition-all" value={form.validity_year || ''} onChange={e => setForm({ ...form, validity_year: e.target.value })} placeholder="12/26" />
                </div>
              </div>
              <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Custom Additional Fields</label>
                  <button type="button" onClick={() => setForm({ ...form, custom_fields: [...(form.custom_fields || []), { label: '', value: '' }] })} className="text-[10px] px-2 py-1 bg-white border border-slate-200 rounded text-amber-600 font-bold hover:bg-amber-50 hover:border-amber-200 transition-all flex items-center gap-1 shadow-sm"><Plus className="w-3 h-3" /> Add Field</button>
                </div>
                {(form.custom_fields || []).map((field, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input className="w-1/3 px-3 py-2 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-500/20" value={field.label} onChange={e => {
                      const newFields = [...form.custom_fields];
                      newFields[idx].label = e.target.value;
                      setForm({ ...form, custom_fields: newFields });
                    }} placeholder="Label (e.g. Phase)" />
                    <input className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-500/20" value={field.value} onChange={e => {
                      const newFields = [...form.custom_fields];
                      newFields[idx].value = e.target.value;
                      setForm({ ...form, custom_fields: newFields });
                    }} placeholder="Value" />
                    <button type="button" onClick={() => {
                      const newFields = form.custom_fields.filter((_, i) => i !== idx);
                      setForm({ ...form, custom_fields: newFields });
                    }} className="p-2 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-all"><X className="w-4 h-4" /></button>
                  </div>
                ))}
                {(form.custom_fields || []).length === 0 && (
                  <p className="text-xs text-slate-400 italic text-center py-2">No custom fields added</p>
                )}
              </div>
              <button type="submit" disabled={loading} className="w-full py-4 rounded-2xl bg-slate-900 text-white font-bold text-sm shadow-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {editItem ? 'Update Machine' : 'Save Machine'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Update Manpower Sub-module ── */
function ManpowerView({ data, refresh }) {
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ employee_name: '', skill_level: 'Medium', process: '', rate_per_day: '', manhours: 8, overtime: 0, month: 'June' });

  const handleOpen = (item = null) => {
    if (item) {
      setEditItem(item);
      setForm({
        ...item,
        manhours: item.manhours !== undefined && item.manhours !== null ? item.manhours : 8,
        overtime: item.overtime !== undefined && item.overtime !== null ? item.overtime : 0,
        month: item.month !== undefined && item.month !== null ? item.month : 'June'
      });
    } else {
      setEditItem(null);
      setForm({ employee_name: '', skill_level: 'Medium', process: '', rate_per_day: '', manhours: 8, overtime: 0, month: 'June' });
    }
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editItem) await manpowerAPI.update(editItem.id, form);
      else await manpowerAPI.create(form);
      setShowModal(false);
      refresh();
    } catch (err) {
      alert('Failed to save manpower');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex justify-end">
        <button onClick={() => handleOpen()} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 text-white font-bold text-sm shadow-lg shadow-amber-500/20 hover:bg-amber-400 transition-all">
          <Plus className="w-4 h-4" /> Add Manpower
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="bg-gradient-to-r from-amber-500 to-orange-500 text-white">
              <th className="px-6 py-4 font-black uppercase text-[10px] tracking-widest border-b border-white/10">Employee Name</th>
              <th className="px-6 py-4 font-black uppercase text-[10px] tracking-widest border-b border-white/10">Skill Level</th>
              <th className="px-6 py-4 font-black uppercase text-[10px] tracking-widest border-b border-white/10">Process / Trade</th>
              <th className="px-6 py-4 font-black uppercase text-[10px] tracking-widest border-b border-white/10 text-center">Month</th>
              <th className="px-6 py-4 font-black uppercase text-[10px] tracking-widest border-b border-white/10 text-right">Man Hours</th>
              <th className="px-6 py-4 font-black uppercase text-[10px] tracking-widest border-b border-white/10 text-right">Overtime</th>
              <th className="px-6 py-4 font-black uppercase text-[10px] tracking-widest border-b border-white/10 text-right">Per Week</th>
              <th className="px-6 py-4 font-black uppercase text-[10px] tracking-widest border-b border-white/10 text-right">Rate / Day</th>
              <th className="px-6 py-4 font-black uppercase text-[10px] tracking-widest border-b border-white/10 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.map(item => (
              <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-6 py-4 font-bold text-slate-900">{item.employee_name}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-widest ${item.skill_level === 'High' ? 'bg-emerald-50 text-emerald-600' :
                      item.skill_level === 'Medium' ? 'bg-amber-50 text-amber-600' :
                        'bg-slate-50 text-slate-500'
                    }`}>
                    {item.skill_level}
                  </span>
                </td>
                <td className="px-6 py-4 font-bold text-slate-600">{item.process}</td>
                <td className="px-6 py-4 text-center">
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-black tracking-wider uppercase bg-blue-50 text-blue-600 border border-blue-200">
                    {item.month || 'June'}
                  </span>
                </td>
                <td className="px-6 py-4 text-right font-semibold text-slate-700">{item.manhours !== null && item.manhours !== undefined ? Number(item.manhours) : 8} hrs</td>
                <td className="px-6 py-4 text-right font-semibold text-slate-700">{item.overtime !== null && item.overtime !== undefined ? Number(item.overtime) : 0} hrs</td>
                <td className="px-6 py-4 text-right font-bold text-blue-600">
                  {((item.manhours !== null && item.manhours !== undefined ? Number(item.manhours) : 8) +
                    (item.overtime !== null && item.overtime !== undefined ? Number(item.overtime) : 0)) * 5} hrs
                </td>
                <td className="px-6 py-4 text-right font-bold text-emerald-600">{item.rate_per_day} T</td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-1">
                    <button onClick={() => handleOpen(item)} className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={async () => { if (window.confirm('Delete entry?')) { await manpowerAPI.delete(item.id); refresh(); } }} className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200">
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900">{editItem ? 'Edit Manpower' : 'New Manpower Entry'}</h3>
              <button onClick={() => setShowModal(false)} className="p-2 rounded-xl text-slate-400 hover:text-slate-600"><X className="w-6 h-6" /></button>
            </div>
            <form onSubmit={handleSave} className="p-8 space-y-5">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Employee Name</label>
                <input required className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-500/5 transition-all" value={form.employee_name} onChange={e => setForm({ ...form, employee_name: e.target.value })} placeholder="e.g. Robert Smith" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Skill Level</label>
                  <select className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 outline-none appearance-none bg-slate-50/50" value={form.skill_level} onChange={e => setForm({ ...form, skill_level: e.target.value })}>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Month</label>
                  <select className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 outline-none appearance-none bg-slate-50/50" value={form.month} onChange={e => setForm({ ...form, month: e.target.value })}>
                    {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Process / Trade</label>
                <input required className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-500/5 transition-all" value={form.process} onChange={e => setForm({ ...form, process: e.target.value })} placeholder="e.g. Senior Welder" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Man Hours (Daily)</label>
                  <input type="number" step="0.5" required className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-500/5 transition-all" value={form.manhours} onChange={e => setForm({ ...form, manhours: e.target.value })} placeholder="8" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Overtime (Daily)</label>
                  <input type="number" step="0.5" required className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-500/5 transition-all" value={form.overtime} onChange={e => setForm({ ...form, overtime: e.target.value })} placeholder="0" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Per Week Man Hours (Calculated)</label>
                <input type="text" disabled className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-400 outline-none bg-slate-50" value={((Number(form.manhours) || 0) + (Number(form.overtime) || 0)) * 5} />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Rate / Day (Tonnes)</label>
                <input type="number" step="0.01" required className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-500/5 transition-all" value={form.rate_per_day} onChange={e => setForm({ ...form, rate_per_day: e.target.value })} placeholder="0.00" />
              </div>
              <button type="submit" disabled={loading} className="w-full py-4 rounded-2xl bg-slate-900 text-white font-bold text-sm shadow-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {editItem ? 'Update Profile' : 'Create Entry'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

