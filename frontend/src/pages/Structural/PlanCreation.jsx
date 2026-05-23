import { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Plus, Search, Edit2, Trash2, Eye, FileText, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { projectAPI, scheduleAPI } from '../../services/api';
import ProjectForm from '../../components/forms/ProjectForm';
import GanttChart from '../../components/GanttChart';

export default function PlanCreation() {
  const [projects, setProjects] = useState([]);
  const [viewProjectId, setViewProjectId] = useState(null);
  const [schedules, setSchedules] = useState([]);
  const [allSchedules, setAllSchedules] = useState([]);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [deletedSchedules, setDeletedSchedules] = useState([]);
  const [viewMode, setViewMode] = useState('view');
  const itemsPerPage = 10;

  const [form, setForm] = useState({
    name: '', code: '', customer_name: '', detailer_name: '',
    project_manager_name: '', total_ton: '', total_manhours: '',
    erection_date: '', status: 'Planning', priority: 'Medium',
    shop_name: '', schedule_field_measure_required: 'Yes'
  });

  useEffect(() => {
    fetchProjects();
    fetchAllSchedules();
  }, []);

  const autocalculateManhourTon = () => {
    const ton = parseFloat(form.total_ton) || 0;
    const hours = parseFloat(form.total_manhours) || 0;
    return ton > 0 ? (hours / ton).toFixed(2) : '0.00';
  };

  // Recalculate all budget shop hours if project-wide manhour/ton changes
  useEffect(() => {
    const mhTon = parseFloat(autocalculateManhourTon());
    if (schedules.length > 0 && mhTon > 0) {
      setSchedules(prev => prev.map(row => {
        const rowTons = parseFloat(row.tons) || 0;
        const newBudget = (mhTon * rowTons).toFixed(2);
        if (row.budget_shop_hours === newBudget) return row;
        return { ...row, budget_shop_hours: newBudget };
      }));
    }
  }, [form.total_manhours, form.total_ton]);

  const fetchProjects = async () => {
    try {
      const res = await projectAPI.getAll();
      const data = res.data.results || res.data;
      setProjects(Array.isArray(data) ? data : []);
    } catch (err) { console.error(err); }
  };

  const fetchAllSchedules = async () => {
    try {
      const res = await scheduleAPI.getAll();
      const data = res.data.results || res.data;
      setAllSchedules(Array.isArray(data) ? data : []);
    } catch (err) { console.error(err); }
  };

  const calculateDates = (erectionDate, isRequired) => {
    if (!erectionDate) return {};
    const base = new Date(erectionDate);
    const formatDate = (d) => d.toISOString().split('T')[0];

    const isFMRequired = (isRequired !== undefined ? isRequired : (form.schedule_field_measure_required || 'Yes')).trim().toLowerCase() !== 'no';

    const rts = new Date(base); rts.setMonth(rts.getMonth() - 2);

    if (isFMRequired) {
      const fm = new Date(rts); fm.setDate(fm.getDate() - 14);
      const bfa = new Date(fm); bfa.setDate(bfa.getDate() - 14);
      const ofa = new Date(bfa); ofa.setDate(ofa.getDate() - 14);

      return {
        rts_date: formatDate(rts),
        scheduled_field_measure_date: formatDate(fm),
        scheduled_bfa_date: formatDate(bfa),
        scheduled_ofa_date: formatDate(ofa)
      };
    } else {
      const bfa = new Date(rts); bfa.setDate(bfa.getDate() - 14);
      const ofa = new Date(bfa); ofa.setDate(ofa.getDate() - 14);

      return {
        rts_date: formatDate(rts),
        scheduled_field_measure_date: '',
        scheduled_bfa_date: formatDate(bfa),
        scheduled_ofa_date: formatDate(ofa)
      };
    }
  };

  // Recalculate scheduled dates when schedule_field_measure_required changes
  useEffect(() => {
    if (schedules.length > 0) {
      setSchedules(prev => prev.map(row => {
        if (!row.scheduled_erection_date) return row;
        const newDates = calculateDates(row.scheduled_erection_date, form.schedule_field_measure_required);
        return {
          ...row,
          ...newDates
        };
      }));
    }
  }, [form.schedule_field_measure_required]);

  const createDefaultRow = (projectData) => ({
    id: Date.now(),
    is_new: true,
    project: projectData.id || '',
    seq_no: '1',
    tons: '',
    item_description: '',
    category: '',
    scheduled_erection_date: projectData.erection_date || '',
    ...calculateDates(projectData.erection_date, projectData.schedule_field_measure_required),

    shop_lead_time_weeks: '0',
    budget_shop_hours: '0',
    budget_field_hours: '0',
    actual_shop_hours: '0',
    actual_field_hours: '0',
    detailer_vendor: projectData.detailer_name || '',
    dwg_status: '',
    notes: '',
    fabrication_details: []
  });

  const handleSave = async () => {
    if (!form.name || !form.code) { alert('Project Name and Code are required'); return; }
    setLoading(true);
    try {
      const payload = {
        ...form,
        total_ton: parseFloat(form.total_ton) || 0,
        total_manhours: parseFloat(form.total_manhours) || 0
      };

      let res;
      let projectId = form.id;
      if (form.id) {
        res = await projectAPI.update(form.id, payload);
        setProjects(projects.map(p => p.id === form.id ? res.data : p));
      } else {
        res = await projectAPI.create(payload);
        setProjects([res.data, ...projects]);
        projectId = res.data.id;
      }

      // Delete removed schedules from backend
      for (const deleteId of deletedSchedules) {
        try {
          await scheduleAPI.delete(deleteId);
        } catch (err) {
          console.error('Failed to delete schedule:', deleteId, err);
        }
      }

      for (const row of schedules) {
        if (!row.item_description && !row.tons && row.is_new) continue;
        const schedPayload = { ...row, project: projectId, tons: parseFloat(row.tons) || 0 };
        if (row.is_new) await scheduleAPI.create(schedPayload);
        else await scheduleAPI.update(row.id, schedPayload);
      }
      fetchAllSchedules();
      setShowModal(false);
      resetForm();
    } catch (err) {
      console.error(err);
      alert('Failed to save: ' + JSON.stringify(err.response?.data || err.message));
    }
    finally { setLoading(false); }
  };

  const resetForm = () => {
    setForm({
      name: '', code: '', customer_name: '', detailer_name: '',
      project_manager_name: '', total_ton: '', total_manhours: '',
      erection_date: '', status: 'Planning', priority: 'Medium',
      shop_name: '', schedule_field_measure_required: 'Yes'
    });
    setSchedules([createDefaultRow({})]);
    setDeletedSchedules([]);
    setIsEditing(false);
    setViewMode('edit');
  };

  const handleDetails = (project, mode = 'edit') => {
    setForm(project);
    setViewMode(mode);
    setDeletedSchedules([]);
    const filtered = allSchedules.filter(s => {
      const sId = typeof s.project === 'object' ? s.project.id : s.project;
      return String(sId) === String(project.id);
    });
    const sorted = [...filtered].sort((a, b) => {
      const aNum = parseFloat(a.seq_no);
      const bNum = parseFloat(b.seq_no);
      if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
      return String(a.seq_no).localeCompare(String(b.seq_no), undefined, { numeric: true });
    });
    setSchedules(sorted);
    setIsEditing(true);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this project?')) return;
    try {
      await projectAPI.delete(id);
      setProjects(projects.filter(p => p.id !== id));
    } catch (err) {
      alert('Failed to delete project');
    }
  };

  const downloadProjectPDF = (project) => {
    const projectSchedules = allSchedules.filter(s => {
      const sId = typeof s.project === 'object' ? s.project.id : s.project;
      return String(sId) === String(project.id);
    });

    if (projectSchedules.length === 0) {
      alert("No schedule data found for this project.");
      return;
    }

    const doc = new jsPDF('l', 'mm', 'a4');

    const formatDate = (dateStr) => {
      if (!dateStr) return '-';
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '-';
      const day = d.getDate().toString().padStart(2, '0');
      const month = (d.getMonth() + 1).toString().padStart(2, '0');
      const year = d.getFullYear();
      return `${month}-${day}-${year}`;
    };

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
    doc.setFont(undefined, 'normal'); doc.setTextColor(15, 23, 42); doc.text(project.name || 'N/A', 45, 32);

    doc.setTextColor(71, 85, 105); doc.setFont(undefined, 'bold'); doc.text("CUSTOMER:", 14, 38);
    doc.setFont(undefined, 'normal'); doc.setTextColor(15, 23, 42); doc.text(project.customer_name || 'N/A', 45, 38);

    doc.setTextColor(71, 85, 105); doc.setFont(undefined, 'bold'); doc.text("DETAILER:", 14, 44);
    doc.setFont(undefined, 'normal'); doc.setTextColor(15, 23, 42); doc.text(project.detailer_name || 'N/A', 45, 44);

    // Meta Grid - Column 2
    doc.setTextColor(71, 85, 105); doc.setFont(undefined, 'bold'); doc.text("PROJECT CODE:", 150, 32);
    doc.setFont(undefined, 'normal'); doc.setTextColor(15, 23, 42); doc.text(project.code || 'N/A', 180, 32);

    doc.setTextColor(71, 85, 105); doc.setFont(undefined, 'bold'); doc.text("MANAGER:", 150, 38);
      const showFieldMeasure = project.schedule_field_measure_required !== 'No';
      const sortedSchedules = [...projectSchedules].sort((a, b) => {
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
        s.category || '',
        formatDate(s.scheduled_ofa_date),
        formatDate(s.actual_ofa_date),
        formatDate(s.scheduled_bfa_date),
        formatDate(s.actual_bfa_date)
      ];
      if (showFieldMeasure) {
        row.push(formatDate(s.scheduled_field_measure_date));
      }
      row.push(
        formatDate(s.rts_date),
        s.shop_lead_time_weeks,
        formatDate(s.scheduled_erection_date),
        s.budget_shop_hours,
        s.budget_field_hours,
        s.actual_shop_hours,
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
      { cellWidth: 14 },  // Category
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
      { cellWidth: 14, halign: 'center' },  // Shop Lead Time in WEEKS
      { cellWidth: 13, halign: 'center' }, // Scheduled Start of Erection
      { cellWidth: 11, halign: 'center' }, // Budget Shop Hours
      { cellWidth: 11, halign: 'center' }, // Budget Field Hours
      { cellWidth: 11, halign: 'center' }, // Shop Hours Actual
      { cellWidth: 11, halign: 'center' }, // Field Hours Actual
      { cellWidth: 13 }, // Detailer / Vendor
      { cellWidth: 12 }, // Dwg Status
      { cellWidth: 14 }  // Notes
    );
    // Define PDF table headers matching row data structure
    const baseHeaders = [
      'Seq #', 'Tons', 'Item Description', 'Category',
      'Schedule OFA', 'Actual OFA', 'Schedule BFA', 'Actual BFA'
    ];
    const conditionalHeaders = showFieldMeasure ? ['Scheduled Field Measure'] : [];
    const trailingHeaders = [
      'RTS', 'Shop Lead Time (WEEKS)', 'Scheduled Erection',
      'Budget Shop Hours', 'Budget Field Hours', 'Shop Hours Actual',
      'Field Hours Actual', 'Detailer / Vendor', 'DWG Status', 'Notes'
    ];
    const tableHeaders = [
      [...baseHeaders, ...conditionalHeaders, ...trailingHeaders]
    ];

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
      const d = new Date(dStr);
      return isNaN(d.getTime()) ? null : d;
    };

    // Helper to determine active range for a sequence
    const getSequenceRange = (s) => {
      let start = parseDate(s.scheduled_ofa_date) || parseDate(s.scheduled_bfa_date) || parseDate(s.rts_date);
      let end = parseDate(s.scheduled_erection_date) || parseDate(s.ship_date) || parseDate(s.rts_date);

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
        parseDate(s.ship_date),
        parseDate(s.scheduled_erection_date)
      ].filter(Boolean);

      dates.forEach(d => {
        if (!minDate || d < minDate) minDate = d;
        if (!maxDate || d > maxDate) maxDate = d;
      });
    });

    if (!minDate) {
      minDate = parseDate(project.erection_date) || new Date();
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
        doc.setFont(undefined, 'normal'); doc.setTextColor(15, 23, 42); doc.text(project.name || 'N/A', 40, currentY + 5);

        doc.setTextColor(71, 85, 105); doc.setFont(undefined, 'bold'); doc.text("PROJECT CODE:", 140, currentY + 5);
        doc.setFont(undefined, 'normal'); doc.setTextColor(15, 23, 42); doc.text(project.code || 'N/A', 167, currentY + 5);

        doc.setTextColor(71, 85, 105); doc.setFont(undefined, 'bold'); doc.text("ERECTION DATE:", 210, currentY + 5);
        doc.setFont(undefined, 'normal'); doc.setTextColor(15, 23, 42); doc.text(project.erection_date ? formatDate(project.erection_date) : 'N/A', 238, currentY + 5);

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
        doc.setFont(undefined, 'normal'); doc.setTextColor(15, 23, 42); doc.text(project.name || 'N/A', 40, currentY + 5);

        doc.setTextColor(71, 85, 105); doc.setFont(undefined, 'bold'); doc.text("PROJECT CODE:", 140, currentY + 5);
        doc.setFont(undefined, 'normal'); doc.setTextColor(15, 23, 42); doc.text(project.code || 'N/A', 167, currentY + 5);

        doc.setTextColor(71, 85, 105); doc.setFont(undefined, 'bold'); doc.text("ERECTION DATE:", 210, currentY + 5);
        doc.setFont(undefined, 'normal'); doc.setTextColor(15, 23, 42); doc.text(project.erection_date ? formatDate(project.erection_date) : 'N/A', 238, currentY + 5);

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
        doc.text(`${parseFloat(s.tons || 0).toFixed(2)} Tons | ${s.category || 'N/A'}`, 14, yRow + 8.5);

        // Draw Gantt Bar
        const { start, end } = getSequenceRange(s);
        if (start && end) {
          const xStart = Math.max(timelineStart, getX(start));
          const xEnd = Math.min(timelineStart + timelineWidth, getX(end));

          if (xEnd > xStart) {
            const barWidth = xEnd - xStart;
            const barY = yRow + 2.5;
            const barHeight = 4.5;
            const seqStatus = calculateSeqStatus(s.rts_date, s.shop_lead_time_weeks);
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
              { date: s.scheduled_field_measure_date, color: [249, 115, 22] },
              { date: s.rts_date, color: [30, 41, 59] },
              { date: s.ship_date, color: [220, 38, 38] },
              { date: s.scheduled_erection_date, color: [132, 204, 22] }
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
          { name: "Schedule OFA", color: [168, 85, 247], x: 140 },
          { name: "Actual OFA", color: [236, 72, 153], x: 172 },
          { name: "Schedule BFA", color: [6, 182, 212], x: 202 },
          { name: "Actual BFA", color: [20, 184, 166], x: 232 }
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
        const dotLegend2 = [];
        if (showFieldMeasure) {
          dotLegend2.push({ name: "Schedule Field Measure", color: [249, 115, 22], x: 140 });
        }
        dotLegend2.push(
          { name: "RTS", color: [30, 41, 59], x: showFieldMeasure ? 190 : 140 },
          { name: "Ship", color: [220, 38, 38], x: showFieldMeasure ? 210 : 160 },
          { name: "Schedule Erection", color: [132, 204, 22], x: showFieldMeasure ? 230 : 180 }
        );

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

    doc.save(`Plan_${project.code}.pdf`);
  };

  const filtered = projects.filter(p =>
    (p.name?.toLowerCase() || '').includes(search.toLowerCase()) ||
    (p.code?.toLowerCase() || '').includes(search.toLowerCase())
  );

  const paginatedData = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="min-h-screen bg-slate-50/30 p-4 lg:p-8 space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 text-sm outline-none focus:border-amber-400 transition-all"
          />
        </div>
        <button
          onClick={() => { resetForm(); setShowModal(true); }}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-amber-600 text-white text-sm font-bold shadow-lg hover:bg-amber-700 transition-all"
        >
          <Plus className="w-4 h-4" /> Create New Plan
        </button>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-amber-600 text-white">
                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider">Project Name</th>
                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider">Code</th>
                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider">Customer</th>
                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedData.flatMap(p => [
                <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 text-slate-900 text-sm font-medium border-r border-slate-100">{p.name}</td>
                  <td className="px-4 py-3 text-slate-900 text-sm font-medium border-r border-slate-100">{p.code}</td>
                  <td className="px-4 py-3 text-slate-900 text-sm font-medium border-r border-slate-100">{p.customer_name || 'N/A'}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-0.5">
                      <button onClick={() => downloadProjectPDF(p)} className="p-1 rounded text-indigo-500 hover:bg-indigo-50" title="Structural Plan">
                        <FileText className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setViewProjectId(viewProjectId === p.id ? null : p.id)} className={`p-1 rounded ${viewProjectId === p.id ? 'bg-amber-100 text-amber-700' : 'text-amber-500 hover:bg-amber-50'}`} title="Toggle Gantt">
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDetails(p, 'edit')} className="p-1 rounded text-blue-500 hover:bg-blue-50" title="Edit">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(p.id)} className="p-1 rounded text-red-500 hover:bg-red-50" title="Delete">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>,
                viewProjectId === p.id && (
                  <tr key={`gantt-${p.id}`} className="bg-slate-50">
                    <td colSpan={4} className="p-4">
                      <GanttChart project={p} allSchedules={allSchedules} />
                    </td>
                  </tr>
                )
              ].filter(Boolean))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <ProjectForm
          form={form}
          schedules={schedules}
          setForm={setForm}
          projects={projects}
          onProjectSelect={(selected) => {
            setForm({
              ...selected,
              id: selected.id,
              name: selected.name,
              code: selected.code,
              customer_name: selected.customer_name,
              detailer_name: selected.detailer_name,
              project_manager_name: selected.project_manager_name,
              total_ton: selected.total_ton,
              total_manhours: selected.total_manhours,
              erection_date: selected.erection_date,
              status: selected.status,
              priority: selected.priority,
              shop_name: selected.shop_name || '',
              schedule_field_measure_required: selected.schedule_field_measure_required || 'No',
            });
            setDeletedSchedules([]);
            // Fetch and set existing schedules for this project
            const existingSchedules = allSchedules.filter(s =>
              (s.project?.id || s.project) === selected.id
            );
            if (existingSchedules.length > 0) {
              const sorted = [...existingSchedules].sort((a, b) => {
                const aNum = parseFloat(a.seq_no);
                const bNum = parseFloat(b.seq_no);
                if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
                return String(a.seq_no).localeCompare(String(b.seq_no), undefined, { numeric: true });
              });
              setSchedules(sorted.map(s => ({ ...s, is_new: false })));
            } else {
              setSchedules([createDefaultRow(selected)]);
            }
          }}
          addScheduleRow={() => {
            const maxSeq = schedules.reduce((max, row) => {
              const num = parseInt(row.seq_no);
              return !isNaN(num) && num > max ? num : max;
            }, 0);
            const nextRow = createDefaultRow(form);
            nextRow.seq_no = (maxSeq + 1).toString();
            setSchedules([...schedules, nextRow]);
          }}
          handleScheduleChange={(id, f, v) => {
            setSchedules(prev => prev.map(s => {
              if (s.id !== id) return s;
              let updated = { ...s, [f]: v };

              if (f === 'tons') {
                const mhTon = parseFloat(autocalculateManhourTon()) || 0;
                const rowTons = parseFloat(v) || 0;
                updated.budget_shop_hours = (mhTon * rowTons).toFixed(2);
              }

              if (f === 'scheduled_erection_date' && v) {
                updated = { ...updated, ...calculateDates(v, form.schedule_field_measure_required) };
              }
              return updated;
            }));
          }}
          handleDeleteSchedule={(id) => {
            const row = schedules.find(s => s.id === id);
            if (row && !row.is_new) {
              setDeletedSchedules(prev => [...prev, id]);
            }
            setSchedules(schedules.filter(s => s.id !== id));
          }}
          handleSave={handleSave}
          mode={viewMode}
          onClose={() => setShowModal(false)}
          isEditing={isEditing}
          loading={loading}
          initialTab="structural"
          showTabs={false}
          autocalculateManhourTon={() => (form.total_ton > 0 ? (form.total_manhours / form.total_ton).toFixed(2) : '0.00')}
        />
      )}
    </div>
  );
}
