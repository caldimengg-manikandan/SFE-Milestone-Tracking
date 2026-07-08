import React, { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import api from "../../services/api";
import { useAutoSave } from "../../hooks/useAutoSave";
import AutoSaveIndicator from "../../components/AutoSaveIndicator";
import { CheckSquare, Lock, Calendar, FileText, ChevronDown } from "lucide-react";

export default function EstimateDataTab() {
  const { projectId, project, refreshProject } = useOutletContext();
  const isReadOnly = project?.is_finalized || false;

  const [costCodes, setCostCodes] = useState({});
  const [sovLines, setSovLines] = useState([]);
  const [snapshots, setSnapshots] = useState([]);
  const [loading, setLoading] = useState(true);
  const { saveState, lastSaved, triggerSave } = useAutoSave();

  // Flags Form
  const [prevailingWage, setPrevailingWage] = useState(false);
  const [outOfTown, setOutOfTown] = useState(false);

  // Finalize dialog
  const [showFinalizeModal, setShowFinalizeModal] = useState(false);
  const [confirmName, setConfirmName] = useState("");

  const fetchEstimateData = async () => {
    try {
      const [eRes, sRes] = await Promise.all([
        api.get(`projects/${projectId}/estimate-data/`),
        api.get(`projects/${projectId}/estimate-data/snapshots/`),
      ]);

      setCostCodes(eRes.data);
      setSnapshots(sRes.data.results || sRes.data || []);

      const backendSOV = eRes.data.sov_lines || [];
      
      // Auto-initialize default 7 SOV lines if not present
      const defaultSOVs = [
        { code: "50", description: "Bond" },
        { code: "100", description: "Drawings" },
        { code: "200", description: "Steel" },
        { code: "300", description: "Joist" },
        { code: "400", description: "Deck" },
        { code: "500", description: "Miscellaneous Metals" },
        { code: "600", description: "Erection" },
      ];

      // If backend returned fewer than 7 SOVs, seed the missing ones
      if (backendSOV.length < 7 && !isReadOnly) {
        const seededSOVs = [];
        for (const def of defaultSOVs) {
          const match = backendSOV.find((s) => s.code === def.code);
          if (match) {
            seededSOVs.push(match);
          } else {
            const seedRes = await api.post(`projects/${projectId}/estimate-data/sov/`, {
              code: def.code,
              description: def.description,
              amount: 0.00,
            });
            seededSOVs.push(seedRes.data);
          }
        }
        setSovLines(seededSOVs.sort((a, b) => parseInt(a.code) - parseInt(b.code)));
      } else {
        setSovLines(backendSOV.sort((a, b) => parseInt(a.code) - parseInt(b.code)));
      }
    } catch (err) {
      console.error("Failed to load estimate data details:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (project) {
      setPrevailingWage(!!project.prevailing_wage);
      setOutOfTown(!!project.out_of_town);
      setConfirmName(project.preparer_name || "");
    }
  }, [project]);

  const handleDownload = async (type) => {
    try {
      const response = await api.get(`projects/${projectId}/export/${type}/`, {
        responseType: 'blob',
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const extension = type === 'xlsx' ? 'xlsx' : 'pdf';
      link.setAttribute('download', `Estimate_${project?.job_number || projectId}.${extension}`);
      document.body.appendChild(link);
      link.click();
      
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error(`Failed to download ${type}:`, error);
      alert(`Failed to download ${type.toUpperCase()}`);
    }
  };

  useEffect(() => {
    fetchEstimateData();
  }, [projectId]);

  const handleSOVAmountChange = (lineId, code, val) => {
    const updated = sovLines.map((line) => {
      if (line.id === lineId) {
        return { ...line, amount: val };
      }
      return line;
    });
    setSovLines(updated);

    if (!isReadOnly) {
      triggerSave(async () => {
        await api.patch(`projects/${projectId}/estimate-data/sov/${lineId}/`, {
          amount: parseFloat(val) || 0,
        });
      });
    }
  };

  const handleCostCodeChange = (code, value) => {
    const keyMapping = {
      "1.01": "shop_labor",
      "1.02": "shop_subcontract",
      "1.03": "steel_material",
      "1.05": "grating_material",
      "1.08": "other_material",
      "1.09": "anodizing_finish",
      "1.10": "galvanizing",
      "2.01": "field_labor"
    };
    const fieldKey = keyMapping[code];
    if (!fieldKey) return;

    const parsedVal = value === '' ? 0 : parseFloat(value) || 0;
    const updatedCostCodes = { ...costCodes };
    updatedCostCodes[fieldKey] = parsedVal;

    const codesList = [
      { code: "4.01", val: costCodes.draft_labor },
      { code: "4.02", val: costCodes.draft_subcontract },
      { code: "1.01", val: fieldKey === "shop_labor" ? parsedVal : costCodes.shop_labor },
      { code: "1.02", val: fieldKey === "shop_subcontract" ? parsedVal : costCodes.shop_subcontract },
      { code: "1.03", val: fieldKey === "steel_material" ? parsedVal : costCodes.steel_material },
      { code: "1.05", val: fieldKey === "grating_material" ? parsedVal : costCodes.grating_material },
      { code: "1.06", val: costCodes.joist_material },
      { code: "1.07", val: costCodes.deck_material },
      { code: "1.08", val: fieldKey === "other_material" ? parsedVal : costCodes.other_material },
      { code: "1.09", val: fieldKey === "anodizing_finish" ? parsedVal : costCodes.anodizing_finish },
      { code: "1.10", val: fieldKey === "galvanizing" ? parsedVal : costCodes.galvanizing },
      { code: "1.11", val: costCodes.paint_supply },
      { code: "1.12", val: costCodes.bolts_supply },
      { code: "2.01", val: fieldKey === "field_labor" ? parsedVal : costCodes.field_labor },
    ];
    updatedCostCodes.grand_total = codesList.reduce((sum, item) => sum + (parseFloat(item.val) || 0), 0);
    setCostCodes(updatedCostCodes);

    if (!isReadOnly) {
      triggerSave(async () => {
        const projRes = await api.get(`projects/${projectId}/`);
        const existingEstData = projRes.data.estimation_data || {};
        const existingOverrides = existingEstData.costCodeOverrides || {};

        const nextOverrides = {
          ...existingOverrides,
          [code]: value === '' ? null : parsedVal
        };

        if (value === '') {
          delete nextOverrides[code];
        }

        await api.patch(`projects/${projectId}/`, {
          estimation_data: {
            ...existingEstData,
            costCodeOverrides: nextOverrides
          }
        });
      });
    }
  };

  const handleFinalize = async (e) => {
    e.preventDefault();
    if (!confirmName) return;
    try {
      await api.post(`projects/${projectId}/estimate-data/finalize/`, {
        preparer_name: confirmName,
        prevailing_wage: prevailingWage,
        out_of_town: outOfTown,
      });
      setShowFinalizeModal(false);
      if (refreshProject) refreshProject();
      fetchEstimateData();
    } catch (err) {
      alert("Failed to finalize estimate: " + (err.response?.data?.detail || "Conflict"));
    }
  };

  if (loading) return <div className="text-center font-mono py-8 text-slate-500">Loading Cost Codes & SOV...</div>;

  // Compute grand total of all 14 Cost Codes
  const costCodesTotal = costCodes.grand_total || 0;
  const sovTotal = sovLines.reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto w-full text-slate-800">
      {/* Tab Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-sm font-bold text-slate-800 tracking-wider uppercase">Estimate Data & Cost Codes</h2>
          <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-1">ERP cost codes, Schedule of Values, and estimate finalization</p>
        </div>
        <AutoSaveIndicator state={saveState} lastSaved={lastSaved} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Cost Codes & SOV (Left Columns) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* 14 Cost Codes */}
          <div className="bg-white border border-slate-200 p-5 rounded-xl space-y-4 shadow-sm">
            <h3 className="text-xs font-bold uppercase text-amber-600 tracking-wider border-b border-slate-100 pb-2">14 ERP Cost Codes</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-xs">
              {[
                { code: "4.01", label: "4.01 Draft Labor", val: costCodes.draft_labor },
                { code: "4.02", label: "4.02 Draft Subcontract", val: costCodes.draft_subcontract },
                { code: "1.01", label: "1.01 Shop Labor", val: costCodes.shop_labor },
                { code: "1.02", label: "1.02 Shop Subcontract", val: costCodes.shop_subcontract },
                { code: "1.03", label: "1.03 Steel Material", val: costCodes.steel_material },
                { code: "1.05", label: "1.05 Grating Material", val: costCodes.grating_material },
                { code: "1.06", label: "1.06 Joist Material", val: costCodes.joist_material },
                { code: "1.07", label: "1.07 Deck Material", val: costCodes.deck_material },
                { code: "1.08", label: "1.08 Other Material", val: costCodes.other_material },
                { code: "1.09", label: "1.09 Anodizing Finish", val: costCodes.anodizing_finish },
                { code: "1.10", label: "1.10 Galvanizing", val: costCodes.galvanizing },
                { code: "1.11", label: "1.11 Paint Supply", val: costCodes.paint_supply },
                { code: "1.12", label: "1.12 Bolts Supply", val: costCodes.bolts_supply },
                { code: "2.01", label: "2.01 Field Labor", val: costCodes.field_labor },
              ].map((item, idx) => {
                const isEditable = [
                  "1.01", "1.02", "1.03", "1.05", "1.08", "1.09", "1.10", "2.01"
                ].includes(item.code);
                return (
                  <div key={idx} className="flex justify-between items-center border-b border-slate-100 py-1.5 hover:bg-slate-50/50">
                    <span className="text-slate-500 font-medium font-sans">{item.label}:</span>
                    {isEditable ? (
                      <div className="relative flex items-center w-36">
                        <span className="absolute left-2 text-slate-400 font-bold">$</span>
                        <input
                          type="number"
                          step="0.01"
                          disabled={isReadOnly}
                          value={item.val === 0 ? "" : item.val}
                          placeholder="0.00"
                          onChange={(e) => handleCostCodeChange(item.code, e.target.value)}
                          className="w-full bg-white border border-slate-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 text-slate-800 rounded px-3 pl-6 py-1 text-xs outline-none transition-all font-mono text-right font-bold"
                        />
                      </div>
                    ) : (
                      <span className="text-slate-800 font-bold font-mono pr-2">
                        ${parseFloat(item.val || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
            
            <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-150 mt-4 shadow-sm font-semibold">
              <span className="text-slate-600 uppercase text-xs tracking-wider font-bold">Total cost code valuation:</span>
              <span className="text-emerald-600 font-bold font-mono text-base">
                ${costCodesTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 text-xs font-semibold">
              <div className="bg-slate-50 border border-slate-150 p-3 rounded-xl flex justify-between items-center shadow-sm">
                <span className="text-slate-500 uppercase tracking-wider font-bold">Total Hours (Tons + Hrs):</span>
                <span className="text-slate-800 font-bold font-mono text-sm">
                  {(costCodes.total_hours || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="bg-slate-50 border border-slate-150 p-3 rounded-xl flex justify-between items-center shadow-sm">
                <span className="text-slate-500 uppercase tracking-wider font-bold">Total Weight (Lbs):</span>
                <span className="text-slate-800 font-bold font-mono text-sm">
                  {(costCodes.total_weight || 0).toLocaleString(undefined, { minimumFractionDigits: 0 })} Lbs
                </span>
              </div>
            </div>
          </div>

          {/* Schedule of Values */}
          <div className="bg-white border border-slate-200 p-5 rounded-xl space-y-4 shadow-sm">
            <h3 className="text-xs font-bold uppercase text-amber-600 tracking-wider border-b border-slate-100 pb-2">Schedule of Values (SOV)</h3>
            
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs sm:text-sm text-slate-700">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase text-slate-500">
                    <th className="px-4 py-3 w-20">Code</th>
                    <th className="px-4 py-3">SOV Component description</th>
                    <th className="px-4 py-3 w-48 text-right">Amount ($)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sovLines.map((line) => (
                    <tr key={line.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-mono text-slate-500 font-semibold">{line.code}</td>
                      <td className="px-4 py-3 font-medium text-slate-700">{line.description}</td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          step="0.01"
                          disabled={isReadOnly}
                          className="w-full bg-white border border-slate-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 text-slate-800 rounded px-3 py-1.5 text-xs outline-none transition-all font-mono text-right"
                          value={line.amount}
                          onChange={(e) => handleSOVAmountChange(line.id, line.code, e.target.value)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-150 mt-4 shadow-sm font-semibold">
              <span className="text-slate-600 uppercase text-xs tracking-wider font-bold">Total SOV value:</span>
              <span className="text-emerald-600 font-bold font-mono text-base">
                ${sovTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        {/* Finalize Control & Snapshots Listing (Right Column) */}
        <div className="space-y-6 lg:sticky lg:top-28 self-start">
          {/* Finalize Control */}
          <div className="bg-white border border-slate-200 p-5 rounded-xl space-y-4 shadow-sm">
            <h3 className="text-xs font-bold uppercase text-slate-800 tracking-wider border-b border-slate-100 pb-2">Estimate Approval</h3>
            
            <div className="space-y-3 pt-1">
              <label className="flex items-center gap-3 cursor-pointer text-sm">
                <input
                  type="checkbox"
                  disabled={isReadOnly}
                  className="rounded border-slate-350 text-amber-500 focus:ring-amber-500 h-4 w-4"
                  checked={prevailingWage}
                  onChange={(e) => setPrevailingWage(e.target.checked)}
                />
                <span className="font-bold text-xs uppercase tracking-wider text-slate-600">Prevailing Wage Job</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer text-sm">
                <input
                  type="checkbox"
                  disabled={isReadOnly}
                  className="rounded border-slate-350 text-amber-500 focus:ring-amber-500 h-4 w-4"
                  checked={outOfTown}
                  onChange={(e) => setOutOfTown(e.target.checked)}
                />
                <span className="font-bold text-xs uppercase tracking-wider text-slate-600">Out-of-Town Job</span>
              </label>
            </div>

            <div className="pt-2">
              {project?.is_finalized ? (
                <div className="w-full py-2.5 bg-slate-100 border border-slate-200 text-slate-400 font-bold rounded-lg uppercase tracking-wider text-xs flex items-center justify-center gap-2 select-none">
                  <Lock size={14} />
                  Estimate Locked
                </div>
              ) : (
                <button
                  onClick={() => setShowFinalizeModal(true)}
                  className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg uppercase tracking-wider text-xs flex items-center justify-center gap-2 transition-all shadow-sm"
                >
                  <Lock size={14} />
                  Finalize Estimate
                </button>
              )}
            </div>
          </div>

          {/* Snapshot History list */}
          <div className="bg-white border border-slate-200 p-5 rounded-xl space-y-4 shadow-sm">
            <h3 className="text-xs font-bold uppercase text-slate-800 tracking-wider border-b border-slate-100 pb-2">Revision History</h3>
            
            {snapshots.length === 0 ? (
              <div className="text-center font-mono text-xs text-slate-400 py-4">No snapshots registered for this job.</div>
            ) : (
              <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                {snapshots.map((snap) => (
                  <div key={snap.id} className="border border-slate-200 bg-slate-50/50 p-3 rounded-xl flex items-center justify-between text-xs font-medium hover:border-slate-300 transition-all">
                    <div>
                      <div className="font-bold text-slate-700 flex items-center gap-1">
                        <FileText size={12} className="text-amber-500" />
                        Revision v{snap.version_number}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1">Finalized: {new Date(snap.finalized_at).toLocaleDateString()}</div>
                      <div className="text-[10px] text-slate-400">By: {snap.preparer_name}</div>
                    </div>
                    
                    <div className="flex flex-col gap-1.5 shrink-0">
                      <button
                        onClick={() => handleDownload('pdf')}
                        className="text-[10px] uppercase font-bold text-amber-600 hover:text-amber-700 hover:underline text-right bg-transparent border-none cursor-pointer"
                      >
                        PDF
                      </button>
                      <button
                        onClick={() => handleDownload('xlsx')}
                        className="text-[10px] uppercase font-bold text-amber-600 hover:text-amber-700 hover:underline text-right bg-transparent border-none cursor-pointer"
                      >
                        XLSX
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal - Finalization Legal/Consent Confirmation */}
      {showFinalizeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white border border-slate-200 p-6 sm:p-8 rounded-xl max-w-md w-full shadow-2xl space-y-4">
            <h2 className="text-md font-bold text-red-600 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
              <Lock size={18} className="text-red-500" />
              Finalize Estimate Submission
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              CONFIRMATION REQUIRED: Finalizing this estimate will generate an immutable snapshot (v{snapshots.length + 1}) and freeze all inputs in this workspace. Corrections will require cloning to a new job revision.
            </p>

            <form onSubmit={handleFinalize} className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Preparer Name Signature</label>
                <input
                  type="text"
                  required
                  className="w-full bg-white border border-slate-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 text-slate-800 rounded-lg px-3 py-2 text-sm outline-none transition-all"
                  placeholder="Type full name to sign"
                  value={confirmName}
                  onChange={(e) => setConfirmName(e.target.value)}
                />
              </div>

              <div className="flex gap-3 mt-6">
                <button 
                  type="button" 
                  onClick={() => setShowFinalizeModal(false)} 
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 font-bold rounded-lg text-xs uppercase tracking-wider transition-all"
                >
                  Abort
                </button>
                <button 
                  type="submit" 
                  className="flex-1 py-2 bg-red-500 hover:bg-red-600 text-white font-bold rounded-lg text-xs uppercase tracking-wider transition-all shadow-sm"
                >
                  Lock Estimate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
