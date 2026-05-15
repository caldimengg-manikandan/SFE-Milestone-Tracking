import { useState, useEffect } from 'react';
import { 
  User, 
  Lock, 
  Bell, 
  Palette, 
  Globe, 
  ShieldCheck, 
  Mail, 
  Smartphone,
  Save,
  CheckCircle2,
  Trash2,
  AlertCircle
} from 'lucide-react';
import { authAPI } from '../services/api';

export default function Settings() {
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    role: '',
    department: '',
    notifications: {
      email: true,
      browser: true,
      updates: false
    }
  });

  const [securityForm, setSecurityForm] = useState({
    old_password: '',
    new_password: '',
    confirm_password: ''
  });

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      const response = await authAPI.me();
      const userData = response.data;
      setForm(prev => ({
        ...prev,
        first_name: userData.first_name || userData.name?.split(' ')[0] || '',
        last_name: userData.last_name || userData.name?.split(' ')[1] || '',
        email: userData.email || '',
        role: userData.role || 'employee',
        department: userData.department || 'Management',
      }));
    } catch (err) {
      console.error("Failed to fetch user data", err);
      setError("Failed to load profile data.");
    } finally {
      setLoading(false);
    }
  };

  const handleProfileSave = async () => {
    setSaving(true);
    setError('');
    try {
      const response = await authAPI.updateProfile({
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email,
        role: form.role
      });
      
      // Update session storage
      const updatedUser = {
        ...JSON.parse(sessionStorage.getItem('user') || '{}'),
        name: `${form.first_name} ${form.last_name}`,
        email: form.email,
        role: form.role
      };
      sessionStorage.setItem('user', JSON.stringify(updatedUser));
      
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.response?.data?.email?.[0] || "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (securityForm.new_password !== securityForm.confirm_password) {
      setError("New passwords do not match.");
      return;
    }

    setSaving(true);
    setError('');
    try {
      await authAPI.changePassword({
        old_password: securityForm.old_password,
        new_password: securityForm.new_password,
        confirm_password: securityForm.confirm_password
      });
      setSuccess(true);
      setSecurityForm({ old_password: '', new_password: '', confirm_password: '' });
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.response?.data?.old_password?.[0] || "Failed to update password.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (window.confirm("Are you absolutely sure you want to delete your account? This action cannot be undone.")) {
      try {
        await authAPI.deleteAccount();
        sessionStorage.clear();
        window.location.href = '/SFE/login';
      } catch (err) {
        setError("Failed to delete account. Please contact support.");
      }
    }
  };

  const tabs = [
    { id: 'profile', label: 'My Profile', icon: User },
    { id: 'security', label: 'Security', icon: Lock },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'appearance', label: 'Appearance', icon: Palette },
  ];

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div></div>;

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-end justify-between mb-2 px-2">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Settings</h1>
          <p className="text-sm font-medium text-slate-500 mt-1">Manage your account preferences and system configuration</p>
        </div>
        
        {activeTab === 'profile' && (
          <button 
            onClick={handleProfileSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-amber-600 text-white rounded-2xl font-bold text-sm shadow-lg shadow-amber-600/20 hover:bg-amber-700 transition-all disabled:opacity-50"
          >
            {saving ? 'Saving...' : success ? <><CheckCircle2 className="w-4 h-4" /> Changes Saved</> : <><Save className="w-4 h-4" /> Save Changes</>}
          </button>
        )}
      </div>

      {error && (
        <div className="mx-2 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 text-sm font-bold animate-shake">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-6">
        {/* Navigation Sidebar */}
        <div className="w-full md:w-64 shrink-0 space-y-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setError(''); }}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-bold transition-all ${
                activeTab === tab.id 
                  ? 'bg-white text-amber-600 shadow-sm border border-slate-200' 
                  : 'text-slate-500 hover:bg-white/50 hover:text-slate-700'
              }`}
            >
              <tab.icon className={`w-5 h-5 ${activeTab === tab.id ? 'text-amber-500' : 'text-slate-400'}`} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden min-h-[500px]">
          {activeTab === 'profile' && (
            <div className="p-8 space-y-8 animate-fade-in">
              <div className="flex items-center gap-6">
                <div className="w-24 h-24 rounded-[2rem] bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-2xl font-black text-slate-400 shadow-inner overflow-hidden">
                  {form.first_name ? `${form.first_name[0]}${form.last_name?.[0] || ''}`.toUpperCase() : '??'}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Profile Picture</h3>
                  <p className="text-xs text-slate-500 mt-1">Upload a high-resolution portrait for your team to recognize you.</p>
                  <div className="flex gap-2 mt-4">
                    <button className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-800 transition-all cursor-not-allowed opacity-50" title="Coming Soon">Upload New</button>
                    <button className="px-4 py-2 bg-slate-50 text-slate-600 text-xs font-bold rounded-xl border border-slate-200 hover:bg-slate-100 transition-all">Remove</button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">First Name</label>
                  <input 
                    type="text" 
                    value={form.first_name}
                    onChange={(e) => setForm({...form, first_name: e.target.value})}
                    className="w-full px-5 py-4 rounded-2xl border border-slate-200 bg-slate-50/50 text-sm font-bold text-slate-700 focus:bg-white focus:border-amber-400 focus:ring-4 focus:ring-amber-500/5 transition-all outline-none" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Last Name</label>
                  <input 
                    type="text" 
                    value={form.last_name}
                    onChange={(e) => setForm({...form, last_name: e.target.value})}
                    className="w-full px-5 py-4 rounded-2xl border border-slate-200 bg-slate-50/50 text-sm font-bold text-slate-700 focus:bg-white focus:border-amber-400 focus:ring-4 focus:ring-amber-500/5 transition-all outline-none" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
                  <input 
                    type="email" 
                    value={form.email}
                    onChange={(e) => setForm({...form, email: e.target.value})}
                    className="w-full px-5 py-4 rounded-2xl border border-slate-200 bg-slate-50/50 text-sm font-bold text-slate-700 focus:bg-white focus:border-amber-400 focus:ring-4 focus:ring-amber-500/5 transition-all outline-none" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Job Role</label>
                  <select 
                    value={form.role}
                    onChange={(e) => setForm({...form, role: e.target.value})}
                    className="w-full px-5 py-4 rounded-2xl border border-slate-200 bg-slate-50/50 text-sm font-bold text-slate-700 focus:bg-white focus:border-amber-400 focus:ring-4 focus:ring-amber-500/5 transition-all outline-none appearance-none"
                  >
                    <option value="admin">Administrator</option>
                    <option value="manager">Project Manager</option>
                    <option value="employee">Employee</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Department</label>
                  <input 
                    type="text" 
                    value={form.department}
                    disabled
                    className="w-full px-5 py-4 rounded-2xl border border-slate-200 bg-slate-100 text-sm font-bold text-slate-400 outline-none cursor-not-allowed" 
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="p-8 space-y-8 animate-fade-in">
              <form onSubmit={handlePasswordChange} className="space-y-6">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-500" /> Password Management
                </h3>
                <div className="space-y-4 max-w-md">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Current Password</label>
                    <input 
                      required
                      type="password" 
                      placeholder="••••••••" 
                      value={securityForm.old_password}
                      onChange={(e) => setSecurityForm({...securityForm, old_password: e.target.value})}
                      className="w-full px-5 py-4 rounded-2xl border border-slate-200 bg-slate-50/50 text-sm outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-500/5 transition-all" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">New Password</label>
                    <input 
                      required
                      type="password" 
                      placeholder="••••••••" 
                      value={securityForm.new_password}
                      onChange={(e) => setSecurityForm({...securityForm, new_password: e.target.value})}
                      className="w-full px-5 py-4 rounded-2xl border border-slate-200 bg-slate-50/50 text-sm outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-500/5 transition-all" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Confirm New Password</label>
                    <input 
                      required
                      type="password" 
                      placeholder="••••••••" 
                      value={securityForm.confirm_password}
                      onChange={(e) => setSecurityForm({...securityForm, confirm_password: e.target.value})}
                      className="w-full px-5 py-4 rounded-2xl border border-slate-200 bg-slate-50/50 text-sm outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-500/5 transition-all" 
                    />
                  </div>
                  <button 
                    type="submit"
                    disabled={saving}
                    className="px-6 py-3 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-800 transition-all disabled:opacity-50"
                  >
                    {saving ? 'Updating...' : success ? 'Password Updated!' : 'Update Password'}
                  </button>
                </div>
              </form>

              <div className="pt-8 border-t border-slate-100">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 text-red-600">
                  <Trash2 className="w-5 h-5" /> Danger Zone
                </h3>
                <p className="text-xs text-slate-500 mt-2">Permanently delete your account and all associated data. This action is irreversible.</p>
                <button 
                  onClick={handleDeleteAccount}
                  className="mt-4 px-6 py-3 border border-red-200 text-red-600 text-xs font-bold rounded-xl hover:bg-red-50 transition-all"
                >
                  Delete Account
                </button>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="p-8 space-y-8 animate-fade-in">
              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 hover:bg-slate-50 transition-all">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                      <Mail className="w-5 h-5 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">Email Notifications</p>
                      <p className="text-[11px] text-slate-500">Receive weekly reports and system alerts via email.</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={form.notifications.email} onChange={() => setForm({...form, notifications: {...form.notifications, email: !form.notifications.email}})} className="sr-only peer" />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 hover:bg-slate-50 transition-all">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
                      <Smartphone className="w-5 h-5 text-purple-500" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">Browser Push Alerts</p>
                      <p className="text-[11px] text-slate-500">Get instant updates even when you are not in the tab.</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={form.notifications.browser} onChange={() => setForm({...form, notifications: {...form.notifications, browser: !form.notifications.browser}})} className="sr-only peer" />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'appearance' && (
            <div className="p-8 space-y-8 animate-fade-in">
              <div className="space-y-6">
                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">Theme Preferences</h3>
                <div className="grid grid-cols-2 gap-4">
                  <button className="p-4 rounded-3xl border-2 border-amber-500 bg-white text-left space-y-3">
                    <div className="w-full h-20 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-center">
                      <div className="w-12 h-1 bg-amber-500 rounded-full" />
                    </div>
                    <p className="text-xs font-bold text-slate-900">Light Mode (System)</p>
                  </button>
                  <button className="p-4 rounded-3xl border-2 border-slate-100 bg-slate-900 text-left space-y-3 grayscale opacity-60 cursor-not-allowed">
                    <div className="w-full h-20 bg-slate-800 rounded-xl flex items-center justify-center">
                      <div className="w-12 h-1 bg-amber-500 rounded-full opacity-50" />
                    </div>
                    <p className="text-xs font-bold text-slate-300">Dark Mode (Coming Soon)</p>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
