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
  Briefcase
} from 'lucide-react';
import { machineAPI, manpowerAPI, capacityAPI } from '../services/api';

export default function CapacityMapping() {
  const { tab } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(tab || 'summary');
  const [loading, setLoading] = useState(true);

  // Sync activeTab with URL param
  useEffect(() => {
    if (tab && tab !== activeTab) {
      setActiveTab(tab);
    } else if (!tab) {
      navigate('/production/capacity-mapping/summary', { replace: true });
    }
  }, [tab, activeTab, navigate]);  
  // Data States
  const [machines, setMachines] = useState([]);
  const [manpower, setManpower] = useState([]);
  const [capacities, setCapacities] = useState([]);

  // Fetch all data
  const fetchData = async () => {
    try {
      setLoading(true);
      const [macRes, manRes, capRes] = await Promise.all([
        machineAPI.getAll(),
        manpowerAPI.getAll(),
        capacityAPI.getAll()
      ]);
      setMachines(macRes.data.results || macRes.data);
      setManpower(manRes.data.results || manRes.data);
      setCapacities(capRes.data.results || capRes.data);
    } catch (error) {
      console.error('Error fetching capacity mapping data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);


  return (
    <div className="space-y-6 animate-fade-in">
      {/* Summary Cards - Always Visible */}
      <SummaryView capacities={capacities} machines={machines} manpower={manpower} />


      {/* Content */}
      <div className="mt-6">
        {activeTab === 'summary' && <SummaryTableView capacities={capacities} machines={machines} manpower={manpower} />}
        {activeTab === 'capacity' && <CapacityView data={capacities} machines={machines} refresh={fetchData} />}
        {activeTab === 'machine' && <MachineView data={machines} refresh={fetchData} />}
        {activeTab === 'manpower' && <ManpowerView data={manpower} refresh={fetchData} />}
      </div>
    </div>
  );
}

/* ── Summary Cards Component (Header) ── */
function SummaryView({ capacities, machines, manpower }) {
  const totalCapacity = capacities.reduce((sum, c) => sum + parseFloat(c.rate_per_day || 0), 0);
  const shops = Array.from(new Set(capacities.map(c => c.shop))).length;
  const machineCount = machines.length;
  const skilledManpower = manpower.length;

  const stats = [
    { label: 'Total Capacity', value: `${totalCapacity.toFixed(2)} Tonnes`, sub: 'Per Day (Global)', icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Active Shops', value: shops, sub: 'Operating Locations', icon: MapPin, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Total Machinery', value: machineCount, sub: 'Production Equipment', icon: Cpu, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Total Manpower', value: skilledManpower, sub: 'Production Personnel', icon: Users2, color: 'text-purple-600', bg: 'bg-purple-50' },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-fade-in">
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
  );
}

/* ── Summary Module Table View ── */
function SummaryTableView({ capacities, machines, refresh }) {
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    shop: '', location: '', category: 'Machine', machine: '', process: '', rate_per_day: ''
  });

  const handleOpen = (item) => {
    setEditItem(item);
    setForm({
      shop: item.shop || '',
      location: item.location || '',
      category: item.category || 'Machine',
      machine: item.machine || '',
      process: item.process || '',
      rate_per_day: item.rate_per_day || ''
    });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await capacityAPI.update(editItem.id, form);
      setShowModal(false);
      refresh();
    } catch (err) {
      alert('Failed to update');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="bg-gradient-to-r from-amber-500 to-orange-500 text-white">
              <th className="px-6 py-4 font-black uppercase text-[10px] tracking-widest border-b border-white/10">Shop Name</th>
              <th className="px-6 py-4 font-black uppercase text-[10px] tracking-widest border-b border-white/10">Location</th>
              <th className="px-6 py-4 font-black uppercase text-[10px] tracking-widest border-b border-white/10">Machine Name</th>
              <th className="px-6 py-4 font-black uppercase text-[10px] tracking-widest border-b border-white/10">Process</th>
              <th className="px-6 py-4 font-black uppercase text-[10px] tracking-widest border-b border-white/10 text-right">Capacity (T/Day)</th>
              <th className="px-6 py-4 font-black uppercase text-[10px] tracking-widest border-b border-white/10 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {capacities.map((item, idx) => (
              <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-6 py-4 font-bold text-slate-900">{item.shop}</td>
                <td className="px-6 py-4 text-slate-500 font-medium">{item.location || '-'}</td>
                <td className="px-6 py-4 text-[10px] font-bold text-amber-600 uppercase">{item.machine_name || '-'}</td>
                <td className="px-6 py-4 font-bold text-slate-700">{item.process || '-'}</td>
                <td className="px-6 py-4 text-right">
                  <span className="inline-flex items-center px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 font-black text-xs">
                    {item.rate_per_day}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-1">
                    <button onClick={() => handleOpen(item)} className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={async () => { if(window.confirm('Delete entry?')) { await capacityAPI.delete(item.id); refresh(); } }} className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
            {capacities.length === 0 && (
              <tr>
                <td colSpan="6" className="px-6 py-12 text-center text-slate-400 italic">No records found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200">
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900">Edit Capacity (Summary)</h3>
              <button onClick={() => setShowModal(false)} className="p-2 rounded-xl text-slate-400 hover:text-slate-600"><X className="w-6 h-6" /></button>
            </div>
            <form onSubmit={handleSave} className="p-8 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Shop Name</label>
                  <input required className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-500/5 transition-all" value={form.shop} onChange={e => setForm({...form, shop: e.target.value})} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Location</label>
                  <input className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-500/5 transition-all" value={form.location} onChange={e => setForm({...form, location: e.target.value})} />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Process Name</label>
                <input required className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-500/5 transition-all" value={form.process} onChange={e => setForm({...form, process: e.target.value})} />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Rate per Day (Tonnes)</label>
                <input type="number" step="0.01" required className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-500/5 transition-all" value={form.rate_per_day} onChange={e => setForm({...form, rate_per_day: e.target.value})} />
              </div>
              <button type="submit" disabled={loading} className="w-full py-4 rounded-2xl bg-slate-900 text-white font-bold text-sm shadow-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Update Capacity
              </button>
            </form>
          </div>
        </div>
      )}
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
                  <input required className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-500/5 transition-all" value={form.shop} onChange={e => setForm({...form, shop: e.target.value})} placeholder="Main Shop" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Location</label>
                  <input className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-500/5 transition-all" value={form.location} onChange={e => setForm({...form, location: e.target.value})} placeholder="Section A" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Category</label>
                <select className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 outline-none appearance-none bg-slate-50/50" value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
                  <option value="Machine">Machine</option>
                  <option value="Manual">Manual</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Machine (Optional)</label>
                <select className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 outline-none appearance-none bg-slate-50/50" value={form.machine || ''} onChange={e => setForm({...form, machine: e.target.value || null})}>
                  <option value="">Select Machine</option>
                  {machines.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Process Name</label>
                <input required className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-500/5 transition-all" value={form.process} onChange={e => setForm({...form, process: e.target.value})} placeholder="e.g. Drilling" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Rate per Day (Tonnes)</label>
                <input type="number" step="0.01" required className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-500/5 transition-all" value={form.rate_per_day} onChange={e => setForm({...form, rate_per_day: e.target.value})} placeholder="0.00" />
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
  const [form, setForm] = useState({ name: '', machine_id: '', make: '', capacity_per_day: '', model_no: '', serial_no: '', shop: '', commissioned_date: '', validity_year: '', other_fields: {} });

  const handleOpen = (item = null) => {
    if (item) {
      setEditItem(item);
      setForm({ ...item });
    } else {
      setEditItem(null);
      setForm({ name: '', machine_id: '', make: '', capacity_per_day: '', model_no: '', serial_no: '', shop: '', commissioned_date: '', validity_year: '', other_fields: {} });
    }
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editItem) await machineAPI.update(editItem.id, form);
      else await machineAPI.create(form);
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
              <th className="px-6 py-4 font-black uppercase text-[10px] tracking-widest border-b border-white/10 text-right">Capacity/Day</th>
              <th className="px-6 py-4 font-black uppercase text-[10px] tracking-widest border-b border-white/10">Model No</th>
              <th className="px-6 py-4 font-black uppercase text-[10px] tracking-widest border-b border-white/10">Serial No</th>
              <th className="px-6 py-4 font-black uppercase text-[10px] tracking-widest border-b border-white/10">Shop</th>
              <th className="px-6 py-4 font-black uppercase text-[10px] tracking-widest border-b border-white/10">Commissioned Date</th>
              <th className="px-6 py-4 font-black uppercase text-[10px] tracking-widest border-b border-white/10">Validity Year</th>
              <th className="px-6 py-4 font-black uppercase text-[10px] tracking-widest border-b border-white/10">Other Fields</th>
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
                <td className="px-6 py-4 text-right font-black text-emerald-600">{m.capacity_per_day} T</td>
                <td className="px-6 py-4 text-xs font-medium text-slate-600">{m.model_no || '-'}</td>
                <td className="px-6 py-4 text-xs font-medium text-slate-600">{m.serial_no || '-'}</td>
                <td className="px-6 py-4 text-xs font-bold text-slate-900">{m.shop || '-'}</td>
                <td className="px-6 py-4 font-medium text-slate-600">{m.commissioned_date || 'N/A'}</td>
                <td className="px-6 py-4 font-medium text-slate-600">{m.validity_year || 'N/A'}</td>
                <td className="px-6 py-4">
                  <p className="text-[10px] text-slate-400 italic truncate max-w-[150px]">
                    {typeof m.other_fields === 'string' ? m.other_fields : JSON.stringify(m.other_fields)}
                  </p>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-1">
                    <button onClick={() => handleOpen(m)} className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={async () => { if(window.confirm('Delete machine?')) { await machineAPI.delete(m.id); refresh(); } }} className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all"><Trash2 className="w-4 h-4" /></button>
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
                  <input required className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-500/5 transition-all" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g. CNC Plasma Cutter" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Machine ID</label>
                  <input className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-500/5 transition-all" value={form.machine_id} onChange={e => setForm({...form, machine_id: e.target.value})} placeholder="MC-001" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Make</label>
                <input required className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-500/5 transition-all" value={form.make} onChange={e => setForm({...form, make: e.target.value})} placeholder="e.g. Voortman" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Capacity per Day (T)</label>
                  <input type="number" step="0.01" className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-500/5 transition-all" value={form.capacity_per_day} onChange={e => setForm({...form, capacity_per_day: e.target.value})} placeholder="0.00" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Shop</label>
                  <input className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-500/5 transition-all" value={form.shop} onChange={e => setForm({...form, shop: e.target.value})} placeholder="Main Shop" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Model No</label>
                  <input className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-500/5 transition-all" value={form.model_no} onChange={e => setForm({...form, model_no: e.target.value})} placeholder="V630" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Serial No</label>
                  <input className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-500/5 transition-all" value={form.serial_no} onChange={e => setForm({...form, serial_no: e.target.value})} placeholder="SN-12345" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Commissioned Date</label>
                  <input type="date" className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-500/5 transition-all" value={form.commissioned_date || ''} onChange={e => setForm({...form, commissioned_date: e.target.value})} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Validity (MM/YY)</label>
                  <input className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-500/5 transition-all" value={form.validity_year || ''} onChange={e => setForm({...form, validity_year: e.target.value})} placeholder="12/26" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Other Fields (Notes)</label>
                <textarea className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-500/5 transition-all min-h-[80px]" value={typeof form.other_fields === 'string' ? form.other_fields : JSON.stringify(form.other_fields, null, 2)} onChange={e => setForm({...form, other_fields: e.target.value})} placeholder="Additional details..." />
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
  const [form, setForm] = useState({ employee_name: '', skill_level: 'Medium', process: '', productivity_rate_per_day: '', rate_per_day: '' });

  const handleOpen = (item = null) => {
    if (item) {
      setEditItem(item);
      setForm({ ...item });
    } else {
      setEditItem(null);
      setForm({ employee_name: '', skill_level: 'Medium', process: '', productivity_rate_per_day: '', rate_per_day: '' });
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
              <th className="px-6 py-4 font-black uppercase text-[10px] tracking-widest border-b border-white/10 text-right">Productivity Rate/Day</th>
              <th className="px-6 py-4 font-black uppercase text-[10px] tracking-widest border-b border-white/10 text-right">Rate / Day</th>
              <th className="px-6 py-4 font-black uppercase text-[10px] tracking-widest border-b border-white/10 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.map(item => (
              <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-6 py-4 font-bold text-slate-900">{item.employee_name}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-widest ${
                    item.skill_level === 'High' ? 'bg-emerald-50 text-emerald-600' :
                    item.skill_level === 'Medium' ? 'bg-amber-50 text-amber-600' :
                    'bg-slate-50 text-slate-500'
                  }`}>
                    {item.skill_level}
                  </span>
                </td>
                <td className="px-6 py-4 font-bold text-slate-600">{item.process}</td>
                <td className="px-6 py-4 text-right font-bold text-blue-600">{item.productivity_rate_per_day} T</td>
                <td className="px-6 py-4 text-right font-bold text-emerald-600">{item.rate_per_day} T</td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-1">
                    <button onClick={() => handleOpen(item)} className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={async () => { if(window.confirm('Delete entry?')) { await manpowerAPI.delete(item.id); refresh(); } }} className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all"><Trash2 className="w-4 h-4" /></button>
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
                <input required className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-500/5 transition-all" value={form.employee_name} onChange={e => setForm({...form, employee_name: e.target.value})} placeholder="e.g. Robert Smith" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Skill Level</label>
                <select className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 outline-none appearance-none bg-slate-50/50" value={form.skill_level} onChange={e => setForm({...form, skill_level: e.target.value})}>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Process / Trade</label>
                <input required className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-500/5 transition-all" value={form.process} onChange={e => setForm({...form, process: e.target.value})} placeholder="e.g. Senior Welder" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Productivity Rate / Day (Tonnes)</label>
                <input type="number" step="0.01" required className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-500/5 transition-all" value={form.productivity_rate_per_day} onChange={e => setForm({...form, productivity_rate_per_day: e.target.value})} placeholder="0.00" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Rate / Day (Tonnes)</label>
                <input type="number" step="0.01" required className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-500/5 transition-all" value={form.rate_per_day} onChange={e => setForm({...form, rate_per_day: e.target.value})} placeholder="0.00" />
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
