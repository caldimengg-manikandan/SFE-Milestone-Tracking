import React, { useMemo, useState } from 'react';
import { Calendar } from 'lucide-react';
import './GanttChart.css';

/* ── helpers ────────────────────────────────────────────────── */

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

const fmt = (d) =>
  d
    ? d.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : 'N/A';

const getStatus = (planDateStr, actualDateStr) => {
  const plan = parseDate(planDateStr);
  if (!plan) return { label: 'TBD', color: '#9ca3af' };

  const actual = parseDate(actualDateStr);

  if (actual) {
    if (actual <= plan) {
      return { label: 'Completed', color: '#22c55e' }; // Green 500
    } else {
      return { label: 'Completed with delay', color: '#ef4444' }; // Red 500
    }
  }

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (today <= plan) {
    return { label: 'InProgress', color: '#3b82f6' }; // Blue 500
  } else {
    const diffTime = today.getTime() - plan.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays <= 7) {
      return { label: 'Likely delay', color: '#eab308' }; // Yellow/Amber 500
    } else {
      return { label: 'Delayed', color: '#ef4444' }; // Red 500
    }
  }
};

const calculateMilestones = (erectionDate, isFMRequired) => {
  if (!erectionDate) return {};
  const base = new Date(erectionDate);

  const rts = new Date(base);
  rts.setMonth(rts.getMonth() - 2);

  if (isFMRequired) {
    const fm = new Date(rts);
    fm.setDate(fm.getDate() - 14);
    const bfa = new Date(fm);
    bfa.setDate(bfa.getDate() - 14);
    const ofa = new Date(bfa);
    ofa.setDate(ofa.getDate() - 14);
    return { ofa, bfa, fm, rts };
  } else {
    const bfa = new Date(rts);
    bfa.setDate(bfa.getDate() - 14);
    const ofa = new Date(bfa);
    ofa.setDate(ofa.getDate() - 14);
    return { ofa, bfa, fm: null, rts };
  }
};

const ONE_DAY = 86400000;

/* ── component ──────────────────────────────────────────────── */

export default function TrackingGanttChart({ project, allSchedules }) {
  /* filter + sort schedules for this project */
  const sorted = useMemo(() => {
    const rows = allSchedules.filter((s) => {
      const sId = typeof s.project === 'object' ? s.project.id : s.project;
      return String(sId) === String(project.id);
    });
    return rows.sort((a, b) => {
      const an = parseFloat(a.seq_no);
      const bn = parseFloat(b.seq_no);
      if (!isNaN(an) && !isNaN(bn)) return an - bn;
      return String(a.seq_no).localeCompare(String(b.seq_no), undefined, {
        numeric: true,
      });
    });
  }, [allSchedules, project.id]);

  const isFMRequired = (project?.schedule_field_measure_required || 'Yes').trim().toLowerCase() !== 'no';
  const awardedDate = project?.awarded_job_no_date ? parseDate(project.awarded_job_no_date) : null;

  /* ── 1. Calculate full timeline range covering both planning and tracking dates ── */
  const fullRange = useMemo(() => {
    let earliest = null;
    let latest = null;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    sorted.forEach((s) => {
      const dates = [
        parseDate(s.scheduled_ofa_date),
        parseDate(s.actual_ofa_date),
        parseDate(s.scheduled_bfa_date),
        parseDate(s.actual_bfa_date),
        parseDate(s.scheduled_field_measure_date),
        parseDate(s.rts_date),
        parseDate(s.actual_rts_date),
        parseDate(s.scheduled_erection_date),
      ].filter(Boolean);

      if (dates.length > 0) {
        const minDate = new Date(Math.min(...dates.map((d) => d.getTime())));
        const maxDate = new Date(Math.max(...dates.map((d) => d.getTime())));
        if (!earliest || minDate < earliest) earliest = minDate;
        if (!latest || maxDate > latest) latest = maxDate;
      }
    });

    if (!earliest) earliest = new Date();
    if (!latest || latest <= earliest) latest = new Date(earliest.getTime() + 90 * ONE_DAY);

    const timelineStart = new Date(earliest.getFullYear(), earliest.getMonth(), 1);
    const timelineEnd = new Date(latest.getFullYear(), latest.getMonth() + 1, 1);

    return { timelineStart, timelineEnd };
  }, [sorted]);

  /* ── 2. Available months list ── */
  const availableMonths = useMemo(() => {
    const list = [];
    let cursor = new Date(fullRange.timelineStart);
    while (cursor < fullRange.timelineEnd) {
      const year = cursor.getFullYear();
      const month = cursor.getMonth();
      const label = cursor.toLocaleString('default', { month: 'short', year: 'numeric' });
      const value = `${year}-${String(month + 1).padStart(2, '0')}`;
      list.push({ label, value, year, month });
      cursor = new Date(year, month + 1, 1);
    }
    return list;
  }, [fullRange]);

  const [selectedMonth, setSelectedMonth] = useState('all');

  /* ── 4. Filter sequences and timeline based on selectedMonth ── */
  const { filteredSchedules, timelineStart, timelineEnd } = useMemo(() => {
    if (selectedMonth === 'all') {
      return {
        filteredSchedules: sorted,
        timelineStart: fullRange.timelineStart,
        timelineEnd: fullRange.timelineEnd,
      };
    }

    const [yStr, mStr] = selectedMonth.split('-');
    const selYear = parseInt(yStr, 10);
    const selMonth = parseInt(mStr, 10) - 1;

    const startOfMonth = new Date(selYear, selMonth, 1);
    const endOfMonth = new Date(selYear, selMonth + 1, 1);

    const filtered = sorted.filter((s) => {
      const planOfa = parseDate(s.scheduled_ofa_date);
      const planErection = parseDate(s.scheduled_erection_date);
      const planStart = planOfa || planErection;
      const planEnd = planErection;

      const actualRts = parseDate(s.actual_rts_date);
      const rtsDate = parseDate(s.rts_date);
      const trackStart = planOfa;
      const today = new Date();
      const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const trackEnd = actualRts || (rtsDate && todayOnly > rtsDate ? todayOnly : rtsDate);

      const planOverlap = planStart && planEnd && (planStart.getTime() < endOfMonth.getTime() && planEnd.getTime() + ONE_DAY > startOfMonth.getTime());
      const trackOverlap = trackStart && trackEnd && (trackStart.getTime() < endOfMonth.getTime() && trackEnd.getTime() + ONE_DAY > startOfMonth.getTime());

      return planOverlap || trackOverlap;
    });

    return {
      filteredSchedules: filtered,
      timelineStart: startOfMonth,
      timelineEnd: endOfMonth,
    };
  }, [selectedMonth, sorted, fullRange]);

  const timelineMs = timelineEnd.getTime() - timelineStart.getTime() !== 0 ? timelineEnd.getTime() - timelineStart.getTime() : 1;

  /* ── month columns ── */
  const months = useMemo(() => {
    const list = [];
    let cursor = new Date(timelineStart.getFullYear(), timelineStart.getMonth(), 1);
    while (cursor < timelineEnd) {
      const monthStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
      const nextMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);

      const segmentStart = new Date(Math.max(monthStart.getTime(), timelineStart.getTime()));
      const segmentEnd = new Date(Math.min(nextMonth.getTime(), timelineEnd.getTime()));

      if (segmentStart < segmentEnd) {
        const leftPct = ((segmentStart.getTime() - timelineStart.getTime()) / timelineMs) * 100;
        const widthPct = ((segmentEnd.getTime() - segmentStart.getTime()) / timelineMs) * 100;

        list.push({
          label: monthStart.toLocaleString('default', {
            month: 'short',
            year: 'numeric',
          }),
          leftPct,
          widthPct,
        });
      }
      cursor = nextMonth;
    }
    return list;
  }, [timelineStart, timelineEnd, timelineMs]);

  const getDatePct = (d) => {
    if (!d || d < timelineStart || d > timelineEnd) return null;
    return ((d - timelineStart) / timelineMs) * 100;
  };

  /* ── planning bar data ── */
  const planningBars = useMemo(() => {
    return filteredSchedules.map((sched) => {
      const erection = parseDate(sched.scheduled_erection_date) || parseDate(project?.erection_date);
      const milestones = calculateMilestones(erection, isFMRequired);

      const ofa = parseDate(sched.scheduled_ofa_date) || milestones.ofa;
      const rtsDate = parseDate(sched.rts_date) || milestones.rts;
      
      const start = ofa || rtsDate || erection;
      const end = erection;

      if (!start && !end) return null;

      const barStart = start || end;
      const barEnd = end
        ? new Date(end.getFullYear(), end.getMonth(), end.getDate() + 1)
        : new Date(barStart.getFullYear(), barStart.getMonth(), barStart.getDate() + 1);

      const visibleStart = new Date(Math.max(barStart.getTime(), timelineStart.getTime()));
      const visibleEnd = new Date(Math.min(barEnd.getTime(), timelineEnd.getTime()));

      if (visibleStart >= visibleEnd) return null;

      const leftPct = ((visibleStart - timelineStart) / timelineMs) * 100;
      const widthPct = ((visibleEnd - visibleStart) / timelineMs) * 100;

      const barMilestones = {
        ofa: parseDate(sched.scheduled_ofa_date) || milestones.ofa,
        bfa: parseDate(sched.scheduled_bfa_date) || milestones.bfa,
        fm: parseDate(sched.scheduled_field_measure_date) || milestones.fm,
        rts: parseDate(sched.rts_date) || milestones.rts,
      };

      return { sched, start: barStart, end, leftPct, widthPct, milestones: barMilestones, erection };
    }).filter(Boolean);
  }, [filteredSchedules, timelineStart, timelineEnd, timelineMs, isFMRequired, project?.erection_date]);

  /* ── tracking bar data ── */
  const trackingBars = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    return filteredSchedules.map((sched) => {
      const rtsDate = parseDate(sched.rts_date);
      const ofaDate = parseDate(sched.scheduled_ofa_date);
      const erectionDate = parseDate(sched.scheduled_erection_date);
      const actualOfa = parseDate(sched.actual_ofa_date);

      const start = actualOfa || ofaDate || rtsDate;
      const actualRts = parseDate(sched.actual_rts_date);
      const end = erectionDate || actualRts || (rtsDate && today > rtsDate ? today : rtsDate);

      if (!start || !end) return null;

      const barStart = start;
      const barEnd = new Date(end.getFullYear(), end.getMonth(), end.getDate() + 1);

      const visibleStart = new Date(Math.max(barStart.getTime(), timelineStart.getTime()));
      const visibleEnd = new Date(Math.min(barEnd.getTime(), timelineEnd.getTime()));

      if (visibleStart >= visibleEnd) return null;

      const leftPct = ((visibleStart - timelineStart) / timelineMs) * 100;
      const widthPct = ((visibleEnd - visibleStart) / timelineMs) * 100;
      const { label, color } = getStatus(sched.rts_date, sched.actual_rts_date);

      // Removed FM (Field Measure) milestone dot to resolve double dot issues on Actual track bar
      const milestones = [
        { key: 'ofa', label: 'OFA', plan: sched.scheduled_ofa_date, actual: sched.actual_ofa_date },
        { key: 'bfa', label: 'BFA', plan: sched.scheduled_bfa_date, actual: sched.actual_bfa_date },
        { key: 'rts', label: 'RTS', plan: sched.rts_date, actual: sched.actual_rts_date },
      ];

      return { sched, start: barStart, end, leftPct, widthPct, label, color, milestones, erection: erectionDate };
    }).filter(Boolean);
  }, [filteredSchedules, timelineStart, timelineEnd, timelineMs]);

  const planningMilestoneTypes = [
    { key: 'ofa', label: 'Sch OFA', color: '#a855f7' },
    { key: 'bfa', label: 'Sch BFA', color: '#06b6d4' },
    { key: 'rts', label: 'RTS', color: '#1e293b' },
  ];

  if (sorted.length === 0) {
    return (
      <div className="p-4 text-sm text-gray-500">
        No schedule data found.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header Info & Month Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200 rounded-lg p-3 shadow-sm">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Filter by Month:</span>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="text-xs font-bold text-slate-600 bg-white border border-slate-300 rounded-md px-2.5 py-1.5 outline-none cursor-pointer hover:border-slate-400 focus:border-amber-500 transition-colors"
          >
            <option value="all">All Months</option>
            {availableMonths.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">
          {project.name} • {filteredSchedules.length} Sequences Shown
        </div>
      </div>

      <div className="gantt-wrapper">
        {/* ── header row: label gutters + month columns ── */}
        <div className="gantt-header">
          <div className="gantt-seq-col">Seq #</div>
          <div className="gantt-desc-col">Item Description</div>
          <div className="gantt-timeline-col">
            {months.map((m, i) => (
              <div
                key={i}
                className="gantt-month-header"
                style={{ left: `${m.leftPct}%`, width: `${m.widthPct}%` }}
              >
                {m.label}
              </div>
            ))}
          </div>
        </div>

        {/* ── body rows (Planning & Tracking paired together) ── */}
        {filteredSchedules.map((sched, idx) => {
          const planBar = planningBars.find((b) => b.sched.id === sched.id);
          const trackBar = trackingBars.find((b) => b.sched.id === sched.id);

          return (
            <React.Fragment key={sched.id || idx}>
              {/* 1. Planning Row */}
              {planBar && (
                <div className="gantt-row bg-slate-50/40">
                  <div className="gantt-seq-col font-medium text-slate-400">{sched.seq_no}</div>
                  <div className="gantt-desc-col font-medium text-slate-400 flex items-center justify-between gap-1.5" title={`${sched.item_description} (Plan)`}>
                    <span className="truncate">{sched.item_description || '-'}</span>
                    <span className="flex-shrink-0 px-1 py-0.5 text-[7px] font-black uppercase tracking-wider bg-slate-200/80 text-slate-500 rounded border border-slate-300/60 leading-none">Plan</span>
                  </div>
                  <div className="gantt-timeline-col gantt-track bg-slate-50/10">
                    {months.map((m, i) => (
                      <div
                        key={i}
                        className="gantt-grid-line"
                        style={{ left: `${m.leftPct + m.widthPct}%` }}
                      />
                    ))}

                    {/* Planning Bar Segments (Indigo, starting at Sch OFA) */}
                    {(() => {
                      const ofaDate = parseDate(sched.scheduled_ofa_date);
                      const bfaDate = parseDate(sched.scheduled_bfa_date);
                      const rtsDate = parseDate(sched.rts_date);
                      const erectionDate = parseDate(sched.scheduled_erection_date);

                      const segments = [];

                      if (ofaDate && bfaDate) {
                        segments.push({
                          label: 'OFA to BFA',
                          start: ofaDate,
                          end: bfaDate,
                        });
                      }

                      if (bfaDate && rtsDate) {
                        segments.push({
                          label: 'BFA to RTS',
                          start: bfaDate,
                          end: rtsDate,
                        });
                      }

                      if (rtsDate && erectionDate) {
                        segments.push({
                          label: 'RTS to Erection',
                          start: rtsDate,
                          end: erectionDate,
                        });
                      }

                      return segments.map((seg, sIdx) => {
                        const visibleStart = new Date(Math.max(seg.start.getTime(), timelineStart.getTime()));
                        const visibleEnd = new Date(Math.min(seg.end.getTime(), timelineEnd.getTime()));

                        if (visibleStart >= visibleEnd) return null;

                        const leftPct = ((visibleStart - timelineStart) / timelineMs) * 100;
                        const widthPct = ((visibleEnd - visibleStart) / timelineMs) * 100;

                        return (
                          <div
                            key={sIdx}
                            className="gantt-bar-fill"
                            style={{
                              left: `${leftPct}%`,
                              width: `${Math.max(widthPct, 0.5)}%`,
                              backgroundColor: '#6366f1',
                            }}
                            title={`Seq ${sched.seq_no} (Plan) – ${seg.label}\nStart: ${fmt(seg.start)}\nEnd: ${fmt(seg.end)}`}
                          />
                        );
                      });
                    })()}

                    {planningMilestoneTypes.map((m) => {
                      const dateVal = planBar.milestones[m.key];
                      const pct = getDatePct(dateVal);
                      if (pct === null) return null;
                      return (
                        <React.Fragment key={m.key}>
                          <div
                            className="absolute z-10 w-3 h-3 rounded-full border-2 border-white shadow-md -translate-x-1/2 -translate-y-1/2 cursor-pointer hover:scale-125 transition-transform"
                            style={{
                              left: `${pct}%`,
                              top: '50%',
                              backgroundColor: m.color,
                            }}
                            title={`Plan ${m.label}: ${fmt(dateVal)}`}
                          />
                          <span
                            className="absolute z-10 text-[9px] font-extrabold text-white whitespace-nowrap pointer-events-none -translate-y-[60%]"
                            style={{
                              left: `${pct}%`,
                              top: '50%',
                              marginLeft: '8px',
                              textShadow: '0 1px 2px rgba(0,0,0,0.6)',
                            }}
                          >
                            {m.label}: {fmt(dateVal)}
                          </span>
                        </React.Fragment>
                      );
                    })}

                    {(() => {
                      const pct = getDatePct(planBar.erection);
                      if (pct === null) return null;
                      return (
                        <React.Fragment>
                          <div
                            className="absolute z-20 -translate-x-1/2 -translate-y-[65%] cursor-pointer hover:scale-125 transition-transform"
                            style={{
                              left: `${pct}%`,
                              top: '50%',
                              fontSize: '12px',
                            }}
                            title={`Sch Erection: ${fmt(planBar.erection)}`}
                          >
                            🚩
                          </div>
                          <span
                            className="absolute z-20 text-[9px] font-extrabold text-white whitespace-nowrap pointer-events-none -translate-y-[60%]"
                            style={{
                              left: `${pct}%`,
                              top: '50%',
                              marginLeft: '8px',
                              textShadow: '0 1px 2px rgba(0,0,0,0.6)',
                            }}
                          >
                            Erection: {fmt(planBar.erection)}
                          </span>
                        </React.Fragment>
                      );
                    })()}
                  </div>
                </div>
              )}

              {/* 2. Tracking Row */}
              {trackBar && (() => {
                const rtsDate = parseDate(sched.rts_date);
                const ofaDate = parseDate(sched.scheduled_ofa_date);
                const bfaDate = parseDate(sched.scheduled_bfa_date);
                const erectionDate = parseDate(sched.scheduled_erection_date);

                const actualOfa = parseDate(sched.actual_ofa_date);
                const actualBfa = parseDate(sched.actual_bfa_date);
                const actualRts = parseDate(sched.actual_rts_date);

                const start = actualOfa || ofaDate || rtsDate;
                const segments = [];

                if (start) {
                  // Collect milestones and their resolved dates
                  const milList = [
                    { label: 'OFA', date: actualOfa || ofaDate, status: getStatus(sched.scheduled_ofa_date, sched.actual_ofa_date) },
                    { label: 'BFA', date: actualBfa || bfaDate, status: getStatus(sched.scheduled_bfa_date, sched.actual_bfa_date) },
                    { label: 'RTS', date: actualRts || rtsDate, status: getStatus(sched.rts_date, sched.actual_rts_date) },
                    { label: 'Erection', date: erectionDate, status: getStatus(sched.scheduled_erection_date, null) },
                  ].filter(m => m.date);

                  // Sort ascending by date
                  milList.sort((a, b) => a.date - b.date);

                  let currentStart = start;
                  let lastMilestone = milList.length > 0 ? milList[0] : null;

                  milList.forEach((m) => {
                    if (m.date > currentStart) {
                      segments.push({
                        label: m.label,
                        start: currentStart,
                        end: m.date,
                        color: lastMilestone ? lastMilestone.status.color : m.status.color,
                        statusLabel: lastMilestone ? lastMilestone.status.label : m.status.label,
                      });
                      currentStart = m.date;
                    }
                    lastMilestone = m;
                  });
                }

                return (
                  <div className="gantt-row border-b border-slate-200">
                    <div className="gantt-seq-col font-semibold text-slate-800">{sched.seq_no}</div>
                    <div className="gantt-desc-col font-semibold text-slate-800 flex items-center justify-between gap-1.5" title={`${sched.item_description} (Track)`}>
                      <span className="truncate">{sched.item_description || '-'}</span>
                      <span className="flex-shrink-0 px-1 py-0.5 text-[7px] font-black uppercase tracking-wider bg-amber-100/80 text-amber-700 rounded border border-amber-200/60 leading-none">Track</span>
                    </div>
                    <div className="gantt-timeline-col gantt-track">
                      {months.map((m, i) => (
                        <div
                          key={i}
                          className="gantt-grid-line"
                          style={{ left: `${m.leftPct + m.widthPct}%` }}
                        />
                      ))}

                      {/* Render Segments */}
                      {segments.map((seg, sIdx) => {
                        const visibleStart = new Date(Math.max(seg.start.getTime(), timelineStart.getTime()));
                        const visibleEnd = new Date(Math.min(seg.end.getTime(), timelineEnd.getTime()));

                        if (visibleStart >= visibleEnd) return null;

                        const leftPct = ((visibleStart - timelineStart) / timelineMs) * 100;
                        const widthPct = ((visibleEnd - visibleStart) / timelineMs) * 100;

                        return (
                          <div
                            key={sIdx}
                            className="gantt-bar-fill"
                            style={{
                              left: `${leftPct}%`,
                              width: `${Math.max(widthPct, 0.5)}%`,
                              backgroundColor: seg.color,
                            }}
                            title={`Seq ${sched.seq_no} (Track) – ${seg.label}\nStart: ${fmt(seg.start)}\nEnd: ${fmt(seg.end)}\nStatus: ${seg.statusLabel}`}
                          />
                        );
                      })}

                      {/* Dynamic status milestone dots */}
                      {trackBar.milestones.map((m) => {
                        const dateVal = m.actual ? parseDate(m.actual) : parseDate(m.plan);
                        const pct = getDatePct(dateVal);
                        if (pct === null) return null;
                        const status = getStatus(m.plan, m.actual);
                        return (
                          <React.Fragment key={m.key}>
                            <div
                              className="absolute z-10 w-3 h-3 rounded-full border-2 border-white shadow-md -translate-x-1/2 -translate-y-1/2 cursor-pointer hover:scale-125 transition-transform"
                              style={{
                                left: `${pct}%`,
                                top: '50%',
                                backgroundColor: status.color,
                              }}
                              title={`Actual ${m.label}\nPlan: ${fmt(parseDate(m.plan))}\nActual: ${fmt(parseDate(m.actual))}\nStatus: ${status.label}`}
                            />
                            <span
                              className="absolute z-10 text-[9px] font-extrabold text-white whitespace-nowrap pointer-events-none -translate-y-[60%]"
                              style={{
                                left: `${pct}%`,
                                top: '50%',
                                marginLeft: '8px',
                                textShadow: '0 1px 2px rgba(0,0,0,0.6)',
                              }}
                            >
                              {m.label}: {fmt(dateVal)}
                            </span>
                          </React.Fragment>
                        );
                      })}

                      {(() => {
                        const pct = getDatePct(trackBar.erection);
                        if (pct === null) return null;
                        return (
                          <React.Fragment>
                            <div
                              className="absolute z-20 -translate-x-1/2 -translate-y-[65%] cursor-pointer hover:scale-125 transition-transform"
                              style={{
                                left: `${pct}%`,
                                top: '50%',
                                fontSize: '12px',
                              }}
                              title={`Sch Erection: ${fmt(trackBar.erection)}`}
                            >
                              🚩
                            </div>
                            <span
                              className="absolute z-20 text-[9px] font-extrabold text-white whitespace-nowrap pointer-events-none -translate-y-[60%]"
                              style={{
                                left: `${pct}%`,
                                top: '50%',
                                marginLeft: '8px',
                                textShadow: '0 1px 2px rgba(0,0,0,0.6)',
                              }}
                            >
                              Erection: {fmt(trackBar.erection)}
                            </span>
                          </React.Fragment>
                        );
                      })()}
                    </div>
                  </div>
                );
              })()}
            </React.Fragment>
          );
        })}

        {/* ── Combined Legend ── */}
        <div className="flex flex-col gap-3 p-4 bg-slate-50 border-t border-slate-200 text-[10px] font-bold text-slate-500">
          <div className="flex flex-wrap gap-4 items-center justify-start border-b border-slate-200/60 pb-2.5">
            <span className="uppercase tracking-widest text-[8px] text-slate-400">Target Schedule (Plan):</span>
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-2 rounded bg-[#6366f1] shadow-sm" />
              <span>Target Schedule Bar</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full border border-white bg-[#a855f7] shadow-sm" />
              <span>Sch OFA</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full border border-white bg-[#06b6d4] shadow-sm" />
              <span>Sch BFA</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full border border-white bg-[#1e293b] shadow-sm" />
              <span>RTS</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[12px] leading-none">🚩</span>
              <span>Sch Erection Date</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-2 items-center justify-start">
            <span className="uppercase tracking-widest text-[8px] text-slate-400">Actual Progress Status (Track):</span>
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-2 rounded bg-[#3b82f6] shadow-sm" />
              <span>InProgress / On Track</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-2 rounded bg-[#22c55e] shadow-sm" />
              <span>Completed (On-time)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-2 rounded bg-[#eab308] shadow-sm" />
              <span>Likely delay</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-2 rounded bg-[#ef4444] shadow-sm" />
              <span>Delayed / Completed with Delay</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
