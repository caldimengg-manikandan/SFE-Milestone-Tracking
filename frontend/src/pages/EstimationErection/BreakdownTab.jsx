import React, { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import api from "../../services/api";
import { useAutoSave } from "../../hooks/useAutoSave";
import AutoSaveIndicator from "../../components/AutoSaveIndicator";
import { Edit3, CheckCircle, Info } from "lucide-react";

export default function BreakdownTab() {
  const { projectId, project } = useOutletContext();
  const isReadOnly = project?.is_finalized || false;

  const [rows, setRows] = useState([]);
  const [annotations, setAnnotations] = useState({}); // item_ref -> annotation
  const [loading, setLoading] = useState(true);
  const { saveState, lastSaved, triggerSave } = useAutoSave();

  // Active annotation drawer state
  const [selectedRow, setSelectedRow] = useState(null);
  const [annoForm, setAnnoForm] = useState({
    detailer: "",
    mat_ordered: false,
    erected: false,
    notes: "",
  });

  const fetchBreakdownData = async () => {
    try {
      const res = await api.get(`projects/${projectId}/breakdown/`);
      setRows(res.data.rows || []);
      
      // Index annotations by item_ref
      const annos = {};
      (res.data.annotations || []).forEach((anno) => {
        annos[anno.item_ref] = anno;
      });
      setAnnotations(annos);
    } catch (err) {
      console.error("Failed to load breakdown aggregation:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBreakdownData();
  }, [projectId]);

  const handleSelectRow = (row) => {
    setSelectedRow(row);
    const existing = annotations[row.item_ref] || {
      detailer: "",
      mat_ordered: false,
      erected: false,
      notes: "",
    };
    setAnnoForm({
      detailer: existing.detailer || "",
      mat_ordered: !!existing.mat_ordered,
      erected: !!existing.erected,
      notes: existing.notes || "",
    });
  };

  const handleAnnotationChange = (e) => {
    const { name, value, type, checked } = e.target;
    const val = type === "checkbox" ? checked : value;
    const updatedForm = { ...annoForm, [name]: val };
    setAnnoForm(updatedForm);

    // Save annotation
    triggerSave(async () => {
      const existing = annotations[selectedRow.item_ref];
      let res;
      if (existing) {
        res = await api.patch(`projects/${projectId}/breakdown/annotations/${existing.id}/`, {
          [name]: val,
        });
      } else {
        res = await api.post(`projects/${projectId}/breakdown/annotations/`, {
          item_ref: selectedRow.item_ref,
          [name]: val,
        });
      }
      
      // Update local cache
      setAnnotations((prev) => ({
        ...prev,
        [selectedRow.item_ref]: res.data,
      }));
    });
  };

  if (loading) {
    return <div className="text-center font-mono py-8 text-slate-500">Calculating breakdown aggregation...</div>;
  }

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto w-full">
      {/* Tab Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-sm font-bold text-slate-800 tracking-wider uppercase">Estimate Breakdown & Tracking</h2>
          <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-1">Cross-module computed values and field progress tracking</p>
        </div>
        <AutoSaveIndicator state={saveState} lastSaved={lastSaved} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Aggregated Breakdown Grid (Left Columns) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl text-xs text-blue-700 flex items-start gap-2 shadow-sm">
            <Info size={16} className="text-blue-500 mt-0.5 shrink-0" />
            <span>Select any item row in the breakdown matrix to add detailers, track drawing completion, material procurement, or erection status in the control drawer.</span>
          </div>

          {/* Horizontally scrollable table container */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] border-collapse text-left text-xs sm:text-sm text-slate-700">
                <thead>
                  <tr className="bg-slate-55 bg-slate-50/75 border-b border-slate-200 text-[10px] sm:text-xs font-bold uppercase text-slate-500">
                    <th className="px-4 py-3">Component Description</th>
                    <th className="px-4 py-3 text-right">Weight (Tons)</th>
                    <th className="px-4 py-3 text-right">Shop Hrs</th>
                    <th className="px-4 py-3 text-right">Field Hrs</th>
                    <th className="px-4 py-3 text-right">Valuation ($)</th>
                    <th className="px-4 py-3 w-20 sm:w-24 text-center">Status</th>
                    <th className="px-4 py-3 w-10 sm:w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((row) => {
                    const anno = annotations[row.item_ref];
                    const selected = selectedRow?.item_ref === row.item_ref;
                    
                    return (
                      <tr
                        key={row.item_ref}
                        onClick={() => handleSelectRow(row)}
                        className={`cursor-pointer transition-colors ${selected ? "bg-amber-50/70 hover:bg-amber-100/60" : "hover:bg-slate-50/50"}`}
                      >
                        <td className="px-4 py-3 font-bold text-slate-800">
                          <div className="flex items-center gap-2">
                            <span>{row.label}</span>
                            {row.is_galvanized && (
                              <span className="bg-teal-50 text-teal-700 border border-teal-200 px-1 py-0.5 rounded font-mono text-[8px] sm:text-[9px] uppercase tracking-wider">
                                Galv
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-slate-600">
                          {row.weight_tons ? row.weight_tons.toLocaleString(undefined, { minimumFractionDigits: 3 }) : "—"}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-slate-500">{row.shop_hrs || "—"}</td>
                        <td className="px-4 py-3 text-right font-mono text-slate-500">{row.field_hrs || "—"}</td>
                        <td className="px-4 py-3 text-right font-mono text-amber-600 font-bold">
                          ${row.value?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 text-center text-xs">
                          {anno?.erected ? (
                            <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded font-mono text-[9px] sm:text-[10px]">ERECTED</span>
                          ) : anno?.mat_ordered ? (
                            <span className="bg-blue-55 bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded font-mono text-[9px] sm:text-[10px]">PROCURED</span>
                          ) : (
                            <span className="bg-slate-50 text-slate-600 border border-slate-200 px-1.5 py-0.5 rounded font-mono text-[9px] sm:text-[10px]">ESTIMATED</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Edit3 size={13} className={selected ? "text-amber-500" : "text-slate-400"} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Annotation & Tracking Drawer (Right Column) */}
        <div>
          <div className="bg-white border border-slate-200 p-5 rounded-xl sticky top-28 space-y-5 shadow-sm">
            {selectedRow ? (
              <>
                <div>
                  <span className="text-[10px] text-slate-450 font-bold block uppercase tracking-wider">Tracking Control Drawer</span>
                  <h3 className="text-sm font-bold text-slate-800 uppercase mt-1">{selectedRow.label}</h3>
                  <p className="text-xs text-amber-600 font-semibold font-mono mt-0.5">Reference: {selectedRow.item_ref}</p>
                </div>

                <div className="space-y-4 pt-2">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Detailer / Engineer Assigned</label>
                    <input
                      type="text"
                      name="detailer"
                      disabled={isReadOnly}
                      className="w-full bg-white border border-slate-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 text-slate-800 rounded-lg px-3 py-2.5 text-sm outline-none transition-all"
                      placeholder="e.g. John Doe detailing"
                      value={annoForm.detailer}
                      onChange={handleAnnotationChange}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Notes / Revisions</label>
                    <textarea
                      name="notes"
                      disabled={isReadOnly}
                      rows={4}
                      className="w-full bg-white border border-slate-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 text-slate-800 rounded-lg px-3 py-2.5 text-sm outline-none transition-all"
                      placeholder="Enter field revision notes..."
                      value={annoForm.notes}
                      onChange={handleAnnotationChange}
                    />
                  </div>

                  {/* Flow Checkboxes */}
                  <div className="space-y-3 pt-3 border-t border-slate-100">
                    <label className="flex items-center gap-3 cursor-pointer text-sm">
                      <input
                        type="checkbox"
                        name="mat_ordered"
                        disabled={isReadOnly}
                        className="rounded border-slate-350 text-amber-500 focus:ring-amber-500 h-4 w-4"
                        checked={annoForm.mat_ordered}
                        onChange={handleAnnotationChange}
                      />
                      <span className="font-bold text-xs uppercase tracking-wider text-slate-600">Material Ordered / In Shop</span>
                    </label>

                    <label className="flex items-center gap-3 cursor-pointer text-sm">
                      <input
                        type="checkbox"
                        name="erected"
                        disabled={isReadOnly}
                        className="rounded border-slate-350 text-amber-500 focus:ring-amber-500 h-4 w-4"
                        checked={annoForm.erected}
                        onChange={handleAnnotationChange}
                      />
                      <span className="font-bold text-xs uppercase tracking-wider text-slate-600">Erected on Site</span>
                    </label>
                  </div>
                </div>

                {annotations[selectedRow.item_ref]?.updated_by_name && (
                  <div className="text-[10px] text-slate-400 font-mono border-t border-slate-100 pt-3">
                    Last modified by: {annotations[selectedRow.item_ref].updated_by_name} at {new Date(annotations[selectedRow.item_ref].updated_at).toLocaleString()}
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12 text-slate-400 font-semibold text-sm">
                <CheckCircle size={36} className="mx-auto text-slate-300 mb-3 animate-pulse" />
                Select any breakdown row to view tracking controls.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
