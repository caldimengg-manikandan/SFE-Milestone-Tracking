import { useState, useEffect } from 'react';
import { 
  Users, Shield, Search, AlertCircle, RefreshCw, 
  Eye, Edit2, Trash2, Plus, X, Download, Filter, Key, Check, Info, Mail, User, ShieldAlert
} from 'lucide-react';
import { authAPI, employeeAPI } from '../services/api';
import toast from 'react-hot-toast';


// Module mapping config to align exact path/id with name, icon and category
const MODULE_CONFIG = [
  { key: '/dashboard', name: 'Dashboard', category: 'Overview' },
  { key: '/rfq', name: 'RFQ Master', category: 'Bid Management' },
  { key: '/bids/schedule', name: 'Internal Bid Schedule', category: 'Bid Management' },
  { key: '/bids/holidays', name: 'Holiday Calendar', category: 'Bid Management' },
  { key: '/estimation-summary', name: 'Estimation Summary', category: 'Bid Management' },
  { key: '/estimation-erection', name: 'Estimation', category: 'Bid Management' },
  { key: 'employees', name: 'Employee Master', category: 'Management' },
  { key: 'customers', name: 'Customer Master', category: 'Management' },
  { key: 'detailers', name: 'Detailer Master', category: 'Management' },
  { key: 'steel-budget/input', name: 'Design Inputs', category: 'Budget Estimator' },
  { key: 'steel-budget/result', name: 'Estimation Result', category: 'Budget Estimator' },
  { key: 'projects', name: 'Project Master', category: 'Project Management' },
  { key: '/structural/plan-creation', name: 'Plan Creation', category: 'Structural Schedule' },
  { key: '/structural/plan-tracking', name: 'Plan Tracking', category: 'Structural Schedule' },
  { key: '/production/priority-schedule', name: 'Production Schedule', category: 'Production Management' },
  { key: '/production/process-master', name: 'Process Master', category: 'Production Management' },
  { key: '/production/capacity-mapping/capacity', name: 'Capacity Configuration', category: 'Capacity Mapping' },
  { key: '/production/capacity-mapping/machine', name: 'Machine Master', category: 'Capacity Mapping' },
  { key: '/production/capacity-mapping/manpower', name: 'Workforce Master', category: 'Capacity Mapping' },
  { key: 'settings', name: 'Settings', category: 'System' },
  { key: 'announcements', name: 'Announcement', category: 'System' }
];

const CATEGORIES = [
  'Overview',
  'Bid Management',
  'Management',
  'Budget Estimator',
  'Project Management',
  'Structural Schedule',
  'Production Management',
  'Capacity Mapping',
  'System'
];

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Admin' },
  { value: 'manager', label: 'Manager' },
  { value: 'employee', label: 'Employee' },
  { value: 'estimator', label: 'Estimator' },
  { value: 'detailing', label: 'Detailing / JF' }
];

export default function UserAccess() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [updatingUserId, setUpdatingUserId] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  
  // Form states
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    initials: '',
    email: '',
    role: 'employee',
    phone: '',
    department: '',
    password: '',
    confirmPassword: ''
  });
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);

  const loggedInUser = JSON.parse(sessionStorage.getItem('user') || '{}');

  useEffect(() => {
    fetchUsers();
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      setLoadingEmployees(true);
      const res = await employeeAPI.getAll();
      setEmployees(res.data.results || res.data || []);
    } catch (err) {
      toast.error('Failed to load employee list.');
      console.error(err);
    } finally {
      setLoadingEmployees(false);
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await authAPI.listUsers();
      setUsers(res.data);
    } catch (err) {
      toast.error('Failed to load user records.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleModule = async (user, moduleKey) => {
    const isAllowed = user.allowed_modules?.includes(moduleKey);
    let updatedModules = [];
    
    if (isAllowed) {
      updatedModules = user.allowed_modules.filter(k => k !== moduleKey);
    } else {
      updatedModules = [...(user.allowed_modules || []), moduleKey];
    }

    setUpdatingUserId(user.id);
    try {
      const res = await authAPI.updateUserAccess(user.id, updatedModules);
      // Update local state list
      setUsers(prevUsers => prevUsers.map(u => u.id === user.id ? res.data : u));
      // Update selectedUser if modal is open
      if (selectedUser && selectedUser.id === user.id) {
        setSelectedUser(res.data);
      }
      toast.success(`Access updated for ${user.first_name || user.email}`);
    } catch (err) {
      toast.error('Failed to update module access permissions.');
      console.error(err);
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const handleEmployeeSelect = (e) => {
    const empId = e.target.value;
    if (!empId) return;

    const emp = employees.find(em => String(em.id) === String(empId));
    if (emp) {
      const nameVal = emp.name || '';
      const parts = nameVal.trim().split(/\s+/);
      const first_name = parts[0] || '';
      const last_name = parts.slice(1).join(' ') || '';
      
      const initials = parts.map(p => p[0] || '').join('').toUpperCase().slice(0, 5);

      setFormData(prev => ({
        ...prev,
        first_name,
        last_name,
        email: emp.email || '',
        initials,
        department: emp.department || '',
        phone: emp.phone || ''
      }));

      // Clear errors for auto-filled fields
      setFormErrors(prev => ({
        ...prev,
        first_name: null,
        last_name: null,
        email: null,
        initials: null
      }));
    }
  };

  const validateForm = (isEdit = false) => {
    const errors = {};
    if (!formData.email) errors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) errors.email = 'Invalid email address';
    
    if (!formData.first_name) errors.first_name = 'First name is required';
    if (!formData.last_name) errors.last_name = 'Last name is required';
    
    // Initials: require 2-3 characters (can be uppercase/lowercase, will be converted to uppercase)
    if (!formData.initials) errors.initials = 'Initials are required';
    else if (formData.initials.length < 2 || formData.initials.length > 5) {
      errors.initials = 'Initials must be between 2 and 5 characters';
    }

    if (!isEdit) {
      if (!formData.password) errors.password = 'Password is required';
      else if (formData.password.length < 6) errors.password = 'Password must be at least 6 characters';
      
      if (formData.password !== formData.confirmPassword) {
        errors.confirmPassword = 'Passwords do not match';
      }
    } else {
      if (formData.password) {
        if (formData.password.length < 6) errors.password = 'Password must be at least 6 characters';
        if (formData.password !== formData.confirmPassword) {
          errors.confirmPassword = 'Passwords do not match';
        }
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAddUserSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm(false)) return;

    setSubmitting(true);
    try {
      const submitData = {
        email: formData.email,
        password: formData.password,
        first_name: formData.first_name,
        last_name: formData.last_name,
        initials: formData.initials.toUpperCase(),
        role: formData.role,
        phone: formData.phone,
        department: formData.department
      };

      await authAPI.createUser(submitData);
      toast.success('User registered successfully');
      setShowAddModal(false);
      fetchUsers();
    } catch (err) {
      const serverErrors = err.response?.data;
      if (serverErrors && typeof serverErrors === 'object') {
        const errors = {};
        Object.keys(serverErrors).forEach(key => {
          errors[key] = Array.isArray(serverErrors[key]) ? serverErrors[key][0] : serverErrors[key];
        });
        setFormErrors(errors);
      } else {
        toast.error('Failed to register user.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditUserSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm(true)) return;

    setSubmitting(true);
    try {
      const submitData = {
        email: formData.email,
        first_name: formData.first_name,
        last_name: formData.last_name,
        initials: formData.initials.toUpperCase(),
        role: formData.role,
        phone: formData.phone,
        department: formData.department,
        allowed_modules: formData.allowed_modules
      };

      if (formData.password) {
        submitData.password = formData.password;
      }

      await authAPI.updateUser(selectedUser.id, submitData);
      toast.success('User updated successfully');
      setShowEditModal(false);
      fetchUsers();
    } catch (err) {
      const serverErrors = err.response?.data;
      if (serverErrors && typeof serverErrors === 'object') {
        const errors = {};
        Object.keys(serverErrors).forEach(key => {
          errors[key] = Array.isArray(serverErrors[key]) ? serverErrors[key][0] : serverErrors[key];
        });
        setFormErrors(errors);
      } else {
        toast.error('Failed to update user details.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUserConfirm = async () => {
    if (!selectedUser) return;
    setSubmitting(true);
    try {
      await authAPI.deleteUser(selectedUser.id);
      toast.success('User deleted successfully');
      setShowDeleteModal(false);
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to delete user.');
    } finally {
      setSubmitting(false);
    }
  };

  const openAddModal = () => {
    setFormData({
      first_name: '',
      last_name: '',
      initials: '',
      email: '',
      role: 'employee',
      phone: '',
      department: '',
      password: '',
      confirmPassword: ''
    });
    setFormErrors({});
    setShowAddModal(true);
  };

  const handleToggleModuleInForm = (moduleKey) => {
    const currentModules = formData.allowed_modules || [];
    let updatedModules = [];
    if (currentModules.includes(moduleKey)) {
      updatedModules = currentModules.filter(k => k !== moduleKey);
    } else {
      updatedModules = [...currentModules, moduleKey];
    }
    setFormData(prev => ({ ...prev, allowed_modules: updatedModules }));
  };

  const openEditModal = (user) => {
    setSelectedUser(user);
    setFormData({
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      initials: user.initials || '',
      email: user.email || '',
      role: user.role || 'employee',
      phone: user.phone || '',
      department: user.department || '',
      password: '',
      confirmPassword: '',
      allowed_modules: user.allowed_modules || []
    });
    setFormErrors({});
    setShowEditModal(true);
  };

  const openDeleteModal = (user) => {
    setSelectedUser(user);
    setShowDeleteModal(true);
  };

  const openViewModal = (user) => {
    setSelectedUser(user);
    setShowViewModal(true);
  };

  const formatLastLogin = (dateString) => {
    if (!dateString) return '—';
    try {
      const date = new Date(dateString);
      const datePart = date.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' });
      const timePart = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
      return `${datePart} at ${timePart}`;
    } catch (e) {
      return '—';
    }
  };

  const exportCSV = () => {
    if (users.length === 0) {
      toast.error('No user data to export');
      return;
    }
    
    // Headers
    const headers = ['Name', 'Initials', 'Email', 'Role', 'Department', 'Phone', 'Last Login'];
    
    // Rows
    const rows = filteredUsers.map(u => [
      `${u.first_name || ''} ${u.last_name || ''}`.trim() || 'Unnamed',
      u.initials || '—',
      u.email,
      u.role,
      u.department || '—',
      u.phone || '—',
      u.last_login ? new Date(u.last_login).toLocaleString() : 'Never'
    ]);
    
    // Build CSV Content
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(','))].join('\n');
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `SFE_Users_Export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('CSV exported successfully');
  };

  // Filtered Users List
  const filteredUsers = users.filter(user => {
    const fullName = `${user.first_name || ''} ${user.last_name || ''}`.toLowerCase();
    const email = (user.email || '').toLowerCase();
    const role = (user.role || '').toLowerCase();
    const initials = (user.initials || '').toLowerCase();
    const query = searchQuery.toLowerCase();
    
    const matchesSearch = fullName.includes(query) || email.includes(query) || role.includes(query) || initials.includes(query);
    const matchesRole = roleFilter === '' || user.role === roleFilter;
    
    return matchesSearch && matchesRole;
  });

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'manager':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'estimator':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'detailing':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'readonly':
        return 'bg-slate-100 text-slate-600 border-slate-200';
      default:
        return 'bg-slate-50 text-slate-650 border-slate-200';
    }
  };

  const getRoleLabel = (role) => {
    if (role === 'readonly') return 'Read-Only';
    const opt = ROLE_OPTIONS.find(o => o.value === role);
    return opt ? opt.label : role;
  };

  const getInitialsPlaceholder = (user) => {
    const first = user.first_name ? user.first_name[0] : '';
    const last = user.last_name ? user.last_name[0] : '';
    return (first + last).toUpperCase() || 'SF';
  };

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Search & Filter Trigger */}
        <div className="flex items-center gap-3 w-full sm:max-w-md bg-white border border-slate-200 rounded-2xl px-4 py-3 shadow-inner">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder="Search by name, email, role, initials..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full text-xs font-semibold text-slate-700 bg-transparent placeholder-slate-400 outline-none"
          />
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-end gap-3 w-full sm:w-auto">
          {/* Refresh Users */}
          <button
            onClick={fetchUsers}
            disabled={loading}
            className="flex items-center justify-center gap-2 px-4 py-2.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-xl font-bold text-xs shadow-sm transition-all active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-slate-800' : 'text-slate-500'}`} />
            Refresh
          </button>

          {/* Quick Filters */}
          <div className="relative">
            <button
              onClick={() => setShowFilterDropdown(!showFilterDropdown)}
              className={`flex items-center gap-2 px-4 py-2.5 border rounded-xl font-bold text-xs shadow-sm transition-all active:scale-95 ${
                roleFilter ? 'bg-slate-950 text-white border-slate-950' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              {roleFilter ? `Role: ${getRoleLabel(roleFilter)}` : 'Filters'}
            </button>
            
            {showFilterDropdown && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowFilterDropdown(false)} />
                <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-lg py-2 z-20 animate-fade-in">
                  <button
                    onClick={() => { setRoleFilter(''); setShowFilterDropdown(false); }}
                    className="w-full text-left px-4 py-2 text-xs font-bold text-slate-750 hover:bg-slate-50 flex items-center justify-between"
                  >
                    All Roles
                    {roleFilter === '' && <Check className="w-3.5 h-3.5 text-slate-900" />}
                  </button>
                  <div className="h-px bg-slate-100 my-1" />
                  {ROLE_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => { setRoleFilter(opt.value); setShowFilterDropdown(false); }}
                      className="w-full text-left px-4 py-2 text-xs font-bold text-slate-750 hover:bg-slate-50 flex items-center justify-between"
                    >
                      {opt.label}
                      {roleFilter === opt.value && <Check className="w-3.5 h-3.5 text-slate-900" />}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Export CSV */}
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-xl font-bold text-xs shadow-sm transition-all active:scale-95"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            Export CSV
          </button>

          {/* Add User */}
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white rounded-xl font-bold text-xs shadow-md shadow-amber-500/10 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Add User
          </button>
        </div>
      </div>

      {/* Users Table */}
      {loading ? (
        <div className="flex flex-col items-center justify-center h-64 gap-3 bg-white border border-slate-200 rounded-2xl shadow-sm">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-800"></div>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest animate-pulse">Loading records...</span>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm max-w-lg mx-auto">
          <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-sm font-black text-slate-750 uppercase tracking-wider">No matching users found</h3>
          <p className="text-xs font-semibold text-slate-400 mt-1">Try modifying search term or clear active filters.</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gradient-to-r from-amber-500 to-orange-500 text-white uppercase text-[10px] font-black tracking-wider select-none">
                  <th className="px-6 py-4">Name</th>
                  <th className="px-6 py-4 w-24">Initials</th>
                  <th className="px-6 py-4">Email</th>
                  <th className="px-6 py-4 w-40">Role</th>
                  <th className="px-6 py-4">Last Login</th>
                  <th className="px-6 py-4 text-right w-44">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map(user => {
                  const isUserAdmin = user.role === 'admin';
                  const isSelf = user.id === loggedInUser.id;
                  
                  return (
                     <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                      {/* Name with initials profile thumbnail */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 text-white flex items-center justify-center font-black text-xs shadow-inner shrink-0">
                            {user.profile_picture ? (
                              <img 
                                src={user.profile_picture.startsWith('http') ? user.profile_picture : `${window.location.origin}${user.profile_picture}`} 
                                alt="Avatar" 
                                className="w-full h-full object-cover rounded-lg" 
                              />
                            ) : (
                              getInitialsPlaceholder(user)
                            )}
                          </div>
                          <div className="font-extrabold text-slate-900 text-xs">
                            {user.first_name || user.last_name ? `${user.first_name} ${user.last_name}` : 'Unnamed User'}
                            {isSelf && (
                              <span className="ml-2 bg-slate-100 text-slate-700 border border-slate-200 px-1.5 py-0.5 rounded text-[8px] font-black uppercase">
                                You
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      
                      {/* Initials */}
                      <td className="px-6 py-4 font-mono font-bold text-xs text-slate-600">
                        {user.initials || '—'}
                      </td>
                      
                      {/* Email */}
                      <td className="px-6 py-4 text-xs font-bold text-slate-500">
                        {user.email}
                      </td>
                      
                      {/* Role Pill */}
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border ${getRoleBadgeColor(user.role)}`}>
                          {getRoleLabel(user.role)}
                        </span>
                      </td>
                      
                      {/* Last Login */}
                      <td className="px-6 py-4 text-xs font-bold text-slate-450">
                        {formatLastLogin(user.last_login)}
                      </td>
                      
                      {/* Actions */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          
                          {/* View Details */}
                          <button
                            title="View Details"
                            onClick={() => openViewModal(user)}
                            className="p-2 hover:bg-slate-100 text-slate-500 hover:text-slate-900 rounded-lg transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          
                          {/* Edit */}
                          <button
                            title="Edit User"
                            onClick={() => openEditModal(user)}
                            className="p-2 hover:bg-slate-100 text-slate-500 hover:text-slate-900 rounded-lg transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          
                          {/* Delete */}
                          <button
                            title="Delete User"
                            disabled={isSelf}
                            onClick={() => openDeleteModal(user)}
                            className={`p-2 rounded-lg transition-colors ${
                              isSelf 
                                ? 'opacity-30 cursor-not-allowed text-slate-300' 
                                : 'hover:bg-red-50 text-slate-500 hover:text-red-650'
                            }`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ───── MODAL: ADD USER ───── */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl shadow-2xl w-full max-w-xl overflow-hidden animate-scale-up">
            
            {/* Header */}
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Users className="w-5 h-5 text-slate-800" />
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Register New Account</h3>
              </div>
              <button 
                onClick={() => setShowAddModal(false)}
                className="p-2 hover:bg-slate-50 text-slate-450 hover:text-slate-800 rounded-xl transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleAddUserSubmit} className="p-6 space-y-4">
              
              {/* Select Employee from Employee Master */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Select from Employee Master</label>
                <select
                  onChange={handleEmployeeSelect}
                  defaultValue=""
                  className="w-full text-xs font-bold text-slate-700 bg-slate-50/50 border border-slate-200 focus:border-slate-400 focus:bg-white rounded-xl px-3 py-2.5 outline-none transition-all cursor-pointer"
                >
                  <option value="">-- Choose Employee to Autofill --</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.email || 'No Email'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* First Name */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest">First Name</label>
                  <input
                    type="text"
                    name="first_name"
                    value={formData.first_name}
                    onChange={handleFormChange}
                    className="w-full text-xs font-semibold text-slate-700 bg-slate-50/50 border border-slate-200 focus:border-slate-400 focus:bg-white rounded-xl px-3.5 py-2.5 outline-none transition-all"
                    placeholder="e.g. John"
                  />
                  {formErrors.first_name && <p className="text-[10px] font-extrabold text-red-600">{formErrors.first_name}</p>}
                </div>

                {/* Last Name */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Last Name</label>
                  <input
                    type="text"
                    name="last_name"
                    value={formData.last_name}
                    onChange={handleFormChange}
                    className="w-full text-xs font-semibold text-slate-700 bg-slate-50/50 border border-slate-200 focus:border-slate-400 focus:bg-white rounded-xl px-3.5 py-2.5 outline-none transition-all"
                    placeholder="e.g. Doe"
                  />
                  {formErrors.last_name && <p className="text-[10px] font-extrabold text-red-600">{formErrors.last_name}</p>}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                {/* Email */}
                <div className="col-span-2 space-y-1">
                  <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Email Address</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleFormChange}
                    className="w-full text-xs font-semibold text-slate-700 bg-slate-50/50 border border-slate-200 focus:border-slate-400 focus:bg-white rounded-xl px-3.5 py-2.5 outline-none transition-all"
                    placeholder="e.g. john.doe@steelfab.com"
                  />
                  {formErrors.email && <p className="text-[10px] font-extrabold text-red-600">{formErrors.email}</p>}
                </div>

                {/* Initials */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Initials</label>
                  <input
                    type="text"
                    name="initials"
                    value={formData.initials}
                    onChange={handleFormChange}
                    className="w-full text-xs font-semibold text-slate-700 bg-slate-50/50 border border-slate-200 focus:border-slate-400 focus:bg-white rounded-xl px-3.5 py-2.5 outline-none transition-all uppercase"
                    placeholder="e.g. JD"
                    maxLength={5}
                  />
                  {formErrors.initials && <p className="text-[10px] font-extrabold text-red-600">{formErrors.initials}</p>}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                {/* Role */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest">System Role</label>
                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleFormChange}
                    className="w-full text-xs font-bold text-slate-700 bg-slate-50/50 border border-slate-200 focus:border-slate-400 focus:bg-white rounded-xl px-3 py-2.5 outline-none transition-all"
                  >
                    {ROLE_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                {/* Department */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Department</label>
                  <input
                    type="text"
                    name="department"
                    value={formData.department}
                    onChange={handleFormChange}
                    className="w-full text-xs font-semibold text-slate-700 bg-slate-50/50 border border-slate-200 focus:border-slate-400 focus:bg-white rounded-xl px-3.5 py-2.5 outline-none transition-all"
                    placeholder="e.g. Estimation"
                  />
                </div>

                {/* Phone */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Phone</label>
                  <input
                    type="text"
                    name="phone"
                    value={formData.phone}
                    onChange={handleFormChange}
                    className="w-full text-xs font-semibold text-slate-700 bg-slate-50/50 border border-slate-200 focus:border-slate-400 focus:bg-white rounded-xl px-3.5 py-2.5 outline-none transition-all"
                    placeholder="e.g. 555-0199"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Password */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Password</label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleFormChange}
                    className="w-full text-xs font-semibold text-slate-700 bg-slate-50/50 border border-slate-200 focus:border-slate-400 focus:bg-white rounded-xl px-3.5 py-2.5 outline-none transition-all"
                    placeholder="Min. 6 chars"
                  />
                  {formErrors.password && <p className="text-[10px] font-extrabold text-red-600">{formErrors.password}</p>}
                </div>

                {/* Confirm Password */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Confirm Password</label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleFormChange}
                    className="w-full text-xs font-semibold text-slate-700 bg-slate-50/50 border border-slate-200 focus:border-slate-400 focus:bg-white rounded-xl px-3.5 py-2.5 outline-none transition-all"
                    placeholder="Repeat password"
                  />
                  {formErrors.confirmPassword && <p className="text-[10px] font-extrabold text-red-600">{formErrors.confirmPassword}</p>}
                </div>
              </div>

              {/* Actions Footer */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-6">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-650 hover:bg-slate-50 rounded-xl font-bold text-xs transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-850 disabled:opacity-50 text-white rounded-xl font-bold text-xs transition-all"
                >
                  {submitting ? 'Creating...' : 'Create Account'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ───── MODAL: EDIT USER ───── */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl shadow-2xl w-full max-w-xl overflow-hidden animate-scale-up">
            
            {/* Header */}
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Edit2 className="w-5 h-5 text-slate-800" />
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Edit User Profile</h3>
              </div>
              <button 
                onClick={() => setShowEditModal(false)}
                className="p-2 hover:bg-slate-50 text-slate-450 hover:text-slate-800 rounded-xl transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleEditUserSubmit} className="p-6 space-y-4">
              
              <div className="grid grid-cols-2 gap-4">
                {/* First Name */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest">First Name</label>
                  <input
                    type="text"
                    name="first_name"
                    value={formData.first_name}
                    onChange={handleFormChange}
                    className="w-full text-xs font-semibold text-slate-700 bg-slate-50/50 border border-slate-200 focus:border-slate-400 focus:bg-white rounded-xl px-3.5 py-2.5 outline-none transition-all"
                  />
                  {formErrors.first_name && <p className="text-[10px] font-extrabold text-red-600">{formErrors.first_name}</p>}
                </div>

                {/* Last Name */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Last Name</label>
                  <input
                    type="text"
                    name="last_name"
                    value={formData.last_name}
                    onChange={handleFormChange}
                    className="w-full text-xs font-semibold text-slate-700 bg-slate-50/50 border border-slate-200 focus:border-slate-400 focus:bg-white rounded-xl px-3.5 py-2.5 outline-none transition-all"
                  />
                  {formErrors.last_name && <p className="text-[10px] font-extrabold text-red-600">{formErrors.last_name}</p>}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                {/* Email */}
                <div className="col-span-2 space-y-1">
                  <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Email Address</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleFormChange}
                    className="w-full text-xs font-semibold text-slate-700 bg-slate-50/50 border border-slate-200 focus:border-slate-400 focus:bg-white rounded-xl px-3.5 py-2.5 outline-none transition-all"
                  />
                  {formErrors.email && <p className="text-[10px] font-extrabold text-red-600">{formErrors.email}</p>}
                </div>

                {/* Initials */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Initials</label>
                  <input
                    type="text"
                    name="initials"
                    value={formData.initials}
                    onChange={handleFormChange}
                    className="w-full text-xs font-semibold text-slate-700 bg-slate-50/50 border border-slate-200 focus:border-slate-400 focus:bg-white rounded-xl px-3.5 py-2.5 outline-none transition-all uppercase"
                    maxLength={5}
                  />
                  {formErrors.initials && <p className="text-[10px] font-extrabold text-red-600">{formErrors.initials}</p>}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                {/* Role */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest">System Role</label>
                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleFormChange}
                    className="w-full text-xs font-bold text-slate-700 bg-slate-50/50 border border-slate-200 focus:border-slate-400 focus:bg-white rounded-xl px-3 py-2.5 outline-none transition-all"
                  >
                    {ROLE_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                {/* Department */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Department</label>
                  <input
                    type="text"
                    name="department"
                    value={formData.department}
                    onChange={handleFormChange}
                    className="w-full text-xs font-semibold text-slate-700 bg-slate-50/50 border border-slate-200 focus:border-slate-400 focus:bg-white rounded-xl px-3.5 py-2.5 outline-none transition-all"
                  />
                </div>

                {/* Phone */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Phone</label>
                  <input
                    type="text"
                    name="phone"
                    value={formData.phone}
                    onChange={handleFormChange}
                    className="w-full text-xs font-semibold text-slate-700 bg-slate-50/50 border border-slate-200 focus:border-slate-400 focus:bg-white rounded-xl px-3.5 py-2.5 outline-none transition-all"
                  />
                </div>
              </div>

              {/* Password Section (Optional Reset) */}
              <div className="bg-slate-50 rounded-2xl p-4 space-y-3 border border-slate-100">
                <p className="text-[10px] font-black text-slate-450 uppercase tracking-widest flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-slate-400" />
                  Change Password (Leave blank to keep current)
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <input
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleFormChange}
                      placeholder="New password"
                      className="w-full text-xs font-semibold text-slate-700 bg-white border border-slate-200 focus:border-slate-400 rounded-xl px-3 py-2.5 outline-none transition-all"
                    />
                    {formErrors.password && <p className="text-[10px] font-extrabold text-red-600">{formErrors.password}</p>}
                  </div>
                  <div className="space-y-1">
                    <input
                      type="password"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleFormChange}
                      placeholder="Confirm new password"
                      className="w-full text-xs font-semibold text-slate-700 bg-white border border-slate-200 focus:border-slate-400 rounded-xl px-3 py-2.5 outline-none transition-all"
                    />
                    {formErrors.confirmPassword && <p className="text-[10px] font-extrabold text-red-600">{formErrors.confirmPassword}</p>}
                  </div>
                </div>
              </div>

              {/* Allowed Modules Permissions (Navy theme toggle switches) */}
              {formData.role === 'admin' ? (
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-amber-800 text-xs font-bold flex items-center gap-3 select-none">
                  <Shield className="w-5 h-5 text-amber-600 shrink-0" />
                  <span>This user is an administrator and automatically has access to all application modules.</span>
                </div>
              ) : (
                <div className="space-y-3 pt-2">
                  <h4 className="text-[10px] font-black text-slate-450 uppercase tracking-widest border-b border-slate-200 pb-1">
                    Allowed Module Permissions
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[260px] overflow-y-auto pr-2">
                    {CATEGORIES.map(category => {
                      const categoryModules = MODULE_CONFIG.filter(m => m.category === category);
                      if (categoryModules.length === 0) return null;

                      return (
                        <div key={category} className="space-y-2 col-span-1 sm:col-span-2">
                          <h5 className="text-[9px] font-black text-slate-400 uppercase tracking-widest pt-1">
                            {category}
                          </h5>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {categoryModules.map(module => {
                              const isEnabled = formData.allowed_modules?.includes(module.key);

                              return (
                                <div 
                                  key={module.key}
                                  className={`flex items-center justify-between p-2.5 rounded-xl border transition-all duration-200 select-none ${
                                    isEnabled 
                                      ? 'bg-slate-50 border-slate-300 hover:border-slate-400' 
                                      : 'bg-slate-50/30 border-slate-100 hover:bg-slate-50/80 hover:border-slate-200'
                                  }`}
                                >
                                  <span className={`text-[11px] font-bold truncate ${isEnabled ? 'text-slate-850' : 'text-slate-450'}`}>
                                    {module.name}
                                  </span>

                                  {/* Sliding Toggle Switch (Navy Theme) */}
                                  <button
                                    type="button"
                                    onClick={() => handleToggleModuleInForm(module.key)}
                                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                      isEnabled ? 'bg-[#1e254b]' : 'bg-slate-200'
                                    }`}
                                  >
                                    <span className="sr-only">Toggle access</span>
                                    <span
                                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                        isEnabled ? 'translate-x-4' : 'translate-x-0'
                                      }`}
                                    />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Actions Footer */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-6">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-650 hover:bg-slate-50 rounded-xl font-bold text-xs transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-850 disabled:opacity-50 text-white rounded-xl font-bold text-xs transition-all"
                >
                  {submitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ───── MODAL: DELETE USER CONFIRMATION ───── */}
      {showDeleteModal && selectedUser && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-up">
            
            {/* Header */}
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-red-50">
              <div className="flex items-center gap-2.5 text-red-750">
                <ShieldAlert className="w-5 h-5 text-red-600" />
                <h3 className="text-sm font-black uppercase tracking-wider">Confirm Delete User</h3>
              </div>
              <button 
                onClick={() => setShowDeleteModal(false)}
                className="p-2 hover:bg-red-100/50 text-red-400 hover:text-red-700 rounded-xl transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              <p className="text-xs font-semibold text-slate-600 leading-relaxed">
                Are you sure you want to permanently delete the user account for <strong className="text-slate-900 font-extrabold">{selectedUser.first_name} {selectedUser.last_name} ({selectedUser.email})</strong>?
              </p>
              <div className="p-3 bg-amber-50 border border-amber-100 text-amber-800 rounded-xl flex gap-2.5 select-none">
                <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span className="text-[10px] font-bold leading-normal">
                  This action is irreversible. The user will be logged out immediately and lose access to all modules.
                </span>
              </div>

              {/* Actions Footer */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-6">
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-650 hover:bg-slate-50 rounded-xl font-bold text-xs transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteUserConfirm}
                  disabled={submitting}
                  className="px-4 py-2 bg-red-650 hover:bg-red-700 disabled:opacity-50 text-white rounded-xl font-bold text-xs transition-all"
                >
                  {submitting ? 'Deleting...' : 'Delete User'}
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ───── MODAL: VIEW USER DETAILS ───── */}
      {showViewModal && selectedUser && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl shadow-2xl w-full max-w-xl overflow-hidden animate-scale-up">
            
            {/* Header */}
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Users className="w-5 h-5 text-slate-800" />
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">User Account Details</h3>
              </div>
              <button 
                onClick={() => setShowViewModal(false)}
                className="p-2 hover:bg-slate-50 text-slate-450 hover:text-slate-800 rounded-xl transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content (Read-only) */}
            <div className="p-6 space-y-5">
              
              <div className="flex items-center gap-4 pb-4 border-b border-slate-100">
                <div className="w-16 h-16 rounded-xl bg-slate-950 text-white flex items-center justify-center font-black text-xl shadow-inner shrink-0 select-none">
                  {selectedUser.profile_picture ? (
                    <img 
                      src={selectedUser.profile_picture.startsWith('http') ? selectedUser.profile_picture : `${window.location.origin}${selectedUser.profile_picture}`} 
                      alt="Avatar" 
                      className="w-full h-full object-cover rounded-xl" 
                    />
                  ) : (
                    getInitialsPlaceholder(selectedUser)
                  )}
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-slate-900 leading-tight">
                    {selectedUser.first_name || selectedUser.last_name ? `${selectedUser.first_name} ${selectedUser.last_name}` : 'Unnamed User'}
                  </h2>
                  <span className={`inline-block mt-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${getRoleBadgeColor(selectedUser.role)}`}>
                    {getRoleLabel(selectedUser.role)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-y-4 gap-x-6">
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Email Address</p>
                  <p className="text-xs font-bold text-slate-850 mt-1">{selectedUser.email}</p>
                </div>
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Initials</p>
                  <p className="text-xs font-bold text-slate-850 mt-1 font-mono">{selectedUser.initials || '—'}</p>
                </div>
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Department</p>
                  <p className="text-xs font-bold text-slate-850 mt-1">{selectedUser.department || '—'}</p>
                </div>
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Phone Number</p>
                  <p className="text-xs font-bold text-slate-850 mt-1">{selectedUser.phone || '—'}</p>
                </div>
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Date Joined</p>
                  <p className="text-xs font-bold text-slate-850 mt-1">
                    {selectedUser.date_joined ? new Date(selectedUser.date_joined).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Last Login</p>
                  <p className="text-xs font-bold text-slate-850 mt-1">{formatLastLogin(selectedUser.last_login)}</p>
                </div>
              </div>

              {/* Allowed Modules (Read-only list) */}
              <div className="pt-2 border-t border-slate-100">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Permitted Modules</p>
                {selectedUser.role === 'admin' ? (
                  <p className="text-xs font-semibold text-slate-500">Administrator has access to all application modules by default.</p>
                ) : !selectedUser.allowed_modules || selectedUser.allowed_modules.length === 0 ? (
                  <p className="text-xs font-semibold text-slate-500">No modules permitted.</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5 max-h-[120px] overflow-y-auto pr-1">
                    {selectedUser.allowed_modules.map(moduleKey => {
                      const mod = MODULE_CONFIG.find(m => m.key === moduleKey);
                      return (
                        <span 
                          key={moduleKey}
                          className="px-2 py-1 bg-slate-100 text-slate-700 rounded-lg text-[10px] font-bold border border-slate-200"
                        >
                          {mod ? mod.name : moduleKey}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Actions Footer */}
              <div className="flex justify-end pt-4 border-t border-slate-100 mt-6">
                <button
                  type="button"
                  onClick={() => setShowViewModal(false)}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-850 text-white rounded-xl font-bold text-xs transition-all shadow-sm"
                >
                  Close Details
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
