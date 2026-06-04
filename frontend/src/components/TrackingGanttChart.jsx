import React, { useMemo } from 'react';
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

const getStatus = (rtsDateStr, actualRtsStr) => {
  const planRts = parseDate(rtsDateStr);
  if (!planRts) return { label: 'TBD', color: '#9ca3af' };

  const actualRts = parseDate(actualRtsStr);

  if (actualRts) {
    if (actualRts <= planRts) {
      return { label: 'Completed', color: '#22c55e' }; // Green 500
    } else {
      return { label: 'Completed with delay', color: '#ef4444' }; // Red 500
    }
  }

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (today <= planRts) {
    return { label: 'InProgress', color: '#3b82f6' }; // Blue 500
  } else {
    const diffTime = today.getTime() - planRts.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays <= 7) {
      return { label: 'Litely delay', color: '#eab308' }; // Yellow/Amber 500
    } else {
      return { label: 'Delayed', color: '#ef4444' }; // Red 500
    }
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

  // Awarded date (bar start)
  const awardedDate = project?.awarded_job_no_date ? parseDate(project.awarded_job_no_date) : null;

  /* ── 1. Calculate full timeline range based on all project sequences ── */
  const fullRange = useMemo(() => {
    let earliest = null;
    let latest = null;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    sorted.forEach(s => {
      const rts = parseDate(s.rts_date);
      const actualRts = parseDate(s.actual_rts_date);
      const start = awardedDate || (rts ? new Date(rts.getTime() - 30 * ONE_DAY) : null);
      const end = actualRts || (rts && today > rts ? today : rts);

      const dates = [start, end].filter(Boolean);
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
  }, [sorted, awardedDate]);

  const timelineStart = fullRange.timelineStart;
  const timelineEnd = fullRange.timelineEnd;
  const filteredSchedules = sorted;

  const timelineMs = timelineEnd.getTime() - timelineStart.getTime();

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

  /* ── bar data ── */
  const bars = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    return filteredSchedules.map((sched) => {
      const rtsDate = parseDate(sched.rts_date);
      if (!rtsDate) return null;

      const actualRts = parseDate(sched.actual_rts_date);

      // Bar: Start Date (Awarded Date or fallback) → End Date (Actual RTS or Planned RTS or today if delayed)
      const start = awardedDate || new Date(rtsDate.getTime() - 30 * ONE_DAY);
      const end = actualRts || (today > rtsDate ? today : rtsDate);

      const barStart = start;
      const barEnd = new Date(end.getFullYear(), end.getMonth(), end.getDate() + 1);

      // Clamp start/end to visible range
      const visibleStart = new Date(Math.max(barStart.getTime(), timelineStart.getTime()));
      const visibleEnd = new Date(Math.min(barEnd.getTime(), timelineEnd.getTime()));

      if (visibleStart >= visibleEnd) return null;

      const leftPct = ((visibleStart - timelineStart) / timelineMs) * 100;
      const widthPct = ((visibleEnd - visibleStart) / timelineMs) * 100;
      const { label, color } = getStatus(sched.rts_date, sched.actual_rts_date);

      return { sched, start: barStart, end, leftPct, widthPct, label, color };
    }).filter(Boolean);
  }, [filteredSchedules, awardedDate, timelineStart, timelineEnd, timelineMs]);

  if (sorted.length === 0) {
    return (
      <div className="p-4 text-sm text-gray-500">
        No schedule data found.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200 rounded-lg p-3 shadow-sm">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Project Gantt Schedule</span>
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
          const { sched, start, end, leftPct, widthPct, label, color } = bar;
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
                  title={`Seq ${sched.seq_no}${sched.seq_name ? ' – ' + sched.seq_name : ''}\nAwarded: ${fmt(start)}\nRTS: ${fmt(end)}\nStatus: ${label}`}
                >
                  <span className="gantt-bar-text">
                    {fmt(start)} → {fmt(end)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}

        {/* ── Legend ── */}
        <div className="flex flex-col gap-2 p-3 bg-slate-50 border-t border-slate-200 text-[10px] font-bold text-slate-500">
          <div className="flex flex-wrap gap-x-4 gap-y-2 items-center justify-start">
            <span className="uppercase tracking-widest text-[8px] text-slate-400">Status Legend:</span>
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-2 rounded bg-[#3b82f6] shadow-sm" />
              <span>InProgress</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-2 rounded bg-[#22c55e] shadow-sm" />
              <span>Completed</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-2 rounded bg-[#eab308] shadow-sm" />
              <span>Litely delay</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-2 rounded bg-[#ef4444] shadow-sm" />
              <span>Delayed</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-2 rounded bg-[#ef4444] shadow-sm" />
              <span>Completed with Delay</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
