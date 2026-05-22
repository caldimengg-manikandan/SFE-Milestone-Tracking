import { useState, useEffect, Fragment } from 'react';
import {
  Users, FolderKanban, BarChart3, TrendingUp, ArrowUpRight, ArrowDownRight,
  Clock, CheckCircle2, AlertTriangle, Box, Loader2
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell
} from 'recharts';
import { dashboardAPI } from '../../services/api';

/* ── Configs ── */
const statConfigs = {
  'Total Projects': { icon: FolderKanban, iconBg: 'bg-amber-100', color: 'text-amber-600' },
  'In Progress': { icon: Box, iconBg: 'bg-blue-100', color: 'text-blue-600' },
  'Yet to Complete': { icon: Clock, iconBg: 'bg-orange-100', color: 'text-orange-600' },
  'Completed': { icon: CheckCircle2, iconBg: 'bg-emerald-100', color: 'text-emerald-600' },
};

const announcements = [
  { id: 1, title: 'Safety audit scheduled for May 15', priority: 'high' },
  { id: 2, title: 'Quarterly production targets updated', priority: 'medium' },
  { id: 3, title: 'Server maintenance — May 10, 2AM', priority: 'low' },
];

export default function Dashboard() {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [fromMonth, setFromMonth] = useState(0);
  const [toMonth, setToMonth] = useState(11);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    stats: [],
    areaData: [],
    pieData: [],
    barData: [],
    recentActivities: []
  });
  const [error, setError] = useState('');
  const [expandedTaskId, setExpandedTaskId] = useState(null);

  const toggleExpand = (id) => {
    setExpandedTaskId(expandedTaskId === id ? null : id);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '-';
    const d = date.getDate().toString().padStart(2, '0');
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const y = date.getFullYear();
    return `${d}-${m}-${y}`;
  };

  const getWeekPositions = (startDateStr, endDateStr, startMonth, duration, yearVal, fromM, toM) => {
    let startDate, endDate;
    if (startDateStr && endDateStr) {
      startDate = new Date(startDateStr);
      endDate = new Date(endDateStr);
    } else {
      startDate = new Date(parseInt(yearVal), startMonth, 1);
      endDate = new Date(parseInt(yearVal), startMonth + duration, 0);
    }

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return null;

    const gridStart = new Date(parseInt(yearVal), fromM, 1);
    const gridEnd = new Date(parseInt(yearVal), toM + 1, 0, 23, 59, 59, 999);

    if (endDate < gridStart || startDate > gridEnd) return null;

    const effStart = startDate < gridStart ? gridStart : startDate;
    const effEnd = endDate > gridEnd ? gridEnd : endDate;

    const getFractionalCol = (date) => {
      const m = date.getMonth();
      const d = date.getDate();
      const y = date.getFullYear();

      const monthOffset = m - fromM;
      const totalDaysInMonth = new Date(y, m + 1, 0).getDate();

      let weekPart = 0;
      if (d <= 7) {
        weekPart = (d - 1) / 7;
      } else if (d <= 14) {
        weekPart = 1 + (d - 8) / 7;
      } else if (d <= 21) {
        weekPart = 2 + (d - 15) / 7;
      } else {
        const daysInW4 = totalDaysInMonth - 21;
        weekPart = 3 + (d - 22) / daysInW4;
      }

      return monthOffset * 4 + weekPart;
    };

    const startCol = getFractionalCol(effStart);
    const effEndPlusOne = new Date(effEnd.getTime() + 24 * 60 * 60 * 1000);
    const endCol = getFractionalCol(effEndPlusOne);

    const totalWeeks = (toM - fromM + 1) * 4;
    const clampedStartCol = Math.max(0, Math.min(totalWeeks, startCol));
    const clampedEndCol = Math.max(0, Math.min(totalWeeks, endCol));

    if (clampedStartCol >= clampedEndCol) return null;

    return {
      startCol: clampedStartCol,
      endCol: clampedEndCol
    };
  };

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const response = await dashboardAPI.getStats({ year: selectedYear });
        setData(response.data);
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
        setError(error.response?.data?.detail || 'Failed to connect to the server');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [selectedYear]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Row */}
      {error && (
        <div className="bg-red-50 border border-red-100 p-4 rounded-lg text-red-600 text-xs font-bold animate-shake">
          {error}
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {data.stats.map((s, i) => {
          const config = statConfigs[s.label] || { icon: FolderKanban, iconBg: 'bg-slate-100', color: 'text-slate-600' };
          const Icon = config.icon;
          return (
            <div key={i} className="bg-white border border-slate-300 p-6 transition-all duration-300 hover:shadow-xl hover:border-amber-400 group">
              <div className="flex items-start justify-between">
                <div className={`w-12 h-12 ${config.iconBg} flex items-center justify-center ${config.color} shadow-inner group-hover:bg-amber-500 group-hover:text-white transition-all`}>
                  <Icon className="w-6 h-6" />
                </div>
                <span className={`inline-flex items-center gap-0.5 text-[10px] font-black uppercase tracking-widest ${s.up ? 'text-emerald-600' : 'text-red-500'}`}>
                  {s.up ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                  {s.change}
                </span>
              </div>
              <div className="mt-5">
                <p className="text-3xl font-black text-slate-900 leading-none tracking-tighter">{s.value}</p>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mt-2">{s.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gantt Chart — Production Throughput */}
        <div className="lg:col-span-3 bg-white border border-slate-300 overflow-hidden">
          <div className="p-8 border-bottom border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.25em]">Milestone Management</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Gantt Chart • Project Timelines & Schedules</p>
            </div>
            <div className="flex items-center gap-4">

              <select
                value={fromMonth}
                onChange={(e) => setFromMonth(parseInt(e.target.value))}
                className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter border border-slate-300 px-2 py-1 outline-none bg-white cursor-pointer"
              >
                {['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'].map((m, i) => (
                  <option key={i} value={i} disabled={i > toMonth}>{m}</option>
                ))}
              </select>
              <select
                value={toMonth}
                onChange={(e) => setToMonth(parseInt(e.target.value))}
                className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter border border-slate-300 px-2 py-1 outline-none bg-white cursor-pointer"
              >
                {['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'].map((m, i) => (
                  <option key={i} value={i} disabled={i < fromMonth}>{m}</option>
                ))}
              </select>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter border border-slate-300 px-2 py-1 outline-none bg-white cursor-pointer"
              >
                {[...Array(5)].map((_, i) => {
                  const year = new Date().getFullYear() - 2 + i;
                  return <option key={year} value={year}>{year}</option>;
                })}
              </select>
              <BarChart3 className="w-5 h-5 text-slate-300" />
            </div>
          </div>

          <div className="overflow-x-auto xl:overflow-x-hidden scrollbar-thin xl:scrollbar-none">
            <div
              className="gantt-grid"
              style={{
                gridTemplateColumns: `160px repeat(${(toMonth - fromMonth + 1) * 4}, 1fr)`
              }}
            >
              {/* Header Row: Months */}
              <div
                className="gantt-header-cell gantt-pink-header flex flex-col justify-center font-bold text-slate-700"
                style={{ gridRow: 'span 2', padding: '6px 8px' }}
              >
                <span>Schedule / Project</span>
              </div>

              {data.ganttData?.months?.slice(fromMonth, toMonth + 1).map((m, i) => (
                <div
                  key={fromMonth + i}
                  className="gantt-header-cell text-center font-bold text-slate-700"
                  style={{ gridColumn: 'span 4', padding: '6px 0' }}
                >
                  {m}
                </div>
              ))}

              {/* Header Row: Weeks */}
              {Array.from({ length: toMonth - fromMonth + 1 }).map((_, mIdx) => (
                <Fragment key={mIdx}>
                  <div className="gantt-header-cell text-center text-[8px] font-extrabold border-t border-slate-200 bg-slate-50/80" style={{ padding: '4px 0' }}>W1</div>
                  <div className="gantt-header-cell text-center text-[8px] font-extrabold border-t border-slate-200 bg-slate-50/80" style={{ padding: '4px 0' }}>W2</div>
                  <div className="gantt-header-cell text-center text-[8px] font-extrabold border-t border-slate-200 bg-slate-50/80" style={{ padding: '4px 0' }}>W3</div>
                  <div className="gantt-header-cell text-center text-[8px] font-extrabold border-t border-slate-200 bg-slate-50/80" style={{ padding: '4px 0' }}>W4</div>
                </Fragment>
              ))}

              {/* Task Rows */}
              {data.ganttData?.tasks && data.ganttData.tasks.length > 0 ? (
                data.ganttData.tasks.map((task, idx) => {
                  const totalWeeks = (toMonth - fromMonth + 1) * 4;
                  const barPosition = getWeekPositions(
                    task.startDate,
                    task.endDate,
                    task.startMonth,
                    task.duration,
                    selectedYear,
                    fromMonth,
                    toMonth
                  );

                  return (
                    <div key={idx} className="contents">
                      <div
                        className={`gantt-row cursor-pointer transition-colors hover:bg-slate-50/50 ${expandedTaskId === task.id ? 'bg-slate-50' : ''}`}
                        onClick={() => toggleExpand(task.id)}
                      >
                        <div className="gantt-label-cell flex items-center gap-2">
                          <div className={`w-1.5 h-full absolute left-0 top-0 transition-colors ${expandedTaskId === task.id ? 'bg-amber-500' : 'bg-transparent'}`} />
                          <div className="flex flex-col">
                            <span className="truncate max-w-[160px] font-bold text-slate-800">{task.name}</span>
                          </div>
                        </div>
                        {/* Grid Cells */}
                        {Array.from({ length: totalWeeks }).map((_, colIdx) => {
                          const isFirstVisibleWeek = barPosition && colIdx === Math.floor(barPosition.startCol);

                          return (
                            <div
                              key={colIdx}
                              className="gantt-cell"
                              style={isFirstVisibleWeek && barPosition ? { zIndex: 12 } : undefined}
                            >
                              {/* Task Bar */}
                              {isFirstVisibleWeek && barPosition && (
                                <div
                                  className="gantt-bar shadow-sm"
                                  title={`${task.name} (${formatDate(task.startDate || new Date(parseInt(selectedYear), task.startMonth, 1))} - ${formatDate(task.endDate || new Date(parseInt(selectedYear), task.startMonth + task.duration, 0))})`}
                                  style={{
                                    left: `${(barPosition.startCol - Math.floor(barPosition.startCol)) * 100}%`,
                                    width: `calc(${barPosition.endCol - barPosition.startCol} * 100% + ${Math.floor(barPosition.endCol) - Math.floor(barPosition.startCol)}px)`,
                                    backgroundColor: task.color + '20',
                                    borderLeft: `4px solid ${task.color}`,
                                    borderRight: `4px solid ${task.color}`,
                                    color: task.color,
                                    fontWeight: 800
                                  }}
                                >
                                  {task.name}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Expanded Sub-Tasks */}
                      {expandedTaskId === task.id && task.items && task.items.length > 0 && task.items.map((item, iIdx) => {
                        const subBarPosition = item.start_date && item.end_date
                          ? getWeekPositions(item.start_date, item.end_date, 0, 1, selectedYear, fromMonth, toMonth)
                          : item.ofa_date && (item.erection_date || item.rts_date)
                          ? getWeekPositions(item.ofa_date, item.erection_date || item.rts_date, 0, 1, selectedYear, fromMonth, toMonth)
                          : null;

                        return (
                          <div key={`sub-${task.id}-${iIdx}`} className="gantt-row">
                            <div className="gantt-label-cell flex items-center bg-slate-50 relative">
                              {/* Indentation line */}
                              <div className="absolute left-4 top-0 bottom-0 w-px bg-slate-300"></div>
                              {/* Horizontal connector */}
                              <div className="absolute left-4 top-1/2 w-3 h-px bg-slate-300"></div>
                              <div className="flex flex-col ml-8">
                                <span className="truncate max-w-[100px] font-bold text-slate-600 text-[11px]">{item.job_number}</span>
                                <span className="text-[8px] uppercase tracking-tighter text-slate-400 mt-0.5">Seq: {item.sequence_number}</span>
                              </div>
                            </div>
                            {/* Sub-task Grid Cells */}
                            {Array.from({ length: totalWeeks }).map((_, colIdx) => {
                              const isFirstVisibleWeek = subBarPosition && colIdx === Math.floor(subBarPosition.startCol);

                              return (
                                <div
                                  key={`sub-cell-${colIdx}`}
                                  className="gantt-cell bg-slate-50/50 border-dashed border-slate-200"
                                  style={isFirstVisibleWeek && subBarPosition ? { zIndex: 12 } : undefined}
                                >
                                  {/* Sub-task Bar */}
                                  {isFirstVisibleWeek && subBarPosition && (
                                    <div
                                      className="gantt-bar shadow-sm"
                                      title={item.start_date && item.end_date && item.shop_lead_time_weeks
                                        ? `${item.job_number} (Seq: ${item.sequence_number}) • RTS: ${formatDate(item.start_date)} • Exp. Completion: ${formatDate(item.end_date)}`
                                        : `${item.job_number} (Seq: ${item.sequence_number}) • OFA: ${formatDate(item.ofa_date)} • Erection/RTS: ${formatDate(item.erection_date || item.rts_date)}`
                                      }
                                      style={{
                                        left: `${(subBarPosition.startCol - Math.floor(subBarPosition.startCol)) * 100}%`,
                                        width: `calc(${subBarPosition.endCol - subBarPosition.startCol} * 100% + ${Math.floor(subBarPosition.endCol) - Math.floor(subBarPosition.startCol)}px)`,
                                        backgroundColor: task.color + '15',
                                        borderLeft: `3px solid ${task.color}`,
                                        borderRight: `3px solid ${task.color}`,
                                        color: task.color,
                                        fontSize: '0.65rem',
                                        fontWeight: 800
                                      }}
                                    >
                                      {item.job_number}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  );
                })
              ) : (
                <div className="flex flex-col items-center justify-center py-20 bg-slate-50/30" style={{ gridColumn: '1 / -1' }}>
                  <Clock className="w-8 h-8 text-slate-300 mb-3" />
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">No Active Projects Found</p>
                  <p className="text-[9px] text-slate-400 mt-1">Start adding projects to see the timeline</p>
                </div>
              )}
            </div>
          </div>

          <div className="p-4 bg-slate-50/50 border-t border-slate-200 flex justify-end">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">© Steel Fab Enterprises • Production Intelligence Unit</p>
          </div>
        </div>
      </div>

      {/* Activities Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bar Chart */}
        <div className="lg:col-span-2 bg-white border border-slate-300 p-8">
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.25em] mb-1">Section Performance</h3>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-8">Completed vs Pending by Workcenter</p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data.barData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 9, fontWeight: 800, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fontWeight: 800, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 0, border: '1px solid #e2e8f0', fontSize: 10, fontWeight: 900 }} />
              <Bar dataKey="completed" fill="#1e293b" radius={0} />
              <Bar dataKey="pending" fill="#fbbf24" radius={0} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="space-y-6">
          {/* Recent Activity */}
          <div className="bg-white border border-slate-300 p-8">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.25em] mb-6">Operations Log</h3>
            <div className="space-y-5">
              {data.recentActivities.map((a) => (
                <div key={a.id} className="flex items-start gap-4">
                  <div className={`w-8 h-8 flex items-center justify-center shrink-0 mt-0.5 ${a.type === 'success' ? 'bg-emerald-50' : a.type === 'warning' ? 'bg-amber-50' : 'bg-slate-50'
                    }`}>
                    {a.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> :
                      a.type === 'warning' ? <AlertTriangle className="w-4 h-4 text-amber-600" /> :
                        <Clock className="w-4 h-4 text-slate-600" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-black text-slate-800 uppercase tracking-widest">{a.action}</p>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter mt-1">{a.project} · {a.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Announcements */}
          <div className="bg-white border border-slate-300 p-8">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.25em] mb-6">Internal Notices</h3>
            <div className="space-y-4">
              {announcements.map((a) => (
                <div key={a.id} className="flex items-start gap-3">
                  <div className={`w-1.5 h-1.5 mt-1.5 shrink-0 ${a.priority === 'high' ? 'bg-red-500' : a.priority === 'medium' ? 'bg-amber-500' : 'bg-slate-400'
                    }`} />
                  <p className="text-[10px] text-slate-600 font-bold uppercase tracking-wide leading-relaxed">{a.title}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
