import React, { useMemo } from 'react';
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

  if (sorted.length === 0) {
    return (
      <div className="p-4 text-sm text-gray-500">
        No schedule data found.
      </div>
    );
  }

  /* ── timeline range ─────────────────────────────────────── */
  // Use exact earliest milestone start date to latest milestone erection date
  let earliest = null;
  let latest = null;

  sorted.forEach((s) => {
    const ofa = parseDate(s.scheduled_ofa_date);
    const bfa = parseDate(s.scheduled_bfa_date);
    const rts = parseDate(s.rts_date);
    const erection = parseDate(s.scheduled_erection_date);

    const barStart = ofa || bfa || rts;
    const barEnd = erection || rts;

    if (barStart && (!earliest || barStart < earliest)) earliest = barStart;
    if (barEnd && (!latest || barEnd > latest)) latest = barEnd;
  });

  if (!earliest) earliest = new Date();
  if (!latest || latest <= earliest) latest = new Date(earliest.getTime() + 90 * ONE_DAY);

  // Set timelineStart to the 1st day of the earliest milestone's month
  const timelineStart = new Date(earliest.getFullYear(), earliest.getMonth(), 1);
  // Set timelineEnd to the 1st day of the month AFTER the latest milestone's month, to fully include the entire latest month
  const timelineEnd = new Date(latest.getFullYear(), latest.getMonth() + 1, 1);

  const timelineMs = timelineEnd.getTime() - timelineStart.getTime();

  /* ── month columns ──────────────────────────────────────── */
  const months = [];
  {
    // Start cursor at the 1st of the month containing timelineStart
    let cursor = new Date(timelineStart.getFullYear(), timelineStart.getMonth(), 1);
    while (cursor < timelineEnd) {
      const monthStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
      const nextMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);

      // Compute visible intersection of this calendar month with [timelineStart, timelineEnd]
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

  /* ── bar data ───────────────────────────────────────────── */
  const bars = sorted.map((sched) => {
    const start =
      parseDate(sched.scheduled_ofa_date) ||
      parseDate(sched.scheduled_bfa_date) ||
      parseDate(sched.rts_date);
    const end =
      parseDate(sched.scheduled_erection_date) ||
      parseDate(sched.rts_date);
    if (!start) return null;

    // Use end date if provided, otherwise default to start date + 1 day
    const barEnd = end ? new Date(end.getFullYear(), end.getMonth(), end.getDate() + 1) : new Date(start.getFullYear(), start.getMonth(), start.getDate() + 1);

    const leftPct = ((start - timelineStart) / timelineMs) * 100;
    const widthPct = ((barEnd - start) / timelineMs) * 100;
    const { label, color } = getStatus(start, end || start);

    return { sched, start, end: end || start, leftPct, widthPct, label, color };
  });

  return (
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
                title={`Seq ${sched.seq_no}${sched.seq_name ? ' – ' + sched.seq_name : ''}\nOFA: ${fmt(start)}\nErection: ${fmt(end)}\nStatus: ${label}`}
              >
                <span className="gantt-bar-text">
                  {fmt(start)} → {fmt(end)}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
