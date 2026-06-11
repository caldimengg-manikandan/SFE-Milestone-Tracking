import { useState, useEffect } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { projectAPI, rfqAPI } from '../../services/api';
import { Layers, Loader2, HelpCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import SearchableDropdown from '../../components/SearchableDropdown';


export default function EstimationErectionLayout() {
  const [projects, setProjects] = useState([]);
  const [rfqs, setRfqs] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(() => {
    return localStorage.getItem('sfe_erection_project_id') || '';
  });
  const [selectedProject, setSelectedProject] = useState(null);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  // Tab items
  const tabs = [
    { name: 'Contracts', path: 'contacts' },
    { name: 'Estimation Model', path: 'estimation' },
    { name: 'Erection Take-off', path: 'erection-takeoff' },
    { name: 'Field Moment Conn.', path: 'fmc' },
    { name: 'Misc Metals', path: 'misc-metals' },
    { name: 'Breakdown', path: 'breakdown' },
    { name: 'Estimate Datas', path: 'estimate-data' },
  ];

  // Fetch all projects and RFQs
  const fetchProjectsAndRfqs = async () => {
    try {
      setLoadingProjects(true);
      const [projRes, rfqRes] = await Promise.all([
        projectAPI.getAll({ page_size: 1000 }),
        rfqAPI.getAll()
      ]);
      const projData = projRes.data.results || projRes.data;
      const rfqData = rfqRes.data.results || rfqRes.data;
      
      if (Array.isArray(projData)) {
        setProjects(projData);
      }
      if (Array.isArray(rfqData)) {
        const sortedRfqs = [...rfqData].sort((a, b) => {
          const aNo = a.sfe_job_no || 0;
          const bNo = b.sfe_job_no || 0;
          return bNo - aNo;
        });
        setRfqs(sortedRfqs);
      }
    } catch (err) {
      console.error('Failed to fetch projects/RFQs:', err);
      toast.error('Failed to load projects list');
    } finally {
      setLoadingProjects(false);
    }
  };

  useEffect(() => {
    fetchProjectsAndRfqs();
  }, []);

  // Fetch selected project details when ID changes
  const fetchProjectDetails = async (id, showLoader = true) => {
    if (!id) {
      setSelectedProject(null);
      return;
    }
    if (String(id).startsWith('rfq_')) {
      setSelectedProject(null);
      return;
    }
    try {
      if (showLoader) setLoadingDetails(true);
      const res = await projectAPI.getById(id);
      setSelectedProject(res.data);
    } catch (err) {
      console.error('Failed to fetch project details:', err);
      toast.error('Failed to load project details');
    } finally {
      if (showLoader) setLoadingDetails(false);
    }
  };

  useEffect(() => {
    fetchProjectDetails(selectedProjectId);
    if (selectedProjectId) {
      localStorage.setItem('sfe_erection_project_id', selectedProjectId);
    } else {
      localStorage.removeItem('sfe_erection_project_id');
    }
  }, [selectedProjectId]);

  const handleProjectChange = (e) => {
    setSelectedProjectId(e.target.value);
  };

  // Compute unified list of options
  const dropdownOptions = (() => {
    const options = [];
    const mappedProjectIds = new Set();
    const mappedProjectCodes = new Set();
    const mappedProjectNames = new Set();
    
    // First map all RFQs
    rfqs.forEach(rfq => {
      const code = rfq.sfe_job_no ? String(rfq.sfe_job_no) : rfq.quote_no;
      const matchedProj = projects.find(p => p.code === code || p.name === rfq.project_name);
      if (matchedProj) {
        options.push({
          id: String(matchedProj.id),
          label: `${matchedProj.code} — ${matchedProj.name}`,
          isSynced: true
        });
        mappedProjectIds.add(String(matchedProj.id));
        mappedProjectCodes.add(matchedProj.code);
        mappedProjectNames.add(matchedProj.name);
      } else {
        options.push({
          id: `rfq_${rfq.id}`,
          label: `#${code} — ${rfq.project_name} (Unsynced)`,
          isSynced: false
        });
      }
    });
    
    // Add any remaining projects that were not matched to an RFQ
    projects.forEach(proj => {
      if (!mappedProjectIds.has(String(proj.id)) && !mappedProjectCodes.has(proj.code) && !mappedProjectNames.has(proj.name)) {
        options.push({
          id: String(proj.id),
          label: `${proj.code} — ${proj.name}`,
          isSynced: true
        });
      }
    });
    
    return options;
  })();

  return (
    <div className="w-full h-full flex flex-col overflow-hidden bg-slate-50/50">
      {/* Top Header Selector & Nav */}
      <div className="bg-white border-b border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between px-6 py-3 gap-4 shrink-0">

        {/* Project Selector */}
        <div className="flex items-center gap-3 w-full md:w-auto max-w-md">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
            Select Project:
          </label>
          {loadingProjects ? (
            <div className="flex items-center gap-2 text-xs text-slate-400 font-bold px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 w-48">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500" />
              Loading...
            </div>
          ) : (
            <SearchableDropdown
              options={dropdownOptions}
              value={selectedProjectId}
              onChange={handleProjectChange}
              placeholder="-- Choose Project --"
              containerClassName="w-full md:w-64"
              className="px-3 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 outline-none transition-all cursor-pointer"
            />
          )}
        </div>
      </div>

      {/* Tabs list (disabled if no project is selected or if project is unsynced) */}
      <div className="bg-white border-b border-slate-200 px-6 flex gap-6 items-center height-[44px] shrink-0 overflow-x-auto scrollbar-none">
        {tabs.map((tab) => {
          const isDisabled = (!selectedProjectId || String(selectedProjectId).startsWith('rfq_')) && tab.path !== 'estimation';
          return isDisabled ? (
            <span
              key={tab.path}
              className="inline-flex items-center h-[44px] px-1 py-3 text-xs font-bold text-slate-350 cursor-not-allowed select-none border-b-2 border-transparent"
              title="Please select a project first"
            >
              {tab.name}
            </span>
          ) : (
            <NavLink
              key={tab.path}
              to={tab.path}
              className={({ isActive }) => `
                inline-flex items-center h-[44px] px-1 py-3 text-xs font-bold transition-all border-b-2 tracking-wide uppercase
                ${isActive
                  ? 'text-amber-500 border-amber-500 font-extrabold'
                  : 'text-slate-500 border-transparent hover:text-slate-700 hover:border-slate-300'
                }
              `}
            >
              {tab.name}
            </NavLink>
          );
        })}
      </div>

      {/* Dynamic Content Outlet */}
      <div className="flex-1 overflow-auto flex flex-col">
        {!selectedProjectId && !location.pathname.endsWith('/estimation') ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center max-w-lg mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-500 mb-4 animate-pulse">
              <HelpCircle className="w-8 h-8" />
            </div>
            <h3 className="text-md font-bold text-slate-800">No Project Selected</h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Please select a project from the dropdown at the top right to start view, configure, and manage erection takeoff schedules, connections, miscellaneous metals, cost codes and final bid summary details.
            </p>
          </div>
        ) : loadingDetails ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-amber-500 mb-2" />
            <p className="text-xs font-bold text-slate-400">Loading project details...</p>
          </div>
        ) : (
          <Outlet context={{ projectId: selectedProjectId, project: selectedProject, setSelectedProjectId, refreshProject: () => fetchProjectDetails(selectedProjectId, false) }} />
        )}
      </div>
    </div>
  );
}
