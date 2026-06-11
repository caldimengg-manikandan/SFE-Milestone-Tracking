import { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Download, X, Save, FolderKanban, LayoutTemplate, CalendarDays, ChevronRight, ChevronDown, Loader2 } from 'lucide-react';
import StructuralScheduleForm from './StructuralScheduleForm';
import { customerAPI, detailerAPI, employeeAPI, rfqAPI } from '../../services/api';
import FormattedDateInput from './FormattedDateInput';

function SearchableDropdown({ options, value, onChange, placeholder, className, containerClassName = "w-full", loading }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const selectedOption = options.find(opt => String(opt.id) === String(value));
  
  useEffect(() => {
    if (selectedOption) {
      setSearchTerm(selectedOption.label);
    } else {
      setSearchTerm('');
    }
  }, [value, selectedOption]);

  const filteredOptions = options.filter(opt =>
    (opt.label || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelect = (opt) => {
    onChange({ target: { value: opt.id } });
    setSearchTerm(opt.label);
    setIsOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.searchable-dropdown-container')) {
        setIsOpen(false);
        if (selectedOption) {
          setSearchTerm(selectedOption.label);
        } else {
          setSearchTerm('');
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectedOption]);

  return (
    <div className={`relative searchable-dropdown-container ${containerClassName}`}>
      <div className="relative flex items-center">
        <input
          type="text"
          placeholder={placeholder}
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setIsOpen(true);
            if (e.target.value === '') {
              onChange({ target: { value: '' } });
            }
          }}
          onFocus={() => setIsOpen(true)}
          onClick={() => setIsOpen(true)}
          className={`w-full pr-16 ${className}`}
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-slate-400">
          {value && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange({ target: { value: '' } });
                setSearchTerm('');
                setIsOpen(false);
              }}
              className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600 focus:outline-none"
              title="Clear selection"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(!isOpen);
            }}
            className="p-1 hover:bg-slate-50 rounded focus:outline-none text-slate-400 focus:outline-none"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1.5 max-h-60 overflow-y-auto bg-white border border-slate-200 rounded-[1.25rem] shadow-xl divide-y divide-slate-100 animate-fade-in">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleSelect(opt)}
                className={`w-full text-left px-4 py-3 text-xs font-bold transition-all hover:bg-slate-50 ${String(opt.id) === String(value) ? 'bg-amber-50 text-amber-600' : 'text-slate-700'}`}
              >
                {opt.label}
              </button>
            ))
          ) : (
            <p className="px-4 py-3 text-xs text-slate-400 italic text-center">No matching options found</p>
          )}
        </div>
      )}
    </div>
  );
}

export default function ProjectForm({
  schedules,
  addScheduleRow,
  handleScheduleChange,
  handleDeleteSchedule,
  form,
  setForm,
  handleSave,
  onClose,
  isEditing,
  loading,
  autocalculateManhourTon,
  initialTab = "basic",
  showTabs = true,
  mode = "edit",
  projects = [],
  onProjectSelect
}) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [customers, setCustomers] = useState([]);
  const [detailers, setDetailers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [wonRfqs, setWonRfqs] = useState([]);
  const [selectedRfqId, setSelectedRfqId] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [custRes, detRes, empRes] = await Promise.all([
          customerAPI.getAll(),
          detailerAPI.getAll(),
          employeeAPI.getAll()
        ]);
        setCustomers(custRes.data.results || custRes.data);
        setDetailers(detRes.data.results || detRes.data);
        setEmployees(empRes.data.results || empRes.data);
      } catch (err) {
        console.error('Failed to load masters', err);
      }

      try {
        const rfqRes = await rfqAPI.getAll({ won_lost: 'Won' });
        setWonRfqs(rfqRes.data.results || rfqRes.data);
      } catch (err) {
        console.error('Failed to load Won RFQs', err);
      }
    };
    fetchData();
  }, []);

  const exportToPDF = () => {
    if (!schedules || schedules.length === 0) {
      alert("No schedule data found for this project.");
      return;
    }

    const doc = new jsPDF('l', 'mm', 'a4');

    // Title & Branding
    doc.setFontSize(22);
    doc.setTextColor(15, 23, 42); // Slate 900
    doc.setFont(undefined, 'bold');
    doc.text("STRUCTURAL SCHEDULE", 14, 20);

    // Horizontal Divider
    doc.setDrawColor(203, 213, 225); // Slate 300
    doc.setLineWidth(0.5);
    doc.line(14, 24, 283, 24);

    // Meta Grid - Column 1
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105); // Slate 600
    doc.setFont(undefined, 'bold'); doc.text("PROJECT NAME:", 14, 32);
    doc.setFont(undefined, 'normal'); doc.setTextColor(15, 23, 42); doc.text(form.name || 'N/A', 45, 32);

    doc.setTextColor(71, 85, 105); doc.setFont(undefined, 'bold'); doc.text("CUSTOMER:", 14, 38);
    doc.setFont(undefined, 'normal'); doc.setTextColor(15, 23, 42); doc.text(form.customer_name || 'N/A', 45, 38);

    doc.setTextColor(71, 85, 105); doc.setFont(undefined, 'bold'); doc.text("DETAILER:", 14, 44);
    doc.setFont(undefined, 'normal'); doc.setTextColor(15, 23, 42); doc.text(form.detailer_name || 'N/A', 45, 44);

    // Meta Grid - Column 2
    doc.setTextColor(71, 85, 105); doc.setFont(undefined, 'bold'); doc.text("PROJECT CODE:", 150, 32);
    doc.setFont(undefined, 'normal'); doc.setTextColor(15, 23, 42); doc.text(form.code || 'N/A', 180, 32);

    doc.setTextColor(71, 85, 105); doc.setFont(undefined, 'bold'); doc.text("MANAGER:", 150, 38);
    doc.setFont(undefined, 'normal'); doc.setTextColor(15, 23, 42); doc.text(form.project_manager_name || 'N/A', 180, 38);

    const showFieldMeasure = (form.schedule_field_measure_required || 'Yes').trim().toLowerCase() !== 'no';

    const headersList = ["SEQ #", "Tons", "Item Description", "Scheduled OFA", "Actual OFA", "Scheduled BFA", "Actual BFA"];
    if (showFieldMeasure) {
      headersList.push("Field Measure");
    }
    headersList.push("RTS Date", "plant Lead (Wks)", "Scheduled Erection", "Bud. plant Hr", "Bud. Field Hr", "Act. plant Hr", "Act. Field Hr", "Detailer/Vendor", "Dwg Status", "Notes");
    const tableHeaders = [headersList];

    const sortedSchedules = [...schedules].sort((a, b) => {
      const aNum = parseFloat(a.seq_no);
      const bNum = parseFloat(b.seq_no);
      if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
      return String(a.seq_no).localeCompare(String(b.seq_no), undefined, { numeric: true });
    });

    const tableData = sortedSchedules.map(s => {
      const row = [
        s.seq_no,
        s.tons,
        s.item_description,
        s.scheduled_ofa_date,
        s.actual_ofa_date || '-',
        s.scheduled_bfa_date,
        s.actual_bfa_date || '-'
      ];
      if (showFieldMeasure) {
        row.push(s.scheduled_field_measure_date || '-');
      }
      row.push(
        s.rts_date,
        s.plant_lead_time_weeks,
        s.scheduled_erection_date,
        s.budget_plant_hours,
        s.budget_field_hours,
        s.actual_plant_hours,
        s.actual_field_hours,
        s.detailer_vendor,
        s.dwg_status,
        s.notes
      );
      return row;
    });

    const stylesMap = [
      { cellWidth: 8, halign: 'center' },   // SEQ #
      { cellWidth: 9, halign: 'center' },  // Tons
      { cellWidth: 'auto' }, // Item Description
      { cellWidth: 12, halign: 'center' },  // Scheduled OFA Date
      { cellWidth: 12, halign: 'center' },  // Actual OFA Date
      { cellWidth: 12, halign: 'center' },  // Scheduled BFA Date
      { cellWidth: 12, halign: 'center' }   // Actual BFA Date
    ];
    if (showFieldMeasure) {
      stylesMap.push({ cellWidth: 14, halign: 'center' }); // Scheduled Field Measure Date
    }
    stylesMap.push(
      { cellWidth: 12, halign: 'center' },  // RTS Date
      { cellWidth: 14, halign: 'center' },  // plant Lead Time in WEEKS
      { cellWidth: 13, halign: 'center' }, // Scheduled Start of Erection
      { cellWidth: 11, halign: 'center' }, // Budget plant Hours
      { cellWidth: 11, halign: 'center' }, // Budget Field Hours
      { cellWidth: 11, halign: 'center' }, // plant Hours Actual
      { cellWidth: 11, halign: 'center' }, // Field Hours Actual
      { cellWidth: 13 }, // Detailer / Vendor
      { cellWidth: 12 }, // Dwg Status
      { cellWidth: 14 }  // Notes
    );

    const columnStyles = {};
    stylesMap.forEach((style, idx) => {
      columnStyles[idx] = style;
    });

    autoTable(doc, {
      startY: 50,
      head: tableHeaders,
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [30, 41, 59], fontSize: 6.5, fontStyle: 'bold', halign: 'center', valign: 'middle' },
      bodyStyles: { fontSize: 6.0, valign: 'middle' },
      styles: { cellPadding: 1, overflow: 'linebreak' },
      columnStyles: columnStyles
    });

    // --- GANTT CHART IN PDF ---
    // Helper to safely parse dates
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

    // Helper to determine active range for a sequence
    const getSequenceRange = (s) => {
      let start = parseDate(s.scheduled_ofa_date) || parseDate(s.scheduled_bfa_date) || parseDate(s.rts_date);
      let end = parseDate(s.scheduled_erection_date) || parseDate(s.rts_date);

      if (!start && end) start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
      if (!end && start) end = new Date(start.getTime() + 30 * 24 * 60 * 60 * 1000);

      return { start, end };
    };

    // Calculate sequence status color
    const calculateSeqStatus = (rtsDateStr, leadWeeks) => {
      if (!rtsDateStr) return { label: 'TBD', color: [156, 163, 175] }; // Slate 400
      const now = new Date();
      const rtsDate = new Date(rtsDateStr);
      const weeks = parseFloat(leadWeeks) || 0;
      const completionDate = new Date(rtsDate.getTime() + weeks * 7 * 24 * 60 * 60 * 1000);
      const twoDaysFromNow = new Date();
      twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);

      if (rtsDate > twoDaysFromNow) {
        return { label: 'Yet to Start', color: [59, 130, 246] }; // Blue 500
      } else if (now >= completionDate) {
        return { label: 'Completed', color: [34, 197, 94] }; // Emerald 500
      } else {
        return { label: 'InProgress', color: [245, 158, 11] }; // Amber 500
      }
    };

    // Collect all valid dates to compute the project boundaries
    let minDate = null;
    let maxDate = null;

    sortedSchedules.forEach(s => {
      const dates = [
        parseDate(s.scheduled_ofa_date),
        parseDate(s.actual_ofa_date),
        parseDate(s.scheduled_bfa_date),
        parseDate(s.actual_bfa_date),
        parseDate(s.scheduled_field_measure_date),
        parseDate(s.rts_date),
        parseDate(s.scheduled_erection_date)
      ].filter(Boolean);

      dates.forEach(d => {
        if (!minDate || d < minDate) minDate = d;
        if (!maxDate || d > maxDate) maxDate = d;
      });
    });

    if (!minDate) {
      minDate = parseDate(form.erection_date) || new Date();
    }
    if (!maxDate) {
      maxDate = new Date(minDate.getTime() + 90 * 24 * 60 * 60 * 1000); // 3 months later
    }

    // Align to month starts/ends
    const startMonth = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
    const endMonth = new Date(maxDate.getFullYear(), maxDate.getMonth() + 1, 0);

    const totalMonths = (endMonth.getFullYear() - startMonth.getFullYear()) * 12 + (endMonth.getMonth() - startMonth.getMonth()) + 1;

    // Page dimensions and layout config
    const timelineStart = 14 + 60; // 74mm
    const timelineWidth = 209; // 209mm (A4 Landscape = 297mm width, 14mm margins -> 269mm total width)
    const monthWidth = timelineWidth / totalMonths;
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    const getX = (date) => {
      if (!date) return null;
      const timeDiff = date.getTime() - startMonth.getTime();
      const totalTime = endMonth.getTime() - startMonth.getTime();
      if (totalTime <= 0) return timelineStart;
      return timelineStart + (timeDiff / totalTime) * timelineWidth;
    };

    const rowHeight = 10;
    const totalSequences = sortedSchedules.length;

    // Determine where to start Gantt
    let currentY = doc.lastAutoTable.finalY || 50;
    const pageHeight = doc.internal.pageSize.height || doc.internal.pageSize.getHeight();

    // Min height required to start Gantt chart on current page:
    // Header (Title, metadata, divider, month header bar) = 30mm
    // Minimum 1 sequence row = 10mm
    // So minimum space required = 55mm (including 25mm gap).
    const spaceRemaining = pageHeight - currentY - 15;

    let seqIdx = 0;
    let isFirstGanttPage = true;

    if (spaceRemaining < 55) {
      doc.addPage();
      currentY = 15; // Start at top of new page
      isFirstGanttPage = false;
    } else {
      // Start directly below the table with a 25mm gap!
      currentY = currentY + 25;
    }

    while (seqIdx < totalSequences) {
      let rowStartY = 0;

      if (isFirstGanttPage) {
        // 1. Draw Gantt Header (on page 1, below the table)
        doc.setFontSize(14); // slightly smaller title to look extremely clean when on the same page
        doc.setTextColor(15, 23, 42); // Slate 900
        doc.setFont(undefined, 'bold');
        doc.text("STRUCTURAL GANTT CHART", 14, currentY);

        doc.setFontSize(8);
        doc.setTextColor(71, 85, 105); // Slate 600
        doc.text("PROJECT NAME:", 14, currentY + 5);
        doc.setFont(undefined, 'normal'); doc.setTextColor(15, 23, 42); doc.text(form.name || 'N/A', 40, currentY + 5);

        doc.setTextColor(71, 85, 105); doc.setFont(undefined, 'bold'); doc.text("PROJECT CODE:", 140, currentY + 5);
        doc.setFont(undefined, 'normal'); doc.setTextColor(15, 23, 42); doc.text(form.code || 'N/A', 167, currentY + 5);

        doc.setTextColor(71, 85, 105); doc.setFont(undefined, 'bold'); doc.text("ERECTION DATE:", 210, currentY + 5);
        doc.setFont(undefined, 'normal'); doc.setTextColor(15, 23, 42); doc.text(form.erection_date ? new Date(form.erection_date).toLocaleDateString('en-GB') : 'N/A', 238, currentY + 5);

        // Divider Line
        doc.setDrawColor(203, 213, 225); // Slate 300
        doc.setLineWidth(0.5);
        doc.line(14, currentY + 8, 283, currentY + 8);

        // 2. Draw Monthly Header Bar
        const monthHeaderY = currentY + 12;
        doc.setFillColor(248, 250, 252); // Slate 50
        doc.rect(timelineStart, monthHeaderY, timelineWidth, 8, 'F');
        doc.setDrawColor(226, 232, 240); // Slate 200
        doc.rect(timelineStart, monthHeaderY, timelineWidth, 8, 'S');

        doc.setFontSize(7.5);
        doc.setTextColor(71, 85, 105);
        doc.setFont(undefined, 'bold');

        for (let i = 0; i < totalMonths; i++) {
          const mDate = new Date(startMonth.getFullYear(), startMonth.getMonth() + i, 1);
          const mLabel = `${monthNames[mDate.getMonth()]} ${mDate.getFullYear().toString().slice(-2)}`;
          const xLeft = timelineStart + i * monthWidth;
          doc.text(mLabel, xLeft + monthWidth / 2, monthHeaderY + 5.5, { align: 'center' });
          if (i > 0) {
            doc.setDrawColor(226, 232, 240);
            doc.line(xLeft, monthHeaderY, xLeft, monthHeaderY + 8);
          }
        }

        // Label Header on Left
        doc.setFontSize(8);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(71, 85, 105);
        doc.text("SEQUENCE DESCRIPTION", 14, monthHeaderY + 5.5);

        rowStartY = currentY + 20;
        isFirstGanttPage = false; // Next page loops will start fresh
      } else {
        // Draw Gantt Header (on subsequent pages)
        doc.setFontSize(14);
        doc.setTextColor(15, 23, 42); // Slate 900
        doc.setFont(undefined, 'bold');
        doc.text("STRUCTURAL GANTT CHART (Contd.)", 14, currentY);

        doc.setFontSize(8);
        doc.setTextColor(71, 85, 105); // Slate 600
        doc.text("PROJECT NAME:", 14, currentY + 5);
        doc.setFont(undefined, 'normal'); doc.setTextColor(15, 23, 42); doc.text(form.name || 'N/A', 40, currentY + 5);

        doc.setTextColor(71, 85, 105); doc.setFont(undefined, 'bold'); doc.text("PROJECT CODE:", 140, currentY + 5);
        doc.setFont(undefined, 'normal'); doc.setTextColor(15, 23, 42); doc.text(form.code || 'N/A', 167, currentY + 5);

        doc.setTextColor(71, 85, 105); doc.setFont(undefined, 'bold'); doc.text("ERECTION DATE:", 210, currentY + 5);
        doc.setFont(undefined, 'normal'); doc.setTextColor(15, 23, 42); doc.text(form.erection_date ? new Date(form.erection_date).toLocaleDateString('en-GB') : 'N/A', 238, currentY + 5);

        // Divider Line
        doc.setDrawColor(203, 213, 225); // Slate 300
        doc.setLineWidth(0.5);
        doc.line(14, currentY + 8, 283, currentY + 8);

        // 2. Draw Monthly Header Bar
        const monthHeaderY = currentY + 12;
        doc.setFillColor(248, 250, 252); // Slate 50
        doc.rect(timelineStart, monthHeaderY, timelineWidth, 8, 'F');
        doc.setDrawColor(226, 232, 240); // Slate 200
        doc.rect(timelineStart, monthHeaderY, timelineWidth, 8, 'S');

        doc.setFontSize(7.5);
        doc.setTextColor(71, 85, 105);
        doc.setFont(undefined, 'bold');

        for (let i = 0; i < totalMonths; i++) {
          const mDate = new Date(startMonth.getFullYear(), startMonth.getMonth() + i, 1);
          const mLabel = `${monthNames[mDate.getMonth()]} ${mDate.getFullYear().toString().slice(-2)}`;
          const xLeft = timelineStart + i * monthWidth;
          doc.text(mLabel, xLeft + monthWidth / 2, monthHeaderY + 5.5, { align: 'center' });
          if (i > 0) {
            doc.setDrawColor(226, 232, 240);
            doc.line(xLeft, monthHeaderY, xLeft, monthHeaderY + 8);
          }
        }

        // Label Header on Left
        doc.setFontSize(8);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(71, 85, 105);
        doc.text("SEQUENCE DESCRIPTION", 14, monthHeaderY + 5.5);

        rowStartY = currentY + 20;
      }

      // Determine page capacity
      const rem = totalSequences - seqIdx;
      // If remaining sequences all fit on this page WITH legend
      const fitsWithLegend = (rowStartY + rem * rowHeight <= pageHeight - 20); // 20mm for legend + margins

      let numRowsOnPage = 0;
      let drawLegendOnThisPage = false;

      if (fitsWithLegend) {
        numRowsOnPage = rem;
        drawLegendOnThisPage = true;
      } else {
        // Find how many fit on this page without legend
        const maxLimit = pageHeight - 15; // 15mm bottom margin
        numRowsOnPage = Math.floor((maxLimit - rowStartY) / rowHeight);
        if (numRowsOnPage < 1) {
          // If we can't even fit 1 row, force add page and loop again
          doc.addPage();
          currentY = 15;
          continue;
        }
      }

      // Draw Grid vertical lines down the chart
      const gridBottomY = rowStartY + numRowsOnPage * rowHeight;
      doc.setDrawColor(241, 245, 249); // Slate 100
      doc.setLineWidth(0.3);
      for (let i = 0; i <= totalMonths; i++) {
        const xCol = timelineStart + i * monthWidth;
        doc.line(xCol, rowStartY - 8, xCol, gridBottomY);
      }

      // Draw sequence rows
      for (let rIdx = 0; rIdx < numRowsOnPage; rIdx++) {
        const s = sortedSchedules[seqIdx + rIdx];
        const yRow = rowStartY + rIdx * rowHeight;

        // Row Divider line
        doc.setDrawColor(241, 245, 249);
        doc.setLineWidth(0.5);
        doc.line(14, yRow + rowHeight, 283, yRow + rowHeight);

        // Sequence label
        doc.setFontSize(8);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(15, 23, 42); // Slate 900
        const labelText = `Seq ${s.seq_no}: ${s.item_description || 'N/A'}`;
        const truncatedLabel = doc.splitTextToSize(labelText, 55)[0];
        doc.text(truncatedLabel, 14, yRow + 5.5);

        // Meta info below label
        doc.setFontSize(6.5);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(100, 116, 139); // Slate 500
        doc.text(`${parseFloat(s.tons || 0).toFixed(2)} Tons`, 14, yRow + 8.5);

        // Draw Gantt Bar
        const { start, end } = getSequenceRange(s);
        if (start && end) {
          const xStart = Math.max(timelineStart, getX(start));
          const xEnd = Math.min(timelineStart + timelineWidth, getX(end));

          if (xEnd > xStart) {
            const barWidth = xEnd - xStart;
            const barY = yRow + 2.5;
            const barHeight = 4.5;
            const seqStatus = calculateSeqStatus(s.rts_date, s.plant_lead_time_weeks);
            const [r, g, b] = seqStatus.color;

            // Draw schedule bar
            doc.setFillColor(r, g, b);
            doc.rect(xStart, barY, barWidth, barHeight, 'F');

            // Draw Milestone markers
            const milestones = [
              { date: s.scheduled_ofa_date, color: [168, 85, 247] },
              { date: s.actual_ofa_date, color: [236, 72, 153] },
              { date: s.scheduled_bfa_date, color: [6, 182, 212] },
              { date: s.actual_bfa_date, color: [20, 184, 166] },
              ...(showFieldMeasure ? [{ date: s.scheduled_field_measure_date, color: [249, 115, 22] }] : []),
              { date: s.rts_date, color: [30, 41, 59] },
              { date: s.scheduled_erection_date, color: [79, 70, 229] }
            ];

            milestones.forEach(ms => {
              const d = parseDate(ms.date);
              if (d) {
                const xMs = getX(d);
                if (xMs >= timelineStart && xMs <= timelineStart + timelineWidth) {
                  // White halo
                  doc.setFillColor(255, 255, 255);
                  doc.circle(xMs, barY + barHeight / 2, 1.4, 'F');
                  // Colored dot
                  doc.setFillColor(ms.color[0], ms.color[1], ms.color[2]);
                  doc.circle(xMs, barY + barHeight / 2, 1.0, 'F');
                }
              }
            });

            // Text overlay if space permits
            if (barWidth > 20) {
              doc.setFontSize(5.5);
              doc.setFont(undefined, 'bold');
              doc.setTextColor(255, 255, 255);
              const fmtLabel = `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
              doc.text(fmtLabel, xStart + barWidth / 2, barY + 3.2, { align: 'center' });
            }
          }
        } else {
          doc.setFontSize(7.5);
          doc.setFont(undefined, 'italic');
          doc.setTextColor(148, 163, 184);
          doc.text("Timeline TBD (Dates missing)", timelineStart + 5, yRow + 6);
        }
      }

      // Draw Legend if needed
      if (drawLegendOnThisPage) {
        const yLegend = pageHeight - 18;

        // --- Bar Colors Legend ---
        doc.setFontSize(7);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(71, 85, 105);
        doc.text("BAR COLORS:", 14, yLegend);

        let xOffset = 35;
        const barLegend = [
          { name: "Yet to Start", color: [59, 130, 246] },
          { name: "In Progress", color: [245, 158, 11] },
          { name: "Completed", color: [34, 197, 94] }
        ];

        barLegend.forEach(st => {
          doc.setFillColor(st.color[0], st.color[1], st.color[2]);
          doc.rect(xOffset, yLegend - 2.2, 5, 2.5, 'F');
          doc.setFont(undefined, 'normal');
          doc.setTextColor(100, 116, 139);
          doc.text(st.name, xOffset + 6, yLegend);
          xOffset += 25;
        });

        // --- Milestone Dots Legend ---
        doc.setFont(undefined, 'bold');
        doc.setTextColor(71, 85, 105);
        doc.text("MILESTONE DOTS:", 115, yLegend);

        const dotLegend1 = [
          { name: "Scheduled OFA", color: [168, 85, 247], x: 142 },
          { name: "Actual OFA", color: [236, 72, 153], x: 177 },
          { name: "Scheduled BFA", color: [6, 182, 212], x: 212 },
          { name: "Actual BFA", color: [20, 184, 166], x: 247 }
        ];

        dotLegend1.forEach(st => {
          doc.setFillColor(st.color[0], st.color[1], st.color[2]);
          doc.circle(st.x, yLegend - 1, 1.2, 'F');
          doc.setFont(undefined, 'normal');
          doc.setTextColor(100, 116, 139);
          doc.text(st.name, st.x + 2.5, yLegend);
        });

        // Line 2 for Milestone dots
        const yLegend2 = pageHeight - 14;
        const dotLegend2 = [
          ...(showFieldMeasure ? [{ name: "Field Measure", color: [249, 115, 22], x: 142 }] : []),
          { name: "RTS", color: [30, 41, 59], x: 177 },
          { name: "Scheduled Erection", color: [79, 70, 229], x: 212 }
        ];

        dotLegend2.forEach(st => {
          doc.setFillColor(st.color[0], st.color[1], st.color[2]);
          doc.circle(st.x, yLegend2 - 1, 1.2, 'F');
          doc.setFont(undefined, 'normal');
          doc.setTextColor(100, 116, 139);
          doc.text(st.name, st.x + 2.5, yLegend2);
        });
      }

      seqIdx += numRowsOnPage;

      if (seqIdx < totalSequences) {
        doc.addPage();
        currentY = 15;
      }
    }

    // --- UNIVERSAL FOOTER ON ALL PAGES ---
    const totalPagesCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPagesCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184); // Slate 400
      doc.text(`Page ${i} of ${totalPagesCount}`, 260, pageHeight - 8);
      doc.text(`Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, 14, pageHeight - 8);
    }

    doc.save(`Schedule_${form.code}.pdf`);
  };


  // Sync tab if prop changes (e.g. switching between View Plan and Edit)
  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const handleRfqSelect = (e) => {
    const rfqId = e.target.value;
    setSelectedRfqId(rfqId);
    if (!rfqId) {
      setForm(prev => ({
        ...prev,
        name: '',
        code: '',
        customer_name: '',
        total_ton: '',
        total_manhours: '',
      }));
      return;
    }

    const rfq = wonRfqs.find(r => String(r.id) === String(rfqId));
    if (rfq) {
      const structFab = Number(rfq.struct_fab_hours) || 0;
      const miscFab = Number(rfq.misc_fab_hours) || 0;
      const structErect = Number(rfq.struct_erect_hours) || 0;
      const miscErect = Number(rfq.misc_erect_hours) || 0;
      const totalManhours = structFab + miscFab + structErect + miscErect;

      setForm(prev => ({
        ...prev,
        name: rfq.project_name || '',
        code: rfq.sfe_job_no ? String(rfq.sfe_job_no) : (rfq.quote_no || ''),
        customer_name: rfq.customer_name || '',
        total_ton: rfq.total_tonnage || rfq.ton_steel || '0',
        total_manhours: String(totalManhours),
      }));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
      <div className={`bg-white rounded-3xl shadow-2xl w-full ${activeTab === 'structural' ? 'max-w-[98vw]' : 'max-w-6xl'} max-h-[95vh] flex flex-col overflow-hidden transition-all duration-300`}>
        {/* Modal Header */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-slate-100 bg-slate-50/50">
          <div>
            <h3 className="text-xl font-bold text-slate-900">{isEditing ? 'Project Details' : 'New Project Master Setup'}</h3>
            <p className="text-xs text-slate-500 mt-0.5">{isEditing ? 'View and update project schedules' : 'Fill in the basic project details'}</p>
          </div>
          <div className="flex items-center gap-2">
            {activeTab === 'structural' && (
              <button
                onClick={exportToPDF}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-50 text-emerald-600 text-xs font-bold border border-emerald-100 hover:bg-emerald-100 transition-all"
              >
                <Download className="w-4 h-4" /> Download PDF
              </button>
            )}
            <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-white shadow-sm transition-all"><X className="w-6 h-6" /></button>
          </div>
        </div>


        {/* Tabs */}
        {showTabs && (
          <div className="flex px-8 border-b border-slate-200 bg-white">
            <button
              onClick={() => setActiveTab('basic')}
              className={`flex items-center gap-2 px-6 py-4 text-sm font-bold border-b-2 transition-all ${activeTab === 'basic' ? 'border-amber-500 text-amber-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
            >
              <LayoutTemplate className="w-4 h-4" /> Basic Details
            </button>
            <button
              onClick={() => setActiveTab('structural')}
              className={`flex items-center gap-2 px-6 py-4 text-sm font-bold border-b-2 transition-all ${activeTab === 'structural' ? 'border-amber-500 text-amber-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
            >
              <CalendarDays className="w-4 h-4" /> Structural Schedule
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className={`flex-1 ${activeTab === 'basic' ? 'overflow-y-auto p-8 space-y-8' : 'overflow-hidden flex flex-col p-4 bg-slate-50/50'}`}>
          {activeTab === "basic" && (
            <div className="space-y-6 animate-fade-in">
              {/* Basic Details Section */}
              <section className="space-y-6">
                <div className="flex items-center gap-3 pb-2 border-b border-slate-100">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600">
                    <FolderKanban className="w-4 h-4" />
                  </div>
                  <h4 className="font-bold text-slate-800">Basic Project Information</h4>
                </div>

                {!isEditing && mode !== 'view' && (
                  <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <h5 className="text-sm font-bold text-slate-800">Pre-fill Project from Won RFQs</h5>
                      <p className="text-xs text-slate-500">Select an awarded RFQ to automatically populate project info and total tonnage/manhours.</p>
                    </div>
                    <SearchableDropdown
                      options={wonRfqs.map(rfq => ({
                        id: rfq.id,
                        label: `${rfq.sfe_job_no ? `[Job #${rfq.sfe_job_no}] ` : ''}${rfq.quote_no} — ${rfq.project_name}`
                      }))}
                      value={selectedRfqId || ''}
                      onChange={handleRfqSelect}
                      placeholder="-- Select a Won RFQ --"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-700 outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-500/5 transition-all"
                      containerClassName="w-full md:w-80"
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Project Name</label>
                    <input
                      value={form.name}
                      disabled={mode === 'view'}
                      onChange={e => setForm({ ...form, name: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-500/5 transition-all"
                      placeholder="e.g. Skyline Tower"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Project Code</label>
                    <input
                      value={form.code}
                      disabled={mode === 'view'}
                      onChange={e => setForm({ ...form, code: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-500/5 transition-all"
                      placeholder="e.g. PRJ-001"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Customer Name</label>
                    <input
                      type="text"
                      value={form.customer_name || ''}
                      disabled={true}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-500 text-sm outline-none cursor-not-allowed"
                      placeholder="Synced from RFQ"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Detailer Name</label>
                    <select
                      value={form.detailer_name || ''}
                      disabled={mode === 'view'}
                      onChange={e => setForm({ ...form, detailer_name: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-500/5 transition-all appearance-none"
                    >
                      <option value="">Select Detailer</option>
                      {detailers.map(d => (
                        <option key={d.id} value={d.name}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Project Manager</label>
                    <select
                      value={form.project_manager_name || ''}
                      disabled={mode === 'view'}
                      onChange={e => setForm({ ...form, project_manager_name: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-500/5 transition-all appearance-none"
                    >
                      <option value="">Select PM</option>
                      {employees
                        .filter(emp => emp.designation === 'Project Manager')
                        .map((emp) => (
                          <option key={emp.id} value={emp.name}>{emp.name}</option>
                        ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Erection Date</label>
                    {mode === 'view' ? (
                      <p className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm">
                        {(() => {
                          if (!form.erection_date) return 'N/A';
                          const date = new Date(form.erection_date);
                          if (isNaN(date.getTime())) return 'N/A';
                          const d = date.getDate().toString().padStart(2, '0');
                          const m = (date.getMonth() + 1).toString().padStart(2, '0');
                          const y = date.getFullYear();
                          return `${m}-${d}-${y}`;
                        })()}
                      </p>
                    ) : (
                      <FormattedDateInput
                        value={form.erection_date || ''}
                        onChange={e => setForm({ ...form, erection_date: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-500/5 transition-all"
                      />
                    )}
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Project Priority</label>
                    <select
                      value={form.priority}
                      disabled={mode === 'view'}
                      onChange={e => setForm({ ...form, priority: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-500/5 transition-all appearance-none"
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Project Status</label>
                    <select
                      value={form.status}
                      disabled={mode === 'view'}
                      onChange={e => setForm({ ...form, status: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-500/5 transition-all appearance-none"
                    >
                      <option value="In Progress">In Progress</option>
                      <option value="Yet to Start">Yet to Start</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </div>
                  <div className="lg:col-span-2 grid grid-cols-3 gap-4 p-4 rounded-2xl bg-amber-50/50 border border-amber-100">
                    <div>
                      <label className="block text-[10px] font-bold text-amber-700 uppercase mb-1.5">Total Ton</label>
                      <input
                        type="number"
                        value={form.total_ton}
                        disabled={mode === 'view'}
                        onChange={e => setForm({ ...form, total_ton: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-amber-200 bg-white text-sm outline-none focus:border-amber-400"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-amber-700 uppercase mb-1.5">Total Manhours</label>
                      <input
                        type="number"
                        value={form.total_manhours}
                        disabled={mode === 'view'}
                        onChange={e => setForm({ ...form, total_manhours: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-amber-200 bg-white text-sm outline-none focus:border-amber-400"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-amber-700 uppercase mb-1.5">Manhour / Ton</label>
                      <div className="w-full px-3 py-2 rounded-lg bg-amber-100/50 text-amber-900 font-bold text-sm border border-amber-200 text-center">
                        {autocalculateManhourTon()}
                      </div>
                    </div>
                  </div>
                  <div className="lg:col-span-2 grid grid-cols-2 gap-4 p-4 rounded-2xl bg-amber-50/50 border border-amber-100">
                    <div className="flex flex-col justify-between">
                      <label className="block text-[10px] font-bold text-amber-700 uppercase mb-1.5">plant Name</label>
                      <select
                        value={form.plant_name || ''}
                        disabled={mode === 'view'}
                        onChange={e => setForm({ ...form, plant_name: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-amber-200 bg-white text-sm outline-none focus:border-amber-400 appearance-none"
                      >
                        <option value="">Select plant</option>
                        <option value="plant1">plant1</option>
                        <option value="plant2">plant2</option>
                        <option value="plant3">plant3</option>
                      </select>
                    </div>
                    <div className="flex flex-col justify-between">
                      <label className="block text-[10px] font-bold text-amber-700 uppercase mb-1.5">Is Scheduled Field Measure Date Required?</label>
                      <select
                        value={form.schedule_field_measure_required || 'Yes'}
                        disabled={mode === 'view'}
                        onChange={e => setForm({ ...form, schedule_field_measure_required: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-amber-200 bg-white text-sm outline-none focus:border-amber-400 appearance-none"
                      >
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                      </select>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          )}

          {activeTab === "structural" && (
            <div className="flex-1 flex flex-col border border-slate-200 rounded-xl overflow-hidden animate-fade-in bg-white shadow-sm">
              <StructuralScheduleForm
                mode={mode}
                project={form}
                projects={projects}
                onProjectSelect={onProjectSelect}
                schedules={schedules}
                addScheduleRow={addScheduleRow}
                handleRowChange={handleScheduleChange}
                handleDeleteRow={handleDeleteSchedule}
                hideMetrics={false}
              />
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex justify-end gap-3 px-8 py-5 border-t border-slate-100 bg-slate-50/50">
          <button onClick={onClose} className="px-6 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-white transition-all shadow-sm">Cancel</button>
          {showTabs && activeTab === 'basic' ? (
            <button
              onClick={(e) => { e.preventDefault(); setActiveTab('structural'); }}
              className="px-8 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-bold shadow-lg hover:bg-slate-800 transition-all flex items-center gap-2"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            mode !== 'view' && (
              <button
                onClick={handleSave}
                disabled={loading}
                className="px-8 py-2.5 rounded-xl bg-amber-600 text-white text-sm font-bold shadow-lg shadow-amber-500/20 hover:bg-amber-700 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {loading ? 'Saving...' : <><Save className="w-4 h-4" /> Save Project</>}
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
}
