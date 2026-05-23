import { useState, useEffect } from 'react';
import { Megaphone, Calendar, CheckCircle2, AlertTriangle, Edit3, Trash2, ShieldAlert, ToggleLeft, ToggleRight } from 'lucide-react';
import { announcementAPI } from '../services/api';

export default function Announcements() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    from_date: '',
    to_date: '',
    is_active: true
  });
  const [editingId, setEditingId] = useState(null);

  const isAdminOrManager = true;

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      const response = await announcementAPI.getAll();
      setAnnouncements(response.data.results || response.data);
    } catch (err) {
      console.error('Failed to fetch announcements:', err);
      setError('Failed to load announcements from the server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      // YYYY-MM-DD to D/M/YYYY
      return `${parseInt(parts[2])}/${parseInt(parts[1])}/${parts[0]}`;
    }
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
  };

  const isExpired = (toDateStr) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const toDate = new Date(toDateStr);
    toDate.setHours(0, 0, 0, 0);
    return toDate < today;
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.title || !formData.message || !formData.from_date || !formData.to_date) {
      setError('Please fill in all required fields.');
      return;
    }

    try {
      if (editingId) {
        await announcementAPI.update(editingId, formData);
        setSuccess('Announcement updated successfully.');
      } else {
        await announcementAPI.create(formData);
        setSuccess('Announcement published successfully.');
      }

      // Reset form
      setFormData({
        title: '',
        message: '',
        from_date: '',
        to_date: '',
        is_active: true
      });
      setEditingId(null);
      fetchAnnouncements();
    } catch (err) {
      console.error('Failed to save announcement:', err);
      setError(err.response?.data?.detail || 'Failed to save announcement. Please check your data.');
    }
  };

  const handleEdit = (ann) => {
    setEditingId(ann.id);
    setFormData({
      title: ann.title,
      message: ann.message,
      from_date: ann.from_date,
      to_date: ann.to_date,
      is_active: ann.is_active
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this announcement?')) return;

    setError('');
    setSuccess('');
    try {
      await announcementAPI.delete(id);
      setSuccess('Announcement deleted successfully.');
      fetchAnnouncements();
    } catch (err) {
      console.error('Failed to delete announcement:', err);
      setError('Failed to delete announcement.');
    }
  };

  const handleToggleActive = async (ann) => {
    try {
      setError('');
      setSuccess('');
      await announcementAPI.update(ann.id, {
        title: ann.title,
        message: ann.message,
        from_date: ann.from_date,
        to_date: ann.to_date,
        is_active: !ann.is_active
      });
      setSuccess(`Announcement ${!ann.is_active ? 'activated' : 'deactivated'} successfully.`);
      fetchAnnouncements();
    } catch (err) {
      console.error('Failed to toggle active status:', err);
      setError('Failed to update announcement status.');
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 page-enter py-4">
      {error && (
        <div className="bg-red-50 border border-red-100 p-4 text-red-600 text-xs font-bold flex items-center gap-2 rounded-lg animate-shake">
          <AlertTriangle className="w-4 h-4" />
          {error}
        </div>
      )}

      {success && (
        <div className="bg-emerald-50 border border-emerald-100 p-4 text-emerald-600 text-xs font-bold flex items-center gap-2 rounded-lg">
          <CheckCircle2 className="w-4 h-4" />
          {success}
        </div>
      )}

      {/* Create form (Admins/Managers Only) */}
      {isAdminOrManager && (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-8 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]">
          <h3 className="text-lg font-bold text-slate-800 mb-6">
            {editingId ? 'Edit Announcement' : 'Create New Announcement'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="text-sm font-semibold text-slate-600 block mb-1.5">Title</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="Enter announcement title"
                className="w-full text-sm text-slate-800 border border-slate-300 rounded-lg px-4 py-2.5 outline-none bg-white focus:border-slate-800 transition-colors"
                required
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-600 block mb-1.5">Message</label>
              <textarea
                name="message"
                value={formData.message}
                onChange={handleInputChange}
                placeholder="Enter announcement message"
                rows="4"
                className="w-full text-sm text-slate-800 border border-slate-300 rounded-lg px-4 py-2.5 outline-none bg-white focus:border-slate-800 transition-colors resize-none"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-semibold text-slate-600 block mb-1.5">From Date</label>
                <input
                  type="date"
                  name="from_date"
                  value={formData.from_date}
                  onChange={handleInputChange}
                  className="w-full text-sm text-slate-800 border border-slate-300 rounded-lg px-4 py-2.5 outline-none bg-white focus:border-slate-800 transition-colors"
                  required
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-600 block mb-1.5">To Date</label>
                <input
                  type="date"
                  name="to_date"
                  value={formData.to_date}
                  onChange={handleInputChange}
                  className="w-full text-sm text-slate-800 border border-slate-300 rounded-lg px-4 py-2.5 outline-none bg-white focus:border-slate-800 transition-colors"
                  required
                />
              </div>
            </div>

            <div className="flex items-center gap-2.5 pt-2">
              <input
                type="checkbox"
                name="is_active"
                id="is_active"
                checked={formData.is_active}
                onChange={handleInputChange}
                className="w-4 h-4 accent-[#1e293b] rounded border-slate-300 focus:ring-0 cursor-pointer"
              />
              <label htmlFor="is_active" className="text-sm text-slate-600 font-semibold cursor-pointer select-none">
                Active (visible on login page)
              </label>
            </div>

            <div className="flex gap-4 pt-2">
              <button
                type="submit"
                className="bg-[#1e1b4b] text-white hover:bg-indigo-950 transition-all font-bold text-sm px-6 py-3 rounded-lg shadow-sm"
              >
                {editingId ? 'Update Announcement' : 'Publish Announcement'}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(null);
                    setFormData({
                      title: '',
                      message: '',
                      from_date: '',
                      to_date: '',
                      is_active: true
                    });
                  }}
                  className="bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all font-bold text-sm px-6 py-3 rounded-lg"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      {/* Existing Announcements List */}
      <div className="space-y-6">
        <h3 className="text-lg font-bold text-slate-800">
          Existing Announcements ({announcements.length})
        </h3>

        {loading ? (
          <div className="py-12 text-center text-slate-400 text-sm font-semibold uppercase tracking-wider">
            Loading announcements...
          </div>
        ) : announcements.length > 0 ? (
          <div className="space-y-4">
            {announcements.map((ann) => {
              const expired = isExpired(ann.to_date);
              const active = ann.is_active && !expired;

              return (
                <div
                  key={ann.id}
                  className="bg-[#e6f4ea]/30 border border-[#dcfce7] p-6 rounded-2xl flex flex-col md:flex-row justify-between gap-6 transition-all duration-300 hover:shadow-sm"
                >
                  <div className="space-y-2.5 flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <h4 className="text-base font-bold text-slate-900 leading-tight">
                        {ann.title}
                      </h4>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${active
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-emerald-50 text-emerald-700'
                            }`}
                        >
                          {active ? 'Active' : expired ? 'Expired' : 'Inactive'}
                        </span>
                        <span className="text-[12px] text-slate-500 font-medium">
                          {formatDate(ann.created_at?.split('T')[0] || ann.from_date)}
                        </span>
                      </div>
                    </div>

                    <p className="text-sm text-slate-600 leading-relaxed font-medium">
                      {ann.message}
                    </p>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 font-semibold pt-1">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        From: {formatDate(ann.from_date)} • To: {formatDate(ann.to_date)}
                      </span>
                      <span>•</span>
                      <span>ID: {ann.id?.toString().substring(0, 8)}...</span>
                      {ann.created_by_name && (
                        <>
                          <span>•</span>
                          <span>From: {ann.created_by_name}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Actions (Admins/Managers Only) */}
                  {isAdminOrManager && (
                    <div className="flex items-center md:self-end gap-3 shrink-0">
                      <button
                        onClick={() => handleToggleActive(ann)}
                        className={`text-xs font-bold rounded-lg px-4 py-2 transition-colors ${ann.is_active
                            ? 'bg-[#fef9c3] text-[#854d0e] hover:bg-[#fef08a]'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                      >
                        {ann.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        onClick={() => handleEdit(ann)}
                        className="bg-[#1e293b] text-white hover:bg-slate-800 rounded-lg px-4 py-2 text-xs font-bold transition-colors flex items-center gap-1"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(ann.id)}
                        className="bg-[#fee2e2] text-[#991b1b] hover:bg-[#fecaca] rounded-lg px-4 py-2 text-xs font-bold transition-colors flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="border border-dashed border-slate-300 rounded-2xl p-12 text-center text-slate-400 text-sm font-semibold bg-slate-50/20">
            No announcements found.
          </div>
        )}
      </div>
    </div>
  );
}
