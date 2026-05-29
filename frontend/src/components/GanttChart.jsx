import React, { useMemo, useState, useEffect } from 'react';
import { Calendar } from 'lucide-react';
import './GanttChart.css';

/* ── helpers ────────────────────────────────────────────────── */

const parseDate = (dStr) => {
  if (!dStr) return null;

  // Try parsing yyyy-mm-dd
  if (typeof dStr === 'string' && dStr.includes('-')) {
    const parts = dStr.split('-');
    if (parts.length === 3 && parts[0].length === 4) {
      const d = new Date(
        parseInt(parts[0], 10),
        parseInt(parts[1], 10) - 1,
        parseInt(parts[2], 10)
      );
      return isNaN(d.getTime()) ? null : d;
    }
  }

  // Try parsing dd/mm/yyyy
  if (typeof dStr === 'string' && dStr.includes('/')) {
    const parts = dStr.split('/');
    if (parts.length === 3) {
      const d = new Date(
        parseInt(parts[2], 10),
        parseInt(parts[1], 10) - 1,
        parseInt(parts[0], 10)
      );
      return isNaN(d.getTime()) ? null : d;
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

const getStatus = (start, end) => {
  if (!start || !end) return { label: 'TBD', color: '#9ca3af' };
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (end < today) return { label: 'Completed', color: '#22c55e' };
  if (start > today) return { label: 'Yet to Start', color: '#3b82f6' };
  return { label: 'In Progress', color: '#f59e0b' };
};

const ONE_DAY = 86400000;

/**
 * Recalculate milestone dates from erection date.
 * Same formula as calculateDates in PlanCreation.jsx.
 */
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

/* ── component ──────────────────────────────────────────────── */

export default function GanttChart({ project, allSchedules }) {
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

  // Is field measure required for this project?
  const isFMRequired = (project?.schedule_field_measure_required || 'Yes').trim().toLowerCase() !== 'no';

  // Awarded date (bar start)
  const awardedDate = project?.awarded_job_no_date ? parseDate(project.awarded_job_no_date) : null;

  /* ── 1. Calculate full timeline range based on all project sequences ── */
  const fullRange = useMemo(() => {
    let earliest = null;
    let latest = null;

    sorted.forEach(s => {
      const erection = parseDate(s.scheduled_erection_date) || parseDate(project?.erection_date);
      const milestones = calculateMilestones(erection, isFMRequired);
      const ship = parseDate(s.ship_date);
      const dates = [
        awardedDate,
        milestones.ofa,
        milestones.bfa,
        milestones.fm,
        milestones.rts,
        ship,
        erection,
      ].filter(Boolean);
      if (dates.length > 0) {
        const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
        const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
        if (!earliest || minDate < earliest) earliest = minDate;
        if (!latest || maxDate > latest) latest = maxDate;
      }
    });

    if (!earliest) earliest = new Date();
    if (!latest || latest <= earliest) latest = new Date(earliest.getTime() + 90 * ONE_DAY);

    const timelineStart = new Date(earliest.getFullYear(), earliest.getMonth(), 1);
    const timelineEnd = new Date(latest.getFullYear(), latest.getMonth() + 1, 1);

    return { timelineStart, timelineEnd };
  }, [sorted, project?.erection_date, awardedDate, isFMRequired]);

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

  /* ── 3. Default month calculation (prioritizes current month, then erection month, then first available) ── */
  const defaultMonthVal = useMemo(() => {
    const today = new Date();
    const currentVal = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    const hasCurrent = availableMonths.some(m => m.value === currentVal);
    if (hasCurrent) return currentVal;

    if (project?.erection_date) {
      const eDate = new Date(project.erection_date);
      const eVal = `${eDate.getFullYear()}-${String(eDate.getMonth() + 1).padStart(2, '0')}`;
      if (availableMonths.some(m => m.value === eVal)) return eVal;
    }

    if (availableMonths.length > 0) return availableMonths[0].value;
    return 'all';
  }, [availableMonths, project?.erection_date]);

  const [selectedMonth, setSelectedMonth] = useState(defaultMonthVal);

  useEffect(() => {
    setSelectedMonth(defaultMonthVal);
  }, [defaultMonthVal]);

  /* ── 4. Filter sequences and timeline based on selectedMonth ── */
  const { filteredSchedules, timelineStart, timelineEnd } = useMemo(() => {
    if (selectedMonth === 'all') {
      return {
        filteredSchedules: sorted,
        timelineStart: fullRange.timelineStart,
        timelineEnd: fullRange.timelineEnd
      };
    }

    const [yStr, mStr] = selectedMonth.split('-');
    const selYear = parseInt(yStr, 10);
    const selMonth = parseInt(mStr, 10) - 1;

    const startOfMonth = new Date(selYear, selMonth, 1);
    const endOfMonth = new Date(selYear, selMonth + 1, 1);

    // Filter sequences that have ANY timeline bar overlap with the selected month
    const filtered = sorted.filter(s => {
      const erection = parseDate(s.scheduled_erection_date) || parseDate(project?.erection_date);
      const milestones = calculateMilestones(erection, isFMRequired);
      const barStart = awardedDate || milestones.ofa || erection;
      const barEnd = erection;

      if (!barStart && !barEnd) return false;

      const sTime = (barStart || barEnd).getTime();
      const eTime = (barEnd || barStart).getTime() + ONE_DAY;

      return sTime < endOfMonth.getTime() && eTime > startOfMonth.getTime();
    });

    return {
      filteredSchedules: filtered,
      timelineStart: startOfMonth,
      timelineEnd: endOfMonth
    };
  }, [selectedMonth, sorted, fullRange, project?.erection_date, awardedDate, isFMRequired]);

  const timelineMs = timelineEnd.getTime() - timelineStart.getTime();

  /* ── month columns ── */
  const months = [];
  {
    let cursor = new Date(timelineStart.getFullYear(), timelineStart.getMonth(), 1);
    while (cursor < timelineEnd) {
      const monthStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
      const nextMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);

      const segmentStart = new Date(Math.max(monthStart.getTime(), timelineStart.getTime()));
      const segmentEnd = new Date(Math.min(nextMonth.getTime(), timelineEnd.getTime()));

      if (segmentStart < segmentEnd) {
        const leftPct = ((segmentStart.getTime() - timelineStart.getTime()) / timelineMs) * 100;
        const widthPct = ((segmentEnd.getTime() - segmentStart.getTime()) / timelineMs) * 100;

        months.push({
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
  }

  /* ── helper: get percentage position on timeline ── */
  const getDatePct = (d) => {
    if (!d || d < timelineStart || d > timelineEnd) return null;
    return ((d - timelineStart) / timelineMs) * 100;
  };

  /* ── bar data ── */
  const bars = filteredSchedules.map((sched) => {
    const erection = parseDate(sched.scheduled_erection_date) || parseDate(project?.erection_date);
    const milestones = calculateMilestones(erection, isFMRequired);
    const ship = parseDate(sched.ship_date);

    // Bar: Awarded Date → Erection Date
    const start = awardedDate || milestones.ofa;
    const end = erection;
    if (!start && !end) return null;

    const barStart = start || end;
    const barEnd = end
      ? new Date(end.getFullYear(), end.getMonth(), end.getDate() + 1)
      : new Date(barStart.getFullYear(), barStart.getMonth(), barStart.getDate() + 1);

    // Clamp start/end to visible range for nice rendering when zoomed
    const visibleStart = new Date(Math.max(barStart.getTime(), timelineStart.getTime()));
    const visibleEnd = new Date(Math.min(barEnd.getTime(), timelineEnd.getTime()));

    if (visibleStart >= visibleEnd) return null;

    const leftPct = ((visibleStart - timelineStart) / timelineMs) * 100;
    const widthPct = ((visibleEnd - visibleStart) / timelineMs) * 100;
    const { label, color } = getStatus(barStart, end);

    return { sched, start: barStart, end, leftPct, widthPct, label, color, milestones, ship, erection };
  }).filter(Boolean);

  /* ── milestone dot definitions ── */
  const milestoneTypes = [
    { key: 'ofa', label: 'Sch OFA', color: '#a855f7' },
    { key: 'bfa', label: 'Sch BFA', color: '#06b6d4' },
    { key: 'fm', label: 'Sch Field Measure', color: '#f97316' },
    { key: 'rts', label: 'RTS', color: '#1e293b' },
    { key: 'ship', label: 'Ship Date', color: '#ef4444' },
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
      {/* Month Filter Bar */}
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
          <div className="gantt-seq-col" style={{ color: '#374151', textTransform: 'uppercase', fontSize: '0.65rem', fontWeight: 600 }}>Seq #</div>
          <div className="gantt-desc-col" style={{ color: '#374151', textTransform: 'uppercase', fontSize: '0.65rem', fontWeight: 600 }}>Item Description</div>
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

        {/* ── body rows ── */}
        {bars.map((bar, idx) => {
          if (!bar) return null;
          const { sched, start, end, leftPct, widthPct, label, color, milestones, ship, erection } = bar;
          return (
            <div key={sched.id || idx} className="gantt-row">
              {/* Seq Column */}
              <div className="gantt-seq-col font-medium">
                {sched.seq_no}
              </div>

              {/* Description Column */}
              <div className="gantt-desc-col font-medium" title={sched.item_description}>
                {sched.item_description || '-'}
              </div>

              {/* timeline area */}
              <div className="gantt-timeline-col gantt-track">
                {/* month grid lines */}
                {months.map((m, i) => (
                  <div
                    key={i}
                    className="gantt-grid-line"
                    style={{ left: `${m.leftPct + m.widthPct}%` }}
                  />
                ))}

                {/* the bar */}
                <div
                  className="gantt-bar-fill"
                  style={{
                    left: `${leftPct}%`,
                    width: `${Math.max(widthPct, 0.5)}%`,
                    backgroundColor: color,
                  }}
                  title={`Seq ${sched.seq_no}${sched.seq_name ? ' – ' + sched.seq_name : ''}\nAwarded: ${fmt(start)}\nErection: ${fmt(end)}\nStatus: ${label}`}
                >
                  <span className="gantt-bar-text">
                    {fmt(start)} → {fmt(end)}
                  </span>
                </div>

                {/* Milestone Dots — using calculated dates */}
                {milestoneTypes.map((m) => {
                  const dateVal = m.key === 'ship' ? ship : milestones[m.key];
                  const pct = getDatePct(dateVal);
                  if (pct === null) return null;
                  return (
                    <div
                      key={m.key}
                      className="absolute z-10 w-3 h-3 rounded-full border-2 border-white shadow-md -translate-x-1/2 -translate-y-1/2 cursor-pointer hover:scale-125 transition-transform"
                      style={{
                        left: `${pct}%`,
                        top: '50%',
                        backgroundColor: m.color,
                      }}
                      title={`${m.label}: ${fmt(dateVal)}`}
                    />
                  );
                })}

                {/* Erection Flag */}
                {(() => {
                  const pct = getDatePct(erection);
                  if (pct === null) return null;
                  return (
                    <div
                      className="absolute z-20 -translate-x-1/2 -translate-y-[65%] cursor-pointer hover:scale-125 transition-transform"
                      style={{
                        left: `${pct}%`,
                        top: '50%',
                        fontSize: '12px',
                      }}
                      title={`Erection Flag: ${fmt(erection)}`}
                    >
                      🚩
                    </div>
                  );
                })()}
              </div>
            </div>
          );
        })}

        {/* ── Legend ── */}
        <div className="flex flex-wrap gap-4 items-center justify-start p-3 bg-slate-50 border-t border-slate-200 text-[10px] font-bold text-slate-500">
          <span className="uppercase tracking-widest text-[8px] text-slate-400">Milestone Legend:</span>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full border border-white bg-[#a855f7] shadow-sm" />
            <span>Sch OFA</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full border border-white bg-[#06b6d4] shadow-sm" />
            <span>Sch BFA</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full border border-white bg-[#f97316] shadow-sm" />
            <span>Sch Field Measure</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full border border-white bg-[#1e293b] shadow-sm" />
            <span>RTS</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full border border-white bg-[#ef4444] shadow-sm" />
            <span>Ship Date</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[13px] leading-none">🚩</span>
            <span>Erection Date</span>
          </div>
        </div>
      </div>
    </div>
  );
}
