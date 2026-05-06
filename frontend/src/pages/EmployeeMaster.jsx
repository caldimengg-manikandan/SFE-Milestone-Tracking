import { useState } from 'react';
import { Users, Plus, Search, Edit2, Trash2, X, ChevronDown, Download, Filter } from 'lucide-react';

const mockEmployees = [
  { id: 1, name: 'Rajesh Kumar', empId: 'SFE-001', department: 'Fabrication', designation: 'Senior Engineer', phone: '+91 98765 43210', email: 'rajesh@steelfab.com', status: 'Active', joinDate: '2024-03-15' },
  { id: 2, name: 'Priya Sharma', empId: 'SFE-002', department: 'Design', designation: 'Lead Designer', phone: '+91 98765 43211', email: 'priya@steelfab.com', status: 'Active', joinDate: '2024-05-20' },
  { id: 3, name: 'Arun Patel', empId: 'SFE-003', department: 'Quality', designation: 'QC Inspector', phone: '+91 98765 43212', email: 'arun@steelfab.com', status: 'Active', joinDate: '2024-08-10' },
  { id: 4, name: 'Meena Iyer', empId: 'SFE-004', department: 'Admin', designation: 'HR Manager', phone: '+91 98765 43213', email: 'meena@steelfab.com', status: 'On Leave', joinDate: '2023-11-01' },
  { id: 5, name: 'Vikram Singh', empId: 'SFE-005', department: 'Operations', designation: 'Site Supervisor', phone: '+91 98765 43214', email: 'vikram@steelfab.com', status: 'Active', joinDate: '2025-01-12' },
];

const departments = ['All', 'Fabrication', 'Design', 'Quality', 'Admin', 'Operations'];

export default function EmployeeMaster() {
  const [employees] = useState(mockEmployees);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('All');
  const [showModal, setShowModal] = useState(false);
  const [editEmployee, setEditEmployee] = useState(null);
  const [activeTab, setActiveTab] = useState('personal');

  const filtered = employees.filter(
    (e) =>
      (deptFilter === 'All' || e.department === deptFilter) &&
      (e.name.toLowerCase().includes(search.toLowerCase()) ||
        e.empId.toLowerCase().includes(search.toLowerCase()))
  );

  const openAdd = () => { setActiveTab('personal'); setEditEmployee(null); setShowModal(true); };
  const openEdit = (emp) => { setActiveTab('personal'); setEditEmployee(emp); setShowModal(true); };

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
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-bold shadow-lg shadow-amber-500/20 hover:from-amber-400 hover:to-orange-400 transition-all hover:shadow-xl"
        >
          <Plus className="w-4 h-4" /> Add Employee
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-500/10 transition-all"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
          {departments.map((d) => (
            <button
              key={d}
              onClick={() => setDeptFilter(d)}
              className={`px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                deptFilter === d
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'bg-white text-slate-500 border border-slate-200 hover:border-amber-300 hover:text-amber-600'
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Employee</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Department</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden lg:table-cell">Designation</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden xl:table-cell">Contact</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="text-right px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((emp) => (
                <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center text-xs font-bold text-amber-700 shrink-0">
                        {emp.name.split(' ').map((n) => n[0]).join('')}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-800 truncate">{emp.name}</p>
                        <p className="text-xs text-slate-400">{emp.empId}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 hidden md:table-cell">
                    <span className="text-slate-600">{emp.department}</span>
                  </td>
                  <td className="px-5 py-4 hidden lg:table-cell">
                    <span className="text-slate-600">{emp.designation}</span>
                  </td>
                  <td className="px-5 py-4 hidden xl:table-cell">
                    <p className="text-slate-600">{emp.email}</p>
                    <p className="text-xs text-slate-400">{emp.phone}</p>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                      emp.status === 'Active' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${emp.status === 'Active' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                      {emp.status}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(emp)} className="p-2 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors" title="Edit">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="Delete">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center">
                    <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                    <p className="text-sm font-semibold text-slate-500">No employees found</p>
                    <p className="text-xs text-slate-400 mt-1">Try adjusting your search or filters</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-slate-50/30">
          <p className="text-xs text-slate-500">Showing <strong>{filtered.length}</strong> of {employees.length} employees</p>
          <div className="flex gap-1">
            <button className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:bg-slate-100 transition-colors">Previous</button>
            <button className="px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-500 text-white">1</button>
            <button className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:bg-slate-100 transition-colors">Next</button>
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">{editEmployee ? 'Edit Employee' : 'Add New Employee'}</h3>
                  <p className="text-xs text-slate-500">Fill in the details to {editEmployee ? 'update' : 'register'} an employee</p>
                </div>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tab Navigation */}
            <div className="flex px-6 border-b border-slate-100 bg-white">
              <button
                onClick={() => setActiveTab('personal')}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold transition-all border-b-2 ${
                  activeTab === 'personal'
                    ? 'border-amber-500 text-amber-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                Personal Information
              </button>
              <button
                onClick={() => setActiveTab('employment')}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold transition-all border-b-2 ${
                  activeTab === 'employment'
                    ? 'border-amber-500 text-amber-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                Employment Details
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-8 overflow-y-auto custom-scrollbar">
              {activeTab === 'personal' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Full Name</label>
                    <input
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-sm focus:border-amber-400 focus:ring-4 focus:ring-amber-500/10 transition-all outline-none"
                      placeholder="e.g. Rajesh Kumar"
                      defaultValue={editEmployee?.name}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Location</label>
                    <input
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-sm focus:border-amber-400 focus:ring-4 focus:ring-amber-500/10 transition-all outline-none"
                      placeholder="e.g. Mumbai, India"
                      defaultValue={editEmployee?.location}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Social Security Number (SSN)</label>
                    <input
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-sm focus:border-amber-400 focus:ring-4 focus:ring-amber-500/10 transition-all outline-none"
                      placeholder="XXX-XX-XXXX"
                      defaultValue={editEmployee?.ssn}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Date of Birth</label>
                    <input
                      type="date"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-sm focus:border-amber-400 focus:ring-4 focus:ring-amber-500/10 transition-all outline-none"
                      defaultValue={editEmployee?.dob}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Gender</label>
                    <select className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-sm focus:border-amber-400 focus:ring-4 focus:ring-amber-500/10 transition-all outline-none appearance-none">
                      <option value="">Select Gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Marital Status</label>
                    <select className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-sm focus:border-amber-400 focus:ring-4 focus:ring-amber-500/10 transition-all outline-none appearance-none">
                      <option value="">Select Status</option>
                      <option value="single">Single</option>
                      <option value="married">Married</option>
                      <option value="divorced">Divorced</option>
                      <option value="widowed">Widowed</option>
                    </select>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Employee ID</label>
                    <input
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-sm focus:border-amber-400 focus:ring-4 focus:ring-amber-500/10 transition-all outline-none"
                      placeholder="e.g. SFE-001"
                      defaultValue={editEmployee?.empId}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Personnel Number</label>
                    <input
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-sm focus:border-amber-400 focus:ring-4 focus:ring-amber-500/10 transition-all outline-none"
                      placeholder="e.g. PN-12345"
                      defaultValue={editEmployee?.personnelNumber}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Designation</label>
                    <input
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-sm focus:border-amber-400 focus:ring-4 focus:ring-amber-500/10 transition-all outline-none"
                      placeholder="e.g. Senior Engineer"
                      defaultValue={editEmployee?.designation}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Department</label>
                    <select className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-sm focus:border-amber-400 focus:ring-4 focus:ring-amber-500/10 transition-all outline-none appearance-none">
                      <option value="">Select Department</option>
                      {departments.filter(d => d !== 'All').map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/30">
              <button
                onClick={() => setShowModal(false)}
                className="px-6 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-white hover:border-slate-300 transition-all"
              >
                Cancel
              </button>
              <button className="px-8 py-2.5 rounded-xl bg-gradient-to-r from-[#0c1222] to-[#1a1a2e] text-white text-sm font-bold shadow-lg hover:shadow-xl transition-all transform hover:scale-[1.02] active:scale-[0.98]">
                {editEmployee ? 'Save Changes' : 'Create Employee'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
