import { useState, useEffect } from 'react';
import { Users, Plus, Search, Edit2, Trash2, X, ChevronDown, Download, Filter, Loader2, Mail, Phone, MapPin, Briefcase } from 'lucide-react';
import { employeeAPI } from '../services/api';

const departments = ['All', 'Fabrication', 'Design', 'Quality', 'Admin', 'Operations'];

export default function EmployeeMaster() {
  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('All');
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editEmployee, setEditEmployee] = useState(null);
  const [activeTab, setActiveTab] = useState('personal');

  const [form, setForm] = useState({
    name: '',
    emp_id: '',
    personnel_number: '',
    department: '',
    designation: '',
    email: '',
    phone: '',
    location: '',
    ssn: '',
    dob: '',
    gender: '',
    marital_status: '',
    status: 'Active'
  });

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const params = {};
      if (deptFilter !== 'All') params.department = deptFilter;
      const response = await employeeAPI.getAll(params);
      setEmployees(response.data.results || response.data);
    } catch (error) {
      console.error('Error fetching employees:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [deptFilter]);

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this employee?')) {
      try {
        await employeeAPI.delete(id);
        fetchEmployees();
      } catch (error) {
        alert('Failed to delete employee');
      }
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editEmployee) {
        await employeeAPI.update(editEmployee.id, form);
      } else {
        await employeeAPI.create(form);
      }
      setShowModal(false);
      fetchEmployees();
    } catch (error) {
      const msg = error.response?.data ? Object.values(error.response.data).flat().join(' ') : 'Failed to save employee';
      alert(msg);
    } finally {
      setSaving(false);
    }
  };

  const openAdd = () => {
    setEditEmployee(null);
    setForm({
      name: '', emp_id: '', personnel_number: '', department: '', designation: '',
      email: '', phone: '', location: '', ssn: '', dob: '', gender: '',
      marital_status: '', status: 'Active'
    });
    setActiveTab('personal');
    setShowModal(true);
  };

  const openEdit = (emp) => {
    setEditEmployee(emp);
    setForm({
      name: emp.name || '',
      emp_id: emp.emp_id || '',
      personnel_number: emp.personnel_number || '',
      department: emp.department || '',
      designation: emp.designation || '',
      email: emp.email || '',
      phone: emp.phone || '',
      location: emp.location || '',
      ssn: emp.ssn || '',
      dob: emp.dob || '',
      gender: emp.gender || '',
      marital_status: emp.marital_status || '',
      status: emp.status || 'Active'
    });
    setActiveTab('personal');
    setShowModal(true);
  };

  const filtered = employees.filter(
    (e) =>
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.emp_id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Employee Master</h2>
          <p className="text-sm text-slate-500 mt-0.5">Manage employee details and records</p>
        </div>
        <button
          onClick={openAdd}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-bold shadow-lg shadow-amber-500/20 hover:from-amber-400 hover:to-orange-400 transition-all hover:shadow-xl transform hover:scale-[1.02]"
        >
          <Plus className="w-4 h-4" /> Add Employee
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-300 bg-white text-sm outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-500/5 transition-all"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
          {departments.map((d) => (
            <button
              key={d}
              onClick={() => setDeptFilter(d)}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${deptFilter === d
                  ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20'
                  : 'bg-white text-slate-500 border border-slate-300 hover:border-amber-300 hover:text-amber-600'
                }`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl border border-slate-300 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-300 bg-white">
                <th className="text-left px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Employee</th>
                <th className="text-left px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest hidden md:table-cell">Department</th>
                <th className="text-left px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest hidden md:table-cell">Designation</th>
                <th className="text-left px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest hidden xl:table-cell">Contact Info</th>
                <th className="text-left px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Status</th>
                <th className="text-right px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={6} className="py-20 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-amber-500 mb-2" /><p className="text-xs font-bold text-slate-400">Loading records...</p></td></tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-20 text-center">
                    <div className="w-16 h-16 bg-white rounded-none flex items-center justify-center mx-auto mb-4"><Users className="w-8 h-8 text-slate-200" /></div>
                    <p className="text-sm font-bold text-slate-800">No employees found</p>
                    <p className="text-xs text-slate-400 mt-1">Add your first employee to get started</p>
                  </td>
                </tr>
              ) : (
                filtered.map((emp) => (
                  <tr key={emp.id} className="hover:bg-white transition-colors group">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-xs font-black text-slate-600 shadow-inner group-hover:from-amber-100 group-hover:to-orange-100 group-hover:text-amber-700 transition-all">
                          {emp.name.split(' ').map((n) => n[0]).join('').toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 truncate">{emp.name}</p>
                          <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">{emp.emp_id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 hidden md:table-cell">
                      <div className="text-[10px] text-slate-700 font-bold uppercase tracking-tighter">{emp.department}</div>
                    </td>
                    <td className="px-6 py-5 hidden md:table-cell">
                      <div className="flex items-center gap-1.5 text-slate-700 font-bold text-xs"><Briefcase className="w-3 h-3 text-slate-400" /> {emp.designation}</div>
                    </td>
                    <td className="px-6 py-5 hidden xl:table-cell">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-slate-600 text-xs"><Mail className="w-3 h-3 text-slate-400" /> {emp.email}</div>
                        <div className="flex items-center gap-1.5 text-slate-600 text-xs font-mono"><Phone className="w-3 h-3 text-slate-400" /> {emp.phone || '-'}</div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${emp.status === 'Active' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                        }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${emp.status === 'Active' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                        {emp.status}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(emp)} className="p-2.5 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all" title="Edit"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(emp.id)} className="p-2.5 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all" title="Delete"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden border border-white/20">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-10 py-8 border-b border-slate-300 bg-white">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-xl shadow-amber-500/20">
                  <Users className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight">{editEmployee ? 'Update Profile' : 'Register Employee'}</h3>
                  <p className="text-sm text-slate-500 font-medium">Manage corporate identity and profile details</p>
                </div>
              </div>
              <button onClick={() => setShowModal(false)} className="p-3 rounded-2xl text-slate-400 hover:text-slate-600 hover:bg-white transition-all">
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Tab Navigation */}
            <div className="flex px-10 border-b border-slate-300 bg-white">
              {['personal', 'employment'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-4 text-xs font-black uppercase tracking-[0.2em] transition-all border-b-4 ${activeTab === tab ? 'border-amber-500 text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-600'
                    }`}
                >
                  {tab === 'personal' ? 'Personal Profile' : 'Professional Info'}
                </button>
              ))}
            </div>

            {/* Modal Content */}
            <form onSubmit={handleSave} className="flex-1 overflow-y-auto custom-scrollbar">
              <div className="p-10">
                {activeTab === 'personal' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-fade-in">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                      <input
                        required
                        className="w-full px-5 py-4 rounded-2xl border border-slate-300 bg-white text-sm font-bold text-slate-700 focus:border-amber-400 focus:ring-4 focus:ring-amber-500/5 transition-all outline-none shadow-sm"
                        placeholder="John Doe"
                        value={form.name}
                        onChange={e => setForm({ ...form, name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
                      <input
                        type="email"
                        required
                        className="w-full px-5 py-4 rounded-2xl border border-slate-300 bg-white text-sm font-bold text-slate-700 focus:border-amber-400 focus:ring-4 focus:ring-amber-500/5 transition-all outline-none shadow-sm"
                        placeholder="john@company.com"
                        value={form.email}
                        onChange={e => setForm({ ...form, email: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Phone Number</label>
                      <input
                        className="w-full px-5 py-4 rounded-2xl border border-slate-300 bg-white text-sm font-bold text-slate-700 focus:border-amber-400 focus:ring-4 focus:ring-amber-500/5 transition-all outline-none shadow-sm"
                        placeholder="+1 (555) 000-0000"
                        value={form.phone}
                        onChange={e => setForm({ ...form, phone: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Location</label>
                      <input
                        className="w-full px-5 py-4 rounded-2xl border border-slate-300 bg-white text-sm font-bold text-slate-700 focus:border-amber-400 focus:ring-4 focus:ring-amber-500/5 transition-all outline-none shadow-sm"
                        placeholder="New York, USA"
                        value={form.location}
                        onChange={e => setForm({ ...form, location: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Date of Birth</label>
                      <input
                        type="date"
                        className="w-full px-5 py-4 rounded-2xl border border-slate-300 bg-white text-sm font-bold text-slate-700 focus:border-amber-400 focus:ring-4 focus:ring-amber-500/5 transition-all outline-none shadow-sm"
                        value={form.dob}
                        onChange={e => setForm({ ...form, dob: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Gender</label>
                      <select
                        value={form.gender}
                        onChange={e => setForm({ ...form, gender: e.target.value })}
                        className="w-full px-5 py-4 rounded-2xl border border-slate-300 bg-white text-sm font-bold text-slate-700 focus:border-amber-400 focus:ring-4 focus:ring-amber-500/5 transition-all outline-none appearance-none shadow-sm"
                      >
                        <option value="">Select Gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-fade-in">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Employee ID</label>
                      <input
                        required
                        className="w-full px-5 py-4 rounded-2xl border border-slate-300 bg-white text-sm font-bold text-slate-700 focus:border-amber-400 focus:ring-4 focus:ring-amber-500/5 transition-all outline-none shadow-sm"
                        placeholder="SFE-000"
                        value={form.emp_id}
                        onChange={e => setForm({ ...form, emp_id: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Designation</label>
                      <input
                        required
                        className="w-full px-5 py-4 rounded-2xl border border-slate-300 bg-white text-sm font-bold text-slate-700 focus:border-amber-400 focus:ring-4 focus:ring-amber-500/5 transition-all outline-none shadow-sm"
                        placeholder="Project Manager"
                        value={form.designation}
                        onChange={e => setForm({ ...form, designation: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Department</label>
                      <select
                        required
                        value={form.department}
                        onChange={e => setForm({ ...form, department: e.target.value })}
                        className="w-full px-5 py-4 rounded-2xl border border-slate-300 bg-white text-sm font-bold text-slate-700 focus:border-amber-400 focus:ring-4 focus:ring-amber-500/5 transition-all outline-none appearance-none shadow-sm"
                      >
                        <option value="">Select Dept</option>
                        {departments.filter(d => d !== 'All').map(d => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Current Status</label>
                      <select
                        value={form.status}
                        onChange={e => setForm({ ...form, status: e.target.value })}
                        className="w-full px-5 py-4 rounded-2xl border border-slate-300 bg-white text-sm font-bold text-slate-700 focus:border-amber-400 focus:ring-4 focus:ring-amber-500/5 transition-all outline-none appearance-none shadow-sm"
                      >
                        <option value="Active">Active</option>
                        <option value="On Leave">On Leave</option>
                        <option value="Inactive">Inactive</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="flex justify-end gap-4 px-10 py-8 border-t border-slate-300 bg-white mt-auto">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-8 py-3.5 rounded-2xl border border-slate-300 text-xs font-black uppercase tracking-widest text-slate-500 hover:bg-white hover:border-slate-300 transition-all shadow-sm"
                >
                  Discard
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-10 py-3.5 rounded-2xl bg-slate-900 text-white text-xs font-black uppercase tracking-[0.2em] shadow-2xl hover:bg-slate-800 transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 flex items-center gap-2"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {saving ? 'Processing...' : editEmployee ? 'Update Profile' : 'Create Identity'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function Save({ className, ...props }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <polyline points="17 21 17 13 7 13 7 21" />
      <polyline points="7 3 7 8 15 8" />
    </svg>
  );
}
