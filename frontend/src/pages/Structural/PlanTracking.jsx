import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Search, ListChecks, CheckCircle2, Clock, AlertCircle, LayoutList, ChevronDown, ArrowLeft, Edit2 } from 'lucide-react';
import { projectAPI, scheduleAPI } from '../../services/api';

export default function PlanTracking() {
  const [projects, setProjects] = useState([]);
  const [allSchedules, setAllSchedules] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [projRes, schedRes] = await Promise.all([
        projectAPI.getAll(),
        scheduleAPI.getAll()
      ]);

      const projData = projRes.data.results || projRes.data;
      const schedData = schedRes.data.results || schedRes.data;

      setProjects(Array.isArray(projData) ? projData : []);
      setAllSchedules(Array.isArray(schedData) ? schedData : []);
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  };

  const calculateStatus = (rtsDateStr, leadWeeks) => {
    if (!rtsDateStr) return { label: 'TBD', color: 'text-slate-400', bg: 'bg-slate-100', dot: 'bg-slate-400', icon: Clock };

    const now = new Date();
    const rtsDate = new Date(rtsDateStr);
    const weeks = parseFloat(leadWeeks) || 0;
    const leadDays = weeks * 7;
    const completionDate = new Date(rtsDate.getTime() + leadDays * 24 * 60 * 60 * 1000);

    const twoDaysFromNow = new Date();
    twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);

    if (rtsDate > twoDaysFromNow) {
      return { label: 'Yet to Start', color: 'text-blue-600', bg: 'bg-blue-50', dot: 'bg-blue-500', icon: AlertCircle };
    } else if (now >= completionDate) {
      return { label: 'Completed', color: 'text-emerald-600', bg: 'bg-emerald-50', dot: 'bg-emerald-500', icon: CheckCircle2 };
    } else {
      return { label: 'In Progress', color: 'text-amber-600', bg: 'bg-amber-50', dot: 'bg-amber-500', icon: Clock };
    }
  };

  const formatDate = (d) => {
    if (!d) return '-';
    return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const getExpectedCompletion = (rtsDateStr, leadWeeks) => {
    if (!rtsDateStr) return '-';
    const rtsDate = new Date(rtsDateStr);
    const weeks = parseFloat(leadWeeks) || 0;
    const completionDate = new Date(rtsDate.getTime() + weeks * 7 * 24 * 60 * 60 * 1000);
    return formatDate(completionDate);
  };

  const trackingData = allSchedules.map(s => {
    const project = projects.find(p => (p.id === (s.project?.id || s.project)));
    return {
      ...s,
      projectName: project?.name || 'N/A',
      customerName: project?.customer_name || 'N/A',
    };
  }).sort((a, b) => {
    // Sort by Project Name first
    const projCompare = a.projectName.localeCompare(b.projectName);
    if (projCompare !== 0) return projCompare;

    // Sort by Sequence Number numerically
    const aNum = parseFloat(a.seq_no);
    const bNum = parseFloat(b.seq_no);
    if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
    return String(a.seq_no).localeCompare(String(b.seq_no), undefined, { numeric: true });
  });

  // 1. Projects filtered by search
  const filteredProjects = projects.filter(p =>
    (p.name?.toLowerCase() || '').includes(search.toLowerCase()) ||
    (p.code?.toLowerCase() || '').includes(search.toLowerCase()) ||
    (p.customer_name?.toLowerCase() || '').includes(search.toLowerCase())
  );

  // 2. Helper to get filtered schedules for a specific project
  const getFilteredSchedulesForProject = (projId) => {
    const projectSchedules = trackingData.filter(s => String(s.project?.id || s.project) === String(projId));
    return projectSchedules.filter(item =>
      item.item_description?.toLowerCase().includes(search.toLowerCase()) ||
      item.category?.toLowerCase().includes(search.toLowerCase()) ||
      item.notes?.toLowerCase().includes(search.toLowerCase())
    );
  };

  const [openDropdownId, setOpenDropdownId] = useState(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });

  const handleStatusUpdate = async (itemId, subStatus) => {
    try {
      await scheduleAPI.update(itemId, { tracking_status: subStatus });
      setAllSchedules(prev => prev.map(s => s.id === itemId ? { ...s, tracking_status: subStatus } : s));
      setOpenDropdownId(null);
    } catch (err) {
      console.error('Failed to update status:', err);
      alert('Failed to update status');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/30 p-4 lg:p-8 space-y-6">
      {/* Search Bar */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search projects or tracking items..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 text-sm outline-none focus:border-amber-400 transition-all"
          />
        </div>
      </div>

      {/* Main Table: Expandable Project Tracking Accordion */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-fade-in">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse table-fixed">
            <thead>
              <tr className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-bold uppercase tracking-wider">
                <th className="px-6 py-4 border-r border-white/10 w-[40%]">Project Name</th>
                <th className="px-6 py-4 border-r border-white/10 w-[20%]">Code</th>
                <th className="px-6 py-4 border-r border-white/10 w-[25%]">Customer</th>
                <th className="px-6 py-4 text-right w-[15%]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="4" className="px-6 py-12 text-center text-slate-400">Loading projects...</td>
                </tr>
              ) : filteredProjects.length > 0 ? (
                filteredProjects.map((proj) => {
                  const isSelected = selectedProject?.id === proj.id;
                  const projectSchedules = getFilteredSchedulesForProject(proj.id);

                  return (
                    <React.Fragment key={proj.id}>
                      {/* Main Project Row */}
                      <tr
                        onClick={() => setSelectedProject(isSelected ? null : proj)}
                        className={`cursor-pointer transition-colors group ${isSelected
                            ? 'bg-amber-50/50 hover:bg-amber-100/30 font-semibold'
                            : 'hover:bg-slate-50/50'
                          }`}
                      >
                        <td className="px-6 py-4 text-slate-900 text-[13px] border-r border-slate-100 truncate" title={proj.name}>
                          {proj.name}
                        </td>
                        <td className="px-6 py-4 text-slate-600 text-[12px] font-mono border-r border-slate-100 truncate">
                          {proj.code}
                        </td>
                        <td className="px-6 py-4 text-slate-900 text-[12px] border-r border-slate-100 truncate" title={proj.customer_name}>
                          {proj.customer_name || 'N/A'}
                        </td>
                        <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => setSelectedProject(isSelected ? null : proj)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all ${isSelected
                                ? 'bg-amber-100 text-amber-800'
                                : 'text-amber-600 hover:bg-amber-50'
                              }`}
                          >
                            {isSelected ? 'Collapse' : 'Track Plan'}
                          </button>
                        </td>
                      </tr>

                      {/* Expandable Project Details Sub-Row */}
                      {isSelected && (
                        <tr className="bg-slate-50/20 border-y border-slate-100">
                          <td colSpan="4" className="p-0">
                            <div className="overflow-hidden animate-fade-in">
                              <div className="w-full overflow-hidden">
                                <table className="w-full text-left border-collapse table-fixed">
                                  <thead>
                                    <tr className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-bold uppercase tracking-wider">
                                      <th className="px-2 py-3 border-r border-white/10 w-[11%]">Job Name</th>
                                      <th className="px-2 py-3 border-r border-white/10 w-[11%]">Customer Name</th>
                                      <th className="px-2 py-3 border-r border-white/10 w-[13%]">Item Description</th>
                                      <th className="px-2 py-3 border-r border-white/10 w-[7%]">Material</th>
                                      <th className="px-2 py-3 border-r border-white/10 text-center w-[6%]">Weight</th>
                                      <th className="px-2 py-3 border-r border-white/10 text-center w-[9%]">RTS date</th>
                                      <th className="px-2 py-3 border-r border-white/10 text-center w-[9%]">Ship date</th>
                                      <th className="px-2 py-3 border-r border-white/10 text-center w-[11%]">Status</th>
                                      <th className="px-2 py-3 border-r border-white/10 text-center w-[7%]">Lead Time</th>
                                      <th className="px-2 py-3 border-r border-white/10 text-center w-[9%]">Exp. Completion</th>
                                      <th className="px-2 py-3 text-center w-[7%]">Notes</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100 bg-white">
                                    {projectSchedules.length > 0 ? (
                                      projectSchedules.map((item) => {
                                        const status = calculateStatus(item.rts_date, item.shop_lead_time_weeks);
                                        const leadDays = (parseFloat(item.shop_lead_time_weeks) || 0) * 7;
                                        const isUnderProgress = status.label === 'In Progress';
                                        const isNotInScope = item.notes?.toLowerCase() === 'not in scope';

                                        return (
                                          <tr key={item.id} className={`${isNotInScope ? 'bg-slate-200/60' : 'hover:bg-slate-50/50'} transition-colors`}>
                                            <td className="px-2 py-2.5 text-slate-900 text-[11px] font-semibold border-r border-slate-100 truncate" title={item.projectName}>{item.projectName}</td>
                                            <td className="px-2 py-2.5 text-slate-900 text-[11px] font-medium border-r border-slate-100 truncate" title={item.customerName}>{item.customerName}</td>
                                            <td className="px-2 py-2.5 text-slate-900 text-[11px] font-medium border-r border-slate-100 truncate" title={item.item_description}>{item.item_description || '-'}</td>
                                            <td className="px-2 py-2.5 text-slate-900 text-[11px] font-medium border-r border-slate-100 truncate">{item.category || '-'}</td>
                                            <td className="px-2 py-2.5 text-center text-slate-900 text-[11px] font-medium border-r border-slate-100">{parseFloat(item.tons || 0).toFixed(2)}</td>
                                            <td className="px-2 py-2.5 text-center text-slate-900 text-[11px] font-medium border-r border-slate-100">{formatDate(item.rts_date)}</td>
                                            <td className="px-2 py-2.5 text-center text-slate-900 text-[11px] font-medium border-r border-slate-100">{formatDate(item.ship_date)}</td>
                                            <td className="px-2 py-2.5 border-r border-slate-100">
                                              <div className="flex flex-col items-center gap-1">
                                                <button
                                                  onClick={(e) => {
                                                    if (!isUnderProgress) return;
                                                    const rect = e.currentTarget.getBoundingClientRect();
                                                    setDropdownPosition({
                                                      top: rect.bottom,
                                                      left: rect.left + rect.width / 2
                                                    });
                                                    setOpenDropdownId(openDropdownId === item.id ? null : item.id);
                                                  }}
                                                  className={`flex items-center justify-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tight shadow-sm transition-all border ${status.bg} ${status.color} border-current/10 ${isUnderProgress ? 'hover:scale-105 active:scale-95' : 'cursor-default'}`}
                                                >
                                                  <div className={`w-1 h-1 rounded-full ${status.dot} shadow-[0_0_4px_rgba(0,0,0,0.1)]`} />
                                                  {status.label}
                                                  {isUnderProgress && <ChevronDown className={`w-2.5 h-2.5 ml-0.5 transition-transform ${openDropdownId === item.id ? 'rotate-180' : ''}`} />}
                                                </button>

                                                {item.tracking_status && (
                                                  <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-white border border-slate-100 shadow-sm">
                                                    <span className="text-[8px] font-bold uppercase text-slate-600 tracking-tight">
                                                      {item.tracking_status}
                                                    </span>
                                                  </div>
                                                )}

                                                {openDropdownId === item.id && createPortal(
                                                  <>
                                                    <div className="fixed inset-0 z-40" onClick={() => setOpenDropdownId(null)} />
                                                    <div
                                                      className="fixed z-50 bg-white shadow-2xl border border-slate-200 rounded-xl py-1.5 min-w-[125px] mt-2 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
                                                      style={{ top: `${dropdownPosition.top}px`, left: `${dropdownPosition.left}px`, transform: 'translateX(-50%)' }}
                                                    >
                                                      <div className="px-3 py-1 border-b border-slate-100 mb-1">
                                                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Select Status</span>
                                                      </div>
                                                      {['Erected', 'Half Erected', 'In Fabrication', 'On Hold'].map((option) => (
                                                        <button
                                                          key={option}
                                                          onClick={() => handleStatusUpdate(item.id, option)}
                                                          className={`w-full text-left px-3 py-2 text-[9px] font-bold uppercase transition-all flex items-center justify-between ${item.tracking_status === option ? 'bg-amber-50 text-amber-600' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                                                        >
                                                          {option}
                                                          {item.tracking_status === option && <div className="w-1 h-1 rounded-full bg-amber-500" />}
                                                        </button>
                                                      ))}
                                                      <div className="mt-1 pt-1 border-t border-slate-100">
                                                        <button
                                                          onClick={() => handleStatusUpdate(item.id, null)}
                                                          className="w-full text-left px-3 py-2 text-[9px] font-bold uppercase text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all"
                                                        >
                                                          Reset to Default
                                                        </button>
                                                      </div>
                                                    </div>
                                                  </>,
                                                  document.body
                                                )}
                                              </div>
                                            </td>
                                            <td className="px-2 py-2.5 text-center text-slate-900 text-[11px] font-medium border-r border-slate-100">{leadDays}</td>
                                            <td className="px-2 py-2.5 text-center text-slate-900 text-[11px] font-medium border-r border-slate-100 whitespace-nowrap">{getExpectedCompletion(item.rts_date, item.shop_lead_time_weeks)}</td>
                                            <td className="px-2 py-2.5 text-center text-slate-600 italic text-[11px] truncate" title={item.notes}>{item.notes || '-'}</td>
                                          </tr>
                                        );
                                      })
                                    ) : (
                                      <tr>
                                        <td colSpan="10" className="px-6 py-12 text-center text-slate-400">
                                          No tracking sequences found matching search or project.
                                        </td>
                                      </tr>
                                    )}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="4" className="px-6 py-8 text-center text-slate-400">
                    No projects found. Add projects in Project Master first.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
