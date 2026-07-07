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
  AlertCircle,
  Upload
} from 'lucide-react';
import { authAPI } from '../services/api';
import { systemSettingsAPI } from '../api/client';

export default function Settings() {
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    role: '',
    department: ''
  });

  const [securityForm, setSecurityForm] = useState({
    old_password: '',
    new_password: '',
    confirm_password: ''
  });

  const [systemEmails, setSystemEmails] = useState({
    detailing: [],
    fabrication: [],
    erection: []
  });
  const [newEmailInputs, setNewEmailInputs] = useState({
    detailing: '',
    fabrication: '',
    erection: ''
  });
  const [settingsRecords, setSettingsRecords] = useState([]);

  useEffect(() => {
    fetchUserData();
    fetchSystemSettings();
  }, []);

  const fetchSystemSettings = async () => {
    try {
      const response = await systemSettingsAPI.list();
      const records = response.data;
      setSettingsRecords(records);
      const detailingVal = records.find(r => r.key === 'rfq_detailing_emails')?.value || '';
      const fabVal = records.find(r => r.key === 'rfq_fabrication_emails')?.value || '';
      const erectionVal = records.find(r => r.key === 'rfq_erection_emails')?.value || '';
      setSystemEmails({
        detailing: detailingVal.split(',').map(s => s.trim()).filter(Boolean),
        fabrication: fabVal.split(',').map(s => s.trim()).filter(Boolean),
        erection: erectionVal.split(',').map(s => s.trim()).filter(Boolean)
      });
    } catch (err) {
      console.error("Failed to fetch system settings", err);
    }
  };

  const handleSystemSettingsSave = async () => {
    setSaving(true);
    setError('');
    try {
      const detailingRecord = settingsRecords.find(r => r.key === 'rfq_detailing_emails');
      const fabRecord = settingsRecords.find(r => r.key === 'rfq_fabrication_emails');
      const erectionRecord = settingsRecords.find(r => r.key === 'rfq_erection_emails');
      
      if (detailingRecord) {
        await systemSettingsAPI.update(detailingRecord.id, { value: systemEmails.detailing.join(', ') });
      }
      if (fabRecord) {
        await systemSettingsAPI.update(fabRecord.id, { value: systemEmails.fabrication.join(', ') });
      }
      if (erectionRecord) {
        await systemSettingsAPI.update(erectionRecord.id, { value: systemEmails.erection.join(', ') });
      }
      
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      await fetchSystemSettings();
    } catch (err) {
      setError("Failed to update system settings.");
    } finally {
      setSaving(false);
    }
  };

  const addEmail = (type) => {
    const val = newEmailInputs[type].trim();
    if (!val) return;
    if (systemEmails[type].includes(val)) {
      setError("Email already added to this list.");
      return;
    }
    setSystemEmails(prev => ({
      ...prev,
      [type]: [...prev[type], val]
    }));
    setNewEmailInputs(prev => ({
      ...prev,
      [type]: ''
    }));
    setError('');
  };

  const removeEmail = (type, email) => {
    setSystemEmails(prev => ({
      ...prev,
      [type]: prev[type].filter(e => e !== email)
    }));
  };

  useEffect(() => {
    if (theme === 'dark') {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      const response = await authAPI.me();
      const userData = response.data;
      setForm(prev => ({
        ...prev,
        first_name: userData.first_name || '',
        last_name: userData.last_name || '',
        email: userData.email || '',
        role: userData.role || 'employee',
        department: userData.department || 'Management'
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
      const payload = {
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email,
        role: form.role
      };

      const response = await authAPI.updateProfile(payload);
      const updatedData = response.data;
      
      // Update session storage
      const updatedUser = {
        ...JSON.parse(sessionStorage.getItem('user') || '{}'),
        name: `${updatedData.first_name} ${updatedData.last_name}`,
        email: updatedData.email,
        role: updatedData.role,
      };
      sessionStorage.setItem('user', JSON.stringify(updatedUser));
      
      setForm(prev => ({ 
        ...prev
      }));
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      const errorData = err.response?.data;
      if (typeof errorData === 'object' && errorData !== null) {
        const firstError = Object.values(errorData)[0];
        if (Array.isArray(firstError)) {
          setError(firstError[0]);
        } else if (typeof firstError === 'string') {
          setError(firstError);
        } else {
          setError("Failed to update profile.");
        }
      } else {
        setError("Failed to update profile.");
      }
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
    { id: 'system_emails', label: 'Email Configuration', icon: Mail },
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
        
        {(activeTab === 'profile' || activeTab === 'system_emails') && (
          <button 
            onClick={activeTab === 'profile' ? handleProfileSave : handleSystemSettingsSave}
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
              <div className="flex items-center gap-4 mb-6 pb-6 border-b border-slate-100">
                <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center text-xl font-black text-amber-500 shadow-sm border border-amber-100">
                  {form.first_name ? `${form.first_name[0]}${form.last_name?.[0] || ''}`.toUpperCase() : '??'}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Personal Information</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Update your identity and contact details across the system.</p>
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


          {activeTab === 'system_emails' && (
            <div className="p-8 space-y-6 animate-fade-in">
              <div className="flex items-center gap-3">
                <Mail className="w-6 h-6 text-slate-400" />
                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">
                  Notification Emails
                </h3>
              </div>
              
              <p className="text-slate-600 text-sm max-w-2xl leading-relaxed">
                Configure the email addresses that will receive project notifications when you click "Send Email" on the RFQ page based on the selected Scope of Work.
              </p>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-4">
                {/* Detailing Column */}
                <div className="space-y-3">
                  <h4 className="text-sm font-bold text-slate-800">Detailing Team</h4>
                  <div className="bg-slate-50/50 border border-slate-200 rounded-xl p-4 space-y-3 min-h-[160px] flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-2">
                        {systemEmails.detailing.map(email => (
                          <span key={email} className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-slate-200 rounded-full text-xs font-semibold text-slate-700 shadow-sm max-w-full">
                            <span className="truncate">{email}</span>
                            <button type="button" onClick={() => removeEmail('detailing', email)} className="text-slate-400 hover:text-slate-600 font-bold focus:outline-none ml-1">✕</button>
                          </span>
                        ))}
                      </div>
                      <input 
                        type="email" 
                        value={newEmailInputs.detailing}
                        onChange={(e) => setNewEmailInputs({...newEmailInputs, detailing: e.target.value})}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addEmail('detailing'); } }}
                        placeholder="Add another email..."
                        className="w-full bg-transparent text-xs font-semibold text-slate-600 placeholder-slate-400 outline-none border-b border-transparent focus:border-slate-300 py-1"
                      />
                    </div>
                    <button 
                      type="button"
                      onClick={() => addEmail('detailing')}
                      className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-lg transition-all"
                    >
                      + Add Email
                    </button>
                  </div>
                </div>

                {/* Fabrication Column */}
                <div className="space-y-3">
                  <h4 className="text-sm font-bold text-slate-800">Fabrication Team</h4>
                  <div className="bg-slate-50/50 border border-slate-200 rounded-xl p-4 space-y-3 min-h-[160px] flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-2">
                        {systemEmails.fabrication.map(email => (
                          <span key={email} className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-slate-200 rounded-full text-xs font-semibold text-slate-700 shadow-sm max-w-full">
                            <span className="truncate">{email}</span>
                            <button type="button" onClick={() => removeEmail('fabrication', email)} className="text-slate-400 hover:text-slate-600 font-bold focus:outline-none ml-1">✕</button>
                          </span>
                        ))}
                      </div>
                      <input 
                        type="email" 
                        value={newEmailInputs.fabrication}
                        onChange={(e) => setNewEmailInputs({...newEmailInputs, fabrication: e.target.value})}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addEmail('fabrication'); } }}
                        placeholder="Add another email..."
                        className="w-full bg-transparent text-xs font-semibold text-slate-600 placeholder-slate-400 outline-none border-b border-transparent focus:border-slate-300 py-1"
                      />
                    </div>
                    <button 
                      type="button"
                      onClick={() => addEmail('fabrication')}
                      className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-lg transition-all"
                    >
                      + Add Email
                    </button>
                  </div>
                </div>

                {/* Erection Column */}
                <div className="space-y-3">
                  <h4 className="text-sm font-bold text-slate-800">Erection Team</h4>
                  <div className="bg-slate-50/50 border border-slate-200 rounded-xl p-4 space-y-3 min-h-[160px] flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-2">
                        {systemEmails.erection.map(email => (
                          <span key={email} className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-slate-200 rounded-full text-xs font-semibold text-slate-700 shadow-sm max-w-full">
                            <span className="truncate">{email}</span>
                            <button type="button" onClick={() => removeEmail('erection', email)} className="text-slate-400 hover:text-slate-600 font-bold focus:outline-none ml-1">✕</button>
                          </span>
                        ))}
                      </div>
                      <input 
                        type="email" 
                        value={newEmailInputs.erection}
                        onChange={(e) => setNewEmailInputs({...newEmailInputs, erection: e.target.value})}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addEmail('erection'); } }}
                        placeholder="Add another email..."
                        className="w-full bg-transparent text-xs font-semibold text-slate-600 placeholder-slate-400 outline-none border-b border-transparent focus:border-slate-300 py-1"
                      />
                    </div>
                    <button 
                      type="button"
                      onClick={() => addEmail('erection')}
                      className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-lg transition-all"
                    >
                      + Add Email
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}


          {activeTab === 'appearance' && (
            <div className="p-8 space-y-8 animate-fade-in">
              <div className="space-y-6">
                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">Theme Preferences</h3>
                <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={() => setTheme('light')}
                    className={`p-4 rounded-3xl border-2 transition-all ${theme === 'light' ? 'border-amber-500 bg-white' : 'border-slate-100 bg-slate-50 opacity-60 hover:opacity-100'}`}
                  >
                    <div className="w-full h-20 bg-white rounded-xl border border-slate-100 flex items-center justify-center mb-3">
                      <div className="w-12 h-1 bg-amber-500 rounded-full" />
                    </div>
                    <p className={`text-xs font-bold ${theme === 'light' ? 'text-slate-900' : 'text-slate-500'}`}>Light Mode</p>
                  </button>
                  <button 
                    onClick={() => setTheme('dark')}
                    className={`p-4 rounded-3xl border-2 transition-all ${theme === 'dark' ? 'border-amber-500 bg-slate-800' : 'border-slate-100 bg-slate-900 opacity-60 hover:opacity-100'}`}
                  >
                    <div className="w-full h-20 bg-slate-800 rounded-xl flex items-center justify-center mb-3">
                      <div className="w-12 h-1 bg-amber-500 rounded-full" />
                    </div>
                    <p className={`text-xs font-bold ${theme === 'dark' ? 'text-amber-500' : 'text-slate-300'}`}>Dark Mode</p>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-slate-100">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">System Language</label>
                    <select className="w-full px-5 py-4 rounded-2xl border border-slate-200 bg-slate-50/50 text-sm font-bold text-slate-700 outline-none appearance-none">
                      <option value="en">English (US)</option>
                      <option value="hi">Hindi</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Timezone</label>
                    <select className="w-full px-5 py-4 rounded-2xl border border-slate-200 bg-slate-50/50 text-sm font-bold text-slate-700 outline-none appearance-none">
                      <option value="IST">Asia/Kolkata (GMT+5:30)</option>
                      <option value="UTC">UTC</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
