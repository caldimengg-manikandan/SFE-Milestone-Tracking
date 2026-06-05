import React, { useState, useEffect } from 'react';
import { Search, Calendar } from 'lucide-react';
import { projectAPI, scheduleAPI } from '../../services/api';
import TrackingGanttChart from '../../components/TrackingGanttChart';

const FormattedDateInput = ({ value, onChange, readOnly, className, max }) => {
  const getDisplayValue = (val) => {
    if (!val) return '';
    const parts = val.split('-');
    if (parts.length === 3 && parts[0].length === 4) {
      return `${parts[1]}-${parts[2]}-${parts[0]}`;
    }
    return val;
  };

  if (readOnly) {
    return (
      <div className="relative w-full flex items-center">
        <input
          type="text"
          readOnly
          className={`${className} pointer-events-none pr-6`}
          value={getDisplayValue(value)}
        />
        <Calendar className="w-3 h-3 text-slate-400 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-60" />
      </div>
    );
  }

  return (
    <div className="relative w-full flex items-center">
      <input
        type="text"
        readOnly
        placeholder="mm-dd-yyyy"
        className={`${className} pr-6 bg-white`}
        value={getDisplayValue(value)}
      />
      <Calendar className="w-3 h-3 text-slate-400 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
      <input
        type="date"
        value={value || ''}
        onChange={onChange}
        max={max}
        className="absolute inset-0 opacity-0 cursor-pointer z-10 w-full h-full"
      />
    </div>
  );
};

const parseDate = (dStr) => {
  if (!dStr) return null;

  if (dStr instanceof Date) {
    return isNaN(dStr.getTime()) ? null : dStr;
  }

  if (typeof dStr === 'string') {
    const trimmed = dStr.trim();

    // Try parsing yyyy-mm-dd or mm-dd-yyyy
    if (trimmed.includes('-')) {
      const parts = trimmed.split('-');
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          // YYYY-MM-DD
          const d = new Date(
            parseInt(parts[0], 10),
            parseInt(parts[1], 10) - 1,
            parseInt(parts[2], 10)
          );
          return isNaN(d.getTime()) ? null : d;
        } else if (parts[2].length === 4) {
          // MM-DD-YYYY
          const d = new Date(
            parseInt(parts[2], 10),
            parseInt(parts[0], 10) - 1,
            parseInt(parts[1], 10)
          );
          return isNaN(d.getTime()) ? null : d;
        }
      }
    }

    // Try parsing slashed formats (YYYY/MM/DD, DD/MM/YYYY, or MM/DD/YYYY)
    if (trimmed.includes('/')) {
      const parts = trimmed.split('/');
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          // YYYY/MM/DD
          const d = new Date(
            parseInt(parts[0], 10),
            parseInt(parts[1], 10) - 1,
            parseInt(parts[2], 10)
          );
          return isNaN(d.getTime()) ? null : d;
        } else if (parts[2].length === 4) {
          let day = parseInt(parts[0], 10);
          let month = parseInt(parts[1], 10) - 1;
          if (month > 11) {
            day = parseInt(parts[1], 10);
            month = parseInt(parts[0], 10) - 1;
          }
          const d = new Date(
            parseInt(parts[2], 10),
            month,
            day
          );
          return isNaN(d.getTime()) ? null : d;
        }
      }
    }
  }

  const iso = new Date(dStr);
  if (!isNaN(iso.getTime())) {
    return new Date(iso.getFullYear(), iso.getMonth(), iso.getDate());
  }

  return null;
};

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

  const formatDate = (d) => {
    if (!d) return '-';
    const date = new Date(d);
    if (isNaN(date.getTime())) return '-';
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${month}-${day}-${year}`;
  };

  const getOutlookCompletionDate = (rtsDateStr, leadWeeks) => {
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



  const handleFieldUpdate = async (itemId, field, value) => {
    if (field.startsWith('actual_') && field.endsWith('_date') && value) {
      const selectedDate = new Date(value);
      const today = new Date();
      const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const selectedOnly = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
      if (selectedOnly > todayOnly) {
        alert('Actual dates cannot be set in the future.');
        return;
      }
    }
    try {
      await scheduleAPI.update(itemId, { [field]: value || null });
      setAllSchedules(prev => prev.map(s => s.id === itemId ? { ...s, [field]: value || null } : s));
    } catch (err) {
      console.error(`Failed to update ${field}:`, err);
      alert(`Failed to update ${field}`);
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
                              <div className="w-full overflow-x-auto">
                                <table className="w-full text-left border-collapse table-fixed min-w-[2200px]">
                                  <thead>
                                    <tr className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-bold uppercase tracking-wider">
                                      <th className="px-1 py-3 border-r border-white/10 text-center sticky-col-1">Sequence</th>
                                      <th className="px-1 py-3 border-r border-white/10 text-center sticky-col-2">Item Description</th>
                                      <th className="px-1 py-3 border-r border-white/10 text-center sticky-col-3">Material</th>
                                      <th className="px-1 py-3 border-r border-white/10 text-center sticky-col-4">Weight</th>
                                      
                                      <th className="px-1 py-3 border-r border-white/10 text-center w-[5%]">Scheduled OFA Date</th>
                                      <th className="px-1 py-3 border-r border-white/10 text-center w-[7%]">Actual OFA Date</th>
                                      
                                      <th className="px-1 py-3 border-r border-white/10 text-center w-[5%]">Scheduled BFA Date</th>
                                      <th className="px-1 py-3 border-r border-white/10 text-center w-[7%]">Actual BFA Date</th>
                                      
                                      <th className="px-1 py-3 border-r border-white/10 text-center w-[5%]">Scheduled Field Measure Date</th>
                                      
                                      <th className="px-1 py-3 border-r border-white/10 text-center w-[5%]">RTS date</th>
                                      <th className="px-1 py-3 border-r border-white/10 text-center w-[7%]">Act. RTS</th>
                                      
                                      <th className="px-1 py-3 border-r border-white/10 text-center w-[4%]">Shop Lead Time (Weeks)</th>
                                      
                                      <th className="px-1 py-3 border-r border-white/10 text-center w-[5%]">Scheduled Start of Erection</th>
                                      <th className="px-1 py-3 border-r border-white/10 text-center w-[4%]">Budget Shop Hours</th>
                                      <th className="px-1 py-3 border-r border-white/10 text-center w-[4%]">Budget Field Hours</th>
                                      <th className="px-1 py-3 border-r border-white/10 text-center w-[5%]">Shop Hours actual</th>
                                      <th className="px-1 py-3 border-r border-white/10 text-center w-[5%]">Field Hours Actual</th>
                                      
                                      <th className="px-1 py-3 border-r border-white/10 text-center w-[5%]">Outlook Completion Date</th>
                                      <th className="px-1 py-3 text-center w-[3%]">Notes</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100 bg-white">
                                    {projectSchedules.length > 0 ? (
                                      projectSchedules.map((item) => {
                                        const isNotInScope = item.notes?.toLowerCase() === 'not in scope';

                                        return (
                                          <tr key={item.id} className={`${isNotInScope ? 'bg-slate-200/60 row-not-in-scope' : 'hover:bg-slate-50/50'} transition-colors`}>
                                            <td className="px-1 py-2 text-slate-900 text-[10px] font-semibold border-r border-slate-100 truncate sticky-col-1" title={item.seq_no}>{item.seq_no}</td>
                                            <td className="px-1 py-2 text-slate-900 text-[10px] font-medium border-r border-slate-100 truncate sticky-col-2" title={item.item_description}>{item.item_description || '-'}</td>
                                            <td className="px-1 py-2 text-slate-900 text-[10px] font-medium border-r border-slate-100 truncate sticky-col-3" title={item.category}>{item.category || '-'}</td>
                                            <td className="px-1 py-2 text-center text-slate-900 text-[10px] font-medium border-r border-slate-100 sticky-col-4">{parseFloat(item.tons || 0).toFixed(2)}</td>
                                            
                                            <td className="px-1 py-2 text-center text-slate-900 text-[10px] font-medium border-r border-slate-100 whitespace-nowrap">{formatDate(item.scheduled_ofa_date)}</td>
                                            <td className="px-1 py-2 text-center text-slate-900 text-[10px] font-medium border-r border-slate-100 relative">
                                              <FormattedDateInput
                                                value={item.actual_ofa_date || ''}
                                                onChange={(e) => handleFieldUpdate(item.id, 'actual_ofa_date', e.target.value)}
                                                max={new Date().toISOString().split('T')[0]}
                                                className="w-full text-[10px] p-1 border border-slate-200 rounded text-slate-700 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                                              />
                                            </td>
                                            
                                            <td className="px-1 py-2 text-center text-slate-900 text-[10px] font-medium border-r border-slate-100 whitespace-nowrap">{formatDate(item.scheduled_bfa_date)}</td>
                                            <td className="px-1 py-2 text-center text-slate-900 text-[10px] font-medium border-r border-slate-100 relative">
                                              <FormattedDateInput
                                                value={item.actual_bfa_date || ''}
                                                onChange={(e) => handleFieldUpdate(item.id, 'actual_bfa_date', e.target.value)}
                                                max={new Date().toISOString().split('T')[0]}
                                                className="w-full text-[10px] p-1 border border-slate-200 rounded text-slate-700 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                                              />
                                            </td>
                                            
                                            <td className="px-1 py-2 text-center text-slate-900 text-[10px] font-medium border-r border-slate-100 whitespace-nowrap">{formatDate(item.scheduled_field_measure_date)}</td>
                                            
                                            <td className="px-1 py-2 text-center text-slate-900 text-[10px] font-medium border-r border-slate-100 whitespace-nowrap">{formatDate(item.rts_date)}</td>
                                            <td className="px-1 py-2 text-center text-slate-900 text-[10px] font-medium border-r border-slate-100 relative">
                                              <FormattedDateInput
                                                value={item.actual_rts_date || ''}
                                                onChange={(e) => handleFieldUpdate(item.id, 'actual_rts_date', e.target.value)}
                                                max={new Date().toISOString().split('T')[0]}
                                                className="w-full text-[10px] p-1 border border-slate-200 rounded text-slate-700 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                                              />
                                            </td>
                                            <td className="px-1 py-2 text-center text-slate-900 text-[10px] font-medium border-r border-slate-100">{item.plant_lead_time_weeks}</td>
                                            
                                            <td className="px-1 py-2 text-center text-slate-900 text-[10px] font-medium border-r border-slate-100 whitespace-nowrap">{formatDate(item.scheduled_erection_date)}</td>
                                            <td className="px-1 py-2 text-center text-slate-900 text-[10px] font-medium border-r border-slate-100">{item.budget_plant_hours}</td>
                                            <td className="px-1 py-2 text-center text-slate-900 text-[10px] font-medium border-r border-slate-100">{item.budget_field_hours}</td>
                                            <td className="px-1 py-2 text-center text-slate-900 text-[10px] font-medium border-r border-slate-100 relative">
                                              <input
                                                type="number"
                                                value={item.actual_plant_hours !== null && item.actual_plant_hours !== undefined ? item.actual_plant_hours : ''}
                                                onChange={(e) => handleFieldUpdate(item.id, 'actual_plant_hours', e.target.value)}
                                                className="w-full text-[10px] p-1 border border-slate-200 rounded text-slate-700 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 bg-white"
                                                step="any"
                                              />
                                            </td>
                                            <td className="px-1 py-2 text-center text-slate-900 text-[10px] font-medium border-r border-slate-100 relative">
                                              <input
                                                type="number"
                                                value={item.actual_field_hours !== null && item.actual_field_hours !== undefined ? item.actual_field_hours : ''}
                                                onChange={(e) => handleFieldUpdate(item.id, 'actual_field_hours', e.target.value)}
                                                className="w-full text-[10px] p-1 border border-slate-200 rounded text-slate-700 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 bg-white"
                                                step="any"
                                              />
                                            </td>
                                            
                                            <td className="px-1 py-2 text-center text-slate-900 text-[10px] font-medium border-r border-slate-100 whitespace-nowrap">{getOutlookCompletionDate(item.rts_date, item.plant_lead_time_weeks)}</td>
                                            <td className="px-1 py-2 text-center text-slate-600 italic text-[10px] truncate" title={item.notes}>{item.notes || '-'}</td>
                                          </tr>
                                        );
                                      })
                                    ) : (
                                      <tr>
                                        <td colSpan="19" className="px-6 py-12 text-center text-slate-400">
                                          No tracking sequences found matching search or project.
                                        </td>
                                      </tr>
                                    )}
                                  </tbody>
                                </table>
                              </div>

                              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/40">
                                <div className="mb-4">
                                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-[0.2em]">Project Gantt Chart</h4>
                                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Visual schedule tracker & sequence status timeline</p>
                                </div>
                                <TrackingGanttChart project={proj} allSchedules={allSchedules} />
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
