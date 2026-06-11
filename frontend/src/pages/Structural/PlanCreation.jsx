import { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Plus, Search, Edit2, Trash2, Eye, FileText, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { projectAPI, scheduleAPI } from '../../services/api';
import ProjectForm from '../../components/forms/ProjectForm';
import GanttChart from '../../components/GanttChart';

export default function PlanCreation() {
  const formatDateToMMDDYYYY = (dStr) => {
    if (!dStr) return 'N/A';
    const parts = dStr.split('-');
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        return `${parts[1]}-${parts[2]}-${parts[0]}`;
      }
      if (parts[2].length === 4) {
        return `${parts[1]}-${parts[0]}-${parts[2]}`;
      }
    }
    const d = new Date(dStr);
    if (isNaN(d.getTime())) return 'N/A';
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${mm}-${dd}-${yyyy}`;
  };

  const [projects, setProjects] = useState([]);
  // State to hold the generated Gantt PDF URL and the project being viewed
  const [ganttUrl, setGanttUrl] = useState(null);
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
    plant_name: '', schedule_field_measure_required: 'Yes'
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

  // Recalculate all budget plant hours if project-wide manhour/ton changes
  useEffect(() => {
    const mhTon = parseFloat(autocalculateManhourTon());
    if (schedules.length > 0 && mhTon > 0) {
      setSchedules(prev => prev.map(row => {
        const rowTons = parseFloat(row.tons) || 0;
        const newBudget = (mhTon * rowTons).toFixed(2);
        if (row.budget_plant_hours === newBudget) return row;
        return { ...row, budget_plant_hours: newBudget };
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


  const createDefaultRow = (projectData) => ({
    id: Date.now(),
    is_new: true,
    project: projectData.id || '',
    seq_no: '1',
    tons: '',
    item_description: '',
    category: '',
    scheduled_erection_date: projectData.erection_date || '',
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
        const dateFields = ['scheduled_ofa_date', 'actual_ofa_date', 'scheduled_bfa_date', 'actual_bfa_date', 'scheduled_field_measure_date', 'rts_date', 'ship_date', 'scheduled_erection_date'];
        const schedPayload = { ...row, project: projectId, tons: parseFloat(row.tons) || 0 };
        dateFields.forEach(f => { if (!schedPayload[f]) schedPayload[f] = null; });
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
      plant_name: '', schedule_field_measure_required: 'Yes'
    });
    setSchedules([createDefaultRow({})]);
    setDeletedSchedules([]);
    setIsEditing(false);
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

  const generateGanttPdf = (project) => {
    const projectSchedules = allSchedules.filter(s => {
      const sId = typeof s.project === 'object' ? s.project.id : s.project;
      return String(sId) === String(project.id);
    });

    if (projectSchedules.length === 0) {
      alert("No schedule data found for this project.");
      return;
    }

    const doc = new jsPDF('l', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

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

    const fmtDate = dStr => {
      if (!dStr) return 'N/A';
      const d = new Date(dStr);
      if (isNaN(d.getTime())) return 'N/A';
      return `${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}-${d.getFullYear()}`;
    };

    const fmtShort = d => {
      if (!d) return '';
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const sortedSchedules = [...projectSchedules].sort((a, b) => {
      const aNum = parseFloat(a.seq_no);
      const bNum = parseFloat(b.seq_no);
      if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
      return String(a.seq_no).localeCompare(String(b.seq_no), undefined, { numeric: true });
    });

    const darkBlue = [30, 41, 59];
    const medGray = [100, 116, 139];

    // ═══════════════════════════════════════════════════════════
    // SECTION 1: STRUCTURAL SCHEDULE
    // ═══════════════════════════════════════════════════════════
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(...darkBlue);
    doc.text('STRUCTURAL SCHEDULE', 14, 20);

    // Project info - left
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('PROJECT NAME:', 14, 32);
    doc.setFont('helvetica', 'normal');
    doc.text(project.name || 'N/A', 52, 32);

    doc.setFont('helvetica', 'bold');
    doc.text('CUSTOMER:', 14, 38);
    doc.setFont('helvetica', 'normal');
    doc.text(project.customer_name || 'N/A', 40, 38);

    doc.setFont('helvetica', 'bold');
    doc.text('DETAILER:', 14, 44);
    doc.setFont('helvetica', 'normal');
    doc.text(project.detailer_name || 'N/A', 38, 44);

    // Project info - right
    doc.setFont('helvetica', 'bold');
    doc.text('PROJECT CODE:', 160, 32);
    doc.setFont('helvetica', 'normal');
    doc.text(String(project.code || 'N/A'), 198, 32);

    doc.setFont('helvetica', 'bold');
    doc.text('MANAGER:', 160, 38);
    doc.setFont('helvetica', 'normal');
    doc.text(project.project_manager_name || 'N/A', 186, 38);

    // Schedule table
      const isFMRequired = (project?.schedule_field_measure_required || 'Yes').trim().toLowerCase() !== 'no';
      const tableHeaders = [
        'Seq #', 'Tons', 'Item Description',
        'Scheduled\nOFA', 'Actual\nOFA', 'Scheduled\nBFA', 'Actual\nBFA',
        ...(isFMRequired ? ['Field\nMeasure'] : []),
        'RTS', 'plant Lead\nTime\n(WEEKS)',
        'Scheduled\nErection', 'Budget\nplant\nHours', 'Budget\nField\nHours',
        'plant\nHours\nActual', 'Field\nHours\nActual', 'Detailer /\nVendor',
        'DWG\nStatus', 'Notes'
      ];

    const tableData = sortedSchedules.map(s => [
      s.seq_no || '',
      s.tons ? parseFloat(s.tons).toFixed(2) : '',
      s.item_description || '',
      fmtDate(s.scheduled_ofa_date),
      fmtDate(s.actual_ofa_date),
      fmtDate(s.scheduled_bfa_date),
      fmtDate(s.actual_bfa_date),
      ...(isFMRequired ? [fmtDate(s.scheduled_field_measure_date)] : []),
      fmtDate(s.rts_date),
      s.plant_lead_time_weeks || '0',
      fmtDate(s.scheduled_erection_date),
      s.budget_plant_hours || '0.00',
      s.budget_field_hours || '0.00',
      s.actual_plant_hours || '0.00',
      s.actual_field_hours || '0.00',
      s.detailer_vendor || '',
      s.dwg_status || '',
      s.notes || ''
    ]);

    autoTable(doc, {
      head: [tableHeaders],
      body: tableData,
      startY: 50,
      margin: { left: 8, right: 8 },
      styles: {
        fontSize: 5.5, cellPadding: 1.5,
        lineColor: [203, 213, 225], lineWidth: 0.3,
        textColor: darkBlue, valign: 'middle', halign: 'center', overflow: 'linebreak',
      },
      headStyles: {
        fillColor: darkBlue, textColor: [255, 255, 255],
        fontSize: 5, fontStyle: 'bold', halign: 'center', valign: 'middle', cellPadding: 2,
      },
      columnStyles: {
        0: { cellWidth: 10 }, 1: { cellWidth: 12 }, 2: { cellWidth: 28 }, 3: { cellWidth: 16 },
        4: { cellWidth: 18 }, 5: { cellWidth: 14 }, 6: { cellWidth: 18 }, 7: { cellWidth: 14 },
        8: { cellWidth: 18 }, 9: { cellWidth: 18 }, 10: { cellWidth: 12 }, 11: { cellWidth: 18 },
        12: { cellWidth: 12 }, 13: { cellWidth: 12 }, 14: { cellWidth: 12 }, 15: { cellWidth: 12 },
        16: { cellWidth: 16 }, 17: { cellWidth: 14 }, 18: { cellWidth: 16 },
      },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    });

    // ═══════════════════════════════════════════════════════════
    // SECTION 2: STRUCTURAL GANTT CHART (new page)
    // ═══════════════════════════════════════════════════════════
    doc.addPage();

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(...darkBlue);
    doc.text('STRUCTURAL GANTT CHART', 14, 18);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('PROJECT NAME:', 14, 28);
    doc.setFont('helvetica', 'normal');
    doc.text(project.name || 'N/A', 52, 28);

    doc.setFont('helvetica', 'bold');
    doc.text('PROJECT CODE:', 120, 28);
    doc.setFont('helvetica', 'normal');
    doc.text(String(project.code || 'N/A'), 158, 28);

    doc.setFont('helvetica', 'bold');
    doc.text('ERECTION DATE:', 200, 28);
    doc.setFont('helvetica', 'normal');
    doc.text(fmtDate(project.erection_date), 238, 28);

    // Timeline range
    let earliest = null;
    let latest = null;
    sortedSchedules.forEach(s => {
      const ofa = parseDate(s.scheduled_ofa_date);
      const bfa = parseDate(s.scheduled_bfa_date);
      const rts = parseDate(s.rts_date);
      const erection = parseDate(s.scheduled_erection_date) || parseDate(project?.erection_date);
      const fieldMeasure = parseDate(s.scheduled_field_measure_date);
      const awardedDate = project?.awarded_job_no_date ? parseDate(project.awarded_job_no_date) : null;

      const dates = [ofa, bfa, rts, erection, fieldMeasure, awardedDate].filter(Boolean);
      if (dates.length > 0) {
        const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
        const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
        if (!earliest || minDate < earliest) earliest = minDate;
        if (!latest || maxDate > latest) latest = maxDate;
      }
    });
    if (!earliest) earliest = new Date();
    if (!latest || latest <= earliest) latest = new Date(earliest.getTime() + 90 * 86400000);

    const tlStart = new Date(earliest.getFullYear(), earliest.getMonth(), 1);
    const tlEnd = new Date(latest.getFullYear(), latest.getMonth() + 1, 1);
    const tlMs = tlEnd.getTime() - tlStart.getTime();

    const labelColX = 14;
    const labelColW = 60;
    const chartX = labelColX + labelColW;
    const chartW = pageWidth - chartX - 14;
    const getXPos = date => { if (!date) return chartX; return chartX + ((date.getTime() - tlStart.getTime()) / tlMs) * chartW; };

    // Month columns
    const months = [];
    let cur = new Date(tlStart);
    while (cur < tlEnd) {
      const ms = new Date(cur.getFullYear(), cur.getMonth(), 1);
      const nm = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
      const ss = new Date(Math.max(ms.getTime(), tlStart.getTime()));
      const se = new Date(Math.min(nm.getTime(), tlEnd.getTime()));
      if (ss < se) {
        months.push({
          label: ms.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
          x: chartX + ((ss.getTime() - tlStart.getTime()) / tlMs) * chartW,
          width: ((se.getTime() - ss.getTime()) / tlMs) * chartW,
        });
      }
      cur = nm;
    }

    // Header row
    let gy = 36;
    const hH = 8;
    doc.setFillColor(241, 245, 249);
    doc.rect(labelColX, gy, labelColW, hH, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.rect(labelColX, gy, labelColW, hH, 'S');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6);
    doc.setTextColor(...darkBlue);
    doc.text('SEQUENCE DESCRIPTION', labelColX + 2, gy + 5);

    months.forEach(m => {
      doc.setFillColor(241, 245, 249);
      doc.rect(m.x, gy, m.width, hH, 'F');
      doc.setDrawColor(203, 213, 225);
      doc.rect(m.x, gy, m.width, hH, 'S');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(...darkBlue);
      doc.text(m.label, m.x + m.width / 2, gy + 5, { align: 'center' });
    });
    gy += hH;

    const getStatus = (start, end) => {
      if (!start || !end) return { label: 'TBD', color: [156, 163, 175] };
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      if (end < today) return { label: 'Completed', color: [34, 197, 94] };
      if (start > today) return { label: 'Yet to Start', color: [59, 130, 246] };
      return { label: 'In Progress', color: [245, 158, 11] };
    };

      const milestoneColors = {
        scheduled_ofa_date: [139, 92, 246], actual_ofa_date: [107, 114, 128],
        scheduled_bfa_date: [6, 182, 212], actual_bfa_date: [20, 184, 166],
        ...(isFMRequired ? { scheduled_field_measure_date: [249, 115, 22] } : {}),
        rts_date: [30, 41, 59],
        scheduled_erection_date: [79, 70, 229],
      };

    const rowH = 14;
    sortedSchedules.forEach(s => {
      if (gy + rowH > pageHeight - 30) { doc.addPage(); gy = 20; }

      let start = parseDate(s.scheduled_ofa_date) || parseDate(s.scheduled_bfa_date) || parseDate(s.rts_date);
      let end = parseDate(s.scheduled_erection_date) || parseDate(s.rts_date);

      if (!start && end) start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
      if (!end && start) end = new Date(start.getTime() + 30 * 24 * 60 * 60 * 1000);

      const status = getStatus(start, end);

      // Label cell
      doc.setFillColor(255, 255, 255);
      doc.rect(labelColX, gy, labelColW, rowH, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.rect(labelColX, gy, labelColW, rowH, 'S');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6);
      doc.setTextColor(...darkBlue);
      doc.text(`Seq ${s.seq_no}: ${s.item_description || ''}`, labelColX + 2, gy + 5);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5);
      doc.setTextColor(...medGray);
      doc.text(`${s.tons ? parseFloat(s.tons).toFixed(2) : '0.00'} Tons`, labelColX + 2, gy + 10);

      // Timeline grid
      months.forEach(m => { doc.setDrawColor(226, 232, 240); doc.rect(m.x, gy, m.width, rowH, 'S'); });

      // Bar
      if (start && end) {
        const bx = getXPos(start);
        const bex = getXPos(end);
        const bw = Math.max(bex - bx, 2);
        const by = gy + 3;
        const bh = 5;
        doc.setFillColor(...status.color);
        doc.roundedRect(bx, by, bw, bh, 1, 1, 'F');

        // Date range label
        const rangeLabel = `${fmtShort(start)} - ${fmtShort(end)}`;
        doc.setFontSize(4.5);
        if (bw > 30) {
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(255, 255, 255);
          doc.text(rangeLabel, bx + bw / 2, by + 3.5, { align: 'center' });
        } else {
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(...darkBlue);
          doc.text(rangeLabel, bex + 2, by + 3.5);
        }

        // Milestone dots
        const dotR = 1.0;
        const haloR = 1.4;
        const dotY = by + bh / 2;
        Object.entries(milestoneColors).forEach(([field, color]) => {
          const mDate = parseDate(s[field]);
          if (mDate) {
            const dx = getXPos(mDate);
            if (dx >= chartX && dx <= chartX + chartW) {
              // White halo
              doc.setFillColor(255, 255, 255);
              doc.circle(dx, dotY, haloR, 'F');
              // Colored dot
              doc.setFillColor(...color);
              doc.circle(dx, dotY, dotR, 'F');
            }
          }
        });
      }
      gy += rowH;
    });

    // ═══════════════════════════════════════════════════════════
    // LEGEND
    // ═══════════════════════════════════════════════════════════
    const legY = pageHeight - 22;
    doc.setDrawColor(226, 232, 240);
    doc.line(14, legY - 4, pageWidth - 14, legY - 4);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6);
    doc.setTextColor(...darkBlue);
    doc.text('BAR COLORS:', 14, legY);

    let xOffset = 35;
    const barLegend = [
      { l: 'Yet to Start', c: [59, 130, 246] },
      { l: 'In Progress', c: [245, 158, 11] },
      { l: 'Completed', c: [34, 197, 94] }
    ];

    barLegend.forEach(st => {
      doc.setFillColor(...st.c);
      doc.rect(xOffset, legY - 2.5, 5, 2.5, 'F');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5.5);
      doc.setTextColor(...medGray);
      doc.text(st.l, xOffset + 6, legY);
      xOffset += 25;
    });

    // --- Milestone Dots Legend ---
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6);
    doc.setTextColor(...darkBlue);
    doc.text('MILESTONE DOTS:', 115, legY);

    const dotLegend1 = [
      { name: "Scheduled OFA", color: [139, 92, 246], x: 142 },
      { name: "Actual OFA", color: [107, 114, 128], x: 177 },
      { name: "Scheduled BFA", color: [6, 182, 212], x: 212 },
      { name: "Actual BFA", color: [20, 184, 166], x: 247 }
    ];

    dotLegend1.forEach(st => {
      doc.setFillColor(...st.color);
      doc.circle(st.x, legY - 1, 1.2, 'F');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5.5);
      doc.setTextColor(...medGray);
      doc.text(st.name, st.x + 2.5, legY);
    });

    // Line 2 for Milestone dots
    const legY2 = legY + 5;
    const dotLegend2 = [
      ...(isFMRequired ? [{ name: "Field Measure", color: [249, 115, 22], x: 142 }] : []),
      { name: "RTS", color: [30, 41, 59], x: 177 },
      { name: "Scheduled Erection", color: [79, 70, 229], x: 212 }
    ];

    dotLegend2.forEach(st => {
      doc.setFillColor(...st.color);
      doc.circle(st.x, legY2 - 1, 1.2, 'F');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5.5);
      doc.setTextColor(...medGray);
      doc.text(st.name, st.x + 2.5, legY2);
    });

    // ═══════════════════════════════════════════════════════════
    // FOOTER: Generated date + Page X of Y
    // ═══════════════════════════════════════════════════════════
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6);
      doc.setTextColor(...medGray);
      const now = new Date();
      doc.text(`Generated: ${now.getMonth()+1}/${now.getDate()}/${now.getFullYear()} ${now.toLocaleTimeString()}`, 14, pageHeight - 6);
      doc.text(`Page ${i} of ${totalPages}`, pageWidth - 14, pageHeight - 6, { align: 'right' });
    }

    doc.save(`StructuralPlan_${project.code}.pdf`);
  };

  const handleViewGantt = (project) => {
    const url = generateGanttPdf(project);
    if (url) {
      setGanttUrl(url);
      setViewProjectId(project.id);
    }
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
          onClick={() => { resetForm(); setViewMode('edit'); setShowModal(true); }}
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
                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider">Erection Date</th>
                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedData.flatMap(p => [
                <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 text-slate-900 text-sm font-medium border-r border-slate-100">{p.name}</td>
                  <td className="px-4 py-3 text-slate-900 text-sm font-medium border-r border-slate-100">{p.code}</td>
                  <td className="px-4 py-3 text-slate-900 text-sm font-medium border-r border-slate-100">{p.customer_name || 'N/A'}</td>
                  <td className="px-4 py-3 text-slate-900 text-sm font-medium border-r border-slate-100">{formatDateToMMDDYYYY(p.erection_date)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-0.5">
                      <button onClick={() => generateGanttPdf(p)} className="p-1 rounded text-indigo-500 hover:bg-indigo-50" title="Structural Plan">
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
                    <td colSpan={5} className="p-4">
                      <GanttChart project={p} allSchedules={allSchedules} showFieldMeasure={p.schedule_field_measure_required?.trim().toLowerCase() !== 'no'} />
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
              plant_name: selected.plant_name || '',
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
                updated.budget_plant_hours = (mhTon * rowTons).toFixed(2);
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
