import { useState, useEffect } from 'react';
import { 
  Users, Shield, Search, CheckCircle, AlertCircle, RefreshCw, 
  LayoutDashboard, FileSpreadsheet, CalendarRange, CalendarCheck, BarChart3, Layers,
  Users2, Building2, FolderKanban, Plus, ListChecks, Settings2, Cpu, Megaphone
} from 'lucide-react';
import { authAPI } from '../services/api';
import toast from 'react-hot-toast';

// Module mapping config to align exact path/id with name, icon and category
const MODULE_CONFIG = [
  { key: '/dashboard', name: 'Dashboard', icon: LayoutDashboard, category: 'Overview' },
  
  { key: '/rfq', name: 'RFQ Master', icon: FileSpreadsheet, category: 'Bid Management' },
  { key: '/bids/schedule', name: 'Internal Bid Schedule', icon: CalendarRange, category: 'Bid Management' },
  { key: '/bids/holidays', name: 'Holiday Calendar', icon: CalendarCheck, category: 'Bid Management' },
  { key: '/estimation-summary', name: 'Estimation Summary', icon: BarChart3, category: 'Bid Management' },
  { key: '/estimation-erection', name: 'Estimation', icon: Layers, category: 'Bid Management' },
  
  { key: 'employees', name: 'Employee Master', icon: Users, category: 'Management' },
  { key: 'customers', name: 'Customer Master', icon: Building2, category: 'Management' },
  { key: 'detailers', name: 'Detailer Master', icon: Layers, category: 'Management' },
  
  { key: 'steel-budget/input', name: 'Design Inputs', icon: FileSpreadsheet, category: 'Budget Estimator' },
  { key: 'steel-budget/result', name: 'Estimation Result', icon: BarChart3, category: 'Budget Estimator' },
  
  { key: 'projects', name: 'Project Master', icon: FolderKanban, category: 'Project Management' },
  
  { key: '/structural/plan-creation', name: 'Plan Creation', icon: Plus, category: 'Structural Schedule' },
  { key: '/structural/plan-tracking', name: 'Plan Tracking', icon: ListChecks, category: 'Structural Schedule' },
  
  { key: '/production/priority-schedule', name: 'Production Schedule', icon: ListChecks, category: 'Production Management' },
  { key: '/production/process-master', name: 'Process Master', icon: FileSpreadsheet, category: 'Production Management' },
  
  { key: '/production/capacity-mapping/capacity', name: 'Capacity Configuration', icon: Settings2, category: 'Capacity Mapping' },
  { key: '/production/capacity-mapping/machine', name: 'Machine Master', icon: Cpu, category: 'Capacity Mapping' },
  { key: '/production/capacity-mapping/manpower', name: 'Workforce Master', icon: Users2, category: 'Capacity Mapping' },
  
  { key: 'settings', name: 'Settings', icon: Settings2, category: 'System' },
  { key: 'announcements', name: 'Announcement', icon: Megaphone, category: 'System' }
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

export default function UserAccess() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [updatingUserId, setUpdatingUserId] = useState(null);
  
  // Current logged in user profile to prevent self-lockouts
  const loggedInUser = JSON.parse(sessionStorage.getItem('user') || '{}');

  useEffect(() => {
    fetchUsers();
  }, []);

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
      // Don't let users toggle settings/announcements off for admin if not desired,
      // but in general we filter lists
      updatedModules = user.allowed_modules.filter(k => k !== moduleKey);
    } else {
      updatedModules = [...(user.allowed_modules || []), moduleKey];
    }

    setUpdatingUserId(user.id);
    try {
      const res = await authAPI.updateUserAccess(user.id, updatedModules);
      setUsers(prevUsers => prevUsers.map(u => u.id === user.id ? res.data : u));
      toast.success(`Access updated for ${user.first_name || user.email}`);
    } catch (err) {
      toast.error('Failed to update module access permissions.');
      console.error(err);
    } finally {
      setUpdatingUserId(null);
    }
  };

  const filteredUsers = users.filter(user => {
    const fullName = `${user.first_name || ''} ${user.last_name || ''}`.toLowerCase();
    const email = (user.email || '').toLowerCase();
    const query = searchQuery.toLowerCase();
    return fullName.includes(query) || email.includes(query);
  });

  const getInitials = (user) => {
    const first = user.first_name ? user.first_name[0] : '';
    const last = user.last_name ? user.last_name[0] : '';
    return (first + last).toUpperCase() || 'SF';
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in p-4 sm:p-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <Shield className="w-8 h-8 text-slate-800" />
            User Access Control
          </h1>
          <p className="text-sm font-medium text-slate-500 mt-1">
            Grant or revoke module-level application access permissions for users.
          </p>
        </div>
        <button
          onClick={fetchUsers}
          disabled={loading}
          className="flex items-center justify-center gap-2 px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-xl font-bold text-xs shadow-sm transition-all active:scale-95 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-slate-800' : 'text-slate-550'}`} />
          Refresh Users
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="flex items-center gap-3 w-full max-w-md bg-white border border-slate-200 rounded-2xl px-4 py-3 shadow-inner">
        <Search className="w-4 h-4 text-slate-400 shrink-0" />
        <input
          type="text"
          placeholder="Search users by name or email..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full text-xs font-semibold text-slate-700 bg-transparent placeholder-slate-400 outline-none"
        />
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="flex flex-col items-center justify-center h-64 gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-800"></div>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading records...</span>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center shadow-sm max-w-lg mx-auto">
          <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-sm font-black text-slate-700 uppercase tracking-wider">No matching users found</h3>
          <p className="text-xs font-semibold text-slate-450 mt-1">Try refining your search terms or verify user accounts.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredUsers.map(user => {
            const userModules = user.allowed_modules || [];
            const isUserAdmin = user.role === 'admin';
            
            return (
              <div 
                key={user.id} 
                className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden p-6 sm:p-8 space-y-6 hover:shadow-md transition-shadow duration-300"
              >
                {/* User Identity and Row Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center text-sm font-black text-white shadow-inner select-none">
                      {user.profile_picture ? (
                        <img 
                          src={user.profile_picture.startsWith('http') ? user.profile_picture : `${window.location.origin}${user.profile_picture}`} 
                          alt="Avatar" 
                          className="w-full h-full object-cover rounded-2xl" 
                        />
                      ) : (
                        getInitials(user)
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-base font-extrabold text-slate-900 leading-tight">
                          {user.first_name || user.last_name ? `${user.first_name} ${user.last_name}` : 'Unnamed User'}
                        </h2>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                          isUserAdmin 
                            ? 'bg-amber-50 text-amber-700 border-amber-200' 
                            : user.role === 'manager'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-slate-50 text-slate-650 border-slate-200'
                        }`}>
                          {user.role || 'Employee'}
                        </span>
                        {user.id === loggedInUser.id && (
                          <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider">
                            You
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-semibold text-slate-400 mt-1">{user.email}</p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Modules Permitted</p>
                    <p className="text-lg font-black text-slate-800 leading-none mt-1">
                      {isUserAdmin ? 'ALL' : `${userModules.length} / ${MODULE_CONFIG.length}`}
                    </p>
                  </div>
                </div>

                {/* Categories & Switches Grid */}
                {isUserAdmin ? (
                  <div className="bg-amber-50/50 border border-amber-100 rounded-2xl p-4 text-amber-800 text-xs font-bold flex items-center gap-3 select-none">
                    <Shield className="w-5 h-5 text-amber-600 shrink-0" />
                    <span>Administrator account has access to all application modules by default. Module permission toggles are disabled for administrators.</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                    {CATEGORIES.map(category => {
                      const categoryModules = MODULE_CONFIG.filter(m => m.category === category);
                      if (categoryModules.length === 0) return null;

                      return (
                        <div key={category} className="space-y-3">
                          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1">
                            {category}
                          </h3>
                          <div className="space-y-2">
                            {categoryModules.map(module => {
                              const isEnabled = userModules.includes(module.key);
                              const Icon = module.icon;
                              const isSavingThis = updatingUserId === user.id;

                              return (
                                <div 
                                  key={module.key}
                                  className={`flex items-center justify-between p-3 rounded-2xl border transition-all duration-200 select-none ${
                                    isEnabled 
                                      ? 'bg-slate-50/80 border-slate-300 hover:border-slate-400' 
                                      : 'bg-slate-50/30 border-slate-100 hover:bg-slate-50/80 hover:border-slate-200'
                                  }`}
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center border transition-colors ${
                                      isEnabled 
                                        ? 'bg-slate-100 text-slate-700 border-slate-200' 
                                        : 'bg-white text-slate-400 border-slate-200'
                                    }`}>
                                      <Icon className="w-4 h-4" />
                                    </div>
                                    <span className={`text-xs font-bold truncate ${isEnabled ? 'text-slate-800' : 'text-slate-500'}`}>
                                      {module.name}
                                    </span>
                                  </div>

                                  {/* Sliding Toggle Button */}
                                  <button
                                    type="button"
                                    disabled={isSavingThis}
                                    onClick={() => handleToggleModule(user, module.key)}
                                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-slate-900/20 disabled:opacity-50 ${
                                      isEnabled ? 'bg-slate-900' : 'bg-slate-250'
                                    }`}
                                  >
                                    <span className="sr-only">Toggle access</span>
                                    <span
                                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                        isEnabled ? 'translate-x-5' : 'translate-x-0'
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
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
