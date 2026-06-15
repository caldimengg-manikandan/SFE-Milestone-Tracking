import React, { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import api from "../../services/api";
import { useAutoSave } from "../../hooks/useAutoSave";
import AutoSaveIndicator from "../../components/AutoSaveIndicator";
import CollapsibleRightSidebar from "../../components/CollapsibleRightSidebar";
import UnitCombobox from "./UnitCombobox";
import { Plus, Trash } from "lucide-react";

const SECTION_MAP = {
  "Structural Steel": ["COL", "BEAM", "GIRT", "SAG", "RF", "CA", "CR"],
  "X-Bracing": ["DAB", "DAW", "TAB", "TAW", "VQR", "HQR"],
  "Perimeter Plates & Angles": ["PA", "PAL", "PAL2", "PAL5", "WAL_L", "WAL_M", "WAL_H", "HAS", "SBFC", "MSA", "TSA_CLIPS", "BSA"],
  "Moments & Miscellaneous": ["MOMENTS", "MISC"],
  "Bolts & Anchors": ["BOLTS", "EXP_BOLTS", "ADH_ANCHORS"],
  "Joist Take-off": [
    "SSJ_0_10", "SSJ_10_25", "SSJ_25_35", "SSJ_35_50",
    "LSJ_30_40", "LSJ_40_50", "LSJ_50_60", "LSJ_60_70", "LSJ_70_80", "LSJ_80_100", "LSJ_GIR",
    "JOIST_SPLICES", "BOLTED_X_BRIDGING", "WELDED_X_BRIDGING", "HORIZ_BRIDGING", "BRIDGING_WALL"
  ],
  "Decking Take-off": [
    "DECK_15_18_ROOF", "DECK_15_20_ROOF", "DECK_15_22_ROOF", "DECK_3_20_ROOF",
    "DECK_15_20_COMP", "DECK_15_22_COMP", "DECK_2_20_COMP", "DECK_916_26",
    "DECK_CEL_15_18_18", "DECK_CEL_15_18_20", "DECK_CEL_15_20_18", "DECK_CEL_15_20_20",
    "DECK_CEL_2_18_18", "DECK_CEL_2_18_20", "DECK_CEL_2_20_18", "DECK_CEL_2_20_20"
  ]
};

export default function ErectionTakeoffTab() {
  const { projectId, project } = useOutletContext();
  const isReadOnly = project?.is_finalized || false;

  const [takeoff, setTakeoff] = useState(null);
  const [memberTypes, setMemberTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const { saveState, lastSaved, triggerSave } = useAutoSave();

  // State for holding inputs for new custom rows per section
  const [newRows, setNewRows] = useState({});
  const [customUnits, setCustomUnits] = useState(() => {
    try {
      const saved = localStorage.getItem(`customUnits_${projectId}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const STANDARD_UNITS = ["pc", "lf", "sf", "each", "set", "hrs"];

  // Populate customUnits from existing takeoff lines on load if empty
  useEffect(() => {
    if (takeoff?.member_lines && customUnits.length === 0) {
      const existingCustom = takeoff.member_lines
        .map((l) => l.input_unit?.trim() || "")
        .filter((u) => u !== "" && !STANDARD_UNITS.includes(u.toLowerCase()));
      // Deduplicate case-insensitively
      const unique = Array.from(new Set(existingCustom.map((u) => u.toLowerCase())))
        .map((lower) => {
          const original = existingCustom.find((u) => u.toLowerCase() === lower);
          return original || lower;
        });
      if (unique.length > 0) {
        setCustomUnits(unique);
        try {
          localStorage.setItem(`customUnits_${projectId}`, JSON.stringify(unique));
        } catch (e) {
          console.error(e);
        }
      }
    }
  }, [takeoff]);

  const handleAddCustomUnit = (unit) => {
    const trimmed = unit.trim().toLowerCase();
    if (trimmed && !STANDARD_UNITS.includes(trimmed)) {
      setCustomUnits((prev) => {
        if (prev.map(u => u.toLowerCase()).includes(trimmed)) return prev;
        const updated = [...prev, trimmed];
        try { localStorage.setItem(`customUnits_${projectId}`, JSON.stringify(updated)); } catch (e) { }
        return updated;
      });
    }
  };

  const fetchData = async () => {
    try {
      const [tRes, mRes] = await Promise.all([
        api.get(`projects/${projectId}/erection-takeoff/`),
        api.get("reference/member-types/"),
      ]);

      const takeoffData = tRes.data;
      setTakeoff(takeoffData);
      setMemberTypes(mRes.data.results || mRes.data);
    } catch (err) {
      console.error("Failed to fetch erection takeoff:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [projectId]);

  const handleConstantChange = (e) => {
    const { name, value } = e.target;
    const valNum = value === "" ? 0 : parseFloat(value);
    const updated = { ...takeoff, [name]: value };
    setTakeoff(updated);

    if (!isReadOnly) {
      triggerSave(async () => {
        const response = await api.patch(`projects/${projectId}/erection-takeoff/`, {
          [name]: valNum,
        });
        setTakeoff(response.data);
      });
    }
  };

  const handleLineChange = (lineId, field, value) => {
    // Update local state immediately for input responsiveness
    setTakeoff((prev) => {
      if (!prev) return prev;
      const updatedLines = prev.member_lines.map((l) => {
        if (l.id === lineId) {
          return { ...l, [field]: value };
        }
        return l;
      });
      return { ...prev, member_lines: updatedLines };
    });

    // Trigger debounced save to backend
    if (!isReadOnly) {
      triggerSave(async () => {
        let valParsed = value;
        if (field === "quantity" || field === "mh_per_pc") {
          valParsed = value === "" ? 0 : parseFloat(value) || 0;
        }

        await api.patch(`projects/${projectId}/erection-takeoff/lines/${lineId}/`, {
          [field]: valParsed,
        });

        // After saving, fetch latest computed numbers from backend
        const response = await api.get(`projects/${projectId}/erection-takeoff/`);
        setTakeoff(response.data);
      });
    }
  };

  const handleNewRowChange = (category, field, value) => {
    setNewRows((prev) => ({
      ...prev,
      [category]: {
        ...(prev[category] || { input_unit: "pc", label: "", quantity: "", mh_per_pc: "" }),
        [field]: value,
      },
    }));
  };

  const handleAddCustomRow = async (category) => {
    const rowInput = newRows[category];
    if (!rowInput || !rowInput.label.trim()) {
      alert("Please enter a description for the custom item.");
      return;
    }

    const unit = rowInput.input_unit || "pc";
    const qtyVal = parseFloat(rowInput.quantity) || 0;
    const mhVal = parseFloat(rowInput.mh_per_pc) || 0;

    try {
      await api.post(`projects/${projectId}/erection-takeoff/lines/`, {
        label: rowInput.label.trim(),
        quantity: qtyVal,
        input_unit: unit || "pc",
        mh_per_pc: mhVal,
        category: category,
        is_custom: true,
        sort_order: 9999, // Place at the end
      });

      // Clear the inputs for this category
      setNewRows((prev) => ({
        ...prev,
        [category]: { input_unit: "pc", label: "", quantity: "", mh_per_pc: "" },
      }));

      // Refresh data to show the new row and updated calculations
      await fetchData();
    } catch (err) {
      console.error("Failed to add custom row:", err);
      alert("Failed to add custom item.");
    }
  };

  const handleDeleteCustomRow = async (lineId) => {
    if (isReadOnly) return;
    if (!window.confirm("Are you sure you want to delete this custom item?")) return;

    try {
      await api.delete(`projects/${projectId}/erection-takeoff/lines/${lineId}/`);
      await fetchData();
    } catch (err) {
      console.error("Failed to delete custom row:", err);
      alert("Failed to delete custom item.");
    }
  };

  const handleRemoveCustomUnit = async (unitToRemove) => {
    if (isReadOnly) return;
    if (!window.confirm(`Are you sure you want to delete the custom unit "${unitToRemove.toUpperCase()}"? Any takeoff lines using this unit will be reverted to "PC".`)) return;

    const updated = customUnits.filter((u) => u.toLowerCase() !== unitToRemove.toLowerCase());
    setCustomUnits(updated);
    try {
      localStorage.setItem(`customUnits_${projectId}`, JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }

    if (takeoff?.member_lines) {
      const linesToUpdate = takeoff.member_lines.filter(
        (l) => l.input_unit?.toLowerCase() === unitToRemove.toLowerCase()
      );

      for (const line of linesToUpdate) {
        // Update locally
        setTakeoff((prev) => {
          if (!prev) return prev;
          const updatedLines = prev.member_lines.map((l) => {
            if (l.id === line.id) return { ...l, input_unit: "pc" };
            return l;
          });
          return { ...prev, member_lines: updatedLines };
        });

        // Patch on backend
        try {
          await api.patch(`projects/${projectId}/erection-takeoff/lines/${line.id}/`, {
            input_unit: "pc",
          });
        } catch (err) {
          console.error("Failed to revert unit for line:", line.id, err);
        }
      }

      await fetchData();
    }
  };

  if (loading) return <div className="text-center font-mono py-8 text-slate-500">Loading Erection Takeoff...</div>;
  if (!takeoff) return <div className="text-center font-mono py-8 text-slate-500">Takeoff details missing.</div>;

  const computed = takeoff.computed || {};

  // Group member lines from takeoff for layout grouping
  const groupedLines = {};
  const categories = [
    "Structural Steel",
    "X-Bracing",
    "Perimeter Plates & Angles",
    "Moments & Miscellaneous",
    "Bolts & Anchors",
    "Joist Take-off",
    "Decking Take-off"
  ];
  categories.forEach((cat) => {
    groupedLines[cat] = [];
  });

  takeoff.member_lines.forEach((line) => {
    const cat = line.category || "Other Take-off Items";
    if (!groupedLines[cat]) {
      groupedLines[cat] = [];
    }
    groupedLines[cat].push(line);
  });

  // Sort standard lines by sort_order within each category, with custom lines appended at the end
  Object.keys(groupedLines).forEach((cat) => {
    groupedLines[cat].sort((a, b) => {
      if (a.is_custom !== b.is_custom) {
        return a.is_custom ? 1 : -1;
      }
      return (a.sort_order || 0) - (b.sort_order || 0);
    });
  });

  const formatCurrency = (val) => {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(val || 0);
  };

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto w-full text-slate-800">
      {/* Tab Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-sm font-bold text-slate-800 tracking-wider uppercase">Erection Takeoff & Hours Estimation</h2>
          <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-1">Crane picks, piece count labor, and truck unload calculations</p>
        </div>
        <AutoSaveIndicator state={saveState} lastSaved={lastSaved} />
      </div>

      <div className="flex flex-col lg:flex-row gap-6 relative">
        {/* Member Grid List (Left Column) */}
        <div className="flex-1 min-w-0 space-y-6">
          {/* Constant Overrides */}
          <div className="bg-white border border-slate-200 p-5 rounded-xl space-y-4 shadow-sm">
            <h3 className="text-xs font-bold uppercase text-amber-600 tracking-wider border-b border-slate-100 pb-2">Takeoff Configuration Overrides</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Picks Per Day</label>
                <input
                  type="number"
                  name="picks_per_day"
                  disabled={isReadOnly}
                  className="w-full bg-white border border-slate-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 text-slate-800 rounded-lg px-3 py-2 text-sm outline-none transition-all font-mono"
                  value={takeoff.picks_per_day}
                  onChange={handleConstantChange}
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Crew Size (Onsite)</label>
                <input
                  type="number"
                  name="crew_size"
                  disabled={isReadOnly}
                  className="w-full bg-white border border-slate-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 text-slate-800 rounded-lg px-3 py-2 text-sm outline-none transition-all font-mono"
                  value={takeoff.crew_size}
                  onChange={handleConstantChange}
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Foreman Hours Override</label>
                <input
                  type="number"
                  step="0.1"
                  name="foreman_hours"
                  disabled={isReadOnly}
                  className="w-full bg-white border border-slate-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 text-slate-800 rounded-lg px-3 py-2 text-sm outline-none transition-all font-mono"
                  value={takeoff.foreman_hours}
                  onChange={handleConstantChange}
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Field Studs Quantity</label>
                <input
                  type="number"
                  name="field_studs_qty"
                  disabled={isReadOnly}
                  className="w-full bg-white border border-slate-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 text-slate-800 rounded-lg px-3 py-2 text-sm outline-none transition-all font-mono"
                  value={takeoff.field_studs_qty}
                  onChange={handleConstantChange}
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Perimeter Cable (LF)</label>
                <input
                  type="number"
                  name="perimeter_cable_qty"
                  disabled={isReadOnly}
                  className="w-full bg-white border border-slate-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 text-slate-800 rounded-lg px-3 py-2 text-sm outline-none transition-all font-mono"
                  value={takeoff.perimeter_cable_qty}
                  onChange={handleConstantChange}
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Equipment Rental Cost ($)</label>
                <input
                  type="number"
                  name="equipment_rental"
                  disabled={isReadOnly}
                  className="w-full bg-white border border-slate-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 text-slate-800 rounded-lg px-3 py-2 text-sm outline-none transition-all font-mono"
                  value={takeoff.equipment_rental}
                  onChange={handleConstantChange}
                />
              </div>
            </div>
          </div>

          {/* Grouped Members Tables */}
          {Object.keys(groupedLines).map((sectionName) => {
            const lines = groupedLines[sectionName];
            if (lines.length === 0 && !categories.includes(sectionName)) return null;

            return (
              <div key={sectionName} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm space-y-2">
                <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                  <h3 className="font-bold text-xs uppercase text-slate-700 tracking-wider">{sectionName}</h3>
                </div>
                <table className="w-full border-collapse text-left text-xs sm:text-sm text-slate-700">
                  <thead>
                    <tr className="border-b border-slate-200 text-[10px] font-bold uppercase text-slate-550 bg-slate-50/50">
                      <th className="px-4 py-2 w-16">Code</th>
                      <th className="px-4 py-2">Member Category Description</th>
                      <th className="px-4 py-2 w-28 text-right">Quantity</th>
                      <th className="px-4 py-2 w-24 text-right">Unit</th>
                      <th className="px-4 py-2 w-24 text-right">MH Factor</th>
                      <th className="px-4 py-2 w-24 text-right">IW Hours</th>
                      <th className="px-4 py-2 w-24 text-right">Picks</th>
                      <th className="px-4 py-2 w-12 text-center"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((line) => {
                      const isMoments = line.member_type_detail?.member_code === "MOMENTS";
                      const currentUnit = line.input_unit !== null && line.input_unit !== undefined ? line.input_unit : "pc";

                      return (
                        <tr key={line.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                          <td className="px-4 py-2 font-mono text-slate-500 text-xs font-semibold">
                            {line.member_type_detail?.member_code || "CUSTOM"}
                          </td>
                          <td className="px-4 py-2 text-xs text-slate-700 font-medium">
                            {line.is_custom ? (
                              <input
                                type="text"
                                placeholder="Enter custom description..."
                                disabled={isReadOnly}
                                className="w-full bg-white border border-slate-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 text-slate-800 rounded px-2 py-0.5 text-xs outline-none transition-all font-sans"
                                value={line.label || ""}
                                onChange={(e) => handleLineChange(line.id, "label", e.target.value)}
                              />
                            ) : (
                              line.label
                            )}
                          </td>
                          <td className="px-4 py-2 text-right">
                            {isMoments ? (
                              <span className="text-xs font-mono text-slate-400 block px-2 py-1">—</span>
                            ) : (
                              <input
                                type="number"
                                step="0.01"
                                disabled={isReadOnly}
                                className="w-24 bg-white border border-slate-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 text-slate-800 rounded px-2 py-0.5 text-xs outline-none transition-all text-right font-mono"
                                value={line.quantity !== null && line.quantity !== undefined ? line.quantity : ""}
                                onChange={(e) => handleLineChange(line.id, "quantity", e.target.value)}
                              />
                            )}
                          </td>
                          <td className="px-4 py-2 text-right">
                            {isMoments ? (
                              <span className="text-xs font-mono text-slate-400 block px-2 py-1">—</span>
                            ) : (
                              <div className="flex justify-end">
                                <UnitCombobox
                                  value={currentUnit}
                                  onChange={(newUnit) => handleLineChange(line.id, "input_unit", newUnit)}
                                  standardUnits={STANDARD_UNITS}
                                  customUnits={customUnits}
                                  onAddCustomUnit={handleAddCustomUnit}
                                  onRemoveCustomUnit={handleRemoveCustomUnit}
                                  disabled={isReadOnly}
                                />
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-2 text-right">
                            {isMoments ? (
                              <span className="text-xs font-mono text-slate-400 block px-2 py-1">—</span>
                            ) : (
                              <input
                                type="number"
                                step="0.0001"
                                disabled={isReadOnly}
                                className="w-20 bg-white border border-slate-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 text-slate-800 rounded px-2 py-0.5 text-xs outline-none transition-all text-right font-mono"
                                value={line.mh_per_pc !== null && line.mh_per_pc !== undefined ? line.mh_per_pc : ""}
                                onChange={(e) => handleLineChange(line.id, "mh_per_pc", e.target.value)}
                              />
                            )}
                          </td>
                          <td className="px-4 py-2 text-right font-mono text-xs text-emerald-600 font-bold">
                            {line.computed?.iw_hours || 0}
                          </td>
                          <td className="px-4 py-2 text-right font-mono text-xs text-amber-600 font-bold">
                            {line.computed?.crane_picks || 0}
                          </td>
                          <td className="px-4 py-2 text-center">
                            {line.is_custom && !isReadOnly && (
                              <button
                                type="button"
                                onClick={() => handleDeleteCustomRow(line.id)}
                                className="text-red-500 hover:text-red-700 p-1 rounded transition-all"
                                title="Delete custom item"
                              >
                                <Trash size={14} />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}

                    {/* Add Custom Row */}
                    {!isReadOnly && categories.includes(sectionName) && (
                      <tr className="border-t border-slate-200 bg-slate-50/50">
                        <td className="px-4 py-2 font-mono text-slate-500 text-xs font-semibold">NEW</td>
                        <td className="px-4 py-2">
                          <input
                            type="text"
                            placeholder="Add custom item description..."
                            className="w-full bg-white border border-slate-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 text-slate-800 rounded px-2 py-1 text-xs outline-none transition-all"
                            value={newRows[sectionName]?.label || ""}
                            onChange={(e) => handleNewRowChange(sectionName, "label", e.target.value)}
                          />
                        </td>
                        <td className="px-4 py-2 text-right">
                          <input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            className="w-24 bg-white border border-slate-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 text-slate-800 rounded px-2 py-1 text-xs outline-none transition-all text-right font-mono"
                            value={newRows[sectionName]?.quantity || ""}
                            onChange={(e) => handleNewRowChange(sectionName, "quantity", e.target.value)}
                          />
                        </td>
                        <td className="px-4 py-2 text-right">
                          <div className="flex justify-end">
                            <UnitCombobox
                              value={newRows[sectionName]?.input_unit || "pc"}
                              onChange={(newUnit) => handleNewRowChange(sectionName, "input_unit", newUnit)}
                              standardUnits={STANDARD_UNITS}
                              customUnits={customUnits}
                              onAddCustomUnit={handleAddCustomUnit}
                              onRemoveCustomUnit={handleRemoveCustomUnit}
                              disabled={false}
                            />
                          </div>
                        </td>
                        <td className="px-4 py-2 text-right">
                          <input
                            type="number"
                            step="0.0001"
                            placeholder="0.0000"
                            className="w-20 bg-white border border-slate-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 text-slate-800 rounded px-2 py-1 text-xs outline-none transition-all text-right font-mono"
                            value={newRows[sectionName]?.mh_per_pc || ""}
                            onChange={(e) => handleNewRowChange(sectionName, "mh_per_pc", e.target.value)}
                          />
                        </td>
                        <td colSpan="2" className="px-4 py-2 text-slate-400 font-medium text-xs text-center italic">Calculated on add</td>
                        <td className="px-4 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleAddCustomRow(sectionName)}
                            className="p-1.5 text-white bg-amber-500 hover:bg-amber-600 rounded-lg transition-all flex items-center justify-center mx-auto"
                            title="Add item"
                          >
                            <Plus size={14} />
                          </button>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>

        {/* Erection Totals Summary Panel (Right Column) */}
        <CollapsibleRightSidebar title="ERECTION SUMMARY">
          <div className="space-y-4">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500 font-medium">Total Raw IW Hours</span>
              <span className="font-mono text-slate-800 font-bold">{computed.total_iw_hours} hrs</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500 font-medium">Total Crane Picks</span>
              <span className="font-mono text-slate-800 font-bold">{computed.total_crane_picks} Picks</span>
            </div>
            <div className="flex justify-between text-sm border-t border-slate-100 pt-3">
              <span className="text-slate-500 font-medium">Freight Out Trucks</span>
              <span className="font-mono text-slate-800 font-bold">{computed.freight_out_trucks} Trucks</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500 font-medium">Joist/Deck Tons (from Bid)</span>
              <span className="font-mono text-slate-800 font-bold">{computed.joist_deck_tons} Tons</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500 font-medium">Calculated Decking Weight</span>
              <span className="font-mono text-slate-800 font-bold">{(computed.decking_tonnage_sum || 0).toFixed(2)} Tons</span>
            </div>
            <div className="flex justify-between text-sm border-t border-slate-100 pt-3">
              <span className="text-slate-500 font-medium">Unload Trucks (ROUNDUP)</span>
              <span className="font-mono text-slate-800 font-bold">{computed.unload_trucks} Trucks</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500 font-medium">Unload Hours (trucks×2)</span>
              <span className="font-mono text-slate-800 font-bold">{computed.unload_hours} hrs</span>
            </div>
            <div className="flex justify-between text-sm border-t border-slate-100 pt-3">
              <span className="text-slate-500 font-medium">Raw Total Hours</span>
              <span className="font-mono text-amber-600 font-bold">{computed.total_raw_hours} hrs</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500 font-medium">Crane Work Days</span>
              <span className="font-mono text-slate-800 font-bold">{computed.crane_days} Days</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500 font-medium">Crane Scheduled Hours</span>
              <span className="font-mono text-slate-800 font-bold">{computed.crane_hours} hrs</span>
            </div>
            <div className="flex justify-between text-sm border-t border-slate-100 pt-3">
              <span className="text-slate-500 font-medium">Crew Size / Days</span>
              <span className="font-mono text-slate-800 font-bold">{computed.crew_size} IW / {computed.crew_days_rounded} Days</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500 font-medium">Scheduled Hours</span>
              <span className="font-mono text-slate-800 font-bold">{computed.total_scheduled_hours} hrs</span>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-4 mt-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
            <span className="text-[10px] text-slate-450 font-bold block uppercase tracking-wider">ESTIMATED ERECTION COST</span>
            <span className="text-3xl font-mono text-emerald-600 font-black block mt-1">
              {formatCurrency(computed.total_erection_cost)}
            </span>
          </div>
        </CollapsibleRightSidebar>
      </div>

      {/* Full Width Section - Detailed Cost Itemization */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm space-y-4 p-5">
        <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Erection Self-Perform Labor & Equipment Estimate</h3>
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">Mirrors self-perform costing sheet (rows 82 to 101)</p>
          </div>
          <span className="font-mono text-emerald-600 font-black text-lg">{formatCurrency(computed.total_erection_cost)}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs sm:text-sm text-slate-700">
            <thead>
              <tr className="border-b border-slate-200 text-[10px] font-bold uppercase text-slate-500 bg-slate-50/50">
                <th className="px-4 py-2">Cost Line Description</th>
                <th className="px-4 py-2 text-right">Quantity / Hours</th>
                <th className="px-4 py-2 text-center">Unit</th>
                <th className="px-4 py-2 text-right">Rate</th>
                <th className="px-4 py-2 text-right">Total Line Cost</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-100 hover:bg-slate-50/50">
                <td className="px-4 py-2 text-xs font-semibold">Ironworker Foreman</td>
                <td className="px-4 py-2 text-right font-mono text-xs text-slate-600">{computed.foreman_hours}</td>
                <td className="px-4 py-2 text-center text-xs text-slate-400">Hrs</td>
                <td className="px-4 py-2 text-right">
                  <input
                    type="number"
                    step="0.01"
                    name="foreman_rate"
                    disabled={isReadOnly}
                    className="w-24 bg-white border border-slate-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 text-slate-800 rounded px-2 py-0.5 text-xs outline-none transition-all text-right font-mono"
                    value={takeoff.foreman_rate !== null && takeoff.foreman_rate !== undefined ? takeoff.foreman_rate : ""}
                    onChange={handleConstantChange}
                  />
                </td>
                <td className="px-4 py-2 text-right font-mono text-xs text-emerald-600 font-bold">{formatCurrency(computed.foreman_cost)}</td>
              </tr>
              <tr className="border-b border-slate-100 hover:bg-slate-50/50">
                <td className="px-4 py-2 text-xs font-semibold">Ironworker</td>
                <td className="px-4 py-2 text-right font-mono text-xs text-slate-600">{computed.ironworker_hours}</td>
                <td className="px-4 py-2 text-center text-xs text-slate-400">Hrs</td>
                <td className="px-4 py-2 text-right">
                  <input
                    type="number"
                    step="0.01"
                    name="ironworker_rate"
                    disabled={isReadOnly}
                    className="w-24 bg-white border border-slate-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 text-slate-800 rounded px-2 py-0.5 text-xs outline-none transition-all text-right font-mono"
                    value={takeoff.ironworker_rate !== null && takeoff.ironworker_rate !== undefined ? takeoff.ironworker_rate : ""}
                    onChange={handleConstantChange}
                  />
                </td>
                <td className="px-4 py-2 text-right font-mono text-xs text-emerald-600 font-bold">{formatCurrency(computed.ironworker_cost)}</td>
              </tr>
              <tr className="border-b border-slate-100 hover:bg-slate-50/50">
                <td className="px-4 py-2 text-xs font-semibold">Crane</td>
                <td className="px-4 py-2 text-right font-mono text-xs text-slate-600">{computed.crane_hours}</td>
                <td className="px-4 py-2 text-center text-xs text-slate-400">Hrs</td>
                <td className="px-4 py-2 text-right">
                  <input
                    type="number"
                    step="0.01"
                    name="crane_rate"
                    disabled={isReadOnly}
                    className="w-24 bg-white border border-slate-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 text-slate-800 rounded px-2 py-0.5 text-xs outline-none transition-all text-right font-mono"
                    value={takeoff.crane_rate !== null && takeoff.crane_rate !== undefined ? takeoff.crane_rate : ""}
                    onChange={handleConstantChange}
                  />
                </td>
                <td className="px-4 py-2 text-right font-mono text-xs text-emerald-600 font-bold">{formatCurrency(computed.crane_cost)}</td>
              </tr>
              <tr className="border-b border-slate-100 hover:bg-slate-50/50">
                <td className="px-4 py-2 text-xs font-semibold">Equipment Rental & Mob/Demob</td>
                <td className="px-4 py-2 text-right font-mono text-xs text-slate-600">1</td>
                <td className="px-4 py-2 text-center text-xs text-slate-400">LS</td>
                <td className="px-4 py-2 text-right font-mono text-xs text-slate-400">—</td>
                <td className="px-4 py-2 text-right font-mono text-xs text-emerald-600 font-bold">{formatCurrency(computed.equipment_rental)}</td>
              </tr>
              <tr className="border-b border-slate-100 hover:bg-slate-50/50">
                <td className="px-4 py-2 text-xs font-semibold">Field Studs</td>
                <td className="px-4 py-2 text-right font-mono text-xs text-slate-600">{computed.field_studs_qty}</td>
                <td className="px-4 py-2 text-center text-xs text-slate-400">PC</td>
                <td className="px-4 py-2 text-right">
                  <input
                    type="number"
                    step="0.01"
                    name="field_studs_rate"
                    disabled={isReadOnly}
                    className="w-24 bg-white border border-slate-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 text-slate-800 rounded px-2 py-0.5 text-xs outline-none transition-all text-right font-mono"
                    value={takeoff.field_studs_rate !== null && takeoff.field_studs_rate !== undefined ? takeoff.field_studs_rate : ""}
                    onChange={handleConstantChange}
                  />
                </td>
                <td className="px-4 py-2 text-right font-mono text-xs text-emerald-600 font-bold">{formatCurrency(computed.field_studs_cost)}</td>
              </tr>
              <tr className="border-b border-slate-100 hover:bg-slate-50/50">
                <td className="px-4 py-2 text-xs font-semibold">Perimeter Cable - Material</td>
                <td className="px-4 py-2 text-right font-mono text-xs text-slate-600">{computed.perimeter_cable_qty}</td>
                <td className="px-4 py-2 text-center text-xs text-slate-400">LF</td>
                <td className="px-4 py-2 text-right">
                  <input
                    type="number"
                    step="0.01"
                    name="perimeter_cable_material_rate"
                    disabled={isReadOnly}
                    className="w-24 bg-white border border-slate-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 text-slate-800 rounded px-2 py-0.5 text-xs outline-none transition-all text-right font-mono"
                    value={takeoff.perimeter_cable_material_rate !== null && takeoff.perimeter_cable_material_rate !== undefined ? takeoff.perimeter_cable_material_rate : ""}
                    onChange={handleConstantChange}
                  />
                </td>
                <td className="px-4 py-2 text-right font-mono text-xs text-emerald-600 font-bold">{formatCurrency(computed.cable_material_cost)}</td>
              </tr>
              <tr className="border-b border-slate-100 hover:bg-slate-50/50">
                <td className="px-4 py-2 text-xs font-semibold">Perimeter Cable - Shop Labor</td>
                <td className="px-4 py-2 text-right font-mono text-xs text-slate-600">{computed.perimeter_cable_qty}</td>
                <td className="px-4 py-2 text-center text-xs text-slate-400">LF</td>
                <td className="px-4 py-2 text-right">
                  <input
                    type="number"
                    step="0.01"
                    name="perimeter_cable_shop_rate"
                    disabled={isReadOnly}
                    className="w-24 bg-white border border-slate-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 text-slate-800 rounded px-2 py-0.5 text-xs outline-none transition-all text-right font-mono"
                    value={takeoff.perimeter_cable_shop_rate !== null && takeoff.perimeter_cable_shop_rate !== undefined ? takeoff.perimeter_cable_shop_rate : ""}
                    onChange={handleConstantChange}
                  />
                </td>
                <td className="px-4 py-2 text-right font-mono text-xs text-emerald-600 font-bold">{formatCurrency(computed.cable_shop_labor_cost)}</td>
              </tr>
              <tr className="border-b border-slate-100 hover:bg-slate-50/50">
                <td className="px-4 py-2 text-xs font-semibold">Perimeter Cable - Field Labor</td>
                <td className="px-4 py-2 text-right font-mono text-xs text-slate-600">{computed.cable_field_labor_hours}</td>
                <td className="px-4 py-2 text-center text-xs text-slate-400">Hrs</td>
                <td className="px-4 py-2 text-right">
                  <input
                    type="number"
                    step="0.01"
                    name="perimeter_cable_field_rate"
                    disabled={isReadOnly}
                    className="w-24 bg-white border border-slate-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 text-slate-800 rounded px-2 py-0.5 text-xs outline-none transition-all text-right font-mono"
                    value={takeoff.perimeter_cable_field_rate !== null && takeoff.perimeter_cable_field_rate !== undefined ? takeoff.perimeter_cable_field_rate : ""}
                    onChange={handleConstantChange}
                  />
                </td>
                <td className="px-4 py-2 text-right font-mono text-xs text-emerald-600 font-bold">{formatCurrency(computed.cable_field_labor_cost)}</td>
              </tr>

              {/* Travel Section */}
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-mono text-slate-500">
                <td colSpan="5" className="px-4 py-2.5 uppercase text-[10px] font-bold tracking-wider text-slate-600">Travel Expenses (One-Way Hours: {computed.travel_hours} hrs | Overnight: {computed.is_overnight})</td>
              </tr>

              {computed.is_overnight === "no" ? (
                <>
                  <tr className="border-b border-slate-100 hover:bg-slate-50/50">
                    <td className="px-4 py-2 text-xs font-semibold">Travel Driver (both Ways - Jobs under 2 hrs one-way)</td>
                    <td className="px-4 py-2 text-right font-mono text-xs text-slate-600">{(computed.foreman_hours / 8).toFixed(2)}</td>
                    <td className="px-4 py-2 text-center text-xs text-slate-400">Days</td>
                    <td className="px-4 py-2 text-right">
                      <input
                        type="number"
                        step="0.01"
                        name="travel_driver_rate"
                        disabled={isReadOnly}
                        className="w-24 bg-white border border-slate-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 text-slate-800 rounded px-2 py-0.5 text-xs outline-none transition-all text-right font-mono"
                        value={takeoff.travel_driver_rate !== null && takeoff.travel_driver_rate !== undefined ? takeoff.travel_driver_rate : ""}
                        onChange={handleConstantChange}
                      />
                    </td>
                    <td className="px-4 py-2 text-right font-mono text-xs text-emerald-600 font-bold">{formatCurrency(computed.travel_driver_cost)}</td>
                  </tr>
                  <tr className="border-b border-slate-100 hover:bg-slate-50/50">
                    <td className="px-4 py-2 text-xs font-semibold">Travel Passengers (One Way - Jobs under 2 hrs one-way)</td>
                    <td className="px-4 py-2 text-right font-mono text-xs text-slate-600">{((computed.ironworker_hours || 0) / 8).toFixed(2)}</td>
                    <td className="px-4 py-2 text-center text-xs text-slate-400">Days</td>
                    <td className="px-4 py-2 text-right">
                      <input
                        type="number"
                        step="0.01"
                        name="travel_passenger_rate"
                        disabled={isReadOnly}
                        className="w-24 bg-white border border-slate-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 text-slate-800 rounded px-2 py-0.5 text-xs outline-none transition-all text-right font-mono"
                        value={takeoff.travel_passenger_rate !== null && takeoff.travel_passenger_rate !== undefined ? takeoff.travel_passenger_rate : ""}
                        onChange={handleConstantChange}
                      />
                    </td>
                    <td className="px-4 py-2 text-right font-mono text-xs text-emerald-600 font-bold">{formatCurrency(computed.travel_passenger_cost)}</td>
                  </tr>
                </>
              ) : (
                <>
                  <tr className="border-b border-slate-100 hover:bg-slate-50/50">
                    <td className="px-4 py-2 text-xs font-semibold">Travel Driver (First & Last Day - Jobs over 2 hrs)</td>
                    <td className="px-4 py-2 text-right font-mono text-xs text-slate-600">2</td>
                    <td className="px-4 py-2 text-center text-xs text-slate-400">Trips</td>
                    <td className="px-4 py-2 text-right">
                      <input
                        type="number"
                        step="0.01"
                        name="travel_driver_rate"
                        disabled={isReadOnly}
                        className="w-24 bg-white border border-slate-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 text-slate-800 rounded px-2 py-0.5 text-xs outline-none transition-all text-right font-mono"
                        value={takeoff.travel_driver_rate !== null && takeoff.travel_driver_rate !== undefined ? takeoff.travel_driver_rate : ""}
                        onChange={handleConstantChange}
                      />
                    </td>
                    <td className="px-4 py-2 text-right font-mono text-xs text-emerald-600 font-bold">{formatCurrency(computed.travel_driver_cost)}</td>
                  </tr>
                  <tr className="border-b border-slate-100 hover:bg-slate-50/50">
                    <td className="px-4 py-2 text-xs font-semibold">Travel Passengers (First & Last Day - Jobs over 2 hrs)</td>
                    <td className="px-4 py-2 text-right font-mono text-xs text-slate-600">{((computed.crew_size - 1) * 2)}</td>
                    <td className="px-4 py-2 text-center text-xs text-slate-400">Trips</td>
                    <td className="px-4 py-2 text-right">
                      <input
                        type="number"
                        step="0.01"
                        name="travel_passenger_rate"
                        disabled={isReadOnly}
                        className="w-24 bg-white border border-slate-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 text-slate-800 rounded px-2 py-0.5 text-xs outline-none transition-all text-right font-mono"
                        value={takeoff.travel_passenger_rate !== null && takeoff.travel_passenger_rate !== undefined ? takeoff.travel_passenger_rate : ""}
                        onChange={handleConstantChange}
                      />
                    </td>
                    <td className="px-4 py-2 text-right font-mono text-xs text-emerald-600 font-bold">{formatCurrency(computed.travel_passenger_cost)}</td>
                  </tr>
                  <tr className="border-b border-slate-100 hover:bg-slate-50/50">
                    <td className="px-4 py-2 text-xs font-semibold">Per Diem (Days Onsite: {computed.crew_days_rounded} Days)</td>
                    <td className="px-4 py-2 text-right font-mono text-xs text-slate-600">{(computed.crew_size * computed.crew_days_rounded)}</td>
                    <td className="px-4 py-2 text-center text-xs text-slate-400">Man-Days</td>
                    <td className="px-4 py-2 text-right">
                      <input
                        type="number"
                        step="0.01"
                        name="per_diem_rate"
                        disabled={isReadOnly}
                        className="w-24 bg-white border border-slate-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 text-slate-800 rounded px-2 py-0.5 text-xs outline-none transition-all text-right font-mono"
                        value={takeoff.per_diem_rate !== null && takeoff.per_diem_rate !== undefined ? takeoff.per_diem_rate : ""}
                        onChange={handleConstantChange}
                      />
                    </td>
                    <td className="px-4 py-2 text-right font-mono text-xs text-emerald-600 font-bold">{formatCurrency(computed.per_diem_cost)}</td>
                  </tr>
                  <tr className="border-b border-slate-100 hover:bg-slate-50/50">
                    <td className="px-4 py-2 text-xs font-semibold">Weeks Travel for Driver M,F Overnights To and From the Site</td>
                    <td className="px-4 py-2 text-right font-mono text-xs text-slate-600">
                      {(computed.travel_hours > 6 ? Math.max(0, computed.travel_hours - 2) * computed.num_weeks : 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-2 text-center text-xs text-slate-400">Hrs</td>
                    <td className="px-4 py-2 text-right">
                      <input
                        type="number"
                        step="0.01"
                        name="weeks_travel_driver_rate"
                        disabled={isReadOnly}
                        className="w-24 bg-white border border-slate-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 text-slate-800 rounded px-2 py-0.5 text-xs outline-none transition-all text-right font-mono"
                        value={takeoff.weeks_travel_driver_rate !== null && takeoff.weeks_travel_driver_rate !== undefined ? takeoff.weeks_travel_driver_rate : ""}
                        onChange={handleConstantChange}
                      />
                    </td>
                    <td className="px-4 py-2 text-right font-mono text-xs text-emerald-600 font-bold">{formatCurrency(computed.weeks_driver_travel_cost)}</td>
                  </tr>
                  <tr className="border-b border-slate-100 hover:bg-slate-50/50">
                    <td className="px-4 py-2 text-xs font-semibold">Weeks Travel for Passenger M,F Overnights To the Site</td>
                    <td className="px-4 py-2 text-right font-mono text-xs text-slate-600">
                      {(computed.travel_hours > 6 ? (Math.max(0, computed.travel_hours - 2) / 2) * computed.num_weeks * (computed.crew_size - 1) : 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-2 text-center text-xs text-slate-400">Hrs</td>
                    <td className="px-4 py-2 text-right">
                      <input
                        type="number"
                        step="0.01"
                        name="weeks_travel_passenger_rate"
                        disabled={isReadOnly}
                        className="w-24 bg-white border border-slate-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 text-slate-800 rounded px-2 py-0.5 text-xs outline-none transition-all text-right font-mono"
                        value={takeoff.weeks_travel_passenger_rate !== null && takeoff.weeks_travel_passenger_rate !== undefined ? takeoff.weeks_travel_passenger_rate : ""}
                        onChange={handleConstantChange}
                      />
                    </td>
                    <td className="px-4 py-2 text-right font-mono text-xs text-emerald-600 font-bold">{formatCurrency(computed.weeks_passenger_travel_cost)}</td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
