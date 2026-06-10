import { useState, useEffect, useCallback } from 'react';
import {
  ChevronLeft, ChevronRight, Trash2, Pencil, Check, X,
  CalendarDays, Plus, Loader2, AlertTriangle,
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay } from 'date-fns';
import toast from 'react-hot-toast';
import { holidayAPI } from '../../services/api';

const US_TZ = 'America/Chicago';

const TYPE_OPTIONS = ['Public', 'Company', 'Optional'];

const TYPE_COLOR = {
  Public:   'bg-emerald-100 text-emerald-700 border-emerald-200',
  Company:  'bg-blue-100 text-blue-700 border-blue-200',
  Optional: 'bg-amber-100 text-amber-700 border-amber-200',
};

function getAllMonths(year) {
  return Array.from({ length: 12 }, (_, i) => new Date(year, i, 1));
}

function todayStr() {
  return format(new Date(), 'yyyy-MM-dd');
}

// ─── Mini Month Grid ──────────────────────────────────────────────────────────
function MiniMonth({ monthDate, holidays, selectedDates, onDateClick }) {
  const monthStart = startOfMonth(monthDate);
  const monthEnd   = endOfMonth(monthDate);
  const days        = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDay    = getDay(monthStart);
  const today       = todayStr();

  const holidaySet  = new Set(holidays.map(h => h.date));
  const selectedSet = new Set(selectedDates.map(s => s.date));

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-2 shadow-sm">
      <p className="text-[11px] font-black text-slate-600 uppercase tracking-widest text-center mb-1.5">
        {format(monthDate, 'MMM yyyy')}
      </p>

      {/* Day labels */}
      <div className="grid grid-cols-7 mb-0.5">
        {['S','M','T','W','T','F','S'].map((d, i) => (
          <div key={i} className="text-[9px] font-bold text-slate-400 text-center py-0.5">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-px">
        {Array.from({ length: startDay }).map((_, i) => (
          <div key={`e-${i}`} />
        ))}
        {days.map(day => {
          const ds         = format(day, 'yyyy-MM-dd');
          const isHoliday  = holidaySet.has(ds);
          const isSelected = selectedSet.has(ds);
          const isToday    = ds === today;

          let cls = 'text-slate-600 hover:bg-slate-100';
          if (isHoliday)       cls = 'bg-emerald-500 text-white font-bold rounded';
          else if (isSelected) cls = 'bg-amber-400 text-white font-bold rounded';
          else if (isToday)    cls = 'bg-amber-100 text-amber-700 font-bold rounded';

          return (
            <button
              key={ds}
              onClick={() => onDateClick(ds)}
              title={ds}
              className={`text-[10px] flex items-center justify-center h-5 w-full transition-all cursor-pointer select-none ${cls}`}
            >
              {format(day, 'd')}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function HolidayCalendar() {
  const user      = JSON.parse(sessionStorage.getItem('user') || '{}');
  const canManage = user.role !== 'readonly' && !!user.role;

  const [currentYear, setCurrentYear]     = useState(new Date().getFullYear());
  const [selectedDates, setSelectedDates] = useState([]);
  const [holidays, setHolidays]           = useState([]);
  const [loading, setLoading]             = useState(true);
  const [saving, setSaving]               = useState(false);
  const [editItem, setEditItem]           = useState(null);
  const [editForm, setEditForm]           = useState({ description: '', type: 'Public' });
  const [deleteTarget, setDeleteTarget]   = useState(null);

  const allMonths = getAllMonths(currentYear);

  // ── Fetch ────────────────────────────────────────────────────────────────
  const fetchHolidays = useCallback(async () => {
    setLoading(true);
    try {
      const res = await holidayAPI.getAll();
      setHolidays(res.data || []);
    } catch {
      toast.error('Failed to load holidays');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchHolidays(); }, [fetchHolidays]);

  // ── Date selection ───────────────────────────────────────────────────────
  const handleDateClick = (dateStr) => {
    if (!canManage) return;
    setSelectedDates(prev => {
      const exists = prev.find(i => i.date === dateStr);
      if (exists) return prev.filter(i => i.date !== dateStr);
      return [...prev, { date: dateStr, description: '', type: 'Public' }];
    });
  };

  const updateSelected = (date, field, value) => {
    setSelectedDates(prev =>
      prev.map(i => i.date === date ? { ...i, [field]: value } : i)
    );
  };

  const removeSelected = (date) => {
    setSelectedDates(prev => prev.filter(i => i.date !== date));
  };

  // ── Save selected ────────────────────────────────────────────────────────
  const handleSaveAll = async () => {
    const valid = selectedDates.filter(i => i.description.trim());
    if (!valid.length) {
      toast.error('Please add a description for each selected date');
      return;
    }
    setSaving(true);
    try {
      for (const item of valid) {
        const exists = holidays.find(h => h.date === item.date && h.timezone === US_TZ);
        if (!exists) {
          await holidayAPI.create({ date: item.date, description: item.description, type: item.type, timezone: US_TZ });
        }
      }
      await fetchHolidays();
      setSelectedDates([]);
      toast.success('Holidays saved!');
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to save holidays');
    } finally {
      setSaving(false);
    }
  };

  // ── Edit ─────────────────────────────────────────────────────────────────
  const startEdit = (holiday) => {
    setEditItem(holiday);
    setEditForm({ description: holiday.description, type: holiday.type });
  };

  const cancelEdit = () => setEditItem(null);

  const saveEdit = async () => {
    if (!editForm.description.trim()) return;
    try {
      await holidayAPI.update(editItem.id, { description: editForm.description, type: editForm.type });
      await fetchHolidays();
      setEditItem(null);
      toast.success('Holiday updated');
    } catch {
      toast.error('Failed to update holiday');
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const confirmDelete = async () => {
    try {
      await holidayAPI.delete(deleteTarget.id);
      await fetchHolidays();
      toast.success('Holiday deleted');
    } catch {
      toast.error('Failed to delete holiday');
    } finally {
      setDeleteTarget(null);
    }
  };

  const yearHolidays = holidays.filter(h => h.date?.startsWith(String(currentYear)));

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4 h-full">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 flex-none">
        <div className="flex flex-col">
          <h2 className="text-base font-black text-slate-800 tracking-tight flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-amber-500" />
            Holiday Calendar
          </h2>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Click dates to mark holidays · Linked to Internal Bid Schedule
          </p>
        </div>

        {/* Year navigation */}
        <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-1 py-1">
          <button
            onClick={() => setCurrentYear(y => y - 1)}
            className="p-1 rounded hover:bg-slate-100 text-slate-500 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-black text-slate-700 min-w-[3rem] text-center tabular-nums">
            {currentYear}
          </span>
          <button
            onClick={() => setCurrentYear(y => y + 1)}
            className="p-1 rounded hover:bg-slate-100 text-slate-500 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Legend ── */}
      <div className="flex items-center gap-4 text-[10px] font-bold text-slate-500 flex-none flex-wrap">
        <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-500 inline-block" /> Holiday</div>
        <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-400 inline-block" /> Selected</div>
        <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-100 border border-amber-300 inline-block" /> Today</div>
        <span className="ml-auto text-slate-400 font-semibold">
          {yearHolidays.length} holiday{yearHolidays.length !== 1 ? 's' : ''} in {currentYear}
        </span>
      </div>

      {/* ── Body: Calendar + Side Panel ── */}
      <div className="flex flex-col lg:flex-row gap-4 flex-1 min-h-0">

        {/* 12-month grid */}
        <div className="flex-1 min-h-0 overflow-y-auto pr-1">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2">
              {allMonths.map((m, i) => (
                <MiniMonth
                  key={i}
                  monthDate={m}
                  holidays={holidays}
                  selectedDates={selectedDates}
                  onDateClick={handleDateClick}
                />
              ))}
            </div>
          )}
        </div>

        {/* Side panel */}
        {canManage && (
          <div className="w-full lg:w-72 xl:w-80 flex flex-col gap-3 flex-none">
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col overflow-hidden" style={{ maxHeight: '420px' }}>
              <div className="px-3 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 flex items-center justify-between flex-none">
                <span className="text-xs font-black text-white uppercase tracking-widest">
                  Selected ({selectedDates.length})
                </span>
                {selectedDates.length > 0 && (
                  <button
                    onClick={() => setSelectedDates([])}
                    className="p-1 rounded hover:bg-white/20 text-white/70 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-0">
                {selectedDates.length === 0 ? (
                  <div className="py-8 flex flex-col items-center justify-center text-center text-slate-400">
                    <CalendarDays className="w-8 h-8 mb-2 opacity-30" />
                    <p className="text-xs font-semibold">Click dates on the calendar<br />to mark as holidays</p>
                  </div>
                ) : (
                  [...selectedDates]
                    .sort((a, b) => a.date.localeCompare(b.date))
                    .map(item => {
                      const [y, mo, d] = item.date.split('-').map(Number);
                      const dt = new Date(y, mo - 1, d);
                      return (
                        <div key={item.date} className="bg-slate-50 border border-slate-200 rounded-lg p-2 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-black text-slate-700">
                              {format(dt, 'MMM dd, yyyy')}
                            </span>
                            <button
                              onClick={() => removeSelected(item.date)}
                              className="p-0.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <input
                            type="text"
                            placeholder="Holiday description…"
                            value={item.description}
                            onChange={e => updateSelected(item.date, 'description', e.target.value)}
                            className="w-full text-xs px-2 py-1.5 border border-slate-200 rounded-md bg-white outline-none focus:border-amber-400 transition-all"
                          />
                          <select
                            value={item.type}
                            onChange={e => updateSelected(item.date, 'type', e.target.value)}
                            className="w-full text-xs px-2 py-1.5 border border-slate-200 rounded-md bg-white outline-none focus:border-amber-400 appearance-none transition-all"
                          >
                            {TYPE_OPTIONS.map(t => <option key={t}>{t}</option>)}
                          </select>
                        </div>
                      );
                    })
                )}
              </div>

              {selectedDates.length > 0 && (
                <div className="p-2 border-t border-slate-100 flex-none">
                  <button
                    onClick={handleSaveAll}
                    disabled={saving || selectedDates.every(i => !i.description.trim())}
                    className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-black uppercase tracking-wide shadow-sm hover:brightness-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                    {saving ? 'Saving…' : 'Save All Holidays'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Holiday List Table ── */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm flex-none overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <span className="text-xs font-black text-slate-700 uppercase tracking-widest">
            Holidays List — {currentYear}
          </span>
          <span className="text-[10px] text-slate-400 font-semibold">{yearHolidays.length} records</span>
        </div>

        {yearHolidays.length === 0 ? (
          <div className="py-10 flex flex-col items-center justify-center text-slate-400">
            <AlertTriangle className="w-7 h-7 mb-2 opacity-30" />
            <p className="text-xs font-semibold">No holidays found for {currentYear}</p>
          </div>
        ) : (
          <div className="overflow-x-auto max-h-64 overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 sticky top-0 border-b border-slate-200">
                <tr>
                  {['Date', 'Description', 'Type', canManage ? 'Actions' : ''].filter(Boolean).map(h => (
                    <th key={h} className="px-4 py-2 text-left text-[10px] font-black uppercase tracking-widest text-slate-500">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {yearHolidays
                  .sort((a, b) => a.date.localeCompare(b.date))
                  .map(holiday => {
                    const [y, mo, d] = holiday.date.split('-').map(Number);
                    const dt = new Date(y, mo - 1, d);
                    const isEditing = editItem?.id === holiday.id;

                    return (
                      <tr key={holiday.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-2 font-bold text-slate-700 whitespace-nowrap">
                          {format(dt, 'MMM dd, yyyy')}
                        </td>
                        <td className="px-4 py-2">
                          {isEditing ? (
                            <input
                              autoFocus
                              value={editForm.description}
                              onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                              className="w-full text-xs px-2 py-1 border border-amber-400 rounded-md outline-none bg-amber-50"
                            />
                          ) : (
                            <span className="text-slate-700 font-semibold">{holiday.description}</span>
                          )}
                        </td>
                        <td className="px-4 py-2">
                          {isEditing ? (
                            <select
                              value={editForm.type}
                              onChange={e => setEditForm(f => ({ ...f, type: e.target.value }))}
                              className="text-xs px-2 py-1 border border-amber-400 rounded-md outline-none bg-amber-50 appearance-none"
                            >
                              {TYPE_OPTIONS.map(t => <option key={t}>{t}</option>)}
                            </select>
                          ) : (
                            <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${TYPE_COLOR[holiday.type] || ''}`}>
                              {holiday.type}
                            </span>
                          )}
                        </td>
                        {canManage && (
                          <td className="px-4 py-2">
                            <div className="flex items-center gap-1">
                              {isEditing ? (
                                <>
                                  <button onClick={saveEdit} className="p-1 rounded hover:bg-emerald-50 text-emerald-600 transition-colors" title="Save">
                                    <Check className="w-3.5 h-3.5" />
                                  </button>
                                  <button onClick={cancelEdit} className="p-1 rounded hover:bg-slate-100 text-slate-400 transition-colors" title="Cancel">
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button onClick={() => startEdit(holiday)} className="p-1 rounded hover:bg-blue-50 text-blue-500 transition-colors" title="Edit">
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                  <button onClick={() => setDeleteTarget(holiday)} className="p-1 rounded hover:bg-red-50 text-red-500 transition-colors" title="Delete">
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Delete Confirm Modal ── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <p className="text-sm font-black text-slate-800">Delete Holiday</p>
                <p className="text-xs text-slate-500 mt-0.5">This action cannot be undone.</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 bg-slate-50 rounded-lg p-3 border border-slate-200">
              <span className="font-bold">"{deleteTarget.description}"</span><br />
              <span className="text-slate-400">{deleteTarget.date}</span>
            </p>
            <div className="flex gap-2 justify-end pt-1">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-600 text-xs font-black hover:bg-slate-50 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 rounded-xl bg-red-500 text-white text-xs font-black hover:bg-red-600 transition-all shadow-sm"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
