import React from 'react';
import './GanttChart.css';
const parseDate = dStr => {
  if (!dStr) return null;
  // Try ISO format first
  const iso = new Date(dStr);
  if (!isNaN(iso.getTime())) return iso;
  // Fallback to DD/MM/YYYY or D/M/YYYY
  const parts = dStr.split('/');
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // zero‑based month
    const year = parseInt(parts[2], 10);
    const d = new Date(year, month, day);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
};

// Determine status based on date range
const getStatus = (start, end) => {
  if (!start) return { label: 'TBD', color: '#9ca3af' };
  if (!end) return { label: 'TBD', color: '#9ca3af' };
  const now = new Date();
  if (end < now) return { label: 'Completed', color: '#22c55e' };
  if (start > now) return { label: 'Yet to Start', color: '#3b82f6' };
  return { label: 'InProgress', color: '#f59e0b' };
};

// GanttChart component renders a lightweight HTML version of the chart
export default function GanttChart({ project, allSchedules }) {
  // Filter schedules for this project
  const projectSchedules = allSchedules.filter(s => {
    const sId = typeof s.project === 'object' ? s.project.id : s.project;
    return String(sId) === String(project.id);
  });

  if (projectSchedules.length === 0) {
    return <div className="p-4 text-sm text-gray-500">No schedule data found.</div>;
  }

  // Sort sequences
  const sorted = [...projectSchedules].sort((a, b) => {
    const aNum = parseFloat(a.seq_no);
    const bNum = parseFloat(b.seq_no);
    if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
    return String(a.seq_no).localeCompare(String(b.seq_no), undefined, { numeric: true });
  });

  // Determine timeline range based on actual data
  const minDate = sorted.reduce((min, s) => {
    const d = parseDate(s.scheduled_ofa_date) || parseDate(s.scheduled_bfa_date) || parseDate(s.rts_date) || (s.date_range ? parseDate(s.date_range.split('-')[0].trim()) : null);
    return d && (!min || d < min) ? d : min;
  }, null) || new Date();
  const maxDate = sorted.reduce((max, s) => {
    const d = parseDate(s.scheduled_erection_date) || parseDate(s.rts_date) || (s.date_range ? parseDate(s.date_range.split('-')[1].trim()) : null);
    return d && (!max || d > max) ? d : max;
  }, null) || new Date(minDate);
  const startMonth = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
  const endMonth = new Date(maxDate.getFullYear(), maxDate.getMonth() + 1, 0);
  const totalMonths = (endMonth.getFullYear() - startMonth.getFullYear()) * 12 + (endMonth.getMonth() - startMonth.getMonth()) + 1;

  // Utility to format dates as MM-DD-YYYY for the UI
  const formatDateMMDDYYYY = (d) => {
    if (!d) return 'N/A';
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear();
    return `${month}-${day}-${year}`;
  };

  // Helper to get month index from a date
  const monthIdx = date => {
    const d = new Date(date);
    return (d.getFullYear() - startMonth.getFullYear()) * 12 + (d.getMonth() - startMonth.getMonth());
  };

  // Helper to calculate precise horizontal percentage position of a date
  const getPct = (dVal) => {
    if (!dVal) return null;
    const d = parseDate(dVal);
    if (!d) return null;
    const timeDiff = d.getTime() - startMonth.getTime();
    const totalTime = endMonth.getTime() - startMonth.getTime();
    if (totalTime <= 0) return 0;
    return (timeDiff / totalTime) * 100;
  };

  // Header with month labels
  const monthLabels = [];
  for (let i = 0; i < totalMonths; i++) {
    const d = new Date(startMonth.getFullYear(), startMonth.getMonth() + i, 1);
    monthLabels.push(d.toLocaleString('default', { month: 'short', year: 'numeric' }));
  }

  return (
    <div className="border rounded bg-white p-2 overflow-x-auto">
      {/* Month ruler */}
      <div className="flex text-xs text-gray-600 border-b mb-2">
        {monthLabels.map((m, i) => (
          <div
            key={i}
            className="flex-1 text-center"
            style={{ minWidth: `${100 / totalMonths}%` }}
          >
            {m}
          </div>
        ))}
      </div>

      {/* Sequence rows */}
      <div className="space-y-2">
        {sorted.map((sched, idx) => {
          const start = parseDate(sched.scheduled_ofa_date) || parseDate(sched.scheduled_bfa_date) || parseDate(sched.rts_date) || (sched.date_range ? parseDate(sched.date_range.split('-')[0].trim()) : null);
          const end = parseDate(sched.scheduled_erection_date) || parseDate(sched.rts_date) || (sched.date_range ? parseDate(sched.date_range.split('-')[1].trim()) : null);
          if (!start) return null;
          const startIdx = monthIdx(start);
          const endIdx = end ? monthIdx(end) : startIdx;
          const leftPct = (startIdx / totalMonths) * 100;
          const widthPct = ((endIdx - startIdx + 1) / totalMonths) * 100;
          const { label, color } = getStatus(start, end);

          const showFieldMeasure = project?.schedule_field_measure_required !== 'No';
          const milestones = [
            { date: sched.scheduled_ofa_date, color: '#a855f7', label: 'Schedule OFA' },
            { date: sched.actual_ofa_date, color: '#ec4899', label: 'Actual OFA' },
            { date: sched.scheduled_bfa_date, color: '#06b6d4', label: 'Schedule BFA' },
            { date: sched.actual_bfa_date, color: '#14b8a6', label: 'Actual BFA' },
            ...(showFieldMeasure ? [{ date: sched.scheduled_field_measure_date, color: '#f97316', label: 'Schedule Field Measure' }] : []),
            { date: sched.rts_date, color: '#1e293b', label: 'RTS' },
            { date: sched.ship_date, color: '#dc2626', label: 'Ship' },
            { date: sched.scheduled_erection_date, color: '#84cc16', label: 'Erection Sch' }
          ];

          return (
            <div key={sched.id || idx} className="gantt-sequence-row mb-2">
              <div className="flex items-center">
                <div className="gantt-left w-48 text-sm">
                  <div className="font-medium">{sched.seq_no}{sched.seq_name ? ` - ${sched.seq_name}` : ''}</div>
                  {sched.item_description && <div className="text-gray-500">{sched.item_description}</div>}
                </div>
                <div className="relative h-6 bg-gray-100 rounded flex-1 mx-2">
                  <div
                    className="gantt-bar absolute h-full rounded"
                    style={{ left: `${leftPct}%`, width: `${widthPct}%`, backgroundColor: color }}
                    title={`Seq: ${sched.seq_no}${sched.seq_name ? ' - ' + sched.seq_name : ''}\nStart: ${formatDateMMDDYYYY(start)}\nEnd: ${formatDateMMDDYYYY(end)}\nStatus: ${label}`}
                  />
                  {/* Milestone dots overlay */}
                  {milestones.map((ms, msIdx) => {
                    const msPct = getPct(ms.date);
                    if (msPct === null || msPct < 0 || msPct > 100) return null;
                    return (
                      <div
                        key={msIdx}
                        className="absolute w-2.5 h-2.5 rounded-full border border-white -translate-x-1/2 -translate-y-1/2 cursor-pointer hover:scale-125 transition-transform"
                        style={{
                          left: `${msPct}%`,
                          top: '50%',
                          backgroundColor: ms.color,
                          boxShadow: '0 0 2px rgba(0,0,0,0.3)',
                          zIndex: 10
                        }}
                        title={`${ms.label}: ${formatDateMMDDYYYY(parseDate(ms.date))}`}
                      />
                    );
                  })}
                </div>
              </div>
              <div className="gantt-details text-[10px] text-gray-500 mt-1 text-center w-full">
                {formatDateMMDDYYYY(start)} - {formatDateMMDDYYYY(end)} ({label})
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-4 pt-3 border-t text-[11px] text-gray-600 bg-slate-50 p-2 rounded">
        <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-gray-700 mr-2">
          Milestones:
        </div>
                <div className="flex items-center gap-1">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#a855f7' }} />
          <span>Schedule OFA</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#ec4899' }} />
          <span>Actual OFA</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#06b6d4' }} />
          <span>Schedule BFA</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#14b8a6' }} />
          <span>Actual BFA</span>
        </div>
        {project?.schedule_field_measure_required !== 'No' && (
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#f97316' }} />
            <span>Schedule Field Measure</span>
          </div>
        )}
        <div className="flex items-center gap-1">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#1e293b' }} />
          <span>RTS</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#dc2626' }} />
          <span>Ship</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#84cc16' }} />
          <span>Erection Sch</span>
        </div>
      </div>
    </div>
  );
}
