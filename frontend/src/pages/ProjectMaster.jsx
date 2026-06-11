import { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Plus, Search, Edit2, Trash2, Eye, Filter, Download, ChevronLeft, ChevronRight, X, FileText, Loader2, AlertCircle } from 'lucide-react';
import { projectAPI, scheduleAPI, rfqAPI } from '../services/api';
import ProjectForm from '../components/forms/ProjectForm';

export default function ProjectMaster() {
  const [projects, setProjects] = useState([]);
  const [rfqs, setRfqs] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [allSchedules, setAllSchedules] = useState([]);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [initialTab, setInitialTab] = useState("basic");
  const [deletedSchedules, setDeletedSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [viewMode, setViewMode] = useState('view');
  // Utility to format dates as MM-DD-YYYY
  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '-';
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear();
    return `${month}-${day}-${year}`;
  };
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatClock = (date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    }).toLowerCase();
  };

  const formatDateLong = (dateStr) => {
    return dateStr || 'N/A';
  };

  const [form, setForm] = useState({
    name: '',
    code: '',
    customer_name: '',
    detailer_name: '',
    project_manager_name: '',
    total_ton: '',
    total_manhours: '',
    erection_date: '',
    status: 'Yet to Start',
    priority: 'Medium',
    plant_name: '',
    schedule_field_measure_required: 'Yes'
  });

  useEffect(() => {
    fetchProjects();
    fetchAllSchedules();
  }, []);

  // Recalculate all budget plant hours if project-wide manhour/ton changes
  useEffect(() => {
    const mhTonStr = autocalculateManhourTon();
    const mhTon = parseFloat(mhTonStr);

    if (schedules.length > 0 && mhTon > 0) {
      setSchedules(prev => prev.map(row => {
        const rowTons = parseFloat(row.tons) || 0;
        const newBudget = (mhTon * rowTons).toFixed(2);
        // Only update if it actually changed to avoid unnecessary re-renders
        if (row.budget_plant_hours === newBudget) return row;
        return {
          ...row,
          budget_plant_hours: newBudget
        };
      }));
    }
  }, [form.total_manhours, form.total_ton]);


  const fetchAllSchedules = async () => {
    try {
      setLoading(true);
      const res = await scheduleAPI.getAll();
      const data = res.data.results || res.data;
      setAllSchedules(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };


  const createDefaultRow = (projectData) => {
    const initialErectionDate = projectData.erection_date || '';
    return {
      id: Date.now(),
      is_new: true,
      project: projectData.id || '',
      seq_no: '1',
      tons: '',
      item_description: '',
      category: '',
      scheduled_erection_date: initialErectionDate,
      rts_date: '',
      scheduled_field_measure_date: '',
      scheduled_bfa_date: '',
      scheduled_ofa_date: '',
      plant_lead_time_weeks: '0',
      budget_plant_hours: '0',
      budget_field_hours: '0',
      actual_plant_hours: '0',
      actual_field_hours: '0',
      detailer_vendor: projectData.detailer_name || '',
      dwg_status: '',
      notes: '',
      fabrication_details: []
    };
  };



  const handleScheduleChange = (id, field, value) => {
    setSchedules(prev => prev.map(row => {
      if (row.id !== id) return row;
      let updated = { ...row, [field]: value };

      // Auto-calculate Budget plant Hours when tons change
      if (field === 'tons') {
        const mhTon = parseFloat(autocalculateManhourTon()) || 0;
        const rowTons = parseFloat(value) || 0;
        updated.budget_plant_hours = (mhTon * rowTons).toFixed(2);
      }


      if (field === 'plant_lead_time_weeks') {
        const weeks = parseFloat(value) || 0;
        updated.num_days = Math.round(weeks * 7);
      }
      return updated;
    }));
  };

  const addScheduleRow = () => {
    const maxSeq = schedules.reduce((max, row) => {
      const num = parseInt(row.seq_no);
      return !isNaN(num) && num > max ? num : max;
    }, 0);

    const initialErectionDate = form.erection_date || '';

    const newRow = {
      id: Date.now(),
      is_new: true,
      project: form.id || '',
      seq_no: (maxSeq + 1).toString(),
      tons: '',
      item_description: '',
      category: '',
      scheduled_erection_date: initialErectionDate,
      rts_date: '',
      scheduled_field_measure_date: '',
      scheduled_bfa_date: '',
      scheduled_ofa_date: '',
      plant_lead_time_weeks: '0',
      budget_plant_hours: '0',
      budget_field_hours: '0',
      actual_plant_hours: '0',
      actual_field_hours: '0',
      detailer_vendor: form.detailer_name || '',
      dwg_status: '',
      notes: '',
      fabrication_details: []
    };
    setSchedules([...schedules, newRow]);
  };

  const handleDeleteSchedule = (id) => {
    const row = schedules.find(s => s.id === id);
    if (row && !row.is_new) {
      setDeletedSchedules(prev => [...prev, id]);
    }
    setSchedules(schedules.filter(s => s.id !== id));
  };

  const getCustomerNameForProject = (p) => {
    const matched = rfqs.find(r => 
      (r.sfe_job_no && String(r.sfe_job_no) === p.code) || 
      (r.quote_no && String(r.quote_no) === p.code) || 
      (r.project_name && r.project_name.toLowerCase().trim() === p.name.toLowerCase().trim())
    );
    return matched ? matched.customer_name : (p.customer_name || 'N/A');
  };

  const fetchProjects = async () => {
    try {
      setLoading(true);
      setError('');
      const [res, rfqRes] = await Promise.all([
        projectAPI.getAll(),
        rfqAPI.getAll()
      ]);

      // Handle both { results: [] } and directly []
      const data = res.data.results || res.data;

      if (Array.isArray(data)) {
        setProjects(data);
      } else if (data && typeof data === 'object') {
        // Handle case where it might be a single object instead of list
        setProjects([data]);
      } else {
        setProjects([]);
      }

      const rfqData = rfqRes.data.results || rfqRes.data;
      if (Array.isArray(rfqData)) {
        setRfqs(rfqData);
      }
    } catch (err) {
      console.error('Failed to fetch projects:', err);
      if (err.response) {
        setError(`Server Error: ${err.response.status} - ${err.response.data?.detail || 'Something went wrong on the server.'}`);
      } else if (err.request) {
        setError('Network Error: Unable to reach the server. Please check if the backend is running.');
      } else {
        setError(`Error: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  // Automatically sync project-level erection date to the first schedule row
  useEffect(() => {
    if (schedules.length > 0 && schedules[0].is_new) {
      const firstRow = schedules[0];
      if (form.erection_date && firstRow.scheduled_erection_date !== form.erection_date) {
        handleScheduleChange(firstRow.id, 'scheduled_erection_date', form.erection_date);
      }
    }
  }, [form.erection_date]);





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
    doc.setFont(undefined, 'normal'); doc.setTextColor(15, 23, 42); doc.text(getCustomerNameForProject(project) || 'N/A', 45, 38);

    doc.setTextColor(71, 85, 105); doc.setFont(undefined, 'bold'); doc.text("DETAILER:", 14, 44);
    doc.setFont(undefined, 'normal'); doc.setTextColor(15, 23, 42); doc.text(project.detailer_name || 'N/A', 45, 44);

    // Meta Grid - Column 2
    doc.setTextColor(71, 85, 105); doc.setFont(undefined, 'bold'); doc.text("PROJECT CODE:", 150, 32);
    doc.setFont(undefined, 'normal'); doc.setTextColor(15, 23, 42); doc.text(project.code || 'N/A', 180, 32);

    doc.setTextColor(71, 85, 105); doc.setFont(undefined, 'bold'); doc.text("MANAGER:", 150, 38);
    doc.setFont(undefined, 'normal'); doc.setTextColor(15, 23, 42); doc.text(project.project_manager_name || 'N/A', 180, 38);


    const showFieldMeasure = (project?.schedule_field_measure_required || 'Yes').trim().toLowerCase() !== 'no';
    const headersList = [
      'Seq #', 'Tons', 'Item Description',
      'Scheduled\nOFA', 'Actual\nOFA', 'Scheduled\nBFA', 'Actual\nBFA'
    ];
    if (showFieldMeasure) {
      headersList.push('Field\nMeasure');
    }
    headersList.push('RTS', 'plant Lead\nTime\n(WEEKS)', 'Scheduled\nErection', 'Budget\nplant\nHours', 'Budget\nField\nHours',
      'plant\nHours\nActual', 'Field\nHours\nActual', 'Detailer /\nVendor',
      'DWG\nStatus', 'Notes');
    const tableHeaders = [headersList];

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
      { cellWidth: 10 }, // SEQ #
      { cellWidth: 12 }, // Tons
      { cellWidth: 'auto' }, // Item Description
      { cellWidth: 12, halign: 'center' }, // schedule OFA
      { cellWidth: 12, halign: 'center' }, // actual OFA
      { cellWidth: 12, halign: 'center' }, // schedule BFA
      { cellWidth: 12, halign: 'center' } // actual BFA
    ];
    if (showFieldMeasure) {
      stylesMap.push({ cellWidth: 14, halign: 'center' }); // Field Measure
    }
    stylesMap.push(
      { cellWidth: 12, halign: 'center' }, // RTS
      { cellWidth: 14, halign: 'center' }, // plant Lead Time
      { cellWidth: 13, halign: 'center' }, // scheduled erection
      { cellWidth: 11 }, // Bud. plant Hr
      { cellWidth: 11 }, // Bud. Field Hr
      { cellWidth: 11 }, // Act. plant Hr
      { cellWidth: 11 }, // Act. Field Hr
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
        doc.setFont(undefined, 'normal'); doc.setTextColor(15, 23, 42); doc.text(project.erection_date || 'N/A', 238, currentY + 5);

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

    doc.save(`Plan_${project.code}.pdf`);
  };



  const handleDetails = async (project, mode = 'edit') => {
    setForm({
      ...project,
      name: project.name || '',
      code: project.code || '',
      customer_name: getCustomerNameForProject(project),
      detailer_name: project.detailer_name || '',
      project_manager_name: project.project_manager_name || '',
      total_ton: project.total_ton || '',
      total_manhours: project.total_manhours || '',
      erection_date: project.erection_date || '',
      status: project.status || 'Yet to Start',
      priority: project.priority || 'Medium'
    });
    setViewMode(mode);
    setIsEditing(true);

    const projSchedules = allSchedules.filter(s => {
      const sId = typeof s.project === 'object' ? s.project.id : s.project;
      return String(sId) === String(project.id);
    }).map(s => ({ ...s, project: project.id }));

    if (projSchedules.length === 0) {
      projSchedules.push(createDefaultRow(project));
    } else {
      projSchedules.sort((a, b) => {
        const aNum = parseFloat(a.seq_no);
        const bNum = parseFloat(b.seq_no);
        if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
        return String(a.seq_no).localeCompare(String(b.seq_no), undefined, { numeric: true });
      });
    }
    setSchedules(projSchedules);
    setDeletedSchedules([]);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.code) {
      alert('Project Name and Code are required');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...form,
        total_ton: parseFloat(form.total_ton) || 0,
        total_manhours: parseFloat(form.total_manhours) || 0,
        erection_date: form.erection_date || null
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
        setForm(res.data); // Update form with new ID to allow subsequent updates if schedule save fails
      }

      // Delete removed schedules
      for (const deleteId of deletedSchedules) {
        try {
          await scheduleAPI.delete(deleteId);
        } catch (err) {
          console.error('Failed to delete schedule:', deleteId, err);
        }
      }

      // Save schedules - skip rows that have no description (prevents mandatory field errors if only basic details are filled)
      for (const row of schedules) {
        if (!row.item_description && !row.tons && row.is_new) continue;

        const schedPayload = {
          project: projectId,
          seq_no: row.seq_no || '1',
          tons: parseFloat(row.tons) || 0,
          item_description: row.item_description || '',
          category: row.category || '',
          scheduled_ofa_date: row.scheduled_ofa_date || null,
          actual_ofa_date: row.actual_ofa_date || null,
          scheduled_bfa_date: row.scheduled_bfa_date || null,
          actual_bfa_date: row.actual_bfa_date || null,
          scheduled_field_measure_date: row.scheduled_field_measure_date || null,
          rts_date: row.rts_date || null,
          plant_lead_time_weeks: parseInt(row.plant_lead_time_weeks) || 0,
          scheduled_erection_date: row.scheduled_erection_date || null,
          budget_plant_hours: parseFloat(row.budget_plant_hours) || 0,
          budget_field_hours: parseFloat(row.budget_field_hours) || 0,
          actual_plant_hours: parseFloat(row.actual_plant_hours) || 0,
          actual_field_hours: parseFloat(row.actual_field_hours) || 0,
          detailer_vendor: row.detailer_vendor || '',
          dwg_status: row.dwg_status || '',
          notes: row.notes || '',
          fabrication_details: (row.fabrication_details || []).map(d => ({
            pieces: d.pieces,
            material_size: d.material_size,
            dimension: d.dimension,
            machine: d.machine
          }))
        };

        if (row.is_new) {
          await scheduleAPI.create(schedPayload);
        } else {
          await scheduleAPI.update(row.id, schedPayload);
        }
      }

      fetchAllSchedules();

      setShowModal(false);
      resetForm();
    } catch (err) {
      console.error('Failed to save project:', err);
      console.error('Error response:', err.response?.data);
      const errorMsg = err.response?.data ? JSON.stringify(err.response.data) : err.message;
      alert(`Failed to save project/schedule: ${errorMsg}`);
    } finally {

      setLoading(false);
    }
  };

  const autocalculateManhourTon = () => {
    const ton = parseFloat(form.total_ton) || 0;
    const hours = parseFloat(form.total_manhours) || 0;
    return ton > 0 ? (hours / ton).toFixed(2) : '0';
  };

  const resetForm = () => {
    setForm({
      name: '', code: '', customer_name: '', detailer_name: '',
      project_manager_name: '', total_ton: '', total_manhours: '',
      erection_date: '', status: 'In Progress', priority: 'Medium',
      plant_name: '', schedule_field_measure_required: 'Yes'
    });
    setIsEditing(false);
    setInitialTab("basic");
    setSchedules([createDefaultRow({})]);
    setDeletedSchedules([]);
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

  const exportToCSV = () => {
    const headers = ["Project Code", "Project Name", "Customer", "PM", "Priority", "Status", "Total Ton"];
    const rows = filtered.map(p => [
      p.code,
      p.name,
      getCustomerNameForProject(p),
      p.project_manager_name,
      p.priority,
      p.status,
      p.total_ton
    ]);

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "projects_master.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filtered = projects.filter(p => {
    const customerName = getCustomerNameForProject(p);
    const matchesSearch = (p.name?.toLowerCase() || '').includes(search.toLowerCase()) ||
      (p.code?.toLowerCase() || '').includes(search.toLowerCase()) ||
      (customerName?.toLowerCase() || '').includes(search.toLowerCase());

    const matchesStatus = statusFilter === 'All' || p.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = filtered.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="min-h-screen bg-slate-50/30 p-4 lg:p-8 space-y-6">
      {/* Top Professional Header */}


      <div className="space-y-4 animate-fade-in">
        {/* Error Message */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 text-sm font-bold animate-shake">
            <AlertCircle className="w-5 h-5" />
            {error}
            <button onClick={fetchProjects} className="ml-auto underline">Try Again</button>
          </div>
        )}
        {/* Control Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search projects by name, code or customer..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
              className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-slate-200 text-sm outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-500/5 transition-all"
            />
            {search && (
              <button
                onClick={() => { setSearch(''); setCurrentPage(1); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-slate-100 text-slate-400"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              className="px-4 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-600 text-sm font-semibold outline-none focus:border-amber-400 transition-all"
            >
              <option value="All">All Statuses</option>
              <option value="In Progress">In Progress</option>
              <option value="Yet to Start">Yet to Start</option>
              <option value="Completed">Completed</option>
            </select>
            <button
              onClick={exportToCSV}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-all"
            >
              <Download className="w-4 h-4" /> Export CSV
            </button>
            <button
              onClick={() => {
                resetForm();
                setViewMode('edit');
                setShowModal(true);
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-bold shadow-lg shadow-amber-500/20 hover:from-amber-400 hover:to-orange-400 transition-all"
            >
              <Plus className="w-4 h-4" /> Add Project
            </button>
          </div>
        </div>

        {/* Table Section */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gradient-to-r from-amber-500 to-orange-500 text-white">
                  <th className="px-2 py-3 text-[10px] font-black uppercase tracking-wider border-b border-white/10 border-r border-white/5 min-w-[120px]">Project Name</th>
                  <th className="px-2 py-3 text-[10px] font-black uppercase tracking-wider border-b border-white/10 border-r border-white/5 w-20">Code</th>
                  <th className="px-2 py-3 text-[10px] font-black uppercase tracking-wider border-b border-white/10 border-r border-white/5 min-w-[100px]">Customer Name</th>
                  <th className="px-2 py-3 text-[10px] font-black uppercase tracking-wider border-b border-white/10 border-r border-white/5">Detailer Name</th>
                  <th className="px-2 py-3 text-[10px] font-black uppercase tracking-wider border-b border-white/10 border-r border-white/5">Manager</th>
                  <th className="px-2 py-3 text-[10px] font-black uppercase tracking-wider border-b border-white/10 border-r border-white/5">Erection</th>
                  <th className="px-2 py-3 text-[10px] font-black uppercase tracking-wider border-b border-white/10 border-r border-white/5">Priority</th>
                  <th className="px-2 py-3 text-[10px] font-black uppercase tracking-wider border-b border-white/10 border-r border-white/5">Ton</th>
                  <th className="px-2 py-3 text-[10px] font-black uppercase tracking-wider border-b border-white/10 border-r border-white/5">MH's</th>
                  <th className="px-2 py-3 text-[10px] font-black uppercase tracking-wider border-b border-white/10 border-r border-white/5">MH's/Ton</th>
                  <th className="px-2 py-3 text-[10px] font-black uppercase tracking-wider border-b border-white/10 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {loading ? (
                  <tr>
                    <td colSpan="11" className="py-20 text-center">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto text-amber-500 mb-2" />
                      <p className="text-xs font-bold text-slate-400">Loading projects...</p>
                    </td>
                  </tr>
                ) : paginatedData.length > 0 ? paginatedData.map((p) => (
                  <tr key={p.id} className="transition-colors group text-[12px] border-b border-slate-100">
                    <td className="px-2 py-3 font-bold text-slate-800 border-r border-slate-100 break-words leading-tight">{p.name}</td>
                    <td className="px-2 py-3 font-mono text-[10px] text-slate-500 border-r border-slate-100">{p.code}</td>
                    <td className="px-2 py-3 text-slate-700 border-r border-slate-100 break-words leading-tight">{getCustomerNameForProject(p)}</td>
                    <td className="px-2 py-3 text-slate-700 border-r border-slate-100 leading-tight">{p.detailer_name || 'N/A'}</td>
                    <td className="px-2 py-3 text-slate-700 border-r border-slate-100 leading-tight">{p.project_manager_name || 'N/A'}</td>
                    <td className="px-2 py-3 text-slate-600 font-medium border-r border-slate-100">
                      {p.erection_date ? formatDate(p.erection_date) : 'N/A'}
                    </td>
                    <td className="px-2 py-3 border-r border-slate-100 text-center">
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${p.priority === 'High' ? 'bg-red-50 text-red-600 border border-red-100' :
                        p.priority === 'Medium' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                          'bg-emerald-50 text-emerald-600 border border-emerald-100'
                        }`}>
                        {p.priority}
                      </span>
                    </td>
                    <td className="px-2 py-3 font-bold text-slate-700 border-r border-slate-100 text-center">{p.total_ton}</td>
                    <td className="px-2 py-3 text-slate-600 border-r border-slate-100 text-center">{p.total_manhours}</td>
                    <td className="px-2 py-3 border-r border-slate-100 text-center font-bold text-amber-600">
                      {(() => {
                        const ton = parseFloat(p.total_ton) || 0;
                        const hours = parseFloat(p.total_manhours) || 0;
                        return ton > 0 ? (hours / ton).toFixed(2) : '0';
                      })()}
                    </td>
                    <td className="px-2 py-3 text-right">
                      <div className="flex items-center justify-end gap-0.5">
                        <button onClick={() => downloadProjectPDF(p)} className="p-1 rounded text-indigo-500 hover:bg-indigo-50" title="Structural Plan">
                          <FileText className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDetails(p, 'view')} className="p-1 rounded text-amber-500 hover:bg-amber-50" title="View">
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
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="11" className="px-6 py-12 text-center text-slate-500 italic">No projects found matching your search.</td>
                  </tr>
                )}

              </tbody>
            </table>
          </div>

          {/* Pagination & Footer */}
          <div className="bg-slate-50 px-4 py-3 border-t border-slate-100 flex items-center justify-between">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {filtered.length} {filtered.length === 1 ? 'Record' : 'Records'} Found
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => prev - 1)}
                className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-40 hover:bg-slate-50 transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-1">
                {[...Array(totalPages)].map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentPage(i + 1)}
                    className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${currentPage === i + 1 ? 'bg-amber-500 text-white shadow-md' : 'text-slate-600 hover:bg-slate-200'}`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => prev + 1)}
                className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-40 hover:bg-slate-50 transition-all"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {showModal && (
        <ProjectForm
          form={form}
          schedules={schedules}
          addScheduleRow={addScheduleRow}
          handleScheduleChange={handleScheduleChange}
          handleDeleteSchedule={handleDeleteSchedule}
          initialTab="basic"
          showTabs={false}
          setForm={setForm}
          handleSave={handleSave}
          mode={viewMode}
          onClose={() => setShowModal(false)}
          isEditing={isEditing}
          loading={loading}
          autocalculateManhourTon={autocalculateManhourTon}
        />
      )}
    </div>
  );
}