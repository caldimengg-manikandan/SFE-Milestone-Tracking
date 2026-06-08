import { useState, useEffect } from 'react';
import { Users, Plus, Search, Edit2, Trash2, X, ChevronDown, Download, Filter, Loader2, Mail, Phone, MapPin, Briefcase, Eye } from 'lucide-react';
import { employeeAPI } from '../services/api';
import FormattedDateInput from '../components/forms/FormattedDateInput';

const departments = ['All', 'Fabrication', 'Design', 'Quality', 'Admin', 'Operations'];

export default function EmployeeMaster() {
  const [employees, setEmployees] = useState([]);
  const [nameFilter, setNameFilter] = useState('All');
  const [designationFilter, setDesignationFilter] = useState('All');
  const [deptFilter, setDeptFilter] = useState('All');
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editEmployee, setEditEmployee] = useState(null);
  const [activeTab, setActiveTab] = useState('personal');
  const [isViewMode, setIsViewMode] = useState(false);

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
    setNameFilter('All');
    setDesignationFilter('All');
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
    if (activeTab === 'personal') {
      setActiveTab('employment');
      return;
    }
    if (isViewMode) return;
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
    setIsViewMode(false);
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
    setIsViewMode(false);
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

  const openView = (emp) => {
    openEdit(emp);
    setIsViewMode(true);
  };

  const filtered = employees.filter((e) => {
    const matchName = nameFilter === 'All' || (e.name && e.name.toLowerCase().trim() === nameFilter.toLowerCase().trim());
    const matchDesignation = designationFilter === 'All' || (e.designation && e.designation.toLowerCase().trim() === designationFilter.toLowerCase().trim());
    const matchDept = deptFilter === 'All' || (e.department && e.department.toLowerCase().trim() === deptFilter.toLowerCase().trim());
    return matchName && matchDesignation && matchDept;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-end">
        <button
          onClick={openAdd}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-bold shadow-lg shadow-amber-500/20 hover:from-amber-400 hover:to-orange-400 transition-all hover:shadow-xl transform hover:scale-[1.02]"
        >
          <Plus className="w-4 h-4" /> Add Employee
        </button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Name Filter */}
        <div className="relative">
          <select
            value={nameFilter}
            onChange={(e) => setNameFilter(e.target.value)}
            className="w-full pl-4 pr-10 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-medium text-slate-700 outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-500/5 transition-all appearance-none cursor-pointer"
          >
            <option value="All">All Employees</option>
            {[...new Set(employees.map(e => e.name))].filter(Boolean).map(name => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>

        {/* Designation Filter */}
        <div className="relative">
          <select
            value={designationFilter}
            onChange={(e) => setDesignationFilter(e.target.value)}
            className="w-full pl-4 pr-10 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-medium text-slate-700 outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-500/5 transition-all appearance-none cursor-pointer"
          >
            <option value="All">All Designations</option>
            {[...new Set(employees.map(e => e.designation))].filter(Boolean).map(desig => (
              <option key={desig} value={desig}>{desig}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>

        {/* Department Filter */}
        <div className="relative">
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="w-full pl-4 pr-10 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-medium text-slate-700 outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-500/5 transition-all appearance-none cursor-pointer"
          >
            {departments.map((d) => (
              <option key={d} value={d}>{d === 'All' ? 'All Departments' : d}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl border border-slate-300 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-300 bg-white">
                <th className="text-left px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Employee Name</th>
                <th className="text-left px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Employee Code</th>
                <th className="text-left px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest hidden md:table-cell">Department</th>
                <th className="text-left px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest hidden md:table-cell">Designation</th>
                <th className="text-left px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest hidden xl:table-cell">Contact Info</th>
                <th className="text-left px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Status</th>
                <th className="text-right px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={7} className="py-20 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-amber-500 mb-2" /><p className="text-xs font-bold text-slate-400">Loading records...</p></td></tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-20 text-center">
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
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="text-xs font-black text-amber-600 uppercase tracking-widest">{emp.emp_id}</div>
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
                        <button onClick={() => openView(emp)} className="p-2.5 rounded-xl text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all" title="View"><Eye className="w-4 h-4" /></button>
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
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight">{isViewMode ? 'View Profile' : editEmployee ? 'Update Profile' : 'Register Employee'}</h3>
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
                  type="button"
                  onClick={() => {
                    if (isViewMode || tab === 'personal') setActiveTab(tab);
                  }}
                  className={`flex-1 py-4 text-xs font-black uppercase tracking-[0.2em] transition-all border-b-4 ${activeTab === tab ? 'border-amber-500 text-slate-900' : 'border-transparent text-slate-400'
                    } ${(!isViewMode && tab === 'employment' && activeTab === 'personal') ? 'cursor-not-allowed opacity-50' : tab === 'personal' || isViewMode ? 'hover:text-slate-600 cursor-pointer' : ''}`}
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
                        disabled={isViewMode}
                        className="w-full px-5 py-4 rounded-2xl border border-slate-300 bg-white text-sm font-bold text-slate-700 focus:border-amber-400 focus:ring-4 focus:ring-amber-500/5 transition-all outline-none shadow-sm disabled:opacity-75 disabled:bg-slate-50"
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
                        disabled={isViewMode}
                        className="w-full px-5 py-4 rounded-2xl border border-slate-300 bg-white text-sm font-bold text-slate-700 focus:border-amber-400 focus:ring-4 focus:ring-amber-500/5 transition-all outline-none shadow-sm disabled:opacity-75 disabled:bg-slate-50"
                        placeholder="john@company.com"
                        value={form.email}
                        onChange={e => setForm({ ...form, email: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Phone Number</label>
                      <input
                        required
                        disabled={isViewMode}
                        type="tel"
                        pattern="[0-9]{10}"
                        title="Phone number must be exactly 10 digits"
                        maxLength="10"
                        className="w-full px-5 py-4 rounded-2xl border border-slate-300 bg-white text-sm font-bold text-slate-700 focus:border-amber-400 focus:ring-4 focus:ring-amber-500/5 transition-all outline-none shadow-sm disabled:opacity-75 disabled:bg-slate-50"
                        placeholder="1234567890"
                        value={form.phone}
                        onChange={e => setForm({ ...form, phone: e.target.value.replace(/\D/g, '') })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Location</label>
                      <input
                        required
                        disabled={isViewMode}
                        className="w-full px-5 py-4 rounded-2xl border border-slate-300 bg-white text-sm font-bold text-slate-700 focus:border-amber-400 focus:ring-4 focus:ring-amber-500/5 transition-all outline-none shadow-sm disabled:opacity-75 disabled:bg-slate-50"
                        placeholder="New York, USA"
                        value={form.location}
                        onChange={e => setForm({ ...form, location: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Date of Birth</label>
                      <FormattedDateInput
                        required
                        disabled={isViewMode}
                        className="w-full px-5 py-4 rounded-2xl border border-slate-300 bg-white text-sm font-bold text-slate-700 focus:border-amber-400 focus:ring-4 focus:ring-amber-500/5 transition-all outline-none shadow-sm disabled:opacity-75 disabled:bg-slate-50"
                        value={form.dob}
                        onChange={e => setForm({ ...form, dob: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Gender</label>
                      <select
                        required
                        disabled={isViewMode}
                        value={form.gender}
                        onChange={e => setForm({ ...form, gender: e.target.value })}
                        className="w-full px-5 py-4 rounded-2xl border border-slate-300 bg-white text-sm font-bold text-slate-700 focus:border-amber-400 focus:ring-4 focus:ring-amber-500/5 transition-all outline-none appearance-none shadow-sm disabled:opacity-75 disabled:bg-slate-50"
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
                        disabled={isViewMode}
                        className="w-full px-5 py-4 rounded-2xl border border-slate-300 bg-white text-sm font-bold text-slate-700 focus:border-amber-400 focus:ring-4 focus:ring-amber-500/5 transition-all outline-none shadow-sm disabled:opacity-75 disabled:bg-slate-50"
                        placeholder="SFE-000"
                        value={form.emp_id}
                        onChange={e => setForm({ ...form, emp_id: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Designation</label>
                      <input
                        required
                        disabled={isViewMode}
                        className="w-full px-5 py-4 rounded-2xl border border-slate-300 bg-white text-sm font-bold text-slate-700 focus:border-amber-400 focus:ring-4 focus:ring-amber-500/5 transition-all outline-none shadow-sm disabled:opacity-75 disabled:bg-slate-50"
                        placeholder="Project Manager"
                        value={form.designation}
                        onChange={e => setForm({ ...form, designation: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Department</label>
                      <select
                        required
                        disabled={isViewMode}
                        value={form.department}
                        onChange={e => setForm({ ...form, department: e.target.value })}
                        className="w-full px-5 py-4 rounded-2xl border border-slate-300 bg-white text-sm font-bold text-slate-700 focus:border-amber-400 focus:ring-4 focus:ring-amber-500/5 transition-all outline-none appearance-none shadow-sm disabled:opacity-75 disabled:bg-slate-50"
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
                        disabled={isViewMode}
                        value={form.status}
                        onChange={e => setForm({ ...form, status: e.target.value })}
                        className="w-full px-5 py-4 rounded-2xl border border-slate-300 bg-white text-sm font-bold text-slate-700 focus:border-amber-400 focus:ring-4 focus:ring-amber-500/5 transition-all outline-none appearance-none shadow-sm disabled:opacity-75 disabled:bg-slate-50"
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
              <div className="flex justify-between gap-4 px-10 py-8 border-t border-slate-300 bg-white mt-auto">
                <div>
                  {activeTab === 'employment' && (
                    <button
                      type="button"
                      onClick={() => setActiveTab('personal')}
                      className="px-8 py-3.5 rounded-2xl border border-slate-300 text-xs font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
                    >
                      Previous
                    </button>
                  )}
                </div>
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-8 py-3.5 rounded-2xl border border-transparent text-xs font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 transition-all"
                  >
                    {isViewMode ? 'Close' : 'Discard'}
                  </button>
                  {activeTab === 'personal' ? (
                    <button
                      type={isViewMode ? "button" : "submit"}
                      onClick={isViewMode ? () => setActiveTab('employment') : undefined}
                      className="px-10 py-3.5 rounded-2xl bg-slate-900 text-white text-xs font-black uppercase tracking-[0.2em] shadow-2xl hover:bg-slate-800 transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center gap-2"
                    >
                      Next Step
                    </button>
                  ) : !isViewMode && (
                    <button
                      type="submit"
                      disabled={saving}
                      className="px-10 py-3.5 rounded-2xl bg-slate-900 text-white text-xs font-black uppercase tracking-[0.2em] shadow-2xl hover:bg-slate-800 transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 flex items-center gap-2"
                    >
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      {saving ? 'Processing...' : editEmployee ? 'Update Profile' : 'Create Identity'}
                    </button>
                  )}
                </div>
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
